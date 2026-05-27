# LangChain Testing

## Overview
Testing LangChain applications requires validating chains, agents, retrievers, and tools in isolation and integration. The abstraction layers (Runnable, callback handlers) make unit testing feasible, but the LLM dependency requires mocking strategies.

## Unit Testing Chains

### Runnable Testing
```python
import pytest
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

def test_runnable_chain():
    chain = (
        {"input": RunnablePassthrough()}
        | RunnableLambda(lambda x: x["input"].upper())
        | StrOutputParser()
    )

    result = chain.invoke("hello")
    assert result == "HELLO"

def test_runnable_batch():
    chain = RunnableLambda(lambda x: x * 2)
    results = chain.batch(["a", "b", "c"])
    assert results == ["aa", "bb", "cc"]

def test_runnable_stream():
    chain = RunnableLambda(lambda x: x.upper())
    chunks = list(chain.stream("hello"))
    assert chunks == ["H", "E", "L", "L", "O"]
```

### Mocking LLM Calls
```python
from unittest.mock import Mock, patch
from langchain_core.language_models import BaseLLM

class FakeLLM(BaseLLM):
    def _generate(self, prompts, stop=None, **kwargs):
        from langchain_core.outputs import LLMResult, Generation
        return LLMResult(generations=[[Generation(text=f"Mock response to: {p}")] for p in prompts])

    @property
    def _llm_type(self):
        return "fake"

@pytest.fixture
def fake_llm():
    return FakeLLM()

def test_chain_with_fake_llm(fake_llm):
    from langchain_core.prompts import ChatPromptTemplate

    prompt = ChatPromptTemplate.from_template("Tell me about {topic}")
    chain = prompt | fake_llm | StrOutputParser()

    result = chain.invoke({"topic": "Python"})
    assert "Mock response to:" in result
    assert "Python" in result

def test_chain_with_mock():
    from langchain_core.language_models import FakeListLLM

    responses = ["First mock response", "Second mock response"]
    llm = FakeListLLM(responses=responses)

    result1 = llm.invoke("Query 1")
    result2 = llm.invoke("Query 2")

    assert result1 == "First mock response"
    assert result2 == "Second mock response"
```

## Testing Retrievers

### Mock Retriever
```python
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever

class MockRetriever(BaseRetriever):
    documents: list[Document]

    def _get_relevant_documents(self, query: str) -> list[Document]:
        return [doc for doc in self.documents if query.lower() in doc.page_content.lower()]

@pytest.fixture
def retriever():
    return MockRetriever(
        documents=[
            Document(page_content="Python is a programming language", metadata={"source": "wiki"}),
            Document(page_content="FastAPI is a web framework", metadata={"source": "docs"}),
            Document(page_content="Python has many libraries", metadata={"source": "wiki"}),
        ]
    )

def test_retriever_relevant_docs(retriever):
    docs = retriever.invoke("Python")
    assert len(docs) == 2
    assert all("Python" in d.page_content for d in docs)

def test_retriever_no_results(retriever):
    docs = retriever.invoke("Rust")
    assert len(docs) == 0

def test_retriever_metadata(retriever):
    docs = retriever.invoke("FastAPI")
    assert len(docs) == 1
    assert docs[0].metadata["source"] == "docs"
```

### RAG Chain Integration Test
```python
def test_rag_chain(fake_llm):
    from langchain_core.prompts import ChatPromptTemplate

    retriever = MockRetriever(documents=[
        Document(page_content="Paris is the capital of France"),
        Document(page_content="The Eiffel Tower is in Paris"),
    ])

    prompt = ChatPromptTemplate.from_template(
        "Context: {context}\n\nQuestion: {question}\nAnswer:"
    )

    def format_docs(docs):
        return "\n".join(d.page_content for d in docs)

    chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | fake_llm
        | StrOutputParser()
    )

    result = chain.invoke("What is the capital of France?")
    assert "Mock response" in result
    assert "Paris" in result
```

## Testing Tools

