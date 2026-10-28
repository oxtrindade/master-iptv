/* Testes do núcleo (parser M3U, cliente Xtream) e do proxy CORS. Rodar: node tests/test-core.js */
var assert = require('assert');
var http = require('http');
var Core = require('../app/js/core.js');
var mock = require('./mock-server.js');
var proxyLib = require('../services/com.rodrigo.iptv.service/proxy.js');

function get(url) {
  return new Promise(function (resolve, reject) {
    http.get(url, function (r) {
      var b = '';
      r.on('data', function (d) { b += d; });
      r.on('end', function () { resolve({ status: r.statusCode, headers: r.headers, body: b }); });
    }).on('error', reject);
  });
}
var httpText = function (u) { return get(u).then(function (r) { if (r.status >= 300) { throw new Error('HTTP ' + r.status); } return r.body; }); };

var results = [];
function t(name, fn) { results.push({ name: name, fn: fn }); }

t('TMDB: versões do mesmo título (dublado, legendado, 4K) e preferência', function () {
  var Tmdb = require('../app/js/tmdb.js');
  assert.strictEqual(Tmdb.variantInfo('Duna (2024) [L]').lang, 'leg');
  assert.strictEqual(Tmdb.variantInfo('Duna (2024) 4K').q, '4K');
  assert.strictEqual(Tmdb.variantInfo('Duna Dublado FHD').label, 'Dublado · Full HD');
  var d = { type: 'movie', id: '1', name: 'Duna (2024) Dublado', logo: 'x' }, l = { type: 'movie', id: '2', name: 'Duna (2024) [L]', logo: 'x' }, k = { type: 'movie', id: '3', name: 'Duna (2024) 4K', logo: 'x' };
  var list = [l, k, d];
  Tmdb.setPref('dub');
  var v = Tmdb.variants(list, l);
  assert.strictEqual(v.length, 3, 'três versões, sem duplicar a própria');
  assert.strictEqual(v[0].id, '1', 'dublado primeiro');
  assert.strictEqual(Tmdb.match(list, [{ t: 'Duna', o: 'Dune', y: 2024 }])[0].id, '1', 'ranking prefere dublado');
  Tmdb.setPref('leg');
  assert.strictEqual(Tmdb.match(list, [{ t: 'Duna', o: 'Dune', y: 2024 }])[0].id, '2', 'com preferência legendado');
  Tmdb.setPref('dub');
});

t('Versões: dublado primeiro; 4K só na TV', function () {
  var Tmdb = require('../app/js/tmdb.js');
  var l = [{ type: 'movie', id: '2', name: 'Duna (2024) FHD Dublado' }, { type: 'movie', id: '3', name: 'Duna (2024) 4K Dublado' }, { type: 'movie', id: '5', name: 'Duna (2024) 4K Legendado' }];
  Tmdb.setTv4k(false);
  assert.deepStrictEqual(Tmdb.best(l).map(function (x) { return x.id; }), ['2'], 'celular: dublado em Full HD');
  Tmdb.setTv4k(true);
  assert.deepStrictEqual(Tmdb.best(l).map(function (x) { return x.id; }), ['3'], 'TV: dublado em 4K');
  Tmdb.setTv4k(false);
});

t('TMDB: normaliza títulos e cruza com o catálogo', function () {
  var Tmdb = require('../app/js/tmdb.js');
  assert.strictEqual(Tmdb.norm('Duna: Parte Dois (2024) [LEG] 4K'), 'duna parte dois');
  assert.strictEqual(Tmdb.norm('PT | Filme Teste FHD H265'), 'filme teste');
  assert.strictEqual(Tmdb.yearOf('Moana (2026)'), 2026);
  var list = [
    { type: 'movie', id: '1', name: 'Duna: Parte Dois (2024)', rating: 8, logo: 'x' },
    { type: 'movie', id: '2', name: 'Duna Parte Dois', rating: 7, year: '2001' },
    { type: 'movie', id: '3', name: 'Moana 2', rating: 6, logo: 'y' }
  ];
  var m = Tmdb.match(list, [{ t: 'Duna: Parte Dois', o: 'Dune: Part Two', y: 2024 }, { t: 'Moana 2', o: 'Moana 2', y: 2024 }, { t: 'Inexistente', o: 'None', y: 2020 }, { t: 'Moana 2', o: 'Moana 2', y: 2024 }]);
  assert.deepStrictEqual(m.map(function (x) { return x.id; }), ['1', '3'], 'ano errado e repetidos ficam de fora');
});

