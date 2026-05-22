# Embedding Models Comparison

## Model Selection Guide

| Model | Dims | MTEB Avg | Speed | Size | Cost | Best For |
|---|---|---|---|---|---|---|
| all-MiniLM-L6-v2 | 384 | 56.1 | Very fast | 80MB | Free | Latency-critical, simple search |
| BGE-base-en-v1.5 | 768 | 62.3 | Fast | 330MB | Free | General RAG, good balance |
| BGE-large-en-v1.5 | 1024 | 63.5 | Medium | 670MB | Free | High-quality retrieval |
| Instructor-XL | 768 | 62.5 | Medium | 1.3GB | Free | Task-specific, instruction-aware |
| intfloat/e5-large-v2 | 1024 | 62.3 | Medium | 1.2GB | Free | Retrieval, classification |
| nomic-embed-text-v1 | 768 | 62.4 | Fast | 350MB | Free | Matryoshka, adaptive dims |
| text-embedding-3-small | 512 | 62.0 | API | N/A | $0.02/1M | Simple API, OpenAI ecosystem |
| text-embedding-3-large | 3072 | 64.6 | API | N/A | $0.13/1M | Highest quality API |
| Cohere embed-english-v3 | 1024 | 62.0 | API | N/A | $0.10/1M | 512d truncation option |

## Sentence-Transformers Usage

```python
from sentence_transformers import SentenceTransformer, util

# Load model
model = SentenceTransformer('BAAI/bge-large-en-v1.5')

# Encode texts
sentences = [
    "The quick brown fox jumps over the lazy dog.",
    "Machine learning is transforming industries.",
    "Paris is the capital of France.",
]
embeddings = model.encode(sentences, normalize_embeddings=True)

# Compute similarities
similarities = util.cos_sim(embeddings[0], embeddings[1:])
print(f"Similarity scores: {similarities}")

# Semantic search
queries = ["What is the capital of France?"]
query_embeds = model.encode(queries, normalize_embeddings=True)
hits = util.semantic_search(query_embeds, embeddings, top_k=5)
print(hits)
```

## BGE with Instruction

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('BAAI/bge-large-en-v1.5')

# BGE requires instruction prefix for queries
query = model.encode(
    [f"Represent this sentence for searching relevant passages: {q}" for q in queries],
    normalize_embeddings=True,
)

# Documents don't need instruction
passages = model.encode(documents, normalize_embeddings=True)
```

## Instructor

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('hkunlp/instructor-xl')

# Instructor uses instruction as first argument
query_embed = model.encode([
    ["Represent the Medic question for retrieving supporting evidence:", q]
    for q in queries
])

doc_embed = model.encode([
    ["Represent the MEDLINE document for retrieval:", doc]
    for doc in documents
])
```

## OpenAI Embeddings

```python
from openai import OpenAI

client = OpenAI()

response = client.embeddings.create(
    model="text-embedding-3-large",
    input=["text1", "text2"],
    dimensions=512,  # truncate to 512d via Matryoshka
)
embeddings = [r.embedding for r in response.data]

# Cost calculation
# text-embedding-3-large: $0.13/1M tokens
# 10M documents x 200 tokens each = 2B tokens = $260
```

## Cohere Embeddings

```python
import cohere

co = cohere.Client(api_key="...")

response = co.embed(
    texts=["text1", "text2"],
    model="embed-english-v3.0",
    input_type="search_document",
    truncate="END",
)
embeddings = response.embeddings

# Truncatable to 512d
response_512 = co.embed(
    texts=["text"],
    model="embed-english-v3.0",
    input_type="search_query",
    truncate="END",
    embedding_types=["float"],
)
```

## MTEB Leaderboard Queries

```python
# Evaluate on MTEB tasks
from mteb import MTEB

model = SentenceTransformer('BAAI/bge-large-en-v1.5')

evaluation = MTEB(
    tasks=[
        "Banking77Classification",
        "ArguAnaRetrieval",
        "STSBenchmarkSTS",
    ]
)
results = evaluation.run(model, output_folder="results/")
print(f"MTEB Results: {results}")
```

## Speed Benchmarks

| Model | Dims | Docs/sec (CPU) | Docs/sec (GPU) | Latency (single) |
|---|---|---|---|---|
| all-MiniLM-L6-v2 | 384 | 5000 | 50000 | 2ms |
| BGE-base-en-v1.5 | 768 | 1500 | 25000 | 5ms |
| BGE-large-en-v1.5 | 1024 | 800 | 15000 | 8ms |
| text-embedding-3-small | 512 | API | API | ~10ms |
| text-embedding-3-large | 3072 | API | API | ~30ms |

## Selection Decision Tree

```
Need embeddings?
├── API preferred?
│   ├── Budget < $XXX/month?
│   │   ├── text-embedding-3-small (cheapest API)
│   │   └── text-embedding-3-large (best API quality)
│   └── Need multilingual?
│       └── Cohere embed-multilingual-v3
├── Self-hosted, latency-critical?
│   └── all-MiniLM-L6-v2
├── RAG with strong retrieval?
│   └── BGE-large-en-v1.5
├── Task-specific needs?
│   └── Instructor-XL
└── Flexible dimensionality?
    └── nomic-embed-text-v1 (Matryoshka)
```
