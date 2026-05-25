# LangChain Production Deployment

## Production Setup

| Component | Recommendation | Notes |
|-----------|---------------|-------|
| LLM client | ChatOpenAI / ChatAnthropic with retry | Configure max_retries=3 |
| Cache | SQLite or Redis cache | Reduces duplicate calls |
| Rate limiting | TokenBucket rate limiter | Match provider TPM limits |
| Logging | LangSmith + file logger | Structured JSON logs |
| Monitoring | LangSmith traces + custom metrics | Track latency, token usage |

### Resilient LLM Call
```python
from langchain_core.language_models import BaseChatModel
from tenacity import retry, stop_after_attempt, wait_exponential

class ResilientLLM:
    def __init__(self, llm: BaseChatModel, max_retries=3):
        self.llm = llm
        self.max_retries = max_retries

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def invoke_with_retry(self, messages):
        try:
            return await self.llm.ainvoke(messages)
        except RateLimitError:
            raise
        except Exception as e:
            logger.error(f"LLM call failed: {e}", exc_info=True)
            raise
```

## Error Handling

| Error Type | Strategy | Recovery |
|------------|----------|----------|
| Rate limit | Exponential backoff | Retry up to 3 times |
| Timeout | Circuit breaker after 5 failures | Cool-down period 30s |
| Invalid response | Response validation schema | Retry with stricter prompt |
| Context overflow | Token truncation | Trim oldest messages |

### Circuit Breaker
```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failures = 0
        self.last_failure_time = 0
        self.state = "closed"

    async def call(self, func, *args, **kwargs):
        if self.state == "open":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "half-open"
            else:
                raise CircuitBreakerOpen()

        try:
            result = await func(*args, **kwargs)
            if self.state == "half-open":
                self.state = "closed"
                self.failures = 0
            return result
        except Exception:
            self.failures += 1
            self.last_failure_time = time.time()
            if self.failures >= self.failure_threshold:
                self.state = "open"
            raise
```

## Versioning Strategy

| Component | Versioning Method | Granularity |
|-----------|------------------|-------------|
| Prompt templates | Git + semantic version | Per template file |
| LLM config | Environment-specific configs | Staging / Production |
| Chain topology | Code version controlled | Per commit |
| Embedding models | Model registry | Model name + version |

## Monitoring Setup

| Metric | Collection | Dashboard |
|--------|------------|-----------|
| Token usage | LangSmith callback | Cost per chain |
| Latency | @trace decorator | P50/P95/P99 |
| Cache hit rate | Cache wrapper | Hit ratio over time |
| Error rate | Error handler | Error count by type |
| Quality score | Feedback callback | Avg score per chain |

## Deployment Checklist

| Area | Check | Verification |
|------|-------|-------------|
| Configuration | Environment variables set | Config validation on start |
| Rate limits | Provider TPM limits configured | Load test at peak |
| Cache | Redis/SQLite cache connected | Cache hit test |
| Retry | Max retries and backoff configured | Fault injection test |
| Monitoring | LangSmith project configured | Trace verification |
| Alerts | Latency and error rate alerts | Alert simulation |
| Rollback | Previous version deployable | Rollback drill |

## Production Configuration Example
```python
from langchain_openai import ChatOpenAI
from langchain.globals import set_llm_cache
from langchain.cache import RedisCache
import redis

# Production LLM config
llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0.1,
    max_retries=3,
    request_timeout=30,
    max_tokens=2048,
)

# Production cache
redis_client = redis.Redis(
    host="redis.internal",
    port=6379,
    socket_connect_timeout=5,
    retry_on_timeout=True,
)
set_llm_cache(RedisCache(redis_client))
```
