// Declarative copy map for the hero intent toggle.
// Source of truth: planning/specs/2026-07-16-homepage-live-port-plan.md §2 —
// every string below is copied verbatim from that table. Do not paraphrase;
// edit the plan doc first if the copy needs to change, then mirror it here.
//
// `h1` is a line array rather than a raw string so HeroSection can rebuild the
// prototype's exact `<br/>`/`<span>` markup (`One application.<br/><span>4B at
// the edge.</span><br/>...`) for any intent without hard-coding markup twice.
// `emphasis: true` on a line renders it inside a `<span>` (the prototype's
// muted-grey treatment for a subordinate detail). The "partner" copy has no
// single line that plays that role, so none of its lines carry emphasis.
const intentCopy = {
  build: {
    kicker: 'A programming surface for intelligence',
    proofLabel: {
      code: 'reasoning.run',
      suffix: '— one application built on Lloyal',
    },
    h1: [
      { text: 'One application.' },
      { text: '4B at the edge.', emphasis: true },
      { text: 'Ten agents at the' },
      { text: 'frontier.' },
    ],
    bridge: 'Not two model integrations. One TypeScript harness spanning both.',
    dek: 'Lloyal brings live model execution into the application itself, letting one intelligent program contract to edge-scale weights or expand into a frontier agent population.',
    primaryCta: { label: 'Build with HDK', href: '#product' },
    secondaryCta: {
      label: 'Inspect the TypeScript application',
      arrow: '↗',
      href: 'https://github.com/lloyal-ai/reasoning-run',
      external: true,
    },
  },
  partner: {
    kicker: 'Ship the part of your product that thinks',
    proofLabel: {
      code: 'reasoning.run',
      suffix: '— a capability we shipped on Lloyal',
    },
    h1: [{ text: 'Build the part' }, { text: 'of your product' }, { text: 'that thinks.' }],
    bridge: 'One high-value capability, harnessed into the product your customers already use.',
    dek: 'We work with software companies to turn one high-value product capability into a harnessed intelligent application — integrated into the existing product and deployable across the environments its customers require.',
    primaryCta: { label: 'Build with Lloyal', href: '#partner-form' },
    secondaryCta: {
      label: 'See the engagement',
      arrow: '→',
      href: '#ship',
      external: false,
    },
  },
};

export default intentCopy;
