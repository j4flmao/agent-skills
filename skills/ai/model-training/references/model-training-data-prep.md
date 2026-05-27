# Model Training Data Preparation

## Overview
Training data quality is the single most important factor in fine-tuning success. Proper data preparation encompasses collection, cleaning, deduplication, formatting, and validation. Garbage in, garbage out applies doubly to LLM training.

## Data Collection

### Data Sources
```python
class DataCollector:
    def collect_from_sources(self, sources: list[dict]) -> list[dict]:
        all_data = []
        for source in sources:
            if source["type"] == "production":
                data = self.collect_production_traces(
                    source["days"],
                    source.get("filter", {}),
                    source.get("sample_rate", 0.1),
                )
            elif source["type"] == "synthetic":
                data = self.generate_synthetic(
                    source["template"],
                    source["count"],
                )
            elif source["type"] == "existing_dataset":
                data = self.load_dataset(source["path"])
            all_data.extend(data)
        return all_data

    def collect_production_traces(self, days: int, filters: dict, sample_rate: float) -> list[dict]:
        traces = self.query_traces(days_back=days)
        filtered = []
        for trace in traces:
            if trace.feedback_score >= filters.get("min_feedback", 3):
                if random.random() < sample_rate:
                    filtered.append({
                        "input": trace.input,
                        "output": trace.output,
                        "source": "production",
                        "quality_score": trace.feedback_score,
                        "timestamp": trace.timestamp.isoformat(),
                    })
        return filtered

    def generate_synthetic(self, template: str, count: int) -> list[dict]:
        data = []
        for i in range(count):
            prompt = template.format(
                topic=random.choice(TOPICS),
                style=random.choice(STYLES),
                complexity=random.choice(["simple", "medium", "complex"]),
            )
            response = self.llm.generate(prompt)
            data.append({
                "input": prompt,
                "output": response,
                "source": "synthetic",
                "generation_params": {"model": self.llm_model, "temperature": 0.7},
            })
        return data
```

## Cleaning Pipeline

### Text Cleaning
```python
class DataCleaner:
    def clean(self, examples: list[dict]) -> list[dict]:
        cleaned = []
        for ex in examples:
            text = ex.get("input", "") + " " + ex.get("output", "")
            if self.should_remove(text):
                continue
            cleaned.append({
                **ex,
                "input": self.clean_text(ex.get("input", "")),
                "output": self.clean_text(ex.get("output", "")),
            })
        return cleaned

    def should_remove(self, text: str) -> bool:
        if len(text.strip()) < 10:
            return True
        if self.contains_pii(text):
            return True
        if self.is_gibberish(text):
            return True
        return False

    def clean_text(self, text: str) -> str:
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'http\S+', '[URL]', text)
        text = re.sub(r'\S+@\S+\.\S+', '[EMAIL]', text)
        text = text.strip()
        return text

    def contains_pii(self, text: str) -> bool:
        import re
        patterns = [
            r'\b\d{3}-\d{2}-\d{4}\b',
            r'\b\d{16}\b',
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
        ]
        return any(re.search(p, text) for p in patterns)

    def is_gibberish(self, text: str) -> bool:
        words = text.split()
        if len(words) < 3:
            return True
        unique_ratio = len(set(words)) / len(words)
        return unique_ratio < 0.3
```

### Deduplication
```python
class DataDeduplicator:
    def __init__(self, similarity_threshold: float = 0.85):
        self.threshold = similarity_threshold
        self.seen_hashes = set()
        self.seen_embeddings = []

    def deduplicate(self, examples: list[dict]) -> list[dict]:
        unique = []
        for ex in examples:
            if self.is_exact_duplicate(ex):
                continue
            if self.is_semantic_duplicate(ex):
                continue
            unique.append(ex)
            self.add_to_index(ex)
        return unique

    def is_exact_duplicate(self, ex: dict) -> bool:
        content = f"{ex['input']}{ex['output']}"
        h = hashlib.sha256(content.encode()).hexdigest()
        if h in self.seen_hashes:
            return True
        self.seen_hashes.add(h)
        return False

    def is_semantic_duplicate(self, ex: dict, model=None) -> bool:
        if not self.seen_embeddings or not model:
            return False
        embed = model.encode(f"{ex['input']} {ex['output']}", normalize_embeddings=True)
        for existing in self.seen_embeddings:
            if np.dot(embed, existing) > self.threshold:
                return True
        return False
```

