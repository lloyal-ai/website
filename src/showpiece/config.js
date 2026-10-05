export const SCENES = Object.freeze([
  { id: 'compose', label: 'Compose', duration: 50, still: 16, title: 'Choose your models. Compose your application.', description: 'Qwen, Gemma 4 and GLM 5.2 lead different compositions: retrieval, a Whisper and S1-mini voice pipeline, and a model-selected image tool.' },
  { id: 'live', label: 'Live inference', duration: 21.5, still: 12.5, title: 'Working memory becomes a programming surface.', description: 'Agents inherit one image-conditioned attention state. Evidence enters one branch before its descendants fork. Pause the run, cancel an agent, and continue the surviving lineages.' },
  { id: 'inspect', label: 'Inspect', duration: 21, still: 18, title: 'See what happens while the model is thinking.', description: 'Inspect agent timelines, actions, entropy and surprisal. Follow retrieved passages through focal-lens reranking into a selected agent’s context.' },
  { id: 'enrich', label: 'Enrich', duration: 18, still: 15, title: 'Intelligence belongs inside your product.', description: 'A forthcoming spreadsheet template enriches fictional company records and connects a selected cell to its evidence.' },
  { id: 'ship', label: 'Ship', duration: 18, still: 16, title: 'Your application, ready to hand over.', description: 'With macOS signing configured, build, sign, notarize and staple Your App. The command produces a disk image; model weights are provisioned on first launch.' },
  { id: 'launch', label: 'First launch', duration: 22, still: 21, title: 'The models arrive. Your user gets to work.', description: 'Your App checks the machine, downloads and verifies its configured models, then opens a fresh workspace.' },
]);

export const sceneById = (id) => SCENES.find((scene) => scene.id === id) ?? SCENES[0];
