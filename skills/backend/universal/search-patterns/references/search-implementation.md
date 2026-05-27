# Search Implementation Patterns

## Search Engine Integration

### Elasticsearch Client
```typescript
import { Client } from '@elastic/elasticsearch';

class SearchService {
  private client: Client;

  constructor(private indexPrefix: string) {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL,
      auth: {
        apiKey: process.env.ELASTICSEARCH_API_KEY,
      },
      maxRetries: 3,
      requestTimeout: 30000,
    });
  }

  async indexDocument(index: string, document: any): Promise<void> {
    await this.client.index({
      index: `${this.indexPrefix}_${index}`,
      id: document.id,
      body: document,
      refresh: 'wait_for',
    });
  }

  async bulkIndex(index: string, documents: any[]): Promise<void> {
    const body = documents.flatMap(doc => [
      { index: { _index: `${this.indexPrefix}_${index}`, _id: doc.id } },
      doc,
    ]);

    const response = await this.client.bulk({ body, refresh: 'wait_for' });

    if (response.errors) {
      const errored = response.items.filter(i => i.index?.error);
      console.error('Bulk index errors:', errored);
    }
  }

  async search(
    index: string,
    query: SearchQuery
  ): Promise<SearchResult> {
    const response = await this.client.search({
      index: `${this.indexPrefix}_${index}`,
      body: {
        query: this.buildQuery(query),
        from: query.from || 0,
        size: query.size || 20,
        sort: query.sort || [{ _score: 'desc' }],
        aggs: query.aggregations,
        highlight: query.highlight ? {
          fields: query.highlight.fields.reduce((acc, field) => {
            acc[field] = { number_of_fragments: 3 };
            return acc;
          }, {}),
        } : undefined,
      },
    });

    return {
      total: response.hits.total.value,
      hits: response.hits.hits.map(hit => ({
        id: hit._id,
        score: hit._score,
        source: hit._source,
        highlights: hit.highlight,
      })),
      aggregations: response.aggregations,
    };
  }

  private buildQuery(query: SearchQuery): any {
    const must: any[] = [];
    const filter: any[] = [];

    if (query.searchTerm) {
      must.push({
        multi_match: {
          query: query.searchTerm,
          fields: query.searchFields || ['*'],
          fuzziness: 'AUTO',
          operator: 'and',
        },
      });
    }

    if (query.filters) {
      for (const [field, value] of Object.entries(query.filters)) {
        filter.push({ term: { [field]: value } });
      }
    }

    if (query.rangeFilters) {
      for (const { field, gte, lte } of query.rangeFilters) {
        filter.push({ range: { [field]: { gte, lte } } });
      }
    }

    return { bool: { must, filter } };
  }
}
```

## Index Management

### Index Lifecycle
```typescript
class IndexManager {
  async createIndex(index: string, mappings: any, settings?: any): Promise<void> {
    const exists = await this.client.indices.exists({ index });

    if (!exists) {
      await this.client.indices.create({
        index,
        body: {
          settings: {
            number_of_shards: settings?.shards || 3,
            number_of_replicas: settings?.replicas || 2,
            refresh_interval: settings?.refreshInterval || '30s',
            analysis: settings?.analysis,
            ...settings,
          },
          mappings: {
            dynamic: mappings.dynamic || 'strict',
            properties: mappings.properties,
          },
        },
      });
    }
  }

  async updateMapping(index: string, properties: Record<string, any>): Promise<void> {
    await this.client.indices.putMapping({
      index,
      body: { properties },
    });
  }

  async reindex(sourceIndex: string, targetIndex: string): Promise<void> {
    await this.client.reindex({
      body: {
        source: { index: sourceIndex },
        dest: { index: targetIndex },
      },
      wait_for_completion: false,
    });
  }

  async deleteIndex(index: string): Promise<void> {
    await this.client.indices.delete({ index });
  }
}
```

## Full-Text Search

### Query Building
```typescript
class FullTextSearch {
  buildSearchQuery(searchTerm: string, options: SearchOptions): any {
    const should: any[] = [];

    // Exact match boost
    if (options.boostExact) {
      should.push({
        match_phrase: {
          [options.field || 'content']: {
            query: searchTerm,
            boost: 3,
          },
        },
      });
    }

    // Partial match
    should.push({
      match: {
        [options.field || 'content']: {
          query: searchTerm,
          fuzziness: 'AUTO',
          operator: 'or',
          minimum_should_match: '70%',
          boost: 2,
        },
      },
    });

    // Wildcard search
    if (options.allowWildcard && searchTerm.includes('*')) {
      should.push({
        wildcard: {
          [options.field || 'content']: {
            value: searchTerm,
            boost: 1,
          },
        },
      });
    }

    return {
      bool: {
        should,
        minimum_should_match: 1,
      },
    };
  }
}
```

## Key Points
- Use Elasticsearch or OpenSearch for full-text search capabilities
- Design search indices with proper mappings and analyzers
- Implement fuzzy search for typo tolerance
- Use multi-match queries across multiple search fields
- Support faceted search with aggregations for filtering
- Implement highlighting for search result snippets
- Use search-as-you-type with completion suggesters
- Index documents asynchronously for performance
- Handle index lifecycle: creation, reindexing, deletion
- Monitor search performance with query latency tracking
