# Search Engines Reference

## Engine Comparison Matrix

| Feature | Elasticsearch | Meilisearch | Algolia | Typesense | OpenSearch |
|---------|---------------|-------------|---------|-----------|------------|
| Search as you type | Via edge-ngram | Built-in | Built-in | Built-in | Via edge-ngram |
| Typo tolerance | Custom | Built-in | Built-in | Built-in | Custom |
| Faceted search | Aggregations | Built-in | Built-in | Built-in | Aggregations |
| Geo-spatial | geo_shape, geo_point | Filter only | Built-in | geo_point | geo_shape, geo_point |
| Vector search | Dense/sparse | Via plugin | NeuralSearch | Built-in | k-NN |
| Custom scoring | Painless scripts | Limited | Ranking rules | Custom | Painless scripts |
| Index aliases | Yes | No | Yes | Yes | Yes |
| Synonyms | Custom filter | Built-in | Built-in | Built-in | Custom filter |
| Multi-language | Per-field analyzers | Auto-detection | Via config | Via config | Per-field analyzers |
| API | REST + clients | REST | REST | REST | REST + clients |
| Max document size | 100MB | 100MB | 10KB recommended | 50MB | 100MB |
| Pricing | Infrastructure | Open source | Per search op | Open source | Infrastructure |

## Elasticsearch Mapping Reference

```json
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 2,
    "refresh_interval": "30s",
    "analysis": {
      "analyzer": {
        "autocomplete": {
          "type": "custom",
          "tokenizer": "edge_ngram",
          "filter": ["lowercase"]
        },
        "english_custom": {
          "type": "standard",
          "stopwords": "_english_",
          "filter": ["lowercase", "porter_stem"]
        }
      },
      "tokenizer": {
        "edge_ngram": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 15
        }
      }
    }
  },
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "english_custom",
        "fields": {
          "keyword": { "type": "keyword" },
          "autocomplete": { "type": "text", "analyzer": "autocomplete" },
          "trigram": { "type": "text", "analyzer": "trigram" }
        }
      },
      "description": { "type": "text", "analyzer": "english_custom" },
      "price": { "type": "float", "doc_values": true },
      "category": { "type": "keyword", "doc_values": true },
      "tags": { "type": "keyword" },
      "createdAt": { "type": "date", "format": "strict_date_optional_time" },
      "updatedAt": { "type": "date" },
      "location": { "type": "geo_point" },
      "rating": { "type": "float" },
      "inStock": { "type": "boolean" },
      "reviews": {
        "type": "nested",
        "properties": {
          "userId": { "type": "keyword" },
          "score": { "type": "byte" },
          "comment": { "type": "text" },
          "createdAt": { "type": "date" }
        }
      },
      "metadata": { "enabled": false },
      "embeddings": { "type": "dense_vector", "dims": 384, "index": true, "similarity": "cosine" }
    }
  }
}
```

## Search Query DSL Patterns

```json
// Full-text search with boosting and filters
{
  "query": {
    "bool": {
      "must": [
        {
          "multi_match": {
            "query": "wireless bluetooth headphones",
            "fields": ["title^3", "description^2", "tags^1.5", "category^1"],
            "type": "most_fields",
            "fuzziness": "AUTO",
            "minimum_should_match": "75%"
          }
        }
      ],
      "filter": [
        { "term": { "category": "electronics" } },
        { "range": { "price": { "gte": 10, "lte": 500 } } },
        { "term": { "inStock": true } },
        { "geo_distance": { "distance": "50km", "location": { "lat": 40.73, "lon": -73.93 } } }
      ],
      "should": [
        { "term": { "tags": "wireless" } },
        { "range": { "rating": { "gte": 4.0 } } }
      ],
      "minimum_should_match": 1
    }
  }
}
```

```json
// Faceted aggregation for drill-down navigation
{
  "size": 0,
  "aggs": {
    "categories": {
      "terms": { "field": "category", "size": 20, "order": { "_count": "desc" } },
      "aggs": {
        "brands": {
          "terms": { "field": "brand", "size": 10 }
        },
        "price_range": {
          "range": {
            "field": "price",
            "ranges": [
              { "key": "Under $25", "to": 25 },
              { "key": "$25-$100", "from": 25, "to": 100 },
              { "key": "$100-$500", "from": 100, "to": 500 },
              { "key": "Over $500", "from": 500 }
            ]
          }
        },
        "avg_rating": { "avg": { "field": "rating" } }
      }
    }
  },
  "post_filter": {
    "term": { "category": "electronics" }
  }
}
```

