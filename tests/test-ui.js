/* Teste de fumaça da interface em jsdom: login -> Início -> listas -> player -> detalhe -> série -> busca -> favoritos
   -> continuar assistindo -> configurações -> demo. A rede passa pelo proxy real (PalmServiceBridge simulado). */
var path = require('path');
var assert = require('assert');
var jsdom = require('jsdom');
var mock = require('./mock-server.js');
var proxyLib = require('../services/com.rodrigo.iptv.service/proxy.js');

var api = mock.create(), px = proxyLib.create('tok');
function listen(s) { return new Promise(function (r) { s.listen(0, '127.0.0.1', r); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

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
      // jsdom com file:// tem origem opaca (sem localStorage): usa um armazenamento em memória
      var mem = {};
      Object.defineProperty(w, 'localStorage', { configurable: true, value: {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
        setItem: function (k, v) { mem[k] = String(v); },
        removeItem: function (k) { delete mem[k]; }
      } });
      w.HTMLMediaElement.prototype.pause = function () {};
      w.HTMLMediaElement.prototype.load = function () {};
      w.PalmServiceBridge = function () {
        var self = this;
        this.call = function () { setTimeout(function () { self.onservicecallback(JSON.stringify({ returnValue: true, port: pport, token: 'tok' })); }, 0); };
      };
    }
  }).then(function (dom) {
    var w = dom.window, d = w.document;
    var $ = function (s) { return d.querySelector(s); }, $$ = function (s) { return [].slice.call(d.querySelectorAll(s)); };
    function key(code) { d.dispatchEvent(new w.KeyboardEvent('keydown', { keyCode: code, bubbles: true, cancelable: true })); }
    // navega pelo menu inicial: volta ao menu (se preciso) e abre a seção
    function go(sec) {
      if (sec === 'home') { if (!$('.hubtile')) { $('.backbtn').click(); } return; }
      if (!$('.hubtile')) { $('.backbtn').click(); }
      $('[data-sec="' + sec + '"]').click();
    }
    function waitFor(fn, label) {
      var t0 = Date.now();
      return (function loop() {
        var v; try { v = fn(); } catch (e) { v = false; }
        if (v) { return Promise.resolve(v); }
        if (Date.now() - t0 > 6000) { return Promise.reject(new Error('timeout: ' + label)); }
        return sleep(25).then(loop);
      })();
    }
    var step = function (n) { console.log('  ok   ' + n); };
    var video = $('#video'), vt = 0, vd = NaN;
    Object.defineProperty(video, 'currentTime', { get: function () { return vt; }, set: function (v) { vt = v; }, configurable: true });
    Object.defineProperty(video, 'duration', { get: function () { return vd; }, configurable: true });

    return waitFor(function () { return $('.login') && w.Weather; }, 'login').then(function () {
      // clima falso (a rede real não é usada nos testes)
      var wxCalls = [];
      w.Weather.init(function (u) {
        wxCalls.push(u);
        if (/geocoding/.test(u)) { return Promise.resolve(JSON.stringify({ results: [{ name: 'Campinas', admin1: 'São Paulo', country_code: 'BR', latitude: -22.9, longitude: -47.06 }] })); }
        return Promise.resolve(JSON.stringify({ current: { temperature_2m: 24.4, apparent_temperature: 25, weather_code: 2, is_day: 1 },
          daily: { temperature_2m_min: [17.2], temperature_2m_max: [28.6] } }));
      });
      var inputs = $$('.login input');
      assert.strictEqual(inputs.length, 3);
      inputs[0].value = base; inputs[1].value = 'joao'; inputs[2].value = 'errada';
      $('.btn.primary').click();
      return waitFor(function () { return /inválidos/.test($('.err') ? $('.err').textContent : ''); }, 'erro de login');
    }).then(function () {
      var inputs = $$('.login input');
      assert.deepStrictEqual(inputs.map(function (i) { return i.value; }), [base, 'joao', 'errada'], 'campos preservados');
      step('erro de login mantém os dados nos campos');
      inputs[2].value = 'segredo';
      $('.btn.primary').click();
      return waitFor(function () { return $$('.hubtile').length === 3; }, 'menu inicial');
    }).then(function () {
      assert.deepStrictEqual($$('.hubname').map(function (e) { return e.textContent; }), ['TV ao vivo', 'Filmes', 'Séries']);
      assert.ok($('.hubtile.focus'), 'foco no primeiro item do menu');
      assert.ok(!$('.side'), 'sem barra lateral');
      step('menu inicial: TV ao vivo / Filmes / Séries');
      return waitFor(function () { return $('.wx-t') && /24°/.test($('.wx-t').textContent); }, 'clima');
    }).then(function () {
      assert.ok(/Taubaté/.test($('.wx-c').textContent), 'cidade padrão');
      assert.ok(/17° \/ 29°/.test($('.wx-r').textContent) && /Parcialmente/.test($('.wx-r').textContent), $('.wx-r').textContent);
      step('clima na home (24°, mín/máx, cidade)');
      go('live');
      return waitFor(function () { return $$('.cat').length === 4 && $$('.row').length === 1; }, 'ao vivo');
    }).then(function () {
      assert.strictEqual($$('.card').length, 0, 'ao vivo só tem canais');
      return waitFor(function () { return /Jornal da Noite/.test($('.row .epg').textContent); }, 'epg na lista');
    }).then(function () {
      assert.ok($('.row .epgbar.on'), 'barra de progresso do programa');
      step('EPG do canal aparece na lista');
      assert.ok(/TV ao vivo/.test($('.sectitle').textContent));
      $$('.cat')[2].click();
      return waitFor(function () { return $$('.row').length === 2; }, 'cat esportes');
    }).then(function () {
      step('categorias ao vivo');
      $$('.row')[0].click();
      return waitFor(function () { return !$('#player').classList.contains('hidden') && $('#video').getAttribute('src'); }, 'player live');
    }).then(function () {
      assert.ok(/102\.m3u8$/.test($('#video').getAttribute('src')));
      key(38);
      return waitFor(function () { return /103\.m3u8$/.test($('#video').getAttribute('src') || ''); }, 'zap');
    }).then(function () {
      step('player ao vivo + troca de canal');
      // áudio e legenda: faixas expostas pelo player (simuladas) + tecla verde
      var vid = $('#video'), aud = [{ label: '', language: 'por', enabled: true }, { label: 'Dolby 5.1', language: 'eng', enabled: false }];
      Object.defineProperty(vid, 'audioTracks', { value: aud, configurable: true });
      var tt = vid.textTracks;
      vid.dispatchEvent(new w.Event('loadedmetadata'));
      key(404);
      assert.ok(!$('#tracks').classList.contains('hidden'), 'painel abre com a tecla verde');
      assert.deepStrictEqual($$('#tracks .topt .t-lbl').map(function (e) { return e.textContent; }), ['Português', 'Inglês · Dolby 5.1']);
      assert.ok(/não traz legendas/.test($('#tracks').textContent), 'sem legendas: aviso');
      $$('#tracks .topt')[1].click();
      assert.deepStrictEqual(aud.map(function (t) { return t.enabled; }), [false, true], 'troca o áudio');
      key(27);
      assert.ok($('#tracks').classList.contains('hidden') && !$('#player').classList.contains('hidden'), 'Voltar fecha só o painel');
      step('áudio e legenda: painel, troca de faixa, Voltar fecha só o painel');
      key(27);
      assert.ok($('#player').classList.contains('hidden'));
      go('movie');
      return waitFor(function () { return $$('.card').length === 1; }, 'filmes');
    }).then(function () {
      $$('.card')[0].click();
      return waitFor(function () { return !$('#detail').classList.contains('hidden') && /Assistir/.test($('#detail .btn.primary').textContent); }, 'detalhe filme');
    }).then(function () {
      return waitFor(function () { return /Um filme de teste/.test($('#detail .dplot').textContent); }, 'plot');
    }).then(function () {
      step('filmes + detalhe com sinopse');
      $('#detail .btn.primary').click();
      assert.ok(/501\.mkv$/.test($('#video').getAttribute('src')));
      vd = 3600; vt = 600; // simula 10 min assistidos de 1h
      key(27);
      assert.ok($('#player').classList.contains('hidden'));
      assert.ok(!$('#detail').classList.contains('hidden'), 'volta ao detalhe');
      assert.ok(/Continuar/.test($('#detail .btn.primary') ? $('#detail').textContent : ''), 'botão vira Continuar');
      key(27);
      assert.ok($('#detail').classList.contains('hidden'));
      go('series');
      return waitFor(function () { return $$('.card').length === 1; }, 'series');
    }).then(function () {
      $$('.card')[0].click();
      return waitFor(function () { return $$('#detail .chip').length === 2 && $$('#detail .ep').length === 2; }, 'episodios');
    }).then(function () {
      assert.deepStrictEqual($$('#detail .ep .en').map(function (e) { return e.textContent; }), ['E1', 'E2']);
      $$('#detail .ep')[0].click();
      assert.ok(/7001\.mp4$/.test($('#video').getAttribute('src')));
      step('séries -> temporadas -> episódio');
      vt = 0; vd = NaN;
      key(27); key(27);
      go('home');
      return waitFor(function () { return $$('.hrow-title').map(function (e) { return e.textContent; }).indexOf('Continuar assistindo') >= 0; }, 'continuar assistindo');
    }).then(function () {
      assert.ok($('.hubtile'), 'voltou ao menu');
      var w0 = $('.lcard .pbar .fill').getAttribute('style');
      assert.ok(/width:17%/.test(w0), 'barra de progresso ~17%: ' + w0);
      assert.ok(/50 min restantes/.test($('.lcard .ls').textContent), $('.lcard .ls').textContent);
      assert.ok($$('.hrow-title').map(function (e) { return e.textContent; }).indexOf('Canais recentes') >= 0, 'canais recentes');
      step('menu: Continuar assistindo (progresso) + canais recentes');
      $('.lcard').click(); // Continuar
      assert.ok(/501\.mkv$/.test($('#video').getAttribute('src')));
      vt = 0; vd = NaN;
      key(27);
      go('search');
      return waitFor(function () { return $('#q'); }, 'busca');
    }).then(function () {
      $('#q').value = 'esporte';
      $('#q').focus();
      key(13);
      return waitFor(function () { return $$('.card').length === 2; }, 'resultados');
    }).then(function () {
      step('busca global');
      $$('.card')[0].classList.add('focus');
      key(403);
      assert.ok($$('.card')[0].classList.contains('isfav'), 'estrela aparece');
      go('fav');
      return waitFor(function () { return $$('.card').length === 1; }, 'favoritos');
    }).then(function () {
      step('favoritos');
      go('settings');
      return waitFor(function () { return $('.settings .sgroup'); }, 'config');
    }).then(function () {
      var txt = $('.settings').textContent;
      assert.ok(/127\.0\.0\.1/.test(txt) && /joao/.test(txt) && /1\.5\.3/.test(txt));
      assert.strictEqual($$('.swrow').length, 3, 'três chaves');
      step('configurações');
      // ocultar SD / HD: a categoria "Filmes e séries 24h" tem Cine HD, Cine SD e Cine FHD
      $$('.swrow')[1].click(); // SD
      assert.ok($$('.sw')[1].classList.contains('on'));
      $$('.swrow')[2].click(); // HD
      $('.backbtn').click();
      go('live');
      return waitFor(function () { return $$('.cat').length === 4; }, 'ao vivo de novo');
    }).then(function () {
      $$('.cat')[3].click();
      return waitFor(function () { return $$('.row').length === 1; }, 'só o FHD sobra');
    }).then(function () {
      assert.ok(/Cine FHD/.test($('.row .name').textContent), 'FHD não é ocultado');
      step('ocultar canais SD e HD (FHD continua)');
      $('.backbtn').click();
      go('settings');
      return waitFor(function () { return $('.settings .sgroup'); }, 'config 2');
    }).then(function () {
      $$('.swrow')[1].click(); $$('.swrow')[2].click(); // desliga os dois
      // cidade do clima
      $('#city').value = 'Campinas';
      $('#city').focus();
      key(13);
      return waitFor(function () { return $$('.cityres .btn').length === 1; }, 'resultado da cidade');
    }).then(function () {
      assert.ok(/Campinas — São Paulo/.test($('.cityres .btn').textContent));
      $('.cityres .btn').click();
      assert.ok(/Campinas/.test($('.settings').textContent), 'cidade atualizada');
      $('.backbtn').click();
      return waitFor(function () { return $('.wx-c') && /Campinas/.test($('.wx-c').textContent); }, 'clima da nova cidade');
    }).then(function () {
      step('cidade do clima editável nas configurações');
      go('settings');
      return waitFor(function () { return $('.settings .sgroup'); }, 'config 3');
    }).then(function () {
      // editar servidor: abre o login já preenchido, com Cancelar
      $$('.settings .btn')[0].click();
      return waitFor(function () { return $('.login'); }, 'editar servidor');
    }).then(function () {
      assert.strictEqual($$('.login input')[1].value, 'joao');
      assert.strictEqual($$('.login .btn').length, 2, 'Entrar + Cancelar');
      $$('.login .btn')[1].click(); // Cancelar
      return waitFor(function () { return $('.settings .sgroup'); }, 'volta às configurações');
    }).then(function () {
      step('editar servidor (preenchido, com cancelar)');
      $$('.settings .btn')[1].click(); // Trocar conta / Sair
      return waitFor(function () { return $('.login'); }, 'logout');
    }).then(function () {
      assert.strictEqual($$('.login input')[1].value, 'joao', 'logout mantém usuário');
      assert.strictEqual($$('.login .btn').length, 1, 'login sem modo demonstração');
      assert.ok(/MASTER IPTV/.test($('.login .logo').textContent));
      step('logout volta ao login (sem demonstração, nome Master IPTV)');
      assert.deepStrictEqual(errors, [], 'erros de script: ' + errors.join(' | '));
      console.log('UI ok');
    });
  });
}).then(function () { api.close(); px.close(); process.exit(0); }, function (e) {
  console.error('  FAIL ' + (e && e.stack || e)); process.exit(1);
});
