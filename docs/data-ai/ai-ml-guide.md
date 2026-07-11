# AI/ML Skills Guide

## Overview
The AI/ML skill set covers the end-to-end lifecycle of AI-powered features: prompt engineering, RAG patterns, vector databases, LLM operations, AI agents, and evaluation. These skills are designed to compose together for complex AI workflows.

## Skill Map

| Skill | When to Use | Compose With |
|---|---|---|
| `ai/prompt-engineering` | Crafting system prompts, few-shot examples, output formatting | rag-patterns, llm-ops |
| `ai/rag-patterns` | Building retrieval-augmented generation pipelines | vector-databases, prompt-engineering |
| `ai/vector-databases` | Chunking, embedding, indexing, and similarity search | rag-patterns, ai-evals |
| `ai/llm-ops` | Model selection, cost tracking, latency optimization, guardrails | all AI skills |
| `ai/ai-agents` | Multi-step agentic workflows, tool use, memory, orchestration | rag-patterns, prompt-engineering |
| `ai/ai-evals` | Test datasets, metrics, regression testing, human evaluation | all AI skills |

## Decision Tree

```
Goal: Add AI to a feature?
├── Simple Q&A or classification → prompt-engineering
├── Answer over custom data → RAG (rag-patterns + vector-databases)
├── Multi-step autonomous workflow → ai-agents (+ RAG if external data)
├── Production deployment → llm-ops (+ evals)
└── Quality assurance → ai-evals
```

## Composition Patterns

### RAG Application
rag-patterns (retrieval strategy) → vector-databases (chunking, embedding, indexing) → prompt-engineering (context formatting, answer generation) → ai-evals (accuracy, relevance, hallucination rate)

### AI Agent Application
prompt-engineering (system prompt, tool descriptions) → ai-agents (tool execution, memory, planning) → rag-patterns (if agent needs external context) → llm-ops (cost tracking, rate limiting) → ai-evals (task completion rate, tool use accuracy)

## ML Skills Overview

The `ml/` category covers classical machine learning, deep learning, and MLOps: experiment tracking, feature engineering, model evaluation, hyperparameter tuning, model serving, and domain-specific tasks (NLP, CV, time-series, recommendation, anomaly detection).

| Skill | When to Use | Compose With |
|---|---|---|
| `ml/experiment-tracking` | Logging params, metrics, artifacts; model registry versioning | ml/classical-ml, ml/deep-learning, ml/model-evaluation |
| `ml/feature-engineering` | Encoding, scaling, feature selection / extraction | ml/classical-ml, ml/feature-store |
| `ml/feature-store` | Online/offline feature serving, point-in-time joins | ml/feature-engineering, ml/model-serving |
| `ml/classical-ml` | scikit-learn / XGBoost / LightGBM pipelines | ml/feature-engineering, ml/hyperparameter-tuning, ml/model-evaluation |
| `ml/deep-learning` | PyTorch / TensorFlow neural networks (CNN, RNN, Transformer) | ml/experiment-tracking, ml/hyperparameter-tuning, ml/model-serving |
| `ml/hyperparameter-tuning` | Optuna / Ray Tune / Hyperopt sweep configuration | ml/classical-ml, ml/deep-learning, ml/experiment-tracking |
| `ml/model-evaluation` | Metrics, CV strategies, bias-variance, significance tests | all ml/ skills |
| `ml/model-interpretability` | SHAP / LIME / permutation importance | ml/classical-ml, ml/deep-learning |
| `ml/model-serving` | TorchServe, BentoML, Ray Serve, KServe deployment | ml/experiment-tracking, ml/feature-store, ml/pipeline |
| `ml/ml-pipeline` | Kubeflow / TFX / SageMaker pipeline orchestration | all ml/ skills |
| `ml/nlp` | spaCy / HuggingFace pipelines, text classification, fine-tuning | ml/feature-engineering, ml/deep-learning |
| `ml/computer-vision` | Image classification, object detection, segmentation | ml/deep-learning, ml/model-serving |
| `ml/recommender` | Collaborative filtering, two-tower, hybrid recommenders | ml/feature-engineering, ml/model-evaluation, ml/model-serving |
| `ml/time-series` | ARIMA, Prophet, LSTM forecasting, temporal CV | ml/feature-engineering (tsfresh), ml/model-evaluation |
| `ml/anomaly-detection` | Isolation Forest, autoencoder, statistical anomaly detection | ml/time-series, ml/model-evaluation |

