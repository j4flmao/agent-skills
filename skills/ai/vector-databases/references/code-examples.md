# Code Examples for Vector Databases

## Setup and Connection

### Pinecone
```python
from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="pcsk_...")
pc.create_index(
    name="quickstart",
    dimension=768,
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-west-2"),
)
index = pc.Index("quickstart")
```

### Qdrant
```python
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance

client = QdrantClient(host="localhost", port=6333)
client.create_collection(
    collection_name="quickstart",
    vectors_config=VectorParams(size=768, distance=Distance.COSINE),
)
```

### Weaviate
```python
import weaviate

client = weaviate.Client("http://localhost:8080")
class_obj = {
    "class": "Document",
    "vectorizer": "none",  # provide your own vectors
    "properties": [
        {"name": "content", "dataType": ["text"]},
        {"name": "category", "dataType": ["string"]},
    ],
}
client.schema.create_class(class_obj)
```

### Milvus
```python
from pymilvus import connections, Collection, CollectionSchema, FieldSchema, DataType

connections.connect(host="localhost", port=19530)
schema = CollectionSchema([
    FieldSchema("id", DataType.INT64, is_primary=True),
    FieldSchema("embedding", DataType.FLOAT_VECTOR, dim=768),
    FieldSchema("category", DataType.VARCHAR, max_length=100),
])
collection = Collection("quickstart", schema)
collection.create_index("embedding", {"index_type": "HNSW", "metric_type": "COSINE", "params": {"M": 16, "efConstruction": 200}})
collection.load()
```

### pgvector
```python
import psycopg2
from pgvector.psycopg2 import register_vector

conn = psycopg2.connect(dbname="vectordb")
register_vector(conn)
cur = conn.cursor()
cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
cur.execute("""
    CREATE TABLE documents (
        id SERIAL PRIMARY KEY,
        content TEXT,
        category TEXT,
        embedding VECTOR(768)
    )
""")
conn.commit()
```

### Chroma
```python
import chromadb

client = chromadb.Client()
collection = client.create_collection(name="quickstart")
```

### FAISS
```python
import faiss
import numpy as np

dim = 768
index = faiss.IndexFlatIP(dim)  # inner product (cosine on normalized)
# Or HNSW:
index = faiss.IndexHNSWFlat(dim, 16)  # M=16
index.hnsw.efConstruction = 200
index.hnsw.efSearch = 256
```

## CRUD Operations

### Batch Insert

```python
# Pinecone
index.upsert(vectors=[
    ("id1", [0.1]*768, {"category": "docs", "source": "file1.pdf"}),
    ("id2", [0.2]*768, {"category": "code", "source": "src/main.py"}),
])

# Qdrant
from qdrant_client.models import PointStruct

client.upsert(
    collection_name="quickstart",
    points=[
        PointStruct(id=1, vector=[0.1]*768, payload={"category": "docs", "source": "file1.pdf"}),
        PointStruct(id=2, vector=[0.2]*768, payload={"category": "code", "source": "src/main.py"}),
    ],
)

# Weaviate
client.data_object.create(
    data_object={"content": "machine learning basics", "category": "docs"},
    vector=[0.1]*768,
    class_name="Document",
)

# Milvus
collection.insert([
    [1, 2],  # ids
    [[0.1]*768, [0.2]*768],  # vectors
    ["docs", "code"],  # category
])

# pgvector
cur.execute(
    "INSERT INTO documents (content, category, embedding) VALUES (%s, %s, %s)",
    ("machine learning", "docs", [0.1]*768),
)

# Chroma
collection.add(
    ids=["id1", "id2"],
    embeddings=[[0.1]*768, [0.2]*768],
    metadatas=[{"category": "docs"}, {"category": "code"}],
    documents=["machine learning", "python async"],
)
```

### Bulk Insert with Batching

```python
import itertools

def bulk_insert(client, vectors, batch_size=100):
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i+batch_size]
        client.upsert(vectors=batch)

# Or with async for Qdrant
import asyncio

async def bulk_insert_async(client, points, batch_size=100):
    tasks = []
    for i in range(0, len(points), batch_size):
        batch = points[i:i+batch_size]
        tasks.append(client.upsert(
            collection_name="quickstart",
            points=batch,
            wait=False,  # don't wait for indexing
        ))
    await asyncio.gather(*tasks)
```

### Update

```python
# Pinecone
index.update(id="id1", values=[0.3]*768, set_metadata={"category": "updated"})

# Qdrant
client.set_payload(
    collection_name="quickstart",
    payload={"category": "updated"},
    points=[1],
)

# Weaviate
client.data_object.update(
    data_object={"category": "updated"},
    class_name="Document",
    uuid="...",
)

# Milvus
collection.upsert([
    [1],  # id (same id → update)
    [[0.3]*768],
    ["updated"],
])

# pgvector
cur.execute(
    "UPDATE documents SET embedding = %s, category = %s WHERE id = %s",
    ([0.3]*768, "updated", 1),
)
```

