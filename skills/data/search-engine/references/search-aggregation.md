# Search Queries and Aggregations

## Full-Text Search

### Match Query
```json
{
  "query": {
    "match": {
      "title": { "query": "wireless noise cancelling headphones", "operator": "or", "minimum_should_match": "75%", "fuzziness": "AUTO" }
    }
  }
}

// Match phrase with slop
{
  "query": { "match_phrase": { "description": { "query": "noise cancelling", "slop": 2 } } }
}

// Multi-match across fields
{
  "query": { "multi_match": {
    "query": "wireless headphones",
    "fields": ["title^3", "description^2", "tags"],
    "type": "best_fields", "tie_breaker": 0.3
  }}
}
```

### Query String
```json
{
  "query": { "query_string": { "query": "(wireless OR bluetooth) AND headphones -wired", "default_field": "title" } }
}
```

## Term-Level Queries

```json
{
  "query": { "bool": {
    "must": [{ "match": { "title": "wireless headphones" } }],
    "filter": [
      { "term": { "category": "electronics" } },
      { "terms": { "brand": ["Sony", "Bose"] } },
      { "range": { "price": { "gte": 50, "lte": 500 } } },
      { "exists": { "field": "stock_count" } }
    ],
    "must_not": [{ "term": { "flags": "discontinued" } }]
  }}
}

// Fuzzy
{
  "query": { "fuzzy": { "name": { "value": "headfones", "fuzziness": "AUTO" } } }
}
```

## Aggregations

### Metric
```json
{
  "size": 0,
  "aggs": {
    "avg_price": { "avg": { "field": "price" } },
    "price_stats": { "stats": { "field": "price" } },
    "price_percentiles": { "percentiles": { "field": "price", "percents": [1, 5, 25, 50, 75, 95, 99] } },
    "unique_brands": { "cardinality": { "field": "brand", "precision_threshold": 10000 } }
  }
}
```

### Bucket
```json
{
  "size": 0,
  "aggs": {
    "by_category": {
      "terms": { "field": "category", "size": 20, "order": { "revenue": "desc" } },
      "aggs": {
        "revenue": { "sum": { "field": "price" } },
        "by_brand": { "terms": { "field": "brand", "size": 10 } }
      }
    },
    "price_ranges": {
      "range": { "field": "price", "ranges": [
        { "key": "Budget", "to": 25 },
        { "key": "Standard", "from": 25, "to": 100 },
        { "key": "Premium", "from": 100 }
      ]}
    },
    "sales_over_time": {
      "date_histogram": { "field": "created_at", "calendar_interval": "month" }
    }
  }
}
```

### Pipeline
```json
{
  "size": 0,
  "aggs": {
    "sales_per_month": {
      "date_histogram": { "field": "created_at", "calendar_interval": "month" },
      "aggs": {
        "total_sales": { "sum": { "field": "price" } },
        "moving_avg_sales": { "moving_avg": { "buckets_path": "total_sales", "window": 3 } },
        "derivative_sales": { "derivative": { "buckets_path": "total_sales" } }
      }
    },
    "avg_monthly_sales": { "avg_bucket": { "buckets_path": "sales_per_month>total_sales" } }
  }
}
```

## Performance Tuning

```json
// search_after for deep pagination (avoid from/size)
{
  "size": 10,
  "search_after": [1625000000000, "product-123"],
  "sort": [{ "created_at": "asc" }, { "_id": "asc" }]
}

// Force shard preference
{ "query": { "match_all": {} }, "preference": "_shards:0,1" }
```

## OpenSearch Differences

### k-NN Vector Search
```json
PUT /products
{
  "settings": { "index": { "knn": true, "knn.space_type": "cosinesimil" } },
  "mappings": { "properties": {
    "product_vector": {
      "type": "knn_vector", "dimension": 768,
      "method": { "name": "hnsw", "space_type": "l2", "engine": "nmslib",
        "parameters": { "ef_construction": 128, "m": 24 } }
    }
  }}
}

{ "size": 10, "query": { "knn": { "product_vector": { "vector": [0.1, 0.2, 0.3], "k": 10 } } } }
```

### OpenSearch PPL
```sql
source = products | where category = "electronics" AND price > 50
| stats count(), avg(price) by brand | sort - avg(price) | head 20
```

## References
- Query DSL: https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html
- OpenSearch k-NN: https://opensearch.org/docs/latest/search-plugins/knn/
- Aggregations: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html
