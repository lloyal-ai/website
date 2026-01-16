# Compass/NorthSouth Spec v0.1.3 (Online Learner for Revision Action Priors)

**Status:** Draft (engineering-ready, normative)
**Supersedes:** `northsouth-spec-0.1.2.md`
**Depends on (canonical source of truth):** `compass-spec-3.1.1`
**Infrastructure dependencies:** `immer-zipper v2.0+`, `DocumentStore`
**Non-goal:** This spec MUST NOT redefine Compass "moves" (action space, strategies, buckets, or execution ordering).

---

## 0. What Changed from 0.1.2

| Change                    | 0.1.2              | 0.1.3                                      |
| ------------------------- | ------------------ | ------------------------------------------ |
| Dependency                | compass-spec-3.1.0 | compass-spec-3.1.1                         |
| Cross-query transfer      | Not specified      | §5.2: Embedding-based prior initialization |
| Cross-session persistence | Not specified      | §5.3: Disk persistence and rehydration     |
| Infrastructure            | Implicit           | §13: Explicit infrastructure requirements  |
| DocumentStore integration | Not mentioned      | §5.4: DocumentStore keying contract        |
| Merkle signatures         | Implicit           | §5.1.1: Content-addressable signatures     |

---

## 1. Purpose

NorthSouth is an online learner that provides **contextual priors** over Compass's **HorizonSearch action space**.

It answers: "Given this context, which strategic rollback+strategy action tends to produce better patches?"

NorthSouth is intentionally "dumb" about engine physics: it does not own lease/rehydration, boundaries, or generation ordering. It only outputs a distribution over actions that Compass already defines.

**Mode applicability:** NorthSouth operates in **Induct mode only**. In Conduct mode (§11.2), HorizonSearch is disabled and NorthSouth is not invoked.

**Learning scope (3.1.3):** NorthSouth supports three learning scopes:

1. **Within-query:** Learning across checkpoint revisits (default, always enabled)
2. **Cross-query:** Transfer via embedding similarity (requires DocumentStore)
3. **Cross-session:** Persistent learning via disk storage (requires DocumentStore + persistence)

---

## 2. What NorthSouth does (and does not do)

### 2.1 Does

- Consumes Compass-defined actions (`HorizonPolicyAction`), treated as **opaque items** in an action list.
- Computes a **prior distribution** `π(a|ctx)` over those actions.
- Updates its estimates after each evaluated expansion using the oracle-composed value.
- **(NEW)** Initializes priors from similar documents via embedding lookup.
- **(NEW)** Persists learned stats to disk for cross-session transfer.

### 2.2 Does not

- Does **not** define `StrategyId`.
- Does **not** define rollback buckets or their boundaries.
- Does **not** define execution semantics (pin/rehydrate/inject/generate order).
- Does **not** modify PUCT priors `P₀` (Compass guardrail, §8.4).
- Does **not** own the embedding model or similarity computation (DocumentStore provides this).

All of the above are owned by the Compass spine (`compass-spec-3.1.1`):

- StrategyId: §12.1
- RollbackBucket / HorizonPolicyAction: §9.1
- Bucketization and realization: §9.1
- Canonical expansion loop: §11.1

---

## 3. Action space (imported from Compass) — **Source of Truth Fix**

NorthSouth MUST treat the action space as **owned and legislated by Compass**.

### 3.1 Compass is the legislator

Compass defines:

- `StrategyId` (§12.1)
- `RollbackBucket` (§9.1)
- `HorizonPolicyAction` (§9.1)
- Bucketization and realization rules (§9.1)
- Canonical expansion loop (§11.1)

NorthSouth MUST NOT re-specify these, even "for convenience".

### 3.2 ActionSpaceDescriptor (required integration boundary)

Compass/Core MUST provide NorthSouth an **ActionSpaceDescriptor** (or exact equivalent) whenever NorthSouth is asked for priors:

- `action_space_hash`: stable identifier for the current action space (strategies + bucket definitions + canonical ordering policy)
- `actions`: the **canonical ordered list** of `HorizonPolicyAction`

Normative sketch:

```cpp
struct ActionSpaceDescriptor {
  uint64_t action_space_hash;
  std::vector<compass::HorizonPolicyAction> actions; // canonical order
};
```

### 3.3 NorthSouth as observer: indexing and stability

NorthSouth MUST operate on **indices into `actions`**, not on a locally-defined enum.

- `ActionIndex i` is the index into `descriptor.actions`.
- Stats are keyed by `(context_key, action_space_hash, ActionIndex)`.

This makes NorthSouth resilient: if Compass changes buckets (e.g. `{2,3}` → `{2,5}`), NorthSouth doesn't "silently break"; it just sees a different `action_space_hash` and a new action list.

### 3.4 Mismatch / evolution rules (required)

If `action_space_hash` differs from what NorthSouth has seen for that `context_key`:

NorthSouth MUST choose one of these safe behaviors (product-defined, but MUST be deterministic):

1. **Hard reset per context:** drop stats for that context_key and reinitialize for the new action list (recommended).
2. **Best-effort migration:** if Compass provides per-action stable keys, migrate matching actions by key and reset unknown ones.

NorthSouth MUST NOT attempt to "guess" missing actions or assume old indices still apply.

---

## 4. Probe injection ("semantic intent actuator") — owned by Compass

NorthSouth selects a `StrategyId`. The **implementation of that strategy** (probe prefix text, grammar preference) is defined and executed by Compass (see `compass-spec-3.1.1` §12.2 and §11.1).

