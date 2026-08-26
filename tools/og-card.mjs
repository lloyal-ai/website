#!/usr/bin/env node
/**
 * Render tools/og-card.html to a 1200x630 PNG.
 *
 *   npm run og:card -- public/blog/assets/<slug>-og.png "Headline." "Post title."
 *
 * The headline is the claim, not the title - the title goes in the dek. Keep it
 * short; it is set at 92px and shrinks a step at a time to fit two lines.
 *
 * networkidle0 and a settle delay both matter: the display face is fetched from
 * a CDN, and screenshotting before it lands gives you the fallback in Arial.
 */
import { dirname, resolve } from 'node:path';
import puppeteer from 'puppeteer';

const [out, lead, dek, kicker, foot] = process.argv.slice(2);
if (!out || !lead || !dek) {
  console.error('usage: og-card.mjs <out.png> "<headline>" "<dek>" [kicker] [foot]');
  process.exit(2);
}

const b = await puppeteer.launch({ headless: 'shell', args: ['--hide-scrollbars', '--force-device-scale-factor=1'] });
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await p.goto(`file://${resolve('tools/og-card.html')}`, { waitUntil: 'networkidle0' });
await p.evaluate(([lead, dek, kicker, foot]) => {
  document.getElementById('lead').textContent = lead;
  document.getElementById('dek').textContent = dek;
  if (kicker) document.getElementById('kicker').textContent = kicker;
  if (foot) document.getElementById('foot').textContent = foot;
  // shrink until the headline fits two lines, so a long claim degrades rather
  // than overflowing the card
  const h = document.getElementById('lead');
  for (let size = 92; size > 52; size -= 4) {
    h.style.fontSize = size + 'px';
    if (h.getBoundingClientRect().height <= size * 0.92 * 2 + 4) break;
  }
}, [lead, dek, kicker, foot]);
await p.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 600));
await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await b.close();
console.log(`  ${out} — 1200x630`);
