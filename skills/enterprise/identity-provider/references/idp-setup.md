# Identity Provider Setup

## Keycloak Self-Hosted

### Installation
```yaml
# docker-compose.yml
version: "3.8"
services:
  keycloak:
    image: quay.io/keycloak/keycloak:22.0
    command: start --optimized
    environment:
      KC_HOSTNAME: auth.example.com
      KC_HTTP_PORT: 8080
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: ${KC_DB_PASSWORD}
      KC_HOSTNAME_STRICT_HTTPS: "true"
      KC_PROXY: edge
    ports:
      - 8080:8080
```

### Database Setup
- Use PostgreSQL for production
- Configure connection pool (max 100 connections)
- Enable SSL for database connection
- Run migration on startup
- Backup database daily

### Initial Configuration
- Create master realm for admin access
- Create production realm per environment
- Configure email for password reset
- Set up themes for login pages
- Configure session and token timeouts

### Realm Configuration
```
Realm Name: {env}-{app}
Session: SSO Session Max 480m, Access Token 5m
Login: Forgot Password ON, Remember Me ON
Email: SMTP server configured
Themes: Login = custom, Email = custom
```

### Performance Tuning
```
JVM Heap: -Xms2g -Xmx4g (minimum 2GB for production)
DB Connections: 100 max in pool
Cache: Infinispan distributed cache
Hostname: Strict mode enabled
```

## Azure AD / Okta Managed

### Azure AD Setup
```
Tenant ID: {uuid}
App Registrations:
  - Each app gets its own registration
  - Redirect URIs whitelisted per env
  - Certificates for client credentials flow
Conditional Access:
  - Require MFA for all guest users
  - Block legacy authentication
  - Location-based policies
```

### Okta Setup
```
Org URL: https://{company}.okta.com
Applications:
  - OIDC apps for SPA and mobile
  - SAML apps for enterprise
  - SWA for legacy apps
Groups:
  - Mapped from directory
  - Used for app assignment
  - Nested groups supported
```

## SCIM Provisioning

### SCIM 2.0 Endpoints
```
POST /scim/v2/Users       — Create user
GET  /scim/v2/Users       — List users (paginated)
GET  /scim/v2/Users/{id}  — Get user
PUT  /scim/v2/Users/{id}  — Update user
PATCH /scim/v2/Users/{id} — Partial update
DELETE /scim/v2/Users/{id} — Deactivate user
POST /scim/v2/Groups      — Create group
GET  /scim/v2/Groups      — List groups
```

### Provisioning Flow
```
IdP → SCIM Call → Target App
1. User created in IdP → POST /Users
2. User assigned to app → PUT /Users with groups
3. User attributes synced → PATCH /Users
4. User deactivated → DELETE /Users (soft delete)
```

## Monitoring

### Key Metrics
```
Login Success Rate: >99.5%
Token Exchange Latency: P50 <100ms, P99 <500ms
SCIM Sync Lag: <5 minutes
Failed Login Rate: Alert at >5% increase
MFA Registration Rate: Track weekly
```
