# Identity Lifecycle Management

## Overview

Identity lifecycle management governs digital identities from creation through deprovisioning. The joiner/mover/leaver (JML) model automates identity changes triggered by HR events, ensuring timely access provisioning and removal.

## Joiner/Mover/Leaver Workflow

### Joiner — New Hire Provisioning
```yaml
joiner_workflow:
  trigger: HR system creates employee record
  steps:
    1. HR creates employee record in HRIS (Workday, BambooHR, SAP)
    2. HRIS event triggers SCIM provisioning to IdP (Okta, Azure AD)
    3. IdP creates user account and applies group memberships
    4. Applications enforce group-based access via SCIM or SAML
    5. MFA enrollment required before first login
    6. Welcome email sent with access instructions
    7. Audit log: User created, groups assigned, timestamp

  automation:
    manual: # If SCIM not possible
      - "Manager submits access request form"
      - "IT receives ticket to create accounts"
      - "Security reviews and approves"
      - "IT provisions access"
    automated: # Ideal state
      - "HRIS → SCIM → IdP → App provisioning (real-time)"
      - "Role-based access templates auto-applied"
      - "MFA enrollment forced on first login"

  default_access:
    - "Email mailbox"
    - "Corporate directory (name, title, org)"
    - "Intranet / knowledge base"
    - "Time tracking / HR self-service"
    - "Office tools (Office 365, Slack)"
    - "Department-specific applications (via role)"
```

### Mover — Transfer/Change
```yaml
mover_workflow:
  trigger: HRIS record update (department, title, manager)
  steps:
    1. HR updates employee record in HRIS
    2. HRIS event triggers IdP reassessment
    3. IdP removes old group memberships
    4. IdP adds new group memberships based on new role
    5. Apps auto-sync via SCIM (remove old, add new)
    6. Old application sessions invalidated
    7. Certification triggered for new role's access
    8. Audit log: Groups changed, timestamp, approver

  access_review_triggers:
    - "Cross-department transfer → full access recertification"
    - "Same department, new role → incremental certification"
    - "Manager change → manager attestation for existing access"

  temporary_overlap:
    - "Old access removed: end of current week"
    - "New access granted: start of new role date"
    - "Emergency overlap: manager approval required, max 5 days"
```

### Leaver — Termination
```yaml
leaver_workflow:
  trigger: 
    voluntary: "HR enters resignation date"
    involuntary: "HR enters termination date"
    immediate: "Security-initiated emergency termination"

  immediate_actions:
    - "Disable all SSO sessions (Okta/Azure AD session revocation)"
    - "Invalidate all refresh tokens"
    - "Reset application passwords"
    - "Revoke API keys and personal access tokens"
    - "Terminate active VPN sessions"
    - "Remove from distribution lists"
    - "Forward email to manager or delegate"

  scheduled_actions (after 30 days):
    - "Delete user account from IdP"
    - "Remove from all application permissions"
    - "Archive mailbox"
    - "Transfer OneDrive/Docs to manager"
    - "Remove from payroll systems"
    - "Convert to disabled/inactive state in HRIS"

  emergency_termination:
    trigger: "Security incident, policy violation, threat"
    actions:
      - "Instant disable all accounts (IdP)"
      - "Immediate badge/access card deactivation"
      - "Remote wipe company devices (MDM)"
      - "Alert SOC and physical security"
      - "Legal hold if applicable"
```

## SCIM Provisioning

### SCIM 2.0 Standard
SCIM (System for Cross-domain Identity Management) automates user provisioning between IdPs and applications.

**SCIM User Schema:**
```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "jane.doe@example.com",
  "externalId": "EMP-001234",
  "name": {
    "formatted": "Jane Doe",
    "familyName": "Doe",
    "givenName": "Jane"
  },
  "emails": [
    {
      "value": "jane.doe@example.com",
      "type": "work",
      "primary": true
    }
  ],
  "phoneNumbers": [
    {"value": "+1-555-123-4567", "type": "mobile"}
  ],
  "active": true,
  "groups": [
    {"value": "engineering-dept", "display": "Engineering"},
    {"value": "dev-role", "display": "Developer"}
  ],
  "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
    "employeeNumber": "EMP-001234",
    "costCenter": "CC-ENG-001",
    "organization": "Engineering",
    "division": "Product Development",
    "department": "Platform Engineering",
    "manager": {
      "value": "EMP-000456",
      "displayName": "John Smith"
    }
  }
}
```

