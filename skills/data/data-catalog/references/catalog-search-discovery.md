# Catalog Search and Discovery

## Search Architecture

Data catalog search must handle diverse metadata types including tables, columns, dashboards, pipelines, and metrics.

### Search Index Design

```python
from elasticsearch import Elasticsearch
from elasticsearch_dsl import Document, Text, Keyword, Date, Integer

class CatalogDocument(Document):
    name = Text(fields={"raw": Keyword()})
    description = Text(analyzer="english")
    asset_type = Keyword()
    domain = Keyword()
    owner = Keyword()
    tags = Keyword(multi=True)
    last_updated = Date()
    popularity = Integer()
    columns = Text(multi=True)

    class Index:
        name = "data_catalog"
        settings = {
            "number_of_shards": 3,
            "number_of_replicas": 1,
            "analysis": {
                "analyzer": {
                    "catalog_analyzer": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["lowercase", "stop", "snowball"]
                    }
                }
            }
        }

    def suggest_completions(self, prefix: str) -> list[str]:
        s = self.search()
        s = s.suggest("autocomplete", prefix, completion={
            "field": "name.suggest",
            "fuzzy": {"fuzziness": 2}
        })
        response = s.execute()
        return [opt.text for opt in response.suggest.autocomplete[0].options]
```

### Faceted Search

```python
class FacetedSearch:
    def __init__(self, client: Elasticsearch):
        self.client = client

    def search(self, query: str, filters: CatalogFilters) -> SearchResult:
        must_conditions = [
            {"multi_match": {
                "query": query,
                "fields": ["name^3", "description", "columns"],
                "type": "best_fields",
                "fuzziness": "AUTO",
            }}
        ]

        if filters.asset_type:
            must_conditions.append({"terms": {"asset_type": filters.asset_type}})
        if filters.domain:
            must_conditions.append({"terms": {"domain": filters.domain}})
        if filters.owner:
            must_conditions.append({"terms": {"owner": filters.owner}})

        body = {
            "query": {"bool": {"must": must_conditions}},
            "aggs": {
                "by_type": {"terms": {"field": "asset_type"}},
                "by_domain": {"terms": {"field": "domain"}},
                "by_owner": {"terms": {"field": "owner"}},
            },
            "size": filters.page_size or 20,
            "from": (filters.page or 0) * (filters.page_size or 20),
        }

        response = self.client.search(index="data_catalog", body=body)
        return SearchResult(
            total=response["hits"]["total"]["value"],
            hits=[hit["_source"] for hit in response["hits"]["hits"]],
            aggregations=self._parse_aggregations(response),
        )
```

## Popularity Scoring

```python
class PopularityScorer:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client

    def record_access(self, asset_id: str, user_id: str):
        pipeline = self.redis.pipeline()
        pipeline.zincrby("popularity:day", 1, asset_id)
        pipeline.zincrby("popularity:week", 1, asset_id)
        pipeline.zincrby("popularity:month", 1, asset_id)
        pipeline.sadd(f"users:{asset_id}", user_id)
        pipeline.execute()

    def get_score(self, asset_id: str) -> float:
        day = self.redis.zscore("popularity:day", asset_id) or 0
        week = self.redis.zscore("popularity:week", asset_id) or 0
        month = self.redis.zscore("popularity:month", asset_id) or 0
        unique_users = self.redis.scard(f"users:{asset_id}")
        return day * 1.0 + week * 0.3 + month * 0.1 + unique_users * 0.5

    def get_trending(self, limit: int = 10) -> list[str]:
        return self.redis.zrevrange("popularity:week", 0, limit - 1)
```

## Key Points

- Elasticsearch with custom analyzers for metadata search
- Boosts for name matches over description or column matches
- Faceted search with aggregations for filtering by type, domain, owner
- Suggest completions API for autocomplete in search bar
- Popularity scoring with recency weighting
- Track unique users per asset for engagement scoring
- Trending query returns most popular assets in the last week
- Fuzzy search handles typos in asset names and descriptions
- Column-level search enables finding tables by column name
- Synonym expansion improves recall for domain-specific terminology
