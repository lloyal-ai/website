# EastWest: Position-Aware Token Steering for Oracle-Guided MCTS

## Specification v1.8.4

### Abstract

EastWest is a contextual online bandit for oracle-guided MCTS. During tree search, it learns which tokens lead to high oracle scores at each (prefix, position) pair, then steers sampling toward them. The goal is simple regret minimization: when search budget is exhausted, select the best action.

**How it works:**

Q-values are shared across branches with matching context:

```
            root
           /    \
         "if"   "for"
         / \      |
       ...  ...  ...

Branches under "if" → same prefix hash → shared Q-values
Branches under "for" → same prefix hash → shared Q-values
Across subtrees → different prefix → no sharing
```

When the oracle scores a rollout, EastWest updates Q for that (prefix, position, token). All branches with the same prefix immediately benefit:

```
Branch A: tries "return" at position 3 → oracle returns 0.9
Branch B: same prefix, position 3 → steering now boosts "return"
```

**Advantage formulation:** EastWest doesn't just boost high-Q tokens — it suppresses low-Q tokens relative to baseline:

```
σ(Q) = (Q[token] - baseline) / stddev × scale

Token    Q     Baseline   σ(Q)     Effect
──────────────────────────────────────────
"if"     0.8   0.5        +1.2     ↑ boost
"for"    0.3   0.5        -0.8     ↓ suppress
"while"  0.5   0.5         0.0     → unchanged

steered_logit = model_logit + σ(Q)
```

**Key invariant:** The model's prior is captured BEFORE steering. EastWest adjusts logits for sampling, but PUCT uses the original prior for its exploration term. Mixing them creates a feedback loop.

**Design:** EastWest is stateless — it holds only configuration. The caller owns the `StatsMap`, does key lookups, and passes `const PositionStats&` for a single position. This enables deterministic replay: same seed → same RNG → same decisions.

**Key features:**

- Position-aware Q tracking (keyed by prefix + position)
- Advantage formulation with symmetric push/pull (§6.7.1)
- Sequential Halving for small action spaces — optimal simple regret (§6.9)
- Bounded proposal sets — O(proposal_k) not O(vocab) (§6.14)
- Deterministic RNG — reproducible exploration (§6.12.1)
- Training data extraction — zero marginal cost SFT/DPO signal (§9.9)
- Diffusion Language Model support — mask-state-aware steering (Appendix D)

**Key Terminology:**

- **EastWest**: The contextual online bandit specified in this document. Stateless utility operating on caller-provided stats.

---

## 1. Current Setup

### 1.1 Architecture

The MCTS implementation (`mcts.hpp`) uses per-boundary search with PUCT:

```cpp
PUCT(s,a) = Q(s,a) + cpuct × P(a|s) × √N(s) / (1 + N(s,a))
```

Where:

- `Q(s,a)` — average oracle score for boundary chunk `a` from state `s`
- `P(a|s)` — length-normalized prior from LLM softmax over tokens
- `N(s), N(s,a)` — visit counts

### 1.2 Boundary Detection via Remux

Boundaries are detected by the Remux streaming parser, not grammar constraints:

```cpp
// Token stream flows through BoundaryTracker
for (char ch : token_text) {
    auto result = draft_parser_.step(ch, idx++);
    if (result) {
        // Parser emitted structural event
        if (auto boundary = mapper_(*result)) {
            // MCTS decision point
        }
    }
}
```

**Boundary types** (from `ParserStepResult`):

- `result.added` — block started (heading, list item, code block, etc.)
- `result.completed` — block ended (paragraph close, dedent, etc.)

**Grammar-agnostic:** Same tracker works for CommonMark, Python, YAML, or custom DSLs by swapping grammar config.

### 1.3 Draft/Committed Semantics

BoundaryTracker maintains two parser states for speculative execution:

```cpp
class RemuxBoundaryTracker {
    remux::StreamingBlockParser draft_parser_;      // Advances speculatively
    remux::StreamingBlockParser committed_parser_;  // Only advances on commit

    void reset_draft() {
        // O(1) via structural sharing
        draft_parser_ = committed_parser_.fork();
    }

    void commit_draft() {
        // O(1) via structural sharing
        committed_parser_ = draft_parser_.fork();
    }
};
```

This enables MCTS exploration without expensive deep copies.

### 1.4 Existing Steer Mechanism

The `branch::set_steer()` primitive allows logit modification before sampling:

```cpp
// Current usage: first-token deduplication (mcts.hpp:643-660)
if (config_.dedup_mode == DeduplicationMode::FIRST_TOKEN) {
    std::set<llama_token> explored_first_tokens;
    for (int sibling_idx : parent.children) {
        if (!nodes_[sibling_idx].tokens.empty()) {
            explored_first_tokens.insert(nodes_[sibling_idx].tokens[0]);
        }
    }

    auto steer_fn = [explored_first_tokens](llama_token_data_array& cur_p) {
        for (size_t i = 0; i < cur_p.size; ++i) {
            if (explored_first_tokens.count(cur_p.data[i].id)) {
                cur_p.data[i].logit = -INFINITY;  // Mask explored
            }
        }
    };

    branch::set_steer(child_branch, steer_fn, &store_);
}
```

**Limitation:** This assumes the discriminative token is at position 0. For grammars like `MOVE: [0-8]\n`, the action token is at position 3 — this approach steers the wrong position.

### 1.5 Grammar-Native Structural Rollout

Each Remux block rule defines its own completion semantics:

````cpp
// From commonmark.hpp
BlockRule{"fenced-code-start",
    .match = std::regex(R"(^ {0,3}(`{3,}|~{3,})([^`]*)$)"),
    .metadata_from_capture_groups = {{"fence", 1}},

    // Grammar knows how to close itself
    .get_rollout = [](const BlockAstNode& node) -> std::optional<std::string> {
        auto it = node.metadata.find("fence");
        if (it != node.metadata.end()) {
            return "\n" + it->second + "\n";  // ``` → \n```\n
        }
        return std::nullopt;
    }
}
````

**Rollout walks zipper breadcrumbs** (not full AST traversal):

```cpp
std::string structural_rollout(const std::string& text) const {
    std::string result = text;
    std::vector<std::string> closers;

    auto zipper = draft_parser_.zipper();

    while (!zipper.is_root()) {
        const auto& node = zipper.current().get();
        auto grouping_rule = find_grouping_rule(node.type);

        // Dedentation-closed containers close automatically
        if (grouping_rule && grouping_rule->dedentation_closes) {
            zipper = zipper.up();
            continue;
        }

        // Verbatim containers need explicit closers FROM GRAMMAR
        if (grouping_rule && grouping_rule->is_verbatim_container) {
            auto rule = find_block_rule(node.type);
            if (rule && rule->get_rollout) {
                closers.push_back(*rule->get_rollout(node));
            }
        }
        zipper = zipper.up();
    }

    // Append closers (inner → outer)
    for (const auto& closer : closers) {
        result += closer;
    }
    return result;
}
```

### 1.6 AST Exposed for Oracle (Zero Re-parsing)

```cpp
const remux::BlockAstNode& get_committed_ast() const {
    return committed_parser_.root().get();
}
```

Oracle receives the **already-parsed AST**:

- No prompt leak risk (re-parsing might interpret differently)
- No redundant work (parsing already happened during generation)
- Structural information available (block types, nesting, metadata)

### 1.7 Deterministic Verification Oracles

Our oracles are **verification functions**, not learned models:

```typescript
ESLint(code) → {errors: 2, warnings: 1}  // Ground truth
Pyright(code) → {typeErrors: 0}           // Ground truth
```

This is fundamentally different from learned reward models that require training data and distribution matching. Linters **define correctness** — there's no "training distribution" to approach.

**Implication:** We can use selection mechanisms inspired by Gumbel MuZero without any learning components. The feedback signal is stable and deterministic, which is ideal for biasing proposals.

**Oracle timeout handling:** If an oracle times out (exceeds configured threshold), treat the result as minimum score (0.0) to maintain determinism. Log timeout events for debugging but do not propagate errors.

### 1.8 Scope and Limitations

**Supported now:**

- Action-like grammars (`MOVE: [0-8]`, `TOOL: name`, structured choices)
- Code generation with discriminative keywords (`const`/`let`, `==`/`===`, `any`/`unknown`)
- Any grammar where `is_discriminative()` identifies clear choice points
- Scenarios where a small number of tokens determine structural outcome

**Not yet supported:**

- Open-ended prose where every position is equally "discriminative"
- Continuous text generation without structural boundaries
- Grammars where discriminative positions can't be cheaply detected
- Scenarios requiring learned discriminators or fuzzy reward models

**Design principle:** We steer at positions where the grammar constrains choices to a tractable set. For open-ended generation, the steering mechanism would fire too frequently and provide too little signal.

### 1.9 Relationship to VerMCTS

EastWest extends VerMCTS (Brandfonbrener et al. 2024) in several ways:

| Aspect            | VerMCTS                  | EastWest                               |
| ----------------- | ------------------------ | -------------------------------------- |
| Granularity       | Statement/line level     | **Token level** within boundaries      |
| Signal            | Binary (verified/failed) | **Continuous** (lint score 0-100)      |
| Position tracking | None                     | **Position-aware Q** per (prefix, pos) |
| Exploration       | Standard UCT             | **Gumbel noise** with decay + floor    |
| Deployment        | Server LLMs              | **On-device** mobile inference         |
| Grammar           | Free generation          | **GBNF constrained** + steering        |

**Shared insights:**

- "Hard to generate, easy to verify" problem structure
- Verifier/oracle provides feedback to guide search
- LLM provides prior for proposals
- Progressive widening for large action spaces

**Key difference:** VerMCTS proves their verifier provides an **optimistic upper bound** on value (Lemma 2.1). If a partial program fails verification, no completion can succeed → prune immediately. EastWest uses **soft signal** — violations correlate with but don't guarantee failure, enabling finer-grained guidance.

### 1.10 VerMCTS Results (Brandfonbrener et al. 2024)

VerMCTS demonstrates the power of verifier-guided search on verified program synthesis in Dafny and Coq:

**Headline results:**

- **30% absolute improvement** in Pass@5000 over whole sampling baseline
- **4× relative improvement** on Dafny problems
- On Coq, whole sampling achieves **0% pass rate** at 5000 token budget; VerMCTS succeeds
- Several problems solved **only by VerMCTS** within budget (no baseline succeeds)

**Experimental setup:**

- Base model: Phind-CodeLLama-34B-v2 (open weights, code-focused)
- Problem suite: 15 multi-step verified programming tasks (9 Dafny, 6 Coq)
- Tasks require: ADT definition, function implementation, proof construction
- Metric: Pass@T (success rate within T tokens)

**Baseline comparison:**

| Method         | Dafny Pass@5000 | Coq Pass@5000 | Notes                                 |
| -------------- | --------------- | ------------- | ------------------------------------- |
| Whole sampling | ~15%            | ~0%           | Pure LLM prior                        |
| MCTS rollout   | ~25%            | ~5%           | Tree search without verifier feedback |
| Reflexion      | ~10%            | ~0%           | Error-prompted retry                  |
| **VerMCTS**    | **~45%**        | **~20%**      | Verifier in the loop                  |

**Key hyperparameters (tuned on Dafny Opt0 problem):**

- Temperature: 1.0 (swept [0.6, 0.8, 1.0, 1.2, 1.4])
- UCT exploration coefficient: 3.0 (swept [1, 3, 10, 30])
- Widen node prior: 0.1 (swept [0.1, 0.2, 0.5])
- Nucleus sampling: top-p = 0.95

**Tree behavior observations:**

- Harder problems → larger search trees (more exploration needed)
- Search is "depth-first": depth grows early, then flattens as widening kicks in
- Failed expansions not added to tree (pruning via verifier)

**Limitations they identify:**

> "The granularity of the verification step is a whole unit, e.g. a function in Dafny and a command in Coq. For Dafny, the coarse granularity means we have to wait multiple lines to get feedback."

This is precisely what our token-level steering addresses — we provide feedback at individual token positions within statements, not just at statement boundaries.

**Implications for our work:**

1. Verifier-guided MCTS demonstrably outperforms baselines by large margins
2. Pass@T is the right metric for fair comparison
3. Token-level steering could amplify these gains by providing finer feedback
4. Our continuous lint signal may enable gradient where binary verification cannot
5. Position-aware tracking addresses their coarse granularity limitation

---

## 2. The Problem

### 2.1 Test Configuration

**Board State:**

```
X | O | _     (positions 0, 1, 2)
---------
_ | X | _     (positions 3, 4, 5)
---------
_ | _ | _     (positions 6, 7, 8)
```

**Optimal Move:** Position 8 (completes diagonal 0-4-8, score 1000)

**Grammar:**

```
root ::= "MOVE: " [0-8] "\n"
```

**Token positions:**

- Position 0: `"MOVE"` — deterministic (1 legal token)
- Position 1: `":"` — deterministic (1 legal token)
- Position 2: `" "` — deterministic (1 legal token)
- Position 3: `[0-8]` — **discriminative** (see below)
- Position 4: `"\n"` — deterministic (1 legal token)

**Terminology clarification:**

- **Grammar-legal tokens:** 9 (digits 0-8, per GBNF rule `[0-8]`)
- **Board-legal tokens:** 7 (squares not occupied: 2, 3, 5, 6, 7, 8, and one more)
- Board legality is enforced by the oracle (illegal moves score 0), not the grammar

### 2.2 Observed Results

| Metric                | Value                 |
| --------------------- | --------------------- |
| Iterations            | 100                   |
| Expansions            | 12                    |
| Unique moves explored | 3 of 7 board-legal    |
| Moves explored        | 2, 3, 6               |
| Optimal move (8)      | **Never sampled**     |
| Best score found      | 200 (vs 1000 optimal) |

### 2.3 Root Cause Analysis

The LLM assigns low prior probability to token "8":

```
P(token "8" | context) ≈ 0.001
P(token "2" | context) ≈ 0.400
```

**Critical observation:** The discriminative token is at **position 3**, not position 0. A naive "steer first token" approach would apply bonuses to `"MOVE"` — which has exactly one legal option anyway.

### 2.4 Why Prior-Dominated Sampling Fails

Under progressive widening, the expansion sampler proposes new children. If the sampler is LLM prior only, low-prior actions are rarely proposed:

```
P(proposing move 8) = P(token "8") = 0.001
P(proposing move 2) = P(token "2") = 0.400

Expected samples to see move 8: 1/0.001 = 1000
Budget: 100 iterations
```

The search never even gets a chance to evaluate move 8.

---

## 3. Theoretical Foundation

### 3.1 Hierarchical Bandit Structure

LLM-MCTS operates at three levels:

| Level    | Unit                             | Selection Mechanism     | Signal Source        |
| -------- | -------------------------------- | ----------------------- | -------------------- |
| Token    | Single token                     | Softmax(logits)         | LLM prior only       |
| Boundary | Token chunk until Remux boundary | PUCT                    | LLM prior + oracle Q |
| Tree     | Full generation path             | PUCT + readout strategy | Cumulative oracle Q  |

**Current gap:** Token-level selection ignores oracle signal entirely.

### 3.2 Two Types of Regret

**Cumulative regret:** Total loss from suboptimal decisions over time. UCB minimizes this.

**Simple regret:** Loss from the final decision only. Sequential Halving minimizes this.

At each discriminative token position, we care about **simple regret** — finding the best token quickly.

### 3.3 The Gumbel-Max Theorem

For any discrete distribution with logits `l(a)`, sampling via:

```
a* = argmax_a [G(a) + l(a)]
```

where `G(a)` is independent Gumbel(0,1) noise, is equivalent to sampling from `softmax(l)`.

**Key insight:** We can add Q-value exploitation terms to bias toward high-value actions.

### 3.4 Core Steering Equation

The central contribution of this specification is the **position-aware steering formula**:

```
                    ┌─────────────────┐   ┌─────────────────┐
logit'(a) = logit(a) + G(a) · α(n)    +     σ(Q(a))
                    └──────┬──────────┘   └───────┬─────────┘
                       exploration            exploitation
```

**In mathematical notation:**

```
logit'(a) = logit(a) + G(a) · α(nₚₒₛ) + σ(Q(a))
```

Where:

```
G(a) ~ Gumbel(0, 1)                          # i.i.d. noise per token

α(n) = max(ε, 1/√(1+n))                      # adaptive decay with floor ε
     where n = visits to this position

σ(Q(a)) = c · advantage(a) · min(Δ, τ) · β(N)  # normalized exploitation

     advantage(a) = (Q(a) - Q̄) / (σ_Q + ε)   # z-score style (v1.8.3)

     Q̄ = E_p0[Q]                              # expectation-weighted baseline

     Δ = max_logit - min_logit               # logit range among legal tokens

     τ = 15.0                                # clamp to prevent "flash of madness"

     β(N) = min(1, N / c_visit)              # ramp up with parent visits

     Final σ(Q) clamped to ±max_perturbation (default 2.5)
```

**Note:** The v1.8.3 advantage formulation (§6.7.1) refines the original range-based normalization. Using expectation-weighted baseline and stddev normalization is more robust and enables symmetric push/pull (tokens below baseline are pushed DOWN).

**Parameter defaults:**

| Symbol  | Parameter                 | Default | Meaning                                 |
| ------- | ------------------------- | ------- | --------------------------------------- |
| ε       | `exploration_floor`       | 0.1     | Minimum exploration (prevents collapse) |
| c       | `gumbel_c_scale`          | 1.0     | Exploitation strength multiplier        |
| τ       | `max_sigma_q_logit_range` | 15.0    | Logit range safety clamp                |
| c_visit | `gumbel_c_visit`          | 50      | Visits for full exploitation strength   |
| —       | `max_logit_perturbation`  | 2.5     | σ(Q) magnitude clamp (v1.8.3)           |
| —       | `min_tokens_for_steering` | 2       | Skip steering with sparse Q (v1.8.3)    |

**Why this works:**

1. **Exploration term** `G(a) · α(n)` — Gumbel noise ensures all legal tokens have non-zero selection probability. Decay reduces noise as position is explored. Floor prevents complete collapse.

2. **Exploitation term** `σ(Q(a))` — High-Q tokens get logit boost proportional to their advantage. Normalization to logit scale ensures boost is competitive with prior differences. Visit scaling prevents overcommitment early.

### 3.5 Inspiration from Gumbel MuZero

From Danihelka et al. (2022):

> AlphaZero can fail to improve its policy network if not visiting all actions at the root of a search tree. Gumbel MuZero guarantees policy improvement even with minimal simulations.

**Our approach is inspired by, not equivalent to, Gumbel MuZero:**

| Gumbel MuZero                              | Our Implementation                              |
| ------------------------------------------ | ----------------------------------------------- |
| Gumbel-Top-k sampling without replacement  | Gumbel noise on legal candidates                |
| Sequential Halving at root for all actions | Sequential Halving for small action spaces only |
| Learned value network                      | Deterministic oracle                            |
| Full policy improvement theorem            | Empirical improvement via biased proposals      |

We draw on the intuition that adding Gumbel noise + Q-value bonuses creates better exploration-exploitation balance, but we don't claim the formal guarantees require the full algorithm structure.

**What we do claim:** Biasing proposals toward historically high-Q tokens, with adaptive decay to prevent lock-in, should improve sample efficiency compared to pure LLM prior sampling.

### 3.6 Discriminative vs Deterministic Positions

**Discriminative position:** Multiple tokens are grammar-legal. The choice affects outcome.

**Deterministic position:** Only one token is grammar-legal. No choice to make.

**Steering at deterministic positions is useless.** It adds noise/computation without affecting the outcome.

### 3.7 Adaptive Exploration with Floor

Exploration should **decay** as the search progresses, but never fully collapse:

- **Early:** High exploration to discover candidates
- **Late:** Low exploration to exploit best candidates
- **Always:** Minimum floor to prevent lock-in

Fixed exploration strength can:

- Lock in early noise (never escapes suboptimal basin)
- Over-explore when answer is already clear (wastes budget)

Exploration that decays to zero can:

- Collapse to greedy after early lucky samples
- Miss late-discovered superior alternatives

The exploration floor guarantees continued diversity.

### 3.8 Relationship to Prior Work

| Technique                | Relationship                                                                 |
| ------------------------ | ---------------------------------------------------------------------------- |
| AlphaZero PUCT           | We extend with proposal biasing, not replacement                             |
| Progressive widening     | We improve proposal quality within widening                                  |
| Gumbel MuZero            | Inspiration for Gumbel + σ(Q) mechanism                                      |
| VerMCTS                  | Verifier-guided search; we add token-level steering                          |
| PPLM/GeDi/DExperts       | Similar logit steering, but we use tree statistics not learned discriminator |
| Progressive bias in MCTS | Classic technique we apply to token level                                    |

Our contribution is applying these ideas to LLM-MCTS with deterministic oracles, position-aware tracking, and token-level granularity.

### 3.9 Why Deterministic Oracles Excel Here

| Property              | Learned Reward Model | Deterministic Oracle |
| --------------------- | -------------------- | -------------------- |
| Training required     | Yes                  | No                   |
| Distribution mismatch | Possible             | Impossible           |
| Signal stability      | Varies               | Consistent           |
| Overfitting risk      | Yes                  | No                   |
| Feedback latency      | Inference time       | Direct call          |

Deterministic oracles provide ideal feedback for proposal biasing: stable, immediate, and ground-truth by definition.

---

## 4. Hypothesis

### 4.1 Primary Hypothesis

**H1:** Applying Gumbel-inspired selection at **discriminative token positions** with **adaptive decay and exploration floor** will enable MCTS to discover high-value actions despite low LLM prior probability.

### 4.2 Secondary Hypotheses

**H2:** Position-aware Q tracking (keyed by prefix + position) will outperform first-token Q tracking for grammars where the action token is not position 0.

**H3:** Exploration decay with floor (`max(floor, 1/√(1+visits))`) will improve convergence compared to both constant exploration and decay-to-zero.

**H4:** Steer-before-truncation ordering will resurrect low-prior tokens that would otherwise be cut by top-k/top-p.

**H5:** Sequential Halving will outperform Gumbel sampling for small enumerable action spaces (≤16 alternatives).

**H6:** Proposal biasing with deterministic oracles will show measurable improvement in sample efficiency (unique children discovered, iterations to optimal) compared to unbiased sampling.

**H7:** σ(Q) normalized to logit scale will enable exploitation to overcome prior bias, unlike raw Q values.

---

## 5. Real Use-Cases

### 5.1 Linters as Tier-1 Oracles

Linters are ideal boundary oracles:

| Property              | Linter Fit                                       |
| --------------------- | ------------------------------------------------ |
| Fast                  | ~10-50ms per check                               |
| Continuous signal     | Violation count × severity                       |
| Partial-code friendly | Grammar-native structural rollout                |
| Discriminative tokens | `var`/`let`/`const`, `==`/`===`, `any`/`unknown` |
| **Deterministic**     | Same input → same output (no training variance)  |

### 5.2 ESLint/Biome Oracle Implementation

```typescript
function lintOracle(
  partialCode: string,
  tracker: RemuxBoundaryTracker,
  timeoutMs: number = 50
): number {
  // Grammar-native rollout — not heuristic!
  const complete = tracker.structural_rollout(partialCode);

  // AST already parsed — zero redundant work
  const ast = tracker.get_committed_ast();

  let results;
  try {
    results = await Promise.race([
      eslint.lintText(complete),
      timeout(timeoutMs),
    ]);
  } catch (e) {
    // Timeout or error: return minimum score, log for debugging
    console.warn('Oracle timeout/error:', e);
    return 0.0;
  }

  let penalty = 0;
  for (const msg of results.messages) {
    switch (msg.severity) {
      case 2:
        penalty += 10;
        break; // error
      case 1:
        penalty += 3;
        break; // warning
    }

    // Bonus penalties for high-value rules
    if (msg.ruleId === '@typescript-eslint/no-explicit-any') penalty += 5;
    if (msg.ruleId === 'prefer-const') penalty += 2;
    if (msg.ruleId === 'eqeqeq') penalty += 5;
  }

  return 100.0 / (1.0 + penalty); // Range: (0, 100]
}
```

### 5.3 Worked Example: TypeScript Error Handler

**Task:** Complete the handler

```typescript
async function handleRequest(req: Request): Promise<Response> {
    const data = // CURSOR
```

**Discriminative position:** Token 0 of completion (the keyword/expression start)

**With Gumbel Steer + Position-Aware Tracking + Normalized σ(Q):**

| Iter | Gumbel×Scale  | Logit | σ(Q) | Total | Token   | Oracle Q |
| ---- | ------------- | ----- | ---- | ----- | ------- | -------- |
| 1    | 0.8×1.0=0.8   | 3.8   | 0    | 4.6   | `await` | 0.99     |
| 2    | 1.2×0.71=0.85 | 3.2   | 0    | 4.05  | `req`   | 0.76     |
| 3    | 0.3×0.58=0.17 | 2.1   | 0    | 2.27  | `JSON`  | 0.45     |
| 4    | 0.5×0.50=0.25 | 3.8   | 1.11 | 5.16  | `await` | 0.99 ✓   |

**Position stats after iteration 3:**

```cpp
PositionKey{prefix="", position=0}:
  token_q["await"] = 0.99
  token_q["req"] = 0.76
  token_q["JSON"] = 0.45
  // For monitoring only (actual steering uses proposal-weighted stats)
```

**Iteration 4 calculation (with v1.8.3 advantage σ(Q)):**

