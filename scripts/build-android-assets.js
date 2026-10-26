/* Copia a interface web (app/) para android/app/src/main/assets/www, sem os arquivos só do webOS,
   e ajusta o <meta viewport> para o Android. Rode sempre que mudar algo em app/:
     node scripts/build-android-assets.js                                                    */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'app');
const dst = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'www');
const skip = new Set(['appinfo.json', 'icon.png', 'largeIcon.png']);

function copy(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    if (skip.has(name) && from === src) { continue; }
    const a = path.join(from, name), b = path.join(to, name);
    if (fs.statSync(a).isDirectory()) { copy(a, b); } else { fs.copyFileSync(a, b); }
  }
}

fs.rmSync(dst, { recursive: true, force: true });
copy(src, dst);

const idx = path.join(dst, 'index.html');
let html = fs.readFileSync(idx, 'utf8');
const meta = '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">';
if (!/<meta name="viewport"[^>]*>/.test(html)) { throw new Error('index.html sem <meta viewport>'); }
html = html.replace(/<meta name="viewport"[^>]*>/, meta);
fs.writeFileSync(idx, html);
console.log('assets do Android atualizados em', path.relative(root, dst));
