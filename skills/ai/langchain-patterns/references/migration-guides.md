# Migration Guides

## v0.1 → v0.2 (LCEL Introduction)

### Key Changes
- LCEL introduced as the primary composition API
- Legacy chains (`LLMChain`, `ConversationChain`) deprecated but still functional
- `Runnable` interface standardized across all components
- New streaming API with `astream_events`

### Migration Steps

**Step 1: Replace Legacy Chains with LCEL**

```python
# v0.1 (legacy)
from langchain.chains import LLMChain
from langchain.llms import OpenAI
from langchain.prompts import PromptTemplate

llm = OpenAI(model_name="gpt-3.5-turbo-instruct")
prompt = PromptTemplate.from_template("Tell me about {topic}")
chain = LLMChain(llm=llm, prompt=prompt)
result = chain.run(topic="Python")

# v0.2+ (LCEL)
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

llm = ChatOpenAI(model="gpt-3.5-turbo")
prompt = ChatPromptTemplate.from_template("Tell me about {topic}")
chain = prompt | llm | StrOutputParser()
result = chain.invoke({"topic": "Python"})
```

**Step 2: Update Imports**

```python
# v0.1
from langchain import PromptTemplate, OpenAI, LLMChain

# v0.2+
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
```

**Step 3: Replace `run()` with `invoke()`**

```python
# v0.1
chain.run(input="Hello")

# v0.2+
chain.invoke({"input": "Hello"})
```

**Step 4: Update Memory Integration**

```python
# v0.1
from langchain.memory import ConversationBufferMemory
memory = ConversationBufferMemory()

# v0.2+ (same API, but use with LCEL chains)
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain  # Still works but deprecated
# Better: use memory with custom LCEL via messages placeholder
```

**Step 5: Streaming**

```python
# v0.1 (callback-based)
class StreamHandler(BaseCallbackHandler):
    def on_llm_new_token(self, token, **kwargs):
        print(token)

# v0.2+ (async generator)
async for chunk in chain.astream({"topic": "Python"}):
    print(chunk)

# or astream_events for granular events
async for event in chain.astream_events(input, version="v2"):
    if event["event"] == "on_chat_model_stream":
        print(event["data"]["chunk"].content)
```

### Breaking Changes

| Component | v0.1 | v0.2+ |
|---|---|---|
| LLM class | `langchain.llms.OpenAI` | `langchain_openai.ChatOpenAI` |
| Prompt | `langchain.prompts.PromptTemplate` | `langchain_core.prompts.ChatPromptTemplate` |
| Chain API | `chain.run()` | `chain.invoke()` |
| Output | String | `AIMessage` (wrap with `StrOutputParser()`) |
| Packages | Single `langchain` | `langchain-core`, `langchain-community`, provider packages |
| Streaming | Callback-based | `astream` / `astream_events` |

---

## v0.2 → v0.3 (Package Restructuring)

### Key Changes
- Deprecated legacy chains (`LLMChain`, `RetrievalQA`, `ConversationChain`) fully removed
- Provider packages required (`langchain-openai`, `langchain-anthropic`, etc.)
- `langchain-community` for community loaders, vector stores, etc.
- `langchain-core` is the minimal base package
- New `langchain` package re-exported as thin wrapper

### Migration Steps

**Step 1: Install Provider Packages**

```bash
# v0.2
pip install langchain

# v0.3
pip install langchain langchain-core langchain-openai
# or for full install
pip install "langchain[all]"
```

**Step 2: Update Imports**

```python
# v0.2
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage
from langchain.document_loaders import PyPDFLoader

# v0.3
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from langchain_community.document_loaders import PyPDFLoader
```

**Step 3: Replace Removed Chains**

```python
# v0.2 (deprecated in 0.2, removed in 0.3)
from langchain.chains import RetrievalQA
qa = RetrievalQA.from_chain_type(llm=llm, retriever=retriever)

# v0.3 (LCEL equivalent)
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

prompt = ChatPromptTemplate.from_template(
    "Answer using context:\n{context}\n\nQuestion: {question}"
)
def format_docs(docs):
    return "\n\n".join(d.page_content for d in docs)

qa = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt | llm | StrOutputParser()
)
```

**Step 4: Update Callback Imports**

```python
# v0.2
from langchain.callbacks import StdOutCallbackHandler

# v0.3
from langchain_core.callbacks import StdOutCallbackHandler
```

**Step 5: Update Output Parsers**

```python
# v0.2
from langchain.schema import BaseOutputParser

# v0.3
from langchain_core.output_parsers import BaseOutputParser
```

**Step 6: Agent Migration**

```python
# v0.2 (deprecated)
from langchain.agents import initialize_agent, Tool, AgentType
agent = initialize_agent(tools, llm, agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION)

# v0.3 (recommended)
from langchain.agents import create_tool_calling_agent, AgentExecutor

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    ("placeholder", "{chat_history}"),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])
agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, max_iterations=10)
```

### Breaking Changes

| Component | v0.2 | v0.3 |
|---|---|---|
| Import path | `langchain.chat_models` | `langchain_openai` |
| Import path | `langchain.schema` | `langchain_core` |
| Import path | `langchain.vectorstores` | `langchain_community.vectorstores` |
| Legacy chains | Deprecated | Removed |
| Tool calling | `initialize_agent` | `create_tool_calling_agent` |
| Agent types | Enum (`AgentType.ZERO_SHOT_REACT`) | Function-based constructors |
| Package structure | Monolith | Modular (`core`, `community`, providers) |

---

## v0.3 → v1.0 (LangGraph Integration)

### Key Changes
- LangGraph recommended for complex agent workflows
- `create_tool_calling_agent` superseded by LangGraph's `create_react_agent`
- Checkpointing for durable agent execution
- Human-in-the-loop patterns with graph interrupts
- State-based agent management replacing `AgentExecutor`

