# Faceted Search Navigation

Faceted search lets users filter results along multiple dimensions simultaneously.

## Facet Types

| Type | Description | Example | Elasticsearch Type |
|------|-------------|---------|-------------------|
| Value | Exact match categories | Brand, Color, Size | `terms` aggregation |
| Range | Numeric or date ranges | Price $10-$50 | `range` aggregation |
| Hierarchical | Drill-down categories | Electronics > Laptops > Gaming | Nested `terms` with `missing` |
| Boolean | Yes/no filters | In Stock, On Sale | `filter` aggregation |
| Date | Time-based drill-down | Last 24h, Last 7d, Last 30d | `date_range` aggregation |

## Aggregation Queries

```json
{
  "size": 20,
  "query": {
    "bool": {
      "must": [{ "match": { "category": "electronics" } }],
      "filter": [
        { "term": { "inStock": true } },
        { "range": { "price": { "gte": 10, "lte": 500 } } }
      ]
    }
  },
  "aggs": {
    "brands": {
      "terms": { "field": "brand.keyword", "size": 20, "min_doc_count": 1 }
    },
    "price_ranges": {
      "range": {
        "field": "price",
        "ranges": [
          { "key": "Under $25", "to": 25 },
          { "key": "$25 - $50", "from": 25, "to": 50 },
          { "key": "$50 - $100", "from": 50, "to": 100 },
          { "key": "$100 - $200", "from": 100, "to": 200 },
          { "key": "Over $200", "from": 200 }
        ]
      }
    },
    "ratings": {
      "range": {
        "field": "rating",
        "ranges": [
          { "key": "4+ stars", "from": 4.0 },
          { "key": "3+ stars", "from": 3.0 },
          { "key": "2+ stars", "from": 2.0 }
        ]
      }
    },
    "in_stock_only": {
      "filter": { "term": { "inStock": true } }
    }
  }
}
```

## Dynamic Facet Generation

Generate facets dynamically based on data type:

```typescript
function generateFacets(mapping: IndexMapping): Facet[] {
  const facets: Facet[] = [];

  for (const [field, props] of Object.entries(mapping.properties)) {
    if (!props.facet) continue;

    switch (props.type) {
      case 'keyword':
        facets.push({
          field: `${field}.keyword`,
          type: 'terms',
          size: props.facetSize ?? 10,
          order: { _count: 'desc' },
        });
        break;

      case 'float':
      case 'integer':
        facets.push({
          field,
          type: 'range',
          ranges: calculateAutoRanges(props.min, props.max, 5),
        });
        break;

      case 'date':
        facets.push({
          field,
          type: 'date_range',
          ranges: [
            { key: 'Today', from: 'now-1d/d' },
            { key: 'This week', from: 'now-7d/d' },
            { key: 'This month', from: 'now-30d/d' },
          ],
        });
        break;
    }
  }

  return facets;
}
```

## Post-Filtering

Use post-filters to keep facet counts accurate when selecting a filter:

```json
{
  "query": { "bool": { "must": [{ "match_all": {} }] } },
  "aggs": {
    "brands": { "terms": { "field": "brand.keyword", "size": 20 } }
  },
  "post_filter": {
    "term": { "brand.keyword": "Nike" }
  }
}
```

The `post_filter` removes documents after aggregation calculation, so facet counts remain accurate for unfiltered data.

## Hierarchical Facets

Handle drill-down navigation:

```json
{
  "aggs": {
    "category": {
      "terms": { "field": "category_l1.keyword", "size": 20 },
      "aggs": {
        "sub_category": {
          "terms": { "field": "category_l2.keyword", "size": 20 }
        }
      }
    }
  }
}
```

## Performance Optimizations

```yaml
Facet performance rules:
  - Set explicit `size` on terms aggregations (default is 10)
  - Use `min_doc_count: 1` to exclude zero-count buckets
  - Cache frequent combos with `filter` aggregation
  - Use approximate counts via `shard_size` for high-cardinality fields
  - Limit depth of hierarchical aggregations (2-3 levels max)
  - Use `execution_hint: map` for low-cardinality fields (<100k unique values)
  - Avoid `global` aggregation for large indices — use filters instead
```

## Key Points
- Use `terms` aggregation for categorical facets
- Use `range` aggregation for numeric and price facets
- Use `post_filter` to keep facet counts accurate when selecting filters
- Pre-compute auto-ranges for numeric fields based on data distribution
- Limit hierarchical facets to 2-3 levels for performance
- Set `min_doc_count: 1` to hide empty facet buckets
- Cache facet-heavy queries with query caching (e.g., `request_cache: true`)
