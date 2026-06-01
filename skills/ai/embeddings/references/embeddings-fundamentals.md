# Embeddings Fundamentals

## Vector Space Geometry

Embeddings map discrete tokens (words, sentences, documents) into a continuous vector space R^d. The geometry of this space encodes semantic relationships: semantically similar texts have nearby vectors, while dissimilar texts are far apart.

### Linear Algebra of Embedding Spaces

```
Embedding as function: f: text → R^d
  - d = dimensionality (384, 768, 1024, 3072)
  - Each dimension is NOT interpretable individually
  - The direction of the vector carries semantic meaning
  - The magnitude (norm) encodes "information content" or "specificity"

Vector operations in embedding space:
  - Dot product: sim(a, b) = Σ a_i × b_i
    Range: unbounded. Sensitive to vector magnitude.
    Use: efficient with normalized vectors (becomes cosine).
  - Cosine similarity: sim(a, b) = (a · b) / (||a|| × ||b||)
    Range: [-1, 1] for any vectors, [0, 1] for normalized.
    Use: standard for sentence embeddings. Invariant to magnitude.
  - Euclidean distance: d(a, b) = ||a - b||₂
    Range: [0, ∞). Sensitive to magnitude.
    Use: clustering (KMeans), anomaly detection.
    Relationship to cosine for normalized vectors: ||a-b||² = 2(1 - cos(a,b))
  - Manhattan distance: d(a, b) = Σ |a_i - b_i|
    Range: [0, ∞).
    Use: high-dimensional spaces where L2 loses discriminative power.
```

### The Curse of Dimensionality in Embedding Spaces

```
Problem: As dimension increases, all pairwise distances converge.
  - Ratio of nearest to farthest neighbor distance → 1 as d → ∞
  - For d=384: ratio ≈ 0.7-0.8 (moderate discrimination)
  - For d=3072: ratio ≈ 0.9-0.95 (poor discrimination without normalization)

Mitigation strategies:
  1. L2 normalization: projects to unit hypersphere surface, improves discrimination
  2. Lower dimensionality: 384d > 768d > 1024d for distance discrimination
  3. Matryoshka truncation: use smallest dim that preserves task performance
  4. Contrastive training: explicitly shapes the space to separate similar/dissimilar

Empirical finding: Higher MTEB scores don't always mean better retrieval discrimination.
  - A model with MTEB 64.6 may underperform one with MTEB 62.3 on hard negatives
  - Always evaluate on your specific task distribution
```

## Distance Metrics

### When to Use Each Metric

```
Metric       │ Normalization │ Range    │ Speed  │ Best For
─────────────┼───────────────┼──────────┼────────┼────────────────────
Cosine       │ Not required  │ [-1, 1]  │ Medium │ Semantic similarity (default)
Dot Product  │ Required (L2) │ [0, 1]   │ Fast   │ FAISS IP index, normalized vectors
Euclidean L2 │ Optional      │ [0, ∞)   │ Medium │ Clustering, anomaly detection
Manhattan L1 │ Optional      │ [0, ∞)   │ Fast   │ High-dim spaces, binary vectors
Hamming      │ Required      │ [0, 1]   │ Very Fast│ Binary embeddings only
```

Rule: For 95% of embedding use cases, use cosine similarity with L2-normalized vectors. Exceptions: binary embeddings use Hamming, raw features use Euclidean for clustering.

### Distance Metric Implementation

```python
import numpy as np

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Cosine similarity between vectors a and b.
    a: (d,) or (n, d). b: (d,) or (m, d).
    """
    a_norm = a / np.linalg.norm(a, axis=-1, keepdims=True)
    b_norm = b / np.linalg.norm(b, axis=-1, keepdims=True)
    return a_norm @ b_norm.T

def dot_product_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Dot product. Only valid if both are already L2-normalized.
    Equivalent to cosine for normalized vectors.
    """
    return a @ b.T

def euclidean_distance(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Euclidean distance. For normalized vectors, relates to cosine."""
    return np.linalg.norm(a[:, np.newaxis] - b[np.newaxis, :], axis=-1)

def max_sim_to_ground_truth(embeddings: np.ndarray, gt_embeddings: np.ndarray) -> float:
    """Fraction of queries where top-1 by cosine has GT in top-10."""
    sims = cosine_similarity(embeddings, gt_embeddings)
    top10 = np.argsort(-sims, axis=1)[:, :10]
    gt_hits = np.any(top10 == np.arange(len(gt_embeddings))[:, None], axis=1)
    return gt_hits.mean()
```

## Normalization

### L2 Normalization (Unit Length)

Normalization projects each embedding vector onto the surface of a unit hypersphere. This is critical because:

1. Dot product = cosine similarity for normalized vectors
2. Removes magnitude bias (longer documents produce higher-magnitude embeddings)
3. Enables fair comparison across texts of different lengths
4. Required for inner product-based vector indexes (FAISS IndexIP)

```python
def l2_normalize(embeddings: np.ndarray) -> np.ndarray:
    """L2 normalize to unit length. In-place safe."""
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    # Avoid division by zero for zero vectors
    norms = np.where(norms < 1e-12, 1.0, norms)
    return embeddings / norms

# Verification
assert np.allclose(
    np.linalg.norm(normalized_embeddings, axis=1),
    1.0,
    atol=1e-6
)
```

Important: Normalization should happen AFTER any pooling operation, not before.

### Impact of Not Normalizing

```python
# Without normalization, long documents dominate
short_text = "OpenAI embeddings."
long_text = "OpenAI embeddings convert text into vector representations. " * 100

model = SentenceTransformer("all-MiniLM-L6-v2")
short_emb = model.encode(short_text, normalize_embeddings=True)
long_emb = model.encode(long_text, normalize_embeddings=True)

# Compare normalized vs unnormalized
sim_normalized = float(short_emb @ long_emb)

long_unnorm = model.encode(long_text, normalize_embeddings=False)
short_unnorm = model.encode(short_text, normalize_embeddings=False)
sim_unnormalized = float(short_unnorm @ long_unnorm)  # Will be inflated by magnitude

print(f"Normalized cosine: {sim_normalized:.4f}")
print(f"Unnormalized dot:  {sim_unnormalized:.4f}")  # long document dominates
```

Normalize at every stage: during indexing, during query encoding, and before distance computation.

## Pooling Strategies

Pooling converts variable-length token embeddings from the transformer encoder into a single fixed-length sentence embedding.

### Pooling Methods Comparison

```
Method           │ Computation │ Quality │ Used By
─────────────────┼─────────────┼─────────┼──────────────────
Mean pooling     │ O(n)        │ Good    │ MiniLM, BGE, E5
CLS pooling      │ O(1)        │ Good    │ BERT, Instructor
Weighted mean    │ O(n)        │ Better  │ SBERT (weighted by word importance)
Max pooling      │ O(n)        │ Fair    │ Some older models
Attention-based  │ O(n²)       │ Best    │ Custom trained models
```

### Mean Pooling (Default for Most Models)

```python
def mean_pooling(token_embeddings: np.ndarray, attention_mask: np.ndarray) -> np.ndarray:
    """Average token embeddings, masking out padding tokens.
    
    token_embeddings: (batch_size, seq_len, hidden_dim)
    attention_mask: (batch_size, seq_len) — 1 for real tokens, 0 for padding
    """
    mask = attention_mask[:, :, np.newaxis].astype(float)
    summed = np.sum(token_embeddings * mask, axis=1)
    counts = np.maximum(np.sum(mask, axis=1), 1e-9)  # avoid div by zero
    return summed / counts
```

### CLS Pooling

```python
def cls_pooling(token_embeddings: np.ndarray) -> np.ndarray:
    """Use the [CLS] token embedding (first token)."""
    return token_embeddings[:, 0, :]
```

CLS pooling is faster (no sum/divide) but requires fine-tuning on CLS to be effective. Most sentence-transformers fine-tune CLS or mean pooling depending on architecture.

### Weighted Mean Pooling

```python
def weighted_mean_pooling(
    token_embeddings: np.ndarray,
    attention_mask: np.ndarray,
    weights: np.ndarray | None = None,
) -> np.ndarray:
    """Weighted average with position-based or learned weights."""
    mask = attention_mask[:, :, np.newaxis].astype(float)
    if weights is not None:
        # Position weights: e.g., decay from first token
        mask = mask * weights[np.newaxis, :, np.newaxis]
    summed = np.sum(token_embeddings * mask, axis=1)
    counts = np.maximum(np.sum(mask, axis=1), 1e-9)
    return summed / counts
```

Pooling strategy must match between training and inference. Using the wrong pooling method changes the embedding space and degrades retrieval.

## Tokenization Impact on Embeddings

### Tokenization Details That Matter

```
Parameter           │ Impact                           │ Recommendation
────────────────────┼──────────────────────────────────┼────────────────────
Max sequence length │ Longer = more context but slower │ Match your chunk size
Truncation side     │ Left = preserves tail            │ Use "right" for most
                    │ Right = preserves head           │ Use "left" for Jina
Add special tokens  │ [CLS], [SEP] affect semantics    │ Keep model defaults
Padding             │ To max_in_batch or fixed         │ Dynamic padding for speed
```

### Truncation Direction