```
logit_range = 3.8 - 2.1 = 1.7 (among explored tokens)
visit_scale = min(1.0, 3/50) = 0.06

// Compute expectation-weighted baseline (prior-weighted)
// p0("await") ≈ 0.7, p0("req") ≈ 0.2, p0("JSON") ≈ 0.1 (from logits)
Q̄ = (0.7×0.99 + 0.2×0.76 + 0.1×0.45) / 1.0 ≈ 0.89

// Compute prior-weighted stddev
σ_Q ≈ 0.17

For "await":
  advantage = (0.99 - 0.89) / (0.17 + 1e-6) ≈ 0.59
  raw_σ = 1.0 × 0.59 × min(1.7, 15.0) × 0.06 = 0.06
  σ(Q) = clamp(0.06, -2.5, 2.5) = 0.06  (at low visit_scale)

At higher visit counts (visit_scale→1.0):
  σ(Q)("await") ≈ 1.0 × 0.59 × 1.7 × 1.0 = 1.0 (clamped by max_perturbation)
```

**Result:** MCTS selects `await req.json()` despite `req.body` having higher initial prior.

### 5.4 Discriminative Tokens That Linters Care About

```typescript
// Token choice → Lint consequence → Position in chunk

let x = 1              // prefer-const warning    (position 0: let vs const)
const x = 1            // ✓ clean

x == null              // eqeqeq error            (position N: == vs ===)
x === null             // ✓ clean

function(x: any)       // no-explicit-any error  (position M: any vs unknown)
function(x: unknown)   // ✓ clean

arr.map(x => { return x })  // arrow-body-style  (position K: { vs expression)
arr.map(x => x)             // ✓ clean

new Array(10)          // no-array-constructor   (position 0: new vs Array.from)
Array.from({length:10})// ✓ clean

throw "error"          // no-throw-literal       (position 1: string vs new)
throw new Error("...")  // ✓ clean
```

Each has a **discriminative position** where the choice matters. After exploration with position-aware Q tracking:

```cpp
// Position 0 stats for variable declarations
position_stats_[{prefix="", pos=0}]:
  Q("const") = 0.95
  Q("let") = 0.72
  Q("var") = 0.45

// Position N stats for equality operators
position_stats_[{prefix="x ", pos=2}]:
  Q("===") = 0.98
  Q("==") = 0.65
```

### 5.5 Multi-Linter Ensemble Oracle

```typescript
async function ensembleOracle(
  code: string,
  tracker: RemuxBoundaryTracker
): Promise<number> {
  const complete = tracker.structural_rollout(code);

  // Parallel execution — all deterministic
  const [eslint, biome, tsc] = await Promise.all([
    eslintCheck(complete),
    biomeCheck(complete),
    typescriptCheck(complete),
  ]);

  const eslintScore = 100 / (1 + countWeighted(eslint));
  const biomeScore = 100 / (1 + countWeighted(biome));
  const tscScore = 100 / (1 + countWeighted(tsc));

  // Weighted by coverage
  return eslintScore * 0.3 + biomeScore * 0.3 + tscScore * 0.4;
}
```

| Linter     | Focus                        |
| ---------- | ---------------------------- |
| ESLint     | Style, best practices, a11y  |
| Biome      | Performance, modern patterns |
| TypeScript | Type safety, null checks     |

**No learning required.** Each oracle is deterministic. Ensemble just adds coverage.

### 5.6 Other Tier-1 Oracle Candidates

| Oracle         | Signal                 | Discriminative Tokens            |
| -------------- | ---------------------- | -------------------------------- |
| **Pyright**    | Type errors            | `Any` vs typed, missing returns  |
| **Ruff**       | Python lint violations | `except:` vs `except Exception:` |
| **Clippy**     | Rust idioms            | `.clone()` vs borrowing          |
| **ShellCheck** | Bash safety            | Unquoted vars, deprecated syntax |
| **Semgrep**    | Security patterns      | SQL concat vs parameterized      |
| **Complexity** | Cyclomatic/cognitive   | Nested `if` vs early return      |

### 5.7 Oracle Integration with Remux

```
Token Stream
    │
    ▼
BoundaryTracker.feed_draft(token)
    │
    ├── draft_parser_.step(ch)  ← Remux streaming parser
    │       │
    │       ▼
    │   ParserStepResult {added?, completed?}
    │       │
    │       ▼
    └── BoundaryMapper → BoundaryInfo
            │
            ▼
        MCTS expansion point
            │
            ├── is_discriminative()?  ← Check before steering
            │       │
            │       ▼ (if true)
            │   build_proposal_set()   ← Bounds candidates (§6.14)
            │       │
            │       ▼
            │   steer_proposal()       ← Apply Gumbel + σ(Q) (§6.7)
            │       │
            │       ▼
            │   sample_from_proposal() ← Sample from steered set
            │
            ▼
        structural_rollout()  ← Grammar-native (get_rollout lambdas)
            │
            ▼
        Tier-1 Oracle (ESLint, Pyright, etc.)  ← Deterministic
            │
            ▼
        Q-value → Update position_stats_[{prefix, position}]
            │
            ▼
        Next iteration uses Q for σ(Q) exploitation
```

Lint oracles provide **free inference-time alignment**:

- ~20ms per boundary check
- Grammar-native rollout (no heuristics)
- AST already parsed (no redundant work)
- Shapes token selection toward clean code
- No fine-tuning required

---

## 6. Implementation

### 6.0 Algorithm Overview

The following pseudocode captures the complete expansion procedure with position-aware steering:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Algorithm 1: Expand with Position-Aware Steering                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ Input: parent node s, grammar G, oracle O, config C                         │
│ Output: child node s', score q                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  1:  branch ← Fork(s.branch)                                                │
│  2:  tokens ← []                                                            │
│  3:  prefix ← ""                                                            │
│  4:  position ← 0                                                           │
│  5:                                                                         │
│  6:  while not IsBoundary(branch) do                                        │
│  7:  │  legal ← GetLegalTokens(branch, G)                                   │
│  8:  │  if legal = ∅ then Error("Grammar violation")                        │
│  9:  │                                                                      │
│ 10:  │  if |legal| = 1 then                                                 │
│ 11:  │  │  token ← legal[0]                         ▷ Deterministic         │
│ 12:  │                                                                      │
│ 13:  │  else if |legal| ≤ C.sh_threshold then                               │
│ 14:  │  │  token ← SequentialHalving(legal, O, C)   ▷ Small action space    │
│ 15:  │                                                                      │
│ 16:  │  else                                                                │
│ 17:  │  │  key ← (Hash(prefix), position)                                   │
│ 18:  │  │  stats ← PositionStats[key]                                       │
│ 19:  │  │  token ← SampleWithSteer(legal, stats, C) ▷ Gumbel + σ(Q)         │
│ 20:  │  end if                                                              │
│ 21:  │                                                                      │
│ 22:  │  Advance(branch, token)                                              │
│ 23:  │  tokens.append(token)                                                │
│ 24:  │  prefix ← prefix + Detokenize(token)                                 │
│ 25:  │  position ← position + 1                                             │
│ 26:  end while                                                              │
│ 27:                                                                         │
│ 28:  complete ← StructuralRollout(branch)           ▷ Grammar-native        │
│ 29:  q ← O(complete)                                 ▷ Oracle evaluation    │
│ 30:  UpdatePositionStats(tokens, q)                  ▷ Track Q per position │
│ 31:                                                                         │
│ 32:  return (branch, tokens, q)                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key decision points:**

| Line  | Condition   | Action        | Rationale                              |
| ----- | ----------- | ------------- | -------------------------------------- | ------------------ | ----------------------------------------- |
| 8     | `legal = ∅` | Error         | Grammar violation, should never happen |
| 10-11 | `           | legal         | = 1`                                   | Direct select      | No choice to make, skip steering overhead |
| 13-14 | `           | legal         | ≤ threshold`                           | Sequential Halving | Optimal for small enumerable spaces       |
| 16-19 | Otherwise   | Gumbel + σ(Q) | Position-aware steering                |

**Subroutine: SampleWithSteer (v1.8.3)**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SampleWithSteer(legal, stats, config, rng) → token                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  1:  logits ← GetLogits(legal)                                              │
│  2:  proposal ← BuildProposalSet(logits, legal, config, rng)   ▷ §6.14     │
│  3:                                                                         │
│  4:  n_with_q ← CountTokensWithQ(stats, proposal)                           │
│  5:  if n_with_q < config.min_tokens then                                   │
│  6:  │  ▷ Insufficient Q data — exploration only                            │
│  7:  │  for each (a, logit) ∈ proposal do                                   │
│  8:  │  │  G ← SampleGumbel(0, 1)                                           │
│  9:  │  │  α ← max(config.floor, 1/√(1 + stats.visits[a]))                  │
│ 10:  │  │  proposal[a].logit ← logit + G × α                                │
│ 11:  │  end for                                                             │
│ 12:  │  return SampleFromProposal(proposal)                                 │
│ 13:  end if                                                                 │
│ 14:                                                                         │
│ 15:  ▷ Compute expectation-weighted baseline and stddev                     │
│ 16:  Q̄ ← Σ p0(a)·Q(a) / Σ p0(a)              ▷ Prior-weighted mean          │
│ 17:  σ_Q ← √(Σ p0(a)·(Q(a)-Q̄)²)              ▷ Prior-weighted stddev        │
│ 18:                                                                         │
│ 19:  Δ ← max(proposal.logits) - min(proposal.logits)                        │
│ 20:  Δ_clamped ← min(Δ, config.max_range)                                   │
│ 21:  β ← min(1, parent_visits / config.c_visit)                             │
│ 22:                                                                         │
│ 23:  for each (a, logit) ∈ proposal do                                      │
│ 24:  │  G ← SampleGumbel(0, 1)                                              │
│ 25:  │  α_a ← max(config.floor, 1/√(1 + stats.visits[a]))                   │
│ 26:  │  advantage ← (stats.Q[a] - Q̄) / (σ_Q + ε)    ▷ Can be negative       │
│ 27:  │  σ_raw ← config.c_scale × advantage × Δ_clamped × β                  │
│ 28:  │  σ ← clamp(σ_raw, -config.max_perturb, +config.max_perturb)          │
│ 29:  │  proposal[a].logit ← logit + G × α_a + σ                             │
│ 30:  end for                                                                │
│ 31:                                                                         │
│ 32:  return SampleFromProposal(proposal)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Core Requirements

Before detailing the implementation, these are **hard requirements** (not optional):

| Requirement                             | Rationale                                            |
| --------------------------------------- | ---------------------------------------------------- |
| Discriminative position detection       | Steering at deterministic positions is useless       |
| Position-aware Q tracking               | First-token assumption fails for most grammars       |
| Adaptive exploration decay with floor   | Prevents both lock-in and collapse                   |
| Steer-before-truncation ordering        | Low-prior tokens must survive to be boosted          |
| Restrict to legal candidates only       | "Spray and pray" on 50k tokens is chaos              |
| Model prior from unsteered distribution | Prevents double-counting oracle signal               |
| σ(Q) normalized to logit scale          | Raw Q values too small to affect selection           |
| Logit range clamped                     | Prevents pathological boosts from extreme confidence |

### 6.2 Configuration

```cpp
// mcts.hpp - SearchConfig

enum class SteerStrategy {
    /** No steering - pure LLM prior */
    NONE,

    /** Gumbel noise + σ(Q) with adaptive decay */
    GUMBEL
};

struct SearchConfig {
    // === Steering Strategy ===

    SteerStrategy steer_strategy = SteerStrategy::NONE;

    // === Gumbel Parameters ===

    /** Visit count at which Q scaling reaches 1.0 (default 50)
     *  Inspired by Gumbel MuZero's c_visit parameter */
    float gumbel_c_visit = 50.0f;

    /** Scale factor for normalized advantage (default 1.0)
     *  Applied after normalization to logit scale.
     *  Values > 1.0 increase exploitation strength. */
    float gumbel_c_scale = 1.0f;

    /** Exploration decay rate (default 0.5)
     *  explore_scale = max(floor, 1 / (1 + visits)^decay_rate)
     *  0.5 = sqrt decay, 1.0 = linear decay */
    float exploration_decay_rate = 0.5f;

    /** Minimum exploration scale (default 0.1)
     *  Prevents complete collapse to exploitation.
     *  Guarantees continued diversity even at high visit counts. */
    float exploration_floor = 0.1f;

    /** Maximum logit range for σ(Q) scaling (default 15.0)
     *  Clamps logit_range to prevent pathological boosts when
     *  model is extremely confident. e^15 ≈ 3.3M confidence ratio.
     *  If model is that sure, it's usually right. */
    float max_sigma_q_logit_range = 15.0f;

    /** Maximum perturbation magnitude for σ(Q) (default 2.5)
     *  Clamps final σ(Q) to [-max, +max] to prevent degeneration.
     *  Lesson from PPLM: unbounded steering causes repetition.
     *  2.5 allows ~12x probability shift — conservative default.
     *  Can ramp to 5.0 when advantage separation is high. */
    float max_logit_perturbation = 2.5f;

    /** Minimum tokens with Q estimates before steering (default 2)
     *  If fewer tokens have Q values, apply exploration only.
     *  Prevents "fake neutrality" from sparse Q data. */
    int min_tokens_for_steering = 2;

    // === Candidate Set Construction (§6.14) ===

    /** Maximum proposal set size (default 128)
     *  EastWest operates on at most this many candidates.
     *  If |legal| <= proposal_k, uses all legal tokens. */
    int proposal_k = 128;

    /** Exploration tail size (default 8)
     *  Random samples from outside top-(K-T) legal tokens.
     *  Prevents blindness to rare-but-good options.
     *  ~6% matches exploration_floor philosophy.
     *  DExperts (Liu et al. 2021) discusses tail reintroduction. */
    int exploration_tail = 8;

    /** Temperature for tail sampling (default 2.0)
     *  Higher = more uniform sampling from tail.
     *  Lower = still biased toward higher-probability tail tokens. */
    float tail_temperature = 2.0f;

    /** Mandatory tokens always included in proposal (default: {EOS})
     *  These tokens are added to proposal even if outside top-K.
     *  Prevents infinite loops when oracle wants termination.
     *  Grammar can inject additional mandatory tokens. */
    std::vector<llama_token> mandatory_tokens = {};  // Set to {EOS} at runtime

    // === Determinism ===

    /** Base seed for RNG (default 0 = use random_device)
     *  When non-zero, enables reproducible exploration.
     *  Actual seed = hash(base_seed, prefix_hash, position, iteration). */
    uint64_t rng_base_seed = 0;

    // === Sequential Halving Parameters ===

    /** Maximum legal tokens to use Sequential Halving (default 16)
     *  When |legal_tokens| <= threshold at discriminative position,
     *  enumerate all and use Sequential Halving.
     *  Set to 0 to disable. */
    int sequential_halving_threshold = 16;

    /** Budget for Sequential Halving oracle calls (default 30)
     *  Lower values reduce latency at cost of confidence.
     *  With 5 candidates and 20ms oracle: 30 calls = 600ms. */
    int sequential_halving_budget = 30;

    // === Oracle Parameters ===

    /** Oracle timeout in milliseconds (default 50)
     *  Oracles exceeding this return minimum score (0.0).
     *  Prevents non-determinism from variable execution time. */
    int oracle_timeout_ms = 50;

    // === Safety ===

    /** Require discriminative detection before steering (default true)
     *  When true, steer only applies when is_discriminative() returns true.
     *  When false (DANGER), steer applies at every position. */
    bool require_discriminative = true;
};
```

### 6.3 Discriminative Position Detection

**This is a core requirement, not an optimization.**

```cpp
/**
 * Detect whether the current position is discriminative.
 *
 * A position is discriminative if:
 *   1. Multiple tokens are grammar-legal, AND
 *   2. The choice affects the generation outcome
 *
 * At deterministic positions, steering is a no-op (one legal token).
 *
 * @return true if |legal_tokens| > 1
 */
bool is_discriminative(BranchHandle handle, BranchStore* store) {
    auto legal = branch::get_legal_priors(handle, store);
    return legal.size() > 1;
}

/**
 * Get the set of legal tokens at current position.
 *
 * Steering should ONLY apply bonuses to these tokens.
 * All other tokens should remain unchanged.
 *
 * @return Vector of (token, prior) pairs for grammar-legal tokens
 * @throws std::runtime_error if legal set is empty (grammar violation)
 */
std::vector<std::pair<llama_token, float>> get_legal_candidates(
    BranchHandle handle,
    BranchStore* store
) {
    auto legal = branch::get_legal_priors(handle, store);
    if (legal.empty()) {
        throw std::runtime_error("No legal tokens at position - grammar violation");
    }
    return legal;
}
```

### 6.4 Position-Aware Q Tracking

> **EastWest component:** `eastwest::PositionKey`, `eastwest::PositionStats`, `eastwest::StatsMap`

**The first-token assumption is incorrect for most real grammars.** We must track Q per (prefix, position).

```cpp
/**
 * Key for position-aware Q tracking.
 *
 * Tracks Q-values by:
 *   - prefix_hash: Hash of tokens before this position in the chunk
 *   - position: Token index within the chunk (0-indexed)
 *
 * Example for "MOVE: 8\n":
 *   Position 0: prefix="" → tracks Q for "MOVE" (deterministic)
 *   Position 3: prefix="MOVE: " → tracks Q for digit tokens (discriminative)
 */
struct PositionKey {
    size_t prefix_hash;
    int position;

    bool operator==(const PositionKey& other) const {
        return prefix_hash == other.prefix_hash && position == other.position;
    }
};

struct PositionKeyHash {
    size_t operator()(const PositionKey& k) const {
        return std::hash<size_t>()(k.prefix_hash) ^
               (std::hash<int>()(k.position) << 1);
    }
};

/**
 * Q-statistics for a specific position.
 *
 * v1.8.3: The actual baseline/normalization is computed by helper functions
 * (compute_baseline_q, compute_q_stddev) using the proposal distribution.
 * This struct just stores the raw Q observations.
 */
struct PositionStats {
    std::unordered_map<llama_token, float> token_q;      // Best Q per token
    std::unordered_map<llama_token, int> token_visits;   // Visit count per token

    // Tracking fields (for debugging/monitoring, not used in steering formula)
    float q_min = std::numeric_limits<float>::max();
    float q_max = std::numeric_limits<float>::lowest();
    int total_visits = 0;

    void update(llama_token tok, float q) {
        // Track best Q per token (max, not mean) — see design note below
        if (token_q.find(tok) == token_q.end() || q > token_q[tok]) {
            token_q[tok] = q;
        }
        token_visits[tok]++;
        total_visits++;

        // Update bounds (for monitoring)
        q_min = std::min(q_min, q);
        q_max = std::max(q_max, q);
    }

    int visits_for(llama_token tok) const {
        auto it = token_visits.find(tok);
        return it != token_visits.end() ? it->second : 0;
    }
};

// In PUCT class:
std::unordered_map<PositionKey, PositionStats, PositionKeyHash> position_stats_;
```

**Design note: Max vs Mean Q storage**

We store `max(Q)` per token, not `mean(Q)`. This is a deliberate design choice:

| Strategy                  | Semantics                               | Best For                                      |
| ------------------------- | --------------------------------------- | --------------------------------------------- |
| **Max** (current)         | "Is there a good path from this token?" | Deterministic oracles, optimistic exploration |
| Mean                      | "What's the typical outcome?"           | Stochastic oracles, stable exploitation       |
| UCB-style (`mean + c/√n`) | Explicit optimism with decay            | Balancing exploration/exploitation            |

**Rationale for max:**

With _deterministic_ oracles (linters, type checkers, verifiers), the score for a given completion is fixed. Variance in Q comes from _downstream token choices_, not oracle noise. Max answers: "Can this token lead to a good completion?" — which is what we want for steering toward valid solutions.

**Known tradeoff:**

Max can over-credit tokens that got "lucky" downstream (one good rollout permanently elevates a token). For stochastic oracles or when this bias is problematic, switch to mean:

```cpp
// Alternative: Mean Q storage
std::unordered_map<llama_token, float> token_q_sum;
std::unordered_map<llama_token, int> token_q_count;

void update(llama_token tok, float q) {
    token_q_sum[tok] += q;
    token_q_count[tok]++;
    // token_q_mean = sum / count
}
```

**Helper functions for steering (v1.8.3):**

These operate on the proposal set, not just the stats, because the baseline and normalization need to be weighted by the proposal distribution.

```cpp
// See §6.7 for full implementations
float compute_baseline_q(const PositionStats& stats,
                         const std::vector<std::pair<llama_token, float>>& proposal);
float compute_q_stddev(const PositionStats& stats,
                       const std::vector<std::pair<llama_token, float>>& proposal,
                       float q_baseline);
int count_tokens_with_q(const PositionStats& stats,
                        const std::vector<std::pair<llama_token, float>>& proposal);
```

#### 6.4.1 Trace Logging for Expert Iteration

**Purpose:** Capture decision-level signals for future learned head training. Even without a trained head, traces provide debugging insight and training data accumulation.

This follows the Expert Iteration (ExIt) pattern from Anthony et al. (2017): tree search acts as the "expert" generating high-quality decisions, which can later train an "apprentice" neural network to approximate those decisions cheaply.

```cpp
/**
 * Oracle evaluation result with versioning.
 *
 * CRITICAL: Version info enables invalidating stale training data when oracles update.
 * Without this, model learns from outdated lint rules, deprecated type checks, etc.
 */
struct OracleResult {
    std::string tool_name;        // "eslint", "tsc", "pytest", "custom"
    std::string tool_version;     // "9.0.1", "5.3.0" — semantic version
    size_t config_hash;           // Hash of config file (.eslintrc, tsconfig.json, etc.)

    float score;                  // Normalized score [0, 1]
    bool passed;                  // Binary pass/fail

    // For debugging and deduplication
    // NOTE: diagnostics_hash should hash NORMALIZED output (strip paths, line numbers,
    // timestamps) to enable meaningful deduplication. Raw stderr hashes rarely match.
    size_t diagnostics_hash;      // Hash of normalized error messages (group similar failures)
    std::string diagnostics_summary;  // First N chars of error output (optional)
};

/**
 * Sampling hyperparameters for reproducibility.
 *
 * Required to replay decisions exactly when debugging or validating traces.
 */
struct SamplingConfig {
    uint64_t seed;                // RNG seed for this decision
    float temperature;            // Sampling temperature
    float top_p;                  // Nucleus sampling threshold
    int top_k;                    // Top-K filtering (0 = disabled)

    // EastWest-specific
    float exploration_temperature;  // Temperature for tail exploration
    int proposal_k;               // Size of proposal set
    int exploration_tail;         // Number of tail samples
};

/**
 * Environment fingerprint for full reproducibility.
 *
 * Decision-level SamplingConfig is necessary but not sufficient for replay.
 * Environment drift (model updates, tokenizer changes, etc.) causes "replay drift"
 * where the same trace won't reproduce once anything changes.
 *
 * This struct captures the full environment state at trace time.
 */
struct RunFingerprint {
    std::string model_id;           // "qwen2.5-coder-3b-instruct"
    std::string quantization;       // "Q4_K_M", "F16", etc.
    size_t model_file_hash;         // Hash of .gguf file (first 1MB + size)

    std::string inference_engine;   // "llama.cpp", "vllm", etc.
    std::string engine_version;     // Git commit hash or semantic version

    size_t tokenizer_hash;          // Hash of vocab — token IDs must be stable
    size_t grammar_hash;            // Hash of grammar/boundary-tracker config
};
```

### 6.4.2 Deterministic Sampling Module

**Relationship to Prior Art**

The algorithms in this specification (Gumbel-Top-k sampling, Gumbel MuZero steering,
Sequential Halving, Dirichlet root noise) are derived from Danihelka et al. (2022),
Kool et al. (2019), Karnin et al. (2013), and Silver et al. (2018). These papers
specify **distributional requirements** (e.g., "G ~ Gumbel(0,1)", "Dir(α) noise at root"),
not RNG implementations.

C++ `std::*_distribution` classes are **implementation-defined** — the same seed produces
different sequences across stdlibs (libstdc++ vs libc++ vs MSVC). This _already violates_
the cross-platform reproducibility the papers implicitly assume.

Our explicit implementations:

- **Match** the distributional laws specified in the papers exactly
- **Enable** the "same seed → same decisions" property required for deterministic replay
- **Align** with AlphaZero/MuZero exploration (Dirichlet) and Gumbel MuZero selection (Gumbel)

**Architecture:** The RNG (`eastwest::rng`) is separated from distribution sampling
(`eastwest::sampler`). The RNG only knows about random bits; samplers are free functions
that consume RNG output to produce specific distributions.

