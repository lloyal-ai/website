import assert from 'node:assert/strict';
import { preview } from 'vite';
import puppeteer from 'puppeteer';
const root = process.cwd();
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  args: process.env.CI ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
});
const server = await preview({ root, preview: { host: '127.0.0.1', port: 5197, strictPort: true }, logLevel: 'error' });
const report = [];
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 1050 });
    await page.setCacheEnabled(false);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    let release;
    const held = new Promise(resolve => { release = resolve; });
    await page.setRequestInterception(true);
    page.on('request', async request => {
      if (!request.url().startsWith('http://127.0.0.1:5197') && !request.url().startsWith('data:')) return request.respond({ status: 200, body: '' });
      if (/\/assets\/index-.*\.js$/.test(request.url())) await held;
      return request.continue();
    });
    const navigation = page.goto('http://127.0.0.1:5197/', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#hero-title');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.querySelectorAll('#lloyal-showpiece img')].every(image => image.complete));
    const measure = () => page.evaluate(() => {
      const box = selector => {
        const el = document.querySelector(selector);
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      };
      return { hero: box('#lloyal-showpiece'), title: box('#hero-title'), app: box('[data-compose-example] section[aria-label="Your App — illustrated composition examples"]'), lead: box('[data-reasoning-lead="research"] [data-model]'), nav: box('[aria-label="Explore the platform"]'), overflow: document.documentElement.scrollWidth > innerWidth, backgroundReady: document.querySelector('img[src*="liquid-field"]').naturalWidth > 0 };
    });
    const before = await measure();
    // Track node identity too: a hydration mismatch can rebuild an identical-looking tree.
    await page.evaluate(() => { window.originalHero = document.querySelector('#developers'); window.originalApp = document.querySelector('[data-app-example]'); });
    release();
    await navigation;
    const after = await measure();
    const retained = await page.evaluate(() => window.originalHero === document.querySelector('#developers') && window.originalApp === document.querySelector('[data-app-example]'));
    assert.equal(retained, true, 'Hydration replaced prerendered nodes');
    assert.equal(before.overflow, false);
    assert.equal(after.overflow, false);
    assert.equal(before.backgroundReady, true);
    assert.deepEqual(after, before, `Layout changed at ${width}px`);
    await page.click('#sp-tab-ship');
    await page.waitForSelector('[data-scene="ship"]');
    await page.click('#sp-tab-compose');
    await page.waitForSelector('[data-compose-example="research"]');
    await page.click('[aria-label="Choose reasoning model"]');
    await page.waitForSelector('[aria-label="Choose reasoning model"][aria-expanded="true"]');
    assert.deepEqual(errors, []);
    report.push({ width, before, after, retained, errors });
    await page.close();
  }
  console.log(JSON.stringify(report.map(r => ({ width:r.width, heroHeight:r.before.hero.height, layoutStable:true, nodesRetained:r.retained, errors:r.errors }))));
} finally { await browser.close(); await new Promise(resolve => server.httpServer.close(resolve)); }