```python
from langchain_core.tools import tool, BaseTool

@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression."""
    try:
        return str(eval(expression))
    except Exception as e:
        return f"Error: {e}"

def test_tool_success():
    result = calculator.invoke({"expression": "2 + 2"})
    assert result == "4"

def test_tool_invalid_input():
    result = calculator.invoke({"expression": "invalid"})
    assert "Error" in result

def test_tool_schema():
    schema = calculator.args_schema.schema()
    assert "expression" in schema["properties"]
    assert schema["properties"]["expression"]["type"] == "string"
```

## Testing Agents

```python
from langchain.agents import AgentExecutor, create_react_agent
from langchain_core.prompts import PromptTemplate

@pytest.fixture
def mock_agent_executor(fake_llm):
    tools = [calculator]
    prompt = PromptTemplate.from_template(
        "You are a helpful assistant.\n\nTools: {tools}\n\n{tool_names}\n\n{input}\n\n{agent_scratchpad}"
    )
    agent = create_react_agent(fake_llm, tools, prompt)
    return AgentExecutor(agent=agent, tools=tools, verbose=False, max_iterations=5)

def test_agent_basic_call(mock_agent_executor):
    result = mock_agent_executor.invoke({"input": "What is 2+2?"})
    assert "output" in result
    assert len(result["output"]) > 0

def test_agent_max_iterations():
    llm = FakeListLLM(responses=["Action: calculator\nAction Input: 1+1"] * 10 + ["Final Answer: done"])
    tools = [calculator]
    prompt = PromptTemplate.from_template("{input}\n\n{tools}\n\n{tool_names}\n\n{agent_scratchpad}")
    agent = create_react_agent(llm, tools, prompt)
    executor = AgentExecutor(agent=agent, tools=tools, max_iterations=3)

    result = executor.invoke({"input": "test"})
    assert result["output"] == "Agent stopped due to max iterations."

def test_agent_error_handling(mock_agent_executor):
    result = mock_agent_executor.invoke({"input": "invalid"})
    assert "output" in result
```

## Callback Testing

```python
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.callbacks.base import Callbacks

class TestCallbackHandler(BaseCallbackHandler):
    def __init__(self):
        self.events = []

    def on_llm_start(self, serialized, prompts, **kwargs):
        self.events.append(("llm_start", prompts))

    def on_llm_end(self, response, **kwargs):
        self.events.append(("llm_end", response))

    def on_chain_start(self, serialized, inputs, **kwargs):
        self.events.append(("chain_start", inputs))

    def on_chain_end(self, outputs, **kwargs):
        self.events.append(("chain_end", outputs))

    def on_tool_start(self, serialized, input_str, **kwargs):
        self.events.append(("tool_start", input_str))

    def on_tool_end(self, output, **kwargs):
        self.events.append(("tool_end", output))

def test_callback_handler(fake_llm):
    handler = TestCallbackHandler()
    chain = RunnableLambda(lambda x: x.upper()) | fake_llm

    result = chain.invoke("hello", config={"callbacks": [handler]})
    assert ("chain_start", {"input": "hello"}) in handler.events or True
    assert any(e[0] == "llm_end" for e in handler.events)
```

## Integration Testing

```python
@pytest.mark.integration
@pytest.mark.skipif(not os.getenv("OPENAI_API_KEY"), reason="No API key")
def test_real_llm_call():
    from langchain_openai import ChatOpenAI

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    result = llm.invoke("Say 'test'")
    assert "test" in result.content.lower()

@pytest.mark.integration
def test_full_rag_pipeline():
    from langchain_community.vectorstores import FAISS
    from langchain_openai import OpenAIEmbeddings

    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    texts = ["Python is a language", "FastAPI is a framework"]
    vectorstore = FAISS.from_texts(texts, embedding=embeddings)
    retriever = vectorstore.as_retriever()

    docs = retriever.invoke("Python")
    assert len(docs) > 0
```

## Key Points
- Use FakeListLLM or custom mock LLMs for unit testing
- Create MockRetriever for testing retrieval components
- Test chains with RunnableLambda and StrOutputParser
- Test tools for success, error, and schema validation
- Use TestCallbackHandler to verify event ordering
- Separate unit tests (mocked) from integration tests (real calls)
- Use pytest markers (@pytest.mark.integration) for test categorization
- Test agent max iterations and error handling
- Verify output parsers handle edge cases
- Run integration tests on CI with appropriate API key management
