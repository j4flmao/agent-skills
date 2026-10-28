# Identity Provider Setup

Setting up an identity provider (IdP) for workforce or customer SSO: self-hosted Keycloak in production mode, managed IdPs (Microsoft Entra ID, Okta), application registration, SCIM provisioning and operational monitoring.

## Self-Hosted Keycloak (26.x)

### Optimized Image

Build-time options are baked into the image so the server starts with `--optimized`:

```dockerfile
FROM quay.io/keycloak/keycloak:26.4 AS builder
ENV KC_DB=postgres \
    KC_HEALTH_ENABLED=true \
    KC_METRICS_ENABLED=true
RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:26.4
COPY --from=builder /opt/keycloak/ /opt/keycloak/
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
```

Pin the exact patch version you have tested; check release notes before upgrades (Keycloak migrates the database schema on startup).

### Compose Example (TLS terminated at a reverse proxy)

```yaml
# compose.yaml
services:
  keycloak:
    image: registry.example.com/keycloak-optimized:26.4
    command: ["start", "--optimized"]
    environment:
      KC_HOSTNAME: https://auth.example.com           # full public URL (hostname v2)
      KC_PROXY_HEADERS: xforwarded                    # proxy must set X-Forwarded-* headers
      KC_PROXY_TRUSTED_ADDRESSES: 10.0.0.0/24         # only trust headers from the proxy
      KC_HTTP_ENABLED: "true"                         # plain HTTP only between proxy and Keycloak
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak?sslmode=require
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: ${KC_DB_PASSWORD}
      KC_BOOTSTRAP_ADMIN_USERNAME: ${KC_BOOTSTRAP_ADMIN_USERNAME}
      KC_BOOTSTRAP_ADMIN_PASSWORD: ${KC_BOOTSTRAP_ADMIN_PASSWORD}
    expose:
      - "8080"                                        # reached only through the proxy
      - "9000"                                        # management: /health, /metrics
```

Notes:
- Keycloak 25+ removed the old `KC_PROXY` option; use `KC_PROXY_HEADERS` (`xforwarded` or `forwarded`, matching what the proxy sends).
- The bootstrap admin is temporary: create a permanent admin (or federate admins from your IdP) and remove the bootstrap account.
- Health and metrics are served on the management port 9000 (`/health/ready`, `/health/live`, `/metrics`); do not expose it publicly.
- Secrets come from the environment/secret manager, never committed.
- On Kubernetes, prefer the Keycloak Operator (`Keycloak` and `KeycloakRealmImport` resources) for clustering, TLS and upgrades.

### Database and Clustering

- PostgreSQL (supported versions per release notes) with TLS, automated backups and tested restores.
- Size the DB connection pool (`KC_DB_POOL_MAX_SIZE`) to the database's connection limit divided by Keycloak replicas.
- Multiple replicas form an Infinispan cluster for sessions/caches; on Kubernetes use the Operator's defaults (jdbc-ping discovery in recent versions). Persistent user sessions are the default in recent releases, so restarts do not log users out.

### Realm Configuration Baseline

| Setting | Recommendation |
|---|---|
| Realms | One per environment/product; never use `master` for applications |
| Access token lifespan | Short (5–15 min) |
| SSO session idle / max | Align with security policy (e.g. 30 min idle, 8–10 h max for workforce) |
| Refresh tokens | Rotation enabled ("Revoke Refresh Token"), reuse count 0 |
| Clients | Confidential clients use client secret or private-key JWT; public SPA/mobile clients use Authorization Code + PKCE |
| Redirect URIs | Exact URIs; no wildcards in production |
| MFA | Required for admins; conditional OTP/WebAuthn for users |
| Brute-force detection | Enabled with temporary lockout |
| Email | SMTP with TLS for verification and reset flows |
| Realm config as code | Export/import via Operator `KeycloakRealmImport`, Terraform provider, or keycloak-config-cli |

## Microsoft Entra ID (formerly Azure AD)

| Area | Setup |
|---|---|
| App registrations | One per application and environment; redirect URIs per environment; certificate or federated credentials (workload identity federation) instead of client secrets where possible |
| Enterprise applications | SAML/OIDC SSO configuration, user/group assignment required |
| Conditional Access | Require MFA, block legacy authentication, device compliance or location policies for sensitive apps (requires Entra ID P1/P2) |
| Groups and roles | App roles in the manifest, assigned to groups; emitted in the `roles` claim |
| Provisioning | SCIM provisioning to apps that support it |
| Guests | B2B collaboration with stricter Conditional Access |

## Okta

| Area | Setup |
|---|---|
| Applications | OIDC (web, SPA with PKCE, native), SAML 2.0, SWA (password vaulting) only for legacy apps without federation |
| Authorization servers | Custom authorization server for API access tokens with custom scopes/claims |
| Groups | Sourced from directory (AD/LDAP agent, HR system); used for app assignment and group claims |
| Policies | Global session policy and app sign-on policies requiring MFA |
| Provisioning | SCIM / Okta Lifecycle Management for create, update, deactivate |

## SCIM 2.0 Provisioning (RFC 7643/7644)

| Operation | Endpoint |
|---|---|
| Create user | `POST /scim/v2/Users` |
| List / filter users | `GET /scim/v2/Users?filter=userName eq "a@example.com"` |
| Get user | `GET /scim/v2/Users/{id}` |
| Replace user | `PUT /scim/v2/Users/{id}` |
| Partial update | `PATCH /scim/v2/Users/{id}` (e.g. `active: false`) |
| Delete user | `DELETE /scim/v2/Users/{id}` |
| Groups | `POST/GET/PATCH /scim/v2/Groups` (membership via PATCH) |

Provisioning flow:

```
User assigned to app in IdP  → POST /Users (or match existing by userName/externalId)
Attribute change              → PATCH /Users/{id}
Group membership change       → PATCH /Groups/{id} (add/remove members)
Unassigned or offboarded      → PATCH active=false (most IdPs), DELETE later or never
```

Application side: treat `active=false` as immediate session revocation and login block; keep data per retention policy; make endpoints idempotent and authenticate the IdP with a dedicated bearer token or OAuth client.

Keycloak does not include a SCIM server endpoint out of the box; use an extension or provision via its Admin REST API or user federation.

## Monitoring

| Signal | Use |
|---|---|
| Login success/failure rate per app and IdP | Detect outages and attack spikes |
| Token endpoint latency (p50/p99) | IdP or DB performance |
| MFA enrollment and challenge failures | Rollout health |
| Admin events (client/realm changes) | Audit; alert on unexpected changes |
| SCIM error rate and sync lag | Provisioning drift |
| Certificate/secret expiry dates | Prevent SSO outages |

Keycloak: enable event logging for login and admin events and export metrics from the management port. Entra/Okta: stream sign-in and audit logs to the SIEM.

## Checklist
- [ ] Keycloak built with `kc.sh build`, started `--optimized`, version pinned
- [ ] Hostname v2 full URL, correct proxy headers and trusted proxy addresses
- [ ] Bootstrap admin replaced; admin access with MFA
- [ ] Realm settings as code; exact redirect URIs; PKCE for public clients
- [ ] Managed IdP apps use certificates/federated credentials, Conditional Access/MFA
- [ ] SCIM deprovisioning revokes sessions immediately
- [ ] Sign-in, admin and provisioning events monitored and sent to the SIEM
