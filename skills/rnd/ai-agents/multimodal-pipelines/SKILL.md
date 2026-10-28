---
name: multimodal-pipelines
description: >
  Use this skill when the user says 'multimodal pipeline', 'vision-language model', 'VLM', 'LLaVA', 'Qwen-VL', 'send images to an LLM', 'audio LLM', 'document understanding with images', 'screenshot understanding'. Prototypes pipelines that feed images and audio to models: how VLMs and audio-LLMs fuse modalities, when to use native multimodal models vs OCR/ASR-then-text, preprocessing, serving with vLLM's OpenAI-compatible API, and evaluation. Do NOT use for: image generation (ai/genai-vision), classic CV training (ml computer-vision), or embedding/vector search of images (ai/llm-engineering/rag-architecture).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [rnd, ai-agents, multimodal-pipelines, vlm, llava, whisper, vision, audio]
---

# Multimodal AI Pipelines (Vision & Audio)

## Purpose
Decide how images and audio reach a language model and build the pipeline. Native multimodal models read pixels or audio features directly and keep layout, charts, and tone that OCR or transcription would lose; text-first pipelines (OCR/ASR then LLM) are cheaper, more controllable, and easier to audit. This PoC skill explains the architectures and gives a working serving/client setup and an evaluation plan.

## Agent Protocol

### Trigger
"VLM", "vision-language", "LLaVA", "Qwen2.5-VL", "image + text prompt", "chart/screenshot understanding", "audio LLM", "Whisper + LLM", "multimodal RAG".

### Input Context
- Inputs (photos, scans, screenshots, charts, video frames, speech) and volume.
- Outputs (extraction JSON, QA, captions, actions).
- Hosted API vs self-hosted; GPU budget; privacy constraints.

### Output Artifact
Pipeline design (native vs text-first), model choice, preprocessing rules, serving/client code, eval set.

### Response Format
```
Input: {modality, resolution/duration}  Task: {extract|qa|caption}
Approach: {native VLM|OCR->LLM|ASR->LLM|hybrid}
Model: {name}  Serving: {hosted API|vLLM}
Preprocess: {resize/tiling, page split, audio resample 16 kHz}
Output: {JSON schema}  Eval: {field accuracy / WER / QA accuracy}
```

### Completion Criteria
- [ ] Native vs text-first decision justified with sample results.
- [ ] Image token cost estimated (resolution drives tokens).
- [ ] Structured output validated against a schema.
- [ ] Eval set with ground truth per field/answer.

## How Modalities Are Fused
| Architecture | Mechanism | Examples |
|---|---|---|
| Projector + token concatenation | Vision encoder (e.g. CLIP/SigLIP ViT) produces patch embeddings; an MLP projects them into the LLM embedding space; image tokens are inserted into the sequence and processed by ordinary self-attention | LLaVA family, Qwen-VL family |
| Cross-attention adapters | LLM layers gain cross-attention blocks that attend to image features | Flamingo, Llama 3.2 Vision |
| Audio encoder + projector | Whisper-style encoder over log-Mel spectrograms, projected into the LLM | Qwen2-Audio and similar |
| Natively multimodal | Trained jointly on interleaved modalities | Frontier hosted models |

Consequence: image resolution maps to token count. Dynamic-resolution models tile large images into many tokens; downscale or crop to the region of interest to control cost and latency.

## Native vs Text-First
| Situation | Prefer |
|---|---|
| Clean printed documents, high volume | OCR (or document parser) → LLM |
| Layout, tables, charts, handwriting, screenshots | Native VLM (optionally with OCR text as extra context) |
| Speech where wording matters (meetings, support calls) | ASR (Whisper) → LLM, keep timestamps |
| Tone/emotion, non-speech audio | Audio-native model |
| Auditable extraction | Text-first, store intermediate text |

## Serving a VLM with vLLM

```bash
vllm serve Qwen/Qwen2.5-VL-7B-Instruct --max-model-len 16384 \
  --limit-mm-per-prompt '{"image": 4}' --api-key "$VLLM_API_KEY"
```
(The `--limit-mm-per-prompt` value syntax has changed across vLLM versions; older releases use `image=4`.)

```python
from __future__ import annotations

import base64
import json
import os
from pathlib import Path

from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1", api_key=os.environ["VLLM_API_KEY"], timeout=120)


def image_part(path: Path) -> dict:
    mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    data = base64.b64encode(path.read_bytes()).decode()
    return {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{data}"}}


def extract_invoice(path: Path) -> dict:
    resp = client.chat.completions.create(
        model="Qwen/Qwen2.5-VL-7B-Instruct",
        messages=[{"role": "user", "content": [
            image_part(path),
            {"type": "text", "text": 'Extract {"vendor": str, "date": "YYYY-MM-DD", "total": number}. '
                                     "Return only JSON. Use null for missing fields."},
        ]}],
        temperature=0,
        max_tokens=300,
    )
    raw = resp.choices[0].message.content or ""
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"model returned non-JSON for {path.name}: {raw[:200]!r}") from exc
```

Use structured-output/guided decoding (`response_format` with a JSON schema, where the server supports it) instead of hoping for valid JSON.

## Audio Path
1. Resample to 16 kHz mono (Whisper's expected input), split long audio with voice-activity detection.
2. Transcribe with timestamps (faster-whisper or a hosted ASR); optionally diarize speakers.
3. Feed transcript chunks with timestamps to the LLM; cite time ranges in outputs.

## Preprocessing Rules
- Fix EXIF orientation; convert to RGB; cap the long side (e.g. 1024-1568 px) unless fine text needs more.
- Split multi-page PDFs into page images (`pdftoppm -r 150`) and process per page, then merge.
- For video, sample frames at a fixed rate or on scene changes; most VLM APIs take frames as images.

## Evaluation
| Task | Metric |
|---|---|
| Field extraction | Per-field exact match / normalized match |
| Document QA | Accuracy on labeled Q/A pairs |
| ASR | Word error rate (WER) on in-domain audio |
| Captioning | Human rubric; automatic metrics are weak proxies |

## Anti-Patterns
- Sending full-resolution photos when a crop answers the question.
- Trusting VLM-read numbers without validation (totals vs line items, date formats).
- Mixing OCR text and image without telling the model which is authoritative.
- Ignoring that text inside images can carry prompt injection.

## Checklist
- [ ] Approach chosen per input type with sample comparison.
- [ ] Token/latency estimates at chosen resolution.
- [ ] Schema-constrained outputs and validation.
- [ ] Audio preprocessing (16 kHz, VAD, timestamps).
- [ ] Ground-truth eval set and error analysis.

## References
- Liu et al., "Visual Instruction Tuning" (LLaVA, NeurIPS 2023); Alayrac et al., "Flamingo" (NeurIPS 2022).
- Radford et al., "Robust Speech Recognition via Large-Scale Weak Supervision" (Whisper, 2022).
- vLLM documentation: multimodal inputs and OpenAI-compatible server.
