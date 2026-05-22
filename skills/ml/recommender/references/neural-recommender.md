# Neural Recommender Systems

## Two-Tower Model
```
import torch.nn as nn

class TwoTowerRecommender(nn.Module):
    def __init__(self, num_users, num_items, embed_dim=64, hidden=[128,64]):
        super().__init__()
        self.user_emb = nn.Embedding(num_users, embed_dim)
        self.item_emb = nn.Embedding(num_items, embed_dim)
        self.user_tower = nn.Sequential(
            nn.Linear(embed_dim, hidden[0]), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(hidden[0], hidden[1]), nn.ReLU(), nn.Linear(hidden[1], embed_dim))
        self.item_tower = nn.Sequential(
            nn.Linear(embed_dim, hidden[0]), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(hidden[0], hidden[1]), nn.ReLU(), nn.Linear(hidden[1], embed_dim))

    def forward(self, user_ids, item_ids):
        user_vec = self.user_tower(self.user_emb(user_ids))
        item_vec = self.item_tower(self.item_emb(item_ids))
        return (user_vec * item_vec).sum(dim=1)
```

Two-tower: separate towers for user and item. Inference: precompute item vectors, compute user vector at query time, retrieve via ANN. No cross features — disadvantage vs deep cross models. Scales to billions with ANN.

## Sampled Softmax Training
```
class SampledSoftmaxLoss(nn.Module):
    def __init__(self, num_items, num_samples=1000):
        super().__init__()
        self.num_items = num_items
        self.num_samples = num_samples

    def forward(self, user_vec, item_vec, user_ids, all_item_ids):
        pos_logits = (user_vec * item_vec).sum(dim=1)
        neg_idx = torch.randint(0, self.num_items, (user_vec.size(0), self.num_samples))
        neg_vec = self.item_emb(neg_idx)
        neg_logits = torch.bmm(neg_vec, user_vec.unsqueeze(2)).squeeze(2)
        logits = torch.cat([pos_logits.unsqueeze(1), neg_logits], dim=1)
        return nn.CrossEntropyLoss()(logits * 10, torch.zeros(user_vec.size(0), dtype=torch.long))
```

Sampled softmax: treat as extreme multi-class. Negative sampling reduces O(|items|) to O(num_samples). In-batch negatives: free but biased to popular items.

## Neural Collaborative Filtering
```
class NeuralCF(nn.Module):
    def __init__(self, num_users, num_items, embed_dim=32, layers=[64,32,16]):
        super().__init__()
        self.user_emb = nn.Embedding(num_users, embed_dim)
        self.item_emb = nn.Embedding(num_items, embed_dim)
        self.gmf = nn.Linear(embed_dim, 1)
        mlp = []; in_sz = embed_dim * 2
        for sz in layers:
            mlp.extend([nn.Linear(in_sz, sz), nn.ReLU(), nn.Dropout(0.2)])
            in_sz = sz
        mlp.append(nn.Linear(layers[-1], 1))
        self.mlp = nn.Sequential(*mlp)
        self.fusion = nn.Linear(2, 1)

    def forward(self, user_ids, item_ids):
        u, i = self.user_emb(user_ids), self.item_emb(item_ids)
        gmf = self.gmf(u * i)
        mlp = self.mlp(torch.cat([u, i], dim=1))
        return self.fusion(torch.cat([gmf, mlp], dim=1))
```

GMF captures linear patterns (like MF), MLP captures non-linear interactions. Outperforms vanilla MF but harder to train.

## Feature-Rich Ranking
```
class DeepRanking(nn.Module):
    def __init__(self, user_dim, item_dim, context_dim, hidden=[256,128,64]):
        super().__init__()
        layers = []; in_dim = user_dim + item_dim + context_dim
        for h in hidden:
            layers.extend([nn.BatchNorm1d(in_dim), nn.Linear(in_dim, h), nn.ReLU(), nn.Dropout(0.2)])
            in_dim = h
        layers.append(nn.Linear(hidden[-1], 1))
        self.net = nn.Sequential(*layers)

    def forward(self, user_vec, item_vec, context_vec):
        return torch.sigmoid(self.net(torch.cat([user_vec, item_vec, context_vec], dim=1)))
```

## Cold Start Strategies
```
def cold_start_user(user_features, item_catalog, model, content_model):
    similar = find_similar_users_by_features(user_features)
    if similar:
        return model.recommend_by_similar_users(similar)
    if user_features.get("interests"):
        return content_model.recommend_by_category(user_features["interests"])
    return get_most_popular_items()

def cold_start_item(item_features, model, content_model):
    embed = content_model.encode_item(item_features)
    similar = content_model.find_similar(embed, k=10)
    model.initialize_item_embedding(item_id, similar)
    model.set_exploration_bonus(item_id, bonus=0.5, decay=0.95)
```

## Candidate Generation Pipeline
```
import faiss, numpy as np

class CandidateGenerator:
    def __init__(self, model, item_ids, item_vectors):
        self.model = model; self.item_ids = item_ids
        self.index = faiss.IndexFlatIP(item_vectors.shape[1])
        self.index.add(item_vectors)

    def generate_candidates(self, user_id, user_features, k=100):
        with torch.no_grad():
            user_vec = self.model.encode_user(user_id, user_features).cpu().numpy()
            scores, indices = self.index.search(user_vec.reshape(1, -1), k)
            return [self.item_ids[i] for i in indices[0]], scores[0]

    def refresh_index(self):
        item_vectors = self.model.compute_all_item_vectors()
        self.index = faiss.IndexFlatIP(item_vectors.shape[1])
        self.index.add(item_vectors)
```

## Feature Store Integration
```
features = {
    "user_features": {"embedding": user_vec, "age": age, "region": region_oh, "recent_cats": recent},
    "item_features": {"embedding": item_vec, "category": cat_emb, "popularity": pop, "freshness": age_days},
    "context_features": {"hour": hour, "dow": dow, "device": device_emb, "depth": depth},
}
```

## Best Practices
- Precompute item embeddings, update periodically (hourly/daily).
- Use ANN (FAISS, ScaNN) for retrieval at scale.
- Normalize embeddings before ANN for better recall.
- Hard negative sampling improves ranking.
- Two-stage: retrieval 100-500 candidates, ranking selects top 10-50.
- Feature crosses capture interaction patterns.
- Position bias: train with position feature, remove at inference.
- Freshness: add item age feature to avoid stale recommendations.
