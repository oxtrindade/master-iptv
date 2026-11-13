/* Esportes: placares e jogos do dia (futebol) + ligação do jogo com o canal que o transmite. ES5.
   Fonte: API pública de placares da ESPN (sem chave, não oficial: pode mudar ou sair do ar; o app trata a falha).
   Sports.fetch(http, ...) usa a função de rede do app (XHR com fallback pelo proxy local). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.Sports = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var Sp = {};

  Sp.BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
  Sp.setBase = function (b) { Sp.BASE = b; };

  /* all: mostra todos os jogos; friendly: só jogos do Brasil ou de times que você segue */
  Sp.LEAGUES = [
    { id: 'bra.1', name: 'Brasileirão Série A', short: 'Brasileirão', all: true },
    { id: 'bra.copa_do_brazil', name: 'Copa do Brasil', short: 'Copa do Brasil', all: true },
    { id: 'conmebol.libertadores', name: 'Copa Libertadores', short: 'Libertadores', all: true },
    { id: 'conmebol.sudamericana', name: 'Copa Sul-Americana', short: 'Sul-Americana', all: true },
    { id: 'uefa.champions', name: 'UEFA Champions League', short: 'Champions', all: true },
    { id: 'eng.1', name: 'Premier League', short: 'Premier League', all: true },
    { id: 'esp.1', name: 'La Liga', short: 'La Liga', all: true },
    { id: 'fra.1', name: 'Ligue 1', short: 'Ligue 1', all: true },
    { id: 'ita.1', name: 'Campeonato Italiano (Serie A)', short: 'Serie A', all: true },
    { id: 'ger.1', name: 'Bundesliga', short: 'Bundesliga', all: true },
    { id: 'fifa.friendly', name: 'Amistosos de seleções', short: 'Amistosos', all: false, nat: true },
    { id: 'fifa.worldq.conmebol', name: 'Eliminatórias Sul-Americanas', short: 'Eliminatórias', all: true, nat: true },
    { id: 'conmebol.america', name: 'Copa América', short: 'Copa América', all: true, nat: true },
    { id: 'uefa.euro', name: 'Eurocopa', short: 'Eurocopa', all: true, nat: true },
    { id: 'uefa.nations', name: 'UEFA Nations League', short: 'Nations League', all: true, nat: true },
    { id: 'fifa.world', name: 'Copa do Mundo', short: 'Copa do Mundo', all: true, nat: true }
  ];

  Sp.league = function (id) {
    var i;
    for (i = 0; i < Sp.LEAGUES.length; i++) { if (Sp.LEAGUES[i].id === id) { return Sp.LEAGUES[i]; } }
    return null;
  };

  /* ---------- texto ---------- */

  Sp.norm = function (s) {
    s = String(s == null ? '' : s).toLowerCase();
    try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* sem normalize */ }
    return s.replace(/[^a-z0-9]+/g, ' ').replace(/^ +| +$/g, '');
  };

  // nomes de seleções em inglês (como a fonte envia) -> como aparecem na programação em português
  var PT = {
    'brazil': 'brasil', 'germany': 'alemanha', 'france': 'franca', 'spain': 'espanha', 'england': 'inglaterra',
    'italy': 'italia', 'netherlands': 'holanda', 'belgium': 'belgica', 'uruguay': 'uruguai', 'paraguay': 'paraguai',
    'ecuador': 'equador', 'mexico': 'mexico', 'united states': 'estados unidos', 'usa': 'estados unidos', 'japan': 'japao',
    'croatia': 'croacia', 'switzerland': 'suica', 'denmark': 'dinamarca', 'sweden': 'suecia', 'norway': 'noruega',
    'poland': 'polonia', 'czechia': 'tchequia', 'czech republic': 'tchequia', 'scotland': 'escocia', 'wales': 'pais de gales',
    'turkey': 'turquia', 'turkiye': 'turquia', 'serbia': 'servia', 'greece': 'grecia', 'austria': 'austria', 'ukraine': 'ucrania',
    'south korea': 'coreia do sul', 'morocco': 'marrocos', 'egypt': 'egito', 'senegal': 'senegal', 'cameroon': 'camaroes',
    'saudi arabia': 'arabia saudita', 'australia': 'australia', 'canada': 'canada', 'costa rica': 'costa rica',
    'hungary': 'hungria', 'romania': 'romenia', 'slovakia': 'eslovaquia', 'slovenia': 'eslovenia', 'albania': 'albania',
    'georgia': 'georgia', 'ireland': 'irlanda', 'northern ireland': 'irlanda do norte', 'iceland': 'islandia', 'finland': 'finlandia',
    'new zealand': 'nova zelandia', 'south africa': 'africa do sul', 'ivory coast': 'costa do marfim', 'algeria': 'argelia',
    'tunisia': 'tunisia', 'nigeria': 'nigeria', 'ghana': 'gana', 'iran': 'ira', 'qatar': 'catar', 'panama': 'panama', 'jamaica': 'jamaica'
  };
  // nomes de clubes que viram só uma palavra e podem confundir (não usar a 1ª palavra sozinha)
  var AMBIG = { atletico: 1, athletico: 1, sport: 1, real: 1, united: 1, city: 1, club: 1, deportivo: 1, independiente: 1, nacional: 1, universidad: 1, sporting: 1, olimpia: 1 };

  /* termos (normalizados) que identificam um time numa programação de TV */
  Sp.teamTerms = function (t) {
    var out = [], seen = {};
    function add(s) {
      s = Sp.norm(s);
      if (s.length >= 3 && !seen[s]) { seen[s] = 1; out.push(s); }
    }
    [t.name, t.short].forEach(function (n) {
      if (!n) { return; }
      var k = Sp.norm(n);
      add(n);
      if (PT[k]) { add(PT[k]); }
      add(String(n).replace(/\b(FC|SC|EC|CF|AC|CD|AFC|SE|FBC|RB|Clube|Club|de|da|do|Futebol|Regatas)\b/gi, ' '));
    });
    var first = Sp.norm(t.name || '').split(' ')[0];
    if (first && first.length >= 6 && !AMBIG[first] && !seen[first]) { out.push(first); }
    return out;
  };

  function hasTerm(text, terms) {
    var i, tx = ' ' + text + ' ';
    for (i = 0; i < terms.length; i++) { if (tx.indexOf(' ' + terms[i] + ' ') >= 0) { return true; } }
    return false;
  }

  /* 2 = os dois times aparecem no texto; 1 = um time e jeito de confronto ("x", "vs"); 0 = não */
  Sp.matchText = function (game, text) {
    var tx = Sp.norm(text);
    if (!tx) { return 0; }
    var a = hasTerm(tx, Sp.teamTerms(game.home)), b = hasTerm(tx, Sp.teamTerms(game.away));
    if (a && b) { return 2; }
    if ((a || b) && / (x|vs|v|versus|contra) /.test(' ' + tx + ' ')) { return 1; }
    return 0;
  };

  /* ---------- jogos ---------- */

  function stat(c, key) {
    var list = (c && c.statistics) || [], i;
    for (i = 0; i < list.length; i++) { if (list[i].name === key || list[i].abbreviation === key) { return list[i].displayValue; } }
    return '';
  }

  function team(c) {
    var t = (c && c.team) || {};
    return {
      id: String(t.id || ''), name: t.displayName || t.name || '', short: t.shortDisplayName || '', abbr: t.abbreviation || '',
      logo: t.logo || (t.logos && t.logos[0] && t.logos[0].href) || '',
      score: c && c.score != null && c.score !== '' ? String(typeof c.score === 'object' ? (c.score.displayValue || c.score.value) : c.score) : '',
      winner: !!(c && c.winner),
      stats: { poss: stat(c, 'possessionPct'), shots: stat(c, 'totalShots'), sot: stat(c, 'shotsOnTarget'), fouls: stat(c, 'foulsCommitted'), corners: stat(c, 'wonCorners'), yellow: stat(c, 'yellowCards'), red: stat(c, 'redCards') }
    };
  }

  Sp.parseEvent = function (ev, leagueId) {
    var comp = (ev.competitions && ev.competitions[0]) || {}, cs = comp.competitors || [], home = null, away = null, i;
    for (i = 0; i < cs.length; i++) {
      if (cs[i].homeAway === 'home') { home = cs[i]; } else if (cs[i].homeAway === 'away') { away = cs[i]; }
    }
    if (!home || !away) { home = cs[0]; away = cs[1]; }
    if (!home || !away) { return null; }
    var st = ev.status || {}, ty = st.type || {}, state = ty.state === 'in' ? 'in' : (ty.state === 'post' ? 'post' : 'pre');
    var lg = Sp.league(leagueId), when = Date.parse(ev.date);
    if (!isFinite(when)) { return null; }
    var goals = [];
    (comp.details || []).forEach(function (d) {
      if (d.scoringPlay) {
        var p = d.athletesInvolved && d.athletesInvolved[0];
        goals.push({ min: (d.clock && d.clock.displayValue) || '', who: p ? (p.displayName || p.fullName || '') : '', own: !!d.ownGoal, pen: !!d.penaltyKick, home: String(d.team && d.team.id) === String(home.team && home.team.id) });
      }
    });
    return {
      id: String(ev.id), league: leagueId, leagueName: lg ? lg.short : leagueId, nat: !!(lg && lg.nat),
      start: when, state: state, clock: st.displayClock || '', detail: ty.shortDetail || ty.detail || '', typeName: ty.name || '',
      period: st.period || 0, completed: !!ty.completed,
      home: team(home), away: team(away), venue: (comp.venue && comp.venue.fullName) || '', goals: goals,
      note: (comp.notes && comp.notes[0] && comp.notes[0].headline) || ''
    };
  };

  function ymd(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + (m < 10 ? '0' : '') + m + (day < 10 ? '0' : '') + day;
  }
  Sp.ymd = ymd;

  function getJson(http, url) {
    return Promise.resolve(http(url)).then(function (t) { return typeof t === 'string' ? JSON.parse(t) : t; });
  }

  /* Jogos de UM dia (a fonte não aceita intervalo de datas). date: Date; leagues: ids (padrão: todas).
     Uma consulta por liga; a que falhar não derruba as outras. Resolve { games: [...ordenados por horário], failed: [ids] } */
  Sp.fetchDay = function (http, date, leagues) {
    var ids = leagues || Sp.LEAGUES.map(function (l) { return l.id; }), failed = [];
    return Promise.all(ids.map(function (id) {
      return getJson(http, Sp.BASE + '/' + id + '/scoreboard?limit=200&dates=' + ymd(date)).then(function (d) {
        var out = [];
        ((d && d.events) || []).forEach(function (ev) { var g = Sp.parseEvent(ev, id); if (g) { out.push(g); } });
        return out;
      }, function () { failed.push(id); return []; });
    })).then(function (lists) {
      var games = [], seen = {};
      lists.forEach(function (l) { l.forEach(function (g) { if (!seen[g.league + g.id]) { seen[g.league + g.id] = 1; games.push(g); } }); });
      games.sort(function (a, b) { return a.start - b.start; });
      return { games: games, failed: failed };
    });
  };

  /* times de uma liga/competição: [{id, name, logo}] ordenados por nome (seleções incluídas: fifa.world) */
  Sp.parseTeams = function (d) {
    var out = [], seen = {};
    var lg = d && d.sports && d.sports[0] && d.sports[0].leagues && d.sports[0].leagues[0];
    ((lg && lg.teams) || []).forEach(function (x) {
      var t = x && x.team;
      if (!t || !t.id || seen[t.id]) { return; }
      seen[t.id] = 1;
      out.push({ id: String(t.id), name: t.displayName || t.name || t.shortDisplayName || '', logo: (t.logos && t.logos[0] && t.logos[0].href) || '' });
    });
    out.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
    return out;
  };
  Sp.fetchTeams = function (http, leagueId) {
    return getJson(http, Sp.BASE + '/' + leagueId + '/teams?limit=200').then(Sp.parseTeams);
  };

  /* amistosos: só os do Brasil (ou de times que você segue) para não encher a tela */
  Sp.visible = function (g, follow) {
    var lg = Sp.league(g.league);
    if (!lg || lg.all) { return true; }
    follow = follow || {};
    return g.home.abbr === 'BRA' || g.away.abbr === 'BRA' || !!follow[g.home.id] || !!follow[g.away.id];
  };

  Sp.dayKey = function (ms) { return ymd(new Date(ms)); };

  Sp.isLive = function (g) { return g.state === 'in'; };

  function hhmm(ms) {
    var d = new Date(ms), h = d.getHours(), m = d.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  Sp.hhmm = hhmm;

  /* texto curto do estado: "AO VIVO 67'", "Intervalo", "Encerrado", "16:00" */
  Sp.statusText = function (g) {
    if (g.state === 'in') {
      if (/half ?time|halftime/i.test(g.typeName + ' ' + g.detail)) { return 'Intervalo'; }
      return 'AO VIVO' + (g.clock ? ' ' + g.clock : '');
    }
    if (g.state === 'post') {
      if (/postponed|adiad/i.test(g.typeName + g.detail)) { return 'Adiado'; }
      if (/cancel/i.test(g.typeName + g.detail)) { return 'Cancelado'; }
      return 'Encerrado';
    }
    if (/postponed/i.test(g.typeName + g.detail)) { return 'Adiado'; }
    return hhmm(g.start);
  };

  /* ---------- onde assistir (direitos no Brasil; serviços sem guia de programação, como HBO Max e YouTube) ---------- */
  /* Tabela fixa, conferida na imprensa em nov/2026. Os direitos mudam por temporada e, em alguns torneios, por jogo. */
  var RIGHTS = {
    'uefa.champions': { short: 'HBO Max · TNT · SBT', lines: ['HBO Max — todos os jogos', 'TNT e Space (TV paga) — jogos selecionados', 'TNT Sports no YouTube — jogos selecionados', 'SBT (TV aberta) — 1 jogo por semana, nas terças'] },
    'conmebol.libertadores': { short: 'ESPN · Paramount+ · Globo', lines: ['ESPN e Disney+ — 8 jogos por rodada', 'Paramount+ — 8 jogos por rodada', 'Globo (TV aberta) — 1 jogo por rodada (times como Flamengo, Fluminense, Corinthians e Palmeiras)'] },
    'conmebol.sudamericana': { short: 'ESPN · Paramount+ · SBT', lines: ['ESPN e Disney+ — 8 jogos por rodada', 'Paramount+ — 8 jogos por rodada', 'SBT (TV aberta) — 1 jogo por rodada (São Paulo e Santos)'] },
    'eng.1': { short: 'CazéTV', lines: ['CazéTV (YouTube, grátis) — 1 jogo por rodada'] },
    'esp.1': { short: 'CazéTV', lines: ['CazéTV (YouTube, grátis) — todos os jogos'] },
    'fra.1': { short: 'CazéTV · Xsports', lines: ['CazéTV (YouTube, grátis)', 'Xsports (TV aberta) — 3 jogos por rodada'] },
    'ita.1': { short: 'SportyNet', lines: ['SportyNet (YouTube, aberto)'] },
    'ger.1': { short: 'SportyNet', lines: ['SportyNet (YouTube, aberto)'] }
  };
  var LIBRA = ['atletico mg', 'atletico mineiro', 'bahia', 'gremio', 'flamengo', 'palmeiras', 'bragantino', 'remo', 'santos', 'sao paulo', 'vitoria'];
  var FFU = ['botafogo', 'chapecoense', 'corinthians', 'coritiba', 'cruzeiro', 'fluminense', 'internacional', 'mirassol', 'vasco'];
  function teamIn(list, name) {
    var n = ' ' + Sp.norm(name) + ' ';
    return list.some(function (k) { return n.indexOf(' ' + k) >= 0; });
  }
  /* devolve { short, lines } ou null quando não há informação para a competição */
  Sp.whereToWatch = function (g) {
    if (g.league === 'bra.1') {
      if (teamIn(LIBRA, g.home.name)) {
        return { short: 'Globo · SporTV · Premiere', lines: ['Globo (TV aberta), SporTV e Premiere — a Globo define onde passa cada jogo', 'ge tv (YouTube) — 1 jogo por rodada', 'Globoplay — acesso aos canais da Globo'] };
      }
      if (teamIn(FFU, g.home.name)) {
        return { short: 'Globo · Premiere · Record · CazéTV · Prime', lines: ['Globo (TV aberta), SporTV e Premiere', 'Record (TV aberta) e CazéTV (YouTube) — 1 jogo por rodada', 'Prime Video — 1 jogo exclusivo por rodada'] };
      }
      return { short: 'Globo · Premiere', lines: ['Globo (TV aberta), SporTV e Premiere'] };
    }
    return RIGHTS[g.league] || null;
  };

  /* links do YouTube para as fontes que transmitem lá (abre o app do YouTube) */
  var YT = [
    { re: /Caz[eé]TV/, label: 'CazéTV', url: 'https://www.youtube.com/@CazeTV/live', streams: 'https://www.youtube.com/@CazeTV/streams', tries: ['https://www.youtube.com/@CazeTV/live'] },
    { re: /TNT Sports/, label: 'TNT Sports', url: 'https://www.youtube.com/@TNTSportsBR/live', streams: 'https://www.youtube.com/@TNTSportsBR/streams', tries: ['https://www.youtube.com/@TNTSportsBR/live'] },
    { re: /ge tv/i, label: 'ge tv', url: 'https://www.youtube.com/@getv/live', streams: 'https://www.youtube.com/@getv/streams', tries: ['https://www.youtube.com/@getv/live'] },
    { re: /SportyNet/, label: 'SportyNet', url: 'https://www.youtube.com/channel/UCMcc9elPZGpg6eU4i3YaCpA/live', streams: 'https://www.youtube.com/channel/UCMcc9elPZGpg6eU4i3YaCpA/streams', cid: 'UCMcc9elPZGpg6eU4i3YaCpA',
      tries: ['https://www.youtube.com/channel/UCMcc9elPZGpg6eU4i3YaCpA/live'] }
  ];
  Sp.youtubeLinks = function (wr) {
    var txt = wr && wr.lines ? wr.lines.join('\n') : '', out = [];
    YT.forEach(function (y) { if (y.re.test(txt)) { out.push({ label: y.label, url: y.url, tries: y.tries, streams: y.streams, cid: y.cid }); } });
    return out;
  };

  /* vídeos de uma página do YouTube (busca ou /streams), sem depender do tipo de componente:
     junta, para cada id de vídeo, os textos próximos (título, canal, "AO VIVO"…). [{ id, text, live }] */
  Sp.parseStreams = function (html) {
    html = String(html || '');
    var re = /"(?:videoId|contentId)":"([\w-]{11})"/g, hits = [], m, byId = {}, out = [];
    while ((m = re.exec(html))) {
      if (!hits.length || hits[hits.length - 1].id !== m[1]) { hits.push({ id: m[1], at: m.index }); }
    }
    hits.forEach(function (x, i) {
      var chunk = html.slice(x.at, Math.min(i + 1 < hits.length ? hits[i + 1].at : x.at + 4000, x.at + 4000));
      var e = byId[x.id];
      if (!e) { e = byId[x.id] = { id: x.id, raw: '' }; out.push(e); }
      e.raw += chunk;
    });
    out.forEach(function (e) {
      var texts = [], r = /"(?:text|content|label|simpleText)":"((?:[^"\\]|\\.)*)"/g, t;
      while ((t = r.exec(e.raw))) { var v = t[1]; try { v = JSON.parse('"' + v + '"'); } catch (er) { /* mantém */ } texts.push(v); }
      e.text = texts.join(' | ');
      e.live = /AO VIVO|assistindo agora|assistindo|LIVE_NOW|BADGE_STYLE_LIVE|"style":"LIVE"|"iconType":"LIVE"|watching/i.test(e.raw);
      delete e.raw;
    });
    return out;
  };

  /* feed RSS do canal (funciona sem navegador): [{ id, title, at }] */
  function xmlText(t) {
    return String(t || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
  }
  Sp.parseFeed = function (xml) {
    var out = [], re = /<entry>([\s\S]*?)<\/entry>/g, m;
    xml = String(xml || '');
    while ((m = re.exec(xml))) {
      var id = /<yt:videoId>([\w-]{11})<\/yt:videoId>/.exec(m[1]), t = /<title>([\s\S]*?)<\/title>/.exec(m[1]), p = /<published>([^<]+)<\/published>/.exec(m[1]);
      if (id) { out.push({ id: id[1], title: xmlText(t && t[1]), at: p ? Date.parse(p[1]) || 0 : 0 }); }
    }
    return out;
  };
  Sp.channelId = function (html) {
    var m = /channel_id=(UC[\w-]{22})/.exec(html) || /"(?:channelId|externalId)":"(UC[\w-]{22})"/.exec(html) || /\/channel\/(UC[\w-]{22})/.exec(html);
    return m ? m[1] : null;
  };

  var GENERIC = { club: 1, city: 1, united: 1, real: 1, sporting: 1, team: 1, futebol: 1, football: 1, clube: 1 };
  function teamWords(name) {
    return Sp.norm(name).split(' ').filter(function (w) { return w.length >= 4 && !GENERIC[w]; });
  }
  /* entre as transmissões AO VIVO, a que cita os times do jogo (e, de preferência, é do canal pedido) */
  Sp.pickLive = function (html, g, chan) {
    var hw = teamWords(g.home.name), aw = teamWords(g.away.name), cn = chan ? Sp.norm(chan).replace(/ /g, '') : '', best = null, bs = 0;
    Sp.parseStreams(html).forEach(function (st) {
      if (!st.live) { return; }
      var t = ' ' + Sp.norm(st.text) + ' ';
      var has = function (ws) { return ws.some(function (w) { return t.indexOf(' ' + w) >= 0; }); };
      var sc = (has(hw) ? 2 : 0) + (has(aw) ? 2 : 0);
      if (!sc) { return; }
      if (cn && t.replace(/ /g, '').indexOf(cn) < 0) { return; }   // só canal oficial: sem reações/watchalongs
      if (cn) { sc += 1; }
      if (sc > bs) { bs = sc; best = st; }
    });
    return best;
  };

  /* pelo feed: vídeo que cita os times (até 14 dias se citar os dois; até 12 h se citar um); resumos/gols perdem para a transmissão */
  Sp.pickFeed = function (xml, g, now) {
    var hw = teamWords(g.home.name), aw = teamWords(g.away.name), best = null, bs = 0;
    Sp.parseFeed(xml).forEach(function (st) {
      if (st.at && (st.at < now - 14 * 86400000 || st.at > now + 3600000)) { return; }
      var t = ' ' + Sp.norm(st.title) + ' ';
      var has = function (ws) { return ws.some(function (w) { return t.indexOf(' ' + w) >= 0; }); };
      var sc = (has(hw) ? 2 : 0) + (has(aw) ? 2 : 0);
      // transmissão pode ser agendada dias antes: se o vídeo é antigo, só vale citando os dois times
      if (!sc || (sc < 4 && st.at && st.at < now - 12 * 3600000)) { return; }
      if (/melhores momentos|gols |resumo|reapresentacao|replay|bastidores/.test(t)) { sc -= 1; }
      if (/ao vivo/.test(t)) { sc += 1; }
      if (sc > bs || (sc === bs && best && st.at > best.at)) { bs = sc; best = st; }
    });
    return best;
  };


  /* ---------- canais: cruza os jogos com a programação ---------- */

  var CAT_RE = /esport|sport|futebol|premiere|libertad|champions|copa|brasileir|conmebol|globo|jogos|combate|dazn|tnt|espn|caz[eé]|fifa|abertos?/i;
  var NAME_RE = /globo|sportv|espn|premiere|tnt|caz[eé]|band|record|sbt|max|prime|paramount|dazn|fox sports|combate|conmebol|nsports|fifa|tv brasil|disney|star\+|bein|sky sports|canal\+/i;

  /* escolhe, entre todos os canais, os que podem passar jogos (pela categoria ou pelo nome) */
  Sp.candidateChannels = function (channels, cats, limit) {
    var good = {};
    (cats || []).forEach(function (c) { if (CAT_RE.test(c.name || '')) { good[c.id] = 1; } });
    var out = channels.filter(function (ch) { return ch.epgId && (good[ch.cat] || NAME_RE.test(ch.name || '')); });
    return out.slice(0, limit || 160);
  };

  /* games: jogos a procurar; progs: { idDoCanal: [{title, desc, start, stop}] }; channels: lista de canais.
     Devolve { idDoJogo: [canal, ...] } (canal com o programa que combinou, melhores primeiro) */
  Sp.assign = function (games, channels, progs) {
    var res = {};
    games.forEach(function (g) {
      var from = g.start - 45 * 60000, to = g.start + 3 * 3600000, hits = [];
      channels.forEach(function (ch) {
        var list = progs[ch.id] || [], best = 0, prog = null, i;
        for (i = 0; i < list.length; i++) {
          var p = list[i];
          if (p.stop <= from || p.start >= to) { continue; }
          var sc = Sp.matchText(g, (p.title || '') + ' ' + (p.desc || ''));
          if (sc > best) { best = sc; prog = p; }
        }
        if (best) { hits.push({ ch: ch, score: best, prog: prog }); }
      });
      hits.sort(function (a, b) { return b.score - a.score; });
      if (hits.length) { res[g.league + ':' + g.id] = hits; }
    });
    return res;
  };

  return Sp;
});
