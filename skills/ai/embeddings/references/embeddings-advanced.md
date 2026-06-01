# Embeddings Advanced Topics

## Contrastive Learning Theory

### InfoNCE Loss

InfoNCE (Noise Contrastive Estimation) is the foundation of modern embedding training. Given a query q, a positive p, and a set of negatives n_1, ..., n_k:

```
Loss = -log( exp(sim(q, p)/τ) / (exp(sim(q, p)/τ) + Σ exp(sim(q, n_i)/τ)) )

where:
  sim(x, y) = cosine similarity of normalized vectors
  τ = temperature (typically 0.01-0.1)
  k = number of negatives per positive
```

Key properties:
- Minimizes when q is closer to p than to all n_i
- Temperature τ controls hardness emphasis: lower τ = harder contrast
- With k → ∞, InfoNCE approximates mutual information lower bound
- Scaling: 1 positive + N negatives, batched across all pairs in-batch

### MultipleNegativesRankingLoss (MNRL)

The workhorse loss for sentence embedding training. For a batch of (anchor, positive) pairs:

```python
from sentence_transformers import losses

# MNRL treats all non-matching pairs in the batch as negatives
# Batch of N pairs → N² comparisons
# For each anchor at position i:
#   positive: the pair at position i
#   negatives: pairs at positions j ≠ i (in-batch negatives)

loss = losses.MultipleNegativesRankingLoss(model)
# Temperature: self.config.temperature (default 0.05)
# Scales well: O(N²) comparisons, but only N forward passes
```

For N pairs in a batch, each query has 1 positive and N-1 in-batch negatives. This is why larger batch sizes improve MNRL performance.

### NT-Xent Loss (Normalized Temperature-scaled Cross Entropy)

Used in SimCLR and contrastive learning:

```python
import torch
import torch.nn.functional as F

def nt_xent_loss(
    embeddings: torch.Tensor,
    temperature: float = 0.07,
) -> torch.Tensor:
    """NT-Xent loss for contrastive learning.
    embeddings: (2 * batch_size, dim) — two views/augmentations per sample.
    """
    batch_size = embeddings.shape[0] // 2
    embeddings = F.normalize(embeddings, dim=1)
    similarity = embeddings @ embeddings.T / temperature

    # Mask out self-similarity (diagonal)
    mask = torch.eye(2 * batch_size, device=embeddings.device).bool()
    similarity = similarity.masked_fill_(mask, -float("inf"))

    # Positive pairs: (i, i+batch_size) for i in [0, batch_size)
    labels = torch.cat([
        torch.arange(batch_size, 2 * batch_size, device=embeddings.device),
        torch.arange(batch_size, device=embeddings.device),
    ])
    return F.cross_entropy(similarity, labels)
```

### Margin-Based Loss (CosineSimilarityLoss)

Used when you have similarity scores instead of binary relevant/irrelevant:

```python
def cosine_similarity_loss(
    embeddings_a: torch.Tensor,
    embeddings_b: torch.Tensor,
    target_scores: torch.Tensor,
) -> torch.Tensor:
    """Mean squared error between cosine similarity and target scores.
    Use when you have graded relevance (e.g., human-rated similarity 0-5).
    """
    cos_sim = F.cosine_similarity(embeddings_a, embeddings_b)
    return F.mse_loss(cos_sim, target_scores)
```

### CachedMultipleNegativesRankingLoss

For very large batch sizes that don't fit in GPU memory:

```python
from sentence_transformers import losses

# Cache embeddings from previous batches as additional negatives
# Each batch sees:
#   - Current batch positives (in-batch negatives)
#   - Cached embeddings from previous batches as "cross-batch negatives"
# Helps with small effective batch sizes

loss = losses.CachedMultipleNegativesRankingLoss(
    model,
    cache_labels=True,  # Cache and reuse computed negatives
    mini_batch_size=32,  # Process in micro-batches
)
```

### Loss Selection Decision Tree

```
What training data do you have?
├── (query, positive) pairs only?
│   └── MultipleNegativesRankingLoss (in-batch negatives)
│       Batch size: 64-512. Larger = more negatives = better.
├── (query, positive, [hard_negative]) triplets?
│   └── MultipleNegativesRankingLoss with hard negatives
│       Negatives appended to in-batch negatives.
├── (query, positive, negative) fixed triplets?
│   └── TripletLoss or TripletDistanceLoss
│       margin: 0.5-1.0. Fixed margin separation.
├── (text_a, text_b, similarity_score) graded data?
│   └── CosineSimilarityLoss or CoSENTLoss
└── No training data (zero-shot)?
    └── Use pre-trained model directly. No training needed.
```

