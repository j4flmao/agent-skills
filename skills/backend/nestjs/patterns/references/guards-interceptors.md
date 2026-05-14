# NestJS Guards & Interceptors

## Guards (Auth)
```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const token = this.extractToken(request)
    if (!token) return false
    try {
      request.user = this.jwtService.verify(token)
      return true
    } catch { return false }
  }
}

// Usage
@UseGuards(JwtAuthGuard)
@Get('/orders')
async getOrders() { ... }
```

## Interceptors (Transform)
```typescript
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({
        data,
        status: context.switchToHttp().getResponse().statusCode,
        timestamp: new Date().toISOString(),
        requestId: context.switchToHttp().getRequest().id,
      }))
    )
  }
}
```

## Pipes (Validation)
```typescript
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}
  transform(value: unknown) {
    const result = this.schema.safeParse(value)
    if (!result.success) throw new BadRequestException(result.error.format())
    return result.data
  }
}

// Usage
@Post('/orders')
async placeOrder(@Body(new ZodValidationPipe(placeOrderSchema)) dto: PlaceOrderDto)
```

## Exception Filters
```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const status = exception instanceof HttpException ? exception.getStatus() : 500
    response.status(status).json({
      error: { code: status, message: exception instanceof Error ? exception.message : 'Internal Server Error' },
      timestamp: new Date().toISOString(),
    })
  }
}
```

## Middleware (Logging)
```typescript
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now()
    res.on('finish', () => {
      logger.info({ method: req.method, path: req.path, status: res.statusCode, duration: Date.now() - start })
    })
    next()
  }
}
```
