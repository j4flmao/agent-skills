# Search Synonyms

Synonyms improve search recall by matching conceptually equivalent terms.

## Synonym Types

| Type | Description | Example |
|------|-------------|---------|
| Equivalent | Terms treated identically | `laptop, notebook, ultrabook` |
| Explicit | One-way mapping | `smartphone => phone, mobile` |
| One-to-many | Single term expands to many | `vehicle => car, truck, van, suv` |

## Elasticsearch Synonym Configuration

```json
{
  "settings": {
    "index": {
      "analysis": {
      "filter": {
          "product_synonyms": {
            "type": "synonym",
            "synonyms": [
              "laptop, notebook, ultrabook",
              "mobile, phone, smartphone",
              "tv, television",
              "sneaker, trainer, athletic_shoe"
            ]
          },
          "product_synonyms_solr": {
            "type": "synonym",
            "format": "solr",
            "synonyms": [
              "laptop, notebook, ultrabook",
              "mobile => phone, cellphone",
              "tv => television, telly"
            ]
          }
        },
        "analyzer": {
          "synonym_analyzer": {
            "tokenizer": "standard",
            "filter": ["lowercase", "product_synonyms"]
          }
        }
      }
    }
  }
}
```

## Managed Synonym File

For production, use an external file instead of inline definition:

```txt
# /etc/elasticsearch/synonyms/product.txt
laptop, notebook, ultrabook
mobile, phone, smartphone, cellphone
tv, television, telly
sneaker, trainer, athletic shoe
hoodie, sweatshirt, jumper
```

Update synonyms without reindexing:

```bash
curl -X PUT "localhost:9200/products/_settings" -H 'Content-Type: application/json' -d'
{
  "index.analysis.filter.product_synonyms.synonyms_path": "synonyms/product_v2.txt"
}
'
```

## Query-Time Synonyms

Apply synonyms only at query time, not indexing time:

```json
{
  "settings": {
    "index": {
      "analysis": {
        "filter": {
          "query_synonyms": {
            "type": "synonym_graph",
            "synonyms": ["baby, infant, newborn", "comfy, comfortable"],
            "updateable": true
          }
        }
      }
    }
  }
}
```

## Synonyms API

Manage synonyms through a content management system:

```typescript
class SynonymManager {
  private client: ElasticsearchClient;

  async addSynonymGroup(group: string[]): Promise<void> {
    await this.client.cluster.putSettings({
      persistent: {
        "index.analysis.filter.product_synonyms.synonyms": [
          ...this.currentSynonyms,
          group.join(", "),
        ],
      },
    });
  }

  async removeSynonymGroup(group: string[]): Promise<void> {
    const groupStr = group.join(", ");
    const updated = this.currentSynonyms.filter(s => s !== groupStr);
    await this.client.cluster.putSettings({
      persistent: {
        "index.analysis.filter.product_synonyms.synonyms": updated,
      },
    });
  }

  async searchWithSynonyms(query: string): Promise<SearchResult[]> {
    // Expand query with synonyms before searching
    const expanded = await this.expandQuery(query);
    return this.client.search({
      index: "products",
      query: {
        multi_match: {
          query: expanded,
          fields: ["title^3", "description"],
          type: "cross_fields",
        },
      },
    });
  }

  private async expandQuery(query: string): Promise<string> {
    const tokens = query.toLowerCase().split(/\s+/);
    const expanded: string[] = [];

    for (const token of tokens) {
      const synonyms = this.synonymIndex.get(token) ?? [];
      expanded.push(`(${token} ${synonyms.join(" ")})`);
    }

    return expanded.join(" ");
  }
}
```

## Synonym Best Practices

```yaml
Synonym rules:
  - Prefer equivalent groups (,) over explicit mappings (=>)
  - Use explicit mappings only when one direction is wrong
  - Store synonyms externally (file, DB, CMS) for non-developer editing
  - Test synonym changes with A/B search relevance evaluation
  - Avoid cyclic synonyms (A->B, B->A causes infinite expansion)
  - Use lowercase synonyms — case variants are handled by filter chain
  - Monitor synonym match rate to detect over-expansion
  - Re-index after major synonym changes for indexing-time synonyms
```

## Relevance Impact

Synonyms can affect precision. Monitor with relevance metrics:

```typescript
async function evaluateSynonymImpact(testQueries: TestQuery[]): Promise<SynonymReport> {
  const results = await Promise.all(
    testQueries.map(async (q) => {
      const before = await searchWithoutSynonyms(q.query);
      const after = await searchWithSynonyms(q.query);

      return {
        query: q.query,
        beforePrecision: computePrecision(before, q.relevantDocs),
        afterPrecision: computePrecision(after, q.relevantDocs),
        beforeRecall: computeRecall(before, q.relevantDocs),
        afterRecall: computeRecall(after, q.relevantDocs),
      };
    })
  );

  return {
    avgRecallImprovement: average(results.map(r => r.afterRecall - r.beforeRecall)),
    avgPrecisionChange: average(results.map(r => r.afterPrecision - r.beforePrecision)),
    queries: results,
  };
}
```

## Key Points
- Use equivalent synonym groups (`,`) for symmetric term relationships
- Use explicit mappings (`=>`) when one direction is incorrect
- Store synonyms externally for content-team editing
- Apply synonyms at query time for operational simplicity
- Updateable synonym filters allow changes without reindexing
- Monitor synonym impact on precision and recall
- Test synonym changes with A/B relevance evaluation
- Avoid cyclic definitions that cause infinite query expansion