NorthSouth MUST NOT maintain a probe table as a second legislator.

### 4.1 Why strategies still belong in NorthSouth's learning model

Even though NorthSouth doesn't implement probes, it still learns the utility of the _intent_:

- Critique tends to help on factual tasks with weak grounding.
- Debug tends to help on code tasks with executable Tier-1 oracles.
- AdmitUncertainty tends to be correct/cheap in low-information settings.

NorthSouth learns _when_ these intents are useful; Compass defines _how_ they are realized.

---

## 5. Context key (what the bandit conditions on)

NorthSouth conditions on a context signature derived from the committed semantic state and request metadata.

### 5.1 Context hash derivation (aligned with §14.2)

The context key MUST be derived from the checkpoint's committed semantic identity:

```cpp
struct NSContextKey {
  uint64_t document_root_signature;  // from Checkpoint (§5.1) — merkle hash
  uint64_t doc_path_hash;            // hash of zipper focus path
  uint32_t domain_tag;               // task/domain classification
};

uint64_t context_hash(CheckpointId s, const CheckpointGraph& graph) {
  const Checkpoint& cp = graph.get(s);
  uint64_t h = cp.document_root_signature;
  h = hash_combine(h, hash(cp.doc_path));
  return h;
}
```

**Note:** `document_root_signature` is the canonical semantic identity (see §5.1, Appendix F). With content-addressable storage (§5.1.1), this is the merkle root hash.

`doc_path_hash` SHOULD be computed from the zipper breadcrumb path (stable under structural sharing).

#### 5.1.1 Content-addressable signatures (normative)

When DocumentStore uses merkle-style content addressing:

```cpp
// document_root_signature = merkle root of committed content
// Same content → same signature → same NorthSouth stats

uint64_t compute_merkle_signature(const imz::Zipper<Node>& zipper) {
  // Zipper commit_id is monotonic but not content-based
  // Need merkle hash of actual content tree
  return merkle_hash(zipper.focus(), zipper.focus_path_indices());
}
```

**Implication:** Two queries producing identical committed content at any checkpoint share the **same** `document_root_signature` and thus the **same** NorthSouth stats. This enables automatic deduplication of learned priors.

### 5.2 Embedding-based prior initialization (normative)

When a persistent DocumentStore is available with embedding index:

#### 5.2.1 Similarity lookup on new context

On first encounter of an unseen `NSContextKey`:

```cpp
struct SimilarDocumentHit {
  DocumentId doc_id;
  float similarity;                    // cosine similarity of prompt embeddings
  NSStats stats;                       // persisted NorthSouth stats
  uint64_t document_root_signature;    // for provenance tracking
};

std::vector<SimilarDocumentHit> lookup_similar(
  const PromptEmbedding& query_embedding,
  float similarity_threshold,          // default: 0.85
  size_t max_hits                       // default: 5
);
```

#### 5.2.2 Prior blending (normative)

When similar documents are found, initialize the new context's prior as a weighted blend:

```cpp
NSStats initialize_from_similar(
  const std::vector<SimilarDocumentHit>& hits,
  const ActionSpaceDescriptor& as,
  float similarity_threshold = 0.85f
) {
  NSStats blended;
  blended.visits.resize(as.actions.size(), 0);
  blended.q_mean.resize(as.actions.size(), q_init);

  float total_weight = 0.0f;

  for (const auto& hit : hits) {
    if (hit.similarity < similarity_threshold) continue;

    float weight = hit.similarity;  // or hit.similarity^2 for sharper weighting
    total_weight += weight;

    for (size_t i = 0; i < as.actions.size(); ++i) {
      if (hit.stats.visits[i] > 0) {
        blended.q_mean[i] += weight * hit.stats.q_mean[i];
      } else {
        blended.q_mean[i] += weight * q_init;
      }
    }
  }

  if (total_weight > 0) {
    for (size_t i = 0; i < as.actions.size(); ++i) {
      blended.q_mean[i] /= total_weight;
    }
    // Mark as warm-started for telemetry
    blended.warm_started = true;
    blended.warm_start_weight = total_weight;
  }

  return blended;
}
```

#### 5.2.3 Fallback hierarchy (normative)

Prior initialization MUST follow this fallback chain:

1. **Exact signature match:** If `NSContextKey` exists in stats store, use it directly.
2. **Embedding similarity:** If DocumentStore has similar documents (similarity > τ), blend priors.
3. **Domain default:** If domain_tag has aggregate stats, use domain prior.
4. **Cold start:** Use uniform prior with `q_init`.

```cpp
NSStats get_or_initialize_stats(
  const NSContextKey& key,
  const ActionSpaceDescriptor& as,
  const DocumentStore& store,
  const PromptEmbedding& prompt_embedding
) {
  // 1. Exact match
  if (auto existing = stats_store_.find(key)) {
    return *existing;
  }

  // 2. Embedding similarity
  auto similar = store.lookup_similar(prompt_embedding, similarity_threshold_, max_similar_hits_);
  if (!similar.empty()) {
    return initialize_from_similar(similar, as);
  }

  // 3. Domain default
  if (auto domain_stats = domain_stats_.find(key.domain_tag)) {
    return *domain_stats;
  }

  // 4. Cold start
  return NSStats::cold_init(as.actions.size());
}
```

### 5.3 Disk persistence and rehydration (normative)

NorthSouth stats MUST be persistable to enable cross-session learning.

