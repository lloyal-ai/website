import { useEffect, useState } from 'react';

// app.js `[data-event-label]` ticker equivalent — cycles the same 5 labels
// every 1800ms, skipped under prefers-reduced-motion.
const EVENT_LABELS = ['agent:spawn', 'branch:fork', 'tool:result', 'spine:extend', 'agent:complete'];

const HeroSection = () => {
  const [eventLabel, setEventLabel] = useState(EVENT_LABELS[0]);

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
      <div className="wrap hero-copy reveal">
        <p className="kicker">A programming surface for intelligence</p>
        <p className="hero-proof-label">
          <code>reasoning.run</code> — one application built on Lloyal
        </p>
        <h1>
          One application.
          <br />
          <span>4B at the edge.</span>
          <br />
          Ten agents at the
          <br />
          frontier.
        </h1>
        <p className="hero-bridge">Not two model integrations. One TypeScript harness spanning both.</p>
        <p className="hero-dek">
          Lloyal brings live model execution into the application itself, letting one intelligent program
          contract to edge-scale weights or expand into a frontier agent population.
        </p>
        <div className="hero-actions">
          <a className="button button-light" href="#same-harness">
            See the same application
          </a>
          <a className="button button-line" href="#ship">
            Build with Lloyal
          </a>
        </div>
        <a
          className="quiet-link"
          href="https://github.com/lloyal-ai/reasoning-run"
          rel="noreferrer"
          target="_blank"
        >
          Inspect the TypeScript application <span>↗</span>
        </a>
      </div>

      <div
        aria-label="The same deep-research harness across edge and frontier compute"
        className="wrap hero-proof reveal"
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
