# REST API Error Handling

## Overview
REST API error handling provides consistent, informative error responses that help clients understand and recover from failures. Standardized error formats, status codes, and error codes improve API usability.

## Error Response Format

### Standard Error Structure
```typescript
// Problem Details (RFC 7807)
interface ProblemDetails {
  type: string;        // URI identifying problem type
  title: string;       // Short description
  status: number;       // HTTP status code
  detail: string;       // Detailed explanation
  instance: string;     // URI identifying occurrence
  errors?: Record<string, string[]>;  // Validation errors
  traceId?: string;     // Correlation ID for debugging
}

// Example responses
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "The request body contains invalid fields.",
  "instance": "/api/users",
  "errors": {
    "email": ["The email field is required.", "The email must be a valid email address."],
    "password": ["The password must be at least 8 characters."]
  },
  "traceId": "abc-123-def-456"
}

{
  "type": "https://api.example.com/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "User with ID '999' was not found.",
  "instance": "/api/users/999",
  "traceId": "abc-123-def-456"
}
```

## Status Codes

### HTTP Status Code Usage
```typescript
// 2xx Success
200 OK                    // Successful GET, PUT, PATCH
201 Created               // Successful POST (resource created)
202 Accepted              // Accepted for async processing
204 No Content            // Successful DELETE

// 4xx Client Error
400 Bad Request           // Malformed request syntax
401 Unauthorized          // Missing or invalid authentication
403 Forbidden             // Authenticated but not authorized
404 Not Found             // Resource doesn't exist
405 Method Not Allowed    // HTTP method not supported
409 Conflict              // Resource state conflict (e.g., duplicate)
410 Gone                  // Resource permanently removed
412 Precondition Failed   // Conditional request failed
422 Unprocessable Entity  // Validation errors
429 Too Many Requests     // Rate limit exceeded

// 5xx Server Error
500 Internal Server Error    // Unexpected server error
502 Bad Gateway              // Upstream server error
503 Service Unavailable      // Temporary overload/maintenance
504 Gateway Timeout          // Upstream timeout
```

## Implementation

### Global Error Handler
```typescript
// NestJS error filter
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response_body = exception.getResponse();

      if (typeof response_body === 'string') {
        message = response_body;
      } else if (typeof response_body === 'object') {
        const body = response_body as any;
        message = body.message || exception.message;
        errors = body.errors;
      }
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      console.error('Unhandled exception:', exception);
    }

    const problemDetails = {
      type: `https://api.example.com/errors/${status}`,
      title: getStatusTitle(status),
      status,
      detail: message,
      instance: request.url,
      ...(errors && { errors }),
      ...(status >= 500 && { traceId: request.id }),
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(problemDetails);
  }
}
```

### Validation Error Handling
```typescript
// FastAPI validation
from pydantic import BaseModel, ValidationError
from fastapi import Request, status
from fastapi.responses import JSONResponse

class ErrorResponse(BaseModel):
    type: str
    title: str
    status: int
    detail: str
    instance: str
    errors: dict[str, list[str]] | None = None
    trace_id: str | None = None

@app.exception_handler(ValidationError)
async def validation_exception_handler(
    request: Request, exc: ValidationError
):
    errors: dict[str, list[str]] = {}
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"])
        if field not in errors:
            errors[field] = []
        errors[field].append(error["msg"])

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            type="https://api.example.com/errors/validation-error",
            title="Validation Error",
            status=422,
            detail="Request validation failed",
            instance=str(request.url),
            errors=errors,
        ).model_dump(),
    )
```

## Error Codes

### Application Error Codes
```typescript
enum ErrorCodes {
  // Authentication
  AUTH_INVALID_CREDENTIALS = 'AUTH_001',
  AUTH_TOKEN_EXPIRED = 'AUTH_002',
  AUTH_TOKEN_INVALID = 'AUTH_003',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_004',

  // Validation
  VALIDATION_REQUIRED_FIELD = 'VAL_001',
  VALIDATION_INVALID_FORMAT = 'VAL_002',
  VALIDATION_OUT_OF_RANGE = 'VAL_003',
  VALIDATION_UNIQUE_CONSTRAINT = 'VAL_004',

  // Resource
  RESOURCE_NOT_FOUND = 'RES_001',
  RESOURCE_ALREADY_EXISTS = 'RES_002',
  RESOURCE_CONFLICT = 'RES_003',
  RESOURCE_DELETED = 'RES_004',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_001',
  RATE_LIMIT_TEMPORARY_BLOCK = 'RATE_002',

  // Business Logic
  BUSINESS_INSUFFICIENT_FUNDS = 'BIZ_001',
  BUSINESS_ORDER_LIMIT_EXCEEDED = 'BIZ_002',
  BUSINESS_DUPLICATE_OPERATION = 'BIZ_003',
}

