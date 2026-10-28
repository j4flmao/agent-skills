# NestJS Security Best Practices

Defensive configuration for NestJS APIs: input validation, authentication and authorization, headers, rate limiting, CORS, secrets and dependency hygiene. Maps to common OWASP API Security Top 10 risks.

## Input Validation (mass assignment, injection)

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
}));
```

- Validate path/query params with pipes: `@Param('id', ParseUUIDPipe) id: string`.
- Use parameterized queries only. With TypeORM query builder use `:param` bindings; with Prisma avoid `$queryRawUnsafe`, prefer the `$queryRaw` tagged template.
- Limit body size: Express `app.useBodyParser('json', { limit: '100kb' })` (Nest 10+), Fastify `bodyLimit`.

## Authentication with JWT

```typescript
// auth/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: cfg.getOrThrow('JWT_PUBLIC_KEY'),
      algorithms: ['RS256'],              // pin algorithms
      issuer: 'https://auth.example.com',
      audience: 'orders-api',
      ignoreExpiration: false,
    });
  }
  validate(payload: { sub: string; roles: string[] }) {
    return { id: payload.sub, roles: payload.roles };
  }
}
```

Guidelines:
- Short-lived access tokens (minutes) plus rotating refresh tokens stored server-side (hashed) so they can be revoked.
- For browser clients prefer an `HttpOnly`, `Secure`, `SameSite` cookie session or BFF over tokens in `localStorage`.
- Hash passwords with Argon2id (`argon2` package) or bcrypt; never a fast hash.
- When verifying against an external IdP, use its JWKS endpoint (`jwks-rsa` `passportJwtSecret`).

## Global Auth by Default

Make every route protected unless explicitly public:

```typescript
export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { super(); }
  canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    return isPublic ? true : super.canActivate(ctx);
  }
}

// app.module.ts
providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_GUARD, useClass: RolesGuard }]
```

## Authorization: Roles and Object Ownership

Role checks are not enough; broken object-level authorization (BOLA) is the top API risk.

```typescript
@Get(':id')
async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
  const order = await this.orders.findForOwner(id, user.id); // WHERE id = $1 AND owner_id = $2
  if (!order) throw new NotFoundException();                  // 404, do not reveal existence
  return order;
}
```

For complex policies use CASL (`@casl/ability`) or an external engine (OPA, Cerbos) behind a guard.

## Security Headers

```typescript
import helmet from 'helmet';
app.use(helmet());   // Fastify: await app.register(require('@fastify/helmet'))
```

Helmet sets `Strict-Transport-Security`, `X-Content-Type-Options`, `Content-Security-Policy` defaults and others. For pure JSON APIs the CSP matters less, but keep `nosniff` and HSTS.

## CORS

```typescript
app.enableCors({
  origin: ['https://app.example.com'],  // explicit allow-list, never '*' with credentials
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
});
```

## Rate Limiting

```typescript
// app.module.ts
ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }] }),
providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]

// stricter on login
@Throttle({ default: { limit: 5, ttl: 60_000 } })
@Post('login')
login() {}
```

Use a Redis storage (`@nest-lab/throttler-storage-redis`) when running multiple replicas. Behind a proxy, configure `trust proxy` so the client IP is correct.

## Secrets and Configuration

- Read secrets from environment/secret manager at runtime; validate at boot.
- Never log tokens, passwords or full request bodies; redact with `pino` `redact` paths.
- Disable stack traces in error responses (see `error-handling.md`).

## Swagger Exposure

Only mount `SwaggerModule.setup()` in non-production or behind auth; it reveals the full API surface.

## Dependency and Supply Chain

```bash
npm audit --omit=dev
npx better-npm-audit audit   # or Snyk / Dependabot / Renovate
npm ci --ignore-scripts      # where install scripts are not needed
```

Commit the lockfile, pin the Node base image, and generate an SBOM in CI.

## CSRF

Only relevant for cookie-authenticated browser requests. Use `SameSite=Lax/Strict` cookies plus a CSRF token library (e.g. `csrf-csrf`). Bearer-token APIs are not vulnerable to classic CSRF.

## OWASP API Top 10 Mapping

| Risk | Nest control |
|------|--------------|
| Broken object level authorization | Ownership in queries, policy guards |
| Broken authentication | Passport strategies, pinned algorithms, short TTLs |
| Broken object property level authorization | `whitelist`, response DTOs |
| Unrestricted resource consumption | Throttler, body limits, pagination caps |
| Broken function level authorization | Global guard, `@Roles()` |
| Security misconfiguration | Helmet, CORS allow-list, Swagger off in prod |
| SSRF | Allow-list outbound hosts for URL-fetching features |

## Checklist

- [ ] Global auth guard with explicit `@Public()` opt-out
- [ ] Ownership checked in every resource query
- [ ] `whitelist` + `forbidNonWhitelisted` validation
- [ ] Helmet, CORS allow-list, body limits
- [ ] Distributed rate limiting, stricter on auth routes
- [ ] Argon2id/bcrypt password hashing
- [ ] Secrets redacted from logs; Swagger not public in prod
- [ ] Automated dependency scanning in CI
