# Tool Integration Patterns

## Tool Definition Patterns

### @tool Decorator
```python
from langchain.tools import tool

@tool
def search_knowledge_base(query: str, top_k: int = 5) -> str:
    """Search internal knowledge base for relevant documents.
    
    Args:
        query: Search terms, 2-5 keywords for best results
        top_k: Number of results to return (1-10)
    """
    results = vectorstore.similarity_search(query, k=top_k)
    return "\n\n".join(doc.page_content for doc in results)
```

### StructuredTool
```python
from langchain.tools import StructuredTool
from pydantic import BaseModel, Field

class SearchInput(BaseModel):
    query: str = Field(description="Search query, 2-5 keywords")
    max_results: int = Field(default=5, ge=1, le=20)

tool = StructuredTool(
    name="search",
    description="Search for information. Use for factual queries.",
    args_schema=SearchInput,
    func=search_fn,
)
```

## Tool Registration

### BaseTool Subclass
```python
from langchain.tools import BaseTool

class DatabaseQueryTool(BaseTool):
    name = "query_database"
    description = "Execute SQL queries. Only SELECT allowed."
    args_schema: type = DatabaseQueryInput

    def _run(self, query: str) -> str:
        if not query.strip().upper().startswith("SELECT"):
            return "Error: Only SELECT queries are allowed"
        return str(self.db.execute(query))
```

## Tool Error Handling

### Structured Errors
```python
@tool
def api_call(endpoint: str) -> str:
    """Call external API."""
    try:
        response = requests.get(endpoint, timeout=10)
        response.raise_for_status()
        return response.text
    except requests.Timeout:
        return "Error: API request timed out after 10s"
    except requests.HTTPError as e:
        return f"Error: API returned {e.response.status_code}"
```

## Tool Composition

### Router Pattern
```python
tools = {
    "search": search_knowledge_base,
    "calculate": calculator,
    "translate": translate_text,
    "code": execute_python,
}

def route_to_tool(query_type, params):
    tool = tools.get(query_type)
    if not tool:
        return "Error: Unknown tool type"
    return tool.invoke(params)
```

### Parallel Execution
```python
from langchain_core.runnables import RunnableParallel

parallel_tools = RunnableParallel(
    search=search_knowledge_base,
    weather=get_weather,
    calendar=get_calendar_events
)

@tool
def gather_context(query: str) -> dict:
    """Gather all relevant context for a query."""
    return parallel_tools.invoke({"query": query})
```

## External API Integration

### REST API Tool
```python
@tool
def call_api(endpoint: str, method: str = "GET", body: dict = None) -> str:
    """Call an external REST API.
    
    Args:
        endpoint: Full URL path
        method: HTTP method (GET, POST, PUT, DELETE)
        body: JSON body for POST/PUT requests
    """
    headers = {"Authorization": f"Bearer {API_KEY}"}
    resp = requests.request(method, endpoint, headers=headers, json=body)
    return resp.text
```

### Database Tool
```python
@tool
def query_read_only(sql: str) -> str:
    """Execute read-only SQL query.
    Only SELECT and EXPLAIN queries are permitted.
    """
    if not sql.strip().upper().startswith(("SELECT", "EXPLAIN", "WITH")):
        return "Error: Only read-only queries permitted"
    return str(db.execute(sql).fetchall())
```

### File System Tool
```python
@tool
def read_file(path: str) -> str:
    """Read a file from the allowed directory.
    
    Args:
        path: Relative path within /data directory
    """
    full_path = os.path.normpath(os.path.join(ALLOWED_DIR, path))
    if not full_path.startswith(ALLOWED_DIR):
        return "Error: Path outside allowed directory"
    with open(full_path) as f:
        return f.read()
```

## Monitoring & Logging

### Tool Call Interceptor
```python
class LoggedTool(BaseTool):
    def _run(self, *args, **kwargs):
        start = time.time()
        try:
            result = super()._run(*args, **kwargs)
            duration = time.time() - start
            logger.info(f"Tool {self.name}: {duration:.2f}s, success")
            return result
        except Exception as e:
            duration = time.time() - start
            logger.error(f"Tool {self.name}: {duration:.2f}s, error: {e}")
            raise
```
