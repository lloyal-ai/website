import React from 'react';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import ArrowGrid from '../components/ArrowGrid';

// Serpentine snake-pulse path: col 0 down, col 1 up, col 2 down, ...
// 10 cols × 3 rows = 30 cells; 0.15s stagger gives ~4.5s loop.
const SNAKE_CELLS = [
  // col 0 down
  [160, 172], [160, 224], [160, 248],
  // col 1 up
  [184, 248], [184, 224], [184, 172],
  // col 2 down
  [208, 172], [208, 224], [208, 248],
  // col 3 up
  [232, 248], [232, 224], [232, 172],
  // col 4 down
  [256, 172], [256, 224], [256, 248],
  // col 5 up
  [280, 248], [280, 224], [280, 172],
  // col 6 down
  [304, 172], [304, 224], [304, 248],
  // col 7 up
  [328, 248], [328, 224], [328, 172],
  // col 8 down
  [352, 172], [352, 224], [352, 248],
  // col 9 up
  [376, 248], [376, 224], [376, 172],
];

const HdkChip = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 50 560 300"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
    role="img"
    className="hdk-hero-illustration w-full h-auto"
  >
    <defs>
      <style>{`
        .hdk-hero-illustration .pulse {
          animation: hdkSnake 4.5s linear infinite;
        }
        .hdk-hero-illustration .die-glow {
          animation: hdkDieGlow 6s ease-in-out infinite;
        }
        @keyframes hdkSnake {
          0%   { opacity: 0; }
          2%   { opacity: .95; }
          6%   { opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes hdkDieGlow {
          0%, 100% { opacity: .75; }
          50%      { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hdk-hero-illustration .pulse,
          .hdk-hero-illustration .die-glow { animation: none !important; }
        }
      `}</style>
      <linearGradient id="hdk-package" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3F4554" />
        <stop offset="50%" stopColor="#2C3140" />
        <stop offset="100%" stopColor="#1E2230" />
      </linearGradient>
      <linearGradient id="hdk-packageHighlight" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".18" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="hdk-die" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#14352E" />
        <stop offset="100%" stopColor="#0A1F1A" />
      </linearGradient>
      <linearGradient id="hdk-dieEdge" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#34D399" stopOpacity=".55" />
        <stop offset="100%" stopColor="#10B981" stopOpacity=".15" />
      </linearGradient>
      <radialGradient id="hdk-dieGlow" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stopColor="#10B981" stopOpacity=".28" />
        <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="hdk-cellFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#34D399" stopOpacity=".45" />
        <stop offset="100%" stopColor="#10B981" stopOpacity=".18" />
      </linearGradient>
    </defs>

    {/* chip package */}
    <rect x="100" y="90" width="360" height="250" rx="14" fill="url(#hdk-package)" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
    <path d="M 114 90 L 446 90 A 14 14 0 0 1 460 104 L 460 102 A 12 12 0 0 0 448 92 L 112 92 A 12 12 0 0 0 100 102 L 100 104 A 14 14 0 0 1 114 90 Z" fill="url(#hdk-packageHighlight)" opacity=".7" />

    {/* etched labels */}
    <text x="280" y="115" textAnchor="middle" fontSize="11" letterSpacing="3" fill="#E5E7EB" fillOpacity=".75" style={{ fontFamily: "'JetBrains Mono', monospace" }}>agentPool</text>
    <text x="118" y="115" fontSize="8" letterSpacing="1.2" fill="#9CA3AF" fillOpacity=".75" style={{ fontFamily: "'JetBrains Mono', monospace" }}>[LL] HDK</text>

    {/* die glow halo */}
    <ellipse className="die-glow" cx="280" cy="225" rx="175" ry="105" fill="url(#hdk-dieGlow)" />

    {/* silicon die */}
    <rect x="140" y="140" width="280" height="170" rx="6" fill="url(#hdk-die)" stroke="url(#hdk-dieEdge)" strokeWidth="1" />
    <rect x="146" y="146" width="268" height="158" rx="4" fill="none" stroke="#A7F3D0" strokeOpacity=".10" strokeWidth="1" />

    {/* die header label */}
    <text x="280" y="161" textAnchor="middle" fontSize="8" letterSpacing="2.4" fill="#A7F3D0" fillOpacity=".80" style={{ fontFamily: "'JetBrains Mono', monospace" }}>CONTINUOUS CONTEXT</text>

    {/* KV cell grid: 3 rows × 10 cols */}
    {[172, 224, 248].map((y) => (
      <g key={y}>
        {[160, 184, 208, 232, 256, 280, 304, 328, 352, 376].map((x) => (
          <rect key={x} x={x} y={y} width="20" height="18" rx="2" fill="url(#hdk-cellFill)" />
        ))}
      </g>
    ))}

    {/* spine trunk bar */}
    <rect x="160" y="196" width="236" height="22" rx="3" fill="#34D399" fillOpacity=".18" stroke="#A7F3D0" strokeOpacity=".30" strokeWidth="1" />
    <text x="278" y="211" textAnchor="middle" fontSize="7.5" letterSpacing="1.3" fill="#A7F3D0" fillOpacity=".90" fontWeight="600" style={{ fontFamily: "'JetBrains Mono', monospace" }}>KV CACHE · GIT LIKE BRANCHES</text>

    {/* Snake pulse overlay — serpentine data-transfer animation */}
    <g fill="#A7F3D0">
      {SNAKE_CELLS.map(([x, y], i) => (
        <rect
          key={`${x}-${y}`}
          className="pulse"
          x={x}
          y={y}
          width="20"
          height="18"
          rx="2"
          opacity="0"
          style={{ animationDelay: `${(i * 0.15).toFixed(2)}s` }}
        />
      ))}
    </g>

    {/* die footer label */}
    <text x="280" y="285" textAnchor="middle" fontSize="8" letterSpacing="2.4" fill="#A7F3D0" fillOpacity=".80" style={{ fontFamily: "'JetBrains Mono', monospace" }}>STRUCTURED CONCURRENCY</text>

    {/* horizontal dimension callout */}
    <g stroke="#9CA3AF" strokeOpacity=".25" strokeWidth=".8" fill="none" strokeLinecap="round">
      <line x1="100" y1="70" x2="460" y2="70" />
      <line x1="100" y1="64" x2="100" y2="76" />
      <line x1="460" y1="64" x2="460" y2="76" />
    </g>
    <text x="280" y="60" textAnchor="middle" fontSize="9" letterSpacing="1.2" fill="#9CA3AF" fillOpacity=".75" style={{ fontFamily: "'JetBrains Mono', monospace" }}>4.4× LESS COMPUTE</text>

    {/* vertical dimension callout */}
    <g stroke="#9CA3AF" strokeOpacity=".25" strokeWidth=".8" fill="none" strokeLinecap="round">
      <line x1="488" y1="90" x2="488" y2="340" />
      <line x1="482" y1="90" x2="494" y2="90" />
      <line x1="482" y1="340" x2="494" y2="340" />
    </g>
    <text x="498" y="218" textAnchor="middle" fontSize="9" letterSpacing="1.2" fill="#9CA3AF" fillOpacity=".75" transform="rotate(90 498 218)" style={{ fontFamily: "'JetBrains Mono', monospace" }}>O(1) BRANCHES</text>
  </svg>
);

