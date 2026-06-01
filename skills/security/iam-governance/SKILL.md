---
name: iam-governance
description: >
  IAM Governance — identity lifecycle management, access certification, privileged access
  management, single sign-on federation, and IAM policy as code. Use when the user asks about
  IAM, identity governance, access certification, PAM, privileged access, SSO, Okta, Keycloak,
  SCIM provisioning, joiner/mover/leaver, or identity lifecycle.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, iam, governance, access-management, phase-8]
---

# IAM Governance

## Purpose
Design and implement identity governance programs covering the full identity lifecycle (joiner/mover/leaver), access certifications, privileged access management, SSO federation, and IAM-as-code for automated policy enforcement. Ensure that the right people have the right access to the right resources at the right time.

## Agent Protocol

### Trigger
- "IAM", "identity governance", "identity lifecycle", "joiner mover leaver"
- "access certification", "access review", "manager attestation"
- "PAM", "privileged access", "just-in-time access", "session recording", "credential vault"
- "SSO", "federation", "SAML", "OIDC", "OAuth", "Okta", "Keycloak", "Azure AD", "Entra ID"
- "SCIM provisioning", "HR integration", "identity federation"
- "IAM policy as code", "Terraform IAM", "least privilege analysis", "permission boundary"

### Input Context
- Current identity provider(s) and directories (Active Directory, Azure AD/Entra ID, Okta, LDAP)
- HR system for identity lifecycle integration (Workday, SuccessFactors, BambooHR)
- Application portfolio for SSO/SCIM enablement and priority
- Compliance requirements (SOX, SOC 2, PCI DSS, HIPAA, GDPR)
- Number of users and roles to manage (employees, contractors, partners, service accounts)
- Existing PAM solution (if any) and current pain points

### Output Artifact
Identity lifecycle workflows, access certification campaign templates, PAM architecture, SSO integration guides, IAM-as-code policies, least-privilege analysis.

### Response Format
```
## Identity Lifecycle
{Provisioning flow, HR integration, deprovisioning process, SLA targets}

## Access Certification
{Campaign structure, reviewer assignments, remediation workflow}

## PAM Architecture
{Vaulting, JIT elevation, session recording, break glass, credential rotation}
```

### Completion Criteria
- [ ] Identity lifecycle automated with HR integration and SCIM provisioning
- [ ] Access certification campaigns designed with manager attestation and role-based reviews
- [ ] PAM solution deployed with JIT access, session recording, and credential vaulting
- [ ] SSO federation established with SAML/OIDC for all enterprise applications
- [ ] IAM-as-code templates created for AWS/Azure/GCP with least privilege defaults
- [ ] Least privilege analysis completed with permission boundaries and remediation plan

## Architecture / Decision Trees

### Identity Provider Selection Decision Tree

```
What is the primary directory?
├── On-prem Active Directory
│   ├── Cloud-forward strategy → Azure AD Connect / Entra ID sync
│   └── Hybrid strategy → Okta (best hybrid support) or Keycloak
├── Cloud-native
│   ├── Microsoft ecosystem → Azure AD / Entra ID
│   ├── Best-of-breed → Okta (broadest app integration)
│   └── Open-source, self-hosted → Keycloak
└── Multiple directories (M&A scenario)
    └── Okta (best multi-directory support) or Azure AD with cross-tenant sync

What is the primary use case?
├── Employee SSO → Okta, Azure AD, Keycloak
├── Customer IAM (CIAM) → Auth0, Keycloak, Azure AD B2C
├── B2B partner federation → Okta (B2B features), Azure AD External Identities
└── API/service authentication → Auth0, Keycloak
```

### PAM Strategy Decision Tree

```
What is the maturity of privileged access?
├── Level 1: No PAM → Start with credential vaulting for service accounts
├── Level 2: Basic vaulting → Add JIT elevation for human privileged access
├── Level 3: Managed PAM → Add session recording, approval workflows
├── Level 4: Measured PAM → Add user behavior analytics, automated certification
└── Level 5: Optimized PAM → Fully automated, risk-based, zero standing privileges

What is the primary platform?
├── Cloud-native → Azure PIM (Azure), Okta PAM, Akeyless
├── Enterprise IGA + PAM → SailPoint + CyberArk (best in class)
├── Open-source → Teleport (infrastructure access) or Vault (dynamic secrets)
└── Mid-market → Delinea (formerly ThycoticCentrify)
```

## Workflow

### Step 1: Identity Lifecycle Automation (Joiner/Mover/Leaver)