// Error response with code
{
  "type": "https://api.example.com/errors/business-error",
  "title": "Insufficient Funds",
  "status": 422,
  "code": "BIZ_001",
  "detail": "Account #12345 has insufficient funds for this transaction. Available: $50.00, Required: $100.00.",
  "instance": "/api/transactions"
}
```

## Client Handling

### Error Handling Pattern
```typescript
async function apiClient<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      title: 'Unknown Error',
      status: response.status,
    }));

    const apiError = new ApiError(
      error.title || response.statusText,
      response.status,
      error.code,
      error.errors,
      error.traceId
    );

    switch (response.status) {
      case 401:
        // Redirect to login or refresh token
        await handleAuthError(apiError);
        break;
      case 422:
        // Handle validation errors
        handleValidationErrors(apiError.errors);
        break;
      case 429:
        // Implement retry with backoff
        await retryWithBackoff(url, options);
        break;
      default:
        throw apiError;
    }
  }

  return response.json();
}
```

## Decision Trees

### Choose HTTP Status Code
```
Is the client request malformed?
├── Yes → Is the request syntax invalid?
│   ├── Yes → 400 Bad Request
│   └── No → Is it a validation failure?
│       ├── Yes → 422 Unprocessable Entity (semantic errors)
│       └── No → 400 Bad Request
├── No → Is the client unauthorized?
│   ├── Yes → Is authentication missing/invalid?
│   │   ├── Yes → 401 Unauthorized + WWW-Authenticate header
│   │   └── No → 403 Forbidden (authenticated but no permission)
│   └── No → Is the resource not found?
│       ├── Yes → Was it ever there?
│       │   ├── Yes → 410 Gone (permanently removed)
│       │   └── No → 404 Not Found
│       └── No → Is it a conflict (race condition)?
│           ├── Yes → 409 Conflict + current state
│           └── No → Is it rate-limited?
│               ├── Yes → 429 Too Many Requests + Retry-After
│               └── No → 500 Internal Server Error
```

### Choose Retry Strategy
```
Is the error retryable?
├── Yes → Is it a 429 (rate limit)?
│   ├── Yes → Use Retry-After header (fixed delay)
│   └── No → Is it a 5xx (server error)?
│       ├── Yes → Exponential backoff with jitter
│       └── No → 408 Request Timeout?
│           ├── Yes → Linear retry with timeout
│           └── No → Do not retry (4xx client errors)
└── No → Return error to caller immediately
```

## Anti-Patterns
- **Stack traces in production responses**: Exposes internals, security risk
- **Generic 400 for everything**: Makes debugging impossible for clients
- **No error correlation IDs**: Cannot trace errors across logs
- **Inconsistent error format**: Different shape per endpoint confuses clients
- **HTML error pages for API endpoints**: Must return structured JSON/XML
- **Retrying non-retryable errors**: Wastes resources on 400, 401, 403, 404
- **No rate limiting**: Allows abuse and DoS attacks
- **Exposing database internals**: "Duplicate entry 'x' for key 'PRIMARY'" reveals schema
- **Validation errors without field context**: "Invalid input" is useless
- **Not logging request IDs**: Makes debugging in production impossible

## Implementation Patterns

### Express Global Error Handler
```javascript
class AppError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.requestId = null;
  }
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const body = {
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: statusCode === 500 ? 'Internal server error' : err.message,
      requestId: req.id || err.requestId,
      timestamp: err.timestamp || new Date().toISOString(),
    },
  };

  if (err.details) {
    body.error.details = err.details;
  }

  if (process.env.NODE_ENV === 'development') {
    body.error.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

// Usage
app.post('/users', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Email is required', {
        fields: [{ field: 'email', message: 'Email is required' }],
      });
    }
    // ...
  } catch (err) {
    next(err);
  }
});
```

### Axios Client Interceptor with Retry
```javascript
import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Retry on 429 or 5xx, max 3 times
    if (
      (error.response?.status === 429 ||
        (error.response?.status >= 500 && error.response?.status < 600)) &&
      !originalRequest._retryCount
    ) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      if (originalRequest._retryCount <= 3) {
        const delay = originalRequest._retryCount === 1
          ? parseInt(error.response.headers['retry-after'] || '1', 10) * 1000
          : Math.min(1000 * 2 ** originalRequest._retryCount + Math.random() * 1000, 30000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);
```

### Correlation ID Middleware
```javascript
import { v4 as uuidv4 } from 'uuid';

function correlationIdMiddleware(req, res, next) {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.id);
  next();
}
```

## Key Points
- Use appropriate HTTP status codes for each error type
- Error codes enable programmatic error handling
- Validation errors include field-level messages
- Trace IDs correlate errors with server logs
- Never expose stack traces in production API responses
- Rate limit errors include Retry-After header
- Authentication errors indicate required auth scheme
- Error responses include help URLs for documentation
- Consistent error format across all endpoints
- Async operations return 202 with status endpoint
- Idempotency keys prevent duplicate processing
- Error responses include timestamp for debugging
- Client error handling should be centralized
- Retry logic respects Retry-After headers
- Validation errors use 422 (not 400) for semantic correctness
- 409 Conflict includes current state information
- 410 Gone indicates permanent removal vs 404
- Error message internationalization (i18n) support
- Error logging separates operational from informational errors
- Request IDs trace errors through distributed systems
- Error grouping in monitoring systems uses error codes
- Rate limiting includes current limits and reset times
- Error responses should not expose internal implementation details
- Circuit breakers prevent cascading failures in clients
- Fallback responses degrade gracefully when upstream fails
- Global error handler middleware catches unhandled errors
- Client-side interceptors centralize error handling logic
