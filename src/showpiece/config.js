export const SCENES = Object.freeze([
  { id: 'compose', label: 'Compose', duration: 68, still: 16, title: 'On your device. On your infrastructure. At frontier scale.', description: 'Qwen deep-research, Gemma 4 with a Whisper and S1-mini voice pipeline, Bonsai with an image tool, and GLM 5.2 with Qwen Reranker in a spreadsheet template.' },
  { id: 'live', label: 'In-App Agents', duration: 21.5, still: 12.5, title: "The model's working memory becomes a programming surface.", description: 'Agents inherit one image-conditioned attention state. Evidence enters one branch before its descendants fork. Pause the run, cancel an agent, and continue the surviving lineages.' },
  { id: 'inspect', label: 'Inspect', duration: 21, still: 18, title: 'Deterministic replay grade JSONL traces captured during inference and inspectable in dev-tools.', description: 'Inspect agent timelines, actions, entropy and surprisal. Follow retrieved passages through focal-lens reranking into a selected agent’s context.' },
  { id: 'ship', label: 'Ship', duration: 18, still: 16, title: 'One command to a working binary you can distribute.', description: 'With macOS signing configured, build, sign, notarize and staple Your App. The command produces a disk image; model weights are provisioned on first launch.' },
  { id: 'launch', label: 'First launch', duration: 22, still: 21, title: "Your app's first run provisions the models you composed, like a standard install users are familiar with.", description: 'Your App checks the machine, downloads and verifies its configured models, then opens a fresh workspace.' },
]);

export const sceneById = (id) => SCENES.find((scene) => scene.id === id) ?? SCENES[0];