```json
// Autocomplete — completion suggester
{
  "suggest": {
    "product_suggest": {
      "prefix": "wirel",
      "completion": {
        "field": "title.autocomplete",
        "size": 5,
        "skip_duplicates": true,
        "fuzzy": { "fuzziness": 1 }
      }
    }
  }
}
```

```typescript
// TypeScript client — search with faceted navigation
interface SearchParams {
  query: string;
  filters: Record<string, string[]>;
  page: number;
  pageSize: number;
  sort?: string;
  geo?: { lat: number; lon: number; radius: string };
}

async function searchProducts(params: SearchParams) {
  const must: object[] = [{ multi_match: { query: params.query, fields: ['title^3', 'description^2'] } }];
  const filter: object[] = [];

  for (const [field, values] of Object.entries(params.filters)) {
    if (values.length > 0) filter.push({ terms: { [field]: values } });
  }

  if (params.geo) {
    filter.push({ geo_distance: { distance: params.geo.radius, location: { lat: params.geo.lat, lon: params.geo.lon } } });
  }

  const response = await esClient.search({
    index: 'products-read',
    body: {
      query: { bool: { must, filter } },
      aggs: {
        categories: { terms: { field: 'category', size: 20 } },
        brands: { terms: { field: 'brand', size: 20 } },
        price_ranges: {
          range: { field: 'price', ranges: [{ to: 25 }, { from: 25, to: 100 }, { from: 100 }] }
        },
      },
      from: (params.page - 1) * params.pageSize,
      size: params.pageSize,
      sort: params.sort ? [{ [params.sort]: { order: 'desc' } }] : ['_score'],
    },
  });

  return response.body;
}
```

## Cluster Configuration

```yaml
elasticsearch_cluster:
  heap: "50% of RAM, max 31GB per node"
  thread_pools:
    search: { queue_size: 1000, threads: 13 }
    write:  { queue_size: 200, threads: 8 }
    analyze: { queue_size: 16, threads: 1 }
  circuit_breaker:
    request: 0.95  # 95% heap for request breaker
    fielddata: 0.75
    accounting: 0.95
  field_limit: 1000 # default, max 2000
  shard_limit: 1000 # max shards per node
  refresh_interval: "30s"
  translog:
    durability: "request"  # fsync on every write for data safety
    sync_interval: "5s"
  indices:
    breaks:
      total_limit: "70% of heap"
```

## Index Aliases for Zero-Downtime Reindex

```typescript
// Zero-downtime reindex workflow
async function reindexProducts() {
  const newIndexName = `products-v${Date.now()}`;

  // 1. Create new index with updated mappings
  await esClient.indices.create({ index: newIndexName, body: newMapping });

  // 2. Reindex data from source (database or old index)
  await esClient.reindex({
    body: {
      source: { index: 'products-v2' },
      dest: { index: newIndexName },
    },
    wait_for_completion: true,
  });

  // 3. Atomic alias swap
  await esClient.indices.updateAliases({
    body: {
      actions: [
        { remove: { index: 'products-v2', alias: 'products-write' } },
        { remove: { index: 'products-v2', alias: 'products-read' } },
        { add: { index: newIndexName, alias: 'products-write' } },
        { add: { index: newIndexName, alias: 'products-read' } },
      ],
    },
  });

  // 4. Delete old index
  await esClient.indices.delete({ index: 'products-v2' });
}
```

## Common Pitfalls

- **Too many shards**: Each shard has overhead (memory, threads). 20-40GB per shard is the sweet spot. Too many small shards degrade cluster performance.
- **Dynamic mapping in production**: Automatic field type detection creates mapping explosions. Always use explicit mapping with `dynamic: strict` in production.
- **No refresh interval tuning**: Default 1s refresh interval causes excessive segment merges during bulk indexing. Increase to 30-120s for writes, revert to 1s for reads.
- **Overly broad queries without filters**: Full-text search without filters returns millions of irrelevant results. Always apply filters (category, price range, in-stock) alongside full-text queries.
- **No circuit breaker**: Without circuit breakers, a single expensive query can OOM the entire node. Always configure heap circuit breakers.
- **Ignoring fielddata and doc_values**: Aggregations on `text` fields without `doc_values` cause massive memory usage. Use `keyword` type with `doc_values: true` for aggregatable fields.
