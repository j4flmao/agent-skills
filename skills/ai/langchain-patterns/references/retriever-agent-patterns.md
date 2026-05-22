# Retriever & Agent Patterns

## Retriever Strategies

### MultiQueryRetriever
Generates N variations of the input query, retrieves for each, unions results. Best for ambiguous or under-specified queries.

```python
from langchain.retrievers import MultiQueryRetriever

retriever = MultiQueryRetriever.from_llm(
    retriever=base_retriever,
    llm=llm,
    include_original=True,
    parser_key="queries"  # structured output
)
# N=3 is minimum. N=5 for high-ambiguity queries.
# Deduplication: use include_original=True and let union handle it.
```

### EnsembleRetriever
Weighted combination of multiple retrievers. Weights must sum to 1.0.

```python
from langchain.retrievers import EnsembleRetriever

retriever = EnsembleRetriever(
    retrievers=[dense_retriever, bm25_retriever],
    weights=[0.5, 0.5]
)
```

Adjust weights based on corpus: more semantic → dense-heavy, more keyword → sparse-heavy.

### ContextualCompressionRetriever
Compress each retrieved document using LLM or embedding-based filter. Reduces noise and token usage.

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor

compressor = LLMChainExtractor.from_llm(llm)
retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=base_retriever
)
```

### ParentDocumentRetriever
Retrieve small child chunks but return their parent documents for full context. Best for QA on long documents.

```python
retriever = ParentDocumentRetriever(
    vectorstore=vectorstore,
    docstore=docstore,
    child_splitter=child_splitter,
    parent_splitter=parent_splitter
)
```

## Agent Patterns

### Tool-Calling Agent (Recommended)
Leverages LLM native tool-calling API. Fast, structured, supports parallel tool calls.

```python
from langchain.agents import create_tool_calling_agent
from langchain.agents import AgentExecutor

agent = create_tool_calling_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
```

### ReAct Agent
Reasoning → Acting → Observation loop. Use when LLM lacks native tool-calling.

```python
from langchain.agents import create_react_agent

agent = create_react_agent(llm, tools, react_prompt_template)
```

### Custom Agent
Subclass `BaseSingleActionAgent` for complex routing logic, multi-step planning, or conditional tool use.

```python
from langchain.agents import BaseSingleActionAgent

class MyAgent(BaseSingleActionAgent):
    def plan(self, intermediate_steps, **kwargs):
        # Custom decision logic
        agent_action = ...
        return agent_action
```

## Tool Definition

```python
from langchain.tools import tool, StructuredTool

@tool
def search(query: str, max_results: int = 5) -> str:
    """Search the knowledge base for relevant information."""
    return vectorstore.similarity_search(query, k=max_results)

# Structured tool for complex inputs
tool = StructuredTool.from_function(
    func=my_function,
    name="my_tool",
    description="Description for LLM routing",
    args_schema=MyInputSchema
)
```

Tool requirements: name (unique, descriptive), description (critical for LLM routing), args_schema (typed parameters), error handling (return structured errors).

## Agent Executor Configuration

```python
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    max_iterations=15,
    max_execution_time=30,
    early_stopping_method="generate",
    handle_parsing_errors=True,
    return_intermediate_steps=True
)
```

## Memory with Agents

```python
from langchain.memory import ConversationBufferMemory

memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True,
    output_key="output"
)
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    memory=memory,
    max_iterations=15
)
```
