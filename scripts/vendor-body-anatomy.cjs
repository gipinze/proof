// One-off: turns react-native-body-highlighter's MIT-licensed SVG asset modules
// into plain typed TS data we own, so the app has no runtime dependency on the
// package.
//
//   npm pack react-native-body-highlighter --pack-destination preview
//   tar -xzf preview/react-native-body-highlighter-*.tgz -C preview/bodypkg
//   node scripts/vendor-body-anatomy.cjs
//
// Emits both body models: the default (male) geometry and the female variant,
// which share every muscle slug we draw.
const fs = require('fs');
const path = require('path');

const OUT = path.join(process.cwd(), 'src', 'data', 'body');

function assetsDir() {
  const candidates = [
    path.join(process.cwd(), 'preview', 'bodypkg', 'package', 'dist', 'assets'),
    path.join(process.cwd(), 'node_modules', 'react-native-body-highlighter', 'dist', 'assets'),
  ];
  const found = candidates.find((dir) => fs.existsSync(dir));
  if (!found) throw new Error('Unpack react-native-body-highlighter first (see header).');
  return found;
}

const dir = assetsDir();
const load = (file) => {
  const mod = require(path.join(dir, file));
  return mod[Object.keys(mod)[0]];
};

function emit(parts, exportName, name) {
  const rows = parts.map((p) => {
    const sides = ['common', 'left', 'right']
      .filter((k) => p.path && p.path[k] && p.path[k].length)
      .map((k) => `${k}: ${JSON.stringify(p.path[k])}`)
      .join(', ');
    return `  { slug: '${p.slug}', paths: { ${sides} } },`;
  });

  return `import type { BodyPart } from './types';

/** ${name} view. Geometry from react-native-body-highlighter (MIT, (c) 2022 ELABBASSI Hicham). */
export const ${exportName}: BodyPart[] = [
${rows.join('\n')}
];
`;
}

const files = [
  ['bodyFront.js', 'FRONT', 'front, male'],
  ['bodyBack.js', 'BACK', 'back, male'],
  ['bodyFemaleFront.js', 'FEMALE_FRONT', 'front, female'],
  ['bodyFemaleBack.js', 'FEMALE_BACK', 'back, female'],
];

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, 'types.ts'),
  `export type BodyPart = {
  slug: string;
  paths: { common?: string[]; left?: string[]; right?: string[] };
};
`,
);

for (const [file, exportName, label] of files) {
  const name = label.replace(/, /g, '-');
  const outFile = `${name.replace('-', '-')}.ts`;
  fs.writeFileSync(path.join(OUT, outFile), emit(load(file), exportName, label), 'utf8');
  console.log(`${outFile.padEnd(14)} ${exportName.padEnd(13)} ${load(file).length} parts`);
}