## Hard Negative Mining Strategies

Hard negatives are the single most impactful factor in embedding fine-tuning quality.

### Strategy Comparison

```
Strategy        │ Quality Lift │ Complexity │ Cost per Epoch  │ Best For
────────────────┼──────────────┼────────────┼─────────────────┼─────────────────
Random          │ Baseline     │ None       │ Free            │ Ablation control
BM25 top-k      │ +5-10% MRR   │ Low        │ Low (index once)│ First pass
Model-in-loop   │ +10-20% MRR  │ High       │ High (re-embed) │ Production fine-tune
Iterative       │ +15-25% MRR  │ Very High  │ Very High       │ Best quality
Ensemble        │ +12-18% MRR  │ Medium     │ Medium          │ Multiple models
```

### BM25 Hard Negative Mining

```python
from rank_bm25 import BM25Okapi

def mine_bm25_hard_negatives(
    queries: list[str],
    corpus: list[str],
    positives: list[int],  # index of positive doc per query
    k: int = 50,
) -> list[list[int]]:
    """Mine hard negatives using BM25.
    Returns k hard negatives per query from BM25 top results
    that are NOT the positive document.
    """
    tokenized_corpus = [doc.split() for doc in corpus]
    bm25 = BM25Okapi(tokenized_corpus)
    hard_negatives = []

    for q, pos_idx in zip(queries, positives):
        scores = bm25.get_scores(q.split())
        top_indices = np.argsort(scores)[::-1]
        # Remove the positive document
        hard = [idx for idx in top_indices if idx != pos_idx][:k]
        hard_negatives.append(hard)

    return hard_negatives
```

### Model-in-the-Loop Mining

The most effective approach: use the current model to find its own hardest negatives.

```python
def mine_model_hard_negatives(
    model,
    queries: list[str],
    corpus: list[str],
    positives: list[int],
    k: int = 50,
    batch_size: int = 256,
) -> list[list[int]]:
    """Use the current model state to mine hard negatives.
    Step 1: Embed all queries and corpus documents.
    Step 2: For each query, find top-k scoring corpus docs.
    Step 3: Exclude positive doc — remaining are hard negatives.

    Typical workflow across training epochs:
    Epoch 0: Mine with BM25 negatives
    Epoch 1: Mine with model from epoch 0 → harder negatives
    Epoch 2: Mine with model from epoch 1 → even harder
    """
    q_embs = model.encode(queries, normalize_embeddings=True, batch_size=batch_size)
    d_embs = model.encode(corpus, normalize_embeddings=True, batch_size=batch_size)
    scores = q_embs @ d_embs.T

    hard_negatives = []
    for i, pos_idx in enumerate(queries):
        # Top scoring = hardest (model is most confused about these)
        top_indices = np.argsort(-scores[i])
        hard = [idx for idx in top_indices if idx != positives[i]][:k]
        hard_negatives.append(hard)

    return hard_negatives
```

### Iterative Hard Negative Mining (Full Loop)

```
Training loop:
Round 1: Train with random negatives (k=5) → model_v1
Round 2: Mine with model_v1 (k=20) → harder negatives → train → model_v2
Round 3: Mine with model_v2 (k=50) → even harder → train → model_v3

Each round increases negative count and hardness.
Quality saturates after 3-4 rounds in practice.
```

### Combined Mining (Ensemble)

```python
def ensemble_hard_negatives(
    texts: list[str],
    corpus: list[str],
    positives: list[int],
    k: int = 50,
) -> list[list[int]]:
    """Combine BM25, model, and lexical matching for diverse negatives."""
    bm25_hard = mine_bm25_hard_negatives(texts, corpus, positives, k=30)
    model_hard = mine_model_hard_negatives(model, texts, corpus, positives, k=30)
    # Interleave: diverse negatives > homogeneous hard negatives
    combined = []
    for b, m in zip(bm25_hard, model_hard):
        c = list(dict.fromkeys(b + m))  # deduplicate preserving order
        combined.append(c[:k])
    return combined
```

Effect of negative diversity: the model sees both lexical near-misses (BM25) and semantic near-misses (model), learning to separate in both axes.

Parameter: number of negatives per query. More negatives → better quality, diminishing returns after 50-100. Memory bound: each negative requires a forward pass per epoch.

