---
name: backend-search-patterns
description: >
  Use this skill when designing search functionality, indexing strategies, or relevance tuning. This skill enforces: derived index from source of truth, index aliases for zero-downtime reindex, proper field mapping with analyzers, and resource limits. Applies to Elasticsearch, Meilisearch, Algolia, or any search engine. Do NOT use for: primary database queries, simple LIKE/ILIKE lookups, or full-text search in application DB.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, search, phase-6, universal]
---

# Backend Search Patterns

## Purpose
Design search architecture with indexing strategy, query design, and relevance tuning.

## Agent Protocol

### Trigger
Exact user phrases: "search", "Elasticsearch", "Meilisearch", "Algolia", "full-text search", "search index", "search query", "faceted search", "autocomplete", "search ranking", "search relevance", "indexing strategy", "search aggregation", "synonym search", "fuzzy search".

### Input Context
Before activating, verify:
- Data volume (documents count, average document size, growth rate)
- Search requirements (full-text, faceted navigation, geo-spatial, autocomplete)
- Update frequency (real-time CDC, hourly batch, daily reindex)
- Consistency requirements (eventual consistency acceptable, or need read-your-writes)

### Output Artifact
Search architecture design as formatted text.

### Response Format
```yaml
# Index mapping with analyzers
# Indexing strategy (CDC/batch/webhook)
```
```json
# Query DSL template
# Aggregation patterns
```
```yaml
# Cluster config and resource limits
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Search provider selected based on requirements
- [ ] Index mapping defined with field types, analyzers, and doc values
- [ ] Indexing strategy chosen (CDC/batch/webhook) with sync mechanism
- [ ] Search query patterns designed (full-text, faceted, autocomplete, geo)
- [ ] Relevance tuning configured (BM25, field boosting, function scoring)
- [ ] Operational concerns addressed (aliases, shards, snapshots, monitoring)

### Max Response Length
300 lines of mapping, queries, and configuration.

## Workflow

### Step 1: Search Provider Selection
| Provider | Type | Hosting | Query Complexity | Relevance | Performance | Cost |
|----------|------|---------|-----------------|-----------|-------------|------|
| Elasticsearch | Self-managed/SaaS | Cloud/on-prem | Full DSL | Custom BM25 | High | Infra cost |
| OpenSearch | Self-managed/SaaS | Cloud/on-prem | Full DSL | Custom BM25 | High | Infra cost |
| Meilisearch | Self-managed/SaaS | Cloud/on-prem | Simple REST | High OOTB | Very high | Open source |
| Typesense | Self-managed/SaaS | Cloud/on-prem | Simple REST | High OOTB | Very high | Open source |
| Algolia | SaaS | Managed | Simple REST | Very high OOTB | Edge-cached | Per search op |

Elasticsearch for complex search with aggregations, geo, custom scoring. Meilisearch for simple typo-tolerant search, instant setup. Algolia for managed high relevance out-of-box, global CDN, no ops. Typesense as a faster simpler alternative to Elasticsearch. OpenSearch as the open-source fork of Elasticsearch (after license change).

### Step 2: Index Mapping
Define every field with explicit type: `keyword` for exact match/filtering/sorting, `text` with analyzer for full-text, `integer`/`float`/`date` for range queries, `geo_point` for geo-spatial, `boolean` for flags. Set language-specific analyzers per field. Use `doc_values: true` on fields used for aggregations and sorting (critical for performance). `nested` type for arrays of objects (maintains document boundaries). `enabled: false` on fields not searched (saves index space).

```json
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 2,
    "refresh_interval": "30s",
    "analysis": {
      "analyzer": {
        "autocomplete": { "type": "custom", "tokenizer": "edge_ngram", "filter": ["lowercase"] },
        "english_custom": { "type": "standard", "stopwords": "_english_", "filter": ["lowercase", "porter_stem", "product_synonyms"] }
      },
      "tokenizer": { "edge_ngram": { "type": "edge_ngram", "min_gram": 2, "max_gram": 15 } },
      "filter": { "product_synonyms": { "type": "synonym", "synonyms": ["laptop, notebook, ultrabook", "mobile, phone, smartphone"] } }
    }
  },
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "title": { "type": "text", "analyzer": "english_custom", "fields": { "keyword": { "type": "keyword" }, "autocomplete": { "type": "text", "analyzer": "autocomplete" } } },
      "description": { "type": "text", "analyzer": "english_custom" },
      "price": { "type": "float", "doc_values": true },
      "category": { "type": "keyword", "doc_values": true },
      "tags": { "type": "keyword" },
      "createdAt": { "type": "date", "format": "strict_date_optional_time" },
      "location": { "type": "geo_point" },
      "inStock": { "type": "boolean" },
      "reviews": { "type": "nested", "properties": { "score": { "type": "byte" }, "comment": { "type": "text" } } },
      "metadata": { "enabled": false }
    }
  }
}
```

### Step 3: Indexing Strategy
| Strategy | Latency | Consistency | Operational Load | Use Case |
|----------|---------|-------------|-----------------|----------|
| CDC (Debezium) | Seconds | Near real-time | High | E-commerce catalogs, real-time feeds |
| Bulk batch | Hours | Eventual | Low | Nightly rebuild, small datasets |
| Webhook/event | Milliseconds | Near real-time | Medium | CMS, content management |
| Dual-write | Real-time | Strong | Medium | Read-your-writes required |
| Queue-based | Seconds-minutes | At-least-once | Medium | High-throughput systems |

CDC: Debezium captures DB changes, emits to Kafka, consumer updates search index. Bulk: periodic batch job reads all data, truncates index, rebulks. Webhook: app emits events on data change, consumer updates index. Dual-write: app writes to both DB and search in same transaction. Queue-based: app enqueues index event, consumer processes.

### Step 4: Search Query DSL
Full-text: `match` and `multi_match` with field boosting (`title^3`, `description^2`). Filters: `term`/`terms` for exact, `range` for numeric/date, `geo_distance` for geo, `exists` for field presence. Faceted: `terms` aggregation with `size` limit, `range` aggregation for price buckets, nested aggregations for drill-down. Autocomplete: `match_phrase_prefix` or edge-ngram analyzer + `completion` suggester. Post-filters: apply after aggregation calculation (filter UI without affecting facet counts).

```json
{
  "query": {
    "bool": {
      "must": [{ "multi_match": { "query": "wireless headphones", "fields": ["title^3", "description^2", "tags^1.5"], "fuzziness": "AUTO", "minimum_should_match": "75%" } }],
      "filter": [{ "term": { "category": "electronics" } }, { "range": { "price": { "gte": 10, "lte": 500 } } }, { "term": { "inStock": true } }]
    }
  },
  "aggs": {
    "by_category": { "terms": { "field": "category", "size": 20 } },
    "price_ranges": { "range": { "field": "price", "ranges": [{ "to": 25 }, { "from": 25, "to": 100 }, { "from": 100 }] } }
  },
  "post_filter": { "term": { "brand": "sony" } }
}
```

### Step 5: Relevance Tuning
BM25 parameters: `k1` (1.2 default) controls term frequency saturation — increase to 2.0 for long descriptions, decrease to 0.5 for short titles. `b` (0.75 default) controls length normalization — decrease to 0.3 for uniform-length fields. Field boosting: `title^5`, `description^2`, `tags^1.5`. Function scoring: recency (Gaussian on date), popularity (field_value_factor), personalization (script score for user history). Synonyms: configure as analyzer filter for query expansion. Rescore: run expensive scoring on top-100 results only.

### Step 6: Index Aliases for Zero-Downtime Reindex
Always use aliases for production reads/writes. Reindex: create new index with updated mappings → bulk load data → atomically swap alias from old to new → delete old index. Write alias points to index accepting writes. Read alias points to index serving queries.

```json
POST /_aliases
{
  "actions": [
    { "remove": { "index": "products-v2", "alias": "products-write" } },
    { "remove": { "index": "products-v2", "alias": "products-read" } },
    { "add": { "index": "products-v3", "alias": "products-write" } },
    { "add": { "index": "products-v3", "alias": "products-read" } }
  ]
}
```

### Step 7: Cluster Operations
Shard strategy: 20-40GB per shard, shard count = `cluster_nodes * 2` minimum. Heap: 50% of RAM, max 31GB per node (JVM pointer compression limit). Thread pools: search (13 threads, 1000 queue), write (8 threads, 200 queue). Circuit breakers: 95% heap for request, 75% for fielddata. Snapshots: daily to S3, retention 30 days. Monitoring: query latency p95/p99, indexing rate, merge rate, GC pauses.

```yaml
cluster:
  heap: "50% RAM, max 31GB"
  thread_pools: { search: { threads: 13, queue: 1000 }, write: { threads: 8, queue: 200 } }
  circuit_breaker: { request: 0.95, fielddata: 0.75 }
  field_limit: { default: 1000, max: 2000 }
  shard_limit: { max_per_node: 1000, target_size_gb: 20-40 }
monitoring:
  alert_on:
    - query_p99 > 2000ms
    - heap > 85%
    - circuit_breaker_triggered > 1
    - shard_count > node_count * 20
```

## Rules
- Search index is derived data — rebuildable from source of truth
- Never search the primary database
- Index aliases for all production reads, write to specific alias, swap on reindex
- Set resource limits: max shards per node, field count limit
- Monitor search latency p95/p99
- Tune refresh interval for write-heavy workloads (30s default, increase to 60-120s for bulk)
- Use `dynamic: strict` for production mappings
- Synonyms should be content-managed, not hardcoded

## References
- `references/search-engines.md` — Mapping, query DSL, aggregations, cluster configuration
- `references/indexing-strategies.md` — BM25 tuning, boosting, synonyms, function scoring
- `references/search-architecture.md` — Search architecture, indexing pipeline, query service, faceted search
- `references/search-performance.md` — Relevance tuning, BM25 parameters, query optimization, cluster tuning

## Handoff
`backend-database-patterns` for indexing source data schema design