**SCIM API Endpoints:**
```yaml
# SCIM endpoints (REST API)
endpoints:
  create_user:
    method: POST
    path: /scim/v2/Users
    body: SCIM User JSON

  update_user:
    method: PUT
    path: /scim/v2/Users/{id}
    body: Full SCIM User

  patch_user:
    method: PATCH
    path: /scim/v2/Users/{id}
    body: SCIM Patch Operation

  delete_user:
    method: DELETE
    path: /scim/v2/Users/{id}

  list_users:
    method: GET
    path: /scim/v2/Users?filter=userName+eq+jane.doe@example.com

  create_group:
    method: POST
    path: /scim/v2/Groups
    body: Group resource

  list_groups:
    method: GET
    path: /scim/v2/Groups

# SCIM Patch operation
patch_request:
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "replace",
      "value": {
        "active": false,
        "emails": [{"value": "", "type": "work", "primary": true}]
      }
    },
    {
      "op": "remove",
      "path": "groups[value eq \"dev-role\"]"
    }
  ]
```

### Okta SCIM Provisioning
```yaml
# Okta SCIM provisioning configuration
okta_scim:
  connection:
    base_url: "https://app.example.com/scim/v2"
    auth_method: "OAuth 2.0 Bearer Token"
    token_endpoint: "https://idp.example.com/oauth/token"

  provisioning_features:
    - "Create User"
    - "Update User Attributes"
    - "Deactivate Users"
    - "Sync Password"
    - "Push Groups"

  attribute_mapping:
    okta_to_scim:
      login: userName
      email: emails[type eq "work"].value
      firstName: name.givenName
      lastName: name.familyName
      manager: urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:manager.value
      department: urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:department
```

## Federated Identity

### SAML 2.0 Federation
Enables cross-company identity federation (e.g., contractors, acquisitions).

**SAML Metadata Exchange:**
```xml
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="https://idp.example.com">
  <md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Certificate>MIID...base64...cert...</ds:X509Certificate>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                             Location="https://idp.example.com/saml/sso"/>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>
```

### HR Integration Patterns
```yaml
integration_patterns:
  direct_api:
    - "HRIS → middleware → IdP via REST API"
    - "Real-time webhook triggers"
    - "Example: Workday → Okta via Workday Provisioning"

  file_based:
    - "HRIS → CSV/XML export → scheduled import → IdP"
    - "Batch processing every 4-6 hours"
    - "Falls back to direct if API unavailable"

  hybrid:
    - "Direct API for new hires and terminations"
    - "Batch file for attribute updates"
    - "Scheduled reconciliation (daily full sync)"
```

## Service Account Lifecycle

```yaml
service_account_lifecycle:
  request:
    - "Name, purpose, owner, expiration date required"
    - "Approval from security team"
    - "Minimum permissions principle applied"
    - "Auto-generated secure password or key"

  monitoring:
    - "Last used timestamp tracked"
    - "Key rotation every 90 days"
    - "Unused accounts flagged after 30 days"
    - "Usage anomalies trigger alerts"

  deprovisioning:
    - "Expired accounts auto-disabled"
    - "Owner notified 14 days before expiration"
    - "Orphaned accounts (no owner) deleted after 60 days"
    - "Service account keys immediately revoked on compromise"
```

## Key Metrics

| Metric | Target | Description |
|--------|--------|-------------|
| Provisioning time | < 15 min | Time from HR event to account creation |
| Deprovisioning time | < 5 min | Time from termination to access revocation |
| SCIM coverage | > 80% | % of apps using automated SCIM provisioning |
| Orphaned accounts | < 1% | Accounts with no associated employee |
| Service account renewal | 100% | % of service accounts with valid expiration |
| Identity data accuracy | > 99% | Match rate between HRIS and IdP |
