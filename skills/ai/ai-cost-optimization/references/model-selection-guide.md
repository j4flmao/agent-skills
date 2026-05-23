# Model Selection Guide

## Capability Tiers

| Tier | Models | Best For | Cost/1M Tokens |
|------|--------|----------|---------------|
| Frontier | GPT-4o, Claude Opus, Gemini Ultra | Complex reasoning, code, creative | $10-30 input, $30-120 output |
| Mid | GPT-4o-mini, Claude Sonnet, Gemini Pro | General QA, summarization, RAG | $0.15-3 input, $0.60-15 output |
| Small | Llama-3-8B, Mistral-7B, Phi-3 | Classification, extraction, simple chat | $0.02-0.10 (self-hosted) |
| Embedding | text-embedding-3, BGE, Cohere | Vector search, clustering | $0.02-0.13/1M tokens |
| Vision | GPT-4o, Claude Vision, Gemini Pro Vision | Image analysis, document OCR | Base + image tokens |
| Audio | Whisper, Deepgram, ElevenLabs | Transcription, TTS | $0.006-0.03/minute |

## Selection Decision Tree

```
What's the task?
├── Simple classification / extraction
│   └── Use Small model (Llama-3-8B, Phi-3)
│       → <$1M tokens/day? Use API
│       → >$1M tokens/day? Self-host
│
├── General chat / RAG / summarization
│   ├── Cost-sensitive? → Mid model (4o-mini, Sonnet)
│   ├── Quality-critical? → Frontier model
│   └── Trade: 10x cost for ~15% quality gain
│
├── Complex reasoning / code generation
│   └── Frontier model required
│   └── Consider structured outputs for reliability
│
├── Image/video analysis
│   └── Multimodal model (GPT-4o, Claude Vision)
│   └── Pre-process images (compress, crop) to reduce cost
│
└── Batch processing
    └── Cheapest model that meets quality threshold
    └── Self-host for >100M tokens/day
```

## Cost-Per-Task Analysis

### Formula
```
cost_per_task = input_tokens × input_price + output_tokens × output_price
```

### Examples
| Task | Model | Input | Output | Cost/Task | 100k Tasks |
|------|-------|-------|--------|-----------|------------|
| Simple chat | GPT-4o-mini | 500 | 100 | $0.000135 | $13.50 |
| Simple chat | GPT-4o | 500 | 100 | $0.004 | $400 |
| RAG answer | GPT-4o-mini | 2000 | 200 | $0.00042 | $42 |
| RAG answer | GPT-4o | 2000 | 200 | $0.013 | $1,300 |
| Code review | Claude Opus | 8000 | 1000 | $0.37 | $37,000 |
| Classification | Llama-3-8B (self) | 300 | 20 | $0.000005 | $0.50 |

## Quality vs Cost Trade-offs

### Distillation
Use a frontier model to generate training data, then fine-tune a small model.

```
Cost per task:
  Frontier: $0.013 (100k → $1,300/day)
  Distilled: $0.00002 (100k → $2/day)
  Savings: 650x
```

### Cascade Strategy
```python
if simple_classifier(query) == "simple":
    return small_model(query)
else:
    return frontier_model(query)
```

Typical cascade: 70% routed to small model, 30% to large. 3x cost reduction with <1% quality loss.

## Model Cards

### Frontier Models (2026)
| Model | Context | Max Output | Knowledge Cutoff | Strengths |
|-------|---------|-----------|-----------------|-----------|
| GPT-4o | 128K | 16K | 2025-04 | Fast, multimodal, structured outputs |
| Claude Opus 4 | 200K | 8K | 2025-06 | Deep reasoning, long context, safety |
| Gemini Ultra 2 | 1M | 8K | 2025-05 | Massive context, multimodal, Google ecosystem |

### Mid-Range Models
| Model | Context | Max Output | Speed | Cost vs Frontier |
|-------|---------|-----------|-------|------------------|
| GPT-4o-mini | 128K | 16K | 2x | ~30x cheaper |
| Claude Sonnet 4 | 200K | 8K | 1.5x | ~10x cheaper |
| Gemini Pro 2 | 1M | 8K | 2x | ~15x cheaper |

### Local/Open Models
| Model | Size | Quantized VRAM | MTEB Quality | Licensing |
|-------|------|----------------|-------------|-----------|
| Llama-3.1-8B | 8B | 6 GB (4-bit) | Good | Llama 3.1 |
| Llama-3.1-70B | 70B | 40 GB (4-bit) | Excellent | Llama 3.1 |
| Mistral-3-7B | 7B | 5 GB (4-bit) | Good | Apache 2.0 |
| Qwen-2.5-72B | 72B | 42 GB (4-bit) | Excellent | Qwen |
| Phi-3.5-mini | 3.8B | 3 GB (4-bit) | Fair | MIT |

## Model Switching Criteria

Trigger a model downgrade when:
- Latency exceeds SLA by 2x for 5 consecutive minutes
- Cost exceeds daily budget by 20%
- Quality metrics remain above threshold on downgraded model

Trigger a model upgrade when:
- Task complexity exceeds small model capabilities (>20% error rate)
- User satisfaction drops below threshold for 7 days
- New model version shows 5%+ quality improvement on evals

## Vendor Selection

| Vendor | Strengths | Weaknesses | Best For |
|--------|-----------|------------|----------|
| OpenAI | Best structured outputs, tool use | Cost at scale, limited context | Agentic workflows |
| Anthropic | Long context, safety, reasoning | Slower, fewer integrations | Document analysis, code |
| Google | Massive context, multimodal | API stability, ecosystem lock | Video, long docs |
| Together/Azure | Many open models, competitive | Variable quality per model | Multi-model strategies |
| Self-hosted | Full control, lowest cost at scale | Ops overhead, GPU availability | >100M tokens/day sustained |
