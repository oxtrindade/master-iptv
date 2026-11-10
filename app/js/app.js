/* Interface do app IPTV para webOS: login, Início, listas, detalhes e player. ES5. */
(function () {
  'use strict';

  var KEY = { ENTER: 13, ESC: 27, BS: 8, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
    BACK: 461, PLAY: 415, PAUSE: 19, STOP: 413, REW: 412, FF: 417, CHUP: 33, CHDN: 34, RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406 };

  function $(id) { return document.getElementById(id); }

  /* perfis: cada perfil tem o seu histórico, favoritos, preferências etc. O perfil "p1" usa as chaves antigas (nada se perde). */
  var PROF_KEYS = { verpref: 1, fav: 1, resume: 1, last: 1, cont: 1, recent: 1, opts: 1, lastlive: 1, intro: 1, trackpref: 1, city: 1, hist: 1, cat: 1, tomb: 1, favmeta: 1, synccode: 1, sportteams: 1 };
  var curProf = 'p1';
  try { curProf = JSON.parse(localStorage.getItem('iptv.curprof')) || 'p1'; } catch (e0) {}
  function pk(k) { return (PROF_KEYS[k.split(':')[0]] && curProf !== 'p1') ? curProf + '.' + k : k; }

  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('iptv.' + pk(k)); return v ? JSON.parse(v) : d; } catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem('iptv.' + pk(k), JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem('iptv.' + pk(k)); } catch (e) {} }
  };

  var S = {
    cfg: null, provider: null, info: null,
    mode: 'login', section: 'home', backTo: 'home', searchSec: null, hubFocus: null,
    cats: [], catId: null, items: [], shown: 0, loadToken: 0, homeToken: 0,
    favs: store.get('fav', {}), resume: store.get('resume', {}), last: store.get('last', {}),
    cont: store.get('cont', {}), recent: store.get('recent', []), opts: store.get('opts', {}), wxEl: null,
    ctx: null, detail: null, lastFocus: null, resumeFocus: null, resumeScope: null,
    exitArmed: false, tracksOpen: false, tracksScope: null, pref: store.get('trackpref', {}), prefApplied: {}, lastSave: 0, osdTimer: null, digits: '', digitTimer: null, seekCount: 0, seekAt: 0,
    headEl: null, query: '', pageEl: null, mainEl: null, catsEl: null, contentEl: null, listHost: null, clockEl: null
  };

  /* ---------- ícones (SVG inline: não dependem de fontes da TV) ---------- */

  var STAR = '<path d="M12 3l2.8 6 6.2.7-4.7 4.3 1.4 6.5L12 17.2 6.3 20.5l1.4-6.5L3 9.7 9.2 9z"/>';
  var ICONS = {
    home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>',
    live: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>',
    guide: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M3 14.5h6"/>',
    movie: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/>',
    series: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 4h10"/>',
    fav: STAR,
    star: STAR,
    starfill: STAR.replace('<path ', '<path fill="currentColor" '),
    menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
    dl: '<path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 20h14"/>',
    settings: '<path d="M4 7h7M15 7h5M4 12h3M11 12h9M4 17h9M17 17h3"/><circle cx="13" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="17" r="2"/>',
    play: '<path fill="currentColor" d="M7 4l13 8-13 8z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    xmark: '<path d="M6 6l12 12M18 6L6 18"/>',
    expand: '<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>',
    pause: '<path fill="currentColor" d="M6.5 4h4v16h-4zM13.5 4h4v16h-4z"/>',
    rew: '<path d="M11 6l-6 6 6 6M19 6l-6 6 6 6"/>',
    ff: '<path d="M13 6l6 6-6 6M5 6l6 6-6 6"/>',
    chup: '<path d="M5 15l7-7 7 7"/>',
    chdn: '<path d="M5 9l7 7 7-7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
    cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 10.5 3.8 3.8 0 0 1 17.5 18z"/>',
    cloudsun: '<circle cx="8" cy="8" r="3"/><path d="M8 1.5V3M1.5 8H3M3.4 3.4l1 1M12.6 3.4l-1 1"/><path d="M9 20a3.8 3.8 0 0 1-.3-7.6A5 5 0 0 1 18.5 13.5 3.3 3.3 0 0 1 18 20z"/>',
    rain: '<path d="M7 14.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 7 3.8 3.8 0 0 1 17.5 14.5z"/><path d="M8 17.5l-1 3M12.5 17.5l-1 3M17 17.5l-1 3"/>',
    snow: '<path d="M7 14.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 7 3.8 3.8 0 0 1 17.5 14.5z"/><path d="M8 18v.01M12 20v.01M16 18v.01M10 21.5v.01M14 21.5v.01"/>',
    storm: '<path d="M7 14.5a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 7 3.8 3.8 0 0 1 17.5 14.5z"/><path d="M12.5 14l-2.5 4h3.5l-2 4"/>',
    fog: '<path d="M4 8h16M3 12h18M5 16h14M8 20h8"/>',
    check: '<path d="M5 12.5l5 5 9-10.5"/>',
    cc: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 10.3a2.4 2.4 0 1 0 0 3.4M17 10.3a2.4 2.4 0 1 0 0 3.4"/>',
    sports: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5l3.8 2.8-1.4 4.4H9.6l-1.4-4.4zM12 3v4.5M3.6 9.8l4.6.5M20.4 9.8l-4.6.5M7 19.5l1.6-4.8M17 19.5l-1.6-4.8"/>',
    skipprev: '<path d="M6 5v14M19 5L9 12l10 7z"/>',
    skipnext: '<path d="M18 5v14M5 5l10 7-10 7z"/>',
    av_smile: '<circle cx="12" cy="12" r="9"/><path d="M8.3 14.3a4.6 4.6 0 0 0 7.4 0M9 9.6v.01M15 9.6v.01"/>',
    av_bolt: '<path d="M13 3L5.5 13.5H11L10 21l8.5-11H13z"/>',
    av_heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    av_rocket: '<path d="M12 3c3 2 4.5 5.5 4.5 9l-2 3h-5l-2-3c0-3.5 1.5-7 4.5-9z"/><path d="M9.5 15L7 19.5M14.5 15l2.5 4.5"/><circle cx="12" cy="10" r="1.6"/>',
    av_ghost: '<path d="M5 20V11a7 7 0 0 1 14 0v9l-2.3-2-2.4 2-2.3-2-2.3 2-2.4-2z"/><path d="M9.5 11v.01M14.5 11v.01"/>',
    av_paw: '<circle cx="6.8" cy="11" r="1.8"/><circle cx="10.8" cy="6.8" r="1.8"/><circle cx="16" cy="6.8" r="1.8"/><circle cx="19.6" cy="11" r="1.8"/><path d="M8.6 18c0-3 2-5 4-5s4 2 4 5c0 2-2 2.4-4 1.4-2 1-4 .6-4-1.4z"/>',
    av_crown: '<path d="M4 18L3 8l5 4 4-7 4 7 5-4-1 10z"/>',
    av_game: '<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M8 10.5v4M6 12.5h4M15.5 11.5v.01M18 13.5v.01"/>',
    av_music: '<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>',
    av_ball: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18M5.6 5.6c3 3 3 9.8 0 12.8M18.4 5.6c-3 3-3 9.8 0 12.8"/>',
    av_moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    av_cat: '<path d="M4 5l4 3.5h8L20 5v9a8 8 0 0 1-16 0z"/><path d="M9 13v.01M15 13v.01M11 16.5h2"/>'
  };

  function icon(name, size) {
    var s = document.createElement('span'), z = size || 30;
    s.className = 'ico';
    s.innerHTML = '<svg viewBox="0 0 24 24" width="' + z + '" height="' + z + '" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + '</svg>';
    return s;
  }

  /* ---------- helpers de UI ---------- */

  function h(tag, props, kids) {
    var el = document.createElement(tag), k, ev;
    props = props || {};
    for (k in props) {
      if (!props.hasOwnProperty(k)) { continue; }
      if (k === 'cls') { el.className = props[k]; }
      else if (k === 'text') { el.textContent = props[k]; }
      else if (k === 'on') { for (ev in props.on) { if (props.on.hasOwnProperty(ev)) { el.addEventListener(ev, props.on[ev]); } } }
      else { el.setAttribute(k, props[k]); }
    }
    (kids || []).forEach(function (c) {
      if (c == null) { return; }
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  function up(el) {
    while (el && el !== document.body) {
      if (el.classList && el.classList.contains('f')) { return el; }
      el = el.parentNode;
    }
    return null;
  }

  var toastT;
  function toast(msg, ms) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.add('hidden'); }, ms || 2800);
  }

  /* abertura animada: usada em "Conectando…"; ao abrir o app fica pelo menos 1,8 s para a animação tocar */
  function splash(on, now) {
    var el = $('splash');
    clearTimeout(S.splashT);
    if (on) {
      el.classList.remove('out');
      el.classList.remove('hidden');
      if (!S.splashAt) { S.splashAt = Date.now(); }
      return;
    }
    var wait = !now && S.splashMin ? Math.max(0, 1800 - (Date.now() - S.splashAt)) : 0;
    S.splashT = setTimeout(function () {
      el.classList.add('out');
      S.splashT = setTimeout(function () { el.classList.add('hidden'); el.classList.remove('out'); }, 450);
      S.splashAt = 0; S.splashMin = false;
    }, wait);
  }

  function loading(on, text) {
    if (text === 'Conectando…' || (!on && S.splashAt)) { splash(on, S.splashNow); return; }
    $('loader-text').textContent = text || 'Carregando…';
    $('loader').classList.toggle('hidden', !on);
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function hhmm(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fk(it) { return it.type + ':' + it.id; }
  function bgUrl(u) { return 'url(' + JSON.stringify(u) + ')'; }
  function initial(it) { return (it.name || '?').charAt(0).toUpperCase(); }
  function metaLine(parts) { return parts.filter(function (x) { return x; }).join('  ·  '); }
  function opt(k) { return !!S.opts[k]; }
  function pvOn() {
    if (S.opts.pvsound === undefined) { S.opts.pvsound = true; store.set('opts', S.opts); }
    if (window.__pvTest) { return true; }
    if (S.opts.pvv !== 3) { S.opts.pvv = 3; S.opts.heropv = true; store.set('opts', S.opts); }   // 1.44.0: prévia = trailer, ligada por padrão
    return !!S.opts.heropv;
  }
  function setOpt(k, v) { S.opts[k] = !!v; store.set('opts', S.opts); if (k === 'bgplay') { applyBg(); } }
  /* Android (celular): tocar com a tela bloqueada / app em segundo plano (padrão: ligado) */
  function hasBg() { try { return !!(window.NativeApp && window.NativeApp.setBackground && !(window.NativeApp.isTv && window.NativeApp.isTv())); } catch (e) { return false; } }
  function applyBg() {
    if (!hasBg()) { return; }
    if (S.opts.bgplay === undefined) { S.opts.bgplay = true; store.set('opts', S.opts); }
    try { window.NativeApp.setBackground(!!S.opts.bgplay); } catch (e) {}
  }

  // filtro de canais por qualidade no nome (FHD/UHD não são afetados)
  var RE_SD = /(^|[^A-Za-z0-9])SD($|[^A-Za-z0-9])/i, RE_HD = /(^|[^A-Za-z0-9])HD($|[^A-Za-z0-9])/i;
  function filterLive(items) {
    if (!opt('hideSD') && !opt('hideHD')) { return items; }
    return items.filter(function (it) {
      if (it.type !== 'live') { return true; }
      if (opt('hideSD') && RE_SD.test(it.name)) { return false; }
      if (opt('hideHD') && RE_HD.test(it.name)) { return false; }
      return true;
    });
  }

  /* filmes "de cinema" (gravação de sala, qualidade baixa): categoria com "cinema"/CAM no nome ou etiqueta [CAM]/[Cinema]/HDCAM/HDTS no título */
  var RE_CAMCAT = /cinema|(^|[^a-z0-9])(hd-?)?cam($|[^a-z0-9])|hd-?ts|tele-?sync/i;
  var RE_CAMTAG = /[\[(]\s*(cinema|cam|hd-?cam|hd-?ts|ts|tc|tele-?sync)\s*[\])]|(^|[^a-z0-9])(hd-?cam|hd-?ts|tele-?sync)($|[^a-z0-9])|(^|\s)[-–|]\s*(cinema|cam)\s*$/i;
  function camOn() {
    if (S.opts.hideCam === undefined) { S.opts.hideCam = true; store.set('opts', S.opts); }
    return !!S.opts.hideCam;
  }
  function camWrap(prov) {
    var badCats = null;
    function bad(section) {
      if (section !== 'movie') { return Promise.resolve({}); }
      if (badCats) { return Promise.resolve(badCats); }
      return prov.categories('movie').then(function (cats) {
        badCats = {};
        cats.forEach(function (c) { if (RE_CAMCAT.test(c.name)) { badCats[c.id] = 1; } });
        return badCats;
      }, function () { return {}; });
    }
    function clean(section, items) {
      if (section !== 'movie' || !camOn()) { return Promise.resolve(items); }
      return bad(section).then(function (b) {
        return items.filter(function (it) { return !b[it.cat] && !RE_CAMTAG.test(it.name || ''); });
      });
    }
    var w = {}, k;
    for (k in prov) { if (Object.prototype.hasOwnProperty.call(prov, k)) { w[k] = prov[k]; } }
    w.categories = function (section) {
      return prov.categories(section).then(function (cats) {
        if (section !== 'movie' || !camOn()) { return cats; }
        return cats.filter(function (c) { return !RE_CAMCAT.test(c.name); });
      });
    };
    w.all = function (section) { return prov.all(section).then(function (l) { return clean(section, l); }); };
    w.items = function (section, catId) { return prov.items(section, catId).then(function (l) { return clean(section, l); }); };
    return w;
  }

  function typeLabel(t) { return { live: 'CANAL', movie: 'FILME', series: 'SÉRIE' }[t] || ''; }

  function imgEl(src, parent) {
    var img = document.createElement('img');
    img.onerror = function () { if (img.parentNode) { img.parentNode.removeChild(img); } };
    // imagem carregou: a letra de reserva (placeholder) sai de cima do pôster
    img.onload = function () {
      var p = img.parentNode, ph = p && p.querySelector('.ph');
      if (ph) { p.removeChild(ph); }
    };
    img.src = src;
    parent.appendChild(img);
  }

  function updateClock() {
    var t = hhmm(new Date());
    if (S.clockEl) { S.clockEl.textContent = t; }
    if (S.drawClockEl) { S.drawClockEl.textContent = t; }
  }
  setInterval(updateClock, 20000);

  /* ---------- clima ---------- */

  var DEFAULT_CITY = { name: 'Taubaté', admin: 'São Paulo', lat: -23.03, lon: -45.56 };
  function getCity() { var c = store.get('city', null); return c && c.name ? c : DEFAULT_CITY; }
  function cityLabel(c) { return c.name + (c.admin ? ' — ' + c.admin : ''); }

  function paintWx(d) {
    var el = S.wxEl;
    if (!el || !document.body.contains(el)) { return; }
    el.innerHTML = '';
    el.appendChild(icon(Weather.kind(d.code, d.day), 40));
    el.appendChild(h('div', { cls: 'wx-t', text: Math.round(d.temp) + '°' }));
    el.appendChild(h('div', { cls: 'wx-s' }, [
      h('div', { cls: 'wx-c', text: getCity().name }),
      h('div', { cls: 'wx-r', text: Weather.text(d.code) + ' · ' + Math.round(d.min) + '° / ' + Math.round(d.max) + '°' })
    ]));
  }

  function loadWeather() {
    var city = getCity(), key = city.lat + ',' + city.lon, c = store.get('wx', null);
    if (c && c.key === key) {
      paintWx(c.data);
      if (Date.now() - c.at < 1800000) { return; }
    }
    Weather.forecast(city).then(function (d) {
      store.set('wx', { key: key, at: Date.now(), data: d });
      paintWx(d);
    }, function () {});
  }

  /* ---------- itens "enxutos" para salvar no histórico ---------- */

  function slimItem(it) {
    var o = {};
    ['type', 'id', 'name', 'logo', 'cat', 'url', 'alt', 'ext', 'rating', 'year', 'plot', 'num', 'epgId'].forEach(function (k) {
      if (it[k] !== undefined) { o[k] = it[k]; }
    });
    return o;
  }
  function slimEp(e) {
    return { id: e.id, title: e.title, season: e.season, num: e.num, logo: e.logo || '', url: e.url, duration: e.duration || '' };
  }

  /* ---------- rede (XHR + fallback pelo proxy local do serviço) ---------- */

  var proxy = null, useProxy = false;

  function xhr(url, timeout) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest(), e;
      x.open('GET', url, true);
      x.timeout = timeout || 60000;
      x.onload = function () {
        if (x.status >= 200 && x.status < 300) { resolve(x.responseText); }
        else {
          var body = String(x.responseText || '');
          e = new Error('HTTP ' + x.status + (/^proxy error/.test(body) ? ' (' + body.slice(0, 220) + ')' : ''));
          e.status = x.status;
          reject(e);
        }
      };
      x.onerror = function () { e = new Error('Falha de rede'); e.status = 0; reject(e); };
      x.ontimeout = function () { e = new Error('Tempo esgotado'); e.status = 0; reject(e); };
      x.send();
    });
  }

  function startProxy() {
    if (proxy) { return Promise.resolve(proxy); }
    return new Promise(function (resolve, reject) {
      if (!window.PalmServiceBridge) { return reject(new Error('serviço indisponível')); }
      var b = new window.PalmServiceBridge();
      b.onservicecallback = function (msg) {
        var r;
        try { r = JSON.parse(msg); } catch (e) { return reject(e); }
        if (r.returnValue) { proxy = r; resolve(r); } else { reject(new Error(r.errorText || 'serviço falhou')); }
      };
      b.call('luna://com.rodrigo.iptv.service/start', '{}');
    });
  }

  function viaProxy(url, retried, browser) {
    return startProxy().then(function (p) {
      return xhr('http://127.0.0.1:' + p.port + '/?t=' + p.token + (browser ? '&ua=browser' : '') + '&u=' + encodeURIComponent(url));
    }).then(null, function (e) {
      if (e && e.status === 403 && !retried) { proxy = null; return viaProxy(url, true, browser); }
      throw e;
    });
  }

  function http(url) {
    if (useProxy) { return viaProxy(url); }
    return xhr(url).then(null, function (e) {
      if (e.status !== 0) { throw e; }
      // status 0 = CORS bloqueado ou rede fora; tenta pelo proxy local
      return viaProxy(url).then(function (t) { useProxy = true; return t; }, function (pe) {
        e.detail = 'direto: ' + e.message + ' · proxy local: ' + ((pe && pe.message) || 'falhou');
        throw e;
      });
    });
  }

  /* ---------- sincronização entre aparelhos (TV <-> celular) ---------- */

  var cloudLast = 0, cloudTimer = null, cloudPushTimer = null;
  function cloudUrl() { return Sync.normUrl(store.get('syncurl', '') || Sync.DEFAULT_URL); }
  function cloudCode() { return Sync.normCode(store.get('synccode', '')); }
  function cloudOn() { return !!(cloudUrl() && Sync.validCode(cloudCode())); }

  function cloudState() {
    return { resume: S.resume, cont: S.cont, tomb: store.get('tomb', {}), fav: S.favs, favmeta: store.get('favmeta', {}),
      hist: store.get('hist', []), last: S.last };
  }

  function cloudApply(m) {
    S.resume = m.resume; S.cont = m.cont; S.favs = m.fav; S.last = m.last;
    store.set('resume', m.resume); store.set('cont', m.cont); store.set('fav', m.fav); store.set('last', m.last);
    store.set('tomb', m.tomb); store.set('favmeta', m.favmeta); store.set('hist', m.hist);
  }

  /* itens que saem do "continuar assistindo" (terminou ou limpou) e favoritos marcados/desmarcados precisam de data */
  function markDone(rk) { var t = store.get('tomb', {}); t[rk] = Date.now(); store.set('tomb', t); }
  function stampFav(k, on) { var fm = store.get('favmeta', {}); fm[k] = on ? { at: Date.now() } : { at: Date.now(), del: true }; store.set('favmeta', fm); }

  function cloudNow() {
    if (!cloudOn()) { return Promise.resolve(null); }
    var prof = curProf;
    return Sync.run({
      url: cloudUrl(), code: cloudCode(),
      local: function () { if (prof !== curProf) { throw new Error('perfil mudou'); } return cloudState(); },
      apply: function (m) { if (prof !== curProf) { throw new Error('perfil mudou'); } cloudApply(m); }
    }).then(function (r) {
      cloudLast = Date.now();
      store.set('syncat', cloudLast);
      if (r.pulled) { cloudRefreshHome(); }
      return r;
    });
  }

  function cloudSoon(ms, throttle) {
    if (!cloudOn()) { return; }
    if (throttle && Date.now() - cloudLast < 60000) { return; }
    if (cloudTimer) { clearTimeout(cloudTimer); }
    cloudTimer = setTimeout(function () { cloudTimer = null; cloudNow().then(null, function () {}); }, ms || 0);
  }

  /* chegou dado novo de outro aparelho: atualiza a Início sem tirar o foco de quem está navegando nas fileiras */
  function cloudRefreshHome() {
    if (S.mode !== 'browse' || S.section !== 'home' || S.drawerOpen || !S.pageEl) { return; }
    var cur = Nav.current();
    if (cur && !((cur.classList.contains('hubtab') || cur.classList.contains('hubtile')) && S.pageEl.contains(cur))) { return; }
    var sec = cur && cur.getAttribute('data-sec');
    S.pageEl.innerHTML = '';
    renderHome();
    if (sec) { Nav.focus(S.pageEl.querySelector('[data-sec="' + sec + '"]')); }
  }

  /* ---------- downloads para assistir offline (só no app Android do celular) ---------- */

  function hasDl() { return !!(window.NativeApp && window.NativeApp.dlStart && document.body.classList.contains('phone')); }
  function dlAll() { return store.get('dl', {}); }
  function dlSave(m) { store.set('dl', m); }
  function dlWifiOnly() { return store.get('dlwifi', true) !== false; }
  function dlCount() { return Object.keys(dlAll()).length; }

  function fmtBytes(n) {
    n = Number(n) || 0;
    if (n >= 1e9) { return (n / 1e9).toFixed(1).replace('.', ',') + ' GB'; }
    if (n >= 1e6) { return Math.round(n / 1e6) + ' MB'; }
    return Math.max(0, Math.round(n / 1e3)) + ' KB';
  }

  /* consulta o Android; null = a consulta falhou (nesse caso nada é apagado da lista) */
  function dlQuery(ids) {
    try {
      var r = window.NativeApp.dlStatus(ids.join(','));
      var l = r ? JSON.parse(r) : null;
      return Array.isArray(l) ? l : null;
    } catch (e) { return null; }
  }

  /* situação atual de cada download da lista; some da lista o que o sistema não conhece mais (cancelado, arquivo apagado) */
  function dlRefresh() {
    var m = dlAll(), rks = Object.keys(m), st = {}, changed = false;
    if (!rks.length || !hasDl()) { return st; }
    var res = dlQuery(rks.map(function (k) { return m[k].id; }));
    if (!res) { return S.dlState || st; }
    var byId = {};
    res.forEach(function (o) { byId[o.id] = o; });
    rks.forEach(function (k) {
      var o = byId[m[k].id];
      if (o) { st[k] = o; } else { delete m[k]; changed = true; }
    });
    if (changed) { dlSave(m); }
    S.dlState = st;
    return st;
  }

  function dlPct(st) { return st && st.t > 0 ? Math.max(0, Math.min(100, Math.round(st.b / st.t * 100))) : 0; }

  function dlStateText(st) {
    if (!st) { return ''; }
    if (st.s === 'done') { return 'Baixado · ' + fmtBytes(st.t || st.b); }
    if (st.s === 'running') { return st.t > 0 ? 'Baixando ' + dlPct(st) + '% · ' + fmtBytes(st.b) + ' de ' + fmtBytes(st.t) : 'Baixando…'; }
    if (st.s === 'pending') { return 'Na fila'; }
    if (st.s === 'paused') { return st.r === 3 ? 'Aguardando Wi-Fi' : (st.r === 2 ? 'Aguardando conexão' : (st.r === 1 ? 'Tentando de novo…' : 'Pausado')); }
    return 'Falhou';
  }

  /* endereço do arquivo no celular, se este conteúdo já foi baixado por completo */
  function dlLocalUrl(rk) {
    if (!hasDl() || !rk) { return ''; }
    var en = dlAll()[rk];
    if (!en) { return ''; }
    var res = dlQuery([en.id]), i;
    for (i = 0; res && i < res.length; i++) {
      if (res[i].id === en.id && res[i].s === 'done' && res[i].u) { return res[i].u; }
    }
    return '';
  }

  function dlStart(it, ep, quiet) {
    var rk = ep ? 'e:' + ep.id : 'm:' + it.id, m = dlAll(), url = ep ? ep.url : it.url;
    if (m[rk]) { if (!quiet) { toast('Já está nos downloads', 2000); } return false; }
    if (!/^https?:\/\//i.test(url || '') || /\.m3u8(\?|$)/i.test(url)) { if (!quiet) { toast('Este conteúdo não pode ser baixado', 3500); } return false; }
    var ext = ((String(url).split('?')[0].match(/\.([A-Za-z0-9]{2,4})$/) || [0, 'mp4'])[1]).toLowerCase();
    var title = it.name + (ep ? ' · T' + ep.season + ' E' + ep.num : '');
    var id = NaN;
    try { id = parseInt(window.NativeApp.dlStart(url, 'iptv-' + rk.replace(':', '-') + '.' + ext, title, dlWifiOnly(), navigator.userAgent || ''), 10); } catch (e) {}
    if (!(id > 0)) { if (!quiet) { toast('Não foi possível iniciar o download', 3500); } return false; }
    m[rk] = { rk: rk, id: id, kind: ep ? 'ep' : 'movie', item: slimItem(it), ep: ep ? slimEp(ep) : null, title: title, at: Date.now() };
    dlSave(m);
    if (!quiet) { toast('Baixando: ' + title + (dlWifiOnly() ? ' (só no Wi-Fi)' : ''), 3500); }
    return true;
  }

  function dlRemove(rk) {
    var m = dlAll(), en = m[rk];
    if (!en) { return; }
    try { window.NativeApp.dlRemove(String(en.id)); } catch (e) {}
    delete m[rk];
    dlSave(m);
  }

  function openDownloads() {
    if (S.drawerOpen) { closeDrawer(true); }
    if (S.detail) { closeDetailQuiet(); S.mode = 'browse'; Nav.setScope($('app')); }
    selectSection('dl');
  }

  /* toca o que foi baixado (funciona sem internet); os episódios baixados da mesma série seguem em sequência */
  function dlPlay(en) {
    if (en.kind !== 'ep') { startPlay({ kind: 'movie', item: en.item }); return; }
    var m = dlAll(), st = dlRefresh(), eps = [], idx = 0;
    Object.keys(m).forEach(function (k) {
      var x = m[k];
      if (x.kind === 'ep' && x.item.id === en.item.id && x.item.type === en.item.type && st[k] && st[k].s === 'done') { eps.push(x.ep); }
    });
    eps.sort(function (a, b) { return (parseInt(a.season, 10) - parseInt(b.season, 10)) || (parseInt(a.num, 10) - parseInt(b.num, 10)); });
    eps.forEach(function (e, i) { if (e.id === en.ep.id) { idx = i; } });
    startPlay({ kind: 'ep', item: en.item, eps: eps, idx: idx });
  }

  function dlBtn(it) {
    var rk = 'm:' + it.id, en = dlAll()[rk];
    if (!en) { return h('button', { cls: 'f btn', on: { click: function () { if (dlStart(it, null)) { buildMovieButtons(); } } } }, [icon('dl', 26), 'Baixar']); }
    return h('button', { cls: 'f btn', on: { click: openDownloads } }, [icon('dl', 26), (dlRefresh()[rk] && dlRefresh()[rk].s === 'done') ? 'Baixado' : 'Baixando…']);
  }

  function dlSeason() {
    var D = S.detail, i, s = null, n = 0;
    for (i = 0; i < D.seasons.length; i++) { if (D.seasons[i].n === D.season) { s = D.seasons[i]; } }
    if (!s) { return; }
    s.episodes.forEach(function (ep) { if (dlStart(D.item, ep, true)) { n++; } });
    toast(n ? n + (n > 1 ? ' episódios' : ' episódio') + ' na fila (Temporada ' + D.season + ')' + (dlWifiOnly() ? ' · só no Wi-Fi' : '') : 'Esta temporada já está nos downloads', 3500);
    renderEps();
  }

  /* tela Downloads: lista o que foi baixado e o andamento; atualiza sozinha enquanto está aberta */
  function renderDownloads() {
    var page = S.pageEl;
    page.className = 'page scroll settings dls';
    var wifiSw = h('span', { cls: 'sw' + (dlWifiOnly() ? ' on' : '') }, [h('span', { cls: 'knob' })]);
    var info = h('div', { cls: 'swd dlfree' });
    var list = h('div', { cls: 'dllist' });
    page.appendChild(h('div', { cls: 'f swrow', on: { click: function () {
      store.set('dlwifi', !dlWifiOnly());
      wifiSw.classList.toggle('on', dlWifiOnly());
    } } }, [h('div', { cls: 'swtxt' }, [h('div', { cls: 'swl', text: 'Baixar só no Wi-Fi' }),
      h('div', { cls: 'swd', text: 'Vale para os próximos downloads. Desligado, usa também os dados móveis.' })]), wifiSw]));
    page.appendChild(info);
    page.appendChild(list);

    var lastSig = null, rows = {};
    function confirmBtn(label, fn) {
      var b = h('button', { cls: 'f btn', text: label }), t = null;
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        if (t) { clearTimeout(t); t = null; fn(); return; }
        b.textContent = 'Toque de novo para apagar';
        t = setTimeout(function () { t = null; b.textContent = label; }, 3000);
      });
      return b;
    }
    function rebuild(keys, m, st) {
      list.innerHTML = '';
      rows = {};
      if (!keys.length) { list.appendChild(h('div', { cls: 'empty', text: 'Nada baixado ainda. Abra um filme ou série e toque em Baixar.' })); return; }
      keys.forEach(function (k) {
        var en = m[k], o = st[k], txt = h('div', { cls: 'dlst' }), fill = h('div', { cls: 'fill' });
        var btns = h('div', { cls: 'dlbtns' });
        if (o && o.s === 'done') { btns.appendChild(h('button', { cls: 'f btn primary', on: { click: function () { dlPlay(en); } } }, [icon('play', 26), 'Assistir'])); }
        if (!o || o.s === 'failed') {
          btns.appendChild(h('button', { cls: 'f btn primary', text: 'Tentar de novo', on: { click: function () {
            dlRemove(k);
            var ok = dlStart(en.item, en.ep, false);
            lastSig = null; paint();
            return ok;
          } } }));
        }
        btns.appendChild(confirmBtn('Apagar', function () { dlRemove(k); lastSig = null; paint(); }));
        rows[k] = { txt: txt, fill: fill };
        list.appendChild(h('div', { cls: 'dlrow' }, [
          h('div', { cls: 'dlt', text: en.title }), txt,
          h('div', { cls: 'dlbar' }, [fill]),
          btns
        ]));
      });
      Nav.focus(list.querySelector('.f') || S.headEl.querySelector('.f'));
    }
    function paint() {
      var st = dlRefresh(), m = dlAll();
      var keys = Object.keys(m).sort(function (a, b) { return m[b].at - m[a].at; });
      var sig = keys.map(function (k) { return k + ':' + (st[k] ? st[k].s : '?'); }).join('|');
      if (sig !== lastSig) { lastSig = sig; rebuild(keys, m, st); }
      keys.forEach(function (k) {
        var r = rows[k], o = st[k];
        if (!r) { return; }
        r.txt.textContent = o ? dlStateText(o) : 'Não encontrado';
        r.fill.style.width = (o && o.s === 'done' ? 100 : dlPct(o)) + '%';
      });
      var free = -1;
      try { free = parseFloat(window.NativeApp.dlFree()); } catch (e) {}
      info.textContent = free >= 0 ? 'Espaço livre no celular: ' + fmtBytes(free) : '';
    }
    paint();
    if (S.dlTimer) { clearInterval(S.dlTimer); }
    S.dlTimer = setInterval(function () {
      if (S.section !== 'dl' || !document.body.contains(list)) { clearInterval(S.dlTimer); S.dlTimer = null; return; }
      paint();
    }, 2000);
  }

  /* sem internet ao abrir: entra direto nos downloads */
  function showOffline() {
    S.offline = true;
    S.provider = null;
    showBrowse();
  }

  function reconnect() {
    S.offline = false;
    var cfg = store.get('cfg', null) || S.draft;
    if (cfg && cfg.server) { S.cfg = cfg; connect(cfg, {}); } else { showLogin(); }
  }

  /* ---------- perfis ---------- */

  var PCOLORS = ['#3ab4e0', '#e0603a', '#8a5be0', '#3ab87a', '#e0b43a', '#e03a8a'];
  function profiles() { var l = store.get('profiles', null); return l && l.length ? l : [{ id: 'p1', name: 'Perfil 1', color: 0 }]; }
  function curProfile() { var l = profiles(), i; for (i = 0; i < l.length; i++) { if (l[i].id === curProf) { return l[i]; } } return l[0]; }
  function profInitial(p) { return (p.name || '?').charAt(0).toUpperCase(); }
  /* avatar: a inicial do nome ou um dos ícones (campo "icon" do perfil) */
  var AVICONS = ['av_smile', 'av_cat', 'av_paw', 'av_ghost', 'av_rocket', 'av_bolt', 'av_heart', 'av_crown', 'av_game', 'av_music', 'av_ball', 'av_moon'];
  function avSet(el, p) {
    var art = !!(p.icon && window.Avatars && Avatars.has(p.icon));
    var ic = !art && p.icon && ICONS[p.icon] ? p.icon : '';
    while (el.firstChild && !(el.firstChild.className === 'pedit')) { el.removeChild(el.firstChild); }
    var node;
    if (art) { node = h('span', { cls: 'art' }); node.innerHTML = Avatars.svg(p.icon); }
    else { node = ic ? icon(ic, 60) : h('span', { text: profInitial(p) }); }
    el.classList.toggle('hasart', art);
    el.insertBefore(node, el.firstChild);
    return el;
  }

  function reloadProfileData() {
    S.favs = store.get('fav', {}); S.resume = store.get('resume', {}); S.last = store.get('last', {});
    S.cont = store.get('cont', {}); S.recent = store.get('recent', []); S.opts = store.get('opts', {}); S.pref = store.get('trackpref', {});
    Tmdb.setPref(store.get('verpref', 'dub'));
  }

  function switchProfile(id) {
    var wasBoot = S.profBoot; S.profBoot = false;
    if (S.ctx) { closePlayer(); }   // salva o ponto no perfil que estava assistindo
    curProf = id;
    try { localStorage.setItem('iptv.curprof', JSON.stringify(id)); } catch (e) {}
    reloadProfileData();
    $('profiles').classList.add('hidden');
    S.hubFocus = null; S.section = 'home';
    showBrowse();
    if (wasBoot && opt('autoplay')) { autoOpenLast(); }
  }

  function dropProfileData(id) {
    var pre = 'iptv.' + id + '.', i, k, base, rm = [];
    try {
      for (i = 0; i < localStorage.length; i++) {
        k = localStorage.key(i);
        if (id === 'p1') { base = k.indexOf('iptv.') === 0 ? k.slice(5).split(':')[0] : ''; if (PROF_KEYS[base]) { rm.push(k); } }
        else if (k.indexOf(pre) === 0) { rm.push(k); }
      }
      rm.forEach(function (x) { localStorage.removeItem(x); });
    } catch (e) {}
  }

  function showProfiles(fromApp) {
    S.profFrom = !!fromApp; S.profBoot = !fromApp; S.profManage = false; S.profEdit = null;
    $('profiles').classList.remove('hidden');
    S.mode = 'profiles';
    renderProfiles();
  }

  function closeProfiles() {
    $('profiles').classList.add('hidden');
    S.mode = S.detail ? 'detail' : 'browse';
    Nav.setScope(S.detail ? $('detail') : $('app'));
  }

  function profAvatar(p, big, manage) {
    var el = h('div', { cls: 'pav' + (big ? ' big' : ''), style: 'background-color:' + PCOLORS[p.color % PCOLORS.length] },
      manage ? [h('div', { cls: 'pedit' }, [icon('pencil', 34)])] : []);
    return avSet(el, p);
  }

  function renderProfiles() {
    var box = $('profiles'), list = profiles(), cards = [];
    box.innerHTML = '';
    Nav.setScope(box);
    if (S.profEdit) { renderProfileEdit(box, list); return; }
    list.forEach(function (p) {
      cards.push(h('div', { cls: 'f pcard' + (p.id === curProf ? ' cur' : ''), on: { click: function () {
        if (S.profManage) { S.profEdit = { p: p, isNew: false }; renderProfiles(); }
        else if (p.id === curProf) { if (S.profFrom) { closeProfiles(); } else { switchProfile(p.id); } }
        else { switchProfile(p.id); }
      } } }, [profAvatar(p, true, S.profManage), h('div', { cls: 'pname', text: p.name })]));
    });
    if (list.length < 5) {
      cards.push(h('div', { cls: 'f pcard padd', on: { click: function () {
        S.profManage = true;
        S.profEdit = { p: { id: 'p' + Date.now().toString(36), name: 'Perfil ' + (list.length + 1), color: list.length % PCOLORS.length }, isNew: true };
        renderProfiles();
      } } }, [h('div', { cls: 'pav big add' }, [icon('plus', 70)]), h('div', { cls: 'pname', text: 'Adicionar perfil' })]));
    }
    box.appendChild(h('div', { cls: 'ptitle', text: S.profManage ? 'Gerenciar perfis' : 'Quem está assistindo?' }));
    box.appendChild(h('div', { cls: 'prow' }, cards));
    box.appendChild(h('div', { cls: 'pbtns' }, [
      h('button', { cls: 'f btn' + (S.profManage ? ' primary' : ''), text: S.profManage ? 'Concluído' : 'Gerenciar perfis', on: { click: function () { S.profManage = !S.profManage; renderProfiles(); } } })
    ].concat(S.profFrom && !S.profManage ? [h('button', { cls: 'f btn', text: 'Fechar', on: { click: closeProfiles } })] : [])));
    Nav.focus(box.querySelector('.pcard.cur') || box.querySelector('.pcard'));
  }

  function renderProfileEdit(box, list) {
    var e = S.profEdit, p = { id: e.p.id, name: e.p.name, color: e.p.color, icon: e.p.icon || '' }, input = h('input', { cls: 'f input', type: 'text', placeholder: 'Nome do perfil' });
    input.value = p.name;
    input.maxLength = 16;
    var sw = h('div', { cls: 'pswatches' }), preview = profAvatar(p, true, false), ics = h('div', { cls: 'picons' });
    var swBtns = [], icBtns = [];
    // os botões são criados uma vez; escolher só troca a marca (o foco do controle não se perde)
    PCOLORS.forEach(function (c, i) {
      var b = h('button', { cls: 'f swatch', type: 'button', style: 'background:' + c, on: { click: function () { p.color = i; paint(); } } });
      swBtns.push(b); sw.appendChild(b);
    });
    function addTile(box, k, name) {
      var b = avSet(h('button', { cls: 'f aicon' + (k ? ' art' : ''), type: 'button', title: name, on: { click: function () { p.icon = k; paint(); } } }), { name: p.name, icon: k });
      b._k = k; icBtns.push(b); box.appendChild(b);
    }
    var first = h('div', { cls: 'pgrow' });
    addTile(first, '', 'Inicial do nome');
    ics.appendChild(h('div', { cls: 'pgtitle', text: 'Simples (a inicial do nome)' }));
    ics.appendChild(first);
    Avatars.GROUPS.forEach(function (g) {
      ics.appendChild(h('div', { cls: 'pgtitle', text: g.name }));
      var row = h('div', { cls: 'pgrow' });
      g.items.forEach(function (it) { addTile(row, it.key, it.name); });
      ics.appendChild(row);
    });
    function paint() {
      swBtns.forEach(function (b, i) { b.classList.toggle('on', i === p.color); });
      icBtns.forEach(function (b) {
        b.classList.toggle('on', b._k === (p.icon || ''));
        if (!b._k) { avSet(b, { name: p.name, icon: '' }); }
      });
      avSet(preview, p);
      preview.style.backgroundColor = PCOLORS[p.color];
      sw.style.display = (p.icon && window.Avatars && Avatars.has(p.icon)) ? 'none' : '';
    }
    paint();
    input.addEventListener('input', function () { p.name = input.value || '?'; paint(); });
    var del = null;
    if (!e.isNew && list.length > 1) {
      del = h('button', { cls: 'f btn', text: 'Excluir perfil', on: { click: function () {
        if (del.getAttribute('data-ok') !== '1') { del.setAttribute('data-ok', '1'); del.textContent = 'Confirmar exclusão'; return; }
        var rest = list.filter(function (x) { return x.id !== p.id; });
        dropProfileData(p.id);
        store.set('profiles', rest);
        S.profEdit = null;
        if (p.id === curProf) { switchProfile(rest[0].id); showProfiles(S.profFrom); S.profManage = true; renderProfiles(); }
        else { renderProfiles(); }
      } } });
    }
    box.appendChild(h('div', { cls: 'ptitle', text: e.isNew ? 'Novo perfil' : 'Editar perfil' }));
    box.appendChild(h('div', { cls: 'pform' }, [preview, input, sw, ics]));
    box.appendChild(h('div', { cls: 'pbtns' }, [
      h('button', { cls: 'f btn primary', text: 'Salvar', on: { click: function () {
        p.name = (input.value || '').replace(/^\s+|\s+$/g, '') || p.name;
        var l2 = e.isNew ? list.concat([p]) : list.map(function (x) { return x.id === p.id ? p : x; });
        store.set('profiles', l2);
        S.profEdit = null;
        renderProfiles();
      } } }),
      h('button', { cls: 'f btn', text: 'Cancelar', on: { click: function () { S.profEdit = null; renderProfiles(); } } })
    ].concat(del ? [del] : [])));
    Nav.focus(input);
  }


  /* ---------- esportes: placares, meus times e jogos nos seus canais ---------- */

  function spFollow() { return store.get('sportteams', {}); }
  function spToggleFollow(t) {
    var f = spFollow();
    if (f[t.id]) { delete f[t.id]; toast('Deixou de seguir ' + t.name, 1600); }
    else { f[t.id] = { id: t.id, name: t.name, logo: t.logo }; toast('Seguindo ' + t.name, 1600); }
    store.set('sportteams', f);
  }
  function spDay(off) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + off); return d; }
  var SP_WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  function spDayLabel(off) {
    if (off === -1) { return 'Ontem'; }
    if (off === 0) { return 'Hoje'; }
    if (off === 1) { return 'Amanhã'; }
    var d = spDay(off);
    return SP_WD[d.getDay()] + ' ' + (d.getDate() < 10 ? '0' : '') + d.getDate();
  }
  function spGame(g) { return g.league + ':' + g.id; }
  var spEpg = {};

  /* guarda no aparelho jogos, canais encontrados e programação, para não procurar tudo de novo ao abrir o app */
  function spCacheId() { return S.cfg && S.cfg.server ? (S.cfg.server.replace(/^https?:\/\//i, '').replace(/\/.*$/, '') + '|' + (S.cfg.user || '')) : ''; }
  var spSaveT = null;
  function spPersist() {
    clearTimeout(spSaveT);
    spSaveT = setTimeout(function () {
      var sp = S.sp, id = spCacheId();
      if (!sp || !id) { return; }
      var epg = {}, now = Date.now();
      Object.keys(spEpg).forEach(function (k) {
        var c = spEpg[k];
        if (now - c.at > 6 * 3600000) { return; }
        epg[k] = { at: c.at, list: c.list.map(function (e) { return { title: e.title, desc: (e.desc || '').slice(0, 140), start: e.start, stop: e.stop }; }) };
      });
      store.set('spcache', { id: id, days: sp.days, chan: sp.chan, chanAt: sp.chanAt, noguide: sp.noguide || [], epg: epg });
    }, 800);
  }
  function spLoadCache(sp) {
    var c = store.get('spcache', null), id = spCacheId(), now = Date.now();
    if (!c || !id || c.id !== id) { return; }
    var td = Sports.ymd(spDay(0));
    Object.keys(c.days || {}).forEach(function (k) { if (k >= td) { sp.days[k] = c.days[k]; } });   // dias passados não voltam do cache
    sp.chan = c.chan || {};
    sp.chanAt = c.chanAt || 0;
    sp.noguide = c.noguide || [];
    Object.keys(c.epg || {}).forEach(function (k) { if (now - c.epg[k].at < 6 * 3600000) { spEpg[k] = c.epg[k]; } });
    if (Object.keys(sp.days).length) { sp.ok = true; spMerge(); }
  }
  /* a programação guardada vale enquanto cobrir as próximas horas (assim não consulta de novo canal por canal) */
  function spEpgFresh(c) {
    if (!c) { return false; }
    var age = Date.now() - c.at;
    if (age < 300000) { return true; }
    var last = c.list.length ? c.list[c.list.length - 1].stop : 0;
    return age < 3 * 3600000 && last > Date.now() + 2 * 3600000;
  }

  /* a fonte só entrega um dia por consulta: guarda cada dia (hoje renova rápido, os outros devagar) e junta tudo */
  function spNeeded() {
    var sp = S.sp, out = [0], i;
    if (sp.tab === 'teams') { for (i = 1; i <= 5; i++) { out.push(i); } }
    else if (sp.day !== 0) { out.push(sp.day); }
    return out;
  }

  function spMerge() {
    var sp = S.sp, seen = {}, out = [], keys = Object.keys(sp.days).sort(function (a, b) { return sp.days[b].at - sp.days[a].at; });
    var now = Date.now();
    keys.forEach(function (k) {
      var stale = now - sp.days[k].at > 10 * 60000;   // dia que não é atualizado há tempo: "ao vivo" ali já não vale
      sp.days[k].games.forEach(function (g) {
        if (g.state === 'in' && (stale || now - g.start > 5 * 3600000)) { return; }
        if (!seen[spGame(g)]) { seen[spGame(g)] = 1; out.push(g); }
      });
    });
    out.sort(function (a, b) { return a.start - b.start; });
    sp.games = out;
    if (sp.game) { sp.game = spFresh(sp.game); }
  }

  function spEnsure(offs, force) {
    var sp = S.sp, token = S.loadToken, now = Date.now(), chain = Promise.resolve(), any = false;
    offs.forEach(function (o) {
      var k = Sports.ymd(spDay(o)), c = sp.days[k], ttl = o === 0 ? 40000 : 600000;
      if ((sp.pend[k] && now - sp.pend[k] < 25000) || (c && !(force && o === 0) && now - c.at < ttl)) { return; }
      sp.pend[k] = now;
      any = true;
      chain = chain.then(function () {
        if (token !== S.loadToken) { delete sp.pend[k]; return null; }
        return Sports.fetchDay(http, spDay(o)).then(function (r) {
          delete sp.pend[k];
          sp.tried = true;
          sp.failed = r.failed;
          if (r.failed.length < Sports.LEAGUES.length) { sp.days[k] = { at: Date.now(), games: r.games }; sp.ok = true; spMerge(); spPersist(); }
          else if (!sp.ok) { sp.ok = false; }
          if (token === S.loadToken && S.section === 'sports') { paintSports(); }
        });
      });
    });
    if (any) { paintSports(); }
    chain.then(function () { if (token === S.loadToken && S.section === 'sports') { spScan(false); } });
    return chain;
  }

  function spFresh(g) {
    var i, list = S.sp.games;
    for (i = 0; i < list.length; i++) { if (spGame(list[i]) === spGame(g)) { return list[i]; } }
    return g;
  }

  /* procura, na programação dos seus canais, qual deles passa cada jogo (ao vivo ou nas próximas 12 h) */
  function spScan(force, nocache) {
    var sp = S.sp, now = Date.now(), token = S.loadToken, failedEpg = {};
    if (!S.provider || !S.provider.hasEpg || sp.scanning) { return; }
    if (!force && sp.chanAt && now - sp.chanAt < 300000) { return; }
    var fol = spFollow();
    var want = sp.games.filter(function (g) {
      return Sports.visible(g, fol) && (g.state === 'in' || (g.state === 'pre' && g.start > now - 3600000 && g.start - now < 12 * 3600000));
    });
    if (!want.length) { sp.chan = {}; sp.chanAt = now; paintSports(); return; }
    sp.scanning = true;
    paintSports();
    Promise.all([S.provider.categories('live'), S.provider.all('live')]).then(function (r) {
      var PRI = /premiere|sportv|espn|tnt|caz[eé]|globo|max|sbt|record|band/i;
      var cands = Sports.candidateChannels(filterLive(r[1]), r[0], 160).sort(function (a, b) { return (PRI.test(b.name) ? 1 : 0) - (PRI.test(a.name) ? 1 : 0); });
      var progs = {}, i = 0, busy = 0, done = 0, finishing = false;
      sp.prog = { done: 0, total: cands.length };
      return new Promise(function (resolve) {
        function pump() {
          if (token !== S.loadToken) { resolve(null); return; }
          while (busy < 8 && i < cands.length) {
            (function (ch) {
              var c = spEpg[ch.id];
              if (!nocache && spEpgFresh(c)) { progs[ch.id] = c.list; return; }
              busy++;
              S.provider.epg(ch, 12).then(function (list) { return list; }, function () { return null; }).then(function (list) {
                if (list) { spEpg[ch.id] = { at: Date.now(), list: list }; progs[ch.id] = list; }
                else { failedEpg[ch.id] = 1; progs[ch.id] = spEpg[ch.id] ? spEpg[ch.id].list : []; }   // falha do provedor: não vira "sem programação"

                busy--;
                done++;
                sp.prog.done = done;
                if (done % 10 === 0 && token === S.loadToken && S.section === 'sports') { paintSports(); }
                pump();
              });
            })(cands[i++]);
          }
          if (busy === 0 && i >= cands.length && !finishing) {
            finishing = true;
            // canais Premiere sem guia (ou sem jogo identificado nele): palpite para jogos do Brasileirão que não acharam canal
            var VS = / (x|vs\.?|v) /i;
            sp.noguide = filterLive(r[1]).filter(function (ch) {
              if (!/premiere/i.test(ch.name || '')) { return false; }
              var l = progs[ch.id];
              return !ch.epgId || !l || !l.length || !l.some(function (e) { return VS.test(' ' + (e.title || '') + ' '); });
            }).slice(0, 12);
            var res = Sports.assign(want, cands, progs);
            // jogo no ar (ou quase) sem canal: a programação guardada pode estar velha (o provedor atualiza o título depois);
            // rechecar os canais principais sem usar o que está guardado
            var nowT = Date.now();
            var missing = want.filter(function (g) { return !res[spGame(g)] && (g.state === 'in' || g.start - nowT < 2 * 3600000); });
            var stale = missing.length && !nocache ? cands.filter(function (ch) { return PRI.test(ch.name) && !(spEpg[ch.id] && nowT - spEpg[ch.id].at < 480000); }).slice(0, 50) : [];
            if (!stale.length) { resolve(res); return; }
            var k = 0, bz = 0;
            (function again() {
              if (token !== S.loadToken) { resolve(null); return; }
              while (bz < 8 && k < stale.length) {
                (function (ch) {
                  bz++;
                  S.provider.epg(ch, 12).then(function (list) { return list; }, function () { return null; }).then(function (list) {
                    if (list) { spEpg[ch.id] = { at: Date.now(), list: list }; progs[ch.id] = list; delete failedEpg[ch.id]; }
                    bz--; again();
                  });
                })(stale[k++]);
              }
              if (bz === 0 && k >= stale.length) { resolve(Sports.assign(want, cands, progs)); }
            })();
          }
        }
        pump();
      });
    }).then(function (res) {
      sp.scanning = false;
      if (res) {
        // canal cuja consulta falhou agora: mantém o que já tinha sido achado para ele (não perde o link por falha do provedor)
        var prev = sp.chan || {};
        want.forEach(function (g) {
          var k = spGame(g), cur = res[k] || [], have = {};
          cur.forEach(function (x) { have[x.ch.id] = 1; });
          var add = (prev[k] || []).filter(function (x) { return !have[x.ch.id] && failedEpg[x.ch.id]; });
          if (add.length) { res[k] = cur.concat(add); }
        });
        sp.chan = res; sp.chanAt = Date.now(); spPersist();
      }
      if (token === S.loadToken && S.section === 'sports') { paintSports(); }
    }, function () { sp.scanning = false; sp.chanAt = Date.now(); });
  }

  /* afiliadas da mesma rede (Globo Amapá, Globo SP, Globo Cuiabá…) viram uma só: prefere SP, depois FHD */
  var SP_NET = /^(globo|record|sbt|band)\b/i;
  function spNetScore(n) { return (/(^|[^A-Za-z0-9])SP($|[^A-Za-z0-9])/i.test(n) ? 4 : 0) + (/FHD/i.test(n) ? 2 : 0) + (/4K|UHD/i.test(n) ? 1 : 0); }
  var SP_HQ = /FHD|4K|UHD/i;
  function spDedupe(hits) {
    // só FHD ou 4K: canais HD/SD ficam de fora quando existe versão FHD/4K (se só houver HD/SD, mantém para não perder o jogo)
    var hq = hits.filter(function (x) { return SP_HQ.test(x.ch.name || ''); });
    if (hq.length) { hits = hq; }
    var best = {}, out = [];
    hits.forEach(function (x) {
      var m = SP_NET.exec(x.ch.name || '');
      if (m) { var k = m[1].toLowerCase(); if (!best[k] || spNetScore(x.ch.name) > spNetScore(best[k].ch.name)) { best[k] = x; } }
    });
    hits.forEach(function (x) {
      var m = SP_NET.exec(x.ch.name || '');
      if (!m) { out.push(x); return; }
      var k = m[1].toLowerCase();
      if (best[k] === x) { out.push(x); }
    });
    return out;
  }
  function spHits(g) { return spDedupe((S.sp.chan && S.sp.chan[spGame(g)]) || []); }
  /* palpite: jogo do Brasileirão sem canal no guia -> canais Premiere sem guia (o Premiere exibe todos os jogos) */
  function spGuess(g) {
    if (g.league !== 'bra.1' || g.state === 'post' || spHits(g).length) { return []; }
    return (S.sp.noguide || []).filter(function (ch) { return ch && ch.id; });
  }

  function spPlay(g, idx) {
    var hits = spHits(g);
    if (!hits.length) {
      var gs = spGuess(g);
      if (gs.length) { startPlay({ kind: 'live', list: gs, idx: idx || 0 }); }
      return;
    }
    startPlay({ kind: 'live', list: hits.map(function (x) { return x.ch; }), idx: idx || 0 });
  }

  function spLogo(t, cls) {
    var el = h('div', { cls: cls || 'splogo' });
    if (t.logo) { imgEl(t.logo, el); }
    return el;
  }

  function spCard(g, o) {
    o = o || {};
    var fol = spFollow(), hits = spHits(g), live = g.state === 'in';
    function trow(t) {
      return h('div', { cls: 'sprow' + (t.winner ? ' win' : '') }, [
        spLogo(t), h('div', { cls: 'spname', text: t.name }),
        fol[t.id] ? h('span', { cls: 'spstar' }, [icon('starfill', 20)]) : null,
        h('div', { cls: 'spscore', text: g.state === 'pre' ? '' : t.score })
      ]);
    }
    var st = Sports.statusText(g);
    if (o.date && g.state === 'pre' && Sports.dayKey(g.start) !== Sports.ymd(new Date())) { st = SP_WD[new Date(g.start).getDay()] + ' ' + st; }
    var wr = g.state === 'post' ? null : Sports.whereToWatch(g), wh = wr ? h('div', { cls: 'spwh' }, [h('span', { text: 'Onde: ' + wr.short })]) : null;
    var ch = null;
    if (hits.length) {
      ch = h('div', { cls: 'spch' }, [icon('live', 18), h('span', { text: hits[0].ch.name + (hits.length > 1 ? '  +' + (hits.length - 1) : '') })]);
    } else if (spGuess(g).length) {
      var gg = spGuess(g);
      ch = h('div', { cls: 'spch guess' }, [icon('live', 18), h('span', { text: 'Palpite: ' + gg[0].name + (gg.length > 1 ? '  +' + (gg.length - 1) : '') })]);
    }
    return h('button', { cls: 'f spcard' + (live ? ' live' : ''), type: 'button', 'data-k': 'g:' + spGame(g), on: { click: function () {
      if (o.play && hits.length) { spPlay(g, 0); } else { S.sp.game = g; S.sp.autoFocus = true; S.sp.autoKey = null; if (S.section === 'sports') { renderSports(); } else { selectSection('sports'); } }
    } } }, [
      h('div', { cls: 'sptop' }, [h('div', { cls: 'splg', text: g.leagueName }), h('div', { cls: 'spst' + (live ? ' live' : (g.state === 'post' ? ' done' : '')), text: st })]),
      trow(g.home), trow(g.away), ch, wh
    ]);
  }

  function spGroupByLeague(games, o) {
    var out = [];
    Sports.LEAGUES.forEach(function (lg) {
      var l = games.filter(function (g) { return g.league === lg.id; });
      if (l.length) {
        out.push(h('div', { cls: 'spgroup' }, [h('div', { cls: 'sptitle', text: lg.name }), h('div', { cls: 'spgrid' }, l.map(function (g) { return spCard(g, o); }))]));
      }
    });
    return out;
  }

  function spNote(txt, retry) {
    var kids = [h('div', { cls: 'spnote', text: txt })];
    if (retry) { kids.push(h('button', { cls: 'f btn', type: 'button', text: 'Tentar de novo', on: { click: function () { S.sp.ok = null; S.sp.tried = false; spEnsure(spNeeded(), true); } } })); }
    return h('div', { cls: 'spempty' }, kids);
  }

  function spOrder(a, b) { return (b.state === 'in') - (a.state === 'in') || a.start - b.start; }

  function spBodyScores(body) {
    var sp = S.sp, fol = spFollow(), chips = [], off;
    for (off = -1; off <= 6; off++) {
      (function (o) {
        chips.push(h('button', { cls: 'f spchip' + (o === sp.day ? ' on' : ''), type: 'button', text: spDayLabel(o), 'data-k': 'd:' + o,
          on: { click: function () { sp.day = o; paintSports(); spEnsure(spNeeded()); } } }));
      })(off);
    }
    body.appendChild(h('div', { cls: 'spchips' }, chips));
    var key = Sports.dayKey(spDay(sp.day).getTime());
    var games = sp.games.filter(function (g) { return Sports.dayKey(g.start) === key && g.state !== 'in' && Sports.visible(g, fol); }).sort(spOrder);
    if (sp.day === 0) {
      // jogos ao vivo aparecem sempre em "Hoje", mesmo os que começaram antes da meia-noite
      var live = sp.games.filter(function (g) { return g.state === 'in' && Sports.visible(g, fol); }).sort(spOrder);
      if (live.length) {
        body.appendChild(h('div', { cls: 'spgroup' }, [h('div', { cls: 'sptitle', text: 'Ao vivo agora' }), h('div', { cls: 'spgrid' }, live.map(function (g) { return spCard(g); }))]));
      }
    }
    spGroupByLeague(games).forEach(function (el) { body.appendChild(el); });
    if (!body.querySelector('.spgroup')) { body.appendChild(spNote(sp.pend[key] || !sp.days[key] ? 'Carregando…' : 'Nenhum jogo das ligas acompanhadas neste dia.')); }
    if (sp.failed && sp.failed.length >= Math.ceil(Sports.LEAGUES.length / 2)) {
      body.appendChild(h('div', { cls: 'spwarn', text: 'Não carregou: ' + sp.failed.map(function (id) { var l = Sports.league(id); return l ? l.short : id; }).join(', ') + '.' }));
    }
  }

  function spBodyTeams(body) {
    var sp = S.sp, fol = spFollow(), ids = Object.keys(fol);
    if (!ids.length) {
      body.appendChild(spNote('Você ainda não segue nenhum time. Abra um jogo e escolha "Seguir" no time que quiser: ele ganha uma estrela e aparece aqui.'));
      return;
    }
    body.appendChild(h('div', { cls: 'spchips' }, ids.map(function (id) {
      var t = fol[id], el = h('button', { cls: 'f spchip team', type: 'button', 'data-k': 't:' + id, title: 'Deixar de seguir',
        on: { click: function () { spToggleFollow(t); paintSports(); } } }, [spLogo(t, 'splogo sm'), h('span', { text: t.name }), icon('xmark', 18)]);
      return el;
    })));
    var now = Date.now(), games = sp.games.filter(function (g) { return (fol[g.home.id] || fol[g.away.id]) && (g.state !== 'post' || now - g.start < 24 * 3600000); }).sort(spOrder);
    if (!games.length) { body.appendChild(spNote(Object.keys(sp.pend).length ? 'Carregando…' : 'Nenhum jogo dos seus times nos próximos dias.')); return; }
    body.appendChild(h('div', { cls: 'spgroup' }, [h('div', { cls: 'sptitle', text: 'Jogos dos seus times' }), h('div', { cls: 'spgrid' }, games.map(function (g) { return spCard(g, { date: true }); }))]));
  }

  function spBodyChannels(body) {
    var sp = S.sp, now = Date.now();
    if (!S.provider || !S.provider.hasEpg) { body.appendChild(spNote('Este servidor não tem guia de programação, então não dá para ligar o jogo ao canal.')); return; }
    var games = sp.games.filter(function (g) { return spHits(g).length; }).sort(spOrder);
    if (sp.scanning && !games.length) { body.appendChild(spNote('Procurando o jogo nos seus canais…')); return; }
    if (!games.length) {
      body.appendChild(spNote('Nenhum jogo ao vivo ou das próximas horas foi encontrado nos seus canais. Ele depende do nome dos times na programação do seu provedor.'));
      body.appendChild(h('button', { cls: 'f btn', type: 'button', text: 'Procurar de novo', on: { click: function () { spScan(true); } } }));
      return;
    }
    body.appendChild(h('div', { cls: 'spnote small', text: 'OK sintoniza o canal. ' + (sp.scanning ? 'Atualizando…' : '') }));
    body.appendChild(h('div', { cls: 'spgrid' }, games.map(function (g) { return spCard(g, { play: true, date: true }); })));
  }

  function spStatRow(label, a, b) {
    if (!a && !b) { return null; }
    return h('div', { cls: 'spstat' }, [h('span', { cls: 'a', text: a || '–' }), h('span', { cls: 'l', text: label }), h('span', { cls: 'b', text: b || '–' })]);
  }

  function spBodyGame(body) {
    var sp = S.sp, g = sp.game, hits = spHits(g), fol = spFollow(), a = g.home.stats, b = g.away.stats;
    body.appendChild(h('button', { cls: 'f btn spback', type: 'button', 'data-k': 'back', on: { click: function () { sp.game = null; renderSports(); } } }, [icon('back', 24), 'Jogos']));
    function big(t) {
      return h('div', { cls: 'spbig' }, [spLogo(t, 'splogo xl'), h('div', { cls: 'spbname', text: t.name }), h('div', { cls: 'spbscore', text: g.state === 'pre' ? '–' : t.score })]);
    }
    body.appendChild(h('div', { cls: 'spscoreboard' }, [big(g.home), h('div', { cls: 'spmid' }, [
      h('div', { cls: 'splg', text: g.leagueName }), h('div', { cls: 'spst' + (g.state === 'in' ? ' live' : ''), text: Sports.statusText(g) }),
      h('div', { cls: 'spdate', text: SP_WD[new Date(g.start).getDay()] + ' ' + new Date(g.start).getDate() + '/' + (new Date(g.start).getMonth() + 1) + (g.venue ? ' · ' + g.venue : '') })
    ]), big(g.away)]));
    if (g.goals.length) {
      body.appendChild(h('div', { cls: 'sptitle', text: 'Gols' }));
      body.appendChild(h('div', { cls: 'spgoals' }, g.goals.map(function (x) {
        return h('div', { cls: 'spgoal' + (x.home ? '' : ' away'), text: (x.min ? x.min + '  ' : '') + x.who + (x.pen ? ' (pênalti)' : '') + (x.own ? ' (contra)' : '') });
      })));
    }
    var rows = [spStatRow('Posse de bola', a.poss && a.poss + '%', b.poss && b.poss + '%'), spStatRow('Finalizações', a.shots, b.shots), spStatRow('No alvo', a.sot, b.sot),
      spStatRow('Escanteios', a.corners, b.corners), spStatRow('Faltas', a.fouls, b.fouls), spStatRow('Amarelos', a.yellow, b.yellow), spStatRow('Vermelhos', a.red, b.red)].filter(Boolean);
    if (rows.length && g.state !== 'pre') { body.appendChild(h('div', { cls: 'sptitle', text: 'Estatísticas' })); body.appendChild(h('div', { cls: 'spstats' }, rows)); }
    body.appendChild(h('div', { cls: 'sptitle', text: 'Onde assistir (seus canais)' }));
    if (hits.length) {
      body.appendChild(h('div', { cls: 'spwatch' }, hits.slice(0, 6).map(function (x, i) {
        return h('button', { cls: 'f btn spplay' + (i === 0 ? ' primary' : ''), type: 'button', 'data-k': 'p:' + i, on: { click: function () { spPlay(g, i); } } },
          [icon('play', 22), x.ch.name, h('small', { text: x.prog && x.prog.title ? x.prog.title : '' })]);
      })));
    } else if (spGuess(g).length) {
      body.appendChild(h('div', { cls: 'spnote small', text: 'Não achei este jogo no guia. Palpite: o Premiere exibe todos os jogos do Brasileirão e estes canais seus estão sem guia — confira qual deles está passando.' }));
      body.appendChild(h('div', { cls: 'spwatch' }, spGuess(g).slice(0, 8).map(function (ch, i) {
        return h('button', { cls: 'f btn spplay', type: 'button', 'data-k': 'p:' + i, on: { click: function () { spPlay(g, i); } } }, [icon('play', 22), ch.name, h('small', { text: 'sem guia' })]);
      })));
    } else {
      if (S.provider && S.provider.hasEpg && !sp.scanning && g.state !== 'post') {
        body.appendChild(h('div', { cls: 'spwatch' }, [h('button', { cls: 'f btn', type: 'button', 'data-k': 'rescan', on: { click: function () { toast('Procurando de novo nos seus canais…', 2500); spScan(true, true); } } }, [icon('search', 22), 'Procurar canais de novo'])]));
      }
      body.appendChild(h('div', { cls: 'spnote small', text: !S.provider || !S.provider.hasEpg ? 'Este servidor não tem guia de programação.' : (sp.scanning ? 'Procurando nos seus canais…' + (sp.prog && sp.prog.total ? ' (' + sp.prog.done + ' de ' + sp.prog.total + ')' : '') : 'Nenhum dos seus canais parece passar este jogo agora (ou o provedor escreve os nomes de outro jeito).') }));
    }
    var wr = Sports.whereToWatch(g);
    if (wr) {
      body.appendChild(h('div', { cls: 'sptitle', text: 'Onde assistir (outras fontes)' }));
      body.appendChild(h('div', { cls: 'spwhlist' }, wr.lines.map(function (l) { return h('div', { cls: 'spwhrow', text: l }); }).concat([
        h('div', { cls: 'spnote small', text: 'Serviços como HBO Max, Paramount+, Prime Video e YouTube não têm guia de programação no seu servidor, por isso não viram botão de canal. Direitos conforme a imprensa (nov/2026); podem variar por jogo.' })
      ])));
    }
    var yts = wr ? Sports.youtubeLinks(wr) : [];
    if (yts.length) {
      body.appendChild(h('div', { cls: 'spwatch' }, yts.map(function (y) {
        return h('button', { cls: 'f btn primary', type: 'button', 'data-k': 'yt:' + y.label, on: { click: function () { openYouTube(y, g); } } },
          [icon('play', 22), 'Abrir ' + y.label + ' no YouTube']);
      })));
    }
    body.appendChild(h('div', { cls: 'spwatch' }, [g.home, g.away].map(function (t) {
      var on = !!fol[t.id];
      return h('button', { cls: 'f btn', type: 'button', 'data-k': 'f:' + t.id, on: { click: function () { spToggleFollow(t); paintSports(); } } },
        [icon(on ? 'starfill' : 'star', 22), (on ? 'Seguindo ' : 'Seguir ') + t.name]);
    })));
  }

  /* abre a transmissão do jogo no YouTube: Android (app do YouTube) e webOS (app YouTube da TV, inclusive youtube-webos).
     Canais como a CazéTV têm várias lives ao mesmo tempo; por isso procura a que cita os times, primeiro na lista
     /streams do canal e depois no feed RSS. Sem achar, não abre outra transmissão: Android abre a busca, a LG abre o YouTube. */
  var YT_APP = 'youtube.leanback.v4';
  function ytGet(url) {   // páginas do YouTube precisam de User-Agent de navegador
    if (window.NativeApp && window.NativeApp.openUrl) { return xhr(url, 20000).then(null, function () { return http(url); }); }
    return viaProxy(url, false, true);
  }
  function openYouTube(y, g) {
    var label = y.label, android = !!(window.NativeApp && window.NativeApp.openUrl), webos = !android && !!window.PalmServiceBridge;
    var searchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(g.home.name + ' ' + g.away.name + ' ' + label + ' ao vivo') + '&sp=EgJAAQ%3D%3D';
    var failMsg = 'Abra o YouTube e procure por ' + label + '.';
    if (!android && !webos) { toast(failMsg, 5000); return; }
    var lunaCall = function (uri, params, cb) {
      var b = new window.PalmServiceBridge();
      b.onservicecallback = cb || function () {};
      b.call(uri, JSON.stringify(params));
    };
    var launch = function (videoId) {
      if (android) {
        // sem achar o jogo, abre a página do canal oficial (nunca uma busca geral, que traz reações e watchalongs)
        try { if (window.NativeApp.openUrl(videoId ? 'https://www.youtube.com/watch?v=' + videoId : (y.streams || y.url))) { return; } } catch (e) {}
        toast('Não consegui abrir o YouTube. Procure por ' + label + ' lá.', 4000);
        return;
      }
      var go = function () {
        try {
          lunaCall('luna://com.webos.applicationManager/launch', { id: YT_APP, params: videoId ? { contentTarget: 'v=' + videoId } : {} }, function (msg) {
            var r = {}; try { r = JSON.parse(msg); } catch (e) {}
            if (!r.returnValue) { toast(failMsg, 5000); }
          });
        } catch (e) { toast(failMsg, 5000); }
      };
      if (!videoId) { go(); return; }
      // com o app do YouTube já aberto, o novo vídeo é ignorado: fecha antes e abre de novo
      try { lunaCall('luna://com.webos.applicationManager/closeByAppId', { id: YT_APP }); } catch (e) {}
      setTimeout(go, 900);
    };

    var diag = [];
    var viaFeed = function (cid) {
      if (!cid) { diag.push('sem id do canal'); return Promise.resolve(null); }
      return ytGet('https://www.youtube.com/feeds/videos.xml?channel_id=' + cid).then(function (xml) {
        diag.push('feed ' + Sports.parseFeed(xml).length + ' vídeos');
        return Sports.pickFeed(xml, g, Date.now());
      }, function (e) { diag.push('feed: erro ' + ((e && e.message) || '?')); return null; });
    };
    toast('Procurando o jogo na ' + label + '…', 3000);
    var cidKnown = y.cid || null;
    var scan = function (name, url) {
      return ytGet(url).then(function (html) {
        var all = Sports.parseStreams(html), lives = all.filter(function (x) { return x.live; }).length;
        diag.push(name + ' ' + Math.round(String(html || '').length / 1000) + ' KB, ' + all.length + ' vídeos, ' + lives + ' ao vivo');
        if (!cidKnown) { cidKnown = Sports.channelId(html); }
        return Sports.pickLive(html, g, label);
      }, function (e) { diag.push(name + ': erro ' + ((e && e.message) || '?')); return null; });
    };
    // só vale transmissão do canal oficial. 1) busca (ao vivo) filtrando pelo canal; 2) lista /streams do canal; 3) feed RSS
    scan('busca', searchUrl).then(function (pick) {
      return pick || (y.streams ? scan('canal', y.streams) : null);
    }).then(function (pick) {
      return pick || viaFeed(cidKnown);
    }).then(function (pick) {
      if (pick) { launch(pick.id); return; }
      toast('Não achei ' + g.home.name + ' x ' + g.away.name + ' ao vivo na ' + label + ' agora. (' + diag.join('; ') + ')', 9000);
      launch(null);
    });
  }

  /* ---------- aviso de gols (pop-up) nos jogos ao vivo ---------- */
  var GW = { last: {}, leagues: [], scanAt: 0, busy: false, q: [], showing: false };
  function goalMode() { return store.get('goalalert', 'all'); }   // 'off' | 'mine' | 'all'
  function gwWanted(g, mode) {
    if (mode === 'all') { return true; }
    var f = spFollow();
    return g.home.abbr === 'BRA' || g.away.abbr === 'BRA' || !!f[g.home.id] || !!f[g.away.id];
  }
  function gwShow() {
    if (GW.showing || !GW.q.length) { return; }
    var a = GW.q.shift(), el = $('goal');
    GW.showing = true;
    el.innerHTML = '';
    el.appendChild(h('div', { cls: 'goaltop', text: '⚽ GOL' + (a.team ? ' — ' + a.team : '') }));
    el.appendChild(h('div', { cls: 'goalscore', text: a.line }));
    if (a.sub) { el.appendChild(h('div', { cls: 'goalsub', text: a.sub })); }
    el.classList.remove('hidden');
    setTimeout(function () { el.classList.add('in'); }, 20);
    setTimeout(function () {
      el.classList.remove('in');
      setTimeout(function () { el.classList.add('hidden'); GW.showing = false; gwShow(); }, 400);
    }, 7000);
  }
  function gwGoal(g, scorer) {
    var lastGoal = g.goals && g.goals.length ? g.goals[g.goals.length - 1] : null;
    var sub = [g.leagueName, lastGoal && lastGoal.min ? lastGoal.min : (g.clock || ''), lastGoal && lastGoal.who ? lastGoal.who : ''].filter(Boolean).join(' · ');
    GW.q.push({ team: scorer, line: g.home.name + ' ' + (g.home.score || '0') + ' x ' + (g.away.score || '0') + ' ' + g.away.name, sub: sub });
    gwShow();
  }
  function gwTick() {
    var mode = goalMode();
    if (mode === 'off' || GW.busy || document.hidden || !S.provider || !S.cfg) { return; }
    var now = Date.now(), full = now - GW.scanAt > 5 * 60000 || !GW.leagues.length;
    GW.busy = true;
    Sports.fetchDay(http, spDay(0), full ? null : GW.leagues).then(function (r) {
      var liveNow = {}, leagues = {};
      r.games.forEach(function (g) {
        if (!Sports.isLive(g) || !Sports.visible(g, spFollow())) { return; }
        var k = spGame(g), hs = Number(g.home.score) || 0, as = Number(g.away.score) || 0, prev = GW.last[k];
        liveNow[k] = 1; leagues[g.league] = 1;
        if (prev && (hs > prev.h || as > prev.a) && gwWanted(g, mode)) { gwGoal(g, hs > prev.h ? g.home.name : g.away.name); }
        GW.last[k] = { h: hs, a: as };
      });
      if (full) { Object.keys(GW.last).forEach(function (k) { if (!liveNow[k]) { delete GW.last[k]; } }); GW.scanAt = now; }
      GW.leagues = Object.keys(leagues);
    }).then(function () { GW.busy = false; }, function () { GW.busy = false; });
  }
  function goalBlock() {
    var cur = goalMode(), opts = [['Todos os jogos ao vivo', 'all'], ['Meus times e Brasil', 'mine'], ['Desligado', 'off']], box = h('div', { cls: 'sbtns scales' });
    function paint() {
      box.innerHTML = '';
      opts.forEach(function (o) {
        box.appendChild(h('button', { cls: 'f btn' + (cur === o[1] ? ' primary' : ''), text: o[0], on: { click: function () {
          cur = o[1]; store.set('goalalert', cur); paint(); toast(cur === 'off' ? 'Aviso de gols desligado' : 'Vai avisar os gols enquanto o app estiver aberto', 2400);
        } } }));
      });
    }
    paint();
    return box;
  }

  function spInit() {
    if (!S.sp) { S.sp = { tab: 'scores', day: 0, games: [], failed: [], days: {}, pend: {}, chan: {}, chanAt: 0, game: null, ok: null }; spLoadCache(S.sp); }
  }

  /* fileira da Início: jogos ao vivo e os das próximas horas (por horário); o que já acabou sai da lista */
  function spHomeFill(host) {
    spInit();
    var sp = S.sp, tk = S.homeToken;
    function paint() {
      if (!document.body.contains(host) || tk !== S.homeToken) { return; }
      spMerge();
      var now = Date.now(), fol = spFollow();
      var l = sp.games.filter(function (g) {
        if (!Sports.visible(g, fol)) { return false; }
        return g.state === 'in' || (g.state === 'pre' && g.start > now - 3 * 3600000 && g.start - now < 18 * 3600000);
      }).sort(spOrder).slice(0, 12);
      host.innerHTML = '';
      if (!l.length) { host.classList.add('hidden'); host.classList.remove('hrow'); return; }
      host.classList.remove('hidden');
      host.classList.add('hrow');
      var all = h('button', { cls: 'f spcard spall', type: 'button', on: { click: function () { selectSection('sports'); } } }, [h('div', { text: 'Ver todos os jogos' }), icon('sports', 44)]);
      host.appendChild(h('div', { cls: 'hrow-title', text: 'Esportes · jogos de hoje' }));
      host.appendChild(h('div', { cls: 'hlist scroll' }, l.map(function (g) { return spCard(g, { date: true }); }).concat([all])));
    }
    paint();
    spEnsure([0], false).then(paint);
  }

  function renderSports() {
    spInit();
    var page = S.pageEl;
    page.className = 'page scroll sports';
    page.innerHTML = '';
    var tabs = h('div', { cls: 'sptabs' }, [['scores', 'Placares'], ['teams', 'Meus times'], ['channels', 'Nos meus canais']].map(function (t) {
      return h('button', { cls: 'f hubtab sptab', type: 'button', 'data-k': 'tab:' + t[0], text: t[1], on: { click: function () { S.sp.tab = t[0]; S.sp.game = null; paintSports(); spEnsure(spNeeded()); } } });
    }));
    S.sp.bodyEl = h('div', { cls: 'spbody' });
    page.appendChild(tabs);
    page.appendChild(S.sp.bodyEl);
    paintSports(true);
    if (!S.spTimer) {
      S.spTimer = setInterval(function () {
        if (S.section !== 'sports' || S.mode !== 'browse') { return; }
        var live = S.sp.games.some(function (g) { return g.state === 'in'; }), t = S.sp.days[Sports.ymd(spDay(0))];
        if (live || !t || Date.now() - t.at > 120000) { spEnsure(spNeeded(), true); }
      }, 30000);
    }
    spEnsure(spNeeded(), false);
  }

  /* redesenha o corpo da tela de esportes mantendo o foco no mesmo botão */
  function paintSports(first) {
    var sp = S.sp;
    if (!sp || S.section !== 'sports' || !sp.bodyEl || !document.body.contains(sp.bodyEl)) { return; }
    spMerge();   // reavalia o que ainda pode estar "ao vivo"
    var cur = Nav.current(), key = cur && cur.getAttribute ? cur.getAttribute('data-k') : null, body = sp.bodyEl;
    var scroll = S.pageEl.scrollTop;
    [].forEach.call(S.pageEl.querySelectorAll('.sptab'), function (b) { b.classList.toggle('on', b.getAttribute('data-k') === 'tab:' + sp.tab); });
    body.innerHTML = '';
    if (!sp.ok && !sp.games.length) {
      if (Object.keys(sp.pend).length || !sp.tried) { body.appendChild(spNote('Carregando placares…')); }
      else { body.appendChild(spNote('Não consegui carregar os placares agora. A fonte gratuita pode estar fora do ar ou sem acesso daqui.', true)); }
    } else if (sp.game) { spBodyGame(body); }
    else if (sp.tab === 'teams') { spBodyTeams(body); }
    else if (sp.tab === 'channels') { spBodyChannels(body); }
    else { spBodyScores(body); }
    S.pageEl.scrollTop = scroll;
    var el = key ? S.pageEl.querySelector('[data-k="' + key + '"]') : null;
    if (!el && first) { el = S.pageEl.querySelector('.sptab.on') || S.pageEl.querySelector('.sptab'); }
    if (!el && sp.game) { el = body.querySelector('.spplay') || body.querySelector('.f'); }
    if (sp.game && sp.autoFocus) {
      // o canal pode aparecer depois (a procura na programação leva um instante): se você ainda não mexeu, o foco vai para ele, pronto para o OK
      var pl = body.querySelector('.spplay'), ek = el && el.getAttribute('data-k');
      if (pl) {
        if (!el || ek === 'back' || ek === sp.autoKey || ek === 'p:0') { el = pl; }
        sp.autoFocus = false;
      } else { sp.autoKey = ek; }
    }
    if (el) { Nav.focus(el); }
    else if (!Nav.current()) { Nav.focus(S.pageEl.querySelector('.sptab') || S.headEl.querySelector('.f')); }
  }

  /* ---------- login ---------- */

  function showLogin(msg, canCancel) {
    S.mode = 'login';
    closeDetailQuiet();
    var cfg = (canCancel ? S.cfg : null) || S.draft || S.cfg || store.get('draft', null) || store.get('cfg', null) || {};

    var err = h('div', { cls: 'err', text: msg || '' });
    var iServer = h('input', { cls: 'f input', type: 'text', placeholder: 'http://exemplo.com:8080' });
    var iUser = h('input', { cls: 'f input', type: 'text', placeholder: 'Usuário' });
    var iPass = h('input', { cls: 'f input', type: 'text', placeholder: 'Senha' });
    iServer.value = cfg.server || '';
    iUser.value = cfg.user || '';
    iPass.value = cfg.pass || '';

    function submit() {
      var c = { mode: 'xtream', server: iServer.value.trim(), user: iUser.value.trim(), pass: iPass.value.trim() };
      if (!c.server || !c.user || !c.pass) { err.textContent = 'Preencha servidor, usuário e senha.'; return; }
      connect(c);
    }

    var btn = h('button', { cls: 'f btn primary', text: 'Entrar', on: { click: submit } });
    var app = $('app');
    app.innerHTML = '';
    app.appendChild(h('div', { cls: 'login' }, [
      h('div', { cls: 'logo', text: 'MASTER IPTV' }),
      h('div', { cls: 'sub', text: 'Ao vivo · Filmes · Séries' }),
      h('div', { cls: 'lbl', text: 'Servidor' }), iServer,
      h('div', { cls: 'lbl', text: 'Usuário' }), iUser,
      h('div', { cls: 'lbl', text: 'Senha' }), iPass,
      btn,
      hasDl() && dlCount() ? h('button', { cls: 'f btn', text: 'Ver downloads (offline)', on: { click: showOffline } }) : null,
      canCancel ? h('button', { cls: 'f btn', text: 'Cancelar', on: { click: function () { showBrowse(); selectSection('settings'); } } }) : null,
      err
    ]));
    Nav.setScope(app);
    var first = msg ? iServer : (!iServer.value ? iServer : (!iUser.value ? iUser : (!iPass.value ? iPass : btn)));
    Nav.focus(first);
  }

  /* http x https: se o endereço digitado não conecta, o app testa sozinho o outro e guarda o que funcionou */
  function altServer(server) {
    var v = String(server || '').replace(/^\s+|\s+$/g, '');
    if (/^https:\/\//i.test(v)) { return v.replace(/^https:\/\//i, 'http://'); }
    if (/^http:\/\//i.test(v)) { return v.replace(/^http:\/\//i, 'https://'); }
    return 'https://' + v;   // sem prefixo o app assumia http; a alternativa é https
  }

  function tryLogin(cfg) {
    var p;
    try { p = Promise.resolve(Core.createXtream(cfg, http)); } catch (e) { p = Promise.reject(e); }
    return p.then(function (prov) {
      return prov.login().then(function (info) { return { prov: prov, info: info, cfg: cfg }; });
    });
  }

  function loginAuto(cfg) {
    return tryLogin(cfg).then(null, function (e) {
      // usuário/senha errados não caem aqui (o servidor respondeu); só falha de rede, TLS ou resposta que não é do painel
      var alt = {};
      for (var k in cfg) { if (cfg.hasOwnProperty(k)) { alt[k] = cfg[k]; } }
      alt.server = altServer(cfg.server);
      if (!alt.server || alt.server === cfg.server) { throw e; }
      return tryLogin(alt).then(function (r) { r.switched = true; return r; }, function () { throw e; });
    });
  }

  function connect(cfg, o) {
    // guarda o que foi digitado: se falhar, o login volta preenchido para editar
    S.draft = cfg;
    store.set('draft', cfg);
    S.splashMin = !!(o && o.boot);
    S.splashNow = false;
    loading(true, 'Conectando…');
    loginAuto(cfg).then(function (r) {
      if (!r.info.ok) { throw new Error('Usuário ou senha inválidos (ou conta inativa).'); }
      cfg = r.cfg;
      S.provider = camWrap(r.prov); S.info = r.info;
      S.offline = false;
      S.cfg = cfg;
      store.set('cfg', cfg);
      if (r.switched) { toast('Servidor ajustado para ' + cfg.server, 4000); }
      loading(false);
      epgCache = {};
      showBrowse();
      if (o && o.boot && profiles().length > 1) { showProfiles(false); }
      else if (o && o.boot && opt('autoplay')) { autoOpenLast(); }
    }).then(null, function (e) {
      S.splashNow = true;   // erro: não segura a tela de login
      loading(false);
      S.splashNow = false;
      S.provider = null;
      if (o && o.boot && e && e.status === 0 && hasDl() && dlCount()) {   // abriu sem internet: vai direto aos downloads
        showOffline();
        toast('Sem conexão: abrindo seus downloads', 3500);
        return;
      }
      var m = (e && e.message) ? e.message : String(e);
      if (e && e.status === 0) { m += ' — confira o endereço do servidor e a internet da TV.'; }
      if (e && e.detail) { m += '\n[' + e.detail + ']'; }
      showLogin('Erro: ' + m);
    });
  }

  function logout() {
    store.del('cfg');
    S.draft = S.cfg;
    S.cfg = null; S.provider = null;
    S.section = 'home';
    showLogin();
  }

  /* ---------- estrutura: menu inicial + uma tela por seção ---------- */

  var SECT = { live: 'TV ao vivo', movie: 'Filmes', series: 'Séries', search: 'Buscar', fav: 'Favoritos', settings: 'Configurações', dl: 'Downloads', sports: 'Esportes', guide: 'Guia de TV' };

  function showBrowse() {
    S.mode = 'browse';
    var app = $('app');
    app.innerHTML = '';
    S.pageEl = h('div', { cls: 'page scroll' });
    S.clockEl = h('span', { cls: 'clock' });
    S.headEl = h('div', { cls: 'sechead' });
    var hints = h('div', { cls: 'hints', text: 'Setas: mover   ·   OK: abrir   ·   Vermelho: favoritar   ·   Voltar: voltar ao menu   ·   Mini player: Amarelo amplia, Azul fecha' });
    S.mainEl = h('div', { cls: 'main' }, [S.headEl, S.pageEl, hints]);
    app.appendChild(S.mainEl);
    buildDrawer();
    Nav.setScope(app);
    S.hubFocus = null;
    selectSection(S.offline ? 'dl' : 'home');
    if (!S.offline) { cloudSoon(400); }
  }

  /* ---------- menu lateral (hambúrguer): clima, relógio e Configurações ---------- */

  function buildDrawer() {
    S.drawerOpen = false;
    S.wxEl = h('div', { cls: 'wx' });
    S.drawClockEl = h('span', { cls: 'clock' });
    S.drawSubEl = h('div', { cls: 'usub' });
    var panel = h('div', { cls: 'drawer-panel' }, [
      h('div', { cls: 'drawer-brand', text: 'MASTER IPTV' }),
      S.wxEl,
      h('div', { cls: 'drawer-meta' }, [S.drawClockEl, S.drawSubEl]),
      h('button', { cls: 'f btn drawer-settings', type: 'button',
        on: { click: function () { closeDrawer(true); selectSection('settings'); } } }, [icon('settings', 26), 'Configurações']),
      hasDl() ? h('button', { cls: 'f btn drawer-dl', type: 'button', on: { click: openDownloads } }, [icon('dl', 26), 'Downloads']) : null
    ]);
    S.drawerEl = h('div', { cls: 'drawer hidden' }, [
      h('div', { cls: 'drawer-scrim', on: { click: function () { closeDrawer(); } } }), panel
    ]);
    S.mainEl.appendChild(S.drawerEl);
  }

  function updateDrawerInfo() {
    var info = S.info || {};
    if (S.drawSubEl) { S.drawSubEl.textContent = info.exp ? 'até ' + info.exp.toLocaleDateString('pt-BR') : 'conta ativa'; }
    updateClock();
  }

  function openDrawer() {
    if (!S.drawerEl || S.drawerOpen) { return; }
    S.drawerOpen = true;
    updateDrawerInfo();
    S.drawerEl.classList.remove('hidden');
    Nav.setScope(S.drawerEl);
    Nav.focus(S.drawerEl.querySelector('.drawer-settings'));
  }

  function closeDrawer(skipFocus) {
    if (!S.drawerEl || !S.drawerOpen) { return; }
    S.drawerOpen = false;
    S.drawerEl.classList.add('hidden');
    Nav.setScope($('app'));
    if (!skipFocus) { Nav.focus(S.headEl && S.headEl.querySelector('.menubtn')); }
  }

  function headIcon(sec, label) {
    return h('button', { cls: 'f iconbtn', type: 'button', 'data-sec': sec, title: label, 'aria-label': label,
      on: { click: function () { selectSection(sec); } } }, [icon(sec, 28)]);
  }

  function renderHead(sec) {
    var hd = S.headEl, info = S.info || {};
    hd.innerHTML = '';
    if (sec === 'home') {
      var prof = curProfile();
      hd.className = 'sechead hub';
      hd.appendChild(h('button', { cls: 'f iconbtn menubtn', type: 'button', title: 'Menu', 'aria-label': 'Menu',
        on: { click: openDrawer } }, [icon('menu', 28)]));
      hd.appendChild(h('div', { cls: 'brand', text: 'MASTER IPTV' }));
      hd.appendChild(avSet(h('button', { cls: 'f avatar', type: 'button', style: 'background-color:' + PCOLORS[prof.color % PCOLORS.length],
        on: { click: function () { showProfiles(true); } } }), prof));
      loadWeather();
      updateDrawerInfo();
      return;
    }
    hd.className = 'sechead';
    if (S.offline) {
      hd.appendChild(h('div', { cls: 'sectitle' }, [icon('dl', 44), 'Downloads · offline']));
      hd.appendChild(h('button', { cls: 'f btn', text: 'Conectar', on: { click: reconnect } }));
      hd.appendChild(S.clockEl);
      updateClock();
      return;
    }
    hd.appendChild(h('button', { cls: 'f btn backbtn', on: { click: headBack } },
      [icon('back', 26), S.backTo && S.backTo !== 'home' ? 'Voltar' : 'Menu']));
    hd.appendChild(h('div', { cls: 'sectitle' }, [icon(sec, 44), SECT[sec]]));
    if (sec === 'live' || sec === 'movie' || sec === 'series') {
      hd.appendChild(h('button', { cls: 'f btn', on: { click: function () { selectSection('search', { backTo: sec }); } } },
        [icon('search', 26), 'Buscar']));
    }
    if (sec === 'live') {
      hd.appendChild(h('button', { cls: 'f btn', 'data-k': 'guide', on: { click: function () { selectSection('guide', { backTo: 'live' }); } } },
        [icon('guide', 26), 'Guia de TV']));
    }
    hd.appendChild(S.clockEl);
    updateClock();
  }

  function headBack() { selectSection(S.backTo || 'home'); }

  function selectSection(sec, opts) {
    opts = opts || {};
    if (S.dlTimer) { clearInterval(S.dlTimer); S.dlTimer = null; }
    if (S.spTimer) { clearInterval(S.spTimer); S.spTimer = null; }
    if (S.offline && sec !== 'dl') { sec = 'dl'; }
    S.section = sec;
    S.backTo = opts.backTo || 'home';
    if (sec !== 'home') { S.hubFocus = sec === 'search' && opts.backTo ? opts.backTo : sec; }
    if (sec === 'search') { S.searchSec = /^(live|movie|series)$/.test(opts.backTo || '') ? opts.backTo : null; }
    S.loadToken++;
    S.homeToken++;
    S.mainEl.className = 'main sec-' + sec;
    renderHead(sec);
    S.pageEl.innerHTML = '';
    S.pageEl.scrollTop = 0;
    S.pageEl.className = 'page scroll';
    S.catsEl = null; S.contentEl = null; S.listHost = null;
    S.items = []; S.shown = 0;
    loading(false);

    if (sec === 'home') { renderHome(); cloudSoon(0, true); return; }
    Nav.focus(S.headEl.querySelector('.f'));
    if (sec === 'dl') { renderDownloads(); return; }
    if (sec === 'sports') { renderSports(); return; }
    if (sec === 'guide') { renderGuide(); return; }
    if (sec === 'settings') { renderSettings(); return; }
    if (sec === 'search') { buildContentOnly(); renderSearch(); return; }
    if (sec === 'fav') { buildContentOnly(); renderFavs(); return; }

    buildTwoCol();
    var token = S.loadToken;
    loading(true, 'Carregando categorias…');
    S.provider.categories(sec).then(function (cats) {
      if (token !== S.loadToken) { return; }
      loading(false);
      S.cats = [{ id: '*', name: 'Todos' }].concat(cats);
      renderCats();
      var last = store.get('cat:' + sec, null), start = null, i;
      for (i = 0; i < S.cats.length; i++) { if (S.cats[i].id === last) { start = S.cats[i]; } }
      start = start || S.cats[1] || S.cats[0];
      selectCat(start.id, false);
    }, function (e) {
      if (token !== S.loadToken) { return; }
      loading(false);
      S.contentEl.appendChild(h('div', { cls: 'empty', text: 'Erro ao carregar: ' + (e && e.message) }));
    });
  }

  function buildTwoCol() {
    S.pageEl.className = 'page lists';
    S.catsEl = h('div', { cls: 'cats scroll' });
    S.contentEl = h('div', { cls: 'content scroll' });
    S.listHost = S.contentEl;
    S.pageEl.appendChild(S.catsEl);
    S.pageEl.appendChild(S.contentEl);
  }

  function buildContentOnly() {
    S.pageEl.className = 'page lists';
    S.contentEl = h('div', { cls: 'content scroll' });
    S.listHost = S.contentEl;
    S.pageEl.appendChild(S.contentEl);
  }

  function renderCats() {
    S.catsEl.innerHTML = '';
    S.cats.forEach(function (c) {
      S.catsEl.appendChild(h('div', {
        cls: 'f cat' + (c.id === S.catId ? ' on' : ''), 'data-id': c.id,
        on: { click: function () { selectCat(c.id, false); } }
      }, [h('span', { cls: 'ct', text: catLabel(c.name) })]));
    });
  }

  /* tira o prefixo repetido dos nomes de categoria ("Canais | ✨ Abertos" -> "✨ Abertos") */
  function catLabel(name) {
    var n = String(name || '').replace(/^\s*(canais|filmes?|s[ée]ries?|tv)\s*[|:\-–—]\s*/i, '').replace(/^\s+|\s+$/g, '');
    return n || name;
  }

  function selectCat(id, soft) {
    S.catId = id;
    store.set('cat:' + S.section, id);
    var els = S.catsEl.querySelectorAll('.cat'), i;
    for (i = 0; i < els.length; i++) { els[i].classList.toggle('on', els[i].getAttribute('data-id') === id); }
    var token = ++S.loadToken;
    loading(true, 'Carregando…');
    var p = id === '*' ? S.provider.all(S.section) : S.provider.items(S.section, id);
    p.then(function (items) {
      if (token !== S.loadToken) { return; }
      loading(false);
      showItems(items);
      if (!soft) { var first = S.listHost.querySelector('.f'); if (first) { Nav.focus(first); } }
    }, function (e) {
      if (token !== S.loadToken) { return; }
      loading(false);
      toast('Erro ao carregar: ' + (e && e.message), 4500);
    });
  }

  /* ---------- listas / cards ---------- */

  function showItems(items, opts) {
    opts = opts || {};
    items = filterLive(items);
    S.items = items;
    S.shown = 0;
    S.cardMode = !!opts.cards || S.section !== 'live';
    var host = S.listHost;
    host.innerHTML = '';
    S.contentEl.scrollTop = 0;
    if (!items.length) {
      host.appendChild(h('div', { cls: 'empty', text: opts.empty || 'Nada por aqui.' }));
      return;
    }
    S.wrapEl = h('div', { cls: S.cardMode ? 'grid' : 'list' });
    host.appendChild(S.wrapEl);
    renderMore();
  }

  function renderMore() {
    var chunk = S.cardMode ? 40 : 60, end = Math.min(S.shown + chunk, S.items.length), i;
    for (i = S.shown; i < end; i++) {
      S.wrapEl.appendChild(S.cardMode ? buildCard(S.items[i], i) : buildRow(S.items[i], i));
    }
    S.shown = end;
  }

  function favMark(size) { return h('div', { cls: 'favmark' }, [icon('starfill', size || 26)]); }
  function markFav(el, it) { el._item = it; if (S.favs[fk(it)]) { el.classList.add('isfav'); } }
  function ratingBadge(it) { return it.rating ? h('div', { cls: 'rate' }, [icon('starfill', 16), String(it.rating)]) : null; }

  /* EPG: programa atual de cada canal da lista, buscado aos poucos (3 por vez) e guardado por 5 min */
  var epgCache = {}, epgQ = [], epgBusy = 0;

  function currentProg(list) {
    var now = Date.now(), cur = null, nxt = null, i;
    for (i = 0; i < list.length; i++) {
      if (list[i].start <= now && list[i].stop > now) { cur = list[i]; nxt = list[i + 1] || null; break; }
    }
    return { cur: cur, nxt: nxt };
  }

  function paintEpg(row, cur, nxt) {
    var t = row.querySelector('.epg'), bar = row.querySelector('.epgbar'), nx = row.querySelector('.epgnext');
    if (!t) { return; }
    if (!cur) {
      if (S.provider && S.provider.hasEpg) { t.textContent = 'Sem programação'; t.classList.add('none'); }
      return;
    }
    t.classList.remove('none');
    t.textContent = hhmm(new Date(cur.start)) + (cur.stop > cur.start ? '–' + hhmm(new Date(cur.stop)) : '') + '  ' + cur.title;
    var span = cur.stop - cur.start;
    if (span > 0) {
      bar.firstChild.style.width = Math.max(0, Math.min(100, (Date.now() - cur.start) / span * 100)) + '%';
      bar.classList.add('on');
    }
    if (nx && nxt) { nx.textContent = 'A seguir  ' + hhmm(new Date(nxt.start)) + '  ' + nxt.title; }
  }

  function runEpg(j) {
    epgBusy++;
    S.provider.epg(j.it).then(function (list) {
      var p = currentProg(list);
      epgCache[j.it.id] = { at: Date.now(), cur: p.cur, nxt: p.nxt };
      if (document.body.contains(j.row)) { paintEpg(j.row, p.cur, p.nxt); }
    }, function () {
      epgCache[j.it.id] = { at: Date.now(), cur: null, nxt: null };
      if (document.body.contains(j.row)) { paintEpg(j.row, null, null); }
    }).then(function () { epgBusy--; pumpEpg(); });
  }

  function pumpEpg() {
    while (epgBusy < 3 && epgQ.length) {
      var j = epgQ.shift();
      if (j.token === S.loadToken) { runEpg(j); }
    }
  }

  function queueEpg(row, it) {
    if (!it.epgId) { paintEpg(row, null, null); return; }
    var c = epgCache[it.id];
    if (c && Date.now() - c.at < 300000) { paintEpg(row, c.cur, c.nxt); return; }
    epgQ.push({ row: row, it: it, token: S.loadToken });
    pumpEpg();
  }

  function buildRow(it, i) {
    var logo = h('div', { cls: 'logo' });
    if (it.logo) { imgEl(it.logo, logo); }
    var el = h('div', { cls: 'f row', 'data-i': i, on: { click: function () { openItem(i); } } }, [
      h('div', { cls: 'num', text: it.num || '' }), logo,
      h('div', { cls: 'rinfo' }, [
        h('div', { cls: 'name', text: it.name }),
        h('div', { cls: 'epg' }),
        h('div', { cls: 'epgbar' }, [h('div', { cls: 'fill' })]),
        h('div', { cls: 'epgnext' })
      ]),
      favMark(28)
    ]);
    markFav(el, it);
    queueEpg(el, it);
    return el;
  }

  function posterEl(it, withBadge) {
    var poster = h('div', { cls: 'poster' + (it.type === 'live' ? ' live' : '') });
    poster._it = it;
    poster.appendChild(h('div', { cls: 'ph', text: initial(it) }));
    if (it.logo) { imgEl(it.logo, poster); }
    if (withBadge) { poster.appendChild(h('div', { cls: 'badge', text: typeLabel(it.type) })); }
    var rb = ratingBadge(it);
    if (rb) { poster.appendChild(rb); }
    poster.appendChild(favMark(28));
    return poster;
  }

  function buildCard(it, i) {
    var el = h('div', { cls: 'f card', 'data-i': i, on: { click: function () { openItem(i); } } }, [
      posterEl(it, S.section === 'fav' || S.section === 'search'), h('div', { cls: 'title', text: it.name })
    ]);
    markFav(el, it);
    return el;
  }

  function openItem(i) { openItemObj(S.items[i], S.items); }

  function openItemObj(it, list) {
    if (!it) { return; }
    if (it.type === 'live') {
      var ll = (list || [it]).filter(function (x) { return x.type === 'live'; });
      var idx = ll.indexOf(it);
      startPlay({ kind: 'live', list: ll, idx: idx < 0 ? 0 : idx });
    } else {
      showDetail(it);
    }
  }

  function toggleFav(it) {
    var k = fk(it);
    if (S.favs[k]) { delete S.favs[k]; toast('Removido dos favoritos', 1500); }
    else { S.favs[k] = it; toast('Adicionado aos favoritos', 1500); }
    store.set('fav', S.favs);
    stampFav(k, !!S.favs[k]);
    return !!S.favs[k];
  }

  function favList() {
    var items = Object.keys(S.favs).map(function (k) { return S.favs[k]; });
    items.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    return items;
  }

  function favFocused() {
    var cur = Nav.current();
    if (!cur || !cur._item) { return; }
    var on = toggleFav(cur._item);
    cur.classList.toggle('isfav', on);
    if (S.section === 'fav' && !on) { renderFavs(); }
  }

  /* toque longo (celular/tablet): segurar um banner de filme, série ou canal favorita/desfavorita */
  (function () {
    var timer = null, sx = 0, sy = 0, target = null, swallow = 0, fired = false;
    function cancel() { if (timer) { clearTimeout(timer); timer = null; } }
    function fire() {
      timer = null;
      if (!target || !target._item || S.mode !== 'browse') { return; }
      var el = target, on = toggleFav(el._item);
      el.classList.toggle('isfav', on);
      fired = true;
      try { if (navigator.vibrate) { navigator.vibrate(30); } } catch (e) {}
      if (S.section === 'fav' && !on) { renderFavs(); }
    }
    document.addEventListener('touchstart', function (e) {
      cancel();
      var t = e.target && e.target.closest ? e.target.closest('.f') : null;
      if (!t || !t._item || !e.touches || e.touches.length !== 1) { return; }
      target = t; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      timer = setTimeout(fire, 550);
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!timer || !e.touches[0]) { return; }
      if (Math.abs(e.touches[0].clientX - sx) > 10 || Math.abs(e.touches[0].clientY - sy) > 10) { cancel(); }
    }, { passive: true });
    document.addEventListener('touchend', function () {
      cancel();
      if (fired) { fired = false; swallow = Date.now() + 500; }
    }, { passive: true });
    document.addEventListener('touchcancel', cancel, { passive: true });
    document.addEventListener('click', function (e) {
      if (Date.now() < swallow) { e.stopPropagation(); e.preventDefault(); swallow = 0; }
    }, true);
    document.addEventListener('contextmenu', function (e) {
      if (e.target && e.target.closest && e.target.closest('.f')) { e.preventDefault(); }
    });
  })();

  /* gestos no player (celular): arrastar na metade esquerda muda o brilho, na direita o volume;
     arrastar de lado avança/volta (filmes e episódios) */
  (function () {
    var hud = null, st = null, hideT = null;
    function nat() { return window.NativeApp || null; }
    function enabled() { return !!(nat() && nat().setVolume) && document.body.classList.contains('phone'); }
    function num(f) { try { var v = parseFloat(f()); return isFinite(v) ? v : 0.5; } catch (e) { return 0.5; } }
    function show(label, frac, text) {
      if (!hud) {
        hud = h('div', { id: 'gest', cls: 'hidden' }, [h('div', { id: 'gest-t' }), h('div', { cls: 'gest-bar' }, [h('div', { id: 'gest-f' })])]);
        $('player').appendChild(hud);
      }
      hud.classList.remove('hidden');
      $('gest-t').textContent = label + (text != null ? ' ' + text : '');
      $('gest-f').style.width = (frac == null ? 0 : Math.round(frac * 100)) + '%';
      hud.classList.toggle('nobar', frac == null);
      clearTimeout(hideT);
    }
    function hideSoon() { clearTimeout(hideT); hideT = setTimeout(function () { if (hud) { hud.classList.add('hidden'); } }, 700); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function ignore(t) {
      return !t || !t.closest || t.closest('[data-act], .track, #tracks, #osd-menu, #mini-x, button');
    }
    var pl = $('player');
    pl.addEventListener('touchstart', function (e) {
      st = null;
      if (!enabled() || S.mode !== 'player' || S.mini || !S.ctx || !e.touches || e.touches.length !== 1 || ignore(e.target)) { return; }
      var r = pl.getBoundingClientRect(), x = e.touches[0].clientX - r.left;
      st = { x: e.touches[0].clientX, y: e.touches[0].clientY, side: x < r.width / 2 ? 'L' : 'R', w: r.width || 1, h: r.height || 1, kind: '', start: 0, t0: 0, tgt: 0 };
    }, { passive: true });
    pl.addEventListener('touchmove', function (e) {
      if (!st || !e.touches[0]) { return; }
      var dx = e.touches[0].clientX - st.x, dy = e.touches[0].clientY - st.y, vod = S.ctx && S.ctx.kind !== 'live';
      if (!st.kind) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) { return; }
        if (Math.abs(dy) >= Math.abs(dx)) {
          st.kind = st.side === 'L' ? 'bri' : 'vol';
          st.start = clamp(num(st.kind === 'bri' ? nat().getBrightness : nat().getVolume), 0, 1);
        } else if (vod && isFinite(Player.duration()) && Player.duration() > 0) {
          st.kind = 'seek'; st.t0 = Player.time();
        } else { st = null; return; }
      }
      if (e.cancelable) { e.preventDefault(); }
      if (st.kind === 'seek') {
        var d = Player.duration();
        st.tgt = clamp(st.t0 + (dx / st.w) * 180, 0, d);
        var diff = Math.round(st.tgt - st.t0);
        show((diff >= 0 ? '+' : '−') + Math.abs(diff) + ' s', null, '· ' + Core.fmtTime(st.tgt));
        return;
      }
      var v = clamp(st.start - dy / (st.h * 0.7), 0, 1);
      // brilho no mínimo = automático (volta ao brilho do sistema), como no YouTube modificado
      if (st.kind === 'bri' && v < 0.03) {
        try { nat().setBrightness(-1); } catch (err0) {}
        show('Brilho', 0, 'automático');
        return;
      }
      try {
        if (st.kind === 'bri') { nat().setBrightness(Math.max(0.03, v)); } else { nat().setVolume(v); }
      } catch (err) {}
      show(st.kind === 'bri' ? 'Brilho' : 'Volume', v, Math.round(v * 100) + '%');
    }, { passive: false });
    var lastTap = null;
    function end() {
      if (st && st.kind === 'seek' && st.tgt !== st.t0) { Player.seekTo(st.tgt); updateBar(st.tgt, Player.duration()); }
      if (st && st.kind) { hideSoon(); }
      else if (st && S.ctx && S.ctx.kind !== 'live') {
        // toque duplo na metade esquerda volta 10 s, na direita avança 10 s
        var now = Date.now();
        if (lastTap && lastTap.side === st.side && now - lastTap.at < 350) {
          var d = st.side === 'L' ? -10 : 10;
          Player.seek(d);
          updateBar(Player.time(), Player.duration());
          show((d > 0 ? '+' : '−') + '10 s', null, '');
          hideSoon();
          lastTap = null;
        } else { lastTap = { side: st.side, at: now }; }
      }
      st = null;
    }
    pl.addEventListener('touchend', end, { passive: true });
    pl.addEventListener('touchcancel', function () { st = null; hideSoon(); }, { passive: true });
  })();

  function renderFavs() {
    showItems(favList(), { cards: true, empty: 'Nenhum favorito ainda. Aperte o botão vermelho (ou segure o dedo) sobre um item.' });
    var first = S.listHost.querySelector('.f');
    Nav.focus(first || S.headEl.querySelector('.f'));
  }

  /* ---------- busca ---------- */

  function renderSearch() {
    var input = h('input', { cls: 'f input', id: 'q', type: 'text',
      placeholder: S.searchSec ? 'Buscar em ' + SECT[S.searchSec] + '…' : 'Buscar canais, filmes e séries…' });
    input.value = S.query || '';
    var results = h('div', {});
    S.contentEl.appendChild(h('div', { cls: 'search-wrap' }, [input]));
    S.contentEl.appendChild(results);
    S.listHost = results;
    Nav.focus(input);
    if (S.query) { doSearch(); }
  }

  function doSearch() {
    var input = $('q');
    var q = (input ? input.value : '').trim().toLowerCase();
    S.query = q;
    if (q.length < 2) { toast('Digite pelo menos 2 letras'); return; }
    var token = ++S.loadToken;
    loading(true, 'Buscando… (na primeira vez pode demorar)');
    function safe(sec) { return S.provider.all(sec).then(null, function () { return []; }); }
    var secs = S.searchSec ? [S.searchSec] : ['live', 'movie', 'series'];
    Promise.all(secs.map(safe)).then(function (lists) {
      if (token !== S.loadToken) { return; }
      loading(false);
      var out = [];
      lists.forEach(function (l) {
        var n = 0, i;
        for (i = 0; i < l.length && n < 100; i++) {
          if (String(l[i].name).toLowerCase().indexOf(q) >= 0) { out.push(l[i]); n++; }
        }
      });
      showItems(out, { cards: true, empty: 'Nenhum resultado para "' + q + '".' });
      var first = S.listHost.querySelector('.f');
      if (first) { Nav.focus(first); }
    });
  }

  /* ---------- Início ---------- */

  function contList() {
    return Object.keys(S.cont).map(function (k) { return S.cont[k]; }).sort(function (a, b) { return b.at - a.at; });
  }

  function makeRow(title, cards) {
    return h('div', { cls: 'hrow' }, [h('div', { cls: 'hrow-title', text: title }), h('div', { cls: 'hlist scroll' }, cards)]);
  }

  function contCard(en) {
    var it = en.item, thumb = h('div', { cls: 'thumb' });
    thumb._it = it; thumb._en = en;
    var img = (en.ep && en.ep.logo) || it.logo;
    if (img) { thumb.style.backgroundImage = bgUrl(img); } else { thumb.appendChild(h('div', { cls: 'ph', text: initial(it) })); }
    var rb = ratingBadge(it);
    if (rb) { thumb.appendChild(rb); }
    thumb.appendChild(h('div', { cls: 'pbar' }, [h('div', { cls: 'fill', style: 'width:' + Math.min(100, Math.round(en.t / en.d * 100)) + '%' })]));
    var left = Math.max(1, Math.round((en.d - en.t) / 60));
    var sub = (en.ep ? 'T' + en.ep.season + ' E' + en.ep.num + '  ·  ' : '') + left + ' min restantes';
    var el = h('div', { cls: 'f lcard', on: { click: function () { resumeCont(en); } } }, [
      thumb, h('div', { cls: 'lt', text: it.name }), h('div', { cls: 'ls', text: sub })
    ]);
    el._item = it;
    return el;
  }

  function chanTile(it, list) {
    var logo = h('div', { cls: 'cthumb' });
    logo.appendChild(h('div', { cls: 'ph', text: initial(it) }));
    if (it.logo) { imgEl(it.logo, logo); }
    logo.appendChild(favMark(24));
    var el = h('div', { cls: 'f ctile', on: { click: function () { openItemObj(it, list); } } }, [logo, h('div', { cls: 'lt', text: it.name })]);
    markFav(el, it);
    return el;
  }

  /* último item da fileira Favoritos: abre a lista completa */
  function seeAllCard(n) {
    return h('div', { cls: 'f card seeall', 'data-sec': 'fav', on: { click: function () { selectSection('fav'); } } }, [
      h('div', { cls: 'poster seeall-p' }, [icon('fav', 44), h('div', { cls: 'seeall-t', text: 'Ver todos' }), h('div', { cls: 'seeall-n', text: n + (n === 1 ? ' favorito' : ' favoritos') })]),
      h('div', { cls: 'title', text: '' })
    ]);
  }

  function posterCard(it, list) {
    var el = h('div', { cls: 'f card', on: { click: function () {
      if (isTvDevice() && it.type === 'movie') { startPlay({ kind: 'movie', item: it }); return; }   // TV: filme da Início começa direto
      openItemObj(it, list);
    } } }, [
      posterEl(it, false), h('div', { cls: 'title', text: it.name })
    ]);
    markFav(el, it);
    return el;
  }

  function resumeCont(en) {
    if (en.kind === 'movie') { startPlay({ kind: 'movie', item: en.item }); return; }
    loading(true, 'Abrindo…');
    S.provider.episodes(en.item).then(function (r) {
      loading(false);
      var flat = [], idx = -1;
      r.seasons.forEach(function (s) { flat = flat.concat(s.episodes); });
      flat.forEach(function (e, i) { if (e.id === en.ep.id) { idx = i; } });
      if (idx < 0) { flat = [en.ep]; idx = 0; }
      startPlay({ kind: 'ep', item: en.item, eps: flat, idx: idx });
    }, function () {
      loading(false);
      // sem conseguir listar os episódios: toca só o episódio salvo
      startPlay({ kind: 'ep', item: en.item, eps: [en.ep], idx: 0 });
    });
  }

  /* estilo da Início: blocos grandes (padrão nas TVs) ou abas no topo (padrão no celular); escolha por aparelho */
  function isTvDevice() { return document.body.classList.contains('tv') || /Web0S|webOS|SMART-?TV/i.test(navigator.userAgent); }
  function homeStyle() {
    var v = store.get('homestyle', '');
    return v === 'blocks' || v === 'tabs' ? v : (isTvDevice() ? 'blocks' : 'tabs');
  }

  function hubTile(sec, sub) {
    return h('button', { cls: 'f hubtile t-' + sec, type: 'button', 'data-sec': sec, on: { click: function () { selectSection(sec); } } }, [
      h('div', { cls: 'hubico' }, [icon(sec, 76)]),
      h('div', { cls: 'hubname', text: SECT[sec] }),
      h('div', { cls: 'hubsub', text: sub })
    ]);
  }

  function hubTab(sec) {
    return h('button', { cls: 'f hubtab', type: 'button', 'data-sec': sec, text: SECT[sec], on: { click: function () { selectSection(sec); } } });
  }

  /* ---------- guia de TV (grade por horário) ---------- */
  var gEpg = {};   // id do canal -> { at, list }
  var G = null;
  var G_PX0 = 8;   // px por minuto quando não dá para medir (testes)

  /* mede a largura disponível: 3 h quando há espaço, senão 2 h (ex.: com o mini player ao lado) */
  function gMeasure() {
    var st = G, row = st && st.timeEl && st.timeEl.parentNode, nav = st && st.navEl, rw = row ? row.clientWidth : 0, cw = nav ? nav.offsetWidth : 0;
    if (!rw || !cw) { st.span = 3 * 3600000; st.px = G_PX0; return; }
    var gridW = Math.max(240, rw - cw);
    st.span = gridW >= 1000 ? 3 * 3600000 : 2 * 3600000;
    st.px = gridW / (st.span / 60000);
    [].forEach.call(st.body ? st.body.querySelectorAll('.gtrack') : [], function (t) { t.style.width = gridW + 'px'; });
    st.timeEl.style.width = gridW + 'px';
    var hrs = st.span / 3600000;
    if (st.prevBtn) { st.prevBtn.textContent = '‹ ' + hrs + ' h'; st.nextBtn.textContent = hrs + ' h ›'; }
    st.gridW = gridW;
  }

  function gFloor(t) { return Math.floor(t / 1800000) * 1800000; }
  function gSpan(a, b) { return hhmm(new Date(a)) + ' – ' + hhmm(new Date(b)); }

  function renderGuide(host, over) {
    var page = host || S.pageEl;
    if (!over) { page.className = 'page scroll guide'; }
    page.innerHTML = '';
    var st = G = { over: !!over, span: 3 * 3600000, px: G_PX0, win: gFloor(Date.now() - 30 * 60000), chans: [], rows: [], queue: [], busy: 0, cat: null, token: S.loadToken, cats: [] };
    st.dChan = h('div', { cls: 'gdchan' }); st.dTitle = h('div', { cls: 'gdtitle', text: 'Guia de TV' });
    st.dBar = h('div', { cls: 'gdfill' }); st.dDesc = h('div', { cls: 'gddesc', text: 'Escolha um programa para ver os detalhes.' });
    page.appendChild(h('div', { cls: 'gdetail' }, [st.dChan, st.dTitle, h('div', { cls: 'gdbar' }, [st.dBar]), st.dDesc]));
    st.chips = h('div', { cls: 'spchips gchips' });
    if (!over) { page.appendChild(st.chips); }
    else { page.insertBefore(h('button', { cls: 'f btn gclose', type: 'button', 'data-k': 'g-close', on: { click: closePGuide } }, [icon('back', 24), 'Voltar ao canal']), page.firstChild); }
    st.timeEl = h('div', { cls: 'gtimes' });
    var nav = h('div', { cls: 'gnav' }, [
      h('button', { cls: 'f btn', type: 'button', text: '‹ 3 h', 'data-k': 'g-prev', on: { click: function () { gShift(-G.span); } } }),
      h('button', { cls: 'f btn', type: 'button', text: 'Agora', 'data-k': 'g-now', on: { click: function () { G.win = gFloor(Date.now() - 30 * 60000); gRepaint(); } } }),
      h('button', { cls: 'f btn', type: 'button', text: '3 h ›', 'data-k': 'g-next', on: { click: function () { gShift(G.span); } } })
    ]);
    st.navEl = nav; st.prevBtn = nav.children[0]; st.nextBtn = nav.children[2];
    page.appendChild(h('div', { cls: 'gtimerow' }, [nav, st.timeEl]));
    st.body = h('div', { cls: 'grows' });
    page.appendChild(st.body);
    page.onscroll = function () { gLoadVisible(); };
    gMeasure();
    gPaintTimes();
    if (over) {
      // dentro do player: lista do canal atual (±75 canais), o som segue tocando
      var all = S.ctx.list, idx = S.ctx.idx, from = Math.max(0, Math.min(idx - 75, all.length - 150));
      gBuildRows(all.slice(from, from + 150), idx - from);
      return;
    }
    st.body.appendChild(h('div', { cls: 'empty', text: 'Carregando canais…' }));
    S.provider.categories('live').then(function (cats) {
      if (!G || G !== st) { return; }
      st.cats = cats || [];
      var last = store.get('cat:live', null), pick = null;
      st.cats.forEach(function (c) { if (c.id === last) { pick = c; } });
      pick = pick || st.cats[0];
      gChips();
      if (pick) { gLoadCat(pick.id); }
    }, function (e) { st.body.innerHTML = ''; st.body.appendChild(h('div', { cls: 'empty', text: 'Erro ao carregar: ' + (e && e.message) })); });
  }

  function gChips() {
    var st = G;
    st.chips.innerHTML = '';
    st.cats.slice(0, 60).forEach(function (c) {
      st.chips.appendChild(h('button', { cls: 'f spchip' + (c.id === st.cat ? ' on' : ''), type: 'button', text: c.name, 'data-k': 'gc:' + c.id,
        on: { click: function () { gLoadCat(c.id); } } }));
    });
  }

  function gLoadCat(id) {
    var st = G;
    st.cat = id;
    store.set('cat:live', id);
    [].forEach.call(st.chips.children, function (b) { b.classList.toggle('on', b.getAttribute('data-k') === 'gc:' + id); });
    st.body.innerHTML = '';
    st.body.appendChild(h('div', { cls: 'empty', text: 'Carregando canais…' }));
    S.provider.items('live', id).then(function (items) {
      if (G !== st || st.cat !== id) { return; }
      gBuildRows(filterLive(items).slice(0, 150), -1);
    }, function (e) { if (G === st) { st.body.innerHTML = ''; st.body.appendChild(h('div', { cls: 'empty', text: 'Erro ao carregar: ' + (e && e.message) })); } });
  }

  function gPlay(i) {
    var ch = G.chans[i];
    if (G.over && S.ctx) {
      var at = S.ctx.list.indexOf(ch);
      closePGuide();
      if (at >= 0 && at !== S.ctx.idx) { S.ctx.idx = at; playCurrent(); } else { showOsd(); }
      return;
    }
    // aba Guia: o canal toca numa janela ao lado (mini player); OK de novo no mesmo canal amplia
    var curCh = S.ctx && S.ctx.kind === 'live' ? S.ctx.list[S.ctx.idx] : null;
    if (S.mini && curCh && curCh.id === ch.id) { expandPlayer(); return; }
    startPlay({ kind: 'live', list: G.chans, idx: i });
    S.miniAt = Date.now();
    leavePlayer(true);
    setTimeout(function () { if (G && document.body.contains(G.body)) { gRepaint(); } }, 60);
  }

  /* guia dentro do player (▲ no canal ao vivo): o vídeo e o som continuam ao fundo */
  function openPGuide() {
    if (S.pgOpen || !S.ctx || S.ctx.kind !== 'live') { return; }
    S.pgOpen = true;
    S.pgScope = Nav.getScope();
    S.pgPrevG = G;
    $('player').classList.add('pg');
    var el = $('pguide');
    clearTimeout(S.osdTimer);
    $('osd').classList.add('hidden');
    el.classList.remove('hidden');
    el.scrollTop = 0;
    Nav.setScope(el);
    renderGuide(el, true);
  }

  function closePGuide() {
    if (!S.pgOpen) { return; }
    S.pgOpen = false;
    $('pguide').classList.add('hidden');
    $('pguide').innerHTML = '';
    $('player').classList.remove('pg');
    G = S.pgPrevG || null;
    S.pgPrevG = null;
    Nav.setScope(S.pgScope);
    S.pgScope = null;
  }

  function pgKey(k) {
    if (k === KEY.BACK || k === KEY.ESC || k === KEY.BS || k === KEY.UP && !Nav.current()) { closePGuide(); return; }
    switch (k) {
      case KEY.UP: Nav.move('up'); break;
      case KEY.DOWN: Nav.move('down'); break;
      case KEY.LEFT: Nav.move('left'); break;
      case KEY.RIGHT: Nav.move('right'); break;
      case KEY.ENTER: Nav.activate(); break;
      case KEY.CHUP: zap(1); closePGuide(); break;
      case KEY.CHDN: zap(-1); closePGuide(); break;
      default: break;
    }
  }

  function gBuildRows(chans, focusIdx) {
    var st = G;
    st.chans = chans;
    st.rows = [];
    st.queue = [];
    st.body.innerHTML = '';
    if (!st.chans.length) { st.body.appendChild(h('div', { cls: 'empty', text: 'Nenhum canal nesta categoria.' })); return; }
    st.chans.forEach(function (ch, i) {
      var row = { ch: ch, i: i, track: h('div', { cls: 'gtrack' }), loaded: false };
      row.el = h('div', { cls: 'grow' }, [
        h('button', { cls: 'f gch', type: 'button', 'data-k': 'gch:' + ch.id, on: { click: function () { gPlay(i); } } }, [
          h('span', { cls: 'gnum', text: ch.num ? String(ch.num) : '' }), h('span', { cls: 'gname', text: ch.name })]),
        row.track
      ]);
      row.el.firstChild._gp = { ch: ch, p: null };
      st.rows.push(row);
      st.body.appendChild(row.el);
      if (st.gridW) { row.track.style.width = st.gridW + 'px'; }
      gPaintRow(row);
    });
    if (focusIdx >= 0 && st.rows[focusIdx]) {
      st.rows[focusIdx].queued = true; st.queue.push(st.rows[focusIdx]);   // o canal atual carrega primeiro
      Nav.focus(st.rows[focusIdx].el.firstChild);
    }
    gLoadVisible();
  }

  function gShift(d) { G.win += d; gRepaint(); }

  function gPaintTimes() {
    var st = G, t;
    st.timeEl.innerHTML = '';
    for (t = 0; t < st.span; t += 1800000) {
      st.timeEl.appendChild(h('div', { cls: 'gtick', style: 'left:' + (t / 60000 * st.px) + 'px', text: hhmm(new Date(st.win + t)) }));
    }
  }

  function gPaintRow(row) {
    var st = G, tr = row.track, w = st.span / 60000 * st.px, now = Date.now(), c = gEpg[row.ch.id], k, any = false;
    tr.innerHTML = '';
    function block(left, width, text, sub, p, cls) {
      var el = h('button', { cls: 'f gpr ' + (cls || ''), type: 'button', style: 'left:' + left + 'px;width:' + Math.max(36, width - 4) + 'px', 'data-k': 'gp:' + row.ch.id + ':' + (p ? p.start : 'x'),
        on: { click: function () { gPlay(row.i); } } }, [h('div', { cls: 'gpt', text: text }), h('div', { cls: 'gps', text: sub })]);
      el._gp = { ch: row.ch, p: p };
      tr.appendChild(el);
    }
    if (!c) { block(0, w, 'Carregando programação…', '', null, 'gwait'); return; }
    c.list.forEach(function (p) {
      if (p.stop <= st.win || p.start >= st.win + st.span) { return; }
      var l = Math.max(0, (p.start - st.win) / 60000 * st.px), r = Math.min(w, (p.stop - st.win) / 60000 * st.px);
      if (r - l < 8) { return; }
      any = true;
      block(l, r - l, p.title, gSpan(p.start, p.stop), p, p.start <= now && p.stop > now ? 'gnow' : (p.stop <= now ? 'gpast' : ''));
    });
    if (!any) { block(0, w, c.list.length ? 'Sem programação neste horário' : 'Sem programação', '', null, 'gwait'); }
    if (now > st.win && now < st.win + st.span) { tr.appendChild(h('div', { cls: 'gnowline', style: 'left:' + ((now - st.win) / 60000 * st.px) + 'px' })); }
    k = null;
  }

  function gRepaint() {
    var st = G, cur = Nav.current(), key = cur && cur.getAttribute('data-k');
    gMeasure();
    gPaintTimes();
    st.rows.forEach(function (r) { gPaintRow(r); });
    if (key && /^gp:/.test(key)) {
      var again = st.body.querySelector('[data-k="' + key + '"]');
      if (!again) { var ch = key.split(':')[1], t = st.body.querySelector('[data-k^="gp:' + ch + ':"]'); again = t || st.body.querySelector('[data-k="gch:' + ch + '"]'); }
      if (again) { Nav.focus(again); }
    }
  }

  function gLoadVisible() {
    var st = G, page = st && st.over ? $('pguide') : S.pageEl, top = page.scrollTop - 200, bot = page.scrollTop + page.clientHeight + 200;
    if (!st || !document.body.contains(st.body)) { return; }
    st.rows.forEach(function (r) {
      if (r.loaded || r.queued) { return; }
      var y = r.el.offsetTop;
      if (y + 90 >= top - 400 && y <= bot + 400) { r.queued = true; st.queue.push(r); }
    });
    gPump();
  }

  function gPump() {
    var st = G;
    while (st && st.busy < 4 && st.queue.length) {
      (function (row) {
        var c = gEpg[row.ch.id];
        if (c && Date.now() - c.at < 20 * 60000) { row.loaded = true; gPaintRow(row); return; }
        st.busy++;
        S.provider.epg(row.ch, 24).then(function (list) { return list; }, function () { return []; }).then(function (list) {
          st.busy--;
          gEpg[row.ch.id] = { at: Date.now(), list: list.sort(function (a, b) { return a.start - b.start; }) };
          row.loaded = true;
          if (G === st) { var cur = Nav.current(), key = cur && cur.getAttribute('data-k'); gPaintRow(row); if (key && /^gp:/.test(key) && !document.body.contains(cur)) { var ch = key.split(':')[1], t = st.body.querySelector('[data-k^="gp:' + ch + ':"]'); if (t) { Nav.focus(t); } } gPump(); }
        });
      })(st.queue.shift());
    }
  }

  /* foco em um programa: mostra o detalhe e rola a janela de horário se ele estiver fora */
  function gFocus(gp) {
    var st = G;
    if (!st) { return; }
    var p = gp.p, ch = gp.ch;
    st.dChan.textContent = ch.name + (p ? '   ·   ' + gSpan(p.start, p.stop) + '   ·   ' + Math.round((p.stop - p.start) / 60000) + ' min' : '');
    st.dTitle.textContent = p ? p.title : ch.name;
    st.dDesc.textContent = p ? (p.desc || 'Sem descrição.') : 'Toque para assistir ao canal.';
    var now = Date.now(), pct = p && p.start <= now && p.stop > now ? Math.round((now - p.start) / (p.stop - p.start) * 100) : 0;
    st.dBar.style.width = pct + '%';
    st.dBar.parentNode.classList.toggle('hidden', !pct);
    if (p) {
      var want = st.win;
      if (p.start < st.win - 1) { want = gFloor(p.start); }
      else if (p.start >= st.win + st.span - 20 * 60000) { want = gFloor(p.start - 30 * 60000); }
      if (want !== st.win) { st.win = want; setTimeout(gRepaint, 0); }
    }
  }

  /* ---------- prévia muda ao segurar o foco num filme/série (cards, Continuar assistindo) ---------- */
  var Prev = { vid: null, host: null, t: null, stopT: null, guard: null };

  /* ---------- trailer (YouTube embed) no lugar do arquivo do filme ---------- */
  var TR = {};
  function ytId(v) {
    v = String(v || '');
    var m = v.match(/(?:[?&]v=|youtu\.be\/|embed\/)([\w-]{11})/);
    if (m) { return m[1]; }
    return /^[\w-]{11}$/.test(v) ? v : '';
  }
  /* promessa com a chave do vídeo no YouTube ('' se não achar): primeiro o campo do provedor, depois o TMDB */
  function dubOn() {
    if (S.opts.pvdub === undefined) { S.opts.pvdub = true; store.set('opts', S.opts); }
    return !!S.opts.pvdub;
  }
  function trailerFor(it) {
    var dub = dubOn(), k = (dub ? 'd:' : 'a:') + it.type + ':' + it.id;
    if (TR[k]) { return TR[k]; }
    var key = tmdbKey(), kind = it.type === 'movie' ? 'movie' : 'tv';
    var tid = null;
    var fromTmdb = function (onlyDub) {
      if (!key) { return Promise.resolve(''); }
      tid = tid || Tmdb.findId(kind, it.name, Tmdb.yearOf(it.name) || parseInt(it.year, 10) || 0, key);
      return tid.then(function (id) {
        return id ? Tmdb.trailer(kind, id, key, onlyDub) : '';
      }).then(null, function () { return ''; });
    };
    var provider = function () {
      return (it.type === 'movie'
        ? S.provider.movieInfo(it).then(function (i) { return i.trailer || ''; })
        : S.provider.episodes(it).then(function (r) { return (r.info && r.info.youtube_trailer) || ''; })
      ).then(ytId, function () { return ''; });
    };
    var p;
    if (dub) {
      // prefere dublado (TMDB marca o idioma); sem ele, cai no do provedor e depois em qualquer idioma
      p = fromTmdb(true).then(function (id) { return id || provider(); }).then(function (id) { return id || fromTmdb(false); });
    } else {
      p = provider().then(function (id) { return id || fromTmdb(false); });
    }
    TR[k] = p;
    return p;
  }
  /* player incorporado, mudo, sem controles, cortado para cobrir o espaço (host). cb: {play, fail(why)} */
  function ytEmbed(host, id, cb) {
    var f = document.createElement('iframe'), done = false, dead = false;
    f.className = 'cardvid ytv';
    f.setAttribute('frameborder', '0');
    f.setAttribute('allow', 'autoplay; encrypted-media');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    f.setAttribute('tabindex', '-1');
    var w = host.offsetWidth || 700, hh = host.offsetHeight || 394, fh = Math.round(w * 9 / 16), fw = w;
    if (fh < hh) { fh = hh; fw = Math.round(hh * 16 / 9); }
    f.style.cssText = 'left:50%;top:50%;width:' + fw + 'px;height:' + fh + 'px;margin-left:-' + Math.round(fw / 2) + 'px;margin-top:-' + Math.round(fh / 2) + 'px;border:0';
    var direct = 'https://www.youtube.com/embed/' + id + '?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&enablejsapi=1';
    function cmd(fn, args) { try { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: fn, args: args || [] }), '*'); } catch (x) {} }
    var last = null, sndT = null, wantSound = S.opts.pvsound !== false && !S.pvNoSound;
    function onMsg(e) {
      if (e.source !== f.contentWindow || typeof e.data !== 'string') { return; }
      var d; try { d = JSON.parse(e.data); } catch (x) { return; }
      var st = d.event === 'onStateChange' ? d.info : (d.event === 'infoDelivery' && d.info ? d.info.playerState : null);
      if (st !== null && st !== undefined) { last = st; }
      if (st === 1 && !done) {
        done = true; cb.play();
        if (wantSound) {
          // começa mudo (sempre permitido); liga o som e confere: se o aparelho travar o vídeo por causa do som, volta ao mudo
          cmd('unMute'); cmd('setVolume', [70]);
          sndT = setTimeout(function () { if (last !== 1 && !dead) { S.pvNoSound = true; cmd('mute'); cmd('playVideo'); } }, 1800);
        }
      }
      if (st === 0 && cb.end) { cb.end(); }
      if (d.event === 'onError') { cb.fail('erro do YouTube ' + d.info); }
    }
    window.addEventListener('message', onMsg);
    f.onload = function () { try { f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch (x) {} };
    host.appendChild(f);
    /* o YouTube recusa (erro 153) quem embute sem endereço de origem; o app abre de file://, então na LG a página
       do player vem do proxy local (http://127.0.0.1), que dá uma origem válida */
    if (window.PalmServiceBridge) {
      startProxy().then(function (p) { if (!dead) { f.src = 'http://127.0.0.1:' + p.port + '/yt?t=' + p.token + '&id=' + id; } },
        function () { if (!dead) { f.src = direct; } });
    } else { f.src = direct; }
    return { el: f, off: function () { dead = true; clearTimeout(sndT); window.removeEventListener('message', onMsg); if (f.parentNode) { f.parentNode.removeChild(f); } } };
  }

  function pvStopCard() {
    clearTimeout(Prev.t); clearTimeout(Prev.stopT); clearInterval(Prev.guard);
    var v = Prev.vid;
    if (Prev.yt) { Prev.yt.off(); Prev.yt = null; if (Prev.host) { Prev.host.classList.remove('pv'); } v = null; }
    if (v && Prev.tr && Prev.host && !Prev.host.classList.contains('pv') && Prev.tr.age() > 3000) { PD.ultima = 'card interrompido (' + Prev.nm + ') ' + Prev.tr(); }
    if (v) {
      v.onerror = v.onplaying = v.onloadedmetadata = null;
      try { v.pause(); } catch (e) {}
      v.removeAttribute('src');
      try { v.load(); } catch (e) {}
      if (v.parentNode) { v.parentNode.removeChild(v); }
    }
    if (Prev.host) { Prev.host.classList.remove('pv'); }
    Prev.vid = null; Prev.host = null;
  }

  var PD = { ultima: '', foco: 0, agendadas: 0, iniciadas: 0, tocando: 0, bloqueio: '', falha: '', player: '' };

  /* ---------- card largo (estilo Netflix): ao parar o foco numa fileira da TV, o pôster vira 16:9 e a prévia toca nele ---------- */
  var Wide = { el: null, t: null };

  function wideOn() {
    if (S.opts.widecard === undefined) { S.opts.widecard = true; store.set('opts', S.opts); }   // 1.39.1: chave própria, ligada por padrão
    return isTvDevice() && S.opts.widecard && !document.body.classList.contains('portrait');
  }

  function wideInfo(it, cb) {
    var key = it.type + ':' + it.id, c = heroInfo[key];
    if (c && c.backdrop !== undefined && c.done) { cb(c); return; }
    var p = it.type === 'movie' ? S.provider.movieInfo(it) : S.provider.episodes(it).then(function (r) {
      var i = r.info || {}, b = i.backdrop_path;
      b = Object.prototype.toString.call(b) === '[object Array]' ? b[0] : b;
      return { plot: i.plot || '', genre: i.genre || '', year: String(i.releaseDate || '').slice(0, 4), backdrop: b || '' };
    });
    p.then(function (i) {
      heroInfo[key] = { plot: i.plot || '', genre: i.genre || '', year: i.year || '', duration: i.duration || '', backdrop: i.backdrop || '', done: 1 };
      cb(heroInfo[key]);
    }, function () { heroInfo[key] = { plot: '', genre: '', year: '', duration: '', backdrop: '', done: 1 }; cb(heroInfo[key]); });
  }

  function wideEnsureVisible(el) {
    var sc = el.parentNode;
    if (!sc || !sc.classList.contains('scroll')) { return; }
    var r = el.getBoundingClientRect(), p = sc.getBoundingClientRect(), k = (p.width / sc.offsetWidth) || 1;
    if (r.right > p.right - 40) { sc.scrollLeft += (r.right - p.right + 40) / k; }
    else if (r.left < p.left + 10) { sc.scrollLeft -= (p.left + 10 - r.left) / k; }
  }

  function wideEnd(next) {
    clearTimeout(Wide.t);
    var el = Wide.el;
    if (!el) { return; }
    Wide.el = null;
    var sc = el.parentNode, before = el.offsetWidth;
    el.classList.remove('wide');
    var ov = el.querySelector('.wideov'); if (ov) { ov.parentNode.removeChild(ov); }
    var po = el.querySelector('.poster'); if (po) { po.style.backgroundImage = ''; po.classList.remove('wbd'); }
    // o card que encolheu estava à esquerda do novo foco: o conteúdo andou para a esquerda, então acompanha
    if (sc && sc.classList && sc.classList.contains('scroll') && next && next.parentNode === sc && el.compareDocumentPosition(next) & 4) {
      var d = before - el.offsetWidth;
      if (d > 0) { sc.scrollLeft = Math.max(0, sc.scrollLeft - d); }
    }
  }

  function wideStart(el, host, it) {
    wideEnd(el);
    Wide.t = setTimeout(function () {
      if (Nav.current() !== el || S.mode !== 'browse' || !document.body.contains(el)) { return; }
      Wide.el = el;
      el.classList.add('wide');
      var ov = h('div', { cls: 'wideov' }, [h('div', { cls: 'wideh', text: it.name }), h('div', { cls: 'widem' }), h('div', { cls: 'widep' })]);
      host.appendChild(ov);
      setTimeout(function () { if (Wide.el === el) { wideEnsureVisible(el); } }, 280);
      wideInfo(it, function (inf) {
        if (Wide.el !== el) { return; }
        if (inf.backdrop) { host.style.backgroundImage = bgUrl(inf.backdrop); host.classList.add('wbd'); }
        ov.querySelector('.widem').textContent = metaLine([inf.year || it.year, it.rating ? 'Nota ' + it.rating : '', inf.genre, inf.duration]);
        ov.querySelector('.widep').textContent = inf.plot || it.plot || '';
      });
    }, 250);
  }

  function pvFocus(el) {
    pvStopCard();
    var host = el.querySelector && el.querySelector('.poster, .thumb');
    var it = host && host._it;
    var inRow = !!(el.parentNode && el.parentNode.classList && el.parentNode.classList.contains('hlist'));
    if (Wide.el && Wide.el !== el) { wideEnd(el); } else if (!Wide.el) { clearTimeout(Wide.t); }
    if (!it || (it.type !== 'movie' && it.type !== 'series')) { return; }
    if (inRow && el.classList.contains('card') && S.mode === 'browse' && S.provider && wideOn()) { wideStart(el, host, it); }
    PD.foco++;
    if (!pvOn()) { PD.bloqueio = 'chave desligada'; return; }
    if (S.mode !== 'browse') { PD.bloqueio = 'modo ' + S.mode; return; }
    if (S.mini) { PD.bloqueio = 'mini player aberto'; return; }
    if (document.hidden) { PD.bloqueio = 'página oculta'; return; }
    if (!S.provider) { PD.bloqueio = 'sem provedor'; return; }
    PD.bloqueio = ''; PD.agendadas++;
    [el.nextSibling, el.nextSibling && el.nextSibling.nextSibling, el.previousSibling].forEach(function (n) {
      var po = n && n.querySelector && n.querySelector('.poster'), pi = po && po._it;
      if (pi && (pi.type === 'movie' || pi.type === 'series')) { trailerFor(pi).then(null, function () {}); }
    });
    Prev.t = setTimeout(function () { if (Nav.current() === el) { pvCardStart(host, it); } }, 350);
  }

  function pvCardStart(host, it) {
    var key = it.type + ':' + it.id;
    PD.iniciadas++;
    trailerFor(it).then(function (id) {
      if (Prev.host || S.mode !== 'browse' || !document.body.contains(host) || !Nav.current() || !Nav.current().contains(host)) { return; }
      if (!id) { PD.bloqueio = 'sem trailer: ' + it.name; return; }
      var tfail = function (why) { TR[(dubOn() ? 'd:' : 'a:') + key] = Promise.resolve(''); PD.falha = 'trailer ' + it.name + ': ' + why; S.pvLast = PD.falha; pvStopCard(); };
      var yt = ytEmbed(host, id, { play: function () { host.classList.add('pv'); S.pvLast = ''; PD.tocando++; }, fail: tfail, end: function () { if (Prev.yt === yt) { pvStopCard(); } } });
      Prev.yt = yt; Prev.vid = yt.el; Prev.host = host; Prev.tr = null; Prev.nm = it.name;
      Prev.stopT = setTimeout(function () { if (Prev.yt === yt && !host.classList.contains('pv')) { tfail('não iniciou em 12 s'); } }, 12000);
      Prev.guard = setInterval(function () {
        if (S.mode !== 'browse' || S.mini || document.hidden || !document.body.contains(host)) { pvStopCard(); }
      }, 700);
    }, function () { PD.bloqueio = 'sem resposta do servidor'; });
  }

  /* ---------- banner de destaque (Início) ---------- */
  var heroInfo = {};

  function heroSlides() {   // 1.46.0: o banner só mostra filmes/séries em alta; o "Continuar assistindo" fica na fileira abaixo
    return { list: [], seen: {} };
  }

  function heroPlayAction(sl) {
    if (sl.cont) { return function () { resumeCont(sl.cont); }; }
    if (sl.it.type === 'movie') { return function () { startPlay({ kind: 'movie', item: sl.it }); }; }
    return function () { showDetail(sl.it); };
  }

  function heroBanner(rows) {
    if (S.heroTimer) { clearInterval(S.heroTimer); S.heroTimer = null; }
    var token = S.homeToken;
    var base = heroSlides(), slides = base.list, cur = 0, hero = h('div', { cls: 'hero hidden' });
    var bg = h('div', { cls: 'herobg' }), poster = h('div', { cls: 'heroposter' });
    var tag = h('div', { cls: 'herotag' }), title = h('div', { cls: 'herotitle' }), meta = h('div', { cls: 'herometa' }), plot = h('div', { cls: 'heroplot' });
    var btns = h('div', { cls: 'herobtns' }), dots = h('div', { cls: 'herodots' });
    var txt = h('div', { cls: 'herotxt' }, [tag, title, meta, plot, btns]);
    var pvT = null, pvStop = null, pvBad = {};
    hero.appendChild(bg); hero.appendChild(h('div', { cls: 'herofade' })); hero.appendChild(poster); hero.appendChild(txt); hero.appendChild(dots);

    function show(i, focusK) {
      if (!slides.length) { return; }
      cur = (i + slides.length) % slides.length;
      var sl = slides[cur], it = sl.it, key = it.type + ':' + it.id, inf = heroInfo[key] || {};
      txt.classList.add('swap');
      setTimeout(function () {
        if (!hero.parentNode || token !== S.homeToken) { return; }
        tag.textContent = sl.cont ? 'CONTINUAR ASSISTINDO' : (it.type === 'movie' ? 'FILME EM DESTAQUE' : 'SÉRIE EM DESTAQUE');
        title.textContent = it.name;
        paintMeta(it, inf);
        plot.textContent = inf.plot || it.plot || '';
        var back = inf.backdrop || '';
        bg.style.backgroundImage = bgUrl(back || it.logo || '');
        hero.classList.toggle('nobd', !back);
        poster.style.backgroundImage = it.logo ? bgUrl(it.logo) : '';
        btns.innerHTML = '';
        var label = sl.cont ? 'Continuar' : (it.type === 'movie' ? 'Assistir' : 'Ver episódios');
        btns.appendChild(h('button', { cls: 'f btn primary', type: 'button', 'data-k': 'hero-play', on: { click: heroPlayAction(sl) } }, [icon('play', 22), label]));
        btns.appendChild(h('button', { cls: 'f btn', type: 'button', text: 'Mais informações', 'data-k': 'hero-info', on: { click: function () { showDetail(it); } } }));
        [].forEach.call(dots.children, function (d, n) { d.classList.toggle('on', n === cur); });
        txt.classList.remove('swap');
        if (focusK) { var fb = btns.querySelector('[data-k="' + focusK + '"]'); if (fb) { Nav.focus(fb); } }
        pvEnd(); pvSchedule();
        if (!heroInfo[key]) { loadInfo(sl, cur); }
      }, 220);
    }
    /* preview mudo (estilo Netflix): depois de ~4 s parado no banner, toca um trecho do filme/série */
    function pvAlive() { return hero.parentNode && document.body.contains(hero) && token === S.homeToken; }
    function pvEnd() {
      clearTimeout(pvStop);
      if (hero._yt) { hero._yt.off(); hero._yt = null; }
      hero.classList.remove('pv');
    }
    function pvSchedule() {
      clearTimeout(pvT);
      if (!pvOn() || !slides.length) { return; }
      pvT = setTimeout(pvStart, 700);
    }
    function pvStart() {
      if (!pvAlive()) { pvEnd(); return; }
      var sl = slides[cur];
      PD.player = 'banner tentou ' + (++PD.agendadas);
      if (S.mode !== 'browse' || S.mini || document.hidden || !sl || pvBad[sl.it.type + ':' + sl.it.id]) { return; }
      var key = sl.it.type + ':' + sl.it.id;
      trailerFor(sl.it).then(function (id) {
        if (!pvAlive() || slides[cur] !== sl || S.mode !== 'browse' || hero._yt) { return; }
        if (!id) { pvBad[key] = 1; PD.bloqueio = 'sem trailer: ' + sl.it.name; return; }
        var tfail = function (why) { TR[(dubOn() ? 'd:' : 'a:') + key] = Promise.resolve(''); pvBad[key] = 1; PD.falha = 'trailer ' + sl.it.name + ': ' + why; pvEnd(); };
        var yt = ytEmbed(hero, id, { play: function () { hero.classList.add('pv'); PD.tocando++; }, fail: tfail, end: function () { if (hero._yt === yt) { pvEnd(); var f = Nav.current(); if (slides.length > 1 && !(f && hero.contains(f))) { show(cur + 1); } } } });
        yt.el.className = 'herovid ytv';
        hero._yt = yt;
        hero.insertBefore(yt.el, hero.querySelector('.herofade'));
        clearTimeout(pvStop);
        pvStop = setTimeout(function () { if (hero._yt === yt && !hero.classList.contains('pv')) { tfail('não iniciou em 12 s'); } }, 12000);
      }, function () { pvBad[key] = 1; });
    }
    function pvIdle() { pvEnd(); pvSchedule(); }
    ['keydown', 'touchstart', 'mousedown'].forEach(function (ev) {
      document.addEventListener(ev, function () { if (pvAlive()) { pvIdle(); } }, true);
    });
    function paintMeta(it, inf) {
      meta.textContent = metaLine([inf.year || it.year, it.rating ? 'Nota ' + it.rating : '', inf.genre, inf.duration]);
    }
    function loadInfo(sl, idx) {
      var it = sl.it, key = it.type + ':' + it.id;
      heroInfo[key] = heroInfo[key] || {};
      var p = it.type === 'movie' ? S.provider.movieInfo(it) : S.provider.episodes(it).then(function (r) {
        var i = r.info || {}, b = i.backdrop_path;
        b = Object.prototype.toString.call(b) === '[object Array]' ? b[0] : b;
        return { plot: i.plot || '', genre: i.genre || '', year: String(i.releaseDate || '').slice(0, 4), backdrop: b || '' };
      });
      p.then(function (i) {
        heroInfo[key] = { plot: i.plot || '', genre: i.genre || '', year: i.year || '', duration: i.duration || '', backdrop: i.backdrop || '' };
        if (hero.parentNode && token === S.homeToken && slides[cur] === sl) { show(cur); }
      }, function () {});
    }
    function rebuildDots() {
      dots.innerHTML = '';
      slides.forEach(function (x, n) { dots.appendChild(h('button', { cls: 'herodot' + (n === cur ? ' on' : ''), type: 'button', 'aria-label': 'Destaque ' + (n + 1), on: { click: function () { show(n); } } })); });
    }
    function start() {
      if (!slides.length) { return; }
      hero.classList.remove('hidden');
      rebuildDots();
      show(0);
      S.heroTimer = setInterval(function () {
        if (!document.body.contains(hero) || token !== S.homeToken) { clearInterval(S.heroTimer); S.heroTimer = null; return; }
        var f = Nav.current();
        if (!pvAlive()) { pvEnd(); }
        if (S.mode !== 'browse' || slides.length < 2 || (f && hero.contains(f)) || hero.classList.contains('pv')) { return; }   // parado enquanto o foco está nos botões
        show(cur + 1);
      }, 8000);
    }
    // TV: ◀ ▶ nos botões do banner trocam de destaque (no celular o banner segue como era)
    S.heroKey = function (k) {
      if (!isTvDevice() || slides.length < 2 || !hero.parentNode || token !== S.homeToken) { return false; }
      var f = Nav.current(), dk = f && hero.contains(f) && f.getAttribute('data-k');
      if (k === KEY.RIGHT && dk === 'hero-info') { show(cur + 1, 'hero-play'); return true; }
      if (k === KEY.LEFT && dk === 'hero-play') { show(cur - 1, 'hero-play'); return true; }
      return false;
    };
    rows.appendChild(hero);
    if (slides.length) { start(); }
    // completa com os destaques do catálogo (em alta); se não houver histórico, o banner nasce deles
    setTimeout(function () {
      if (token !== S.homeToken || !S.provider) { return; }
      Promise.all(['movie', 'series'].map(function (sec) {
        return S.provider.all(sec).then(function (l) { return trendList(sec, l); }, function () { return []; });
      })).then(function (r) {
        if (token !== S.homeToken || !hero.parentNode) { return; }
        var add = [];
        [0, 1, 2, 3].forEach(function (n) {
          [r[0], r[1]].forEach(function (l) {
            var it = l && l[n];
            if (it && it.logo && !base.seen[it.type + ':' + it.id]) { base.seen[it.type + ':' + it.id] = 1; add.push({ it: it, cont: null }); }
          });
        });
        if (!add.length) { return; }
        var was = slides.length;
        slides = slides.concat(add).slice(0, 8);
        if (!was) { start(); } else { rebuildDots(); }
      }, function () {});
    }, 300);
  }

  function renderHome() {
    var page = S.pageEl;
    page.className = 'page scroll home';
    if (homeStyle() === 'blocks') {
      page.appendChild(h('div', { cls: 'hub-tiles' }, [
        hubTile('live', 'Canais e programação'), hubTile('movie', 'Catálogo de filmes'), hubTile('series', 'Séries e episódios'), hubTile('sports', 'Placares e jogos')
      ]));
    } else {
      page.appendChild(h('div', { cls: 'hubtabs' }, [hubTab('live'), hubTab('movie'), hubTab('series'), hubTab('sports')]));
    }
    var rows = h('div', { cls: 'hrows' });
    page.appendChild(rows);
    heroBanner(rows);

    var conts = contList().slice(0, 12);
    if (conts.length) { rows.appendChild(makeRow('Continuar assistindo', conts.map(contCard))); }
    var spHost = h('div', { cls: 'sphome hidden' });
    rows.appendChild(spHost);
    spHomeFill(spHost);
    var favs = favList();
    if (favs.length) {
      rows.appendChild(makeRow('Favoritos', favs.slice(0, 20).map(function (it) { return posterCard(it, favs); }).concat([seeAllCard(favs.length)])));
    }
    var hist = store.get('hist', []);
    if (tmdbKey()) {
      var bases = [], used = {};
      hist.forEach(function (x) { if (bases.length < 2 && !used[x.type + ':' + x.id]) { used[x.type + ':' + x.id] = 1; bases.push(x); } });
      bases.forEach(function (b) { recRow(rows, b); });
    }
    trendRow(rows, 'movie', 'Filmes em alta');
    trendRow(rows, 'series', 'Séries em alta');
    if (!tmdbKey()) { forYouRow(rows); }

    var want = S.hubFocus, target = null;
    if (want === 'cont') { target = page.querySelector('.lcard'); }
    else if (want === 'settings' || want === 'dl') { target = S.headEl.querySelector('.menubtn'); }
    else if (want) { target = S.mainEl.querySelector('[data-sec="' + want + '"]'); }
    Nav.focus(target || page.querySelector('.hubtab, .hubtile'));
  }

  /* "em alta": novidades do catálogo com boa nota (o Xtream não tem ranking; usamos data de adição + nota) */
  function trending(list) {
    var now = Date.now() / 1000, seen = {}, scored = [];
    list.forEach(function (it) {
      if (!(it.rating > 0) || !it.logo) { return; }
      var key = Tmdb.norm(it.name) + '|' + Tmdb.yearOf(it.name);
      var age = it.added ? (now - it.added) / 86400 : 9999, x = { it: it, age: age, s: it.rating + Math.max(0, 1 - age / 90) * 3 };
      if (seen[key]) {   // mesma obra em outra versão (dublado/legendado/4K): fica a preferida
        if (Tmdb.rank(it) > Tmdb.rank(seen[key].it)) { scored[scored.indexOf(seen[key])] = x; seen[key] = x; }
        return;
      }
      seen[key] = x;
      scored.push(x);
    });
    var recent = scored.filter(function (x) { return x.age <= 120; });
    var pool = recent.length >= 10 ? recent : scored;
    pool.sort(function (a, b) { return b.s - a.s; });
    return pool.slice(0, 20).map(function (x) { return x.it; });
  }

  function tmdbKey() { return store.get('tmdbkey', ''); }

  function tmdbCached(key, hours, fetchFn) {
    var c = store.get(key, null);
    if (c && Date.now() - c.at < hours * 3600000) { return Promise.resolve(c.data); }
    return fetchFn().then(function (d) { store.set(key, { at: Date.now(), data: d }); return d; });
  }

  function clearTmdbCache() {
    try {
      var rm = [], i, k;
      for (i = 0; i < localStorage.length; i++) { k = localStorage.key(i); if (k.indexOf('iptv.tmdb') === 0 && k !== 'iptv.tmdbkey') { rm.push(k); } }
      rm.forEach(function (x) { localStorage.removeItem(x); });
    } catch (e) {}
  }

  /* ranking real da semana (TMDB) cruzado com o catálogo; completa com nota + novidade se faltar */
  function trendList(section, list) {
    var key = tmdbKey(), local = trending(list);
    if (!key) { return Promise.resolve(local); }
    var kind = section === 'series' ? 'tv' : 'movie';
    return tmdbCached('tmdbtr:' + kind, 12, function () { return Tmdb.trending(kind, key); }).then(function (res) {
      var out = Tmdb.match(list, res).filter(function (it) { return it.logo; }).slice(0, 20), seen = {};
      out.forEach(function (it) { seen[it.type + ':' + it.id] = 1; });
      local.forEach(function (it) { if (out.length < 20 && !seen[it.type + ':' + it.id]) { out.push(it); } });
      return out;
    }, function () { return local; });
  }

  function trendRow(rows, section, title) {
    var slot = h('div'), token = S.homeToken;
    rows.appendChild(slot);
    setTimeout(function () {
      if (token !== S.homeToken || !S.provider) { return; }
      S.provider.all(section).then(function (list) {
        return trendList(section, list);
      }).then(function (top) {
        if (token !== S.homeToken || !slot.parentNode) { return; }
        if (top.length < 4) { slot.parentNode.removeChild(slot); return; }
        rows.replaceChild(makeRow(title, top.map(function (it) { return posterCard(it, top); })), slot);
      }, function () { if (slot.parentNode) { slot.parentNode.removeChild(slot); } });
    }, 500);
  }

  function histSeen() { var m = {}; store.get('hist', []).forEach(function (x) { m[x.type + ':' + x.id] = 1; }); return m; }

  /* "Porque você assistiu X": parecidos do TMDB que existem no catálogo */
  function recRow(rows, base) {
    var slot = h('div'), token = S.homeToken, key = tmdbKey();
    rows.appendChild(slot);
    function drop() { if (slot.parentNode) { slot.parentNode.removeChild(slot); } }
    var kind = base.type === 'series' ? 'tv' : 'movie', year = Tmdb.yearOf(base.name) || (parseInt(base.year, 10) || 0);
    setTimeout(function () {
      if (token !== S.homeToken || !S.provider) { return; }
      tmdbCached('tmdbid:' + kind + ':' + Tmdb.norm(base.name), 24 * 30, function () { return Tmdb.findId(kind, base.name, year, key); }).then(function (id) {
        if (!id) { throw new Error('sem id'); }
        return tmdbCached('tmdbrec:' + kind + ':' + id, 24 * 7, function () { return Tmdb.recommend(kind, id, key); });
      }).then(function (res) {
        return S.provider.all(base.type).then(function (list) {
          var seen = histSeen(), out = Tmdb.match(list, res).filter(function (it) { return !seen[it.type + ':' + it.id]; }).slice(0, 20);
          if (token !== S.homeToken || !slot.parentNode) { return; }
          if (out.length < 3) { drop(); return; }
          rows.replaceChild(makeRow('Porque você assistiu ' + base.name, out.map(function (it) { return posterCard(it, out); })), slot);
        });
      }).then(null, drop);
    }, 700);
  }

  /* sem chave do TMDB: gosto aprendido localmente pelas categorias que o perfil mais assiste */
  function forYouRow(rows) {
    var hist = store.get('hist', []), slot = h('div'), token = S.homeToken;
    if (hist.length < 2) { return; }
    rows.appendChild(slot);
    setTimeout(function () {
      if (token !== S.homeToken || !S.provider) { return; }
      Promise.all([S.provider.all('movie'), S.provider.all('series')]).then(function (lists) {
        var aff = {}, seen = histSeen(), cands = [];
        hist.slice(0, 20).forEach(function (x, i) { var k = x.type + ':' + x.cat; aff[k] = (aff[k] || 0) + Math.max(0.3, 1 - i * 0.05); });
        lists.forEach(function (list0) {
          Tmdb.best(list0).forEach(function (it) {
            var a = aff[it.type + ':' + it.cat];
            if (!a || !it.logo || seen[it.type + ':' + it.id]) { return; }
            cands.push({ it: it, s: a * 2 + (it.rating || 0) * 0.4 });
          });
        });
        cands.sort(function (a, b) { return b.s - a.s; });
        var out = cands.slice(0, 20).map(function (x) { return x.it; });
        if (token !== S.homeToken || !slot.parentNode) { return; }
        if (out.length < 4) { slot.parentNode.removeChild(slot); return; }
        rows.replaceChild(makeRow('Para você', out.map(function (it) { return posterCard(it, out); })), slot);
      }, function () { if (slot.parentNode) { slot.parentNode.removeChild(slot); } });
    }, 900);
  }

  function refreshHome() {
    S.homeToken++;
    S.pageEl.innerHTML = '';
    S.pageEl.scrollTop = 0;
    S.hubFocus = 'cont';
    renderHome();
  }

  /* ---------- configurações ---------- */

  function sgroup(t) { return h('div', { cls: 'sgroup', text: t }); }

  function switchRow(label, desc, key) {
    var sw = h('span', { cls: 'sw' + (opt(key) ? ' on' : '') }, [h('span', { cls: 'knob' })]);
    return h('div', { cls: 'f swrow', on: { click: function () {
      setOpt(key, !opt(key));
      sw.classList.toggle('on', opt(key));
    } } }, [h('div', { cls: 'swtxt' }, [h('div', { cls: 'swl', text: label }), h('div', { cls: 'swd', text: desc })]), sw]);
  }

  /* qual versão aparece primeiro quando o catálogo tem o mesmo título dublado, legendado ou em 4K */
  function verBlock() {
    var cur = store.get('verpref', 'dub'), opts = [['Dublado', 'dub'], ['Legendado', 'leg'], ['Sem preferência', 'any']], box = h('div', { cls: 'sbtns scales' });
    function paint() {
      box.innerHTML = '';
      opts.forEach(function (o) {
        box.appendChild(h('button', { cls: 'f btn' + (cur === o[1] ? ' primary' : ''), text: o[0], on: { click: function () {
          cur = o[1]; store.set('verpref', cur); Tmdb.setPref(cur); paint();
        } } }));
      });
    }
    paint();
    return box;
  }

  /* estilo da tela inicial: vale para este aparelho (não vai para a sincronização) */
  function homeStyleBlock() {
    var cur = homeStyle(), opts = [['Blocos grandes', 'blocks'], ['Abas no topo', 'tabs']], box = h('div', { cls: 'sbtns scales' });
    function paint() {
      box.innerHTML = '';
      opts.forEach(function (o) {
        box.appendChild(h('button', { cls: 'f btn' + (cur === o[1] ? ' primary' : ''), text: o[0], on: { click: function () {
          cur = o[1]; store.set('homestyle', cur); paint(); toast('Vale ao voltar para a Início', 2000);
        } } }));
      });
    }
    paint();
    return box;
  }

  /* tamanho do texto e dos blocos no celular */
  function scaleBlock() {
    var cur = store.get('uiscale', 1), opts = [['Normal', 1], ['Grande', 1.15], ['Muito grande', 1.3]], box = h('div', { cls: 'sbtns scales' });
    function paint() {
      box.innerHTML = '';
      opts.forEach(function (o) {
        box.appendChild(h('button', { cls: 'f btn' + (Math.abs(cur - o[1]) < 0.01 ? ' primary' : ''), text: o[0], on: { click: function () {
          cur = o[1]; store.set('uiscale', cur);
          if (window.__relayout) { window.__relayout(); }
          paint();
        } } }));
      });
    }
    paint();
    return box;
  }

  /* letreiro: texto que não cabe na linha anda devagar para a esquerda e volta */
  function runMarquee() {
    var els = document.querySelectorAll('.row .name, .row .epg, .lt, .ls, .sectitle, .swl'), i, el, over, dist;
    for (i = 0; i < els.length; i++) {
      el = els[i];
      if (el._mq === el.textContent + '|' + el.clientWidth) { continue; }
      el._mq = el.textContent + '|' + el.clientWidth;
      el.classList.remove('mq');
      over = el.scrollWidth - el.clientWidth;
      if (over > 3) {
        dist = over + 8;
        el.style.setProperty('--mq', '-' + dist + 'px');
        el.style.setProperty('--mqd', (3 + dist / 30).toFixed(1) + 's');
        el.classList.add('mq');
      }
    }
  }

  /* chave gratuita do TMDB: liga o ranking real de "em alta" e o "Porque você assistiu" */
  function tmdbBlock() {
    var input = h('input', { cls: 'f input', id: 'tmdbkey', type: 'text', placeholder: 'Chave de API v3 do TMDB (32 caracteres)' });
    var status = h('div', { cls: 'swd', text: tmdbKey() ? 'Chave salva. Ranking real e recomendações ativos.' : 'Sem chave: a linha "em alta" usa nota e novidade do catálogo.' });
    input.value = tmdbKey();
    function save() {
      var k = (input.value || '').replace(/\s+/g, '');
      if (!k) { store.del('tmdbkey'); clearTmdbCache(); status.textContent = 'Chave removida.'; return; }
      status.textContent = 'Conferindo a chave…';
      Tmdb.check(k).then(function () {
        store.set('tmdbkey', k); clearTmdbCache();
        status.textContent = 'Chave válida. Ranking real e recomendações ativos.';
      }, function () { status.textContent = 'Chave inválida (use a "Chave da API" v3 do themoviedb.org).'; });
    }
    input.addEventListener('keydown', function (e) { if (e.keyCode === 13) { save(); } });
    return h('div', {}, [
      h('div', { cls: 'swd tmdbhelp', text: 'Gratuito: crie conta em themoviedb.org, abra Configurações → API e copie a Chave da API. Cole abaixo.' }),
      h('div', { cls: 'citybox' }, [input, h('button', { cls: 'f btn', text: 'Salvar', on: { click: save } })]),
      status,
      h('div', { cls: 'swd tmdbhelp', text: 'Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.' })
    ]);
  }

  function cityBlock() {
    var curTxt = h('div', { text: cityLabel(getCity()) });
    var input = h('input', { cls: 'f input', id: 'city', type: 'text', placeholder: 'Digite o nome da cidade' });
    var results = h('div', { cls: 'cityres' });
    function pick(r) {
      store.set('city', { name: r.name, admin: r.admin, lat: r.lat, lon: r.lon });
      store.del('wx');
      curTxt.textContent = cityLabel(getCity());
      results.innerHTML = '';
      input.value = '';
      toast('Cidade: ' + r.name, 2000);
    }
    function go() {
      var q = input.value.trim();
      if (q.length < 2) { toast('Digite pelo menos 2 letras'); return; }
      results.innerHTML = '';
      Weather.search(q).then(function (list) {
        if (!list.length) { results.appendChild(h('div', { cls: 'empty', text: 'Nenhuma cidade encontrada.' })); return; }
        list.forEach(function (r) {
          results.appendChild(h('button', { cls: 'f btn', text: r.name + (r.admin ? ' — ' + r.admin : '') + (r.country ? ' (' + r.country + ')' : ''),
            on: { click: function () { pick(r); } } }));
        });
        Nav.focus(results.querySelector('.f'));
      }, function () { toast('Sem conexão para buscar a cidade', 3000); });
    }
    input._enter = go;
    return h('div', {}, [
      h('div', { cls: 'srow' }, [h('div', { cls: 'skey', text: 'Cidade do clima' }), curTxt]),
      h('div', { cls: 'citybox' }, [input, h('button', { cls: 'f btn', text: 'Buscar', on: { click: go } })]),
      results
    ]);
  }

  /* sincronização com outros aparelhos: endereço do servidor (uma vez por aparelho) + código (por perfil) */
  function cloudBlock() {
    var urlIn = h('input', { cls: 'f input', id: 'syncurl', type: 'text', placeholder: 'Endereço do servidor (ex.: master-sync.seunome.workers.dev)' });
    var codeIn = h('input', { cls: 'f input', id: 'synccode', type: 'text', placeholder: 'Código (ou endereço#código para parear de uma vez)' });
    var status = h('div', { cls: 'swd' });
    var pairEl = h('div', { cls: 'swd' });
    function load() {
      urlIn.value = cloudUrl().replace(/^https:\/\//i, '');
      codeIn.value = cloudCode() ? Sync.fmtCode(cloudCode()) : '';
    }
    function paint(msg) {
      var at = store.get('syncat', 0);
      if (!cloudOn()) {
        status.textContent = msg || 'Desligada. Informe o endereço do servidor e gere um código aqui; nos outros aparelhos digite o mesmo código neste perfil.';
        pairEl.textContent = '';
        return;
      }
      status.textContent = msg || ('Ligada neste perfil' + (at ? ' · última sincronização às ' + hhmm(new Date(at)) : '') + '.');
      pairEl.textContent = 'Para parear outro aparelho, digite lá: ' + Sync.pairString(cloudUrl(), cloudCode());
    }
    function save() {
      var p = Sync.parsePair(codeIn.value), u = p.url || Sync.normUrl(urlIn.value);
      if (u) { store.set('syncurl', u); } else { store.del('syncurl'); }
      if (p.code) {
        if (!Sync.validCode(p.code)) { toast('Código inválido (16 letras e números)', 3000); return false; }
        store.set('synccode', p.code);
      } else { store.del('synccode'); }
      load(); paint();
      return true;
    }
    function run() {
      if (!cloudOn()) { paint('Informe o endereço do servidor e o código primeiro.'); return; }
      paint('Sincronizando…');
      cloudNow().then(function (r) {
        paint(r && r.pulled ? 'Sincronizado: dados novos recebidos.' : 'Sincronizado: tudo em dia.');
      }, function (e) { paint('Falha: ' + ((e && e.message) || 'erro')); });
    }
    codeIn._enter = function () { if (save()) { run(); } };
    urlIn._enter = function () { Nav.focus(codeIn); };
    load(); paint();
    return h('div', {}, [
      h('div', { cls: 'swd tmdbhelp', text: 'Mantém "continuar assistindo", favoritos e histórico iguais na TV e no celular. Não leva o login do servidor IPTV. Precisa do servidor gratuito descrito em docs/sincronizacao.md.' }),
      h('div', { cls: 'citybox' }, [urlIn]),
      h('div', { cls: 'citybox' }, [codeIn, h('button', { cls: 'f btn', text: 'Salvar', on: { click: function () { if (save()) { run(); } } } })]),
      h('div', { cls: 'sbtns' }, [
        h('button', { cls: 'f btn primary', text: 'Gerar novo código', on: { click: function () {
          if (!Sync.normUrl(urlIn.value) && !cloudUrl()) { toast('Informe o endereço do servidor primeiro', 3000); return; }
          codeIn.value = Sync.fmtCode(Sync.newCode());
          if (save()) { run(); }
        } } }),
        h('button', { cls: 'f btn', text: 'Sincronizar agora', on: { click: run } }),
        h('button', { cls: 'f btn', text: 'Desligar', on: { click: function () { store.del('synccode'); load(); paint(); } } })
      ]),
      status, pairEl
    ]);
  }

  function renderSettings() {
    var page = S.pageEl, info = S.info || {};
    page.className = 'page scroll settings';
    var host = '';
    if (S.cfg && S.cfg.server) { host = S.cfg.server.replace(/^https?:\/\//i, '').replace(/\/.*$/, ''); }
    var rows = [
      ['Servidor', host],
      ['Usuário', (S.cfg && S.cfg.user) || ''],
      ['Status', info.status || ''],
      ['Validade', info.exp ? info.exp.toLocaleDateString('pt-BR') : '—'],
      ['Conexões simultâneas', info.maxConn || '—'],
      ['Versão do app', '1.46.0']
    ];
    page.appendChild(sgroup('Conta'));
    rows.forEach(function (r) {
      page.appendChild(h('div', { cls: 'srow' }, [h('div', { cls: 'skey', text: r[0] }), h('div', { text: String(r[1]) })]));
    });
    page.appendChild(h('div', { cls: 'sbtns' }, [
      h('button', { cls: 'f btn primary', text: 'Editar servidor', on: { click: function () { showLogin('', true); } } }),
      h('button', { cls: 'f btn', text: 'Trocar conta / Sair', on: { click: logout } })
    ]));

    page.appendChild(sgroup('Perfil'));
    page.appendChild(h('div', { cls: 'srow' }, [h('div', { cls: 'skey', text: 'Perfil atual' }), h('div', { text: curProfile().name })]));
    page.appendChild(h('div', { cls: 'sbtns' }, [
      h('button', { cls: 'f btn', text: 'Trocar perfil', on: { click: function () { showProfiles(true); } } }),
      h('button', { cls: 'f btn', text: 'Gerenciar perfis', on: { click: function () { showProfiles(true); S.profManage = true; renderProfiles(); } } })
    ]));
    if (document.body.classList.contains('touch')) {
      page.appendChild(sgroup('Aparência'));
      page.appendChild(scaleBlock());
    }
    page.appendChild(sgroup('Preferências'));
    page.appendChild(h('div', { cls: 'sgroup sub', text: 'Versão preferida (dublado/legendado)' }));
    page.appendChild(verBlock());
    page.appendChild(h('div', { cls: 'sgroup sub', text: 'Aviso de gols (pop-up com o placar, enquanto o app está aberto)' }));
    page.appendChild(goalBlock());
    page.appendChild(h('div', { cls: 'sgroup sub', text: 'Estilo da tela inicial (neste aparelho)' }));
    page.appendChild(homeStyleBlock());
    page.appendChild(switchRow('Reproduzir o último conteúdo ao abrir o app', 'Ao iniciar, retoma o último canal, filme ou episódio assistido.', 'autoplay'));
    if (hasBg()) { page.appendChild(switchRow('Continuar tocando com a tela bloqueada', 'O áudio segue tocando ao bloquear o celular ou sair do app (aparece uma notificação enquanto toca).', 'bgplay')); }
    if (isTvDevice()) { wideOn(); page.appendChild(switchRow('Card ampliado ao parar o foco', 'Na TV, o filme/série em foco nas fileiras da Início vira um cartão largo com imagem, nota e sinopse (a prévia de vídeo toca nele, se ligada).', 'widecard')); }
    pvOn();
    page.appendChild(switchRow('Trailer na prévia', 'Depois de alguns segundos parado no banner ou num card, toca o trailer (YouTube, pelo provedor ou pelo TMDB), mudo.', 'heropv'));
    if (opt('heropv')) [
      'Diagnóstico do trailer — foco em filmes/séries: ' + PD.foco + ' · agendadas: ' + PD.agendadas + ' · iniciadas: ' + PD.iniciadas + ' · tocando: ' + PD.tocando + (PD.bloqueio ? ' · bloqueio: ' + PD.bloqueio : ''),
      PD.falha ? 'Última falha: ' + PD.falha : '',
      PD.ultima ? 'Interrompida: ' + PD.ultima : ''
    ].forEach(function (t) { if (t) { page.appendChild(h('div', { cls: 'swd', style: 'margin:-6px 40px 10px 4px;white-space:normal;word-break:break-word;max-width:1500px', text: t })); } });
    page.appendChild(switchRow('Ocultar canais SD', 'Esconde da lista os canais com "SD" no nome.', 'hideSD'));
    page.appendChild(switchRow('Ocultar canais HD', 'Esconde da lista os canais com "HD" no nome (FHD e 4K continuam).', 'hideHD'));
    camOn();
    page.appendChild(switchRow('Ocultar filmes de cinema (gravação)', 'Esconde filmes de categoria/etiqueta Cinema ou CAM, que são gravações de sala com qualidade baixa.', 'hideCam'));
    page.appendChild(switchRow('Som no trailer', 'Toca o trailer com som. Se a TV não permitir som automático, volta sozinho ao mudo.', 'pvsound'));
    dubOn();
    page.appendChild(switchRow('Preferir trailer dublado', 'Escolhe o trailer em português do Brasil (do TMDB, precisa da chave) e, se não houver, usa o do provedor ou de qualquer idioma. Desligado, usa o do provedor primeiro.', 'pvdub'));

    page.appendChild(sgroup('Recomendações'));
    page.appendChild(tmdbBlock());
    page.appendChild(sgroup('Clima'));
    page.appendChild(cityBlock());
    page.appendChild(sgroup('Sincronização'));
    page.appendChild(cloudBlock());

    page.appendChild(sgroup('Dados'));
    page.appendChild(h('div', { cls: 'sbtns' }, [
      h('button', { cls: 'f btn', text: 'Limpar histórico', on: { click: function () {
        Object.keys(S.cont).concat(Object.keys(S.resume)).forEach(markDone);
        S.cont = {}; S.resume = {}; S.recent = []; S.last = {};
        store.set('cont', S.cont); store.set('resume', S.resume); store.set('recent', S.recent); store.set('last', S.last);
        store.del('lastlive');
        toast('Histórico limpo');
      } } }),
      h('button', { cls: 'f btn', text: 'Limpar favoritos', on: { click: function () {
        Object.keys(S.favs).forEach(function (k) { stampFav(k, false); });
        S.favs = {}; store.set('fav', S.favs); toast('Favoritos limpos');
      } } })
    ]));
    Nav.focus(page.querySelector('.sbtns .btn'));
  }

  /* ---------- detalhes (filme / série) ---------- */

  function showDetail(it, vars) {
    if (!S.detail) { S.lastFocus = Nav.current(); }
    S.mode = 'detail';
    var D = S.detail = { item: it, flat: [], seasons: [], season: null, vars: vars || null };
    var d = $('detail');
    d.innerHTML = '';
    d.classList.remove('hidden');

    var bg = h('div', { cls: 'bg' });
    var poster = h('div', { cls: 'dposter' });
    if (it.logo) { bg.style.backgroundImage = bgUrl(it.logo); poster.style.backgroundImage = bgUrl(it.logo); }
    var title = h('div', { cls: 'dtitle', text: it.name });
    var meta = h('div', { cls: 'dmeta', text: metaLine([it.year, it.rating ? 'Nota ' + it.rating : '']) });
    var plot = h('div', { cls: 'dplot', text: it.plot || '' });
    var btns = h('div', { cls: 'dbtns' });
    D.seasonsEl = h('div', { cls: 'seasons' });
    D.epsEl = h('div', { cls: 'eplist scroll' });
    D.btns = btns; D.meta = meta; D.plot = plot; D.bg = bg;
    D.castEl = h('div', { cls: 'dcast' });

    d.appendChild(bg);
    d.appendChild(h('div', { cls: 'bgfade' }));
    d.appendChild(h('div', { cls: 'dwrap scroll' }, [
      h('div', { cls: 'dmain' }, [poster, h('div', { cls: 'dinfo' }, [title, meta, plot, D.varsEl = h('div', { cls: 'dvars' }), btns])]),
      D.seasonsEl, D.epsEl, D.castEl
    ]));
    Nav.setScope(d);
    if (!isTvDevice() && pvOn()) {   // celular: o trailer toca no fundo da tela do filme
      trailerFor(it).then(function (id) {
        if (!id || S.detail !== D || S.mode !== 'detail') { return; }
        var yt = ytEmbed(bg, id, { play: function () { bg.classList.add('pv'); }, fail: function () { yt.off(); }, end: function () { yt.off(); bg.classList.remove('pv'); } });
        D.yt = yt;
        var g = setInterval(function () {
          if (S.detail !== D || S.mode !== 'detail' || document.hidden) { clearInterval(g); yt.off(); bg.classList.remove('pv'); }
        }, 600);
      }, function () {});
    }
    castRow(D);
    if (vars) { renderVariants(D); }
    else {
      S.provider.all(it.type).then(function (list) {
        var v = Tmdb.variants(list, it);
        if (S.detail !== D || v.length < 2) { return; }
        D.vars = v;
        renderVariants(D);
      }, function () {});
    }

    if (it.type === 'movie') {
      buildMovieButtons();
      S.provider.movieInfo(it).then(function (i) {
        if (S.detail !== D) { return; }
        meta.textContent = metaLine([i.year || it.year, it.rating ? 'Nota ' + it.rating : '', i.genre, i.duration]);
        if (i.plot) { plot.textContent = i.plot; }
        if (i.backdrop) { bg.style.backgroundImage = bgUrl(i.backdrop); }
      }, function () {});
    } else {
      buildSeriesButtons();
      D.epsEl.appendChild(h('div', { cls: 'empty', text: 'Carregando episódios…' }));
      S.provider.episodes(it).then(function (r) {
        if (S.detail !== D) { return; }
        D.seasons = r.seasons;
        r.seasons.forEach(function (s) { D.flat = D.flat.concat(s.episodes); });
        var inf = r.info || {};
        if (!it.plot && inf.plot) { plot.textContent = inf.plot; }
        meta.textContent = metaLine([it.year || String(inf.releaseDate || '').slice(0, 4), it.rating ? 'Nota ' + it.rating : '', inf.genre]);
        var b = inf.backdrop_path;
        b = Object.prototype.toString.call(b) === '[object Array]' ? b[0] : b;
        if (b) { bg.style.backgroundImage = bgUrl(b); }
        var last = S.last[it.id];
        D.season = last ? last.season : (r.seasons.length ? r.seasons[0].n : null);
        buildSeriesButtons();
        renderSeasons();
        renderEps();
      }, function (e) {
        if (S.detail !== D) { return; }
        D.epsEl.innerHTML = '';
        D.epsEl.appendChild(h('div', { cls: 'empty', text: 'Erro ao carregar episódios: ' + (e && e.message) }));
      });
    }
  }


  /* ---------- elenco e filmografia (TMDB) ---------- */

  var IMG = 'https://image.tmdb.org/t/p/';
  S.dstack = [];   // pilha de telas (detalhe <-> ator): o Voltar desfaz uma de cada vez

  function castRow(D) {
    var key = tmdbKey(), it = D.item;
    if (!key) { return; }
    var kind = it.type === 'series' ? 'tv' : 'movie', year = Tmdb.yearOf(it.name) || (parseInt(it.year, 10) || 0);
    tmdbCached('tmdbid:' + kind + ':' + Tmdb.norm(it.name), 24 * 30, function () {
      return Tmdb.findId(kind, it.name, year, key).then(function (id) { if (!id) { throw new Error('sem id'); } return id; });
    }).then(function (id) {
      if (!id) { throw new Error('sem id'); }
      return tmdbCached('tmdbcast:' + kind + ':' + id, 24 * 30, function () { return Tmdb.credits(kind, id, key); });
    }).then(function (cast) {
      if (S.detail !== D || !cast || !cast.length) { return; }
      var row = h('div', { cls: 'hlist scroll' });
      cast.forEach(function (c) {
        var ph = h('div', { cls: 'cphoto' }, [h('div', { cls: 'ph', text: (c.n || '?').charAt(0) })]);
        if (c.p) { imgEl(IMG + 'w185' + c.p, ph); }
        row.appendChild(h('div', { cls: 'f cast', on: { click: function () {
          S.dstack.push(function () { showDetail(D.item, D.vars); });
          renderActor(c);
        } } }, [ph, h('div', { cls: 'cn', text: c.n }), h('div', { cls: 'cc', text: c.c })]));
      });
      D.castEl.appendChild(h('div', { cls: 'dclbl', text: 'Elenco' }));
      D.castEl.appendChild(row);
    }).then(null, function () {});
  }

  /* página do ator: o que dele existe no catálogo do provedor */
  function renderActor(c) {
    var d = $('detail'), key = tmdbKey();
    d.innerHTML = '';
    d.classList.remove('hidden');
    S.mode = 'detail';
    var A = S.detail = { actor: c, item: null, flat: [], seasons: [], vars: null };
    var photo = h('div', { cls: 'dposter aphoto' });
    if (c.p) { photo.style.backgroundImage = bgUrl(IMG + 'w342' + c.p); }
    var grid = h('div', { cls: 'grid agrid' }, [h('div', { cls: 'empty', text: 'Procurando no seu catálogo…' })]);
    d.appendChild(h('div', { cls: 'bgfade' }));
    d.appendChild(h('div', { cls: 'dwrap scroll' }, [
      h('div', { cls: 'dmain' }, [photo, h('div', { cls: 'dinfo' }, [
        h('div', { cls: 'dtitle', text: c.n }),
        h('div', { cls: 'dmeta', text: 'Filmes e séries dele(a) no seu catálogo' }),
        h('div', { cls: 'dbtns' }, [backBtn()])
      ])]),
      grid
    ]));
    Nav.setScope(d);
    Nav.focusFirst();
    tmdbCached('tmdbper:' + c.id, 24 * 7, function () { return Tmdb.person(c.id, key); }).then(function (res) {
      return Promise.all([S.provider.all('movie'), S.provider.all('series')]).then(function (ls) {
        var mv = Tmdb.match(ls[0], res.filter(function (x) { return x.k === 'movie'; }));
        var sr = Tmdb.match(ls[1], res.filter(function (x) { return x.k === 'tv'; }));
        return mv.concat(sr);
      });
    }).then(function (out) {
      if (S.detail !== A) { return; }
      grid.innerHTML = '';
      if (!out.length) { grid.appendChild(h('div', { cls: 'empty', text: 'Nenhum outro título dele(a) no seu catálogo.' })); return; }
      out.forEach(function (it) {
        var el = h('div', { cls: 'f card', on: { click: function () {
          S.dstack.push(function () { renderActor(c); });
          showDetail(it);
        } } }, [posterEl(it, false), h('div', { cls: 'title', text: it.name })]);
        markFav(el, it);
        grid.appendChild(el);
      });
    }).then(null, function () {
      if (S.detail !== A) { return; }
      grid.innerHTML = '';
      grid.appendChild(h('div', { cls: 'empty', text: 'Não consegui buscar a filmografia.' }));
    });
  }

  /* várias versões do mesmo título (dublado, legendado, 4K…): escolher aqui */
  function renderVariants(D) {
    if (!D.vars || D.vars.length < 2) { return; }
    var el = D.varsEl, seenLbl = {};
    el.innerHTML = '';
    el.appendChild(h('span', { cls: 'dvlbl', text: 'Versão:' }));
    D.vars.forEach(function (v) {
      var info = Tmdb.variantInfo(v.name), lbl = info.label;
      if (seenLbl[lbl]) { seenLbl[lbl]++; lbl += ' ' + seenLbl[lbl]; } else { seenLbl[lbl] = 1; }
      el.appendChild(h('button', { cls: 'f chip' + (v === D.item ? ' on' : ''), type: 'button', text: lbl, on: { click: function () {
        if (v !== D.item) { showDetail(v, D.vars); }
      } } }));
    });
  }

  function favBtn(it) {
    var b = h('button', { cls: 'f btn' });
    function paint() {
      var on = !!S.favs[fk(it)];
      b.innerHTML = '';
      b.appendChild(icon(on ? 'starfill' : 'star', 26));
      b.appendChild(document.createTextNode(on ? 'Remover favorito' : 'Favoritar'));
    }
    paint();
    b.addEventListener('click', function () { toggleFav(it); paint(); });
    return b;
  }

  function backBtn() { return h('button', { cls: 'f btn', text: 'Voltar', on: { click: closeDetail } }); }

  function playBtn(text, fn) { return h('button', { cls: 'f btn primary', on: { click: fn } }, [icon('play', 26), text]); }

  function buildMovieButtons() {
    var D = S.detail, it = D.item, r = S.resume['m:' + it.id];
    D.btns.innerHTML = '';
    if (r && r.t > 30 && r.t < r.d - 45) {
      D.btns.appendChild(playBtn('Continuar (' + Core.fmtTime(r.t) + ')', function () { startPlay({ kind: 'movie', item: it }); }));
      D.btns.appendChild(h('button', { cls: 'f btn', text: 'Do início', on: { click: function () { startPlay({ kind: 'movie', item: it }, true); } } }));
    } else {
      D.btns.appendChild(playBtn('Assistir', function () { startPlay({ kind: 'movie', item: it }); }));
    }
    D.btns.appendChild(favBtn(it));
    if (hasDl()) { D.btns.appendChild(dlBtn(it)); }
    D.btns.appendChild(backBtn());
    Nav.focusFirst();
  }

  function buildSeriesButtons() {
    var D = S.detail, it = D.item;
    D.btns.innerHTML = '';
    var last = S.last[it.id], ep = null, i;
    if (last) { for (i = 0; i < D.flat.length; i++) { if (D.flat[i].id === last.id) { ep = D.flat[i]; } } }
    var first = ep || D.flat[0];
    if (first) {
      D.btns.appendChild(playBtn((ep ? 'Continuar T' + ep.season + ' E' + ep.num : 'Assistir T' + first.season + ' E' + first.num),
        function () { playEpisode(first); }));
    }
    D.btns.appendChild(favBtn(it));
    if (hasDl()) { D.btns.appendChild(h('button', { cls: 'f btn', on: { click: dlSeason } }, [icon('dl', 26), 'Baixar temporada'])); }
    D.btns.appendChild(backBtn());
    Nav.focusFirst();
  }

  function renderSeasons() {
    var D = S.detail;
    D.seasonsEl.innerHTML = '';
    D.seasons.forEach(function (s) {
      D.seasonsEl.appendChild(h('button', {
        cls: 'f chip' + (s.n === D.season ? ' on' : ''), text: 'Temporada ' + s.n,
        on: { click: function () { D.season = s.n; renderSeasons(); renderEps(); Nav.focus(D.seasonsEl.querySelector('.chip.on')); } }
      }));
    });
  }

  function renderEps() {
    var D = S.detail, i, s = null;
    D.epsEl.innerHTML = '';
    for (i = 0; i < D.seasons.length; i++) { if (D.seasons[i].n === D.season) { s = D.seasons[i]; } }
    if (!s) { D.epsEl.appendChild(h('div', { cls: 'empty', text: 'Sem episódios.' })); return; }
    var dm = hasDl() ? dlAll() : {}, dst = hasDl() ? dlRefresh() : {};
    s.episodes.forEach(function (ep) {
      var r = S.resume['e:' + ep.id], rk = 'e:' + ep.id, mark = null;
      if (hasDl()) {
        if (dm[rk]) { mark = h('div', { cls: 'edl', text: dst[rk] && dst[rk].s === 'done' ? 'baixado' : 'baixando…' }); }
        else {
          mark = h('button', { cls: 'f epdl', type: 'button', title: 'Baixar', 'aria-label': 'Baixar', on: { click: function (e) {
            e.stopPropagation();
            if (dlStart(D.item, ep)) { renderEps(); }
          } } }, [icon('dl', 22)]);
        }
      }
      D.epsEl.appendChild(h('div', { cls: 'f ep', on: { click: function () { playEpisode(ep); } } }, [
        h('div', { cls: 'en', text: 'E' + ep.num }),
        h('div', { cls: 'et', text: ep.title }),
        h('div', { cls: 'ed', text: r && r.t > 30 ? 'em andamento · ' + Core.fmtTime(r.t) : (ep.duration || '') }),
        mark
      ]));
    });
  }

  function playEpisode(ep) {
    var D = S.detail;
    startPlay({ kind: 'ep', item: D.item, eps: D.flat, idx: D.flat.indexOf(ep) });
  }

  function closeDetailQuiet() {
    S.dstack = [];
    var d = $('detail');
    d.classList.add('hidden');
    d.innerHTML = '';
    S.detail = null;
  }

  function closeDetail() {
    if (S.dstack.length) { S.dstack.pop()(); return; }
    closeDetailQuiet();
    S.mode = 'browse';
    Nav.setScope($('app'));
    if (S.section === 'home') { refreshHome(); return; }
    if (S.lastFocus && document.body.contains(S.lastFocus)) {
      Nav.focus(S.lastFocus);
      if (S.lastFocus._item) { S.lastFocus.classList.toggle('isfav', !!S.favs[fk(S.lastFocus._item)]); }
    } else { Nav.focusFirst(); }
  }

  /* ---------- player ---------- */

  /* app Android no celular: o player abre em tela cheia (deitado) e, ao sair, volta à orientação do aparelho */
  function nativeFull(on) {
    try { if (window.NativeApp && window.NativeApp.setFullscreen) { window.NativeApp.setFullscreen(!!on); } } catch (e) {}
    // o brilho ajustado por gesto vale só dentro do player
    if (!on) { try { if (window.NativeApp && window.NativeApp.setBrightness) { window.NativeApp.setBrightness(-1); } } catch (e2) {} }
  }

  function syncNative() {
    try { if (window.NativeApp && window.NativeApp.setPlaying) { window.NativeApp.setPlaying(!!S.ctx && !Player.isPaused()); } } catch (e) {}
  }

  function startPlay(ctx, fromStart) {
    setMini(false);
    S.ctx = ctx;
    if (S.mode !== 'player') {
      S.resumeFocus = Nav.current();
      S.resumeScope = Nav.getScope();
    }
    S.mode = 'player';
    nativeFull(true);
    S.lastSave = Date.now();
    $('player').classList.remove('hidden');
    playCurrent(!!fromStart);
    syncNative();
  }

  /* histórico do perfil (filmes e séries já iniciados): base das recomendações */
  function pushHist(it) {
    var id = it.type + ':' + it.id, out = [slimItem(it)];
    out[0].at = Date.now();
    store.get('hist', []).forEach(function (x) { if (x.type + ':' + x.id !== id && out.length < 40) { out.push(x); } });
    store.set('hist', out);
  }

  function pushRecent(ch) {
    var id = fk(ch), out = [slimItem(ch)];
    S.recent.forEach(function (x) { if (fk(x) !== id && out.length < 12) { out.push(x); } });
    S.recent = out;
    store.set('recent', S.recent);
  }

  function playCurrent(fromStart) {
    var c = S.ctx, o = {}, url, title, sub = '', logo = '', vod = c.kind !== 'live';
    if (c.kind === 'live') {
      var ch = c.list[c.idx];
      url = ch.url; o.live = true; o.alt = ch.alt;
      title = (ch.num ? ch.num + '  ' : '') + ch.name;
      logo = ch.logo;
      pushRecent(ch);
      store.set('lastlive', { item: slimItem(ch), at: Date.now() });
    } else {
      var it = c.item, ep = c.kind === 'ep' ? c.eps[c.idx] : null;
      if (ep) {
        url = ep.url; c.rk = 'e:' + ep.id;
        title = it.name; sub = 'T' + ep.season + ' · E' + ep.num + ' — ' + ep.title;
        S.last[it.id] = { season: ep.season, id: ep.id, at: Date.now() };
        store.set('last', S.last);
      } else {
        url = it.url; c.rk = 'm:' + it.id; title = it.name;
      }
      pushHist(it);
      logo = it.logo;
      var lu = dlLocalUrl(c.rk);   // já baixado: toca do celular (funciona sem internet)
      if (lu) { url = lu; }
      var r = S.resume[c.rk];
      if (!fromStart && r && r.t > 30 && r.t < r.d - 45) { o.startAt = r.t; }
    }
    c.autoDone = !!o.startAt;
    $('buffer').classList.remove('hidden');
    S.prefApplied = {};
    closeTracks();
    Player.play(url, o);
    setOsd(title, sub, '', logo, vod);
    if (c.kind === 'ep') { $('osd-hint').textContent += ' · CH+/CH−: próximo/anterior episódio'; }
    updateEpMenu();
    showOsd();
    if (c.kind === 'live') { loadEpg(c.list[c.idx]); }
  }

  function setOsd(title, sub, sub2, logo, vod) {
    $('osd-title').textContent = title;
    $('osd-res').classList.add('hidden');
    $('osd-sub').textContent = sub;
    $('osd-sub2').textContent = sub2;
    var l = $('osd-logo');
    l.innerHTML = '';
    if (logo) { imgEl(logo, l); }
    $('osd-bar').classList.toggle('hidden', !vod);
    $('osd').classList.toggle('vod', !!vod);
    $('osd-hint').textContent = vod ? 'OK: pausar · ←/→: ±10 s · Cima/Baixo: menu (áudio e legenda) · Voltar: mini player · Parar: sair'
      : 'Cima/Baixo: canal · 0-9: número · Verde: áudio e legenda · Vermelho: favorito';
    $('osd-fill').style.width = '0';
    $('osd-cur').textContent = '0:00';
    $('osd-dur').textContent = '0:00';
  }

  function loadEpg(ch) {
    S.provider.epg(ch).then(function (list) {
      if (!S.ctx || S.ctx.kind !== 'live' || S.ctx.list[S.ctx.idx] !== ch || !list.length) { return; }
      var now = Date.now(), cur = null, nxt = null, i;
      for (i = 0; i < list.length; i++) {
        if (list[i].start <= now && list[i].stop > now) { cur = list[i]; nxt = list[i + 1] || null; }
      }
      if (!cur) { cur = list[0]; nxt = list[1] || null; }
      $('osd-sub').textContent = cur.title + '  (' + hhmm(new Date(cur.start)) + ' – ' + hhmm(new Date(cur.stop)) + ')';
      $('osd-sub2').textContent = nxt ? 'A seguir: ' + nxt.title : '';
    }, function () {});
  }

  /* ---------- áudio e legenda ---------- */

  function savePref(kind, key) { S.pref[kind] = key; store.set('trackpref', S.pref); }

  // faixas costumam aparecer depois do início: aplica o idioma preferido uma vez por reprodução
  function applyPrefs() {
    var ap = S.prefApplied, pf = S.pref, list, i;
    if (!ap.aud) {
      list = Player.audioTracks();
      if (list.length) {
        ap.aud = true;
        for (i = 0; pf.aud && list.length > 1 && i < list.length; i++) {
          if (list[i].key === pf.aud) { if (!list[i].active) { Player.setAudio(list[i].id); } break; }
        }
      }
    }
    if (!ap.sub) {
      list = Player.subtitleTracks();
      if (list.length) {
        ap.sub = true;
        for (i = 0; pf.sub && pf.sub !== 'off' && i < list.length; i++) {
          if (list[i].key === pf.sub) { if (!list[i].active) { Player.setSubtitle(list[i].id); } break; }
        }
      }
    }
  }

  function trackGroup(title, list, empty, onPick, withOff) {
    var g = h('div', { cls: 't-group' }, [h('div', { cls: 't-gtitle', text: title })]);
    if (!list.length) { g.appendChild(h('div', { cls: 't-empty', text: empty })); return g; }
    function opt(label, active, fn, idx) {
      return h('button', { cls: 'f topt' + (active ? ' on' : ''), 'data-t': title + idx, on: { click: fn } },
        [h('span', { cls: 't-lbl', text: label }), active ? icon('check', 30) : h('span', { cls: 't-nochk' })]);
    }
    var anyOn = list.some(function (t) { return t.active; });
    if (withOff) { g.appendChild(opt('Desativada', !anyOn, function () { onPick(null, 'Desativada'); }, 'x')); }
    list.forEach(function (t, i) { g.appendChild(opt(t.label, t.active, function () { onPick(t, t.label); }, i)); });
    return g;
  }

  function renderTracks(focusKey) {
    var host = $('tracks'), a = Player.audioTracks(), sb = Player.subtitleTracks();
    host.innerHTML = '';
    host.appendChild(h('div', { cls: 't-title' }, [icon('cc', 40), 'Áudio e legenda']));
    host.appendChild(trackGroup('Áudio', a, 'Este conteúdo só tem uma faixa de áudio.', function (t) {
      Player.setAudio(t.id); savePref('aud', t.key); renderTracks('Áudio' + a.indexOf(t));
    }, false));
    host.appendChild(trackGroup('Legenda', sb, 'Este conteúdo não traz legendas embutidas.', function (t) {
      if (t) { Player.setSubtitle(t.id); savePref('sub', t.key); renderTracks('Legenda' + sb.indexOf(t)); }
      else { Player.setSubtitle(-1); savePref('sub', 'off'); renderTracks('Legendax'); }
    }, true));
    host.appendChild(h('div', { cls: 't-foot', text: 'Motor: ' + Player.engine() + ' · ' + a.length + ' áudio · ' + sb.length + ' legenda · Voltar: fechar' }));
    var el = focusKey ? host.querySelector('[data-t="' + focusKey + '"]') : null;
    Nav.focus(el || host.querySelector('.topt.on') || host.querySelector('.topt') || null);
  }

  function openTracks() {
    if (S.tracksOpen) { return; }
    S.tracksOpen = true;
    S.tracksScope = Nav.getScope();
    $('tracks').classList.remove('hidden');
    clearTimeout(S.osdTimer);
    $('osd').classList.add('hidden');
    Nav.setScope($('tracks'));
    renderTracks(null);
  }

  function closeTracks() {
    if (!S.tracksOpen) { return; }
    S.tracksOpen = false;
    $('tracks').classList.add('hidden');
    Nav.setScope(S.tracksScope);
    S.tracksScope = null;
  }

  function tracksKey(k) {
    if (k === KEY.BACK || k === KEY.ESC || k === KEY.BS || k === KEY.GREEN) { closeTracks(); return; }
    switch (k) {
      case KEY.UP: Nav.move('up'); break;
      case KEY.DOWN: Nav.move('down'); break;
      case KEY.ENTER: Nav.activate(); break;
      default: break;
    }
  }

  function resLabel(w, hh) {
    return w + '×' + hh + ' · ' + (hh >= 2000 || w >= 3600 ? '4K' : (hh >= 1000 || w >= 1900 ? 'FHD' : (hh >= 700 || w >= 1260 ? 'HD' : 'SD')));
  }

  /* abre o último conteúdo (canal ao vivo ou filme/episódio) quando o app inicia */
  function autoOpenLast() {
    var ll = store.get('lastlive', null), c = contList()[0];
    if (ll && ll.item && (!c || ll.at > c.at)) {
      var ch = ll.item;
      S.provider.items('live', ch.cat).then(function (list) { return list; }, function () { return [ch]; }).then(function (list) {
        var l = filterLive(list), idx = -1;
        l.forEach(function (x, i) { if (x.id === ch.id) { idx = i; } });
        if (idx < 0) { l = [ch]; idx = 0; }
        if (S.mode === 'browse') { startPlay({ kind: 'live', list: l, idx: idx }); }
      });
    } else if (c) {
      resumeCont(c);
    }
  }

  var oPlay = null;

  function buildTouchCtl() {
    var osd = $('osd');
    function btn(act, ico, cls, label) {
      var kids = [icon(ico, 46)];
      if (label) { kids.push(h('small', { text: label })); }
      return h('button', { cls: 'oc ' + (cls || ''), 'data-act': act }, kids);
    }
    oPlay = btn('toggle', 'pause', 'big vod-only');
    osd.appendChild(btn('back', 'back', 'back'));
    osd.appendChild(h('div', { id: 'osd-ctl' }, [
      btn('prev', 'chdn', 'live-only'), btn('next', 'chup', 'live-only'),
      btn('prevep', 'skipprev', 'ep-only'), oPlay, btn('nextep', 'skipnext', 'ep-only')
    ]));
    osd.addEventListener('click', function (e) {
      e.stopPropagation();   // o mesmo toque não pode chegar ao #player e ampliar o mini player recém-criado
      var b = e.target, c = S.ctx;
      while (b && b !== osd && !b.getAttribute('data-act')) { b = b.parentNode; }
      if (!c) { return; }
      if (b && b !== osd) {
        var act = b.getAttribute('data-act');
        if (act === 'back') { minimizePlayer(); return; }
        if (act === 'tracks') { openTracks(); return; }
        if (act === 'prevep') { stepEpisode(-1); return; }
        if (act === 'nextep') { stepEpisode(1); return; }
        if (act === 'next') { zap(1); return; }
        if (act === 'prev') { zap(-1); return; }
        if (act === 'toggle') { Player.toggle(); }
        if (act === 'rew') { Player.seek(-10); }
        if (act === 'ff') { Player.seek(10); }
        showOsd();
        updateBar(Player.time(), Player.duration());
        return;
      }
      // toque na barra de progresso: pula para o ponto tocado
      var tr = e.target;
      if (c.kind !== 'live' && tr && tr.parentNode && (tr.className === 'track' || tr.id === 'osd-fill')) {
        var track = tr.className === 'track' ? tr : tr.parentNode, r = track.getBoundingClientRect();
        if (r.width > 0) { Player.seekTo(((e.clientX - r.left) / r.width) * Player.duration()); showOsd(); updateBar(Player.time(), Player.duration()); }
      }
    });
  }

  /* menu de baixo do player: [Episódio anterior] [Áudio e legenda] [Próximo episódio]; setas ←/→ escolhem, OK ativa */
  function osdDefault() { return S.ctx && S.ctx.kind === 'live' ? $('osd-guide') : $('osd-tracks'); }

  function osdBtns() {
    return [$('osd-prevep'), $('osd-tracks'), $('osd-guide'), $('osd-nextep')].filter(function (b) { return !b.classList.contains('hidden'); });
  }

  function setOsdMenu(on) {
    S.osdMenu = !!on;
    if (!S.osdSel || S.osdSel.classList.contains('hidden')) { S.osdSel = osdDefault(); }
    [$('osd-prevep'), $('osd-tracks'), $('osd-guide'), $('osd-nextep')].forEach(function (b) { b.classList.toggle('focus', !!on && b === S.osdSel); });
  }

  function moveOsdSel(d) {
    var bs = osdBtns(), i = bs.indexOf(S.osdSel);
    if (i < 0) { i = bs.indexOf(osdDefault()); }
    S.osdSel = bs[Math.max(0, Math.min(bs.length - 1, i + d))];
    showOsd(true);
  }

  function activateOsdSel() {
    var b = S.osdSel;
    if (b === $('osd-prevep')) { stepEpisode(-1); }
    else if (b === $('osd-nextep')) { stepEpisode(1); }
    else if (b === $('osd-guide')) { openPGuide(); }
    else { openTracks(); }
  }

  /* série: pula para o próximo/anterior episódio (o ponto do atual fica salvo) */
  function stepEpisode(d) {
    var c = S.ctx;
    if (!c || c.kind !== 'ep') { return; }
    var n = c.idx + d;
    if (n < 0 || n >= c.eps.length) { toast(d > 0 ? 'Este é o último episódio' : 'Este é o primeiro episódio', 1800); return; }
    saveResume();
    c.idx = n;
    S.osdSel = osdDefault();
    playCurrent(false);
  }

  function updateEpMenu() {
    var c = S.ctx, ep = c && c.kind === 'ep', pv = ep && c.idx > 0 ? c.eps[c.idx - 1] : null, nx = ep && c.idx + 1 < c.eps.length ? c.eps[c.idx + 1] : null;
    $('osd').classList.toggle('hasep', !!ep);
    $('osd-guide').classList.toggle('hidden', !(c && c.kind === 'live'));
    $('osd-tracks').classList.toggle('hidden', !!(c && c.kind === 'live'));
    $('osd-prevep').classList.toggle('hidden', !pv);
    $('osd-nextep').classList.toggle('hidden', !nx);
    if (pv) { $('osd-prevep').lastChild.textContent = 'Anterior · T' + pv.season + ' E' + pv.num; }
    if (nx) { $('osd-nextep').lastChild.textContent = 'Próximo · T' + nx.season + ' E' + nx.num; }
    setOsdMenu(S.osdMenu);
  }

  function showOsd(menu) {
    if (S.mini) { return; }
    setOsdMenu(menu === true);
    $('osd').classList.remove('hidden');
    $('osd-clock').textContent = hhmm(new Date());
    clearTimeout(S.osdTimer);
    S.osdTimer = setTimeout(function () { $('osd').classList.add('hidden'); setOsdMenu(false); }, 4500);
  }

  function updateBar(t, d) {
    if (!isFinite(d) || d <= 0) { return; }
    $('osd-cur').textContent = Core.fmtTime(t);
    $('osd-dur').textContent = Core.fmtTime(d);
    $('osd-fill').style.width = Math.min(100, (t / d) * 100) + '%';
  }

  function pruneMap(map, max, drop) {
    var keys = Object.keys(map);
    if (keys.length <= max) { return; }
    keys.sort(function (a, b) { return (map[a].at || 0) - (map[b].at || 0); });
    keys.slice(0, drop).forEach(function (k) { delete map[k]; });
  }

  function saveResume() {
    var c = S.ctx;
    if (!c || c.kind === 'live' || !c.rk) { return; }
    var t = Player.time(), d = Player.duration();
    if (!isFinite(d) || d < 120) { return; }
    if (t > d * 0.95) { delete S.resume[c.rk]; delete S.cont[c.rk]; markDone(c.rk); }
    else if (t > 5) {
      var ep = c.kind === 'ep' ? c.eps[c.idx] : null, now = Date.now();
      S.resume[c.rk] = { t: t, d: d, at: now };
      S.cont[c.rk] = { rk: c.rk, kind: c.kind === 'ep' ? 'ep' : 'movie', item: slimItem(c.item), ep: ep ? slimEp(ep) : null, t: t, d: d, at: now };
      // um card por série: mantém só o episódio mais recente de cada série
      if (ep) {
        Object.keys(S.cont).forEach(function (k) {
          var o = S.cont[k];
          if (k !== c.rk && o.kind === 'ep' && o.item.id === c.item.id && o.item.type === c.item.type) { delete S.cont[k]; }
        });
      }
      pruneMap(S.resume, 300, 50);
      pruneMap(S.cont, 30, 10);
    }
    store.set('resume', S.resume);
    store.set('cont', S.cont);
    // durante a reprodução, envia o ponto de tempos em tempos (e ao sair do player)
    if (cloudOn() && !cloudPushTimer) { cloudPushTimer = setTimeout(function () { cloudPushTimer = null; cloudSoon(0); }, 45000); }
  }

  /* mini player: o vídeo continua tocando num canto enquanto você navega; toque/Amarelo amplia, X/Azul fecha */
  function setMini(on) {
    S.mini = !!on;
    $('player').classList.toggle('mini', S.mini);
    document.body.classList.toggle('mini-on', S.mini);
    if (S.mini) { $('mini-title').textContent = $('osd-title').textContent; }
  }

  function minimizePlayer() {
    if (!S.ctx) { return; }
    S.miniAt = Date.now();
    leavePlayer(true);
    toast('Mini player — ' + (document.body.classList.contains('touch') ? 'toque nele para ampliar' : 'Amarelo: ampliar · Azul: fechar'), 2500);
  }

  function expandPlayer() {
    if (!S.mini || !S.ctx) { return; }
    var cur = Nav.current();
    setMini(false);
    // se o foco estava num botão do próprio mini player, mantém o ponto anterior para devolver o foco ao minimizar
    if (!cur || !$('player').contains(cur)) { S.resumeFocus = cur; }
    S.resumeScope = Nav.getScope();
    S.mode = 'player';
    nativeFull(true);
    showOsd();
  }

  function closePlayer() { leavePlayer(false); }

  function leavePlayer(keep) {
    saveResume();
    cloudSoon(600);
    closeTracks();
    closePGuide();
    clearTimeout(S.osdTimer);
    $('osd').classList.add('hidden');
    if (keep) {
      setMini(true);
    } else {
      Player.stop();
      $('player').classList.add('hidden');
      $('buffer').classList.add('hidden');
      setMini(false);
      S.ctx = null;
    }
    syncNative();
    nativeFull(false);
    S.mode = S.detail ? 'detail' : 'browse';
    Nav.setScope(S.detail ? $('detail') : $('app'));
    // o detalhe reflete o ponto salvo agora ("Assistir" -> "Continuar")
    if (S.detail && S.detail.item && S.detail.item.type === 'series') { renderEps(); buildSeriesButtons(); }
    else if (S.detail && S.detail.item && S.detail.item.type === 'movie') { buildMovieButtons(); }
    if (!S.detail && S.section === 'home') { refreshHome(); return; }
    if (S.resumeFocus && document.body.contains(S.resumeFocus) && !$('player').contains(S.resumeFocus)) { Nav.focus(S.resumeFocus); }
    else if (!Nav.current()) { Nav.focusFirst(); }
  }

  function zap(delta) {
    var c = S.ctx, n = c.list.length;
    if (n < 2) { return; }
    c.idx = (c.idx + delta + n) % n;
    playCurrent();
  }

  function digit(n) {
    S.digits += String(n);
    var el = $('chnum');
    el.textContent = S.digits;
    el.classList.remove('hidden');
    clearTimeout(S.digitTimer);
    S.digitTimer = setTimeout(function () {
      var num = parseInt(S.digits, 10), c = S.ctx, i, found = -1;
      S.digits = '';
      el.classList.add('hidden');
      if (!c || c.kind !== 'live') { return; }
      for (i = 0; i < c.list.length; i++) { if (Number(c.list[i].num) === num) { found = i; break; } }
      if (found < 0 && num >= 1 && num <= c.list.length) { found = num - 1; }
      if (found >= 0) { c.idx = found; playCurrent(); } else { toast('Canal ' + num + ' não encontrado', 1800); }
    }, 1500);
  }

  function seek(dir) {
    var now = Date.now();
    S.seekCount = (now - S.seekAt < 700) ? S.seekCount + 1 : 0;
    S.seekAt = now;
    var steps = [10, 10, 20, 30, 60, 60, 120];
    Player.seek(dir * steps[Math.min(S.seekCount, steps.length - 1)]);
    showOsd();
    updateBar(Player.time(), Player.duration());
  }

  function playerKey(k) {
    var c = S.ctx, live = c.kind === 'live';
    if (k === KEY.STOP) { closePlayer(); return; }
    if (k === KEY.BACK || k === KEY.ESC || k === KEY.BS) { minimizePlayer(); return; }
    if (live && k >= 48 && k <= 57) { digit(k - 48); return; }
    if (live && k >= 96 && k <= 105) { digit(k - 96); return; }
    switch (k) {
      case KEY.GREEN: if (!live) { openTracks(); } break;
      case KEY.UP: case KEY.CHUP:
        if (live) { if (k === KEY.UP) { openPGuide(); } else { zap(1); } }   // ▲ abre o guia sem parar o som; CH+/CH− trocam de canal
        else if (k === KEY.CHUP && c.kind === 'ep') { stepEpisode(1); }
        else { if (!S.osdMenu) { S.osdSel = osdDefault(); } showOsd(true); }   // cima e baixo abrem o menu de baixo
        break;
      case KEY.DOWN: case KEY.CHDN:
        if (live) { if (k === KEY.DOWN) { if (!S.osdMenu) { S.osdSel = osdDefault(); } showOsd(true); } else { zap(-1); } }
        else if (k === KEY.CHDN && c.kind === 'ep') { stepEpisode(-1); }
        else { if (!S.osdMenu) { S.osdSel = osdDefault(); } showOsd(true); }
        break;
      case KEY.LEFT:
        if (S.osdMenu && !$('osd').classList.contains('hidden')) { moveOsdSel(-1); } else if (live) { showOsd(); } else { seek(-1); }
        break;
      case KEY.RIGHT:
        if (S.osdMenu && !$('osd').classList.contains('hidden')) { moveOsdSel(1); } else if (live) { showOsd(); } else { seek(1); }
        break;
      case KEY.REW: if (!live) { Player.seek(-30); showOsd(); } break;
      case KEY.FF: if (!live) { Player.seek(30); showOsd(); } break;
      case KEY.PLAY: if (Player.isPaused()) { Player.toggle(); } showOsd(); break;
      case KEY.PAUSE: if (!Player.isPaused()) { Player.toggle(); } showOsd(); break;
      case KEY.ENTER:
        if (S.osdMenu && !$('osd').classList.contains('hidden')) { activateOsdSel(); }   // menu aberto: OK ativa a opção escolhida
        else if (live) { showOsd(true); }
        else { Player.toggle(); showOsd(); }
        break;
      case KEY.RED:
        if (live) { toggleFav(c.list[c.idx]); }
        break;
      default: break;
    }
  }

  /* ---------- teclado global ---------- */

  function exitApp() {
    try { if (window.NativeApp && window.NativeApp.exit) { window.NativeApp.exit(); return; } } catch (e) {}
    window.close();
  }

  function goBack() {
    if (S.mode === 'profiles') {
      if (S.profEdit) { S.profEdit = null; renderProfiles(); return; }
      if (S.profManage) { S.profManage = false; renderProfiles(); return; }
      if (S.profFrom) { closeProfiles(); return; }
      exitApp();
      return;
    }
    if (S.mode === 'detail') { closeDetail(); return; }
    if (S.mode === 'browse') {
      if (S.drawerOpen) { closeDrawer(); return; }
      if (S.section === 'sports' && S.sp && S.sp.game) { S.sp.game = null; renderSports(); return; }
      if (S.section !== 'home' && !S.offline) {
        var cur = Nav.current();
        if (S.catsEl && S.contentEl && cur && S.contentEl.contains(cur)) {
          var on = S.catsEl.querySelector('.cat.on');
          if (on) { Nav.focus(on); return; }
        }
        headBack();
        return;
      }
      if (S.exitArmed) { exitApp(); return; }
      S.exitArmed = true;
      toast('Pressione Voltar novamente para sair');
      setTimeout(function () { S.exitArmed = false; }, 2500);
      return;
    }
    exitApp();
  }

  function onKey(e) {
    var k = e.keyCode, a = document.activeElement;
    if (S.mode === 'player') { e.preventDefault(); if (S.pgOpen) { pgKey(k); } else if (S.tracksOpen) { tracksKey(k); } else { playerKey(k); } return; }
    var typing = a && a.tagName === 'INPUT';
    if (typing) {
      if (k === KEY.ENTER) {
        a.blur();
        e.preventDefault();
        if (a.id === 'q') { doSearch(); } else if (a._enter) { a._enter(); }
        return;
      }
      if (k === KEY.BACK || k === KEY.ESC) { a.blur(); e.preventDefault(); return; }
      if (k === KEY.UP || k === KEY.DOWN) { a.blur(); } else { return; }
    }
    if ((k === KEY.LEFT || k === KEY.RIGHT) && S.mode === 'browse' && S.heroKey && S.heroKey(k)) { e.preventDefault(); return; }
    switch (k) {
      case KEY.LEFT: e.preventDefault(); Nav.move('left'); break;
      case KEY.RIGHT: e.preventDefault(); Nav.move('right'); break;
      case KEY.UP: e.preventDefault(); Nav.move('up'); break;
      case KEY.DOWN: e.preventDefault(); Nav.move('down'); break;
      case KEY.ENTER: e.preventDefault(); Nav.activate(); break;
      case KEY.BACK: case KEY.ESC: case KEY.BS: e.preventDefault(); goBack(); break;
      case KEY.RED: if (S.mode === 'browse') { e.preventDefault(); favFocused(); } break;
      case KEY.YELLOW: if (S.mini) { e.preventDefault(); expandPlayer(); } break;
      case KEY.BLUE: if (S.mini) { e.preventDefault(); closePlayer(); } break;
      default: break;
    }
  }

  /* ---------- inicialização ---------- */

  function boot() {
    Weather.init(http);
    Tmdb.init(http);
    Tmdb.setTv4k(/Web0S|webOS|SMART-?TV/i.test(navigator.userAgent) || document.body.classList.contains('tv'));
    Tmdb.setPref(store.get('verpref', 'dub'));
    Player.init($('video'), {
      onBuffer: function (on) { $('buffer').classList.toggle('hidden', !on); },
      onTracks: function () { if (S.ctx) { applyPrefs(); } },
      onResize: function (w, hh) {
        var r = $('osd-res');
        r.textContent = resLabel(w, hh);
        r.classList.remove('hidden');
      },
      onState: function (playing) {
        syncNative();
        if (!oPlay) { return; }
        oPlay.innerHTML = '';
        oPlay.appendChild(icon(playing ? 'pause' : 'play', 46));
      },
      onTime: function (t, d) {
        if (!S.ctx || S.ctx.kind === 'live') { return; }
        if (!$('osd').classList.contains('hidden')) { updateBar(t, d); }
        var now = Date.now();
        if (now - S.lastSave > 10000) { S.lastSave = now; saveResume(); }
      },
      onEnded: function () {
        var c = S.ctx;
        if (!c) { return; }
        if (c.kind === 'ep' && c.idx + 1 < c.eps.length) {
          delete S.resume[c.rk]; delete S.cont[c.rk]; markDone(c.rk);
          store.set('resume', S.resume); store.set('cont', S.cont);
          c.idx++;
          toast('Próximo episódio…', 2000);
          playCurrent(true);
        } else if (c.kind !== 'live') {
          delete S.resume[c.rk]; delete S.cont[c.rk]; markDone(c.rk);
          store.set('resume', S.resume); store.set('cont', S.cont);
          closePlayer();
        }
      },
      onError: function () {
        toast('Não foi possível reproduzir este conteúdo.', 4000);
        if (S.ctx && S.ctx.kind !== 'live') { closePlayer(); }
      }
    });

    Nav.onFocus(function (el) {
      if (el._gp && G && (G.over || S.section === 'guide')) { gFocus(el._gp); }
      pvFocus(el);
      var i = el.getAttribute('data-i');
      if (i !== null && S.mode === 'browse' && S.shown < S.items.length && S.shown - parseInt(i, 10) < 14) { renderMore(); }
    });

    document.addEventListener('keydown', onKey, true);
    applyBg();
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { cloudSoon(800, true); } });
    var fake = function (code) { return { keyCode: code, preventDefault: function () {} }; };
    window.__nativeBack = function () { onKey(fake(KEY.BACK)); };
    window.__nativeKey = function (code) {
      if (code === 1000) { // play/pause alternado
        if (S.mode === 'player') { Player.toggle(); showOsd(); }
        return;
      }
      onKey(fake(code));
    };
    if (document.body.classList.contains('touch')) { buildTouchCtl(); setInterval(runMarquee, 1200); }
    document.addEventListener('mouseover', function (e) {
      if (S.mode === 'player') { return; }
      var el = up(e.target), sc = Nav.getScope();
      if (el && sc && sc.contains(el)) { Nav.focus(el); }
    });
    document.addEventListener('click', function () { if (S.mode === 'player' && !S.tracksOpen) { showOsd(); } });
    window.__pip = function (on) { document.body.classList.toggle('pip', !!on); };
    var miniX = h('button', { id: 'mini-x', cls: 'f', type: 'button', title: 'Fechar', 'aria-label': 'Fechar' }, [icon('xmark', 22)]);
    var miniO = h('button', { id: 'mini-open', cls: 'f', type: 'button', title: 'Ampliar', 'aria-label': 'Ampliar' }, [icon('expand', 22), h('span', { text: 'Ampliar' })]);
    var miniT = h('div', { id: 'mini-title' });
    $('player').appendChild(miniT);
    $('player').appendChild(miniO);
    $('player').appendChild(miniX);
    miniX.addEventListener('click', function (e) { e.stopPropagation(); closePlayer(); });
    miniO.addEventListener('click', function (e) { e.stopPropagation(); expandPlayer(); });
    $('player').addEventListener('click', function () { if (S.mini && Date.now() - (S.miniAt || 0) > 700) { expandPlayer(); } });
    $('osd-tracks').addEventListener('click', function (e) { e.stopPropagation(); openTracks(); });
    $('osd-tracks').insertBefore(icon('cc', 30), $('osd-tracks').firstChild);
    $('osd-guide').insertBefore(icon('guide', 30), $('osd-guide').firstChild);
    $('osd-guide').addEventListener('click', function (e) { e.stopPropagation(); openPGuide(); });
    $('pguide').addEventListener('touchstart', function (e) { e.stopPropagation(); });
    $('pguide').addEventListener('touchmove', function (e) { e.stopPropagation(); });
    $('pguide').addEventListener('touchend', function (e) { e.stopPropagation(); });
    $('pguide').addEventListener('click', function (e) { e.stopPropagation(); });
    $('osd-prevep').insertBefore(icon('skipprev', 28), $('osd-prevep').firstChild);
    $('osd-nextep').insertBefore(icon('skipnext', 28), $('osd-nextep').firstChild);
    $('osd-prevep').addEventListener('click', function (e) { e.stopPropagation(); stepEpisode(-1); });
    $('osd-nextep').addEventListener('click', function (e) { e.stopPropagation(); stepEpisode(1); });

    var cfg = store.get('cfg', null);
    if (cfg && cfg.server) { S.cfg = cfg; connect(cfg, { boot: true }); } else { showLogin(); }
  }

  setInterval(gwTick, 45000);
  setTimeout(gwTick, 15000);
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
