# NestJS Pipes & Filters

## Built-in Pipes
```typescript
// Validation
@Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))

// Parse
@Param('id', ParseIntPipe) id: number
@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number
```

## Custom Validation Pipe (Zod)
```typescript
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100),
})

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}
  transform(value: unknown) {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      })
    }
    return result.data
  }
}
```

## Exception Filters
```typescript
// Domain-specific exception
export class OrderNotFoundException extends HttpException {
  constructor(orderId: string) {
    super({ error: 'order_not_found', message: `Order ${orderId} not found` }, 404)
  }
}

// Global exception filter
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    if (exception instanceof HttpException) {
      return response.status(exception.getStatus()).json(exception.getResponse())
    }
    logger.error({ err: exception })
    return response.status(500).json({ error: 'internal_server_error' })
  }
}
```
