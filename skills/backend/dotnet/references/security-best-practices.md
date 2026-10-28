# Security Best Practices for ASP.NET Core APIs

Security configuration for ASP.NET Core services: JWT bearer authentication, authorization policies, secrets management, data protection, input handling, HTTP security headers, CORS, rate limiting and dependency hygiene. Applies to .NET 8 and later.

## Authentication with JWT Bearer Tokens

APIs should validate tokens issued by an identity provider (Microsoft Entra ID, Auth0, Okta, Keycloak, Duende IdentityServer). Do not implement your own token issuance unless you must.

```csharp
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Auth:Authority"];   // e.g. https://login.example.com/
        options.Audience = builder.Configuration["Auth:Audience"];     // e.g. api://orders
        options.MapInboundClaims = false;                              // keep original claim names (sub, scope)
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = "sub",
        };
    });
```

- `Authority` enables discovery of signing keys via OpenID Connect metadata and handles key rotation.
- Require HTTPS metadata (default `RequireHttpsMetadata = true`); never disable outside local development.
- Keep access tokens short-lived; refresh tokens belong to clients, not APIs.
- For Entra ID, `Microsoft.Identity.Web` (`AddMicrosoftIdentityWebApi`) wraps this configuration.
- Browser apps: prefer the Backend-for-Frontend pattern with secure cookies over storing tokens in JavaScript-accessible storage.

## Authorization

```csharp
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("orders:read", p => p.RequireAuthenticatedUser().RequireClaim("scope", "orders.read"))
    .AddPolicy("orders:write", p => p.RequireClaim("scope", "orders.write"))
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

app.MapGet("/orders/{id:guid}", GetOrder.Handle).RequireAuthorization("orders:read");
app.MapGet("/health/live", () => Results.Ok()).AllowAnonymous();
```

- The fallback policy makes endpoints secure by default; opt out explicitly with `AllowAnonymous`.
- Scope claims may arrive as one space-separated string (`scp`/`scope`); check how your identity provider and handler map them and write the requirement accordingly.
- Resource-based authorization (is this user allowed to access this order?) belongs in code with `IAuthorizationService.AuthorizeAsync(user, resource, requirement)`; route-level policies cannot see the resource. Missing ownership checks cause broken object-level authorization (OWASP API1).

## Secrets and Configuration

| Environment | Source |
|-------------|--------|
| Local development | User secrets (`dotnet user-secrets set "Auth:ClientSecret" "<value>"`) |
| Azure | Key Vault via `AddAzureKeyVault` + managed identity; or Key Vault references in App Service |
| AWS | Secrets Manager / Parameter Store with workload IAM role |
| Kubernetes | External Secrets Operator or CSI secrets driver feeding environment variables or files |

Never commit secrets in `appsettings.json`. Prefer managed identity / workload identity for database and cloud service access so there is no secret at all (`Authentication=Active Directory Managed Identity` for Azure SQL).

## Data Protection

ASP.NET Core Data Protection encrypts cookies, antiforgery tokens and `IDataProtector` payloads. In multi-instance deployments, keys must be shared and protected:

```csharp
builder.Services.AddDataProtection()
    .SetApplicationName("orders")
    .PersistKeysToAzureBlobStorage(blobUri, credential)
    .ProtectKeysWithAzureKeyVault(keyUri, credential);
```

Without shared keys, each instance generates its own and users get logged out or antiforgery validation fails behind a load balancer. Redis, database (EF Core) and file system persistence are also available.

## Password Storage (if you own user accounts)

Use ASP.NET Core Identity's `PasswordHasher` (PBKDF2 with HMAC-SHA512 and a high iteration count in current versions) or an Argon2id library. Never hash passwords with plain SHA-256. Better still, delegate user accounts to an identity provider.

## Input Handling

- Validate all input (types, ranges, lengths); limit request body sizes (`[RequestSizeLimit]`, Kestrel `MaxRequestBodySize`).
- Use EF Core LINQ or parameterized queries. With raw SQL, use `FromSql($"... {param}")` (interpolation is parameterized) and never `FromSqlRaw` with concatenated input.
- File uploads: validate size and content type by inspecting content, store outside the web root with generated names, scan if required.
- Avoid deserializing untrusted data into polymorphic types without an allowlist (`System.Text.Json` polymorphism requires explicit `[JsonDerivedType]`, which is safe by design; never use `BinaryFormatter`, which is removed in .NET 9).
- Mass assignment: bind to request DTOs, not entity types.

## HTTPS and Security Headers

```csharp
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();                          // Strict-Transport-Security
}
app.UseHttpsRedirection();

app.Use(async (ctx, next) =>
{
    ctx.Response.Headers["X-Content-Type-Options"] = "nosniff";
    ctx.Response.Headers["Referrer-Policy"] = "no-referrer";
    ctx.Response.Headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
    await next();
});
```

The CSP shown suits a JSON-only API. Behind a reverse proxy, configure `UseForwardedHeaders` with known proxies so scheme and client IP are correct.

## CORS

```csharp
builder.Services.AddCors(o => o.AddPolicy("web", p => p
    .WithOrigins("https://app.example.com")
    .WithMethods("GET", "POST")
    .WithHeaders("Authorization", "Content-Type")));
app.UseCors("web");
```

Never combine `AllowAnyOrigin` with credentials (the framework forbids it); avoid reflecting arbitrary origins.

## Rate Limiting

```csharp
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("per-user", ctx => RateLimitPartition.GetTokenBucketLimiter(
        ctx.User.FindFirst("sub")?.Value ?? ctx.Connection.RemoteIpAddress?.ToString() ?? "anon",
        _ => new TokenBucketRateLimiterOptions
        {
            TokenLimit = 100, TokensPerPeriod = 50,
            ReplenishmentPeriod = TimeSpan.FromSeconds(10), QueueLimit = 0
        }));
});
app.UseRateLimiter();
app.MapPost("/orders", CreateOrder.Handle).RequireRateLimiting("per-user");
```

In-process limiters are per instance; enforce global limits at the gateway as well.

## Logging and Errors

- Do not log tokens, passwords, connection strings or full personal data; ASP.NET Core HTTP logging should exclude `Authorization` headers (it redacts by default unless you add them).
- Return ProblemDetails without exception details in production (see `error-handling.md`).

## Dependencies and Supply Chain

```bash
dotnet list package --vulnerable --include-transitive
dotnet list package --outdated
```

- NuGet audit runs during restore (.NET 8+ SDK) and warns about known vulnerable packages; treat warnings as errors in CI (`<NuGetAuditLevel>moderate</NuGetAuditLevel>` with `TreatWarningsAsErrors`).
- Enable package source mapping to prevent dependency confusion when using private feeds.
- Keep the runtime patched: apply monthly .NET servicing updates by rebuilding images.

## Checklist

- [ ] JWT validation of issuer, audience, lifetime and signature via authority metadata
- [ ] Fallback authorization policy requires authentication
- [ ] Resource-level authorization checks for object access
- [ ] Secrets in a vault or replaced with managed identity
- [ ] Data Protection keys shared and encrypted across instances
- [ ] Parameterized SQL only; DTO binding; request size limits
- [ ] HSTS, HTTPS redirection, security headers, strict CORS
- [ ] Rate limiting at app and gateway
- [ ] NuGet audit and package source mapping in CI
