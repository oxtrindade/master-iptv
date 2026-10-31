/* Testes da sincronização: fusão dos dados, ciclo entre dois aparelhos e o Worker (com KV simulado).
   Rodar: node tests/test-sync.js */
var assert = require('assert');
var Sync = require('../app/js/sync.js');

function step(s) { console.log('  ok  ', s); }

(async function () {
  var worker = (await import('../worker/sync-worker.mjs')).default;
  var kv = {}, posts = 0;
  var env = { SYNC: {
    get: async function (k) { return Object.prototype.hasOwnProperty.call(kv, k) ? kv[k] : null; },
    put: async function (k, v) { kv[k] = v; }
  } };
  function call(method, url, body) {
    var opts = { method: method };
    if (body !== undefined) { opts.body = body; }
    return worker.fetch(new Request(url, opts), env).then(function (r) { return r.text().then(function (t) { return { status: r.status, text: t, headers: r.headers }; }); });
  }
  Sync.transport = function (method, url, body) { if (method === 'POST') { posts++; } return call(method, url, body); };

  /* ---- código e endereço ---- */
  var code = Sync.newCode();
  assert.ok(/^[A-HJ-NP-Z2-9]{16}$/.test(code), 'código de 16 caracteres sem 0/O/1/I: ' + code);
  assert.strictEqual(Sync.fmtCode(code).length, 19);
  assert.strictEqual(Sync.normCode('k7qm-2xpd 9tvr-4hnc'), 'K7QM2XPD9TVR4HNC');
  assert.deepStrictEqual(Sync.parsePair('https://abc.workers.dev/#k7qm-2xpd-9tvr-4hnc'), { url: 'https://abc.workers.dev', code: 'K7QM2XPD9TVR4HNC' });
  assert.deepStrictEqual(Sync.parsePair('K7QM-2XPD-9TVR-4HNC'), { url: '', code: 'K7QM2XPD9TVR4HNC' });
  assert.strictEqual(Sync.normUrl('abc.workers.dev/sync/XYZ'), 'https://abc.workers.dev');
  assert.strictEqual(Sync.pairString('https://abc.workers.dev', 'K7QM2XPD9TVR4HNC'), 'abc.workers.dev#K7QM-2XPD-9TVR-4HNC');
  step('código, endereço e texto de pareamento');

  /* ---- fusão ---- */
  var NOW = 1000000000000;
  var tvShow = { type: 'series', id: 9 };
  var a = {
    resume: { 'm:1': { t: 100, d: 5000, at: NOW - 5000 }, 'e:7': { t: 50, d: 2400, at: NOW - 9000 } },
    cont: { 'm:1': { rk: 'm:1', kind: 'movie', item: { type: 'movie', id: 1 }, t: 100, d: 5000, at: NOW - 5000 },
            'e:7': { rk: 'e:7', kind: 'ep', item: tvShow, t: 50, d: 2400, at: NOW - 9000 } },
    fav: { 'movie:1': { name: 'A' } }, favmeta: { 'movie:1': { at: NOW - 100 } },
    hist: [{ type: 'movie', id: 1, at: NOW - 5000 }], last: { 9: { season: 1, id: 7, at: NOW - 9000 } }
  };
  var b = {
    resume: { 'm:1': { t: 900, d: 5000, at: NOW - 1000 }, 'e:8': { t: 10, d: 2400, at: NOW - 2000 } },
    cont: { 'm:1': { rk: 'm:1', kind: 'movie', item: { type: 'movie', id: 1 }, t: 900, d: 5000, at: NOW - 1000 },
            'e:8': { rk: 'e:8', kind: 'ep', item: tvShow, t: 10, d: 2400, at: NOW - 2000 } },
    fav: {}, favmeta: { 'movie:1': { at: NOW - 50, del: true }, 'movie:2': { at: NOW - 10 } },
    hist: [{ type: 'movie', id: 2, at: NOW - 10 }], last: { 9: { season: 1, id: 8, at: NOW - 2000 } }
  };
  var m = Sync.merge(a, b, NOW);
  assert.strictEqual(m.resume['m:1'].t, 900, 'a posição mais recente vence');
  assert.ok(m.cont['e:8'] && !m.cont['e:7'], 'um card por série: fica o episódio mais novo');
  assert.ok(!m.fav['movie:1'] && m.favmeta['movie:1'].del, 'favorito desmarcado depois vence');
  assert.deepStrictEqual(m.hist.map(function (x) { return x.id; }), [2, 1], 'histórico junto, mais novo primeiro');
  assert.strictEqual(m.last[9].id, 8, 'último episódio mais novo');
  var done = Sync.merge({ tomb: { 'm:1': NOW - 100 } }, a, NOW);
  assert.ok(!done.resume['m:1'] && !done.cont['m:1'], 'lápide mais nova apaga o item');
  var back = Sync.merge({ tomb: { 'm:1': NOW - 100 } }, { resume: { 'm:1': { t: 5, d: 5000, at: NOW } }, cont: { 'm:1': { at: NOW, kind: 'movie' } } }, NOW);
  assert.ok(back.resume['m:1'], 'assistiu de novo depois da lápide: volta');
  var legacy = Sync.merge({ fav: { 'movie:5': { name: 'Antigo' } } }, {}, NOW);
  assert.ok(legacy.fav['movie:5'], 'favorito antigo (sem registro) é mantido');
  assert.ok(Sync.same(Sync.merge(m, m, NOW), m), 'fundir de novo não muda nada');
  step('fusão: mais recente vence, lápides, séries, favoritos e histórico');

  /* ---- Worker ---- */
  var base = 'https://sync.example.workers.dev';
  var r = await call('OPTIONS', base + '/sync/' + code);
  assert.strictEqual(r.status, 204); assert.strictEqual(r.headers.get('access-control-allow-origin'), '*');
  assert.strictEqual((await call('GET', base + '/sync/curto')).status, 404, 'código curto não existe');
  assert.strictEqual((await call('GET', base + '/sync/' + code)).status, 404, 'código novo ainda vazio');
  assert.strictEqual((await call('POST', base + '/sync/' + code, 'não é json')).status, 400);
  assert.strictEqual((await call('POST', base + '/sync/' + code, '[1]')).status, 400);
  assert.strictEqual((await call('DELETE', base + '/sync/' + code)).status, 405);
  step('Worker: CORS, validação e erros');

  /* ---- dois aparelhos ---- */
  function device(init) {
    var st = JSON.parse(JSON.stringify(init || {}));
    return { st: st, run: function () { return Sync.run({ url: base, code: code, now: NOW, local: function () { return st; }, apply: function (x) { Object.keys(x).forEach(function (k) { st[k] = x[k]; }); } }); } };
  }
  var tv = device({ resume: a.resume, cont: a.cont, fav: a.fav, favmeta: a.favmeta, hist: a.hist, last: a.last });
  var phone = device({});
  var res = await tv.run();
  assert.deepStrictEqual(res, { pulled: false, pushed: true }, 'TV envia (servidor vazio)');
  res = await phone.run();
  assert.strictEqual(res.pulled, true); assert.strictEqual(res.pushed, false, 'celular só recebe');
  assert.ok(phone.st.cont['m:1'] && phone.st.fav['movie:1'], 'celular recebeu o que a TV estava assistindo');
  var p0 = posts;
  res = await tv.run();
  assert.deepStrictEqual(res, { pulled: false, pushed: false }); assert.strictEqual(posts, p0, 'sem mudança: nada é enviado');
  // celular termina o filme, desmarca o favorito e assiste outro
  phone.st.tomb = { 'm:1': NOW + 10 }; delete phone.st.resume['m:1']; delete phone.st.cont['m:1'];
  phone.st.favmeta['movie:1'] = { at: NOW + 20, del: true }; delete phone.st.fav['movie:1'];
  await phone.run();
  res = await tv.run();
  assert.strictEqual(res.pulled, true);
  assert.ok(!tv.st.cont['m:1'] && !tv.st.resume['m:1'], 'filme terminado no celular some da TV');
  assert.ok(!tv.st.fav['movie:1'], 'favorito desmarcado no celular some da TV');
  step('dois aparelhos: enviar, receber, terminar filme e desmarcar favorito');

  var failing = Sync.transport;
  Sync.transport = function () { return Promise.resolve({ status: 500, text: '' }); };
  await assert.rejects(function () { return tv.run(); }, /500/);
  Sync.transport = failing;
  await tv.run();
  step('erro do servidor não quebra as próximas sincronizações');

  console.log('todos os testes passaram');
})().catch(function (e) { console.error('FALHOU', e); process.exit(1); });
