#!/usr/bin/env node
/**
 * Render tools/og-card.html to a 1200x630 PNG.
 *
 *   node tools/og-card.mjs public/blog/assets/<slug>-og.png
 *
 * networkidle0 and a settle delay both matter: the display face is fetched from
 * a CDN, and screenshotting before it lands gives you the fallback in Arial.
 */
import { dirname, resolve } from 'node:path';
import puppeteer from 'puppeteer';

const out = process.argv[2];
if (!out) { console.error('usage: og-card.mjs <out.png>'); process.exit(2); }

const b = await puppeteer.launch({ headless: 'shell', args: ['--hide-scrollbars', '--force-device-scale-factor=1'] });
const p = await b.newPage();
await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await p.goto(`file://${resolve('tools/og-card.html')}`, { waitUntil: 'networkidle0' });
await p.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 600));
await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await b.close();
console.log(`  ${out} — 1200x630`);
