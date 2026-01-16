# Compass: Complete Architectural Understanding

## Executive Thesis

**Compass is a test-time control system for fixed-weight autoregressive LLMs that enables non-monotonic, patch-based decoding guided by oracles and constrained by llama.cpp KV physics.**

In simpler terms: Compass allows an LLM to "think" by generating, evaluating, rolling back, and revising—producing verifiable patches rather than streaming text. It's a **systems bet** that trades raw reasoning capability for inspectability, verifiability, locality, and determinism.

---

## The Core Paradigm: Zero-Shot Model, Few-Shot Effect

**The fundamental insight:**

| What the Model Sees | What the System Does |
|---------------------|----------------------|
| Same prompt every generation (zero-shot) | MCTS exploration, checkpoint tree, value backprop |
| No memory of failed attempts | NorthSouth learns which strategies work |
| No few-shot examples burned in context | EastWest learns which tokens lead to high scores |
| Fresh decode each expansion | Accumulated knowledge across iterations |

**Result:** The model remains zero-shot, but the system creates the effect of iterative refinement and learned behavior—without burning context on examples or requiring fine-tuning.

---

## Client-Controlled Iterative Refinement

Compass uses **pull semantics** where the client controls the clock:

```
Single Assistant Turn (user asked a question)
│
│ Model sees: [System][User Question][Start of Assistant]
│
├── Client: pull(budget=B1)
│   └── Compass: MCTS iterations, commits patches internally
│   └── Returns: PullResult{ops: P1, revision_depth: 0}
│   └── Client: applies P1, shows intermediate result
│
├── Client: pull(budget=B2)  // "keep thinking"
│   └── Compass: continues from warm tree, learned priors
│   └── Returns: PullResult{ops: P2, revision_depth: 1}  // "revise"
│   └── Client: undoes P1, applies P2
│
├── Client: pull(budget=B3)  // "think more"
│   └── Compass: converging, high-confidence found
│   └── Returns: PullResult{ops: P3, revision_depth: 0}
│   └── Client: applies P3
│
└── Client: satisfied, commits final state
```

**Key properties:**
- **Client controls pacing** — Pull when ready, budget what you want
- **Patches with revision_depth** — Enables visible refinement UX
- **Not waiting for search** — Show intermediate, refine incrementally
- **UX is "AI thinking and revising"** — Not blocking latency, but collaborative drafting

---

## Multi-Turn Continuity

Compass supports organic multi-turn conversations through trunk preservation:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MULTI-TURN CONVERSATION                          │
│                                                                       │
│   Turn 1: "What is X?"                                               │
│   ├── pull() × N iterations (MCTS on seq_ids 1..N)                   │
│   └── Best patch → committed to trunk (seq0)                         │
│                                                                       │
│   Turn 2: "Explain the second part more"                             │
│   ├── Rehydrate trunk from TokenTape + merkle-verified Document      │
│   ├── Model sees: [System][User1][Assistant1][User2][Start]          │
│   ├── pull() × M iterations (MCTS on seq_ids 1..M)                   │
│   └── Best patch → committed to trunk (seq0)                         │
│                                                                       │
│   Turn 3: ...                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

**Mechanisms:**
- **Reserved seq0** — Trunk/continuity fork, never evicted (`reserve_seq0 = true`)
- **Search uses seq1..N** — MCTS explores on other seq_ids, winning path merges to trunk
- **Merkle persistence** — Content-addressed signatures enable session save/load
- **Entailment preserved** — slim-nli checks new content against full conversation history

---

## Core Positioning: Two Approaches to LLM Reasoning