## Matryoshka Representation Learning

### How Matryoshka Works

Matryoshka embeddings are trained to be useful at multiple dimensions simultaneously. The key insight: the first k dimensions should contain the most information, preserving maximal performance when later dimensions are truncated.

```python
import torch
import torch.nn.functional as F

class MatryoshkaLoss(torch.nn.Module):
    """Train embeddings that work at multiple dimensions.

    During training, randomly sample a target dimension and compute
    loss using only the first k dimensions. This forces the model
    to pack the most discriminative information into early dimensions.
    """

    def __init__(self, base_loss, dims: list[int]):
        super().__init__()
        self.base_loss = base_loss
        self.dims = dims  # e.g., [64, 128, 256, 512, 768]

    def forward(self, embeddings, labels):
        total_loss = 0.0
        for dim in self.dims:
            truncated = embeddings[:, :dim]
            total_loss += self.base_loss(truncated, labels)
        return total_loss / len(self.dims)
```

### Inference with Matryoshka

```python
# At inference, truncate to any dimension ≤ training dims
embeddings_768 = model.encode(texts)                                  # Full quality
embeddings_256 = model.encode(texts, truncate_dim=256)                # 67% compression
embeddings_128 = model.encode(texts, truncate_dim=128)                # 83% compression
embeddings_64  = model.encode(texts, truncate_dim=64)                 # 92% compression
```

### Quality-Dimension Tradeoff

```
Model: nomic-embed-text-v1.5 (trained Matryoshka 64-768)
Dimension │ MTEB Retrieval │ Memory (1M vecs) │ Storage Savings
──────────┼────────────────┼─────────────────┼───────────────────
768d      │ 59.2           │ 3072 MB (FP32)   │ 0% (baseline)
512d      │ 59.0           │ 2048 MB          │ 33% reduction
256d      │ 58.5           │ 1024 MB          │ 67% reduction
128d      │ 57.8           │ 512 MB           │ 83% reduction
64d       │ 55.1           │ 256 MB           │ 92% reduction

Use 256d for first-pass retrieval (cheap, fast), 768d for re-ranking (accurate).
```

### Nomic's Training Approach

The Matryoshka training objective (from "Matryoshka Representation Learning", Kusupati et al. 2022):

```
1. Sample dimension k uniformly from predefined set
2. Truncate embedding to k dimensions
3. Compute contrastive loss at k dimensions
4. Backpropagate through all dimensions (not just first k)
5. Repeat for different k values each step

Result: early dimensions learn general semantics, later dimensions learn fine distinctions.
```

### When to Use Matryoshka

```
├── Multi-tier latency requirements → Yes (single model, multiple dims)
├── Unknown optimal dimension → Yes (test all dims, pick best)
├── Storage constrained → Yes (start low, increase if needed)
├── Exact quality needed, no flexibility → No (use fixed-dim model)
└── Existing pipeline tuned for specific dim → No (unless retuning)
```

## Knowledge Distillation for Embeddings

## Teacher-Student Framework

Distill knowledge from a large, high-quality embedding model into a smaller, faster one.

```
Teacher: intfloat/e5-mistral-7b-instruct (4096d, MTEB 66.6, 14GB)
Student: all-MiniLM-L6-v2 (384d, MTEB 56.1, 80MB)

Goal: Student approaches teacher's quality while maintaining speed.
```

### Feature-Level Distillation

```python
import torch
import torch.nn.functional as F

def feature_distillation_loss(
    student_embeddings: torch.Tensor,
    teacher_embeddings: torch.Tensor,
    temperature: float = 5.0,
) -> torch.Tensor:
    """Distill teacher's embedding space into student.

    The student learns to reproduce teacher's L2-normalized embeddings.
    MSE loss in normalized embedding space.
    """
    student = F.normalize(student_embeddings, dim=1)
    teacher = F.normalize(teacher_embeddings, dim=1)
    return F.mse_loss(student, teacher)
```

### Distribution-Level Distillation

```python
def distribution_distillation_loss(
    student_scores: torch.Tensor,
    teacher_scores: torch.Tensor,
    temperature: float = 5.0,
) -> torch.Tensor:
    """Match the similarity distribution between student and teacher.

    For a batch of (anchor, positive, negative) triplets:
    - Teacher produces similarity scores s_t = [sim_t(pos), sim_t(neg_1), ...]
    - Student produces similarity scores s_s = [sim_s(pos), sim_s(neg_1), ...]
    - KL divergence between softmax(s_t / τ) and softmax(s_s / τ)
    """
    teacher_probs = F.softmax(teacher_scores / temperature, dim=-1)
    student_probs = F.log_softmax(student_scores / temperature, dim=-1)
    return F.kl_div(student_probs, teacher_probs, reduction="batchmean")
```