### Delete

```python
# Pinecone
index.delete(ids=["id1", "id2"])
index.delete(filter={"category": {"$eq": "obsolete"}})
index.delete(delete_all=True)

# Qdrant
client.delete(
    collection_name="quickstart",
    points_selector=[1, 2],
)
client.delete(
    collection_name="quickstart",
    points_selector=Filter(must=[FieldCondition(key="category", match=MatchValue(value="obsolete"))]),
)

# Weaviate
client.data_object.delete_by_id(uuid="...", class_name="Document")

# Milvus
collection.delete("id in [1, 2]")

# pgvector
cur.execute("DELETE FROM documents WHERE id = %s", (1,))

# Chroma
collection.delete(ids=["id1"])
```

### Fetch by ID

```python
# Pinecone
result = index.fetch(ids=["id1"])
print(result["vectors"]["id1"])

# Qdrant
result = client.retrieve(
    collection_name="quickstart",
    ids=[1],
    with_payload=True,
    with_vectors=True,
)

# Weaviate
result = client.data_object.get_by_id(uuid="...", class_name="Document")

# Milvus
result = collection.query(expr="id == 1")

# pgvector
cur.execute("SELECT * FROM documents WHERE id = %s", (1,))

# Chroma
result = collection.get(ids=["id1"])
```

## Similarity Search

### Basic ANN Search

```python
# Pinecone
results = index.query(
    vector=[0.15]*768,
    top_k=10,
    include_metadata=True,
)
for match in results["matches"]:
    print(match["id"], match["score"], match["metadata"])

# Qdrant
results = client.search(
    collection_name="quickstart",
    query_vector=[0.15]*768,
    limit=10,
)
for point in results:
    print(point.id, point.score, point.payload)

# Weaviate
results = client.query.get("Document", ["content", "category"])\
    .with_near_vector({"vector": [0.15]*768})\
    .with_limit(10)\
    .with_additional(["distance"])\
    .do()

# Milvus
results = collection.search(
    data=[[0.15]*768],
    anns_field="embedding",
    param={"metric_type": "COSINE", "params": {"ef": 256}},
    limit=10,
)
for hits in results:
    for hit in hits:
        print(hit.id, hit.score)

# pgvector
cur.execute(
    "SELECT id, content, category, embedding <=> %s::vector AS distance FROM documents ORDER BY distance LIMIT 10",
    ([0.15]*768,),
)

# Chroma
results = collection.query(
    query_embeddings=[[0.15]*768],
    n_results=10,
)

# FAISS
D, I = index.search(np.array([[0.15]*768], dtype=np.float32), k=10)
print(I, D)  # indices, distances
```

### Filtered Search

```python
# Pinecone
results = index.query(
    vector=[0.15]*768,
    top_k=10,
    filter={"category": {"$eq": "docs"}, "source": {"$eq": "file1.pdf"}},
    include_metadata=True,
)

# Qdrant
from qdrant_client.models import Filter, FieldCondition, MatchValue, Range

results = client.search(
    collection_name="quickstart",
    query_vector=[0.15]*768,
    query_filter=Filter(
        must=[
            FieldCondition(key="category", match=MatchValue(value="docs")),
            FieldCondition(key="price", range=Range(gte=100, lte=500)),
        ],
    ),
    limit=10,
)

# Weaviate
results = client.query.get("Document", ["content", "price"])\
    .with_near_vector({"vector": [0.15]*768})\
    .with_where({
        "operator": "And",
        "operands": [
            {"path": ["category"], "operator": "Equal", "valueString": "docs"},
            {"path": ["price"], "operator": "GreaterThanEqual", "valueNumber": 100},
        ],
    })\
    .with_limit(10)\
    .do()

# Milvus
results = collection.search(
    data=[[0.15]*768],
    anns_field="embedding",
    param={"metric_type": "COSINE"},
    limit=10,
    expr="category == 'docs'",
)

# pgvector
cur.execute(
    """
    SELECT id, content, category, embedding <=> %s::vector AS distance
    FROM documents
    WHERE category = 'docs'
    ORDER BY distance LIMIT 10
    """,
    ([0.15]*768,),
)
```

### Pre-Filtering for High-Selectivity Filters

```python
# 1. Filter by tenant first
tenant_ids = await metadata_db.get_vector_ids_for_tenant("tenant_a")
# 2. Search only in those IDs (if DB supports ID filtering)
results = client.search(
    collection_name="quickstart",
    query_vector=[0.15]*768,
    query_filter=Filter(must=[
        FieldCondition(key="id", match=MatchValue(value=tenant_ids)),
    ]),
    limit=10,
)
```

