#!/usr/bin/env node
/**
 * Test runner.
 *
 * The app's source uses extensionless imports and TypeScript, which Node's own
 * type stripping cannot resolve. Bundling each test file with esbuild (already
 * present via Expo) produces something `node --test` can run directly, with no
 * extra test framework to keep up to date.
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';

const files = readdirSync('tests').filter((f) => f.endsWith('.test.ts')).sort();
if (files.length === 0) {
  console.error('No test files found in tests/');
  process.exit(1);
}

rmSync('.tmp-tests', { recursive: true, force: true });
mkdirSync('.tmp-tests', { recursive: true });

const bundles = [];
for (const file of files) {
  const outfile = `.tmp-tests/${file.replace(/\.ts$/, '.mjs')}`;
  await build({
    entryPoints: [`tests/${file}`],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    logLevel: 'silent',
    external: ['react-native', 'react', 'expo-*', '@expo/*'],
  });
  bundles.push(outfile);
}

execFileSync(process.execPath, ['--test', ...bundles], { stdio: 'inherit' });
rmSync('.tmp-tests', { recursive: true, force: true });
