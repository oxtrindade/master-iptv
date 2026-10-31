/* Sincronização entre aparelhos (TV, celular...). ES5: roda no webOS e no Android.
   Guarda uma cópia do estado do perfil num servidor simples (Cloudflare Worker, veja worker/ e docs/sincronizacao.md)
   e funde com a cópia local: o item mais recente vence. Itens apagados viram "lápides" (tomb / favmeta) para
   não voltarem de outro aparelho. O que sincroniza: continuar assistindo (resume/cont), favoritos, histórico e
   o último episódio de cada série. Login do servidor IPTV NÃO sincroniza. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.Sync = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var Sy = {};

  /* Se quiser não digitar o endereço em cada aparelho, preencha aqui (ex.: 'https://master-sync.seunome.workers.dev'). */
  Sy.DEFAULT_URL = '';
  Sy.transport = null;   // só para testes: function (method, url, body) -> Promise({status, text})

  var DAY = 86400000;
  var LIMITS = { resume: 300, cont: 30, hist: 40, tomb: 300 };

  /* ---------- código e endereço ---------- */

  var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sem 0, O, 1, I (não confunde na TV)

  Sy.newCode = function () {
    var b = [], out = '', i, g = null;
    try { g = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : null); } catch (e) { g = null; }
    if (g && g.crypto && g.crypto.getRandomValues && typeof Uint8Array !== 'undefined') {
      b = g.crypto.getRandomValues(new Uint8Array(16));
    } else {
      for (i = 0; i < 16; i++) { b[i] = Math.floor(Math.random() * 256); }
    }
    for (i = 0; i < 16; i++) { out += ALPHA.charAt(b[i] % ALPHA.length); }
    return out;
  };

  Sy.normCode = function (s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); };
  Sy.validCode = function (s) { var c = Sy.normCode(s); return c.length >= 16 && c.length <= 64; };
  Sy.fmtCode = function (s) { return Sy.normCode(s).replace(/(.{4})(?=.)/g, '$1-'); };

  Sy.normUrl = function (u) {
    u = String(u || '').replace(/\s+/g, '');
    if (!u) { return ''; }
    if (!/^https?:\/\//i.test(u)) { u = 'https://' + u; }
    return u.replace(/[?#].*$/, '').replace(/\/sync\/[^\/]*$/, '').replace(/\/+$/, '');
  };

  /* aceita só o código, ou "endereço#código" (um texto só para parear outro aparelho) */
  Sy.parsePair = function (s) {
    s = String(s || '').replace(/^\s+|\s+$/g, '');
    var i = s.lastIndexOf('#');
    if (i >= 0) { return { url: Sy.normUrl(s.slice(0, i)), code: Sy.normCode(s.slice(i + 1)) }; }
    return { url: '', code: Sy.normCode(s) };
  };

  Sy.pairString = function (url, code) {
    var u = Sy.normUrl(url), c = Sy.fmtCode(code);
    if (!u || u === Sy.normUrl(Sy.DEFAULT_URL)) { return c; }
    return u.replace(/^https:\/\//i, '') + '#' + c;
  };

  /* ---------- fusão (função pura) ---------- */

  function keys(o) { return Object.keys(o || {}); }
  function atOf(x) { return (x && x.at) || 0; }

  function mergeAt(a, b) {   // mapa de itens com .at: o mais novo de cada chave (empate: o primeiro)
    var out = {}, seen = {};
    keys(a).concat(keys(b)).forEach(function (k) {
      if (seen[k]) { return; }
      seen[k] = 1;
      var x = a && a[k], y = b && b[k];
      out[k] = x && y ? (atOf(y) > atOf(x) ? y : x) : (x || y);
    });
    return out;
  }

  function newest(map, max) {   // mantém só os `max` mais recentes
    var ks = keys(map);
    if (ks.length <= max) { return; }
    ks.sort(function (p, q) { return atOf(map[q]) - atOf(map[p]); });
    ks.slice(max).forEach(function (k) { delete map[k]; });
  }

  Sy.merge = function (a, b, now) {
    a = a || {}; b = b || {};
    now = now || Date.now();
    var k, out = { v: 1 };

    // lápides de "terminou de assistir"/"limpou o histórico": vale o instante mais novo
    var tomb = {};
    keys(a.tomb).concat(keys(b.tomb)).forEach(function (key) {
      var t = Math.max((a.tomb && a.tomb[key]) || 0, (b.tomb && b.tomb[key]) || 0);
      if (t > now - 60 * DAY) { tomb[key] = { at: t }; }
    });
    newest(tomb, LIMITS.tomb);
    out.tomb = {};
    keys(tomb).forEach(function (key) { out.tomb[key] = tomb[key].at; });

    var resume = mergeAt(a.resume, b.resume), cont = mergeAt(a.cont, b.cont);
    keys(resume).forEach(function (key) { if (out.tomb[key] && out.tomb[key] >= atOf(resume[key])) { delete resume[key]; } });
    keys(cont).forEach(function (key) { if (out.tomb[key] && out.tomb[key] >= atOf(cont[key])) { delete cont[key]; } });
    // um card por série: só o episódio mais recente
    var bySeries = {};
    keys(cont).forEach(function (key) {
      var o = cont[key];
      if (!o || o.kind !== 'ep' || !o.item) { return; }
      var sk = o.item.type + ':' + o.item.id, cur = bySeries[sk];
      if (!cur) { bySeries[sk] = key; }
      else if (atOf(o) > atOf(cont[cur])) { delete cont[cur]; bySeries[sk] = key; }
      else { delete cont[key]; }
    });
    newest(resume, LIMITS.resume);
    newest(cont, LIMITS.cont);
    out.resume = resume;
    out.cont = cont;

    // favoritos: cada item tem o instante em que foi marcado/desmarcado (favmeta); sem registro = antigo (1)
    var fa = a.fav || {}, fb = b.fav || {}, ma = a.favmeta || {}, mb = b.favmeta || {};
    var fav = {}, favmeta = {}, seen = {};
    keys(fa).concat(keys(fb), keys(ma), keys(mb)).forEach(function (key) {
      if (seen[key]) { return; }
      seen[key] = 1;
      var ta = ma[key] ? atOf(ma[key]) : (fa[key] ? 1 : 0), tb = mb[key] ? atOf(mb[key]) : (fb[key] ? 1 : 0);
      var da = ma[key] ? !!ma[key].del : !fa[key], db = mb[key] ? !!mb[key].del : !fb[key];
      var t, del;
      if (ta > tb) { t = ta; del = da; }
      else if (tb > ta) { t = tb; del = db; }
      else { t = ta; del = da && db; }
      if (del) {
        if (t > now - 90 * DAY) { favmeta[key] = { at: t, del: true }; }
      } else {
        favmeta[key] = { at: t };
        fav[key] = fa[key] || fb[key];
      }
    });
    out.fav = fav;
    out.favmeta = favmeta;

    // histórico (base das recomendações) e último episódio de cada série
    var hist = {}, hl = [];
    (a.hist || []).concat(b.hist || []).forEach(function (x) {
      if (!x) { return; }
      var key = x.type + ':' + x.id;
      if (!hist[key] || atOf(x) > atOf(hist[key])) { hist[key] = x; }
    });
    keys(hist).forEach(function (key) { hl.push(hist[key]); });
    hl.sort(function (p, q) { return atOf(q) - atOf(p); });
    out.hist = hl.slice(0, LIMITS.hist);
    out.last = mergeAt(a.last, b.last);
    return out;
  };

  function canon(v) {
    if (Array.isArray(v)) { return '[' + v.map(canon).join(',') + ']'; }
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
    }
    return JSON.stringify(v);
  }
  Sy.same = function (a, b) { return canon(a) === canon(b); };

  function pick(x) {
    x = x || {};
    return { v: 1, resume: x.resume || {}, cont: x.cont || {}, tomb: x.tomb || {}, fav: x.fav || {}, favmeta: x.favmeta || {}, hist: x.hist || [], last: x.last || {} };
  }

  /* ---------- rede ---------- */

  function request(method, url, body) {
    if (Sy.transport) { return Sy.transport(method, url, body); }
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open(method, url, true);
      x.timeout = 20000;
      if (body !== undefined) { x.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8'); }   // sem pré-validação CORS
      x.onload = function () { resolve({ status: x.status, text: x.responseText }); };
      x.onerror = function () { reject(new Error('Sem conexão com o servidor de sincronização')); };
      x.ontimeout = function () { reject(new Error('Tempo esgotado')); };
      x.send(body);
    });
  }

  function runOnce(o) {
    var url = Sy.normUrl(o.url) + '/sync/' + Sy.normCode(o.code);
    return request('GET', url).then(function (r) {
      var remote = null;
      if (r.status === 200) {
        try { remote = JSON.parse(r.text); } catch (e) { throw new Error('Resposta inválida do servidor'); }
        if (!remote || typeof remote !== 'object') { remote = null; }
      } else if (r.status !== 404) {
        throw new Error('Servidor respondeu ' + r.status);
      }
      var local = pick(o.local());
      var merged = Sy.merge(local, remote || {}, o.now);
      var pulled = !Sy.same(merged, local);
      if (pulled) { o.apply(merged); }
      var pushed = !remote || !Sy.same(merged, Sy.merge(remote, {}, o.now));
      if (!pushed) { return { pulled: pulled, pushed: false }; }
      return request('POST', url, JSON.stringify(merged)).then(function (w) {
        if (w.status < 200 || w.status >= 300) { throw new Error('Servidor recusou a gravação (' + w.status + ')'); }
        return { pulled: pulled, pushed: true };
      });
    });
  }

  /* o: { url, code, local: function () -> estado, apply: function (estado), now? }  (uma execução por vez) */
  var chain = Promise.resolve();
  Sy.run = function (o) {
    var p = chain.then(function () { return runOnce(o); });
    chain = p.then(function () {}, function () {});
    return p;
  };

  return Sy;
});
