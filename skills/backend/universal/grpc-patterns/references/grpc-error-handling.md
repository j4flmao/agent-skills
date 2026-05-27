# gRPC Error Handling

## Standard Status Codes

### Core Status Codes
| Code | Number | Usage |
|------|--------|-------|
| OK | 0 | Success response |
| CANCELLED | 1 | Operation cancelled by client |
| UNKNOWN | 2 | Unknown server error |
| INVALID_ARGUMENT | 3 | Client specified invalid argument |
| DEADLINE_EXCEEDED | 4 | Deadline expired before completion |
| NOT_FOUND | 5 | Requested entity not found |
| ALREADY_EXISTS | 6 | Entity already exists |
| PERMISSION_DENIED | 7 | Caller lacks permission |
| RESOURCE_EXHAUSTED | 8 | Resource quota exhausted |
| FAILED_PRECONDITION | 9 | System not in required state |
| ABORTED | 10 | Operation aborted (conflict) |
| OUT_OF_RANGE | 11 | Operation was attempted past valid range |
| UNIMPLEMENTED | 12 | Operation not implemented or disabled |
| INTERNAL | 13 | Internal server error |
| UNAVAILABLE | 14 | Service currently unavailable |
| DATA_LOSS | 15 | Unrecoverable data loss or corruption |
| UNAUTHENTICATED | 16 | Request lacks valid authentication |

### Server-Side Error Implementation
```typescript
import * as grpc from '@grpc/grpc-js';

function getUser(call, callback) {
  const { id } = call.request;

  if (!id) {
    return callback({
      code: grpc.status.INVALID_ARGUMENT,
      message: 'User ID is required',
      details: 'Provide a valid user ID in the request',
    });
  }

  try {
    const user = userRepository.findById(id);
    if (!user) {
      return callback({
        code: grpc.status.NOT_FOUND,
        message: `User ${id} not found`,
        details: `No user exists with ID ${id}`,
      });
    }
    callback(null, user);
  } catch (error) {
    callback({
      code: grpc.status.INTERNAL,
      message: 'Internal server error',
      details: 'An unexpected error occurred',
    });
  }
}
```

## Rich Error Details

### Using google.rpc.Status
```protobuf
import "google/rpc/status.proto";
import "google/rpc/error_details.proto";

service UserService {
  rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
}

message CreateUserResponse {
  oneof result {
    User user = 1;
    google.rpc.Status error = 2;
  }
}
```

### Error Detail Types
```protobuf
import "google/rpc/error_details.proto";

// Structured error information
message ErrorInfo {
  string reason = 1;
  string domain = 2;
  map<string, string> metadata = 3;
}

// Field-level validation errors
message BadRequest {
  repeated FieldViolation field_violations = 1;
  message FieldViolation {
    string field = 1;
    string description = 2;
  }
}

// Retry guidance
message RetryInfo {
  google.protobuf.Duration retry_delay = 1;
}

// Quota failure details
message QuotaFailure {
  repeated Violation violations = 1;
  message Violation {
    string subject = 1;
    string description = 2;
  }
}
```

## Client-Side Error Handling

### TypeScript/Node.js Client
```typescript
import * as grpc from '@grpc/grpc-js';
import { ServiceError } from '@grpc/grpc-js';

function callWithRetry(client, method, request, maxRetries = 3) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function attempt() {
      attempts++;
      client[method](request, (error, response) => {
        if (!error) return resolve(response);

        if (isRetryable(error) && attempts < maxRetries) {
          const delay = Math.pow(2, attempts) * 100 + Math.random() * 100;
          setTimeout(attempt, delay);
        } else {
          reject(handleGrpcError(error));
        }
      });
    }

    attempt();
  });
}

function isRetryable(error) {
  const retryableCodes = [
    grpc.status.UNAVAILABLE,
    grpc.status.DEADLINE_EXCEEDED,
    grpc.status.RESOURCE_EXHAUSTED,
    grpc.status.ABORTED,
  ];
  return retryableCodes.includes(error.code);
}

function handleGrpcError(error) {
  switch (error.code) {
    case grpc.status.INVALID_ARGUMENT:
      return new ValidationError(error.details);
    case grpc.status.NOT_FOUND:
      return new NotFoundError(error.message);
    case grpc.status.PERMISSION_DENIED:
      return new AuthError(error.message);
    case grpc.status.UNAUTHENTICATED:
      return new AuthError('Authentication required');
    case grpc.status.DEADLINE_EXCEEDED:
      return new TimeoutError('Request timed out');
    case grpc.status.UNAVAILABLE:
      return new ServiceUnavailableError(error.message);
    default:
      return new InternalError(error.message);
  }
}
```

