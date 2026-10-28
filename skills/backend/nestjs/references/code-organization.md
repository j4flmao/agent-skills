# NestJS Code Organization: Folders, DTOs, Config, and Monorepos

How to lay out a NestJS codebase so features are easy to find, boundaries are enforced, and shared code does not turn into a dumping ground. Architectural layering is covered in `architecture-patterns.md`; this file is about files, naming and tooling.

## Feature-First Layout

```
src/
  main.ts
  app.module.ts
  config/
    configuration.ts
    env.validation.ts
  common/                 # cross-cutting, framework-level only
    filters/
    guards/
    interceptors/
    decorators/
  users/
    users.module.ts
    users.controller.ts
    users.service.ts
    users.repository.ts
    dto/
      create-user.dto.ts
      update-user.dto.ts
      user-response.dto.ts
    entities/user.entity.ts
    users.service.spec.ts
  orders/                 # same structure as users/
test/
  app.e2e-spec.ts
  jest-e2e.json
```

Group by feature, not by type (`controllers/`, `services/` at the root scales badly). Unit specs sit next to the file; e2e tests live in `test/`.

## Naming Conventions

| Item | File | Class |
|------|------|-------|
| Module | `users.module.ts` | `UsersModule` |
| Controller | `users.controller.ts` | `UsersController` |
| Service | `users.service.ts` | `UsersService` |
| DTO | `create-user.dto.ts` | `CreateUserDto` |
| Guard | `roles.guard.ts` | `RolesGuard` |
| Unit test | `users.service.spec.ts` | n/a |
| E2E test | `users.e2e-spec.ts` | n/a |

The Nest CLI generates these: `nest g resource users` scaffolds module, controller, service, DTOs and entity.

## DTOs and Validation

```typescript
// users/dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export enum Role { User = 'user', Admin = 'admin' }

export class CreateUserDto {
  @IsEmail() readonly email!: string;
  @IsString() @MinLength(12) readonly password!: string;
  @IsOptional() @IsEnum(Role) readonly role?: Role;
}

// users/dto/update-user.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types'; // or @nestjs/swagger to keep docs metadata
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {}
```

Global validation:

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,              // strip unknown properties
  forbidNonWhitelisted: true,   // reject them instead
  transform: true,              // instantiate DTO classes, convert primitives
}));
```

Keep separate request and response DTOs; never return ORM entities directly (leaks columns such as password hashes). Use `ClassSerializerInterceptor` with `@Exclude()`/`@Expose()` or explicit mapping.

## Configuration

```typescript
// config/env.validation.ts
import { z } from 'zod';
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
});
export type Env = z.infer<typeof envSchema>;

// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  cache: true,
  validate: (raw) => envSchema.parse(raw), // throws at boot if invalid
});
```

Use `configService.getOrThrow<T>('KEY')` so a missing key fails loudly. Group related settings with `registerAs('db', () => ({...}))` and inject via `@Inject(dbConfig.KEY)`.

## Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": { "@common/*": ["src/common/*"], "@users/*": ["src/users/*"] }
  }
}
```

Jest needs matching `moduleNameMapper`. Aliases help readability but do not enforce boundaries.

## Enforcing Boundaries

- Each feature exposes an `index.ts` barrel of what other features may import; ESLint `no-restricted-imports` blocks deep imports like `@users/users.repository`.
- `eslint-plugin-boundaries` or `dependency-cruiser` can encode rules such as "domain must not import infrastructure".
- Avoid barrels inside a feature that re-export everything: they cause circular import problems with decorators.

## Nest Monorepo Mode

```bash
nest new platform
cd platform
nest generate app billing      # converts to monorepo, adds apps/billing
nest generate library shared   # adds libs/shared, alias @app/shared
```

```
apps/
  api/src/...
  billing/src/...
libs/
  shared/src/...
nest-cli.json        # "monorepo": true, projects map
```

Build one app with `nest build billing`. For larger repos with caching and affected-only builds, Nx (`@nx/nest`) or Turborepo is common.

## Shared Code Guidelines

| Belongs in `common/` or a lib | Does not |
|-------------------------------|----------|
| Exception filters, logging interceptor | Business rules of one feature |
| Auth guards, decorators like `@CurrentUser()` | Entities owned by one feature |
| Pagination DTO, base error types | "Utils" grab-bag |

## Custom Decorators

```typescript
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// Compose
export function Auth(...roles: Role[]) {
  return applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles(...roles), ApiBearerAuth());
}
```

Nest 10+ also offers `Reflector.createDecorator<Role[]>()` for type-safe metadata.

## Pitfalls

- `whitelist` off: mass-assignment of fields like `role`.
- Entities used as DTOs: validation and persistence concerns tangled.
- Config read via `process.env` throughout code: untestable and unvalidated.
- Barrel files causing `undefined` providers due to circular imports.

## Checklist

- [ ] Feature folders with module, controller, service, dto, spec
- [ ] Global `ValidationPipe` with `whitelist` and `transform`
- [ ] Env validated at boot; `getOrThrow` for required keys
- [ ] Response DTOs separate from entities
- [ ] Import boundaries enforced by lint
- [ ] Monorepo libs used for shared code across apps
