# **Compass**

### The missing layer for organizational reasoning

## **The Wild Idea**

*What if the inference write path was a git-like commit protocol?*

Not "call the LLM and log what it said." Not "wrap retry logic around an API." A runtime that turns any model's emissions into proposed state transitions. The system arbitrates: forking, verifying, backtracking, pruning—before anything commits. Competing trajectories converge under external verification pressure—not after emission, but alongside it; enabling policy-aware search that runs now, inside the generation loop, not frozen in weights.

The system can change its mind—rolling back to an earlier checkpoint to take a different path. Reasoning in grounding space you can replay, audit, and defend.

## **Why This Matters Now**

Agent frameworks have pushed LLMs into production, exposing that orchestration doesn't solve reliability. LangChain's 2025 *State of Agent Engineering* report: 57% have agents in production and quality is the top barrier (32%)—now outranking cost. \[1\]

The pattern is the same everywhere: the model generates plausible output, you check it, it fails, you retry, it fails differently, you hack the prompt, it works once, breaks on the next input. The loop is expensive, unpredictable, and doesn't learn from failures.

The industry has crossed from cute demos to production—and production has consequences. A hallucinated approval, a fabricated precedent, a wrong calculation committed to the ledger. The cost of being wrong is now real.

Nothing in the current stack is designed for this. Models optimize for plausibility, not correctness. Orchestration treats the model as a black box that emits strings. Observability tells you what went wrong after it's already in the database.

There's no layer that says: this trajectory doesn't commit until it survives contact with reality—or remembers why other trajectories didn't.

## **What The Missing Layer Forces**

The workaround everyone uses: build "loops" in the application layer. LangGraph cycles, Temporal workflows, event-sourced state machines—**all of it sits outside the inference boundary**, treating the model as a black box that returns strings. You can add checkpoints. You can add **`policy.verify()`**. You can add retries, but you only intervene after the model emits—the latent trajectories that might have survived verification are already gone.

**Failure Modes:**

**1\) Workflow State, Not Inference State:** Orchestration can checkpoint workflow state—node outputs, retry counts, graph position. It cannot checkpoint inference state—KV residency, branch-local deltas, decoder trajectory. So "time travel" means replaying the graph with edited inputs, not rehydrating the model mid-trajectory to explore alternatives without paying for regeneration or contaminating context with rejected attempts.

**2\) The Verification Lottery:** "Yes, just run **`policy.verify()`** before you write the edge" sounds like it solves the problem. It doesn't—it turns correctness into a stochastic lottery. If a passing edge occurs with probability *p* per attempt, your expected number of attempts is \~1/*p*. In enterprise policy space, *p* is often low. So you either:

* **inject failures into prompts/state** so the next attempt "learns" (token burn, truncation, node-dependent handling), or  
* **retry clean** and pay again (prefix compute \+ KV residency, repeatedly).

Verification outside inference doesn't become control. It becomes expensive roulette.

**3\) "Then Do Search" (and You're Rebuilding Compass at the Wrong Layer):** To escape the lottery, you need search: generate many candidates, verify, prune, expand—beam, tree-of-thought, MCTS/PUCT. That's the only way to make "find a passing trajectory" reliable.

But if you implement search in orchestration, every expansion still costs a full model call (or a partial regeneration), because you can't fork/restore decoder state cheaply. You get the worst of both worlds: search-level complexity with orchestration-level economics—multiplying forward passes instead of sharing prefix/KV deltas.

**4\) Precedent Poisoning ("Hallucinated Foreign Key")** Even with edge checks, orchestration still observes emissions, not the hidden basis that produced them. When the model links "Ticket A → Policy X," you see the claim—not the internal premise stack that made it feel true. Unless you enforce verification as a **commit-time invariant** and capture counterfactuals as first-class state, a bad edge can still become durable precedent. Future agents inherit it as truth. Errors don't just persist—they compound into structure.

**5\) Fragmented Deliberation (Shared State ≠ Shared Frontier):** Orchestration composes outputs, not deliberation. Agent B can attend to Agent A's conclusion—but not to the alternatives A explored, the verifier paths that failed, or the rejected branches—unless you manually paste that history into B's context window. Without a shared frontier over durable lineage, rejection evidence doesn't compound across agents; every agent re-pays the exploration cost in its own private prompt.

## **The Bet**

The solutions that move AI from "concierge" to "actor" in the enterprise won't be built on workflows.

**They'll be built on System-2 reasoning, not the stock reasoning policy frozen into weights—search you can control, audit, defend, and distill into policy.**

We're betting against agent orchestration as the foundation for organizational reasoning.

Orchestration will exist. It just won't be the layer that owns *why*.

## **New Primitive: Organizational Reasoning**

To own *why*, you need a unified view into claim decomposition, grounding, evidence verification, and entailment—at commit time. Compass makes this possible by treating inference state as a first-class primitive: fork, restore, prune, and time-travel at the KV level. Long-horizon reasoning becomes test-time search under hard verification constraints—like checking out git branches, running tests, and merging only the passing branch into trunk.

**Inference commit protocol (mental model):**

