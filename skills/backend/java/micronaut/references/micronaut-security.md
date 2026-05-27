# Micronaut Security Reference

## Authentication Providers

Micronaut Security supports multiple authentication strategies. Configure via `application.yml`.

```yaml
micronaut:
  security:
    authentication: bearer
    token:
      jwt:
        signatures:
          secret:
            generator:
              secret: ${JWT_SECRET:please-change-in-production}
        claims-validators:
          iss: ${JWT_ISSUER:micronaut-app}
    redirect:
      login-failure: /login/authFailed
    endpoints:
      login: /login
```

### Basic Auth

```java
@Singleton
public class BasicAuthProvider implements AuthenticationProvider {
    @Override
    public Publisher<AuthenticationResponse> authenticate(
            AuthenticationRequest request, 
            HttpRequest<?> httpRequest) {
        if ("admin".equals(request.getIdentity()) && 
            "secret".equals(request.getSecret())) {
            AuthenticationResponse.success("admin", 
                List.of("ROLE_ADMIN", "ROLE_USER"));
        }
        return Flux.empty();
    }
}
```

### JWT Auth

```java
@Singleton
public class JwtAuthProvider implements AuthenticationProvider {
    @Override
    public Publisher<AuthenticationResponse> authenticate(
            AuthenticationRequest request, 
            HttpRequest<?> httpRequest) {
        return Flux.just(AuthenticationResponse.success("user")
            .attributes(Map.of("roles", List.of("ROLE_USER"))));
    }
}
```

## Security Rules

Define endpoint security with annotation-based rules.

```java
@Controller("/api/admin")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class AdminController {
    @Get
    @Secured("ROLE_ADMIN")
    public HttpResponse<List<AuditLog>> listLogs() {
        return HttpResponse.ok(service.fetchAll());
    }
    
    @Post
    @Secured({"ROLE_ADMIN", "ROLE_SUPERVISOR"})
    public HttpResponse<Void> createConfig(@Body Config config) {
        service.save(config);
        return HttpResponse.created();
    }
    
    @Get("/public")
    @Secured(SecurityRule.IS_ANONYMOUS)
    public HttpResponse<HealthInfo> health() {
        return HttpResponse.ok(new HealthInfo("OK"));
    }
}
```

### Method-Level Security

```java
@Singleton
public class SecureService {
    @Secured("ROLE_MANAGER")
    public List<Report> generateReports() {
        return reportRepository.findAll();
    }
}
```

## Token Propagation

Propagate JWT tokens between services using declarative clients.

```java
@Client("http://inventory-service")
@Secured(SecurityRule.IS_AUTHENTICATED)
public interface InventoryClient {
    @Get("/api/inventory/{sku}")
    Mono<InventoryResponse> checkAvailability(@PathVariable String sku);
}
```

Configure token propagation in `application.yml`:

```yaml
micronaut:
  security:
    token:
      propagation:
        enabled: true
        service-id-regex: "inventory-service|order-service"
```

## OAuth 2.0 Integration

```yaml
micronaut:
  security:
    oauth2:
      clients:
        github:
          client-id: ${OAUTH_GITHUB_ID}
          client-secret: ${OAUTH_GITHUB_SECRET}
          openid:
            issuer: https://accounts.google.com
        google:
          client-id: ${OAUTH_GOOGLE_ID}
          client-secret: ${OAUTH_GOOGLE_SECRET}
```

## CORS Configuration

```yaml
micronaut:
  server:
    cors:
      enabled: true
      configurations:
        web:
          allowed-origins:
            - https://app.example.com
          allowed-methods:
            - GET
            - POST
            - PUT
            - DELETE
          allowed-headers:
            - Content-Type
            - Authorization
          exposed-headers:
            - X-Total-Count
```

## CSRF Protection

```java
@Controller("/api/forms")
@Secured(SecurityRule.IS_AUTHENTICATED)
public class FormController {
    @Post
    public HttpResponse<Void> submit(@Body @Valid FormData data, 
                                      HttpRequest<?> request) {
        CsrfTokenValidator.validate(request);
        service.process(data);
        return HttpResponse.ok();
    }
}
```

## Rate Limiting

```yaml
micronaut:
  security:
    rate-limiting:
      enabled: true
      default-limit: 100
      default-interval: 1m
      endpoints:
        /api/login: 5
        /api/register: 3
```

## LDAP Authentication

```yaml
micronaut:
  security:
    ldap:
      enabled: true
      default:
        url: ldap://localhost:389
        manager-dn: cn=admin,dc=example,dc=com
        manager-password: ${LDAP_PASSWORD}
        base: dc=example,dc=com
        user-search-base: ou=users
        user-search-filter: (uid={0})
```

## Session Management

```yaml
micronaut:
  security:
    session:
      enabled: true
      max-concurrent-sessions: 1
      invalidate-session-on-expiry: true
```

## Security Events

```java
@Singleton
public class SecurityEventListener {
    @EventListener
    public void onLoginSuccessful(LoginSuccessfulEvent event) {
        auditService.log("Login success: " + event.getSource());
    }
    
    @EventListener
    public void onLoginFailed(LoginFailedEvent event) {
        auditService.log("Login failed: " + event.getSource());
    }
    
    @EventListener
    public void onLogout(LogoutEvent event) {
        auditService.log("Logout: " + event.getSource());
    }
}
```

## Custom Security Rules

```java
@Singleton
public class IpWhitelistRule implements SecurityRule {
    private final List<String> allowedIps = List.of("10.0.0.0/8", "192.168.0.0/16");
    
    @Override
    public int getOrder() {
        return 0;
    }
    
    @Override
    public Publisher<SecurityRuleResult> check(HttpRequest<?> request, 
                                                Map<String, Object> claims) {
        String ip = request.getRemoteAddress().getHostString();
        if (isIpAllowed(ip)) {
            return Flux.just(SecurityRuleResult.ALLOWED);
        }
        return Flux.just(SecurityRuleResult.REJECTED);
    }
    
    private boolean isIpAllowed(String ip) {
        return allowedIps.stream().anyMatch(cidr -> 
            IpAddressMatcher.matches(ip, cidr));
    }
}
```

## Key Points

- Use `@Secured` for declarative endpoint authorization
- Configure JWT with proper signature validation and claims verification
- Use declarative HTTP clients with token propagation for service-to-service auth
- Apply CORS configuration specific to frontend origins
- Rate limiting prevents brute force attacks on auth endpoints
- Security events enable audit logging for compliance
- Custom security rules allow IP whitelisting or domain-specific logic
- Prefer bearer tokens over session-based auth for APIs
- OAuth 2.0 OpenID Connect supports social login flows
- LDAP integration works for enterprise directory services
