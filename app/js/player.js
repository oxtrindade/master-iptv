/* Player: tenta HLS nativo (webOS), depois .ts nativo, depois hls.js / mpegts.js. */
var Player = (function () {
  'use strict';
  var v, hls = null, mp = null, cb = {};
  var attempts = [], ai = 0, opts = {}, startTimer = null, playing = false;
  var stale = [];   // faixas de legenda "órfãs" deixadas pelo hls.js em reproduções anteriores

  var LANGS = { pt: 'Português', por: 'Português', en: 'Inglês', eng: 'Inglês', es: 'Espanhol', spa: 'Espanhol',
    fr: 'Francês', fra: 'Francês', fre: 'Francês', de: 'Alemão', deu: 'Alemão', ger: 'Alemão', it: 'Italiano', ita: 'Italiano',
    ja: 'Japonês', jpn: 'Japonês', ko: 'Coreano', kor: 'Coreano', zh: 'Chinês', zho: 'Chinês', chi: 'Chinês',
    ru: 'Russo', rus: 'Russo', ar: 'Árabe', ara: 'Árabe', hi: 'Hindi', hin: 'Hindi', tr: 'Turco', tur: 'Turco',
    pl: 'Polonês', pol: 'Polonês', nl: 'Holandês', nld: 'Holandês', dut: 'Holandês', sv: 'Sueco', swe: 'Sueco',
    la: 'Latim', lat: 'Latim' };

  /* descreve uma faixa: idioma conhecido vira nome em português; detalhes úteis do rótulo original são mantidos */
  function describe(lang, name, i, what) {
    var l = String(lang || '').toLowerCase().split(/[-_]/)[0], base = LANGS[l] || '', nm = String(name || '').trim();
    var extra = /5\.1|7\.1|dolby|dts|atmos|commentary|coment|forced|for[cç]ad|sdh|descri|cc\b/i.test(nm) ? nm : '';
    var key = base || nm.toLowerCase() || (what + i);
    var label = base ? (extra ? base + ' · ' + extra : base) : (nm || what + ' ' + (i + 1));
    return { label: label, key: key };
  }

  function native(list) { return list && typeof list.length === 'number' ? list : null; }

  function audioList() {
    var out = [], i, t, d;
    if (hls && hls.audioTracks && hls.audioTracks.length) {
      for (i = 0; i < hls.audioTracks.length; i++) {
        t = hls.audioTracks[i]; d = describe(t.lang, t.name, i, 'Áudio');
        out.push({ id: i, label: d.label, key: d.key, active: hls.audioTrack === i });
      }
      return out;
    }
    var at = v && native(v.audioTracks);
    if (at) {
      for (i = 0; i < at.length; i++) {
        t = at[i]; d = describe(t.language, t.label, i, 'Áudio');
        out.push({ id: i, label: d.label, key: d.key, active: !!t.enabled });
      }
    }
    return out;
  }

  function subList() {
    var out = [], i, t, d;
    if (hls && hls.subtitleTracks && hls.subtitleTracks.length) {
      for (i = 0; i < hls.subtitleTracks.length; i++) {
        t = hls.subtitleTracks[i]; d = describe(t.lang, t.name, i, 'Legenda');
        out.push({ id: i, label: d.label, key: d.key, active: hls.subtitleTrack === i && hls.subtitleDisplay !== false });
      }
      return out;
    }
    var tt = v && native(v.textTracks);
    if (tt) {
      for (i = 0; i < tt.length; i++) {
        t = tt[i];
        if ((t.kind !== 'subtitles' && t.kind !== 'captions') || stale.indexOf(t) >= 0) { continue; }
        d = describe(t.language, t.label, out.length, 'Legenda');
        out.push({ id: i, label: d.label, key: d.key, active: t.mode === 'showing' });
      }
    }
    return out;
  }

  function setAudio(id) {
    var i, at;
    if (hls && hls.audioTracks && hls.audioTracks.length) { hls.audioTrack = id; return; }
    at = v && native(v.audioTracks);
    if (at) { for (i = 0; i < at.length; i++) { at[i].enabled = (i === id); } }
  }

  function setSub(id) {   // id < 0 desliga
    var i, tt;
    if (hls && hls.subtitleTracks && hls.subtitleTracks.length) {
      if (id < 0) { hls.subtitleDisplay = false; hls.subtitleTrack = -1; }
      else { hls.subtitleDisplay = true; hls.subtitleTrack = id; }
      return;
    }
    tt = v && native(v.textTracks);
    if (tt) {
      for (i = 0; i < tt.length; i++) {
        if ((tt[i].kind === 'subtitles' || tt[i].kind === 'captions') && stale.indexOf(tt[i]) < 0) { tt[i].mode = (i === id) ? 'showing' : 'disabled'; }
      }
    }
  }

  function tracksChanged() { if (cb.onTracks) { cb.onTracks(); } }

  function watchHls(inst) {
    var E = window.Hls.Events;
    [E.MANIFEST_PARSED, E.AUDIO_TRACKS_UPDATED, E.SUBTITLE_TRACKS_UPDATED].forEach(function (ev) { if (ev) { inst.on(ev, tracksChanged); } });
  }

  function init(video, callbacks) {
    v = video;
    cb = callbacks || {};
    v.addEventListener('waiting', function () { if (cb.onBuffer) { cb.onBuffer(true); } });
    v.addEventListener('playing', function () {
      playing = true;
      clearTimeout(startTimer);
      if (cb.onBuffer) { cb.onBuffer(false); }
    });
    v.addEventListener('canplay', function () { if (cb.onBuffer) { cb.onBuffer(false); } });
    v.addEventListener('timeupdate', function () { if (cb.onTime) { cb.onTime(v.currentTime, v.duration); } });
    v.addEventListener('ended', function () { if (cb.onEnded) { cb.onEnded(); } });
    v.addEventListener('pause', function () { if (cb.onState) { cb.onState(false); } });
    v.addEventListener('play', function () { if (cb.onState) { cb.onState(true); } });
    v.addEventListener('error', function () { next('native-error'); });
    v.addEventListener('loadedmetadata', tracksChanged);
    function reportSize() { if (cb.onResize && v.videoWidth) { cb.onResize(v.videoWidth, v.videoHeight); } }
    v.addEventListener('loadedmetadata', reportSize);
    v.addEventListener('resize', reportSize);
    v.addEventListener('playing', reportSize);
    try { if (v.audioTracks && v.audioTracks.addEventListener) { v.audioTracks.addEventListener('addtrack', tracksChanged); } } catch (e1) {}
    try { if (v.textTracks && v.textTracks.addEventListener) { v.textTracks.addEventListener('addtrack', tracksChanged); } } catch (e2) {}
  }

  function teardown() {
    clearTimeout(startTimer);
    if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
    if (mp) { try { mp.pause(); mp.unload(); mp.detachMediaElement(); mp.destroy(); } catch (e2) {} mp = null; }
    try { v.pause(); } catch (e3) {}
    v.removeAttribute('src');
    try { v.load(); } catch (e4) {}
    // o que sobrou em textTracks depois do load() não é do arquivo: é lixo do hls.js
    try { for (var k = 0; k < v.textTracks.length; k++) { if (stale.indexOf(v.textTracks[k]) < 0) { stale.push(v.textTracks[k]); } } } catch (e5) {}
  }

  function isHls(u) { return /m3u8/i.test(u); }

  function build(url, o) {
    var list = [];
    function add(type, u) { if (u) { list.push({ type: type, url: u }); } }
    if (isHls(url)) {
      // WebView do Android: HLS nativo é irregular, então tenta hls.js (MSE) primeiro e o nativo depois
      if (window.NativeApp && window.Hls && window.Hls.isSupported()) { add('hlsjs', url); }
      add('hls', url);
    }
    else if (o.live) { add('native', url); add('mpegts', url); }
    else { add('native', url); }
    if (o.alt) { add('native', o.alt); add('mpegts', o.alt); }
    return list;
  }

  function seekOnReady() {
    if (!(opts.startAt > 0)) { return; }
    var t = opts.startAt;
    var h = function () { v.removeEventListener('loadedmetadata', h); try { v.currentTime = t; } catch (e) {} };
    v.addEventListener('loadedmetadata', h);
  }

  function run() {
    var a = attempts[ai];
    if (!a) { if (cb.onError) { cb.onError(); } return; }
    teardown();
    playing = false;
    if (cb.onBuffer) { cb.onBuffer(true); }
    try {
      if (a.type === 'hlsjs') {
        hls = new window.Hls({ maxBufferLength: 30, enableWorker: false });
        hls.on(window.Hls.Events.ERROR, function (ev, d) { if (d && d.fatal) { next('hls-error'); } });
        watchHls(hls);
        hls.loadSource(a.url);
        hls.attachMedia(v);
      } else if (a.type === 'hls') {
        if (v.canPlayType('application/vnd.apple.mpegurl')) { v.src = a.url; }
        else if (window.Hls && window.Hls.isSupported()) {
          hls = new window.Hls({ maxBufferLength: 30, enableWorker: false });
          hls.on(window.Hls.Events.ERROR, function (ev, d) { if (d && d.fatal) { next('hls-error'); } });
          watchHls(hls);
          hls.loadSource(a.url);
          hls.attachMedia(v);
        } else { v.src = a.url; }
      } else if (a.type === 'mpegts') {
        if (window.mpegts && window.mpegts.isSupported()) {
          mp = window.mpegts.createPlayer({ type: 'mpegts', isLive: !!opts.live, url: a.url }, { enableWorker: false });
          mp.attachMediaElement(v);
          mp.on(window.mpegts.Events.ERROR, function () { next('mpegts-error'); });
          mp.load();
        } else { next('no-mpegts'); return; }
      } else {
        v.src = a.url;
      }
      seekOnReady();
      var p = v.play();
      if (p && p.catch) { p.catch(function () {}); }
    } catch (e) { next('exception'); return; }
    startTimer = setTimeout(function () { if (!playing) { next('timeout'); } }, opts.live ? 12000 : 25000);
  }

  function next() {
    clearTimeout(startTimer);
    ai++;
    run();
  }

  return {
    init: init,
    play: function (url, o) {
      opts = o || {};
      attempts = build(url, opts);
      ai = 0;
      run();
    },
    stop: function () { attempts = []; ai = 0; teardown(); },
    toggle: function () { if (v.paused) { v.play(); } else { v.pause(); } },
    isPaused: function () { return v.paused; },
    seek: function (delta) {
      if (!isFinite(v.duration) || v.duration <= 0) { return; }
      v.currentTime = Math.max(0, Math.min(v.duration - 1, v.currentTime + delta));
    },
    seekTo: function (t) {
      if (!isFinite(v.duration) || v.duration <= 0) { return; }
      v.currentTime = Math.max(0, Math.min(v.duration - 1, t));
    },
    audioTracks: audioList,
    subtitleTracks: subList,
    setAudio: setAudio,
    setSubtitle: setSub,
    engine: function () { return hls ? 'hls.js' : (mp ? 'mpegts.js' : 'nativo'); },
    time: function () { return v.currentTime; },
    duration: function () { return v.duration; }
  };
})();
