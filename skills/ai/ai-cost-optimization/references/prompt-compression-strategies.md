# Prompt Compression Strategies

## Overview
Prompt compression reduces token usage while preserving task performance. Effective compression can cut costs by 40-60% without degrading output quality. Strategies range from simple truncation to learned compression models.

## Compression Techniques

### 1. Manual Compression
Remove redundant words, merge instructions, eliminate examples that don't add value.

```
Before (245 tokens):
"You are a helpful AI assistant that provides accurate and detailed information.
Your task is to answer questions about our product catalog.
Please provide comprehensive responses that include product names, prices, and descriptions.
If you don't know the answer, please say so. Do not make up information.
Always be polite and professional."

After (89 tokens):
"Answer product questions accurately with name, price, description.
Say if unsure. Be professional."
```

### 2. LLMLingua Compression
Uses a smaller language model to identify and remove redundant tokens.

```python
from llmlingua import PromptCompressor

compressor = PromptCompressor(
    model_name="microsoft/llmlingua-2-xlm-roberta-large-meetingbank",
    use_llmlingua2=True,
)

def compress_prompt(prompt: str, rate: float = 0.5) -> str:
    result = compressor.compress(
        prompt,
        rate=rate,
        force_tokens=["\n", ":", "?", "!", "."],
        chunk_end_tokens=[".", "\n"],
        condition_in_question="",
        rank_method="longest_first",
    )
    return result["compressed_prompt"]

# Example usage
original = """
You are a customer support agent for Acme Corp.
Your job is to help customers with their orders.
When a customer asks about their order status, you should:
1. Ask for their order ID
2. Look up the order in our database
3. Provide the current status
4. Estimate delivery date if applicable

Customer question: Where is my order?
"""
compressed = compress_prompt(original, rate=0.4)
print(f"Compression: {len(original.split())} -> {len(compressed.split())} tokens")
```

### 3. Selective Context
Only include relevant portions of retrieved documents.

```python
class SelectiveCompressor:
    def __init__(self, relevance_threshold=0.3):
        self.threshold = relevance_threshold

    def compress_context(self, query: str, documents: list[dict]) -> str:
        scored_docs = []
        for doc in documents:
            relevance = self._compute_relevance(query, doc["content"])
            scored_docs.append((relevance, doc))

        scored_docs.sort(reverse=True)
        selected = [
            doc for score, doc in scored_docs
            if score > self.threshold
        ]

        return self._format_selected(selected)

    def _compute_relevance(self, query: str, content: str) -> float:
        query_words = set(query.lower().split())
        content_words = set(content.lower().split())
        intersection = query_words & content_words
        return len(intersection) / max(len(query_words), 1)

    def _format_selected(self, docs: list[dict]) -> str:
        sections = []
        for doc in docs:
            sections.append(doc["content"])
        return "\n\n".join(sections)


class LLMScoringCompressor:
    def __init__(self, scoring_model):
        self.model = scoring_model

    def compress(self, query: str, context: str, target_ratio: float = 0.5) -> str:
        chunks = self._split_into_chunks(context)
        scored = []

        for chunk in chunks:
            score = self.model.score_relevance(query, chunk)
            scored.append((score, chunk))

        scored.sort(reverse=True)
        target_len = int(len(context) * target_ratio)
        selected = []
        current_len = 0

        for score, chunk in scored:
            chunk_len = len(chunk)
            if current_len + chunk_len <= target_len:
                selected.append(chunk)
                current_len += chunk_len

        return "\n".join(selected)
```

### 4. Summarization-Based Compression
Use an LLM to summarize context before passing to the main task.

```python
class SummarizationCompressor:
    def __init__(self, summarizer_model):
        self.summarizer = summarizer_model

    def compress_conversation(self, messages: list[dict], max_tokens: int = 500) -> str:
        full_text = "\n".join(m["content"] for m in messages)

        if self.count_tokens(full_text) <= max_tokens:
            return full_text

        summary_prompt = f"""
Summarize this conversation in under {max_tokens} tokens.
Keep all important facts, decisions, and action items.

Conversation:
{full_text}

Summary:
"""
        return self.summarizer.generate(summary_prompt)

    def compress_document(self, document: str, query: str, max_chars: int = 2000) -> str:
        if len(document) <= max_chars:
            return document

        prompt = f"""
Given this question: {query}

Summarize the following document in under {max_chars} characters.
Keep ONLY information relevant to answering the question.

Document: {document}

Relevant Summary:
"""
        return self.summarizer.generate(prompt)
```

