/* Servidor falso (Xtream + M3U) para testes locais. Sem cabeçalhos CORS de propósito. */
var http = require('http');
var url = require('url');

function b64(s) { return Buffer.from(s, 'utf8').toString('base64'); }

function create() {
  return http.createServer(function (req, res) {
    var u = url.parse(req.url, true), q = u.query;
    function json(o) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); }

    if (u.pathname === '/player_api.php') {
      if (q.username !== 'joao' || q.password !== 'segredo') { return json({ user_info: { auth: 0 } }); }
      switch (q.action) {
        case undefined:
          return json({ user_info: { auth: 1, status: 'Active', username: 'joao', exp_date: '1893456000', max_connections: '1' }, server_info: {} });
        case 'get_live_categories': return json([{ category_id: '1', category_name: 'Notícias' }, { category_id: '2', category_name: 'Canais | ⚽ Esportes' }, { category_id: '3', category_name: 'Filmes e séries 24h' }]);
        case 'get_live_streams':
          var all = [
            { num: 1, name: 'Canal Notícias', stream_id: 101, stream_icon: '', category_id: '1', epg_channel_id: 'n1' },
            { num: 2, name: 'Canal Esporte 1', stream_id: 102, stream_icon: '', category_id: '2', epg_channel_id: 'e1' },
            { num: 3, name: 'Canal Esporte 2', stream_id: 103, stream_icon: '', category_id: '2', epg_channel_id: 'e2' },
            { num: 4, name: 'Cine HD', stream_id: 104, stream_icon: '', category_id: '3', epg_channel_id: 'c1' },
            { num: 5, name: 'Cine SD', stream_id: 105, stream_icon: '', category_id: '3', epg_channel_id: '' },
            { num: 6, name: 'Cine FHD', stream_id: 106, stream_icon: '', category_id: '3', epg_channel_id: 'c3' },
            { num: 7, name: 'Premiere 3', stream_id: 107, stream_icon: '', category_id: '2', epg_channel_id: '' }
          ];
          return json(q.category_id ? all.filter(function (c) { return c.category_id === q.category_id; }) : all);
        case 'get_vod_categories': return json([{ category_id: '10', category_name: 'Ação' }]);
        case 'get_vod_streams':
          return json([{ stream_id: 501, name: 'Filme Teste', stream_icon: 'http://127.0.0.1:9/poster.jpg', category_id: '10', rating: '7.4', container_extension: 'mkv' }]);
        case 'get_vod_info': return json({ info: { plot: 'Um filme de teste.', genre: 'Ação', releasedate: '2020-05-01', duration: '01:40:00', youtube_trailer: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
        case 'get_series_categories': return json([{ category_id: '20', category_name: 'Drama' }]);
        case 'get_series':
          return json([{ series_id: 900, name: 'Série Teste', cover: '', category_id: '20', rating_5based: 4, releaseDate: '2019-01-01', plot: 'Sobre testes.' }]);
        case 'get_series_info':
          return json({ info: { plot: 'Sobre testes.', genre: 'Drama', youtube_trailer: 'abcdefghijk' }, episodes: {
            '1': [{ id: '7002', episode_num: 2, title: 'Dois', container_extension: 'mp4', season: 1, info: { duration: '00:42:00' } },
                  { id: '7001', episode_num: 1, title: 'Um', container_extension: 'mp4', season: 1, info: {} }],
            '2': [{ id: '7101', episode_num: 1, title: 'Retorno', container_extension: 'mkv', season: 2, info: {} }]
          } });
        case 'get_short_epg':
          if (String(q.stream_id) === '103') {   // canal que passa o jogo "Palmeiras x Grêmio" (veja /espn abaixo)
            var nowS = Math.floor(Date.now() / 1000);
            return json({ epg_listings: [{ title: b64('Palmeiras x Grêmio — Brasileirão'), description: b64('Ao vivo'), start_timestamp: String(nowS - 3600), stop_timestamp: String(nowS + 3600) },
              { title: b64('Resenha'), description: b64('z'), start_timestamp: String(nowS + 3600), stop_timestamp: String(nowS + 7200) }] });
          }
          return json({ epg_listings: [{ title: b64('Jornal da Noite — ação'), description: b64('x'), start_timestamp: '1', stop_timestamp: '99999999990' },
          { title: b64('Cinema da Madrugada'), description: b64('y'), start_timestamp: '99999999990', stop_timestamp: '99999999999' }] });
        default: return json([]);
      }
    }
    // placares (formato da API pública da ESPN) para testar a tela de Esportes
    var em = /^\/espn\/([^/]+)\/scoreboard$/.exec(u.pathname);
    if (em) {
      var lg = em[1], nowMs = Date.now();
      function tm(id, name, ab) { return { id: id, displayName: name, shortDisplayName: name, abbreviation: ab, logo: '' }; }
      function ev(id, date, state, clock, h, a, hs, as, extra) {
        var o = { id: id, date: new Date(date).toISOString(), status: { displayClock: clock, period: state === 'in' ? 2 : 0, type: { state: state, name: state === 'in' ? 'STATUS_SECOND_HALF' : 'STATUS_SCHEDULED', shortDetail: clock, completed: state === 'post' } },
          competitions: [{ venue: { fullName: 'Allianz Parque' }, competitors: [
            { homeAway: 'home', team: h, score: hs, statistics: [{ name: 'possessionPct', displayValue: '55' }, { name: 'totalShots', displayValue: '12' }] },
            { homeAway: 'away', team: a, score: as, statistics: [{ name: 'possessionPct', displayValue: '45' }, { name: 'totalShots', displayValue: '7' }] }], details: [] }] };
        if (extra) { o.competitions[0].details = extra; }
        return o;
      }
      // a fonte real só aceita UM dia por consulta (intervalo dá erro): o teste guarda essa regra
      if (!/^\d{8}$/.test(String(q.dates || ''))) { res.writeHead(400); return res.end('dates invalido'); }
      if (lg === 'uefa.nations') { res.writeHead(500); return res.end('erro'); }
      var events = [];
      if (lg === 'bra.1') {
        events = [
          ev('1001', nowMs - 3600000, 'in', "67'", tm('2029', 'Palmeiras', 'PAL'), tm('6273', 'Grêmio', 'GRE'), '2', '1',
            [{ scoringPlay: true, clock: { displayValue: "23'" }, athletesInvolved: [{ displayName: 'Raphael Veiga' }], team: { id: '2029' } }]),
          ev('1002', Math.min(nowMs + 20 * 60000, (function () { var d = new Date(); d.setHours(23, 59, 0, 0); return d.getTime(); })()), 'pre', '', tm('819', 'Flamengo', 'FLA'), tm('3454', 'Vasco da Gama', 'VAS'), '0', '0')
        ];
      } else if (lg === 'fifa.friendly') {
        events = [
          ev('2001', nowMs + 2 * 86400000, 'pre', '', tm('205', 'Brazil', 'BRA'), tm('654', 'Senegal', 'SEN'), '0', '0'),
          ev('2002', nowMs + 2 * 86400000, 'pre', '', tm('160', 'France', 'FRA'), tm('164', 'Spain', 'ESP'), '0', '0')
        ];
      }
      return json({ events: events });
    }
    if (u.pathname === '/lista.m3u') {
      res.writeHead(200, { 'Content-Type': 'audio/x-mpegurl' });
      return res.end([
        '#EXTM3U',
        '#EXTINF:-1 tvg-id="g1" tvg-logo="http://x/g.png" group-title="Abertos",Globo HD',
        'http://srv/live/1.m3u8',
        '#EXTINF:-1 group-title="Filmes | Ação",Matrix (1999)',
        'http://srv/movie/u/p/1.mp4',
        '#EXTINF:-1 group-title="Séries | Drama",Breaking Test S01E02 - Cat',
        'http://srv/series/u/p/12.mkv',
        '#EXTINF:-1 group-title="Séries | Drama",Breaking Test S01E01 - Pilot',
        'http://srv/series/u/p/11.mkv',
        '#EXTINF:-1 group-title="Séries | Drama",Breaking Test S02E01',
        'http://srv/series/u/p/21.mkv'
      ].join('\n'));
    }
    // origem do "stream" para o teste do proxy
    if (u.pathname === '/redir') { res.writeHead(302, { Location: '/player_api.php?username=joao&password=segredo' }); return res.end(); }
    res.writeHead(404); res.end('nope');
  });
}

module.exports = { create: create };
