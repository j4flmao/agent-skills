# IAM Governance Fundamentals

## Overview
IAM Governance ensures that the right people have the right access to the right resources at the right time, for the right reasons. It encompasses identity lifecycle management, access certification, privileged access management (PAM), segregation of duties (SoD), and compliance-driven access controls.

## Core Concepts

### Concept 1: Identity Lifecycle Management
Automate identity creation, modification, and deactivation:
- **Joiner**: Automated account creation, initial access assignment based on role
- **Mover**: Access changes when user changes role, department, or location
- **Leaver**: Automated account deactivation, access revocation, credential rotation
- **Identity reconciliation**: Regular comparison of HR data with IAM systems

### Concept 2: Access Certification
Periodic review of user access rights to ensure they remain appropriate:
- **User access reviews**: Managers review their team's access quarterly
- **Role reviews**: Role definitions reviewed annually for appropriateness
- **Entitlement reviews**: Sensitive permissions reviewed more frequently
- **Automated certification tools**: SailPoint, Saviynt, Okta Lifecycle Management

### Concept 3: Privileged Access Management (PAM)
Protect privileged accounts that have elevated access:
- **Just-in-time (JIT) access**: Grant privileged access only when needed, for limited time
- **Just-enough-access (JEA)**: Grant minimum required privileges, not full admin
- **Credential vaulting**: Store privileged passwords in secure vault with automatic rotation
- **Session management**: Record and audit privileged sessions
- **Emergency access (break glass)**: Documented process for urgent privileged access

### Concept 4: Segregation of Duties (SoD)
Prevent conflicts that could lead to fraud or errors by dividing critical tasks:
- **Preventive SoD**: Enforced at access request time — cannot have conflicting roles
- **Detective SoD**: Monitored at runtime — alert when conflicting access is detected
- **SoD matrices**: Define incompatible role/entitlement combinations

## Implementation Guide

### Step 1: Identity Lifecycle Automation
```yaml
identity_lifecycle:
  joiner:
    triggered_by: "HR system new hire event"
    actions:
      - "Create AD/Azure AD account"
      - "Assign default role (employee)"
      - "Provision email and collaboration tools"
      - "Assign manager for approval workflows"
    sla: "2 hours from HR event to account creation"

  mover:
    triggered_by: "HR system job change event"
    actions:
      - "Remove old department roles"
      - "Assign new department roles"
      - "Revoke access to old systems"
      - "Grant access to new systems"
    sla: "24 hours from HR event"

  leaver:
    triggered_by: "HR system termination event"
    actions:
      - "Disable AD/Azure AD account immediately"
      - "Revoke all application access"
      - "Remove from all groups"
      - "Rotate any known credentials"
      - "Transfer owned resources"
      - "Preserve data for compliance (30 days)"
    sla: "15 minutes for disable, 24 hours for full cleanup"
```

### Step 2: Access Certification Program
```yaml
access_certification:
  schedule:
    - type: "User Access Review"
      frequency: "Quarterly"
      reviewer: "Manager"
      scope: "All entitlements for direct reports"
      automation: "Okta Lifecycle Management"
    - type: "Role Review"
      frequency: "Annual"
      reviewer: "Role Owner"
      scope: "Role definitions, membership, entitlements"
    - type: "Privileged Access Review"
      frequency: "Monthly"
      reviewer: "Security Team"
      scope: "All privileged roles, admin accounts, service accounts"

  certification_process:
    1: "System sends review campaign to reviewers"
    2: "Reviewer validates each access: confirm or revoke"
    3: "Reminders sent weekly for overdue reviews"
    4: "Escalation to manager after 2 weeks overdue"
    5: "Auto-revoke if no response after 30 days"
    6: "Results logged for compliance audit"
    7: "Remediation for revoked access within 48 hours"

  metrics:
    - "Certification completion rate: target > 95%"
    - "Average review time: target < 30 days"
    - "Access revoked per campaign: target 5-15%"
    - "Overdue certifications: target < 5%"
```

### Step 3: PAM Implementation
```bash
# JIT Access Workflow using Teleport
tctl create -f - <<EOF
kind: role
version: v5
metadata:
  name: jit-db-admin
spec:
  options:
    max_session_ttl: 4h
  allow:
    db_labels:
      'type': 'postgres'
    db_names: ['production']
    db_users: ['admin']
  deny: {}
EOF

# Request JIT access
tsh login --request-roles=jit-db-admin --reason="Incident INC-45678 investigation"
```

## Best Practices
- Automate identity lifecycle (joiner/mover/leaver) as much as possible
- Conduct quarterly user access reviews with managers as reviewers
- Implement JIT/JEA for all privileged access
- Enforce segregation of duties for financial and compliance-critical systems
- Use role-based access management (RBAC) as foundation, add ABAC for fine-grained control
- Monitor for orphaned accounts (disabled employees with active accounts)
- Implement emergency access (break glass) with audit trail
- Reconcile IAM data with HR data daily
- Document all IAM policies and procedures for compliance audits

## Common Pitfalls
- Manual identity management (slow, error-prone, no audit trail)
- Role explosion creating hundreds of roles (too complex to manage)
- Stale access from role changes without entitlement cleanup
- Certifications treated as checkbox exercise (no meaningful review)
- Standing privileged access instead of JIT (increases attack surface)
- No SoD enforcement in critical financial systems
- Orphaned service accounts with excessive privileges
- No monitoring of privileged session activity

## Key Points
- Automate joiner/mover/leaver identity lifecycle from HR data
- Quarterly access certification with manager reviews
- JIT/JEA for all privileged access with session recording
- Enforce SoD for compliance-critical functions
- RBAC foundation with ABAC for fine-grained control
- Reconcile IAM data with HR systems daily
- Implement break glass emergency access with audit
- Monitor for orphaned accounts and stale access
