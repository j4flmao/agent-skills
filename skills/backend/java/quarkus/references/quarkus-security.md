# Quarkus Security Reference

## Authentication Mechanisms

Quarkus supports multiple authentication backends configurable via `application.properties`.

```properties
# Basic auth
quarkus.http.auth.basic=true
quarkus.http.auth.policy.user-policy.roles-allowed=user
quarkus.http.auth.permit.1.paths=/api/public/**
quarkus.http.auth.permit.1.policy=permit

# JWT
quarkus.smallrye-jwt.enabled=true
quarkus.smallrye-jwt.token.header=Authorization
quarkus.smallrye-jwt.token.prefix=Bearer
mp.jwt.verify.publickey.location=https://auth.example.com/.well-known/jwks.json
mp.jwt.verify.issuer=https://auth.example.com
```

### JWT Token Generation

```java
@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {
    @Inject JsonWebToken jwt;
    
    @POST
    @Path("/login")
    public JsonWebToken login(@Valid Credentials creds) {
        String token = Jwt.issuer("https://example.com")
            .upn(creds.getUsername())
            .groups(Set.of("user", "admin"))
            .claim("tenant", "acme")
            .innerSign()
            .encrypt();
        return new JsonWebToken(token);
    }
}
```

### Securing Endpoints

```java
@Path("/api/orders")
@Authenticated
public class OrderResource {
    @Inject JsonWebToken jwt;
    
    @GET
    @RolesAllowed("admin")
    public List<Order> listAll() {
        return Order.listAll();
    }
    
    @GET
    @Path("/mine")
    @RolesAllowed("user")
    public List<Order> myOrders() {
        return Order.find("customerId", jwt.getName()).list();
    }
    
    @GET
    @Path("/{id}")
    @RolesAllowed({"user", "admin"})
    public Order get(@PathParam("id") UUID id) {
        return Order.findById(id);
    }
    
    @GET
    @Path("/public")
    @PermitAll
    public HealthInfo health() {
        return new HealthInfo("OK");
    }
}
```

## OAuth 2.0 Integration

```properties
quarkus.oidc.enabled=true
quarkus.oidc.auth-server-url=https://accounts.google.com/.well-known/openid-configuration
quarkus.oidc.client-id=${OIDC_CLIENT_ID}
quarkus.oidc.credentials.secret=${OIDC_CLIENT_SECRET}
quarkus.oidc.token.issuer=https://accounts.google.com
```

### Role Mapping

```properties
quarkus.oidc.roles.role-claim=groups
quarkus.oidc.roles.source=idtoken
```

## CORS Configuration

```properties
quarkus.http.cors=true
quarkus.http.cors.origins=https://app.example.com
quarkus.http.cors.methods=GET,POST,PUT,DELETE,PATCH
quarkus.http.cors.headers=Content-Type,Authorization,X-Requested-With
quarkus.http.cors.exposed-headers=X-Total-Count,X-Pagination
quarkus.http.cors.access-control-max-age=24H
```

## CSRF Protection

```java
@Path("/api/forms")
public class FormResource {
    @POST
    @CSRF(CSRF.Type.EXPLICIT)
    public Response submitForm(@Valid FormData data) {
        return Response.ok(service.process(data)).build();
    }
}
```

## Rate Limiting

```properties
quarkus.rate-limit.enabled=true
quarkus.rate-limit.default-limit=100
quarkus.rate-limit.default-window=1M
quarkus.rate-limit.buckets.login=3;1M
quarkus.rate-limit.buckets.api=1000;1M
```

## Security Identity Provider

```java
@ApplicationScoped
public class CustomSecurityIdentityProvider implements SecurityIdentityAugmentor {
    @Override
    public Uni<SecurityIdentity> augment(SecurityIdentity identity, 
                                          AuthenticationRequestContext context) {
        if (identity.isAnonymous()) {
            return Uni.createFrom().item(identity);
        }
        return context.runBlocking(() -> {
            String tenant = identity.getAttribute("tenant");
            Set<String> additionalRoles = tenantService.lookupRoles(tenant);
            return identity;
        });
    }
}
```

## TLS Configuration

```properties
quarkus.http.ssl-port=8443
quarkus.http.insecure-requests=redirect
quarkus.http.ssl.certificate.key-store-file=keystore.jks
quarkus.http.ssl.certificate.key-store-password=${KEYSTORE_PASS}
quarkus.http.ssl.certificate.trust-store-file=truststore.jks
quarkus.http.ssl.certificate.trust-store-password=${TRUSTSTORE_PASS}
```

## Security Headers

```java
@Provider
public class SecurityHeadersFilter implements ContainerResponseFilter {
    @Override
    public void filter(ContainerRequestContext req, 
                       ContainerResponseContext resp) {
        resp.getHeaders().add("X-Content-Type-Options", "nosniff");
        resp.getHeaders().add("X-Frame-Options", "DENY");
        resp.getHeaders().add("X-XSS-Protection", "1; mode=block");
        resp.getHeaders().add("Strict-Transport-Security", 
            "max-age=31536000; includeSubDomains");
        resp.getHeaders().add("Content-Security-Policy", 
            "default-src 'self'");
    }
}
```

## Key Points

- `@Authenticated` requires valid authentication for all endpoints
- `@RolesAllowed` restricts access to specific roles
- `@PermitAll` marks endpoints as publicly accessible
- JWT tokens use SmallRye JWT with RS256 or ES256 signatures
- OIDC integrates with providers like Keycloak, Auth0, Google
- CORS must explicitly allow frontend origins
- CSRF protection needed for cookie-based auth
- Security identity augmentors add custom attributes and roles
- TLS termination recommended at reverse proxy level
- Rate limiting prevents brute force and abuse
