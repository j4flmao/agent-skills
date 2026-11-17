# Context Summarization & Compression

## 1. Skill Context
**Focus**: Managing the context window limits (e.g., 128k tokens) and preventing "Lost in the Middle" syndrome for Personas operating on long-running tasks.
**Triggers**: context-compression, summarization, kv-cache, context-window.

## 2. "Lost in the Middle"
Liu et al. (TACL 2024) found that many models recall information placed in the middle of a long prompt less reliably than information at the start or end. Newer long-context models reduce but do not remove the effect, so keep instructions and constraints pinned at the start, recent turns at the end, and test recall on your own model.

## 3. Compression Strategies
- **Rolling Summarization**: Every 20 messages, a summarizer agent condenses the oldest 15 messages into a dense 1-paragraph summary. The raw messages are dropped from the context window, and the summary is prepended.
- **LLMLingua (Token Compression)**: Microsoft's LLMLingua family uses a small language model to score tokens (perplexity, or a trained classifier in LLMLingua-2) and drops the least informative ones. Compression ratios and quality loss vary by task; measure answer quality on your own evals before using it, and never compress pinned instructions or constraints.
