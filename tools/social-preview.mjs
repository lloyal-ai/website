import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

/** Keep preview cards on their own deployment, and invalidate old image caches. */
export async function prepareSocialPreview(html, { branch = process.env.WORKERS_CI_BRANCH } = {}) {
  const production = 'https://lloyal.ai';
  const alias = branch?.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
  const origin = alias && branch !== 'main'
    ? `https://${alias}-website.strongly-com-au.workers.dev`
    : production;
  const tag = html.match(/<meta content="([^"]+)" property="og:image"\/>/);
  if (!tag) throw new Error('Missing homepage og:image');
  const original = new URL(tag[1]);
  const source = await readFile(resolve(`public${original.pathname}`));
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 12);
  const extension = extname(original.pathname);
  const path = original.pathname.slice(0, -extension.length) + `-${hash}${extension}`;
  await writeFile(resolve(`dist${path}`), source);
  return html
    .replaceAll(tag[1], new URL(path, origin).href)
    .replace(/<meta content="[^"]+" property="og:url"\/>/, `<meta content="${origin}/" property="og:url"/>`);
}
