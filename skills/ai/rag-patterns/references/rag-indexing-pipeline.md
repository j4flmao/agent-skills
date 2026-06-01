# Indexing Pipeline Architecture

## Overview
The indexing pipeline transforms raw documents into a searchable vector index. Quality at this stage determines the ceiling for retrieval performance. A well-designed indexing pipeline handles document diversity, scales to corpus size, and maintains freshness.

## Pipeline Stages

```
Raw Documents
     │
     ▼
┌────────────────────┐
│ 1. Document Loader │  Parse, normalize, validate
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ 2. Text Extractor  │  Strip markup, extract structure
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ 3. Chunker         │  Split into retrievable units
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ 4. Embedder        │  Encode chunks into vectors
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ 5. Index Writer    │  Store in vector DB
└────────────────────┘
```

---

## Stage 1: Document Loader

### Purpose
Read documents from source, validate format, extract metadata.

### Supported Sources
| Source | Loader | Metadata Extracted |
|--------|--------|-------------------|
| Local files | File system walker | path, size, modified date, extension |
| S3/GCS/Blob | Cloud storage client | key, bucket, etag, last_modified |
| Web pages | HTTP client + HTML parser | url, title, meta tags, publish date |
| APIs | REST client + JSON parser | endpoint, response schema |
| Databases | SQL/NoSQL client | table, primary key, updated_at |
| Message queue | Kafka/RabbitMQ consumer | topic, partition, offset, timestamp |

### Document Loader Implementation
```python
class DocumentLoader:
    def __init__(self):
        self.loaders = {}

    def register(self, scheme: str, loader):
        self.loaders[scheme] = loader

    async def load(self, source: str) -> list[Document]:
        scheme = source.split("://")[0] if "://" in source else "file"
        loader = self.loaders.get(scheme)
        if not loader:
            raise ValueError(f"No loader for scheme: {scheme}")
        return await loader.load(source)

@dataclass
class Document:
    id: str
    text: str
    metadata: dict
    checksum: str
```

### File-Based Loader
```python
class FileLoader:
    SUPPORTED_EXTENSIONS = {".md", ".txt", ".pdf", ".html", ".json", ".csv", ".py", ".js", ".ts", ".rst"}

    async def load(self, path: str) -> list[Document]:
        docs = []
        if os.path.isfile(path):
            docs.append(await self._load_file(path))
        else:
            async for root, _, files in os.walk(path):
                for fname in files:
                    ext = os.path.splitext(fname)[1].lower()
                    if ext in self.SUPPORTED_EXTENSIONS:
                        fpath = os.path.join(root, fname)
                        docs.append(await self._load_file(fpath))
        return docs

    async def _load_file(self, path: str) -> Document:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
        stat = os.stat(path)
        return Document(
            id=hashlib.sha256(f"{path}:{stat.st_mtime}".encode()).hexdigest()[:16],
            text=text,
            metadata={
                "source": path,
                "filename": os.path.basename(path),
                "extension": os.path.splitext(path)[1],
                "size_bytes": stat.st_size,
                "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            },
            checksum=hashlib.sha256(text.encode()).hexdigest(),
        )
```

---

## Stage 2: Text Extractor

### Purpose
Extract clean text from formatted documents, preserving structural metadata.

### Extractors by Type
```python
class TextExtractor:
    def __init__(self):
        self.extractors = {
            ".html": self._extract_html,
            ".md": self._extract_markdown,
            ".pdf": self._extract_pdf,
            ".json": self._extract_json,
            ".csv": self._extract_csv,
        }

    async def extract(self, doc: Document) -> ExtractedDocument:
        ext = doc.metadata.get("extension", "")
        extractor = self.extractors.get(ext, self._extract_plain)
        return await extractor(doc)

    async def _extract_html(self, doc: Document) -> ExtractedDocument:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(doc.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        title = soup.title.string if soup.title else ""
        headings = []
        for tag in soup.find_all(["h1", "h2", "h3"]):
            headings.append({"level": tag.name, "text": tag.get_text(strip=True)})
        text = soup.get_text(separator="\n", strip=True)
        return ExtractedDocument(
            id=doc.id,
            text=text,
            metadata={
                **doc.metadata,
                "title": title,
                "headings": headings,
            },
        )

    async def _extract_markdown(self, doc: Document) -> ExtractedDocument:
        import re
        text = doc.text
        headings = re.findall(r"^(#{1,3})\s+(.+)$", text, re.MULTILINE)
        title = headings[0][1] if headings else ""
        return ExtractedDocument(
            id=doc.id,
            text=text,
            metadata={
                **doc.metadata,
                "title": title,
                "headings": [{"level": len(h[0]), "text": h[1]} for h in headings],
            },
        )

    async def _extract_plain(self, doc: Document) -> ExtractedDocument:
        return ExtractedDocument(id=doc.id, text=doc.text, metadata=doc.metadata)
```

