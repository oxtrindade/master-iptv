/* Proxy HTTP local (127.0.0.1) que adiciona cabeçalhos CORS.
   Separado do service.js para poder ser testado fora do webOS. ES5 (Node antigo do webOS).

   Para falhas de conexão ele tenta uma sequência de combinações (IPv4 primeiro, vários
   User-Agents de apps IPTV) e, se tudo falhar, devolve 502 com o código real de cada erro. */
var http = require('http');
var https = require('https');
var urlLib = require('url');

var CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

var UAS = [
  ['VLC', 'VLC/3.0.18 LibVLC/3.0.18'],
  ['okhttp', 'okhttp/4.9.3'],
  ['Dalvik', 'Dalvik/2.1.0 (Linux; U; Android 11; Pixel 5 Build/RQ3A.210805.001.A1)'],
  ['Web0S', 'Mozilla/5.0 (Web0S; Linux/SmartTV) IPTV'],
  ['Chrome', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36']
];
// [índice do UA, família de IP]: 4 = só IPv4, 0 = automático
var PLAN = [[0, 4], [1, 4], [2, 4], [0, 0], [3, 0]];
// ua=browser (ex.: páginas do YouTube, que só mandam a lista de vídeos para navegador)
var PLAN_BROWSER = [[4, 4], [4, 0]];
var CONNECT_TIMEOUT = 8000;
var IDLE_TIMEOUT = 60000;

function codeErr(code) { var e = new Error(code); e.code = code; return e; }

/* página mínima com o player do YouTube: dá ao embed uma origem http (evita o erro 153) e repassa os eventos ao app */
function ytPage(id, host) {
  var src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&playsinline=1&iv_load_policy=3&loop=1&playlist=' + id +
    '&enablejsapi=1&origin=' + encodeURIComponent('http://' + host) + '&widget_referrer=' + encodeURIComponent('http://' + host + '/');
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="strict-origin-when-cross-origin"></head>' +
    '<body style="margin:0;background:#000;overflow:hidden"><iframe id="f" style="border:0;width:100%;height:100%" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" src="' + src + '"></iframe>' +
    '<script>var f=document.getElementById("f");' +
    'window.addEventListener("message",function(e){if(e.source===f.contentWindow){parent.postMessage(e.data,"*");}});' +
    'f.onload=function(){try{f.contentWindow.postMessage(JSON.stringify({event:"listening",id:1,channel:"widget"}),"*");}catch(x){}};</script></body></html>';
}

function create(token) {
  function attempt(target, hops, ua, family, res, onFail, setCur) {
    var u = urlLib.parse(target);
    var lib = u.protocol === 'https:' ? https : http;
    var o = {
      protocol: u.protocol, hostname: u.hostname, port: u.port, path: u.path, method: 'GET',
      agent: false, rejectUnauthorized: false,
      headers: { 'User-Agent': ua, 'Accept': '*/*', 'Connection': 'close' }
    };
    if (family) { o.family = family; }
    if (/Chrome\//.test(ua)) { o.headers['Accept-Language'] = 'pt-BR,pt;q=0.9'; o.headers['Cookie'] = 'CONSENT=YES+1; SOCS=CAI'; }
    var done = false, ct = null;

    function fail(err) {
      if (done) { return; }
      done = true;
      clearTimeout(ct);
      if (res.headersSent) { res.end(); } else { onFail(err); }
    }

    var up = lib.request(o, function (r) {
      clearTimeout(ct);
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && hops > 0) {
        done = true;
        r.resume();
        return attempt(urlLib.resolve(target, r.headers.location), hops - 1, ua, family, res, onFail, setCur);
      }
      done = true;
      var h = { 'Content-Type': r.headers['content-type'] || 'application/octet-stream' };
      if (r.headers['content-length']) { h['Content-Length'] = r.headers['content-length']; }
      Object.keys(CORS).forEach(function (k) { h[k] = CORS[k]; });
      res.writeHead(r.statusCode, h);
      r.on('aborted', function () { res.end(); });
      r.on('error', function () { res.end(); });
      r.pipe(res);
    });
    setCur(up);
    up.setTimeout(IDLE_TIMEOUT, function () { up.abort(); fail(codeErr('ETIMEDOUT')); });
    up.on('socket', function (sock) {
      ct = setTimeout(function () { up.abort(); fail(codeErr('ETIMEDOUT-connect')); }, CONNECT_TIMEOUT);
      sock.once('connect', function () { clearTimeout(ct); });
    });
    up.on('error', function (e) { fail(e); });
    up.end();
  }

  function fetchFollow(target, res, browser) {
    var plan = browser ? PLAN_BROWSER : PLAN;
    var errs = [], i = 0, cur = null, aborted = false;
    res.on('close', function () { aborted = true; if (cur) { try { cur.abort(); } catch (e) {} } });

    function next() {
      if (aborted) { return; }
      if (i >= plan.length) {
        if (!res.headersSent) { res.writeHead(502, CORS); }
        return res.end('proxy error: ' + errs.join(' | '));
      }
      var p = plan[i++];
      attempt(target, 5, UAS[p[0]][1], p[1], res, function (err) {
        errs.push((p[1] === 4 ? 'ipv4' : 'auto') + '/' + UAS[p[0]][0] + ': ' + (err.code || err.message));
        next();
      }, function (r) { cur = r; });
    }
    next();
  }

  return http.createServer(function (req, res) {
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
    var pu = urlLib.parse(req.url, true), q = pu.query;
    if (q.t !== token) { res.writeHead(403, CORS); return res.end('forbidden'); }
    if (pu.pathname === '/yt') {
      if (!/^[\w-]{11}$/.test(q.id || '')) { res.writeHead(400, CORS); return res.end('bad id'); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(ytPage(q.id, req.headers.host || '127.0.0.1'));
    }
    if (!/^https?:\/\//i.test(q.u || '')) { res.writeHead(400, CORS); return res.end('bad url'); }
    fetchFollow(q.u, res, q.ua === 'browser');
  });
}

module.exports = { create: create };
