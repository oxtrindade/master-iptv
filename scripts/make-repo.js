/* Gera os arquivos do repositório do Homebrew Channel (mesmo formato do repo.webosbrew.org):
   dist/repo.json, description.html e app-icon-large.png -> vão para a Release, ao lado do .ipk
   Endereço que se adiciona no Homebrew Channel: https://github.com/<dono>/<repo>/releases/latest/download/repo.json
   Uso: node scripts/make-repo.js <dono/repositorio>   (ex.: node scripts/make-repo.js rodrigo/iptv-webos) */
var fs = require('fs'), path = require('path'), crypto = require('crypto');

var slug = process.argv[2];
if (!/^[\w.-]+\/[\w.-]+$/.test(slug || '')) { console.error('uso: node scripts/make-repo.js dono/repositorio'); process.exit(1); }
var owner = slug.split('/')[0], repo = slug.split('/')[1];
var root = path.join(__dirname, '..');
var info = JSON.parse(fs.readFileSync(path.join(root, 'app/appinfo.json'), 'utf8'));
var ipkName = info.id + '_' + info.version + '_all.ipk';
var ipk = fs.readFileSync(path.join(root, 'dist', ipkName));
var dl = 'https://github.com/' + slug + '/releases/download/v' + info.version + '/';   // a etiqueta tem de ser v<versão do appinfo.json>
var icon = dl + 'app-icon-large.png';
var desc = 'Cliente IPTV (Xtream Codes) com TV ao vivo, filmes e séries.';

// mesmo formato do repo.json do lg-luma (que o Homebrew Channel já aceita)
var feed = {
  paging: { page: 1, count: 1, maxPage: 1, itemsTotal: 1 },
  packages: [{
    id: info.id, title: info.title, shortDescription: desc,
    fullDescriptionUrl: dl + 'description.html', iconUri: icon,
    manifest: {
      id: info.id, version: info.version, type: info.type, title: info.title,
      appDescription: desc, iconUri: icon, sourceUrl: 'https://github.com/' + slug,
      rootRequired: false,
      ipkUrl: dl + ipkName,
      ipkHash: { sha256: crypto.createHash('sha256').update(ipk).digest('hex') },
      ipkSize: ipk.length
    }
  }]
};
fs.writeFileSync(path.join(root, 'dist', 'repo.json'), JSON.stringify(feed, null, 2));
fs.writeFileSync(path.join(root, 'dist', 'description.html'),
  '<p>' + desc + '</p><p>Login por servidor, usuário e senha. Menu com TV ao vivo, filmes e séries, continuar assistindo, favoritos e escolha de áudio e legenda.</p>');
fs.copyFileSync(path.join(root, 'app/largeIcon.png'), path.join(root, 'dist', 'app-icon-large.png'));
console.log('ok', ipkName, 'sha256', feed.packages[0].manifest.ipkHash.sha256.slice(0, 12) + '…');
console.log('Endereço para o Homebrew Channel: https://github.com/' + slug + '/releases/latest/download/repo.json');
