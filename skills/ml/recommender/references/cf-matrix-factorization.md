# Collaborative Filtering & Matrix Factorization

## User-Based Collaborative Filtering
```
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

user_sim = cosine_similarity(interaction_matrix)

def recommend_for_user(user_idx, n_items=10):
    user_row = interaction_matrix[user_idx]
    weighted = user_sim[user_idx, np.newaxis] * interaction_matrix
    weighted[user_row > 0] = 0
    return np.argsort(weighted.sum(axis=0))[::-1][:n_items]
```

Memory-based CF: simple, interpretable. Item-based CF often works better than user-based (items are simpler, more stable). Limitations: poor scaling, cold start, sparse neighborhood.

## SVD
```
from surprise import SVD, Dataset, Reader, accuracy
from surprise.model_selection import train_test_split

reader = Reader(rating_scale=(1, 5))
data = Dataset.load_from_df(ratings_df[["user","item","rating"]], reader)
trainset, testset = train_test_split(data, test_size=0.2, random_state=42)

model = SVD(n_factors=100, n_epochs=20, lr_all=0.005, reg_all=0.02, biased=True)
model.fit(trainset)
predictions = model.test(testset)
print(f"RMSE: {accuracy.rmse(predictions):.4f}")

# Single prediction
pred = model.predict(uid="user1", iid="item1")
print(f"Predicted rating: {pred.est:.2f}")
```

SVD: R ≈ P·Q^T + bias. R̂_ui = μ + b_u + b_i + p_u·q_i. μ = global avg, b_u = user bias, b_i = item bias, p_u,q_i = embeddings. Regularization prevents overfitting on sparse interactions.

### SVD++
```
from surprise import SVDpp
model = SVDpp(n_factors=100, n_epochs=20, lr_all=0.007, reg_all=0.02)
```

Adds implicit feedback: user embedding includes sum of item factors for items the user rated. Higher accuracy, slower training.

## ALS for Implicit Feedback
```
import implicit
from scipy.sparse import csr_matrix

user_item = csr_matrix(interactions)
model = implicit.als.AlternatingLeastSquares(
    factors=100, regularization=0.01, alpha=1.0,
    iterations=15, random_state=42, use_cg=True)
model.fit(user_item)

# Recommend for user
recs, scores = model.recommend(user_id, user_item[user_id], N=10,
    filter_already_liked_items=True)

# Similar items/users
similar_items = model.similar_items(item_id=5, N=10)
```

Confidence: c_ui = 1 + alpha * r_ui. ALS alternates fixing user matrix and optimizing item matrix. Each subproblem is convex least squares. Handles implicit feedback naturally.

| Parameter | Effect | Range |
|-----------|--------|-------|
| factors | Embedding dimension | 50-200 |
| regularization | Prevent overfitting | 0.01-0.1 |
| alpha | Confidence scaling | 1-40 |
| iterations | Training iterations | 10-20 |

## BPR (Bayesian Personalized Ranking)
```
from implicit.bpr import BayesianPersonalizedRanking
model = BPR(factors=100, learning_rate=0.01, regularization=0.01,
            iterations=100, random_state=42)
model.fit(user_item)
```

Optimizes pairwise ranking: P(i >_u j) = sigma(x_ui - x_uj). Loss: -ln(sigma(x_ui - x_uj)) + reg. Better ranking quality than ALS pointwise regression. Slower per iteration.

## Evaluation Metrics
```
def precision_at_k(rec, rel, k):
    return len(set(rec[:k]) & set(rel)) / k

def recall_at_k(rec, rel, k):
    return len(set(rec[:k]) & set(rel)) / len(rel)

def ndcg_at_k(rec, rel, k):
    dcg = sum(1/np.log2(i+2) for i, item in enumerate(rec[:k]) if item in rel)
    ideal = sum(1/np.log2(i+2) for i in range(min(k, len(rel))))
    return dcg/ideal if ideal > 0 else 0.0

def hit_rate_at_k(rec, rel, k):
    return 1.0 if len(set(rec[:k]) & set(rel)) > 0 else 0.0
```

## Algorithm Selection
| Data Type | Scale | Algorithm | Rationale |
|-----------|-------|-----------|-----------|
| Explicit | <100K | SVD | Simple, fast |
| Explicit | <1M | SVD++ | Better with implicit signals |
| Implicit | <1M | BPR | Best ranking quality |
| Implicit | >1M | ALS | Scalable, parallelizable |
| Large | >10M | Two-Tower | Efficient ANN retrieval |

## Best Practices
- Remove users with <5 and items with <5 interactions.
- Normalize ratings: subtract user mean.
- Regularize more heavily for popular items (they generalize less).
- For implicit: confidence weighting alpha=20-40.
- Evaluate on temporal split (predict future), not random.
- Track coverage and freshness metrics.