### Approach A: Reasoning in Weights (O1, Claude, DeepSeek R1)
- Model-centric: Intelligence lives in parameters
- Implicit search via extended generation
- Opaque reasoning (can't inspect internals)
- Requires trust in provider

### Approach B: Reasoning in System (Compass)
- System-centric: Intelligence lives in structure
- Explicit search via checkpoint tree
- Transparent reasoning (inspectable tree)
- Verification via external oracles

**Key Insight:** These approaches are **orthogonal**, not competing. Compass focuses on *deployment constraints and trust models* rather than raw capability. O1 might produce better answers on benchmarks; Compass produces *verifiable* answers that work offline.

---

## What Compass Provides (Architectural Properties)

| Property | Mechanism | Status |
|----------|-----------|--------|
| **Offline operation** | No network calls in core loop; llama.cpp backend | ✅ Operational |
| **External verification** | Pluggable oracle tiers; deterministic verifiers | ✅ Operational |
| **Transparent reasoning** | Full checkpoint tree with provenance | ✅ Operational |
| **Deterministic replay** | TokenTape stores committed history | ✅ Operational |
| **Retrieval in loop** | CoAT runs at each boundary commit | ✅ Operational |
| **Auditable decisions** | Bipartite structure enables reconstruction | ✅ Operational |
| **Cross-session learning** | NorthSouth persistence via merkle keys | ⚠️ Specified, blocked on merkle implementation |

## What Compass Does NOT Provide

> "Compass does not amplify the base model's reasoning capability. It cannot create what the model cannot propose."

**Hard Limitations:**
- Cannot solve problems the base model cannot propose solutions to
- Deep mathematical reasoning still limited by model capability
- Novel problem-solving bounded by model's latent knowledge
- Complex multi-hop inference without grounding remains difficult

**Well-Suited For:**
- Retrieval-augmented Q&A
- Protocol/procedure following
- Structured output with verification
- Fact-checking against corpus
- Code generation with test suites

**Poorly-Suited For:**
- Open-ended creative writing
- Tasks requiring world knowledge beyond corpus

---

## Architectural Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         COMPASS                                       │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ HorizonSearch (MCTS)         │ CoAT (Retrieval)                 │ │
│  │  ├─ ExpansionSite            │  ├─ Associate phase              │ │
│  │  ├─ PUCT selection           │  ├─ Fuse phase                   │ │
│  │  ├─ Checkpoint tree          │  └─ CAD-Lite (optional)          │ │
│  │  └─ Semantic Entropy         │                                   │ │
│  ├──────────────────────────────┼───────────────────────────────────┤ │
│  │ NorthSouth (Action Priors)   │ EastWest (Token Steering)        │ │
│  │  ├─ Strategy selection       │  ├─ Position-aware Q             │ │
│  │  ├─ Rollback depth           │  ├─ Gumbel noise + decay         │ │
│  │  └─ Blame gradient           │  └─ Advantage formulation        │ │
│  └──────────────────────────────┴───────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ State Model                                                       │ │
│  │  ├─ TokenTape (authoritative replay log)                         │ │
│  │  ├─ Document (authoritative commitment store, zipper-backed)     │ │
│  │  ├─ BoundaryTracker (derived structural view)                    │ │
│  │  └─ CheckpointGraph (index over checkpoints)                     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Oracles                                                           │ │
│  │  ├─ Tier-1: Gates (parse, compile, protocol) - Hard reject       │ │
│  │  ├─ Tier-1.5: slim-nli (local entailment) - Soft penalty         │ │
│  │  ├─ Tier-2: Progress (task-specific) - Soft scoring              │ │
│  │  └─ Tier-3: Correctness (ground truth) - Soft scoring            │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         LIBLLOYAL                                        │
│                                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │ lease.hpp  │  │ branch.hpp │  │   kv.hpp   │  │  boundaries.hpp    │ │
│  │ (seq pool) │  │ (forkable  │  │ (KV cache  │  │  (Remux parser,    │ │
│  │            │  │  state)    │  │  ops)      │  │   BoundaryTracker) │ │
│  └────────────┘  └────────────┘  └────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         LLAMA.CPP                                        │
│  ├─ KV cache (tag-set semantics per seq_id)                             │
│  ├─ llama_decode (batch decode with per-token seq_id)                   │
│  └─ Grammar constraint sampling                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Core State Model

### TokenTape (Authoritative Replay Log)

```cpp
struct TokenRecord {
  llama_token id;           // For KV rebuild
  std::string rendered_utf8; // For structural rebuild
};

struct TokenTape {
  std::vector<TokenRecord> records;
};
```

**Purpose:** Deterministic replay. Given TokenTape, you can reconstruct the exact model state.

### Document (Authoritative Commitment Store)

Backed by **immer-zipper** with merkle extension for content-addressed identity.

```cpp
using Document = imz::MerkleZipper<Chunk>;
```

**Key Operations:**
- `snapshot()` → O(1) via structural sharing
- `restore(id)` → O(1) time travel
- `diff_between(a, b)` → Deterministic delta for patch emission
- `merkle_root_signature()` → Content-addressed hash for cross-session identity

### BoundaryTracker (Derived Structural View)

Uses Remux streaming parser to detect structural boundaries (sentences, paragraphs, code blocks, etc.).

**Two-phase semantics:**
- `feed_draft()` → Parse speculatively
- `commit_draft()` → Promote to committed
- `reset_draft()` → Discard draft without promoting

**NOT the patch substrate** — Document is authoritative. BoundaryTracker provides AST exposure for oracles.

### CheckpointGraph (Index Over Checkpoints)

```cpp
struct Checkpoint {
  CheckpointId id;
  CheckpointId parent;           // Post-rollback expansion base
  
  uint64_t document_snapshot_id;
  uint64_t document_root_signature;
  
  DocPath doc_path;
  uint32_t token_offset;
  
  TokenSpan committed_span;
  ArmKey arm_key;               // Semantic identity of committed content
  
  PrefixPlanSignature created_under;
  CommitSpanPolicy commit_span_policy;
  
  OracleBundle oracle;
  float value;
};
```

**Checkpoint = a committed semantic boundary**. The graph is NOT a linked list—rollbacks create branches.

---

## Search: HorizonSearch (Checkpoint-Level MCTS)

### Key Concept: Bipartite Traversal

Unlike standard MCTS where nodes are states and edges are actions, Compass uses a **bipartite structure**:

```
Checkpoint s
    │
    ├─ ExpansionSite u₁ (probe="Continue", CoAT=..., grammar=...)
    │   ├─ Child c₁ (ArmKey, value, P₀)
    │   ├─ Child c₂
    │   └─ ...
    │
    └─ ExpansionSite u₂ (probe="Critique", CoAT=..., grammar=...)
        ├─ Child c₃
        └─ ...
```

**ExpansionSite = conditioning identity**. Same checkpoint with different probes = different sites = different P₀ distributions.

### PUCT Formula

```
PUCT(u,c) = Q(u,c) + c_puct × P₀(c|u) × √(N(u)) / (1 + N(u,c))
```

Where:
- `Q(u,c)` = Mean oracle value of child c
- `P₀(c|u)` = Base-model prior (unsteered) over ArmKeys
- `N(u)`, `N(u,c)` = Visit counts

**Critical:** P₀ is computed from **unsteered base model**—no EastWest, no oracle shaping. This keeps the prior "clean" for exploration-exploitation balance.

### Semantic Entropy (Widening Decisions)

```
H(u) = -Σ p(arm) × log(p(arm))
```

If `H(u) < H_low` (converged): exploit, don't widen
If `H(u) > H_high` (multi-modal): widen up to A_max children

This prevents over-exploration of low-entropy sites and ensures multi-modal sites get adequate coverage.

---

## Steering Mechanisms

### Probes (Deterministic Prefix Injection)

Strategies are realized by injecting deterministic text prefixes before sampling:

```cpp
enum class StrategyId : uint8_t {
  Continue,         // "" (empty)
  Critique,         // "\nWait, let's verify this step-by-step.\n"
  Alternative,      // "\nAlternatively, consider this approach:\n"
  Debug,            // "\nLet's trace this with a test case:\n"
  AdmitUncertainty  // "\nI don't know based on the information available.\n"
};
```

**No sampling in probe injection**—probes are 100% deterministic.

### EastWest (Token-Level Steering)

Position-aware online bandit that learns which tokens lead to high oracle scores.

```
logit'(a) = logit(a) + G(a)·α(n) + σ(Q(a))
            ├────────────────────┘   └───────┘
            exploration              exploitation
```

Where:
- `G(a)` ~ Gumbel(0,1) noise
- `α(n)` = Exploration decay with floor
- `σ(Q(a))` = Advantage-normalized exploitation term

**Key Insight:** Q-values are shared across branches with matching context prefix. When one branch learns "return" is good at position 3, all branches with that prefix benefit.

**Guardrail:** EastWest MUST NOT modify P₀ used by PUCT.

### NorthSouth (Action Prior Learning)

Contextual bandit over HorizonPolicyActions (strategy + rollback_bucket).

**Learns:** "Given this context signature, which (strategy, rollback_depth) combination tends to produce good patches?"

```cpp
struct NSContextKey {
  uint64_t document_root_signature;  // Merkle hash of document
  uint64_t doc_path_hash;            // Focus position
  uint32_t domain_tag;               // Task domain
};
```

**Three learning scopes:**
1. **Within-query:** Learns across checkpoint revisits (always enabled)
2. **Cross-query:** Transfer via embedding similarity (requires DocumentStore)
3. **Cross-session:** Persistent learning via disk storage (requires merkle extension)

**Guardrail:** NorthSouth MUST NOT modify P₀—it only influences which site gets traffic.

---

## Retrieval: CoAT (Context-Aware Association)

**Not "RAG as a preface"**—CoAT is a lifecycle phase during MCTS expansion.

```
HorizonSearch expands leaf
    │
    ├─ 1. Create child branch
    │
    ├─ 2. CoAT Associate (query retrieval backend)
    │      ├─ Build AssocRequest from context
    │      ├─ Check skip gates (budget, uncertainty)
    │      └─ Query LocalHybrid backend (lexical + semantic)
    │
    ├─ 3. CoAT Fuse (inject Context Node)
    │      ├─ Create ContextNode with provenance
    │      └─ Inject into branch context (system-visible)
    │
    ├─ 4. Generate until boundary commit
    │
    ├─ 5. Oracle evaluate (sees fused context)
    │
    └─ 6. Backpropagate value
```

**Key Properties:**
- Runs BEFORE oracle evaluation (verifiers see fused context)
- Branch-local (rolls back cleanly)
- Does NOT contaminate P₀
- Does NOT provide direct reward for retrieval
- Requires verification escalation when context used

**CAD-Lite (optional, Induct only):** Contrastive warm-up for first K tokens to lock in lexical facts. Disabled in Conduct mode.

---

## Verification: Tiered Oracle Framework

### Tier Structure

| Tier | Name | Purpose | Cost | Failure Mode |
|------|------|---------|------|--------------|
| Tier-1 | Gates | Structural validity (compile, parse) | Cheap | **Hard reject** |
| Tier-1.5 | Edge Coherence | Local entailment (slim-nli) | Medium | Soft penalty |
| Tier-2 | Progress | Task-specific progress | Variable | Soft scoring |
| Tier-3 | Correctness | Ground truth verification | Expensive | Soft scoring |

**Tier-1 failures dominate**—if Tier-1 fails, value = -∞.

### slim-nli (Tier-1.5 - Local Entailment)

Answers: "Does the evidence support the conclusion?"

```
Input:
  Premise = Prompt + CoAT context + Evidence window
  Hypothesis = Child's committed delta

Output:
  Supports | Contradicts | Neutral + confidence
```

**Scoring:**
- Supports: +confidence
- Contradicts: -confidence (high-confidence triggers Tier-1 failure)
- Neutral: Small penalty scaled by evidence fullness

**This is NOT truth**—it's local coherence pressure. Keeps the chain consistent.

### Value Composition

```cpp
float compose_value(const OracleBundle& o) {
  if (!o.tier1_pass) return -INFINITY;  // Hard reject
  
  return w_nli * o.nli.score      // 0.25
       + w_t2  * o.tier2.score    // 0.50
       + w_t3  * o.tier3.score    // 1.00
       + w_aux * o.auxiliary_score; // 0.10
}
```

Weighted linear combination—NOT a product formula.

---

## Two Operational Modes

### Induct Mode — The Product

Induct is the full Compass experience:
- HorizonSearch (MCTS)
- Probes
- EastWest steering
- NorthSouth priors
- slim-nli coherence
- CoAT with optional CAD-Lite
- Rollback and revision
- Client-controlled iterative refinement

**This is Compass.** The zero-shot→few-shot paradigm, the search, the verification—all of it.

### Conduct Mode — Compatibility Layer

Conduct exists for:
- **Native reasoning models** (DeepSeek R1, Qwen3) that have their own RL-trained strategies
- **RAG workflows** where retrieval + observability is needed without search
- **Observability** where you want oracle metadata without full MCTS

**Disabled:**
- HorizonSearch (no MCTS, no rollback)
- Probes, EastWest steering, CAD-Lite, slim-nli
- ArmKey dedup, max_think_tokens cap

**Enabled:**
- CoAT (context injection at boundaries—augmentation only)
- Tier-2/3 oracles (metadata only—non-blocking)

**Philosophy:** For native reasoners, Compass gets out of the way. Augment with retrieval, observe with oracles, but don't fight their training. Conduct is compat, not the product.

---

## Canonical 20-Step Iteration Loop (Induct)

1. Select leaf checkpoint via PUCT traversal
2. `SeqLeasePool.pin_path(s)` — prevent eviction
3. `ensure_resident(s)` — rehydrate if needed
4. `describe_action_space()` — get available actions
5. `NorthSouth.get_priors()` — action distribution
6. `sample_and_realize()` — pick strategy + rollback
7. Resolve base checkpoint from rollback depth
8. If base ≠ s: ensure resident
9. `Document.restore()` — commitment state
10. Restore BoundaryTracker — structural state
11. Compute PrefixPlanSignature
12. Select or create ExpansionSite
13. Check widening eligibility (entropy)
14. Inject probe (deterministic)
15. **CoAT Associate + Fuse** — in-loop retrieval
16. Generate until boundary commit
17. Commit via canonical protocol → new checkpoint
18. Compute patch via `Document.diff_between()`
19. **Oracle evaluate** → backpropagate value
20. `SeqLeasePool.unpin_all()`

---

## Infrastructure Dependencies

### llama.cpp Constraints

- **KV tag-set semantics:** Each seq_id owns KV rows 0..pos-1
- **n_seq_max:** Maximum concurrent sequence IDs (64 typical)
- **seq_cp:** Can copy KV prefix to new seq_id
- **seq_rm:** Can remove KV range for a seq_id

### immer-zipper Requirements

The merkle extension adds:
- `merkle_root_signature()` — Content-addressed hash for cross-session identity
- Disk persistence with integrity verification
- O(f) recomputation after edits (acceptable for typical f=500)

**Status:** Specified, not yet implemented. Blocks cross-session NorthSouth learning.

### SeqLeasePool (KV Management)

```cpp
acquire_seq_or_evict()  // Get seq_id, evict if needed
release_seq()           // Return to pool
pin_seq() / unpin_all() // Prevent eviction during iteration
fork_branch()           // Clone KV + state
prune_branch()          // Clear KV + release
decode_one_per_branch() // Batch decode for throughput
```

**Eviction policy:** Prefer leaf eviction (preserves reuse points).

---

## Key Invariants

1. **TokenTape is authoritative** for committed token history
2. **Document is authoritative** for committed semantic content
3. **BoundaryTracker is derived**, not authoritative
4. **P₀ is never contaminated** by steering or learning
5. **Tier-1 failures dominate** all other oracles
6. **Rollback targets are expansion bases**, not traversal leaves
7. **Same ExpansionSite = same P₀ distribution** (deterministic conditioning)
8. **CoAT runs before oracle evaluation** (verifiers see fused context)
9. **Conduct mode: oracle results are metadata only** (non-blocking)
10. **Rehydration uses token IDs for KV**, UTF-8 for structural rebuild

---

## Learning Signal Flow

```
                    NorthSouth
                        │
                        ▼ samples action (strategy, rollback)
                    ┌───────────────┐
                    │ ExpansionSite │
                    │  creation     │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Generate    │──────── EastWest steers tokens
                    │   with probe  │         (does NOT modify P₀)
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Commit child  │──────── Gets P₀ from base model
                    │   ArmKey c    │         (unsteered prior)
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Oracle      │
                    │   evaluate    │
                    └───────┬───────┘
                            │
          ┌─────────────────┴─────────────────┐
          │                                   │
          ▼                                   ▼
    ┌───────────┐                       ┌───────────┐
    │ Backprop  │                       │NorthSouth │
    │ W(u,c)+=  │                       │  update   │
    │   value   │                       │           │
    └───────────┘                       └───────────┘
                                              │
                                              ▼
                                        Learns: context + action → reward
                                        (does NOT change stored P₀)
```

---

## Edge Distribution

Compass reaches developers through two edge-first distribution channels:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     EDGE DISTRIBUTION                                │
│                                                                       │
│   ┌─────────────────────┐        ┌─────────────────────┐            │
│   │   nitro-llama       │        │   lloyal.node       │            │
│   │   (Mobile)          │        │   (Node/CLI)        │            │
│   ├─────────────────────┤        ├─────────────────────┤            │
│   │ React Native + JSI  │        │ N-API binding       │            │
│   │ iOS / Android       │        │ macOS/Linux/Windows │            │
│   └──────────┬──────────┘        └──────────┬──────────┘            │
│              │                              │                        │
│              └──────────────┬───────────────┘                        │
│                             │                                        │
│                    ┌────────▼────────┐                               │
│                    │   liblloyal     │                               │
│                    │ (header-only)   │                               │
│                    └────────┬────────┘                               │
│                             │                                        │
│                    ┌────────▼────────┐                               │
│                    │   llama.cpp     │                               │
│                    └─────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Two Channels, Same Pattern

| Channel | Runtime | Audience | Install |
|---------|---------|----------|---------|
| **nitro-llama** | React Native + JSI | Mobile app devs | `npm install @calibrate/nitro-llama` |
| **lloyal.node** | Node.js N-API | Backend/CLI devs | `npm install lloyal.node` |

### Architectural Alignment

Both channels use **pull-based semantics** matching Compass's design:

| OSS Pattern | Compass Equivalent |
|-------------|-------------------|
| `stepper.tick()` = request one token | `pull()` = request one patch |
| Caller controls pacing | Client controls the clock |
| Custom sampler for logit steering | EastWest token steering |
| No internal loops | Pull semantics |

### Distribution Strategy

1. **Phase 1 (Source):** Build from vendored sources — works on all platforms
2. **Phase 2 (Prebuilts):** 3 platform packages (~70% coverage, instant install)
3. **Phase 3 (Full Matrix):** 12+ platform/GPU variants

**Why edge-first:**
- `npm install` is the distribution channel
- Developers adopt before enterprise sales required
- OSS proves the pull-based pattern
- Upgrade path to verified reasoning is natural

### Zero-Trust Personalization

The merkle extension enables an emergent capability: **personalization without trust**.

> **Zero-Trust Personalization:** Learning happens on-device, syncs via content-addressed hashes, never exposes content. Intelligence compounds across sessions and devices without requiring trust in any server.

**For consumers:** This is **AI autonomy**. Your AI learns from your documents, your patterns, your domain expertise—and that learning stays yours. No cloud. No data mining. No vendor lock-in to someone else's model of who you are.

**For enterprises:** This is **verified personalization for regulated industries**. HIPAA, GDPR, financial compliance—the learning happens locally, only hashes leave the device. Auditors see math, not content.

**The paradigm shift:**

| Traditional Personalization | Zero-Trust Personalization |
|-----------------------------|----------------------------|
| Data goes to server | Data stays on device |
| Server learns about you | Device learns, syncs hashes |
| Trust required | Trust not required |
| Vendor owns your profile | You own your learning |
| Privacy vs. personalization tradeoff | Privacy AND personalization |

---

#### Context Key Structure (northsouth-spec §5.1)

```cpp
struct NSContextKey {
  uint64_t document_root_signature;  // Merkle hash of committed content
  uint64_t doc_path_hash;            // Zipper focus path
  uint32_t domain_tag;               // Task/domain classification
};
```

**Content-addressed identity (§5.1.1):** Same content → same `document_root_signature` → same NorthSouth stats. Two queries producing identical committed content share the **same** stats automatically.

#### What Stays Local vs. What Can Sync

| What stays local | What can sync |
|------------------|---------------|
| Document content (PII, PHI, secrets) | `NSContextKey` (content hashes only) |
| TokenTape (actual tokens) | `NSStats` (visit counts, Q-values) |
| Full checkpoint graph | `NSPersistenceRecord` tuples |

#### Persistence Contract (northsouth-spec §5.3)

```cpp
struct NSPersistenceRecord {
  NSContextKey context_key;           // Hash-based identity
  uint64_t action_space_hash;         // Action space version
  NSStats stats;                      // Q-values, visit counts
  uint64_t last_updated_ms;           // For staleness tracking
  uint32_t total_expansions;          // Confidence weighting
};

class NSPersistence {
  virtual void persist(const NSPersistenceRecord& record) = 0;
  virtual optional<NSPersistenceRecord> load(const NSContextKey& key) = 0;
  virtual vector<NSPersistenceRecord> load_by_domain(uint32_t domain_tag) = 0;
};
```

**What syncs:** `{ context: 0x7F3A2B, action: CRITIQUE, q: 0.9, visits: 47 }`
**What stays local:** The actual document content that produced that hash.

#### Three Learning Scopes (northsouth-spec §5)

| Scope | Mechanism | Privacy |
|-------|-----------|---------|
| **Within-query** | Same checkpoint revisited → direct stats reuse | Local, no sync |
| **Cross-query** | Embedding similarity lookup (§5.2) | Optional: share embeddings |
| **Cross-session** | Disk persistence + rehydration (§5.3) | Sync records, not content |

#### Cross-Query Transfer (northsouth-spec §5.2)

When a new context appears:

```cpp
// 1. Check exact match
if (stats_store_.contains(key)) return stats_store_[key];

// 2. Embedding-based lookup (if DocumentStore available)
auto hits = lookup_similar(query_embedding, threshold=0.85, max=5);
if (!hits.empty()) {
  return initialize_from_similar(hits);  // Weighted blend
}

// 3. Domain fallback
if (domain_stats_.contains(key.domain_tag)) {
  return domain_stats_[key.domain_tag];
}

// 4. Cold start
return NSStats::cold_init(action_count);
```

**For similar documents:** New content gets warm priors from similar-but-not-identical contexts via embedding cosine similarity.

#### Cross-Platform Transfer Flow

```
Mobile Session:
├── Document content processed (local only)
├── Merkle signature: 0x7F3A2B computed
├── NorthSouth learns: (0x7F3A2B, CRITIQUE) → q=0.9
└── Persist: NSPersistenceRecord { key: 0x7F3A2B, q: 0.9, ... }

Sync Layer (optional):
└── Transfers NSPersistenceRecords (hashes + stats, no content)

Desktop Session:
├── Rehydrate: load_by_domain(MEDICAL) → returns records
├── New document with same structure → same merkle signature
└── Instant warm start: priors already known for 0x7F3A2B
```

**Rehydration (§5.3.3):** On startup, load persisted records keyed by merkle signature. System is immediately "warm" for previously-seen document shapes.

#### Privacy-Preserving Personalization

**The server (if any) sees:**
- Hash → Action → Reward tuples
- Domain tags and visit counts
- Embedding vectors (optional, for cross-query)

**The server never sees:**
- Document content
- PII/PHI/secrets
- Actual tokens generated

**For regulated industries:** "Your data never leaves the device. Learning transfers via content-addressed hashes. The intelligence compounds, but the content stays private."

---

## Summary: The Compass Bet

Compass is a **systems bet** that:

1. **Creates few-shot from zero-shot** — Model stays zero-shot; system accumulates knowledge
2. **Trades opacity for transparency** — Inspectable checkpoint tree, auditable decisions
3. **Trades dependence for locality** — Works offline, on-device, without network
4. **Trades speed for verification** — Client controls pacing; results are validated

**The UX paradigm:** Not "wait for answer" but "watch AI think and revise." Client controls the clock. Refinement is visible. Revisions are intellectual honesty made manifest.

**The product thesis:** As AI regulation tightens and enterprise adoption matures, the market bifurcates: commodity reasoning (fast, cheap, good enough) vs. verified reasoning (auditable, grounded, provable). Compass owns verified.

It's not trying to be O1. It's the verifiable alternative for when O1 isn't available, safe, or auditable enough.
