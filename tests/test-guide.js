/* Testes do Guia de programação (app/js/guide.js): funções puras + interface em jsdom, com o app real e um servidor Xtream falso.
   Rodar: node tests/test-guide.js */
var path = require('path');
var assert = require('assert');
var http = require('http');
var url = require('url');
var jsdom = require('jsdom');
var Guide = require('../app/js/guide.js');
var mock = require('./mock-server.js');
var proxyLib = require('../services/com.rodrigo.iptv.service/proxy.js');

var MIN = 60000;
function b64(s) { return Buffer.from(s, 'utf8').toString('base64'); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function step(n) { console.log('  ok   ' + n); }

/* ---------------- parte 1: funções puras ---------------- */

(function pure() {
  var now = Date.UTC(2026, 9, 29, 21, 40, 0);   // instante fixo
  var sec = function (ms) { return String(Math.round(ms / 1000)); };

  // base64 em UTF-8; texto puro continua intacto
  assert.strictEqual(Guide.b64dec(b64('Jornal da Noite — ação')), 'Jornal da Noite — ação');
  assert.strictEqual(Guide.b64dec('Jornal'), 'Jornal', 'tamanho que não é de base64');
  assert.strictEqual(Guide.b64dec('News'), 'News', 'parece base64 mas não é UTF-8 válido');
  assert.strictEqual(Guide.b64dec(''), '');
  step('puras: base64 UTF-8 e texto puro');

  var raw = [
    { title: b64('B'), start_timestamp: sec(now + 30 * MIN), stop_timestamp: sec(now + 60 * MIN) },
    { title: b64('A'), description: b64('  desc   com   espaços '), start_timestamp: sec(now), stop_timestamp: sec(now + 30 * MIN) },
    { title: b64('Duplicado'), start_timestamp: sec(now + 30 * MIN), stop_timestamp: sec(now + 45 * MIN) },   // contido em B
    { title: b64('C'), start_timestamp: sec(now + 55 * MIN), stop_timestamp: sec(now + 90 * MIN) },           // sobrepõe o fim de B
    { title: b64('Velho'), start_timestamp: sec(now - 20 * 3600000), stop_timestamp: sec(now - 19 * 3600000) },
    { title: b64('Longe'), start_timestamp: sec(now + 100 * 3600000), stop_timestamp: sec(now + 101 * 3600000) },
    { title: b64('Sem fim'), start_timestamp: sec(now) },
    { title: b64(''), start: '2026-10-29 23:00:00', end: '2026-10-29 23:30:00' },
    null
  ];
  var n = Guide.normalize(raw, now);
  assert.deepStrictEqual(n.map(function (p) { return p.t; }), ['A', 'B', 'C', 'Sem título'], 'ordena, descarta contido/velho/longe/sem fim');
  assert.strictEqual(n[1].e, n[2].s, 'sobreposição parcial: corta o anterior');
  assert.strictEqual(n[0].d, 'desc com espaços', 'espaços normalizados');
  assert.strictEqual(n[3].s, new Date(2026, 9, 29, 23, 0, 0).getTime(), 'data em texto é hora local');
  assert.deepStrictEqual(Guide.normalize(null, now), []);
  assert.deepStrictEqual(Guide.normalize({ x: 1 }, now), []);
  step('puras: normalize (ordem, sobreposição, duplicados, janela, datas em texto)');

  var list = [{ s: 100, e: 200 }, { s: 200, e: 300 }, { s: 400, e: 500 }];
  assert.strictEqual(Guide.findAt(list, 150), 0);
  assert.strictEqual(Guide.findAt(list, 200), 1, 'fim é exclusivo');
  assert.strictEqual(Guide.findAt(list, 350), 2, 'buraco: próximo');
  assert.strictEqual(Guide.findAt(list, 900), 2, 'depois do fim: último');
  assert.strictEqual(Guide.findAt(list, 10), 0, 'antes do começo: primeiro');
  assert.strictEqual(Guide.findAt([], 1), -1);
  assert.strictEqual(Guide.findAt(null, 1), -1);
  step('puras: findAt');

  var ws = 1000 * MIN, we = ws + 180 * MIN, ppm = 8;
  var L = Guide.layout([
    { s: ws - 60 * MIN, e: ws + 30 * MIN },       // começa antes
    { s: ws + 30 * MIN, e: ws + 90 * MIN },
    { s: we - 30 * MIN, e: we + 60 * MIN },       // termina depois
    { s: we, e: we + 30 * MIN },                  // fora
    { s: ws - 90 * MIN, e: ws }                   // fora
  ], ws, we, ppm);
  assert.deepStrictEqual(L.map(function (x) { return x.i; }), [0, 1, 2]);
  assert.deepStrictEqual([L[0].left, L[0].width, L[0].cl, L[0].cr], [0, 30 * 8, true, false]);
  assert.deepStrictEqual([L[1].left, L[1].width], [30 * 8, 60 * 8]);
  assert.deepStrictEqual([L[2].left, L[2].width, L[2].cr], [150 * 8, 30 * 8, true]);
  step('puras: layout (recorte nas bordas, blocos fora da janela)');

  var base = Guide.floorSlot(Date.UTC(2026, 9, 29, 12, 0, 0));
  assert.strictEqual(Guide.shiftWindow(base, 180 * MIN, base + 60 * MIN), base, 'dentro: não mexe');
  assert.strictEqual(Guide.shiftWindow(base, 180 * MIN, base - 10 * MIN), Guide.floorSlot(base - 10 * MIN), 'antes: volta');
  assert.strictEqual(Guide.shiftWindow(base, 180 * MIN, base + 170 * MIN), Guide.floorSlot(base + 140 * MIN), 'perto da borda direita: avança');
  var f = new Date(Guide.floorSlot(new Date(2026, 9, 29, 20, 47, 31).getTime()));
  assert.deepStrictEqual([f.getHours(), f.getMinutes(), f.getSeconds()], [20, 30, 0]);
  var f2 = new Date(Guide.floorSlot(new Date(2026, 9, 29, 20, 5, 0).getTime()));
  assert.deepStrictEqual([f2.getHours(), f2.getMinutes()], [20, 0]);
  step('puras: shiftWindow e floorSlot');

  var t0 = new Date(2026, 9, 29, 12, 0, 0).getTime();
  assert.strictEqual(Guide.dayLabel(t0, t0), 'HOJE');
  assert.strictEqual(Guide.dayLabel(t0 + 24 * 3600000, t0), 'AMANHÃ');
  assert.strictEqual(Guide.dayLabel(t0 - 24 * 3600000, t0), 'ONTEM');
  assert.ok(/^[A-ZÁ]{3} \d\d\/\d\d$/.test(Guide.dayLabel(t0 + 3 * 24 * 3600000, t0)));
  step('puras: dayLabel');
})();

/* ---------------- parte 2: interface no app real ---------------- */

// 12 programas de 30 min a partir de 1 h antes do início do teste
var BASE = Guide.floorSlot(Date.now()) - 60 * MIN;
function epgFor() {
  var out = [], i;
  for (i = 0; i < 12; i++) {
    out.push({ title: b64('Prog ' + i), description: b64('Descrição ' + i), start_timestamp: String(Math.round((BASE + i * 30 * MIN) / 1000)),
      stop_timestamp: String(Math.round((BASE + (i + 1) * 30 * MIN) / 1000)) });
  }
  return out;
}

var inner = mock.create().listeners('request')[0];
var epgCalls = { simple: {}, short: {} };
var api = http.createServer(function (req, res) {
  var u = url.parse(req.url, true), q = u.query;
  if (u.pathname === '/player_api.php' && q.username === 'joao' && q.password === 'segredo' &&
      (q.action === 'get_simple_data_table' || q.action === 'get_short_epg')) {
    var kind = q.action === 'get_simple_data_table' ? 'simple' : 'short';
    epgCalls[kind][q.stream_id] = (epgCalls[kind][q.stream_id] || 0) + 1;
    if (q.stream_id === '101') {   // dia inteiro pela tabela
      if (kind === 'simple') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ epg_listings: epgFor() })); }
    }
    if (q.stream_id === '103' && kind === 'simple') { res.writeHead(500); return res.end('erro'); }                 // tabela falha -> usa o EPG curto
    if (q.stream_id === '104') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"epg_listings":[]}'); }   // sem nada
    if (q.stream_id === '102' && kind === 'simple') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"epg_listings":[]}'); }   // vazio -> EPG curto
  }
  return inner(req, res);
});
var px = proxyLib.create('tok');
function listen(s) { return new Promise(function (r) { s.listen(0, '127.0.0.1', r); }); }