### Common Extraction Issues
| Issue | Symptom | Fix |
|-------|---------|-----|
| PDF extraction garbled | Text in wrong order, missing spaces | Use PyMuPDF/docling; handle multi-column |
| HTML boilerplate | Nav, ads, footer in extracted text | Use trafilatura or readability-lm |
| Encoding errors | Garbled characters | Detect via chardet; use errors="replace" |
| Large files | Memory overflow | Stream process; split by page/section |

---

## Stage 3: Chunker

### Purpose
Split extracted documents into chunks suitable for embedding and retrieval.

### Chunker Interface
```python
class Chunker(ABC):
    @abstractmethod
    def chunk(self, doc: ExtractedDocument) -> list[Chunk]:
        pass

@dataclass
class Chunk:
    id: str
    doc_id: str
    index: int
    text: str
    token_count: int
    metadata: dict
```

### Recursive Chunker Implementation
```python
class RecursiveChunker(Chunker):
    def __init__(self, chunk_size: int = 500, overlap: int = 50,
                 separators: list[str] | None = None):
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.separators = separators or ["\n\n", "\n", ".", " ", ""]

    def chunk(self, doc: ExtractedDocument) -> list[Chunk]:
        text = doc.text
        chunks = []
        start = 0
        index = 0

        while start < len(text):
            end = min(start + self.chunk_size, len(text))

            if end < len(text):
                end = self._find_split(text, end)

            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append(Chunk(
                    id=f"{doc.id}_{index}",
                    doc_id=doc.id,
                    index=index,
                    text=chunk_text,
                    token_count=self._count_tokens(chunk_text),
                    metadata={**doc.metadata, "chunk_index": index},
                ))
                index += 1

            start = end - self.overlap

        return chunks

    def _find_split(self, text: str, position: int) -> int:
        for sep in self.separators:
            idx = text.rfind(sep, position - self.chunk_size // 2, position)
            if idx != -1:
                return idx + len(sep)
        return position

    def _count_tokens(self, text: str) -> int:
        return len(text.split()) * 1.3  # approximate
```

### Semantic Chunker
```python
class SemanticChunker(Chunker):
    def __init__(self, embedder, threshold: float = 0.7,
                 min_chunk_tokens: int = 100, max_chunk_tokens: int = 500):
        self.embedder = embedder
        self.threshold = threshold
        self.min_chunk_tokens = min_chunk_tokens
        self.max_chunk_tokens = max_chunk_tokens

    def chunk(self, doc: ExtractedDocument) -> list[Chunk]:
        sentences = self._split_sentences(doc.text)
        chunks = []
        current = []
        current_tokens = 0
        index = 0

        for sentence in sentences:
            sent_tokens = self._count_tokens(sentence)
            if not current:
                current.append(sentence)
                current_tokens = sent_tokens
                continue

            if current_tokens + sent_tokens > self.max_chunk_tokens:
                chunks.append(self._make_chunk(doc, current, index))
                index += 1
                current = [sentence]
                current_tokens = sent_tokens
                continue

            if current_tokens >= self.min_chunk_tokens:
                sim = self._similarity(current, sentence)
                if sim < self.threshold:
                    chunks.append(self._make_chunk(doc, current, index))
                    index += 1
                    current = [sentence]
                    current_tokens = sent_tokens
                    continue

            current.append(sentence)
            current_tokens += sent_tokens

        if current:
            chunks.append(self._make_chunk(doc, current, index))

        return chunks

    def _similarity(self, current_chunk: list[str], next_sentence: str) -> float:
        import numpy as np
        chunk_vec = self.embedder.encode(" ".join(current_chunk[-3:]))
        sent_vec = self.embedder.encode(next_sentence)
        return np.dot(chunk_vec, sent_vec) / (
            np.linalg.norm(chunk_vec) * np.linalg.norm(sent_vec) + 1e-8
        )

    def _make_chunk(self, doc, sentences, index):
        text = " ".join(sentences)
        return Chunk(
            id=f"{doc.id}_{index}",
            doc_id=doc.id,
            index=index,
            text=text,
            token_count=self._count_tokens(text),
            metadata={**doc.metadata, "chunk_index": index},
        )
```

