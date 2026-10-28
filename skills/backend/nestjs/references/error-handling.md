# NestJS Error Handling: Exceptions, Filters, and Problem Details

How NestJS turns thrown errors into responses, how to design a consistent error contract, and how to keep domain code free of HTTP concerns.

## Built-in Behavior

Any unhandled exception reaches the global exception layer. `HttpException` subclasses become their status code and body; anything else becomes `500 {"statusCode":500,"message":"Internal server error"}`.

| Exception | Status |
|-----------|--------|
| `BadRequestException` | 400 |
| `UnauthorizedException` | 401 |
| `ForbiddenException` | 403 |
| `NotFoundException` | 404 |
| `ConflictException` | 409 |
| `UnprocessableEntityException` | 422 |
| `TooManyRequestsException` (from `@nestjs/throttler` it is `ThrottlerException`) | 429 |
| `InternalServerErrorException` | 500 |
| `ServiceUnavailableException` | 503 |

```typescript
throw new NotFoundException(`Order ${id} not found`);
throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email already registered' });
throw new BadRequestException('Invalid cursor', { cause: err, description: 'cursor must be base64' });
```

## Keep Domain Errors HTTP-Free

```typescript
// domain/errors.ts
export abstract class DomainError extends Error {
  abstract readonly code: string;
}
export class OrderNotFoundError extends DomainError {
  readonly code = 'ORDER_NOT_FOUND';
  constructor(readonly orderId: string) { super(`Order ${orderId} not found`); }
}
export class InsufficientStockError extends DomainError {
  readonly code = 'INSUFFICIENT_STOCK';
  constructor(readonly sku: string, readonly requested: number) { super(`Insufficient stock for ${sku}`); }
}
```

Services throw domain errors; a filter maps them to HTTP. The same service can then be used from a queue consumer or CLI.

## Global Filter Producing RFC 9457 Problem Details

```typescript
// common/filters/problem-details.filter.ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainError, OrderNotFoundError, InsufficientStockError } from '../../domain/errors';

const DOMAIN_STATUS: Record<string, number> = {
  ORDER_NOT_FOUND: HttpStatus.NOT_FOUND,
  INSUFFICIENT_STOCK: HttpStatus.CONFLICT,
};

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const { status, title, detail, code } = this.classify(exception);

    if (status >= 500) {
      this.logger.error(`Unhandled error on ${req.method} ${req.url} requestId=${req.headers['x-request-id']}`,
        exception instanceof Error ? exception.stack : String(exception));
    }

    res.status(status).type('application/problem+json').json({
      type: `https://errors.example.com/${code.toLowerCase()}`,
      title,
      status,
      detail,
      instance: req.originalUrl,
      code,
    });
  }

  private classify(e: unknown) {
    if (e instanceof DomainError) {
      const status = DOMAIN_STATUS[e.code] ?? HttpStatus.UNPROCESSABLE_ENTITY;
      return { status, title: e.code, detail: e.message, code: e.code };
    }
    if (e instanceof HttpException) {
      const body = e.getResponse();
      const detail = typeof body === 'string' ? body : (body as { message?: unknown }).message;
      return { status: e.getStatus(), title: e.name, detail, code: e.name.replace(/Exception$/, '').toUpperCase() };
    }
    return { status: 500, title: 'Internal Server Error', detail: 'Unexpected error', code: 'INTERNAL' };
  }
}
```

Register with DI so the filter can inject services:

```typescript
// app.module.ts
providers: [{ provide: APP_FILTER, useClass: ProblemDetailsFilter }]
```

`app.useGlobalFilters(new X())` works too but bypasses DI.

## Validation Errors

`ValidationPipe` throws `BadRequestException` with an array of messages. Customize to return field-level errors:

```typescript
new ValidationPipe({
  whitelist: true,
  transform: true,
  exceptionFactory: (errors) => new UnprocessableEntityException({
    message: 'Validation failed',
    errors: errors.map((e) => ({ field: e.property, constraints: e.constraints })),
  }),
});
```

## Mapping Database Errors

```typescript
// PostgreSQL unique violation via TypeORM
import { QueryFailedError } from 'typeorm';

try {
  await this.repo.insert(user);
} catch (err) {
  if (err instanceof QueryFailedError && (err.driverError as { code?: string }).code === '23505') {
    throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email already registered' });
  }
  throw err;
}
```

Prisma raises `PrismaClientKnownRequestError` with codes such as `P2002` (unique) and `P2025` (record not found). Rely on the constraint rather than a "check then insert" race.

## Non-HTTP Contexts

`host.getType()` returns `'http' | 'rpc' | 'ws'` (and `'graphql'` via `GqlArgumentsHost`). For microservices throw `RpcException`; for gateways throw `WsException`. A filter decorated with `@Catch()` that assumes HTTP will crash in other contexts, so branch on `getType()`.

## Interceptors for Timeouts and Error Mapping

```typescript
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      timeout(5000),
      catchError((err) => throwError(() =>
        err instanceof TimeoutError ? new RequestTimeoutException() : err)),
    );
  }
}
```

## Process-Level Safety

- Do not swallow `unhandledRejection`; log and let the orchestrator restart on `uncaughtException`, since process state may be corrupt.
- Await every promise; floating promises escape filters. Enable `@typescript-eslint/no-floating-promises`.

## Pitfalls

- Returning stack traces or ORM messages to clients.
- `catch (e) { return null; }` hiding failures.
- Throwing `HttpException` from domain code, coupling it to HTTP.
- Logging 4xx as errors, flooding alerts.
- Filters relying on Express types when running on Fastify (`FastifyReply.code()` vs `res.status()`).

## Checklist

- [ ] One global filter with a stable error schema (problem+json)
- [ ] Domain errors mapped centrally to status codes
- [ ] 5xx logged with stack and request ID; 4xx logged at info/warn
- [ ] Validation errors return field-level detail
- [ ] DB constraint violations mapped to 409/422
- [ ] RPC/WS contexts handled separately