### Distillation Pipeline

```python
class EmbeddingDistiller:
    """Full distillation pipeline: teacher generates, student learns."""

    def __init__(self, teacher, student, temperature: float = 5.0):
        self.teacher = teacher
        self.student = student
        self.temperature = temperature
        self.teacher.eval()

    def train_step(self, batch_texts: list[str]) -> torch.Tensor:
        with torch.no_grad():
            teacher_embs = self.teacher.encode(batch_texts, convert_to_tensor=True)
            teacher_embs = F.normalize(teacher_embs, dim=1)

        student_embs = self.student.encode(batch_texts, convert_to_tensor=True)
        student_embs = F.normalize(student_embs, dim=1)

        # Combined loss: feature + distribution
        feature_loss = F.mse_loss(student_embs, teacher_embs)
        similarity_matrix = student_embs @ teacher_embs.T / self.temperature
        target_similarity = teacher_embs @ teacher_embs.T / self.temperature
        dist_loss = F.kl_div(
            F.log_softmax(similarity_matrix, dim=-1),
            F.softmax(target_similarity, dim=-1),
            reduction="batchmean",
        )
        return feature_loss + dist_loss
```

### Distillation Quality Impact

```
Student Model    │ Distilled │ Original │ Lift
─────────────────┼───────────┼──────────┼──────
MiniLM-L6 (384d) │ 60.1      │ 56.1     │ +4.0 MTEB
BGE-small (384d) │ 61.5      │ 58.2     │ +3.3 MTEB
MiniLM-L12 (384d)│ 61.2      │ 58.8     │ +2.4 MTEB
```

Typical lift: 2-5 MTEB points. Distilled small models can approach base/large model quality while being 5-10x faster.

## Cross-Encoder vs Bi-Encoder Architecture

```
Aspect          │ Bi-Encoder                              │ Cross-Encoder
────────────────┼─────────────────────────────────────────┼────────────────────────
Architecture    │ Two independent encoders (or shared)    │ Single encoder, concatenated input
Scoring         │ Cosine similarity of embeddings         │ [CLS] token → classifier
Pre-compute?    │ Yes — embeddings are pre-computable     │ No — must evaluate each pair
Speed           │ Fast: O(N+M) for N docs, M queries      │ Slow: O(N×M) forward passes
Use case        │ Retrieval, clustering, classification   │ Reranking, STS, NLI
Latency         │ 2-10ms per query at 10K scale           │ 50-500ms per pair
Quality         │ Good retrieval, fair STS                │ Excellent STS, better reranking
MTEB retrieval  │ 56-67                                   │ 65-75 (MS MARCO passage)
Model size      │ 80MB-14GB                               │ 100MB-7GB (usually smaller)

Rule: Bi-encoder for retrieval (first stage), cross-encoder for reranking (second stage).
```

## Late Interaction Models (ColBERT)

ColBERT bridges bi-encoder and cross-encoder: late interaction computes token-level similarity after independent encoding.

```
Query encoding: [q_CLS, q_1, q_2, ..., q_m]  (m query tokens)
Doc encoding:   [d_CLS, d_1, d_2, ..., d_n]   (n doc tokens)

Score = Σ max over d_j of (q_i · d_j)        (MaxSim operation)

- Embeddings pre-computable (like bi-encoder)
- Fine-grained matching (like cross-encoder)
- 2-5x slower than bi-encoder, 100x faster than cross-encoder
```

```python
def colbert_score(query_embs: np.ndarray, doc_embs: np.ndarray) -> float:
    """ColBERT late interaction scoring.
    query_embs: (m, dim) — token-level query embeddings
    doc_embs: (n, dim) — token-level document embeddings
    """
    # MaxSim: for each query token, max dot product with any doc token
    similarity = query_embs @ doc_embs.T  # (m, n)
    max_sim = np.max(similarity, axis=1)  # (m,)
    return float(np.sum(max_sim))
```

Use ColBERT when: you need cross-encoder quality but at bi-encoder-like storage scale. BGE-M3 includes ColBERT-style interaction as one of its three retrieval modes (dense + sparse + ColBERT).