## Formatting

### Chat Template Formatting
```python
class ChatFormatter:
    def __init__(self, template: str):
        self.template = template

    def format_for_training(self, examples: list[dict]) -> list[dict]:
        formatted = []
        for ex in examples:
            messages = [
                {"role": "user", "content": ex["input"]},
                {"role": "assistant", "content": ex["output"]},
            ]
            formatted.append({
                "text": self.tokenizer.apply_chat_template(
                    messages,
                    tokenize=False,
                    add_generation_prompt=False,
                ),
                "messages": messages,
            })
        return formatted

    def format_for_conversation(self, conversation: list[dict]) -> str:
        return self.tokenizer.apply_chat_template(
            conversation,
            tokenize=False,
            add_generation_prompt=True,
        )
```

### Instruction Format
```python
INSTRUCTION_FORMATS = {
    "alpaca": {
        "template": "Below is an instruction...\n\n### Instruction:\n{instruction}\n\n### Response:\n{response}",
        "fields": ["instruction", "response"],
    },
    "sharegpt": {
        "template": None,
        "format": "conversation",
        "fields": ["conversations"],
    },
    "chatml": {
        "template": "<|im_start|>user\n{input}<|im_end|>\n<|im_start|>assistant\n{output}<|im_end|>",
        "fields": ["input", "output"],
    },
}
```

## Quality Filtering

### Scoring and Filtering
```python
class QualityFilter:
    def __init__(self, scoring_model):
        self.model = scoring_model

    def score_examples(self, examples: list[dict]) -> list[dict]:
        scored = []
        for ex in examples:
            scores = {
                "relevance": self.score_relevance(ex),
                "coherence": self.score_coherence(ex),
                "completeness": self.score_completeness(ex),
                "instruction_compliance": self.score_compliance(ex),
            }
            ex["quality_scores"] = scores
            ex["overall_score"] = statistics.mean(scores.values())
            scored.append(ex)
        return scored

    def filter_by_threshold(self, examples: list[dict], threshold: float = 0.7) -> list[dict]:
        return [ex for ex in examples if ex.get("overall_score", 0) >= threshold]

    def stratified_sample(self, examples: list[dict], n: int) -> list[dict]:
        categories = defaultdict(list)
        for ex in examples:
            cat = ex.get("category", "general")
            categories[cat].append(ex)

        sampled = []
        per_cat = n // max(len(categories), 1)
        for cat, items in categories.items():
            items.sort(key=lambda x: x.get("overall_score", 0), reverse=True)
            sampled.extend(items[:per_cat])
        return sampled
```

## Dataset Statistics

```python
class DatasetStats:
    def compute(self, examples: list[dict]) -> dict:
        input_lengths = [len(str(ex.get("input", ""))) for ex in examples]
        output_lengths = [len(str(ex.get("output", ""))) for ex in examples]
        return {
            "count": len(examples),
            "avg_input_length": statistics.mean(input_lengths),
            "avg_output_length": statistics.mean(output_lengths),
            "p95_input_length": np.percentile(input_lengths, 95),
            "p95_output_length": np.percentile(output_lengths, 95),
            "max_input_length": max(input_lengths),
            "max_output_length": max(output_lengths),
            "category_distribution": dict(Counter(ex.get("category", "unknown") for ex in examples)),
            "source_distribution": dict(Counter(ex.get("source", "unknown") for ex in examples)),
        }
```

## Key Points
- Data quality matters more than quantity for fine-tuning
- Remove PII, gibberish, and low-quality examples
- Deduplicate at exact and semantic levels
- Format data to match the target model's chat template
- Score examples for relevance, coherence, completeness
- Filter by quality threshold (0.7+ recommended)
- Balance categories in training data
- Compute dataset statistics before training
- Validate format with a small test run first
- Track data lineage: source, collection date, processing steps
