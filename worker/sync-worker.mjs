/* Servidor de sincronização do Master IPTV para o Cloudflare Workers (plano grátis).
   Guarda um JSON por código (não há contas nem senhas: o código de 16+ caracteres é o segredo).
   Precisa de um KV namespace ligado a este Worker com o nome de variável SYNC. Veja docs/sincronizacao.md. */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};
const MAX_BYTES = 1000000;           // 1 MB por código
const TTL = 60 * 60 * 24 * 400;      // some depois de ~13 meses sem uso

function reply(body, status, extra) {
  return new Response(body, { status, headers: Object.assign({}, CORS, extra || {}) });
}

/* Página aberta pelo QR Code da TV: o celular digita servidor/usuário/senha e o envio vai para /sync/<código>. */
function pairPage(code) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Entrar na TV · Master IPTV</title><style>
body{margin:0;font-family:system-ui,sans-serif;background:#0b1220;color:#eef2f9;display:flex;justify-content:center}
main{width:100%;max-width:420px;padding:28px 20px}h1{font-size:22px;margin:0 0 6px}p{color:#aeb9cc;margin:0 0 18px;font-size:15px}
label{display:block;margin:14px 0 6px;color:#aeb9cc;font-size:14px}
input{width:100%;box-sizing:border-box;padding:14px;border-radius:10px;border:1px solid #2a3a57;background:#121c30;color:#fff;font-size:17px}
button{margin-top:22px;width:100%;padding:15px;border:0;border-radius:12px;background:#3ab4e0;color:#04121c;font-size:18px;font-weight:700}
#m{margin-top:16px;font-size:16px;min-height:22px}</style></head><body><main>
<h1>Entrar na TV</h1><p>Digite o login do seu servidor IPTV. Ele vai direto para a TV e é apagado do servidor assim que ela recebe.</p>
<form id="f" autocomplete="off"><label>Servidor</label><input id="s" placeholder="http://servidor:porta" autocapitalize="off" autocorrect="off" required>
<label>Usuário</label><input id="u" autocapitalize="off" autocorrect="off" required>
<label>Senha</label><input id="p" type="text" autocapitalize="off" autocorrect="off" required>
<button type="submit">Enviar para a TV</button><div id="m"></div></form>
<script>
var CODE=${JSON.stringify(code)};
document.getElementById('f').onsubmit=function(e){e.preventDefault();
var m=document.getElementById('m');m.textContent='Enviando…';
fetch('/sync/'+CODE,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({v:1,login:{server:document.getElementById('s').value.trim(),user:document.getElementById('u').value.trim(),pass:document.getElementById('p').value.trim()},at:Date.now()})})
.then(function(r){if(!r.ok)throw 0;m.textContent='Pronto! A TV vai entrar em instantes.';m.style.color='#6fdc8c';document.getElementById('f').reset();})
.catch(function(){m.textContent='Não foi possível enviar. Tente de novo.';m.style.color='#ff8a8a';});};
</script></main></body></html>`;
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') { return reply(null, 204); }
    const pm = new URL(req.url).pathname.match(/^\/p\/([A-Za-z0-9]{16,64})$/);
    if (pm && req.method === 'GET') {
      return reply(pairPage(pm[1].toUpperCase()), 200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    }
    const m = new URL(req.url).pathname.match(/^\/sync\/([A-Za-z0-9]{16,64})$/);
    if (!m) { return reply('not found', 404, { 'Content-Type': 'text/plain' }); }
    if (!env || !env.SYNC) { return reply('KV "SYNC" não está ligado ao Worker', 500, { 'Content-Type': 'text/plain' }); }
    const key = 's:' + m[1].toUpperCase();

    if (req.method === 'GET') {
      const v = await env.SYNC.get(key);
      if (v === null) { return reply('{}', 404, { 'Content-Type': 'application/json' }); }
      return reply(v, 200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await req.text();
      if (body.length > MAX_BYTES) { return reply('too large', 413, { 'Content-Type': 'text/plain' }); }
      let j;
      try { j = JSON.parse(body); } catch (e) { return reply('invalid json', 400, { 'Content-Type': 'text/plain' }); }
      if (!j || typeof j !== 'object' || Array.isArray(j)) { return reply('invalid json', 400, { 'Content-Type': 'text/plain' }); }
      await env.SYNC.put(key, body, { expirationTtl: TTL });
      return reply('{"ok":true}', 200, { 'Content-Type': 'application/json' });
    }
    return reply('method not allowed', 405, { 'Content-Type': 'text/plain' });
  }
};
