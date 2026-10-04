// Reframed from Zero-to-Shipped's app-ui / desktop-v2 scenes for a web viewport.
// This is a choreographed product illustration, not a running model or installer.
export function mountShip(root) {
  root.innerHTML = `
    <div class="ship-scene">
      <aside class="ship-project">
        <div class="ship-project-heading"><span class="ship-mini-mark">↳</span> your next idea<span class="ship-project-ext">/</span></div>
        <div class="ship-terminal"><span class="ship-prompt">$</span> <span data-ship-command>npx lloyal-ai new</span><i class="ship-caret"></i></div>
        <div class="ship-config">
          <div class="ship-config-title">harness.yml <span>YOUR APPLICATION</span></div>
          <div><span class="ship-key">model</span>:</div>
          <div class="ship-indent"><span class="ship-key">llm</span>:</div>
          <div class="ship-indent ship-indent-deep">id: qwen3.5-4b</div>
          <div class="ship-indent"><span class="ship-key">vision</span>: {}</div>
          <div class="ship-indent"><span class="ship-key">reranker</span>:</div>
          <div class="ship-indent ship-indent-deep">id: qwen3-reranker-0.6b-q8</div>
        </div>
        <div class="ship-files"><span>src/</span><span>↳ app.ts</span><span>↳ harness/</span><span>↳ ui/</span></div>
        <p class="ship-ownership">A working codebase.<br><strong>Entirely yours to change.</strong></p>
      </aside>
      <div class="ship-desktop">
        <div class="ship-window">
          <div class="ship-chrome"><span class="ship-lights"><i></i><i></i><i></i></span><span>your-app</span><span class="ship-local"><i></i> On device</span></div>
          <div class="ship-app">
            <aside class="ship-sidebar"><div class="ship-app-brand">f<span>(</span>n<span>)</span></div><span class="ship-sidebar-label">YOUR LIBRARY</span><div class="ship-document">↳ A better place to work</div><div class="ship-sidebar-bottom">Local models.<br>Private by design.</div></aside>
            <div class="ship-content">
              <div class="ship-workspace-label"><span>RESEARCH TEMPLATE</span><span data-ship-status>Getting your models ready</span></div>
              <div class="ship-install" data-ship-install>
                <div class="ship-install-icon">↓</div><h3>Intelligence, included.</h3><p>Your app provisions the models it needs.</p>
                <div class="ship-download-label"><span>Qwen3.5 · 4B</span><span data-ship-percent>24%</span></div><div class="ship-download-track"><i data-ship-download></i></div>
                <div class="ship-install-services"><span>✓ System checked</span><span>✓ Vision ready</span></div>
              </div>
              <div class="ship-research" data-ship-research>
                <div class="ship-question">What makes a better place to work?</div>
                <div class="ship-agent-row"><div><i></i><span>Light &amp; focus</span><em>Researching</em></div><div><i></i><span>Space &amp; comfort</span><em>Researching</em></div></div>
                <article class="ship-paper"><span class="ship-paper-kicker">YOUR FIRST BRIEF</span><h3>A better place to work</h3><p>Start with the light. A well-lit workspace supports comfort, focus and the way your day unfolds.</p><div class="ship-paper-rule"></div><div class="ship-paper-lines"><i></i><i></i><i></i></div><div class="ship-citations"><span>01 · Lighting</span><span>02 · Ergonomics</span></div></article>
                <div class="ship-composer"><span>Ask a follow-up…</span><span>↑</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="ship-package" data-ship-package><div class="ship-package-icon"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="m20 3 15 8v18l-15 8-15-8V11Zm-15 8 15 8 15-8M20 19v18M12 7l15 8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></div><div><span>READY TO SHARE</span><strong>Your app. Ready for their desktop.</strong></div><span class="ship-package-check">✓</span></div>
      </div>
    </div>`;
  const command = root.querySelector('[data-ship-command]');
  const install = root.querySelector('[data-ship-install]');
  const research = root.querySelector('[data-ship-research]');
  const download = root.querySelector('[data-ship-download]');
  const percent = root.querySelector('[data-ship-percent]');
  const status = root.querySelector('[data-ship-status]');
  const packaged = root.querySelector('[data-ship-package]');
  const paper = root.querySelector('.ship-paper');
  const agents = root.querySelector('.ship-agent-row');
  const windowEl = root.querySelector('.ship-window');
  const clamp = v => Math.max(0, Math.min(1, v));
  const ease = v => 1 - Math.pow(1 - clamp(v), 4);
  let previousStep = -1;
  return {
    duration: 14000,
    update(ms) {
      const t = ms / 1000;
      const reveal = ease((t - 3.3) / .8);
      const publish = ease((t - 10) / .8);
      const p = .24 + .76 * clamp(t / 3.2);
      download.style.transform = `scaleX(${p})`;
      percent.textContent = `${Math.round(p * 100)}%`;
      install.style.opacity = String(1 - reveal);
      install.style.transform = `translateY(${-12 * reveal}px)`;
      research.style.opacity = String(reveal);
      research.style.transform = `translateY(${14 * (1 - reveal)}px)`;
      paper.style.clipPath = `inset(0 0 ${100 * (1 - ease((t - 5) / 2))}% 0)`;
      agents.style.opacity = String(1 - .35 * ease((t - 7) / .5));
      packaged.style.opacity = String(publish);
      packaged.style.transform = `translateY(${20 * (1 - publish)}px)`;
      windowEl.style.transform = `translateY(${-10 * publish}px)`;
      const step = t < 3.3 ? 0 : t < 7.2 ? 1 : t < 10 ? 2 : 3;
      if (step !== previousStep) {
        status.textContent = ['Getting your models ready', 'Two agents working together', 'Brief complete', 'Ready to ship'][step];
        command.textContent = ['npx lloyal-ai new', 'npm run dev:desktop', 'npm run dev:desktop', 'npx lloyal-ai ship --notarize'][step];
        root.querySelectorAll('.ship-agent-row em').forEach(el => { el.textContent = step > 1 ? 'Complete' : 'Researching'; });
        previousStep = step;
      }
    },
    destroy() { root.replaceChildren(); },
  };
}
