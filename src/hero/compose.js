import './compose.css';

// Arc's original vector geometry comes from the Composition of Models film.
// This is an illustrated workflow, not a recorded inference or performance claim.
let instance = 0;

const arrow = '<svg viewBox="0 0 20 20"><path d="M4 10h12m-5-5 5 5-5 5"/></svg>';
const sparkle = '<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4 18.4 5.6"/></svg>';
const picture = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m4 16 5-5 4 4 3-3 4 4"/><circle cx="15.5" cy="8.5" r="1"/></svg>';
const check = '<svg viewBox="0 0 20 20"><path d="m4 10 4 4 8-8"/></svg>';

function lamp(id) {
  return `<svg class="hc-art" viewBox="0 0 600 330" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="${id}-wall" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e9e5dc"/><stop offset="1" stop-color="#d7d0c3"/></linearGradient>
      <linearGradient id="${id}-warm-wall" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f2e4ca"/><stop offset="1" stop-color="#e0c7a5"/></linearGradient>
      <linearGradient id="${id}-ivory" x1="0" y1="0" x2="1" y2=".5"><stop stop-color="#f5f3ec"/><stop offset=".48" stop-color="#ece8de"/><stop offset="1" stop-color="#c7c1b4"/></linearGradient>
      <linearGradient id="${id}-beam" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffe4a0" stop-opacity=".75"/><stop offset="1" stop-color="#ffcf6e" stop-opacity="0"/></linearGradient>
      <radialGradient id="${id}-glow"><stop stop-color="#ffd183" stop-opacity=".8"/><stop offset="1" stop-color="#ffdc99" stop-opacity="0"/></radialGradient>
      <filter id="${id}-soft"><feGaussianBlur stdDeviation="9"/></filter>
    </defs>
    <path d="M0 0h600v330H0z" fill="url(#${id}-wall)"/>
    <path class="hc-warm-wall" d="M0 0h600v330H0z" fill="url(#${id}-warm-wall)" opacity="0"/>
    <path d="M451 0v259l149 47M0 286l451-27" fill="none" stroke="#b3aa9b" stroke-opacity=".32"/>
    <path d="m0 286 451-27 149 47v24H0z" fill="#bcb09b" fill-opacity=".15"/>
    <ellipse cx="313" cy="292" rx="99" ry="9" fill="#706858" opacity=".18" filter="url(#${id}-soft)"/>
    <g class="hc-warm-light" opacity="0">
      <ellipse cx="409" cy="278" rx="155" ry="65" fill="url(#${id}-glow)"/>
      <path d="m352 145 76-12 105 172H312z" fill="url(#${id}-beam)"/>
    </g>
    <g transform="translate(179 4) scale(1.13)">
      <ellipse cx="121" cy="253" rx="67" ry="9" fill="#444039" opacity=".1"/>
      <ellipse cx="111" cy="245" rx="45" ry="8" fill="#898478"/>
      <path d="M66 241Q66 231 111 230Q156 231 156 241L156 246Q111 257 66 246Z" fill="url(#${id}-ivory)"/>
      <path d="M107 235L107 124Q107 52 155 50Q192 52 192 88" fill="none" stroke="#797568" stroke-width="10" stroke-linecap="round"/>
      <path d="M105 234L105 124Q105 50 154 48Q190 48 190 88" fill="none" stroke="url(#${id}-ivory)" stroke-width="8" stroke-linecap="round"/>
      <path d="M158 75Q178 57 198 77L220 112Q190 134 155 117Z" fill="url(#${id}-ivory)"/>
      <ellipse cx="187" cy="116" rx="34" ry="10" fill="#b3afa4" transform="rotate(-8 187 116)"/>
      <ellipse class="hc-warm-shade" cx="187" cy="116" rx="34" ry="10" fill="#ffe2a1" opacity="0" transform="rotate(-8 187 116)"/>
      <path d="M158 75Q170 70 176 70" fill="none" stroke="#faf8ef" stroke-width="2"/>
    </g>
    <g transform="translate(73 269) rotate(-5)">
      <path d="m0 0 65 1 16 13-65-1z" fill="#c3b9a5"/><path d="m16 13 65 1v7L16 20z" fill="#ada18b"/>
      <path d="m-6-7 65 1 16 13-65-1z" fill="#f0eadc"/><path d="m10 6 65 1v7L10 13z" fill="#d5cbb7"/>
    </g>
  </svg>`;
}

