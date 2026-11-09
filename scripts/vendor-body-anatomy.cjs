// One-off: turns react-native-body-highlighter's MIT-licensed SVG asset modules
// into plain typed TS data we own, so the app has no runtime dependency on the
// package (and does not bundle the female variants or the component).
//
//   node scripts/vendor-body-anatomy.cjs
const fs = require('fs');
const path = require('path');

const PKG = 'react-native-body-highlighter';
const OUT = path.join(process.cwd(), 'src', 'data', 'body');

const front = require(`${PKG}/dist/assets/bodyFront.js`).bodyFront;
const back = require(`${PKG}/dist/assets/bodyBack.js`).bodyBack;

function emit(parts, name) {
  const rows = parts.map((p) => {
    const sides = ['common', 'left', 'right']
      .filter((k) => p.path && p.path[k] && p.path[k].length)
      .map((k) => `${k}: ${JSON.stringify(p.path[k])}`)
      .join(', ');
    return `  { slug: '${p.slug}', paths: { ${sides} } },`;
  });
  return `import type { BodyPart } from './types';

/** ${name} view. Geometry from react-native-body-highlighter (MIT, (c) 2022 ELABBASSI Hicham). */
export const ${name.toUpperCase()}: BodyPart[] = [
${rows.join('\n')}
];
`;
}

fs.mkdirSync(OUT, { recursive: true });

fs.writeFileSync(
  path.join(OUT, 'types.ts'),
  `export type BodyPart = {
  slug: string;
  paths: { common?: string[]; left?: string[]; right?: string[] };
};
`,
);

fs.writeFileSync(path.join(OUT, 'front.ts'), emit(front, 'front'));
fs.writeFileSync(path.join(OUT, 'back.ts'), emit(back, 'back'));

fs.writeFileSync(
  path.join(OUT, 'LICENSE'),
  fs.readFileSync(path.join('node_modules', PKG, 'LICENSE'), 'utf8'),
);

console.log('vendored', front.length, 'front parts and', back.length, 'back parts');