**Joiner Flow:**
```
HR System (Workday) triggers new hire event
          ↓
    Identity Provider (Okta/Azure AD) creates user
          ↓
    SCIM Provisioning → App 1, App 2, App 3...
          ↓
    Role-based access groups assigned
          ↓
    PAM system: JIT access to critical systems
          ↓
    User notified with credentials and onboarding guide
          ↓
    Access certification: Manager reviews within 30 days
```

**SCIM Provisioning Configuration:**
```json
// SCIM 2.0 provisioning payload (Okta → App)
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "jdoe@company.com",
  "name": {
    "givenName": "John",
    "familyName": "Doe"
  },
  "emails": [{
    "value": "jdoe@company.com",
    "type": "work",
    "primary": true
  }],
  "groups": ["engineering", "github-read-only"],
  "active": true
}
```

**Leaver Flow (Automated Deprovisioning):**
```python
import requests
from datetime import datetime, timedelta

class DeprovisioningWorkflow:
    """Automated identity deprovisioning workflow."""

    DEPROVISIONING_STEPS = [
        ("disable_sso", "Disable SSO account (Okta/Azure AD)", 0),
        ("revoke_vpn", "Revoke VPN access", 5),
        ("remove_ad_groups", "Remove from all AD groups", 10),
        ("revoke_email", "Revoke email access, set auto-reply", 15),
        ("revoke_pam", "Revoke all PAM/privileged access", 20),
        ("sign_out_sessions", "Force sign-out of all active sessions", 25),
        ("transfer_assets", "Transfer documents, emails to manager", 60),
        ("archive_mailbox", "Archive mailbox with legal hold if required", 120),
        ("delete_saas", "Remove from SaaS applications (via SCIM)", 180),
    ]

    def __init__(self, hr_api_key, idp_api_key):
        self.hr_api = "https://hr.company.com/api/v1"
        self.idp_api = "https://company.okta.com/api/v1"
        self.headers = {"Authorization": f"SSWS {idp_api_key}"}

    def initiate_deprovisioning(self, employee_id: str, termination_type: str):
        """
        Start automated deprovisioning workflow.
        termination_type: "voluntary", "involuntary", "retirement", "contract_end"
        """
        # Get employee details from HR
        emp_response = requests.get(
            f"{self.hr_api}/employees/{employee_id}",
            headers={"X-API-Key": "..."}
        )
        employee = emp_response.json()

        # Determine urgency
        is_involuntary = termination_type == "involuntary"
        delay_minutes = 0 if is_involuntary else 5  # Involuntary = immediate

        # Create deprovisioning job
        job = {
            "employee_id": employee_id,
            "email": employee["email"],
            "manager_id": employee["manager_id"],
            "termination_type": termination_type,
            "steps_completed": [],
            "status": "in_progress",
            "started_at": datetime.utcnow().isoformat()
        }

        # Execute immediate steps
        for step_name, description, delay in self.DEPROVISIONING_STEPS:
            if delay <= delay_minutes:
                self._execute_step(step_name, employee, job)
            else:
                # Schedule delayed step
                self._schedule_step(step_name, employee, job, delay)

        return job

    def _execute_step(self, step_name, employee, job):
        """Execute a single deprovisioning step."""
        try:
            if step_name == "disable_sso":
                requests.post(
                    f"{self.idp_api}/users/{employee['email']}/lifecycle/deactivate",
                    headers=self.headers
                )
            elif step_name == "revoke_vpn":
                requests.delete(
                    f"https://vpn.company.com/api/v1/users/{employee['email']}",
                    headers={"Authorization": "Bearer ..."}
                )
            # ... additional steps

            job["steps_completed"].append({
                "step": step_name,
                "status": "completed",
                "timestamp": datetime.utcnow().isoformat()
            })
        except Exception as e:
            job["steps_completed"].append({
                "step": step_name,
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
```

**SLA Targets:**
| Action | Voluntary | Involuntary | Contractors |
|--------|-----------|-------------|-------------|
| SSO disabled | 30 min | Immediate (5 min) | Immediate |
| All application access revoked | 2 hours | 30 min | Immediate |
| Email forwarded to manager | 24 hours | 1 hour | N/A |
| Data transferred/archived | 72 hours | 24 hours | N/A |
| Full account deletion (if applicable) | 90 days | 30 days | 24 hours |

### Step 2: Access Certification Campaigns

