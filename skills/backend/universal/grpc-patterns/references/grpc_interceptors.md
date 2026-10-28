# gRPC Interceptors Across Languages (Java, Python, Node.js, .NET) and Streaming Wrappers

The Go-focused interceptor guide is `grpc-interceptors.md`. This reference shows the equivalent APIs in Java (grpc-java), Python (grpcio, including asyncio), Node.js (`@grpc/grpc-js`) and .NET (Grpc.AspNetCore), plus patterns that are easy to get wrong in any language: wrapping streams, propagating deadlines and metadata, and mapping errors to status codes.

## API Map

| Language | Server hook | Client hook | Chain registration |
|----------|-------------|-------------|--------------------|
| Go | `grpc.UnaryServerInterceptor`, `grpc.StreamServerInterceptor` | `grpc.UnaryClientInterceptor`, `grpc.StreamClientInterceptor` | `grpc.ChainUnaryInterceptor(...)` |
| Java | `io.grpc.ServerInterceptor` | `io.grpc.ClientInterceptor` | `ServerInterceptors.intercept(service, i1, i2)` (last added runs first) |
| Python (sync) | `grpc.ServerInterceptor` | `grpc.UnaryUnaryClientInterceptor` etc. | `grpc.server(executor, interceptors=[...])`, `grpc.intercept_channel(...)` |
| Python (asyncio) | `grpc.aio.ServerInterceptor` | `grpc.aio.UnaryUnaryClientInterceptor` etc. | `grpc.aio.server(interceptors=[...])`, `grpc.aio.insecure_channel(..., interceptors=[...])` |
| Node.js | Server interceptors (`interceptors` option, `@grpc/grpc-js` 1.10+) | `Interceptor` functions with `InterceptingCall` | `new Server({ interceptors: [...] })`, client `interceptors` option |
| .NET | `Grpc.Core.Interceptors.Interceptor` | same base class | `services.AddGrpc(o => o.Interceptors.Add<T>())`, `channel.Intercept(...)` |

Recommended order (outermost first): recovery/panic, tracing/metrics, logging, deadline checks, authentication, authorization, rate limiting, validation, then the handler.

## Java

```java
public final class AuthInterceptor implements ServerInterceptor {
  static final Metadata.Key<String> AUTHORIZATION =
      Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);
  static final Context.Key<Principal> PRINCIPAL = Context.key("principal");

  private final TokenVerifier verifier;

  public AuthInterceptor(TokenVerifier verifier) { this.verifier = verifier; }

  @Override
  public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
      ServerCall<ReqT, RespT> call, Metadata headers, ServerCallHandler<ReqT, RespT> next) {
    String header = headers.get(AUTHORIZATION);
    if (header == null || !header.startsWith("Bearer ")) {
      call.close(Status.UNAUTHENTICATED.withDescription("missing bearer token"), new Metadata());
      return new ServerCall.Listener<>() {};
    }
    try {
      Principal p = verifier.verify(header.substring(7));
      Context ctx = Context.current().withValue(PRINCIPAL, p);
      return Contexts.interceptCall(ctx, call, headers, next);
    } catch (InvalidTokenException e) {
      call.close(Status.UNAUTHENTICATED.withDescription("invalid token"), new Metadata());
      return new ServerCall.Listener<>() {};
    }
  }
}

Server server = ServerBuilder.forPort(8443)
    .addService(ServerInterceptors.intercept(new PaymentService(), new AuthInterceptor(verifier), new LoggingInterceptor()))
    .build();
```

`ServerInterceptors.intercept` applies interceptors so that the **last** one in the argument list is invoked first; in the example `LoggingInterceptor` wraps `AuthInterceptor`. Use `Contexts.interceptCall` so the `Context` is attached on every listener callback, not only the first.

## Python (asyncio)

```python
import grpc
from grpc import aio

class AuthInterceptor(aio.ServerInterceptor):
    def __init__(self, verifier) -> None:
        self._verifier = verifier

    async def intercept_service(self, continuation, handler_call_details):
        md = dict(handler_call_details.invocation_metadata or ())
        token = md.get("authorization", "")
        if not token.startswith("Bearer ") or not self._verifier.is_valid(token[7:]):
            return _abort_handler(grpc.StatusCode.UNAUTHENTICATED, "invalid or missing token")
        return await continuation(handler_call_details)

def _abort_handler(code: grpc.StatusCode, details: str) -> grpc.RpcMethodHandler:
    async def abort(request, context: aio.ServicerContext):
        await context.abort(code, details)
    return grpc.unary_unary_rpc_method_handler(abort)

server = aio.server(interceptors=[AuthInterceptor(verifier)])
```

Python server interceptors operate at the handler level: they see method name and metadata but not the request message. To inspect messages (validation, logging bodies), wrap the returned `RpcMethodHandler`'s behaviour function, or validate inside the servicer. The abort helper above handles unary-unary methods; streaming methods need matching handler types.