```cpp
// ============================================================================
// DETERMINISTIC SAMPLING MODULE
// ============================================================================
// Reference implementations for cross-platform reproducibility.
// These produce identical sequences across all platforms given the same seed.
//
// Architecture:
//   eastwest::rng      — Pure RNG (Xoroshiro128+), only produces random bits
//   eastwest::sampler  — Free functions that consume RNG to produce distributions
//
// Dependencies: Only <cmath>, <cstdint>, <vector>, <algorithm>
// No dependency on <random> — that's the point.
// ============================================================================

namespace eastwest::rng {

/**
 * Xoroshiro128+ PRNG — matches TypeScript implementation exactly.
 *
 * Properties:
 *   - Period: 2^128 - 1
 *   - Passes BigCrush statistical tests
 *   - Fast: ~1ns per call on modern CPUs
 *   - Deterministic: same seed = same sequence across all platforms
 *
 * Based on reference implementation: http://prng.di.unimi.it/xoroshiro128plus.c
 *
 * WARNING: Low bits have lower quality. Use uniform_open_01() for float conversion.
 *
 * This class ONLY produces random bits. Distribution sampling is in eastwest::sampler.
 */
class Xoroshiro128Plus {
    uint64_t state0_, state1_;

    static uint64_t splitmix64(uint64_t x) {
        x += 0x9e3779b97f4a7c15ULL;
        x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9ULL;
        x = (x ^ (x >> 27)) * 0x94d049bb133111ebULL;
        return x ^ (x >> 31);
    }

    static uint64_t rotl(uint64_t x, int k) {
        return (x << k) | (x >> (64 - k));
    }

public:
    explicit Xoroshiro128Plus(uint32_t seed) {
        // Initialize via SplitMix64 for good state distribution
        state0_ = splitmix64(seed);
        state1_ = splitmix64(seed + 1);
    }

    /// Raw 64-bit output
    uint64_t next_u64() {
        uint64_t s0 = state0_;
        uint64_t s1 = state1_;
        uint64_t result = s0 + s1;

        s1 ^= s0;
        state0_ = rotl(s0, 24) ^ s1 ^ (s1 << 16);
        state1_ = rotl(s1, 37);

        return result;
    }

    /**
     * Uniform double in OPEN interval (0, 1).
     *
     * CRITICAL: Uses upper 53 bits (xoroshiro128+ has weak low bits).
     * The +1 offset ensures we never return exactly 0.0.
     * This is essential for Gumbel sampling: -log(-log(0)) = inf.
     *
     * Returns: u ∈ (2^-53, 1 - 2^-54) ⊂ (0, 1)
     */
    double uniform_open_01() {
        uint64_t bits = next_u64();
        // Upper 53 bits + 1, divided by 2^53
        // This gives (1, 2^53) / 2^53 = (2^-53, 1)
        return static_cast<double>((bits >> 11) + 1) * (1.0 / 9007199254740992.0);
    }
};

} // namespace eastwest::rng

// ============================================================================
// DISTRIBUTION SAMPLING — Free functions consuming RNG
// ============================================================================

namespace eastwest::sampler {

/**
 * Standard normal N(0,1) via Box-Muller transform.
 *
 * Generates from two uniform draws.
 * Could cache the second value, but clarity > micro-optimization here.
 */
inline double standard_normal(rng::Xoroshiro128Plus& rng) {
    double u1 = rng.uniform_open_01();
    double u2 = rng.uniform_open_01();
    return std::sqrt(-2.0 * std::log(u1)) * std::cos(2.0 * M_PI * u2);
}

/**
 * Gumbel(0, 1) via inverse CDF.
 *
 * This is the textbook method (Vieira 2014, Wikipedia).
 * G = -log(-log(U)) where U ~ Uniform(0,1)
 *
 * Used in Gumbel MuZero (Danihelka 2022) for action selection.
 */
inline double gumbel(rng::Xoroshiro128Plus& rng) {
    double u = rng.uniform_open_01();
    return -std::log(-std::log(u));
}

/**
 * Gamma(α, 1) via Marsaglia-Tsang method (2000).
 *
 * The standard algorithm for α ≥ 1. For α < 1, we use the reduction:
 *   Gamma(α) = Gamma(α+1) · U^(1/α)
 *
 * Required for Dirichlet sampling (AlphaZero root noise).
 *
 * Reference: Marsaglia & Tsang, "A Simple Method for Generating Gamma Variables"
 * ACM Transactions on Mathematical Software, Vol. 26, No. 3, 2000.
 */
inline double gamma(rng::Xoroshiro128Plus& rng, double alpha) {
    if (alpha < 1.0) {
        // Reduction for α < 1: Gamma(α) = Gamma(α+1) · U^(1/α)
        return gamma(rng, alpha + 1.0) * std::pow(rng.uniform_open_01(), 1.0 / alpha);
    }

    // Marsaglia-Tsang for α ≥ 1
    double d = alpha - 1.0 / 3.0;
    double c = 1.0 / std::sqrt(9.0 * d);

    while (true) {
        double x, v;
        do {
            x = standard_normal(rng);
            v = 1.0 + c * x;
        } while (v <= 0.0);

        v = v * v * v;
        double u = rng.uniform_open_01();

        // Fast acceptance
        if (u < 1.0 - 0.0331 * (x * x) * (x * x)) {
            return d * v;
        }
        // Slow acceptance (log comparison)
        if (std::log(u) < 0.5 * x * x + d * (1.0 - v + std::log(v))) {
            return d * v;
        }
    }
}

/**
 * Dirichlet(α, α, ..., α) — symmetric Dirichlet with concentration α.
 *
 * Used in AlphaZero/MuZero for root exploration noise:
 *   π_explore(a) = (1 - ε) · π_network(a) + ε · Dir(α)
 *
 * Typical values: α = 0.03 (Go), α = 0.3 (Chess), α = 0.25 (Atari)
 *
 * @param rng      Random number generator
 * @param out      Output buffer (will be normalized to sum to 1)
 * @param n        Number of dimensions
 * @param alpha    Concentration parameter (same for all dimensions)
 */
inline void dirichlet(rng::Xoroshiro128Plus& rng, float* out, int n, float alpha) {
    double sum = 0.0;
    for (int i = 0; i < n; ++i) {
        double g = gamma(rng, alpha);
        out[i] = static_cast<float>(g);
        sum += g;
    }
    // Normalize
    float inv_sum = static_cast<float>(1.0 / sum);
    for (int i = 0; i < n; ++i) {
        out[i] *= inv_sum;
    }
}

/**
 * Categorical sample from unnormalized weights.
 *
 * Endpoint rule: r < cumsum (strict less-than)
 * Tie-breaking: first matching index wins
 * Summation: done in double for numerical stability
 *
 * @param rng      Random number generator
 * @param weights  Unnormalized weights (must be non-negative)
 * @param n        Number of categories
 * @return         Sampled index in [0, n)
 */
inline int categorical(rng::Xoroshiro128Plus& rng, const float* weights, int n) {
    // Sum in double for stability
    double sum = 0.0;
    for (int i = 0; i < n; ++i) {
        sum += weights[i];
    }

    double r = rng.uniform_open_01() * sum;  // r ∈ (0, sum)

    double cumsum = 0.0;
    for (int i = 0; i < n; ++i) {
        cumsum += weights[i];
        if (r < cumsum) return i;  // Strict less-than
    }
    return n - 1;  // Numerical safety fallback
}

/**
 * Weighted sampling WITHOUT replacement via Gumbel-Top-k trick.
 *
 * This is mathematically equivalent to:
 *   1. Sample from categorical
 *   2. Remove sampled element
 *   3. Renormalize and repeat
 *
 * But more efficient: O(n log k) vs O(k · n) for rejection sampling.
 *
 * Based on Kool et al. (2019), "Stochastic Beams and Where to Find Them"
 * and Vieira (2014), "Gumbel-max trick and weighted reservoir sampling".
 *
 * @param rng      Random number generator
 * @param logits   Log-probabilities (unnormalized)
 * @param n        Number of elements
 * @param k        Number to sample (without replacement)
 * @param out      Output buffer for sampled indices (size >= k)
 * @return         Actual number sampled (min(k, n))
 */
inline int gumbel_top_k(rng::Xoroshiro128Plus& rng, const float* logits, int n, int k, int* out) {
    k = std::min(k, n);

    // Perturb each logit with Gumbel noise
    std::vector<std::pair<double, int>> perturbed(n);
    for (int i = 0; i < n; ++i) {
        perturbed[i] = {logits[i] + gumbel(rng), i};
    }

    // Partial sort to find top-k (O(n log k))
    std::partial_sort(
        perturbed.begin(),
        perturbed.begin() + k,
        perturbed.end(),
        [](const auto& a, const auto& b) { return a.first > b.first; }
    );

    for (int i = 0; i < k; ++i) {
        out[i] = perturbed[i].second;
    }
    return k;
}

} // namespace eastwest::sampler
```

**Cross-Platform Determinism Caveats**

The RNG and distribution algorithms above are fully deterministic. However,
`std::log`, `std::exp`, `std::sqrt`, and `std::cos` may differ across:

- Compilers (`-ffast-math` enables non-IEEE optimizations)
- CPU microarchitectures (x87 extended precision vs SSE vs AVX)
- libm implementations (glibc vs musl vs macOS libm)

These differences are typically sub-ULP and rarely flip discrete decisions.
For applications requiring **strict cross-platform replay**:

1. **Option A:** Record RNG draws in trace (uniforms consumed, or final Dirichlet vector)
2. **Option B:** Use a deterministic math library (e.g., MPFR, or quantized comparisons)
3. **Option C:** Accept forensic replay from logged distributions (`p0_proposal`, `p_steered`)

For most use cases, Option C is sufficient — the logged steering signal is the
training target, not the exact RNG path that produced it.

```cpp

/**
 * Complete trace of a single EastWest decision.
 *
 * Captures everything needed to train:
 *   1. Policy distillation head (imitate EastWest decisions)
 *   2. Q/advantage prediction head (predict oracle returns)
 *   3. Attribute model (predict oracle pass/fail per token)
 *
 * Also enables off-policy learning via propensity scoring (Swaminathan & Joachims 2015).
 */
struct EastWestTrace {
    // ========================================================================
    // Schema & Environment (for forward compatibility and reproducibility)
    // ========================================================================
    std::string trace_schema_version = "1.8.3";  // Schema version for forward compat

    // Workspace state — for data staleness beyond oracle versioning
    std::string workspace_revision;   // Git SHA of project being evaluated
    size_t deps_lock_hash;            // Hash of package-lock.json, Cargo.lock, etc.

    // Full environment fingerprint — required for exact replay
    RunFingerprint environment;       // Model, tokenizer, engine versions

    // ========================================================================
    // State Identification
    // ========================================================================
    size_t prefix_hash;           // Hash of tokens before this position
    int position;                 // Token index within chunk
    std::string boundary_type;    // Grammar/structural context (e.g., "code_block", "json_value")
    int grammar_state_id;         // Parser state if applicable (-1 if none)

    // ========================================================================
    // Distributions (ESSENTIAL for policy distillation)
    // ========================================================================

    // Unsteered model distribution over proposal set
    // This is p₀ — what the model believed before EastWest
    std::vector<std::pair<llama_token, float>> p0_proposal;  // (token, probability)

    // Steered distribution after EastWest
    // This is what we actually sampled from
    std::vector<std::pair<llama_token, float>> p_steered;    // (token, probability)

    // Explicit steering signal — what a EastWest-head would learn to predict
    // delta_logit[i] = log(p_steered[i]) - log(p0_proposal[i])
    // Stored explicitly to avoid floating-point recomputation drift
    std::vector<std::pair<llama_token, float>> delta_logit;  // (token, logit_adjustment)

    // ========================================================================
    // Oracle Feedback (ESSENTIAL for Q-head training)
    // ========================================================================

    // Per-token Q values observed at this position
    // May be sparse (only tokens that were evaluated)
    std::unordered_map<llama_token, float> token_q;

    // Aggregated statistics used for steering
    float q_baseline;             // Expectation-weighted baseline (§6.7.1)
    float q_stddev;               // Proposal-weighted stddev (§6.7.1)
    int tokens_with_q;            // How many proposal tokens had Q data

    // Structured oracle results with versioning
    std::vector<OracleResult> oracle_results;  // One per oracle in multi-oracle setup

    // ========================================================================
    // Chosen Action (ESSENTIAL for behavior cloning)
    // ========================================================================
    llama_token chosen_token;     // What was actually sampled
    float behavior_prob;          // P(chosen | p_steered) — CRITICAL for off-policy
    float p0_prob;                // P(chosen | p₀) — for importance weight computation

    // ========================================================================
    // Downstream Return (ESSENTIAL for credit assignment)
    // ========================================================================
    float downstream_q;           // Oracle score of completed chunk/sequence
    bool oracle_passed;           // Binary: did final completion pass oracle?

    // Per-oracle component scores (if multi-oracle) — DEPRECATED, use oracle_results
    std::unordered_map<std::string, float> oracle_components;  // e.g., {"eslint": 0.9, "tsc": 1.0}

    // ========================================================================
    // Search Metadata (for analysis and curriculum)
    // ========================================================================
    int position_visits;          // How many times this position was visited
    int search_iterations;        // MCTS iterations at this decision
    bool used_sequential_halving; // Was SH used instead of Gumbel?
    float exploration_scale;      // Decay factor at this position

    // ========================================================================
    // Sampling Configuration (for reproducibility)
    // ========================================================================
    SamplingConfig sampling;      // All hyperparameters needed to replay

    // ========================================================================
    // Timing (for efficiency analysis)
    // ========================================================================
    float oracle_time_ms;         // Time spent in oracle calls
    float steering_time_ms;       // Time spent in EastWest logic
};

/**
 * Trace emitter callback.
 *
 * Called after each discriminative decision with full trace.
 * Implementer can write to disk, send to service, or accumulate in memory.
 */
using TraceCallback = std::function<void(const EastWestTrace&)>;
```

**Trace invariants (catch silent logging bugs):**

```cpp
bool validate_trace(const EastWestTrace& t) {
    // Distribution alignment — all must have same tokens in same order
    if (t.p0_proposal.size() != t.p_steered.size() ||
        t.p0_proposal.size() != t.delta_logit.size()) {
        return false;  // Misaligned distributions
    }

    // Token consistency
    for (size_t i = 0; i < t.p0_proposal.size(); ++i) {
        if (t.p0_proposal[i].first != t.p_steered[i].first ||
            t.p0_proposal[i].first != t.delta_logit[i].first) {
            return false;  // Token order mismatch
        }
    }

    // Probability normalization (within tolerance)
    float p0_sum = 0, ps_sum = 0;
    for (const auto& [tok, p] : t.p0_proposal) p0_sum += p;
    for (const auto& [tok, p] : t.p_steered) ps_sum += p;
    if (std::abs(p0_sum - 1.0f) > 0.01f || std::abs(ps_sum - 1.0f) > 0.01f) {
        return false;  // Distributions not normalized
    }

    // Chosen token must be in proposal set
    bool found = false;
    for (const auto& [tok, p] : t.p0_proposal) {
        if (tok == t.chosen_token) { found = true; break; }
    }
    if (!found) return false;  // Chosen token not in proposal

    // Delta logit bounds (must respect max_perturbation)
    for (const auto& [tok, delta] : t.delta_logit) {
        if (std::abs(delta) > 5.0f) {  // Should be <= max_logit_perturbation
            return false;  // Steering exceeded bounds
        }
    }

    return true;
}
```

**Key fields for each training objective:**

| Training Objective         | Required Fields                                                 |
| -------------------------- | --------------------------------------------------------------- |
| Policy distillation        | `p0_proposal`, `p_steered`, `chosen_token`                      |
| EastWest-head distillation | `p0_proposal`, `delta_logit`, `chosen_token`                    |
| Q-head regression          | `token_q`, `q_baseline`, `downstream_q`                         |
| Attribute model            | `chosen_token`, `oracle_passed`, `oracle_results`               |
| Off-policy (CRM)           | `behavior_prob`, `p0_prob`, `downstream_q`                      |
| DAgger correction          | `prefix_hash`, `position`, all distributions                    |
| Exact replay               | `sampling`, `environment` (full RunFingerprint)                 |
| Data staleness (oracle)    | `oracle_results[].tool_version`, `oracle_results[].config_hash` |
| Data staleness (workspace) | `workspace_revision`, `deps_lock_hash`                          |
| Schema evolution           | `trace_schema_version`                                          |

**Why `delta_logit` is stored explicitly:**

A EastWest-head learns to predict the steering adjustment directly. Storing `delta_logit` avoids recomputation drift from `log(p_steered) - log(p0)` and makes the training target unambiguous.

**Why oracle versioning matters:**

```cpp
// When oracle updates, invalidate stale training data
bool is_trace_valid(const EastWestTrace& trace, const OracleRegistry& current) {
    for (const auto& result : trace.oracle_results) {
        auto& current_oracle = current.get(result.tool_name);
        if (result.tool_version != current_oracle.version ||
            result.config_hash != current_oracle.config_hash) {
            return false;  // Oracle changed — trace is stale
        }
    }
    return true;
}
```

Without versioning, model learns from outdated rules (e.g., old eslint config) and produces false positives/negatives.

**Why `behavior_prob` matters:**

For off-policy learning (learning from logged data), you need the propensity score — the probability that the logging policy assigned to the action it took. Without this, importance-weighted estimators can't correct for the distribution mismatch between logging policy and target policy.

```cpp
// Importance weight for off-policy learning
float importance_weight = target_policy_prob / behavior_prob;

// Counterfactual risk estimator
float crm_loss = importance_weight * loss(chosen_token, downstream_q);
```

### 6.5 Adaptive Exploration Decay with Floor

**Fixed exploration causes problems. Decay-to-zero causes collapse.** The floor guarantees continued diversity.

```cpp
/**
 * Compute exploration scale factor based on visit counts.
 *
 * Decays as: scale = max(floor, 1 / (1 + visits)^decay_rate)
 *
 * With decay_rate = 0.5, floor = 0.1:
 *   visits=0:   scale = 1.0     (full exploration)
 *   visits=1:   scale = 0.71    (1/√2)
 *   visits=3:   scale = 0.5     (1/√4)
 *   visits=8:   scale = 0.33    (1/√9)
 *   visits=15:  scale = 0.25    (1/√16)
 *   visits=99:  scale = 0.1     (floor)
 *   visits=999: scale = 0.1     (still at floor)
 *
 * @param visits Number of times this position has been visited
 * @param decay_rate Decay exponent (0.5 = sqrt, 1.0 = linear)
 * @param floor Minimum scale (prevents collapse)
 */
float compute_exploration_scale(int visits, float decay_rate, float floor) {
    float decayed = 1.0f / std::pow(1.0f + static_cast<float>(visits), decay_rate);
    return std::max(floor, decayed);
}

/**
 * Compute per-token exploration scale.
 *
 * Tokens visited more often get less exploration bonus.
 * Floor prevents any single token from being fully exploited.
 */
float compute_token_exploration_scale(int token_visits, float decay_rate, float floor) {
    float decayed = 1.0f / std::pow(1.0f + static_cast<float>(token_visits), decay_rate);
    return std::max(floor, decayed);
}
```

### 6.6 Steer-Before-Truncation Ordering

**Critical:** If top-k/top-p truncates before steer, low-prior tokens are already gone.

**v1.8.3 solution:** The proposal-based approach (§6.14) handles this correctly by design:

1. `build_proposal_set()` takes **unsteered** logits
2. Proposal includes exploration tail from outside top-K
3. `steer_proposal()` then modifies the proposal
4. Sampling happens on steered proposal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Correct ordering (v1.8.3):                                                 │
│                                                                             │
│   raw logits ──► build_proposal_set() ──► steer_proposal() ──► sample     │
│                  └── includes tail ──┘    └── can boost ────┘              │
│                                                                             │
│  The exploration tail (§6.14) ensures low-prior tokens have a path         │
│  into the proposal set BEFORE steering decides their fate.                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Wrong ordering (would break):                                              │
│                                                                             │
│   raw logits ──► top_k ──► steer ──► sample                                │
│                  └── tail already gone, can't resurrect ───┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

The `exploration_tail` parameter (default 8) guarantees that tokens outside the model's top-K still have a chance to be steered upward if they have high Q-values.

### 6.7 Gumbel Steer Implementation

> **EastWest component:** `EastWest::steer_proposal()` — modifies proposal in-place

**The σ(Q) Formula (v1.8.3):**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                         Q(a) - Q̄                                           │
│   σ(Q(a))  =  c_scale × ─────────── × min(Δ_logit, τ) × β(N)               │
│                          σ_Q + ε                                            │
│                         └────┬────┘   └──────┬──────┘   └─┬─┘              │
│                          advantage       clamped        visit              │
│                         (unbounded)       range        scaling             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Where:                                                                      │
│   • Q̄ = Σ p0(t)·Q(t) / Σ p0(t) — expectation under proposal prior         │
│   • σ_Q = prior-weighted standard deviation of Q                           │
│   • Δ_logit = max(logit) - min(logit) among proposal tokens                │
│   • τ = 15.0 (clamp prevents "flash of madness" from extreme confidence)   │
│   • β(N) = min(1, N / c_visit) ramps exploitation with parent visits       │
│   • c_scale = 1.0 (tunable exploitation strength)                          │
│   • Final σ(Q) clamped to ±max_perturbation (default 2.5)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ Key changes from v1.8:                                                      │
│   • Baseline: expectation-weighted Q̄, not arithmetic mean (less bias)     │
│   • Normalization: stddev, not range (more robust to outliers)             │
│   • Output: can be negative (pushes low-Q tokens DOWN)                     │
│   • Sparse data: skip steering if < min_tokens_for_steering have Q        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Complexity: O(proposal_k) ≈ O(128), not O(vocab) ≈ O(128,000)              │
└─────────────────────────────────────────────────────────────────────────────┘
```

```cpp
/**
 * Compute the range of logits among proposal candidates.
 *
 * O(proposal_k) — operates on bounded proposal set.
 */
float compute_logit_range(
    const std::vector<std::pair<llama_token, float>>& proposal
) {
    if (proposal.empty()) return 1.0f;

    float min_logit = std::numeric_limits<float>::max();
    float max_logit = std::numeric_limits<float>::lowest();

    for (const auto& [tok, logit] : proposal) {
        min_logit = std::min(min_logit, logit);
        max_logit = std::max(max_logit, logit);
    }

    return (max_logit > min_logit) ? (max_logit - min_logit) : 1.0f;
}

/**
 * Apply Gumbel steering to proposal set in-place.
 *
 * Modifies: proposal[i].second (logit) for each candidate
 *
 * Applies: logit'(tok) = logit(tok) + G(tok) * explore_scale + σ(Q(tok))
 *
 * CRITICAL: Operates on proposal set (≤ proposal_k tokens), NOT full vocab.
 * This bounds compute to O(128) regardless of vocabulary size.
 */
void steer_proposal(
    std::vector<std::pair<llama_token, float>>& proposal,
    const PositionStats& stats,
    int parent_visits,
    int position_visits,
    const SearchConfig& config,
    eastwest::rng::Xoroshiro128Plus& rng
) {
    if (proposal.size() <= 1) return;  // Nothing to steer

    // Precompute scaling factors
    float explore_scale = compute_exploration_scale(
        position_visits,
        config.exploration_decay_rate,
        config.exploration_floor);
    float visit_scale = std::min(1.0f,
        static_cast<float>(parent_visits) / config.gumbel_c_visit);

    // Compute logit range from proposal (O(proposal_k))
    float logit_range = std::min(
        compute_logit_range(proposal),
        config.max_sigma_q_logit_range);

    // Compute expectation-weighted baseline (§6.7.1)
    // This is E[Q] under proposal distribution, not arithmetic mean
    float q_baseline = compute_baseline_q(stats, proposal);
    float q_stddev = compute_q_stddev(stats, proposal, q_baseline);

    // If insufficient Q data, skip steering (don't fake neutrality)
    int tokens_with_q = count_tokens_with_q(stats, proposal);
    if (tokens_with_q < config.min_tokens_for_steering) {
        // Pure exploration, no exploitation signal yet
        for (auto& [tok, logit] : proposal) {
            float g = static_cast<float>(sampler::gumbel(rng)) * explore_scale;
            logit += g;
        }
        return;
    }

    // Steer each proposal candidate — O(proposal_k)
    for (auto& [tok, logit] : proposal) {
        // Exploration: Gumbel noise with adaptive decay
        float tok_explore_scale = explore_scale;
        if (stats.token_visits.count(tok)) {
            tok_explore_scale = compute_token_exploration_scale(
                stats.token_visits.at(tok),
                config.exploration_decay_rate,
                config.exploration_floor);
        }
        float g = static_cast<float>(sampler::gumbel(rng)) * tok_explore_scale;

        // Exploitation: σ(Q) with advantage formulation
        float sigma_q = 0.0f;
        if (stats.token_q.count(tok) && q_stddev > 0.0f) {
            // Advantage normalized by stddev (more robust than range)
            float advantage = (stats.token_q.at(tok) - q_baseline) / (q_stddev + 1e-6f);
            float raw_sigma = config.gumbel_c_scale * advantage * logit_range * visit_scale;
            // Clamp to prevent degeneration
            sigma_q = std::clamp(raw_sigma,
                -config.max_logit_perturbation,
                config.max_logit_perturbation);
        }

        // Apply steering
        logit += g + sigma_q;
    }
}

/**
 * Compute expectation-weighted Q baseline.
 *
 * Returns E[Q] under the proposal distribution (prior-weighted),
 * not arithmetic mean of explored tokens (which is exploration-biased).
 */
float compute_baseline_q(
    const PositionStats& stats,
    const std::vector<std::pair<llama_token, float>>& proposal
) {
    float weighted_sum = 0.0f;
    float weight_sum = 0.0f;

    // Find max logit for numerical stability
    float max_logit = -std::numeric_limits<float>::max();
    for (const auto& [tok, logit] : proposal) {
        if (stats.token_q.count(tok)) {
            max_logit = std::max(max_logit, logit);
        }
    }

    for (const auto& [tok, logit] : proposal) {
        if (stats.token_q.count(tok)) {
            float p0 = std::exp(logit - max_logit);  // Unnormalized prior (stabilized)
            weighted_sum += p0 * stats.token_q.at(tok);
            weight_sum += p0;
        }
    }

    return weight_sum > 0 ? weighted_sum / weight_sum : 0.0f;
}

/**
 * Compute standard deviation of Q values (prior-weighted).
 *
 * More robust than range normalization, which is outlier-sensitive.
 */
float compute_q_stddev(
    const PositionStats& stats,
    const std::vector<std::pair<llama_token, float>>& proposal,
    float q_mean
) {
    float weighted_var_sum = 0.0f;
    float weight_sum = 0.0f;

    float max_logit = -std::numeric_limits<float>::max();
    for (const auto& [tok, logit] : proposal) {
        if (stats.token_q.count(tok)) {
            max_logit = std::max(max_logit, logit);
        }
    }

    for (const auto& [tok, logit] : proposal) {
        if (stats.token_q.count(tok)) {
            float p0 = std::exp(logit - max_logit);
            float diff = stats.token_q.at(tok) - q_mean;
            weighted_var_sum += p0 * diff * diff;
            weight_sum += p0;
        }
    }

    return weight_sum > 0 ? std::sqrt(weighted_var_sum / weight_sum) : 0.0f;
}

