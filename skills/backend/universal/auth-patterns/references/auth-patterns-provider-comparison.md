# Auth Provider Comparison

## Self-Hosted vs Third-Party

| Factor | Self-Hosted | Third-Party (Auth0, Cognito, Clerk) |
|--------|-------------|-------------------------------------|
| Control | Full | Limited to provider |
| Effort | High (build, maintain, secure) | Low (integrate SDK) |
| Compliance | You own it | Provider certs, but shared infra |
| Cost | Infrastructure + engineering time | Per-user pricing |
| Features | You build what you need | Rich feature set out of box |
| Lock-in | None | Hard to migrate user data |
| Uptime | Your responsibility | Provider SLA (99.9%+) |

## Auth Provider Comparison

| Feature | Auth0 | AWS Cognito | Clerk | Firebase Auth | Keycloak | Supabase Auth |
|---------|-------|-------------|-------|---------------|----------|---------------|
| Self-hosted | No | No | No | No | Yes | Yes (optional) |
| Social login | 30+ providers | 10+ providers | 20+ providers | Google, Apple | SAML/OIDC | 10+ providers |
| MFA | TOTP, SMS | TOTP, SMS | TOTP | SMS | TOTP, WebAuthn | TOTP |
| Passkeys | Yes | Limited | Yes | Yes | Yes | Yes |
| SSO/SAML | Enterprise | Yes | Enterprise | G Suite only | Yes | Limited |
| RBAC | Yes (custom) | Yes (groups) | Yes (orgs) | Custom claims | Built-in | Row-level via RLS |
| Audit logs | Yes | CloudTrail | Yes | Limited | Yes | Yes |
| B2B multi-tenant | Organizations | User pools | Organizations | No | Realms | Built-in |
| M2M | Client credentials | No | No | No | Service accounts | Yes |
| Free tier | 7K users | 50K MAU | 10K users | Unlimited | Unlimited | 50K MAU |
| Pricing | Pay per MAU | Pay per MAU | Pay per MAU | Pay per MAU | Free | Pay per MAU |
| Migration tools | Yes | Yes | No | No | Import/export | Migration API |

## Decision Guide

### Small team, simple app
- **Clerk** or **Supabase Auth** — fastest integration, good DX
- Self-hosted not worth the overhead

### Enterprise, compliance-heavy
- **Auth0** or **Keycloak** — full control, SAML/SSO, audit
- Keycloak: self-hosted, no per-user cost, higher ops effort

### AWS ecosystem
- **Cognito** — tight integration with IAM, API Gateway, ALB
- Limited social login, complex configuration

### Serverless / Firebase ecosystem
- **Firebase Auth** — easiest for Firebase apps
- Google/Apple sign-in free, limited extensibility

### Open source, full control
- **Keycloak** — battle-tested, OIDC compliant, active community
- **Supabase Auth** — PostgreSQL-native, good if already on Supabase
- Requires operational expertise for self-hosting
