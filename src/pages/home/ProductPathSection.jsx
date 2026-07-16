const ProductPathSection = () => {
  return (
    <section className="product-path section" id="product">
      <div className="wrap">
        {/* Headline + lede grouped into one sub-snap stop (short combined
            span at 1280×800); the command/scaffold cards and the execution
            band each get their own stop below — real measured content,
            not the 2-way split the plan sketched, since the combined
            headline+cards span is taller than one viewport. */}
        <div className="product-intro" data-snap>
          <div className="section-head reveal">
            <p className="section-index">03 / FROM APPLICATION TO PRODUCT</p>
            <h2>
              Create the intelligent application.
              <br />
              Wire the product around it.
            </h2>
          </div>

          <p className="product-lede reveal">
            <code>harness.dev create</code> scaffolds the headless application today. The product shape in
            development wires that same program into CLI, Desktop and Web without re-authoring its intelligence.
          </p>
        </div>

        <div className="product-entry-grid" data-snap>
          <article className="command-card reveal">
            <div className="status-line">
              <span className="status status-live">AVAILABLE NOW</span>
              <em>developer entry point</em>
            </div>
            <h3>Start with the application program.</h3>
            <div aria-label="Create a new Lloyal harness project" className="command-shell">
              <span>$</span>
              <code>npx harness.dev create claims-review</code>
            </div>
            <p>
              Creates a runnable TypeScript harness with model configuration, parallel research, synthesis and a
              signed AgentApp. Point <code>harness.json</code> at a local GGUF and run it.
            </p>
            <div className="command-actions">
              <a href="https://docs.lloyal.ai/" rel="noreferrer" target="_blank">
                Read the getting-started path ↗
              </a>
              <a href="https://github.com/lloyal-ai/hdk" rel="noreferrer" target="_blank">
                Inspect HDK ↗
              </a>
            </div>
          </article>

          <article className="scaffold-card reveal">
            <div className="status-line">
              <span className="status status-building">IN DEVELOPMENT</span>
              <em>unified scaffold</em>
            </div>
            <h3>One harness. Three product surfaces.</h3>
            <div aria-label="One headless harness wired into CLI, desktop and web front ends" className="scaffold-map">
              <div className="scaffold-core">
                <span>HEADLESS HARNESS</span>
                <strong>orchestration · policy · AgentApps</strong>
                <small>event / command contract</small>
              </div>
              <div aria-hidden="true" className="scaffold-lines">
                <i></i>
                <i></i>
                <i></i>
              </div>
              <div className="surface-stack">
                <div>
                  <span>CLI</span>
                  <small>terminal projection</small>
                </div>
                <div>
                  <span>DESKTOP</span>
                  <small>installed application</small>
                </div>
                <div>
                  <span>WEB</span>
                  <small>cloud or self-hosted</small>
                </div>
              </div>
            </div>
            <p>Each interface projects the same headless entrypoint. The product shell changes; the intelligent application does not.</p>
          </article>
        </div>

        <div className="execution-band reveal" data-snap>
          <div>
            <span>BUILT FOR MODELS YOU CAN RUN</span>
            <p>
              Live-state programming requires access to model execution—not only an opaque API response. Run the
              weights on-device, on a workstation, in your cloud account or inside customer infrastructure.
            </p>
          </div>
          <div aria-label="Licensing and trust model" className="license-strip">
            <span>
              Apache <code>harness.dev</code> CLI
            </span>
            <span>FSL runtime</span>
            <span>Reviewed &amp; signed AgentApps</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductPathSection;
