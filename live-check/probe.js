const h = require('fs').readFileSync(process.argv[2], 'utf8');
const meta = (p) => {
  const a = new RegExp('<meta[^>]+(?:property|name)=["\']' + p + '["\'][^>]*content=["\']([^"\']*)', 'i').exec(h)
    || new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']' + p + '["\']', 'i').exec(h);
  return a ? a[1] : '';
};
const d = meta('og:description'), t = meta('og:title'), img = meta('og:image'), vid = meta('og:video');
const cap = (h.match(/"caption"\s*:\s*\{[^{}]*?"text"\s*:\s*"((?:[^"\\]|\\.)*)"/) || [])[1] || '';
const marks = ['class="Caption"', 'edge_media_to_caption', 'contextJSON', 'EmbeddedMediaImage', 'accounts/login', 'xdt_api', 'video_versions']
  .filter(k => h.includes(k)).join(',');
console.log(`desc ${d.length} [${d.slice(0, 100).replace(/\s+/g, ' ')}] title ${t.length} [${t.slice(0, 60)}] img ${img ? 'y' : 'n'} vid ${vid ? 'y' : 'n'} capjson ${cap.length} [${cap.slice(0, 60)}] marks ${marks}`);
