# Chunking Strategies

## Overview

Chunking is the process of splitting documents into segments before embedding. It is the single most impactful preprocessing decision for retrieval quality. A bad chunking strategy destroys retrieval precision regardless of embedding model quality.

## Decision Tree

```
Document type?
├── Code
│   ├── Use AST-based chunking
│   │   └── Split on function/class/block boundaries
│   └── Parameters: max_lines=100, min_lines=3
│
├── Prose (articles, books, docs)
│   ├── Need passage-level retrieval?
│   │   ├── Yes → Semantic chunking (sentences + embedding similarity)
│   │   │   chunk_size=256t, overlap=32t
│   │   └── No  → Fixed-size chunking
│   │       chunk_size=256t, overlap=38t (15%)
│   ├── Need section-level retrieval?
│   │   ├── Has clear headings?
│   │   │   ├── Yes → Recursive chunking (heading→paragraph→sentence)
│   │   │   │   max_size=512t, overlap=64t
│   │   │   └── No  → Fixed-size chunking with larger window
│   │   │       chunk_size=512t, overlap=76t (15%)
│   └── Need document-level retrieval?
│       └── No chunking (embed entire document)
│           max_tokens = model limit (512-8192)
│
├── Structured (HTML, PDF, Markdown)
│   ├── Document-aware chunking
│   │   ├── Parse structure (headings, sections, tables)
│   │   ├── Propagate section context to child chunks
│   │   └── Parameters: max_size=512t, overlap=header_text
│   └── Alternative: sliding window
│       chunk_size=256t, overlap=64t (25%)
│
├── Tables / structured data
│   ├── Row-level embedding
│   │   └── Chunk = header + row values
│   └── Parameters: token_budget = model_max
│
└── Conversational (chat logs, transcripts)
    ├── Turn-based chunking
    └── Parameters: max_turns=10, overlap=2 turns
```

## Fixed-Size Chunking

Simplest approach: split text into chunks of approximately equal token count.

```python
from typing import Iterator

def fixed_size_chunks(
    text: str,
    chunk_size: int = 256,
    overlap: int = 38,
    tokenizer=None,
) -> Iterator[str]:
    """Fixed-size chunking with overlapping windows.

    chunk_size: target tokens per chunk (default 256)
    overlap: tokens of overlap between consecutive chunks (default 38 ≈ 15%)
    tokenizer: optional tokenizer for accurate token counting
    """
    if tokenizer is None:
        # Approximate: 1 token ≈ 4 chars for English
        tokens = list(text)
        char_per_token = 4
        chunk_chars = chunk_size * char_per_token
        overlap_chars = overlap * char_per_token

        start = 0
        while start < len(tokens):
            end = min(start + chunk_chars, len(tokens))
            yield text[start:end]
            if end >= len(tokens):
                break
            start += chunk_chars - overlap_chars
    else:
        # Accurate token-based splitting
        encoded = tokenizer.encode(text)
        start = 0
        while start < len(encoded):
            end = min(start + chunk_size, len(encoded))
            chunk_tokens = encoded[start:end]
            yield tokenizer.decode(chunk_tokens)
            if end >= len(encoded):
                break
            start += chunk_size - overlap
```

### Chunk Size Guidelines

```
Chunk Size │ Use Case                        │ Retrieval Granularity
───────────┼─────────────────────────────────┼───────────────────────
128 tokens │ Q&A, factoid retrieval          │ Single fact per chunk
256 tokens │ Balanced (default)              │ 1-2 paragraphs
512 tokens │ Summarization, section retrieval │ Multi-paragraph
1024 tokens│ Document-level understanding    │ Full sections
2048+      │ Long-context models (Jina 8K)   │ Multi-section
```

### Overlap Guidelines

```
Overlap │ Rationale                         │ Risk
────────┼───────────────────────────────────┼─────────────
0%      │ Minimal redundancy, max coverage  │ Loses context at boundaries
10%     │ Light overlap                     │ Some boundary context loss
15%     │ Balanced (default)                │ Good tradeoff
25%     │ Heavy overlap                     │ Redundancy, more chunks
50%     │ Maximum overlap                   │ 2x chunks, high redundancy

Overlap in tokens: chunk_size × overlap_percentage
  - 256 chunk, 15% overlap = 38 tokens
  - 512 chunk, 15% overlap = 76 tokens
  - 256 chunk, 25% overlap = 64 tokens
```

