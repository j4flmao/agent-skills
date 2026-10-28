# Kotlin Backend Security Best Practices

Defensive controls for Kotlin services on Ktor or Spring: authentication, authorization, input handling, secrets, dependencies, and transport. Maps to OWASP ASVS / API Security Top 10 concerns.

## Authentication with JWT (Ktor)

```kotlin
fun Application.configureAuth(cfg: JwtConfig) {
    install(Authentication) {
        jwt("api") {
            realm = "billing"
            verifier(
                JWT.require(Algorithm.RSA256(cfg.publicKey, null))
                    .withIssuer(cfg.issuer)
                    .withAudience(cfg.audience)
                    .acceptLeeway(30)
                    .build()
            )
            validate { cred ->
                val sub = cred.payload.subject ?: return@validate null
                UserPrincipal(sub, cred.payload.getClaim("scope").asString().orEmpty().split(' ').toSet())
            }
            challenge { _, _ -> call.respond(HttpStatusCode.Unauthorized) }
        }
    }
}
```

- Validate `iss`, `aud`, `exp`, and signature; pin the algorithm (do not accept `none` or algorithm switching).
- Prefer fetching keys from the IdP JWKS endpoint (`jwkProvider`) with caching and rotation over static keys.
- For browser sessions, use server sessions or HttpOnly + Secure + SameSite cookies rather than JWTs in `localStorage`.

## Authentication with Spring Security

```kotlin
@Bean
fun security(http: HttpSecurity): SecurityFilterChain {
    http {
        authorizeHttpRequests {
            authorize("/healthz", permitAll)
            authorize("/admin/**", hasAuthority("SCOPE_admin"))
            authorize(anyRequest, authenticated)
        }
        oauth2ResourceServer { jwt { } }
        csrf { disable() }          // only for stateless token APIs without cookies
    }
    return http.build()
}
```

Configure `spring.security.oauth2.resourceserver.jwt.issuer-uri` so keys and issuer validation come from OIDC discovery.

## Authorization

- Enforce object-level checks in the use case, not only at the route (BOLA is the top API risk).

```kotlin
suspend fun getInvoice(principal: UserPrincipal, id: InvoiceId): Invoice {
    val invoice = repo.find(id) ?: throw NotFoundException("invoice", id.value)
    if (invoice.tenantId != principal.tenantId) throw NotFoundException("invoice", id.value) // do not reveal existence
    return invoice
}
```

- Deny by default; centralize policy checks (a `Policy` class or Spring `@PreAuthorize` with method security).
- Never take tenant or user IDs for authorization from the request body.

## Input Validation and Serialization

- Validate DTOs at the edge (Ktor `RequestValidation` plugin, or Jakarta Bean Validation with `@field:` targets in Spring).
- Use kotlinx.serialization or Jackson with explicit DTO classes; avoid polymorphic deserialization of untrusted input (Jackson default typing enables gadget-chain attacks).
- Limit request body size at the gateway or server and set max JSON depth where supported.

```kotlin
install(RequestValidation) {
    validate<CreateUserRequest> { r ->
        when {
            r.email.length > 254 || !r.email.contains('@') -> ValidationResult.Invalid("invalid email")
            r.name.isBlank() -> ValidationResult.Invalid("name required")
            else -> ValidationResult.Valid
        }
    }
}
```

## Injection

- SQL: parameterized queries only (Exposed DSL, jOOQ, JDBC `PreparedStatement`, Spring Data). Never build SQL with string templates from input.
- Shell: avoid `ProcessBuilder` with user input; if unavoidable, pass arguments as a list and allow-list values.
- SSRF: validate outbound URLs against an allow-list of hosts; block link-local and metadata IPs (169.254.169.254).
- Path traversal: resolve paths and check they stay under the base directory (`resolved.normalize().startsWith(base)`).

## Secrets

- Load from environment or a secret manager (Vault, AWS Secrets Manager, Kubernetes Secrets via CSI/External Secrets). Never commit them in `application.yaml`.
- Redact secrets in `toString()` of config classes:

```kotlin
data class DbConfig(val url: String, val user: String, private val password: String) {
    fun password() = password
    override fun toString() = "DbConfig(url=$url, user=$user, password=****)"
}
```

## Cryptography

- Passwords: Argon2id (Spring Security `Argon2PasswordEncoder`) or bcrypt; never SHA-*.
- Tokens: `SecureRandom` for generation; constant-time comparison with `MessageDigest.isEqual`.
- Encryption: AES-GCM via a vetted library (Tink) with keys from KMS.

## Transport and Headers

- TLS terminated at the ingress or in-app; HSTS for browser-facing hosts.
- Ktor `DefaultHeaders`, plus `X-Content-Type-Options: nosniff`, `Content-Security-Policy` for HTML responses.
- CORS: explicit origins (`allowHost("app.example.com", schemes = listOf("https"))`), never `anyHost()` with credentials.

## Rate Limiting and Abuse

Ktor ships a `RateLimit` plugin; use per-principal keys for authenticated routes and stricter limits on login and password reset. Distributed limits belong in the gateway or Redis.

```kotlin
install(RateLimit) {
    register(RateLimitName("login")) {
        rateLimiter(limit = 5, refillPeriod = 60.seconds)
        requestKey { call -> call.request.origin.remoteHost }
    }
}
```

## Dependencies and Build

- Dependency scanning (OWASP Dependency-Check, Snyk, GitHub Dependabot) and SBOM (CycloneDX Gradle plugin).
- Gradle dependency verification (`gradle/verification-metadata.xml`) to detect tampered artifacts.
- Keep Kotlin, Ktor/Spring, Jackson, Netty, and logging libraries current.

## Logging

- No tokens, passwords, or full PANs in logs; mask emails/phones where policy requires.
- Log authentication failures and authorization denials with principal and resource IDs for detection.

## Checklist

- [ ] Tokens validated for signature, issuer, audience, expiry
- [ ] Object-level authorization in use cases; deny by default
- [ ] DTO validation and body size limits
- [ ] Parameterized queries; SSRF and path checks
- [ ] Secrets from a manager, redacted in logs
- [ ] Argon2id/bcrypt for passwords
- [ ] Explicit CORS, security headers, rate limits
- [ ] Dependency scanning and verification in CI
