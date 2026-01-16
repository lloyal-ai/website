import React from 'react';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import ArrowGrid from '../components/ArrowGrid';

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

      {/* Featured Project: reasoning.run */}
      <section id="projects" className="px-6 md:px-12 max-w-[1400px] mx-auto mb-24">
        <div className="border-t border-white/20 pt-4 mb-8 flex justify-between items-center">
          <span className="font-utility text-xs uppercase tracking-widest text-stone-500">Featured Project</span>
          <span className="font-utility text-xs uppercase tracking-widest text-stone-500">01</span>
        </div>

        <div className="group relative bg-[#1a1a1a] rounded-xl overflow-hidden min-h-[420px] flex flex-col md:flex-row cursor-pointer transition-all hover:bg-[#222]">
          {/* Content Side */}
          <div className="p-8 md:p-12 flex flex-col justify-center gap-8 md:w-1/2 z-10 relative">
            <div>
              <h2 className="font-utility font-bold text-4xl md:text-5xl text-white mb-4">
                <span className="text-emerald-500 mr-1">&gt;</span> reasoning.run
              </h2>
              <p className="text-stone-400 text-xl leading-relaxed max-w-md">
                We decoupled the reasoning loop from model weights, allowing you to inject your own policy, memory, and verifiers into the inference process.
              </p>
            </div>
            <div>
              <a href="https://reasoning.run" className="font-utility inline-flex items-center gap-2 text-white border-b border-white/30 pb-1 hover:border-emerald-500 hover:text-emerald-400 transition-colors text-sm font-medium uppercase tracking-wide">
                LEARN MORE <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Visual Side */}
          <div className="md:w-1/2 bg-stone-900/50 relative border-l border-white/5 min-h-[450px] md:min-h-0">
            <div className="absolute inset-0 p-3 flex items-center justify-center">
              {/* Terminal Visualization */}
              <div className="w-full h-full border border-white/10 rounded-lg bg-[#050505] p-4 font-mono text-stone-400 relative overflow-hidden shadow-2xl group-hover:scale-[1.02] transition-transform duration-700 ease-out flex flex-col">
                {/* Title bar */}
                <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="ml-auto text-stone-600 text-xs">terminal</span>
                </div>
                
                {/* Full-width command */}
                <div className="text-xs mb-3">
                  <span className="text-emerald-500 mr-1">➜</span>
                  <span className="text-white">reasoning.run</span>
                  <span className="text-stone-400"> llama3 "Find waivers in contract #6767" ./policy.js --CoT</span>
                </div>
                
                {/* TUI takes over - split pane */}
                <div className="flex-1 flex gap-3 text-xs leading-snug overflow-hidden border-t border-white/10 pt-3">
                  {/* Left pane - Output */}
                  <div className="flex-1 space-y-1.5 overflow-hidden">
                    <div className="text-stone-300 mb-1">trunk 0x9F2A...</div>
                    <div className="text-stone-400">├─ <span className="text-stone-600">[cont]</span> <span className="text-stone-500 italic">""</span> → The contract contains standard liability provisions in §3...</div>
                    <div className="text-stone-400">├─ <span className="text-stone-600">[cont]</span> <span className="text-stone-500 italic">""</span> → Reviewing the waiver clauses, I find sections 4.1 through 4.3...</div>
                    <div className="text-red-500/70 line-through">├─ <span>[cont]</span> <span className="italic">""</span> → Based on this analysis there are no waivers present...</div>
                    <div className="text-stone-400">├─ <span className="text-amber-500">[crit]</span> <span className="text-amber-500 italic">"Wait, verify..."</span> → Actually, §4.2 uses "notwithstanding" which implies liability waiver by reference to §3...</div>
                    <div className="text-stone-400">└─ <span className="text-stone-600">[cont]</span> <span className="text-stone-500 italic">""</span> → Therefore there are 2 implicit waivers in §4.2</div>
                  </div>
                  
                  {/* Divider */}
                  <div className="w-px bg-white/10"></div>
                  
                  {/* Right pane - Live status + Stats */}
                  <div className="w-[30%] flex flex-col text-stone-500">
                    <div className="text-stone-600 text-[10px] uppercase tracking-wider mb-2">search</div>
                    <div className="space-y-1 flex-1">
                      <div>◐ expanding...  38 nodes</div>
                      <div>   Fused: 3 documents</div>
                      <div>◓ tier-1 <span className="text-emerald-500">✓</span> ent: 0.87</div>
                      <div className="text-red-400">✗ branch 2 (gate fail)</div>
                      <div>◑ backtrack d=1</div>
                      <div>◓ tier-1 <span className="text-emerald-500">✓</span> ent: 0.94</div>
                      <div className="text-emerald-500">✓ committed</div>
                    </div>
                    <div className="mt-auto pt-2 border-t border-white/5 text-stone-600">
                      <div>38 nodes │ 1 rollback</div>
                      <div>7.2s total</div>
                    </div>
                  </div>
                </div>
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent pointer-events-none opacity-20"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Layout: Research & Dispatches */}
      <section id="research" className="px-6 md:px-12 max-w-[1400px] mx-auto pb-32">
        <div className="border-t border-white/20 pt-4 mb-16 flex justify-between items-center">
          <span className="font-utility text-xs uppercase tracking-widest text-stone-500">Research & Dispatches</span>
          <span className="font-utility text-xs uppercase tracking-widest text-stone-500">02</span>
        </div>

        {/* Engineering Dispatch - stands alone */}
        <div className="mb-16">
          <span className="font-utility text-xs text-stone-500 uppercase tracking-widest">Engineering</span>
          <article className="mt-4">
            <h3 className="font-utility font-bold text-2xl text-white mb-2 leading-tight">
              InlinedVector
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

        {/* Curated Research Section */}
        <div className="mb-8">
          <span className="font-utility text-xs text-stone-500 uppercase tracking-widest">Curated</span>
        </div>

        {/* Asymmetric Grid - Golden Ratio Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16">
          
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

          {/* Representation - 2 columns, 3 papers */}
          <div className="lg:col-span-2 bg-white/[0.02] rounded-lg p-6">
            <h3 className="font-utility font-bold text-xl text-stone-500 mb-6">Representation</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="group">
                <a href="https://arxiv.org/abs/2311.06668" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    In-Context Vectors <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    Controllable in-context learning via latent space steering.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Liu et al. (2024)</span>
                    <span className="text-stone-500 text-sm">ICML</span>
                  </div>
                </a>
              </div>
              <div className="group">
                <a href="https://arxiv.org/abs/2406.11717" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    Refusal Direction <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    Refusal behavior mediated by a single direction.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Arditi et al. (2024)</span>
                    <span className="text-stone-500 text-sm">NeurIPS</span>
                  </div>
                </a>
              </div>
              <div className="group">
                <a href="https://arxiv.org/abs/2310.01405" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    Representation Engineering <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    Top-down AI transparency via concept directions.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Zou et al. (2023)</span>
                    <span className="text-stone-500 text-sm">arXiv</span>
                  </div>
                </a>
              </div>
            </div>
          </div>


          {/* Prefix Dynamics - full width 2×2 slab */}
          <div className="lg:col-span-3 bg-white/[0.02] rounded-lg p-6">
            <h3 className="font-utility font-bold text-xl text-stone-500 mb-6">Prefix Dynamics</h3>
            <div className="grid md:grid-cols-2 gap-10">
              <div className="group">
                <a href="https://arxiv.org/abs/2205.11916" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    Large Language Models are Zero-Shot Reasoners <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    "Let's think step by step" yields 61pp accuracy gains.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Kojima et al. (2022)</span>
                    <span className="text-stone-500 text-sm">NeurIPS</span>
                  </div>
                </a>
              </div>
              <div className="group">
                <a href="https://arxiv.org/abs/2310.11324" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    Quantifying Sensitivity to Spurious Features <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    76pp accuracy swings from formatting changes alone.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Sclar et al. (2024)</span>
                    <span className="text-stone-500 text-sm">ICLR</span>
                  </div>
                </a>
              </div>
              <div className="group">
                <a href="https://arxiv.org/abs/2211.01910" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    LLMs Are Human-Level Prompt Engineers <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    APE: automatic prompt optimization via search.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Zhou et al. (2023)</span>
                    <span className="text-stone-500 text-sm">ICLR</span>
                  </div>
                </a>
              </div>
              <div className="group">
                <a href="https://arxiv.org/abs/2311.01460" target="_blank" rel="noreferrer" className="block">
                  <h4 className="font-utility font-bold text-white text-lg mb-2 group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                    Training Language Models to Self-Correct <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-stone-500 text-xl leading-relaxed mb-3">
                    Self-correction via reinforcement learning.
                  </p>
                  <div className="flex justify-between items-center font-utility">
                    <span className="text-stone-400 text-sm">Kumar et al. (2024)</span>
                    <span className="text-stone-500 text-sm">ICLR</span>
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