export function mountCompose(host, gsap) {
  const id = `hc-${++instance}`;
  host.innerHTML = `<div class="hero-compose">
    <div class="hc-app">
      <div class="hc-app-bar"><span class="hc-brand">atelier<span> / </span></span><span class="hc-app-tagline">A room, considered.</span><span class="hc-app-local"><i></i> Runs on your device</span><span class="hc-app-menu">•••</span></div>
      <div class="hc-workspace">
        <div class="hc-canvas">
          ${lamp(id)}
          <div class="hc-canvas-caption"><span>YOUR SPACE</span><span class="hc-image-label">Arc, in a new light.</span></div>
          <div class="hc-state"><span class="hc-state-before">Original</span><span class="hc-state-after">Edited ${check}</span></div>
          <div class="hc-product"><span class="hc-product-number">01 / 05</span><strong>Arc</strong><span>Considered light. Quiet form.</span></div>
          <div class="hc-art-credit">Illustrated preview</div>
        </div>
        <div class="hc-conversation">
          <div class="hc-chat-heading"><span class="hc-chat-icon">${sparkle}</span><span>Your design assistant</span><i></i></div>
          <div class="hc-message"><span class="hc-message-label">YOU</span><p><span class="hc-typed">Make</span><i class="hc-caret"></i></p></div>
          <div class="hc-thinking"><span class="hc-thinking-icon">${picture}</span><span>Calling image specialist<span class="hc-thinking-code">edit_image</span></span><span class="hc-thinking-dots">···</span></div>
          <div class="hc-response"><span class="hc-response-label">ATELIER</span><p>A softer glow.<br>Same silhouette.</p><span class="hc-response-meta">${check} Updated in your workspace</span></div>
          <div class="hc-composer"><span>Keep making it yours…</span><span class="hc-composer-send">${arrow}</span></div>
        </div>
      </div>
    </div>
    <div class="hc-flow">
      <div class="hc-flow-label">ONE APP.<br>MODELS IN CONCERT.</div>
      <div class="hc-model hc-model-reasoning"><span class="hc-model-icon">${sparkle}</span><span><small>UNDERSTAND</small><strong>Reasoning model</strong></span><span class="hc-model-light"></span><i class="hc-model-progress"></i></div>
      <span class="hc-route hc-route-out">${arrow}<i></i></span>
      <div class="hc-model hc-model-image"><span class="hc-model-icon">${picture}</span><span><small>CREATE</small><strong>Image specialist</strong></span><span class="hc-model-light"></span><i class="hc-model-progress"></i></div>
      <span class="hc-route hc-route-back">${arrow}<i></i></span>
      <div class="hc-model hc-model-context"><span class="hc-model-icon">${check}</span><span><small>CONTINUE</small><strong>Back in context</strong></span><span class="hc-model-light"></span><i class="hc-model-progress"></i></div>
    </div>
  </div>`;

  const q = selector => host.querySelector(selector);
  const qa = selector => host.querySelectorAll(selector);
  const typed = { characters: 4 };
  const prompt = 'Make it warmer.';
  const timeline = gsap.timeline({ paused: true });

  timeline
    .set(qa('.hc-model-progress'), { scaleX: 0, transformOrigin: 'left' }, 0)
    .set(qa('.hc-thinking, .hc-response, .hc-state-after'), { opacity: 0, y: 5 }, 0)
    .set(qa('.hc-warm-wall, .hc-warm-light, .hc-warm-shade'), { opacity: 0 }, 0)
    .set(q('.hc-typed'), { textContent: 'Make' }, 0)
    .to(typed, { characters: prompt.length, duration: 1.05, ease: 'none', onUpdate: () => { q('.hc-typed').textContent = prompt.slice(0, Math.floor(typed.characters)); } }, .65)
    .to(q('.hc-caret'), { opacity: 0, duration: .15 }, 1.85)
    .to(q('.hc-model-reasoning .hc-model-progress'), { scaleX: 1, duration: 1.7, ease: 'power1.inOut' }, 1.6)
    .to(q('.hc-model-reasoning .hc-model-light'), { backgroundColor: '#783bff', duration: .3 }, 1.6)
    .to(q('.hc-model-reasoning'), { borderColor: '#a588e9', backgroundColor: '#f3ecff', duration: .3 }, 1.6)
    .to(q('.hc-route-out i'), { scaleX: 1, duration: .7, ease: 'power1.inOut' }, 3.1)
    .to(q('.hc-thinking'), { opacity: 1, y: 0, duration: .45, ease: 'power2.out' }, 3.5)
    .to(q('.hc-model-image'), { borderColor: '#42bbcc', backgroundColor: '#e2f4f3', duration: .4 }, 3.65)
    .to(q('.hc-model-image .hc-model-light'), { backgroundColor: '#00bdd4', duration: .3 }, 3.65)
    .to(q('.hc-model-image .hc-model-progress'), { scaleX: 1, duration: 3.15, ease: 'power1.inOut' }, 3.65)
    .to(q('.hc-warm-wall'), { opacity: .86, duration: 2.2, ease: 'sine.inOut' }, 4.45)
    .to(qa('.hc-warm-light, .hc-warm-shade'), { opacity: 1, duration: 2.2, ease: 'sine.inOut' }, 4.45)
    .to(q('.hc-state-before'), { opacity: 0, y: -5, duration: .25 }, 6.7)
    .to(q('.hc-state-after'), { opacity: 1, y: 0, duration: .3 }, 6.9)
    .to(q('.hc-route-back i'), { scaleX: 1, duration: .8, ease: 'power1.inOut' }, 7.05)
    .to(q('.hc-model-context'), { borderColor: '#a588e9', backgroundColor: '#f3ecff', duration: .4 }, 7.8)
    .to(q('.hc-model-context .hc-model-light'), { backgroundColor: '#783bff', duration: .3 }, 7.8)
    .to(q('.hc-model-context .hc-model-progress'), { scaleX: 1, duration: .6, ease: 'power1.inOut' }, 7.8)
    .to(q('.hc-thinking'), { opacity: 0, y: -4, duration: .3 }, 7.7)
    .to(q('.hc-response'), { opacity: 1, y: 0, duration: .6, ease: 'power2.out' }, 8.05)
    .to({}, { duration: 5.35 }, 8.65);

  timeline.seek(0);
  return { timeline, still: 10, duration: 14 };
}
