# Search Architecture

## System Architecture

```
┌──────────────┐     ┌─────────────┐     ┌─────────────────┐
│  Source of   │────►│  Indexing   │────►│  Search Cluster │
│  Truth (DB)  │     │  Pipeline   │     │  (ES/Meili/etc) │
└──────────────┘     └─────────────┘     └────────┬────────┘
                                                  │
                                          ┌───────▼───────┐
                                          │   API Gateway  │
                                          │   (search)     │
                                          └───────┬───────┘
                                                  │
                                          ┌───────▼───────┐
                                          │    Clients    │
                                          └───────────────┘
```

## Indexing Pipeline

```yaml
pipeline:
  cdc:
    source: "PostgreSQL WAL via Debezium"
    topic: "cdc.products.v1"
    consumer: "Index Updater Service"
    latency: "< 5 seconds"
    schema: "Avro with Schema Registry"

  bulk:
    trigger: "Scheduled (daily at 02:00 UTC)"
    process: "Full reindex from source"
    duration: "< 30 minutes for 10M documents"
    strategy: "Reindex to new index, swap alias"

  event:
    source: "Domain events (ProductUpdated, ProductDeleted)"
    consumer: "Index Updater Service"
    latency: "< 1 second"
```

## Index Design Patterns

### Single-Type Index

```json
{
  "index": "products-v3",
  "aliases": { "products-read": {}, "products-write": {} },
  "mappings": {
    "dynamic": "strict",
    "properties": {
      "id": { "type": "keyword" },
      "title": {
        "type": "text",
        "analyzer": "english",
        "fields": { "keyword": { "type": "keyword" }, "autocomplete": { "type": "search_as_you_type" } }
      },
      "description": { "type": "text", "analyzer": "english" },
      "category": { "type": "keyword" },
      "price": { "type": "float" },
      "inStock": { "type": "boolean" },
      "tags": { "type": "keyword" },
      "createdAt": { "type": "date" },
      "updatedAt": { "type": "date" }
    }
  }
}
```

### Multi-Type Index (Parent-Child)

```json
{
  "mappings": {
    "properties": {
      "join_field": {
        "type": "join",
        "relations": { "product": ["variant", "review"] }
      }
    }
  }
}
```

### Time-Based Index (Logs)

```yaml
# Daily indices for time-series data
index_pattern: "logs-api-{now/d}-000001"
rollover: "max_age: 1d OR max_size: 50GB"
alias: "logs-api-write"
```

## Query Architecture

```typescript
class SearchService {
  constructor(private client: ElasticsearchClient) {}

  async searchProducts(query: SearchQuery): Promise<SearchResult<Product>> {
    const must: any[] = [];
    const filter: any[] = [];

    // Full-text search with field boosting
    if (query.q) {
      must.push({
        multi_match: {
          query: query.q,
          fields: ['title^3', 'description^2', 'category^1.5', 'tags'],
          type: 'best_fields',
          fuzziness: 'AUTO',
          minimum_should_match: '75%',
        },
      });
    }

    // Filters
    if (query.category) filter.push({ term: { category: query.category } });
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.push({
        range: {
          price: {
            ...(query.minPrice !== undefined && { gte: query.minPrice }),
            ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
          },
        },
      });
    }
    if (query.inStock !== undefined) filter.push({ term: { inStock: query.inStock } });

    // Aggregations for faceted navigation
    const aggs: Record<string, any> = {
      categories: { terms: { field: 'category', size: 20 } },
      price_ranges: {
        range: {
          field: 'price',
          ranges: [
            { to: 25 }, { from: 25, to: 50 }, { from: 50, to: 100 }, { from: 100 },
          ],
        },
      },
    };

    const result = await this.client.search({
      index: 'products-read',
      query: { bool: { must, filter } },
      aggs,
      from: (query.page - 1) * query.limit,
      size: query.limit,
      sort: query.sort ? [{ [query.sort.field]: { order: query.sort.order } }] : ['_score'],
    });

    return this.formatResult(result, query);
  }
}
```

## Faceted Search

```typescript
interface FacetResult {
  categories: Array<{ key: string; count: number }>;
  priceRanges: Array<{ key: string; from?: number; to?: number; count: number }>;
}

async function getFacets(query: SearchQuery): Promise<FacetResult> {
  const result = await client.search({
    index: 'products-read',
    query: { bool: { filter: buildFilters(query) } },
    aggs: {
      categories: { terms: { field: 'category', size: 20 } },
      price_ranges: {
        range: {
          field: 'price',
          ranges: [{ to: 25 }, { from: 25, to: 50 }, { from: 50, to: 100 }, { from: 100 }],
        },
      },
    },
    size: 0, // Only aggregations, no hits
  });

  return {
    categories: result.aggregations.categories.buckets.map(b => ({
      key: b.key, count: b.doc_count,
    })),
    priceRanges: result.aggregations.price_ranges.buckets.map(b => ({
      key: b.key, from: b.from, to: b.to, count: b.doc_count,
    })),
  };
}
```

## Autocomplete

```json
{
  "settings": {
    "analysis": {
      "analyzer": {
        "autocomplete": {
          "tokenizer": "edge_ngram",
          "filter": ["lowercase"]
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
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "autocomplete",
        "search_analyzer": "standard"
      },
      "title_suggest": {
        "type": "completion",
        "analyzer": "simple"
      }
    }
  }
}
```

```typescript
// Autocomplete query using completion suggester
async function autocomplete(query: string): Promise<string[]> {
  const result = await client.search({
    index: 'products-read',
    suggest: {
      title_suggest: {
        prefix: query,
        completion: { field: 'title_suggest', size: 10, skip_duplicates: true },
      },
    },
  });

  return result.suggest.title_suggest[0].options.map(o => o.text);
}
```

## Geo-Spatial Search

```json
{
  "mappings": {
    "properties": {
      "location": { "type": "geo_point" },
      "name": { "type": "text" }
    }
  }
}
```

```typescript
async function searchNearby(lat: number, lon: number, radius: string): Promise<SearchResult> {
  const result = await client.search({
    query: {
      bool: {
        filter: {
          geo_distance: {
            distance: radius,   // "10km", "50mi"
            location: { lat, lon },
          },
        },
      },
    },
  });
  return result;
}
```

## Architecture Decision Record

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Search engine | Elasticsearch, Meilisearch, Algolia | Elasticsearch | Complex faceted search, custom scoring needed |
| Indexing strategy | CDC, bulk, event | CDC + bulk backup | Real-time updates, periodic full rebuild |
| Index aliases | Per-index alias, shared alias | Write + read aliases | Zero-downtime reindex, clear separation |
| Shard strategy | Fixed count, auto-expand | Fixed (3 primary, 2 replicas) | Predictable performance, simpler operations |
| Mappings | Dynamic, strict | Strict | Prevent schema drift, explicit control |