### Post-Filtering with Oversampling

```python
# Search 5x K candidates, then filter
oversample = 5
results = client.search(
    collection_name="quickstart",
    query_vector=[0.15]*768,
    limit=top_k * oversample,
)

# Apply filter
filtered = [r for r in results if r.payload["category"] == "docs"]

# Take top K after filter
final = filtered[:top_k]
```

## Hybrid Search

### Weaviate Hybrid (Dense + BM25)

```python
results = client.query.get("Document", ["title", "content"])\
    .with_hybrid(
        query="machine learning transformers",
        alpha=0.5,  # 0 = only BM25, 1 = only vector
    )\
    .with_limit(10)\
    .with_additional(["score", "explainScore"])\
    .do()
```

### Custom RRF Fusion

```python
def reciprocal_rank_fusion(dense_results, sparse_results, k=60, top_n=10):
    scores = {}

    for rank, doc in enumerate(dense_results):
        scores[doc["id"]] = scores.get(doc["id"], 0) + 1 / (k + rank + 1)

    for rank, doc in enumerate(sparse_results):
        scores[doc["id"]] = scores.get(doc["id"], 0) + 1 / (k + rank + 1)

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [doc_id for doc_id, _ in ranked[:top_n]]
```

## Pagination and Scrolling

```python
# Qdrant scroll
offset = None
while True:
    records, offset = client.scroll(
        collection_name="quickstart",
        limit=100,
        offset=offset,
        with_payload=True,
        with_vectors=False,
    )
    for record in records:
        process(record)
    if offset is None:
        break

# Pinecone list (paginated, namespace-scoped)
for ids in index.list_paginated(prefix="", namespace="", limit=100):
    for id_ in ids:
        process(index.fetch(ids=[id_]))
```

## Collection Management

### List and Delete Collections

```python
# Pinecone
for idx in pc.list_indexes():
    print(idx["name"])

pc.delete_index("quickstart")

# Qdrant
for col in client.get_collections().collections:
    print(col.name)

client.delete_collection("quickstart")

# Milvus
for name in connections.list_collections():
    print(name)

collection.drop()
```

### Index Info and Stats

```python
# Pinecone
stats = index.describe_index_stats()
print(stats.total_vector_count, stats.dimension)

# Qdrant
info = client.get_collection("quickstart")
print(info.status, info.vectors_count, info.segments_count)

# Milvus
stats = collection.num_entities
print(stats)

# Chroma
count = collection.count()
print(count)
```

## Distance Computation

```python
import numpy as np

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def euclidean_distance(a, b):
    return np.sqrt(np.sum((np.array(a) - np.array(b)) ** 2))

def dot_product(a, b):
    return np.dot(a, b)
```

## Error Handling

```python
# Retry with exponential backoff
import time
import random

def with_retry(fn, max_retries=3, base_delay=0.1):
    for attempt in range(max_retries):
        try:
            return fn()
        except (ConnectionError, TimeoutError) as e:
            if attempt == max_retries - 1:
                raise
            delay = base_delay * (2 ** attempt) + random.uniform(0, 0.1)
            time.sleep(delay)
```

## Complete Integration Example

```python
class VectorSearchService:
    def __init__(self, db_type="qdrant", host="localhost", port=6333):
        if db_type == "qdrant":
            self.client = QdrantClient(host=host, port=port)
        elif db_type == "chroma":
            import chromadb
            self.client = chromadb.HttpClient(host=host, port=port)
        else:
            raise ValueError(f"Unsupported db: {db_type}")

    def create_collection(self, name, dim=768):
        self.client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )

    def index_documents(self, collection, documents, embed_fn, batch_size=100):
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            embeddings = embed_fn([d["text"] for d in batch])
            points = [
                PointStruct(
                    id=d["id"],
                    vector=emb.tolist(),
                    payload={k: v for k, v in d.items() if k != "id"},
                )
                for d, emb in zip(batch, embeddings)
            ]
            self.client.upsert(collection_name=collection, points=points)

    def search(self, collection, query_vector, k=10, filters=None):
        query_filter = None
        if filters:
            conditions = [
                FieldCondition(key=k, match=MatchValue(value=v))
                for k, v in filters.items()
            ]
            query_filter = Filter(must=conditions)

        results = self.client.search(
            collection_name=collection,
            query_vector=query_vector,
            limit=k,
            query_filter=query_filter,
        )

        return [
            {
                "id": r.id,
                "score": r.score,
                "payload": r.payload,
            }
            for r in results
        ]

    def health_check(self):
        try:
            self.client.get_collections()
            return {"status": "healthy"}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}
```

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with HNSW parameters, distance metrics, sharding/replication topology, and vector DB scaling guidelines.
-->
