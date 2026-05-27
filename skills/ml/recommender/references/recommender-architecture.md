# Recommender System Architecture

## Collaborative Filtering

```python
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from scipy.sparse import csr_matrix

class CollaborativeFiltering:
    """User-based collaborative filtering recommender."""

    def __init__(self, k: int = 20):
        self.k = k
        self.user_item_matrix = None
        self.user_similarity = None
        self.item_similarity = None

    def fit(self, ratings: pd.DataFrame):
        """Fit the model with user-item ratings."""
        self.user_item_matrix = ratings.pivot_table(
            index='user_id',
            columns='item_id',
            values='rating',
        ).fillna(0)

        user_sparse = csr_matrix(self.user_item_matrix.values)
        self.user_similarity = cosine_similarity(user_sparse)

        item_sparse = csr_matrix(self.user_item_matrix.T.values)
        self.item_similarity = cosine_similarity(item_sparse)

    def predict_user_based(self, user_id: int, item_id: int) -> float:
        """Predict rating using user-based CF."""
        if user_id not in self.user_item_matrix.index:
            return 0.0

        user_idx = self.user_item_matrix.index.get_loc(user_id)
        item_idx = self.user_item_matrix.columns.get_loc(item_id) if item_id in self.user_item_matrix.columns else -1

        if item_idx == -1:
            return 0.0

        similar_users = np.argsort(self.user_similarity[user_idx])[::-1][1:self.k + 1]
        similar_scores = self.user_similarity[user_idx][similar_users]

        item_ratings = self.user_item_matrix.iloc[similar_users, item_idx].values
        rated_mask = item_ratings > 0

        if not rated_mask.any():
            return 0.0

        weighted_sum = np.dot(similar_scores[rated_mask], item_ratings[rated_mask])
        similarity_sum = similar_scores[rated_mask].sum()

        return weighted_sum / similarity_sum if similarity_sum > 0 else 0.0

    def recommend_for_user(self, user_id: int, n: int = 10) -> List[int]:
        """Generate top-N recommendations for a user."""
        if user_id not in self.user_item_matrix.index:
            return []

        user_items = self.user_item_matrix.loc[user_id]
        unseen_items = user_items[user_items == 0].index

        predictions = []
        for item_id in unseen_items:
            pred = self.predict_user_based(user_id, item_id)
            predictions.append((item_id, pred))

        predictions.sort(key=lambda x: x[1], reverse=True)
        return [item_id for item_id, _ in predictions[:n]]
```

## Matrix Factorization

```python
import torch
import torch.nn as nn
import torch.optim as optim

class MatrixFactorization(nn.Module):
    """Neural matrix factorization for recommendations."""

    def __init__(self, n_users: int, n_items: int, n_factors: int = 50):
        super().__init__()
        self.user_factors = nn.Embedding(n_users, n_factors)
        self.item_factors = nn.Embedding(n_items, n_factors)
        self.user_bias = nn.Embedding(n_users, 1)
        self.item_bias = nn.Embedding(n_items, 1)
        self.global_bias = nn.Parameter(torch.zeros(1))

        nn.init.normal_(self.user_factors.weight, std=0.01)
        nn.init.normal_(self.item_factors.weight, std=0.01)

    def forward(self, user_ids: torch.Tensor, item_ids: torch.Tensor) -> torch.Tensor:
        user_embed = self.user_factors(user_ids)
        item_embed = self.item_factors(item_ids)
        user_bias = self.user_bias(user_ids).squeeze()
        item_bias = self.item_bias(item_ids).squeeze()

        pred = (user_embed * item_embed).sum(1) + user_bias + item_bias + self.global_bias
        return pred

def train_matrix_factorization(
    model: MatrixFactorization,
    train_loader: DataLoader,
    val_loader: DataLoader,
    epochs: int = 20,
    lr: float = 0.01,
    reg: float = 0.01,
) -> MatrixFactorization:
    """Train matrix factorization model."""
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=reg)

    for epoch in range(epochs):
        model.train()
        total_loss = 0

        for users, items, ratings in train_loader:
            optimizer.zero_grad()
            predictions = model(users, items)
            loss = nn.MSELoss()(predictions, ratings)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        model.eval()
        val_loss = 0
        with torch.no_grad():
            for users, items, ratings in val_loader:
                predictions = model(users, items)
                val_loss += nn.MSELoss()(predictions, ratings).item()

        print(f"Epoch {epoch + 1}: Train Loss: {total_loss / len(train_loader):.4f}, "
              f"Val Loss: {val_loss / len(val_loader):.4f}")

    return model
```

## Content-Based Filtering

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

class ContentBasedRecommender:
    """Content-based recommender using item features."""

    def __init__(self):
        self.tfidf = TfidfVectorizer(stop_words='english')
        self.item_features = None
        self.cosine_sim = None
        self.item_ids = None

    def fit(self, items: pd.DataFrame, feature_column: str = 'description'):
        """Fit with item content features."""
        self.item_ids = items['item_id'].values
        tfidf_matrix = self.tfidf.fit_transform(items[feature_column])
        self.cosine_sim = linear_kernel(tfidf_matrix, tfidf_matrix)

    def recommend(self, item_id: int, n: int = 10) -> List[int]:
        """Get similar items based on content."""
        if item_id not in self.item_ids:
            return []

        idx = np.where(self.item_ids == item_id)[0][0]
        sim_scores = list(enumerate(self.cosine_sim[idx]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
        sim_scores = sim_scores[1:n + 1]

        return [self.item_ids[i] for i, _ in sim_scores]
```

## Key Points

- Use collaborative filtering for user behavior patterns
- Use matrix factorization for latent factor discovery
- Use content-based filtering for item features
- Handle cold start with popularity-based fallbacks
- Evaluate with precision, recall, and NDCG
- Implement hybrid approaches for better accuracy
- Use implicit feedback for scalable recommendations
- Handle sparse user-item matrices
- Update models incrementally for new data
- A/B test recommendation strategies
- Monitor recommendation diversity and serendipity
- Consider fairness and bias in recommendations
