# Chunking Strategies

## Overview

Chunking splits documents into retrievable units. The optimal strategy depends on document structure, retrieval goals, and embedding model constraints.

## Strategy Comparison

| Strategy | Granularity | Coherence | Implementation Complexity | Best For |
|----------|-------------|-----------|--------------------------|----------|
| Semantic | Variable | Highest | High | Long-form prose, articles |
| Recursive | Configurable | High | Medium | Mixed-content documents |
| Sentence | Per-sentence | Medium | Low | Factual QA, search |
| Token | Fixed size | Low | Lowest | Code, dense data |
| Document-level | Full doc | Highest | None | Documents < 1k tokens |

## Semantic Chunking

Splits at topic boundaries by measuring embedding similarity between sentences or paragraphs.

### Algorithm
```python
def semantic_chunk(text, threshold=0.7, min_chunk=100, max_chunk=500):
    sentences = split_sentences(text)
    chunks = []
    current_chunk = []
    for sentence in sentences:
        if current_chunk:
            sim = cosine_sim(embed(current_chunk), embed(sentence))
            if sim < threshold and len(current_chunk) >= min_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
        current_chunk.append(sentence)
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks
```

### Parameters
- Similarity threshold (0.3-0.8): lower = more chunks, higher = fewer.
- Min chunk length: 50-200 tokens. Prevents single-sentence chunks.
- Max chunk length: 300-500 tokens. Avoids exceeding embedding model limits.
- Embedding model: use the same model as retrieval for consistent similarity space.

### Pros and Cons
- Pros: natural topic boundaries, coherent chunks, optimal for long-form content.
- Cons: computationally expensive (requires embedding every sentence), parameter tuning needed, inconsistent chunk sizes.

### When to Use
- Articles, blog posts, research papers
- Content with clear topic transitions
- Scenarios where chunk coherence directly impacts retrieval quality

## Recursive Chunking

Splits text recursively by trying different separators in order (paragraph → sentence → word → character).

### Algorithm
```python
def recursive_chunk(text, separators=["\n\n", "\n", ".", " "], chunk_size=500, overlap=50):
    chunks = []
    for sep in separators:
        if len(text) <= chunk_size:
            return [text]
        parts = text.split(sep)
        if len(parts) > 1:
            break
    current = ""
    for part in parts:
        if len(current) + len(part) > chunk_size:
            chunks.append(current)
            current = current[-overlap:]  # overlap from previous
        current += sep + part if current else part
    if current:
        chunks.append(current)
    return chunks
```

### Parameters
- Chunk size: 256-1024 tokens. Match to embedding model context limit.
- Overlap: 10-20% of chunk size. Preserves context across boundaries.
- Separators: ordered by priority. First that produces multiple splits wins.
- Language-aware separators: `\n\n` for markdown, `;` for code, `。` for CJK.

### Pros and Cons
- Pros: language-agnostic, deterministic, handles any input format.
- Cons: may split mid-sentence, no semantic awareness, overlap introduces redundancy.

### When to Use
- Default strategy for most RAG systems
- Mixed-content documents (HTML, markdown with tables and code)
- When consistent chunk sizes matter more than topic coherence

## Sentence Chunking

Splits into individual sentences or N-sentence windows.

### Window Configuration
```
Single sentence: chunk = 1 sentence. Best for precise fact lookup.
2-sentence window: chunk = 2 consecutive sentences. Balances precision and context.
3-sentence window: chunk = 3 sentences. Typical default for QA.
N-sentence window: chunk = N sentences. Use for paragraph-level context.
```

### Implementation
```python
def sentence_chunk(text, sentences_per_chunk=3, overlap_sentences=1):
    sentences = split_sentences(text)
    chunks = []
    for i in range(0, len(sentences), sentences_per_chunk - overlap_sentences):
        chunk_sentences = sentences[i:i + sentences_per_chunk]
        chunks.append(" ".join(chunk_sentences))
    return chunks
```

### Pros and Cons
- Pros: simple, interpretable, predictable chunk count, works for short queries.
- Cons: breaks topic flow across sentence boundaries, sentence splitting is language-dependent, doesn't handle lists or code.

### When to Use
- FAQ-style retrieval
- Legal or medical documents where individual statements are atomic
- Benchmarking against other chunking strategies

## Token Chunking

Splits text into fixed-length token windows using the model's tokenizer.

### Implementation
```python
from transformers import AutoTokenizer

def token_chunk(text, tokenizer, chunk_tokens=256, overlap_tokens=32):
    tokens = tokenizer.encode(text)
    chunks = []
    for i in range(0, len(tokens), chunk_tokens - overlap_tokens):
        chunk = tokenizer.decode(tokens[i:i + chunk_tokens])
        chunks.append(chunk)
    return chunks
```

### Parameters
- Chunk tokens: 128-512. Must be ≤ embedding model's max input length.
- Overlap tokens: 10-20% of chunk size. Ensures no information lost at boundaries.
- Tokenizer: must match the embedding model's tokenizer.

### Pros and Cons
- Pros: uniform chunk sizes, predictable storage, no language dependence.
- Cons: frequently splits mid-word or mid-sentence, no semantic coherence, hard to interpret.

### When to Use
- Code files (line structure is irrelevant to token boundaries anyway)
- Benchmarking and experiments requiring fixed-size chunks
- High-throughput systems where simplicity matters more than retrieval quality

## Metadata Strategy

Every chunk should carry:
```
{
  "id": "chunk-uuid",
  "doc_id": "source-document-id",
  "index": 3,                          # position in document
  "text": "chunk content",
  "tokens": 412,                       # actual token count
  "source": "url-or-file-path",
  "title": "document title",
  "section": "subsection heading",     # if available
  "page": 42,                          # for PDFs
  "embedding_model": "text-embedding-3-small"
}
```

## Chunk Size Guidelines

| Content Type | Recommended Chunk Size | Rationale |
|-------------|----------------------|-----------|
| Conversational chat | 128-256 tokens | Short context, fast retrieval |
| Technical docs | 256-512 tokens | Balance detail and search |
| News articles | 256-512 tokens | Topic clusters per paragraph |
| Research papers | 256-512 tokens | Abstract + per-section |
| Legal documents | 128-256 tokens | Precise clause reference |
| Code files | 64-128 tokens | Function-level retrieval |
| Books | 512-1024 tokens | Chapter sections |

## Chunking by Document Type

### HTML
- Strip tags, extract headings for section metadata.
- Use heading hierarchy (h1, h2, h3) as semantic split points.
- Chunk per heading section for tree-structured retrieval.

### PDF
- Extract text per page. Handle multi-column layouts.
- Use structural elements (headings, tables, lists) as split guides.
- Preserve page numbers in metadata for citation.

### Markdown
- Heading-based semantic splitting.
- Preserve heading context in chunk metadata.
- Keep code blocks intact — never split inside fenced blocks.

### Unstructured Text (TXT, email, notes)
- Use semantic or recursive chunking.
- Fall back to token chunking if no natural delimiters.

## Testing Chunking Quality

Evaluate chunking with:
- Retrieval hit rate: does the correct chunk appear in top-k for relevant queries?
- Answer completeness: can the LLM answer the question from a single chunk?
- Redundancy: how much overlapping information exists across chunks?
- Chunk count: too many chunks increases latency and storage.
