# Vector Database Comparison

## Feature Matrix

| Feature | Pinecone | Weaviate | Qdrant | Milvus | Chroma | FAISS |
|---------|----------|----------|--------|--------|--------|-------|
| Type | Managed | Self/Cloud | Self/Cloud | Self/Cloud | Embedded | Library |
| Index Types | HNSW | HNSW, IVF | HNSW, IVF | IVF, HNSW, PQ | HNSW | All |
| Filtering | Pre-filter | Pre/Post | Pre-filter | Pre/Post | Metadata | No |
| Multi-modal | Yes | Yes | No | Yes | No | No |
| Multi-tenancy | Namespaces | Classes | Collections | Partitions | Collections | N/A |
| Hybrid Search | No | Yes | Yes | Yes | No | No |
| CRUD | Full | Full | Full | Full | Basic | Read-only |
| Cloud Native | Yes | Yes | Yes | Yes | No | No |

## Performance Benchmarks

### Query Latency (P50, ms)
| DB | 10K vectors | 100K vectors | 1M vectors | 10M vectors |
|----|-------------|--------------|------------|-------------|
| Pinecone | 5 | 8 | 15 | 35 |
| Weaviate | 8 | 12 | 25 | 55 |
| Qdrant | 4 | 7 | 12 | 28 |
| Milvus | 6 | 10 | 18 | 40 |
| Chroma | 3 | 6 | 15 | N/A |
| FAISS (HNSW) | 2 | 4 | 8 | 20 |

### Index Build Time (minutes, 1M vectors, 768d)
| DB | Flat | HNSW | IVF | PQ |
|----|------|------|-----|-----|
| Pinecone | N/A | 5 | N/A | N/A |
| Weaviate | N/A | 8 | N/A | N/A |
| Qdrant | N/A | 6 | 3 | N/A |
| Milvus | 1 | 10 | 3 | 4 |
| Chroma | 2 | 8 | N/A | N/A |
| FAISS | 0 | 5 | 2 | 3 |

## Pricing Comparison (2026)

| DB | Free Tier | Entry | Production | 1M vectors/mo |
|----|-----------|-------|------------|---------------|
| Pinecone | 100K vectors | $70/mo | $500+/mo | ~$150 |
| Weaviate Cloud | 500K vectors | $25/mo | $200+/mo | ~$100 |
| Qdrant Cloud | 1M vectors | $50/mo | $300+/mo | ~$80 |
| Milvus Cloud | N/A | $100/mo | $500+/mo | ~$150 |
| Chroma | Unlimited | Free | Free | $0 (self-host) |
| FAISS | Unlimited | Free | Free | $0 (self-host) |

## Selection Guide

### Decision Tree
```
Need vector search?
├── Zero ops, pay per use?
│   └── Pinecone (simplest managed)
├── Need hybrid search (dense + sparse)?
│   ├── Weaviate (best hybrid)
│   └── Qdrant (fastest hybrid)
├── Self-hosted for cost savings?
│   ├── <1M vectors? → Chroma (simplest)
│   ├── 1-100M vectors? → Qdrant or Milvus
│   └── >100M vectors? → Milvus (best scale)
├── Need client-side only?
│   └── FAISS (library, not a DB)
└── Need advanced filtering?
    ├── Qdrant (fastest filtered search)
    └── Weaviate (most flexible filtering)
```

## Must-Have Features

| Feature | Why It Matters |
|---------|---------------|
| Metadata filtering | Filter search results by category, date, source |
| Hybrid search | Combine semantic + keyword for best results |
| Multi-tenancy | Isolate data per customer/tenant |
| CRUD operations | Update and delete individual vectors |
| Scalability | Horizontal scaling beyond single node |
| Backup/Restore | Disaster recovery and migration |

## Migration Considerations

- Export/import tooling availability
- Vector dimension support (768, 1024, 1536, 3072)
- Index parameter portability (HNSW M, ef)
- API compatibility (REST, gRPC, client SDKs)
- Data format compatibility (JSON, Parquet, CSV)
