---
name: ai-vector-databases
description: >
  Use this skill when deploying or managing vector databases: index type selection (HNSW, IVF, DiskANN), distance metrics, sharding/replication, hybrid search, metadata filtering, ANN search.
  This skill enforces: index configuration documentation, distance metric justification, scaling plan specification, operations checklist.
  Do NOT use for: RAG pipeline design, embedding model selection, prompt engineering, general-purpose databases.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, vector-database, phase-10]
---

# Vector Database Agent

## Purpose
Designs vector database schemas with optimal index configuration, scaling strategy, and operational runbooks for production AI systems.

## Agent Protocol

### Trigger
User request includes: vector database, Pinecone, Chroma, Qdrant, Milvus, Weaviate, embedding index, ANN search, HNSW, IVF, DiskANN, distance metric, hybrid search, metadata filter.

### Protocol
1. Clarify vector dimension, dataset size, write/read ratio, and latency requirements.
2. Select index type based on recall-latency trade-off and dataset scale.
3. Configure distance metric aligned with embedding model training objective.
4. Design sharding and replication strategy for scale and availability.
5. Configure hybrid search if combining vector + metadata filtering.
6. Document operations checklist: backup, monitoring, scaling, migration.

## Output
Vector DB schema with index config, scaling plan, operations checklist.

### Response Format
```
## Vector Database Configuration
### Schema
Collection: {name} | Dimensions: {N}
Distance Metric: {cosine/euclidean/dot}
Metadata: {field:type, ...}

### Index
Type: {HNSW/IVF/DiskANN}
Parameters:
  HNSW: M={N}, efConstruction={N}, efSearch={N}
  IVF: nlist={N}, nprobe={N}
  DiskANN: beamwidth={N}, search_list_size={N}

### Scaling
Shards: {N} | Replicas: {N}
Partition Key: {field}
Nodes: {count × instance type}

### Hybrid Search
Filter Strategy: {post-filter / pre-filter}
Metadata Index: {fields with indexes}

### Operations
Backup: {frequency, method}
Monitoring: {metrics, alerts}
Scaling Trigger: {CPU > 80%, latency > P99 target}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Index type selected and parameters configured for dataset and recall target.
- [ ] Distance metric matches embedding model training criteria.
- [ ] Sharding strategy distributes data evenly across nodes.
- [ ] Replication factor ensures availability during node failure.
- [ ] Hybrid search configured with metadata index.
- [ ] Operational runbooks for backup, resize, and recovery documented.

## Workflow

### Step 1: Requirements Collection
Determine: vector dimension, number of vectors, inserts/second, queries/second, recall target (0.9-0.99), P99 latency target (ms), consistency model (eventual/strong).

### Step 2: Index Type Selection
- HNSW: best recall-speed trade-off for <10M vectors. M=16, efConstruction=200, efSearch=256.
- IVF: lower memory, good for >10M vectors. nlist=sqrt(N), nprobe=10-50.
- DiskANN: billion-scale, SSD-backed. Slower but fits very large datasets.
- Flat (brute-force): <10k vectors, 100% recall, no index overhead.

### Step 3: Distance Metric Selection
- Cosine: default for most text embeddings (normalized vectors). Range [0,2].
- Euclidean (L2): use when embedding model outputs unnormalized vectors.
- Dot product: use when embeddings trained with dot product loss (e.g., Cohere).
- Inner product: for normalized vectors, equivalent to cosine.

### Step 4: Sharding and Replication
- Shard by partition key (tenant ID, document category) for targeted queries.
- Aim for 1-10M vectors per shard for balanced performance.
- Replication factor of 2-3 for production (read availability + failover).
- Use consistent hashing for even data distribution across shards.

### Step 5: Hybrid Search Setup
- Post-filter: run ANN search, then filter by metadata. Good when metadata is selective.
- Pre-filter: apply metadata filter first, then search within filtered set. Required for high-selectivity filters.
- Index frequently filtered metadata fields (tenant_id, category, date_range, status).
- TiDB or Elasticsearch-style inverted index for text metadata.

### Step 6: Operations
- Backup: snapshot every 6h for production, test restoration monthly.
- Monitoring: QPS, P50/P99 latency, recall rate, memory usage, disk IO.
- Alert: recall < 0.9, latency > P99 target × 1.5, disk > 80%.
- Scaling: add nodes when CPU > 70% sustained or latency regresses.

## Rules
- HNSW for <10M vectors is optimal. Above 10M, consider IVF or DiskANN.
- Distance metric must match the embedding model's training loss function.
- Cosine is default for OpenAI, Cohere, and Sentence-Transformer embeddings.
- Never use post-filter if metadata filter removes >50% of candidates.
- Index metadata fields that appear in >10% of queries.
- Replication != backup — always have separate backup strategy.
- Test ANN recall on your data distribution, not synthetic.

## References
- `references/index-types.md` — Index Types
- `references/indexing-strategies.md` — Indexing Strategies
- `references/operations.md` — Operations
- `references/vector-db-comparison.md` — Vector Db Comparison

## Handoff
For embedding model selection before index creation, hand off to `ai-rag-patterns`. For ML infrastructure around vector DB, hand off to `ai-llm-ops`.