#### 5.3.1 Persistence contract

```cpp
struct NSPersistenceRecord {
  NSContextKey context_key;
  uint64_t action_space_hash;
  NSStats stats;
  uint64_t last_updated_ms;           // timestamp for staleness
  uint32_t total_expansions;          // for confidence weighting
};

// Persistence interface
class NSPersistence {
public:
  virtual void persist(const NSPersistenceRecord& record) = 0;
  virtual std::optional<NSPersistenceRecord> load(const NSContextKey& key) = 0;
  virtual std::vector<NSPersistenceRecord> load_by_domain(uint32_t domain_tag) = 0;
  virtual void evict_stale(uint64_t max_age_ms) = 0;
};
```

#### 5.3.2 Persistence triggers (recommended)

- **On document completion:** Persist all checkpoint stats for the completed document.
- **On session end:** Persist all dirty stats.
- **Periodic flush:** Every N expansions or M seconds (product-defined).

#### 5.3.3 Rehydration on startup

On system startup or document load:

```cpp
void rehydrate_from_persistence(
  const DocumentStore& store,
  NSPersistence& persistence
) {
  for (const auto& doc : store.list_documents()) {
    auto records = persistence.load_by_document(doc.id);
    for (const auto& record : records) {
      stats_store_[record.context_key] = record.stats;
    }
  }
}
```

### 5.4 DocumentStore keying contract (normative)

NorthSouth depends on DocumentStore for cross-query transfer. The keying contract:

```cpp
struct DocumentKey {
  uint64_t prompt_hash;               // hash of prompt text
  PromptEmbedding prompt_embedding;   // vector embedding for similarity
};

struct DocumentRecord {
  DocumentKey key;
  uint64_t zipper_root_signature;     // merkle root of document tree
  std::vector<CheckpointMeta> checkpoints;
  std::unordered_map<NSContextKey, NSStats> northsouth_stats;
  uint64_t created_at_ms;
  uint64_t last_accessed_ms;
};
```

**Keying requirements:**

1. **prompt_hash:** Deterministic hash of prompt text for exact-match lookup.
2. **prompt_embedding:** Dense vector from embedding model for similarity lookup.
3. **zipper_root_signature:** Merkle hash of document tree (from immer-zipper).

**Similarity index requirements:**

- MUST support approximate nearest neighbor (ANN) lookup on prompt_embedding.
- MUST return top-k results with similarity scores.
- SHOULD use cosine similarity (or dot product on normalized vectors).
- MAY use HNSW, IVF, or other ANN index structures.

---

## 6. ExpansionSite interaction (3.1.1 alignment)

NorthSouth's action selection participates in **ExpansionSite** creation (§8.5).

### 6.1 Action → Site mapping

When NorthSouth samples an action `a = (strategy, rollback_bucket)`:

1. The action determines `rollback_depth_exact` via blame-pressure realization (§9)
2. This determines the `base_checkpoint`
3. The `PrefixPlanSignature` is computed from `(strategy → probe_signature, coat_signature, constraint_grammar_signature)`
4. This signature determines which **ExpansionSite** at `base_checkpoint` to select or create

NorthSouth influences **which site gets traffic**, but does not influence `P₀` within a site (§8.4 guardrail).

### 6.2 Learning signal flow (from §8.10)

```
NorthSouth samples action (strategy, rollback)
       ↓
Compute PrefixPlanSignature → select/create site u
       ↓
Generate under site u → ArmKey → commit child c
       ↓
Child gets P₀(c|u) from base model (not NorthSouth)
       ↓
Oracle evaluate → value
       ↓
   ┌────┴────┐
   │         │
Backprop   NorthSouth update
   │         │
W(u,c) +=  Learns: context + action → reward
value      (does NOT change P₀ of existing edges)
```

---

## 7. Statistics stored

NorthSouth stores both optimistic and stable estimates for each `(ctx, action_space_hash, action_index)`.

Recommended structure:

```cpp
struct NSStats {
  uint32_t total_visits = 0;

  // per-action
  std::vector<uint32_t> visits;  // size = |actions|
  std::vector<float>    q_mean;  // stable estimate
  std::vector<float>    q_max;   // optimistic (optional)

  // warm-start metadata (§5.2)
  bool warm_started = false;
  float warm_start_weight = 0.0f;
  std::vector<uint64_t> warm_start_sources;  // document IDs that contributed
};
```

Implementation notes:

- Store `NSStats` inside a map keyed by `(NSContextKey, action_space_hash)`.
- When the action space changes, resize vectors to `|actions|` and apply the mismatch policy (§3.4).

Default: use `q_mean` for exploitation; keep `q_max` optional for telemetry / optimistic mode.

---

## 8.

(decay lives here)

NorthSouth produces a log-prior for each action index `i` in the provided `descriptor.actions`.

### 8.1 Core equation

For each action `i`:

- `a_i = descriptor.actions[i]`

Compute:

- `Q(i) = q_mean[i]` if visits exist else `q_init`
- `z(i)` is a z-score style normalization of `Q(i)` over all actions (robust stats recommended)
- `p_blame(bucket(a_i))` is derived from Compass blame gradient mapping (§10)

Then:

```
logπ(i) =
    w_ns    * clamp( c_scale * z(i) * β(Nctx), ±max_perturb )
  + w_blame * log( p_blame(bucket(a_i)) + ε )
  + Gumbel(0,1) * α_local(Ni) * α_ctx(Nctx)
```

