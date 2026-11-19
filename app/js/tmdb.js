/* TMDB (themoviedb.org): "em alta" e "parecidos" de verdade, cruzados com o catálogo do provedor. ES5.
   Tmdb.init(http) recebe a função de rede do app. Precisa de uma chave de API v3 (gratuita), guardada nas Configurações. */
var Tmdb = (function () {
  'use strict';
  var http = null;
  var API = 'https://api.themoviedb.org/3';

  function getJson(path, key, params) {
    if (!http) { return Promise.reject(new Error('sem rede')); }
    var url = API + path + '?api_key=' + encodeURIComponent(key) + '&language=pt-BR' + (params || '');
    return Promise.resolve(http(url)).then(function (t) { return typeof t === 'string' ? JSON.parse(t) : t; });
  }

  /* nome comparável: sem acento, sem [tags], (ano), qualidade/idioma, pontuação */
  function norm(s) {
    var t = String(s || '').toLowerCase();
    try { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
    t = t.replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
      .replace(/\b(4k|uhd|fhd|hd|sd|h\.?265|hevc|legendado|dublado|dual|leg|dub|nacional|cam|web-?dl|bluray|1080p|720p)\b/g, ' ')
      .replace(/^\s*[a-z]{2,4}\s*\|\s*/, ' ')
      .replace(/[^a-z0-9]+/g, ' ').replace(/^ +| +$/g, '');
    t = t.replace(/ (l|d)$/, '');   // sufixo solto de idioma: "Filme L" (legendado) / "Filme D" (dublado)
    return t;
  }

  function plain(s) {
    var t = String(s || '').toLowerCase();
    try { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
    return t;
  }

  /* outra fonte de trailers: busca no YouTube ("<filme> <ano> trailer dublado"), em até 3 consultas (nome do catálogo, nome do TMDB em
     português/original, "trailer oficial dublado"). Aceita trailer/teaser/prévia que diga "dublado" (ou "dublagem"/"DUB") e traga as palavras
     do nome; descarta legendado, reação, análise, fã-made, jogo, bastidores. Entre os que passam, prefere "oficial" e canais de estúdio/distribuidora.
     title: nome (ou lista de nomes) do filme. Devolve a chave do vídeo ou ''. */
  var yget = null;
  var STOPW = { the: 1, dos: 1, das: 1, and: 1, que: 1, com: 1, uma: 1, por: 1, para: 1, del: 1, les: 1, des: 1 };
  var NEG = /legendad|react|reacao|analise|explic|review|critica|fan ?made|fanmade|gameplay|\bjogo\b|making of|bastidor|entrevista|recap|resumo|ending|final explicado/;
  var STUDIO = /sony|warner|disney|universal|paramount|netflix|prime video|apple tv|hbo|globoplay|imagem filmes|diamond films|paris filmes|playarte|california filmes|vertical|downtown|pandora|mares filmes|bf1|elo studios|fox|20th|marvel|lucasfilm|pixar|dreamworks|lionsgate|mgm|a24|star\+|max |studiocanal|filmes|pictures|studios/;
  function wordsOf(name) { return norm(name).split(' ').filter(function (w) { return w.length >= 3 && !STOPW[w]; }).slice(0, 5); }
  /* resultados da busca do YouTube, nos dois formatos (videoRenderer e o novo lockupViewModel): [{ id, title, chan, pos }] */
  function parseResults(html) {
    var re = /"(?:videoId|contentId)":"([\w-]{11})"/g, hits = [], m, byId = {}, out = [];
    while ((m = re.exec(html))) { if (!hits.length || hits[hits.length - 1].id !== m[1]) { hits.push({ id: m[1], at: m.index }); } }
    hits.forEach(function (x, i) {
      var chunk = html.slice(x.at, Math.min(i + 1 < hits.length ? hits[i + 1].at : x.at + 4000, x.at + 4000)), e = byId[x.id];
      if (!e) { e = byId[x.id] = { id: x.id, raw: '', pos: out.length }; out.push(e); }
      e.raw += chunk;
    });
    out.forEach(function (e) {
      var t = /"title":\{(?:"runs":\[\{"text":|"content":)"((?:[^"\\]|\\.)*)"/.exec(e.raw), c = /"(?:ownerText|longBylineText|shortBylineText)":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/.exec(e.raw), v;
      v = t ? t[1] : ''; try { v = JSON.parse('"' + v + '"'); } catch (er) { /* mantém */ }
      e.title = v;
      if (c) { v = c[1]; try { v = JSON.parse('"' + v + '"'); } catch (er2) { /* mantém */ } e.chan = v; }
      else {   // formato novo: o canal é um dos textos depois do título
        var tx = [], r2 = /"(?:text|content)":"((?:[^"\\]|\\.)*)"/g, q;
        while ((q = r2.exec(e.raw)) && tx.length < 12) { tx.push(q[1]); }
        e.chan = tx.slice(1).join(' ');
      }
      delete e.raw;
    });
    return out.filter(function (e) { return e.title; });
  }
  function pickDub(html, nameWords, dub) {
    var best = '', bs = -1;
    parseResults(html).forEach(function (r) {
      var tt = plain(r.title);
      if (!/trailer|teaser|previa|chamada|promo/.test(tt) || NEG.test(tt)) { return; }
      if (dub && !/dublad|dublagem|\bdub\b/.test(tt)) { return; }
      var okName = false, k, i, w;
      for (k = 0; k < nameWords.length && !okName; k++) {
        w = nameWords[k]; okName = w.length > 0;
        for (i = 0; i < w.length; i++) { if (tt.indexOf(w[i]) < 0) { okName = false; break; } }
      }
      if (!okName) { return; }
      var cn = plain(r.chan);
      var sc = (/oficial|official/.test(tt) ? 4 : 0) + (STUDIO.test(cn) || STUDIO.test(tt) ? 3 : 0) + (/trailer/.test(tt) ? 2 : 0) - r.pos * 0.1;
      if (sc > bs) { bs = sc; best = r.id; }
    });
    return best;
  }
  function ytSearch(title, year, dub, diag) {
    diag = diag || [];
    if (!http) { return Promise.resolve(''); }
    var names = (Object.prototype.toString.call(title) === '[object Array]' ? title : [title]).filter(function (n) { return norm(n); });
    if (!names.length) { return Promise.resolve(''); }
    var nameWords = names.map(wordsOf).filter(function (w) { return w.length; }), seen = {}, qs = [];
    names.forEach(function (n, i) {
      var t = norm(n);
      if (seen[t]) { return; }
      seen[t] = 1;
      // o ano do catálogo nem sempre é o do lançamento no Brasil (ex.: filme de 2018 com trailer dublado de 2023): 1º nome com e sem ano
      if (i === 0 && year) { qs.push(t + ' ' + year + ' trailer' + (dub ? ' dublado' : '')); }
      qs.push(t + ' trailer' + (dub ? ' dublado' : ''));
    });
    qs = qs.slice(0, 3);
    function one(q) {
      var url = 'https://www.youtube.com/results?hl=pt-BR&gl=BR&sp=EgIQAQ%253D%253D&search_query=' + encodeURIComponent(q);
      return Promise.resolve((yget || http)(url)).then(function (html) {
        html = String(html || '');
        if (html.indexOf('\\x22') >= 0) { html = html.replace(/\\x([0-9a-fA-F]{2})/g, function (m, x) { return String.fromCharCode(parseInt(x, 16)); }); }
        var n = parseResults(html).length, id = pickDub(html, nameWords, dub);
        diag.push('"' + q + '": ' + (html.length < 2000 ? 'página vazia/bloqueada (' + html.length + ' bytes' + (/consent/i.test(html) ? ', consentimento' : '') + ')' : n + ' vídeos' + (id ? ', achou ' + id : ', nenhum dublado')));
        return id;
      }).then(null, function (e) { diag.push('"' + q + '": falha de rede'); return ''; });
    }
    return qs.reduce(function (p, q) { return p.then(function (id) { return id || one(q); }); }, Promise.resolve(''));
  }

  function yearOf(name) {
    var m = String(name || '').match(/\((\d{4})\)|\b(19\d{2}|20\d{2})\b/);
    return m ? parseInt(m[1] || m[2], 10) : 0;
  }

  function buildIndex(list) {
    if (list._tmdbIdx) { return list._tmdbIdx; }
    var idx = {}, i, it, k;
    for (i = 0; i < list.length; i++) {
      it = list[i];
      k = norm(it.name);
      if (!k) { continue; }
      (idx[k] = idx[k] || []).push(it);
    }
    try { Object.defineProperty(list, '_tmdbIdx', { value: idx, enumerable: false, configurable: true }); } catch (e) { list._tmdbIdx = idx; }
    return idx;
  }

  /* versão do título no catálogo: idioma (dublado/legendado/padrão) e qualidade */
  var RE_LEG = /(^|[^a-z0-9])(legendado|leg)([^a-z0-9]|$)|[\[(]\s*l\s*[\])]|[\s\-|]l\s*$/i;
  var RE_DUB = /(^|[^a-z0-9])(dublado|dub|dual)([^a-z0-9]|$)|[\[(]\s*d\s*[\])]|[\s\-|]d\s*$/i;
  function variantInfo(name) {
    var n = String(name || ''), lang = RE_LEG.test(n) ? 'leg' : (RE_DUB.test(n) ? 'dub' : 'orig'), q = '';
    if (/(^|[^a-z0-9])(4k|uhd|2160p)([^a-z0-9]|$)/i.test(n)) { q = '4K'; }
    else if (/(^|[^a-z0-9])(fhd|1080p)([^a-z0-9]|$)/i.test(n)) { q = 'Full HD'; }
    else if (/(^|[^a-z0-9])(hd|720p)([^a-z0-9]|$)/i.test(n)) { q = 'HD'; }
    else if (/(^|[^a-z0-9])sd([^a-z0-9]|$)/i.test(n)) { q = 'SD'; }
    var base = lang === 'leg' ? 'Legendado' : (lang === 'dub' ? 'Dublado' : 'Padrão');
    return { lang: lang, q: q, label: base + (q ? ' · ' + q : '') };
  }

  var pref = 'dub';   // 'dub' | 'leg' | 'any'
  var tv4k = false;   // TV (webOS / Android TV): entre versões do mesmo idioma, prefere 4K
  function rank(it) {
    var v = variantInfo(it.name), r = 0;
    if (pref === 'dub') { r = v.lang === 'dub' ? 6 : (v.lang === 'orig' ? 4 : 0); }
    else if (pref === 'leg') { r = v.lang === 'leg' ? 6 : (v.lang === 'orig' ? 2 : 0); }
    return r + (v.q === '4K' ? (tv4k ? 0.9 : 0.4) : (v.q === 'Full HD' ? 0.5 : (v.q === 'HD' ? 0.3 : 0)));
  }

  /* todas as versões do mesmo título no catálogo (mesmo tipo, ano compatível), a preferida primeiro */
  function variants(list, item) {
    var idx = buildIndex(list), arr = idx[norm(item.name)] || [], year = yearOf(item.name) || parseInt(item.year, 10) || 0, out = [], i, c, cy;
    for (i = 0; i < arr.length; i++) {
      c = arr[i];
      if (c.type !== item.type || String(c.id) === String(item.id)) { continue; }
      cy = yearOf(c.name) || parseInt(c.year, 10) || 0;
      if (year && cy && Math.abs(cy - year) > 1) { continue; }
      out.push(c);
    }
    out.push(item);
    out.sort(function (a, b) { return rank(b) - rank(a); });
    return out;
  }

  function pick(cands, year) {
    var best = null, i, c, cy, score, bs = -1;
    for (i = 0; i < cands.length; i++) {
      c = cands[i]; cy = c.year ? parseInt(String(c.year).slice(0, 4), 10) : yearOf(c.name);
      if (year && cy && Math.abs(cy - year) > 1) { continue; }
      score = (c.rating || 0) * 0.1 + (c.logo ? 1 : 0) + (year && cy === year ? 2 : 0) + rank(c) * 2;
      if (score > bs) { bs = score; best = c; }
    }
    return best;
  }

  /* results: [{t, o, y}] (título, título original, ano) na ordem do ranking -> itens do catálogo, sem repetir */
  function match(list, results) {
    var idx = buildIndex(list), out = [], seen = {}, i, r, c, k;
    for (i = 0; i < results.length; i++) {
      r = results[i];
      c = null;
      [r.t, r.o].forEach(function (name) {
        if (!c && name) { var arr = idx[norm(name)]; if (arr) { c = pick(arr, r.y); } }
      });
      if (c) {
        k = c.type + ':' + c.id;
        if (!seen[k]) { seen[k] = 1; out.push(c); }
      }
    }
    return out;
  }

  function slim(kind, r) {
    var d = kind === 'tv' ? r.first_air_date : r.release_date;
    return { id: r.id, t: kind === 'tv' ? r.name : r.title, o: kind === 'tv' ? r.original_name : r.original_title, y: d ? parseInt(String(d).slice(0, 4), 10) : 0 };
  }

  function list(kind, path, key, pages, extra) {
    var ps = [], p;
    for (p = 1; p <= pages; p++) { ps.push(getJson(path, key, (extra || '') + '&page=' + p)); }
    return Promise.all(ps).then(function (rs) {
      var out = [];
      rs.forEach(function (r) { (r.results || []).forEach(function (x) { out.push(slim(kind, x)); }); });
      return out;
    });
  }

  return {
    init: function (h) { http = h; },
    /* leitor de páginas do YouTube (precisa de User-Agent de navegador; o http padrão devolve uma página sem resultados) */
    initYt: function (f) { yget = f; },
    norm: norm,
    variantInfo: variantInfo,
    variants: variants,
    rank: rank,
    setTv4k: function (on) { tv4k = !!on; },
    best: function (items) {
      // uma versão por título (a de maior preferência), mantendo a ordem de chegada
      var by = {}, order = [], i, k, it;
      for (i = 0; i < items.length; i++) {
        it = items[i]; k = it.type + ':' + norm(it.name) + ':' + (yearOf(it.name) || parseInt(it.year, 10) || 0);
        if (!by[k]) { by[k] = it; order.push(k); }
        else if (rank(it) > rank(by[k])) { by[k] = it; }
      }
      return order.map(function (x) { return by[x]; });
    },
    setPref: function (p) { pref = p === 'leg' || p === 'any' ? p : 'dub'; },
    yearOf: yearOf,
    ytSearch: ytSearch,
    match: match,
    trending: function (kind, key) { return list(kind, '/trending/' + kind + '/week', key, 2); },
    /* mais populares de Animação ou Família (perfil infantil) */
    kids: function (kind, key) { return list(kind, '/discover/' + kind, key, 3, '&with_genres=' + encodeURIComponent('16|10751') + '&sort_by=popularity.desc&include_adult=false'); },
    recommend: function (kind, id, key) { return list(kind, '/' + kind + '/' + id + '/recommendations', key, 1); },
    /* títulos do TMDB: [português do Brasil, original] (o catálogo às vezes vem em inglês e o trailer dublado é publicado com o nome em português) */
    names: function (kind, id, key) {
      return getJson('/' + kind + '/' + id, key, '').then(function (r) {
        var out = [], a = r.title || r.name, b = r.original_title || r.original_name;
        if (a) { out.push(a); }
        if (b && b !== a) { out.push(b); }
        return out;
      });
    },
    findId: function (kind, title, year, key) {
      var extra = '&query=' + encodeURIComponent(norm(title)) + (year ? (kind === 'tv' ? '&first_air_date_year=' : '&year=') + year : '');
      return getJson('/search/' + kind, key, extra).then(function (r) {
        var x = r.results && r.results[0];
        return x ? x.id : 0;
      });
    },
    /* trailer no YouTube: devolve a chave do vídeo ('' se não houver). dub=true: só trailer em português do Brasil
       cujo nome diz "dublado" (o idioma "pt" do TMDB também marca trailers só legendados) */
    trailer: function (kind, id, key, dub) {
      return getJson('/' + kind + '/' + id + '/videos', key, '&include_video_language=pt%2Cen%2Cnull').then(function (r) {
        var l = (r.results || []).filter(function (v) { return v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'); });
        if (dub) { l = l.filter(function (v) { return v.iso_639_1 === 'pt' && v.iso_3166_1 !== 'PT' && /dublad/.test(plain(v.name)); }); }
        l.sort(function (a, b) {
          function sc(v) { return (v.type === 'Trailer' ? 8 : 0) + (v.iso_3166_1 === 'BR' ? 4 : 0) + (v.official ? 2 : 0) + (v.iso_639_1 === 'pt' ? 1 : 0); }
          return sc(b) - sc(a);
        });
        return l[0] ? l[0].key : '';
      });
    },
    /* elenco principal: [{id, n (nome), c (personagem), p (foto)}] */
    credits: function (kind, id, key) {
      return getJson('/' + kind + '/' + id + '/credits', key, '').then(function (r) {
        return (r.cast || []).slice(0, 15).map(function (c) { return { id: c.id, n: c.name || '', c: c.character || '', p: c.profile_path || '' }; });
      });
    },
    /* filmografia de uma pessoa (mais populares primeiro): [{t, o, y, k:'movie'|'tv'}] */
    person: function (id, key) {
      return getJson('/person/' + id + '/combined_credits', key, '').then(function (r) {
        var c = (r.cast || []).filter(function (x) { return x.media_type === 'movie' || x.media_type === 'tv'; });
        c.sort(function (a, b) { return (b.popularity || 0) - (a.popularity || 0); });
        return c.slice(0, 80).map(function (x) { var o = slim(x.media_type, x); o.k = x.media_type; return o; });
      });
    },
    check: function (key) { return getJson('/configuration', key, ''); }
  };
})();
if (typeof module !== 'undefined' && module.exports) { module.exports = Tmdb; }
