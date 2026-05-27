---
name: nestjs-patterns
description: >
  Use this skill when the user says 'NestJS guard', 'NestJS interceptor', 'NestJS pipe', 'NestJS middleware', 'NestJS microservice', 'NestJS event', 'Nest CQRS', 'exception filter Nest', 'NestJS decorator', or when implementing cross-cutting concerns in NestJS. This skill enforces: guard for auth, interceptor for non-functional concerns, pipe for validation, exception filter for error mapping, and CQRS for command/query separation. Requires @nestjs/core. Do NOT use for: module organization, general TypeScript, or Express middleware directly.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, nestjs, phase-2, typescript]
---

# NestJS Patterns

## Purpose
Implement NestJS cross-cutting concerns with strict separation: guards for auth, interceptors for non-functional concerns, pipes for validation, exception filters for error mapping.

## Agent Protocol

### Trigger
Exact user phrases: "NestJS guard", "NestJS interceptor", "NestJS pipe", "NestJS middleware", "NestJS microservice", "NestJS event", "Nest CQRS", "exception filter Nest", "NestJS decorator".

### Input Context
Before activating, verify:
- package.json has @nestjs/core dependency.
- The concern being implemented is known (auth guard, logging interceptor, validation pipe, etc.).

### Output Artifact
No file output. Produces code examples as text.

### Response Format
```
Pattern: {guard/interceptor/pipe/filter}
Purpose: {one sentence}
Code: {implementation}
Placement: {where to register — controller/module/global}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Guard does auth only (no business logic).
- [ ] Interceptor handles non-functional concerns only (logging, timing, transforming).
- [ ] Pipe validates and transforms DTO (no side effects).
- [ ] Exception filter maps domain errors to HTTP status codes.
- [ ] CQRS commands for writes, queries for reads.
- [ ] Domain exceptions never reference HTTP concepts.

### Max Response Length
Per pattern: 20 lines maximum.

## Workflow

### Step 1: Guard (Auth)
Guard decides: is this request allowed? Yes or no. No try-catch in guards.
```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const token = this.extractToken(request)
    if (!token) throw new UnauthorizedException()
    try {
      request.user = this.jwtService.verify(token)
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }

  private extractToken(request: Request): string | null {
    const auth = request.headers.authorization
    if (!auth?.startsWith('Bearer ')) return null
    return auth.slice(7)
  }
}
```

### Step 2: Interceptor (Transformation, Logging, Timing)
```typescript
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({
        data,
        meta: {
          requestId: randomUUID(),
          timestamp: new Date().toISOString(),
        },
        error: null,
      })),
    )
  }
}
```

### Step 3: Pipe (Validation)
```typescript
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException({
        error: { code: 'VALIDATION_ERROR', details: result.error.issues },
      })
    }
    return result.data
  }
}
```

### Step 4: Exception Filter (Error Mapping)
```typescript
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    const statusMap: Record<string, number> = {
      NotFoundError: 404,
      UnauthorizedError: 401,
      ForbiddenError: 403,
      ValidationError: 422,
      ConflictError: 409,
    }

    const status = statusMap[exception.constructor.name] ?? 500
    response.status(status).json({
      data: null,
      meta: { requestId: randomUUID(), timestamp: new Date().toISOString() },
      error: {
        code: exception.constructor.name.toUpperCase(),
        message: (exception as Error).message,
      },
    })
  }
}
```

### Step 5: Microservice Event Consumer
```typescript
@Controller()
export class OrderConsumer {
  constructor(private commandBus: CommandBus) {}

  @EventPattern('payment_processed')
  async handle(@Payload() event: PaymentProcessedEvent) {
    await this.commandBus.execute(new ConfirmOrderCommand(event.orderId))
  }
}
```

## Rules
- Guards at controller level, not in handlers. Auth is a presentation concern.
- Interceptors handle non-functional concerns only. No business logic in interceptors.
- Pipes are pure transformation: input validation + type coercion. No side effects.
- Exception filter is the ONLY place where NestJS HTTP exceptions should be thrown from domain errors. Domain errors never reference HTTP.
- CQRS: CommandBus for writes, QueryBus for reads. Never in the same handler.

## References
  - references/cqrs-events.md — CQRS and Events in NestJS
  - references/decorators-metadata.md — Decorators and Metadata in NestJS
  - references/guards-interceptors.md — NestJS Guards & Interceptors
  - references/microservices.md — NestJS Microservices
  - references/nestjs-guards-interceptors.md — NestJS Guards and Interceptors
  - references/nestjs-providers-patterns.md — NestJS Providers and DI
  - references/nestjs-testing.md — NestJS Testing
  - references/pipes-filters.md — NestJS Pipes & Filters
## Handoff
No artifact produced.
Next skill: backend-testing — test NestJS patterns.
Carry forward: guard/interceptor/pipe setup, exception filter mapping, CQRS structure.