/**
 * Count tokens in proposal that have Q estimates.
 */
int count_tokens_with_q(
    const PositionStats& stats,
    const std::vector<std::pair<llama_token, float>>& proposal
) {
    int count = 0;
    for (const auto& [tok, _] : proposal) {
        if (stats.token_q.count(tok)) count++;
    }
    return count;
}

/**
 * Sample from steered proposal set.
 *
 * Applies softmax to steered logits and samples using explicit categorical.
 * Endpoint rule: r < cumsum (strict less-than), first match wins.
 */
llama_token sample_from_proposal(
    const std::vector<std::pair<llama_token, float>>& proposal,
    float temperature,
    eastwest::rng::Xoroshiro128Plus& rng
) {
    if (proposal.empty()) {
        throw std::runtime_error("Empty proposal set");
    }
    if (proposal.size() == 1) {
        return proposal[0].first;
    }

    // Apply temperature and compute softmax
    std::vector<float> probs;
    float max_logit = proposal[0].second;
    for (const auto& [tok, logit] : proposal) {
        max_logit = std::max(max_logit, logit);
    }

    for (const auto& [tok, logit] : proposal) {
        float p = std::exp((logit - max_logit) / temperature);
        probs.push_back(p);
    }

    // Sample using explicit categorical (defined in §6.4.2)
    int idx = sampler::categorical(rng, probs.data(), static_cast<int>(probs.size()));
    return proposal[idx].first;
}
```

### 6.7.1 Advantage Formulation (v1.8.3)

The original σ(Q) formula (v1.8) normalizes to [0, 1], meaning it only pushes tokens UP. The v1.8.2 advantage formulation introduced symmetric push/pull via `(Q - Q_mean)`. v1.8.3 refines this with proper baseline and normalization.

**Insight from DExperts (Liu et al. 2021):** Their `z_expert - z_anti_expert` creates bidirectional steering.

**Key fixes in v1.8.3:**

1. **Expectation-weighted baseline** — `Q̄ = E_p0[Q]` under proposal distribution, not arithmetic mean of explored tokens (which is exploration-biased)
2. **Stddev normalization** — More robust than range, which is outlier-sensitive
3. **Conservative cap** — Default 2.5, not 5.0 (can ramp with confidence)
4. **Sparse data handling** — Skip steering if fewer than `min_tokens_for_steering` have Q values

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Q(a) - Q̄                                           │
│   σ(Q(a))  =  c_scale × ─────────────── × min(Δ_logit, τ) × β(N)           │
│                           σ_Q + ε                                           │
│                         └─────┬───────┘                                     │
│                        z-score style                                        │
│                        (unbounded)                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Where:                                                                      │
│ • Q̄ = Σ p0(t)·Q(t) / Σ p0(t) — expectation under proposal prior           │
│ • σ_Q = sqrt(Σ p0(t)·(Q(t)-Q̄)²) — prior-weighted stddev                   │
│ • Tokens with Q > Q̄ → pushed UP                                            │
│ • Tokens with Q < Q̄ → pushed DOWN                                          │
│ • σ(Q) clamped to ±max_perturbation (default 2.5)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ If fewer than min_tokens_for_steering have Q values:                        │
│ • No steering (exploration only)                                            │
│ • Prevents "fake neutrality" from sparse data                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Effect on steering:**

| Token Q         | v1.8 (range) | v1.8.3 (advantage) |
| --------------- | ------------ | ------------------ |
| Q = 0.9 (best)  | +σ (large)   | +σ (large)         |
| Q = 0.5 (mean)  | +σ (medium)  | ~0 (neutral)       |
| Q = 0.1 (worst) | +σ (small)   | -σ (pushed down)   |

The advantage form is more discriminative: it actively suppresses low-Q tokens rather than just boosting high-Q tokens less. Implementation is in `steer_proposal()` (§6.7).

### 6.8 Expansion Loop with Position Tracking

```cpp
/**
 * Expand a node, generating tokens until boundary.
 *
 * v1.8.3: Uses proposal set (§6.14) to bound compute.
 * Complexity: O(|legal|) for proposal construction, O(proposal_k) for steering.
 */
void expand(int parent_idx) {
    auto& parent = nodes_[parent_idx];

    // Fork branch for new child
    BranchHandle child_branch = branch::fork(parent.branch, &store_);

    std::vector<llama_token> tokens;
    std::string prefix;
    int position = 0;

    while (!is_boundary(child_branch, &store_)) {
        // Get legal candidates with logits (throws if empty)
        auto legal = get_legal_candidates(child_branch, &store_);

        llama_token token;

        if (legal.size() == 1) {
            // Deterministic position — no steering needed
            token = legal[0].first;

        } else if (config_.sequential_halving_threshold > 0 &&
                   legal.size() <= static_cast<size_t>(config_.sequential_halving_threshold)) {
            // Small action space — use Sequential Halving
            token = sequential_halving_select(
                parent_idx, child_branch, legal, position, prefix);

        } else if (config_.steer_strategy == SteerStrategy::GUMBEL) {
            // Discriminative position — build proposal set, then steer
            PositionKey pos_key{hash_prefix(prefix), position};
            auto& stats = position_stats_[pos_key];

            // Build legal token set for proposal construction
            std::set<llama_token> legal_set;
            for (const auto& [tok, _] : legal) {
                legal_set.insert(tok);
            }

            // Get raw logits for proposal construction
            auto logits = branch::get_logits(child_branch, &store_);

            // §6.14: Build bounded proposal set — O(|legal| log proposal_k)
            auto proposal = build_proposal_set(logits, legal_set, config_, rng_);

            // §6.7: Steer proposal in-place — O(proposal_k)
            steer_proposal(proposal, stats, parent.visits, stats.total_visits, config_, rng_);

            // Sample from steered proposal
            token = sample_from_proposal(proposal, config_.temperature, rng_);

        } else {
            // No steering — sample from LLM prior
            token = branch::sample(child_branch, &store_);
        }

        // Advance state
        branch::advance(child_branch, token, &store_);
        tokens.push_back(token);
        prefix += token_to_string(token);
        position++;
    }

    // Capture model prior BEFORE steering was applied
    float model_prior = capture_model_prior(parent.branch, tokens[0], &store_);

    // Create child node
    int child_idx = create_child(parent_idx, tokens, child_branch, model_prior);

    // Evaluate with oracle
    float score = evaluate(child_idx);

    // Update position stats for all discriminative positions
    update_position_stats(tokens, score);
}

/**
 * Update position stats after evaluating a child.
 *
 * Records which tokens were chosen at each discriminative position
 * and their resulting Q-value.
 */
void update_position_stats(
    const std::vector<llama_token>& tokens,
    float score
) {
    std::string prefix;

    for (size_t pos = 0; pos < tokens.size(); ++pos) {
        PositionKey key{hash_prefix(prefix), static_cast<int>(pos)};

        // Update stats (creates entry if new)
        position_stats_[key].update(tokens[pos], score);

        prefix += token_to_string(tokens[pos]);
    }
}
```

### 6.9 Sequential Halving for Small Action Spaces

> **EastWest component:** `EastWest::select_by_halving()`

**Algorithm 2: Sequential Halving (Karnin et al. 2013)**

Optimal for minimizing simple regret with fixed budget. Guarantees finding the best action with high probability.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Algorithm 2: Sequential Halving                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Input: candidates A, budget B, oracle O                                     │
│ Output: best action a*                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  1:  S ← A                                          ▷ Surviving candidates  │
│  2:  r ← ⌈log₂|A|⌉                                  ▷ Number of rounds      │
│  3:                                                                         │
│  4:  for round = 1 to r do                                                  │
│  5:  │  n ← ⌊B / (r × |S|)⌋                         ▷ Samples per candidate │
│  6:  │  for each a ∈ S do                                                   │
│  7:  │  │  Q̂(a) ← (1/n) Σᵢ O(complete(a))          ▷ Average of n evals    │
│  8:  │  end for                                                             │
│  9:  │  S ← top ⌈|S|/2⌉ of S by Q̂                  ▷ Keep top half         │
│ 10:  end for                                                                │
│ 11:                                                                         │
│ 12:  return argmax_{a ∈ S} Q̂(a)                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Example execution (6 candidates, budget 30):**

```
Round 1: r=3, |S|=6, n=⌊30/(3×6)⌋=1
  Each candidate gets 1 eval → Keep top 3

Round 2: r=3, |S|=3, n=⌊30/(3×3)⌋=3
  Each candidate gets 3 evals → Keep top 2

Round 3: r=3, |S|=2, n=⌊30/(3×2)⌋=5
  Each candidate gets 5 evals → Return best

Total: 6 + 9 + 10 = 25 oracle calls (within budget 30)
```

**Why Sequential Halving for small spaces:**

| Approach               | Oracle Calls   | Regret Bound          |
| ---------------------- | -------------- | --------------------- |
| Uniform sampling       | O(B/k) per arm | O(√(k/B))             |
| UCB                    | Varies         | O(√(k log B / B))     |
| **Sequential Halving** | O(B log k / k) | **O(√(k/B))** optimal |

For |legal| ≤ 16, Sequential Halving finds the best token with ~30 oracle calls.

```cpp
/**
 * Evaluate a specific token choice by completing generation and calling oracle.
 *
 * Forks the branch, commits the token, completes to boundary, and evaluates.
 *
 * @param parent_idx Parent node index (for context)
 * @param branch Current branch state (will be forked, not modified)
 * @param token Token to evaluate
 * @param position Position within chunk
 * @param prefix Tokens generated so far in this chunk
 * @return Oracle score for this token choice
 */
float evaluate_token_choice(
    int parent_idx,
    BranchHandle branch,
    llama_token token,
    int position,
    const std::string& prefix
) {
    // Fork branch for evaluation
    BranchHandle eval_branch = branch::fork(branch, &store_);

    // Commit the token being evaluated
    branch::advance(eval_branch, token, &store_);

    // Complete to boundary using unsteered sampling
    std::vector<llama_token> completion;
    completion.push_back(token);

    while (!is_boundary(eval_branch, &store_)) {
        llama_token next = branch::sample(eval_branch, &store_);
        branch::advance(eval_branch, next, &store_);
        completion.push_back(next);
    }

    // Get the completed text
    std::string completed_text = prefix + tokens_to_string(completion);

    // Call oracle with timeout handling
    float score = call_oracle_with_timeout(completed_text, config_.oracle_timeout_ms);

    // Clean up forked branch
    branch::release(eval_branch, &store_);

    return score;
}

/**
 * Call oracle with timeout handling.
 *
 * Returns 0.0 on timeout to maintain determinism.
 */
float call_oracle_with_timeout(const std::string& text, int timeout_ms) {
    try {
        auto future = std::async(std::launch::async, [&]() {
            return oracle_(text);
        });

        if (future.wait_for(std::chrono::milliseconds(timeout_ms)) ==
            std::future_status::ready) {
            return future.get();
        } else {
            // Timeout: return minimum score, log for debugging
            log_warning("Oracle timeout after {}ms", timeout_ms);
            return 0.0f;
        }
    } catch (const std::exception& e) {
        log_warning("Oracle error: {}", e.what());
        return 0.0f;
    }
}

/**
 * Sequential Halving for small enumerable action spaces.
 *
 * Optimal for simple regret minimization.
 * Guarantees finding best token with high probability.
 *
 * @param legal Legal tokens at this position (must have size > 1)
 */
llama_token sequential_halving_select(
    int parent_idx,
    BranchHandle branch,
    const std::vector<std::pair<llama_token, float>>& legal,
    int position,
    const std::string& prefix
) {
    if (legal.size() == 1) return legal[0].first;

    struct Candidate {
        llama_token token;
        float total_q = 0.0f;
        int visits = 0;
        float avg_q() const { return visits > 0 ? total_q / visits : 0.0f; }
    };

    std::vector<Candidate> candidates;
    for (const auto& [tok, prior] : legal) {
        candidates.push_back({tok, 0.0f, 0});
    }

    int k = static_cast<int>(candidates.size());
    int phases = static_cast<int>(std::ceil(std::log2(k)));
    int budget_per_phase = config_.sequential_halving_budget / std::max(1, phases);

    for (int phase = 0; phase < phases && candidates.size() > 1; ++phase) {
        int visits_per_candidate = std::max(1,
            budget_per_phase / static_cast<int>(candidates.size()));

        for (auto& c : candidates) {
            for (int v = 0; v < visits_per_candidate; ++v) {
                // Evaluate this token choice
                float q = evaluate_token_choice(
                    parent_idx, branch, c.token, position, prefix);
                c.total_q += q;
                c.visits++;
            }
        }

        // Keep top half
        std::sort(candidates.begin(), candidates.end(),
            [](const Candidate& a, const Candidate& b) {
                return a.avg_q() > b.avg_q();
            });

        candidates.resize(std::max(size_t(1), candidates.size() / 2));
    }

    return candidates[0].token;
}
```

### 6.10 Model Prior Capture

To prevent double-counting oracle signal, capture model prior before steering:

```cpp
/**
 * Capture model prior from UNSTEERED distribution.
 *
 * This is used in PUCT's exploration term.
 * Must be called BEFORE steering is applied.
 *
 * Critical for avoiding double-counting: oracle influences Q (via backprop)
 * but should NOT also influence P(a|s) in PUCT formula.
 */
float capture_model_prior(
    BranchHandle parent_branch,
    llama_token token,
    BranchStore* store
) {
    // Get logsumexp from parent (before fork/steer)
    float logsumexp = branch::get_legal_logsumexp(parent_branch, store);

    // Compute prior from unsteered distribution
    return branch::get_token_prior_assume_legal(
        parent_branch, token, logsumexp, store);
}
```

**Critical: Avoiding Oracle-Infected Priors**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PUCT separation of concerns                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   PUCT(s,a) = Q(s,a) + c_puct × P(s,a) × √N(s) / (1 + N(s,a))             │
│               └──┬──┘           └──┬──┘                                     │
│            from oracle        from model                                    │
│            (exploitation)     (exploration)                                 │
│                                                                             │
│   These MUST come from independent sources:                                 │
│   • Q = oracle feedback (via backprop)                                      │
│   • P = base model belief (p₀, unsteered)                                  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ What goes wrong with oracle-infected priors:                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   If P comes from steered distribution (EastWest-shaped):                    │
│   • Oracle influences Q (direct)                                            │
│   • Oracle influences P (via steering) ← DOUBLE COUNTING                   │
│   • PUCT exploration term becomes value-shaped                              │
│   • Tree over-exploits early, loses exploration benefit                    │
│   • Fast convergence, but not necessarily better convergence               │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ The clean design:                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   EastWest shapes PROPOSALS (how we sample candidates during expansion)      │
│   PUCT uses p₀ as PRIOR (static policy hint for early exploration)         │
│   Oracle provides Q (learned value from rollouts)                           │
│                                                                             │
│   → EastWest: "what to try"                                                  │
│   → PUCT prior: "what model believes"                                       │
│   → Q: "what actually works"                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementation requirement:** Always use `capture_model_prior()` for `child.prior`, never `get_last_sampling_prior()` when EastWest is active.

**Chunk Prior Definition:**

For boundary-based search, each MCTS action is a multi-token chunk. The node prior must still be a single probability for PUCT. We use **first-token prior only**:

```cpp
// Chunk prior = P(first_token | parent_state)
child.prior = capture_model_prior(parent.branch, tokens[0], &store_);
```

| Option                      | Formula         | Rationale                                                                     |
| --------------------------- | --------------- | ----------------------------------------------------------------------------- |
| **First token only** (used) | P(t₀)           | Discriminative tokens are typically at position 0. Simple, cheap.             |
| Geometric mean              | (∏ P(tᵢ))^(1/n) | More "correct" but adds bookkeeping; unclear benefit for structured grammars. |
| Product                     | ∏ P(tᵢ)         | Penalizes long chunks excessively; confounds quality with length.             |

First-token is sufficient because:

1. Discriminative choices (§2, §3) occur at or near chunk start
2. PUCT's `1/(1+N(s,a))` term already handles exploration regardless of prior magnitude
3. Length normalization in action selection (if used) handles chunk-length bias separately

**Implementation Warning — Preventing Oracle-Infected Priors:**

The distinction between `p₀` (unsteered) and `p_steered` (EastWest-shaped) is critical but easy to conflate in code. Defensive practices:

```cpp
// DANGER: Ambiguous naming invites bugs
float prior = branch::get_sampling_prior(...);  // Which distribution?

// SAFER: Explicit naming
float p0_prior = branch::get_unsteered_prior(...);           // For PUCT
float behavior_prior = branch::get_steered_prior(...);       // For tracing only

// SAFEST: Capture p₀ BEFORE steering is even possible
float p0_prior = capture_model_prior(parent.branch, token, &store_);
// ... later ...
steer_proposal(proposal, ...);  // p₀ already captured, can't be corrupted
```

If your implementation has a single `get_prior()` function that could return either distribution depending on when it's called, **rename it** or **split it** before the bug finds you.

### 6.11 Strategy Comparison

| Strategy             | Exploration                       | Exploitation                   | Best For                          |
| -------------------- | --------------------------------- | ------------------------------ | --------------------------------- |
| NONE                 | LLM prior only                    | —                              | Baseline                          |
| GUMBEL               | Gumbel noise × decay (with floor) | σ(Q) normalized to logit scale | General use                       |
| (Sequential Halving) | Enumerate all                     | Average Q                      | Small action spaces (≤ threshold) |

**Note:** Sequential Halving is not a separate strategy enum value. It activates automatically when `legal.size() <= sequential_halving_threshold`, regardless of `steer_strategy` setting.

### 6.12 Migration Path

```cpp
// Old: First-token deduplication (v1.0-v1.3)
config.dedup_mode = DeduplicationMode::FIRST_TOKEN;
// Problem: Only works when action == first token

// Old: UCB-style fixed bonuses (v1.3-v1.4)
config.steer_mode = SteerMode::ORACLE_GUIDED;
config.explore_bonus = 3.0f;
config.exploit_weight = 5.0f;
// Problems: No position awareness, no decay, spray-and-pray, σ(Q) too weak

// v1.7: Position-aware but σ(Q) not normalized
config.steer_strategy = SteerStrategy::GUMBEL;
config.gumbel_c_scale = 1.0f;  // Didn't work — σ(Q) ~1.0 vs logit gap ~3.7
// Problem: σ(Q) couldn't overcome prior bias

// v1.8: Full fix with normalized σ(Q) and safety clamp
config.steer_strategy = SteerStrategy::GUMBEL;
config.gumbel_c_visit = 50.0f;
config.gumbel_c_scale = 1.0f;  // Now works because σ(Q) normalized to logit scale
config.exploration_decay_rate = 0.5f;
config.exploration_floor = 0.1f;
config.max_sigma_q_logit_range = 15.0f;  // Safety clamp
config.sequential_halving_threshold = 16;
config.sequential_halving_budget = 30;  // Reduced for latency
config.oracle_timeout_ms = 50;
config.require_discriminative = true;

// v1.8.3: Additional parameters
config.max_logit_perturbation = 2.5f;   // Conservative default (was 5.0)
config.min_tokens_for_steering = 2;      // Skip steering with sparse Q
config.mandatory_tokens = {eos_token};   // Always include termination
config.rng_base_seed = 42;               // Reproducible exploration
```

### 6.12.1 Determinism and RNG

**Problem:** Non-reproducible exploration noise makes debugging difficult and poisons evaluation claims.

**Solution:** Derive RNG seed deterministically from position context.

```cpp
/**
 * Get deterministic RNG for a specific position.
 *
 * Seed derivation ensures:
 *   - Same seed for same (prefix, position, iteration)
 *   - Different seeds for different contexts
 *   - Reproducible across runs AND across platforms when rng_base_seed != 0
 *
 * Returns Xoroshiro128Plus (§6.4.2) instead of std::mt19937 for cross-platform determinism.
 */
eastwest::rng::Xoroshiro128Plus get_position_rng(
    const PositionKey& key,
    int iteration,
    const SearchConfig& config
) {
    if (config.rng_base_seed == 0) {
        // Non-deterministic mode: use system entropy
        std::random_device rd;
        return eastwest::rng::Xoroshiro128Plus(rd());
    }

    // Deterministic seed derivation
    uint64_t seed = config.rng_base_seed;
    seed = hash_combine(seed, key.prefix_hash);
    seed = hash_combine(seed, static_cast<uint64_t>(key.position));
    seed = hash_combine(seed, static_cast<uint64_t>(iteration));

    return eastwest::rng::Xoroshiro128Plus(static_cast<uint32_t>(seed));
}

/**
 * Hash combine (same as boost::hash_combine)
 */
uint64_t hash_combine(uint64_t seed, uint64_t value) {
    return seed ^ (value + 0x9e3779b9 + (seed << 6) + (seed >> 2));
}
```

**Usage in expansion:**

```cpp
void expand(int parent_idx) {
    // ...
    int position = 0;

    while (!is_boundary(child_branch, &store_)) {
        // Get deterministic RNG for this position
        PositionKey pos_key{hash_prefix(prefix), position};
        auto rng = get_position_rng(pos_key, iteration_count_, config_);

        // Build and steer proposal with deterministic RNG
        auto proposal = build_proposal_set(logits, legal_set, config_, rng);
        steer_proposal(proposal, stats, parent.visits, stats.total_visits, config_, rng);
        // ...
    }
}
```

**Determinism guarantees:**

| Scenario                  | `rng_base_seed = 0` | `rng_base_seed = 42` |
| ------------------------- | ------------------- | -------------------- |
| Same input, same run      | Different           | **Identical**        |
| Same input, different run | Different           | **Identical**        |
| Different input           | Different           | Different            |
| Testing / CI              | Unpredictable       | **Reproducible**     |

### 6.13 EastWest API

EastWest is the position-aware steering algorithm implemented in §6.4-§6.14. This section consolidates the interface.

| Component              | Spec Section | API                                                                      |
| ---------------------- | ------------ | ------------------------------------------------------------------------ |
| Position tracking      | §6.4         | `eastwest::PositionKey`, `eastwest::PositionStats`, `eastwest::StatsMap` |
| Candidate construction | §6.14        | `EastWest::build_proposal_set()`                                         |
| Steering               | §6.7         | `EastWest::steer_proposal()` — modifies proposal in-place                |
| Sampling               | §6.7         | `EastWest::sample_from_proposal()`                                       |
| Sequential Halving     | §6.9         | `EastWest::select_by_halving()`                                          |
| Feedback               | §6.4         | `EastWest::update()`                                                     |

**Stateless design:** EastWest operates on caller-provided `StatsMap`. MCTS owns the stats (§6.4); EastWest provides the steering math.

**Complexity guarantee:** Steering is O(proposal_k), not O(vocab). See §6.14.

```cpp
// MCTS integration (v1.8.3)
class PUCT {
    eastwest::EastWest eastwest_;
    eastwest::StatsMap position_stats_;  // Owned by MCTS

    void expand(...) {
        // §6.14: Build bounded proposal set
        auto proposal = eastwest_.build_proposal_set(logits, legal_set);

        // §6.7: Steer proposal in-place
        eastwest_.steer_proposal(proposal, position_stats_[key],
            parent.visits, position_stats_[key].total_visits);

        // Sample from steered proposal
        auto token = eastwest_.sample_from_proposal(proposal, temperature);
    }

    void after_simulate(int node_idx, float q) {
        eastwest::EastWest::update(position_stats_, key, token, q);
    }
};
```

See Appendix C for the complete `eastwest.hpp` interface.

### 6.14 Candidate Set Construction

**The scaling problem:** In open-vocabulary generation, `|vocab|` can be 32K-128K tokens. Steering over the full vocabulary is computationally infeasible on-device, even with grammar constraints that may leave thousands of tokens legal.

**Prior art:**

- **FUDGE (Yang & Klein 2021):** Filters to top-K before applying discriminator — establishes "filter-then-steer" pattern
- **DExperts (Liu et al. 2021):** Explicitly discusses truncation effects and mentions reintroducing tail tokens to avoid bad truncation artifacts — this informs our exploration tail design

**Two-stage filtering:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Stage 1: Build Proposal Set (from unsteered distribution)                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   vocab (32K) ──► grammar mask ──► legal (variable) ──► proposal set A     │
│                                                                             │
│   Proposal set A = {                                                        │
│       mandatory tokens (EOS, etc.),    // Always included if legal          │
│       top-(K-T-M) by unsteered prior,  // Exploit model knowledge           │
│       T random from remaining legal    // Exploration tail (DExperts-style) │
│   }                                                                         │
│                                                                             │
│   |A| ≤ K (default K=128)                                                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Stage 2: Apply EastWest Steering (within A only)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   for each token ∈ A:                                                       │
│       logit'(tok) = logit(tok) + G(tok)·α(n) + σ(Q(tok))                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Stage 3: Sample (from steered proposal set)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Apply top-p / temperature to steered A                                    │
│   Sample final token                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Mandatory tokens (critical for termination):**

If EOS/EOG tokens are excluded from the proposal set, the system cannot terminate even when the oracle wants it. This creates infinite loops.

```cpp
// Mandatory tokens are ALWAYS included if legal, regardless of rank
config.mandatory_tokens = {llama_token_eos(model)};
// Grammar can inject additional mandatory tokens (e.g., newline, semicolon)
```

**When grammar constrains heavily:**

If `|legal| ≤ proposal_k`, skip Stage 1 — use all legal tokens directly. This is the common case for structured generation (JSON schemas, code blocks, move grammars).

**Implementation:**

```cpp
/**
 * Build proposal set from unsteered logits.
 *
 * Returns at most proposal_k candidates:
 *   - mandatory tokens (always included if legal)
 *   - top-(K-T-M) by probability from legal tokens
 *   - T random from remaining legal (exploration tail)
 *
 * If |legal| <= proposal_k, returns all legal tokens.
 */
