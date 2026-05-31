# Data Catalog Search and Discovery

## Overview

Search and discovery are the primary interfaces through which users interact with the data catalog. Effective search connects users to the right data assets quickly, while discovery surfaces relevant assets proactively. This reference covers search architecture, ranking algorithms, faceted search, discovery patterns, and optimization strategies.

## Search Architecture

### Indexing Pipeline

```
Data Sources → Metadata Ingestion → Index Builder → Search Index → Query → Results
                                         │
                                    Entity Store
                                     (Graph/DB)
```

The search index is separate from the entity store. The index is optimized for text search and faceted filtering. The entity store is optimized for graph traversal and relationship queries.

### Index Schema

```yaml
search_index:
  entity_types:
    - dataset
    - dashboard
    - chart
    - pipeline
    - notebook
    - metric
    - glossary_term

  default_index_fields:
    - name (text, weighted high)
    - description (text, weighted medium)
    - field_names (text, weighted high)  # column names
    - field_descriptions (text, weighted low)
    - platform (keyword)
    - domain (keyword)
    - owner (keyword)
    - tags (keyword)
    - glossary_terms (keyword)
    - tier (keyword)
    - last_updated (date)

  suggested_queries:
    - recent_searches
    - popular_datasets
    - trending_glossary_terms
```

## Query Processing

### Query Parsing

```python
class SearchQueryParser:
    """Parse and enhance user search queries."""

    def __init__(self, synonym_map: dict, stop_words: set):
        self.synonym_map = synonym_map  # e.g., {"client": "customer"}
        self.stop_words = stop_words

    def parse(self, raw_query: str) -> dict:
        steps = [
            ("synonym_expansion", self._expand_synonyms),
            ("glossary_mapping", self._map_glossary_terms),
            ("intent_classification", self._classify_intent),
            ("filter_extraction", self._extract_filters),
        ]

        query_context = {"raw": raw_query, "query": raw_query}
        for step_name, step_fn in steps:
            query_context = step_fn(query_context)

        return query_context

    def _expand_synonyms(self, context: dict) -> dict:
        words = context["query"].split()
        expanded = []
        for word in words:
            expanded.append(self.synonym_map.get(word.lower(), word))
        context["expanded_query"] = " ".join(expanded)
        return context

    def _classify_intent(self, context: dict) -> dict:
        query = context["query"].lower()
        if any(w in query for w in ["find", "search", "where", "show"]):
            context["intent"] = "discovery"
        elif any(w in query for w in ["how", "lineage", "depends", "source"]):
            context["intent"] = "lineage"
        elif any(w in query for w in ["who", "owner", "team"]):
            context["intent"] = "ownership"
        elif any(w in query for w in ["schema", "column", "field", "type"]):
            context["intent"] = "schema"
        else:
            context["intent"] = "general"
        return context
```

## Ranking Algorithm

### Scoring Factors

```yaml
ranking:
  factors:
    text_relevance:
      weight: 0.50
      components:
        - exact_name_match: 10.0
        - partial_name_match: 5.0
        - description_match: 3.0
        - column_name_match: 4.0
        - synonym_match: 2.0

    popularity:
      weight: 0.20
      components:
        - query_count_last_30d: scale(log(count))
        - unique_users_last_30d: scale(log(users))
        - dashboard_references: count(dashboards referencing this)

    freshness:
      weight: 0.10
      components:
        - days_since_last_update: exp(-days/30)

    quality:
      weight: 0.10
      components:
        - has_description: 1.0
        - has_owner: 1.0
        - has_lineage: 1.5
        - documentation_score: scale(0-10)

    custom:
      weight: 0.10
      components:
        - user_personalization: boost datasets user has accessed before
        - team_relevance: boost datasets owned by user's team
        - certification: boost certified datasets
```

### Implementation