| `propose(checkpoint) → patchverify(checkpoint, patch, evidence) → accept | rejectaccept → commit(new_checkpoint)reject → restore(checkpoint) + explore alternatives` |
| :---- |

Commits write into a Merkle Document: **content-addressed lineage**, **O(1) checkpoint/restore**, cryptographic provenance, and cross-session identity. Each run emits a **`RunFingerprint`** (model, tokenizer, engine version, sampling config, seed) so traces are replayable under a pinned fingerprint, and bound to the exact content-addressed state they represent via the Merkle root.

## **The Paradigm Shift: From Orchestration to Reactive Pipelines**

A natural objection: with agentic workflows, even if you deploy on Compass, don't you just recreate fragmented reasoning?

Not quite. Compass composes work through a **shared frontier over content-addressed state**—agents are observers of evolving lineage, not walkers of a predefined graph. **`CompassDoc`** is a persistent data structure: immutable snapshots, structural sharing, and agent-local time travel. Agents react to commits via condition matching—not orchestrated handoffs.

**Traditional orchestration shares results, not reasoning:**

| AgentA.generate() → result → AgentB.generate() → result |
| :---- |

Each **`generate()`** is a separate context window. Agent B can attend to Agent A's output—but not to the alternatives A explored, the verifier paths that failed, or the branches that were rejected. Only conclusions cross the boundary.

For instance, LangGraph can implement MCTS — but you pay K× Inference. Every branch is a full model call. K candidates means K forward passes. Rollback means regeneration, not rehydration. Search without a shared prefix has the economics of a roulette game. \[2\]  
**Example reactive agent workflow:**

Two observers on the same commit stream. Neither calls the other. Both react to the evolving lineage—including rejections.

| *// Immutable snapshots emitted by the runtime on every commit*const commits$ \= new Subject\<CompassDoc\>();*// Observer A \-- Enrichment: external lookup on demand.**// Evidence is stored externally; the Document gains it when the runtime commits.*commits$.pipe(  filter(doc \=\> doc.hasBoundary('needs-enrichment')),  mergeMap(doc \=\> from(enrichmentService.lookup(doc.context)))).subscribe(result \=\> enrichmentService.store(result));*// Observer B \-- Notification: alerts when enrichment lands.*commits$.pipe(  filter(doc \=\> doc.hasEvidence('enrichment-complete')),  tap(doc \=\> notificationService.send(doc.checkpoint)) *// tap for side effects*).subscribe();*// Observer C \-- Approver: gates downstream on policy verification.**// concatMap ensures approvals process in lineage order \--**// downstream observers block until upstream decisions resolve.*commits$.pipe(  filter(doc \=\> doc.hasBoundary('pending-approval')),  concatMap(doc \=\>     policyOracle.verify(doc.checkpoint).pipe(      map(result \=\> result.pass        ? doc.commit('approved')        : doc.reject('policy-violation', result.reason)      )    )  )).subscribe(doc \=\> commits$.next(doc)); *// Re-emits the verified state**// Observer D \-- Downstream: processes only what survives.**// Skips contexts with upstream rejections \-- no re-exploration needed.*commits$.pipe(  filter(doc \=\> doc.hasApproval('approved')),  filter(doc \=\> \!doc.hasRejections('policy-violation')),  mergeMap(doc \=\> downstreamService.process(doc.checkpoint))).subscribe();*// Runtime publishes each committed snapshot into the reactive stream*runtime.onCommit(doc \=\> commits$.next(doc)); |
| :---- |

The shared frontier between observers operationalizes "*fail fast"* across agents. Rejection evidence becomes first-class state: committed into the Document, content-addressed to the entities it touched. When another agent's context overlaps, the rejected trajectories are structurally present—not queried and prompt-injected. Every rejection can reduce compute for every agent operating on the same frontier.

## **Sublinear Scaling: Compass Doesn't Pay K× Inference**

The dominant cost in inference isn't orchestration overhead—it's prefix compute and KV residency. Most "agentic systems" pay that cost repeatedly by running K independent generations.

Compass flips the cost curve. We keep a shared prefix resident and expand branches as deltas. The kernel batches those deltas through the model's decode path, so compute can scale sublinearly with branch count rather than multiplying forward passes.

The memory architecture works like a VM: content-addressed lineage is durable "disk"; KV cache is fast "RAM." When memory or sequence slots saturate, we evict residency, not truth, and deterministically rehydrate from lineage. This is why Compass can do oracle-gated rollback-and-commit without turning exploration into a combinatorial cost explosion. It's not "more loops"—it's a different runtime. This is how we make verified reasoning economically viable, not just conceptually possible.

## **The Outcome: Verified Lineage**

For organizational reasoning to be auditable, the substrate must be unified, verifiable, replayable, and transferable.

Every run emits a **`CompassTrace`**:

* which branches were explored,  
* what context was retrieved,  
* which verifiers evaluated what,  
* what finally committed.

This is the trace you actually want: verified transitions under an explicit commit protocol.

**`CompassTrace`** is explicitly designed for high-fidelity PRM (Process Reward Model) training and policy distillation. Every run becomes a training example. The system doesn't just execute decisions—it manufactures durable organizational intelligence.

