/* Interface do app IPTV para webOS: login, Início, listas, detalhes e player. ES5. */
(function () {
  'use strict';

  var KEY = { ENTER: 13, ESC: 27, BS: 8, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
    BACK: 461, PLAY: 415, PAUSE: 19, STOP: 413, REW: 412, FF: 417, CHUP: 33, CHDN: 34, RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406 };

  function $(id) { return document.getElementById(id); }

  /* perfis: cada perfil tem o seu histórico, favoritos, preferências etc. O perfil "p1" usa as chaves antigas (nada se perde). */
  var PROF_KEYS = { verpref: 1, fav: 1, resume: 1, last: 1, cont: 1, recent: 1, opts: 1, lastlive: 1, intro: 1, trackpref: 1, city: 1, hist: 1, cat: 1 };
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
    movie: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/>',
    series: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 4h10"/>',
    fav: STAR,
    star: STAR,
    starfill: STAR.replace('<path ', '<path fill="currentColor" '),
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
    cc: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 10.3a2.4 2.4 0 1 0 0 3.4M17 10.3a2.4 2.4 0 1 0 0 3.4"/>'
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

  function loading(on, text) {
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
  function setOpt(k, v) { S.opts[k] = !!v; store.set('opts', S.opts); }

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

  function updateClock() { if (S.clockEl) { S.clockEl.textContent = hhmm(new Date()); } }
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

  function viaProxy(url, retried) {
    return startProxy().then(function (p) {
      return xhr('http://127.0.0.1:' + p.port + '/?t=' + p.token + '&u=' + encodeURIComponent(url));
    }).then(null, function (e) {
      if (e && e.status === 403 && !retried) { proxy = null; return viaProxy(url, true); }
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

  /* ---------- perfis ---------- */

  var PCOLORS = ['#3ab4e0', '#e0603a', '#8a5be0', '#3ab87a', '#e0b43a', '#e03a8a'];
  function profiles() { var l = store.get('profiles', null); return l && l.length ? l : [{ id: 'p1', name: 'Perfil 1', color: 0 }]; }
  function curProfile() { var l = profiles(), i; for (i = 0; i < l.length; i++) { if (l[i].id === curProf) { return l[i]; } } return l[0]; }
  function profInitial(p) { return (p.name || '?').charAt(0).toUpperCase(); }

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
    return h('div', { cls: 'pav' + (big ? ' big' : ''), style: 'background:' + PCOLORS[p.color % PCOLORS.length] },
      [h('span', { text: profInitial(p) })].concat(manage ? [h('div', { cls: 'pedit' }, [icon('pencil', 34)])] : []));
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
    var e = S.profEdit, p = { id: e.p.id, name: e.p.name, color: e.p.color }, input = h('input', { cls: 'f input', type: 'text', placeholder: 'Nome do perfil' });
    input.value = p.name;
    input.maxLength = 16;
    var sw = h('div', { cls: 'pswatches' }), preview = profAvatar(p, true, false);
    function paint() {
      sw.innerHTML = '';
      PCOLORS.forEach(function (c, i) {
        sw.appendChild(h('button', { cls: 'f swatch' + (i === p.color ? ' on' : ''), type: 'button', style: 'background:' + c, on: { click: function () { p.color = i; paint(); } } }));
      });
      preview.style.background = PCOLORS[p.color];
    }
    paint();
    input.addEventListener('input', function () { preview.firstChild.textContent = (input.value || '?').charAt(0).toUpperCase(); });
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
    box.appendChild(h('div', { cls: 'pform' }, [preview, input, sw]));
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
      canCancel ? h('button', { cls: 'f btn', text: 'Cancelar', on: { click: function () { showBrowse(); selectSection('settings'); } } }) : null,
      err
    ]));
    Nav.setScope(app);
    var first = msg ? iServer : (!iServer.value ? iServer : (!iUser.value ? iUser : (!iPass.value ? iPass : btn)));
    Nav.focus(first);
  }

  function connect(cfg, o) {
    // guarda o que foi digitado: se falhar, o login volta preenchido para editar
    S.draft = cfg;
    store.set('draft', cfg);
    loading(true, 'Conectando…');
    var p;
    try { p = Promise.resolve(Core.createXtream(cfg, http)); } catch (e) { p = Promise.reject(e); }

    p.then(function (prov) {
      return prov.login().then(function (info) { return { prov: prov, info: info }; });
    }).then(function (r) {
      if (!r.info.ok) { throw new Error('Usuário ou senha inválidos (ou conta inativa).'); }
      S.provider = r.prov; S.info = r.info;
      S.cfg = cfg;
      store.set('cfg', cfg);
      loading(false);
      epgCache = {};
      showBrowse();
      if (o && o.boot && profiles().length > 1) { showProfiles(false); }
      else if (o && o.boot && opt('autoplay')) { autoOpenLast(); }
    }).then(null, function (e) {
      loading(false);
      S.provider = null;
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

  var SECT = { live: 'TV ao vivo', movie: 'Filmes', series: 'Séries', search: 'Buscar', fav: 'Favoritos', settings: 'Configurações' };

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
    Nav.setScope(app);
    S.hubFocus = null;
    selectSection('home');
  }

  function renderHead(sec) {
    var hd = S.headEl, info = S.info || {};
    hd.innerHTML = '';
    if (sec === 'home') {
      var prof = curProfile();
      var usub = info.exp ? 'até ' + info.exp.toLocaleDateString('pt-BR') : 'conta ativa';
      hd.className = 'sechead hub';
      hd.appendChild(h('div', { cls: 'brand' }, [h('div', { cls: 'logo-mark' }, [icon('play', 26)]), 'MASTER IPTV']));
      S.wxEl = h('div', { cls: 'wx' });
      hd.appendChild(S.wxEl);
      loadWeather();
      hd.appendChild(h('div', { cls: 'acct' }, [h('div', { cls: 'usub', text: usub }), S.clockEl]));
      hd.appendChild(h('button', { cls: 'f avatar', type: 'button', style: 'background:' + PCOLORS[prof.color % PCOLORS.length], text: profInitial(prof),
        on: { click: function () { showProfiles(true); } } }));
      updateClock();
      return;
    }
    hd.className = 'sechead';
    hd.appendChild(h('button', { cls: 'f btn backbtn', on: { click: headBack } },
      [icon('back', 26), S.backTo && S.backTo !== 'home' ? 'Voltar' : 'Menu']));
    hd.appendChild(h('div', { cls: 'sectitle' }, [icon(sec, 44), SECT[sec]]));
    if (sec === 'live' || sec === 'movie' || sec === 'series') {
      hd.appendChild(h('button', { cls: 'f btn', on: { click: function () { selectSection('search', { backTo: sec }); } } },
        [icon('search', 26), 'Buscar']));
    }
    hd.appendChild(S.clockEl);
    updateClock();
  }

  function headBack() { selectSection(S.backTo || 'home'); }

  function selectSection(sec, opts) {
    opts = opts || {};
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

    if (sec === 'home') { renderHome(); return; }
    Nav.focus(S.headEl.querySelector('.f'));
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
      }, [h('span', { cls: 'ct', text: c.name })]));
    });
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

  function paintEpg(row, cur) {
    var t = row.querySelector('.epg'), bar = row.querySelector('.epgbar');
    if (!t || !cur) { return; }
    t.textContent = hhmm(new Date(cur.start)) + '  ' + cur.title;
    var span = cur.stop - cur.start;
    if (span > 0) {
      bar.firstChild.style.width = Math.max(0, Math.min(100, (Date.now() - cur.start) / span * 100)) + '%';
      bar.classList.add('on');
    }
  }

  function runEpg(j) {
    epgBusy++;
    S.provider.epg(j.it).then(function (list) {
      var cur = currentProg(list).cur;
      epgCache[j.it.id] = { at: Date.now(), cur: cur };
      if (document.body.contains(j.row)) { paintEpg(j.row, cur); }
    }, function () {
      epgCache[j.it.id] = { at: Date.now(), cur: null };
    }).then(function () { epgBusy--; pumpEpg(); });
  }

  function pumpEpg() {
    while (epgBusy < 3 && epgQ.length) {
      var j = epgQ.shift();
      if (j.token === S.loadToken) { runEpg(j); }
    }
  }

  function queueEpg(row, it) {
    if (!it.epgId) { return; }
    var c = epgCache[it.id];
    if (c && Date.now() - c.at < 300000) { paintEpg(row, c.cur); return; }
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
        h('div', { cls: 'epgbar' }, [h('div', { cls: 'fill' })])
      ]),
      favMark(28)
    ]);
    markFav(el, it);
    queueEpg(el, it);
    return el;
  }

  function posterEl(it, withBadge) {
    var poster = h('div', { cls: 'poster' + (it.type === 'live' ? ' live' : '') });
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

  function renderFavs() {
    showItems(favList(), { cards: true, empty: 'Nenhum favorito ainda. Aperte o botão vermelho sobre um item.' });
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

  function posterCard(it, list) {
    var el = h('div', { cls: 'f card', on: { click: function () { openItemObj(it, list); } } }, [
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

  function hubTile(sec, sub) {
    return h('button', { cls: 'f hubtile t-' + sec, 'data-sec': sec, on: { click: function () { selectSection(sec); } } }, [
      h('div', { cls: 'hubico' }, [icon(sec, 76)]),
      h('div', { cls: 'hubname', text: SECT[sec] }),
      h('div', { cls: 'hubsub', text: sub })
    ]);
  }

  function hubLink(sec) {
    return h('button', { cls: 'f btn', 'data-sec': sec, on: { click: function () { selectSection(sec); } } }, [icon(sec, 26), SECT[sec]]);
  }

  function renderHome() {
    var page = S.pageEl;
    page.className = 'page scroll home';
    page.appendChild(h('div', { cls: 'hub-tiles' }, [
      hubTile('live', 'Canais e programação'), hubTile('movie', 'Catálogo de filmes'), hubTile('series', 'Séries e episódios')
    ]));
    page.appendChild(h('div', { cls: 'hub-links' }, [hubLink('search'), hubLink('fav'), hubLink('settings')]));
    var rows = h('div', { cls: 'hrows' });
    page.appendChild(rows);

    var conts = contList().slice(0, 12);
    if (conts.length) { rows.appendChild(makeRow('Continuar assistindo', conts.map(contCard))); }
    var hist = store.get('hist', []);
    if (tmdbKey()) {
      var bases = [], used = {};
      hist.forEach(function (x) { if (bases.length < 2 && !used[x.type + ':' + x.id]) { used[x.type + ':' + x.id] = 1; bases.push(x); } });
      bases.forEach(function (b) { recRow(rows, b); });
    }
    trendRow(rows, 'movie', 'Filmes em alta');
    trendRow(rows, 'series', 'Séries em alta');
    if (!tmdbKey()) { forYouRow(rows); }
    if (S.recent.length) {
      rows.appendChild(makeRow('Canais recentes', S.recent.slice(0, 12).map(function (it) { return chanTile(it, S.recent); })));
    }
    var favs = favList();
    if (favs.length) { rows.appendChild(makeRow('Favoritos', favs.slice(0, 20).map(function (it) { return posterCard(it, favs); }))); }

    var want = S.hubFocus, target = null;
    if (want === 'cont') { target = page.querySelector('.lcard'); }
    else if (want) { target = page.querySelector('[data-sec="' + want + '"]'); }
    Nav.focus(target || page.querySelector('.hubtile'));
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
      ['Versão do app', '1.8.1']
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
    page.appendChild(switchRow('Reproduzir o último conteúdo ao abrir o app', 'Ao iniciar, retoma o último canal, filme ou episódio assistido.', 'autoplay'));
    page.appendChild(switchRow('Pular introdução automaticamente', 'Em séries onde você já usou "Pular introdução", repete o salto no início de cada episódio.', 'autoIntro'));
    page.appendChild(switchRow('Ocultar canais SD', 'Esconde da lista os canais com "SD" no nome.', 'hideSD'));
    page.appendChild(switchRow('Ocultar canais HD', 'Esconde da lista os canais com "HD" no nome (FHD e 4K continuam).', 'hideHD'));

    page.appendChild(sgroup('Recomendações'));
    page.appendChild(tmdbBlock());
    page.appendChild(sgroup('Clima'));
    page.appendChild(cityBlock());

    page.appendChild(sgroup('Dados'));
    page.appendChild(h('div', { cls: 'sbtns' }, [
      h('button', { cls: 'f btn', text: 'Limpar histórico', on: { click: function () {
        S.cont = {}; S.resume = {}; S.recent = []; S.last = {};
        store.set('cont', S.cont); store.set('resume', S.resume); store.set('recent', S.recent); store.set('last', S.last);
        store.del('lastlive');
        toast('Histórico limpo');
      } } }),
      h('button', { cls: 'f btn', text: 'Limpar favoritos', on: { click: function () {
        S.favs = {}; store.set('fav', S.favs); toast('Favoritos limpos');
      } } })
    ]));
    Nav.focus(page.querySelector('.sbtns .btn'));
  }

  /* ---------- detalhes (filme / série) ---------- */

  function showDetail(it, vars) {
    if (!(S.detail && vars)) { S.lastFocus = Nav.current(); }
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

    d.appendChild(bg);
    d.appendChild(h('div', { cls: 'bgfade' }));
    d.appendChild(h('div', { cls: 'dwrap' }, [
      h('div', { cls: 'dmain' }, [poster, h('div', { cls: 'dinfo' }, [title, meta, plot, D.varsEl = h('div', { cls: 'dvars' }), btns])]),
      D.seasonsEl, D.epsEl
    ]));
    Nav.setScope(d);
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
    s.episodes.forEach(function (ep) {
      var r = S.resume['e:' + ep.id];
      D.epsEl.appendChild(h('div', { cls: 'f ep', on: { click: function () { playEpisode(ep); } } }, [
        h('div', { cls: 'en', text: 'E' + ep.num }),
        h('div', { cls: 'et', text: ep.title }),
        h('div', { cls: 'ed', text: r && r.t > 30 ? 'em andamento · ' + Core.fmtTime(r.t) : (ep.duration || '') })
      ]));
    });
  }

  function playEpisode(ep) {
    var D = S.detail;
    startPlay({ kind: 'ep', item: D.item, eps: D.flat, idx: D.flat.indexOf(ep) });
  }

  function closeDetailQuiet() {
    var d = $('detail');
    d.classList.add('hidden');
    d.innerHTML = '';
    S.detail = null;
  }

  function closeDetail() {
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
  }

  function syncNative() {
    try { if (window.NativeApp && window.NativeApp.setPlaying) { window.NativeApp.setPlaying(!!S.ctx && !Player.isPaused()); } } catch (e) {}
  }

  /* ---------- pular introdução (série) ---------- */

  var INTRO_MAX = 300, INTRO_DEFAULT = 85;
  function introKey() { var c = S.ctx; return c && c.kind === 'ep' ? c.item.type + ':' + c.item.id : ''; }
  function introDelta() { var v = store.get('intro', {})[introKey()]; return v > 0 ? v : INTRO_DEFAULT; }
  function introLearned() { return store.get('intro', {})[introKey()] > 0; }

  function skipIntro() {
    var c = S.ctx;
    if (!c || c.kind !== 'ep' || S.mini) { return; }
    var d = introDelta();
    S.skipLearn = { t0: Player.time(), at: Date.now(), key: introKey() };
    Player.seekTo(Player.time() + d);
    $('skip-intro').classList.add('hidden');
    toast('Introdução pulada (+' + d + ' s)', 1800);
  }

  /* se você ajusta logo depois de pular (±10 s), o app aprende o salto certo desta série */
  function learnSkip() {
    var k = S.skipLearn;
    if (!k || k.key !== introKey() || Date.now() - k.at > 12000) { return; }
    var d = Math.round(Player.time() - k.t0);
    if (d >= 15 && d <= 400) {
      var m = store.get('intro', {}); m[k.key] = d; store.set('intro', m);
      k.at = Date.now();
    }
  }

  function updateSkipBtn(t) {
    var c = S.ctx, b = $('skip-intro');
    if (!b) { return; }
    var on = !!c && c.kind === 'ep' && !S.mini && t >= 2 && t < INTRO_MAX;
    b.classList.toggle('hidden', !on);
    if (on && opt('autoIntro') && !c.autoDone && introLearned() && t < 25) {
      c.autoDone = true;
      skipIntro();
    }
  }

  function startPlay(ctx, fromStart) {
    setMini(false);
    S.ctx = ctx;
    S.resumeFocus = Nav.current();
    S.resumeScope = Nav.getScope();
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
        S.last[it.id] = { season: ep.season, id: ep.id };
        store.set('last', S.last);
      } else {
        url = it.url; c.rk = 'm:' + it.id; title = it.name;
      }
      pushHist(it);
      logo = it.logo;
      var r = S.resume[c.rk];
      if (!fromStart && r && r.t > 30 && r.t < r.d - 45) { o.startAt = r.t; }
    }
    c.autoDone = !!o.startAt;
    $('skip-intro').classList.add('hidden');
    $('buffer').classList.remove('hidden');
    S.prefApplied = {};
    closeTracks();
    Player.play(url, o);
    setOsd(title, sub, '', logo, vod);
    if (c.kind === 'ep') { $('osd-hint').textContent += ' · Amarelo: pular introdução'; }
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
    $('osd-hint').textContent = vod ? 'OK: pausar · ←/→: ±10 s · Cima ou Verde: áudio e legenda · Voltar: mini player · Parar: sair'
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
      btn('rew', 'rew', 'vod-only', '10 s'), oPlay, btn('ff', 'ff', 'vod-only', '10 s'), btn('tracks', 'cc', '')
    ]));
    osd.addEventListener('click', function (e) {
      var b = e.target, c = S.ctx;
      while (b && b !== osd && !b.getAttribute('data-act')) { b = b.parentNode; }
      if (!c) { return; }
      if (b && b !== osd) {
        var act = b.getAttribute('data-act');
        if (act === 'back') { minimizePlayer(); return; }
        if (act === 'tracks') { openTracks(); return; }
        if (act === 'next') { zap(1); return; }
        if (act === 'prev') { zap(-1); return; }
        if (act === 'toggle') { Player.toggle(); }
        if (act === 'rew') { Player.seek(-10); learnSkip(); }
        if (act === 'ff') { Player.seek(10); learnSkip(); }
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

  function showOsd() {
    if (S.mini) { return; }
    $('osd').classList.remove('hidden');
    $('osd-clock').textContent = hhmm(new Date());
    clearTimeout(S.osdTimer);
    S.osdTimer = setTimeout(function () { $('osd').classList.add('hidden'); }, 4500);
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
    if (t > d * 0.95) { delete S.resume[c.rk]; delete S.cont[c.rk]; }
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
    leavePlayer(true);
    toast('Mini player — ' + (document.body.classList.contains('touch') ? 'toque nele para ampliar' : 'Amarelo: ampliar · Azul: fechar'), 2500);
  }

  function expandPlayer() {
    if (!S.mini || !S.ctx) { return; }
    setMini(false);
    S.resumeFocus = Nav.current();
    S.resumeScope = Nav.getScope();
    S.mode = 'player';
    nativeFull(true);
    showOsd();
  }

  function closePlayer() { leavePlayer(false); }

  function leavePlayer(keep) {
    saveResume();
    closeTracks();
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
    if (S.detail && S.detail.item.type === 'series') { renderEps(); buildSeriesButtons(); }
    else if (S.detail && S.detail.item.type === 'movie') { buildMovieButtons(); }
    if (!S.detail && S.section === 'home') { refreshHome(); return; }
    if (S.resumeFocus && document.body.contains(S.resumeFocus)) { Nav.focus(S.resumeFocus); }
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
    learnSkip();
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
      case KEY.GREEN: openTracks(); break;
      case KEY.YELLOW: skipIntro(); break;
      case KEY.UP: case KEY.CHUP:
        if (live) { zap(1); } else if (k === KEY.UP) { openTracks(); } else { showOsd(); }
        break;
      case KEY.DOWN: case KEY.CHDN:
        if (live) { zap(-1); } else { showOsd(); }
        break;
      case KEY.LEFT: if (live) { showOsd(); } else { seek(-1); } break;
      case KEY.RIGHT: if (live) { showOsd(); } else { seek(1); } break;
      case KEY.REW: if (!live) { Player.seek(-30); learnSkip(); showOsd(); } break;
      case KEY.FF: if (!live) { Player.seek(30); learnSkip(); showOsd(); } break;
      case KEY.PLAY: if (Player.isPaused()) { Player.toggle(); } showOsd(); break;
      case KEY.PAUSE: if (!Player.isPaused()) { Player.toggle(); } showOsd(); break;
      case KEY.ENTER:
        if (live) { showOsd(); } else { Player.toggle(); showOsd(); clearTimeout(S.osdTimer); if (!Player.isPaused()) { showOsd(); } }
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
      if (S.section !== 'home') {
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
    if (S.mode === 'player') { e.preventDefault(); if (S.tracksOpen) { tracksKey(k); } else { playerKey(k); } return; }
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
        updateSkipBtn(t);
        if (!$('osd').classList.contains('hidden')) { updateBar(t, d); }
        var now = Date.now();
        if (now - S.lastSave > 10000) { S.lastSave = now; saveResume(); }
      },
      onEnded: function () {
        var c = S.ctx;
        if (!c) { return; }
        if (c.kind === 'ep' && c.idx + 1 < c.eps.length) {
          delete S.resume[c.rk]; delete S.cont[c.rk];
          store.set('resume', S.resume); store.set('cont', S.cont);
          c.idx++;
          toast('Próximo episódio…', 2000);
          playCurrent(true);
        } else if (c.kind !== 'live') {
          delete S.resume[c.rk]; delete S.cont[c.rk];
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
      var i = el.getAttribute('data-i');
      if (i !== null && S.mode === 'browse' && S.shown < S.items.length && S.shown - parseInt(i, 10) < 14) { renderMore(); }
    });

    document.addEventListener('keydown', onKey, true);
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
    var skipB = h('button', { id: 'skip-intro', type: 'button', cls: 'hidden' }, [h('span', { text: 'Pular introdução' })]);
    if (!document.body.classList.contains('touch')) { skipB.appendChild(h('small', { text: 'Amarelo' })); }
    skipB.addEventListener('click', function (e) { e.stopPropagation(); skipIntro(); });
    $('player').appendChild(skipB);
    window.__pip = function (on) { document.body.classList.toggle('pip', !!on); };
    var miniX = h('button', { id: 'mini-x', type: 'button' }, [icon('xmark', 22)]);
    var miniT = h('div', { id: 'mini-title' });
    $('player').appendChild(miniT);
    $('player').appendChild(miniX);
    miniX.addEventListener('click', function (e) { e.stopPropagation(); closePlayer(); });
    $('player').addEventListener('click', function () { if (S.mini) { expandPlayer(); } });
    $('osd-tracks').addEventListener('click', function (e) { e.stopPropagation(); openTracks(); });
    $('osd-tracks').insertBefore(icon('cc', 30), $('osd-tracks').firstChild);

    var cfg = store.get('cfg', null);
    if (cfg && cfg.server) { S.cfg = cfg; connect(cfg, { boot: true }); } else { showLogin(); }
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
})();