std::vector<std::pair<llama_token, float>> build_proposal_set(
    const llama_token_data_array& logits,
    const std::set<llama_token>& legal_tokens,
    const SearchConfig& config,
    eastwest::rng::Xoroshiro128Plus& rng
) {
    // Fast path: grammar constrains heavily
    if (legal_tokens.size() <= static_cast<size_t>(config.proposal_k)) {
        std::vector<std::pair<llama_token, float>> result;
        for (size_t i = 0; i < logits.size; ++i) {
            if (legal_tokens.count(logits.data[i].id)) {
                result.emplace_back(logits.data[i].id, logits.data[i].logit);
            }
        }
        return result;
    }

    // Track which tokens are already in proposal
    std::set<llama_token> in_proposal;
    std::vector<std::pair<llama_token, float>> result;

    // Step 1: Add mandatory tokens first (if legal)
    for (llama_token mandatory : config.mandatory_tokens) {
        if (legal_tokens.count(mandatory)) {
            float logit = get_logit_for_token(logits, mandatory);
            result.emplace_back(mandatory, logit);
            in_proposal.insert(mandatory);
        }
    }

    // Collect all legal tokens with logits (excluding mandatory)
    std::vector<std::pair<llama_token, float>> legal_with_logits;
    for (size_t i = 0; i < logits.size; ++i) {
        llama_token tok = logits.data[i].id;
        if (legal_tokens.count(tok) && !in_proposal.count(tok)) {
            legal_with_logits.emplace_back(tok, logits.data[i].logit);
        }
    }

    // Step 2: Take top-(K-T-M) where M = mandatory tokens added
    int remaining_slots = config.proposal_k - result.size() - config.exploration_tail;
    int top_k = std::max(0, remaining_slots);

    // Partition to find top-K by logit — O(N), not O(N log N)
    // Elements [0, top_k) will be the K highest logits (unordered among themselves)
    // Elements [top_k, end) are the "tail" — all lower than the top K
    if (top_k > 0 && static_cast<size_t>(top_k) < legal_with_logits.size()) {
        std::nth_element(legal_with_logits.begin(),
                         legal_with_logits.begin() + top_k,
                         legal_with_logits.end(),
            [](const auto& a, const auto& b) { return a.second > b.second; });
    }

    for (int i = 0; i < top_k && i < (int)legal_with_logits.size(); ++i) {
        result.push_back(legal_with_logits[i]);
        in_proposal.insert(legal_with_logits[i].first);
    }

    // Step 3: Sample T distinct tokens from tail via Gumbel-Top-k (§6.4.2)
    // This replaces rejection sampling with the mathematically equivalent
    // but deterministic Gumbel-Top-k trick (Kool et al. 2019)
    if (legal_with_logits.size() > static_cast<size_t>(top_k)) {
        std::vector<std::pair<llama_token, float>> tail(
            legal_with_logits.begin() + top_k,
            legal_with_logits.end());

        // Build logits for Gumbel-Top-k (with temperature)
        std::vector<float> tail_logits;
        for (const auto& [tok, logit] : tail) {
            tail_logits.push_back(logit / config.tail_temperature);
        }

        // Sample exploration_tail distinct indices
        int k = std::min(config.exploration_tail, static_cast<int>(tail.size()));
        std::vector<int> sampled_indices(k);
        sampler::gumbel_top_k(rng, tail_logits.data(), static_cast<int>(tail.size()), k, sampled_indices.data());

        for (int idx : sampled_indices) {
            result.push_back(tail[idx]);
        }
    }

    return result;
}
```

**Config parameters:**

| Parameter          | Default | Rationale                                             |
| ------------------ | ------- | ----------------------------------------------------- |
| `proposal_k`       | 128     | Balances coverage vs compute                          |
| `exploration_tail` | 8       | ~6% exploration; DExperts-style tail reintroduction   |
| `tail_temperature` | 2.0     | Softens sampling from tail (higher T = more uniform)  |
| `mandatory_tokens` | {EOS}   | Prevents infinite loops when oracle wants termination |

**Complexity guarantee:**

EastWest touches at most `proposal_k` tokens per discriminative position, regardless of vocabulary size.

| Vocab Size | Legal After Grammar | Proposal Set | Tokens Touched |
| ---------- | ------------------- | ------------ | -------------- |
| 32,000     | 32,000 (no grammar) | 128          | 128            |
| 32,000     | 500 (JSON keys)     | 128          | 128            |
| 32,000     | 50 (enum values)    | 50           | 50             |
| 32,000     | 9 (digits)          | 9            | 9              |

**Memory:** `proposal_k × sizeof(pair<int,float>)` = 128 × 8 = 1KB per position.

---

## 7. Value Proposition

### 7.1 Why Position-Aware Tracking

| Approach         | MOVE Grammar          | TypeScript                  | Accuracy    |
| ---------------- | --------------------- | --------------------------- | ----------- |
| First-token Q    | Tracks "M"            | Tracks first keyword        | **Wrong**   |
| Position-aware Q | Tracks digit at pos 3 | Tracks discriminative token | **Correct** |

### 7.2 Why Adaptive Decay with Floor

Formula: `scale = max(floor, 1 / √(1 + visits))`

| Visits | Decay-to-Zero | Decay with Floor (0.1) |
| ------ | ------------- | ---------------------- |
| 0      | 1.0           | 1.0                    |
| 1      | 0.71          | 0.71                   |
| 3      | 0.50          | 0.50                   |
| 8      | 0.33          | 0.33                   |
| 15     | 0.25          | 0.25                   |
| 99     | 0.10          | **0.10** (at floor)    |
| 999    | 0.03          | **0.10** (floor)       |
| 9999   | 0.01          | **0.10** (floor)       |

Floor prevents complete collapse while still allowing strong exploitation.

### 7.3 Why Restrict to Legal Candidates

| Approach   | Tokens Modified          | Effect              |
| ---------- | ------------------------ | ------------------- |
| All tokens | ~50,000                  | Chaos, fights top-k |
| Legal only | ~9 (tic-tac-toe grammar) | Targeted            |
| Legal only | ~3 (let/const/var)       | Targeted, effective |

### 7.4 Why Steer Before Truncation

| Token | Prior | Top-40 Survives? | After Steer       | Effect                         |
| ----- | ----- | ---------------- | ----------------- | ------------------------------ |
| "2"   | 0.40  | Yes              | +0.5 (Q=0.76)     | Selected more                  |
| "8"   | 0.001 | **No**           | —                 | Never seen if truncated first  |
| "8"   | 0.001 | —                | +3.0 (unexplored) | **Resurrected** if steer first |

### 7.5 Why σ(Q) Must Be Normalized to Logit Scale

**The problem (v1.7 and earlier):**

```
Logit gap: 3.8 - 0.1 = 3.7 (between tokens "2" and "8")
Raw σ(Q): 1.0 - 0.76 = 0.24 differential

σ(Q) cannot overcome prior!
```

**The fix (v1.8):**

```
Logit range: 3.7
Normalized Q for "8": (1.0 - 0.45) / 0.54 = 1.0
Normalized Q for "2": (0.76 - 0.45) / 0.54 = 0.57

σ(Q) for "8" = 1.0 × 1.0 × 3.7 × 1.0 = 3.7 (at convergence)
σ(Q) for "2" = 1.0 × 0.57 × 3.7 × 1.0 = 2.1

Differential: 1.6 logits — now competitive with Gumbel noise!
```

### 7.6 Why Clamp Logit Range

When the model is extremely confident (logit gap of 40+), unclamped σ(Q) could produce massive boosts:

| Logit Range | Max σ(Q) at visit_scale=1.0 |
| ----------- | --------------------------- |
| 5           | 5                           |
| 15          | 15 (clamped)                |
| 40          | **15** (clamped, not 40)    |

Without clamping, an oracle bug or timeout could boost garbage tokens by 40 logits — overriding strong model confidence.

With clamping at 15.0:

- Still allows strong oracle override (15 logits is huge)
- Respects model confidence above e^15 ≈ 3.3 million ratio
- Prevents pathological edge cases from bad oracle feedback

### 7.7 Why Deterministic Oracles Excel

| Property              | Learned Reward Model | Deterministic Oracle |
| --------------------- | -------------------- | -------------------- |
| Training required     | Yes                  | No                   |
| Distribution mismatch | Possible             | Impossible           |
| Signal stability      | Varies               | Consistent           |
| Overfitting risk      | Yes                  | No                   |
| Feedback latency      | Inference time       | Direct call          |

### 7.8 Compute Comparison

| Approach           | Oracle Calls | Learning | Position-Aware | σ(Q) Works |
| ------------------ | ------------ | -------- | -------------- | ---------- |
| Pure sampling      | N iterations | None     | No             | N/A        |
| First-token steer  | N iterations | None     | No             | N/A        |
| v1.7 Gumbel        | N iterations | None     | Yes            | **No**     |
| v1.8 Gumbel        | N iterations | None     | Yes            | **Yes**    |
| Sequential Halving | O(k log k)   | None     | Yes            | Yes        |

Same compute, correct behavior.

---

## 8. Test Plan

### 8.1 Position Detection Tests

```cpp
TEST_CASE("is_discriminative correctly identifies decision points") {
    // MOVE grammar: "MOVE: " [0-8] "\n"
    auto branch = create_branch_with_grammar(move_grammar);

    // Position 0: "MOVE" - deterministic
    CHECK(is_discriminative(branch, &store) == false);
    advance(branch, token_MOVE);

    // Position 1: ":" - deterministic
    CHECK(is_discriminative(branch, &store) == false);
    advance(branch, token_colon);

    // Position 2: " " - deterministic
    CHECK(is_discriminative(branch, &store) == false);
    advance(branch, token_space);

    // Position 3: [0-8] - DISCRIMINATIVE
    // Grammar allows 9 tokens (0-8), board legality is separate
    CHECK(is_discriminative(branch, &store) == true);
    CHECK(get_legal_candidates(branch, &store).size() == 9);
}

TEST_CASE("get_legal_candidates throws on empty legal set") {
    auto branch = create_branch_at_invalid_state();
    CHECK_THROWS_AS(
        get_legal_candidates(branch, &store),
        std::runtime_error
    );
}
```

### 8.2 Position-Aware Q Tests

```cpp
TEST_CASE("Position stats track Q per token") {
    // Two chunks: "MOVE: 2\n" (Q=0.76) and "MOVE: 8\n" (Q=1.0)

    PositionKey key{hash("MOVE: "), 3};  // Position 3 = digit

    position_stats_[key].update(token_2, 0.76f);
    position_stats_[key].update(token_8, 1.0f);
    position_stats_[key].update(token_3, 0.45f);  // Add third

    // Best Q per token (max, not mean)
    CHECK(position_stats_[key].token_q[token_2] == 0.76f);
    CHECK(position_stats_[key].token_q[token_8] == 1.0f);
    CHECK(position_stats_[key].token_q[token_3] == 0.45f);

    // Visit tracking
    CHECK(position_stats_[key].total_visits == 3);
    CHECK(position_stats_[key].visits_for(token_2) == 1);

    // Bounds (for monitoring)
    CHECK(position_stats_[key].q_min == 0.45f);
    CHECK(position_stats_[key].q_max == 1.0f);
}

TEST_CASE("Expectation-weighted baseline computed from proposal") {
    PositionStats stats;
    stats.update(token_2, 0.76f);
    stats.update(token_8, 1.0f);
    stats.update(token_3, 0.45f);

    // Proposal with logits (token_2 has highest prior)
    std::vector<std::pair<llama_token, float>> proposal = {
        {token_2, 3.8f},   // High prior → dominates baseline
        {token_8, 0.1f},   // Low prior
        {token_3, 1.5f}    // Medium prior
    };

    // Baseline should be closer to token_2's Q (0.76) than arithmetic mean (0.74)
    float baseline = compute_baseline_q(stats, proposal);
    CHECK(baseline > 0.74f);  // Weighted toward high-prior token_2
    CHECK(baseline < 0.80f);  // But not exactly token_2's Q

    // Stddev should reflect spread
    float stddev = compute_q_stddev(stats, proposal, baseline);
    CHECK(stddev > 0.0f);
    CHECK(stddev < 0.3f);  // Reasonable spread for Q in [0.45, 1.0]
}
```

### 8.3 Exploration Decay with Floor Tests

```cpp
TEST_CASE("Exploration decays but respects floor") {
    float decay_rate = 0.5f;
    float floor = 0.1f;

    // Formula: max(floor, 1 / sqrt(1 + visits))
    CHECK(compute_exploration_scale(0, decay_rate, floor) == Approx(1.0f));
    CHECK(compute_exploration_scale(1, decay_rate, floor) == Approx(0.707f));
    CHECK(compute_exploration_scale(3, decay_rate, floor) == Approx(0.5f));
    CHECK(compute_exploration_scale(8, decay_rate, floor) == Approx(0.333f));
    CHECK(compute_exploration_scale(15, decay_rate, floor) == Approx(0.25f));
    CHECK(compute_exploration_scale(99, decay_rate, floor) == Approx(0.1f));  // At floor
    CHECK(compute_exploration_scale(999, decay_rate, floor) == Approx(0.1f)); // Still floor
}
```

### 8.4 Steer Ordering Tests

```cpp
TEST_CASE("Low-prior token survives with steer-before-truncation") {
    // Token "8" has P=0.001, normally cut by top-40

    // WRONG order: truncate first
    auto cur_p_wrong = get_logits();
    apply_top_k(cur_p_wrong, 40);
    CHECK(contains_token(cur_p_wrong, token_8) == false);  // Gone!

    // CORRECT order: steer first
    auto cur_p_correct = get_logits();
    apply_steer(cur_p_correct);  // Boost unexplored
    apply_top_k(cur_p_correct, 40);
    CHECK(contains_token(cur_p_correct, token_8) == true);  // Survived!
}
```

### 8.5 Legal-Only Steering Tests

```cpp
TEST_CASE("Steer only modifies legal candidates") {
    auto legal = get_legal_candidates(branch, &store);
    std::set<llama_token> legal_set;
    for (const auto& [tok, _] : legal) {
        legal_set.insert(tok);
    }

    auto cur_p_before = get_logits_copy();
    apply_gumbel_steer(cur_p, legal_set, stats, config);

    for (size_t i = 0; i < cur_p.size; ++i) {
        if (legal_set.find(cur_p.data[i].id) == legal_set.end()) {
            // Non-legal tokens unchanged
            CHECK(cur_p.data[i].logit == cur_p_before.data[i].logit);
        }
    }
}
```

### 8.6 Model Prior Capture Tests

```cpp
TEST_CASE("Model prior captured from unsteered distribution") {
    config.steer_strategy = SteerStrategy::GUMBEL;

    puct.search(20);

    // Each child's prior should be a valid probability
    for (int child_idx : root.children) {
        float prior = nodes[child_idx].prior;
        CHECK(prior > 0.0f);
        CHECK(prior <= 1.0f);
    }

    // Priors should come from model, not steered distribution
    // Verify by checking they match direct model query
    auto model_priors = get_model_priors_at_root();
    for (int child_idx : root.children) {
        llama_token first_tok = nodes[child_idx].tokens[0];
        CHECK(nodes[child_idx].prior == Approx(model_priors[first_tok]).margin(0.01f));
    }
}
```

### 8.7 σ(Q) Normalization Tests

```cpp
TEST_CASE("σ(Q) is normalized to logit scale and clamped") {
    // Setup: position with known Q values and logits
    PositionStats stats;
    stats.update(token_8, 1.0f);
    stats.update(token_2, 0.76f);
    stats.update(token_3, 0.45f);

    // Create proposal with known logits
    std::vector<std::pair<llama_token, float>> proposal = {
        {token_2, 3.8f},   // High prior
        {token_8, 0.1f},   // Low prior, high Q
        {token_3, 1.5f}    // Medium
    };
    // logit_range = 3.8 - 0.1 = 3.7
    // Q values: 1.0, 0.76, 0.45
    // Expectation-weighted baseline ≈ 0.76 (token_2 has highest prior)
    // Stddev ≈ 0.22

    SearchConfig config;
    config.gumbel_c_scale = 1.0f;
    config.max_sigma_q_logit_range = 15.0f;
    config.max_logit_perturbation = 2.5f;   // v1.8.3 default
    config.min_tokens_for_steering = 2;      // v1.8.3 default

    eastwest::rng::Xoroshiro128Plus rng(42);
    steer_proposal(proposal, stats,
        /*parent_visits=*/50, /*position_visits=*/10,
        config, rng);

    // After steering, token_8 should have gained significant logit boost
    // With advantage formulation: token_8 has Q above baseline, gets positive σ(Q)

    float logit_8_after = proposal[1].second;  // token_8
    float logit_2_after = proposal[0].second;  // token_2

    // Token 8 should now be competitive with token 2
    CHECK(logit_2_after - logit_8_after < 2.5f);  // Gap reduced from 3.7
}

TEST_CASE("Logit range clamp prevents extreme boosts") {
    // Extreme confidence scenario
    std::vector<std::pair<llama_token, float>> proposal = {
        {token_good, 20.0f},   // Extreme high
        {token_bad, -20.0f}    // Extreme low
    };
    // logit_range = 40, but should clamp to 15

    PositionStats stats;
    stats.update(token_bad, 1.0f);  // Oracle incorrectly prefers bad token
    stats.update(token_good, 0.5f);

    SearchConfig config;
    config.max_sigma_q_logit_range = 15.0f;
    config.max_logit_perturbation = 2.5f;   // v1.8.3 default
    config.min_tokens_for_steering = 2;

    eastwest::rng::Xoroshiro128Plus rng(42);
    steer_proposal(proposal, stats,
        /*parent_visits=*/50, /*position_visits=*/10,
        config, rng);

    // σ(Q) should be clamped by max_logit_perturbation
    float logit_bad_after = proposal[1].second;
    CHECK(logit_bad_after < -20.0f + 2.5f + 2.0f);  // At most +2.5 perturbation + Gumbel
}

TEST_CASE("Sparse Q data triggers exploration-only mode") {
    // Only 1 token has Q estimate (below min_tokens_for_steering)
    PositionStats stats;
    stats.update(token_8, 1.0f);  // Only one Q value

    std::vector<std::pair<llama_token, float>> proposal = {
        {token_2, 3.8f},
        {token_8, 0.1f},
        {token_3, 1.5f}
    };

    SearchConfig config;
    config.min_tokens_for_steering = 2;  // Need at least 2 tokens with Q

    eastwest::rng::Xoroshiro128Plus rng(42);
    auto proposal_copy = proposal;
    steer_proposal(proposal, stats, 50, 10, config, rng);

    // Only Gumbel noise should be applied, no σ(Q) exploitation
    // Token_8 should NOT get a boost from its Q value
    // (We can't easily check this without knowing exact Gumbel draws,
    //  but we can verify no systematic advantage is applied)
}
```

### 8.8 Full Integration Test

```cpp
TEST_CASE("MOVE grammar explores all legal positions with position-aware steer") {
    config.steer_strategy = SteerStrategy::GUMBEL;
    config.exploration_decay_rate = 0.5f;
    config.exploration_floor = 0.1f;
    config.max_sigma_q_logit_range = 15.0f;
    config.require_discriminative = true;

    puct.search(100);

    // All 7 board-legal moves should be explored
    // (Grammar allows 9, but oracle returns 0 for occupied squares)
    CHECK(explored_moves.size() >= 7);

    // Optimal move (8) should be found
    CHECK(best_move == 8);
    CHECK(best_score == 1000.0f);

    // Verify position stats are keyed correctly
    PositionKey digit_pos{hash("MOVE: "), 3};
    CHECK(position_stats_[digit_pos].token_q.size() >= 7);
}
```

### 8.9 Pass@T Metric (from VerMCTS)

Pass@T computes the probability of success given a budget of T tokens, providing fair comparison across methods with different costs per sample.

From Brandfonbrener et al. (2024):

> "Pass@T has several benefits:
>
> 1. Pass@T **fairly compares methods**. One run of MCTS can be much more expensive than sampling one program from a model, so using pass@k is not fair. In contrast pass@T really estimates the dominant cost of generation, namely how many tokens need to be generated to yield success.
> 2. Pass@T **controls for hardware and implementation variability**. Compared to using wall-clock time, using pass@T does not depend on the underlying hardware and system-level optimizations."

**Why this matters for our work:**

- Pure sampling generates ~100 tokens per attempt
- MCTS with Sequential Halving might use 30 oracle calls × 50 tokens = 1500 tokens for one decision
- Pass@k would unfairly penalize MCTS; Pass@T normalizes by actual compute

**Estimation procedure:**

1. Run n trials per problem, each up to T_max tokens
2. Record (succeeded, tokens_used) for each trial
3. For each budget T ≤ T_max, count trials that succeeded within T tokens
4. Report mean pass rate with 95% Wilson confidence intervals

```cpp
/**
 * Compute Pass@T: success rate within token budget T.
 *
 * From VerMCTS (Brandfonbrener et al. 2024).
 *
 * Benefits:
 * - Fair comparison across methods (MCTS vs pure sampling)
 * - Controls for hardware variability (unlike wall-clock time)
 * - Estimates true computational cost
 */
struct PassAtTResult {
    int token_budget;
    int num_trials;
    int num_successes;
    float pass_rate;
    float wilson_lower_95;  // Wilson score interval
    float wilson_upper_95;
};

PassAtTResult compute_pass_at_T(
    const std::vector<TrialResult>& trials,
    int token_budget
) {
    int successes = 0;
    for (const auto& trial : trials) {
        if (trial.succeeded && trial.tokens_used <= token_budget) {
            successes++;
        }
    }

    float p = static_cast<float>(successes) / trials.size();

    // Wilson score interval for 95% confidence
    float z = 1.96f;
    float n = static_cast<float>(trials.size());
    float denom = 1.0f + z*z/n;
    float center = p + z*z/(2*n);
    float spread = z * std::sqrt(p*(1-p)/n + z*z/(4*n*n));

    return {
        token_budget,
        static_cast<int>(trials.size()),
        successes,
        p,
        (center - spread) / denom,
        (center + spread) / denom
    };
}

TEST_CASE("Pass@T shows improvement over baseline") {
    // Run 50 trials each
    auto baseline_trials = run_trials(baseline_config, 50);
    auto steered_trials = run_trials(steered_config, 50);

    // Compare at various token budgets
    for (int T : {1000, 2000, 5000, 10000}) {
        auto baseline_pass = compute_pass_at_T(baseline_trials, T);
        auto steered_pass = compute_pass_at_T(steered_trials, T);

        // Steered should have higher pass rate
        CHECK(steered_pass.pass_rate >= baseline_pass.pass_rate);

        // Log for analysis
        log_info("Pass@{}: baseline={:.1f}% steered={:.1f}%",
            T, baseline_pass.pass_rate * 100, steered_pass.pass_rate * 100);
    }
}
```

### 8.10 Planning Ablation Metrics

These metrics evaluate steering as a planning improvement, not just a decoder modification.

```cpp
struct PlanningMetrics {
    int unique_children;
    std::vector<float> best_q_per_iteration;
    float best_q;
    std::vector<int> child_visits;
    int total_tokens;
};

PlanningMetrics run_search(SearchConfig config, int iterations) {
    PUCT puct(config);
    PlanningMetrics m;
    m.best_q = 0.0f;
    m.total_tokens = 0;

    for (int i = 0; i < iterations; ++i) {
        int tokens_before = puct.total_tokens();
        puct.step();
        m.total_tokens = puct.total_tokens();
        m.best_q_per_iteration.push_back(puct.best_score());
        m.best_q = std::max(m.best_q, puct.best_score());
    }

    m.unique_children = puct.root_children_count();
    m.child_visits = puct.get_child_visit_counts();
    return m;
}

float compute_visit_entropy(const PlanningMetrics& m) {
    float total = std::accumulate(m.child_visits.begin(), m.child_visits.end(), 0.0f);
    float entropy = 0.0f;
    for (int v : m.child_visits) {
        if (v > 0) {
            float p = v / total;
            entropy -= p * std::log2(p);
        }
    }
    return entropy;
}

int iterations_to_q(const std::vector<float>& curve, float target) {
    for (size_t i = 0; i < curve.size(); ++i) {
        if (curve[i] >= target) return i;
    }
    return curve.size();
}

TEST_CASE("Planning metrics show improvement") {
    SearchConfig baseline_config;
    baseline_config.steer_strategy = SteerStrategy::NONE;

    SearchConfig steered_config;
    steered_config.steer_strategy = SteerStrategy::GUMBEL;

    auto baseline = run_search(baseline_config, 100);
    auto steered = run_search(steered_config, 100);

    // Metric 1: Unique children @ N iterations
    CHECK(steered.unique_children > baseline.unique_children);

    // Metric 2: Iterations to reach Q=0.9
    CHECK(iterations_to_q(steered.best_q_per_iteration, 0.9f) <
          iterations_to_q(baseline.best_q_per_iteration, 0.9f));

    // Metric 3: Visit entropy (collapse detection)
    CHECK(compute_visit_entropy(steered) > compute_visit_entropy(baseline) * 0.8f);

    // Metric 4: Simple regret
    CHECK((1.0f - steered.best_q) < (1.0f - baseline.best_q));
}
```

### 8.11 Benchmark: Strategy Comparison

| Strategy               | Position-Aware | Decay | Floor | σ(Q) Normalized | Clamp | Finds Optimal |
| ---------------------- | -------------- | ----- | ----- | --------------- | ----- | ------------- |
| v1.4 (first-token)     | ❌             | ❌    | ❌    | ❌              | ❌    | ❌            |
| v1.6 (position-aware)  | ✓              | ✓     | ❌    | ❌              | ❌    | Maybe         |
| v1.7 (with floor)      | ✓              | ✓     | ✓     | ❌              | ❌    | Maybe         |
| v1.8 (normalized σ(Q)) | ✓              | ✓     | ✓     | ✓               | ✓     | ✓             |

---

## 9. Future Extensions

### 9.1 Gumbel-Top-k Sampling

For non-root positions, sample k candidates without replacement:

```cpp
/**
 * Sample k actions from policy + Gumbel noise.
 *
 * Inspired by Gumbel MuZero: enables parallel evaluation of candidates.
 */