```python
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("BAAI/bge-base-en-v1.5")

# Right truncation: preserves the beginning
# Default for most models. Best for general text.
right_truncated = tokenizer(
    long_text,
    max_length=512,
    truncation=True,
    truncation_side="right",
)

# Left truncation: preserves the end
# Critical for Jina Embeddings v3 (trained on 8K sequences)
# Important for long documents where the end contains the answer
left_truncated = tokenizer(
    long_text,
    max_length=512,
    truncation=True,
    truncation_side="left",
)
```

### Overflow Handling

For documents longer than max_length, you have three strategies:

1. **Truncate**: Lose content beyond max_length. Simple but loses information.
2. **Chunk + embed each**: Chunk to max_length, embed each, pool or search separately. Best for retrieval.
3. **Overflow tokens**: Use `return_overflowing_tokens=True` to get overlapping spans.

```python
def tokenize_with_chunks(
    tokenizer, text: str, max_length: int = 512, stride: int = 128
):
    """Tokenize long text into overlapping chunks."""
    tokens = tokenizer(
        text,
        max_length=max_length,
        truncation=True,
        return_overflowing_tokens=True,
        stride=stride,
        return_tensors=None,
    )
    return tokens["input_ids"]
```

### Subword Tokenization Artifacts

Subword tokenization can split rare words or technical terms into meaningless pieces (e.g., "CRISPR-Cas9" → ["CR", "ISPR", "-", "Ca", "s", "9"]). This degrades embedding quality for domain-specific terminology.

Mitigations:
- Use domain-adapted tokenizers (BioBERT for biomedical, CodeBERT for code)
- Add domain terms to tokenizer vocabulary and re-embed
- For APIs: pre-process with glossary substitution (replace rare terms with known variants)

## Static vs Contextual Embeddings

```
Aspect             │ Static (Word2Vec, GloVe, FastText)  │ Contextual (BERT-based)
───────────────────┼──────────────────────────────────────┼───────────────────────────
Context sensitivity│ None — "bank" = same vector always  │ Full — "bank" differs by context
Vocabulary         │ Fixed vocab, OOV for new words      │ Subword tokens, no OOV
Dimensionality     │ 100-300d                            │ 384-4096d
Training data scale │ Billions of tokens (shallow)       │ Billions of tokens (deep)
Pooling            │ Word vector average                 │ Transformer hidden states
MTEB performance   │ Not competitive (MTEB <40)          │ SOTA (MTEB 56-67)
Inference speed    │ Very fast (lookup table)             │ Slower (transformer forward pass)

Where static embeddings still win:
  - Extreme latency requirements (<1ms per document)
  - Low-resource environments (no GPU, limited RAM)
  - When interpretability matters (nearest words in vocabulary)
  - As features in traditional ML pipelines

Never use static embeddings for semantic search or RAG. The quality gap (MTEB 30 vs 64) is insurmountable.
```

## Embedding Math

### Valid Operations

```python
# VALID: Find nearest neighbors to a centroid
cluster_center = np.mean(cluster_embeddings, axis=0)
nearest_to_center = index.search(cluster_center.reshape(1, -1), k=5)

# VALID: Interpolation between two texts (smooth transition)
alpha = 0.7
mixed = alpha * text_a_embed + (1 - alpha) * text_b_embed
# Mixed embedding approximates "mostly A with some B characteristics"

# INVALID: "King - Man + Woman = Queen"
king = model.encode("king")
man = model.encode("man")
woman = model.encode("woman")
queen = model.encode("queen")
vector_queen = king - man + woman
# This approximates queen for word-level embeddings but fails for sentence-level
```

Analogy solving (a - b + c ≈ d) works reasonably for word-level embeddings (Word2Vec, GloVe) but degrades significantly for sentence-level embeddings because:
- Sentence embeddings compress more information into the same dimension
- The embedding space is not isotropic for sentence models
- Directional semantics are less linearly separable at sentence level

## Key Points
- Embeddings map text into continuous vector spaces where direction encodes meaning.
- Cosine similarity with L2-normalized vectors is the default distance metric.
- Always normalize at every stage: indexing, query encoding, distance computation.
- Pooling strategy must match between training and inference.
- Tokenization parameters (max_length, truncation_side, padding) directly affect embedding quality.
- Chunk documents to the model's max_length — don't silently truncate.
- Higher dimension ≠ better retrieval: the curse of dimensionality reduces discrimination.
- Never average embeddings of separate texts: embed the combined text directly.
- Normalization eliminates magnitude bias from varying document lengths.
- Contextual embeddings (sentence-transformers) universally outperform static embeddings.
- Subword tokenization artifacts hurt domain-specific terminology — use domain-adapted models.
- Validate your embedding pipeline end-to-end: check for NaN, zero vectors, and magnitude distribution.