```python
def rank_search_results(query: str, results: list, user_context: dict) -> list:
    """Rank search results using multi-factor scoring."""
    scored = []

    for result in results:
        score = 0.0

        # Text relevance
        name_score = compute_name_match(query, result["name"])
        desc_score = compute_text_match(query, result.get("description", ""))
        column_score = compute_field_match(query, result.get("columns", []))

        score += 0.50 * (name_score * 10 + desc_score * 3 + column_score * 4)

        # Popularity
        query_count = result.get("usage_stats", {}).get("query_count", 0)
        user_count = result.get("usage_stats", {}).get("unique_user_count", 0)
        popularity = math.log(max(query_count, 1)) * 0.5 + math.log(max(user_count, 1)) * 0.3
        score += 0.20 * popularity

        # Freshness
        days_since_update = result.get("days_since_last_update", 365)
        freshness = math.exp(-days_since_update / 30)
        score += 0.10 * freshness

        # Quality
        quality = 0
        if result.get("description"):
            quality += 1.0
        if result.get("owner"):
            quality += 1.0
        if result.get("has_lineage"):
            quality += 1.5
        score += 0.10 * quality

        # Personalization
        personalization = 0
        if user_context.get("recent_datasets", {}).get(result["urn"]):
            personalization += 1.0
        if result.get("owner_team") == user_context.get("team"):
            personalization += 0.5
        score += 0.10 * personalization

        scored.append((score, result))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [r for _, r in scored]
```

## Faceted Search

### Facet Configuration

```yaml
facets:
  - name: Platform
    field: platform.keyword
    type: TERM
    order: COUNT_DESC
    size: 10

  - name: Domain
    field: domain.keyword
    type: TERM
    order: COUNT_DESC
    size: 20

  - name: Owner
    field: owner.keyword
    type: TERM
    order: COUNT_DESC
    size: 10

  - name: Data Tier
    field: tier.keyword
    type: TERM
    order: KEY_ASC
    size: 10

  - name: Tags
    field: tags.keyword
    type: TERM
    order: COUNT_DESC
    size: 50

  - name: Last Updated
    field: last_updated
    type: DATE_RANGE
    ranges:
      - key: "Past 7 days"
        from: "now-7d"
        to: "now"
      - key: "Past 30 days"
        from: "now-30d"
        to: "now"
      - key: "Past 90 days"
        from: "now-90d"
        to: "now"
      - key: "Older than 90 days"
        to: "now-90d"
```

### Elasticsearch Query

```json
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "customer orders revenue",
            "fields": [
              "name^10",
              "field_names^8",
              "description^3",
              "field_descriptions^2"
            ],
            "type": "cross_fields",
            "operator": "and"
          }
        }
      ],
      "filter": [
        {"terms": {"platform.keyword": ["snowflake", "bigquery"]}},
        {"term": {"tier.keyword": "critical"}}
      ]
    }
  },
  "aggs": {
    "by_platform": {"terms": {"field": "platform.keyword", "size": 10}},
    "by_domain": {"terms": {"field": "domain.keyword", "size": 20}},
    "by_tier": {"terms": {"field": "tier.keyword", "size": 5}},
    "by_tag": {"terms": {"field": "tags.keyword", "size": 50}}
  },
  "from": 0,
  "size": 20,
  "sort": [
    {"_score": {"order": "desc"}},
    {"last_updated": {"order": "desc"}}
  ]
}
```

## Discovery Features

### Browse by Domain

```yaml
browse_configuration:
  root_categories:
    - name: Domains
      children:
        - Commerce (orders, products, carts)
        - Finance (revenue, invoices, payments)
        - Marketing (campaigns, leads, attribution)
        - Operations (inventory, shipments, suppliers)
        - Customer (profiles, segments, engagement)

    - name: Platform
      children:
        - Snowflake
        - BigQuery
        - S3 / Data Lake
        - Kafka / Streaming
        - Tableau / BI

    - name: Tier
      children:
        - Critical (executive reports, financial data)
        - Important (team dashboards, operational data)
        - Operational (logs, internal tools)
```

### Curated Collections

```yaml
collections:
  - name: Executive KPIs
    description: "Datasets used in monthly executive reporting"
    datasets:
      - analytics.fct_revenue
      - analytics.fct_customer_metrics
      - analytics.dim_financial_periods
    curated_by: data-governance
    last_reviewed: "2026-04-15"

  - name: ML Feature Store
    description: "Datasets used for ML model training"
    datasets:
      - features.customer_features
      - features.order_features
      - features.product_features
    curated_by: ml-platform
    last_reviewed: "2026-05-01"
```

### Recommended Datasets

```python
def get_recommendations(user_id: str, limit: int = 10) -> list:
    """Get personalized dataset recommendations."""
    user_profile = get_user_profile(user_id)

    recommendations = []

    # 1. Similar to recent queries
    recent = user_profile.get("recent_datasets", [])
    for dataset in recent:
        similar = find_similar_datasets(dataset["urn"])
        recommendations.extend(similar)

    # 2. Popular in my team
    team = user_profile.get("team")
    if team:
        team_popular = get_team_popular_datasets(team)
        recommendations.extend(team_popular)

    # 3. Trending across org
    trending = get_trending_datasets()
    recommendations.extend(trending)

    # Deduplicate and score
    scored = score_recommendations(recommendations, user_profile)
    return scored[:limit]
```

