// Renders the react-native-body-highlighter anatomy to PNG so we can compare it
// against the hand-authored map before adopting it.
//   node scripts/preview-highlighter.cjs
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(process.cwd(), 'preview', 'out');
fs.mkdirSync(OUT, { recursive: true });

const front = require('react-native-body-highlighter/dist/assets/bodyFront.js').bodyFront;
const back = require('react-native-body-highlighter/dist/assets/bodyBack.js').bodyBack;

const BASE = '#22232A';
const RAMP = ['#2E2F37', '#6E2A0C', '#C2410C', '#F2600C', '#FF9A4D'];

function hex(h) {
  return h.match(/\w\w/g).map((x) => parseInt(x, 16));
}
function mix(a, b, t) {
  const pa = hex(a);
  const pb = hex(b);
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function heat(t) {
  if (!t) return RAMP[0];
  const pos = Math.min(0.999, t) * (RAMP.length - 1);
  const i = Math.floor(pos);
  return mix(RAMP[i], RAMP[i + 1], pos - i);
}

function render(parts, intensities, size = 420) {
  const body = [];
  for (const part of parts) {
    const slug = part.slug;
    const fill = slug && intensities[slug] != null ? heat(intensities[slug]) : BASE;
    const pathsFor = (arr) => (arr || []).map((d) => `<path d="${d}" fill="${fill}" />`).join('');
    body.push(pathsFor(part.path?.common));
    body.push(pathsFor(part.path?.left));
    body.push(pathsFor(part.path?.right));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 724 1448" width="${size}" height="${size * 2}">
    <rect width="724" height="1448" fill="#0B0B0F"/>${body.join('')}</svg>`;
}

async function main() {
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="640">
    <rect width="900" height="640" fill="#0B0B0F"/>
    ${render(front, { chest: 1, deltoids: 0.5, abs: 0.3, quadriceps: 0.8, obliques: 0.4 }, 300)
      .replace(/<\/?svg[^>]*>/g, '')
      .replace('<rect width="724" height="1448" fill="#0B0B0F"/>', '')}
  </svg>`;

  // render each view separately, then compose
  const f = await sharp(Buffer.from(render(front, { chest: 1, deltoids: 0.55, abs: 0.3, quadriceps: 0.8, obliques: 0.4 })))
    .resize({ height: 620 })
    .png()
    .toBuffer();
  const b = await sharp(Buffer.from(render(back, { trapezius: 0.5, 'upper-back': 0.7, gluteal: 0.9, hamstring: 0.6, calves: 0.5 })))
    .resize({ height: 620 })
    .png()
    .toBuffer();
  const f2 = await sharp(Buffer.from(render(front, {}))).resize({ height: 620 }).png().toBuffer();
  const b2 = await sharp(Buffer.from(render(back, {}))).resize({ height: 620 }).png().toBuffer();

  const buffers = [f, b, f2, b2];
  const metas = await Promise.all(buffers.map((buf) => sharp(buf).metadata()));
  const width = metas.reduce((s, m) => s + m.width + 20, 20);

  await sharp({ create: { width, height: 660, channels: 4, background: '#0B0B0F' } })
    .composite(
      buffers.map((input, i) => ({
        input,
        left: 20 + metas.slice(0, i).reduce((s, m) => s + m.width + 20, 0),
        top: 20,
      })),
    )
    .png()
    .toFile(path.join(OUT, 'highlighter.png'));

  console.log('wrote preview/out/highlighter.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