## Semantic Chunking

Split at semantic boundaries (topic shifts, paragraph ends) using embedding similarity.

```python
from sentence_transformers import SentenceTransformer
import numpy as np

def semantic_chunks(
    text: str,
    threshold: float = 0.4,
    min_chunk_size: int = 50,
    max_chunk_size: int = 512,
) -> list[str]:
    """Split text at semantic boundaries.

    1. Split into sentences
    2. Embed each sentence
    3. Compute cosine distance between adjacent sentences
    4. Split where distance > threshold
    5. Merge small chunks into neighbors

    threshold: 0.3-0.5. Lower = more, smaller chunks.
    """
    import spacy
    nlp = spacy.load("en_core_web_sm")
    doc = nlp(text)
    sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
    if len(sentences) <= 1:
        return [text]

    model = SentenceTransformer("all-MiniLM-L6-v2")
    embeds = model.encode(sentences, normalize_embeddings=True)

    # Find split points where cosine distance > threshold
    splits = [0]
    for i in range(1, len(sentences)):
        sim = float(embeds[i - 1] @ embeds[i])
        if 1 - sim > threshold:  # cosine distance
            splits.append(i)
    splits.append(len(sentences))

    # Build chunks and merge small ones
    chunks = []
    for i in range(len(splits) - 1):
        chunk = " ".join(sentences[splits[i]:splits[i + 1]])
        chunks.append(chunk)

    # Merge chunks smaller than min_chunk_size
    merged = []
    for chunk in chunks:
        if merged and (
            len(chunk.split()) < min_chunk_size
            or len(merged[-1].split()) + len(chunk.split()) < max_chunk_size
        ):
            merged[-1] += " " + chunk
        else:
            merged.append(chunk)

    return merged
```

### Threshold Tuning

```
Threshold │ Chunks per 1K tokens │ Boundary Quality
──────────┼──────────────────────┼────────────────────
0.3       │ 8-12                │ Very fine-grained
0.4       │ 5-8                 │ Balanced (default)
0.5       │ 3-5                 │ Coarse-grained
0.6       │ 2-3                 │ Very coarse
```

Semantic chunking produces 10-30% fewer chunks than fixed-size for the same text, because it respects natural boundaries rather than cutting mid-paragraph.

## Recursive Chunking

Hierarchical splitting: first by document structure, then by paragraph, then by sentence.

```python
import re

def recursive_chunks(
    text: str,
    max_tokens: int = 512,
    min_tokens: int = 50,
) -> list[str]:
    """Recursive chunking respecting document structure.

    Priority: heading boundaries > paragraph boundaries > sentence boundaries
    """
    # Level 1: Split on headings (markdown: ##, ===, ---)
    heading_pattern = r"\n(#{1,3}\s+[^\n]+)\n"
    sections = re.split(heading_pattern, text)

    # Level 2: For each section, split on paragraph boundaries
    chunks = []
    for i in range(0, len(sections), 2):
        heading = sections[i] if i < len(sections) else ""
        body = sections[i + 1] if i + 1 < len(sections) else ""

        paragraphs = re.split(r"\n\s*\n", body)
        current = heading + "\n" if heading else ""
        for para in paragraphs:
            para_len = len(para.split())
            current_len = len(current.split())
            if current_len + para_len <= max_tokens:
                current += para + "\n"
            else:
                if current.strip():
                    chunks.append(current.strip())
                current = heading + "\n" + para + "\n" if para_len <= max_tokens else heading + "\n"

        if current.strip():
            chunks.append(current.strip())

    # Level 3: Handle chunks exceeding max_tokens
    final_chunks = []
    for chunk in chunks:
        if len(chunk.split()) > max_tokens:
            # Fall back to fixed-size for very long sections
            final_chunks.extend(fixed_size_chunks(chunk, chunk_size=max_tokens, overlap=38))
        else:
            final_chunks.append(chunk)

    return [c for c in final_chunks if len(c.split()) >= min_tokens]
```

## Document-Aware Chunking

For structured documents, preserve hierarchy and propagate context.