And:

```
π = softmax(logπ)
```

Where:

- `Ni = visits[i]`
- `Nctx = total_visits`
- `β(Nctx)` is a confidence schedule (increases as context gets more data)
- `α_local`, `α_ctx` decay exploration noise as evidence accumulates

### 8.2 Distribution stats (robustness)

Compute `μ` and `sd` over actions using `Q(i)`:

- `sd_floor` MUST be non-trivial (e.g., 0.05) to avoid bang-bang behavior on cold start.
- Clamp `z(i)` to avoid extreme priors due to a single lucky sample.

### 8.3 Action-space independence invariant (normative)

The prior computation MUST only require:

- `descriptor.actions[i]` (opaque action)
- `bucket(a_i)` (read-only field access)
- optional `strategy(a_i)` (read-only field access)

It MUST NOT assume specific bucket boundaries beyond what is encoded in the action itself.

### 8.4 Warm-start confidence adjustment (normative)

When stats are warm-started from similar documents (§5.2):

```cpp
// Reduce confidence proportional to similarity distance
float effective_visits = stats.total_visits;
if (stats.warm_started) {
  // Warm-started stats count as fractional visits
  effective_visits = stats.total_visits * stats.warm_start_weight;
}

// Use effective_visits in β(Nctx) and α_ctx(Nctx) computations
```

This ensures warm-started priors are treated as "informed guesses" ratherополнит than "ground truth."

---

## 9. Execution semantics — owned by Compass (pointer only)

NorthSouth does **not** apply actions.

Compass applies actions via the canonical HorizonSearch loop (`compass-spec-3.1.1` §11.1), including:

- bucket realization into exact rollback depth
- leasing/rehydration
- probe injection and grammar management
- CoAT lifecycle phase
- generation until boundary commit
- oracle evaluation and backprop

NorthSouth's only runtime obligation: supply `π(i)` over the provided action list.

---

## 10. Blame gradient (targeted revision pressure)

NorthSouth can bias toward deeper rollbacks when the trunk shows "damage" concentrated earlier.

### 10.1 Blame mass over trunk checkpoints

Let trunk checkpoints be `C0..Ck` where `Ck` is tip.

Define:

- `V*(Ci)` = value of trunk state after checkpoint `Ci` (measured/estimated)
- `b_i = max(0, V*(Ci) - V*(Ci+1))`
- `p_blame(i) = normalize(b_i)`

### 10.2 Mapping blame mass to rollback buckets (action-space compliant)

Given an action `a` with bucket `[min_depth, max_depth]` measured in checkpoints:

- The bucket covers depths `d` in `[min_depth, max_depth]`
- Depth `d` corresponds to trunk index `k - d`

Then:

- `p_blame(bucket(a)) = sum_{d in bucket(a)} p_blame(k - d)`

This uses bucket definitions _only as provided by Compass in the action list_.

---

## 11. Update rule

On each evaluated expansion, Compass reports:

- `ctx_key`
- `action_space_hash`
- `action_index i`
- observed scalar value `Q_hat` (post tiered oracle composition)
- optional metadata: whether Tier-1 passed, rollback depth realized, etc.

NorthSouth updates:

- `visits[i] += 1`
- `total_visits += 1`
- `q_mean[i] = (1-η)*q_mean[i] + η*Q_hat` (or running mean)
- `q_max[i] = max(q_max[i], Q_hat)` (optional)

Decay / forgetting:

- Apply context-level or action-level decay to avoid stale priors dominating forever (product-defined).

### 11.1 Domain stats aggregation (optional)

For domain-level fallback (§5.2.3), aggregate stats across contexts:

```cpp
void update_domain_stats(uint32_t domain_tag, size_t action_index, float value) {
  auto& domain = domain_stats_[domain_tag];
  domain.visits[action_index] += 1;
  domain.total_visits += 1;

  float η_domain = 0.01f;  // Slower learning rate for domain aggregates
  domain.q_mean[action_index] =
    (1 - η_domain) * domain.q_mean[action_index] + η_domain * value;
}
```

---

## 12. Telemetry (needed because rollback is explicit)

NorthSouth SHOULD emit:

- action_space_hash changes encountered (rate, contexts affected)
- per-context entropy of `π` (exploration vs collapse)
- regret-ish signals: improvement of chosen actions over baseline
- correlation between blame pressure and chosen rollback buckets
- stratified metrics by strategy id (from `a_i.strategy`)
- **(NEW)** warm-start rate: fraction of contexts initialized via similarity
- **(NEW)** warm-start effectiveness: performance delta vs cold start
- **(NEW)** cross-session hit rate: fraction of contexts with persisted priors

This helps detect:

- healthy exploration vs thrash
- mismatch bugs (wrong index mapping)
- action space drift
- **(NEW)** embedding model quality issues
- **(NEW)** persistence staleness problems

---

## 13. Infrastructure Requirements (normative)

NorthSouth depends on external infrastructure for full functionality.

### 13.1 immer-zipper (required)

**Minimum version:** 2.0

NorthSouth relies on immer-zipper for:

| Feature                 | Usage in NorthSouth       | immer-zipper API                 |
| ----------------------- | ------------------------- | -------------------------------- |
| Document state identity | `document_root_signature` | `commit_id()` + merkle extension |
| Navigation path         | `doc_path_hash`           | `focus_path_indices()`           |
| Snapshot restoration    | Checkpoint rollback       | `restore(snapshot_id)`           |
| State comparison        | Change detection          | `diff_between(from, to)`         |
| Branching               | Alternative exploration   | `branch(name)`, `checkout(name)` |