std::vector<llama_token> gumbel_top_k(
    const std::vector<std::pair<llama_token, float>>& logits,
    int k,
    eastwest::rng::Xoroshiro128Plus& rng
) {
    std::vector<std::pair<float, llama_token>> scored;
    for (const auto& [tok, logit] : logits) {
        float g = static_cast<float>(sampler::gumbel(rng));
        scored.push_back({g + logit, tok});
    }

    std::partial_sort(scored.begin(), scored.begin() + k, scored.end(),
        [](auto& a, auto& b) { return a.first > b.first; });

    std::vector<llama_token> result;
    for (int i = 0; i < k; ++i) {
        result.push_back(scored[i].second);
    }
    return result;
}
```

This enables parallel evaluation of top-k candidates at discriminative positions.

### 9.2 Completed Q-Values

From Gumbel MuZero: use "completed" Q-values that include unexplored actions:

```cpp
/**
 * Completed Q-value for policy improvement.
 *
 * For unexplored tokens, use parent's value estimate.
 * This provides signal for policy loss in online learning settings.
 */
float completed_q(
    const PositionStats& stats,
    llama_token tok,
    float parent_value
) {
    if (stats.token_q.count(tok)) {
        return stats.token_q.at(tok);
    } else {
        // Unexplored: use parent's value estimate
        return parent_value;
    }
}
```

### 9.3 Hard Pruning (VerMCTS-style)

VerMCTS never adds failing nodes to the tree. We could adopt this for hard failures:

```cpp
/**
 * VerMCTS-style pruning for hard failures.
 *
 * If oracle returns 0.0 (complete failure), don't add to tree.
 * This reduces tree bloat for obviously bad paths.
 */
void expand_with_pruning(int parent_idx) {
    // ... generate child ...

    float score = evaluate(child_idx);

    if (score <= config_.hard_prune_threshold) {
        // Don't add to tree, just backprop failure
        backpropagate(parent_idx, -1.0f);
        branch::release(child_branch, &store_);
        return;
    }

    // Normal path: add to tree
    add_child(parent_idx, child_idx);
    backpropagate(child_idx, score);
}
```

### 9.4 Oracle Stacking (Not Learning)

For better coverage without learning:

```typescript
function stackedOracle(code: string): number {
  const lint = eslintScore(code); // Style
  const types = typescriptScore(code); // Type safety
  const complexity = complexityScore(code); // Maintainability
  const security = semgrepScore(code); // Security

  // Each is deterministic — no training needed
  return weighted_combination(lint, types, complexity, security);
}
```

Stack multiple deterministic oracles for broader coverage. Each adds signal, none requires training.

### 9.5 Grammar-Specific Position Hints

Extend Remux grammars with discriminative position hints:

```cpp
BlockRule{"variable-declaration",
    .match = std::regex(R"(^(const|let|var)\s+(\w+)\s*=)"),

    // Hint: position 0 is discriminative (const/let/var choice)
    .discriminative_positions = {0},

    .get_rollout = [](const BlockAstNode& node) -> std::optional<std::string> {
        return ";\n";
    }
}
```

This allows static declaration of where steering should apply, avoiding runtime detection overhead.

### 9.6 Cross-Chunk Position Learning

Track position statistics across multiple chunks with similar structure:

```cpp
// Abstract position key that generalizes across instances
struct AbstractPositionKey {
    std::string block_type;      // "variable-declaration"
    int relative_position;       // 0 = keyword position
};

// Learning: const is better than let at variable declaration position
abstract_stats_["variable-declaration"][0]:
  Q("const") = 0.95  // Across all variable declarations
  Q("let") = 0.72
  Q("var") = 0.45
```

This transfers learning from one variable declaration to the next.

### 9.7 Dirichlet Noise at Root (AlphaZero-style)

For guaranteed exploration even with strong priors (Silver et al. 2018):

```cpp
// Add Dirichlet noise at root node only
// Uses deterministic Gamma/Dirichlet from §6.4.2 for cross-platform reproducibility
if (is_root_node && config.use_dirichlet_noise) {
    std::vector<float> noise(legal.size());
    sampler::dirichlet(rng, noise.data(), static_cast<int>(legal.size()), config.dirichlet_alpha);

    for (size_t i = 0; i < legal.size(); ++i) {
        // Mix: (1-ε) * prior + ε * noise
        legal[i].prior = (1.0f - config.dirichlet_epsilon) * legal[i].prior +
                         config.dirichlet_epsilon * noise[i];
    }
}
```

**Typical hyperparameters (from AlphaZero):**

| Domain           | `dirichlet_alpha` | `dirichlet_epsilon` |
| ---------------- | ----------------- | ------------------- |
| Go               | 0.03              | 0.25                |
| Chess            | 0.3               | 0.25                |
| Atari            | 0.25              | 0.25                |
| Code (this spec) | 0.3               | 0.25                |

This is complementary to Gumbel steering — Dirichlet reshapes the _prior distribution_
at root before search, while Gumbel provides stochastic tie-breaking during selection.

### 9.8 Beyond MCTS

EastWest is specified for MCTS but the stateless design (§6.11) enables reuse:

| Algorithm            | Integration Pattern                               |
| -------------------- | ------------------------------------------------- |
| Beam search          | Steer beam extensions, feedback from scores       |
| Best-of-N            | Accumulate stats across batches                   |
| Speculative decoding | Bias draft toward tokens target accepts           |
| Streaming            | Continuous lint feedback steers subsequent tokens |

The key enabler is stats ownership: different algorithms need different lifecycles (per-search, per-generation, cumulative). EastWest is agnostic.

These integrations are future work. This specification focuses on MCTS.

### 9.9 Training Data Extraction (Zero Marginal Cost)

**Key insight:** Every EastWest MCTS run produces training signals as a byproduct. The compute is happening anyway — capturing this data is free value.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    The Data Triangle                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   p₀ (model prior)           What the model currently believes             │
│         ↓                                                                   │
│   p_steered (EastWest)        What exploration discovers                    │
│         ↓                                                                   │
│   Q (oracle pass/fail)       Ground truth from verifier                    │
│                                                                             │
│   Gap: p₀ → p_optimal        ← THIS IS YOUR TRAINING SIGNAL                │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ The oracle IS the reward model. No human annotation needed.                 │
│ Traditional: Human → Reward Model → RLHF                                    │
│ EastWest:     Oracle IS Reward → Direct Signal → DPO/SFT                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 9.9.1 Data Formats

**SFT Pairs** — Supervised fine-tuning on passing completions:

```cpp
struct SFTExample {
    std::string prompt;           // Input context
    std::string completion;       // Full completion that passed oracle
    float oracle_score;           // Q value (for filtering/weighting)
};
```

**DPO Triples** — Direct preference optimization from token contrasts:

```cpp
struct DPOExample {
    std::string prompt;           // Prefix up to discriminative position
    llama_token chosen;           // Token that led to high Q
    llama_token rejected;         // Token that led to low Q
    float margin;                 // Q_chosen - Q_rejected (confidence weight)
    int position;                 // Discriminative position index
};
```

**Token-Level Rewards** — For RLHF or reward model training:

```cpp
struct TokenReward {
    std::string prefix;           // Context before this token
    llama_token token;            // The token
    float reward;                 // Normalized Q (can be negative with advantage)
    float model_prob;             // p₀(token) — what model believed
    float oracle_prob;            // Effective probability after steering
};
```

#### 9.9.2 Harvesting Hooks

Add optional callbacks to the MCTS loop:

```cpp
struct TrainingDataConfig {
    bool collect_sft = true;           // Collect passing completions
    bool collect_dpo = true;           // Collect preference pairs
    bool collect_token_rewards = false; // Collect per-token rewards (verbose)

    float min_q_for_sft = 0.8f;        // Only collect high-Q completions
    float min_margin_for_dpo = 0.2f;   // Minimum Q gap for preference pairs
    int min_visits_for_dpo = 2;        // Both tokens must be explored

    std::function<void(const SFTExample&)> on_sft_example;
    std::function<void(const DPOExample&)> on_dpo_example;
    std::function<void(const TokenReward&)> on_token_reward;
};

// In expand() after oracle evaluation:
void harvest_training_data(
    const std::vector<llama_token>& tokens,
    const std::string& completion,
    float q,
    const TrainingDataConfig& config
) {
    // SFT: High-Q completions
    if (config.collect_sft && q >= config.min_q_for_sft) {
        config.on_sft_example({
            .prompt = current_prompt_,
            .completion = completion,
            .oracle_score = q
        });
    }

    // DPO: Harvest from position stats after search completes
    // (See harvest_dpo_pairs below)
}

// After search completes, mine position stats for preference pairs:
void harvest_dpo_pairs(
    const StatsMap& position_stats,
    const TrainingDataConfig& config
) {
    for (const auto& [key, stats] : position_stats) {
        // Find all token pairs with sufficient visits and margin
        std::vector<std::pair<llama_token, float>> explored;
        for (const auto& [tok, q] : stats.token_q) {
            if (stats.visits_for(tok) >= config.min_visits_for_dpo) {
                explored.push_back({tok, q});
            }
        }

        // Generate pairs (can generate multiple per position)
        for (size_t i = 0; i < explored.size(); ++i) {
            for (size_t j = i + 1; j < explored.size(); ++j) {
                float margin = explored[i].second - explored[j].second;
                if (std::abs(margin) >= config.min_margin_for_dpo) {
                    auto [chosen, rejected] = margin > 0
                        ? std::make_pair(explored[i].first, explored[j].first)
                        : std::make_pair(explored[j].first, explored[i].first);

                    config.on_dpo_example({
                        .prompt = prefix_for_position(key),
                        .chosen = chosen,
                        .rejected = rejected,
                        .margin = std::abs(margin),
                        .position = key.position
                    });
                }
            }
        }
    }
}
```

#### 9.9.3 Quality Filters

**Hard Negative Mining** — Cases where model was confident but wrong:

```cpp
bool is_hard_negative(llama_token tok, float q, float p0, const Config& c) {
    // Model was confident (high p₀) but oracle disagreed (low Q)
    return p0 > c.hard_neg_p0_threshold &&    // e.g., 0.3
           q < c.hard_neg_q_threshold;         // e.g., 0.5
}
```

These are the most valuable training examples — where the model needs correction.

**Diversity Sampling** — Avoid mode collapse:

```cpp
// Don't just collect the single best completion
// Collect diverse passing completions to maintain model breadth
struct DiversityTracker {
    std::unordered_set<size_t> seen_hashes;

    bool should_collect(const std::string& completion, float q) {
        size_t h = hash(completion);
        if (seen_hashes.count(h)) return false;
        if (seen_hashes.size() >= max_per_prompt) return false;
        seen_hashes.insert(h);
        return q >= min_q;
    }
};
```

**Confidence Weighting** — Weight examples by oracle certainty:

```cpp
// For DPO, larger margins = more confident preference
// Use margin as loss weight during training
float dpo_weight = std::min(margin / max_margin, 1.0f);
```

#### 9.9.4 Continuous Adaptation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Auto-Tune on Oracle Update (e.g., new ESLint version)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. New oracle drops (eslint v9.0, new TypeScript version, etc.)           │
│                          ↓                                                  │
│  2. Run EastWest over code corpus with new oracle                           │
│     - Model generates with current weights (p₀)                            │
│     - Oracle validates with new rules                                       │
│     - MCTS discovers what passes/fails                                     │
│                          ↓                                                  │
│  3. Harvest training data:                                                  │
│     - Completions that pass new rules (SFT)                                │
│     - Token preferences at discriminative positions (DPO)                  │
│     - Hard negatives: model confident, oracle disagrees                    │
│                          ↓                                                  │
│  4. LoRA fine-tune (hours on single GPU, fits edge hardware)               │
│                          ↓                                                  │
│  5. Model now "knows" new oracle rules                                     │
│     - Inference-time steering less necessary                               │
│     - p₀ closer to p_optimal                                               │
│     - EastWest still helps at edge cases                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 9.9.5 The Self-Improvement Loop

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   Model v1.0 ───► EastWest + Oracle ───► Training Data                    │
│       ↑                                       │                           │
│       │                                       ↓                           │
│       └─────────── LoRA Fine-tune ◄──────────┘                           │
│                                                                           │
│   Model v1.1 (better base, EastWest more efficient)                       │
│       │                                                                   │
│       └───► EastWest + Oracle ───► Higher Quality Data ───► ...           │
│                                                                           │
├──────────────────────────────────────────────────────────────────────────┤
│ Each iteration:                                                           │
│  • Better base model → EastWest explores more efficiently                 │
│  • More efficient exploration → higher quality training data             │
│  • Higher quality data → better fine-tuned model                         │
│  • Eventually: p₀ ≈ p_optimal, EastWest only needed for edge cases       │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 9.9.6 Storage Format

JSON-Lines for streaming collection:

```jsonl
{"type":"sft","prompt":"function add(","completion":"function add(a: number, b: number): number {\n  return a + b;\n}","q":1.0,"oracle":"typescript","timestamp":1703001234}
{"type":"dpo","prompt":"function add(a: number, b: ","chosen":12847,"rejected":9823,"margin":0.45,"position":7,"oracle":"typescript"}
{"type":"dpo","prompt":"const x = ","chosen":3847,"rejected":1293,"margin":0.8,"position":3,"oracle":"eslint:no-var"}
```

**Batch statistics** (for monitoring data quality):

```cpp
struct BatchStats {
    int sft_examples = 0;
    int dpo_pairs = 0;
    int hard_negatives = 0;
    float avg_q_sft = 0.0f;
    float avg_margin_dpo = 0.0f;
    float p0_q_correlation = 0.0f;  // Negative = model needs training
};
```

#### 9.9.7 Integration with Fine-Tuning

**Minimal LoRA config for Qwen 2.5 Coder 3B:**

```python
# Fits on 24GB GPU, runs on edge with quantization
lora_config = {
    "r": 16,
    "lora_alpha": 32,
    "target_modules": ["q_proj", "v_proj", "k_proj", "o_proj"],
    "lora_dropout": 0.05,
}

# DPO training (preferred for token-level preferences)
dpo_config = {
    "beta": 0.1,                    # KL penalty
    "loss_type": "sigmoid",         # Standard DPO
    "margin_weight": True,          # Weight by Q margin
}

# Curriculum: start with high-margin pairs
curriculum = [
    {"min_margin": 0.8, "epochs": 1},   # Easy: clear preferences
    {"min_margin": 0.5, "epochs": 1},   # Medium
    {"min_margin": 0.2, "epochs": 1},   # Hard: subtle preferences
]
```

**When to retrain vs steer:**

| Scenario                  | Strategy                                            |
| ------------------------- | --------------------------------------------------- |
| New oracle version        | Collect data → LoRA fine-tune                       |
| Edge cases only           | Inference-time steering sufficient                  |
| Cold start (new domain)   | Heavy EastWest → collect → train → reduce EastWest  |
| Production (known domain) | Light EastWest for safety, model handles most cases |

#### 9.9.8 Trace Logging for Expert Iteration

**Purpose:** Capture decision-level signals for training a learned "oracle head" that can approximate EastWest decisions cheaply. This follows the Expert Iteration (ExIt) pattern: expensive tree search generates high-quality decisions, which train a fast neural network to approximate them.

**Trace emission point:**

```cpp
// In the main decision loop, after sampling:
llama_token eastwest_decide(
    const PositionKey& key,
    const std::vector<std::pair<llama_token, float>>& p0_proposal,
    const PositionStats& stats,
    const Config& config,
    rng::Xoroshiro128Plus& rng
) {
    // Build steered distribution (copy first to preserve original)
    auto proposal = p0_proposal;
    steer_proposal(proposal, stats, parent_visits, position_visits, rng);

    // Compute explicit steering signal for EastWest-head training
    // delta_logit[i] = steered_logit[i] - original_logit[i]
    std::vector<std::pair<llama_token, float>> delta_logit;
    delta_logit.reserve(proposal.size());
    for (size_t i = 0; i < proposal.size(); ++i) {
        delta_logit.push_back({
            proposal[i].first,
            proposal[i].second - p0_proposal[i].second
        });
    }

    // Sample from steered proposal
    llama_token chosen = sample_from_proposal(proposal, temperature, rng);
    float behavior_prob = get_prob(proposal, chosen);
    float p0_prob = get_prob(p0_proposal, chosen);

    // Emit trace if enabled
    if (config.enable_tracing && config.on_trace) {
        EastWestTrace trace{
            .prefix_hash = key.prefix_hash,
            .position = key.position,
            .boundary_type = current_boundary_type_,
            .grammar_state_id = current_grammar_state_,

            .p0_proposal = p0_proposal,
            .p_steered = proposal,
            .delta_logit = delta_logit,  // Explicit steering signal

            .token_q = stats.token_q,
            .q_baseline = compute_baseline_q(stats, p0_proposal),
            .q_stddev = compute_q_stddev(stats, p0_proposal, q_baseline),
            .tokens_with_q = count_tokens_with_q(stats, p0_proposal),

            .chosen_token = chosen,
            .behavior_prob = behavior_prob,
            .p0_prob = p0_prob,

            // Downstream return filled in later by oracle callback
            .downstream_q = 0.0f,
            .oracle_passed = false,

            .position_visits = position_visits,
            .search_iterations = current_iteration_,
            .exploration_scale = compute_exploration_scale(position_visits, ...),
        };
        config.on_trace(trace);
    }

    return chosen;
}
```

**Downstream return attribution:**

The `downstream_q` and `oracle_passed` fields must be filled in after oracle evaluation. This requires either:

1. **Deferred completion:** Store pending traces, complete when oracle returns
2. **Callback update:** Oracle callback updates the most recent trace
3. **Batch attribution:** Post-process traces with oracle results at end of search

```cpp
// Option 2: Oracle callback updates trace
void on_oracle_result(float q, bool passed) {
    if (!pending_traces_.empty()) {
        pending_traces_.back().downstream_q = q;
        pending_traces_.back().oracle_passed = passed;

        // Now trace is complete, emit to storage
        flush_trace(pending_traces_.back());
    }
}
```

**Trace storage format (JSON-Lines):**

```jsonl
{
  "schema": "1.8.3",
  "workspace_rev": "a1b2c3d",
  "prefix_hash": 12345,
  "position": 3,
  "boundary_type": "code_block",
  "p0": [
    [
      "await",
      0.4
    ],
    [
      "req",
      0.3
    ]
  ],
  "p_steered": [
    [
      "await",
      0.6
    ],
    [
      "req",
      0.2
    ]
  ],
  "delta_logit": [
    [
      "await",
      0.405
    ],
    [
      "req",
      -0.405
    ]
  ],
  "chosen": "await",
  "behavior_prob": 0.6,
  "p0_prob": 0.4,
  "downstream_q": 0.99,
  "oracle_passed": true,
  "oracle_results": [
    {
      "tool": "eslint",
      "version": "9.0.1",
      "config_hash": 8827361,
      "score": 1,
      "passed": true
    }
  ],
  "sampling": {
    "seed": 42,
    "temperature": 0.7,
    "top_p": 0.95
  },
  "position_visits": 5
}
```

**Expanded format (for readability):**

```json
{
  "trace_schema_version": "1.8.3",
  "workspace_revision": "a1b2c3d4e5f6",
  "deps_lock_hash": 9182736,
  "environment": {
    "model_id": "qwen2.5-coder-3b-instruct",
    "quantization": "Q4_K_M",
    "model_file_hash": 7362810293,
    "inference_engine": "llama.cpp",
    "engine_version": "b4267",
    "tokenizer_hash": 1928374650,
    "grammar_hash": 5738291046
  },
  "prefix_hash": 12345,
  "position": 3,
  "boundary_type": "code_block",
  "p0": [
    ["await", 0.4],
    ["req", 0.3],
    ["JSON", 0.2],
    ["new", 0.1]
  ],
  "p_steered": [
    ["await", 0.6],
    ["req", 0.2],
    ["JSON", 0.15],
    ["new", 0.05]
  ],
  "delta_logit": [
    ["await", 0.405],
    ["req", -0.405],
    ["JSON", -0.288],
    ["new", -0.693]
  ],
  "chosen": "await",
  "behavior_prob": 0.6,
  "p0_prob": 0.4,
  "downstream_q": 0.99,
  "oracle_passed": true,
  "oracle_results": [
    {
      "tool": "eslint",
      "version": "9.0.1",
      "config_hash": 8827361,
      "score": 1.0,
      "passed": true,
      "diagnostics_hash": 0
    },
    {
      "tool": "tsc",
      "version": "5.3.0",
      "config_hash": 2938471,
      "score": 1.0,
      "passed": true,
      "diagnostics_hash": 0
    }
  ],
  "sampling": {
    "seed": 42,
    "temperature": 0.7,
    "top_p": 0.95,
    "top_k": 0,
    "proposal_k": 128,
    "exploration_tail": 8
  },
  "position_visits": 5,
  "search_iterations": 12,
  "oracle_time_ms": 45.2,
  "steering_time_ms": 2.1
}
```

**Training objectives enabled by traces:**

| Objective                  | Loss                                       | Target                      |
| -------------------------- | ------------------------------------------ | --------------------------- |
| Policy distillation        | `KL(p_steered, head(prefix))`              | Imitate EastWest decisions  |
| EastWest-head distillation | `MSE(head(prefix), delta_logit)`           | Predict steering adjustment |
| Q regression               | `MSE(head(prefix, token), token_q)`        | Predict oracle return       |
| Advantage regression       | `MSE(head(prefix, token), Q - q_baseline)` | Predict relative value      |
| Binary oracle              | `BCE(head(prefix, token), oracle_passed)`  | Predict pass/fail           |

**Distribution shift mitigation (DAgger-style):**

When deploying a trained head, it visits different states than EastWest did during training. To correct for this:

1. Deploy head with fallback to EastWest when uncertain
2. Log states the head visits
3. Run EastWest on those states to get expert decisions
4. Add to training dataset
5. Retrain head

```cpp
// Head with safety fallback
llama_token decide_with_head(const OracleHead& head, ...) {
    float confidence = head.confidence(prefix, position);

    if (confidence < config.min_head_confidence) {
        // Fall back to full EastWest, log this state for DAgger
        log_dagger_state(prefix, position);
        return eastwest_decide(...);
    }

    return head.sample(prefix, position);
}
```

**References:**

- Anthony et al. (2017) — Expert Iteration ("Thinking Fast and Slow")
- Ross, Gordon & Bagnell (2011) — DAgger (dataset aggregation for distribution shift)
- Swaminathan & Joachims (2015) — Counterfactual Risk Minimization (off-policy learning with propensities)

---

## 10. Correctness Guarantees

### 10.1 When Steering Applies

| Condition                   | Action                              |
| --------------------------- | ----------------------------------- |
| `legal.empty()`             | **Throw error** (grammar violation) |
| `legal.size() == 1`         | Skip steering (deterministic)       |
| `legal.size() <= threshold` | Use Sequential Halving              |
| `legal.size() > threshold`  | Use Gumbel steer                    |

### 10.2 Steer Only Legal Candidates

```cpp
// CORRECT: Only modify legal tokens
for (auto& tok : cur_p) {
    if (legal_set.contains(tok.id)) {
        tok.logit += bonus;  // Modify
    }
    // Non-legal tokens unchanged
}

// WRONG: Modify everything
for (auto& tok : cur_p) {
    tok.logit += bonus;  // Chaos on 50k tokens
}
```

### 10.3 Position-Aware Stats

```cpp
// CORRECT: Key by (prefix, position)
PositionKey key{hash("MOVE: "), 3};  // The digit position
position_stats_[key].update(token_8, q);

// WRONG: Key by first token only
token_q[tokens[0]] = q;  // Tracks "M" not "8"
```

### 10.4 Exploration Decay with Floor

```cpp
// CORRECT: Decay with floor
float scale = std::max(0.1f, 1.0f / std::sqrt(1.0f + visits));

// WRONG: Decay to zero (missing max() wrapper causes collapse)
float scale = 1.0f / std::sqrt(1.0f + visits);

// WRONG: Constant (wastes budget late)
float scale = 1.0f;
```

### 10.5 Steer Before Truncation

```cpp
// CORRECT: Steer then truncate
apply_steer(cur_p);      // Boost low-prior tokens
apply_top_k(cur_p, 40);  // Then truncate

// WRONG: Truncate then steer
apply_top_k(cur_p, 40);  // Token "8" already cut (P=0.001)
apply_steer(cur_p);      // Too late, can't resurrect
```

### 10.6 Model Prior Separation

```cpp
// CORRECT: Prior from unsteered distribution
float prior = capture_model_prior(parent.branch, token, &store_);
// ... then apply steer for sampling ...

// WRONG: Prior from steered distribution
apply_steer(cur_p);
float prior = get_token_prob(cur_p, token);  // Double-counts oracle
```

### 10.7 σ(Q) Must Use Proper Baseline and Normalization (v1.8.3)

```cpp
// CORRECT (v1.8.3): Expectation-weighted baseline, stddev normalization
float baseline = compute_baseline_q(stats, proposal);  // Prior-weighted
float stddev = compute_q_stddev(stats, proposal, baseline);
float effective_range = std::min(logit_range, config.max_sigma_q_logit_range);