## **Future-Proofing: Latent Reasoning Models**

We're betting latent reasoning beats verbose CoT. Models like Coconut reason in continuous space—hidden states fed back as embeddings, encoding multiple alternative paths simultaneously. Implicit BFS without token overhead. Fewer tokens, richer representations, better performance on tasks requiring backtracking.

*Sound familiar?*

Compass is a similar paradigm projected into grounding space—explicit MCTS against external oracles. CoAT fuses organizational context before latent reasoning begins. The model's implicit BFS explores *organizational* solution space, not abstract solution space.

This also fills the accountability gap: with latent space reasoning on its own, you can't audit a continuous thought vector. Compass closes it at emission—checkpoints, oracle verification, explicit backtracking. The reasoning is latent. The commits are verified.

When latent reasoners dominate, Compass aims to be the deployment layer.

## **The Data Flywheel: Compass–MuZero Loop**

MuZero was a step-change because it turned search from a one-off expense into a **compounding asset**: every rollout improved the policy/value used for the next rollout.

Compass applies that exact move to enterprises — except the "world model" isn't learned dynamics in latent space. It's external reality: policy gates, compilers, databases, contracts, and domain oracles. The runtime's job is to search *against the world*, then learn from the contact.

**Every oracle-contact event produces three artifacts**:

1. a committed checkpoint (durable organisational state)  
2. a CompassTrace (the precedent-grade decision record)  
3. a learning signal (so the next trajectory is cheaper and more reliable)

### **1\) Online learning (in-process): neural policy/value heads inside the kernel**

At each checkpoint, Compass already has the MuZero structure:

* **state** \= content-addressed Document lineage (Merkle root \+ run fingerprint)  
* **action** \= NorthSouth choice *(strategy, rollback depth)*  
* **return** \= oracle-composed value from the explored continuation

So we train lightweight neural heads **in-process**:

* **Value head:** **`Q(state, action)`** (what will this reasoning mode yield here?)  
* **Policy head:** **`π(action ∣ state)`** (which reasoning mode should fire next?)

Compass doesn't just *use* PUCT — it learns the priors that make PUCT converge faster, using the same oracle values that already gate commit.

Effect: within a single run (and across runs keyed by state), Compass stops wasting search on low-value modes and learns which rollbacks and probes actually repair trajectories in this domain.

Over time, the policy head becomes the learned version of NorthSouth — **the scaffolding disengages**.

### **2\) Offline learning (weight distillation): verified world knowledge \+ process supervision**

Online heads make search cheaper. But the bigger moat is that Compass manufactures the dataset that everyone else wishes they had:

* **World knowledge distill:** train the proposer on *oracle-passing* completions (not "what the model said", what survived reality)  
* **Process supervision distill:** train on the *trajectory* — which reasoning actions were chosen, which branches failed, and what the oracle returned

So the same CompassTrace yields two coupled upgrades:

* the model learns **what becomes true** (oracle-verified content)  
* the model learns **how to get there** (oracle-shaped reasoning policy)

Then you export a new pinned artifact, update the **`RunFingerprint`**, and the runtime immediately benefits: higher pass-rate at the same budget, or same pass-rate at a lower budget. So customer-paid inference doesn't just produce answers — it produces **durable organisational intelligence**: state you can audit, and models that get cheaper to run in that state over time.

## **Ask**

Primitives shipped. Raising to ship production runtime and land 3-5 design partners in verification-mandatory environments.

**Product surface:** [reasoning.run](https://reasoning.run/)

**Deployment model:** Hosted SaaS, Sovereign Cloud, On-Premise and Edge. Open-weights models. No third-party inference APIs.

**Completed:**

Compass inference kernel (C++ 20):

* CompassDoc persistent data structure (complexity attached)  
* Grammar aware boundary parser (governs MCTS action space)  
* Atomic KV branching \- Lease Pool  
* EastWest Online learner \- Contextual bandit Gumbel MuZero based  
* MCTS harness with plugin oracle based PUCT value estimation  
* Compass–MuZero phase-1 \- value head

Edge distribution channels (NodeJS/N-API, ReactNative/JSI)

**In Progress:**

* SaaS layer  
* RxAgents API  
* Oracle framework  
* NorthSouth Online learner  
* Compass-MuZero future phases  
  * Online Policy-head  
  * Offline world knowledge updates

Let's verify the future.

**Zuhair Naqvi** | [zuhair@reasoning.run](mailto:zuhair@reasoning.run)  
Founder, Lloyal Labs / [reasoning.run](https://reasoning.run/)  
Melbourne, Australia

**References**

\[1\] LangChain, "State of Agent Engineering," 2025\. [https://www.langchain.com/state-of-agent-engineering](https://www.langchain.com/state-of-agent-engineering)  
\[2\] LangChain, "Language Agent Tree Search," LangGraph Documentation. [https://langchain-ai.github.io/langgraph/tutorials/lats/lats/](https://langchain-ai.github.io/langgraph/tutorials/lats/lats/)  
