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

  function list(kind, path, key, pages) {
    var ps = [], p;
    for (p = 1; p <= pages; p++) { ps.push(getJson(path, key, '&page=' + p)); }
    return Promise.all(ps).then(function (rs) {
      var out = [];
      rs.forEach(function (r) { (r.results || []).forEach(function (x) { out.push(slim(kind, x)); }); });
      return out;
    });
  }

  return {
    init: function (h) { http = h; },
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
    match: match,
    trending: function (kind, key) { return list(kind, '/trending/' + kind + '/week', key, 2); },
    recommend: function (kind, id, key) { return list(kind, '/' + kind + '/' + id + '/recommendations', key, 1); },
    findId: function (kind, title, year, key) {
      var extra = '&query=' + encodeURIComponent(norm(title)) + (year ? (kind === 'tv' ? '&first_air_date_year=' : '&year=') + year : '');
      return getJson('/search/' + kind, key, extra).then(function (r) {
        var x = r.results && r.results[0];
        return x ? x.id : 0;
      });
    },
    check: function (key) { return getJson('/configuration', key, ''); }
  };
})();
if (typeof module !== 'undefined' && module.exports) { module.exports = Tmdb; }
