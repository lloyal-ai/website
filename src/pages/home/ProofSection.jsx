// Content fixes locked in per planning/specs/2026-07-16-homepage-live-port-plan.md §3 —
// see that doc's mandatory-fixes list before editing this file's copy; the
// superseded prototype phrasing must not come back.
const ProofSection = () => {
  return (
    <section className="proof section" id="proof">
      <div className="wrap">
        <div className="section-head reveal">
          <p className="section-index">04 / THE RECEIPTS</p>
          <h2>One programming surface. Two radically different compute envelopes.</h2>
        </div>

        <div className="receipt-grid">
          <article className="receipt reveal" data-receipt="01">
            <div className="receipt-number">01</div>
            <div className="receipt-tag">SCALE DOWN</div>
            <h3>The harness amplifies the model.</h3>
            <p>
              A quantised 4B model runs a full application with planning, source reconnaissance, human review,
              multi-agent investigation, tools, pressure-aware recovery and synthesis—not a local chatbot.
            </p>
            <dl>
              <div>
                <dt>Model</dt>
                <dd>Qwen 3.5 4B · quantised</dd>
              </div>
              <div>
                <dt>Directional RACE</dt>
                <dd>0.405</dd>
              </div>
              <div>
                <dt>Reference anchor</dt>
                <dd>Claude 3.7 · 0.422</dd>
              </div>
            </dl>
            <p className="fineprint">
              Directional English subset — the 4B scored 4 of the benchmark&apos;s 5 English tasks (task 83
              planner-stalled); not a leaderboard submission or same-task Claude comparison. Citation grounding
              was the identified weakness.
            </p>
            <a href="/edge-evaluation.pdf" target="_blank">
              Read the evaluation <span>↗</span>
            </a>
          </article>

          <article className="receipt reveal" data-receipt="02">
            <div className="receipt-number">02</div>
            <div className="receipt-tag">SCALE UP</div>
            <h3>The harness compounds the model.</h3>
            <p>
              <strong className="receipt-lead">Ten agents. One model dispatch per step.</strong> One GLM-5.2
              deployment advanced ten concurrent research agents over a shared decoded context. The deployment
              served them as one live branch population—not ten independent model conversations.
            </p>
            <dl>
              <div>
                <dt>Concurrent agents</dt>
                <dd>10</dd>
              </div>
              <div>
                <dt>Model deployment</dt>
                <dd>1</dd>
              </div>
              <div>
                <dt>Shared contexts</dt>
                <dd>1</dd>
              </div>
              <div>
                <dt>Decode dispatches</dt>
                <dd>1 per generation step</dd>
              </div>
            </dl>
            <p className="fineprint">
              Fan-out still consumes KV capacity and generated tokens. It does not duplicate the resident model or
              reconstruct the shared prefix for every agent.
            </p>
            <a href="/blog/shifting-the-harness-left/" rel="noreferrer" target="_blank">
              Read the run report and cost receipt <span>↗</span>
            </a>
          </article>
        </div>
      </div>
    </section>
  );
};

export default ProofSection;
