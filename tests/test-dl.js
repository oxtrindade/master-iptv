/* Teste dos downloads offline (app Android no celular) com uma ponte NativeApp simulada em jsdom:
   botão Baixar em filme e episódios, tela Downloads, tocar do arquivo local e abrir sem internet.
   Rodar: node tests/test-dl.js */
var path = require('path');
var assert = require('assert');
var jsdom = require('jsdom');
var mock = require('./mock-server.js');

var api = mock.create();
// no app Android o WebView ignora o CORS; em jsdom liberamos aqui (o servidor de teste não envia os cabeçalhos)
api.prependListener('request', function (req, res) { res.setHeader('Access-Control-Allow-Origin', '*'); });
function listen(s) { return new Promise(function (r) { s.listen(0, '127.0.0.1', r); }); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function step(n) { console.log('  ok   ' + n); }

/* "Android" simulado: o que o DownloadManager faria */
var dlState = {}, nextId = 41, failQuery = false, removed = [];
var LOCAL = 'file:///storage/emulated/0/Android/data/com.rodrigo.iptv/files/Movies/';
var bgCalls = [];
function makeNative() {
  return {
    isTv: function () { return false; },
    setFullscreen: function () {}, setPlaying: function () {}, exit: function () {},
    setBackground: function (on) { bgCalls.push(on); },
    dlStart: function (url, file, title, wifi, ua) {
      var id = nextId++;
      dlState[id] = { id: id, url: url, file: file, title: title, wifi: wifi, ua: ua, s: 'running', b: 100, t: 1000, r: 0 };
      return String(id);
    },
    dlStatus: function (csv) {
      if (failQuery) { return null; }
      var ids = csv.split(',').map(Number);
      return JSON.stringify(ids.filter(function (id) { return dlState[id]; }).map(function (id) {
        var x = dlState[id], o = { id: id, s: x.s, b: x.b, t: x.t, r: x.r };
        if (x.s === 'done') { o.u = LOCAL + x.file; }
        return o;
      }));
    },
    dlRemove: function (id) { removed.push(Number(id)); delete dlState[Number(id)]; return true; },
    dlFree: function () { return '5300000000'; },
    getBrightness: function () { return '0.5'; },
    setBrightness: function (v) { gest.bri.push(v); },
    getVolume: function () { return '0.5'; },
    setVolume: function (v) { gest.vol.push(v); }
  };
}

var gest = { bri: [], vol: [] };
var memRef = null;
function open(seed) {
  var vc = new jsdom.VirtualConsole(), errors = [];
  vc.on('jsdomError', function (e) { if (!/mpegts|hls|Not implemented|Could not load iframe|responseStart/i.test(String(e.message))) { errors.push(e.message); } });
  return jsdom.JSDOM.fromFile(path.join(__dirname, '../app/index.html'), {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse: function (w) {
      w.Element.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, right: 100, bottom: 50, width: 100, height: 50 }; };
      w.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
      w.HTMLMediaElement.prototype.pause = function () {};
      w.HTMLMediaElement.prototype.load = function () {};
      var mem = seed ? JSON.parse(JSON.stringify(seed)) : {};
      memRef = mem;
      Object.defineProperty(w, 'localStorage', { configurable: true, value: {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
        setItem: function (k, v) { mem[k] = String(v); },
        removeItem: function (k) { delete mem[k]; }
      } });
      w.NativeApp = makeNative();   // o app Android injeta isto antes de carregar a página
    }
  }).then(function (dom) { dom.errors = errors; return dom; });
}