## Decision Flow: ai/ vs ml/

```
Goal involves machine-learned models?
├── Yes → ml/ skills
│   ├── Tabular/structured data → classical-ml (XGBoost, scikit-learn)
│   ├── Unstructured high-dim data → deep-learning (CNN, RNN, Transformer)
│   ├── Text/language → nlp (spaCy + HuggingFace)
│   ├── Images → computer-vision (YOLO, ResNet)
│   ├── Recommendations → recommender (collaborative filtering)
│   └── Forecasting → time-series (Prophet, ARIMA)
│
├── Yes, but using a pre-trained LLM → ai/ skills
│   ├── Simple Q&A or classification → prompt-engineering
│   ├── Answer over custom data → rag-patterns + vector-databases
│   ├── Multi-step autonomous workflow → ai-agents + prompt-engineering
│   ├── Fine-tuning a foundation model → model-training
│   ├── Multimodal (image+text) → multimodal
│   ├── Cost reduction → ai-cost-optimization
│   ├── Safety & guardrails → ai-safety
│   ├── Observability → ai-observability
│   ├── Testing/evals → ai-testing + ai-evals
│   ├── LangChain/LlamaIndex → langchain-patterns
│   ├── MCP servers → mcp-patterns
│   └── Embedding strategy → embeddings
│
└── No → see appropriate category (backend, data, devops, etc.)
```

## ML Composition Pipeline

```
experiment-tracking → feature-engineering → classical-ml / deep-learning
  → hyperparameter-tuning → model-evaluation → model-interpretability
  → ml-pipeline → model-serving
```

Each step feeds the next. `ml-pipeline` orchestrates the full chain.

## How AI and ML Fit Together

```
Data → ml/feature-engineering → ml/classical-ml (embedding model)
  → ai/embeddings → ai/vector-databases → ai/rag-patterns → ai/prompt-engineering
```

In practice, AI and ML skills often compose across categories:
- **ML embeddings → AI RAG**: train an embedding model (ml/deep-learning), index vectors (ai/vector-databases), build RAG (ai/rag-patterns)
- **ML predictions → AI agent**: serve a classifier (ml/model-serving), then route decisions via ai/ai-agents
- **AI evals feed ML tuning**: eval results (ai/ai-evals) identify failure modes → improve feature engineering (ml/feature-engineering) or retrain (ml/hyperparameter-tuning)
- **AI guardrails + ML serving**: ai/ai-safety (content moderation) before ml/model-serving (production inference)

## Quick Reference: All ai/ + ml/ Skills

| Skill | Category | Purpose |
|---|---|---|
| `ai/prompt-engineering` | LLM Interaction | System prompts, few-shot, output formatting |
| `ai/rag-patterns` | LLM Interaction | Retrieval-augmented generation pipelines |
| `ai/vector-databases` | LLM Infrastructure | Chunking, embedding, indexing, similarity search |
| `ai/llm-ops` | LLM Infrastructure | Model selection, cost, latency, guardrails |
| `ai/ai-agents` | Agent Systems | Multi-step tool use, memory, orchestration |
| `ai/ai-evals` | Quality | Evaluation datasets, metrics, regression testing |
| `ai/ai-cost-optimization` | Optimization | Token budgets, caching, quantization, model routing |
| `ai/ai-testing` | Quality | LLM regression tests, quality gates, golden datasets |
| `ai/ai-safety` | Safety | Red teaming, guardrails, bias detection, alignment |
| `ai/ai-observability` | Observability | Tracing, monitoring, cost attribution, feedback |
| `ai/embeddings` | LLM Infrastructure | Embedding model selection, training, quantization |
| `ai/multimodal` | Advanced | Vision-language models, multimodal RAG |
| `ai/langchain-patterns` | Framework | LangChain / LlamaIndex chains, agents, LCEL |
| `ai/mcp-patterns` | Protocol | Model Context Protocol servers and clients |
| `ai/model-training` | Training | LoRA/QLoRA fine-tuning, SFT, DPO/RLHF |
| `ml/experiment-tracking` | MLOps | MLflow, W&B run logging, model registry |
| `ml/feature-engineering` | Data Prep | Encoding, scaling, extraction, selection |
| `ml/feature-store` | MLOps | Feast/Tecton online/offline feature serving |
| `ml/classical-ml` | Modeling | scikit-learn, XGBoost, LightGBM, ensembles |
| `ml/deep-learning` | Modeling | PyTorch, TensorFlow, CNN, RNN, Transformers |
| `ml/hyperparameter-tuning` | Optimization | Optuna, Ray Tune, Bayesian/random search |
| `ml/model-evaluation` | Quality | Metrics, CV, bias-variance, significance tests |
| `ml/model-interpretability` | Explainability | SHAP, LIME, permutation importance |
| `ml/model-serving` | Deployment | TorchServe, BentoML, KServe, Ray Serve |
| `ml/ml-pipeline` | MLOps | Kubeflow, TFX, SageMaker pipeline orchestration |
| `ml/nlp` | Domain | spaCy, HuggingFace, text classification, fine-tuning |
| `ml/computer-vision` | Domain | Image classification, detection, segmentation |
| `ml/recommender` | Domain | Collaborative filtering, two-tower, hybrid |
| `ml/time-series` | Domain | ARIMA, Prophet, LSTM, temporal CV |
| `ml/anomaly-detection` | Domain | Isolation Forest, autoencoder, statistical methods |

