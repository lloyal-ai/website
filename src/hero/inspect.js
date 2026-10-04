import './inspect.css';

// Exact display geometry extracted for the DevTools film. These are observed
// curves, not reconstructed raw token samples or a factual-confidence score.
const TRACE = {"entropy":"M2.04,75.58 L2.72,78.29 M7.49,74.77 L8.17,68.47 L8.85,65.64 L9.53,67.43 L10.21,69.37 L10.89,71.42 L11.57,73.37 L12.26,74.85 L12.94,76.25 L13.62,73.63 L14.30,69.94 L14.98,65.24 L15.66,64.40 L16.34,68.03 L17.02,72.02 L17.70,75.53 L18.38,76.26 L19.06,76.42 L19.74,76.43 L20.43,77.66 L21.11,79.12 L21.79,80.55 L22.47,82.52 L23.15,82.52 L23.83,82.52 L24.51,82.52 L25.19,81.13 L25.87,80.40 L26.55,79.06 L27.23,78.97 L27.91,79.74 L28.60,79.74 L29.28,80.52 L29.96,81.13 L30.64,82.52 M32.00,82.52 L32.68,81.13 L33.36,79.74 L34.04,78.93 L34.72,73.44 L35.40,69.23 L36.09,66.49 L36.77,66.59 L37.45,67.26 L38.13,68.65 L38.81,69.40 L39.49,70.88 L40.17,72.33 L40.85,72.68 L41.53,70.67 L42.21,68.55 L42.89,66.73 L43.57,67.26 L44.26,67.26 L44.94,67.26 L45.62,67.26 L46.30,67.26 L46.98,67.26 L47.66,68.42 L48.34,71.36 L49.02,74.28 L49.70,76.31 L50.38,73.53 L51.06,70.49 L51.74,66.77 L52.43,69.27 L53.11,76.04 M55.15,74.29 L55.83,70.81 L56.51,66.31 L57.19,65.87 L57.87,65.87 L58.55,66.46 L59.23,67.98 L59.91,71.42 M64.68,82.52 L65.36,82.52 L66.04,82.52 L66.72,82.52 M68.77,80.37 L69.45,72.83 L70.13,67.81 L70.81,71.36 L71.49,76.26 M76.26,77.55 L76.94,73.99 L77.62,72.30 L78.30,72.13 L78.98,72.00 L79.66,73.36 L80.34,75.38 L81.02,77.61 L81.70,79.71 L82.38,81.13 L83.06,82.52 M92.60,79.74 L93.28,79.74 L93.96,79.74 L94.64,79.74 M111.66,82.52 L112.34,81.13 L113.02,81.13 M130.04,74.19 L130.72,74.85 L131.40,76.21 L132.09,76.29 L132.77,74.82 L133.45,73.31 L134.13,71.42 L134.81,71.89 L135.49,72.81 L136.17,72.81 L136.85,72.15 L137.53,70.70 L138.21,69.16 L138.89,67.87 L139.57,68.65 L140.26,69.38 L140.94,70.03 L141.62,70.73 L142.30,71.42 L142.98,71.42 L143.66,72.21 L144.34,73.57 L145.02,74.95 L145.70,76.37 L146.38,79.03 M153.87,79.74 L154.55,76.97 M157.96,78.18 L158.64,70.68 L159.32,64.31 L160.00,58.72 L160.68,48.16 L161.36,41.70 L162.04,47.20 L162.72,60.01 L163.40,71.02 M184.51,75.58 L185.19,76.31 L185.87,77.65 L186.55,79.74 M192.68,74.19 L193.36,76.18 M196.09,66.57 L196.77,68.53 L197.45,70.67 L198.13,72.73 L198.81,76.06 L199.49,79.02 M213.11,69.71 L213.79,62.36 L214.47,57.63 L215.15,56.16 M216.51,51.26 L217.19,46.61 L217.87,42.11 L218.55,39.35 L219.23,45.80 L219.91,58.86 L220.60,68.41 L221.28,75.74 L221.96,79.15 L222.64,81.13 M260.09,65.90 L260.77,63.16 L261.45,59.66 L262.13,57.63 L262.81,60.98 L263.49,64.93 L264.17,68.05 L264.85,72.08 L265.53,77.58 M266.89,79.74 L267.57,77.64 L268.26,74.39 L268.94,72.22 L269.62,74.88 L270.30,77.81 L270.98,79.74 M272.34,78.32 L273.02,75.43 L273.70,72.86 L274.38,71.42 M275.74,70.67 L276.43,73.68 L277.11,77.12 L277.79,79.74 M279.15,82.52 L279.83,82.52 M304.34,79.74 L305.02,75.53 L305.70,72.80 L306.38,66.59 L307.06,63.06 L307.74,60.85 L308.43,65.97 L309.11,74.17 L309.79,78.45 M311.15,77.72 L311.83,74.76 L312.51,73.42 L313.19,76.89 L313.87,79.74","surprisal":"M2.04,64.52 L2.72,70.92 L3.40,76.60 L4.09,81.56 M5.45,82.52 L6.13,81.97 L6.81,75.77 L7.49,65.86 L8.17,58.45 L8.85,54.83 L9.53,55.25 L10.21,55.76 L10.89,56.67 L11.57,56.79 L12.26,56.85 L12.94,56.89 L13.62,54.83 L14.30,53.21 L14.98,50.49 L15.66,50.62 L16.34,56.05 L17.02,60.96 L17.70,65.76 L18.38,61.49 L19.06,56.61 L19.74,51.74 L20.43,55.76 L21.11,63.76 L21.79,73.33 L22.47,78.70 L23.15,79.74 L23.83,81.13 L24.51,80.06 L25.19,75.73 L25.87,70.10 L26.55,64.23 L27.23,64.37 L27.91,68.76 L28.60,74.24 L29.28,77.31 L29.96,79.19 L30.64,80.56 L31.32,81.13 L32.00,79.74 L32.68,79.25 L33.36,77.37 L34.04,70.26 L34.72,61.64 L35.40,49.74 L36.09,44.17 L36.77,45.75 L37.45,49.88 L38.13,52.96 L38.81,54.77 L39.49,56.16 L40.17,56.85 L40.85,57.55 L41.53,58.37 L42.21,58.94 L42.89,59.43 L43.57,58.94 L44.26,58.09 L44.94,56.49 L45.62,51.99 L46.30,44.37 L46.98,37.93 L47.66,37.12 L48.34,44.81 L49.02,52.54 L49.70,58.53 L50.38,58.32 L51.06,56.68 L51.74,55.03 L52.43,59.76 L53.11,67.25 L53.79,76.47 L54.47,81.82 L55.15,80.34 L55.83,76.21 L56.51,72.75 L57.19,71.42 L57.87,70.03 L58.55,69.34 L59.23,72.62 L59.91,76.22 L60.60,80.44 M68.09,79.14 L68.77,68.74 L69.45,59.11 L70.13,50.40 L70.81,55.07 L71.49,65.87 L72.17,78.17 M74.89,81.47 L75.57,77.27 L76.26,72.49 L76.94,68.57 L77.62,67.75 L78.30,68.65 L78.98,68.25 L79.66,64.56 L80.34,55.33 L81.02,44.22 L81.70,40.95 L82.38,50.17 L83.06,66.26 L83.74,77.33 M91.91,82.52 L92.60,81.13 L93.28,81.13 L93.96,81.13 L94.64,82.52 L95.32,81.76 L96.00,74.92 L96.68,65.49 L97.36,59.42 L98.04,59.85 L98.72,66.76 L99.40,74.21 L100.09,79.74 L100.77,81.13 L101.45,82.52 M129.36,57.55 L130.04,59.81 L130.72,65.15 L131.40,70.07 L132.09,72.25 L132.77,68.09 L133.45,64.00 L134.13,60.95 L134.81,61.28 L135.49,63.72 L136.17,65.10 L136.85,63.68 L137.53,59.46 L138.21,55.36 L138.89,52.24 L139.57,54.11 L140.26,56.22 L140.94,58.15 L141.62,59.75 L142.30,62.31 L142.98,63.93 L143.66,65.87 L144.34,66.70 L145.02,67.83 L145.70,69.89 L146.38,73.63 L147.06,78.05 L147.74,81.52 M151.15,82.52 L151.83,82.52 L152.51,81.87 L153.19,79.16 L153.87,76.38 L154.55,73.78 L155.23,75.09 L155.91,78.63 L156.60,81.44 L157.28,77.76 L157.96,67.85 L158.64,58.53 L159.32,51.44 L160.00,52.70 L160.68,56.76 L161.36,60.97 L162.04,66.53 L162.72,73.40 L163.40,79.69 M166.81,82.52 L167.49,80.52 L168.17,79.74 M184.51,69.22 L185.19,71.48 L185.87,74.31 L186.55,76.38 L187.23,78.35 L187.91,78.35 L188.60,79.74 L189.28,78.92 L189.96,74.99 L190.64,72.22 L191.32,70.26 L192.00,72.94 L192.68,77.51 L193.36,79.59 L194.04,76.80 L194.72,71.34 L195.40,65.51 L196.09,61.08 L196.77,57.56 L197.45,54.06 L198.13,53.05 L198.81,61.31 L199.49,70.19 L200.17,79.50 M211.74,77.76 L212.43,66.37 L213.11,50.22 L213.79,34.01 L214.47,32.79 L215.15,46.04 L215.83,62.49 L216.51,69.51 L217.19,68.53 L217.87,65.14 L218.55,62.37 L219.23,65.28 L219.91,71.21 L220.60,76.80 L221.28,79.74 L221.96,81.13 L222.64,82.52 M260.09,36.73 L260.77,42.29 L261.45,48.46 L262.13,52.19 L262.81,54.32 L263.49,55.47 L264.17,57.31 L264.85,62.44 L265.53,70.16 L266.21,77.44 L266.89,81.82 L267.57,80.39 L268.26,78.35 L268.94,76.26 L269.62,78.35 L270.30,81.13 L270.98,82.52 L271.66,78.75 L272.34,71.16 L273.02,65.76 L273.70,62.31 L274.38,66.52 L275.06,70.33 L275.74,74.89 L276.43,77.60 L277.11,80.37 L277.79,82.52 M280.51,82.52 L281.19,79.74 L281.87,76.44 L282.55,74.26 L283.23,76.35 L283.91,79.14 L284.60,81.91 M302.98,82.52 L303.66,80.08 L304.34,74.66 L305.02,69.04 L305.70,67.38 L306.38,70.03 L307.06,72.79 L307.74,74.96 L308.43,77.67 L309.11,80.39 L309.79,81.82 L310.47,78.14 L311.15,69.17 L311.83,61.54 L312.51,58.81 L313.19,66.44 L313.87,73.97 L314.55,80.40","area":"M2.04,75.58 L2.72,78.29 L2.72,104 L2.04,104Z M7.49,74.77 L8.17,68.47 L8.85,65.64 L9.53,67.43 L10.21,69.37 L10.89,71.42 L11.57,73.37 L12.26,74.85 L12.94,76.25 L13.62,73.63 L14.30,69.94 L14.98,65.24 L15.66,64.40 L16.34,68.03 L17.02,72.02 L17.70,75.53 L18.38,76.26 L19.06,76.42 L19.74,76.43 L20.43,77.66 L21.11,79.12 L21.79,80.55 L22.47,82.52 L23.15,82.52 L23.83,82.52 L24.51,82.52 L25.19,81.13 L25.87,80.40 L26.55,79.06 L27.23,78.97 L27.91,79.74 L28.60,79.74 L29.28,80.52 L29.96,81.13 L30.64,82.52 L30.64,104 L7.49,104Z M32.00,82.52 L32.68,81.13 L33.36,79.74 L34.04,78.93 L34.72,73.44 L35.40,69.23 L36.09,66.49 L36.77,66.59 L37.45,67.26 L38.13,68.65 L38.81,69.40 L39.49,70.88 L40.17,72.33 L40.85,72.68 L41.53,70.67 L42.21,68.55 L42.89,66.73 L43.57,67.26 L44.26,67.26 L44.94,67.26 L45.62,67.26 L46.30,67.26 L46.98,67.26 L47.66,68.42 L48.34,71.36 L49.02,74.28 L49.70,76.31 L50.38,73.53 L51.06,70.49 L51.74,66.77 L52.43,69.27 L53.11,76.04 L53.11,104 L32.00,104Z M55.15,74.29 L55.83,70.81 L56.51,66.31 L57.19,65.87 L57.87,65.87 L58.55,66.46 L59.23,67.98 L59.91,71.42 L59.91,104 L55.15,104Z M64.68,82.52 L65.36,82.52 L66.04,82.52 L66.72,82.52 L66.72,104 L64.68,104Z M68.77,80.37 L69.45,72.83 L70.13,67.81 L70.81,71.36 L71.49,76.26 L71.49,104 L68.77,104Z M76.26,77.55 L76.94,73.99 L77.62,72.30 L78.30,72.13 L78.98,72.00 L79.66,73.36 L80.34,75.38 L81.02,77.61 L81.70,79.71 L82.38,81.13 L83.06,82.52 L83.06,104 L76.26,104Z M92.60,79.74 L93.28,79.74 L93.96,79.74 L94.64,79.74 L94.64,104 L92.60,104Z M111.66,82.52 L112.34,81.13 L113.02,81.13 L113.02,104 L111.66,104Z M130.04,74.19 L130.72,74.85 L131.40,76.21 L132.09,76.29 L132.77,74.82 L133.45,73.31 L134.13,71.42 L134.81,71.89 L135.49,72.81 L136.17,72.81 L136.85,72.15 L137.53,70.70 L138.21,69.16 L138.89,67.87 L139.57,68.65 L140.26,69.38 L140.94,70.03 L141.62,70.73 L142.30,71.42 L142.98,71.42 L143.66,72.21 L144.34,73.57 L145.02,74.95 L145.70,76.37 L146.38,79.03 L146.38,104 L130.04,104Z M153.87,79.74 L154.55,76.97 L154.55,104 L153.87,104Z M157.96,78.18 L158.64,70.68 L159.32,64.31 L160.00,58.72 L160.68,48.16 L161.36,41.70 L162.04,47.20 L162.72,60.01 L163.40,71.02 L163.40,104 L157.96,104Z M184.51,75.58 L185.19,76.31 L185.87,77.65 L186.55,79.74 L186.55,104 L184.51,104Z M192.68,74.19 L193.36,76.18 L193.36,104 L192.68,104Z M196.09,66.57 L196.77,68.53 L197.45,70.67 L198.13,72.73 L198.81,76.06 L199.49,79.02 L199.49,104 L196.09,104Z M213.11,69.71 L213.79,62.36 L214.47,57.63 L215.15,56.16 L215.15,104 L213.11,104Z M216.51,51.26 L217.19,46.61 L217.87,42.11 L218.55,39.35 L219.23,45.80 L219.91,58.86 L220.60,68.41 L221.28,75.74 L221.96,79.15 L222.64,81.13 L222.64,104 L216.51,104Z M260.09,65.90 L260.77,63.16 L261.45,59.66 L262.13,57.63 L262.81,60.98 L263.49,64.93 L264.17,68.05 L264.85,72.08 L265.53,77.58 L265.53,104 L260.09,104Z M266.89,79.74 L267.57,77.64 L268.26,74.39 L268.94,72.22 L269.62,74.88 L270.30,77.81 L270.98,79.74 L270.98,104 L266.89,104Z M272.34,78.32 L273.02,75.43 L273.70,72.86 L274.38,71.42 L274.38,104 L272.34,104Z M275.74,70.67 L276.43,73.68 L277.11,77.12 L277.79,79.74 L277.79,104 L275.74,104Z M279.15,82.52 L279.83,82.52 L279.83,104 L279.15,104Z M304.34,79.74 L305.02,75.53 L305.70,72.80 L306.38,66.59 L307.06,63.06 L307.74,60.85 L308.43,65.97 L309.11,74.17 L309.79,78.45 L309.79,104 L304.34,104Z M311.15,77.72 L311.83,74.76 L312.51,73.42 L313.19,76.89 L313.87,79.74 L313.87,104 L311.15,104Z","ticks":[0.37234,0.569149,0.788298]};

