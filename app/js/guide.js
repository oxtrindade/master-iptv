/* Guia de programação: grade de canais ao vivo com EPG (estilo Kepler / Pluto TV). ES5.
   Módulo isolado. Para remover: apague guide.js, guide.css e as linhas marcadas com "GUIA" em index.html e app.js.
   O EPG é buscado só dos canais que aparecem na tela (mais uma margem), 3 por vez, e guardado por 30 min.
   Fonte de dados: get_simple_data_table (dia todo) com fallback para get_short_epg. Nada é gravado em disco. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.Guide = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var G = {};

  var MIN = 60000, SLOT = 30 * MIN, HOUR = 60 * MIN;
  var ROWS = 8;                         // canais visíveis por vez
  var PAD_L = 80, PAD_R = 90;           // margens da grade
  var COL_W = 340, GAP = 10;            // coluna de canais e espaço antes da linha do tempo
  var TTL_OK = 30 * MIN, TTL_ERR = 60000, MAX_CACHE = 400, CONC = 3, PICK_N = 9;
  var K = { ENTER: 13, ESC: 27, BS: 8, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, BACK: 461, CHUP: 33, CHDN: 34,
    RED: 403, GREEN: 404, YELLOW: 405 };
  var HINTS = 'Setas: mover   ·   OK: assistir   ·   Verde: categorias   ·   Amarelo: agora   ·   Vermelho: favoritar   ·   CH+/CH−: página   ·   Voltar: menu';

  /* ---------- funções puras (testáveis em Node) ---------- */

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function hhmm(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').replace(/^ | $/g, ''); }
  function cut(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // início da meia hora que contém "ms"
  G.floorSlot = function (ms) {
    var d = new Date(ms);
    d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0);
    return d.getTime();
  };

  // títulos e descrições do Xtream vêm em base64; se não parecer base64 válido em UTF-8, devolve o texto como está
  G.b64dec = function (s) {
    s = String(s == null ? '' : s);
    if (!s || s.length % 4 !== 0 || !/^[A-Za-z0-9+\/]+={0,2}$/.test(s)) { return s; }
    var bin, u;
    try { bin = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary'); } catch (e) { return s; }
    try { u = decodeURIComponent(escape(bin)); } catch (e2) { return s; }
    return /[\u0000-\u0008\u000e-\u001f�]/.test(u) ? s : u;
  };

  // timestamp unix (s ou ms) ou "AAAA-MM-DD hh:mm:ss" (hora local) -> ms
  function ts(unix, str) {
    var n = parseInt(unix, 10);
    if (n > 0) { return n < 1e11 ? n * 1000 : n; }
    var m = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)(?::(\d\d))?/.exec(String(str || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime() : 0;
  }

  // resposta do servidor -> [{ s, e, t, d }] ordenado, sem sobreposição, de 6 h atrás até 48 h à frente
  G.normalize = function (list, now) {
    var tmp = [], out = [], i, e, s, t, p;
    if (Object.prototype.toString.call(list) !== '[object Array]') { return out; }
    for (i = 0; i < list.length; i++) {
      e = list[i];
      if (!e) { continue; }
      s = ts(e.start_timestamp, e.start);
      t = ts(e.stop_timestamp, e.end);
      if (!(s > 0) || !(t > s)) { continue; }
      if (t < now - 6 * HOUR || s > now + 48 * HOUR) { continue; }
      tmp.push({ s: s, e: t, t: clean(G.b64dec(e.title)) || 'Sem título',
        d: cut(clean(G.b64dec(e.description != null ? e.description : e.descr)), 260) });
    }
    tmp.sort(function (a, b) { return a.s - b.s || a.e - b.e; });
    for (i = 0; i < tmp.length; i++) {
      e = tmp[i];
      p = out[out.length - 1];
      if (p && e.s < p.e) {
        if (e.e <= p.e) { continue; }          // contido ou duplicado
        if (e.s <= p.s) { out.pop(); }         // o anterior cabe dentro deste
        else { p.e = e.s; }                    // sobreposição parcial: corta o anterior
      }
      out.push(e);
    }
    return out.length > 80 ? out.slice(0, 80) : out;
  };

  // índice do programa que contém "t"; se for um buraco, o próximo; depois do fim, o último; sem lista, -1
  G.findAt = function (list, t) {
    var i, n = list ? list.length : 0;
    if (!n) { return -1; }
    for (i = 0; i < n; i++) {
      if (list[i].s <= t && t < list[i].e) { return i; }
      if (list[i].s > t) { return i; }
    }
    return n - 1;
  };

  // posição dos blocos dentro da janela [ws, we): px a partir da esquerda da linha do tempo
  G.layout = function (list, ws, we, ppm) {
    var out = [], i, p, a, b;
    for (i = 0; i < list.length; i++) {
      p = list[i];
      if (p.e <= ws || p.s >= we) { continue; }
      a = Math.max(p.s, ws);
      b = Math.min(p.e, we);
      out.push({ i: i, left: (a - ws) / MIN * ppm, width: (b - a) / MIN * ppm, cl: p.s < ws, cr: p.e > we });
    }
    return out;
  };

  // nova origem da janela para que "t" fique visível (e fora dos últimos 20 min da borda direita)
  G.shiftWindow = function (ws, win, t) {
    if (t < ws) { return G.floorSlot(t); }
    if (t >= ws + win - 20 * MIN) { return G.floorSlot(t - SLOT); }
    return ws;
  };

  G.dayLabel = function (ms, now) {
    var d = new Date(ms), n = new Date(now);
    var a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    var b = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
    var diff = Math.round((a - b) / 86400000);
    if (diff === 0) { return 'HOJE'; }
    if (diff === 1) { return 'AMANHÃ'; }
    if (diff === -1) { return 'ONTEM'; }
    return ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][d.getDay()] + ' ' + pad(d.getDate()) + '/' + pad(d.getMonth() + 1);
  };

  /* ---------- estado ---------- */

  var st = null;

  G.isOpen = function () { return !!st; };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  function epgOf(s, ch) { var c = s.cache[ch.id]; return c && c.list && c.list.length ? c.list : null; }

  function epgState(s, ch) {
    if (!ch.epgId) { return 'none'; }
    var c = s.cache[ch.id];
    if (!c) { return 'loading'; }
    return c.list && c.list.length ? 'ok' : 'err';
  }

  function measure(s) {
    var w = s.host.clientWidth || 1920;
    var avail = Math.max(w - PAD_L - COL_W - GAP - PAD_R, 300);
    s.width = w;
    s.win = (avail >= 1100 ? 180 : 120) * MIN;
    s.tlW = avail;
    s.ppm = avail / (s.win / MIN);
  }

  /* ---------- EPG: busca sob demanda ---------- */

  function enc(x) { return encodeURIComponent(x); }

  function getJson(s, action, id, limit) {
    var url = s.base + '/player_api.php?username=' + enc(s.cfg.user) + '&password=' + enc(s.cfg.pass) +
      '&action=' + action + '&stream_id=' + enc(id) + (limit ? '&limit=' + limit : '');
    return s.ctx.http(url).then(function (t) {
      try { return JSON.parse(String(t).replace(/^﻿/, '')); }
      catch (e) { throw new Error('Resposta inválida do servidor'); }
    });
  }

  function loadEpg(s, ch) {
    function norm(d) { return G.normalize(d && d.epg_listings, Date.now()); }
    return getJson(s, 'get_simple_data_table', ch.id).then(norm, function () { return []; }).then(function (l) {
      if (l.length) { return l; }
      return getJson(s, 'get_short_epg', ch.id, 24).then(norm);
    });
  }

  function remember(s, id, entry) {
    if (!s.cache[id]) {
      s.keys.push(id);
      if (s.keys.length > MAX_CACHE) { delete s.cache[s.keys.shift()]; }
    }
    s.cache[id] = entry;
  }

  function fresh(s, ch) {
    var c = s.cache[ch.id];
    return !!c && Date.now() - c.at < (c.err ? TTL_ERR : TTL_OK);
  }

  function enqueue(s, idx) {
    var ch = s.chans[idx];
    if (!ch || !ch.epgId || s.pending[ch.id] || fresh(s, ch)) { return; }
    s.pending[ch.id] = 1;
    s.queue.push({ id: ch.id, ch: ch });
    pump(s);
  }

  function pump(s) {
    var j, i;
    while (s.busy < CONC && s.queue.length) {
      j = s.queue.shift();
      i = s.idxById[j.id];
      // saiu da área de interesse (rolou ou trocou de categoria): descarta e permite pedir de novo depois
      if (i == null || i < s.first - 4 || i > s.first + ROWS + 6) { delete s.pending[j.id]; continue; }
      run(s, j);
    }
  }

  function run(s, j) {
    s.busy++;
    loadEpg(s, j.ch).then(function (list) { finish(s, j, list, false); }, function () { finish(s, j, null, true); });
  }

  function finish(s, j, list, err) {
    if (st !== s) { return; }
    s.busy--;
    delete s.pending[j.id];
    var old = s.cache[j.id];
    if ((err || !list || !list.length) && old && old.list && old.list.length) {
      old.at = Date.now() - TTL_OK + TTL_ERR;      // mantém a lista antiga e tenta de novo em 1 min
      pump(s);
      return;
    }
    remember(s, j.id, { at: Date.now(), list: list, err: err || !list || !list.length });
    var i = s.idxById[j.id];
    if (i != null && i >= s.first && i < s.first + ROWS) { renderRows(s); renderInfo(s); }
    pump(s);
  }

  function prefetch(s) {
    var i;
    for (i = s.first; i < s.first + ROWS; i++) { enqueue(s, i); }
    for (i = s.first + ROWS; i < s.first + ROWS + 4; i++) { enqueue(s, i); }
    for (i = s.first - 1; i >= s.first - 2 && i >= 0; i--) { enqueue(s, i); }
  }

  /* ---------- desenho ---------- */

  function renderRuler(s) {
    var r = s.els.ruler, n = s.win / SLOT, k, l;
    r.innerHTML = '';
    r.appendChild(el('div', 'gd-rday', G.dayLabel(s.ws, Date.now())));
    var tl = el('div', 'gd-rtl');
    tl.style.marginLeft = (PAD_L + COL_W + GAP) + 'px';
    for (k = 0; k < n; k++) {
      l = el('span', 'gd-rl', hhmm(s.ws + k * SLOT));
      l.style.left = Math.round(k * (SLOT / MIN) * s.ppm + 8) + 'px';
      tl.appendChild(l);
    }
    r.appendChild(tl);
  }

  function renderNow(s) {
    var n = s.els.now, now = Date.now(), we = s.ws + s.win;
    if (now < s.ws || now >= we) { n.style.display = 'none'; return; }
    n.style.display = 'block';
    n.style.left = Math.round(PAD_L + COL_W + GAP + (now - s.ws) / MIN * s.ppm) + 'px';
    n.firstChild.textContent = hhmm(now);
  }

  function buildBlock(s, list, L, focused, now, idx) {
    var p = list[L.i], on = p.s <= now && now < p.e;
    var b = el('div', 'gd-p' + (on ? ' on' : p.e <= now ? ' past' : '') + (L.cl ? ' cl' : '') + (L.cr ? ' cr' : '') + (focused ? ' focus' : ''));
    var w = Math.max(Math.round(L.width) - 4, 12);
    b.style.left = Math.round(L.left) + 'px';
    b.style.width = w + 'px';
    b.appendChild(el('div', 'gd-pt', p.t));
    if (w >= 150) { b.appendChild(el('div', 'gd-ps', hhmm(p.s) + ' – ' + hhmm(p.e))); }
    if (on) {
      var a = Math.max(p.s, s.ws), z = Math.min(p.e, s.ws + s.win);
      var pg = el('div', 'gd-pg');
      pg.style.width = Math.max(0, Math.min(100, (now - a) / (z - a) * 100)) + '%';
      b.appendChild(pg);
    }
    b.addEventListener('click', function () { clickAt(s, idx, L.i); });
    return b;
  }

  function buildPlaceholder(s, ch, focused, idx) {
    var m = { none: 'Sem programação para este canal', loading: 'Carregando programação…', err: 'Programação indisponível', ok: 'Sem programação neste horário' };
    var b = el('div', 'gd-p ph' + (focused ? ' focus' : ''));
    b.style.left = '0px';
    b.style.width = (s.tlW - 4) + 'px';
    b.appendChild(el('div', 'gd-pt', m[epgState(s, ch)]));
    b.addEventListener('click', function () { clickAt(s, idx, -1); });
    return b;
  }

  function buildRow(s, ch, idx, now) {
    var ctx = s.ctx, sel = idx === s.row;
    var row = el('div', 'gd-row' + (sel ? ' sel' : ''));
    var c = el('div', 'gd-ch');
    c.style.width = COL_W + 'px';
    c.appendChild(el('span', 'gd-num', ch.num ? String(ch.num) : ''));
    var logo = s.logos[ch.id];
    if (!logo) {
      logo = s.logos[ch.id] = el('span', 'gd-logo');
      logo.appendChild(el('span', 'ph', (ch.name || '?').charAt(0).toUpperCase()));
      if (ch.logo && ctx.imgEl) { ctx.imgEl(ch.logo, logo); }
    }
    c.appendChild(logo);
    c.appendChild(el('span', 'gd-name', ch.name));
    if (ctx.isFav && ctx.isFav(ch) && ctx.icon) { c.appendChild(el('span', 'gd-fav')).appendChild(ctx.icon('starfill', 22)); }
    c.addEventListener('click', function () { s.row = idx; s.ctx.play(s.chans, idx); });
    row.appendChild(c);

    var tl = el('div', 'gd-tl');
    tl.style.width = s.tlW + 'px';
    tl.style.backgroundSize = Math.round(SLOT / MIN * s.ppm) + 'px 100%';
    var list = epgOf(s, ch);
    if (list) {
      var lay = G.layout(list, s.ws, s.ws + s.win, s.ppm), fi = sel ? G.findAt(list, s.cursor) : -1, i;
      for (i = 0; i < lay.length; i++) { tl.appendChild(buildBlock(s, list, lay[i], lay[i].i === fi, now, idx)); }
      if (!lay.length) { tl.appendChild(buildPlaceholder(s, ch, sel, idx)); }
    } else {
      tl.appendChild(buildPlaceholder(s, ch, sel, idx));
    }
    row.appendChild(tl);
    return row;
  }

  function renderRows(s) {
    var host = s.els.rows, now = Date.now(), i, ch;
    host.innerHTML = '';
    for (i = 0; i < ROWS; i++) {
      ch = s.chans[s.first + i];
      if (!ch) { break; }
      host.appendChild(buildRow(s, ch, s.first + i, now));
    }
    renderNow(s);
  }

  function currentProg(s) {
    var ch = s.chans[s.row], list = ch ? epgOf(s, ch) : null, i = list ? G.findAt(list, s.cursor) : -1;
    return { ch: ch, list: list, i: i, p: i >= 0 ? list[i] : null };
  }

  function renderInfo(s) {
    var e = s.els, c = currentProg(s), now = Date.now(), p = c.p;
    var cat = '';
    s.cats.forEach(function (x) { if (x.id === s.catId) { cat = x.name; } });
    e.cat.textContent = cat;
    e.cnt.textContent = s.chans.length ? (s.row + 1) + ' de ' + s.chans.length : '';
    if (!c.ch) { e.chan.textContent = ''; e.title.textContent = ''; e.meta.textContent = ''; e.desc.textContent = ''; e.next.textContent = ''; return; }
    e.chan.textContent = (c.ch.num ? c.ch.num + '  ·  ' : '') + c.ch.name;
    e.next.textContent = '';
    e.meta.innerHTML = '';
    if (p) {
      e.title.textContent = p.t;
      if (p.s <= now && now < p.e) { e.meta.appendChild(el('span', 'gd-badge', 'NO AR')); }
      var mins = Math.round((p.e - p.s) / MIN);
      e.meta.appendChild(document.createTextNode(G.dayLabel(p.s, now) + '  ·  ' + hhmm(p.s) + ' – ' + hhmm(p.e) + '  ·  ' + mins + ' min'));
      e.desc.textContent = p.d || '';
      var nx = c.list[c.i + 1];
      if (nx) { e.next.textContent = 'A seguir  ' + hhmm(nx.s) + '  ·  ' + nx.t; }
    } else {
      var m = { none: 'Sem programação para este canal', loading: 'Carregando programação…', err: 'Programação indisponível', ok: 'Sem programação neste horário' };
      e.title.textContent = c.ch.name;
      e.desc.textContent = m[epgState(s, c.ch)];
    }
  }

  function refresh(s) {
    renderRuler(s);
    renderRows(s);
    renderInfo(s);
    prefetch(s);
  }

  function showMsg(s, text) {
    s.els.msg.textContent = text || '';
    s.els.msg.style.display = text ? 'block' : 'none';
  }

  /* ---------- categorias ---------- */

  function liveFavs(s) {
    return (s.ctx.favList ? s.ctx.favList() : []).filter(function (it) { return it.type === 'live'; });
  }

  function buildCats(s) {
    var out = [];
    if (liveFavs(s).length) { out.push({ id: 'fav', name: 'Favoritos' }); }
    out = out.concat(s.catsRaw);
    out.push({ id: '*', name: 'Todos os canais' });
    s.cats = out;
  }

  function setCategory(s, id) {
    var list;
    if (id === '*') { list = s.all; }
    else if (id === 'fav') { list = liveFavs(s); }
    else { list = s.all.filter(function (it) { return it.cat === id; }); }
    s.catId = id;
    s.chans = s.ctx.filterLive ? s.ctx.filterLive(list) : list;
    s.idxById = {};
    s.chans.forEach(function (ch, i) { s.idxById[ch.id] = i; });
    s.row = 0;
    s.first = 0;
    s.queue = [];
    s.pending = {};
    s.cursor = Date.now();
    s.ws = G.floorSlot(s.cursor) - SLOT;
    if (s.ctx.store) { s.ctx.store.set('cat:guide', id); }
    showMsg(s, s.chans.length ? '' : (id === 'fav' ? 'Nenhum canal favorito. Favorite canais com o botão vermelho.' : 'Nenhum canal nesta categoria.'));
    refresh(s);
  }

  /* ---------- navegação ---------- */

  function ensureVisible(s) { s.ws = G.shiftWindow(s.ws, s.win, s.cursor); }

  function scrollTo(s) {
    var max = Math.max(0, s.chans.length - ROWS);
    if (s.row < s.first) { s.first = s.row; }
    else if (s.row >= s.first + ROWS) { s.first = s.row - ROWS + 1; }
    s.first = Math.max(0, Math.min(max, s.first));
  }

  function moveRow(s, d) {
    var n = s.chans.length, r = Math.max(0, Math.min(n - 1, s.row + d));
    if (!n || r === s.row) { return; }
    s.row = r;
    scrollTo(s);
    refresh(s);
  }

  function movePage(s, d) {
    var n = s.chans.length;
    if (!n) { return; }
    var max = Math.max(0, n - ROWS), nf = Math.max(0, Math.min(max, s.first + d * ROWS));
    var rel = s.row - s.first;
    s.first = nf;
    s.row = Math.min(n - 1, nf + rel);
    refresh(s);
  }

  function moveCol(s, d) {
    var c = currentProg(s);
    if (!c.ch) { return; }
    if (c.list) {
      var nb = c.list[c.i + d];
      if (!nb) { return; }
      s.cursor = nb.s;
    } else {
      s.cursor += d * SLOT;       // sem dados: anda a janela de meia em meia hora
    }
    ensureVisible(s);
    refresh(s);
  }

  function goNow(s) {
    s.cursor = Date.now();
    s.ws = G.floorSlot(s.cursor) - SLOT;
    refresh(s);
  }

  function play(s) {
    if (s.chans[s.row]) { s.ctx.play(s.chans, s.row); }
  }

  function clickAt(s, idx, pi) {
    var ch = s.chans[idx], list = ch ? epgOf(s, ch) : null;
    s.row = idx;
    if (list && pi >= 0) { s.cursor = list[pi].s; }
    s.ctx.play(s.chans, idx);
  }

  function toggleFav(s) {
    var ch = s.chans[s.row];
    if (!ch || !s.ctx.toggleFav) { return; }
    s.ctx.toggleFav(ch);
    buildCats(s);
    if (s.catId === 'fav' && !liveFavs(s).length) { setCategory(s, s.cats[0].id); return; }
    if (s.catId === 'fav' && !liveFavs(s).some(function (x) { return x.id === ch.id; })) {
      var keep = s.row;
      setCategory(s, 'fav');
      s.row = Math.min(keep, Math.max(0, s.chans.length - 1));
      scrollTo(s);
      refresh(s);
      return;
    }
    refresh(s);
  }

  /* ---------- seletor de categoria ---------- */

  function renderPick(s) {
    var p = s.pick, box = s.els.pick, i, it;
    box.innerHTML = '';
    box.appendChild(el('div', 'gd-pick-t', 'Categorias'));
    for (i = p.top; i < Math.min(s.cats.length, p.top + PICK_N); i++) {
      it = el('div', 'gd-pick-i' + (i === p.idx ? ' on' : '') + (s.cats[i].id === s.catId ? ' cur' : ''), s.cats[i].name);
      (function (k) { it.addEventListener('click', function () { p.idx = k; choosePick(s); }); })(i);
      box.appendChild(it);
    }
    box.style.display = 'block';
  }

  function openPick(s) {
    var idx = 0;
    s.cats.forEach(function (c, i) { if (c.id === s.catId) { idx = i; } });
    s.pick = { idx: idx, top: Math.max(0, Math.min(idx - 3, s.cats.length - PICK_N)) };
    renderPick(s);
  }

  function closePick(s) {
    s.pick = null;
    s.els.pick.style.display = 'none';
  }

  function choosePick(s) {
    var id = s.cats[s.pick.idx].id;
    closePick(s);
    if (id !== s.catId) { setCategory(s, id); }
  }

  function pickKey(s, k, e) {
    var p = s.pick, n = s.cats.length;
    e.preventDefault();
    if (k === K.BACK || k === K.ESC || k === K.BS || k === K.GREEN) { closePick(s); return true; }
    if (k === K.ENTER) { choosePick(s); return true; }
    if (k === K.UP || k === K.DOWN || k === K.CHUP || k === K.CHDN) {
      var d = k === K.UP ? -1 : k === K.DOWN ? 1 : k === K.CHUP ? -PICK_N : PICK_N;
      p.idx = Math.max(0, Math.min(n - 1, p.idx + d));
      if (p.idx < p.top) { p.top = p.idx; }
      else if (p.idx >= p.top + PICK_N) { p.top = p.idx - PICK_N + 1; }
      renderPick(s);
    }
    return true;
  }

  /* ---------- ciclo de vida ---------- */

  G.key = function (e) {
    var s = st;
    if (!s) { return false; }
    var k = e.keyCode;
    if (s.pick) { return pickKey(s, k, e); }
    switch (k) {
      case K.LEFT: e.preventDefault(); moveCol(s, -1); return true;
      case K.RIGHT: e.preventDefault(); moveCol(s, 1); return true;
      case K.UP: e.preventDefault(); moveRow(s, -1); return true;
      case K.DOWN: e.preventDefault(); moveRow(s, 1); return true;
      case K.CHUP: e.preventDefault(); movePage(s, -1); return true;
      case K.CHDN: e.preventDefault(); movePage(s, 1); return true;
      case K.ENTER: e.preventDefault(); play(s); return true;
      case K.RED: if (!s.chans.length) { return false; } e.preventDefault(); toggleFav(s); return true;
      case K.GREEN: if (!s.cats.length) { return false; } e.preventDefault(); openPick(s); return true;
      case K.YELLOW:
        if (s.ctx.isMini && s.ctx.isMini()) { return false; }   // com mini player, Amarelo continua ampliando-o
        e.preventDefault(); goNow(s); return true;
      default: return false;
    }
  };

  G.close = function () {
    var s = st;
    if (!s) { return; }
    st = null;
    clearInterval(s.tick);
    if (s.ctx.hints && s.hintsOld != null) { s.ctx.hints.textContent = s.hintsOld; }
    if (s.onWheel) { s.host.removeEventListener('wheel', s.onWheel); }
  };

  function tick(s) {
    if (st !== s) { return; }
    if (!document.body.contains(s.host)) { G.close(); return; }
    var w = s.host.clientWidth || 1920, min = Math.floor(Date.now() / MIN);
    if (w !== s.width) { measure(s); ensureVisible(s); refresh(s); s.lastMin = min; return; }
    if (min !== s.lastMin) { s.lastMin = min; renderRows(s); renderInfo(s); }   // atualiza "no ar", progresso e a linha do agora
  }

  G.open = function (ctx) {
    G.close();
    var host = ctx.host;
    var s = st = {
      ctx: ctx, host: host, cfg: ctx.cfg || {}, base: String((ctx.provider && ctx.provider.base) || '').replace(/\/+$/, ''),
      all: [], catsRaw: [], cats: [], catId: null, chans: [], idxById: {},
      row: 0, first: 0, ws: 0, win: 180 * MIN, ppm: 8, tlW: 1400, width: 0, cursor: Date.now(), lastMin: 0,
      cache: {}, keys: [], logos: {}, pending: {}, queue: [], busy: 0, pick: null, els: {}, hintsOld: null, tick: null
    };
    host.innerHTML = '';
    host.className = 'page guide';
    var root = el('div', 'gd');

    var info = el('div', 'gd-info'), main = el('div', 'gd-main'), side = el('div', 'gd-side');
    s.els.chan = el('div', 'gd-chan');
    s.els.title = el('div', 'gd-title');
    s.els.meta = el('div', 'gd-meta');
    s.els.desc = el('div', 'gd-desc');
    main.appendChild(s.els.chan); main.appendChild(s.els.title); main.appendChild(s.els.meta); main.appendChild(s.els.desc);
    s.els.cat = el('div', 'gd-cat');
    s.els.cnt = el('div', 'gd-cnt');
    s.els.next = el('div', 'gd-next');
    side.appendChild(s.els.cat); side.appendChild(s.els.cnt); side.appendChild(s.els.next);
    info.appendChild(main); info.appendChild(side);

    var grid = el('div', 'gd-grid');
    s.els.ruler = el('div', 'gd-ruler');
    s.els.rows = el('div', 'gd-rows');
    s.els.now = el('div', 'gd-now');
    s.els.now.appendChild(el('span'));
    grid.appendChild(s.els.ruler); grid.appendChild(s.els.rows); grid.appendChild(s.els.now);

    s.els.msg = el('div', 'gd-msg');
    s.els.pick = el('div', 'gd-pick');
    s.els.pick.style.display = 'none';
    root.appendChild(info); root.appendChild(grid); root.appendChild(s.els.msg); root.appendChild(s.els.pick);
    host.appendChild(root);

    if (ctx.hints) { s.hintsOld = ctx.hints.textContent; ctx.hints.textContent = HINTS; }
    s.onWheel = function (e) { e.preventDefault(); if (!s.pick) { moveRow(s, e.deltaY > 0 ? 2 : -2); } };
    host.addEventListener('wheel', s.onWheel);

    measure(s);
    s.ws = G.floorSlot(s.cursor) - SLOT;
    renderRuler(s);

    if (!ctx.provider || ctx.provider.kind !== 'xtream') {
      showMsg(s, 'O Guia usa a programação do servidor Xtream. Entre com servidor, usuário e senha para ver a grade.');
      return;
    }
    showMsg(s, 'Carregando canais…');
    Promise.all([ctx.provider.categories('live'), ctx.provider.all('live')]).then(function (r) {
      if (st !== s) { return; }
      s.catsRaw = r[0] || [];
      s.all = r[1] || [];
      buildCats(s);
      var want = ctx.store ? ctx.store.get('cat:guide', null) : null, ok = false;
      s.cats.forEach(function (c) { if (c.id === want) { ok = true; } });
      if (!ok) { want = s.cats[0] && s.cats[0].id; }
      s.tick = setInterval(function () { tick(s); }, 1000);
      setCategory(s, want);
    }, function (err) {
      if (st !== s) { return; }
      showMsg(s, 'Erro ao carregar os canais: ' + (err && err.message ? err.message : 'falha de rede'));
    });
  };

  return G;
});
