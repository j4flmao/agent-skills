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

## Rules
- Explicit mapping always, dynamic mapping never in production
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
- `references/elasticsearch-architecture.md` — Node types, shards/replicas, mapping, analysis, indexing, cluster management, ILM
- `references/search-aggregation.md` — Full-text search, term/boolean/fuzzy queries, aggregations, performance tuning, OpenSearch

## Handoff
`data-relational-database` for source data
`ml-feature-engineering` for text feature extraction from search data
