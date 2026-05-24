# Identity Federation — AD, AAD, Okta, SAML, OIDC

## Principle: One Source of Truth

Every user has ONE identity. All systems verify against it (federation). Never replicate passwords;
always pass signed tokens (SAML assertion / OIDC ID token).

## Identity Provider Choice

| IdP                   | Strength                                    | Cost                  |
|-----------------------|---------------------------------------------|-----------------------|
| Active Directory      | classic on-prem, deep Windows integration   | free with Windows Server |
| Azure AD / Entra ID   | cloud-native, MS 365 integration, B2B/B2C   | per-user/month        |
| Okta                  | vendor-neutral, deep SaaS connector library | per-user/month, premium |
| OneLogin              | similar to Okta, smaller                    | per-user/month        |
| Google Workspace      | for Google-shop orgs                        | per-user/month        |
| AWS IAM Identity Center | downstream of any SAML IdP                | free                  |
| Keycloak              | open source, self-host                      | self-managed cost     |
| Authentik / Authelia  | open source, modern                         | self-managed          |

For most orgs: **Azure AD / Entra ID** (if MS 365) or **Okta** (if vendor-neutral / heavy SaaS).
**Keycloak** for budget self-host.

## Federation Protocols

```
SAML 2.0   XML-based assertion, mature, broad enterprise support
OIDC       JSON / JWT, modern, mobile / SPA friendly, OAuth 2.0 layer
WS-Fed     Microsoft legacy, AD FS
SCIM 2.0   provisioning protocol — IdP creates/updates/deletes users in apps
```

Use OIDC for new builds; SAML where required by SaaS vendor.

## Pattern 1 — AD On-Prem + Azure AD (Hybrid)

```
AD on-prem (source of truth)
  │
  Azure AD Connect (sync agent)
  │
Azure AD / Entra ID (cloud copy)
  │
  SAML / OIDC federation
  │
SaaS apps + cloud roles (AWS / GCP / Salesforce / etc.)
```

Setup:
```
1. Install Azure AD Connect on-prem
2. Choose sync method: Password Hash Sync, Pass-through Auth, or Federation (ADFS)
3. Filter what syncs (specific OUs, groups, attributes)
4. Enable seamless SSO + Conditional Access
```

Password Hash Sync (PHS): hash of hash stored in Azure AD; auth works even when on-prem AD is down.
Recommended for most orgs.

## Pattern 2 — Okta as Primary IdP

```
HR system (Workday / BambooHR) → Okta (provisioning via SCIM)
                                  │
                                  ├─ SAML/OIDC → AWS IAM Identity Center → AWS accounts
                                  ├─ SAML → Salesforce
                                  ├─ SAML → Office 365
                                  ├─ OIDC → custom apps
                                  └─ SCIM → GitHub Enterprise
```

Pros: vendor-neutral; HR drives lifecycle; rich SaaS catalog.

## AWS IAM Identity Center (formerly SSO)

Downstream of any SAML IdP. Provides:
- Per-account permission sets
- ABAC (attribute-based access control) via SAML claims
- Session duration controls
- Programmatic access via SSO CLI

```bash
# Configure AWS CLI to use SSO
aws configure sso
# Login flow opens browser → IdP → returns to CLI
aws s3 ls --profile prod-admin
```

```yaml
# Permission set example via Terraform
resource "aws_ssoadmin_permission_set" "data_engineer" {
  name             = "DataEngineer"
  instance_arn     = data.aws_ssoadmin_instances.this.arns[0]
  session_duration = "PT8H"
}

resource "aws_ssoadmin_managed_policy_attachment" "de_s3" {
  instance_arn       = data.aws_ssoadmin_instances.this.arns[0]
  permission_set_arn = aws_ssoadmin_permission_set.data_engineer.arn
  managed_policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}
```

## GCP Workforce Identity Federation

Same idea as AWS IAM Identity Center: external IdP issues OIDC/SAML; GCP grants temporary tokens.

```
External IdP (Okta) → OIDC token → GCP Workforce Identity Pool → STS exchange → GCP credentials
```

```bash
gcloud iam workforce-pools create my-pool --location=global --organization=...
gcloud iam workforce-pools providers create-oidc okta-provider \
  --workforce-pool=my-pool --issuer-uri=https://my-org.okta.com \
  --client-id=$OKTA_CLIENT_ID
```

## Workload Identity (for app-to-cloud)

For services that need cloud API access without static creds:
```
AWS IRSA       K8s service account → IAM role (via OIDC trust)
GCP WI         K8s service account → GCP service account (via annotation)
Azure WI       K8s service account → Azure managed identity (federated credential)

Result: pods get temporary cloud creds; no static keys anywhere.
```

## SCIM Provisioning

```
HR onboards user → Workday → Okta (SCIM push) → all connected apps create account
HR offboards → Workday → Okta → all apps deactivate within minutes
```

Critical for compliance: ex-employee access removed within SLA (often < 24h).

## MFA Enforcement

```
Layers (most → least friction):
  Hardware key (YubiKey, FIDO2)   highest assurance, recommended for admins
  TOTP (Authenticator app)         second-best, no SMS
  Push notification                Duo, Microsoft Authenticator
  SMS                              avoid (SIM swap risk) but better than nothing

Conditional Access: enforce per app, per risk, per location
  Example: admin role from non-corp IP → require hardware key + reauth
```

## SSO Session Length

```
Standard user: 8-12 hours
Admin role:    1-4 hours, require re-auth for elevation
SAML re-auth:  ForceAuthn=true to re-verify even with active session
Browser SSO tickets: revocable per device
```

## Break-Glass Accounts

Always have 2-3 cloud-native admin accounts that DON'T depend on federation:
- Stored creds in physical safe
- No SSO dependency
- Logged when used
- Test annually that they still work

If your IdP goes down and federation is the only access path, you're locked out.

## Audit + Logging

Send IdP events to SIEM:
```
- Login success / failure
- MFA challenge / response
- Permission grants / revokes
- Group membership changes
- Application access changes
- Admin role activations
```

Retention ≥ 1 year for SOX / 6 years for HIPAA / per regulation.

## Common Failures

- Federation as only access path + no break-glass → IdP outage = total lockout
- SCIM half-deployed → manual cleanup of leavers, ghost accounts
- MFA SMS only → SIM swap compromise
- Conditional Access too permissive → password-only login from any IP
- Sync direction confused (cloud → on-prem?) → AD writeback writes garbage
- Group sprawl in AD → permissions impossible to audit
- AAD Connect single instance → sync failure on hardware loss
- Same email reused after offboarding → access regranted to new hire
