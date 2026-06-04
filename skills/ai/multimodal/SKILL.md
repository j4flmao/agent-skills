---
name: ai-multimodal
description: >
  Use this skill when building multimodal systems: CLIP, LLaVA, BLIP, Qwen-VL, GPT-4V, vision-language models, image captioning, visual QA, multimodal RAG, image understanding, video understanding, multimodal search.
  This skill enforces: VLM selection based on task requirements, multimodal RAG architecture with separate/text+image retrieval, CLIP embedding strategy for cross-modal search, prompting strategy for VLMs.
  Do NOT use for: text-only LLM fine-tuning, audio/speech processing, text embedding model selection.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, multimodal, vision-language, phase-11]
---

# Multimodal Agent

## Purpose
Design multimodal AI systems with vision-language models, image understanding, multimodal RAG, and cross-modal search using CLIP embeddings.

## Agent Protocol

### Trigger
User request includes: multimodal, CLIP, LLaVA, GPT-4V, vision-language, image captioning, visual QA, multimodal RAG, BLIP, Qwen-VL, image understanding, video understanding, multimodal search.

### Protocol
1. Clarify task type: image captioning, VQA, multimodal retrieval, or video understanding.
2. Select VLM based on task, latency, and quality requirements.
3. Design multimodal RAG architecture: separate or unified embedding spaces.
4. Configure CLIP embeddings for cross-modal text-image search.
5. Define prompting strategy for vision-language models.
6. Set up evaluation metrics for multimodal tasks.

## Output
Multimodal architecture with model selection, pipeline design, RAG strategy.

### Response Format
```
## Multimodal Configuration
### Model
VLM: {CLIP / LLaVA / BLIP / Qwen-VL / GPT-4V}
Vision Encoder: {ViT-L/14 / SigLIP / EVA-CLIP}
Language Model: {LLaMA / Qwen / GPT-4}
Resolution: {224x224 / 336x336 / 448x448}

### Task
Type: {captioning / VQA / retrieval / video}
Input: {image / image+text / video+text}
Output: {text / embeddings / bounding boxes}

### Multimodal RAG
Strategy: {separate / unified embedding}
Image Retriever: {CLIP ViT-L/14}
Text Retriever: {BGE-large / OpenAI ada-002}
Fusion: {late fusion / cross-attention}
Context Format: {interleaved image+text / image-block + text}

### Evaluation
Metric: {CIDEr / BLEU / CLIPScore / retrieval recall@k}
Baseline: {score}
Target: {score}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] VLM selected with task-specific rationale (quality, latency, cost).
- [ ] Multimodal RAG architecture designed with retrieval and fusion strategy.
- [ ] CLIP embedding configuration for cross-modal search.
- [ ] Prompting strategy for VLM inputs (image + text formatting).
- [ ] Evaluation metrics chosen for task type.
- [ ] Video understanding approach specified (frame sampling, temporal modeling).

## Workflow

### Step 1: Select Vision-Language Model
- **GPT-4V**: Highest quality, general-purpose. Best for complex VQA and reasoning. API-based, higher cost.
- **LLaVA-1.6**: Open-source, fine-tuned LLaMA + CLIP. Best for self-hosted VQA and captioning.
- **BLIP-3 / Florence-2**: Strong captioning and fine-grained understanding. Instruction-tuned.
- **Qwen-VL**: Strong multilingual multimodal. Best for non-English inputs.
- **CLIP**: Embeddings only (no generation). Best for multimodal search and zero-shot classification.

### Step 2: Image Understanding with VLM
```python
# LLaVA inference
from transformers import LlavaNextProcessor, LlavaNextForConditionalGeneration

processor = LlavaNextProcessor.from_pretrained("llava-hf/llava-v1.6-mistral-7b-hf")
model = LlavaNextForConditionalGeneration.from_pretrained("llava-hf/llava-v1.6-mistral-7b-hf")

prompt = "[INST] <image>\nDescribe this image in detail [/INST]"
inputs = processor(text=prompt, images=image, return_tensors="pt")
output = model.generate(**inputs, max_new_tokens=200)
caption = processor.decode(output[0], skip_special_tokens=True)
```

### Step 3: CLIP Embeddings for Multimodal Search
```python
from transformers import CLIPProcessor, CLIPModel
import torch

model = CLIPModel.from_pretrained("openai/clip-vit-large-patch14")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-large-patch14")

# Encode images and text into shared embedding space
image_inputs = processor(images=images, return_tensors="pt")
text_inputs = processor(text=["a photo of a cat", "a dog in the park"], return_tensors="pt")

with torch.no_grad():
    image_embeds = model.get_image_features(**image_inputs)
    text_embeds = model.get_text_features(**text_inputs)
    # Normalize for cosine similarity
    image_embeds = image_embeds / image_embeds.norm(dim=-1, keepdim=True)
    text_embeds = text_embeds / text_embeds.norm(dim=-1, keepdim=True)

# Similarity matrix
similarity = text_embeds @ image_embeds.T
```

### Step 4: Multimodal RAG
```python
# Separate embedding spaces
class MultimodalRAG:
    def __init__(self):
        self.image_encoder = CLIPModel.from_pretrained("openai/clip-vit-large-patch14")
        self.text_encoder = SentenceTransformer("BAAI/bge-large-en-v1.5")
        self.image_index = faiss.IndexFlatIP(768)  # CLIP dim
        self.text_index = faiss.IndexFlatIP(1024)  # BGE dim

    def retrieve(self, query, k=5):
        query_embed = self.text_encoder.encode(query)
        # Retrieve from both indexes
        text_scores, text_idx = self.text_index.search(query_embed, k)
        image_scores, image_idx = self.image_index.search(query_embed, k)
        return text_idx, image_idx

    def generate(self, query, retrieved_texts, retrieved_images):
        context = format_multimodal_context(retrieved_texts, retrieved_images)
        prompt = f"Context: {context}\n\nQuestion: {query}\nAnswer:"
        return llm.generate(prompt)
```

## Rules
- VLM image resolution impacts quality — higher is better but slower.
- CLIP embeddings normalized for cosine similarity in retrieval.
- Multimodal RAG: separate embedding spaces for text and images, late fusion.
- Frame sampling for video: 1 FPS or keyframe extraction — not all frames.
- Prompt VLMs with explicit image tags like `<image>` in the correct format.
- Captioning: use specific prompts ("Describe in detail including colors, objects, spatial layout").
- VQA: provide explicit answer format ("Answer yes or no:" / "Choose from options: A, B, C").
- Evaluation: CIDEr/BLEU for captioning, accuracy for VQA, recall@k for retrieval.
- Cost: GPT-4V is ~$0.01/image — batch and cache aggressively.
- Open-source VLMs (LLaVA, Qwen-VL) run on A100s with ~8-16GB VRAM.

## References
  - references/audio-models.md — Audio Models
  - references/multimodal-advanced.md — Multimodal Advanced Topics
  - references/multimodal-deployment.md — Multimodal Deployment
  - references/multimodal-evaluation.md — Multimodal Evaluation
  - references/multimodal-fundamentals.md — Multimodal Fundamentals
  - references/multimodal-rag.md — Multimodal RAG
  - references/vision-language-models.md — Vision-Language Models
  - references/vision-models.md — Vision Models
## Handoff
For text-only RAG, hand off to `ai-rag-patterns`. For embedding model selection, hand off to `ai-embeddings`. For fine-tuning vision-language models, hand off to `ai-model-training`.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, late-fusion models, and cross-modal projection frameworks.
-->

