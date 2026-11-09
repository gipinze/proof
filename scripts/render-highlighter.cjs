// Renders lit front/back views of the react-native-body-highlighter anatomy.
//   node scripts/render-highlighter.cjs
const sharp = require('sharp');

const front = require('react-native-body-highlighter/dist/assets/bodyFront.js').bodyFront;
const back = require('react-native-body-highlighter/dist/assets/bodyBack.js').bodyBack;

const BASE = '#22232A';
const RAMP = ['#2E2F37', '#6E2A0C', '#C2410C', '#F2600C', '#FF9A4D'];

const hex = (h) => h.match(/\w\w/g).map((x) => parseInt(x, 16));
const mix = (a, b, t) => {
  const pa = hex(a);
  const pb = hex(b);
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const heat = (t) => {
  if (!t) return RAMP[0];
  const pos = Math.min(0.999, t) * (RAMP.length - 1);
  const i = Math.floor(pos);
  return mix(RAMP[i], RAMP[i + 1], pos - i);
};

function render(parts, intensity) {
  const out = [];
  for (const part of parts) {
    const fill = part.slug && intensity[part.slug] != null ? heat(intensity[part.slug]) : BASE;
    const paths = (arr) => (arr || []).map((d) => `<path d="${d}" fill="${fill}"/>`).join('');
    out.push(paths(part.path && part.path.common));
    out.push(paths(part.path && part.path.left));
    out.push(paths(part.path && part.path.right));
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 724 1448" width="360" height="720">${out.join('')}</svg>`;
}

(async () => {
  const f = render(front, {
    chest: 1,
    deltoids: 0.55,
    abs: 0.35,
    obliques: 0.45,
    quadriceps: 0.85,
    adductors: 0.3,
  });
  const b = render(back, {
    trapezius: 0.5,
    'upper-back': 0.8,
    'lower-back': 0.6,
    gluteal: 0.9,
    hamstring: 0.7,
    calves: 0.55,
    deltoids: 0.4,
    triceps: 0.5,
  });
  await sharp(Buffer.from(f)).png().toFile('preview/out/hl-front.png');
  await sharp(Buffer.from(b)).png().toFile('preview/out/hl-back.png');

  const fb = await sharp(Buffer.from(f)).png().toBuffer();
  const bb = await sharp(Buffer.from(b)).png().toBuffer();
  await sharp({ create: { width: 760, height: 760, channels: 4, background: '#0B0B0F' } })
    .composite([
      { input: fb, left: 10, top: 20 },
      { input: bb, left: 390, top: 20 },
    ])
    .png()
    .toFile('preview/out/hl-both.png');
  console.log('wrote hl-front/hl-back/hl-both');
})();
