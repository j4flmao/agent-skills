---
name: LangChain Patterns
description: >
  Advanced architectural patterns and engineering practices for building robust LLM applications
  using LangChain. Covers LCEL, state management, agent architectures, and execution strategies.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags:
  - langchain
  - ai
  - architecture
  - patterns
  - agents
---

# LangChain Patterns

## Purpose
This skill defines the canonical standards, patterns, and methodologies for building advanced AI applications utilizing LangChain. It provides agents with the required architectural blueprints to assemble LangChain components—such as Language Models, Prompts, Output Parsers, Memory Buffers, Tools, and Agents—into cohesive, scalable, and resilient systems. The purpose is to ensure that all LangChain implementations adhere to high-performance, maintainable, and secure engineering standards while fully leveraging the capabilities of LangChain Expression Language (LCEL) and LangGraph.

## Core Principles
1. **Declarative Composition**: Embrace the LangChain Expression Language (LCEL) to compose chains in a declarative, readable, and highly optimized manner, favoring `prompt | model | parser` over procedural invocation.
2. **Stateless Operations with Externalized State**: Design core agent and chain logic to be stateless. Manage conversation state and execution memory via explicit memory buffers or persistent external state stores like LangGraph checkpoints.
3. **Robust Tool Calling and Validation**: Enforce rigorous typing and validation on all tool inputs using Pydantic schemas. Assume LLM outputs may be hallucinatory or malformed, and implement strict fallback parsing.
4. **Observable and Traceable Execution**: Integrate comprehensive tracing (e.g., LangSmith) into all components to monitor token usage, execution latency, and intermediate chain outputs for debugging and continuous evaluation.
5. **Graceful Degradation and Fallbacks**: Always design chains with fallback models and error-handling paths to maintain system availability during API outages, rate limits, or parse failures.

## Agent Protocol

### Triggers
- When the user requests to build a LangChain application.
- When an existing AI pipeline needs optimization using LCEL.
- When agentic workflows or tool-calling loops are being designed.

### Input Context Required
- **Use Case**: The objective of the AI application (e.g., RAG, ReAct Agent, Chatbot).
- **Target LLMs**: The primary and fallback models to be used (e.g., OpenAI GPT-4, Anthropic Claude).
- **Tools Needed**: The external APIs or functions the agent must access.

### Output Artifact
- A fully structured LangChain application architecture plan or implemented python module.

### Response Formats
```json
{
  "chain_design": {
    "type": "LCEL",
    "components": ["ChatPromptTemplate", "ChatOpenAI", "StrOutputParser"],
    "fallbacks": ["ChatAnthropic"]
  },
  "agent_type": "openai-tools",
  "memory_strategy": "ConversationBufferWindowMemory"
}
```

## Decision Matrix
```text
+---------------------------------------------------------+
|                  LANGCHAIN PATTERNS                     |
|                   DECISION MATRIX                       |
+---------------------------------------------------------+
       |
       v
Is it a multi-turn conversation requiring state?
/ Yes                                        \ No
v                                            v
Use LangGraph or MemoryBuffers             Use simple LCEL Chain
       |                                            |
       v                                            v
Does the AI need to take actions?          Do you need structured output?
/ Yes                     \ No             / Yes               \ No
v                         v                v                   v
Use AgentExecutor         Use RAG Chain    Use bind_tools()    StrOutputParser()
or Tool Calling           or standard      or JSON parser
Agent                     LLM Chain
```

## Detailed Architectural Overview

### Architecture Diagram
```text
+-------------------------------------------------------------------------+
|                      LANGCHAIN ENTERPRISE ARCHITECTURE                  |
+-------------------------------------------------------------------------+
|                                                                         |
|  +----------------+      +-----------------+      +------------------+  |
|  | User Interface | <--> | API Gateway /   | <--> | Agent Supervisor |  |
|  +----------------+      | Load Balancer   |      +------------------+  |
|                                                            |            |
|       +----------------------------------------------------+            |
|       |                                                    |            |
|  +----+----+       +-----------+      +------------+       |            |
|  | LCEL    | ----> | LLM Core  | <--- | Memory     |       |            |
|  | Router  |       | (GPT-4)   |      | Checkpoint |       |            |
|  +----+----+       +-----------+      +------------+       |            |
|       |                  |                                 |            |
|       v                  v                                 |            |
|  +---------+       +-----------+                           |            |
|  | Vector  |       | Tool      | <-------------------------+            |
|  | Store   |       | Executor  |                                        |
|  +---------+       +-----------+                                        |
|                                                                         |
+-------------------------------------------------------------------------+
```

