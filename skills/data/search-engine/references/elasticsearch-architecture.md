# Elasticsearch Architecture

## Node Roles

```yaml
# Master (3, odd count)
node.roles: [master]
# Data hot (fast SSDs)
node.roles: [data_hot]
# Data warm (standard SSDs)
node.roles: [data_warm]
# Data cold (cheap storage)
node.roles: [data_cold]
# Ingest (preprocessing)
node.roles: [ingest]
# Coordinating (query routing)
node.roles: []
```

### Production Cluster
```yaml
discovery.seed_hosts: [master1:9300, master2:9300, master3:9300]
cluster.initial_master_nodes: [master1, master2, master3]
```

## Shards and Replicas

```json
// Target shard size: 10-50 GB. Max shards: 20 per GB heap.
PUT /products
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  }
}

// Shard allocation awareness
cluster.routing.allocation.awareness.attributes: zone
cluster.routing.allocation.awareness.force.zone.values: [us-east-1a, us-east-1b]
```

## Mapping

```json
{
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "title": { "type": "text", "analyzer": "english", "fields": { "keyword": { "type": "keyword" } } },
      "category": { "type": "keyword" },
      "price": { "type": "double" },
      "created_at": { "type": "date", "format": "yyyy-MM-dd'T'HH:mm:ss" },
      "location": { "type": "geo_point" },
      "tags": { "type": "keyword" },
      "reviews": { "type": "nested", "properties": {
        "user": { "type": "keyword" },
        "rating": { "type": "byte" },
        "text": { "type": "text", "analyzer": "english" }
      }}
    }
  }
}
```

### Dynamic Templates
```json
{
  "dynamic_templates": [
    { "strings_as_keyword": { "match_mapping_type": "string", "mapping": { "type": "keyword" } } },
    { "flattened_metadata": { "path_match": "metadata.*", "mapping": { "type": "flattened" } } }
  ]
}
```

### Field Type Reference
| ES Type | Use Case |
|---------|----------|
| `text` | Full-text, analyzed |
| `keyword` | Exact match, sorts, aggregations |
| `nested` | Independent array of objects |
| `flattened` | Semi-structured metadata |
| `geo_point` | Location search |

## Analysis

```json
{
  "settings": { "analysis": {
    "filter": {
      "english_stop": { "type": "stop", "stopwords": "_english_" },
      "english_stemmer": { "type": "stemmer", "language": "english" }
    },
    "analyzer": {
      "search_analyzer": {
        "tokenizer": "standard",
        "filter": ["lowercase", "english_stop", "english_stemmer"]
      }
    },
    "normalizer": {
      "lowercase_normalizer": { "type": "custom", "filter": ["lowercase", "asciifolding"] }
    }
  }}
}
```

## Indexing

```json
POST /_bulk
{ "index": { "_index": "products", "_id": "1" } }
{ "name": "Widget", "price": 29.99, "category": "electronics" }
{ "index": { "_index": "products", "_id": "2" } }
{ "name": "Gadget", "price": 49.99, "category": "electronics" }
```

### Indexing Settings Tuning
```json
{
  "settings": {
    "index": {
      "refresh_interval": "30s",
      "number_of_replicas": 0,
      "translog.durability": "async",
      "translog.sync_interval": "5s",
      "sort.field": "created_at",
      "sort.order": "desc"
    }
  }
}
```

## Cluster Management

```json
GET _cluster/health
GET _cat/nodes?v
GET _cat/shards?v
GET _cat/indices?v&s=store.size:desc
GET _nodes/hot_threads
```

## ILM (Index Lifecycle Management)

```json
{"policy": {"phases": {
  "hot": {"actions": {"rollover": {"max_primary_shard_size": "50gb", "max_age": "30d"}}},
  "warm": {"min_age": "30d", "actions": {"forcemerge": {"max_num_segments": 1}, "allocate": {"require": {"data_tier": "data_warm"}}}},
  "delete": {"min_age": "365d", "actions": {"delete": {}}}
}}}
```

## References
- Elasticsearch ref: https://www.elastic.co/guide/en/elasticsearch/reference/current/
- ILM docs: https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html
