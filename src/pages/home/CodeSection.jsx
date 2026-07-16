const CodeSection = () => {
  return (
    <section className="code-section section" id="build">
      <div className="wrap code-grid">
        <div className="code-copy reveal">
          <p className="section-index">02 / THE PROGRAMMING SURFACE</p>
          <h2>Program intelligent behaviour—not just prompts and calls.</h2>
          <p>
            Lloyal calls this application program the harness: ordinary TypeScript that governs control flow,
            policies, capabilities, human boundaries and live model-state topology.
          </p>
          <p>
            The code can decide which branches exist, what they inherit, which actions require authority, when
            agents recover or stop, and what returns to the continuing product Session.
          </p>
          <div className="inline-links">
            <a href="https://github.com/lloyal-ai/reasoning-run" rel="noreferrer" target="_blank">
              Inspect the flagship application ↗
            </a>
            <a href="https://docs.lloyal.ai/" rel="noreferrer" target="_blank">
              Read the HDK docs ↗
            </a>
          </div>
        </div>

        <div aria-label="Illustrative TypeScript harness code" className="code-card reveal">
          <div className="code-head">
            <span>incident-harness.ts</span>
            <em>TypeScript + Effection</em>
          </div>
          <pre>
            <code>
              <span className="kw">export function*</span>{' incidentHarness(incident) {\n  '}
              <span className="kw">const</span>{' evidence = '}
              <span className="kw">yield*</span>
              {' parallel([\n    inspectTelemetry(incident),\n    searchServiceHistory(incident),\n    reviewTechnicalManuals(incident),\n  ]);\n\n  '}
              <span className="kw">const</span>{' assessment = '}
              <span className="kw">yield*</span>{' reconcile(evidence);\n\n  '}
              <span className="kw">if</span>{' (assessment.requiresApproval) {\n    '}
              <span className="kw">return yield*</span>{' requestOperatorDecision(assessment);\n  }\n\n  '}
              <span className="kw">return yield*</span>{' proposeRemediation(assessment);\n}'}
            </code>
          </pre>
          <div className="code-foot">
            <span>shared live context</span>
            <span>structured cancellation</span>
            <span>policy-governed actions</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CodeSection;