## Search Performance Optimization

### Index Optimization

```yaml
elasticsearch_config:
  index_settings:
    number_of_shards: 5
    number_of_replicas: 1
    refresh_interval: "30s"  # bulk indexing efficiency
    analysis:
      analyzer:
        data_analyzer:
          type: custom
          tokenizer: standard
          filter:
            - lowercase
            - synonym_filter
            - snowball  # English stemming

  query_config:
    max_result_window: 10000
    track_total_hits: true
    search_timeout: "10s"
    terminate_after: 1000  # early termination for high recall queries
```

### Caching Strategy

```python
class SearchCache:
    """Multi-level cache for search queries."""

    def __init__(self):
        self.result_cache = {}  # query -> results (LRU, TTL 5min)
        self.facet_cache = {}   # query -> facets (TTL 15min)
        self.popular_cache = {}  # popular queries pre-computed

    def get_or_compute(self, query: str, compute_fn, query_type="result"):
        if query_type == "result":
            cache = self.result_cache
            ttl = 300  # 5 minutes
        elif query_type == "facet":
            cache = self.facet_cache
            ttl = 900  # 15 minutes

        cache_key = self._normalize_query(query)
        cached = cache.get(cache_key)

        if cached and cached["expires"] > time.time():
            return cached["results"]

        results = compute_fn(query)
        cache[cache_key] = {
            "results": results,
            "expires": time.time() + ttl,
        }
        return results
```

## Analytics and Feedback

### Search Analytics

```yaml
search_analytics:
  tracked_events:
    - query_submitted
    - result_clicked
    - facet_applied
    - no_results_seen
    - advanced_search_used
    - browse_navigation

  metrics:
    - zero_result_rate: queries with 0 results / total queries
    - click_through_rate: clicks / impressions
    - avg_click_rank: average rank of clicked result
    - refinement_rate: queries followed by facet change
    - session_success_rate: sessions ending with a click

  dashboard:
    panels:
      - top_search_queries (last 7 days)
      - zero_result_queries (actions: report as missing assets)
      - search_latency_p50/p95
      - facet_usage_distribution
      - user_cohort_retention (first search vs returning)
```

### No-Result Handling

```python
def handle_no_results(query: str) -> dict:
    """Handle queries that return zero results."""
    response = {
        "results": [],
        "total": 0,
        "suggestions": []
    }

    # 1. Suggest similar terms
    suggestions = spell_correct(query)
    response["suggestions"] = suggestions

    # 2. Show popular queries as alternative
    popular = get_popular_queries(limit=5)
    response["popular_queries"] = popular

    # 3. Show browse categories
    response["browse_categories"] = get_browse_categories()

    # 4. Notify catalog admin
    log_zero_result_query(query)

    return response
```

## User Interface Patterns

### Search Result Card

```yaml
search_result_card:
  header:
    - dataset_name (link to detail page)
    - platform_icon (Snowflake, S3, Kafka)

  metadata:
    - description (truncated to 2 lines)
    - owner (team name)
    - last_updated (relative time)
    - tier_badge (Critical, Important)
    - tags (PII, Certified)

  actions:
    - preview_data (first 10 rows)
    - view_lineage (graph)
    - request_access
    - copy_urn
    - add_to_collection

  expandable:
    - columns (name, type, description)
    - recent_queries (last 5 users who queried this)
    - glossary_terms (linked business terms)
```

### Detail Page

```yaml
dataset_detail_page:
  sections:
    - overview: name, description, platform, owner, tier, tags, glossary_terms
    - schema: columns with name, type, description, nullable, tags
    - lineage: interactive graph (upstream + downstream)
    - statistics: row count, size, last updated, profiling stats
    - usage: top users, query count, recent queries
    - quality: completeness, uniqueness, freshness metrics
    - related: similar datasets, frequently co-queried datasets
    - access: current access grants, request access button
    - activity: changelog of metadata updates
```

## References

- Metadata management patterns
- Catalog API examples
- Metadata ingestion patterns
- Catalog governance framework
- Catalog platform comparison
- DataHub search configuration
- OpenMetadata search and discovery
- Elasticsearch optimization for catalog search