const Home = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="pt-24 pb-32 px-6 md:px-12 max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row items-center">
          {/* Text Content */}
          <div className="w-full lg:w-[60%] lg:pr-8">
            <div>
              <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-light text-white leading-[0.9] mb-10 tracking-tight">
                The physics of <br />
                <span className="italic text-stone-400">grounded intelligence.</span>
              </h1>

              <p className="text-xl md:text-2xl text-stone-300 leading-relaxed font-light max-w-2xl">
                LLoyal Labs is an applied research organization. We explore what happens when AI systems are forced to survive contact with reality — and build the infrastructure that emerges from that constraint.
              </p>
            </div>
          </div>

          {/* Interactive Arrow Grid - aligned with page edge */}
          <div className="hidden lg:flex w-[40%] h-[500px] items-center justify-end">
             <ArrowGrid />
          </div>
        </div>
      </section>

      {/* Featured Project: HDK */}
      <section id="projects" className="px-6 md:px-12 max-w-[1400px] mx-auto mb-12">
        <div className="border-t border-white/20 pt-4 mb-8 flex justify-between items-center">
          <span className="font-utility text-xs uppercase tracking-widest text-stone-500">Featured Project</span>
          <span className="font-utility text-xs uppercase tracking-widest text-stone-500">01</span>
        </div>

        <a href="https://hdk.lloyal.ai" className="group block">
          <div className="relative bg-[#1a1a1a] rounded-xl overflow-hidden min-h-[420px] flex flex-col md:flex-row cursor-pointer transition-all hover:bg-[#222]">
            {/* Content Side */}
            <div className="p-8 md:p-12 flex flex-col justify-center gap-8 md:w-1/2 z-10 relative">
              <div>
                <h2 className="font-utility font-bold text-3xl md:text-4xl text-white mb-3">
                  <span className="text-emerald-500 mr-1">&gt;</span> Harness Development Kit
                </h2>
                <p className="text-stone-400 text-lg leading-relaxed max-w-md mb-6">
                  Full-stack agentic AI framework for llama.cpp.
                </p>
                <ul className="space-y-2.5 max-w-md text-sm leading-relaxed font-utility">
                  <li className="flex gap-3">
                    <span className="text-emerald-500/70 flex-shrink-0">→</span>
                    <span>
                      <span className="text-white font-medium">Structured Concurrency</span>
                      <span className="text-stone-500"> · scoped agents, automatic teardown</span>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-emerald-500/70 flex-shrink-0">→</span>
                    <span>
                      <span className="text-white font-medium">Continuous-Context Agents</span>
                      <span className="text-stone-500"> · shared KV state, zero-copy forks</span>
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-emerald-500/70 flex-shrink-0">→</span>
                    <span>
                      <span className="text-white font-medium">Retrieval-Interleaved Generation</span>
                      <span className="text-stone-500"> · context assembled in-flight</span>
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <span className="font-utility inline-flex items-center gap-2 text-white border-b border-white/30 pb-1 group-hover:border-emerald-500 group-hover:text-emerald-400 transition-colors text-sm font-medium uppercase tracking-wide">
                  LEARN MORE <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Visual Side */}
            <div className="md:w-1/2 bg-stone-900/50 relative border-l border-white/5 min-h-[460px] md:min-h-0 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full group-hover:scale-[1.02] transition-transform duration-700 ease-out flex items-center justify-center">
                  <HdkChip />
                </div>
              </div>
            </div>
          </div>
        </a>
      </section>

      {/* Built With HDK: reasoning.run */}
      <section className="px-6 md:px-12 max-w-[1400px] mx-auto mb-24">
        <div className="border-t border-white/20 pt-4 mb-8 flex justify-between items-center">
          <span className="font-utility text-xs uppercase tracking-widest text-stone-500">Built with HDK</span>
          <span className="font-utility text-xs uppercase tracking-widest text-stone-500">02</span>
        </div>

        <a href="https://reasoning.run" className="group block">
          <div className="relative bg-[#1a1a1a] rounded-xl overflow-hidden min-h-[360px] flex flex-col md:flex-row cursor-pointer transition-all hover:bg-[#222]">
            {/* Content Side */}
            <div className="p-8 md:p-12 flex flex-col justify-center gap-8 md:w-1/2 z-10 relative">
              <div>
                <h2 className="font-utility font-bold text-3xl md:text-4xl text-white mb-4">
                  <span className="text-emerald-500 mr-1">&gt;</span> reasoning.run
                </h2>
                <p className="text-stone-400 text-lg leading-relaxed max-w-md">
                  A private reasoner for your terminal. Direct conversation or grounded multi-agent research, GPU-native and fully local. No API keys, no inference servers.
                </p>
              </div>
              <div>
                <span className="font-utility inline-flex items-center gap-2 text-white border-b border-white/30 pb-1 group-hover:border-emerald-500 group-hover:text-emerald-400 transition-colors text-sm font-medium uppercase tracking-wide">
                  LEARN MORE <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Visual Side — TUI mock: parallel agent columns */}
            <div className="md:w-1/2 bg-stone-900/50 relative border-l border-white/5 min-h-[400px] md:min-h-0">
              <div className="absolute inset-0 p-3 flex items-center justify-center">
                <div className="w-full h-full border border-white/10 rounded-lg bg-black p-3 font-mono text-stone-400 relative overflow-hidden shadow-2xl group-hover:scale-[1.02] transition-transform duration-700 ease-out flex flex-col">
                  {/* Session header */}
                  <div className="text-stone-600 text-[9px] mb-1">Restored session: Sun 10 May 2026 18:09:41 AEST</div>
                  <div className="text-stone-400 text-[10px] mb-2">) npx reasoning.run</div>
                  <div className="text-stone-100 text-[10px] mb-3 truncate">What types of apps is the harness development kit best suited for?</div>

                  {/* 5 agent columns — parallel research */}
                  <div className="flex-1 grid grid-cols-5 gap-1.5 overflow-hidden text-[8px] leading-snug">
                    {/* A1 */}
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between text-stone-100 mb-1">
                        <span>A1</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      </div>
                      <div className="text-stone-500">Survey 'What you can build' section in HDK intro to identify app domains.</div>
                      <div className="text-emerald-400 mt-1">&gt; search</div>
                      <div className="text-stone-500 pl-2 truncate">"What you can build"</div>
                      <div className="text-emerald-500">✓ 10 results</div>
                      <div className="text-stone-500 mt-1"><span className="text-emerald-400">✦</span> The search didn't find...</div>
                    </div>

                    {/* A2 */}
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between text-stone-100 mb-1">
                        <span>A2</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      </div>
                      <div className="text-stone-500">Analyze 'Skill Catalog' prompt convention for app categories.</div>
                      <div className="text-emerald-400 mt-1">&gt; read_file</div>
                      <div className="text-stone-500 pl-2 truncate">"skill-catalog.mdx"</div>
                      <div className="text-emerald-500">✓ 5912b</div>
                      <div className="text-stone-500 mt-1"><span className="text-emerald-400">✦</span> I've read the Skill...</div>
                      <div className="text-stone-600 mt-1">∗ streaming</div>
                    </div>

                    {/* A3 */}
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between text-stone-100 mb-1">
                        <span>A3</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500"></span>
                      </div>
                      <div className="text-stone-500">Review 'Agents' and 'Pipelines' guides for workflow patterns.</div>
                      <div className="text-emerald-400 mt-1">&gt; read_file</div>
                      <div className="text-stone-500 pl-2 truncate">"pipelines.mdx"</div>
                      <div className="text-emerald-500">✓ 1241b</div>
                      <div className="text-stone-500 mt-1"><span className="text-emerald-400">✦</span> The read returned...</div>
                      <div className="text-stone-600 mt-1">∗ streaming</div>
                    </div>

                    {/* A4 */}
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between text-stone-100 mb-1">
                        <span>A4</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                      </div>
                      <div className="text-stone-500">Examine 'Examples' directory for app domain walkthroughs.</div>
                      <div className="text-emerald-400 mt-1">&gt; read_file</div>
                      <div className="text-stone-500 pl-2 truncate">"compare.md"</div>
                      <div className="text-emerald-500">✓ 2 results</div>
                      <div className="text-stone-500 pl-2 text-stone-600 truncate">huggingface.co</div>
                      <div className="text-stone-500 mt-1"><span className="text-emerald-400">✦</span> Good, I've read the...</div>
                    </div>

                    {/* A5 */}
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center justify-between text-stone-100 mb-1">
                        <span>A5</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                      </div>
                      <div className="text-stone-500">Search 'Quick Start' guide for user-facing app types.</div>
                      <div className="text-emerald-400 mt-1">&gt; search</div>
                      <div className="text-stone-500 pl-2 truncate">"app scenarios"</div>
                      <div className="text-emerald-500">✓ 10 results</div>
                      <div className="text-stone-500 mt-1"><span className="text-emerald-400">✦</span> Thinking<span className="animate-pulse">_</span></div>
                    </div>
                  </div>

                  {/* Status bar */}
                  <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-2 text-[8px] text-stone-500">
                    <span>KV</span>
                    <div className="w-10 h-1.5 bg-stone-800 rounded-sm overflow-hidden">
                      <div className="h-full bg-red-500/70" style={{ width: '94%' }}></div>
                    </div>
                    <span>94%</span>
                    <span className="text-stone-700">·</span>
                    <span>research</span>
                    <span className="text-stone-700">·</span>
                    <span>04:01</span>
                    <span className="text-stone-700">·</span>
                    <span>5 active</span>
                    <span className="text-stone-700">·</span>
                    <span>8 sources</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </a>
      </section>

      {/* Grid Layout: Research & Dispatches */}
      <section id="research" className="px-6 md:px-12 max-w-[1400px] mx-auto pb-32">
        <div className="border-t border-white/20 pt-4 mb-16 flex justify-between items-center">
          <span className="font-utility text-xs uppercase tracking-widest text-stone-500">Research & Dispatches</span>
          <span className="font-utility text-xs uppercase tracking-widest text-stone-500">03</span>
        </div>

        {/* Engineering Dispatches */}
        <div className="mb-16">
          <span className="font-utility text-xs text-stone-500 uppercase tracking-widest">Infrastructure</span>
          <p className="text-stone-500 text-xl mt-2 mb-6 max-w-2xl">The stack beneath HDK. From C++ primitives up to the TypeScript control surface.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            <article className="bg-white/[0.02] rounded-lg p-6">
              <h3 className="font-utility font-bold text-2xl text-white mb-2 leading-tight">
                <a href="https://lloyal-ai.github.io/lloyal.node/" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors">
                  lloyal.node
                </a>
              </h3>
              <p className="text-stone-500 text-xl mb-4">
                TypeScript control surface for llama.cpp with atomic KV cache forking. Real-time rolling perplexity, entropy, and multi-sequence parallel exploration — the branching primitive HDK builds on.
              </p>
              <div className="flex items-center gap-6 font-utility">
                <a href="https://lloyal-ai.github.io/lloyal.node/" target="_blank" rel="noreferrer" className="text-sm text-stone-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                  Docs <ArrowUpRight className="w-3 h-3" />
                </a>
                <a href="https://www.npmjs.com/package/@lloyal-labs/lloyal.node" target="_blank" rel="noreferrer" className="text-sm text-stone-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                  npm <ArrowUpRight className="w-3 h-3" />
                </a>
                <a href="https://github.com/lloyal-ai/lloyal.node" target="_blank" rel="noreferrer" className="text-sm text-stone-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                  GitHub <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </article>

            <article className="bg-white/[0.02] rounded-lg p-6">
              <h3 className="font-utility font-bold text-2xl text-white mb-2 leading-tight">
                <a href="https://lloyal-ai.github.io/liblloyal/" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors">
                  liblloyal
                </a>
              </h3>
              <p className="text-stone-500 text-xl mb-4">
                Composable C++ primitives for llama.cpp with handle-based APIs, shared model weights, and multi-sequence management. The native layer the stack ultimately sits on.
              </p>
              <div className="flex items-center gap-6 font-utility">
                <a href="https://lloyal-ai.github.io/liblloyal/" target="_blank" rel="noreferrer" className="text-sm text-stone-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                  Docs <ArrowUpRight className="w-3 h-3" />
                </a>
                <a href="https://github.com/lloyal-ai/liblloyal" target="_blank" rel="noreferrer" className="text-sm text-stone-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                  GitHub <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </article>

            <article className="bg-white/[0.02] rounded-lg p-6">
              <h3 className="font-utility font-bold text-2xl text-white mb-2 leading-tight">
                <a href="https://www.npmjs.com/package/@lloyal-labs/tsampler" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors">
                  TSampler
                </a>
              </h3>
              <p className="text-stone-500 text-xl mb-4">
                Complete functional sampler chain in pure TypeScript with exact llama.cpp parity. Enables Test-Time Alignment by fusing application logic (like N-gram trackers) with the probability distribution.
              </p>
              <div className="flex items-center gap-6 font-utility">
                <a href="https://www.npmjs.com/package/@lloyal-labs/tsampler" target="_blank" rel="noreferrer" className="text-sm text-stone-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                  npm <ArrowUpRight className="w-3 h-3" />
                </a>
                <a href="https://github.com/lloyal-ai/tsampler" target="_blank" rel="noreferrer" className="text-sm text-stone-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                  GitHub <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </article>

            <article className="bg-white/[0.02] rounded-lg p-6">
              <h3 className="font-utility font-bold text-2xl text-white mb-2 leading-tight">
                <a href="https://blog.lloyal.ai/inlinedvector-yet-another-sbo-container-but-with-a-good-reason" target="_blank" rel="noreferrer" className="hover:text-emerald-400 transition-colors">
                  InlinedVector
                </a>
              </h3>
              <p className="text-stone-500 text-xl mb-4">
                Optimizing memory layout for high-frequency tree search operations.
              </p>
              <div className="flex items-center gap-6 font-utility">
                <a href="https://blog.lloyal.ai/inlinedvector-yet-another-sbo-container-but-with-a-good-reason" target="_blank" rel="noreferrer" className="text-sm text-stone-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                  Read dispatch <ArrowUpRight className="w-3 h-3" />
                </a>
                <a href="https://vcpkg.io/en/package/lloyal-ai-inlined-vector" target="_blank" rel="noreferrer" className="text-sm text-stone-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                  vcpkg <ArrowUpRight className="w-3 h-3" />
                </a>
                <a href="https://github.com/lloyal-ai/inlined-vector" target="_blank" rel="noreferrer" className="text-sm text-stone-400 hover:text-emerald-400 transition-colors flex items-center gap-1">
                  GitHub <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </article>
          </div>
        </div>

        {/* Curated Research Section */}
        <div className="mb-8">
          <span className="font-utility text-xs text-stone-500 uppercase tracking-widest">Curated</span>
        </div>

        {/* Asymmetric Grid - Golden Ratio Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16">

          {/* Continuous Context - 2 columns, 4 papers in 2×2 */}
          <div className="lg:col-span-2 bg-white/[0.02] rounded-lg p-6">
            <h3 className="font-utility font-bold text-xl text-stone-500 mb-6">Continuous Context Analogs</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="group">
                <a href="https://arxiv.org/abs/2312.07104" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    SGLang / RadixAttention <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    Tree-structured KV cache for prefix sharing across LLM requests.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Zheng et al. (2023)</span>
                    <span className="text-stone-500 text-sm">arXiv</span>
                  </div>
                </a>
              </div>
              <div className="group">
                <a href="https://arxiv.org/abs/2309.06180" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    PagedAttention / vLLM <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    Virtual-memory-style paging for KV caches — the serving-layer baseline.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Kwon et al. (2023)</span>
                    <span className="text-stone-500 text-sm">SOSP</span>
                  </div>
                </a>
              </div>
              <div className="group">
                <a href="https://arxiv.org/abs/2510.12872" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    KVCOMM <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    Anchor-pool estimation of KV cache deviations across shifted prefixes in multi-agent inference.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Wang et al. (2025)</span>
                    <span className="text-stone-500 text-sm">arXiv</span>
                  </div>
                </a>
              </div>
              <div className="group">
                <a href="https://arxiv.org/abs/2507.07400" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    KVFlow <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    Workflow-aware KV cache eviction via Agent Step Graphs for multi-tenant inference servers.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">2025</span>
                    <span className="text-stone-500 text-sm">arXiv</span>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Grounding - 1 column, 4 papers stacked, spans 2 rows */}
          <div className="bg-white/[0.02] rounded-lg p-6 lg:row-span-2">
            <h3 className="font-utility font-bold text-xl text-stone-500 mb-6">Grounding</h3>
            <div className="space-y-8">
              <div className="group">
                <a href="https://openreview.net/pdf?id=GYOXIRXI7W" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    Latent Skill Selection <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    Probes select among pre-existing capabilities, not create new ones.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Petrov et al. (2023)</span>
                    <span className="text-stone-500 text-sm">NeurIPS</span>
                  </div>
                </a>
              </div>
              <div className="group">
                <a href="https://www.nature.com/articles/s41586-024-07421-0" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    Semantic Entropy <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    Detecting hallucinations via semantic uncertainty.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Farquhar et al. (2024)</span>
                    <span className="text-stone-500 text-sm">Nature</span>
                  </div>
                </a>
              </div>
              <div className="group">
                <a href="https://arxiv.org/html/2502.02390v3" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    CoAT <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    Chain-of-Associated-Thoughts: MCTS with Associative Memory.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">arXiv (2025)</span>
                    <span className="text-stone-500 text-sm">arXiv</span>
                  </div>
                </a>
              </div>
              <div className="group">
                <a href="https://arxiv.org/abs/2310.15213" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    Function Vectors <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    Task-specific vectors that transfer across contexts.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Todd et al. (2023)</span>
                    <span className="text-stone-500 text-sm">arXiv</span>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Search - 2 columns, 4 papers in 2×2 */}
          <div className="lg:col-span-2 bg-white/[0.02] rounded-lg p-6">
            <h3 className="font-utility font-bold text-xl text-stone-500 mb-6">Search</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="group">
                <a href="https://arxiv.org/abs/1712.01815" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    AlphaZero <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    General RL algorithm mastering chess, shogi, and Go via self-play.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Silver et al. (2018)</span>
                    <span className="text-stone-500 text-sm">Science</span>
                  </div>
                </a>
              </div>
              <div className="group">
                <a href="https://arxiv.org/abs/1705.08439" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    Expert Iteration <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    Tree search as expert, neural network as apprentice.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Anthony et al. (2017)</span>
                    <span className="text-stone-500 text-sm">NeurIPS</span>
                  </div>
                </a>
              </div>
              <div className="group">
                <a href="https://arxiv.org/abs/2110.01548" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    Gumbel MuZero <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    Policy improvement guarantees with minimal simulations.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Danihelka et al. (2022)</span>
                    <span className="text-stone-500 text-sm">NeurIPS</span>
                  </div>
                </a>
              </div>
              <div className="group">
                <a href="https://scholar.google.com/scholar?q=Brandfonbrener+VerMCTS" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    VerMCTS <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    Verified Monte Carlo Tree Search for Language Models.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Brandfonbrener et al. (2024)</span>
                    <span className="text-stone-500 text-sm">arXiv</span>
                  </div>
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>
    </>
  );
};

export default Home;
