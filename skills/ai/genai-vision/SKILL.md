---
name: genai-vision
description: >
  Use this skill when the user says 'generate images', 'Stable Diffusion', 'SDXL', 'FLUX', 'diffusers pipeline', 'image-to-image', 'inpainting', 'Whisper transcription', 'speech to image pipeline'. Implements local or self-hosted image generation with Hugging Face diffusers and speech transcription with Whisper, including memory optimization, reproducibility, licensing, and safety checks. Do NOT use for: vision-language understanding / VLM pipelines (rnd/ai-agents/multimodal-pipelines), training diffusion models from scratch (fundamental-truths/statistical-mechanics for theory), or classic CV tasks like detection (ml computer-vision skill).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [ai, generative, diffusers, stable-diffusion, flux, whisper, image-generation]
---

# GenAI Vision & Audio

## Purpose
Ship image generation and speech transcription with open models: pick a model whose license fits the use case, load it in half precision with sensible memory settings, make outputs reproducible, and wrap it in a service that handles queuing and safety. The diffusers library provides the image pipelines; Whisper (via `faster-whisper` or `transformers`) handles audio.

## Agent Protocol

### Trigger
"stable diffusion", "SDXL", "FLUX", "diffusers", "text-to-image", "img2img", "inpainting", "LoRA for SD", "Whisper", "transcribe audio".

### Input Context
- Use case (commercial or not), target quality, latency per image.
- GPU (VRAM size) or CPU-only constraints.
- Need for conditioning (img2img, inpainting, ControlNet, LoRA styles).
- Audio language(s) and real-time vs batch transcription.

### Output Artifact
Model choice with license note, pipeline code, memory/performance settings, serving outline.

### Response Format
```
Model: {repo id}  License: {license}  VRAM: {approx}
Pipeline: {class}  dtype: {fp16|bf16}  Steps/guidance: {n}/{g}
Memory: {cpu offload|vae tiling|none}
Repro: seed={n} recorded with prompt + model revision
Audio: {whisper variant, compute_type}
```

### Completion Criteria
- [ ] License verified for intended use.
- [ ] Device selected dynamically; half precision used on GPU.
- [ ] Seed, model revision, and parameters logged per output.
- [ ] Safety/NSFW policy defined for user-facing generation.

## Model Selection (verify licenses on the model card before use)
| Model family | Notes | License (check card) |
|---|---|---|
| Stable Diffusion 1.5 | Small, huge LoRA ecosystem; original runwayml repo was removed, mirrors exist | CreativeML OpenRAIL-M |
| SDXL base 1.0 | 1024px, good quality/VRAM balance | CreativeML OpenRAIL++-M |
| SD 3.5 (Medium/Large) | MMDiT architecture, better text rendering | Stability AI Community License (revenue threshold) |
| FLUX.1 [schnell] | Few-step, high quality | Apache-2.0 |
| FLUX.1 [dev] | Higher quality, guidance-distilled | Non-commercial license |

## Text-to-Image (diffusers)

```python
from __future__ import annotations

import json
import logging
from pathlib import Path

import torch
from diffusers import AutoPipelineForText2Image

log = logging.getLogger("genai")
MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0"


def pick_device() -> tuple[str, torch.dtype]:
    if torch.cuda.is_available():
        return "cuda", torch.float16
    if torch.backends.mps.is_available():
        return "mps", torch.float16
    return "cpu", torch.float32  # CPU kernels need fp32; expect minutes per image


def load_pipeline(low_vram: bool = False):
    device, dtype = pick_device()
    pipe = AutoPipelineForText2Image.from_pretrained(
        MODEL_ID, torch_dtype=dtype, variant="fp16" if dtype == torch.float16 else None,
        use_safetensors=True,
    )
    if low_vram and device == "cuda":
        pipe.enable_model_cpu_offload()   # needs `accelerate`; do not also call .to("cuda")
    else:
        pipe.to(device)
    return pipe, device


def generate(pipe, device: str, prompt: str, out: Path, seed: int = 0,
             steps: int = 30, guidance: float = 7.0, negative: str = "") -> Path:
    generator = torch.Generator(device="cpu" if device == "mps" else device).manual_seed(seed)
    image = pipe(prompt=prompt, negative_prompt=negative or None, num_inference_steps=steps,
                 guidance_scale=guidance, generator=generator).images[0]
    image.save(out)
    out.with_suffix(".json").write_text(json.dumps(
        {"model": MODEL_ID, "prompt": prompt, "negative": negative, "seed": seed,
         "steps": steps, "guidance": guidance}))
    log.info("generated %s seed=%d", out, seed)
    return out
```

