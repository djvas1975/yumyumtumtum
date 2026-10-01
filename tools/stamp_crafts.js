// Stamps crafts/sw.js with a version made from Artistry's own files, so every change reaches phones:
// a changed sw.js makes Chrome install the new version, and the open app reloads itself into it.
//   node tools/stamp_crafts.js        (run after any change in crafts/; tests/crafts.test.js fails if you forget)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__dirname, '..', 'crafts');
const SW = path.join(DIR, 'sw.js');
const MANIFEST = path.join(DIR, 'manifest.webmanifest');

function files() {
  const top = fs.readdirSync(DIR).filter(f => f !== 'sw.js' && fs.statSync(path.join(DIR, f)).isFile());
  const icons = fs.existsSync(path.join(DIR, 'icons')) ? fs.readdirSync(path.join(DIR, 'icons')).map(f => 'icons/' + f) : [];
  return top.concat(icons).sort();
}
function hash() {
  const h = crypto.createHash('sha256');
  for (const f of files()) { h.update(f + '\0'); h.update(fs.readFileSync(path.join(DIR, f))); }
  return 'bng-' + h.digest('hex').slice(0, 12);
}
function current() {
  const m = fs.readFileSync(SW, 'utf8').match(/^const VERSION = '([^']+)';$/m);
  return m ? m[1] : '';
}
// Since Chrome 144 (Jan 2026) an installed app's icon only updates when the icon's address in the manifest changes;
// a new picture saved under the same file name is ignored. So each icon address carries a fingerprint of its picture
// (icons/icon-512.png?v=1a2b3c4d), and a new picture gets a new address by itself.
function pics(write) {
  const src = fs.readFileSync(MANIFEST, 'utf8');
  const out = src.replace(/"src":(\s*)"(icons\/[^"?]+)(\?v=[0-9a-f]*)?"/g, (m, sp, rel) => {
    const f = path.join(DIR, rel);
    if (!fs.existsSync(f)) return m;
    return '"src":' + sp + '"' + rel + '?v=' + crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 8) + '"';
  });
  if (write && out !== src) fs.writeFileSync(MANIFEST, out);
  return out === src;
}
function stamp() {
  pics(true);
  const v = hash();
  const src = fs.readFileSync(SW, 'utf8');
  const out = src.replace(/^const VERSION = '[^']*';$/m, "const VERSION = '" + v + "';");
  if (out === src && current() !== v) throw new Error('No VERSION line in crafts/sw.js');
  fs.writeFileSync(SW, out);
  return v;
}

if (require.main === module) console.log('crafts/sw.js VERSION = ' + stamp());
module.exports = { files, hash, current, stamp, pics };
