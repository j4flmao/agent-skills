# Decorators and Metadata in NestJS

## Overview
NestJS uses decorators extensively for metaprogramming. Custom decorators encapsulate cross-cutting concerns, reduce boilerplate, and leverage Reflect metadata for runtime configuration.

## Built-in Decorators

### Parameter Decorators
```typescript
@Controller('users')
export class UserController {
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('include') include?: string,
    @Body() body: CreateUserDto,
    @Headers('authorization') auth: string,
    @Ip() ip: string,
    @UserAgent() ua: string,
  ) {
    return this.userService.findOne(id)
  }
}
```

### Method Decorators
```typescript
@Controller('orders')
export class OrderController {
  @Get()
  @HttpCode(200)
  @Header('Cache-Control', 'max-age=60')
  async findAll(@Query() query: PaginationDto) {
    return this.orderService.findAll(query)
  }

  @Post()
  @HttpCode(201)
  @Redirect('/orders', 301)
  async create(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.orderService.remove(id)
  }
}
```

## Custom Decorators

### Parameter Decorator
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const user = request.user
    return data ? user?.[data] : user
  },
)

// Usage
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user
}

@Get('profile/email')
getEmail(@CurrentUser('email') email: string) {
  return email
}
```

### Method Decorator with Metadata
```typescript
import { SetMetadata } from '@nestjs/common'

export const Roles = (...roles: string[]) => SetMetadata('roles', roles)
export const Permissions = (...perms: string[]) => SetMetadata('permissions', perms)
export const Public = () => SetMetadata('isPublic', true)

// Usage
@Controller('admin')
export class AdminController {
  @Get('users')
  @Roles('admin')
  @Permissions('users:read')
  findAll() {
    // ...
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok' }
  }
}
```

### Class Decorator
```typescript
export function ControllerAuth(guardType: string) {
  return (target: any) => {
    Reflect.defineMetadata('auth:guardType', guardType, target)
  }
}

@ControllerAuth('jwt')
@Controller('secure')
export class SecureController {
  @Get()
  findAll() {
    // ...
  }
}
```

## Custom Decorator Factories

### Composite Decorator
```typescript
import { applyDecorators } from '@nestjs/common'

export function Auth(roles: string[] = []) {
  return applyDecorators(
    SetMetadata('roles', roles),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
  )
}

export function Paginated() {
  return applyDecorators(
    ApiQuery({ name: 'page', type: Number, required: false }),
    ApiQuery({ name: 'limit', type: Number, required: false }),
    ApiQuery({ name: 'sort', type: String, required: false }),
  )
}

// Usage
@Controller('users')
export class UserController {
  @Get()
  @Auth(['admin'])
  @Paginated()
  @ApiOkResponse({ type: [User] })
  findAll() {
    // ...
  }
}
```

## Reflect Metadata Patterns

### Reading Metadata in Guards
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler())
    if (!roles || roles.length === 0) return true

    const request = context.switchToHttp().getRequest()
    return roles.some(role => request.user?.roles?.includes(role))
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    )
    if (!permissions) return true

    const { user } = context.switchToHttp().getRequest()
    return permissions.every(p => user.permissions?.includes(p))
  }
}
```

### Metadata in Interceptors
```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditEvent = this.reflector.get<string>(
      'audit:event',
      context.getHandler(),
    )

    if (!auditEvent) return next.handle()

    const request = context.switchToHttp().getRequest()
    const auditLog = {
      event: auditEvent,
      userId: request.user?.id,
      path: request.path,
      method: request.method,
      timestamp: new Date(),
    }

    return next.handle().pipe(
      tap(() => {
        console.log('Audit:', auditLog)
        // Send to audit service
      }),
    )
  }
}

export const Audit = (event: string) => SetMetadata('audit:event', event)
```

## Validation Decorators

### Custom Class Validator Decorator
```typescript
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator'

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false
          const hasUpper = /[A-Z]/.test(value)
          const hasLower = /[a-z]/.test(value)
          const hasNumber = /\d/.test(value)
          const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(value)
          return value.length >= 8 && hasUpper && hasLower && hasNumber && hasSpecial
        },
        defaultMessage() {
          return 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
        },
      },
    })
  }
}

export function IsValidEmail(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidEmail',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        },
      },
    })
  }
}

// Usage
export class CreateUserDto {
  @IsString()
  @IsStrongPassword()
  password: string

  @IsEmail()
  @IsValidEmail()
  email: string
}
```

## Custom Pipe with Decorator Metadata

### Validation Pipe with Metadata
```typescript
import { SetMetadata } from '@nestjs/common'

export const SkipValidation = () => SetMetadata('skipValidation', true)

@Injectable()
export class ConditionalValidationPipe implements PipeTransform {
  constructor(private reflector: Reflector) {}

  transform(value: any, metadata: ArgumentMetadata) {
    const skip = this.reflector.get<boolean>(
      'skipValidation',
      metadata.metatype,
    )
    if (skip) return value
    // Apply validation
    return value
  }
}
```

## Method Wrapping with Decorators

### Logging Decorator
```typescript
export function LogExecutionTime() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value
    descriptor.value = function (...args: any[]) {
      const start = Date.now()
      const result = originalMethod.apply(this, args)
      const duration = Date.now() - start
      console.log(`${propertyKey} took ${duration}ms`)
      return result
    }
    return descriptor
  }
}
```

## Metadata Storage and Retrieval

### Custom Metadata Manager
```typescript
export class MetadataStore {
  private static metadata = new Map<string, any>()

  static set(key: string, value: any, target: any) {
    const id = `${target.constructor.name}:${key}`
    this.metadata.set(id, value)
  }

  static get(key: string, target: any) {
    const id = `${target.constructor.name}:${key}`
    return this.metadata.get(id)
  }

  static getAll(target: any) {
    const prefix = `${target.constructor.name}:`
    const result: Record<string, any> = {}
    for (const [key, value] of this.metadata) {
      if (key.startsWith(prefix)) {
        result[key.slice(prefix.length)] = value
      }
    }
    return result
  }
}
```

## Testing Custom Decorators

### Decorator Unit Test
```typescript
describe('CurrentUser', () => {
  it('should extract user from request', () => {
    const mockUser = { id: '1', name: 'Test' }
    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: mockUser }),
      }),
    } as ExecutionContext

    const result = CurrentUser(null, mockCtx)
    expect(result).toEqual(mockUser)
  })

  it('should extract specific property', () => {
    const mockCtx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: '1', name: 'Test' } }),
      }),
    } as ExecutionContext

    const result = CurrentUser('name', mockCtx)
    expect(result).toBe('Test')
  })
})
```

## Key Points
- Custom parameter decorators encapsulate request data extraction
- SetMetadata with Reflector enables data-driven guards and interceptors
- applyDecorators composes multiple decorators into single declarations
- Custom validators extend class-validator with domain-specific rules
- Metadata can be read at class level, method level, or merged with getAllAndOverride
- Method decorators wrap behavior for cross-cutting concerns
- Composite decorators reduce boilerplate in controllers
- Test decorators by simulating ExecutionContext or calling the factory
- Decorators keep controllers clean while adding functionality
- Reflect metadata is the backbone of NestJS DI and guard systems
