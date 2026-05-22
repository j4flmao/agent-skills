# Embedding Training

## Contrastive Learning

```python
from sentence_transformers import SentenceTransformer, InputExample, losses
from torch.utils.data import DataLoader

model = SentenceTransformer('BAAI/bge-base-en-v1.5')

# Training data: (anchor, positive, [hard_negative])
train_data = [
    InputExample(texts=['What is ML?', 'Machine learning is a subset of AI.', 'The weather is nice.']),
    InputExample(texts=['Python for data science', 'Python is great for data analysis.', 'JavaScript is for web.']),
    InputExample(texts=['Deep learning basics', 'Neural networks learn from data.', 'Cooking recipes.']),
]

train_dataloader = DataLoader(train_data, batch_size=16, shuffle=True)

# MultipleNegativesRankingLoss: pushes positive close, negatives far
train_loss = losses.MultipleNegativesRankingLoss(model)

model.fit(
    train_objectives=[(train_dataloader, train_loss)],
    epochs=5,
    warmup_steps=100,
    optimizer_params={'lr': 2e-5},
    show_progress_bar=True,
    output_path='./fine-tuned-embedding-model',
)
```

## Matryoshka Embeddings

```python
import torch
import torch.nn as nn
from sentence_transformers import SentenceTransformer, models

# Matryoshka: train with variable dimensions
# Final model can output embeddings at any dimension <= max_dim

class MatryoshkaLoss(nn.Module):
    def __init__(self, base_loss, dims=[64, 128, 256, 512, 768]):
        super().__init__()
        self.base_loss = base_loss
        self.dims = dims

    def forward(self, sentence_features, labels):
        # Get full embeddings
        embeddings = self.base_loss.model(sentence_features)['sentence_embedding']
        loss = 0
        # Compute loss at each dimension
        for dim in self.dims:
            truncated = embeddings[:, :dim]
            loss += self.base_loss(truncated, labels)
        return loss / len(self.dims)

# Nomic's approach: Matryoshka representation learning
model = SentenceTransformer('nomic-ai/nomic-embed-text-v1')
# At inference time, use any dimension:
embeddings_768 = model.encode(texts)           # full 768d
embeddings_256 = model.encode(texts, truncate_dim=256)  # 256d
embeddings_128 = model.encode(texts, truncate_dim=128)  # 128d
```

## Quantization

```python
import numpy as np

# FP32 -> int8 quantization
def quantize_int8(embeddings_f32):
    """Quantize FP32 embeddings to int8 with scale factors."""
    abs_max = np.max(np.abs(embeddings_f32), axis=1, keepdims=True)
    scale = abs_max / 127.0
    embeddings_int8 = np.round(embeddings_f32 / scale).astype(np.int8)
    return embeddings_int8, scale

def dequantize_int8(embeddings_int8, scale):
    return embeddings_int8.astype(np.float32) * scale

# Binary quantization
def quantize_binary(embeddings_f32):
    """Quantize to binary (1 bit per dimension)."""
    median = np.median(embeddings_f32, axis=1, keepdims=True)
    binary = (embeddings_f32 > median).astype(np.int8)
    return binary

# Test quality impact
original = np.random.randn(100, 768).astype(np.float32)
original = original / np.linalg.norm(original, axis=1, keepdims=True)

quantized, scale = quantize_int8(original)
dequantized = dequantize_int8(quantized, scale)

cosine_sim = np.sum(original * dequantized, axis=1)
print(f"int8 quality: mean cos sim = {cosine_sim.mean():.4f}")

binary = quantize_binary(original)
# Binary: use Hamming distance for search
from scipy.spatial.distance import hamming
hamming_dist = hamming(binary[0], binary[1])
```

## Caching Strategy

```python
from functools import lru_cache
import hashlib
import time

class EmbeddingCache:
    def __init__(self, model, cache_size=10000, ttl=3600):
        self.model = model
        self.cache = {}
        self.cache_size = cache_size
        self.ttl = ttl

    def _key(self, text):
        return hashlib.md5(text.encode()).hexdigest()

    def encode(self, texts):
        results = []
        uncached = []
        uncached_idx = []

        for i, text in enumerate(texts):
            key = self._key(text)
            if key in self.cache:
                entry = self.cache[key]
                if time.time() - entry['timestamp'] < self.ttl:
                    results.append(entry['embedding'])
                    continue
            uncached.append(text)
            uncached_idx.append(i)

        if uncached:
            new_embeddings = self.model.encode(uncached)
            for text, emb in zip(uncached, new_embeddings):
                if len(self.cache) >= self.cache_size:
                    oldest = min(self.cache, key=lambda k: self.cache[k]['timestamp'])
                    del self.cache[oldest]
                self.cache[self._key(text)] = {
                    'embedding': emb,
                    'timestamp': time.time(),
                }
            # Insert into results
            new_idx = 0
            for orig_idx in uncached_idx:
                results.insert(orig_idx, new_embeddings[new_idx])
                new_idx += 1

        return results
```

## Indexed Storage with FAISS

```python
import faiss
import numpy as np
import pickle

class EmbeddingIndex:
    def __init__(self, dimension, metric='cosine'):
        self.dimension = dimension
        if metric == 'cosine':
            self.index = faiss.IndexFlatIP(dimension)  # inner product = cosine (if normalized)
        else:
            self.index = faiss.IndexFlatL2(dimension)
        self.documents = []

    def add(self, embeddings, documents):
        embeddings = np.array(embeddings).astype(np.float32)
        faiss.normalize_L2(embeddings)  # normalize for cosine
        self.index.add(embeddings)
        self.documents.extend(documents)

    def search(self, query_embedding, k=10):
        query = np.array([query_embedding]).astype(np.float32)
        faiss.normalize_L2(query)
        distances, indices = self.index.search(query, k)
        results = [
            {"doc": self.documents[idx], "score": float(dist)}
            for idx, dist in zip(indices[0], distances[0])
            if idx != -1
        ]
        return results

    def save(self, path):
        faiss.write_index(self.index, f"{path}.index")
        with open(f"{path}.docs", "wb") as f:
            pickle.dump(self.documents, f)

    def load(self, path):
        self.index = faiss.read_index(f"{path}.index")
        with open(f"{path}.docs", "rb") as f:
            self.documents = pickle.load(f)

# Advanced: IVFPQ for large-scale
def build_large_index(embeddings, dimension, nlist=100):
    quantizer = faiss.IndexFlatIP(dimension)
    index = faiss.IndexIVFPQ(quantizer, dimension, nlist, 8, 8)  # 8 bytes per vector
    index.train(embeddings)
    index.add(embeddings)
    index.nprobe = 10  # search 10 clusters
    return index
```