t('normBase / detectXtream', function () {
  assert.strictEqual(Core.normBase('exemplo.com:8080/'), 'http://exemplo.com:8080');
  assert.strictEqual(Core.normBase('http://a.b/player_api.php?x=1'), 'http://a.b');
  var d = Core.detectXtream('http://srv.tv:80/get.php?username=ana&password=p%40ss&type=m3u_plus');
  assert.deepStrictEqual(d, { server: 'http://srv.tv:80', user: 'ana', pass: 'p@ss' });
  assert.strictEqual(Core.detectXtream('http://x/lista.m3u'), null);
});

t('parseEpisode', function () {
  var e = Core.parseEpisode('Breaking Bad S03E07 - One Minute');
  assert.deepStrictEqual([e.show, e.season, e.num, e.title], ['Breaking Bad', 3, 7, 'One Minute']);
  e = Core.parseEpisode('Stranger Things S01 E01');
  assert.deepStrictEqual([e.show, e.season, e.num], ['Stranger Things', 1, 1]);
  e = Core.parseEpisode('Sem padrão');
  assert.strictEqual(e.show, 'Sem padrão');
});

t('classify', function () {
  assert.strictEqual(Core.classify({ url: 'http://a/live/1.m3u8', group: 'Esportes', name: 'x' }), 'live');
  assert.strictEqual(Core.classify({ url: 'http://a/movie/u/p/1.mp4', group: 'x', name: 'x' }), 'movie');
  assert.strictEqual(Core.classify({ url: 'http://a/series/u/p/1.mkv', group: 'x', name: 'x' }), 'series');
  assert.strictEqual(Core.classify({ url: 'http://a/v.mp4', group: 'Filmes', name: 'x' }), 'movie');
  assert.strictEqual(Core.classify({ url: 'http://a/v.mkv', group: 'Séries HD', name: 'x S01E01' }), 'series');
});

t('M3U provider (via servidor falso)', function (ctx) {
  return httpText(ctx.base + '/lista.m3u').then(function (txt) {
    var p = Core.createM3U(txt);
    return p.login().then(function (l) {
      assert.ok(l.ok);
      return Promise.all([p.categories('live'), p.categories('movie'), p.categories('series'), p.all('series')]);
    }).then(function (r) {
      assert.deepStrictEqual(r[0].map(function (c) { return c.name; }), ['Abertos']);
      assert.deepStrictEqual(r[1].map(function (c) { return c.name; }), ['Filmes | Ação']);
      assert.strictEqual(r[3].length, 1, 'episódios devem ser agrupados em uma série');
      return p.episodes(r[3][0]);
    }).then(function (e) {
      assert.deepStrictEqual(e.seasons.map(function (s) { return s.n; }), [1, 2]);
      assert.deepStrictEqual(e.seasons[0].episodes.map(function (x) { return x.num; }), [1, 2], 'ordenados');
    });
  });
});

t('Xtream provider', function (ctx) {
  var x = Core.createXtream({ server: ctx.base, user: 'joao', pass: 'segredo' }, httpText);
  return x.login().then(function (l) {
    assert.ok(l.ok); assert.ok(l.exp instanceof Date);
    return Promise.all([x.categories('live'), x.items('live', '2'), x.all('movie'), x.all('series')]);
  }).then(function (r) {
    assert.strictEqual(r[0].length, 3);
    assert.strictEqual(r[1].length, 2);
    var live = r[1][0];
    assert.ok(/\/live\/joao\/segredo\/102\.m3u8$/.test(live.url));
    assert.ok(/\.ts$/.test(live.alt));
    assert.ok(/\/movie\/joao\/segredo\/501\.mkv$/.test(r[2][0].url));
    assert.strictEqual(r[2][0].rating, 7.4);
    assert.strictEqual(r[3][0].rating, 8, 'rating_5based convertido p/ 10');
    return Promise.all([x.episodes(r[3][0]), x.movieInfo(r[2][0]), x.epg({ id: '101' })]);
  }).then(function (r) {
    assert.deepStrictEqual(r[0].seasons.map(function (s) { return s.n; }), [1, 2]);
    assert.deepStrictEqual(r[0].seasons[0].episodes.map(function (e) { return e.num; }), [1, 2]);
    assert.ok(/\/series\/joao\/segredo\/7001\.mp4$/.test(r[0].seasons[0].episodes[0].url));
    assert.strictEqual(r[1].year, '2020');
    assert.strictEqual(r[2][0].title, 'Jornal da Noite — ação', 'base64 UTF-8 decodificado');
  }).then(function () {
    var bad = Core.createXtream({ server: ctx.base, user: 'joao', pass: 'errada' }, httpText);
    return bad.login().then(function (l) { assert.strictEqual(l.ok, false); });
  });
});

