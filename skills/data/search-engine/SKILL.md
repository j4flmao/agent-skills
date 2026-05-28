---
name: data-search-engine
description: >
  Use this skill when asked about Elasticsearch, OpenSearch, Solr, search engine, full-text search, inverted index, indexing, search analytics, aggregation, cluster management, or shard routing. This skill enforces: Elasticsearch architecture (node types, shards, replicas), indexing strategy (mapping, analysis, tokenization), search queries (full-text, term, bool, fuzzy), aggregations (metric, bucket, pipeline), cluster management (node roles, shard allocation, ILM), OpenSearch differences, and performance tuning. Do NOT use for: relational database queries, graph traversals, or key-value lookups.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, search, engine, phase-11]
---

# Data Search Engine

## Purpose
Design and configure search engine clusters for full-text search, log analytics, and real-time data exploration with proper indexing, query design, and cluster management.

## Agent Protocol

### Trigger
Exact user phrases: "Elasticsearch", "OpenSearch", "Solr", "search engine", "full-text search", "inverted index", "indexing", "search analytics", "aggregation", "cluster management", "shard routing", "mapping", "analysis", "tokenization", "ILM", "index lifecycle".

### Input Context
Before activating, verify:
- Search platform (Elasticsearch, OpenSearch, Solr)
- Data types (text, structured, geo, time-series)
- Query patterns (full-text search, faceted navigation, aggregations, autocomplete)
- Indexing volume (docs/sec, total doc count, index size)
- Cluster topology (node count, hardware, cloud/on-prem)
- Replication and HA requirements
- Retention and lifecycle policies

### Output Artifact
Search index mapping with analyzers, query templates, aggregation pipelines, and cluster configuration as JSON and YAML.

