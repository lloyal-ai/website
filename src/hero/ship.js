import { mountShip } from './ship-source.js';
import './ship.css';

export function mountBuild(host, gsap) {
  const scene = mountShip(host);
  const clock = { time: 0 };
  const timeline = gsap.timeline({ paused: true });
  timeline.to(clock, {
    time: scene.duration,
    duration: scene.duration / 1000,
    ease: 'none',
    onUpdate: () => scene.update(clock.time),
  });
  scene.update(0);
  return { timeline, duration: 14, still: 11.5, destroy: scene.destroy };
}