Promise.all([listen(api), listen(px)]).then(function () {
  var base = 'http://127.0.0.1:' + api.address().port, pport = px.address().port;
  var errors = [];
  var vc = new jsdom.VirtualConsole();
  vc.on('jsdomError', function (e) { if (!/mpegts|hls|Not implemented/i.test(String(e.message))) { errors.push(e.message); } });

  return jsdom.JSDOM.fromFile(path.join(__dirname, '../app/index.html'), {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse: function (w) {
      w.Element.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, right: 100, bottom: 50, width: 100, height: 50 }; };
      w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
      w.HTMLMediaElement.prototype.pause = function () {};
      w.HTMLMediaElement.prototype.load = function () {};
      var mem = {};
      Object.defineProperty(w, 'localStorage', { configurable: true, value: {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
        setItem: function (k, v) { mem[k] = String(v); },
        removeItem: function (k) { delete mem[k]; }
      } });
      w.PalmServiceBridge = function () {
        var self = this;
        this.call = function () { setTimeout(function () { self.onservicecallback(JSON.stringify({ returnValue: true, port: pport, token: 'tok' })); }, 0); };
      };
    }
  }).then(function (dom) {
    var w = dom.window, d = w.document;
    var $ = function (s) { return d.querySelector(s); }, $$ = function (s) { return [].slice.call(d.querySelectorAll(s)); };
    function key(code) { d.dispatchEvent(new w.KeyboardEvent('keydown', { keyCode: code, bubbles: true, cancelable: true })); }
    function waitFor(fn, label) {
      var t0 = Date.now();
      return (function loop() {
        var v; try { v = fn(); } catch (e) { v = false; }
        if (v) { return Promise.resolve(v); }
        if (Date.now() - t0 > 6000) { return Promise.reject(new Error('timeout: ' + label + ' | tela: ' + ($('.gd') ? $('.gd').textContent.slice(0, 300) : ($('#app') || {}).textContent))); }
        return sleep(25).then(loop);
      })();
    }
    var rowNames = function () { return $$('.gd-row .gd-name').map(function (e) { return e.textContent; }); };
    var rowOf = function (name) { return $$('.gd-row').filter(function (r) { return r.querySelector('.gd-name').textContent === name; })[0]; };
    var title = function () { return $('.gd-title').textContent; };
    var focused = function () { return $$('.gd-p.focus').map(function (e) { return e.querySelector('.gd-pt').textContent; }); };
    // abre o seletor (Verde), anda com ↑/↓ até a categoria e confirma com OK
    function pickCat(name) {
      key(404);
      var names = $$('.gd-pick-i').map(function (e) { return e.textContent; }), guard = 0;
      while ($('.gd-pick-i.on').textContent !== name && guard++ < 30) {
        key(names.indexOf(name) < names.indexOf($('.gd-pick-i.on').textContent) ? 38 : 40);
      }
      key(13);
    }
    var video = $('#video');
    Object.defineProperty(video, 'currentTime', { get: function () { return 0; }, set: function () {}, configurable: true });
    Object.defineProperty(video, 'duration', { get: function () { return NaN; }, configurable: true });

    return waitFor(function () { return $('.login') && w.Weather; }, 'login').then(function () {
      w.Weather.init(function () { return Promise.resolve('{}'); });
      var inputs = $$('.login input');
      inputs[0].value = base; inputs[1].value = 'joao'; inputs[2].value = 'segredo';
      $('.btn.primary').click();
      return waitFor(function () { return $$('.hubtile').length === 3; }, 'menu inicial');
    }).then(function () {
      var links = $$('.hub-links .btn').map(function (e) { return e.textContent; });
      assert.deepStrictEqual(links, ['Guia', 'Buscar', 'Favoritos', 'Configurações']);
      assert.strictEqual($$('.hubtile').length, 3, 'o Guia não vira um quarto bloco grande');
      step('menu inicial: link "Guia" ao lado de Buscar / Favoritos / Configurações');
      $('[data-sec="guide"]').click();
      return waitFor(function () { return rowNames().length === 1; }, 'guia abriu');
    }).then(function () {
      assert.deepStrictEqual(rowNames(), ['Canal Notícias'], 'começa na primeira categoria');
      assert.ok(/Guia/.test($('.sectitle').textContent), 'título da seção');
      assert.ok(/Verde: categorias/.test($('.hints').textContent), 'dicas do Guia na barra de baixo');
      assert.strictEqual($('.gd-cat').textContent, 'Notícias');
      assert.ok(!$('.hubtile'), 'saiu do menu');
      return waitFor(function () { return focused().length === 1 && /^Prog \d+$/.test(focused()[0]); }, 'programa em foco');
    }).then(function () {
      var f = focused()[0];
      assert.strictEqual(title(), f, 'painel de informações acompanha o foco');
      assert.ok(/Descrição \d+/.test($('.gd-desc').textContent));
      assert.ok(/\d\d:\d\d – \d\d:\d\d  ·  30 min/.test($('.gd-meta').textContent), $('.gd-meta').textContent);
      assert.ok($('.gd-p.on'), 'programa no ar destacado');
      assert.ok($('.gd-p.on .gd-pg'), 'barra de progresso do programa no ar');
      assert.ok($('.gd-now') && $('.gd-now').style.display === 'block', 'linha do agora');
      assert.ok(/^\d\d:\d\d$/.test($('.gd-now span').textContent));
      assert.ok($$('.gd-rl').length === 6, 'régua: 6 marcas de meia hora (janela de 3 h)');
      assert.ok($('.gd-p.past'), 'programa que já passou fica esmaecido');
      assert.ok(epgCalls.simple['101'] === 1, 'uma busca do dia inteiro por canal visível');
      step('grade: linha do tempo, "no ar", progresso, painel de informações, foco');

      // setas: próximo e anterior
      var idx = +/\d+/.exec(focused()[0])[0];
      key(39);
      assert.strictEqual(focused()[0], 'Prog ' + (idx + 1), 'direita: próximo programa');
      key(37); key(37);
      assert.strictEqual(focused()[0], 'Prog ' + (idx - 1), 'esquerda: programa anterior');
      var first0 = $$('.gd-rl')[0].textContent;
      var i;
      for (i = 0; i < 12; i++) { key(39); }
      assert.strictEqual(focused()[0], 'Prog 11', 'para no último programa');
      assert.notStrictEqual($$('.gd-rl')[0].textContent, first0, 'a janela de tempo andou para a direita');
      assert.ok($('.gd-p.cl') || $$('.gd-p').length > 0, 'ainda há blocos na tela');
      for (i = 0; i < 20; i++) { key(37); }
      assert.strictEqual(focused()[0].indexOf('Prog '), 0);
      assert.ok(Number(/\d+/.exec(focused()[0])[0]) <= 1, 'voltou para o começo');
      step('setas ← →: próximo/anterior programa, limites e janela de tempo acompanhando');

      // Amarelo: volta para o "agora"
      key(405);
      assert.strictEqual(focused().length, 1);
      assert.ok(/^\d\d:\d\d$/.test($('.gd-now span').textContent) && $('.gd-now').style.display === 'block');
      assert.ok($('.gd-p.focus').classList.contains('on'), 'Amarelo: foco no programa que está no ar');
      step('Amarelo: volta para o agora');

      // seletor de categoria
      key(404);
      assert.ok($('.gd-pick') && $('.gd-pick').style.display === 'block');
      assert.deepStrictEqual($$('.gd-pick-i').map(function (e) { return e.textContent; }), ['Notícias', 'Esportes', 'Filmes e séries 24h', 'Todos os canais']);
      assert.ok($('.gd-pick-i.on').textContent === 'Notícias', 'abre na categoria atual');
      key(27);
      assert.strictEqual($('.gd-pick').style.display, 'none', 'Voltar fecha só o seletor');
      assert.ok($('.gd-row'), 'continua no Guia');
      key(404); key(40); key(40); key(40); key(13);
      return waitFor(function () { return rowNames().length === 6; }, 'todos os canais');
    }).then(function () {
      assert.strictEqual($('.gd-cat').textContent, 'Todos os canais');
      assert.strictEqual($('.gd-cnt').textContent, '1 de 6');
      assert.strictEqual($('.gd-row.sel .gd-name').textContent, 'Canal Notícias');
      step('Verde: seletor de categorias (abre, navega, Voltar, escolhe)');
      return waitFor(function () { return /Jornal da Noite/.test(rowOf('Canal Esporte 1').textContent) && /Jornal da Noite/.test(rowOf('Canal Esporte 2').textContent) && /indisponível/.test(rowOf('Cine HD').textContent); }, 'epg das outras linhas');
    }).then(function () {
      assert.ok(/Sem programação para este canal/.test(rowOf('Cine SD').textContent), 'canal sem epg_channel_id');
      assert.ok(!epgCalls.simple['105'] && !epgCalls.short['105'], 'canal sem id de EPG nem é consultado');
      assert.ok(epgCalls.short['102'] >= 1, 'tabela vazia -> usa o EPG curto');
      assert.ok(epgCalls.short['103'] >= 1, 'tabela com erro -> usa o EPG curto');
      assert.ok(rowOf('Canal Esporte 1').querySelector('.gd-p.cl.cr'), 'programa que continua dos dois lados mostra as setinhas');
      step('EPG por linha: tabela, fallback para EPG curto, sem dados e sem id');

      // descer e subir
      key(40);
      assert.strictEqual($('.gd-row.sel .gd-name').textContent, 'Canal Esporte 1');
      assert.strictEqual($('.gd-cnt').textContent, '2 de 6');
      assert.strictEqual(title(), 'Jornal da Noite — ação');
      key(40); key(40);
      assert.ok(/Programação indisponível/.test(title() + $('.gd-desc').textContent), 'linha sem dados mostra aviso no painel');
      key(40);
      assert.strictEqual($('.gd-row.sel .gd-name').textContent, 'Cine SD');
      assert.ok(/Sem programação para este canal/.test($('.gd-desc').textContent));
      key(39); key(39);
      assert.strictEqual($('.gd-row.sel .gd-name').textContent, 'Cine SD', 'setas laterais em linha sem dados não quebram');
      key(38); key(38); key(38); key(38); key(38); key(38); key(38);
      assert.strictEqual($('.gd-row.sel .gd-name').textContent, 'Canal Notícias', 'não passa do topo');
      step('setas ↑ ↓: troca de canal, linhas sem dados, limites');

      // favoritar
      key(403);
      assert.ok(rowOf('Canal Notícias').querySelector('.gd-fav'), 'estrela na coluna do canal');
      key(404);
      assert.strictEqual($$('.gd-pick-i')[0].textContent, 'Favoritos', 'categoria Favoritos aparece (primeira da lista)');
      key(27);
      pickCat('Favoritos');
      return waitFor(function () { return rowNames().length === 1 && $('.gd-cat').textContent === 'Favoritos'; }, 'favoritos');
    }).then(function () {
      assert.deepStrictEqual(rowNames(), ['Canal Notícias']);
      key(403);   // desfavorita: sem favoritos sobrando, sai da categoria
      return waitFor(function () { return $('.gd-cat').textContent === 'Notícias' && rowNames().length === 1; }, 'saiu de favoritos');
    }).then(function () {
      assert.ok(!rowOf('Canal Notícias').querySelector('.gd-fav'));
      step('Vermelho: favorita/desfavorita e a categoria Favoritos some quando esvazia');

      // OK abre o canal; Voltar minimiza; o Guia continua; Amarelo/Azul seguem sendo do mini player
      key(13);
      return waitFor(function () { return !$('#player').classList.contains('hidden') && /101\.m3u8$/.test($('#video').getAttribute('src') || ''); }, 'player');
    }).then(function () {
      key(27);
      assert.ok($('#player').classList.contains('mini'), 'Voltar minimiza o player');
      assert.ok($('.gd-row'), 'Guia continua montado atrás do mini player');
      key(405);
      assert.ok(!$('#player').classList.contains('mini'), 'com mini player, Amarelo amplia (não é "agora")');
      key(27); key(406);
      assert.ok($('#player').classList.contains('hidden'), 'Azul fecha o mini player');
      step('OK assistir; Voltar/Amarelo/Azul continuam do mini player');

      // Voltar sai do Guia, restaura as dicas e solta tudo
      key(27);
      return waitFor(function () { return $$('.hubtile').length === 3; }, 'voltou ao menu');
    }).then(function () {
      assert.ok(!Guide.isOpen() && !w.Guide.isOpen(), 'módulo fechado');
      assert.ok(/Setas: mover/.test($('.hints').textContent) && !/Verde: categorias/.test($('.hints').textContent), 'dicas originais de volta');
      assert.ok($('[data-sec="guide"].focus'), 'foco volta no link do Guia');
      step('Voltar: sai do Guia, dicas restauradas, foco no link');

      // reabrir lembra a última categoria
      $('[data-sec="guide"]').click();
      return waitFor(function () { return $('.gd-row') && $('.gd-cat').textContent === 'Notícias'; }, 'reabrir');
    }).then(function () {
      pickCat('Esportes');
      return waitFor(function () { return $('.gd-cat').textContent === 'Esportes' && rowNames().length === 2; }, 'esportes');
    }).then(function () {
      key(27);
      return waitFor(function () { return $$('.hubtile').length === 3; }, 'menu');
    }).then(function () {
      $('[data-sec="guide"]').click();
      return waitFor(function () { return $('.gd-row') && $('.gd-cat').textContent === 'Esportes'; }, 'lembrou categoria');
    }).then(function () {
      step('reabrir: lembra a última categoria');
      assert.deepStrictEqual(errors, [], 'sem erros de script: ' + errors.join(' | '));
      step('nenhum erro de script durante o teste');
      key(27);
      dom.window.close();
    });
  });
}).then(function () {
  console.log('Guia ok');
  process.exit(0);
}, function (e) {
  console.error('FALHOU:', e && e.stack || e);
  process.exit(1);
});
