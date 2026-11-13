// Bundles the viewer into self-contained HTML files.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

const tpl = readFileSync('src/template.html', 'utf8');
const bundle = async (external) => (await build({
  entryPoints: ['src/viewer.js'], bundle: true, format: 'esm', minify: true, write: false, external,
})).outputFiles[0].text.replaceAll('</script', '<\\/script');

// 1. fully offline single file (three.js inlined)
const full = await bundle([]);
writeFileSync('docs/index.html', tpl.replace('<!--SCRIPT-->', () => `<script type="module">${full}</script>`));

console.log('index.html', (full.length / 1024).toFixed(0) + ' KB');
