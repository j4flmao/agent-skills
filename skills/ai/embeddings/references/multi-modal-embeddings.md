# Multi-Modal Embeddings

## Overview

Multi-modal embeddings map different data modalities (text, image, audio, video) into a shared vector space, enabling cross-modal retrieval and multi-modal understanding.

## CLIP (Contrastive Language-Image Pre-training)

CLIP trains a text encoder and image encoder jointly with contrastive learning on 400M (image, text) pairs.

### Architecture

```
Text branch:  [Text] → Tokenizer → Text Transformer → Linear proj → Text Embedding
Image branch: [Image] → ViT/ResNet → Patch features → Linear proj → Image Embedding

Training: InfoNCE loss over batch of N (image, text) pairs
  - N^2 comparisons: image_i matches text_i (positive), rest are negatives
  - Temperature tau scales logits
  - Both branches learn aligned embedding space
```

### Available CLIP Models

```
Model                  │ Dims │ Zero-shot ImageNet
───────────────────────┼──────┼───────────────────
OpenAI CLIP ViT-B/32   │ 512  │ 63.2%
OpenAI CLIP ViT-L/14   │ 768  │ 75.5%
OpenCLIP ViT-H-14      │ 1024 │ 78.0%
SigLIP ViT-SO400M      │ 1152 │ 83.0%
nomic-ai/vit-clip      │ 768  │ 70.5%
```

### CLIP Usage

```python
import torch
import clip
import numpy as np

class CLIPEmbedder:
    def __init__(self, model_name: str = "ViT-B/32", device: str = "cpu"):
        self.model, self.preprocess = clip.load(model_name, device=device)
        self.model.eval()
        self.device = device

    def embed_text(self, texts: list[str]) -> np.ndarray:
        texts = clip.tokenize(texts, truncate=True).to(self.device)
        with torch.no_grad():
            embeds = self.model.encode_text(texts)
            embeds = embeds / embeds.norm(dim=-1, keepdim=True)
        return embeds.cpu().numpy()

    def embed_image(self, images: list[np.ndarray]) -> np.ndarray:
        from PIL import Image
        processed = torch.stack([
            self.preprocess(Image.fromarray(img)) for img in images
        ]).to(self.device)
        with torch.no_grad():
            embeds = self.model.encode_image(processed)
            embeds = embeds / embeds.norm(dim=-1, keepdim=True)
        return embeds.cpu().numpy()
```

## ImageBind

ImageBind binds embeddings across six modalities using image as a bridge modality.

```
Modalities: Image, Text, Audio, Depth, Thermal, IMU

Training: Each modality aligned to image embeddings via contrastive loss.
  - Image <-> Text (like CLIP)
  - Image <-> Audio (paired data)
  - Image <-> Depth, Thermal, IMU (paired data)

Key insight: Text <-> Audio works without direct text-audio pairs,
because both align to the shared image space.
```

```python
class ImageBindEmbedder:
    def __init__(self, device: str = "cuda"):
        from imagebind.models import imagebind_model
        from imagebind.data import load_and_transform_text, load_and_transform_audio, load_and_transform_vision_data
        from imagebind.models.imagebind_model import ModalityType

        self.model = imagebind_model.imagebind_huge(pretrained=True)
        self.model.eval()
        self.model.to(device)
        self.device = device
        self.ModalityType = ModalityType
        self._load = load_and_transform_text
        self._load_audio = load_and_transform_audio
        self._load_vision = load_and_transform_vision_data

    def embed_text(self, texts: list[str]) -> np.ndarray:
        inputs = {self.ModalityType.TEXT: self._load(texts, self.device)}
        with torch.no_grad():
            embeds = self.model(inputs)[self.ModalityType.TEXT]
            embeds = embeds / embeds.norm(dim=-1, keepdim=True)
        return embeds.cpu().numpy()
```

## Multi-Modal Retrieval Patterns

### Pattern 1: Text-to-Image Search

```
Query: "a red car driving on a snowy road"
  -> CLIP text encoder -> text_embed
  -> Search image index (pre-embedded with CLIP vision encoder)
  -> Return top-k images by cosine similarity
```

```python
class TextToImageSearch:
    def __init__(self, clip_embedder: CLIPEmbedder):
        self.clip = clip_embedder

    def index_images(self, image_paths: list[str]):
        import faiss
        self.image_paths = image_paths
        from PIL import Image
        images = [np.array(Image.open(p)) for p in image_paths]
        self.image_embeddings = self.clip.embed_image(images)
        d = self.image_embeddings.shape[1]
        self.index = faiss.IndexFlatIP(d)
        self.index.add(self.image_embeddings.astype(np.float32))

    def search(self, query: str, k: int = 10) -> list[dict]:
        text_embed = self.clip.embed_text([query]).astype(np.float32)
        distances, indices = self.index.search(text_embed, k)
        return [
            {"path": self.image_paths[idx], "score": float(dist)}
            for idx, dist in zip(indices[0], distances[0])
        ]
```

