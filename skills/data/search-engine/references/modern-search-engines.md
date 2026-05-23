# Modern Search Engines — Meilisearch and Typesense

## Meilisearch

### Architecture
Meilisearch is built in Rust with the **milli** core library and LMDB (Lightning Memory-Mapped Database) for persistent key-value storage. It is single-node only — no native clustering. For HA, run a secondary instance with data replication.

### Indexing
```json
// Create index with custom settings
{
  "uid": "products",
  "primaryKey": "id",
  "searchableAttributes": ["title", "description", "brand"],
  "filterableAttributes": ["category", "price", "brand"],
  "sortableAttributes": ["price", "created_at"],
  "rankingRules": ["words", "typo", "proximity", "attribute", "sort", "exactness"],
  "stopWords": ["the", "a", "an", "of", "in"],
  "synonyms": {
    "laptop": ["notebook", "ultrabook"],
    "phone": ["smartphone", "mobile"],
    "shoes": ["sneakers", "footwear"]
  },
  "typoTolerance": {
    "enabled": true,
    "minWordSizeForTypos": { "oneTypo": 4, "twoTypos": 8 }
  }
}
```

### Search API
```json
// Search with filters and sort
GET /indexes/products/search?q=wireless headphones&filter=price < 200 AND category = Electronics&sort=price:asc

// Response
{
  "hits": [
    {
      "id": 1,
      "title": "Wireless Headphones Pro",
      "brand": "AudioMax",
      "price": 149.99,
      "category": "Electronics",
      "_formatted": { "title": "<em>Wireless</em> <em>Headphones</em> Pro" }
    }
  ],
  "query": "wireless headphones",
  "processingTimeMs": 4,
  "hitsPerPage": 20,
  "page": 1,
  "totalPages": 1,
  "totalHits": 8
}
```

## Typesense

### Architecture
Typesense is built in C++ and uses a REST-based architecture with:
- **Single leader + N replicas** for HA
- **Raft consensus** for configuration changes
- **Embedded storage engine** (no external dependency like ZooKeeper)
- **On-disk index with mmap** for efficient memory usage

### Schema with Vector Search
```json
// Schema with float[] field for embedding-based search
{
  "name": "products",
  "num_documents": 0,
  "fields": [
    {"name": "title", "type": "string"},
    {"name": "description", "type": "string"},
    {"name": "brand", "type": "string", "facet": true},
    {"name": "price", "type": "float", "sort": true, "facet": true},
    {"name": "category", "type": "string", "facet": true},
    {"name": "in_stock", "type": "bool", "facet": true},
    {"name": "embedding", "type": "float[]", "num_dim": 384},
    {"name": "created_at", "type": "int64"}
  ],
  "default_sorting_field": "price"
}
```

### Hybrid Search (Full-Text + Vector)
```python
import typesense

client = typesense.Client({
    'nodes': [{'host': 'localhost', 'port': '8108', 'protocol': 'http'}],
    'api_key': 'xyz',
    'connection_timeout_seconds': 5
})

# Hybrid search: combines text relevance + vector similarity
search_requests = {
    'searches': [{
        'collection': 'products',
        'q': 'wireless headphones',
        'query_by': 'title,description',
        'vector_query': 'embedding:([0.015, 0.023, ...])',  # 384-dim embedding from ML model
        'sort_by': '_text_match:desc,price:asc',
        'filter_by': 'in_stock:true && price:<= 200',
        'facet_by': 'category,brand',
        'per_page': 20
    }]
}

result = client.multi_search.perform(search_requests, {'query_by': 'title,description'})
```

### Curation Rules
```json
// Pin specific products to the top for certain queries
PUT /collections/products/override_rules
{
  "rule": { "query": "headphones", "match": "exact" },
  "curations": [
    { "object_id": "premium-headphones-123", "position": 0 },
    { "object_id": "wireless-headphones-456", "position": 1 }
  ]
}
```

## Comparison

| Feature | Meilisearch | Typesense | Elasticsearch |
|---------|-------------|-----------|---------------|
| Language | Rust | C++ | Java |
| Clustering | Single-node only | Leader + replicas | Multi-node distributed |
| Typo tolerance | Built-in, automatic | Built-in, configurable | Manual (fuzzy queries) |
| Vector search | No | Built-in (HNSW) | Built-in (HNSW, >= 8.0) |
| API format | REST (intuitive) | REST | REST (complex) |
| Indexing | Automatic | Schema-based | Explicit mapping |
| Multi-tenancy | API keys | Scoped API keys | Indices/RBAC |
| Max dataset | ~10M docs | ~TB scale | PB scale |
| Deployment | Single binary | Single binary | Multi-node cluster |
| Performance | Sub-50ms | Sub-50ms | 50-500ms |

## When to Choose

**Meilisearch**: Prototypes, MVPs, site search for small-medium catalogs, teams wanting zero-config search with instant typo tolerance.

**Typesense**: Ecommerce search requiring curation rules, apps needing hybrid text+vector search, teams wanting Elasticsearch-level features with simpler operations.

**Elasticsearch**: Petabyte-scale log analytics, complex aggregations, large distributed clusters, when existing ELK stack is already deployed.