**Required extensions (not in base immer-zipper 2.0):**

```cpp
// Merkle-style content-addressable hashing
uint64_t merkle_root_signature(const Zipper<T>& z);

// Disk persistence
void persist_to_disk(const Zipper<T>& z, const std::filesystem::path& path);
Zipper<T> rehydrate_from_disk(const std::filesystem::path& path);
```

### 13.2 DocumentStore (required for cross-query transfer)

DocumentStore provides the embedding index and persistence layer.

**Required interface:**

```cpp
class DocumentStore {
public:
  // Document lifecycle
  DocumentId create_document(const DocumentKey& key);
  std::optional<DocumentRecord> get_document(DocumentId id);
  void update_document(DocumentId id, const DocumentRecord& record);

  // Embedding-based similarity lookup
  std::vector<SimilarDocumentHit> lookup_similar(
    const PromptEmbedding& query,
    float similarity_threshold,
    size_t max_results
  );

  // Persistence
  void persist();
  void load();

  // Iteration
  std::vector<DocumentId> list_documents();
  std::vector<DocumentId> list_documents_by_domain(uint32_t domain_tag);
};
```

**Index requirements:**

| Index Type                     | Purpose                  | Implementation Guidance   |
| ------------------------------ | ------------------------ | ------------------------- |
| Primary (prompt_hash)          | Exact lookup             | Hash map                  |
| Embedding (prompt_embedding)   | Similarity search        | HNSW, IVF, or similar ANN |
| Domain (domain_tag)            | Domain-level aggregation | B-tree or sorted index    |
| Merkle (zipper_root_signature) | Content deduplication    | Hash map                  |

### 13.3 Embedding Model (required for cross-query transfer)

An embedding model is required to compute `PromptEmbedding` vectors.

**Requirements:**

- Output dimension: 384-1536 (product-defined)
- Similarity metric: Cosine similarity (normalized vectors)
- Latency: < 10ms per embedding (for interactive use)
- Determinism: Same input MUST produce same embedding

**Recommended models (edge-deployable):**

| Model            | Dimensions | Size  | Notes              |
| ---------------- | ---------- | ----- | ------------------ |
| all-MiniLM-L6-v2 | 384        | 80MB  | Fast, good quality |
| bge-small-en     | 384        | 130MB | Better quality     |
| gte-small        | 384        | 60MB  | Efficient          |
| nomic-embed-text | 768        | 550MB | High quality       |

### 13.4 Persistence Backend (required for cross-session transfer)

Disk persistence for NorthSouth stats.

**Requirements:**

- Atomic writes (crash safety)
- Key-value or document storage
- Support for range queries (by domain_tag)
- Configurable eviction policy

**Recommended backends:**

| Backend    | Use Case        | Notes                     |
| ---------- | --------------- | ------------------------- |
| SQLite     | Single-device   | ACID, widely supported    |
| RocksDB    | High-throughput | LSM-tree, good for writes |
| LMDB       | Read-heavy      | Memory-mapped, fast reads |
| JSON files | Development     | Simple, human-readable    |

**Schema (SQLite example):**

```sql
CREATE TABLE northsouth_stats (
  context_key_hash INTEGER PRIMARY KEY,
  document_root_signature INTEGER NOT NULL,
  doc_path_hash INTEGER NOT NULL,
  domain_tag INTEGER NOT NULL,
  action_space_hash INTEGER NOT NULL,
  stats_blob BLOB NOT NULL,  -- serialized NSStats
  last_updated_ms INTEGER NOT NULL,
  total_expansions INTEGER NOT NULL,

  -- Indices for lookup
  INDEX idx_domain (domain_tag),
  INDEX idx_document (document_root_signature),
  INDEX idx_updated (last_updated_ms)
);

CREATE TABLE document_embeddings (
  document_id INTEGER PRIMARY KEY,
  prompt_hash INTEGER NOT NULL UNIQUE,
  prompt_embedding BLOB NOT NULL,  -- float32 array
  zipper_root_signature INTEGER NOT NULL,
  domain_tag INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL,
  last_accessed_ms INTEGER NOT NULL,

  INDEX idx_domain (domain_tag),
  INDEX idx_merkle (zipper_root_signature)
);
```

### 13.5 Component Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                        NORTHSOUTH                                │
│                                                                  │
│  ┌─────────────────┐      ┌─────────────────┐                   │
│  │  Prior Computer │◄─────│  Stats Store    │                   │
│  └────────┬────────┘      └────────┬────────┘                   │
│           │                        │                             │
│           │    ┌───────────────────┤                             │
│           │    │                   │                             │
│           ▼    ▼                   ▼                             │
│  ┌─────────────────┐      ┌─────────────────┐                   │
│  │ ActionSpace     │      │  Persistence    │                   │
│  │ Descriptor      │      │  Backend        │                   │
│  └────────┬────────┘      └────────┬────────┘                   │
│           │                        │                             │
└───────────│────────────────────────│─────────────────────────────┘
            │                        │
            │                        │
┌───────────▼────────────────────────▼─────────────────────────────┐
│                       DOCUMENT STORE                              │
│                                                                   │
│  ┌─────────────────┐      ┌─────────────────┐                    │
│  │ Embedding Index │      │ Document Records│                    │
│  │ (ANN lookup)    │      │ (merkle roots)  │                    │
│  └────────┬────────┘      └────────┬────────┘                    │
│           │                        │                              │
└───────────│────────────────────────│──────────────────────────────┘
            │                        │
            │                        │
