# Search Optimization and Performance

## Query Optimization

### Performance Tuning
```typescript
class SearchOptimizer {
  optimizeQuery(query: any): any {
    // Limit number of clauses to prevent deep pagination
    if (query.from > 10000) {
      throw new Error('Deep pagination not supported. Use search_after instead.');
    }

    // Add filter context for non-scoring conditions
    if (query.bool?.must) {
      const nonScoring = query.bool.must.filter(
        clause => clause.term || clause.terms || clause.range
      );
      const scoring = query.bool.must.filter(
        clause => clause.match || clause.multi_match || clause.match_phrase
      );

      if (nonScoring.length > 0) {
        query.bool.filter = [...(query.bool.filter || []), ...nonScoring];
        query.bool.must = scoring;
      }
    }

    return query;
  }

  suggestIndex(index: string, query: any): string[] {
    const suggestions: string[] = [];

    // Check if index has proper analyzers
    if (query.match_phrase) {
      suggestions.push('Consider indexing with ngram analyzer for partial matching');
    }

    return suggestions;
  }
}
```

## Faceted Search

### Aggregation Building
```typescript
class FacetedSearch {
  buildAggregations(fields: FacetField[]): Record<string, any> {
    const aggs: Record<string, any> = {};

    for (const field of fields) {
      switch (field.type) {
        case 'terms':
          aggs[field.name] = {
            terms: {
              field: field.name,
              size: field.size || 10,
              order: { _count: 'desc' },
            },
          };
          break;
        case 'range':
          aggs[field.name] = {
            range: {
              field: field.name,
              ranges: field.ranges,
            },
          };
          break;
        case 'date_histogram':
          aggs[field.name] = {
            date_histogram: {
              field: field.name,
              interval: field.interval || 'day',
              format: 'yyyy-MM-dd',
            },
          };
          break;
        case 'stats':
          aggs[field.name] = {
            stats: { field: field.name },
          };
          break;
      }
    }

    return aggs;
  }
}
```

## Key Points
- Avoid deep pagination beyond 10000 hits, use search_after instead
- Separate scoring queries (match) from non-scoring filters (term, range)
- Use filter context for exact matches to improve performance
- Implement faceted search with aggregations for drill-down navigation
- Use index templates for consistent index configurations
- Monitor query latency and optimize slow queries with explain API
- Use query profiling to identify performance bottlenecks
- Implement result deduplication for consistent pagination
- Cache frequent queries at the application level
- Use scroll API for large result set processing