```python
class DocumentAwareChunker:
    """Chunk structured documents preserving heading hierarchy."""

    def __init__(self, max_size: int = 512, overlap: int = 64):
        self.max_size = max_size
        self.overlap = overlap

    def chunk_markdown(self, markdown: str) -> list[dict]:
        """Chunk markdown with context propagation.

        Returns: list of {text, metadata} where metadata includes
        the full heading path for context.
        """
        from markdownify import markdownify
        lines = markdown.split("\n")
        chunks = []
        heading_stack = {}
        current_chunk = ""
        current_meta = {}

        def flush_chunk():
            if current_chunk.strip():
                chunks.append({
                    "text": current_chunk.strip(),
                    "metadata": {
                        **current_meta,
                        "context": " | ".join(
                            heading_stack.get(lvl, "")
                            for lvl in range(1, 4)
                        ),
                    },
                })

        for line in lines:
            heading_match = re.match(r"^(#{1,6})\s+(.+)$", line)
            if heading_match:
                flush_chunk()
                level = len(heading_match.group(1))
                title = heading_match.group(2)
                heading_stack[level] = title
                # Clear lower levels
                for l in range(level + 1, 7):
                    heading_stack.pop(l, None)
                current_meta = {"heading": title, "level": level}

            if len(current_chunk) + len(line) <= self.max_size:
                current_chunk += line + "\n"
            else:
                flush_chunk()
                # Carry heading context as overlap
                context = heading_stack.get(1, "")
                current_chunk = line + "\n"
                current_meta = current_meta.copy()

        flush_chunk()
        return chunks
```

## Chunking for Retrieval Performance

### How Chunk Size Affects Retrieval

```
Chunk Size │ Recall@5 │ Precision@5 │ Chunks per Doc │ Storage
───────────┼──────────┼──────────────┼────────────────┼───────────
128t       │ 0.85     │ 0.72        │ 12             │ 12×107KB
256t       │ 0.89     │ 0.68        │ 6              │ 6×214KB
512t       │ 0.91     │ 0.58        │ 3              │ 3×428KB
1024t      │ 0.90     │ 0.45        │ 2              │ 2×856KB

Observation:
- Smaller chunks: higher precision (each chunk is more specific)
- Larger chunks: higher recall (more context, but more noise)
- Optimal for Q&A: 128-256 tokens
- Optimal for summarization: 512-1024 tokens
```

### Multi-Granularity Chunking (Best of Both)

```python
def multi_granularity_chunks(
    text: str,
    small_size: int = 128,
    large_size: int = 512,
    overlap: int = 0,
) -> dict[str, list[str]]:
    """Generate chunks at multiple granularities for different retrieval stages.

    Stage 1: Retrieval with small chunks (high precision)
    Stage 2: Context window built from large chunks merged around retrieved small chunks
    """
    return {
        "small": list(fixed_size_chunks(text, small_size, overlap)),
        "large": list(fixed_size_chunks(text, large_size, overlap)),
    }

# In RAG: retrieve small chunks, expand context from large chunks
```

## Chunking Anti-Patterns

```
Anti-Pattern                     │ Impact                        │ Fix
─────────────────────────────────┼───────────────────────────────┼─────────────────────
Chunking without overlap         │ Missing context at boundaries │ Add 10-25% overlap
Chunking by character count      │ Variable token counts         │ Use tokenizer-based splitting
Embedding full doc then chunking │ One embedding per doc         │ Chunk first, then embed
Ignoring document structure      │ Headings in wrong context     │ Document-aware chunking
One-size-fits-all chunking       │ Poor fit for some docs        │ Adaptive strategy per type
Chunk size > model max_length    │ Silent truncation             │ chunk_size ≤ model_max
Not storing chunk metadata       │ Can't reconstruct doc         │ Store doc_id, chunk_pos
```

## Key Points
- Chunking affects retrieval more than embedding model choice in many cases — test different strategies.
- Fixed-size chunking with 15% overlap is the safe default for most prose.
- Semantic chunking improves coherence but adds latency — pre-compute during indexing.
- Recursive chunking is best for structured documents with clear hierarchy.
- Document-aware chunking propagates context (headings) into chunks for better retrieval.
- Multi-granularity chunking enables precise retrieval + broad context in RAG pipelines.
- Chunk size trade-off: smaller = higher precision, larger = higher recall.
- Always use the same chunking parameters at index and query time.
- Store chunk metadata (doc_id, position, source) for result reconstruction.
- Test 3-5 chunking configurations on your validation set before choosing one.