function tools(dom) {
  var w = dom.window, d = w.document;
  var t = {
    w: w,
    $: function (s) { return d.querySelector(s); },
    $$: function (s) { return [].slice.call(d.querySelectorAll(s)); },
    key: function (code) { d.dispatchEvent(new w.KeyboardEvent('keydown', { keyCode: code, bubbles: true, cancelable: true })); },
    waitFor: function (fn, label) {
      var t0 = Date.now();
      return (function loop() {
        var v; try { v = fn(); } catch (e) { v = false; }
        if (v) { return Promise.resolve(v); }
        if (Date.now() - t0 > 7000) { return Promise.reject(new Error('timeout: ' + label + ' | tela: ' + d.body.textContent.replace(/\s+/g, ' ').slice(0, 300))); }
        return sleep(25).then(loop);
      })();
    },
    btn: function (txt, scope) {
      return t.$$((scope || '') + ' .btn, ' + (scope || '') + ' button').filter(function (b) { return b.textContent.indexOf(txt) >= 0; })[0];
    },
    ls: function (k) { var v = w.localStorage.getItem('iptv.' + k); return v ? JSON.parse(v) : null; }
  };
  return t;
}

var base;
listen(api).then(function () {
  base = 'http://127.0.0.1:' + api.address().port;
  return open();
}).then(function (dom) {
  var T = tools(dom), $ = T.$, $$ = T.$$, key = T.key, waitFor = T.waitFor, w = T.w;
  var video = $('#video'), vt = 0, vd = NaN;
  Object.defineProperty(video, 'currentTime', { get: function () { return vt; }, set: function (v) { vt = v; }, configurable: true });
  Object.defineProperty(video, 'duration', { get: function () { return vd; }, configurable: true });

  return waitFor(function () { return $('.login') && w.Weather; }, 'login').then(function () {
    w.Weather.init(function () { return Promise.reject(new Error('sem clima nos testes')); });
    var inputs = $$('.login input');
    inputs[0].value = base; inputs[1].value = 'joao'; inputs[2].value = 'segredo';
    $('.btn.primary').click();
    return waitFor(function () { return $('.hubtab') || $('.hubtile'); }, 'início');
  }).then(function () {
    assert.ok(w.document.body.classList.contains('phone'), 'o app se reconhece como celular Android');
    assert.ok($('.hubtab'), 'celular: abas no topo por padrão');
    $('.menubtn').click();
    assert.ok($('.drawer-dl'), 'menu lateral tem Downloads');
    key(461);
    assert.ok($('.drawer').classList.contains('hidden'));
    assert.strictEqual(bgCalls[bgCalls.length - 1], true, 'segundo plano já vem ligado no celular');
    step('celular: menu lateral com Downloads');
    $('.hubtab[data-sec="movie"]').click();
    return waitFor(function () { return $$('.card').length === 1; }, 'filmes');
  }).then(function () {
    $$('.card')[0].click();
    return waitFor(function () { return !$('#detail').classList.contains('hidden') && T.btn('Baixar', '#detail'); }, 'botão Baixar no filme');
  }).then(function () {
    T.btn('Baixar', '#detail').click();
    var ids = Object.keys(dlState);
    assert.strictEqual(ids.length, 1, 'um download enfileirado');
    var x = dlState[ids[0]];
    assert.ok(/\/movie\/joao\/segredo\/501\.mkv$/.test(x.url), 'baixa o arquivo do filme: ' + x.url);
    assert.strictEqual(x.file, 'iptv-m-501.mkv');
    assert.strictEqual(x.wifi, true, 'só no Wi-Fi por padrão');
    assert.ok(/Filme Teste/.test(x.title) && x.ua.length > 0, 'título e User-Agent enviados');
    assert.ok(T.ls('dl')['m:501'], 'guardado na lista de downloads');
    assert.ok(/Baixando/.test($('#detail').textContent) && !T.btn('Baixar', '#detail'), 'botão vira "Baixando…"');
    T.btn('Baixando', '#detail').click();   // abre a tela Downloads
    return waitFor(function () { return $$('.dlrow').length === 1; }, 'tela Downloads');
  }).then(function () {
    assert.ok(/Downloads/.test($('.sectitle').textContent));
    assert.ok(/Baixando 10% · 100 KB de 1 KB|Baixando 10%/.test($('.dlst').textContent), $('.dlst').textContent);
    assert.ok(/Espaço livre no celular: 5,3 GB/.test($('.dlfree').textContent), 'espaço livre');
    assert.ok(!T.btn('Assistir', '.dlrow'), 'ainda não dá para assistir');
    step('baixar filme e acompanhar o andamento');
    var x = dlState[Object.keys(dlState)[0]];
    x.s = 'done'; x.b = x.t = 3000000000;
    return waitFor(function () { return T.btn('Assistir', '.dlrow'); }, 'download concluído');
  }).then(function () {
    assert.ok(/Baixado · 3,0 GB/.test($('.dlst').textContent), $('.dlst').textContent);
    T.btn('Assistir', '.dlrow').click();
    assert.strictEqual($('#video').getAttribute('src'), LOCAL + 'iptv-m-501.mkv', 'toca do arquivo no celular');
    vd = 3600; vt = 900;
    function touch(type, x, y) {
      var ev = new w.Event(type, { bubbles: true, cancelable: true });
      ev.touches = type === 'touchend' ? [] : [{ clientX: x, clientY: y }];
      $('#video').dispatchEvent(ev);
    }
    touch('touchstart', 20, 40); touch('touchmove', 20, 30); touch('touchmove', 20, 20); touch('touchend');
    assert.ok(gest.bri.length >= 1 && gest.bri[gest.bri.length - 1] > 0.5 && gest.vol.length === 0, 'esquerda para cima aumenta o brilho');
    assert.ok(/Brilho/.test($('#gest').textContent), 'mostra o indicador de brilho');
    touch('touchstart', 20, 5); touch('touchmove', 20, 20); touch('touchmove', 20, 45); touch('touchend');
    assert.strictEqual(gest.bri[gest.bri.length - 1], -1, 'brilho no mínimo volta ao automático');
    assert.ok(/autom/.test($('#gest').textContent), 'indicador mostra "automático"');
    touch('touchstart', 80, 10); touch('touchmove', 80, 25); touch('touchmove', 80, 40); touch('touchend');
    assert.ok(gest.vol.length >= 1 && gest.vol[gest.vol.length - 1] < 0.5, 'direita para baixo diminui o volume');
    touch('touchstart', 50, 25); touch('touchmove', 60, 25); touch('touchmove', 80, 25); touch('touchend');
    assert.strictEqual(vt, 954, 'arrastar de lado avança 54 s: ' + vt);
    touch('touchstart', 80, 25); touch('touchend'); touch('touchstart', 80, 25); touch('touchend');
    assert.strictEqual(vt, 964, 'toque duplo na direita avança 10 s: ' + vt);
    touch('touchstart', 20, 25); touch('touchend'); touch('touchstart', 20, 25); touch('touchend');
    assert.strictEqual(vt, 954, 'toque duplo na esquerda volta 10 s: ' + vt);
    assert.ok(!$('#osd-ctl [data-act="rew"]') && !$('#osd-ctl [data-act="ff"]'), 'sem botões de 10 s no meio da tela');
    // botão ‹ da tela: minimiza e o mesmo clique não pode ampliar de volta
    var bk = $('#osd [data-act="back"]');
    assert.ok(bk, 'botão voltar na tela');
    bk.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    assert.ok($('#player').classList.contains('mini'), 'botão voltar vira mini player e continua mini');
    $('#player').click();
    assert.ok($('#player').classList.contains('mini'), 'toque logo após minimizar não amplia');
    $('#mini-open').click();
    assert.ok(!$('#player').classList.contains('mini'), 'Ampliar volta à tela cheia');
    step('gestos: brilho (esq.), volume (dir.) e avançar/voltar');
    key(413);   // Parar
    assert.ok($('#player').classList.contains('hidden'), 'player fechou');
    assert.ok(T.ls('resume')['m:501'] && T.ls('resume')['m:501'].t === 954, 'o ponto de "continuar assistindo" é salvo');
    step('tocar do arquivo baixado e salvar o ponto');
    // se o sistema não conhece mais o download (cancelado nas notificações), ele sai da lista; consulta que falha não apaga nada
    var id = Object.keys(dlState)[0], keep = dlState[id];
    failQuery = true;
    $('.backbtn').click();
    $('.menubtn').click(); $('.drawer-dl').click();
    return waitFor(function () { return $$('.dlrow').length === 1; }, 'downloads com consulta falhando').then(function () {
      assert.ok(T.ls('dl')['m:501'], 'consulta falhou: a lista continua intacta');
      failQuery = false;
      delete dlState[id];
      return waitFor(function () { return $$('.dlrow').length === 0 && /Nada baixado/.test($('.dllist').textContent); }, 'sumiu da lista');
    }).then(function () {
      assert.ok(!T.ls('dl')['m:501'], 'download cancelado fora do app some da lista');
      dlState[id] = keep;   // volta como se nada tivesse acontecido
      step('lista confere com o Android (cancelado some; consulta com erro não apaga)');
    });
  }).then(function () {
    T.ls('dl');   // (o download do filme foi removido acima: agora testa a série do zero)
    $('.backbtn').click();
    $('.hubtab[data-sec="series"]').click();
    return waitFor(function () { return $$('.card').length === 1; }, 'séries');
  }).then(function () {
    $$('.card')[0].click();
    return waitFor(function () { return $$('#detail .ep').length === 2 && T.btn('Baixar temporada', '#detail'); }, 'episódios com botão de baixar');
  }).then(function () {
    assert.strictEqual($$('#detail .epdl').length, 2, 'cada episódio tem o botão de baixar');
    $$('#detail .epdl')[0].click();   // E1
    var urls = Object.keys(dlState).map(function (k) { return dlState[k].url; });
    assert.ok(urls.some(function (u) { return /\/series\/joao\/segredo\/7001\.mp4$/.test(u); }), 'baixa o episódio 1: ' + urls.join(' '));
    assert.ok(/baixando/.test($$('#detail .ep')[0].textContent) && $$('#detail .epdl').length === 1, 'E1 marcado; E2 ainda com botão');
    T.btn('Baixar temporada', '#detail').click();
    urls = Object.keys(dlState).map(function (k) { return dlState[k].url; });
    assert.ok(urls.some(function (u) { return /7002\.mp4$/.test(u); }), 'temporada: baixa o que faltava');
    assert.strictEqual(urls.filter(function (u) { return /7001\.mp4$/.test(u); }).length, 1, 'não baixa o E1 duas vezes');
    assert.strictEqual($$('#detail .epdl').length, 0, 'todos marcados');
    step('série: baixar episódio e temporada inteira (sem repetir)');
    Object.keys(dlState).forEach(function (k) { if (/7001|7002/.test(dlState[k].url)) { dlState[k].s = 'done'; dlState[k].b = dlState[k].t = 500000000; } });
    key(27);   // volta da série para a lista
    $('.backbtn').click();   // e daí para a Início
    $('.menubtn').click(); $('.drawer-dl').click();
    return waitFor(function () { return $$('.dlrow').length === 2 && $$('.dlrow').every(function (r) { return /Assistir/.test(r.textContent); }); }, 'dois episódios baixados');
  }).then(function () {
    var row = $$('.dlrow').filter(function (r) { return /E1/.test(r.querySelector('.dlt').textContent); })[0];
    assert.ok(row, 'título do episódio na lista: ' + $$('.dlt').map(function (e) { return e.textContent; }).join(' | '));
    T.btn('Assistir', '.dlrow') && [].slice.call(row.querySelectorAll('.btn')).filter(function (b) { return /Assistir/.test(b.textContent); })[0].click();
    assert.strictEqual($('#video').getAttribute('src'), LOCAL + 'iptv-e-7001.mp4', 'E1 do arquivo local');
    vd = 2400; vt = 2300;
    $('#video').dispatchEvent(new w.Event('ended'));
    assert.strictEqual($('#video').getAttribute('src'), LOCAL + 'iptv-e-7002.mp4', 'ao terminar, segue para o E2 baixado');
    key(413);
    step('episódios baixados tocam em sequência');
    // apagar pede confirmação
    var del = $$('.dlrow .btn').filter(function (b) { return b.textContent === 'Apagar'; })[0];
    del.click();
    assert.strictEqual($$('.dlrow').length, 2, 'primeiro toque só pede confirmação');
    assert.ok(/de novo/.test(del.textContent));
    del.click();
    return waitFor(function () { return $$('.dlrow').length === 1; }, 'apagou um');
  }).then(function () {
    assert.strictEqual(removed.length, 1, 'o Android foi mandado apagar o arquivo');
    step('apagar download (com confirmação)');
    // falha e nova tentativa
    var cur = T.ls('dl'), k0 = Object.keys(cur)[0];
    dlState[cur[k0].id].s = 'failed';
    return waitFor(function () { return T.btn('Tentar de novo', '.dlrow'); }, 'falhou');
  }).then(function () {
    assert.ok(/Falhou/.test($('.dlst').textContent));
    var before = Object.keys(dlState).length, oldId = T.ls('dl')[Object.keys(T.ls('dl'))[0]].id;
    T.btn('Tentar de novo', '.dlrow').click();
    var ids = Object.keys(dlState), nk = Object.keys(T.ls('dl'))[0], newId = T.ls('dl')[nk].id;
    assert.strictEqual(ids.length, before, 'refaz o download (o antigo sai, um novo entra)');
    assert.ok(newId !== oldId && !dlState[oldId] && dlState[newId].s === 'running', 'novo download no lugar do que falhou');
    step('download que falhou pode ser refeito');
    // ---- segunda abertura do app, sem internet ----
    dlState[newId].s = 'done';
    dlState[newId].b = dlState[newId].t = 100000;
    assert.deepStrictEqual(dom.errors, [], 'erros de script: ' + dom.errors.join(' | '));
    dom.window.close();
    return new Promise(function (r) { api.close(r); });
  }).then(function () {
    return open(memRef);
  }).then(function (dom2) {
    var T2 = tools(dom2), $ = T2.$, $$ = T2.$$;
    return T2.waitFor(function () { return $('.dlrow') && /offline/.test($('.sectitle').textContent); }, 'abre direto nos downloads sem internet').then(function () {
      assert.ok(!$('.hubtab') && !$('.menubtn'), 'sem Início nem menu: só downloads');
      assert.ok(T2.btn('Conectar'), 'botão para tentar conectar');
      assert.ok(/Sem conexão/.test($('#toast').textContent), 'avisa que está offline');
      var play = T2.btn('Assistir', '.dlrow');
      play.click();
      assert.ok(/^file:\/\/\/storage\//.test($('#video').getAttribute('src')), 'toca offline do arquivo: ' + $('#video').getAttribute('src'));
      T2.key(413);
      T2.key(461);   // Voltar não leva à Início (que precisa de internet): só avisa para sair
      assert.ok(!$('.hubtab') && /offline/.test($('.sectitle').textContent), 'Voltar não quebra a tela offline');
      step('sem internet: abre direto nos downloads e toca offline');
      T2.btn('Conectar').click();
      return T2.waitFor(function () { return $('.login') && /Erro/.test($('.err').textContent); }, 'sem internet: volta ao login com o erro');
    }).then(function () {
      assert.ok(T2.btn('Ver downloads (offline)'), 'login oferece abrir os downloads');
      T2.btn('Ver downloads (offline)').click();
      return T2.waitFor(function () { return $('.dlrow') && /offline/.test($('.sectitle').textContent); }, 'offline de novo');
    }).then(function () {
      step('login sem internet oferece "Ver downloads (offline)"');
      assert.deepStrictEqual(dom2.errors, [], 'erros de script: ' + dom2.errors.join(' | '));
      console.log('downloads ok');
    });
  });
}).then(function () { process.exit(0); }, function (e) {
  console.error('  FAIL ' + (e && e.stack || e)); process.exit(1);
});
