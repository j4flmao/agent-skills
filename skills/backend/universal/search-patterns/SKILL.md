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
Elasticsearch for complex search with aggregations, geo, custom scoring, and large-scale analytics. Meilisearch for simple typo-tolerant search with minimal configuration and instant setup. Algolia for managed SaaS with high relevance out-of-box and CDN delivery. Criteria: data volume, query complexity, operational overhead tolerance, budget.

### Step 2: Index Mapping
Define fields with explicit types: `keyword` for exact match/filtering/sorting, `text` with analyzer for full-text, `integer`/`float`/`date` for range queries, `geo_point` for geo-spatial. Set language-specific analyzers per field. Use `doc_values: true` on fields used for aggregations and sorting. Nested fields for arrays of objects. `enabled: false` on fields not searched.

### Step 3: Indexing Strategy
CDC-based: Debezium or similar captures DB changes → emit to search index. Use for real-time search requirements. Bulk indexing: periodic batch job truncates and rebuilds index. Use for nightly updates or small datasets. Webhook-triggered: application emits events on data change → consumer updates index. Use for moderate volume with near-real-time needs.

### Step 4: Search Query Design
Full-text: `match` and `multi_match` with field boosting. Filters: `term`/`terms` for exact filters, `range` for numeric/date, `geo_distance` for geo. Faceted: `terms` aggregation with `size` limit, nested aggregations for drill-down. Autocomplete: `match_phrase_prefix` or edge-ngram tokenizer with `completion` suggester. Post-filters for UI filter application without affecting aggregations.

### Step 5: Relevance Tuning
BM25 with tuned `k1` (1.2 default, increase for longer documents) and `b` (0.75 default, decrease to penalize length less). Field boosting: title^3, description^2, tags^1. Function scoring: recency boost, popularity boost, personalized boost via script. Custom ranking: rescore on top-N results with ML model or business rules.

### Step 6: Operational Concerns
Index aliases for zero-downtime reindex: write alias → rebuild under new index → swap alias. Shard strategy: 20-40GB per shard, shard count = cluster nodes * 2. Snapshot/restore: daily snapshots to S3, retention 30 days. Monitoring: query latency p95/p99, indexing rate, merge rate, garbage collection pauses.

## Rules
- Search index is derived data — rebuildable from source of truth
- Never search the primary database
- Index aliases for all production reads, write to specific alias, swap on reindex
- Set resource limits: max shards per node, field count limit
- Monitor search latency p95/p99
- Tune refresh interval for write-heavy workloads (30s default, increase to 60-120s for bulk)

## References
- `references/elasticsearch-patterns.md` — Mapping, query DSL, aggregations, cluster configuration
- `references/search-relevance.md` — BM25 tuning, boosting, synonyms, function scoring

## Handoff
`backend-database-patterns` for indexing source data schema design
