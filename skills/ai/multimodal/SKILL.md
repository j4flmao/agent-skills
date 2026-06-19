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

## Implementation Patterns

### VLM Selection Decision Matrix

```
Task Type → Recommended VLM → Why
├── Image Captioning (generic)
│   ├── LLaVA-1.6 7B → Best open-source quality/speed tradeoff
│   ├── BLIP-3 → Specialized for detailed region-level captioning
│   └── GPT-4V → Highest quality but $0.01+/image
│
├── Visual Question Answering
│   ├── LLaVA-1.6 13B → Strong reasoning, self-hostable
│   ├── Qwen-VL → Best multilingual VQA
│   └── GPT-4V → Complex reasoning, chart/diagram understanding
│
├── Multimodal Retrieval
│   ├── CLIP ViT-L/14 → 768-dim embeddings, best general retrieval
│   ├── SigLIP → Better multilingual alignment
│   ├── EVA-CLIP → Higher accuracy on zero-shot benchmarks
│   └── JINA CLIP-v2 → 1024-dim, trained for retrieval tasks
│
├── Video Understanding
│   ├── Video-LLaVA → Open-source video-language model
│   ├── GPT-4V → Best but expensive for video frames
│   └── InternVideo2 → Strong spatiotemporal modeling
│
└── Document/Chart Understanding
    ├── OCR-free VLMs (Donut, Pix2Struct) → No OCR pipeline needed
    ├── LayoutLMv3 → Layout + text + vision fusion
    └── GPT-4V → Best for complex charts and diagrams
```

### Image Preprocessing Pipeline

```python
import torch
import torchvision.transforms as T
from PIL import Image

class MultimodalPreprocessor:
    def __init__(self, target_size=336, strategy="pad"):
        self.target_size = target_size
        self.strategy = strategy
        self.transform = self._build_transform()

    def _build_transform(self):
        return T.Compose([
            T.Resize(self.target_size, interpolation=T.InterpolationMode.BICUBIC),
            self._get_sizing_strategy(),
            T.ToTensor(),
            T.Normalize(mean=[0.4815, 0.4578, 0.4082], std=[0.2686, 0.2613, 0.2758]),
        ])

    def _get_sizing_strategy(self):
        if self.strategy == "pad":
            return T.Pad(padding=self.target_size // 8, fill=0, padding_mode="constant")
        elif self.strategy == "center_crop":
            return T.CenterCrop(self.target_size)
        return T.Lambda(lambda x: x)

    def __call__(self, image: Image.Image) -> torch.Tensor:
        return self.transform(image).unsqueeze(0)
```

### Unified Embedding Space (CLIP + Text)

```python
class UnifiedMultimodalEncoder:
    def __init__(self, clip_model_name="openai/clip-vit-large-patch14", text_model_name="BAAI/bge-large-en-v1.5"):
        self.clip = CLIPModel.from_pretrained(clip_model_name)
        self.clip_processor = CLIPProcessor.from_pretrained(clip_model_name)
        self.text_encoder = SentenceTransformer(text_model_name)
        # Projection layer to unify dimensions
        self.projection = torch.nn.Linear(768, 1024)

    def encode_image(self, image):
        inputs = self.clip_processor(images=image, return_tensors="pt")
        with torch.no_grad():
            emb = self.clip.get_image_features(**inputs)
            emb = emb / emb.norm(dim=-1, keepdim=True)
        return emb

    def encode_text_clip(self, text):
        inputs = self.clip_processor(text=text, return_tensors="pt")
        with torch.no_grad():
            emb = self.clip.get_text_features(**inputs)
            emb = emb / emb.norm(dim=-1, keepdim=True)
        return emb

    def encode_text_bge(self, text):
        emb = self.text_encoder.encode(text, normalize_embeddings=True)
        return torch.tensor(emb).unsqueeze(0)
```

### Multimodal RAG with Late Fusion

```python
class LateFusionMultimodalRAG:
    def __init__(self, image_index, text_index, llm):
        self.image_index = image_index
        self.text_index = text_index
        self.llm = llm
        self.fusion_weight = 0.5

    def retrieve(self, query: str, k: int = 5) -> dict:
        query_emb = self._embed_query(query)
        image_scores, image_ids = self.image_index.search(query_emb, k)
        text_scores, text_ids = self.text_index.search(query_emb, k)
        return {
            "images": list(zip(image_ids[0], image_scores[0])),
            "texts": list(zip(text_ids[0], text_scores[0])),
        }

    def fuse_results(self, results: dict, k: int = 5) -> list:
        combined = {}
        for i, (idx, score) in enumerate(results["images"]):
            combined[f"img_{idx}"] = score * self.fusion_weight
        for i, (idx, score) in enumerate(results["texts"]):
            key = f"txt_{idx}"
            combined[key] = combined.get(key, 0) + score * (1 - self.fusion_weight)
        return sorted(combined.items(), key=lambda x: -x[1])[:k]

    def generate(self, query: str, fused_results: list):
        context_parts = []
        for key, score in fused_results:
            if key.startswith("img_"):
                context_parts.append(f"[Image {key}]")
            else:
                context_parts.append(f"[Text {key}]")
        context = "\n".join(context_parts)
        prompt = f"Context:\n{context}\n\nQuestion: {query}\nAnswer:"
        return self.llm.generate(prompt)
```