Notes:
- PyTorch 2.x uses scaled-dot-product attention by default; installing xformers is no longer required.
- FLUX.1 [schnell] uses `FluxPipeline`, ~4 steps, `guidance_scale=0.0`.
- Pin `revision=` on `from_pretrained` for reproducible production builds.

## Conditioning Options
| Need | Tool |
|---|---|
| Edit an existing image | `AutoPipelineForImage2Image` (`strength` 0.3-0.8) |
| Replace a region | `AutoPipelineForInpainting` with a mask |
| Pose/edge/depth control | ControlNet pipelines (`StableDiffusionXLControlNetPipeline`) |
| Style or subject | LoRA: `pipe.load_lora_weights(path)`; scale via `cross_attention_kwargs={"scale": 0.8}` or adapter weights |
| Fast drafts | Distilled/turbo models or LCM-LoRA with 4-8 steps |

## Memory & Speed
| Problem | Setting |
|---|---|
| OOM on load | `enable_model_cpu_offload()`; smaller model; fp16 variant |
| OOM at high resolution | `pipe.vae.enable_tiling()` / `enable_slicing()` |
| Throughput | Batch prompts (`num_images_per_prompt`), `torch.compile(pipe.unet)` after warmup |
| Latency | Fewer steps with a distilled model rather than cutting steps on a base model |

## Speech Transcription (Whisper)

```python
from faster_whisper import WhisperModel   # CTranslate2 backend

def transcribe(path: str, device: str = "cuda") -> list[dict]:
    compute_type = "float16" if device == "cuda" else "int8"
    model = WhisperModel("large-v3", device=device, compute_type=compute_type)
    segments, info = model.transcribe(path, beam_size=5, vad_filter=True)
    return [{"start": s.start, "end": s.end, "text": s.text} for s in segments]
```

`segments` is a generator; transcription runs as you iterate. For lower latency use the `turbo`/distilled variants; for the Hugging Face stack use `pipeline("automatic-speech-recognition", model="openai/whisper-large-v3-turbo")`.

## Speech-to-Image Flow

```mermaid
flowchart LR
  A[Audio] --> B[Whisper transcript] --> C[LLM: rewrite into image prompt + negative prompt]
  C --> D[Safety check on prompt] --> E[Diffusion pipeline] --> F[Safety check on image] --> G[Store image + metadata]
```

## Serving
- Run the pipeline in a dedicated GPU worker; accept jobs via a queue (one model instance per GPU, batch where possible).
- Return a job id immediately; generation takes seconds.
- Cache loaded pipelines; loading SDXL takes far longer than one inference.
- Apply prompt and output moderation for public endpoints; add provenance (C2PA metadata or visible/invisible watermark) where policy requires.

## Anti-Patterns
- Hardcoding `.to("cuda")` with no fallback.
- Loading fp32 weights on GPU (double VRAM for no visible gain).
- Calling `.to("cuda")` after `enable_model_cpu_offload()`.
- Using a non-commercial model in a commercial product.
- Not storing seed/params: outputs cannot be reproduced or audited.

## Checklist
- [ ] Model license checked and recorded.
- [ ] Dynamic device + fp16/bf16 on GPU; pinned revision.
- [ ] Memory settings match VRAM.
- [ ] Seed + params persisted with each image.
- [ ] Queue-based GPU worker with timeouts.
- [ ] Moderation and provenance for user-facing output.

## References
- Hugging Face diffusers documentation (AutoPipeline, memory optimization, LoRA loading).
- Radford et al., "Robust Speech Recognition via Large-Scale Weak Supervision" (Whisper, 2022); SYSTRAN/faster-whisper.
