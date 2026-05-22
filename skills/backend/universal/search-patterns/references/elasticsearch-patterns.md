# Elasticsearch Patterns

## Mapping
```json
{
  "mappings": {
    "properties": {
      "title": { "type": "text", "analyzer": "english", "fields": { "keyword": { "type": "keyword" } } },
      "description": { "type": "text", "analyzer": "english" },
      "price": { "type": "float" },
      "category": { "type": "keyword" },
      "tags": { "type": "keyword" },
      "createdAt": { "type": "date" },
      "location": { "type": "geo_point" },
      "metadata": { "enabled": false }
    }
  },
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 2,
    "refresh_interval": "30s"
  }
}
```

## Query DSL
```json
{
  "query": {
    "bool": {
      "must": [
        { "multi_match": { "query": "search term", "fields": ["title^3", "description^2", "content"] } }
      ],
      "filter": [
        { "term": { "category": "electronics" } },
        { "range": { "price": { "gte": 10, "lte": 1000 } } }
      ]
    }
  },
  "aggs": {
    "by_category": { "terms": { "field": "category", "size": 20 } }
  }
}
```

## Index Aliases
```json
POST /_aliases
{
  "actions": [
    { "remove": { "index": "products-v1", "alias": "products-write" } },
    { "remove": { "index": "products-v1", "alias": "products-read" } },
    { "add": { "index": "products-v2", "alias": "products-write" } },
    { "add": { "index": "products-v2", "alias": "products-read" } }
  ]
}
```

## Cluster Configuration
- Heap: 50% of RAM, max 31GB per node
- Thread pools: search=13, bulk=8, index=8
- Circuit breaker: 95% heap for request, 75% for fielddata
- Field limit: 1000 per index default, 2000 max
- Shard count: (source nodes * 2) min, (data nodes * 10) max
