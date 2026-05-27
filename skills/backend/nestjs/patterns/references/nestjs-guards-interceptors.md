# NestJS Guards and Interceptors

## Guards

```typescript
import {
  Injectable, CanActivate, ExecutionContext,
  UnauthorizedException, SetMetadata,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      'isPublic',
      [context.getHandler(), context.getClass()],
    )

    if (isPublic) return true

    const request = context.switchToHttp().getRequest()
    const token = this.extractToken(request)

    if (!token) throw new UnauthorizedException('No token provided')

    try {
      const payload = await this.validateToken(token)
      request.user = payload
      return true
    } catch {
      throw new UnauthorizedException('Invalid token')
    }
  }

  private extractToken(request: any): string | null {
    const auth = request.headers?.authorization
    if (!auth) return null

    const [type, token] = auth.split(' ')
    return type === 'Bearer' ? token : null
  }
}

export const Public = () => SetMetadata('isPublic', true)

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    )

    if (!requiredRoles) return true

    const { user } = context.switchToHttp().getRequest()
    return requiredRoles.some(role => user.roles?.includes(role))
  }
}

export const Roles = (...roles: string[]) => SetMetadata('roles', roles)
```

## Interceptors

```typescript
import {
  Injectable, NestInterceptor, ExecutionContext,
  CallHandler, Logger,
} from '@nestjs/common'
import { Observable, tap } from 'rxjs'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger = new Logger('HTTP')

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const { method, url } = request
    const now = Date.now()

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse()
        const duration = Date.now() - now
        this.logger.log(`${method} ${url} ${response.statusCode} ${duration}ms`)
      }),
    )
  }
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    )
  }
}
```

## Pipes

```typescript
import {
  PipeTransform, Injectable, ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common'
import { z } from 'zod'

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: z.ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.flatten().fieldErrors,
      })
    }

    return result.data
  }
}

// Usage
@Post()
async createUser(
  @Body(new ZodValidationPipe(createUserSchema))
  createUserDto: CreateUserDto,
) {
  return this.userService.create(createUserDto)
}
```

## Key Points

- Use guards for authentication and authorization logic
- Use interceptors for cross-cutting concerns (logging, transformation)
- Use pipes for request validation and transformation
- Use custom decorators with SetMetadata for metadata
- Combine multiple guards for layered security
- Use execution context for protocol-agnostic guards
- Handle exceptions with exception filters
- Implement rate limiting with guards
- Use dependency injection within guards and interceptors
- Test guards and interceptors in isolation
- Use @Injectable() for all provider classes
- Apply guards globally or per-route with @UseGuards()
