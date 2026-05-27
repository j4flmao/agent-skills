# Data API Error Handling

## Standardized Error Responses

Data APIs require consistent error formats to enable reliable client error handling.

### Error Response Schema

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Any

class APIError(BaseModel):
    status: int
    code: str
    message: str
    details: dict[str, Any] | None = None
    request_id: str
    timestamp: datetime
    docs_url: str | None = None

class ValidationError(APIError):
    field_errors: list[FieldError] = []

class FieldError(BaseModel):
    field: str
    message: str
    rejected_value: Any = None
    constraint: str | None = None
```

### Error Handler Middleware

```python
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import uuid

class APIErrorHandler:
    def __init__(self):
        self.handlers: dict[type, Callable] = {}

    def register(self, exception_type: type, handler: Callable):
        self.handlers[exception_type] = handler

    async def handle(self, request: Request, exc: Exception) -> JSONResponse:
        request_id = str(uuid.uuid4())

        for exc_type, handler in self.handlers.items():
            if isinstance(exc, exc_type):
                return await handler(request, exc, request_id)

        # Default handler for unhandled exceptions
        return JSONResponse(
            status_code=500,
            content=APIError(
                status=500,
                code="INTERNAL_ERROR",
                message="An unexpected error occurred",
                request_id=request_id,
                timestamp=datetime.utcnow(),
            ).model_dump(),
        )
```

### Error Categories

```python
from enum import Enum

class ErrorCategory(str, Enum):
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    NOT_FOUND = "not_found"
    CONFLICT = "conflict"
    RATE_LIMIT = "rate_limit"
    DEPENDENCY_FAILURE = "dependency_failure"
    INTERNAL = "internal"
    TIMEOUT = "timeout"

ERROR_HTTP_MAP = {
    ErrorCategory.AUTHENTICATION: 401,
    ErrorCategory.AUTHORIZATION: 403,
    ErrorCategory.VALIDATION: 422,
    ErrorCategory.NOT_FOUND: 404,
    ErrorCategory.CONFLICT: 409,
    ErrorCategory.RATE_LIMIT: 429,
    ErrorCategory.DEPENDENCY_FAILURE: 502,
    ErrorCategory.INTERNAL: 500,
    ErrorCategory.TIMEOUT: 504,
}
```

## Retry Semantics

```python
class RetryDecisionEngine:
    def __init__(self):
        self.retryable_codes = {429, 502, 503, 504}
        self.non_retryable_codes = {400, 401, 403, 404, 422}

    def should_retry(self, status_code: int, attempt: int) -> RetryDecision:
        if status_code in self.non_retryable_codes:
            return RetryDecision(retry=False, reason="Non-retryable error")

        if status_code in self.retryable_codes:
            if attempt >= 3:
                return RetryDecision(retry=False, reason="Max retries exceeded")

            delay = min(0.5 * (2 ** attempt), 30)
            return RetryDecision(
                retry=True,
                delay_seconds=delay,
                reason=f"Retryable error, attempt {attempt + 1}",
            )

        return RetryDecision(retry=False, reason="Unknown error code")
```

## Graceful Degradation

```python
class DegradationManager:
    def __init__(self):
        self.circuit_breakers: dict[str, CircuitBreaker] = {}

    def get_circuit_breaker(self, dependency: str) -> CircuitBreaker:
        if dependency not in self.circuit_breakers:
            self.circuit_breakers[dependency] = CircuitBreaker(
                failure_threshold=5,
                recovery_timeout=30,
            )
        return self.circuit_breakers[dependency]

    async def call_with_fallback(
        self,
        primary: Callable,
        fallback: Callable,
        dependency: str,
    ):
        breaker = self.get_circuit_breaker(dependency)
        try:
            return await breaker.call(primary)
        except CircuitBreakerOpen:
            return await fallback()
        except Exception as e:
            return APIError(
                status=503,
                code="SERVICE_DEGRADED",
                message=f"{dependency} unavailable, using cached data",
                details={"error": str(e)},
                request_id=str(uuid.uuid4()),
                timestamp=datetime.utcnow(),
            )
```

## Key Points

- Standardized error response format with code, message, and request_id
- Field-level validation errors for bulk data API requests
- Map error categories to appropriate HTTP status codes
- Return retry-after headers for rate-limited and degraded responses
- Circuit breakers prevent cascading failures across dependent services
- Fallback responses for degraded operation when dependencies fail
- Include documentation URLs in error responses for developer guidance
- Log all error details server-side, expose only safe information to clients
- Support structured error codes for programmatic error handling
- Track error rates per endpoint for SLA monitoring