### Response Format
```json
// Index mapping with analyzers
// Search query template
// Aggregation pipeline
```
```yaml
# Cluster configuration
# Index lifecycle policy
# Shard allocation rules
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Index mapping with proper field types, analyzers, and multi-fields
- [ ] Search templates for common query patterns (match, bool, term, fuzzy)
- [ ] Aggregation pipeline for faceted navigation and analytics
- [ ] Cluster topology designed (node roles, shard count, replica count)
- [ ] Index lifecycle policy configured (hot, warm, cold, delete phases)
- [ ] Performance tuning applied (refresh interval, merge settings, thread pools)
- [ ] OpenSearch-specific features considered if applicable

### Max Response Length
300 lines of configuration and queries.

## Workflow

### Step 1: Index Mapping Design
Explicit mapping required — never use dynamic mapping for production. Define field types: `text` for full-text search with analyzer, `keyword` for exact match/aggregations/sorting, `integer/long/double` for numeric, `date` with format, `geo_point` for location, `nested` for arrays of objects (preserves independence), `flattened` for semi-structured metadata, `object` for simple JSON.

```json
{
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "title": { "type": "text", "analyzer": "english", "fields": { "keyword": { "type": "keyword" } } },
      "description": { "type": "text", "analyzer": "english" },
      "category": { "type": "keyword" },
      "price": { "type": "double" },
      "created_at": { "type": "date", "format": "yyyy-MM-dd'T'HH:mm:ss||epoch_millis" },
      "location": { "type": "geo_point" },
      "tags": { "type": "keyword" },
      "specs": { "type": "flattened" },
      "reviews": {
        "type": "nested",
        "properties": {
          "user": { "type": "keyword" },
          "rating": { "type": "byte" },
          "text": { "type": "text", "analyzer": "english" }
        }
      }
    }
  }
}
```

### Step 2: Analysis and Tokenization
Character filters: HTML strip, pattern replace, mapping. Tokenizer: standard (grammar-based), whitespace, keyword (no split), ngram (autocomplete), edge_ngram (prefix autocomplete), uax_url_email (URLs kept whole). Token filters: lowercase, stop, synonym, stemmer, shingle (n-gram phrases), edge_ngram (for search-as-you-type). Custom analyzer combining these components.

```json
{
  "settings": {
    "analysis": {
      "char_filter": {
        "html_strip": { "type": "html_strip" }
      },
      "tokenizer": {
        "autocomplete": { "type": "edge_ngram", "min_gram": 2, "max_gram": 20 }
      },
      "filter": {
        "synonyms": { "type": "synonym", "synonyms": ["laptop, notebook", "phone, smartphone, mobile"] }
      },
      "analyzer": {
        "product_search": {
          "type": "custom",
          "char_filter": ["html_strip"],
          "tokenizer": "standard",
          "filter": ["lowercase", "synonyms", "stop", "stemmer"]
        },
        "autocomplete": {
          "type": "custom",
          "tokenizer": "autocomplete",
          "filter": ["lowercase"]
        }
      }
    }
  }
}
```

### Step 3: Search Queries
`match`: full-text with analysis (best for user search). `match_phrase`: exact phrase with slop. `match_bool_prefix`: last term as prefix. `term`: exact value for keyword fields. `terms`: multiple exact values. `range`: numeric/date range filters. `exists`: field presence. `prefix`: prefix match on keyword. `wildcard`: pattern matching (expensive). `regexp`: regex (very expensive). `fuzzy`: Levenshtein edit distance. `bool`: compound with must/should/filter/must_not.

```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "title": { "query": "wireless headphones", "boost": 3 } } },
        { "match": { "description": "wireless headphones" } }
      ],
      "filter": [
        { "term": { "category": "electronics" } },
        { "range": { "price": { "gte": 50, "lte": 500 } } },
        { "term": { "status": "active" } }
      ],
      "should": [
        { "match": { "title": { "query": "bluetooth", "boost": 2 } } }
      ],
      "minimum_should_match": 1
    }
  }
}
```

### Step 4: Aggregations
Metric: `avg`, `sum`, `min`, `max`, `stats`, `extended_stats`, `cardinality`, `percentiles`. Bucket: `terms`, `date_histogram`, `range`, `histogram`, `filter`, `filters`, `geohash_grid`. Pipeline: `avg_bucket`, `sum_bucket`, `moving_avg`, `derivative`, `cumulative_sum`, `bucket_sort`, `bucket_selector`. Sub-aggregations: nest buckets inside buckets for drill-down.

```json
{
  "size": 0,
  "aggs": {
    "categories": {
      "terms": { "field": "category", "size": 20, "order": { "sales": "desc" } },
      "aggs": {
        "sales": { "sum": { "field": "price" } },
        "price_ranges": {
          "range": { "field": "price", "ranges": [
            { "key": "Budget", "to": 50 },
            { "key": "Mid", "from": 50, "to": 200 },
            { "key": "Premium", "from": 200 }
          ]}
        },
        "sales_over_time": {
          "date_histogram": { "field": "created_at", "calendar_interval": "month" },
          "aggs": {
            "avg_price": { "avg": { "field": "price" } },
            "moving_avg": { "moving_avg": { "buckets_path": "avg_price" } }
          }
        }
      }
    }
  }
}
```

### Step 5: Cluster Management
Node roles: `master` (cluster state management, odd count 3-5), `data_hot` (fast storage, high IOPS), `data_warm` (standard storage), `data_cold` (cheap storage, less replicas), `data_frozen` (searchable snapshots), `ingest` (preprocessing pipelines), `ml` (machine learning), `transform`. Shard sizing: 10-50 GB per shard, max 20 shards per GB of heap. Replicas: 1 for production (2 for read-heavy). Shard allocation awareness: rack/zone tags.

```yaml
# elasticsearch.yml
cluster.name: production-search
node.name: node-data-hot-1
node.roles: [data_hot, ingest]
path.data: /var/lib/elasticsearch
discovery.seed_hosts: ["master-1", "master-2", "master-3"]
cluster.initial_master_nodes: ["master-1", "master-2", "master-3"]

# Shard allocation awareness
cluster.routing.allocation.awareness.attributes: zone
cluster.routing.allocation.awareness.force.zone.values: [us-east, us-west]

# Performance settings
indices.memory.index_buffer_size: 10%
indices.queries.cache.size: 20%
thread_pool.search.queue_size: 5000
thread_pool.write.queue_size: 1000
```

### Step 6: Index Lifecycle Management
Hot phase: full indexing, high IOPS, many replicas. Warm phase: read-only, merge to single segment, reduce replicas. Cold phase: searchable snapshot, minimal storage. Delete phase: automatic deletion after retention period. Rollover: based on max size (50 GB), max age (30d), or max docs.

```json
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": { "max_primary_shard_size": "50gb", "max_age": "30d" },
          "set_priority": { "priority": 100 }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "forcemerge": { "max_num_segments": 1 },
          "shrink": { "number_of_shards": 1 },
          "allocate": { "number_of_replicas": 1, "require": { "data_tier": "data_warm" } },
          "set_priority": { "priority": 50 }
        }
      },
      "cold": {
        "min_age": "90d",
        "actions": {
          "searchable_snapshot": { "snapshot_repository": "s3-backup" },
          "set_priority": { "priority": 0 }
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": { "delete": {} }
      }
    }
  }
}
```

### Step 7: OpenSearch Differences
OpenSearch is the open-source fork of Elasticsearch 7.10. API compatibility: most endpoints are identical. Key differences: Opensearch uses `opensearch.yml` instead of `elasticsearch.yml`, security plugin built-in (not X-Pack), `k-NN` plugin for vector search, PPL (Piped Processing Language) for SQL-like queries, Dashboards replaces Kibana, alerting and anomaly detection plugins built-in.

```sql
-- OpenSearch PPL
source = products
| where category = 'electronics' AND price > 50
| stats avg(price) by category
| sort - avg(price)
| head 10
```

### Step 8: Meilisearch
Meilisearch is a lightweight search engine in Rust providing instant search-as-you-type (sub-50ms), typo tolerance out of the box, and an intuitive REST API. Features: automatic indexing (no explicit schema), faceted search with filters/ranges, synonym management, geo-search, multi-tenancy via API key scoping. Uses milli (Rust) core with LMDB key-value storage. Single-node only — data must fit on one instance. Use for datasets up to 10M docs, site search, ecommerce product search, and rapid setup.

```json
// Meilisearch: index creation with searchable attributes
POST /indexes
{
  "uid": "products",
  "primaryKey": "id"
}

