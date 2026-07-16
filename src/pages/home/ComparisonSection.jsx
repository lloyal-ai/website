const ComparisonSection = () => {
  return (
    <section className="comparison section" id="difference">
      <div className="wrap">
        <div className="comparison-intro reveal">
          <p className="section-index">01 / BARE VS HARNESSED</p>
          <div className="category-contrast">
            <article className="contrast-panel contrast-bare">
              <div className="contrast-panel-head">
                <span>BARE MODEL</span>
                <em>model → endpoint → tokens</em>
              </div>
              <h2>
                <span>Self-host a bare model.</span>
                <strong>You get an endpoint for tokens.</strong>
              </h2>
            </article>
            <article className="contrast-panel contrast-harnessed">
              <div className="contrast-panel-head">
                <span>HARNESSED MODEL</span>
                <em>model + application → product surfaces</em>
              </div>
              <h2>
                <span>Self-host a harnessed model.</span>
                <strong>You get one intelligent application across your product surfaces.</strong>
              </h2>
            </article>
          </div>
        </div>

        <div className="comparison-lede reveal">
          <p>
            Both run on your infrastructure. The difference is what you deploy: a model waiting behind an
            endpoint, or a model combined with the application program that defines its specialists,
            capabilities, authority and continuation.
          </p>
          <strong>CLI, desktop and web become surfaces over the same intelligent application.</strong>
        </div>

        <div className="comparison-grid reveal">
          <article className="comparison-card">
            <div className="comparison-label">HOSTED BARE MODEL</div>
            <h3>Consume tokens</h3>
            <div className="comparison-stack">
              <span>Application</span>
              <b>↓</b>
              <span>Agent framework</span>
              <b>↓</b>
              <span className="request-box">N model API runs</span>
              <b>↓</b>
              <span className="endpoint-box">Claude · OpenAI · Gemini</span>
            </div>
            <p>The provider serves the model. Your product assembles behaviour around its responses.</p>
          </article>

          <article className="comparison-card">
            <div className="comparison-label">SELF-HOSTED BARE MODEL</div>
            <h3>Serve tokens privately</h3>
            <div className="comparison-stack">
              <span>Application</span>
              <b>↓</b>
              <span>Agent framework</span>
              <b>↓</b>
              <span className="request-box">N inference requests</span>
              <b>↓</b>
              <span className="endpoint-box">Private GLM-5.2 endpoint</span>
            </div>
            <p>The weights and data move inside your infrastructure. The product still receives tokens through an endpoint.</p>
          </article>

          <article className="comparison-card lloyal-comparison">
            <div className="comparison-label">LLOYAL · HARNESSED MODEL</div>
            <h3>Run the intelligent application</h3>
            <div className="comparison-stack">
              <span>Product surfaces</span>
              <b>↓</b>
              <span className="application-box">
                One intelligent application
                <br />
                <small>harness · policy · capabilities · branch topology</small>
              </span>
              <b>↓</b>
              <span className="population-box">One live model-state population</span>
              <b>↓</b>
              <span className="resident-box">Resident model execution</span>
            </div>
            <p>Model execution and product behaviour run as one application across CLI, desktop and web.</p>
          </article>
        </div>

        <div className="comparison-conclusion reveal">
          <span>Same weights. Same infrastructure.</span>
          <strong>Bare models expose tokens. Harnessed models carry the application.</strong>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection;
