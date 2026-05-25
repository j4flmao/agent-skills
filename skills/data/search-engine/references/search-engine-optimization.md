# Search Engine Optimization Reference

## Indexing Strategies

### Mapping Best Practices

```json
{
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "title": {
        "type": "text", "analyzer": "english",
        "fields": { "keyword": { "type": "keyword" }, "trigram": { "type": "text", "analyzer": "trigram" } }
      },
      "description": { "type": "text", "analyzer": "english", "similarity": "BM25" },
      "price": { "type": "half_float" },
      "category": { "type": "keyword" },
      "created_at": { "type": "date", "format": "epoch_millis" },
      "reviews": {
        "type": "nested",
        "properties": { "rating": { "type": "byte" }, "text": { "type": "text", "analyzer": "english" } }
      },
      "specs": { "type": "flattened" }
    }
  }
}
```

### Bulk Indexing

```python
helpers.bulk(es, generate_docs(), chunk_size=500, max_retries=3, raise_on_error=False)
```

## Shard and Routing Optimization

| Shard Size | Assessment |
|-----------|------------|
| <10 GB | Too small |
| **10-50 GB** | Optimal |
| 50-200 GB | Acceptable |
| >200 GB | Too large |

**Formula**: `shards = max(1, min(ceil(size_gb / 30), 20 * heap_gb))`

**Custom routing** routes documents to deterministic shards, improving query speed when you filter by a routing key:

```json
PUT products/_settings
{ "index": { "routing": { "required": true } } }
GET products/_search?routing=electronics
```

## Query Performance Tuning

### Refresh Interval

```json
// During bulk indexing
PUT products/_settings
{ "index": { "refresh_interval": "30s", "number_of_replicas": 0 } }
// Restore after
PUT products/_settings
{ "index": { "refresh_interval": "1s", "number_of_replicas": 1 } }
```

### Filter Context (Cached)

Put structured conditions (category, price range, status) in `filter` not `must` — filters are cached and don't affect scoring:

```json
{ "bool": { "must": [{ "match": { "title": "wireless" } }],
            "filter": [{ "term": { "category": "electronics" } },
                       { "range": { "price": { "gte": 50, "lte": 200 } } }] } }
```

## Relevancy Tuning

### BM25 Parameters

| Param | Default | Effect |
|-------|---------|--------|
| **k1** | 1.2 | Higher = more weight to term frequency |
| **b** | 0.75 | Field length normalization (0 = none, 1 = full) |

### Function Score

```json
{ "query": { "function_score": {
    "query": { "match": { "title": "wireless" } },
    "functions": [
      { "gauss": { "price": { "origin": "100", "scale": "50" } } },
      { "field_value_factor": { "field": "popularity", "factor": 0.5, "modifier": "log1p" } },
      { "filter": { "term": { "in_stock": true } }, "weight": 5 }
    ],
    "score_mode": "multiply"
} } }
```

## Performance Monitoring

```json
// Slow logs
PUT products/_settings { "index.search.slowlog.threshold.query.warn": "10s",
  "index.search.slowlog.threshold.query.info": "5s" }
```

### Common Bottlenecks

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| High query latency | Wrong shard count | Target 10-50 GB/shard |
| High CPU | wildcard/regexp queries | Use edge_ngram instead |
| Slow indexing | refresh_interval too low | Set to 30s+ during bulk |
| High memory | text field aggregations | Use keyword for aggregations |
| Slow merges | Too many small segments | Increase segments_per_tier |
| GC pressure | Heap > 32 GB | Keep at 31 GB max |