┌───────────▼────────────────────────▼──────────────────────────────┐
│                       IMMER-ZIPPER v2.0+                          │
│                                                                   │
│  ┌─────────────────┐      ┌─────────────────┐                    │
│  │ Zipper Core     │      │ Merkle Extension│                    │
│  │ (navigation,    │      │ (content-addr,  │                    │
│  │  snapshots)     │      │  persistence)   │                    │
│  └─────────────────┘      └─────────────────┘                    │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 14. References (probe prior art)

- Budget forcing / "Wait," self-correction prompting (Simple Test-Time Scaling / "s1"-style ideas).
- Chain-of-Verification style verification prompting.
- Self-debugging / execution simulation prompting.
- Tree-of-Thoughts (explicit alternative/diversity operator).

(Kept as rationale; Compass remains the implementation authority for probes.)

---

## Appendix A — Configuration Defaults

| Parameter                | Default   | Description                            |
| ------------------------ | --------- | -------------------------------------- |
| `similarity_threshold`   | 0.85      | Minimum cosine similarity for transfer |
| `max_similar_hits`       | 5         | Maximum similar documents to blend     |
| `q_init`                 | 0.5       | Initial Q estimate for cold start      |
| `η`                      | 0.1       | Learning rate for q_mean updates       |
| `η_domain`               | 0.01      | Learning rate for domain aggregates    |
| `stale_threshold_ms`     | 604800000 | 7 days before stats considered stale   |
| `max_persisted_contexts` | 10000     | Per-domain cap on persisted stats      |

---

## Appendix B — Migration from 0.1.2

Existing NorthSouth implementations can adopt 0.1.3 incrementally:

1. **Phase 1 (minimal):** Continue using exact-match context keys. No changes required.
2. **Phase 2 (embedding):** Add DocumentStore integration for similarity lookup.
3. **Phase 3 (persistence):** Add disk persistence for cross-session transfer.

Each phase is independently valuable:

- Phase 1: Within-query learning (existing)
- Phase 2: Cross-query transfer (new)
- Phase 3: Cross-session transfer (new)

## Appendix C — Empirical Foundation: Prefix Conditioning and Trajectory Divergence

This appendix establishes the mechanistic basis for NorthSouth's probe selection strategy. The core assumption — that different probe prefixes cause autoregressive generation to diverge into semantically distinct trajectories suitable for MCTS evaluation — is validated by recent mechanistic interpretability research.

---

### C.1 The Core Claim

**NorthSouth assumes:** Injecting different probes (Continue, Critique, Alternative, Debug, AdmitUncertainty) from the same checkpoint causes the model to generate into _semantically distinct_ regions of output space, producing meaningfully different branches for PUCT evaluation.

**What must be true for this to work:**