t('Proxy CORS (token, redirect, cabeçalhos)', function (ctx) {
  var srv = proxyLib.create('tok123');
  return new Promise(function (resolve) { srv.listen(0, '127.0.0.1', resolve); }).then(function () {
    var port = srv.address().port, root = 'http://127.0.0.1:' + port + '/';
    return get(root + '?u=' + encodeURIComponent(ctx.base + '/redir') + '&t=tok123').then(function (r) {
      assert.strictEqual(r.status, 200);
      assert.strictEqual(r.headers['access-control-allow-origin'], '*');
      assert.ok(JSON.parse(r.body).user_info.auth === 1, 'seguiu o redirect');
      return get(root + '?u=' + encodeURIComponent(ctx.base + '/redir') + '&t=errado');
    }).then(function (r) {
      assert.strictEqual(r.status, 403);
      return get(root + '?u=file%3A%2F%2F%2Fetc%2Fpasswd&t=tok123');
    }).then(function (r) {
      assert.strictEqual(r.status, 400, 'só http(s)');
    });
  }).then(function () { srv.close(); }, function (e) { srv.close(); throw e; });
});

t('Proxy: troca de User-Agent e erro detalhado', function () {
  // servidor que derruba a conexão, exceto para clientes "okhttp"
  var picky = http.createServer(function (req, res) {
    if (/okhttp/.test(req.headers['user-agent'] || '')) { res.writeHead(200); res.end('ola'); } else { req.socket.destroy(); }
  });
  var srv = proxyLib.create('k');
  return Promise.all([
    new Promise(function (r) { picky.listen(0, '127.0.0.1', r); }),
    new Promise(function (r) { srv.listen(0, '127.0.0.1', r); })
  ]).then(function () {
    var root = 'http://127.0.0.1:' + srv.address().port + '/?t=k&u=';
    return get(root + encodeURIComponent('http://127.0.0.1:' + picky.address().port + '/')).then(function (r) {
      assert.strictEqual(r.status, 200);
      assert.strictEqual(r.body, 'ola', 'segunda tentativa (okhttp) deve funcionar');
      var dead = picky.address().port; picky.close();
      return new Promise(function (res) { setTimeout(res, 50); }).then(function () {
        return get(root + encodeURIComponent('http://127.0.0.1:' + dead + '/'));
      });
    }).then(function (r) {
      assert.strictEqual(r.status, 502);
      assert.ok(/ECONNREFUSED/.test(r.body), 'código real no corpo: ' + r.body);
    });
  }).then(function () { srv.close(); }, function (e) { srv.close(); picky.close(); throw e; });
});

var server = mock.create();
server.listen(0, '127.0.0.1', function () {
  var ctx = { base: 'http://127.0.0.1:' + server.address().port };
  var failed = 0;
  results.reduce(function (p, tc) {
    return p.then(function () { return tc.fn(ctx); }).then(function () { console.log('  ok   ' + tc.name); },
      function (e) { failed++; console.log('  FAIL ' + tc.name + '\n       ' + (e && e.stack || e)); });
  }, Promise.resolve()).then(function () {
    server.close();
    console.log(failed ? failed + ' teste(s) falharam' : 'todos os testes passaram');
    process.exit(failed ? 1 : 0);
  });
});
