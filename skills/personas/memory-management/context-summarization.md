# Context Summarization & Compression

## 1. Skill Context
**Focus**: Managing the context window limits (e.g., 128k tokens) and preventing "Lost in the Middle" syndrome for Personas operating on long-running tasks.
**Triggers**: context-compression, summarization, kv-cache, context-window.

## 2. "Lost in the Middle" Syndrome
Even if an LLM has a 1 Million token context window, research shows that models severely degrade at recalling information located in the *middle* of the prompt. They only pay strong attention to the very beginning (System Prompt) and the very end (Recent messages).

## 3. Compression Strategies
- **Rolling Summarization**: Every 20 messages, a summarizer agent condenses the oldest 15 messages into a dense 1-paragraph summary. The raw messages are dropped from the context window, and the summary is prepended.
- **LLMLingua (Token Compression)**: An algorithmic technique that uses a small language model to calculate the entropy of words. It literally deletes words like "a", "the", and "is" from the prompt, compressing the token count by up to 50% without changing the semantic meaning for the large LLM.
