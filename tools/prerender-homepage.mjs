import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { prepareSocialPreview } from './social-preview.mjs';

// Build-time rendering only: Cloudflare still serves ordinary static assets.
// Vite resolves JSX and CSS modules from the same source as the browser build.
const server = await createServer({ mode: 'production', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { renderHomepage } = await server.ssrLoadModule('/src/homepage/prerender.jsx');
  const { hero, command } = renderHomepage();
  const file = resolve('dist/index.html');
  let html = await readFile(file, 'utf8');
  const islands = [
    { pattern: /<div id="lloyal-showpiece">[\s\S]*?<\/div>\s*(?=<section class="featured-quotes)/, id: 'lloyal-showpiece', content: hero },
    { pattern: /<div id="lloyal-closing-command">[\s\S]*?<\/div>(?=<p class="form-note")/, id: 'lloyal-closing-command', content: command },
  ];
  for (const { pattern, id, content } of islands) {
    if (!pattern.test(html)) throw new Error(`Missing homepage island: ${id}`);
    html = html.replace(pattern, () => `<div id="${id}" data-prerendered="true">${content}</div>\n`);
  }
  await writeFile(file, await prepareSocialPreview(html));
  console.log('Prerendered homepage hero and closing command.');
} finally {
  await server.close();
}
