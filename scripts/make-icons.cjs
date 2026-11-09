// Generates the app icon set from one vector definition.
//   node scripts/make-icons.cjs
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(process.cwd(), 'assets');

const BG = '#0A0A0C';
const ACCENT = '#FF5A1F';

// a check mark: "proof"
const check = (stroke, width, scale = 1) => `
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <path d="M 296 522 L 452 678 L 736 372"
      fill="none" stroke="${stroke}" stroke-width="${width}"
      stroke-linecap="round" stroke-linejoin="round" />
  </g>`;

const full = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${BG}"/>
  ${check(ACCENT, 96, 1)}
</svg>`;

const foreground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${check(ACCENT, 96, 0.72)}
</svg>`;

const mono = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${check('#FFFFFF', 96, 0.72)}
</svg>`;

async function main() {
  const targets = [
    { svg: full, file: 'icon.png', size: 1024 },
    { svg: foreground, file: 'android-icon-foreground.png', size: 432 },
    { svg: mono, file: 'android-icon-monochrome.png', size: 432 },
    { svg: foreground, file: 'splash-icon.png', size: 512 },
    { svg: full, file: 'favicon.png', size: 64 },
  ];
  for (const t of targets) {
    await sharp(Buffer.from(t.svg)).resize(t.size, t.size).png().toFile(path.join(OUT, t.file));
    console.log('wrote', t.file);
  }
  // adaptive icon background is a flat colour
  await sharp({ create: { width: 432, height: 432, channels: 4, background: BG } })
    .png()
    .toFile(path.join(OUT, 'android-icon-background.png'));
  console.log('wrote android-icon-background.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