### Chunk Validation
```python
class ChunkValidator:
    def validate(self, chunks: list[Chunk]) -> list[str]:
        warnings = []
        for c in chunks:
            if c.token_count > 512:
                warnings.append(f"Chunk {c.id}: {c.token_count} tokens > 512 limit")
            if not c.text.strip():
                warnings.append(f"Chunk {c.id}: empty text")
            if len(c.text) < 20:
                warnings.append(f"Chunk {c.id}: too short ({len(c.text)} chars)")
        return warnings

    def find_boundary_cuts(self, original_text: str, chunks: list[Chunk]) -> list[str]:
        html_patterns = ["<table", "<code", "<pre", "<ul", "<ol", "<blockquote"]
        code_fences = ["```", "~~~"]
        warnings = []
        for c in chunks:
            for pat in html_patterns:
                if pat in c.text and pat not in c.text[-100:] and pat not in c.text[:100]:
                    warnings.append(f"Chunk {c.id} may split {pat}")
            for fence in code_fences:
                if c.text.count(fence) % 2 != 0:
                    warnings.append(f"Chunk {c.id} has unbalanced code fence")
        return warnings
```

---

## Stage 4: Embedder

### Purpose
Convert chunk text into dense vector representations.

### Embedder Interface
```python
class Embedder(ABC):
    @abstractmethod
    async def encode(self, texts: list[str]) -> list[list[float]]:
        pass

    @abstractmethod
    async def encode_query(self, query: str) -> list[float]:
        pass
```

### API-Based Embedder
```python
class OpenAIEmbedder(Embedder):
    def __init__(self, model: str = "text-embedding-3-small",
                 dimensions: int = 512, batch_size: int = 100):
        import openai
        self.client = openai.AsyncOpenAI()
        self.model = model
        self.dimensions = dimensions
        self.batch_size = batch_size

    async def encode(self, texts: list[str]) -> list[list[float]]:
        all_embeddings = []
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i + self.batch_size]
            response = await self.client.embeddings.create(
                model=self.model,
                input=batch,
                dimensions=self.dimensions,
            )
            all_embeddings.extend([r.embedding for r in response.data])
        return all_embeddings

    async def encode_query(self, query: str) -> list[float]:
        response = await self.client.embeddings.create(
            model=self.model,
            input=[query],
            dimensions=self.dimensions,
        )
        return response.data[0].embedding
```

### Local Embedder (HuggingFace)
```python
class LocalEmbedder(Embedder):
    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5",
                 batch_size: int = 64, device: str = "cpu"):
        from sentence_transformers import SentenceTransformer
        self.model = SentenceTransformer(model_name, device=device)
        self.batch_size = batch_size

    async def encode(self, texts: list[str]) -> list[list[float]]:
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            None,
            lambda: self.model.encode(
                texts,
                batch_size=self.batch_size,
                show_progress_bar=False,
                normalize_embeddings=True,
            ),
        )
        return embeddings.tolist()

    async def encode_query(self, query: str) -> list[float]:
        return (await self.encode([query]))[0]
```

### Embedding Normalization
```python
def normalize_embedding(vec: list[float]) -> list[float]:
    import numpy as np
    arr = np.array(vec, dtype=np.float32)
    norm = np.linalg.norm(arr)
    if norm > 0:
        arr = arr / norm
    return arr.tolist()
```

---

## Stage 5: Index Writer

### Purpose
Store chunk vectors and metadata in vector database for retrieval.

### Index Writer Interface
```python
class IndexWriter(ABC):
    @abstractmethod
    async def upsert_batch(self, ids: list[str], vectors: list[list[float]],
                           metadatas: list[dict]) -> int:
        pass

    @abstractmethod
    async def delete(self, ids: list[str]):
        pass

    @abstractmethod
    async def commit(self):
        pass
