# LangChain Patterns Fundamentals

## LangChain Architecture Overview

LangChain provides a framework for building LLM-powered applications through composable primitives. The core abstraction is the **Runnable** interface — every component (model, prompt, retriever, parser, tool) implements the same protocol, enabling uniform composition.

### Runnable Interface

```
.invoke(input)           → single synchronous call
.ainvoke(input)          → single async call
.batch(inputs)           → batch synchronous calls
.abatch(inputs)          → batch async calls
.stream(input)           → sync streaming
.astream(input)          → async streaming
.astream_events(input)   → async streaming with structured events
```

Every LangChain component implements these methods. This is the bedrock of LCEL.

---

## Core Components

### Chat Models

LangChain v0.3+ standardizes on `BaseChatModel`. Models consume message lists and return `AIMessage`.

```python
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

llm = ChatOpenAI(model="gpt-4o", temperature=0.7)
messages = [
    SystemMessage(content="You are a helpful assistant."),
    HumanMessage(content="What is RAG?"),
]
response = llm.invoke(messages)
print(response.content)

# Async
response = await llm.ainvoke(messages)

# Streaming
async for chunk in llm.astream(messages):
    print(chunk.content, end="")

# Batch
responses = llm.batch([messages, messages2])
```

#### Model Binding

```python
# Bind runtime args
llm.bind(stop=["\n\n"], temperature=0.3)

# Bind tool schemas for function calling
llm_with_tools = llm.bind_tools([search_tool_schema, calculator_schema])
```

### Prompt Templates

```python
from langchain_core.prompts import (
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder,
)

# Simple template
prompt = ChatPromptTemplate.from_template("Tell me about {topic}")

# Multi-message template
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert in {domain}."),
    ("human", "Explain {concept} in simple terms."),
])

# With placeholder for message sequences
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
])

# Few-shot
prompt = ChatPromptTemplate.from_messages([
    ("system", "Translate to French."),
    ("human", "Hello"),
    ("ai", "Bonjour"),
    ("human", "{text}"),
])
```

### Output Parsers

```python
from langchain_core.output_parsers import (
    StrOutputParser,
    JsonOutputParser,
    PydanticOutputParser,
    CommaSeparatedListOutputParser,
)

# Simple string
parser = StrOutputParser()

# JSON (no schema enforcement)
parser = JsonOutputParser()

# Pydantic (schema-enforced)
from pydantic import BaseModel, Field

class Person(BaseModel):
    name: str = Field(description="The person's name")
    age: int = Field(description="The person's age", ge=0, le=150)
    occupation: str | None = Field(default=None)

parser = PydanticOutputParser(pydantic_object=Person)

# In a chain
chain = prompt | llm | parser
result: Person = chain.invoke({"text": "John is 30 years old and is a developer"})
```

### Document Loaders

```python
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    CSVLoader,
    DirectoryLoader,
    WebBaseLoader,
    SitemapLoader,
)

# Single file
loader = PyPDFLoader("document.pdf")
docs = loader.load()

# Directory batch
loader = DirectoryLoader(
    "./data",
    glob="**/*.pdf",
    loader_cls=PyPDFLoader,
    show_progress=True,
    use_multithreading=True,
)

# Web scraping
loader = WebBaseLoader(
    "https://example.com",
    bs_kwargs={"parse_only": "main"},
)
```

### Text Splitters

```python
from langchain.text_splitter import (
    RecursiveCharacterTextSplitter,
    TokenTextSplitter,
    MarkdownHeaderTextSplitter,
    PythonCodeTextSplitter,
)

# Default: recursive on whitespace/punctuation
splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,
    separators=["\n\n", "\n", ".", " ", ""],
)

# Language-aware: Python
py_splitter = PythonCodeTextSplitter(chunk_size=256, chunk_overlap=30)

# Markdown with header preservation
md_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=[
        ("#", "H1"),
        ("##", "H2"),
        ("###", "H3"),
    ]
)

# Token-accurate (tiktoken)
token_splitter = TokenTextSplitter(
    model_name="gpt-4o",
    chunk_size=512,
    chunk_overlap=50,
)
```

### Vector Stores and Embeddings