// Add documents (auto-indexed)
POST /indexes/products/documents
[
  { "id": 1, "title": "Wireless Headphones", "brand": "AudioPro", "price": 89.99, "category": "Electronics" },
  { "id": 2, "title": "Bluetooth Speaker", "brand": "AudioPro", "price": 49.99, "category": "Electronics" }
]

// Search with typo tolerance (automatic)
GET /indexes/products/search?q=wireles&filter=price<100
// Returns: Wireless Headphones (typo "wireles" matches "Wireless")

// Configure ranking rules
PATCH /indexes/products/settings
{
  "rankingRules": ["words", "typo", "proximity", "attribute", "sort", "exactness"],
  "sortableAttributes": ["price"],
  "filterableAttributes": ["category", "brand"]
}
```

### Step 9: Typesense
Typesense is an open-source, typo-tolerant search engine in C++ for sub-50ms search on TB-scale data. Configurable ranking combining text relevance, numeric fields, and custom formulas. Key features: built-in vector search for semantic/embedding-based retrieval alongside full-text, scoped API keys for multi-tenancy, curation rules (pin/boost results), query suggestions via synonyms. High availability via replication-based cluster. Use for apps needing both full-text and vector search in one system, ecommerce with curation, or as an Elasticsearch alternative with simpler ops and better per-node performance.

```json
// Typesense: schema with vector search
{
  "name": "products",
  "fields": [
    {"name": "title", "type": "string"},
    {"name": "description", "type": "string"},
    {"name": "price", "type": "float", "sort": true},
    {"name": "category", "type": "string", "facet": true},
    {"name": "embedding", "type": "float[]", "num_dim": 384}
  ],
  "default_sorting_field": "price"
}

