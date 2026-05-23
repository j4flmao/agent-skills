# Indexing Strategies and Relevance

## Indexing Strategy Comparison

| Strategy | Latency | Consistency | Complexity | Use Case |
|----------|---------|-------------|------------|----------|
| CDC (Change Data Capture) | Seconds | Near real-time | High | E-commerce catalogs, social feeds |
| Bulk batch | Hours | Eventual | Low | Nightly product index rebuild |
| Webhook/event-driven | Milliseconds | Near real-time | Medium | Content management systems |
| Dual-write (app writes to both) | Real-time | Strong (within transaction) | Medium | Read-your-writes requirement |
| Queue-based (app → queue → indexer) | Seconds- Minutes | At-least-once | Medium | High-throughput systems |

## CDC Indexing with Debezium

```yaml
# Debezium MySQL connector → Kafka → Search index
name: products-connector
config:
  connector.class: io.debezium.connector.mysql.MySqlConnector
  database.hostname: mysql
  database.port: 3306
  database.user: debezium
  database.password: ${DB_PASSWORD}
  database.server.name: products-db
  table.include.list: public.products, public.categories
  topic.prefix: cdc
  schema.history.internal.kafka.bootstrap.servers: kafka:9092
  schema.history.internal.kafka.topic: schema-changes.products
  transforms: unwrap
  transforms.unwrap.type: io.debezium.transforms.ExtractNewRecordState
  key.converter: org.apache.kafka.connect.json.JsonConverter
  value.converter: org.apache.kafka.connect.json.JsonConverter
```

```typescript
// Consumer that updates search index from CDC events
import { Kafka } from 'kafkajs';
import { Client } from '@elastic/elasticsearch';

const kafka = new Kafka({ clientId: 'search-indexer', brokers: ['kafka:9092'] });
const es = new Client({ node: 'http://elasticsearch:9200' });
const consumer = kafka.consumer({ groupId: 'search-indexer' });

await consumer.connect();
await consumer.subscribe({ topic: /cdc\.products-db\.public\.*/ });

await consumer.run({
  eachMessage: async ({ topic, message }) => {
    const event = JSON.parse(message.value!.toString());
    const { op, after, before, source } = event;

    switch (op) {
      case 'c': // Create
        await es.index({ index: 'products-write', id: after.id, body: transformProduct(after) });
        break;
      case 'u': // Update
        await es.update({ index: 'products-write', id: after.id, body: { doc: transformProduct(after) } });
        break;
      case 'd': // Delete
        await es.delete({ index: 'products-write', id: before.id });
        break;
      case 'r': // Snapshot (initial load)
        await es.index({ index: 'products-write', id: after.id, body: transformProduct(after) });
        break;
    }
  },
});
```

## Bulk Indexing Strategy

```typescript
// Bulk index from database to Elasticsearch
async function bulkIndexProducts(batchSize = 1000) {
  let lastId = 0;
  let indexed = 0;

  while (true) {
    const products = await db.query(
      'SELECT * FROM products WHERE id > $1 ORDER BY id LIMIT $2',
      [lastId, batchSize]
    );

    if (products.rows.length === 0) break;

    const body = products.rows.flatMap(product => [
      { index: { _index: 'products-write', _id: product.id.toString() } },
      transformProduct(product),
    ]);

    const response = await es.bulk({ body, refresh: false });
    if (response.errors) {
      const errorItems = response.items.filter(i => i.index?.error);
      console.error('Bulk indexing errors:', errorItems);
    }

    lastId = products.rows[products.rows.length - 1].id;
    indexed += products.rows.length;
    console.log(`Indexed ${indexed} products`);
  }
}
```

## BM25 Relevance Tuning

```json
// BM25 similarity configuration
{
  "settings": {
    "index": {
      "similarity": {
        "default": {
          "type": "BM25",
          "k1": 1.2,
          "b": 0.75
        },
        "short_text": {
          "type": "BM25",
          "k1": 0.5,    // Lower k1 for short text (titles)
          "b": 0.3       // Lower b to reduce length penalty
        },
        "long_text": {
          "type": "BM25",
          "k1": 2.0,    // Higher k1 for long text (descriptions)
          "b": 0.9       // Higher b to penalize document length
        }
      }
    }
  }
}
```

| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| `k1` | 1.2 | 0-3 | Controls term frequency saturation. Higher = more impact of repeated terms. Lower = diminishing returns for frequent terms. |
| `b` | 0.75 | 0-1 | Controls length normalization. Higher = longer documents penalized more. Lower = length less important. |
| `b = 0` | — | — | No length normalization. Longer docs not penalized. Use for short, uniform fields. |
| `k1 = 0` | — | — | Binary scoring (TF doesn't matter, only presence). Rarely useful. |

## Function Scoring Examples

```json
// Recency boost — newer documents score higher
{
  "function_score": {
    "query": { "multi_match": { "query": "laptop", "fields": ["title^3", "description"] } },
    "functions": [
      {
        "gauss": {
          "createdAt": {
            "origin": "now",
            "scale": "30d",
            "decay": 0.5
          }
        }
      }
    ],
    "score_mode": "multiply",
    "boost_mode": "multiply"
  }
}
```

```json
// Popularity boost — higher rating products rank higher
{
  "function_score": {
    "query": { "match": { "title": "headphones" } },
    "functions": [
      {
        "field_value_factor": {
          "field": "rating",
          "factor": 0.5,
          "modifier": "log1p",
          "missing": 0.1
        }
      },
      {
        "filter": { "term": { "inStock": true } },
        "weight": 2.0
      }
    ],
    "score_mode": "sum",
    "boost_mode": "multiply",
    "max_boost": 20.0
  }
}
```

## Synonym Configuration

```json
// Elasticsearch synonym filter
{
  "settings": {
    "analysis": {
      "filter": {
        "product_synonyms": {
          "type": "synonym",
          "synonyms": [
            "laptop, notebook, ultrabook",
            "mobile, phone, smartphone, cellphone",
            "tv, television, telly",
            "sneakers, trainers, athletic shoes",
            "sofa, couch, settee",
            "fridge, refrigerator, freezer",
            "eyeglasses, spectacles, glasses",
            " => soda, pop, cola"  // => means "mapped to" (only right side indexed)
          ]
        }
      }
    }
  }
}
```

## Multi-Language Search

```json
// Multi-language field mapping
{
  "mappings": {
    "properties": {
      "title": {
        "properties": {
          "en": { "type": "text", "analyzer": "english" },
          "vi": { "type": "text", "analyzer": "vietnamese" },
          "zh": { "type": "text", "analyzer": "chinese" },
          "default": { "type": "text", "analyzer": "standard" }
        }
      }
    }
  }
}
```

```typescript
// Query the user's language field
async function searchMultiLang(query: string, userLocale: string) {
  const langField = getLanguageField(userLocale);
  const response = await esClient.search({
    index: 'products-read',
    body: {
      query: {
        multi_match: {
          query,
          fields: [`title.${langField}^3`, `description.${langField}^2`, 'title.default', 'description.default'],
        },
      },
    },
  });
  return response.body;
}
```

## Resource Limits and Monitoring

```yaml
monitoring:
  metrics:
    - query_latency_p50
    - query_latency_p95
    - query_latency_p99
    - indexing_rate_per_second
    - merge_rate_per_second
    - gc_pauses_duration
    - heap_usage_percentage
    - circuit_breaker_triggered_count
    - shard_count_per_node
    - segment_count_per_shard
  alerts:
    - query_p99 > 2000ms: "Search latency degradation"
    - heap > 85%: "OOM risk — reduce shard count or add nodes"
    - circuit_breaker_triggered > 1: "Expensive queries rejected"
    - total_shards > node_count * 20: "Shard imbalance"
```

## Common Pitfalls

- **Not tuning BM25**: Default BM25 parameters work for general English text but are suboptimal for short titles, product names, or technical documents. Always tune on a relevance judgment set.
- **Ignoring stop words**: Unicode and language-specific stop words vary. English stop words don't work for Vietnamese or Chinese. Configure language-specific analyzers.
- **Same boost for all fields**: Title matches should be more important than body matches. Use field boosting with appropriate multipliers (title^5, description^2) — not all equally.
- **No synonym expansion**: Users searching for "sneakers" won't find "trainers" without synonyms. Maintain a content-managed synonym list.
- **Reindexing without aliases**: Direct index replacement causes downtime. Always use write/read aliases for zero-downtime reindex operations.
- **Searching primary database instead of search index**: Using PostgreSQL `ILIKE` or MongoDB `$text` on the primary database for search queries degrades OLTP performance. Always maintain a separate search index.
- **No relevance evaluation**: Ranking changes without metrics (NDCG, MAP) are guesswork. Maintain a relevance judgment set and evaluate ranking changes before deploying.