### Lifecycle Diagram
```text
[Input] -> (Validation) -> (Prompt Formatting) -> (LLM Invocation) -> (Output Parsing) -> [Result]
               ^                                           |
               |-----------(Fallback Triggered)------------|
```

## Workflow Steps

### Phase 1: Requirements Analysis
1. Identify the core objective (e.g., Q&A, Task Automation, Data Extraction).
2. Determine the required context window and memory constraints.
3. Select appropriate base models and fallback models.
4. Draft the initial prompt templates required for the task.

### Phase 2: Component Selection
1. Choose the LCEL components (prompts, models, output parsers).
2. Select the memory buffer type (Window, Token-based, Summary).
3. Identify required retrievers or vector stores for RAG.
4. Define the schema for structured outputs using Pydantic.

### Phase 3: Tool and Agent Design
1. Define tools with clear descriptions and strongly typed inputs.
2. Select the agent architecture (e.g., ReAct, OpenAI Tools, Plan-and-Solve).
3. Bind tools to the LLM and implement the execution loop.
4. Set up the agent supervisor if routing across multiple agents is required.

### Phase 4: Implementation and Composition
1. Construct the prompt templates with input variables.
2. Chain the components using the `|` operator (LCEL).
3. Inject memory and tool execution layers.
4. Wrap the chain in an asynchronous or streaming interface if needed.

### Phase 5: Testing and Observability
1. Implement unit tests for individual tools and parsers.
2. Enable LangSmith tracing for the entire execution path.
3. Mock the LLM responses to test fallback mechanisms.
4. Evaluate chain performance against a golden dataset.

### Phase 6: Deployment and Optimization
1. Containerize the application and expose via an API (e.g., LangServe).
2. Implement request caching to reduce latency and costs.
3. Configure rate limits and timeout settings for the LLM calls.
4. Monitor production token usage and iteratively refine prompts.

## Extended Troubleshooting Guide

| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Chain returns raw JSON string instead of dict | Output parser missing or misconfigured | Append `JsonOutputParser()` to the LCEL chain. |
| Agent looping indefinitely | Tool description unclear or model ignoring output | Refine tool descriptions, set `max_iterations` on AgentExecutor. |
| RateLimitError from LLM API | Exceeded concurrency or token limits | Implement exponential backoff and add `.with_fallbacks()`. |
| Prompt context too large | Memory buffer accumulating too much history | Switch to `ConversationSummaryBufferMemory` or limit `k`. |
| Tool parsing error | Model generated arguments that don't match schema | Use Pydantic schemas strictly and implement retry parsers. |
| High time-to-first-token (TTFT) | Synchronous execution or large chain | Use asynchronous `.astream()` methods and optimize LCEL. |

## Complete Execution Scenario
```text
User Request: "Research LangChain patterns and summarize them."

[Trigger] -> Agent Supervisor
                  |
                  v
       +--------------------+
       | Plan & Solve Agent |
       +--------------------+
                  |
                  +--> (1) Tool: SearchWeb(query="LangChain patterns")
                  |
                  +--> (2) Tool: ReadDocumentation(url=...)
                  |
                  +--> (3) LLM: Synthesize Information
                  |
[Result] <--------+
```

## Rules and Guidelines
1. Always prefer LCEL syntax over legacy Chain classes.
2. Never expose raw API keys or secrets in prompt templates.
3. Ensure all custom tools have a robust docstring as this forms the LLM instructions.
4. Implement fail-safes for infinite agent loops (e.g., `max_iterations`).
5. Use asynchronous execution (`ainvoke`, `astream`) for all I/O bound operations.

## Reference Guides
For deep technical implementations, refer to the following comprehensive guides:
- [Architecture Patterns](references/architecture-patterns.md)
- [State Management](references/state-management.md)
- [Performance Optimization](references/performance-optimization.md)
- [Security Best Practices](references/security-best-practices.md)
- [Testing Strategies](references/testing-strategies.md)
- [Deployment Pipelines](references/deployment-pipelines.md)
- [Error Handling](references/error-handling.md)
- [Code Organization](references/code-organization.md)

## Handoff
If you need to transition to other skill areas, refer to:
- Prompt Engineering Skills
- Python Backend Development Skills

<!-- COMPRESSION_FOOTER: {"skill":"langchain-patterns","v":"2.0.0"} -->
