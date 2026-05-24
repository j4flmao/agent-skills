# Cold Start Strategies

## Cold Start Types

| Type | Scenario | Severity | Mitigation Difficulty |
|------|----------|----------|----------------------|
| New user | No interaction history | Medium | Medium |
| New item | No interaction history | High | Low |
| New system | No user or item history | Very High | High |
| Cold item in catalog | Item exists but no interactions in this context | Medium | Medium |

## New User Cold Start

### Onboarding

```
def onboarding_questions():
    return [
        {"id": "interests", "type": "multi-select",
         "options": ["technology", "sports", "fashion", "food"]},
        {"id": "frequency", "type": "single-select",
         "options": ["daily", "weekly", "occasionally"]},
        {"id": "preferred_price", "type": "range",
         "min": 0, "max": 1000},
    ]

# Map onboarding answers to embedding
def onboarding_to_embedding(answers):
    embedding = np.zeros(64)
    if "technology" in answers["interests"]:
        embedding += TECH_VECTOR
    if "sports" in answers["interests"]:
        embedding += SPORTS_VECTOR
    # Normalize
    return embedding / np.linalg.norm(embedding)
```

### Demographic Personalization

```
# Fallback to demographic-based recommendations
def demographic_recommendations(age_group, location, gender=None):
    segment_key = f"{age_group}_{location}"
    popular_in_segment = item_popularity_by_segment[segment_key]
    return popular_in_segment.head(20)
```

| Demographic Feature | Data Source | Granularity |
|--------------------|-------------|-------------|
| Age group | Registration | 18-24, 25-34, 35-44, 45+ |
| Location | IP geolocation | Country → Region → City |
| Device type | User agent | Mobile, Desktop, Tablet |
| Referrer | Traffic source | Organic, Paid, Social |
| Language | Browser/device setting | en, es, fr, de, etc. |

## New Item Cold Start

### Content-Based Initialization

```
# Initialize item embedding from content features
def initialize_item_embedding(item_metadata):
    features = []

    # Text features (title, description)
    if "title" in item_metadata:
        text_emb = text_encoder.encode(item_metadata["title"])
        features.append(text_emb)

    # Image features
    if "image_url" in item_metadata:
        image_emb = image_encoder.encode(item_metadata["image_url"])
        features.append(image_emb)

    # Category features
    if "category" in item_metadata:
        cat_emb = category_embeddings[item_metadata["category"]]
        features.append(cat_emb)

    return np.mean(features, axis=0)
```

### Exploration Bonus

```
def score_with_exploration(model_score, item_id, exposures):
    # Exploration bonus decays with exposure count
    bonus = EXPLORATION_WEIGHT / np.sqrt(exposures.get(item_id, 0) + 1)
    return model_score + bonus

# The bonus ensures new items get initial exposure
# After ~100 exposures, the bonus becomes negligible
# The model score then determines recommendation naturally
```

| Exposure Count | Bonus Value | Effect |
|---------------|------------|--------|
| 0 | 1.0 | Maximum boost, guaranteed impression |
| 10 | 0.3 | Reduced but significant |
| 50 | 0.14 | Minor lift |
| 100 | 0.1 | Negligible |
| 1000 | 0.03 | None |

## Cold Start Evaluation

```
# Cold start metrics track how quickly the system adapts
cold_start_metrics = {
    "time_to_10_interactions": avg_hrs,
    "cold_item_ctr": new_items_ctr / established_items_ctr,
    "cold_user_retention": retention_7d_rate,
    "exploration_efficiency": good_recos_per_exposure,
}
```

## Multi-Armed Bandit for Cold Start

```
class ThompsonSampling:
    def __init__(self, items):
        self.alpha = {item: 1 for item in items}  # successes
        self.beta = {item: 1 for item in items}    # failures

    def recommend(self, n=10):
        # Sample from posterior distribution
        scores = {
            item: np.random.beta(self.alpha[item], self.beta[item])
            for item in self.alpha
        }
        return sorted(scores, key=scores.get, reverse=True)[:n]

    def update(self, item, engaged):
        if engaged:
            self.alpha[item] += 1
        else:
            self.beta[item] += 1
```

## Hybrid Cold Start Strategy

| Phase | Strategy | Criteria | Duration |
|-------|----------|----------|----------|
| 0 | Random exploration | N=0 interactions | First request |
| 1 | Content-based + bandit | 1-5 interactions | ~1 day |
| 2 | Hybrid (CF + content) | 5-20 interactions | ~1 week |
| 3 | Full collaborative | >20 interactions | Forever |

## Production Cold Start Pipeline

- Precompute content-based embeddings for all new items at ingestion time
- Maintain a set of exploration candidates that rotate on schedule
- Cap exploration traffic at 10-20% of total recommendations
- Use Bayesian bandits for automatic explore-exploit balance
- Monitor cold start adaptation rate: how many interactions before item performs adequately
- A/B test cold start strategies against popularity-based baseline
- Set up alerts when cold start performance drops below threshold
- Store cold start metadata (strategy applied, bonus value) in logs for analysis

## Best Practices

- Explore more aggressively when user/item are new, decay exploration over time
- Content-based features are essential for item cold start — invest in good metadata
- New users need immediate value — don't waste first impression on random recommendations
- Monitor cold start separately from overall metrics — cold items will underperform initially
- Set realistic expectations: cold items will have lower CTR than established ones
- Use contextual bandits (LinUCB) when user or item features are available
- Fall back to popularity when no personalization signal is available
- Log cold start strategy applied for each recommendation to enable post-hoc analysis
- Refresh cold item pool regularly to give every new item a chance at exposure
- Consider fairness: ensure new items from all categories get exploration, not just popular categories