### 5. Structured Output Compression
Replace verbose natural language with structured formats.

```python
class StructuredCompressor:
    def compress_to_json(self, context: dict) -> str:
        compact = {
            "facts": context.get("facts", []),
            "entities": {
                name: {"t": info.get("type"), "p": info.get("properties", {})}
                for name, info in context.get("entities", {}).items()
            },
            "history": [
                {"r": h["role"][:3], "c": h["content"][:200]}
                for h in context.get("history", [])
            ],
        }
        return json.dumps(compact, separators=(",", ":"))

    def decompress_from_json(self, compressed: str) -> dict:
        data = json.loads(compressed)
        return {
            "facts": data.get("facts", []),
            "entities": {
                name: {"type": v["t"], "properties": v.get("p", {})}
                for name, v in data.get("entities", {}).items()
            },
            "history": [
                {"role": {"use": "user", "ass": "assistant", "sys": "system"}.get(h["r"], h["r"]),
                 "content": h["c"]}
                for h in data.get("history", [])
            ],
        }
```

## Evaluation

### Quality Metrics
```python
class CompressionEvaluator:
    def evaluate(self, original: str, compressed: str, task_output: dict) -> dict:
        return {
            "compression_ratio": len(compressed) / max(len(original), 1),
            "token_savings": self._count_tokens(original) - self._count_tokens(compressed),
            "task_accuracy": task_output.get("accuracy", 0),
            "task_completeness": task_output.get("completeness", 0),
            "information_retention": self._compute_information_retention(original, compressed),
        }

    def _compute_information_retention(self, original: str, compressed: str) -> float:
        original_entities = self._extract_entities(original)
        compressed_entities = self._extract_entities(compressed)
        if not original_entities:
            return 1.0
        retained = original_entities & compressed_entities
        return len(retained) / len(original_entities)
```

### A/B Testing Setup
```python
class CompressionABTest:
    def __init__(self, control_compressor, variant_compressor):
        self.control = control_compressor
        self.variant = variant_compressor

    def run_test(self, prompts: list[str], task_evaluator, sample_ratio: float = 0.1):
        results = {"control": [], "variant": []}

        for i, prompt in enumerate(prompts):
            is_variant = hash(prompt) % 100 < sample_ratio * 100
            compressor = self.variant if is_variant else self.control
            compressed = compressor.compress(prompt)

            task_result = task_evaluator(prompt, compressed)
            results["variant" if is_variant else "control"].append({
                "original_tokens": self.count_tokens(prompt),
                "compressed_tokens": self.count_tokens(compressed),
                "quality_score": task_result["quality"],
                "compression_ratio": len(compressed) / len(prompt),
            })

        return self._analyze_results(results)
```

## Strategy Selection Guide

| Strategy | Compression | Quality Impact | Use Case |
|----------|------------|----------------|----------|
| Manual rewrite | 40-70% | Minimal | System prompts, few-shot templates |
| LLMLingua | 40-60% | Low | Long context, RAG inputs |
| Selective context | 50-80% | Medium | Multi-document retrieval |
| Summarization | 60-90% | Medium-High | Conversation history, long docs |
| Structured output | 70-90% | Low | Data-heavy contexts |

## Key Points
- Target 40-60% compression for first implementation, optimize from there
- Evaluate compression quality on task accuracy, not just token savings
- Combine multiple strategies: manual + selective + summarization
- A/B test compression before rolling out to production
- System prompts benefit most from manual rewrite
- Retrieved documents benefit from selective + LLMLingua
- Conversation history benefits from summarization
- Always preserve key entities, numbers, and relationships
- Monitor for quality degradation per compression strategy
- Different tasks tolerate different compression levels