```

### Shard by Source
```python
class ShardedIndexWriter(IndexWriter):
    def __init__(self, shard_fn, namespace: str = "default"):
        self.shard_fn = shard_fn  # maps metadata -> shard key
        self.shards = {}
        self.namespace = namespace

    async def upsert_batch(self, ids, vectors, metadatas):
        batches = {}
        for id_, vec, meta in zip(ids, vectors, metadatas):
            shard_key = self.shard_fn(meta)
            if shard_key not in batches:
                batches[shard_key] = {"ids": [], "vectors": [], "metadatas": []}
            batches[shard_key]["ids"].append(id_)
            batches[shard_key]["vectors"].append(vec)
            batches[shard_key]["metadatas"].append(meta)

        total = 0
        for shard_key, batch in batches.items():
            if shard_key not in self.shards:
                self.shards[shard_key] = await self._create_shard(shard_key)
            total += await self.shards[shard_key].upsert_batch(
                batch["ids"], batch["vectors"], batch["metadatas"]
            )
        return total
```

---

## Freshness and Update Strategies

| Strategy | Description | Latency | Complexity | Best For |
|----------|-------------|---------|------------|----------|
| Full rebuild | Re-index entire corpus on schedule | Hours | Low | Small corpora, nightly updates |
| Incremental upsert | Add/update individual documents | Real-time | Medium | Streaming data, live docs |
| Partition swap | Build new partition, swap in | Minutes | High | Large corpora with versioned data |
| CDC pipeline | Capture DB changes → re-embed | Near real-time | High | DB-backed content |

### Incremental Update
```python
class IncrementalUpdater:
    def __init__(self, embedder, index_writer, change_detector):
        self.embedder = embedder
        self.writer = index_writer
        self.changes = change_detector

    async def sync(self):
        new_docs, updated_docs, deleted_ids = await self.changes.detect()

        if new_docs:
            chunks = await self._process_docs(new_docs)
            await self.writer.upsert_batch(chunks["ids"], chunks["vectors"], chunks["metadatas"])

        if updated_docs:
            for doc in updated_docs:
                await self.writer.delete(doc["existing_chunk_ids"])
            chunks = await self._process_docs(updated_docs)
            await self.writer.upsert_batch(chunks["ids"], chunks["vectors"], chunks["metadatas"])

        if deleted_ids:
            await self.writer.delete(deleted_ids)

        await self.writer.commit()
```

---

## Monitoring the Indexing Pipeline

| Metric | What It Measures | Warning | Critical |
|--------|-----------------|---------|----------|
| Docs ingested / sec | Throughput | < 50% expected | < 25% expected |
| Chunks per doc | Chunking quality | < 1 or > 100 | 0 |
| Chunk token count P95 | Chunk size consistency | > 600 | > 800 |
| Embedding latency P95 | Embedding speed | > 100ms/doc | > 500ms/doc |
| Index write latency | DB write speed | > 200ms/batch | > 1s/batch |
| Error rate | Ingestion failures | > 1% | > 5% |
| Index size | Storage growth | > 80% budget | > 95% budget |
| Index freshness | Time since last update | > 1hr | > 4hr |

### Pipeline Observability
```python
class IndexingMonitor:
    def __init__(self):
        self.docs_ingested = Counter("ingestion_docs_total", ["source"])
        self.chunks_created = Counter("ingestion_chunks_total", [])
        self.embedding_latency = Histogram("ingestion_embedding_seconds", ["model"])
        self.errors = Counter("ingestion_errors_total", ["stage", "error_type"])
        self.docs_pending = Gauge("ingestion_docs_pending", [])

    def record_ingestion(self, source: str, doc_count: int, chunk_count: int):
        self.docs_ingested.labels(source=source).inc(doc_count)
        self.chunks_created.inc(chunk_count)

    def record_latency(self, stage: str, duration: float):
        self.embedding_latency.labels(model=stage).observe(duration)

    def record_error(self, stage: str, error: str):
        self.errors.labels(stage=stage, error_type=type(error).__name__).inc()
```

---

## Key Points
- Indexing quality determines the ceiling for retrieval quality — invest here first.
- Chunk size must respect the embedding model's max token limit (typically 512).
- Always validate chunks: check for truncated structures, empty chunks, excessive size.
- Store comprehensive metadata with every chunk for filtering, citation, and debugging.
- Monitor ingestion throughput and error rate to detect pipeline issues early.
- Use incremental updates for live documents; full rebuilds for periodic freshness.
- Shard indices by source or date for independent update and query isolation.
- Parallelize embedding with batched API calls or GPU-accelerated local models.
- Document loader should handle all source types the corpus contains.
- Test the pipeline on a sample before full ingestion to validate chunking quality.