```python
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS, Chroma

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# In-memory FAISS
vectorstore = FAISS.from_documents(documents, embeddings)

# Persistent Chroma
vectorstore = Chroma.from_documents(
    documents, embeddings, persist_directory="./chroma_db"
)

# Retriever from vectorstore
retriever = vectorstore.as_retriever(
    search_type="similarity",      # or "mmr", "similarity_score_threshold"
    search_kwargs={"k": 5},
)

# MMR for diversity
retriever = vectorstore.as_retriever(
    search_type="mmr",
    search_kwargs={"k": 5, "fetch_k": 20, "lambda_mult": 0.7},
)
```

---

## Chain Composition Patterns

### Linear Chain (RunnableSequence)

```python
# Pipe operator (preferred)
chain = prompt | llm | parser

# Explicit sequence
from langchain_core.runnables import RunnableSequence
chain = RunnableSequence(steps=[prompt, llm, parser])
```

### Parallel Execution (RunnableParallel)

```python
from langchain_core.runnables import RunnableParallel, RunnablePassthrough

chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | llm
    | parser
)

# assign() for incremental state
chain = (
    RunnablePassthrough()
    .assign(docs=lambda x: retriever.invoke(x["question"]))
    .assign(context=lambda x: format_docs(x["docs"]))
    | prompt | llm | parser
)
```

### Conditional Branching (RunnableBranch)

```python
from langchain_core.runnables import RunnableBranch

chain = RunnableBranch(
    (lambda x: "code" in x["query"].lower(), code_chain),
    (lambda x: "math" in x["query"].lower(), math_chain),
    general_chain,  # default
)
```

### Fallback Chains

```python
primary = llm_a | parser
fallback = llm_b | parser
robust_chain = primary.with_fallback(fallback)

# With retry
from openai import RateLimitError

chain = (prompt | llm).with_retry(
    retry_if_exception_type=(RateLimitError,),
    wait_exponential_jitter=True,
    stop_after_attempt=3,
)
```

---

## Basic RAG Pipeline

```python
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_template(
    "Answer based on context below:\n\n{context}\n\nQuestion: {question}"
)

def format_docs(docs):
    return "\n\n".join(d.page_content for d in docs)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

answer = rag_chain.invoke("What is the capital of France?")
```

---

## Basic Conversation Chain

```python
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory

memory = ConversationBufferMemory(return_messages=True)

conversation = ConversationChain(
    llm=llm,
    memory=memory,
    verbose=True,
)

resp1 = conversation.predict(input="Hi, I'm Alice.")
resp2 = conversation.predict(input="What's my name?")  # Remembers Alice
```

---

## LCEL vs Legacy Chains

| Aspect | Legacy Chains | LCEL |
|---|---|---|
| API | Class-based (LLMChain, RetrievalQA) | Runnable pipe API |
| Composition | Pre-defined subclasses | Arbitrary composition |
| Streaming | Limited support | Built-in astream_events |
| Parallelism | Manual threading | RunnableParallel |
| Type Safety | Dynamic dicts | Typed Runnables |
| Testing | Hard to mock | Easy with FakeListLLM |
| Status | Deprecated in v0.3 | Recommended |

**Migration** from legacy chains to LCEL:

```python
# Legacy
from langchain.chains import LLMChain
chain = LLMChain(llm=llm, prompt=prompt)

# LCEL equivalent
chain = prompt | llm | StrOutputParser()
```

---

## Config and Metadata

```python
chain = rag_chain.with_config(
    run_name="my-rag",
    tags=["production", "v2"],
    metadata={
        "user_id": user_id,
        "session_id": session_id,
        "environment": "prod",
    },
)

# Callbacks per invocation
from langchain.callbacks import StdOutCallbackHandler
result = chain.invoke(
    {"question": "Hello"},
    config={"callbacks": [StdOutCallbackHandler()],
            "run_name": "single-query"},
)
```

---

## Key Points

- Every component implements the Runnable interface — learn it once, use everywhere.
- Use `|` for linear chains, `RunnableParallel` for parallel branches, `RunnableBranch` for conditional logic.
- Chat models use message lists, not strings. Use prompt templates to construct messages.
- Output parsers convert raw LLM output to structured data — always use them.
- Vector stores provide the `as_retriever()` method for easy retrieval integration.
- Document loaders + splitters form the ingestion pipeline: load, split, embed, store.
- LCEL is the recommended API — legacy chains are deprecated but still used in existing codebases.
- Metadata and tags propagate to LangSmith traces — use them for cost attribution and filtering.
- Batch calls whenever possible for throughput — `batch()` and `abatch()` are optimized.
- Test chains with `FakeListLLM` and `MockRetriever` before connecting real models.