**Campaign Design:**
```yaml
certification_campaign:
  name: "Q2-2026 Access Certification"
  type: "manager_attestation"

  campaign_structure:
    - campaign: "Top-level managers certify their direct reports' access"
      reviewers: "Department heads (manager level +1)"
      scope: "All applications and roles"

    - campaign: "Application owners certify privileged access"
      reviewers: "Application owners"
      scope: "Admin roles, privileged permissions"

    - campaign: "Infrastructure access review"
      reviewers: "Infrastructure team leads"
      scope: "Server access, cloud IAM roles, network access"

  scheduling:
    - "All users: Every 90 days"
    - "Privileged users: Every 30 days"
    - "Application admins: Every 60 days"
    - "Service accounts: Every 90 days"
    - "Contractors: Every 30 days"

  review_process:
    1. "Reviewer receives email with certification link"
    2. "Reviewer sees list of users and their access"
    3. "Options: Certify (confirm), Revoke, Mark for Review, Delegate"
    4. "If no response in 7 days: Escalate to manager's manager"
    5. "If no response in 14 days: Auto-revoke access (default: no access)"
    6. "Revocation tasks created and processed within 24 hours"

  metrics:
    - "Certification completion rate: Target > 95%"
    - "Average review time: Target < 5 min per user"
    - "Auto-revoked access per campaign: Monitor trend"
    - "Disputed revocations: Track and analyze"
```

### Step 3: Privileged Access Management (PAM)

**CyberArk Vault Architecture:**
```yaml
pam_architecture:
  vault:
    - "Primary vault: CyberArk Vault (on-prem or cloud)"
    - "Replication: DR vault in secondary region"
    - "HSM integration for master key protection"

  credential_mgmt:
    - "Service accounts: Auto-rotated every 30 days"
    - "Database accounts: Auto-rotated every 30 days"
    - "SSH keys: Auto-rotated every 90 days"
    - "API tokens: Auto-rotated every 90 days"
    - "Application passwords: Manual rotation, 90-day SLA"

  jit_elevation:
    - "All privileged access via JIT — no standing privileges"
    - "Request: User → Reason → Duration → Approver"
    - "Duration: Max 4 hours, extendable with re-approval"
    - "Approval: Manager for standard, Security for sensitive"
    - "Session: Recorded, monitored, terminated on inactivity"

  session_management:
    - "All privileged sessions recorded (video + text)"
    - "Real-time monitoring for suspicious commands"
    - "Session termination on policy violation"
    - "Retention: 90 days for review, 1 year for compliance"
    - "Searchable by: user, target, command, timestamp"

  break_glass:
    - "Emergency accounts: Vaulted with approval workflow"
    - "Activation: Reason required, Security team notified"
    - "Duration: 30 minutes max"
    - "Audit: Full recording, mandatory post-incident review"
    - "Testing: Quarterly break-glass drill required"
```

**Just-in-Time Access for AWS:**
```hcl
# IAM policy for JIT elevation
data "aws_iam_policy_document" "jit_elevation" {
  statement {
    sid    = "JITElevation"
    effect = "Allow"
    actions = [
      "sts:AssumeRole"
    ]
    resources = [
      "arn:aws:iam::*:role/jit-admin-*"
    ]
    condition {
      test     = "NumericLessThanEquals"
      variable = "aws:MultiFactorAuthAge"
      values   = ["300"]  # MFA must be within 5 minutes
    }
  }
}

# Terraform: JIT role with auto-expiry boundary
resource "aws_iam_role" "jit_admin" {
  name = "jit-admin-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = { AWS = var.jit_users_arn }
        Action = "sts:AssumeRole"
        Condition = {
          NumericLessThanEquals = {
            "aws:MultiFactorAuthAge" = "300"
          }
          DateLessThan = {
            "aws:CurrentTime" = "2026-12-31T23:59:59Z"
          }
        }
      }
    ]
  })
  managed_policy_arns = ["arn:aws:iam::aws:policy/AdministratorAccess"]
  max_session_duration = 14400  # 4 hours
}
```

### Step 4: SSO Federation and Identity Provider

**SAML 2.0 Federation Configuration:**
```xml
<!-- Okta as IdP → AWS SSO SAML Application -->
<md:EntityDescriptor entityID="http://www.okta.com/EXAMPLECORP">
  <md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo>
        <ds:X509Certificate>MIID...</ds:X509Certificate>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                            Location="https://company.okta.com/app/EXAMPLECORP/sso/saml"/>
    <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                            Location="https://company.okta.com/app/EXAMPLECORP/slo/saml"/>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>
```