if (stats.token_q.count(tok) && stddev > 0.0f) {
    float advantage = (stats.token_q.at(tok) - baseline) / (stddev + 1e-6f);
    float raw_sigma = c_scale * advantage * effective_range * visit_scale;
    sigma_q = std::clamp(raw_sigma, -config.max_perturbation, config.max_perturbation);
}

// WRONG (v1.8): Range normalization (outlier-sensitive, always positive)
float normalized_q = (Q - q_min) / q_range;  // [0, 1], never negative
float sigma_q = c_scale * normalized_q * effective_range * visit_scale;

// WRONG: Arithmetic mean baseline (exploration-biased)
float q_mean = q_sum / q_count;  // Biased by exploration order

// WRONG: Raw Q values (too small to affect selection)
float sigma_q = c_scale * Q * visit_scale;  // ~1.0 vs logit gap ~3.7

// WRONG: Unbounded perturbation (allows degeneration)
float sigma_q = c_scale * advantage * effective_range * visit_scale;  // No clamp
```

---

## 11. Appendix: Expected Behavior

### A. Tic-Tac-Toe with Position-Aware Gumbel Steer (v1.8.3)

**Grammar:** `root ::= "MOVE: " [0-8] "\n"`

**Discriminative position:** 3 (the digit)

**Key insight:** σ(Q) uses expectation-weighted baseline and stddev normalization.

```
Iteration 1:
  Positions 0-2: deterministic, no steer
  Position 3: is_discriminative() = true (9 grammar-legal: 0-8)
    No Q data yet → exploration only (min_tokens_for_steering = 2)
    explore_scale = 1.0 (no visits yet)
    G("2")=0.3, logit("2")=3.8 → 4.1
    G("8")=0.1, logit("8")=0.1 → 0.2
    Sample "2" → Q=200 (not winning)

Iteration 2:
  Position 3:
    Only 1 token has Q → exploration only
    explore_scale = max(0.1, 1/√2) = 0.71
    G("8")=1.5×0.71=1.07, logit("8")=0.1 → 1.17
    Sample "8" → Q=1000 ★ FOUND OPTIMAL

Iteration 3:
  Position 3:
    tokens_with_q = 2 → steering enabled

    Build proposal set (all 9 legal, < proposal_k)

    Compute baseline (prior-weighted):
      p0("2") ≈ 0.9 (high logit 3.8)
      p0("8") ≈ 0.02 (low logit 0.1)
      Q̄ = (0.9×200 + 0.02×1000) / (0.9 + 0.02) ≈ 217

    Compute stddev (prior-weighted):
      σ_Q ≈ 77  (dominated by token "2"'s deviation from baseline)

    For token "8": advantage = (1000 - 217) / 77 ≈ +10.2
    For token "2": advantage = (200 - 217) / 77 ≈ -0.2

    logit_range = min(3.8 - 0.1, 15.0) = 3.7
    visit_scale = min(1.0, 2/50) = 0.04

    σ(Q)("8") = clamp(1.0 × 10.2 × 3.7 × 0.04, -2.5, +2.5) = +1.5 (clamped)
    σ(Q)("2") = 1.0 × (-0.2) × 3.7 × 0.04 = -0.03

    explore_scale = max(0.1, 1/√3) = 0.58
    → Token "8" gets significant boost even early
    → Token "2" gets slight penalty

Iteration 50:
  visit_scale = min(1.0, 50/50) = 1.0
  explore_scale = max(0.1, 1/√50) = 0.14

  σ(Q)("8") = clamp(1.0 × 10.2 × 3.7 × 1.0, -2.5, +2.5) = +2.5 (clamped)
  σ(Q)("2") = 1.0 × (-0.2) × 3.7 × 1.0 = -0.74

  After steer:
    logit'("8") = 0.1 + G×0.14 + 2.5 ≈ 2.6 + small noise
    logit'("2") = 3.8 + G×0.14 - 0.74 ≈ 3.1 + small noise

  → Token "8" now competitive with "2"
  → Low-Q token "2" actively suppressed
  → Readout selects move 8 (highest Q).

Result: Converged on move 8 (optimal) ✓
```

### B. Sequential Halving on Tic-Tac-Toe

```
Legal moves at position 3: [2, 3, 5, 6, 7, 8] (6 board-legal tokens)
Budget: 30 oracle calls (reduced from 100 for latency)
Phases: ceil(log2(6)) = 3

Phase 1: 30/3 = 10 calls, 10/6 ≈ 1-2 per candidate
  Move 2: 2 evals → avg Q = 200
  Move 3: 2 evals → avg Q = 200
  Move 5: 2 evals → avg Q = 200
  Move 6: 2 evals → avg Q = 200
  Move 7: 1 eval  → avg Q = 200
  Move 8: 1 eval  → avg Q = 1000 ★
  → Keep top 3: [8, 2, 3]

Phase 2: 10 calls, 10/3 ≈ 3 per candidate
  Move 8: 3 evals → avg Q = 1000 ★
  Move 2: 3 evals → avg Q = 200
  Move 3: 3 evals → avg Q = 200
  → Keep top 2: [8, 2]

Phase 3: 10 calls, 10/2 = 5 per candidate
  Move 8: 5 evals → avg Q = 1000 ★
  Move 2: 5 evals → avg Q = 200
  → Return: 8

Total: 30 oracle calls, ~600ms with 20ms oracle
Result: Found optimal ✓
```

### C. TypeScript Lint with Position-Aware Tracking (v1.8.3)

**Task:** Complete `const data = // CURSOR` in async function

**Discriminative position:** 0 (first token of completion)

**Key insight:** σ(Q) uses expectation-weighted baseline and stddev normalization.

```
Iteration 1:
  Position 0: is_discriminative() = true
    legal = ["await", "req", "JSON", "new", ...]
    No Q data yet → exploration only (min_tokens_for_steering = 2)
    explore_scale = 1.0
    G("await")=0.8, logit=3.8 → 4.6 ★
    Sample "await" → "await req.json()" → Q=0.99

Iteration 2:
  Position 0:
    Only 1 token has Q → exploration only
    explore_scale = max(0.1, 1/√2) = 0.71
    G("req")=1.7×0.71=1.21, logit=3.2 → 4.41 ★
    Sample "req" → "req.body" → Q=0.76

Iteration 3:
  Position 0:
    tokens_with_q = 2 → steering enabled
    logit_range = min(3.8-2.1, 15.0) = 1.7

    explore_scale = max(0.1, 1/√3) = 0.58
    G("JSON")=1.4×0.58=0.81, logit=2.1, σ(Q)≈0 → 2.91 ★
    (σ(Q) small due to low visit_scale = 2/50 = 0.04)
    Sample "JSON" → Q=0.45

Iteration 4:
  Position 0:
    tokens_with_q = 3 → steering enabled
    visit_scale = min(1.0, 3/50) = 0.06

    Compute expectation-weighted baseline (prior-weighted):
      p0("await") ≈ 0.58 (high logit 3.8)
      p0("req") ≈ 0.32 (medium logit 3.2)
      p0("JSON") ≈ 0.11 (low logit 2.1)
      Q̄ = (0.58×0.99 + 0.32×0.76 + 0.11×0.45) ≈ 0.86

    Compute prior-weighted stddev:
      σ_Q ≈ 0.18

    advantage("await") = (0.99 - 0.86) / 0.18 ≈ +0.72
    advantage("req") = (0.76 - 0.86) / 0.18 ≈ -0.56
    advantage("JSON") = (0.45 - 0.86) / 0.18 ≈ -2.28

    σ(Q)("await") = 1.0 × 0.72 × 1.7 × 0.06 = +0.07
    σ(Q)("req") = 1.0 × (-0.56) × 1.7 × 0.06 = -0.06
    σ(Q)("JSON") = 1.0 × (-2.28) × 1.7 × 0.06 = -0.23

    explore_scale = max(0.1, 1/√4) = 0.5

    logit'("await") = 3.8 + G×0.5 + 0.07 ≈ 3.87 + noise
    logit'("req") = 3.2 + G×0.5 - 0.06 ≈ 3.14 + noise
    logit'("JSON") = 2.1 + G×0.5 - 0.23 ≈ 1.87 + noise

    → "await" still favored, low-Q tokens pushed down

Iteration 50:
  visit_scale = min(1.0, 50/50) = 1.0
  explore_scale = max(0.1, 1/√50) = 0.14

  σ(Q)("await") = 1.0 × 0.72 × 1.7 × 1.0 = +1.22
  σ(Q)("req") = 1.0 × (-0.56) × 1.7 × 1.0 = -0.95
  σ(Q)("JSON") = clamp(1.0 × (-2.28) × 1.7 × 1.0, -2.5, +2.5) = -2.5 (clamped)

  After steer:
    logit'("await") = 3.8 + G×0.14 + 1.22 ≈ 5.0 + small noise
    logit'("req") = 3.2 + G×0.14 - 0.95 ≈ 2.25 + small noise
    logit'("JSON") = 2.1 + G×0.14 - 2.5 ≈ -0.4 + small noise

  → "await" strongly dominates
  → Low-Q tokens actively suppressed
  → Converged on "await req.json()" ✓
```

### D. Comparison: v1.7 vs v1.8 vs v1.8.3

| Aspect                    | v1.7                  | v1.8                         | v1.8.3                          |
| ------------------------- | --------------------- | ---------------------------- | ------------------------------- |
| σ(Q) formula              | `c × Q × visit`       | `c × norm_Q × range × visit` | `c × advantage × range × visit` |
| Normalization             | None                  | Range `[0,1]`                | Stddev (z-score style)          |
| Baseline                  | None                  | Q_min                        | E_p0[Q] (prior-weighted)        |
| σ(Q) sign                 | Positive only         | Positive only                | **Bidirectional**               |
| Magnitude                 | ~1.0 max              | ~3.7 (logit scale)           | ~3.7 (clamped ±2.5)             |
| Logit range clamp         | None                  | 15.0                         | 15.0                            |
| Sparse Q handling         | Apply anyway          | Apply anyway                 | **Exploration only**            |
| RNG                       | std::mt19937          | std::mt19937                 | **Xoroshiro128+**               |
| Distributions             | std::\*\_distribution | std::\*\_distribution        | **eastwest::sampler::\***       |
| `evaluate_token_choice()` | Undefined             | **Defined**                  |
| SH budget default         | 100                   | **30**                       |
| Timeout handling          | None                  | **Documented**               |
| Pass@T metric             | None                  | **Added**                    |

---

## 12. References

1. **Brandfonbrener et al.** — "VerMCTS: Synthesizing Multi-Step Programs using a Verifier, a Large Language Model, and Tree Search" (2024)
   - Verifier-guided MCTS, Pass@T metric, optimistic value bounds
   - https://arxiv.org/abs/2402.08147
   - _Closely related work; we extend with token-level steering_

2. **Danihelka et al.** — "Policy Improvement by Planning with Gumbel" (ICLR 2022)
   - Gumbel MuZero, Sequential Halving, σ(Q) scaling
   - https://openreview.net/forum?id=bERaNdoegnO
   - _Note: We cite as inspiration, not claiming identical guarantees_

3. **Zhao et al.** — "Generative Adversarial Gumbel MCTS for Abstract Visual Composition" (2024)
   - Application to "hard to generate, easy to verify" problems
   - https://arxiv.org/abs/2512.01242

4. **Karnin et al.** — "Almost Optimal Exploration in Multi-Armed Bandits" (ICML 2013)
   - Sequential Halving for simple regret minimization

5. **Silver et al.** — "Mastering Chess and Shogi by Self-Play" (2017)
   - AlphaZero PUCT formula, Dirichlet noise at root

6. **Browne et al.** — "A Survey of Monte Carlo Tree Search Methods" (2012)
   - Progressive widening, progressive bias, heuristic MCTS

7. **Coulom** — "Efficient Selectivity and Backup Operators in Monte-Carlo Tree Search" (2006)
   - Progressive widening original formulation

8. **Dathathri et al.** — "Plug and Play Language Models" (ICLR 2020)
   - PPLM: logit steering with external signal
   - KL penalty to prevent degeneration — informs our `max_logit_perturbation`

9. **Liu et al.** — "DExperts: Decoding-Time Controlled Text Generation with Experts and Anti-Experts" (ACL 2021)
   - Expert minus anti-expert for symmetric push/pull
   - https://aclanthology.org/2021.acl-long.522/
   - _Informs our advantage-style σ(Q) formulation (§6.7.1)_

10. **Yang & Klein** — "FUDGE: Controlled Text Generation With Future Discriminators" (NAACL 2021)
    - Top-K filtering before steering for computational efficiency
    - https://aclanthology.org/2021.naacl-main.276/
    - _Informs our candidate set construction (§6.12)_

11. **Krause et al.** — "GeDi: Generative Discriminator Guided Sequence Generation" (EMNLP 2021)
    - Bayes rule for efficient per-token steering
    - https://aclanthology.org/2021.findings-emnlp.424/

12. **Anthony, Tian & Barber** — "Thinking Fast and Slow with Deep Learning and Tree Search" (NeurIPS 2017)
    - Expert Iteration (ExIt): tree search as expert, neural network as apprentice
    - https://arxiv.org/abs/1705.08439
    - _Informs our trace logging for learned head training (§6.4.1, §9.9.8)_

13. **Ross, Gordon & Bagnell** — "A Reduction of Imitation Learning and Structured Prediction to No-Regret Online Learning" (AISTATS 2011)
    - DAgger: dataset aggregation for distribution shift correction
    - https://arxiv.org/abs/1011.0686
    - _Informs our DAgger-style head refinement (§9.9.8)_

14. **Swaminathan & Joachims** — "Counterfactual Risk Minimization: Learning from Logged Bandit Feedback" (ICML 2015)
    - Off-policy learning with propensity scoring
    - https://arxiv.org/abs/1502.02362
    - _Informs our `behavior_prob` logging for off-policy training (§6.4.1)_

15. **mcts.hpp** — Current PUCT implementation with steer callback

16. **branch.hpp** — Branch primitive with `get_legal_priors()`, prior capture APIs

17. **boundaries.hpp** — BoundaryTracker with draft/committed semantics and structural_rollout

18. **remux/** — Streaming block parser with O(1) fork

19. **commonmark.hpp** — CommonMark grammar with get_rollout lambdas

---

## 13. Appendix: Correctness Checklist

Before deploying, verify:

**Core Mechanics:**

- [ ] `is_discriminative()` returns false for all deterministic positions
- [ ] `is_discriminative()` returns true for choice positions
- [ ] `get_legal_candidates()` throws on empty legal set
- [ ] Position stats keyed by `(prefix_hash, position)`, not first token
- [ ] Exploration scale decreases with visits (`1/√(1+n)`)
- [ ] Exploration scale never goes below floor (default 0.1)
- [ ] Per-token exploration decreases with token visits (with floor)

**Proposal Set Construction (v1.8.2+):**

- [ ] Proposal set built from unsteered logits (BEFORE steering)
- [ ] Mandatory tokens (EOS) always included if legal
- [ ] Exploration tail sampled from outside top-K
- [ ] Model prior captured from unsteered distribution

**Steering (v1.8.3+):**

- [ ] Q baseline is expectation-weighted, not arithmetic mean
- [ ] Normalization uses stddev, not range
- [ ] Skip steering if `count_tokens_with_q < min_tokens_for_steering`
- [ ] σ(Q) clamped to `[-max_perturbation, +max_perturbation]` (default 2.5)
- [ ] Logit range clamped to `max_sigma_q_logit_range` (default 15.0)

**Sequential Halving:**

- [ ] Used for small action spaces (≤ threshold)
- [ ] Budget reasonable for latency (~30)

**Oracle:**

- [ ] Timeout handled (return 0.0, log event)
- [ ] `evaluate_token_choice()` properly forks, evaluates, and cleans up
- [ ] Position stats updated after each oracle evaluation

**Determinism (v1.8.3+):**

- [ ] RNG seed derived from (base_seed, prefix_hash, position, iteration)
- [ ] Reproducible runs when `rng_base_seed != 0`

**MCTS Integration (avoid oracle-infected priors):**

- [ ] PUCT uses `model_prior` from `capture_model_prior()`, NOT sampled distribution
- [ ] `capture_model_prior()` called BEFORE `steer_proposal()` is applied
- [ ] Child node prior reflects unsteered p₀, not EastWest-shaped distribution
- [ ] Value (Q) and prior (P) come from independent sources (oracle vs model)
- [ ] Chunk prior uses first token only: `capture_model_prior(..., tokens[0], ...)`
- [ ] API naming distinguishes p₀ from p_steered (no ambiguous `get_prior()` functions)

**Documentation:**

- [ ] Claims about Gumbel MuZero are "inspired by" not "guarantees"
- [ ] Pass@T metric implemented for fair comparison

---

### 13.1 Future Considerations

These are known improvements not implemented in v1.8.3, documented here for future development:

**KL Divergence Budget**

The current `max_logit_perturbation` caps individual perturbations, but cumulative drift across multiple positions is unbounded. A per-sequence KL budget (similar to PPLM constraints) could provide additional safety:

```cpp
// Conceptual implementation
float kl = compute_kl_divergence(p_steered, p0, proposal);
if (cumulative_kl + kl > config.max_kl_budget) {
    // Reduce perturbation scale or skip steering for remaining positions
    scale_factor = (config.max_kl_budget - cumulative_kl) / kl;
}
cumulative_kl += kl;
```

This prevents the "death by a thousand cuts" scenario where many moderate perturbations compound into large distribution shift.

**Adaptive Exploration Tail**

The current `exploration_tail = 8` is static. Could adapt based on:

- Position entropy (high entropy → more tail exploration)
- Oracle variance at this position (high variance → more exploration)
- Search budget remaining

**UCB-Style Q Storage**

For use cases where max Q causes problematic optimism bias:

```cpp
// Store mean + variance for UCB-style upper bound
float q_mean = token_q_sum[tok] / token_q_count[tok];
float q_var = token_q_sq_sum[tok] / token_q_count[tok] - q_mean * q_mean;
float q_ucb = q_mean + config.ucb_c * sqrt(q_var / token_q_count[tok]);
```

**MCTS Integration Notes**

The following are implementation notes for `mcts.hpp`, outside EastWest scope but relevant for correct integration:

- `MinMaxStats::normalize()` should return 0.5 (neutral midpoint) when no data, not 0.0
- Selection should always go through normalize path for consistent cold-start behavior
- Progressive bias can inject EastWest signal explicitly with `1/(1+N)` decay if oracle-infected priors are desired (but do it deliberately, not accidentally)

---

## 14. Appendix C: eastwest.hpp Interface

```cpp
#pragma once

#include <cmath>
#include <functional>
#include <limits>
#include <set>
#include <unordered_map>
#include <vector>

namespace lloyal::eastwest {

// ============================================================================
// Data Structures (§6.4)
// ============================================================================

struct PositionKey {
    size_t prefix_hash;
    int position;
    bool operator==(const PositionKey&) const = default;
};

struct PositionKeyHash {
    size_t operator()(const PositionKey& k) const {
        return std::hash<size_t>()(k.prefix_hash) ^
               (std::hash<int>()(k.position) << 1);
    }
};

struct PositionStats {
    std::unordered_map<llama_token, float> token_q;      // Best Q per token
    std::unordered_map<llama_token, int> token_visits;   // Visit count per token

    // Tracking fields (for monitoring, not used in steering)
    float q_min = std::numeric_limits<float>::max();
    float q_max = std::numeric_limits<float>::lowest();
    int total_visits = 0;

    void update(llama_token tok, float q) {
        if (token_q.find(tok) == token_q.end() || q > token_q[tok]) {
            token_q[tok] = q;
        }
        token_visits[tok]++;
        total_visits++;
        q_min = std::min(q_min, q);
        q_max = std::max(q_max, q);
    }

    int visits_for(llama_token tok) const {
        auto it = token_visits.find(tok);
        return it != token_visits.end() ? it->second : 0;
    }
};

using StatsMap = std::unordered_map<PositionKey, PositionStats, PositionKeyHash>;

// ============================================================================
// EastWest (§6.5, §6.7, §6.9)
// ============================================================================

class EastWest {
public:
    struct Config {
        // === Steering Parameters ===
        float c_scale = 1.0f;              // Exploitation strength
        float c_visit = 50.0f;             // Visits for full exploitation
        float exploration_floor = 0.1f;    // Minimum exploration noise
        float max_logit_range = 15.0f;     // σ(Q) logit range clamp
        float max_perturbation = 2.5f;     // σ(Q) magnitude clamp (v1.8.3: reduced from 5.0)
        int min_tokens_for_steering = 2;   // Skip steering with sparse Q (v1.8.3)

        // === Sequential Halving ===
        int sh_threshold = 16;             // Max candidates for Sequential Halving
        int sh_budget = 30;                // Oracle calls per SH selection

        // === Candidate Set Construction (§6.14) ===
        int proposal_k = 128;              // Max proposal set size
        int exploration_tail = 8;          // Random samples from tail
        float tail_temperature = 2.0f;     // Temperature for tail sampling
        std::vector<llama_token> mandatory_tokens;  // Always include (v1.8.3)

        // === Trace Logging (§6.4.1) ===
        bool enable_tracing = false;       // Emit traces for Expert Iteration
        TraceCallback on_trace;            // Called after each discriminative decision
    };

    explicit EastWest(Config config = {}) : config_(config) {}

    // §6.14: Candidate set construction (bounds compute to proposal_k)
    // RNG passed by caller for position-aware determinism (§6.12.1)
    std::vector<std::pair<llama_token, float>> build_proposal_set(
        const llama_token_data_array& logits,
        const std::set<llama_token>& legal_tokens,
        rng::Xoroshiro128Plus& rng
    ) const;

    // §6.7: Steer proposal in-place with Gumbel + σ(Q)
    // RNG passed by caller for position-aware determinism (§6.12.1)
    void steer_proposal(
        std::vector<std::pair<llama_token, float>>& proposal,
        const PositionStats& stats,
        int parent_visits,
        int position_visits,
        rng::Xoroshiro128Plus& rng
    ) const;

    // §6.7: Sample from steered proposal
    // RNG passed by caller for position-aware determinism (§6.12.1)
    llama_token sample_from_proposal(
        const std::vector<std::pair<llama_token, float>>& proposal,
        float temperature,
        rng::Xoroshiro128Plus& rng
    ) const;

    // §6.9: Sequential Halving for small action spaces
    template <typename EvalFn>
    llama_token select_by_halving(
        const std::vector<std::pair<llama_token, float>>& candidates,
        EvalFn evaluate
    ) const;

    // §6.4: Record oracle feedback
    static void update(
        StatsMap& stats,
        const PositionKey& key,
        llama_token token,
        float q
    );

    // Decision helpers
    bool should_steer(size_t n) const {
        return n > 1 && n > static_cast<size_t>(config_.sh_threshold);
    }

    bool should_halve(size_t n) const {
        return n > 1 && n <= static_cast<size_t>(config_.sh_threshold);
    }

    const Config& config() const { return config_; }

private:
    Config config_;
    // NOTE: No internal RNG. Caller provides RNG for position-aware determinism.
    // See §6.12.1 get_position_rng() for seed derivation.
};

}  // namespace lloyal::eastwest
```

**Stateless Design:** EastWest owns no RNG state. The caller constructs an RNG per-position using `get_position_rng()` (§6.12.1) and passes it to each method. This ensures deterministic replay: same `(base_seed, prefix, position, iteration)` → same RNG → same decisions, regardless of tree traversal order or parallelism.

Implementation follows §6.7, §6.7.1, §6.9, §6.14 exactly. RNG uses deterministic Xoroshiro128Plus (§6.4.2) for cross-platform reproducibility.

---

## 15. Appendix D: Diffusion Language Model Support

This appendix specifies how EastWest adapts from autoregressive (AR) generation to discrete Diffusion Language Models (DLMs) such as LLaDA, Dream 7B, and DiffuCoder. The core algorithm is unchanged; only the position key representation differs.

**Design principle:** DLM EastWest follows the exact same patterns as AR EastWest:

- EastWest is **stateless** — holds only `Config`
- **Caller owns** the `StatsMap` and does key lookups
- `steer_proposal()` takes `const PositionStats&` for a **single position**, not the whole map
- `update()` is **static** and takes `StatsMap&` + key
- **RNG passed by caller** for determinism

### D.1 Background: AR vs DLM Generation

**Autoregressive (AR):**

```
Position 0 → Position 1 → Position 2 → ... → Position N
   ↓            ↓            ↓                   ↓
 Token 0     Token 1     Token 2             Token N
```

- Sequential left-to-right generation
- Each position visited exactly once
- Prefix is immutable context for position P

**Discrete Diffusion (DLM):**

```
[MASK] [MASK] [MASK] [MASK] [MASK]  ← Initial state
   ↓      ↓      ↓      ↓      ↓
[MASK]  "def" [MASK] [MASK] [MASK]  ← Step 1: commit position 1
   ↓      ↓      ↓      ↓      ↓
[MASK]  "def" [MASK]  "x"  [MASK]   ← Step 2: commit position 3
   ↓      ↓      ↓      ↓      ↓
 "def"  "def"  "foo"   "x"   ":"    ← ... until converged
```

- Parallel prediction at all masked positions
- Iterative commitment based on confidence
- Context includes both past AND future (bidirectional attention)

### D.2 Concept Mapping

| Concept            | AR Semantics                  | DLM Semantics                             |
| ------------------ | ----------------------------- | ----------------------------------------- |
| **State**          | Prefix tokens `[0..pos)`      | Partially-unmasked sequence + mask bitmap |
| **Position**       | Sequential index              | Any masked slot index                     |
| **Position Key**   | `hash(prefix, position)`      | `hash(mask_state, position)`              |
| **Oracle input**   | Partial sequence              | Full sequence with candidate at position  |
| **Steering scope** | One position per forward pass | All masked positions per denoising step   |
| **Revisitation**   | Never (position passed)       | Possible (context may change)             |

### D.3 Data Structures

```cpp
namespace lloyal::eastwest_dlm {

// ============================================================================
// MaskState — represents partially-unmasked sequence
// ============================================================================

struct MaskState {
    std::vector<llama_token> tokens;  // Current sequence (MASK_TOKEN for masked)
    std::vector<bool> is_masked;      // true = position still masked

    // Efficient hashing for Q-key lookup
    uint64_t hash() const {
        uint64_t h = 0xcbf29ce484222325ULL;  // FNV offset basis
        for (size_t i = 0; i < tokens.size(); ++i) {
            if (!is_masked[i]) {
                h ^= static_cast<uint64_t>(tokens[i]);
                h *= 0x100000001b3ULL;  // FNV prime
            }
            h ^= static_cast<uint64_t>(is_masked[i]);
            h *= 0x100000001b3ULL;
        }
        return h;
    }

    size_t num_masked() const {
        return std::count(is_masked.begin(), is_masked.end(), true);
    }

    std::vector<size_t> masked_positions() const {
        std::vector<size_t> result;
        for (size_t i = 0; i < is_masked.size(); ++i) {
            if (is_masked[i]) result.push_back(i);
        }
        return result;
    }
};

// ============================================================================
// DLMPositionKey — replaces PositionKey from AR EastWest
// ============================================================================

struct DLMPositionKey {
    uint64_t mask_state_hash;  // From MaskState::hash()
    size_t position;           // Which masked slot

    bool operator==(const DLMPositionKey&) const = default;
};

struct DLMPositionKeyHash {
    size_t operator()(const DLMPositionKey& k) const {
        return std::hash<uint64_t>()(k.mask_state_hash) ^
               (std::hash<size_t>()(k.position) << 1);
    }
};

// ============================================================================
// Reuse PositionStats from AR EastWest — structure is identical
// ============================================================================

using PositionStats = eastwest::PositionStats;
using DLMStatsMap = std::unordered_map<DLMPositionKey, PositionStats, DLMPositionKeyHash>;

}  // namespace lloyal::eastwest_dlm
```

**Key insight:** `PositionStats` is unchanged. Only the key type differs.

### D.4 DLM EastWest Interface

The interface mirrors AR EastWest exactly. The only difference is how callers compute keys.

```cpp
namespace lloyal::eastwest_dlm {

class DLMEastWest {
public:
    // Config identical to AR EastWest — no DLM-specific parameters needed
    using Config = eastwest::EastWest::Config;

    explicit DLMEastWest(Config config = {}) : config_(config) {}

    // =========================================================================
    // §6.14: Candidate set construction
    // IDENTICAL to AR EastWest — no state/position needed
    // =========================================================================

    std::vector<std::pair<llama_token, float>> build_proposal_set(
        const llama_token_data_array& logits,
        const std::set<llama_token>& legal_tokens,
        rng::Xoroshiro128Plus& rng
    ) const;

    // =========================================================================
    // §6.7: Steer proposal in-place with Gumbel + σ(Q)
    // IDENTICAL to AR EastWest — takes PositionStats for ONE position
    // Caller does: stats[{mask_state.hash(), position}]
    // =========================================================================

    void steer_proposal(
        std::vector<std::pair<llama_token, float>>& proposal,
        const PositionStats& stats,    // Single position's stats (caller looked up)
        int parent_visits,
        int position_visits,
        rng::Xoroshiro128Plus& rng
    ) const;

    // =========================================================================
    // §6.7: Sample from steered proposal
    // IDENTICAL to AR EastWest
    // =========================================================================

    llama_token sample_from_proposal(
        const std::vector<std::pair<llama_token, float>>& proposal,
        float temperature,
        rng::Xoroshiro128Plus& rng
    ) const;

    // =========================================================================
    // §6.9: Sequential Halving for small action spaces
    // IDENTICAL to AR EastWest
    // =========================================================================

    template <typename EvalFn>
    llama_token select_by_halving(
        const std::vector<std::pair<llama_token, float>>& candidates,
        EvalFn evaluate
    ) const;

    // =========================================================================
    // §6.4: Record oracle feedback
    // Static, takes DLMStatsMap& + key (mirrors AR pattern exactly)
    // =========================================================================

    static void update(
        DLMStatsMap& stats,
        const DLMPositionKey& key,
        llama_token token,
        float q
    ) {
        stats[key].update(token, q);
    }

    // Convenience overload with MaskState
    static void update(
        DLMStatsMap& stats,
        const MaskState& state,
        size_t position,
        llama_token token,
        float q
    ) {
        DLMPositionKey key{state.hash(), position};
        stats[key].update(token, q);
    }

    // Decision helpers (identical to AR)
    bool should_steer(size_t n) const {
        return n > 1 && n > static_cast<size_t>(config_.sh_threshold);
    }

    bool should_halve(size_t n) const {
        return n > 1 && n <= static_cast<size_t>(config_.sh_threshold);
    }

    const Config& config() const { return config_; }

private:
    Config config_;
    // NOTE: No internal state. Caller owns DLMStatsMap.
};

}  // namespace lloyal::eastwest_dlm
```

**Critical:** `steer_proposal()` takes `const PositionStats&`, NOT `DLMStatsMap&`. The caller does the key lookup:

```cpp
// CORRECT usage pattern
DLMPositionKey key{mask_state.hash(), position};
auto& pos_stats = stats[key];  // Caller does lookup
eastwest.steer_proposal(proposal, pos_stats, parent_visits, pos_visits, rng);
```

### D.5 Usage Pattern: Single Position (mirrors AR exactly)

```cpp
void steer_single_position(
    DLMEastWest& eastwest,
    DLMStatsMap& stats,              // Caller-owned
    const MaskState& state,
    size_t position,
    llama_token_data_array& logits,
    uint64_t base_seed
) {
    // 1. Build key (DLM-specific: uses mask_state_hash)
    DLMPositionKey key{state.hash(), position};

    // 2. Get position-aware RNG (identical to AR)
    auto rng = get_position_rng(base_seed, key.mask_state_hash, position);

    // 3. Build proposal set (identical to AR)
    auto proposal = eastwest.build_proposal_set(logits, legal_tokens, rng);

    // 4. Lookup stats for THIS position (caller does lookup, not EastWest)
    auto it = stats.find(key);
    if (it != stats.end() && it->second.total_visits >= eastwest.config().min_tokens_for_steering) {
        // 5. Steer with single position's stats (identical to AR)
        int parent_visits = /* from MCTS node */;
        int position_visits = it->second.total_visits;
        eastwest.steer_proposal(proposal, it->second, parent_visits, position_visits, rng);
    }

    // 6. Sample (identical to AR)
    llama_token token = eastwest.sample_from_proposal(proposal, temperature, rng);

    // 7. After oracle feedback, update stats (static method, identical pattern)
    float score = oracle(state, position, token);
    DLMEastWest::update(stats, key, token, score);
}
```

### D.6 Usage Pattern: Batch Steering (DLM convenience)

For efficiency, DLM callers may want to steer multiple positions. This is NOT a EastWest method — it's a caller-side loop:

```cpp
// Caller-side batch steering (NOT a EastWest method)
void steer_all_masked_positions(
    DLMEastWest& eastwest,
    DLMStatsMap& stats,              // Caller-owned
    const MaskState& state,
    std::vector<llama_token_data_array>& logits_per_position,
    const std::vector<size_t>& masked_positions,
    uint64_t base_seed
) {
    for (size_t i = 0; i < masked_positions.size(); ++i) {
        size_t pos = masked_positions[i];

        // Same single-position pattern, in a loop
        DLMPositionKey key{state.hash(), pos};
        auto rng = get_position_rng(base_seed, key.mask_state_hash, pos);

        auto it = stats.find(key);
        if (it == stats.end()) continue;
        if (it->second.total_visits < eastwest.config().min_tokens_for_steering) continue;

        // Build proposal from this position's logits
        auto proposal = eastwest.build_proposal_set(logits_per_position[i], legal_tokens, rng);

        // Steer with this position's stats
        eastwest.steer_proposal(proposal, it->second, parent_visits, it->second.total_visits, rng);

        // Write back to logits (or however caller wants to use steered proposal)
        apply_proposal_to_logits(logits_per_position[i], proposal);
    }
}
```

**Design choice:** Batch steering is caller-side, not a EastWest method. This keeps EastWest stateless and position-agnostic, matching AR EastWest exactly.

### D.7 Integration with MCTS (MEDAL-style)

MEDAL uses MCTS to optimize unmasking trajectory. EastWest informs action selection via steered priors.

**MEDAL Action:** `(position, token)` pair
**MEDAL State:** Current `MaskState`

```cpp
// EastWest informs UCB action selection
Action select_mcts_action(
    const MaskState& state,
    const DLMModel& model,
    DLMEastWest& eastwest,
    DLMStatsMap& stats,    // Caller-owned
    float cpuct,
    uint64_t base_seed
) {
    auto all_logits = model.forward(state);
    auto masked_positions = state.masked_positions();

    float best_ucb = -std::numeric_limits<float>::infinity();
    Action best_action;

    for (size_t pos : masked_positions) {
        DLMPositionKey key{state.hash(), pos};
        auto rng = get_position_rng(base_seed, key.mask_state_hash, pos);

        // Build proposal for this position
        auto proposal = eastwest.build_proposal_set(all_logits[pos], legal_tokens, rng);

        // Get stats for this position (may not exist)
        PositionStats* pos_stats = nullptr;
        auto it = stats.find(key);
        if (it != stats.end()) pos_stats = &it->second;

        for (auto [token, prior] : proposal) {
            float q = 0.0f;
            int n = 0;
            int N = 0;

            if (pos_stats) {
                auto q_it = pos_stats->token_q.find(token);
                if (q_it != pos_stats->token_q.end()) q = q_it->second;
                n = pos_stats->visits_for(token);
                N = pos_stats->total_visits;
            }

            // EastWest steers the PRIOR term, not Q
            // (maintains PUCT separation of concerns per §6.10)
            float steered_prior = prior;  // Already in proposal

            float ucb = q + cpuct * steered_prior * std::sqrt(N + 1) / (1 + n);

            if (ucb > best_ucb) {
                best_ucb = ucb;
                best_action = {pos, token};
            }
        }
    }

    return best_action;
}
```

### D.8 Q-Value Staleness (DLM-specific consideration)

In AR, Q-values for position P are captured with a fixed prefix and never revisited. In DLM, the context for position P changes as OTHER positions commit.

**Options:**

| Strategy      | Description                       | When to use                     |
| ------------- | --------------------------------- | ------------------------------- |
| **Exact key** | Key includes full mask state hash | Default; no staleness issue     |
| **Decay**     | Lookup prior states, apply decay  | Transfer learning across states |
| **Ignore**    | Use Q regardless of state changes | Fast, risky                     |

**Recommended:** Use exact `(mask_state_hash, position)` keys. Q-values from different mask states don't transfer directly. This matches AR behavior where `(prefix_hash, position)` is exact.

If transfer is desired, implement it caller-side:

```cpp
// Caller-side Q inheritance (optional, not in EastWest)
void inherit_q_values(
    DLMStatsMap& stats,
    const MaskState& old_state,
    const MaskState& new_state,  // After committing some positions
    float decay = 0.9f
) {
    for (size_t pos : new_state.masked_positions()) {
        DLMPositionKey old_key{old_state.hash(), pos};
        DLMPositionKey new_key{new_state.hash(), pos};

        auto it = stats.find(old_key);
        if (it == stats.end()) continue;

        // Copy with decay
        for (auto& [token, q] : it->second.token_q) {
            float decayed_q = q * decay;
            if (stats[new_key].token_q.find(token) == stats[new_key].token_q.end()) {
                stats[new_key].token_q[token] = decayed_q;
            }
        }
    }
}
```

### D.9 Oracle Patterns

Same oracle patterns as AR, but input is `MaskState` instead of prefix:

```cpp
// Token-level oracle
float oracle(const MaskState& state, size_t pos, llama_token candidate) {
    MaskState candidate_state = state;
    candidate_state.tokens[pos] = candidate;
    candidate_state.is_masked[pos] = false;
    return evaluate(candidate_state);  // Lint, type-check, etc.
}