### Pattern 2: Image-to-Text Search

```
Query image -> CLIP vision encoder -> image_embed
  -> Search text index (pre-embedded with CLIP text encoder)
  -> Return text descriptions matching image content
```

### Pattern 3: Multi-Modal RAG

```python
class MultiModalRAG:
    def __init__(self, text_embedder, image_embedder):
        self.text_embedder = text_embedder
        self.image_embedder = image_embedder

    def retrieve(self, query: str, k_text: int = 5, k_image: int = 3) -> dict:
        query_embed = self.text_embedder.embed_text([query])
        text_scores = self.text_index.search(query_embed, k_text)
        image_scores = self.image_index.search(query_embed, k_image)
        return {
            "texts": [{"chunk": self.text_chunks[idx], "score": float(score)}
                      for idx, score in zip(*text_scores)],
            "images": [{"path": self.image_paths[idx], "score": float(score)}
                       for idx, score in zip(*image_scores)],
        }
```

## Fusion Strategies

### Early Fusion

```python
def early_fusion(text_embed: np.ndarray, image_embed: np.ndarray) -> np.ndarray:
    """Concatenate + project. Requires learned projection matrix."""
    combined = np.concatenate([text_embed, image_embed])
    projection = np.random.randn(len(combined), 768) * 0.01
    return combined @ projection
```

### Late Fusion

```python
def late_fusion(
    text_sim: float, image_sim: float, text_weight: float = 0.6
) -> float:
    """Weighted per-modality similarity. No learned params."""
    return text_weight * text_sim + (1 - text_weight) * image_sim
```

### Fusion Trade-offs

```
Fusion     │ Complexity │ Quality   │ Use Case
───────────┼────────────┼───────────┼─────────────────────────
Early      │ Medium     │ Good      │ Fixed pipeline, one model
Late       │ Low        │ Fair      │ Multi-model ensembles
Cross-attn │ High       │ Best      │ Fine-grained retrieval
```

## Multi-Modal Embedding Quality

### Benchmark Datasets

```
Dataset       │ Task                 │ Size
──────────────┼──────────────────────┼────────
Flickr30K     │ Text<->Image         │ 31K images
MS-COCO       │ Text<->Image         │ 123K images
Crossmodal 3600│ Multilingual->Image │ 3.6K images
AudioCaps     │ Text<->Audio         │ 50K clips
MSR-VTT       │ Text<->Video         │ 10K videos
```

### CLIP Quality

```
Model                     │ Flickr30K R@1 (T->I)
──────────────────────────┼─────────────────────
CLIP ViT-B/32             │ 68.7
CLIP ViT-L/14             │ 79.1
OpenCLIP ViT-H-14         │ 84.5
SigLIP ViT-SO400M         │ 89.2
EVA-CLIP-g-14             │ 90.1
```

### Training Multi-Modal Embeddings

```python
def multimodal_contrastive_loss(
    text_embeds: torch.Tensor,
    image_embeds: torch.Tensor,
    temperature: float = 0.07,
) -> torch.Tensor:
    """InfoNCE loss for multi-modal alignment.
    Both inputs: (batch_size, dim), L2-normalized.
    """
    batch_size = text_embeds.shape[0]
    logits = text_embeds @ image_embeds.T / temperature
    labels = torch.arange(batch_size, device=text_embeds.device)
    loss_t = torch.nn.functional.cross_entropy(logits, labels)
    loss_i = torch.nn.functional.cross_entropy(logits.T, labels)
    return (loss_t + loss_i) / 2
```

## Key Points
- CLIP is the standard for text-image embeddings: choose ViT-L/14 or larger for quality.
- ImageBind extends to 6 modalities using image as bridge — enables audio-text retrieval transitively.
- All multi-modal embeddings share the same design: per-modality encoders + contrastive alignment loss.
- Multi-modal RAG retrieves both text passages and images: use shared embedding space for unified search.
- Late fusion is simpler and interpretable; cross-attention fusion captures finer interactions.
- Early fusion requires full re-training when modalities change; late fusion swaps encoders independently.
- Evaluate on Recall@K for each retrieval direction (text->image, image->text, etc.).
- SigLIP (sigmoid loss) outperforms CLIP (softmax) by decoupling loss from batch size.
- Normalize embeddings from all modalities to unit length for cross-modal cosine comparison.
- Multi-modal embeddings require paired training data — synthetic pairing (ViT + captioner) is viable.