### Video Frame Sampling Strategies

```python
class VideoFrameSampler:
    def __init__(self, strategy="uniform", max_frames=16):
        self.strategy = strategy
        self.max_frames = max_frames

    def sample(self, video_path: str) -> list:
        if self.strategy == "uniform":
            return self._uniform_sample(video_path)
        elif self.strategy == "keyframe":
            return self._keyframe_extraction(video_path)
        elif self.strategy == "scene_detect":
            return self._scene_based_sampling(video_path)
        raise ValueError(f"Unknown strategy: {self.strategy}")

    def _uniform_sample(self, video_path):
        """Sample N frames evenly across video duration."""
        import cv2
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        indices = [int(i * total_frames / self.max_frames) for i in range(self.max_frames)]
        frames = []
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if ret:
                frames.append(frame)
        cap.release()
        return frames

    def _keyframe_extraction(self, video_path):
        """Extract keyframes using histogram difference."""
        import cv2
        cap = cv2.VideoCapture(video_path)
        frames = []
        prev_hist = None
        while len(frames) < self.max_frames:
            ret, frame = cap.read()
            if not ret:
                break
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            hist = cv2.calcHist([gray], [0], None, [16], [0, 256])
            hist = hist / hist.sum()
            if prev_hist is None or cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CHISQR) > 0.5:
                frames.append(frame)
                prev_hist = hist
        cap.release()
        return frames
```

### VLM Prompt Engineering Patterns

```python
# Captioning prompt templates
CAPTION_PROMPTS = {
    "detailed": (
        "Describe this image in detail, including: "
        "colors, objects, spatial relationships, text content, "
        "people (if any), actions, and overall scene composition."
    ),
    "brief": "Describe this image in one sentence.",
    "structured": (
        "Analyze this image and provide:\n"
        "- Objects detected\n"
        "- Scene type\n"
        "- Text content (if any)\n"
        "- Color palette\n"
        "- Estimated mood/atmosphere"
    ),
}

# VQA prompt templates
VQA_PROMPTS = {
    "yes_no": "Answer yes or no: {question}",
    "multiple_choice": (
        "Choose the correct answer from options A, B, C, or D.\n"
        "Question: {question}\n"
        "Options:\n{options}\n"
        "Answer:"
    ),
    "open_ended": "Question: {question}\nAnswer in 1-3 sentences:",
}

def build_vlm_prompt(task_type: str, image_tag: str = "<image>", **kwargs):
    if task_type == "caption":
        prompt = CAPTION_PROMPTS.get(kwargs.get("style", "detailed"))
    elif task_type == "vqa":
        prompt = VQA_PROMPTS.get(kwargs.get("format", "open_ended"))
    elif task_type == "retrieval":
        prompt = "Retrieve relevant information from the provided context."
    else:
        raise ValueError(f"Unknown task: {task_type}")
    return f"{image_tag}\n{prompt}"
```

## Architecture Decision Trees

### Embedding Strategy Selection

```
Need multimodal search?
├── Single embedding space (CLIP only)
│   ├── Simple text↔image similarity → CLIP ViT-L/14 (768d)
│   ├── Zero-shot classification → CLIP with class prompts
│   └── High recall needed → Ensemble CLIP + SigLIP
│
├── Separate embedding spaces (CLIP + text embedder)
│   ├── Text-to-image retrieval dominant
│   │   → CLIP for images, BGE-large for text
│   │   → Late fusion at retrieval time
│   ├── Cross-modal ranking needed
│   │   → CLIP for both (unified space)
│   │   → Pros: simpler, single index. Cons: lower text quality
│   └── Multilingual search
│       → CLIP multilingual variant + BGE-m3
│       → Align via projection layer
│
└── Hybrid (CLIP + reranker)
    ├── Stage 1: CLIP retrieves top-100 candidates
    ├── Stage 2: Cross-modal reranker (e.g., BLIP-3) re-ranks top-20
    └── Best accuracy but higher latency and cost
```

### Deployment Architecture Decision