### Python Client
```python
import grpc
from grpc_status import rpc_status
from google.rpc import error_details_pb2

class GrpcClient:
    def __init__(self, target):
        self.channel = grpc.insecure_channel(target)
        self.stub = UserServiceStub(self.channel)

    def get_user(self, user_id):
        try:
            response = self.stub.GetUser(GetUserRequest(id=user_id))
            return response.user
        except grpc.RpcError as e:
            status = rpc_status.from_call(e)
            if status:
                for detail in status.details:
                    if detail.Is(error_details_pb2.BadRequest.DESCRIPTOR):
                        br = error_details_pb2.BadRequest()
                        detail.Unpack(br)
                        for violation in br.field_violations:
                            print(f"Field {violation.field}: {violation.description}")
            self._handle_error(e)

    def _handle_error(self, error):
        code = error.code()
        if code == grpc.StatusCode.NOT_FOUND:
            raise NotFoundError(error.details())
        elif code == grpc.StatusCode.UNAVAILABLE:
            raise RetryableError(error.details())
        else:
            raise GrpcError(code, error.details())
```

## Interceptor-Based Error Handling

### Server Interceptor
```typescript
import { ServerInterceptor } from '@grpc/grpc-js';

function errorHandlingInterceptor(options, nextCall) {
  return new ServerInterceptingCall(nextCall(options), {
    start: (metadata, listener, next) => {
      next(metadata, {
        onReceiveMessage: (message, next) => {
          next(message);
        },
        onReceiveStatus: (status, next) => {
          if (status.code !== grpc.status.OK) {
            logger.error({
              code: status.code,
              message: status.message,
              details: status.details,
            });
          }
          next(status);
        },
      });
    },
  });
}
```

### Client Interceptor
```typescript
function retryInterceptor(options, nextCall) {
  return new InterceptingCall(nextCall(options), {
    start: (metadata, listener, next) => {
      next(metadata, {
        onReceiveStatus: (status, next) => {
          if (isRetryable(status)) {
            return retryCall(options, nextCall);
          }
          next(status);
        },
      });
    },
  });
}
```

## Deadline Propagation

### Setting Deadlines
```typescript
import * as grpc from '@grpc/grpc-js';

// Client sets deadline
const deadline = new Date();
deadline.setSeconds(deadline.getSeconds() + 5);

client.getUser(
  { id: '123' },
  { deadline },
  (error, response) => {
    if (error?.code === grpc.status.DEADLINE_EXCEEDED) {
      console.error('Request timed out');
    }
  }
);
```

### Server-Side Deadline Check
```typescript
function getUser(call, callback) {
  if (call.cancelled) {
    return callback({
      code: grpc.status.CANCELLED,
      message: 'Client cancelled the request',
    });
  }

  const deadline = call.getDeadline();
  if (deadline && Date.now() >= deadline) {
    return callback({
      code: grpc.status.DEADLINE_EXCEEDED,
      message: 'Deadline exceeded',
    });
  }

  // Process request
  const user = userService.findById(call.request.id);
  callback(null, user);
}
```

## Error Logging and Monitoring

```typescript
function loggingInterceptor(options, nextCall) {
  const startTime = Date.now();

  return new InterceptingCall(nextCall(options), {
    start: (metadata, listener, next) => {
      next(metadata, {
        onReceiveStatus: (status, next) => {
          const duration = Date.now() - startTime;
          logger.info({
            method: options.method_definition.path,
            code: status.code,
            duration,
            metadata: metadata.get('x-request-id'),
          });

          if (status.code !== grpc.status.OK) {
            metrics.increment('grpc.errors', {
              method: options.method_definition.path,
              code: status.code,
            });
          }

          next(status);
        },
      });
    },
  });
}
```

## Key Points
- Always return standard gRPC status codes with appropriate error details
- Use google.rpc.Status for rich error information with typed details
- Implement client-side error mapping to domain-specific exceptions
- Use interceptors for cross-cutting error handling and logging
- Always set deadlines on client calls to prevent resource leaks
- Check for cancellation on the server side for streaming RPCs
- Retry only on idempotent-safe errors (UNAVAILABLE, DEADLINE_EXCEEDED)
- Never retry on INVALID_ARGUMENT or PERMISSION_DENIED
- Log all errors with structured context for debugging
- Monitor error rates per method and status code