### Migration Steps

**Step 1: Install LangGraph**

```bash
pip install langgraph
```

**Step 2: Replace AgentExecutor with LangGraph**

```python
# v0.3 (AgentExecutor)
from langchain.agents import create_tool_calling_agent, AgentExecutor

agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, max_iterations=10)
result = executor.invoke({"input": "Hello"})

# v1.0 (LangGraph)
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()
agent = create_react_agent(model=llm, tools=tools, checkpointer=checkpointer)
result = agent.invoke(
    {"messages": [HumanMessage(content="Hello")]},
    config={"configurable": {"thread_id": "session-1"}},
)
```

**Step 3: Add Checkpointing**

```python
# v0.3 — no built-in checkpointing
executor.invoke({"input": "Remember my name is Alice"})
executor.invoke({"input": "What is my name?"})

# v1.0 — automatic state persistence
from langgraph.checkpoint.postgres import PostgresSaver

conn_string = "postgresql://user:pass@localhost:5432/agents"
checkpointer = PostgresSaver.from_conn_string(conn_string)
agent = create_react_agent(model=llm, tools=tools, checkpointer=checkpointer)

# State persists across invocations with same thread_id
config = {"configurable": {"thread_id": "user-session-123"}}
agent.invoke({"messages": [HumanMessage(content="My name is Alice")]}, config=config)
agent.invoke({"messages": [HumanMessage(content="What is my name?")]}, config=config)
```

**Step 4: Human-in-the-Loop**

```python
# v0.3 — manual interrupt
import pdb

# v1.0 — LangGraph interrupt
from langgraph.types import interrupt

def human_review_step(state):
    result = llm_with_tools.invoke(state["messages"])
    tool_calls = result.tool_calls
    if tool_calls:
        # Pause execution, wait for approval
        decision = interrupt({"tool_calls": tool_calls})
        if not decision.get("approved"):
            return {"messages": [AIMessage(content="Action rejected by user.")]}
    return {"messages": [result]}

# Resume with approval
agent.invoke(None, config=config, interrupts=[{"approved": True}])
```

**Step 5: State Schema Migration**

```python
# v0.3 agent — implicit state
class AgentState(TypedDict):
    input: str
    chat_history: list
    agent_scratchpad: str
    intermediate_steps: list

# v0.3 + LangGraph — explicit state
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]  # LangGraph message merging
    next_agent: str
    is_final: bool
```

### Breaking Changes

| Component | v0.3 | v1.0 |
|---|---|---|
| Agent framework | AgentExecutor | LangGraph `create_react_agent` |
| State management | Dict per call | Typed state with reducers |
| Persistence | Manual (memory backends) | Built-in checkpointing |
| Human-in-loop | Manual interrupt | Native `interrupt`/`Command` API |
| Tool calling | `create_tool_calling_agent` | `create_react_agent(model=llm, tools=tools)` |
| Session isolation | Manual session_id | `thread_id` in config |
| Multi-agent | Manual orchestration | LangGraph subgraphs |

---

## Common Migration Pitfalls

### Pitfall 1: Mixing Package Versions

```python
# BAD: Mixed v0.2 and v0.3 imports
from langchain.chat_models import ChatOpenAI  # v0.2
from langchain_openai import ChatOpenAI as ChatOpenAI2  # v0.3

# GOOD: Consistent v0.3
from langchain_openai import ChatOpenAI
```

### Pitfall 2: Forgetting StrOutputParser

```python
# BAD: Returns AIMessage instead of string
chain = prompt | llm
result = chain.invoke({"topic": "Python"})
print(result)  # <AIMessage content="...">

# GOOD: Wrap with output parser
chain = prompt | llm | StrOutputParser()
result = chain.invoke({"topic": "Python"})
print(result)  # "Python is a programming language..."
```

### Pitfall 3: Missing Provider Package

```python
# BAD: ImportError
from langchain_openai import ChatOpenAI
# -> ModuleNotFoundError: No module named 'langchain_openai'

# GOOD: Install first
# pip install langchain-openai
```

### Pitfall 4: Wrong Runnable Methods

```python
# BAD: Using run() on LCEL chains
chain.run(topic="Python")

# GOOD: Using invoke()
chain.invoke({"topic": "Python"})
```

### Pitfall 5: Assuming Chat vs Completion Model Parity

```python
# BAD: ChatOpenAI expects messages, not raw text
llm = ChatOpenAI(model="gpt-4o")
result = llm.invoke("Hello")  # TypeError or unexpected behavior

# GOOD: Pass message list
result = llm.invoke([HumanMessage(content="Hello")])
# or use prompt template
chain = ChatPromptTemplate.from_template("{input}") | llm
result = chain.invoke({"input": "Hello"})
```

---

## Key Points

- Always pin LangChain versions in requirements: `langchain>=0.3,<0.4` for stable upgrades.
- Run `pip install "langchain[all]"` to get all provider packages for v0.3+.
- Replace `chain.run()` with `chain.invoke()` as the first migration step.
- Legacy chains (LLMChain, RetrievalQA) must be rewritten as LCEL pipelines.
- Provider-specific imports moved to dedicated packages (`langchain-openai`, etc.).
- Callback, schema, and output parser imports moved to `langchain_core`.
- LangGraph replaces AgentExecutor for agent workflows in v1.0.
- Checkpointing is built into LangGraph — no need for custom persistence.
- Human-in-the-loop workflows are native to LangGraph via `interrupt()`.
- Test each migration step incrementally; don't upgrade all components at once.
- Use `FakeListLLM` and `MockRetriever` to validate migrated chains before running with real models.
