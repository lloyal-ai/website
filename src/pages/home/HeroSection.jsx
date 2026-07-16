import { Fragment, useEffect, useState } from 'react';
import IntentToggle from './IntentToggle';
import intentCopy from './intentCopy';

// app.js `[data-event-label]` ticker equivalent — cycles the same 5 labels
// every 1800ms, skipped under prefers-reduced-motion.
const EVENT_LABELS = ['agent:spawn', 'branch:fork', 'tool:result', 'spine:extend', 'agent:complete'];

// id shared between IntentToggle's tabs (aria-controls) and the copy region
// below (the tabpanel they control).
const HERO_PANEL_ID = 'hero-intent-panel';

const HeroSection = ({ intent, onIntentChange }) => {
  const [eventLabel, setEventLabel] = useState(EVENT_LABELS[0]);
  const copy = intentCopy[intent];

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % EVENT_LABELS.length;
      setEventLabel(EVENT_LABELS[index]);
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hero" id="top">
      {/* Hero copy is its own sub-snap stop (data-snap) — at 1280×800 hero
          copy + the proof visual together exceed one viewport, so `.hero`
          itself is excluded from snapping (see index.css's `:has()`
          exclusion) and each of its two children snaps independently. */}
      <div className="wrap hero-copy reveal" data-snap>
        <IntentToggle intent={intent} onChange={onIntentChange} panelId={HERO_PANEL_ID} />

        {/* The toggled copy region. `.hero-copy`'s DOM shape (this wrapper,
            every child element, every href target) is identical for both
            intents — only text content, hrefs and emphasis classes swap,
            per the plan's "one DOM, toggled content" contract. */}
        <div aria-labelledby={`intent-tab-${intent}`} id={HERO_PANEL_ID} role="tabpanel">
          <p className="kicker">{copy.kicker}</p>
          <p className="hero-proof-label">
            <code>{copy.proofLabel.code}</code> {copy.proofLabel.suffix}
          </p>
          <h1>
            {copy.h1.map((line, index) => (
              <Fragment key={line.text}>
                {index > 0 && <br />}
                {line.emphasis ? <span>{line.text}</span> : line.text}
              </Fragment>
            ))}
          </h1>
          <p className="hero-bridge">{copy.bridge}</p>
          <p className="hero-dek">{copy.dek}</p>
          <div className="hero-actions">
            {/* Static across both intents — it just scrolls to the proof
                visual immediately below, which is equally relevant either
                way (only its internal accents change). The toggle-driven
                primary/secondary CTA slots from plan §2 are the second
                button and the quiet-link beneath it. */}
            <a className="button button-light" href="#same-harness">
              See the same application
            </a>
            <a className="button button-line" href={copy.primaryCta.href}>
              {copy.primaryCta.label}
            </a>
          </div>
          <a
            className="quiet-link"
            href={copy.secondaryCta.href}
            {...(copy.secondaryCta.external ? { rel: 'noreferrer', target: '_blank' } : {})}
          >
            {copy.secondaryCta.label} <span>{copy.secondaryCta.arrow}</span>
          </a>
        </div>
      </div>

      <div
        aria-label="The same deep-research harness across edge and frontier compute"
        className="wrap hero-proof reveal"
        data-snap
        id="same-harness"
      >
        <div className="proof-pane edge-pane">
          <div className="pane-head">
            <div>
              <span>EDGE</span>
              <strong>Qwen 3.5 · 4B</strong>
            </div>
            <em>on-device</em>
          </div>
          <div aria-hidden="true" className="terminal-mini">
            <p>
              <i>01</i> preflight: 2 sources
            </p>
            <p>
              <i>02</i> plan: 5 research tasks
            </p>
            <p className="live">
              <i>03</i> agentPool: 5 branches
            </p>
            <p>
              <i>04</i> tools: search · fetch · rerank
            </p>
            <p>
              <i>05</i> synthesize: complete
            </p>
          </div>
          <div className="pane-metric capability-metric">
            <strong>4B → APP</strong>
            <span>
              planning · agents
              <br />
              tools · recovery · synthesis
            </span>
          </div>
        </div>

        <div className="harness-spine">
          <div className="spine-label">ONE APPLICATION</div>
          <div className="spine-code">
            <span>preflight()</span>
            <span>plan()</span>
            <span>agentPool()</span>
            <span>policy()</span>
            <span>synthesize()</span>
            <span>commitTurn()</span>
          </div>
          <div className="spine-events">
            <b>{eventLabel}</b>
            <i></i>
          </div>
          <small>same program · same AgentApps · same event contract</small>
        </div>

        <div className="proof-pane frontier-pane">
          <div className="pane-head">
            <div>
              <span>FRONTIER</span>
              <strong>GLM-5.2 · 2×B200</strong>
            </div>
            <em>hosted</em>
          </div>
          <div aria-label="Ten concurrent agents sharing a model context" className="agent-field">
            <div className="shared-board">SHARED KV</div>
            <div aria-hidden="true" className="agents">
              {Array.from({ length: 10 }, (_, i) => (
                <i key={i}>{i + 1}</i>
              ))}
            </div>
          </div>
          <div className="pane-metric frontier-metric">
            <strong>10 → 1</strong>
            <span>
              ten live agents
              <br />
              one model dispatch per step
            </span>
          </div>
        </div>

        <p className="proof-caption">Two real runs. One flagship application built on Lloyal, spanning both extremes.</p>
      </div>
    </section>
  );
};

export default HeroSection;