## Multi-Task Learning for Embeddings

Training on multiple tasks simultaneously produces more general embeddings:

```python
class MultiTaskEmbeddingLoss(torch.nn.Module):
    """Combine multiple loss functions for diverse training signals."""

    def __init__(
        self,
        model,
        task_weights: dict[str, float] = None,
    ):
        super().__init__()
        self.model = model
        self.task_weights = task_weights or {
            "retrieval": 0.6,
            "sts": 0.2,
            "classification": 0.2,
        }

    def forward(self, features, labels, task_type: str):
        embeddings = features["sentence_embedding"]
        weight = self.task_weights.get(task_type, 0.5)
        if task_type == "retrieval":
            loss = losses.MultipleNegativesRankingLoss(self.model)(features, labels)
        elif task_type == "sts":
            loss = losses.CosineSimilarityLoss(self.model)(features, labels)
        elif task_type == "classification":
            loss = losses.SoftmaxLoss(self.model)(features, labels)
        return weight * loss
```

MTEB scores correlate with multi-task training breadth: E5, BGE, and Instructor all train on 10+ tasks.

## Adversarial Training for Robustness

Improve embedding robustness to typos, paraphrases, and adversarial queries:

```python
def adversarial_embedding_loss(
    model,
    clean_texts: list[str],
    adv_texts: list[str],
    labels: torch.Tensor,
    epsilon: float = 0.01,
) -> torch.Tensor:
    """FGSM-style adversarial training for embeddings.

    1. Compute embeddings for clean and adversarially perturbed texts
    2. Maximize alignment between clean and perturbed embeddings
    3. Model learns invariant representations
    """
    clean_embs = model.encode(clean_texts, convert_to_tensor=True)
    adv_embs = model.encode(adv_texts, convert_to_tensor=True)
    clean_embs = F.normalize(clean_embs, dim=1)
    adv_embs = F.normalize(adv_embs, dim=1)

    # Adversarial loss: minimize distance between clean and perturbed
    adv_loss = F.mse_loss(clean_embs, adv_embs)

    # Task loss (e.g., contrastive)
    task_loss = losses.MultipleNegativesRankingLoss(model)(
        {"sentence_embedding": clean_embs}, labels
    )
    return task_loss + epsilon * adv_loss
```

## Embedding Ensemble Methods

Combine multiple embedding models for better quality (at higher cost):

```python
def ensemble_embeddings(
    texts: list[str],
    models: list[tuple[SentenceTransformer, float]],  # (model, weight) pairs
    normalize: bool = True,
) -> np.ndarray:
    """Weighted average of embeddings from multiple models.

    Models should produce similar-dimension embeddings.
    Use PCA to project if dimensions differ.
    """
    all_embs = []
    for model, weight in models:
        emb = model.encode(texts, normalize_embeddings=True)
        all_embs.append(emb * weight)

    ensemble = np.sum(all_embs, axis=0)
    if normalize:
        ensemble = ensemble / np.linalg.norm(ensemble, axis=1, keepdims=True)
    return ensemble
```

Ensemble strategies:
- **Late fusion**: embed with each model independently, fuse at ranking level (RRF on per-model results)
- **Early fusion**: average embeddings, then search single index
- **Cascade**: small model retrieves candidates, large model reranks

Early fusion reduces index storage (one index) but may dilute specific model strengths. Late fusion preserves each model's discriminative power but requires multiple indexes.

## Key Points
- InfoNCE/MNRL loss is the standard for contrastive embedding training — use in-batch negatives.
- Hard negatives are the most impactful training input: BM25-mining is the baseline, model-in-loop is best.
- Matryoshka embeddings enable adaptive dimensionality from a single model — train with multi-dim loss.
- Knowledge distillation transfers quality from large to small models (2-5 MTEB point lift).
- Bi-encoders for retrieval (pre-computable), cross-encoders for reranking (pairwise).
- Late interaction (ColBERT) offers a middle ground: token-level matching with pre-computable doc embeddings.
- Multi-task training produces more general embeddings — balance retrieval, STS, and classification.
- Adversarial training improves robustness to input perturbations and typos.
- Ensemble multiple models via RRF (late fusion) for maximum quality, at the cost of index storage.
- Iterative hard negative mining over 3-4 rounds yields the best fine-tuning results.
- Monitor gradient norms during training: vanishing gradients indicate too-easy negatives.
