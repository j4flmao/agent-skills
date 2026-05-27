---
name: ai-langchain-patterns
description: >
  Use this skill when working with LangChain, LlamaIndex, chains, LCEL, retrievers, agents, tools, callbacks, Runnable interface, document loaders, text splitters, vector stores, memory, or LangSmith.
  This skill enforces: LCEL composition, retriever strategy selection, agent architecture, memory management, document pipeline design, streaming configuration.
  Do NOT use for: prompt engineering, fine-tuning, model evaluation, vector database operations, non-LangChain frameworks.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ai, langchain, framework, phase-11]
---

# LangChain Patterns Agent

## Purpose
Designs LangChain architectures with LCEL pipelines, multi-strategy retrieval, tool-calling agents, memory management, and streaming — production-grade LLM chains.

## Agent Protocol

### Trigger
User request includes: LangChain, LlamaIndex, chains, LCEL, retriever, agent, tool, callback, Runnable, document loader, text splitter, vector store, memory, LangSmith, deep LangChain patterns.

### Protocol
1. Clarify task type (RAG, agent, chain, tool-use) and LLM provider.
2. Select LCEL composition pattern (sequence, parallel, streaming).
3. Design retriever strategy (base, multi-query, ensemble, compression).
4. Choose agent type (tool-calling, ReAct, custom) and define tools.
5. Configure memory (conversation buffer, summary, entity).
6. Set up document pipeline (loaders, splitters, transformers).
7. Wire streaming and event handlers.

## Output
LangChain architecture with chain/retriever/agent patterns, memory strategy, streaming setup.

### Response Format
```
## LangChain Architecture
### LCEL Pipeline
Type: {RunnableSequence/RunnableParallel/RunnableBranch}
Steps: [{step1}, {step2}, ...]
Streaming: {async/event handlers} | Batch Size: {N}

### Retriever
Strategy: {base/multi-query/ensemble/compression}
Retrievers: [{type, top-K, params}]
Final Top-K: {N}

### Agent
Type: {tool-calling/ReAct/custom}
Tools: [{name, description, schema}]
Max Iterations: {N} | Max Execution Time: {seconds}

### Memory
Type: {conversation/summary/buffer}
Window Size: {N turns} | Summary LLM: {model}
Entity Store: {enabled/disabled}

### Document Pipeline
Loaders: [{source, type}]
Splitter: {strategy} | Chunk Size: {tokens}
Transformer: {type, params}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] LCEL pipeline uses RunnableSequence/RunnableParallel/RunnableBranch as appropriate.
- [ ] Retriever strategy matches data distribution and query patterns.
- [ ] Agent tools have validated schemas and error handling.
- [ ] Memory strategy bounds token consumption.
- [ ] Document pipeline handles source heterogeneity.
- [ ] Streaming is wired for production (async generators or event handlers).
- [ ] Error handling and retry logic are specified.

## Workflow

### Step 1: LCEL Composition
Use `RunnableSequence` for linear pipelines. Use `RunnableParallel` for fan-out (e.g., retrieve + query decomposition). Use `.assign()` to add computed fields mid-pipeline. Use `.with_config()` for per-call config. Bind runtime arguments with `.bind()`.

```python
# RunnableSequence
chain = RunnableSequence(steps=[retriever, prompt, llm, output_parser])

# RunnableParallel with .assign()
chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)
```

### Step 2: Retriever Patterns
- **Base retriever**: Simple vector store similarity search.
- **MultiQueryRetriever**: Generate N query variants, retrieve for each, union results. Best for ambiguous queries.
- **EnsembleRetriever**: Weighted combination of multiple retrievers (dense + BM25). Set weights by corpus characteristics.
- **ContextualCompressionRetriever**: Compress retrieved docs with LLM or embedding filter. Reduces noise.
- **ParentDocumentRetriever**: Retrieve small chunks but return parent documents for full context.

### Step 3: Agent Patterns
- **Tool-calling agent (recommended)**: LLM native tool-calling API. Best for structured tool use.
- **ReAct agent**: Reasoning + acting loop. Use when LLM lacks native tool-calling.
- **Custom agent**: Subclass BaseSingleActionAgent. For complex decision logic.

Tools defined with `@tool` decorator or `Tool` dataclass. Include name, description, args schema, and error handling. Use tool description for routing.

### Step 4: Memory
- **ConversationBufferMemory**: Full message history. Bounded by token limit.
- **ConversationSummaryMemory**: LLM-generated summary of past turns. Scales to long conversations.
- **ConversationBufferWindowMemory**: Last N messages. Fixed memory budget.
- **Entity memory**: Tracks entities across conversation. Combine with summary for hybrid.
- **Postgres/Momento/Redis backing**: Persistent memory for long-running agents.

### Step 5: Document Operations
Loaders: DirectoryLoader, PyPDFLoader, S3FileLoader, WebBaseLoader, SlackLoader.
Splitters: RecursiveCharacterTextSplitter (default), Language-specific (Python, JS, Markdown).
Transformers: Metadata extraction, embedding generation, document compression.

### Step 6: Streaming
Implement `astream_events()` for LangChain v0.2+. Use `astream_log()` for older versions. Stream intermediate steps for agents. Use `CallbackHandler` for custom streaming output.

```python
async for event in chain.astream_events(input, version="v2"):
    if event["event"] == "on_chat_model_stream":
        yield event["data"]["chunk"]
```

### Step 7: Callbacks & LangSmith
Wire `LangChainTracer` for LangSmith observability. Use `ConsoleCallbackHandler` for debugging. Implement custom `BaseCallbackHandler` for metrics. Log token usage, latency, and result quality per run.

## Rules
- Use RunnableParallel for independent branches, RunnableSequence for dependent steps.
- Always use .assign() over manual dict construction in LCEL.
- MultiQueryRetriever with N=3 is the minimum viable for ambiguous queries.
- EnsembleRetriever weights must sum to 1.0.
- Agents must have a max iteration limit to prevent infinite loops.
- Memory must have a token limit to avoid context overflow.
- Streaming is mandatory for chat applications.

## References
  - references/callback-streaming.md — Callbacks and Streaming
  - references/document-pipeline.md — Document Pipeline
  - references/langchain-memory-persistence.md — LangChain Memory Persistence
  - references/langchain-patterns-advanced.md — Langchain Patterns Advanced Topics
  - references/langchain-patterns-fundamentals.md — Langchain Patterns Fundamentals
  - references/langchain-production.md — LangChain Production Deployment
  - references/langchain-testing.md — LangChain Testing
  - references/lcel-patterns.md — LCEL (LangChain Expression Language) Patterns
  - references/retriever-agent-patterns.md — Retriever & Agent Patterns
  - references/tool-integration.md — Tool Integration Patterns
## Handoff
For vector database setup, hand off to `ai-vector-databases`. For MCP tool integration, hand off to `ai-mcp-patterns`. For observability, hand off to `ai-ai-observability`.
