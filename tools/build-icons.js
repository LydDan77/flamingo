// Regenerates src/partials/icons.html from Phosphor Icons (MIT, phosphoricons.com).
//   npm pack @phosphor-icons/core@2.1.1 && tar -xzf phosphor-icons-core-2.1.1.tgz
//   node tools/build-icons.js package/assets
// Feature icons use the duotone weight (two layers; the back one gets class "d" so each design version can tint it),
// small UI glyphs use regular / bold, and stars, play and the social marks are filled. To add an icon, add a line to the map.
// The custom product vial symbol (#i-vial) in the existing sprite is carried over untouched.
const fs = require('fs'), path = require('path');
const A = process.argv[2];
if (!A) { console.error('usage: node tools/build-icons.js <path to @phosphor-icons/core/assets>'); process.exit(1); }
const OUT = path.join(__dirname, '..', 'src', 'partials', 'icons.html');
// site name -> [phosphor name, weight]
const M = {
  'arrow-up-right': ['arrow-up-right','regular'], 'arrow-right': ['arrow-right','regular'], 'arrow-down': ['arrow-down','regular'],
  'check': ['check','bold'], 'check-circle': ['check-circle','duotone'], 'chevron-down': ['caret-down','bold'], 'menu': ['list','regular'], 'x': ['x','regular'],
  'plus': ['plus','bold'], 'minus': ['minus','bold'], 'phone': ['phone','duotone'], 'mail': ['envelope-simple','duotone'], 'map-pin': ['map-pin','duotone'],
  'clock': ['clock','duotone'], 'calendar-check': ['calendar-check','duotone'], 'shield-check': ['shield-check','duotone'], 'users': ['users-three','duotone'],
  'user': ['user','duotone'], 'award': ['medal','duotone'], 'sparkles': ['sparkle','duotone'], 'star': ['star','fill'], 'quote': ['quotes','fill'],
  'zap': ['lightning','duotone'], 'heart': ['heart','duotone'], 'heart-pulse': ['heartbeat','duotone'], 'activity': ['pulse','duotone'],
  'stethoscope': ['stethoscope','duotone'], 'home': ['house','duotone'], 'file-text': ['file-text','duotone'], 'dna': ['dna','duotone'],
  'droplets': ['drop','duotone'], 'orbit': ['planet','duotone'], 'flask': ['flask','duotone'], 'microscope': ['microscope','duotone'],
  'graduation-cap': ['graduation-cap','duotone'], 'gauge': ['gauge','duotone'], 'bone': ['bone','duotone'], 'timer': ['timer','duotone'],
  'leaf': ['leaf','duotone'], 'brain': ['brain','duotone'], 'radio': ['radio','duotone'], 'layers': ['stack','duotone'], 'target': ['target','duotone'],
  'trending-up': ['trend-up','duotone'], 'network': ['network','duotone'], 'book-open': ['book-open','duotone'], 'wallet': ['wallet','duotone'],
  'clipboard-list': ['clipboard-text','duotone'], 'clipboard-check': ['list-checks','duotone'], 'package-check': ['seal-check','duotone'],
  'package': ['package','duotone'], 'play': ['play','fill'], 'send': ['paper-plane-tilt','duotone'], 'lock': ['lock','duotone'],
  'credit-card': ['credit-card','duotone'], 'message-circle': ['chat-circle','duotone'], 'help-circle': ['question','duotone'], 'info': ['info','duotone'],
  'building': ['buildings','duotone'], 'headphones': ['headset','duotone'], 'scale': ['scales','duotone'], 'truck': ['truck','duotone'],
  'external': ['arrow-square-out','regular'], 'facebook': ['facebook-logo','fill'], 'instagram': ['instagram-logo','fill'], 'linkedin': ['linkedin-logo','fill'],
  'moon': ['moon','duotone'], 'sun': ['sun','duotone'], 'palette': ['palette','duotone'], 'image': ['image','duotone'], 'user-round': ['user-circle','duotone'],
  'pen': ['pencil-simple','regular']
};
let out = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false">\n';
out += '<!-- Icon sprite: Phosphor Icons 2.1 (MIT, phosphoricons.com). Feature icons use the duotone weight: the back layer carries class "d" so each theme can tint it. -->\n';
let n = 0, bytes = 0;
for (const [name, [ph, w]] of Object.entries(M)) {
  const f = path.join(A, w, w === 'regular' ? `${ph}.svg` : `${ph}-${w}.svg`);
  if (!fs.existsSync(f)) { console.error('MISSING', name, f); process.exitCode = 1; continue; }
  const svg = fs.readFileSync(f, 'utf8');
  const paths = [...svg.matchAll(/<path\b([^>]*)\/>/g)].map(m => m[1]);
  const body = paths.map(attrs => {
    const d = /\bd="([^"]+)"/.exec(attrs)[1];
    const back = /opacity="0\.2"/.test(attrs);
    return back ? `<path class="d" d="${d}"/>` : `<path d="${d}"/>`;
  }).join('');
  if (!body) { console.error('NO PATHS', name); process.exitCode = 1; continue; }
  const sym = `<symbol id="i-${name}" viewBox="0 0 256 256">${body}</symbol>\n`;
  out += sym; n++; bytes += sym.length;
}
const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
const vial = /<symbol id="i-vial"[\s\S]*?<\/symbol>/.exec(old);
if (!vial) { console.error('vial symbol not found'); process.exit(1); }
out += vial[0] + '\n';
out += '</svg>\n';
fs.writeFileSync(OUT, out);
console.log(`wrote ${n} symbols, ${(bytes/1024).toFixed(1)} KB`);