// Rollout oracle (complete then evaluate)
float rollout_oracle(const MaskState& state, size_t pos, llama_token candidate, Model& model) {
    MaskState s = state;
    s.tokens[pos] = candidate;
    s.is_masked[pos] = false;

    auto completed = greedy_complete(s, model);
    return evaluate(completed);
}
```

### D.10 Worked Example

**Setup:** Dream 7B completing `def fib(n):`

```
Initial: def fib(n): [M] [M] [M] [M] [M]
                      0   1   2   3   4
```

**Step 1: Steer position 0**

```cpp
MaskState state = /* initial */;
DLMPositionKey key{state.hash(), 0};
auto rng = get_position_rng(seed, state.hash(), 0);

// Build proposal
auto proposal = eastwest.build_proposal_set(logits[0], legal, rng);
// proposal = [(if, 0.3), (return, 0.25), (for, 0.2), ...]

// Lookup stats (from prior runs)
auto& pos_stats = stats[key];
// pos_stats.token_q = {if: 0.8, for: 0.4}

// Steer
eastwest.steer_proposal(proposal, pos_stats, parent_visits, pos_stats.total_visits, rng);
// After steering: [(if, 1.5), (return, 0.25), (for, -0.6), ...]

// Sample
llama_token tok = eastwest.sample_from_proposal(proposal, temp, rng);
// tok = "if" (highest)
```

**Step 2: Commit, get oracle feedback, update**

```cpp
// Commit
state.tokens[0] = tok;
state.is_masked[0] = false;

// Oracle
float score = oracle(state, 0, tok);  // 0.85

// Update (static method)
DLMEastWest::update(stats, key, tok, score);
```

**Step 3:** Repeat for remaining positions with NEW `mask_state_hash`.

### D.11 Summary: What Changes vs AR

| Component              | AR                                           | DLM                                             |
| ---------------------- | -------------------------------------------- | ----------------------------------------------- |
| **PositionKey**        | `{prefix_hash, position}`                    | `{mask_state_hash, position}`                   |
| **Hash input**         | Tokens `[0..pos)`                            | Committed tokens + mask bitmap                  |
| **Positions per step** | 1                                            | 1-N (caller loops)                              |
| **EastWest class**     | `eastwest::EastWest`                         | `eastwest_dlm::DLMEastWest` (same impl)         |
| **PositionStats**      | Unchanged                                    | Unchanged                                       |
| **steer_proposal()**   | `const PositionStats&`                       | `const PositionStats&`                          |
| **update()**           | `static void update(StatsMap&, key, tok, q)` | `static void update(DLMStatsMap&, key, tok, q)` |
| **Config**             | Same                                         | Same                                            |
| **RNG pattern**        | Caller provides                              | Caller provides                                 |

**Everything else is identical.** The core steering algorithm, advantage computation, proposal sets, Gumbel sampling, Sequential Halving — all unchanged.

### D.12 Migration Checklist

1. ☐ Define `MaskState` with `hash()` method
2. ☐ Define `DLMPositionKey` using `mask_state_hash`
3. ☐ Define `DLMStatsMap` using `DLMPositionKey`
4. ☐ Update key construction: `{state.hash(), position}` instead of `{prefix_hash, position}`
5. ☐ Update RNG seed derivation to use `mask_state_hash`
6. ☐ Caller loops over masked positions (EastWest still single-position)
7. ☐ Core EastWest methods: **no changes needed**

---

## 16. Changelog

### v1.8.4 — Diffusion Language Model Support

**Informed by:** MEDAL (AWS AI Labs 2024), LLaDA, Dream 7B, DiffuCoder

**New appendix:**

- **Appendix D: Diffusion Language Model Support** — complete specification for DLM adaptation

**Design principle:** DLM EastWest follows AR EastWest patterns exactly:

- EastWest is **stateless** — holds only `Config`
- **Caller owns** the `DLMStatsMap` and does key lookups
- `steer_proposal()` takes `const PositionStats&` for a **single position**, not the whole map
- `update()` is **static** and takes `DLMStatsMap&` + key
- **RNG passed by caller** for determinism

**Core additions:**

- `MaskState` struct for representing partially-unmasked sequences
- `DLMPositionKey` with `mask_state_hash` instead of `prefix_hash`
- `DLMStatsMap` typedef using `DLMPositionKey`

**Key insight:** Only the position key representation changes. All EastWest methods have identical signatures:

- `build_proposal_set()` — unchanged
- `steer_proposal(proposal, const PositionStats&, ...)` — unchanged (caller does key lookup)
- `sample_from_proposal()` — unchanged
- `update(DLMStatsMap&, key, token, q)` — same pattern, different key type

**Caller-side patterns:**

- Single-position steering mirrors AR exactly
- Batch steering is a caller-side loop, not a EastWest method
- Q-staleness/inheritance is caller-side if needed

**Documentation:**

- AR vs DLM concept mapping table
- Complete usage patterns with correct EastWest API usage
- MCTS integration showing caller does key lookups
- Worked example: Fibonacci with Dream 7B
- Migration checklist

### v1.8.3 — Robustness Fixes

**Informed by external review**

**Title:**

- Updated to "EastWest: Position-Aware Token Steering for Oracle-Guided MCTS" — foregrounds key contribution

**Chunk Prior Definition (§6.10):**

- **Defined `node.prior` for chunk actions** — uses first-token prior only with explicit rationale
- Added comparison table: first-token vs geometric mean vs product
- Explains why first-token is sufficient for boundary-based search

**Implementation Warning (§6.10):**

- Added **defensive API naming guidance** to prevent oracle-infected priors
- Shows dangerous vs safe vs safest patterns for prior capture
- Emphasizes: capture p₀ BEFORE steering is possible

**Appendix C API Fix (Critical):**

- **Fixed RNG passing** — `build_proposal_set()`, `steer_proposal()`, and `sample_from_proposal()` now take `rng::Xoroshiro128Plus&` parameter matching §6.7/§6.14
- **Removed internal `rng_` member** — EastWest is now truly stateless; caller provides RNG for position-aware determinism (§6.12.1)
- **Removed `rng_base_seed` from EastWest::Config** — seed derivation is caller responsibility via `get_position_rng()`
- Added **Stateless Design** note explaining the pattern

**Performance Fix (§6.14):**

- **Replaced `std::sort` with `std::nth_element`** in `build_proposal_set()` — O(N) instead of O(N log N)
- Critical for open-vocabulary scenarios where `|legal| >> proposal_k` (e.g., 40k tokens)
- Proposal set elements don't need to be sorted, only partitioned into top-K vs tail

**Trace Emission Fix (§9.9.8):**

- **Added explicit `delta_logit` computation** to `eastwest_decide()` example
- Now populates the `delta_logit` field required for EastWest-head distillation training
- Also fixed: added `rng` parameter to match updated API signatures

**Worked Examples:**

- Updated **Appendix C** (TypeScript example) from v1.8 to v1.8.3 formulation — now uses expectation-weighted baseline, stddev normalization, and shows bidirectional σ(Q) with clamping

**Baseline & Normalization (§6.7, §6.7.1):**

- Changed Q baseline from arithmetic mean to **expectation-weighted baseline** under proposal distribution
- Changed normalization from **range** to **stddev** (more robust to outliers)
- Added `min_tokens_for_steering` — skip exploitation with sparse Q data (exploration only)

**Parameter Tuning:**

- Reduced `max_logit_perturbation` default from 5.0 to **2.5** (e^5 ≈ 148x is too aggressive)
- Added helper functions: `compute_baseline_q()`, `compute_q_stddev()`, `count_tokens_with_q()`

**Mandatory Tokens (§6.14):**

- Added `mandatory_tokens` parameter — always include EOS/EOG if legal
- Prevents infinite loops when oracle wants termination but EOS not in top-K

**Determinism (§6.12.1):**

- Added `rng_base_seed` parameter for reproducible exploration
- Added `get_position_rng()` with deterministic seed derivation
- Enables reproducible runs for testing and evaluation

**Deterministic Sampling Module (§6.4.2):**

- **Architecture:** Split into `eastwest::rng` (pure RNG) and `eastwest::sampler` (free functions)
- Added `Xoroshiro128Plus` RNG — matches TypeScript implementation for cross-platform determinism
- **Replaced all `std::*_distribution`** with explicit implementations (C++ distributions are impl-defined)
- RNG class only produces random bits; distribution sampling is via `eastwest::sampler::` free functions
- Added `uniform_open_01()` — (0,1) interval to prevent log(0) in Gumbel sampling
- Added `sampler::gumbel()` — inverse CDF method `-log(-log(u))` (textbook, matches Danihelka 2022)
- Added `sampler::gamma()` — Marsaglia-Tsang method (2000), enables Dirichlet without platform deps
- Added `sampler::dirichlet()` — AlphaZero-style root noise (Silver 2018), fully deterministic
- Added `sampler::categorical()` — explicit endpoint rules (strict `<`, first match wins)
- Added `sampler::gumbel_top_k()` — Kool et al. 2019, replaces rejection sampling for tail exploration
- **Papers specify distributions, not RNG implementations** — our explicit versions _improve_ reproducibility
- Documented cross-platform caveats (libm variance) and mitigation options

**Citation Fixes (§6.14):**

- Clarified that **DExperts** (not FUDGE) is the source for tail reintroduction
- FUDGE: "filter-then-steer" pattern
- DExperts: truncation + tail reintroduction

**Documentation & Design Rationale:**

- Added **Max vs Mean Q storage** design rationale (§6.4) — documents deliberate choice for deterministic oracles
- Expanded **Oracle-Infected Priors** warning (§6.10) — explains PUCT separation of concerns
- Added **MCTS Integration** checklist items — verification for clean prior/value separation
- Added **Future Considerations** section (§13.1) — KL budget, adaptive tail, UCB-style Q, MCTS notes
- Unified **PositionStats** between §6.4 and Appendix C — removed vestigial methods
- Updated **Algorithm Pseudocode** (§6.0) to v1.8.3 proposal-based approach
- Updated **Worked Examples** (Appendix A) to show expectation-weighted baseline

**Training Data Extraction (§9.9):**

- Added **zero marginal cost** training signal harvesting from MCTS runs
- Defined data formats: SFT pairs, DPO triples, token-level rewards
- Added harvesting hooks for the MCTS loop
- Defined quality filters: hard negative mining, diversity sampling, confidence weighting
- Documented continuous adaptation pipeline (auto-tune on oracle updates)
- Described self-improvement loop (better model → better EastWest → better data → better model)

**Trace Logging for Expert Iteration (§6.4.1, §9.9.8):**

- Added `EastWestTrace` struct capturing full decision context
- Added `TraceCallback` and `enable_tracing` config options
- Defined fields for policy distillation, Q-head training, and off-policy learning
- Documented `behavior_prob` for propensity scoring (Swaminathan & Joachims 2015)
- Added DAgger-style distribution shift mitigation guidance
- Added references: Expert Iteration, DAgger, Counterfactual Risk Minimization
- Added `OracleResult` struct with **versioning** (`tool_version`, `config_hash`) for data staleness detection
- Added `SamplingConfig` struct for **full reproducibility** of decisions
- Added `delta_logit` field for **EastWest-head distillation** (explicit steering signal)
- Updated JSON trace format with expanded example showing all fields
- Added `RunFingerprint` struct for **environment fingerprinting** (model hash, tokenizer hash, engine version)
- Added `trace_schema_version` for **forward compatibility**
- Added `workspace_revision` + `deps_lock_hash` for **workspace-level staleness** detection
- Added **trace invariants** validation function (`validate_trace()`)
- Added `diagnostics_hash` **normalization note** (strip paths/line numbers for meaningful dedup)

### v1.8.2 — Production Hardening

**Informed by prior art review:** PPLM, GeDi, DExperts, FUDGE

**New sections:**

- §6.7.1: **Advantage Formulation** — σ(Q) uses `(Q - Q_mean)` for symmetric push/pull (DExperts-inspired)
- §6.14: **Candidate Set Construction** — two-stage filtering bounds compute to `proposal_k` tokens
- §6.13: **EastWest API** — consolidated interface table

**New parameters:**

- `max_logit_perturbation` — clamps σ(Q) magnitude to prevent degeneration (PPLM lesson)
- `proposal_k`, `exploration_tail`, `tail_temperature` — candidate set control

**API changes (breaking):**

- Removed `SteerCallback` / `build_gumbel_steer()` / `steer_for_position()` — old O(vocab) callback pattern
- Added `build_proposal_set()` — builds bounded candidate set from unsteered logits
- Added `steer_proposal()` — steers proposal in-place, O(proposal_k)
- Added `sample_from_proposal()` — samples from steered proposal
- Updated §6.6, §6.7, §6.8 to use proposal-based pattern throughout

**Algorithm changes:**

- σ(Q) now ranges [-max_perturbation, +max_perturbation] instead of [0, +∞)
- Steering operates on bounded proposal set instead of full legal set
- Low-Q tokens are actively pushed DOWN, not just "boosted less"
- Complexity: O(proposal_k) per position, not O(vocab)

### v1.8.1 — EastWest Branding

- Renamed specification to "EastWest: Position-Aware Token Steering for Oracle-Guided MCTS"
- Added EastWest to terminology (preamble)
- Added EastWest component annotations to §6.4, §6.7, §6.9
- Added §9.8: Beyond MCTS (future integration patterns)
- Added Appendix C: `eastwest.hpp` interface
- No algorithm changes from v1.8
