import PartnerForm from './PartnerForm';

const ShipSection = () => {
  return (
    <section className="ship section" id="ship">
      <div className="start-band">
        <div className="wrap ship-wrap">
          <div className="section-head reveal">
            <p className="section-index">05 / START</p>
            <h2>Start with the platform. Or build an intelligent product capability with us.</h2>
            <p>
              Use the shipped developer tooling yourself, follow the deployment path as it lands, or work
              directly with Lloyal to make a high-value capability part of the product your customers already use.
            </p>
          </div>

          <div className="paths-grid reveal conversion-paths">
            <article data-path="build">
              <span>BUILD</span>
              <h3>Start with the developer platform.</h3>
              <p>Scaffold a harness, inspect the runtime and extend the application with signed AgentApps.</p>
              <a href="#product">See the developer path →</a>
            </article>
            <article data-path="deploy">
              <span>DEPLOY</span>
              <h3>Choose the compute boundary.</h3>
              <p>
                The product path spans local execution today and managed, BYOC or self-hosted GPU deployment as
                the deploy surface lands.
              </p>
              <a href="#product">See the product shape →</a>
            </article>
            <article data-path="partner">
              <span>PARTNER</span>
              <h3>Build an intelligent product capability.</h3>
              <p>Turn one high-value capability into a production harness integrated into the product your customers already use.</p>
              <a href="#partner-form">Build with Lloyal →</a>
            </article>
          </div>
        </div>
      </div>

      <div className="partner-band">
        <div className="wrap ship-wrap">
          <div className="ship-grid">
            <div className="ship-copy reveal">
              <p className="section-index">DESIGN PARTNERS</p>
              <h2>Build the part of your product that thinks.</h2>
              <p className="large-copy">
                We work with software companies to turn one high-value product capability into a harnessed
                intelligent application—integrated into the existing product and deployable across the
                environments its customers require.
              </p>
              <div className="engagement">
                <span>One product capability</span>
                <span>One product integration</span>
                <span>Private AgentApps</span>
                <span>Two or more placements</span>
                <span>6–10 weeks</span>
              </div>
            </div>

            <PartnerForm />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShipSection;
