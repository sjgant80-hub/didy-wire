#!/usr/bin/env node
// build-page.mjs — the page inlines the REAL gated kernels VERBATIM (four of them: photon,
// render, mesh, wire). Mechanical transforms only. A FIXPOINT: CI diffs the rebuild.
import { readFileSync, writeFileSync } from 'node:fs';

const strip = (src, dropImports) => src
  .split('\n')
  .filter((l) => !(dropImports && /^import /.test(l)))
  .map((l) => l.replace(/^export (const|function)/, '$1'))
  .join('\n')
  .replace(/<\/script/g, '<\\/script');

const splice = (page, tag, body) => {
  const a = '/*__' + tag + '_START__*/', b = '/*__' + tag + '_END__*/';
  const i = page.indexOf(a), j = page.indexOf(b);
  if (i < 0 || j < 0) { console.error('REFUSED: marker ' + tag + ' missing'); process.exit(1); }
  return page.slice(0, i + a.length) + '\n' + body + '\n' + page.slice(j);
};

let page = readFileSync('page.template.html', 'utf8');
page = splice(page, 'PHOTON', strip(readFileSync('photon.mjs', 'utf8'), false));
page = splice(page, 'RENDER', strip(readFileSync('render.mjs', 'utf8'), false));
page = splice(page, 'MESH', strip(readFileSync('mesh.mjs', 'utf8'), true));
page = splice(page, 'WIRE', strip(readFileSync('wire.mjs', 'utf8'), true));
writeFileSync('index.html', page);
console.log('index.html — ' + page.length + ' bytes, four kernels inlined verbatim');
