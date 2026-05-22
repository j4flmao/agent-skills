# Search Relevance

## BM25 Tuning
- `k1`: 1.2 (default), increase to 2.0 for longer documents, decrease to 0.5 for short text
- `b`: 0.75 (default), decrease to 0.3 to reduce length normalization penalty
- Tune on a held-out relevance judgment set

## Field Boosting
```
title^5          → title matches are 5x more important
description^2    → description matches are 2x more important
tags^1.5         → tag matches slightly boosted
content^0.5      → content matches half as important
```

## Function Scoring
```json
{
  "function_score": {
    "query": {},
    "functions": [
      { "gauss": { "createdAt": { "origin": "now", "scale": "30d" } } },
      { "field_value_factor": { "field": "popularity", "factor": 0.1 } }
    ],
    "score_mode": "multiply",
    "boost_mode": "multiply"
  }
}
```

## Synonyms
```json
{
  "filter": {
    "synonym": {
      "type": "synonym",
      "synonyms": [
        "laptop, notebook, computer",
        "mobile, phone, smartphone",
        "tv, television, telly"
      ]
    }
  }
}
```

## Best Practices
- Evaluate relevance with metrics: NDCG@10, MAP@10, precision@5
- A/B test ranking changes on live traffic with 10% holdout
- Use click-through rate as implicit relevance feedback
- Personalize with user history function scoring
- Index time boosting > query time boosting for performance
