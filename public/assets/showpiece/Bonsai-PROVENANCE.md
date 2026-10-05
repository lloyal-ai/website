# Bonsai model mark

`bonsai-official.svg` is the original, unmodified Bonsai logo linked by Prism ML's
official Ternary Bonsai 2 27B model card. Retrieved on 2026-10-05.

- Model card: https://huggingface.co/prism-ml/Ternary-Bonsai-2-27B-gguf
- Original asset: https://huggingface.co/prism-ml/Ternary-Bonsai-2-27B-gguf/resolve/main/assets/bonsai-logo.svg
- Repository license: https://huggingface.co/prism-ml/Ternary-Bonsai-2-27B-gguf/raw/main/LICENSE

The repository declares Apache-2.0; its original license is retained as
`Bonsai-LICENSE.txt`. The logo identifies the model and does not imply endorsement.
Apache-2.0 does not grant trademark rights. No separate logo usage guide is
provided in the source model card.

The original SVG uses a 24 × 15 view box and supplies black and white variants
through `prefers-color-scheme`. Render it with `color-scheme: dark` in this dark
showpiece so the source's white variant remains legible; do not recolour its paths.

The model card documents the separate, optional Q8_0 vision projection pack for
image input. Its ternary weights require Prism ML's custom runtime kernels; the
illustration should not imply that stock llama.cpp can load those formats.