let instance = 0;

const branch = (id, index) => `
  <div class="hi-lane hi-lane-${id}">
    <span class="hi-branch-join" aria-hidden="true"></span>
    <div class="hi-agent-name"><strong>research <span>#${id}</span></strong><small>${['search + synthesis', 'compare sources', 'verify findings'][index]}</small></div>
    <div class="hi-track">
      <div class="hi-track-rule"></div>
      <div class="hi-segments hi-segments-${id}">
        <span class="hi-span hi-generate" style="left:0;width:${[28, 38, 21][index]}%"></span>
        <span class="hi-span hi-tool" style="left:${[30, 40, 23][index]}%;width:14%"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m4 3-3 3 3 3m4-6 3 3-3 3"/></svg></span>
        <span class="hi-span hi-generate hi-tail" style="left:${[46, 56, 39][index]}%;width:${[41, 31, 51][index]}%"></span>
      </div>
      <span class="hi-head hi-head-${id}" aria-hidden="true"></span>
    </div>
  </div>`;

export function mountInspect(host, gsap) {
  const id = `hi-trace-${++instance}`;
  host.innerHTML = `
    <div class="hero-inspect">
      <div class="hi-app">
        <div class="hi-toolbar">
          <div class="hi-app-name"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3v14h12M4 5h12M4 11h12"/><rect x="13" y="2" width="5" height="5"/><rect x="13" y="8" width="5" height="5"/><rect x="13" y="14" width="5" height="5"/></svg><strong>Run inspector</strong><span>/ fieldnote</span></div>
          <span class="hi-run-status"><i></i>3 concurrent agents</span>
        </div>
        <div class="hi-workspace">
          <div class="hi-timeline">
            <div class="hi-question">Why do people love Product Hunt?</div>
            <div class="hi-section-label"><span>CONTEXT &amp; EXECUTION</span><span class="hi-legend"><i></i>generation<b></b>tool call</span></div>
            <div class="hi-context"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3h10v10H3zM6 6h4M6 9h4"/></svg><strong>Shared context</strong><span>instructions + tools</span><small>inherited</small></div>
            <div class="hi-lanes">${[3, 4, 5].map(branch).join('')}</div>
            <div class="hi-timeline-note"><span class="hi-note-first">One shared context. Three independent branches.</span><span class="hi-note-selected"><i></i>Inspect any branch as it runs.</span></div>
          </div>
          <div class="hi-detail">
            <div class="hi-shared-detail">
              <div class="hi-detail-eyebrow">SHARED CONTEXT</div>
              <h3>Already in memory.</h3>
              <div class="hi-instruction"><span>SYSTEM PROMPT</span><p>Research the question using the available evidence. Report what the sources support.</p></div>
              <div class="hi-tools-label">Available to every branch</div>
              <div class="hi-tool-tags"><span>web_search</span><span>fetch_page</span><span>report</span></div>
              <div class="hi-shared-foot"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>Prefilled once. Inherited on fork.</div>
            </div>
            <div class="hi-agent-detail">
              <div class="hi-selected-header"><span>SELECTED BRANCH</span><strong>research #3</strong><i></i></div>
              <div class="hi-chart-heading"><h3>Generation signals</h3><span>captured trace</span></div>
              <svg class="hi-chart" viewBox="0 0 320 126" preserveAspectRatio="none" role="img" aria-label="Captured entropy and surprisal curves from research agent 3, shown with an animated reveal.">
                <defs><clipPath id="${id}"><rect class="hi-trace-clip" x="0" y="0" width="122" height="106"/></clipPath></defs>
                <path class="hi-chart-grid" d="M0 18H320M0 48H320M0 78H320M0 104H320"/>
                <g clip-path="url(#${id})"><path class="hi-entropy-area" d="${TRACE.area}"/><path class="hi-entropy" d="${TRACE.entropy}"/><path class="hi-surprisal" d="${TRACE.surprisal}"/>${TRACE.ticks.map(x => `<path class="hi-tool-tick" d="M${(x * 320).toFixed(2)} 95v9"/>`).join('')}</g>
                <text x="0" y="122">earlier</text><text x="320" y="122" text-anchor="end">later</text>
              </svg>
              <div class="hi-chart-key"><span><i></i>entropy</span><span><i></i>surprisal</span><span><i></i>tool result</span></div>
              <div class="hi-call"><span class="hi-call-symbol">⌕</span><div><strong>web_search</strong><span>Daily curation and voting systems</span></div><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8h8m-4-4 4 4-4 4"/></svg></div>
              <p class="hi-trace-caption">Captured curves · animated reveal</p>
            </div>
          </div>
        </div>
        <div class="hi-bottom-bar"><span><i></i>One resident model</span><span>Shared state. Visible execution.</span><span class="hi-bottom-shortcut">LLOYAL DEVTOOLS</span></div>
      </div>
    </div>`;

  const one = selector => host.querySelector(selector);
  const all = selector => [...host.querySelectorAll(selector)];
  const timeline = gsap.timeline({ paused: true });

  // All event timing is editorial. Only the curve geometry comes from capture.
  timeline.fromTo(one('.hi-app'), { y: 10 }, { y: 0, duration: 1.2, ease: 'power2.out' }, 0);
  all('.hi-segments').forEach((segments, index) => {
    timeline.fromTo(segments, { clipPath: `inset(0 ${[64, 56, 72][index]}% 0 0)` }, {
      clipPath: 'inset(0 0% 0 0)', duration: 6.5 + index * 0.5, ease: 'none',
    }, 0.4 + index * 0.18);
    timeline.fromTo(one(`.hi-head-${index + 3}`), { left: `${[36, 44, 28][index]}%`, opacity: 1 }, {
      left: `${[87, 87, 90][index]}%`, duration: 6.5 + index * 0.5, ease: 'none',
    }, 0.4 + index * 0.18);
  });
  timeline.to(one('.hi-context'), { borderColor: '#b7a0ec', backgroundColor: '#f0eaf8', duration: 0.5 }, 0.7);
  timeline.to(one('.hi-context'), { borderColor: '#ddd9d0', backgroundColor: '#efede6', duration: 0.65 }, 2.7);
  timeline.to(one('.hi-lane-3'), { backgroundColor: '#f1ebfa', borderColor: '#ba9bf0', duration: 0.5 }, 3);
  timeline.to(one('.hi-lane-3 .hi-agent-name strong'), { color: '#6a2add', duration: 0.5 }, 3);
  timeline.to(one('.hi-shared-detail'), { autoAlpha: 0, y: -8, duration: 0.4 }, 3.1);
  timeline.fromTo(one('.hi-agent-detail'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.65, ease: 'power2.out' }, 3.35);
  timeline.to(one('.hi-note-first'), { autoAlpha: 0, duration: 0.3 }, 3);
  timeline.to(one('.hi-note-selected'), { autoAlpha: 1, duration: 0.4 }, 3.35);
  timeline.to(one('.hi-trace-clip'), { attr: { width: 320 }, duration: 4.7, ease: 'none' }, 3.8);
  timeline.fromTo(one('.hi-call'), { y: 5, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65 }, 5.7);
  timeline.to(all('.hi-head'), { opacity: 0, duration: 0.4 }, 8.5);
  // Hold the fully populated instrument view until the outer controller advances.
  timeline.to({}, { duration: 5.1 }, 8.9);
  return { timeline, still: 10, duration: 14 };
}