## Best Practices
- Always define evaluation criteria before building — you cannot measure what you did not define
- RAG requires careful chunking strategy — chunk size, overlap, and embedding model choice directly impact retrieval quality
- Agents should have bounded tool sets — too many tools degrade decision quality
- Guardrails (PII detection, content moderation, rate limits) are mandatory for production — not optional
- Test with representative data, not synthetic-only — real user queries surface edge cases no evaluation set catches
- Cost-per-query should be tracked from day one — a successful AI feature can become unexpectedly expensive
- Prompt changes are the highest-risk, lowest-cost changes — always version and evaluate prompt updates
- ML pipeline should include data validation and model validation gates before deployment
- Distinguish between ML (training numeric models) and AI (orchestrating LLM interactions) — they solve different problems with different tooling

## Tools Covered
- **Vector DBs**: Pinecone, Weaviate, Qdrant, Milvus, pgvector
- **LLM Providers**: OpenAI, Anthropic, Google, AWS Bedrock, Azure OpenAI, self-hosted (vLLM, TGI)
- **Frameworks**: LangChain, LlamaIndex, Haystack, AutoGen, CrewAI
- **Eval**: LangSmith, Weights & Biases, Arize, LangFuse, custom eval suites, human review
- **Guardrails**: Guardrails AI, NVIDIA NeMo Guardrails, custom PII filters
- **ML Frameworks**: PyTorch, TensorFlow, JAX, scikit-learn, XGBoost, LightGBM, CatBoost
- **ML Platforms**: MLflow, Weights & Biases, Neptune, Optuna, Ray, Kubeflow, TFX
- **ML Serving**: TorchServe, BentoML, Ray Serve, KServe, Seldon Core

## Skills List
- `skills/ai/prompt-engineering/SKILL.md`
- `skills/ai/rag-patterns/SKILL.md`
- `skills/ai/vector-databases/SKILL.md`
- `skills/ai/llm-ops/SKILL.md`
- `skills/ai/ai-agents/SKILL.md`
- `skills/ai/ai-evals/SKILL.md`
- `skills/ai/ai-cost-optimization/SKILL.md`
- `skills/ai/ai-testing/SKILL.md`
- `skills/ai/ai-safety/SKILL.md`
- `skills/ai/ai-observability/SKILL.md`
- `skills/ai/embeddings/SKILL.md`
- `skills/ai/multimodal/SKILL.md`
- `skills/ai/langchain-patterns/SKILL.md`
- `skills/ai/mcp-patterns/SKILL.md`
- `skills/ai/model-training/SKILL.md`
- `skills/ml/experiment-tracking/SKILL.md`
- `skills/ml/feature-engineering/SKILL.md`
- `skills/ml/feature-store/SKILL.md`
- `skills/ml/classical-ml/SKILL.md`
- `skills/ml/deep-learning/SKILL.md`
- `skills/ml/hyperparameter-tuning/SKILL.md`
- `skills/ml/model-evaluation/SKILL.md`
- `skills/ml/model-interpretability/SKILL.md`
- `skills/ml/model-serving/SKILL.md`
- `skills/ml/ml-pipeline/SKILL.md`
- `skills/ml/nlp/SKILL.md`
- `skills/ml/computer-vision/SKILL.md`
- `skills/ml/recommender/SKILL.md`
- `skills/ml/time-series/SKILL.md`
- `skills/ml/anomaly-detection/SKILL.md`
