# Search Performance

## Relevance Tuning

### BM25 Parameters

```yaml
bm25:
  k1: 1.2
  # Default: 1.2. Controls term frequency saturation.
  # Higher = more impact from repeated terms.
  # Increase to 2.0 for long description fields.
  # Decrease to 0.5 for short title fields.

  b: 0.75
  # Default: 0.75. Controls length normalization.
  # Higher = more penalty for long documents.
  # Decrease to 0.3 for uniform-length documents.
  # Set to 0 to disable length normalization.
```

### Field Boosting

```json
{
  "query": {
    "multi_match": {
      "query": "wireless headphones",
      "fields": ["title^5", "description^2", "category^1.5", "brand^3", "tags"],
      "type": "cross_fields",
      "operator": "and"
    }
  }
}
```

### Function Scoring

```json
{
  "query": {
    "function_score": {
      "query": { "match": { "title": "wireless headphones" } },
      "functions": [
        {
          "filter": { "term": { "inStock": true } },
          "weight": 2
        },
        {
          "gauss": {
            "createdAt": {
              "origin": "now",
              "scale": "30d",
              "decay": 0.5
            }
          }
        },
        {
          "field_value_factor": {
            "field": "popularity_score",
            "factor": 1.5,
            "modifier": "log1p"
          }
        }
      ],
      "score_mode": "multiply",
      "boost_mode": "multiply"
    }
  }
}
```

### Rescore (Top-N Optimization)

```json
{
  "query": {
    "match": { "title": "wireless headphones" }
  },
  "rescore": {
    "window_size": 100,
    "query": {
      "rescore_query": {
        "function_score": {
          "query": { "match_phrase": { "title": "wireless headphones" } },
          "functions": [
            { "field_value_factor": { "field": "popularity", "factor": 2 } }
          ]
        }
      },
      "query_weight": 0.7,
      "rescore_query_weight": 0.3
    }
  }
}
```

## Query Optimization

### Avoid Expensive Operations

```json
// SLOW — script query (no caching)
{
  "query": {
    "script": {
      "script": "doc['price'].value * doc['quantity'].value > 100"
    }
  }
}

// FAST — pre-compute field, use simple query
{
  "query": {
    "range": { "total_value": { "gt": 100 } }
  }
}
```

### Use Filter Context for Caching

```json
{
  "query": {
    "bool": {
      "must": { "match": { "title": "headphones" } },  // scored, not cached
      "filter": { "term": { "category": "electronics" } }  // cached
    }
  }
}
```

### Pagination Performance

| Strategy | Pros | Cons | Use When |
|----------|------|------|----------|
| `from` + `size` | Simple | Deep pagination is expensive | Page < 1000 |
| `search_after` | Efficient deep pagination | Requires sort values | Infinite scroll |
| Scroll API | Consistent snapshot | Heavy, not for user-facing | Export/batch processing |
| Point-in-time | Consistent view, less overhead | Newer API | PIT-based search |

```typescript
// Efficient deep pagination with search_after
async function searchProducts(query: SearchQuery): Promise<SearchResult> {
  const searchParams: any = {
    index: 'products-read',
    query: { bool: { must: buildQuery(query), filter: buildFilters(query) } },
    sort: [
      { popularity: { order: 'desc' } },
      { id: { order: 'asc' } },  // Tiebreaker for consistent ordering
    ],
    size: query.limit,
  };

  // Use search_after for deep pagination
  if (query.cursor) {
    searchParams.search_after = query.cursor; // [popularity_value, id_value]
  }

  const result = await client.search(searchParams);

  const hits = result.hits.hits;
  return {
    items: hits.map(h => h._source),
    total: result.hits.total.value,
    cursor: hits.length > 0 ? hits[hits.length - 1].sort : undefined,
  };
}
```

## Index Optimization

### Refresh Interval Tuning

```json
{
  "settings": {
    // Default: 1s (near real-time)
    // Trade-off: faster refresh = more segments = more merge overhead
    "index": {
      "refresh_interval": "30s",
      // During bulk indexing, disable refresh:
      // "refresh_interval": "-1"
      // After bulk, restore:
      // "refresh_interval": "30s"
    }
  }
}
```

### Segment Merging

```json
{
  "settings": {
    "index": {
      "merge": {
        "scheduler": {
          "max_thread_count": 1
        },
        "policy": {
          "segments_per_tier": 10,
          "max_merged_segment": "5gb"
        }
      }
    }
  }
}
```

### Field Data Caching

```json
{
  "mappings": {
    "properties": {
      "category": {
        "type": "keyword",
        "doc_values": true,  // Required for aggregations and sorting
        "fielddata": false   // Don't load into fielddata cache
      }
    }
  }
}
```

## Cluster Performance Tuning

```yaml
performance:
  hardware:
    cpu: "8-16 cores per node"
    memory: "32-64 GB RAM (max 31 GB heap)"
    disk: "NVMe SSD, 2-4 TB per node"
    network: "10 Gbps interconnect"

  heap_settings:
    size: "50% of RAM, max 31GB"
    gc: "G1GC"
    gc_log: "/var/log/elasticsearch/gc.log"

  thread_pools:
    search:
      threads: 13  # (number of CPU cores)
      queue: 1000
    write:
      threads: 8
      queue: 200

  circuit_breakers:
    request: 0.95    # 95% heap limit for request
    fielddata: 0.75  # 75% heap limit for fielddata
    accounting: 0.85 # 85% heap limit for accounting

  indexing:
    refresh_interval: "30s"
    translog:
      durability: "async"
      sync_interval: "5s"
    indexing_buffer: "10% of heap"
```

## Monitoring Performance

```yaml
monitoring:
  query_latency:
    p50_target: "< 50ms"
    p95_target: "< 200ms"
    p99_target: "< 1000ms"
  indexing_latency:
    target: "< 100ms per document"
  cache_hit_rate:
    target: "> 80% for query cache"
    target: "> 90% for request cache"

alerts:
  - condition: "query_latency_p99 > 2000ms"
    severity: critical
  - condition: "search_thread_pool_queue > 500"
    severity: warning
  - condition: "fielddata_circuit_breaker_triggered > 0"
    severity: critical
  - condition: "gc_old_gen_pause > 5s"
    severity: warning
```

## Common Performance Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Slow queries under load | Insufficient threads or overloaded CPU | Increase search thread pool, add nodes |
| High GC pauses | Heap too small or too many fielddata | Increase heap, reduce fielddata usage |
| Slow indexing | Too many replicas, refresh too frequent | Increase refresh_interval, reduce replicas during bulk |
| Query results not fresh | Refresh interval too high | Decrease refresh_interval for time-sensitive data |
| High disk I/O | Excessive merging during indexing | Tune merge policy, throttle merges |
| Circuit breaker triggered | Query too expensive | Optimize query, increase circuit breaker limit |
| Low cache hit rate | Cache not warm, queries vary too much | Use filter context for cacheable queries |