// Hybrid search: text + vector (semantic)
GET /collections/products/documents/search
?q=wireless headphones
&query_by=title,description
&vector_query=embedding:([0.02, 0.15, ...])  # 384-dim embedding
&sort_by=price:asc
```

## Common Pitfalls

### Pitfall 1: Dynamic Mapping in Production
Dynamic mapping creates thousands of unused fields, bloats the mapping, and causes mapping explosions. Always use explicit mapping with `dynamic: "strict"` for production indices.

### Pitfall 2: Oversharding
Too many shards wastes resources and degrades cluster performance. Maximum 20 shards per GB of heap. A 30GB heap cluster should have max 600 shards total. Delete unused indices.

### Pitfall 3: Undersharding
Too few shards limits indexing parallelism and prevents effective scaling. Target 10-50GB per shard. A 500GB index needs 10-50 shards.

### Pitfall 4: No Index Lifecycle Management
Without ILM, time-series indices grow unbounded, consume all disk space, and degrade performance. Always define hot/warm/cold/delete phases.

### Pitfall 5: Using `text` for Aggregations
Text fields are analyzed and cannot be used for terms aggregations, sorting, or scripting. Always use `.keyword` multifield or explicit `keyword` type for aggregatable fields.

### Pitfall 6: Deep Pagination
Using `from` + `size` beyond page 100 causes massive heap pressure. Use `search_after` for deep pagination or `scroll` for batch processing.

### Pitfall 7: No Query Timeout
Without timeouts, slow queries block thread pool threads and degrade cluster responsiveness. Set `timeout` on all search requests.

### Pitfall 8: Nested Query Without Nested Type
Querying array objects as if they were independent leads to incorrect results. Use `nested` type and `nested` query when array element independence matters.

### Pitfall 9: Too Many Replicas
Each replica doubles storage and indexing load. One replica is sufficient for high availability. Two for read-heavy. More than two rarely needed.

### Pitfall 10: Ignoring Cluster Health
Yellow cluster status (unassigned shards) degrades read capacity. Red cluster status means missing data. Monitor and alert on cluster health.

## Best Practices

- Use explicit mapping with `dynamic: "strict"` for all production indices.
- Multifields: `text` for search + `keyword` for sorting/aggregations.
- Use filter context (bool/filter) for structured conditions — cached, no scoring overhead.
- Keep shard size 10-50GB. Max 20 shards per GB of heap.
- Use ILM for all time-series indices. Define hot/warm/cold/delete phases.
- Set `refresh_interval: 30s` (or `-1` during bulk indexing) for write-heavy workloads.
- Use `search_after` for deep pagination. Never use `from`/`size` beyond page 100.
- Set `timeout` on all search requests to prevent thread pool exhaustion.
- Use `nested` type only when array element independence is required.
- Enable slow logs: `index.search.slowlog.threshold.query.warn: 10s`.
- Prefer `terms` over `wildcard`/`regexp` queries. They are much faster.
- Use `forcemerge` to 1 segment in warm phase for faster reads.
- Monitor: cluster health, node CPU/memory, search latency, indexing rate.

## Compared With

### Elasticsearch vs OpenSearch
OpenSearch is a fork of Elasticsearch 7.10 with built-in security, k-NN vector search, PPL, and alerting. Elasticsearch 8.x has more advanced features (ELSER, vector search with HNSW, better performance). Choose OpenSearch for open-source commitment and built-in security. Choose Elasticsearch for the latest search and AI features.

### Elasticsearch vs Meilisearch
Elasticsearch is a full-featured search and analytics engine for datasets from GB to PB. Meilisearch is lightweight (Rust, single-node, sub-50ms) for datasets up to 10M docs. Choose Elasticsearch for complex querying, aggregations, and large-scale analytics. Choose Meilisearch for simple, fast site search.

### Elasticsearch vs Typesense
Typesense is C++, typo-tolerant, sub-50ms, with built-in vector search and curations. Elasticsearch is more feature-rich but operationally heavier. Choose Typesense for simpler ops and higher per-node performance. Choose Elasticsearch for complex analytics and cluster-scale deployments.

### Elasticsearch vs Solr
Solr is older but excels at faceted search and has a mature ecosystem. Elasticsearch has better ecosystem (Kibana, Beats, Logstash), easier scaling, and more active development. Choose Elasticsearch for new projects. Choose Solr for legacy systems with specific faceted search requirements.

## Performance Considerations

- Indexing: target refresh_interval 30s+ for bulk writes. Use `-1` during initial loads.
- Merge: `max_merged_segment: 5GB` default. Larger for read-heavy indices.
- Store: use SSD for hot tier. HDD for warm/cold. RAID 0 for hot nodes.
- Heap: 50% of RAM, max 31GB (Java compressed oops limit). Rest to OS for file cache.
- Thread pools: search queue size default 1000. Increase for high concurrency.
- Circuit breakers: `indices.breaker.total.limit: 70%` of heap for field data/requests.
- Bulk indexing: 5-15MB per batch, 1000-5000 docs per batch.
- Shard recovery: throttle at 40MB/sec to avoid cluster overload.
- Slow logs: enable query slow log at 500ms WARN, 5s INFO.
- Field data: use `eager` loading for aggregations on high-cardinality fields.
- Doc values: enabled by default for keyword, numeric, date. Supports efficient sorting/aggregation without field data cache.
- Search load: use replicas for read scaling. Each replica can serve search traffic.

## Rules
- Multi-fields (`text` + `keyword`) for full-text + sorting/aggregation
- Limit shard size to 10-50 GB per shard
- Use filter context for structured conditions (cached, no scoring)
- Use `nested` type only when array element independence matters
- Prefer `keyword` over `text` for exact match and aggregations
- Keep shard count moderate: 20 shards per GB of heap max
- Index lifecycle policies for all time-series indices
- Refresh interval of 30s+ for indexing-heavy workloads
- Use search templates client-side, not stored scripts

## References
  - references/elasticsearch-architecture.md — Elasticsearch Architecture
  - references/modern-search-engines.md — Modern Search Engines — Meilisearch and Typesense
  - references/search-aggregation.md — Search Queries and Aggregations
  - references/search-engine-optimization.md — Search Engine Optimization Reference
  - references/search-operations.md — Search Operations
  - references/search-relevance-tuning.md — Search Relevance Tuning
  - references/search-engine-ranking-relevance.md — Ranking, relevance tuning, and scoring strategies
  - references/search-engine-distributed-architecture.md — Distributed architecture for search clusters
## Handoff
`data-relational-database` for source data
`ml-feature-engineering` for text feature extraction from search data