**OIDC Configuration:**
```yaml
oidc_provider_configuration:
  issuer: "https://company.okta.com/oauth2/default"
  authorization_endpoint: "https://company.okta.com/oauth2/default/v1/authorize"
  token_endpoint: "https://company.okta.com/oauth2/default/v1/token"
  userinfo_endpoint: "https://company.okta.com/oauth2/default/v1/userinfo"
  jwks_uri: "https://company.okta.com/oauth2/default/v1/keys"

  scopes_supported:
    - "openid"
    - "profile"
    - "email"
    - "groups"
    - "offline_access"

  claims_supported:
    - "sub"
    - "name"
    - "email"
    - "groups"
    - "department"
    - "employee_type"
    - "manager_id"

  grant_types_supported:
    - "authorization_code"
    - "client_credentials"
    - "refresh_token"
    - "device_code"
```

### Step 5: IAM Policy as Code

**Terraform IAM Least Privilege:**
```hcl
# Principle: Least privilege with boundary
resource "aws_iam_role" "app_role" {
  name = "app-${var.service_name}-${var.environment}"

  # Permission boundary prevents privilege escalation
  permissions_boundary = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/permission-boundary-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/ecs-task-execution-role"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Environment" = var.environment
          }
        }
      }
    ]
  })
}

# Minimal permissions — scoped to specific resources
resource "aws_iam_role_policy" "app_policy" {
  name = "app-${var.service_name}-policy"
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3ReadOnly"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.app_bucket}",
          "arn:aws:s3:::${var.app_bucket}/*"
        ]
      },
      {
        Sid    = "DynamoDBReadWrite"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = "arn:aws:dynamodb:${var.region}:${data.aws_caller_identity.current.account_id}:table/${var.table_name}"
        Condition = {
          ForAllValues:StringEquals = {
            "dynamodb:LeadingKeys": ["${aws:PrincipalTag/UserId}"]  # Row-level security
          }
        }
      }
    ]
  })
}
```

**Azure IAM as Code:**
```hcl
# Azure custom role definition
resource "azurerm_role_definition" "custom" {
  name        = "app-support-role"
  scope       = data.azurerm_subscription.current.id
  description = "Support role for application troubleshooting"

  permissions {
    actions = [
      "Microsoft.Compute/virtualMachines/read",
      "Microsoft.Insights/alertRules/read",
      "Microsoft.Insights/alertRules/write",
      "Microsoft.Insights/metrics/read",
      "Microsoft.Network/networkInterfaces/read",
      "Microsoft.Storage/storageAccounts/blobServices/containers/read"
    ]
    not_actions = []
  }

  assignable_scopes = [
    "/subscriptions/${var.subscription_id}/resourceGroups/${var.app_rg}"
  ]
}
```

### Step 6: Service Account Governance

```yaml
service_account_governance:
  inventory:
    - "All service accounts documented with: owner, purpose, dependencies, risk level"
    - "Maximum 1 service account per application + per environment"
    - "Naming convention: svc-{app}-{environment}-{region}"
    - "Tagged with: owner, created_date, rotation_date, purpose"

  security_controls:
    - "Service accounts must not have interactive login"
    - "No standing admin privileges — use JIT elevation or granular scoped roles"
    - "Credentials rotated every 30 days (auto-rotation preferred)"
    - "MFA for any service account that can modify infrastructure"
    - "Usage monitored: alert on anomalous behavior patterns"

  lifecycle:
    creation:
      - "Requires: application owner approval, security review"
      - "Generated: auto-generated strong password (32+ chars) or certificate"
      - "Stored: vaulted in PAM system, never in code"
    monitoring:
      - "Track: last used date, permission changes, failed auth attempts"
      - "Alert: service account not used in 90 days"
    deactivation:
      - "30 days after app decommission: auto-disabled"
      - "90 days after disable: auto-deleted"
```

### Step 7: Access Analytics and Reporting

```sql
-- Access compliance reporting
SELECT
  u.email AS user_email,
  u.department,
  u.employee_type,
  COUNT(a.application_id) AS application_count,
  COUNT(CASE WHEN a.last_accessed > NOW() - INTERVAL '90 days' THEN 1 END) AS active_apps,
  COUNT(CASE WHEN a.last_accessed < NOW() - INTERVAL '90 days' THEN 1 END) AS stale_apps,
  COUNT(CASE WHEN a.is_privileged THEN 1 END) AS privileged_apps
FROM users u
JOIN user_applications a ON u.id = a.user_id
WHERE u.status = 'active'
GROUP BY u.email, u.department, u.employee_type
ORDER BY stale_apps DESC;

-- Privileged access review
SELECT
  role_name,
  COUNT(DISTINCT user_id) AS user_count,
  COUNT(DISTINCT user_id) FILTER (WHERE last_used > NOW() - INTERVAL '30 days') AS active_users,
  COUNT(DISTINCT user_id) FILTER (WHERE last_used < NOW() - INTERVAL '90 days') AS dormant_users,
  MAX(last_used) AS most_recent_use
FROM role_assignments
WHERE is_privileged = true
GROUP BY role_name
ORDER BY user_count DESC;
```

