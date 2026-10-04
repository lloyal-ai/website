import { gsap } from 'gsap';
import { mountBuild } from './ship.js';
import { mountCompose } from './compose.js';
import { mountInspect } from './inspect.js';

const showcase = document.querySelector('[data-hero-showcase]');

if (showcase) {
  const definitions = [
    { mount: mountBuild, name: 'Build an app', caption: 'One command. A working application.', description: 'A TypeScript project becomes a research app, provisions local models and produces a brief, then is packaged for the desktop.' },
    { mount: mountCompose, name: 'Compose models', caption: 'The right model for every move.', description: 'A reasoning model calls an image-editing specialist to make a lamp warmer. The edited image returns to the application’s live context.' },
    { mount: mountInspect, name: 'Inspect execution', caption: 'Look inside the intelligence.', description: 'Three agents branch from shared context. Selecting an agent reveals its tool call and generation signals.' },
  ];
  const hosts = [...showcase.querySelectorAll('[data-hero-scene]')];
  const tabs = [...showcase.querySelectorAll('[data-hero-tab]')];
  const pause = showcase.querySelector('[data-hero-pause]');
  const caption = showcase.querySelector('[data-hero-caption]');
  const description = showcase.querySelector('[data-hero-description]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = definitions.map((definition, index) => {
    const host = hosts[index];
    const scene = definition.mount(host, gsap);
    // The illustration has a concise equivalent, rather than reading out every
    // decorative model label and intermediate animation state.
    [...host.children].forEach(child => child.setAttribute('aria-hidden', 'true'));
    const summary = document.createElement('p');
    summary.className = 'sr-only';
    summary.textContent = definition.description;
    host.append(summary);
    return scene;
  });
  let selected = 1;
  let userPaused = motion.matches;
  let visible = false;
  let pageVisible = !document.hidden;
  let transition = null;
  let disposed = false;

  const canPlay = () => !userPaused && visible && pageVisible && !motion.matches;

  const syncPlayback = () => {
    transition?.paused(!canPlay());
    scenes.forEach((scene, index) => {
      if (index === selected && canPlay()) scene.timeline.play();
      else scene.timeline.pause();
    });
    pause.setAttribute('aria-pressed', String(userPaused));
    pause.setAttribute('aria-label', userPaused ? 'Play animation' : 'Pause animation');
    pause.dataset.paused = String(userPaused);
    pause.disabled = motion.matches;
    if (motion.matches) pause.setAttribute('aria-label', 'Animation disabled by reduced motion preference');
  };

  const show = (index, { animate = true, focus = false } = {}) => {
    // Keyboard selection must pause before creating an entrance transition.
    if (focus) userPaused = true;
    transition?.kill();
    const outgoing = hosts[selected];
    scenes[selected].timeline.pause();
    selected = (index + scenes.length) % scenes.length;
    hosts.forEach((host, i) => {
      host.hidden = i !== selected;
      host.inert = i !== selected;
      gsap.set(host, { opacity: 1, y: 0 });
    });
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === selected));
      tab.tabIndex = i === selected ? 0 : -1;
      tab.style.setProperty('--progress', '0');
    });
    const scene = scenes[selected];
    scene.timeline.pause(motion.matches || userPaused ? scene.still : 0, false);
    tabs[selected].style.setProperty('--progress', String(scene.timeline.progress()));
    caption.textContent = definitions[selected].caption;
    description.textContent = definitions[selected].description;
    showcase.dataset.active = String(selected);
    if (animate && !motion.matches && !userPaused && outgoing !== hosts[selected]) {
      transition = gsap.fromTo(hosts[selected], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
    }
    if (focus) tabs[selected].focus({ preventScroll: true });
    syncPlayback();
  };

  scenes.forEach((scene, index) => {
    scene.timeline.eventCallback('onUpdate', () => {
      tabs[index].style.setProperty('--progress', String(scene.timeline.progress()));
    });
    scene.timeline.eventCallback('onComplete', () => {
      if (index === selected && canPlay()) show((selected + 1) % scenes.length);
    });
  });

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => show(index));
    tab.addEventListener('keydown', (event) => {
      const next = event.key === 'ArrowRight' ? selected + 1
        : event.key === 'ArrowLeft' ? selected - 1
        : event.key === 'Home' ? 0
        : event.key === 'End' ? scenes.length - 1 : null;
      if (next === null) return;
      event.preventDefault();
      show(next, { focus: true });
    });
  });
  pause.addEventListener('click', () => {
    userPaused = !userPaused;
    syncPlayback();
  });
  // A keyboard user can inspect a chosen panel without it changing underneath them.
  showcase.addEventListener('focusin', (event) => {
    if (event.target === pause || !event.target.matches(':focus-visible')) return;
    userPaused = true;
    syncPlayback();
  });
  const onVisibility = () => {
    pageVisible = !document.hidden;
    syncPlayback();
  };
  const onMotionChange = () => {
    userPaused = motion.matches;
    show(selected, { animate: false });
  };
  document.addEventListener('visibilitychange', onVisibility);
  motion.addEventListener('change', onMotionChange);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncPlayback();
  }, { threshold: 0.12 });
  observer.observe(showcase);
  show(selected, { animate: false });
  showcase.classList.add('is-ready');

  // Keep a real static composition if scripting or module loading is unavailable.
  const fallback = showcase.querySelector('[data-hero-fallback]');
  fallback.hidden = true;
  showcase.querySelector('[data-hero-controls]').hidden = false;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    transition?.kill();
    scenes.forEach(scene => { scene.timeline.kill(); scene.destroy?.(); });
    document.removeEventListener('visibilitychange', onVisibility);
    motion.removeEventListener('change', onMotionChange);
  };
  window.addEventListener('pagehide', event => { if (!event.persisted) dispose(); });
  if (import.meta.hot) import.meta.hot.dispose(dispose);
}