1. Prefix text shifts the model's internal representations
2. The shift causes divergent generation trajectories
3. Divergence is semantic (different meanings), not just surface (different wording)
4. Divergence is rapid and non-recoverable (trajectories don't reconverge)

All four are established by the literature below.

---

### C.2 Mechanistic Evidence

#### C.2.1 Prompts Create Steering Vectors in Activation Space

The Linear Representation Hypothesis (Park et al., ICML 2024) proves that high-level concepts are encoded as **linear directions** in transformer representation space. Prompt conditioning operates by shifting activations along these directions.

**In-Context Vectors** (Liu et al., ICML 2024) demonstrated this directly: in-context learning effects can be extracted as a single vector (ΔH = H(y) - H(x) from demonstration pairs) and reapplied without the original prompt. Similarly, **Function Vectors** (Todd et al., 2023) found that task specifications like "antonym generation" compress into additive vectors that transfer across unrelated contexts.

**Implication for NorthSouth:** Probes work by nudging activations toward pre-existing computational subspaces. "Critique" activates critique-related directions; "Alternative" activates alternative-generation directions. These are geometrically distinct in activation space.

> **Citation:** Park, K., Choe, Y. J., & Veitch, V. (2024). The Linear Representation Hypothesis and the Geometry of Large Language Models. _ICML 2024_. https://dl.acm.org/doi/10.5555/3692070.3693675

> **Citation:** Liu, E., Hasegawa, A., Palangi, H., Kulkarni, N., & Orr, L. (2024). In-Context Vectors: Making In Context Learning More Effective and Controllable Through Latent Space Steering. _ICML 2024_.

---

#### C.2.2 Attention Patterns Shift Under Prefix Conditioning

**PASTA** (Zhang et al., 2023) identified that a small subset of attention heads are particularly sensitive to instruction conditioning. Applying precise attention reweighting to these heads yields **22% average accuracy improvements** on LLaMA-7B for instruction following.

**Induction heads** (Olsson et al., 2022) — attention heads implementing `[A][B]...[A]→[B]` pattern completion — are the primary mechanism for in-context learning. Different prefix patterns activate different induction circuits:

> "Induction heads are attention heads that implement a simple algorithm to complete token sequences like [A][B] ... [A] → [B]. [...] We present six complementary lines of evidence arguing that induction heads may be the mechanistic source of general in-context learning in transformer models of any size."

**Implication for NorthSouth:** Different probes trigger different attention patterns. "Let's verify step-by-step" activates verification-related induction patterns; "Alternatively, consider..." activates alternative-generation patterns. The attention mechanism is the substrate through which probes steer generation.

> **Citation:** Olsson, C., Elhage, N., Nanda, N., et al. (2022). In-context Learning and Induction Heads. _Transformer Circuits Thread_. https://transformer-circuits.pub/2022/in-context-learning-and-induction-heads/

> **Citation:** Zhang, Q., Chen, Z., Bukharin, A., He, P., Cheng, Y., & Zhao, T. (2023). PASTA: Tell Your Model Where to Attend. _arXiv:2304.00653_.

---

#### C.2.3 Prefix Tuning Has Fundamental Expressiveness Limits

**Petrov, Torr & Bibi (NeurIPS 2023)** proved a critical constraint:

> "Prefix tuning cannot change relative attention patterns over content tokens — it can only scale them down uniformly."

Mathematically, for a prefix at position 0, attention from content position i to j becomes: `A^pt_ij = A_ij × (1 - A^pt_i0)`. The prefix adds a constant bias toward direction `W_V × s₁`, independent of content.

**What this means:**

| Probes CAN                                          | Probes CANNOT                           |
| --------------------------------------------------- | --------------------------------------- |
| Select among latent skills                          | Create new attention patterns           |
| Bias toward pre-existing pathways                   | Introduce genuinely novel processing    |
| Shift activations along existing concept directions | Add capabilities the model doesn't have |

**Implication for NorthSouth:** Probes are **skill selectors**, not skill creators. NorthSouth learns which latent capability to invoke (critique, verify, explore alternatives), but the capabilities must already exist in the model. This is a feature, not a limitation — it means probe effects are predictable and learnable.

> **Citation:** Petrov, A., Torr, P., & Bibi, A. (2023). When Do Prompting and Prefix-Tuning Work? A Theory of Capabilities and Limitations. _NeurIPS 2023_. https://openreview.net/pdf?id=GYOXIRXI7W

---

#### C.2.4 Hidden States Diverge Rapidly and Non-Recoverably

When generating from identical context with different prefix injections, hidden state divergence manifests **immediately in early-to-middle layers** rather than emerging gradually.

**Representation Engineering** (Zou et al., 2023) showed that activations shifted along concept directions (honesty, sentiment) shift behavior persistently unless explicitly counteracted. **Contrastive Activation Addition** creates persistent shifts in output distributions that propagate through subsequent layers without natural reconvergence.

Layer-wise analysis reveals an "expansion-contraction" pattern: tokens diffuse to a "working space" in middle layers (25-75% of depth) before projecting onto lower-dimensional submanifolds. Middle layers are most critical for prefix influence and most amenable to steering interventions.

**Implication for NorthSouth:** Once a probe establishes a trajectory direction in early layers, the trajectory diverges permanently. Two branches from the same checkpoint with different probes will not reconverge — they explore genuinely different regions of output space, exactly what MCTS requires.

> **Citation:** Zou, A., Phan, L., Chen, S., Campbell, J., Guo, P., Ren, R., Pan, A., Yin, X., Mazeika, M., Dombrowski, A., Goel, S., Li, N., Byun, M., Wang, Z., Mallen, A., Basart, S., Koyejo, S., Song, D., Fredrikson, M., & Hendrycks, D. (2023). Representation Engineering: A Top-Down Approach to AI Transparency. _arXiv:2310.01405_.

---

#### C.2.5 Divergence is Semantic, Not Just Surface

**Arditi et al. (NeurIPS 2024)** demonstrated perhaps the most striking example: refusal behavior across 13 chat models is controlled by a **one-dimensional subspace**. Ablating this single direction causes models to stop refusing harmful requests; amplifying it causes refusal of even harmless queries.

This proves that prompt conditioning produces **semantic** divergence (different reasoning modes, different behavioral patterns), not merely surface variation (different words, same meaning).

Probing studies show LLMs encode whether they're using contextual knowledge versus parametric knowledge in their activations — a semantic distinction detectable by linear classifiers. Different prefixes activate different knowledge retrieval modes.

**Implication for NorthSouth:** "Critique" and "Continue" don't just produce different words — they activate different reasoning modes. The oracle can meaningfully distinguish between trajectories because they represent genuinely different approaches to the task.

> **Citation:** Arditi, A., Obeso, O., Shenoy, A., et al. (2024). Refusal in Language Models Is Mediated by a Single Direction. _NeurIPS 2024_.

---

### C.3 Quantitative Effect Sizes

The magnitude of prefix conditioning effects is large enough to matter for MCTS:

| Study                        | Effect Size            | What Varied                                            |
| ---------------------------- | ---------------------- | ------------------------------------------------------ |
| Sclar et al. (ICLR 2024)     | **76 pp accuracy**     | Formatting only (spacing, delimiters)                  |
| Kojima et al. (NeurIPS 2022) | **61 pp accuracy**     | Adding "Let's think step by step"                      |
| Zhou et al. (ICLR 2023) APE  | Measurable improvement | "Let's work this out..." vs "Let's think step by step" |
| Zhang et al. (2023) PASTA    | **22% accuracy**       | Attention reweighting on instruction heads             |

If formatting alone produces 76 percentage point differences, semantic instruction changes (the kind probes use) should produce at least comparable divergence.

> **Citation:** Sclar, M., Choi, Y., Tsvetkov, Y., & Suhr, A. (2024). Quantifying Language Models' Sensitivity to Spurious Features in Prompt Design. _ICLR 2024_. arXiv:2310.11324

> **Citation:** Kojima, T., Gu, S. S., Reid, M., Matsuo, Y., & Iwasawa, Y. (2022). Large Language Models are Zero-Shot Reasoners. _NeurIPS 2022_. arXiv:2205.11916

> **Citation:** Zhou, Y., Muresanu, A. I., Han, Z., Paster, K., Pitis, S., Chan, H., & Ba, J. (2023). Large Language Models Are Human-Level Prompt Engineers. _ICLR 2023_. arXiv:2211.01910

---

### C.4 What This Validates for NorthSouth + MCTS

#### C.4.1 Trajectory Divergence for PUCT

MCTS requires that different actions from the same state produce meaningfully different outcomes to evaluate. The literature confirms:

- Different probes → different steering vectors → different attention patterns → divergent hidden states → distinct generation trajectories

This is exactly what PUCT needs: genuine branching, not surface variation.

#### C.4.2 Learnability of Probe Selection

APE (Zhou et al., 2023) proved that prompt selection is an optimization problem with findable optima. If there's enough variance between prompts that search helps, then _contextual_ search (choosing different probes for different situations) should help more.

NorthSouth extends APE's insight:

- **APE:** Offline search over prompts, task-level optimization
- **NorthSouth:** Online learning over probes, checkpoint-level optimization, oracle-guided feedback

#### C.4.3 The Skill Selection Model

Petrov et al.'s proof that prefix tuning "cannot change relative attention patterns" clarifies what probes do: they **select among latent skills**, not create new ones.

This maps directly to NorthSouth's probe vocabulary:

- **Continue:** Select continuation skill
- **Critique:** Select evaluation/criticism skill
- **Alternative:** Select divergent generation skill
- **Debug:** Select error analysis skill
- **AdmitUncertainty:** Select epistemic humility skill

NorthSouth learns _when_ each skill is useful; the model already _has_ the skills.

---

### C.5 The Remaining Novel Contribution

**What the literature establishes:**

- ✅ Different probes produce different trajectories
- ✅ Trajectories diverge rapidly and non-recoverably
- ✅ Divergence is semantic, not just surface
- ✅ Probe selection is an optimizable problem

**What NorthSouth adds (to be validated empirically):**

- ❓ Learned contextual probe selection, conditioned on checkpoint state and error type
- ❓ Oracle-guided feedback (not just end-task accuracy)
- ❓ Trajectory-level credit assignment via global entailment
- ❓ Cross-query and cross-session transfer of learned priors

The mechanistic foundation is solid. The novel contribution is the learning architecture built on top of it.

---

### C.6 Summary

NorthSouth's probe strategy rests on a validated mechanistic foundation:

1. **Probes create steering vectors** that shift activations along linear concept directions (Park et al., Liu et al.)
2. **Attention patterns redirect** through specialized instruction-sensitive heads (Olsson et al., Zhang et al.)
3. **Divergence is rapid, semantic, and non-recoverable** (Zou et al., Arditi et al.)
4. **Effect sizes are large** — 22-76 pp from prompt variations (Sclar et al., Kojima et al.)
5. **Probes select among latent skills** rather than creating new capabilities (Petrov et al.)

This provides the trajectory branching that MCTS requires. NorthSouth's contribution is learning _which_ branch to take.

---

### C.7 References

1. Arditi, A., et al. (2024). Refusal in Language Models Is Mediated by a Single Direction. _NeurIPS 2024_.

2. Kojima, T., Gu, S. S., Reid, M., Matsuo, Y., & Iwasawa, Y. (2022). Large Language Models are Zero-Shot Reasoners. _NeurIPS 2022_. arXiv:2205.11916

3. Liu, E., Hasegawa, A., Palangi, H., Kulkarni, N., & Orr, L. (2024). In-Context Vectors: Making In Context Learning More Effective and Controllable Through Latent Space Steering. _ICML 2024_.

4. Olsson, C., Elhage, N., Nanda, N., et al. (2022). In-context Learning and Induction Heads. _Transformer Circuits Thread_. https://transformer-circuits.pub/2022/in-context-learning-and-induction-heads/

5. Park, K., Choe, Y. J., & Veitch, V. (2024). The Linear Representation Hypothesis and the Geometry of Large Language Models. _ICML 2024_.

6. Petrov, A., Torr, P., & Bibi, A. (2023). When Do Prompting and Prefix-Tuning Work? A Theory of Capabilities and Limitations. _NeurIPS 2023_.

7. Sclar, M., Choi, Y., Tsvetkov, Y., & Suhr, A. (2024). Quantifying Language Models' Sensitivity to Spurious Features in Prompt Design. _ICLR 2024_. arXiv:2310.11324

8. Todd, E., Li, M. L., Sharma, A. S., Mueller, A., Wallace, B. C., & Bau, D. (2023). Function Vectors in Large Language Models. _arXiv:2310.15213_.

9. Zhang, Q., Chen, Z., Bukharin, A., He, P., Cheng, Y., & Zhao, T. (2023). PASTA: Tell Your Model Where to Attend. _arXiv:2304.00653_.

10. Zhou, Y., Muresanu, A. I., Han, Z., Paster, K., Pitis, S., Chan, H., & Ba, J. (2023). Large Language Models Are Human-Level Prompt Engineers. _ICLR 2023_. arXiv:2211.01910

11. Zou, A., et al. (2023). Representation Engineering: A Top-Down Approach to AI Transparency. _arXiv:2310.01405_.
