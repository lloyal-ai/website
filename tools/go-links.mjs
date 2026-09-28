#!/usr/bin/env node
/**
 * Generate the tracked /go/<slug>/ redirect pages for the Product Hunt launch.
 *
 *   npm run go:build
 *
 * Single source of truth: the LINKS map below. Each entry becomes
 * public/go/<slug>/index.html, a static page that:
 *
 *   1. Appends ?utm_source=&utm_medium=&utm_campaign=&utm_content= to the URL
 *      (via history.replaceState, before GTM loads) so GA4's page_location
 *      carries the campaign params - but only if the visitor didn't already
 *      arrive with utm_ params of their own.
 *   2. Loads the GTM container (same GTM-WNTXF3WK snippet as the rest of the
 *      site) so the page_view fires with the UTM'd URL.
 *   3. Redirects to the destination with location.replace, once GA has had a
 *      chance to fire (dataLayer 'go_redirect' event w/ eventCallback) or
 *      after a ~1200ms hard fallback timer - whichever comes first. Visitors
 *      with GTM ad-blocked still get the fallback timer.
 *
 * These are plain <a>-clickable HTML pages (not server-side 301s) so the
 * click is visible to GA4 before the visitor leaves lloyal.ai.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = resolve(ROOT, 'public/go');

const CAMPAIGN = 'launch_2026_09_22';
const DEST = 'https://github.com/lloyal-ai/lloyal-ai';

// slug -> { source, medium, content }. campaign and dest are fixed above.
const LINKS = {
  ph: { source: 'producthunt', medium: 'referral', content: 'ph-listing' },
  'ph-comment': { source: 'producthunt', medium: 'referral', content: 'ph-first-comment' },
  'ph-zuhair': { source: 'producthunt', medium: 'referral', content: 'ph-thread-zuhair' },
  'ph-kazim': { source: 'producthunt', medium: 'referral', content: 'ph-thread-kazim' },
  li: { source: 'linkedin', medium: 'social', content: 'li-company' },
  x: { source: 'x', medium: 'social', content: 'x-reply' },
  yt: { source: 'youtube', medium: 'video', content: 'yt-film-desc' },
  devto: { source: 'devto', medium: 'referral', content: 'devto-article1' },
  substack: { source: 'substack', medium: 'referral', content: 'substack-article1' },
  discord: { source: 'discord', medium: 'social', content: 'discord-technovangelist' },
  fahdmirza: { source: 'email', medium: 'email', content: 'email-fahdmirza' },
  consoledev: { source: 'email', medium: 'email', content: 'email-consoledev' },
  devtoolsfm: { source: 'email', medium: 'email', content: 'email-devtoolsfm' },
  promptengineering: { source: 'email', medium: 'email', content: 'email-promptengineering' },
  latentspace: { source: 'email', medium: 'email', content: 'email-latentspace' },
  alphasignal: { source: 'email', medium: 'email', content: 'email-alphasignal' },
  cooperpress: { source: 'email', medium: 'email', content: 'email-cooperpress' },
  alejandroao: { source: 'email', medium: 'email', content: 'email-alejandroao' },
  aijason: { source: 'email', medium: 'email', content: 'email-aijason' },
  leonvanzyl: { source: 'email', medium: 'email', content: 'email-leonvanzyl' },
};

function page(slug, { source, medium, content }) {
  const utm = `utm_source=${source}&utm_medium=${medium}&utm_campaign=${CAMPAIGN}&utm_content=${content}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Redirecting… | LLoyal Labs</title>
    <meta name="theme-color" content="#050505" />
    <script>
      (function () {
        if (!/(?:^|[?&])utm_/.test(location.search)) {
          var sep = location.search ? '&' : '?';
          history.replaceState(null, '', location.pathname + location.search + sep + '${utm}' + location.hash);
        }
      })();
    </script>
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-WNTXF3WK');</script>
    <!-- End Google Tag Manager -->
    <meta http-equiv="refresh" content="2;url=${DEST}" />
    <style>
      html, body { background: #050505; color: #e8e8e8; font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      body { display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; text-align: center; }
      a { color: #e8e8e8; }
    </style>
  </head>
  <body>
    <p>
      Taking you to GitHub…<br />
      <noscript><a href="${DEST}">${DEST}</a></noscript>
    </p>
    <script>
      (function () {
        var dest = '${DEST}';
        var redirected = false;
        function go() {
          if (redirected) return;
          redirected = true;
          location.replace(dest);
        }
        var fallback = setTimeout(go, 1200);
        if (window.dataLayer) {
          window.dataLayer.push({
            event: 'go_redirect',
            eventCallback: function () {
              clearTimeout(fallback);
              go();
            },
            eventTimeout: 1200,
          });
        }
      })();
    </script>
  </body>
</html>
`;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const [slug, params] of Object.entries(LINKS)) {
  const dir = resolve(OUT_DIR, slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.html'), page(slug, params));
  console.log(`wrote public/go/${slug}/index.html`);
}