## Common Pitfalls

### Pitfall 1: Provisioning Without Deprovisioning
Implementing automated provisioning without automated deprovisioning creates orphan accounts. Every joiner flow must have a corresponding leaver flow with SLA. Orphan accounts are a top audit finding.

### Pitfall 2: Standing Privileged Access
Granting permanent admin access violates least privilege principle. Every privileged action should be JIT with approval. Target: zero standing privileges for all human users.

### Pitfall 3: No Access Certification
Without regular access reviews, permissions accumulate (creep). Users leave teams but keep old access. Mandatory quarterly certifications. Auto-revoke unconfirmed access.

### Pitfall 4: Service Account Sprawl
Hundreds of undocumented service accounts with unknown owners. Inventory all service accounts, assign owners, enforce naming conventions. Disable unused accounts.

### Pitfall 5: SSO Without SCIM
SSO without automated provisioning means admins still manually create/remove users in each app. De-provisioning gaps. Always implement SCIM alongside SSO for automated lifecycle management.

### Pitfall 6: Shadow IT
Unsanctioned applications with corporate credentials. Users sign up for SaaS with company email without IT knowledge. Implement: approved app catalog, SSO discovery mode, Cloud Access Security Broker (CASB).

### Pitfall 7: Weak Credential Policies
No MFA, weak password policy, no rotation. Enforce: MFA for all users (mandatory for privileged), passwordless (FIDO2/WebAuthn) where possible, phishing-resistant MFA for admins.

### Pitfall 8: IAM Misconfigurations in Cloud
Overly permissive IAM policies, no permission boundaries, unused roles. Use IAM-as-code with automated policy validation (Checkov, tfsec). Implement permission boundaries for all roles.

## Best Practices

- Automate full identity lifecycle: joiner (SCIM), mover (group update), leaver (immediate deactivation)
- Implement zero standing privileges — all privileged access is JIT with approval and time limit
- Mandate quarterly access certifications with automated escalation and auto-revoke
- Use SCIM 2.0 for provisioning across all SAML/OIDC-enabled applications
- Enforce MFA for all users, phishing-resistant MFA (FIDO2) for privileged accounts
- Implement service account governance: inventory, owner, rotation, monitoring
- Use IAM-as-code (Terraform, CloudFormation) with permission boundaries and automated validation
- Monitor for anomalous access: unusual login times, geos, devices, and permission escalations
- Maintain an identity security scorecard: certification completion, orphan accounts, stale access

## Performance Considerations

- SCIM provisioning latency: 30-90 seconds for full provision to all apps. Webhook-based triggers reduce latency to 5-10 seconds
- SSO login latency: SAML (1-3s), OIDC (500ms-1.5s). Use persistent sessions to reduce re-auth overhead
- Access certification: 500 users × 10 apps = 5000 reviews. Design campaigns to be reviewed in < 1 hour total
- PAM JIT access: elevation request to access typically 30-60 seconds (approval + provisioning)
- IAM policy evaluation: AWS IAM (sub-millisecond per policy), Azure RBAC (1-5ms), GCP IAM (1-3ms)

## Rules
- Every identity must be tied to a real person or service account with an owner
- Deprovisioning must occur within SLA (immediate for involuntary, 30 min for voluntary terminations)
- Privileged access must be JIT with expiration, never standing
- Access certifications must occur at least quarterly for all roles, monthly for privileged roles
- IAM policies must be version-controlled and reviewed as code
- Break glass credentials must be vaulted with approval workflow and session recording
- Service accounts must be inventoried with owner, purpose, and rotation schedule
- MFA must be enforced for all users, phishing-resistant MFA for privileged
- SCIM provisioning must be implemented alongside SSO for lifecycle automation
- IAM permissions must follow least privilege with automated policy validation

## References
  - references/access-certification.md — Access Certification
  - references/iam-governance-advanced.md — Iam Governance Advanced Topics
  - references/iam-governance-fundamentals.md — Iam Governance Fundamentals
  - references/iam-policy-as-code.md — IAM Policy as Code
  - references/identity-lifecycle.md — Identity Lifecycle Management
  - references/privileged-access.md — Privileged Access Management (PAM)
  - references/sso-federation.md — SSO and Federation
## Handoff
IAM governance outputs can be handed to devops for Terraform IAM module consumption, IT for SCIM provisioning configuration, and compliance for audit reporting.
