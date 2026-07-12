---
name: agentic-workflows
description: Guidelines for building multi-agent systems and RAG pipelines.
---

# Agentic Workflows & RAG

## Core Principles
- **Modularity**: Separate concerns into distinct agent roles (e.g., Planner, Executor, Reviewer).
- **Context Management**: Use RAG to fetch only highly relevant context to reduce token bloat.

## Multi-Agent Architecture
```mermaid
flowchart LR
    A[User Request] --> B{Planner Agent}
    B -->|Search Query| C[RAG Pipeline]
    C --> B
    B --> D[Executor Agent]
    B --> E[Executor Agent]
    D --> F[Reviewer Agent]
    E --> F
    F --> G[Final Response]
```

## RAG Implementation Snippet
```python
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from langchain.chat_models import ChatOpenAI
from langchain.chains import RetrievalQA

def build_rag_pipeline(docs):
    vectorstore = Chroma.from_documents(documents=docs, embedding=OpenAIEmbeddings())
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
    llm = ChatOpenAI(temperature=0)
    return RetrievalQA.from_chain_type(llm=llm, retriever=retriever)
```
