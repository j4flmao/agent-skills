# Error Handling & Observability in Python

## Overview
Proper error handling prevents system crashes and leaks, while observability ensures that when errors do occur, they can be traced and fixed quickly.

## 1. Exception Hierarchies
Define a base exception for your domain, then subclass it. This allows global handlers to catch expected domain errors vs unexpected system errors.

```python
class DomainError(Exception):
    """Base class for domain exceptions."""
    pass

class UserNotFoundError(DomainError):
    pass

class InsufficientFundsError(DomainError):
    pass
```

## 2. Global Exception Handlers (FastAPI Example)
Intercept errors at the framework boundary to format standardized JSON responses.

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, exc: DomainError):
    # Log the error here
    return JSONResponse(
        status_code=400,
        content={"error": exc.__class__.__name__, "message": str(exc)},
    )
```

## 3. Structured Logging (JSON)
Plain text logs are hard to parse in ELK/Datadog. Use JSON logging with `structlog`.

```python
import structlog

logger = structlog.get_logger()

# Output is a parsable JSON string
logger.info("user_login", user_id=123, ip_address="192.168.1.1")
```

## 4. Sentry Integration
Capture unhandled exceptions automatically with context.

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="https://examplePublicKey@o0.ingest.sentry.io/0",
    integrations=[FastApiIntegration()],
    traces_sample_rate=1.0,
)
```

## 5. Retry Mechanisms with Tenacity
Network calls fail. Handle transient errors gracefully.

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=2, max=10))
def call_external_api():
    # Attempt network request
    pass
```

## 6. Circuit Breakers
If a downstream service is completely down, fail fast rather than exhausting connection pools. Tools like `pyfailsafe` or custom Redis-based breakers are common.