```
Production deployment requirements?
├── Latency < 500ms → Use distilled VLM (LLaVA-1.6 7B, Phi-3-vision)
├── Latency < 2s → Use LLaVA-1.6 13B or Qwen-VL 7B
├── Latency < 5s → GPT-4V or LLaVA-1.6 34B
├── Self-hosted
│   ├── GPU available (A100 80GB) → LLaVA-34B, Qwen-VL-72B
│   ├── GPU (A100 40GB) → LLaVA-13B, Qwen-VL-7B
│   └── CPU / Edge → MobileCLIP, TinyLLaVA, ONNX-optimized
├── API-based → GPT-4V, Gemini Pro Vision, Claude 3 Vision
└── Cost-sensitive
    ├── Stage 1: CLIP embedding (low cost, bulk filtering)
    └── Stage 2: GPT-4V only for top-5 ranked candidates
```

## Production Considerations

### Batching and Caching Strategy

```python
class MultimodalCache:
    def __init__(self, cache_dir: str = "./cache", ttl: int = 3600):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.ttl = ttl

    def get_image_embedding(self, image_hash: str) -> torch.Tensor | None:
        cache_path = self.cache_dir / f"{image_hash}.pt"
        if cache_path.exists():
            if time.time() - cache_path.stat().st_mtime < self.ttl:
                return torch.load(cache_path)
        return None

    def set_image_embedding(self, image_hash: str, embedding: torch.Tensor):
        cache_path = self.cache_dir / f"{image_hash}.pt"
        torch.save(embedding, cache_path)

    def batch_process(self, images: list, batch_size: int = 32) -> list:
        results = []
        for i in range(0, len(images), batch_size):
            batch = images[i:i + batch_size]
            inputs = self.processor(images=batch, return_tensors="pt", padding=True)
            with torch.no_grad():
                embeddings = self.model.get_image_features(**inputs)
            results.append(embeddings)
        return torch.cat(results, dim=0)
```

## Security Considerations

- **Prompt injection via images**: Adversarial images can contain hidden text that bypasses safety filters. Always apply input sanitization and output filtering for VLM responses.
- **Data leakage in VLM training data**: Public VLMs may regurgitate sensitive information from training sets. Use dedicated fine-tuned models for proprietary data.
- **Image metadata exposure**: EXIF data (GPS coordinates, camera info) in uploaded images should be stripped before processing.
- **Model poisoning risk**: Open-source VLM checkpoints can contain backdoors. Verify model hashes against official releases and scan for suspicious weights.
- **Rate limiting and cost control**: API-based VLMs (GPT-4V) cost per-image. Implement per-user rate limiting and budget caps to prevent runaway costs.
- **Output validation**: VLM outputs can contain hallucinations, biases, or offensive content. Apply content filtering and factual consistency checks before surfacing to users.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Using raw CLIP embeddings without normalization | Cosine similarity produces meaningless results | Always L2-normalize embeddings before indexing or comparison |
| Feeding all video frames to VLM | Exponentially increases cost and latency with minimal quality gain | Sample 4-16 keyframes using scene detection |
| Single embedding space for all modalities | CLIP text encoder quality is lower than dedicated text embedders | Use separate spaces with late fusion or projection layers |
| Ignoring image resolution in VLM prompts | Low-res images miss fine details needed for accurate captioning | Always pass original resolution metadata alongside downscaled inputs |
| Using GPT-4V for every image | $0.01/image adds up fast; most images don't need GPT-4V quality | Tiered approach: CLIP → BLIP/LLaVA → GPT-4V for hard cases |
| Not handling image rotation/orientation | VLMs trained on correctly oriented images fail on rotated inputs | Apply EXIF-based auto-rotation before VLM processing |
| Batch processing without padding | Different-sized images in a batch cause tensor shape errors | Use consistent resizing + padding to uniform size within batches |

## Performance Optimization

- **Model quantization**: Use 8-bit or 4-bit quantization (bitsandbytes) to reduce VLM VRAM usage by 50-75% with <2% accuracy loss.
- **KV-cache optimization**: For self-hosted VLMs, enable Flash Attention 2 for 2-3x faster inference on compatible GPUs.
- **Embedding index tiering**: Store CLIP embeddings in FAISS with IVF-PQ indexing for 10-100x faster search at 5-10% recall cost.
- **Async image fetching**: Fetch and preprocess images in parallel using asyncio while the LLM generates text for previous samples.
- **Image deduplication**: Perceptual hashing (pHash) detects near-duplicate images, reducing redundant VLM calls by 20-40%.
- **Dynamic resolution scaling**: Start with 224px, increase to 336px only if the VLM confidence is below threshold.
- **Batch API calls**: Group multiple image requests into single API calls where supported (GPT-4V batch API reduces cost by 50%).
- **Speculative decoding**: Use a small draft model (TinyLLaVA) to predict VLM outputs, verified by the full model for 2x latency improvement.

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

