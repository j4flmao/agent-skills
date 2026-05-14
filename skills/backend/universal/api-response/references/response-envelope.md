# Response Envelope Reference

## TypeScript Implementation

```typescript
// shared/api-response.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  pagination?: Pagination;
  metadata: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ErrorDetail[];
  traceId: string;
  stack?: string; // Only in development
}

export interface ErrorDetail {
  field: string;
  reason: string;
  code?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: string;
  version: string;
  duration?: number;
}

// Factory functions
export function ok<T>(data: T, meta?: Partial<ResponseMetadata>): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    metadata: { requestId: '', timestamp: new Date().toISOString(), version: '1.0', ...meta }
  };
}

export function fail(code: string, message: string, traceId: string, details?: ErrorDetail[]): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: { code, message, details, traceId },
    metadata: { requestId: traceId, timestamp: new Date().toISOString(), version: '1.0' }
  };
}

export function paginated<T>(data: T[], pagination: Pagination, meta?: Partial<ResponseMetadata>): ApiResponse<T[]> {
  return {
    success: true,
    data,
    error: null,
    pagination,
    metadata: { requestId: '', timestamp: new Date().toISOString(), version: '1.0', ...meta }
  };
}
```

## C# Implementation

```csharp
// Shared/ApiResponse.cs
public class ApiResponse<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public ApiError? Error { get; init; }
    public Pagination? Pagination { get; init; }
    public ResponseMetadata Metadata { get; init; } = new();

    public static ApiResponse<T> Ok(T data) => new()
    {
        Success = true,
        Data = data,
        Metadata = new ResponseMetadata { RequestId = Guid.NewGuid().ToString(), Timestamp = DateTime.UtcNow, Version = "1.0" }
    };

    public static ApiResponse<T> Fail(string code, string message, string traceId, List<ErrorDetail>? details = null) => new()
    {
        Success = false,
        Error = new ApiError { Code = code, Message = message, Details = details, TraceId = traceId },
        Metadata = new ResponseMetadata { RequestId = traceId, Timestamp = DateTime.UtcNow, Version = "1.0" }
    };
}

public class ApiError
{
    public string Code { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public List<ErrorDetail>? Details { get; init; }
    public string TraceId { get; init; } = string.Empty;
}

public class Pagination
{
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
    public int TotalPages { get; init; }
    public bool HasNextPage { get; init; }
    public bool HasPreviousPage { get; init; }
}
```

## Go Implementation

```go
// shared/response.go
type ApiResponse[T any] struct {
    Success    bool              `json:"success"`
    Data       *T                `json:"data"`
    Error      *ApiError         `json:"error"`
    Pagination *Pagination       `json:"pagination,omitempty"`
    Metadata   ResponseMetadata  `json:"metadata"`
}

type ApiError struct {
    Code    string        `json:"code"`
    Message string        `json:"message"`
    Details []ErrorDetail `json:"details,omitempty"`
    TraceId string        `json:"traceId"`
}

func Ok[T any](data T) ApiResponse[T] {
    return ApiResponse[T]{
        Success:  true,
        Data:     &data,
        Metadata: newMetadata(),
    }
}

func Fail(code, message, traceId string) ApiResponse[any] {
    return ApiResponse[any]{
        Success:  false,
        Error:    &ApiError{Code: code, Message: message, TraceId: traceId},
        Metadata: newMetadata(),
    }
}
```

## Python Implementation

```python
# shared/response.py
from dataclasses import dataclass, field
from typing import Generic, TypeVar, Optional
from datetime import datetime, timezone

T = TypeVar('T')

@dataclass
class ApiResponse(Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[dict] = None
    pagination: Optional[dict] = None
    metadata: dict = field(default_factory=lambda: {
        'requestId': '',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'version': '1.0'
    })

def ok(data: T) -> ApiResponse[T]:
    return ApiResponse(success=True, data=data)

def fail(code: str, message: str, trace_id: str) -> ApiResponse:
    return ApiResponse(
        success=False,
        error={'code': code, 'message': message, 'traceId': trace_id}
    )

def paginated(data: list[T], page: int, page_size: int, total: int) -> ApiResponse:
    return ApiResponse(
        success=True,
        data=data,
        pagination={
            'page': page,
            'pageSize': page_size,
            'totalCount': total,
            'totalPages': (total + page_size - 1) // page_size,
            'hasNextPage': page * page_size < total,
            'hasPreviousPage': page > 1
        }
    )
```

## Spring Boot Implementation

```java
// shared/ApiResponse.java
public class ApiResponse<T> {
    private boolean success;
    private T data;
    private ApiError error;
    private Pagination pagination;
    private ResponseMetadata metadata;

    public static <T> ApiResponse<T> ok(T data) {
        ApiResponse<T> r = new ApiResponse<>();
        r.success = true;
        r.data = data;
        r.metadata = new ResponseMetadata();
        return r;
    }

    public static ApiResponse<Void> fail(String code, String message, String traceId) {
        ApiResponse<Void> r = new ApiResponse<>();
        r.success = false;
        r.error = new ApiError(code, message, traceId);
        r.metadata = new ResponseMetadata();
        return r;
    }
}
```
