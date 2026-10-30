/* Núcleo do app: parser M3U, cliente Xtream Codes e utilitários.
   Escrito em ES5 para rodar em versões antigas do webOS (Chromium 38+). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.Core = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var C = {};

  /* ---------- utilitários ---------- */

  C.normBase = function (url) {
    url = String(url || '').trim();
    if (!/^https?:\/\//i.test(url)) { url = 'http://' + url; }
    url = url.replace(/[?#].*$/, '');
    url = url.replace(/\/(player_api|get|panel_api|xmltv)\.php$/i, '');
    return url.replace(/\/+$/, '');
  };

  // Se o usuário colar um link get.php?username=..&password=.. no campo M3U, usamos Xtream.
  C.detectXtream = function (text) {
    var m = String(text || '').trim().match(/^(https?:\/\/[^\/?#]+(?:\/[^?#]*?)?)\/(?:get|player_api)\.php\?(.*)$/i);
    if (!m) { return null; }
    var q = {};
    m[2].split('&').forEach(function (kv) {
      var p = kv.split('=');
      try { q[p[0]] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); } catch (e) { q[p[0]] = p[1] || ''; }
    });
    if (!q.username || !q.password) { return null; }
    return { server: m[1], user: q.username, pass: q.password };
  };

  C.b64utf8 = function (s) {
    if (!s) { return ''; }
    try { return decodeURIComponent(escape(atob(s))); }
    catch (e) { try { return atob(s); } catch (e2) { return String(s); } }
  };

  C.fmtTime = function (sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return (h ? h + ':' + p(m) : m) + ':' + p(s);
  };

  function toList(x) { return Object.prototype.toString.call(x) === '[object Array]' ? x : []; }

  function rating10(r) {
    var v = parseFloat(r.rating);
    if (!(v > 0)) { v = parseFloat(r.rating_5based) * 2; }
    return v > 0 ? Math.round(v * 10) / 10 : 0;
  }

  /* ---------- M3U ---------- */

  C.parseM3U = function (text) {
    var lines = String(text || '').split(/\r?\n/), items = [], cur = null, m, i;
    for (i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (!l) { continue; }
      if (l.indexOf('#EXTINF') === 0) {
        cur = { attrs: {}, name: '' };
        var re = /([\w-]+)="([^"]*)"/g;
        while ((m = re.exec(l))) { cur.attrs[m[1].toLowerCase()] = m[2]; }
        var c = l.lastIndexOf(',');
        cur.name = (c >= 0 ? l.slice(c + 1) : '').trim() || cur.attrs['tvg-name'] || 'Sem nome';
      } else if (l.charAt(0) === '#') {
        continue;
      } else if (cur) {
        items.push({
          name: cur.name,
          logo: cur.attrs['tvg-logo'] || '',
          group: cur.attrs['group-title'] || 'Sem categoria',
          epgId: cur.attrs['tvg-id'] || '',
          url: l
        });
        cur = null;
      }
    }
    return items;
  };

  C.classify = function (it) {
    var u = String(it.url).toLowerCase(), g = String(it.group || '').toLowerCase();
    if (/\/series\//.test(u)) { return 'series'; }
    if (/\/movies?\//.test(u)) { return 'movie'; }
    if (/\.(mp4|mkv|avi|mov)(\?|$)/.test(u)) {
      return /s[eé]ries?|temporada/.test(g) || /\bS\d{1,2}\s*E\d{1,3}\b/i.test(it.name) ? 'series' : 'movie';
    }
    if (/s[eé]ries?\b|temporadas?/.test(g)) { return 'series'; }
    if (/filmes?|movies?|\bvod\b/.test(g)) { return 'movie'; }
    return 'live';
  };

  C.parseEpisode = function (name) {
    name = String(name);
    var m = name.match(/^(.*?)[\s._\-–—:]*[\(\[]?\bS(\d{1,2})[\s._\-]*E(\d{1,3})\b[\)\]]?[\s._\-–—:]*(.*)$/i);
    if (!m) { return { show: name, season: 1, num: 1, title: name }; }
    var n = parseInt(m[3], 10);
    return {
      show: m[1].trim() || name,
      season: parseInt(m[2], 10),
      num: n,
      title: (m[4] || '').trim() || ('Episódio ' + n)
    };
  };

  function seasonsFromMap(map) {
    var out = [];
    Object.keys(map).forEach(function (k) {
      var eps = map[k].slice().sort(function (a, b) { return a.num - b.num; });
      out.push({ n: parseInt(k, 10) || 0, episodes: eps });
    });
    out.sort(function (a, b) { return a.n - b.n; });
    return out;
  }

  C.createM3U = function (text) {
    var raw = C.parseM3U(text);
    var cats = { live: [], movie: [], series: [] };
    var seen = { live: {}, movie: {}, series: {} };
    var lists = { live: [], movie: [], series: [] };
    var seriesMap = {};

    raw.forEach(function (r, i) {
      var t = C.classify(r);
      if (!seen[t][r.group]) { seen[t][r.group] = 1; cats[t].push({ id: r.group, name: r.group }); }
      if (t === 'series') {
        var p = C.parseEpisode(r.name);
        var key = (r.group + '|' + p.show).toLowerCase();
        var s = seriesMap[key];
        if (!s) {
          s = seriesMap[key] = { type: 'series', id: 's' + (lists.series.length + 1), name: p.show, logo: r.logo, cat: r.group, map: {} };
          lists.series.push(s);
        }
        (s.map[p.season] = s.map[p.season] || []).push({
          id: 'e' + i, title: p.title, season: p.season, num: p.num, logo: r.logo, plot: '', duration: '', url: r.url
        });
      } else {
        lists[t].push({
          type: t, id: t.charAt(0) + i, name: r.name, logo: r.logo, cat: r.group,
          url: r.url, epgId: r.epgId, num: lists[t].length + 1
        });
      }
    });

    function resolve(v) { return Promise.resolve(v); }
    return {
      kind: 'm3u',
      login: function () { return resolve({ ok: raw.length > 0, name: 'Lista M3U (' + raw.length + ' itens)' }); },
      categories: function (section) { return resolve(cats[section]); },
      all: function (section) { return resolve(lists[section]); },
      items: function (section, catId) {
        return resolve(lists[section].filter(function (it) { return it.cat === catId; }));
      },
      episodes: function (item) { return resolve({ info: { plot: '', cover: item.logo }, seasons: seasonsFromMap(item.map) }); },
      movieInfo: function () { return resolve({}); },
      epg: function () { return resolve([]); }
    };
  };

  /* ---------- Demonstração (streams públicos de teste, sem servidor próprio) ---------- */

  C.createDemo = function () {
    var G = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/';
    var liveSrc = [
      ['Teste HLS · Akamai (ao vivo)', 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8'],
      ['Teste HLS · Big Buck Bunny (Mux)', 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'],
      ['Teste HLS · Apple BipBop', 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8'],
      ['Teste HLS · Tears of Steel (Unified)', 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8']
    ];
    var movieSrc = [
      ['Big Buck Bunny', 'BigBuckBunny', 'Um coelho gigante e gentil enfrenta três roedores abusados.', '2008'],
      ['Elephants Dream', 'ElephantsDream', 'Dois personagens exploram uma máquina enorme e surreal.', '2006'],
      ['Sintel', 'Sintel', 'Uma jovem guerreira procura o dragão que ela criou.', '2010'],
      ['Tears of Steel', 'TearsOfSteel', 'Guerreiros e cientistas tentam salvar o mundo de robôs.', '2012']
    ];
    var live = liveSrc.map(function (x, i) {
      return { type: 'live', id: 'd' + i, name: x[0], logo: '', cat: 'demo', url: x[1], num: i + 1 };
    });
    var movies = movieSrc.map(function (x, i) {
      return { type: 'movie', id: 'm' + i, name: x[0], logo: G + 'images/' + x[1] + '.jpg', cat: 'demo',
        url: G + x[1] + '.mp4', rating: 7.5, plot: x[2], year: x[3] };
    });
    var show = { type: 'series', id: 's1', name: 'Série de Demonstração', cat: 'demo', rating: 8,
      logo: G + 'images/Sintel.jpg', year: '2024', plot: 'Duas temporadas curtas só para testar temporadas, episódios e o próximo episódio automático.' };
    var seasons = [1, 2].map(function (n) {
      return { n: n, episodes: [0, 1].map(function (k) {
        var m = movieSrc[(n - 1) * 2 + k];
        return { id: 'e' + n + k, title: m[0], season: n, num: k + 1, logo: G + 'images/' + m[1] + '.jpg',
          plot: m[2], duration: '', url: G + m[1] + '.mp4' };
      }) };
    });
    function resolve(v) { return Promise.resolve(v); }
    var cats = { live: [{ id: 'demo', name: 'Canais de teste' }], movie: [{ id: 'demo', name: 'Filmes de teste' }],
      series: [{ id: 'demo', name: 'Séries de teste' }] };
    var lists = { live: live, movie: movies, series: [show] };
    return {
      kind: 'demo',
      login: function () { return resolve({ ok: true, name: 'Demonstração' }); },
      categories: function (sec) { return resolve(cats[sec]); },
      all: function (sec) { return resolve(lists[sec]); },
      items: function (sec) { return resolve(lists[sec]); },
      episodes: function () { return resolve({ info: { plot: show.plot, genre: 'Animação' }, seasons: seasons }); },
      movieInfo: function (it) { return resolve({ plot: it.plot, genre: 'Animação', year: it.year, duration: '' }); },
      epg: function () { return resolve([]); }
    };
  };

  /* ---------- Xtream Codes ---------- */

  C.createXtream = function (cfg, http) {
    var base = C.normBase(cfg.server);
    var user = encodeURIComponent(cfg.user), pass = encodeURIComponent(cfg.pass);
    var cache = {};
    var CAT = { live: 'get_live_categories', movie: 'get_vod_categories', series: 'get_series_categories' };
    var STR = { live: 'get_live_streams', movie: 'get_vod_streams', series: 'get_series' };

    function api(action, params) {
      var url = base + '/player_api.php?username=' + user + '&password=' + pass;
      if (action) { url += '&action=' + action; }
      for (var k in params) { if (params.hasOwnProperty(k)) { url += '&' + k + '=' + encodeURIComponent(params[k]); } }
      return http(url).then(function (t) {
        try { return JSON.parse(String(t).replace(/^﻿/, '')); }
        catch (e) { throw new Error('Resposta inválida do servidor'); }
      });
    }

    function cached(key, fn) {
      if (!cache[key]) {
        cache[key] = fn().then(null, function (e) { delete cache[key]; throw e; });
      }
      return cache[key];
    }

    function mapItem(section, r) {
      var it = {
        type: section,
        cat: String(r.category_id == null ? '' : r.category_id),
        name: r.name || r.title || '',
        logo: r.stream_icon || r.cover || ''
      };
      if (section === 'live') {
        it.id = String(r.stream_id);
        it.num = r.num;
        it.epgId = r.epg_channel_id || '';
        var root = base + '/live/' + user + '/' + pass + '/' + r.stream_id;
        it.url = root + '.m3u8';
        it.alt = root + '.ts';
      } else if (section === 'movie') {
        it.id = String(r.stream_id);
        it.ext = r.container_extension || 'mp4';
        it.rating = rating10(r);
        it.added = parseInt(r.added, 10) || 0;
        it.url = base + '/movie/' + user + '/' + pass + '/' + r.stream_id + '.' + it.ext;
      } else {
        it.id = String(r.series_id);
        it.rating = rating10(r);
        it.added = parseInt(r.last_modified, 10) || 0;
        it.plot = r.plot || '';
        it.year = String(r.releaseDate || r.release_date || r.year || '').slice(0, 4);
      }
      return it;
    }

    function mapList(section) {
      return function (d) { return toList(d).map(function (r) { return mapItem(section, r); }); };
    }

    return {
      kind: 'xtream',
      base: base,
      login: function () {
        return api('', {}).then(function (d) {
          var ui = d && d.user_info;
          if (!ui || String(ui.auth) !== '1') { return { ok: false, name: '' }; }
          var exp = ui.exp_date && ui.exp_date !== 'null' ? new Date(parseInt(ui.exp_date, 10) * 1000) : null;
          return {
            ok: true,
            name: ui.username || cfg.user,
            status: ui.status,
            exp: exp && !isNaN(exp.getTime()) ? exp : null,
            maxConn: ui.max_connections
          };
        });
      },
      categories: function (section) {
        return cached('cats:' + section, function () {
          return api(CAT[section], {}).then(function (d) {
            return toList(d).map(function (c) { return { id: String(c.category_id), name: c.category_name || '?' }; });
          });
        });
      },
      all: function (section) {
        return cached('all:' + section, function () { return api(STR[section], {}).then(mapList(section)); });
      },
      items: function (section, catId) {
        if (cache['all:' + section]) {
          return cache['all:' + section].then(function (l) { return l.filter(function (it) { return it.cat === catId; }); });
        }
        return cached('cat:' + section + ':' + catId, function () {
          return api(STR[section], { category_id: catId }).then(mapList(section));
        });
      },
      episodes: function (item) {
        return cached('series:' + item.id, function () {
          return api('get_series_info', { series_id: item.id }).then(function (d) {
            d = d || {};
            var eps = d.episodes || {}, seasons = [];
            Object.keys(eps).forEach(function (k) {
              var arr = eps[k];
              if (Object.prototype.toString.call(arr) !== '[object Array]' || !arr.length) { return; }
              var n = parseInt(arr[0].season, 10);
              if (isNaN(n)) { n = parseInt(k, 10) || 0; }
              seasons.push({
                n: n,
                episodes: arr.map(function (e) {
                  var inf = e.info || {};
                  var num = parseInt(e.episode_num, 10) || 0;
                  return {
                    id: String(e.id), title: e.title || ('Episódio ' + num), season: n, num: num,
                    logo: inf.movie_image || '', plot: inf.plot || '', duration: inf.duration || '',
                    url: base + '/series/' + user + '/' + pass + '/' + e.id + '.' + (e.container_extension || 'mp4')
                  };
                }).sort(function (a, b) { return a.num - b.num; })
              });
            });
            seasons.sort(function (a, b) { return a.n - b.n; });
            return { info: d.info || {}, seasons: seasons };
          });
        });
      },
      movieInfo: function (item) {
        return api('get_vod_info', { vod_id: item.id }).then(function (d) {
          var i = (d && d.info) || {};
          var bd = i.backdrop_path;
          return {
            plot: i.plot || i.description || '',
            genre: i.genre || '',
            year: String(i.releasedate || i.release_date || '').slice(0, 4),
            duration: i.duration || '',
            cast: i.cast || i.actors || '',
            director: i.director || '',
            backdrop: toList(bd).length ? bd[0] : (typeof bd === 'string' ? bd : '')
          };
        });
      },
      hasEpg: true,
      epg: function (item) {
        return api('get_short_epg', { stream_id: item.id, limit: 3 }).then(function (d) {
          return toList(d && d.epg_listings).map(function (e) {
            return {
              title: C.b64utf8(e.title),
              desc: C.b64utf8(e.description),
              start: (parseInt(e.start_timestamp, 10) || 0) * 1000,
              stop: (parseInt(e.stop_timestamp, 10) || 0) * 1000
            };
          });
        });
      }
    };
  };

  return C;
});
