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

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') { return reply(null, 204); }
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
