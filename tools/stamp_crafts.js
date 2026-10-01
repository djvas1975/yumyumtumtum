// Stamps crafts/sw.js with a version made from Artistry's own files, so every change reaches phones:
// a changed sw.js makes Chrome install the new version, and the open app reloads itself into it.
//   node tools/stamp_crafts.js        (run after any change in crafts/; tests/crafts.test.js fails if you forget)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__dirname, '..', 'crafts');
const SW = path.join(DIR, 'sw.js');

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
function stamp() {
  const v = hash();
  const src = fs.readFileSync(SW, 'utf8');
  const out = src.replace(/^const VERSION = '[^']*';$/m, "const VERSION = '" + v + "';");
  if (out === src && current() !== v) throw new Error('No VERSION line in crafts/sw.js');
  fs.writeFileSync(SW, out);
  return v;
}

if (require.main === module) console.log('crafts/sw.js VERSION = ' + stamp());
module.exports = { files, hash, current, stamp };