Client side:

```python
class DeadlineDefaultInterceptor(aio.UnaryUnaryClientInterceptor):
    async def intercept_unary_unary(self, continuation, client_call_details, request):
        if client_call_details.timeout is None:
            client_call_details = client_call_details._replace(timeout=5.0)
        return await continuation(client_call_details, request)

channel = aio.secure_channel(target, creds, interceptors=[DeadlineDefaultInterceptor()])
```

## Node.js (@grpc/grpc-js)

```ts
import { InterceptingCall, Interceptor, Metadata } from '@grpc/grpc-js';

const authClientInterceptor = (getToken: () => string): Interceptor =>
  (options, nextCall) =>
    new InterceptingCall(nextCall(options), {
      start(metadata: Metadata, listener, next) {
        metadata.set('authorization', `Bearer ${getToken()}`);
        next(metadata, listener);
      },
    });

const client = new PaymentsClient(target, credentials, {
  interceptors: [authClientInterceptor(() => tokenCache.current())],
});
```

Server interceptors in grpc-js receive `(methodDescriptor, call)` and return a `ServerInterceptingCall` with listener/responder hooks (`onReceiveMetadata`, `onReceiveMessage`, `sendStatus`). Check your grpc-js version supports them; otherwise wrap handlers in a higher-order function.

## .NET (Grpc.AspNetCore)

```csharp
public sealed class ExceptionMappingInterceptor(ILogger<ExceptionMappingInterceptor> logger) : Interceptor
{
    public override async Task<TResponse> UnaryServerHandler<TRequest, TResponse>(
        TRequest request, ServerCallContext context, UnaryServerMethod<TRequest, TResponse> continuation)
    {
        try
        {
            return await continuation(request, context);
        }
        catch (NotFoundException ex)
        {
            throw new RpcException(new Status(StatusCode.NotFound, ex.Message));
        }
        catch (Exception ex) when (ex is not RpcException)
        {
            logger.LogError(ex, "Unhandled error in {Method}", context.Method);
            throw new RpcException(new Status(StatusCode.Internal, "internal error"));
        }
    }
}

builder.Services.AddGrpc(o => o.Interceptors.Add<ExceptionMappingInterceptor>());
```

In ASP.NET Core, authentication/authorization are usually handled by ASP.NET middleware and `[Authorize]` attributes rather than interceptors.

## Wrapping Streams

Streaming interceptors must wrap the stream object to observe messages:

```go
type countingStream struct {
    grpc.ServerStream
    recv, sent int
}

func (s *countingStream) RecvMsg(m any) error {
    err := s.ServerStream.RecvMsg(m)
    if err == nil { s.recv++ }
    return err
}
func (s *countingStream) SendMsg(m any) error {
    err := s.ServerStream.SendMsg(m)
    if err == nil { s.sent++ }
    return err
}
```

To change the stream's context (e.g. attach a principal), override `Context()` on the wrapper. In Java, wrap `ServerCall` (`ForwardingServerCall`) and the listener (`ForwardingServerCallListener`).

## Cross-Cutting Rules

- **Deadlines**: clients always set deadlines; servers check `ctx` cancellation and propagate the remaining deadline to downstream calls.
- **Metadata**: header keys are lowercase; binary values use the `-bin` suffix. Do not log `authorization` or other secrets.
- **Errors**: map domain errors to canonical codes (`INVALID_ARGUMENT`, `NOT_FOUND`, `ALREADY_EXISTS`, `FAILED_PRECONDITION`, `PERMISSION_DENIED`, `UNAUTHENTICATED`, `RESOURCE_EXHAUSTED`, `UNAVAILABLE`); never leak stack traces in status details.
- **Retries**: configure via service config retry policy (`retryableStatusCodes: ["UNAVAILABLE"]`) rather than hand-written client interceptors, and only for idempotent methods.
- **Observability**: prefer OpenTelemetry instrumentation libraries (grpc-java OTel module, `opentelemetry-instrumentation-grpc` for Python, `otelgrpc` stats handler for Go) over custom tracing interceptors.

## Testing Interceptors

- Unit-test with in-process transports: Go `bufconn`, Java `InProcessServerBuilder`, .NET `WebApplicationFactory` with gRPC client.
- Cover: missing/invalid token, expired deadline, panic/exception mapping, metadata propagation, and streaming message counts.

## Checklist

- [ ] Interceptor order documented and matches the intended outermost-first chain
- [ ] Auth interceptors attach principal to context; handlers read it from context
- [ ] Streams wrapped correctly; context overrides where needed
- [ ] Errors mapped to canonical status codes without leaking internals
- [ ] Deadlines defaulted on clients and propagated on servers
- [ ] OTel instrumentation instead of bespoke tracing
- [ ] In-process tests for each interceptor
