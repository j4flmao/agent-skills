# Privileged Access Management (PAM)

## Overview

PAM protects organizations' most sensitive accounts and credentials. It enforces just-in-time access, credential vaulting, session recording, and break glass procedures to reduce the risk of privileged credential theft and misuse.

## Just-In-Time (JIT) Access

### Elevation Request Workflow
```yaml
jit_elevation:
  workflow:
    - "User requests elevated access via PAM portal"
    - "System validates: user identity, MFA, device posture"
    - "Optional: approval workflow (manager, app owner, security)"
    - "Justification captured (ticket number, reason)"
    - "Time-bound elevation granted (default 4h, max 24h)"
    - "Elevation auto-revoked after TTL expiry"
    - "Full session audit: commands, files accessed, duration"

  approval_types:
    automatic:
      - "Pre-approved for on-call engineers"
      - "During change window (maintenance)"
      - "Break glass for emergencies"
    
    manager_approval:
      - "Non-standard elevation requests"
      - "Requests exceeding normal time limits"
      - "Access to multiple systems"

    security_approval:
      - "First-time access to critical system"
      - "Access outside business hours"
      - "Access with no existing change ticket"

  policy_template:
    policies:
      - name: "Developer Production SSH"
        users: ["devops-team"]
        targets: ["prod-ssh"]
        max_duration: 4h
        approval: "manager"
        mfa: true
        justification_required: true
        commands_blocked: ["rm -rf /", "chmod -R 777"]

      - name: "Database Admin"
        users: ["dba-team"]
        targets: ["prod-db"]
        max_duration: 2h
        approval: "dba-lead + security"
        mfa: true
        session_recording: true
        query_logging: true
```

### JIT Provider Configurations

**Azure AD PIM:**
```json
{
  "properties": {
    "roleDefinitionId": "62e90394-69f5-4237-9190-012177145e10",
    "principalId": "user-object-id",
    "schedule": {
      "startDateTime": "2026-05-24T10:00:00Z",
      "expiration": {
        "type": "AfterDuration",
        "duration": "PT4H"
      }
    },
    "ticketInfo": {
      "ticketNumber": "CHG-001234",
      "ticketSystem": "ServiceNow"
    },
    "justification": "Scheduled database maintenance window"
  }
}
```

**AWS IAM Roles Anywhere with JIT:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::123456789012:role/JIT-Admin-Role",
      "Condition": {
        "NumericLessThanEquals": {
          "aws:CurrentTime": "${aws:CurrentTime + 14400}"
        }
      }
    }
  ]
}
```

## Privilege Elevation

### Elevation Methods
```yaml
elevation_methods:
  temporary_role_assignment:
    - "User elevated to role for specific time window"
    - "Auto-removed when time expires"
    - "Example: Azure PIM, AWS IAM with STS"

  sudo_with_pam:
    - "User runs specific commands with elevated privileges"
    - "PAM module controls which commands are allowed"
    - "All commands logged to syslog/SIEM"

  administrative_workstation:
    - "Dedicated PAW (Privileged Access Workstation)"
    - "Separate admin account with different credentials"
    - "No internet browsing from admin workstation"

  just_enough_admin:
    - "User gets specific permissions, not full admin"
    - "Granular scoping (specific server, service, time)"
    - "Example: PowerShell JEA endpoints"
```

### Linux Privilege Elevation (PAM + sudo)
```bash
# /etc/sudoers.d/devops
# Devops team can run specific commands on prod
%devops ALL=(root) /usr/bin/systemctl restart *, /usr/bin/journalctl *
# Deny shell access
%devops ALL=(root) !/bin/bash, !/bin/sh, !/bin/zsh

# Just-Enough-Admin PowerShell endpoint
New-PSSessionConfigurationFile \
  -Path .\JEADevops.pssc \
  -SessionType RestrictedRemoteServer \
  -LanguageMode ConstrainedLanguage \
  -VisibleCmdlets 'Restart-Service', 'Get-Service', 'Get-Process'

Register-PSSessionConfiguration \
  -Name "JEADevops" \
  -Path .\JEADevops.pssc \
  -AccessMode Remote \
  -RunAsCredential (Get-Credential 'sa-jea-runner')
```

## Session Recording

### Recording Architecture
```yaml
recording_architecture:
  components:
    - "Session Manager (Teleport, CyberArk, BeyondTrust)"
    - "Proxy Server (routes connections through recording layer)"
    - "Storage Backend (S3, encrypted filesystem)"
    - "Analytics Engine (playback, search, ML anomaly)"

  recorded_protocols:
    SSH:
      - "All keystrokes and output"
      - "File transfers (SCP/SFTP)"
      - "Terminal window resizing"
    RDP:
      - "Screen video recording"
      - "Clipboard operations"
      - "File transfers"
      - "Keyboard and mouse input"
    Database:
      - "SQL queries executed"
      - "Query results"
      - "Connection source IP"
    Kubernetes:
      - "kubectl commands"
      - "kubectl exec sessions"
      - "API server requests"
```

### Teleport Session Recording Configuration
```yaml
# teleport.yaml — session recording
teleport:
  auth_service:
    session_recording: "node"  # "node" | "proxy" | "off" | "strict"
    proxy_checks_host_keys: true
  
  ssh_service:
    commands: []
    labels:
      environment: production
  
  proxy_service:
    https_keypairs: []
    https_cert_file: /etc/teleport/certs/proxy.crt
    https_key_file: /etc/teleport/certs/proxy.key
  
  # Storage for recorded sessions
  storage:
    type: s3
    region: us-east-1
    bucket: teleport-session-recordings
    audit_sessions_uri: s3://teleport-session-recordings/sessions
    audit_events_uri: s3://teleport-session-recordings/events
    retention_days: 365
```

### Session Playback and Audit
```bash
# Teleport session playback
tsh play <session-id>
tsh play --format=asff <session-id>
tsh play --format=json <session-id> | jq '.events[] | {time, event, user, command}'

# Search sessions
tsh recordings ls --from=2026-04-01 --to=2026-05-01
tsh recordings ls --query='user == "admin" && contains(events, "rm")'

# Export session
tsh recordings export <session-id> --format=video
```

## Credential Vaulting

### Secret Management
```yaml
vault_strategies:
  static_credential_vaulting:
    description: "Store static creds with rotation"
    tools: [CyberArk, BeyondTrust, HashiCorp Vault]
    rotation: Every 30-90 days
    checkin_checkout: true

  dynamic_secrets:
    description: "Generate ephemeral credentials on demand"
    tools: [HashiCorp Vault, Akeyless]
    ttl: 1h-24h
    example: "Vault generates temporary AWS IAM credentials"

  ssh_certificate_based:
    description: "SSH certs signed by CA instead of passwords"
    tools: [Teleport, Vault SSH, Netflix BLESS]
    ttl: 4h-24h
    auto_revoke: true
```

### HashiCorp Vault Dynamic Secrets
```hcl
# Vault AWS secrets engine
path "aws/creds/my-role" {
  capabilities = ["read"]
}

# AWS secrets engine configuration
resource "vault_aws_secret_backend" "aws" {
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
  region     = "us-east-1"
}

resource "vault_aws_secret_backend_role" "admin" {
  backend = vault_aws_secret_backend.aws.path
  name    = "jit-admin"
  credential_type = "iam_user"
  
  policy_document = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "ec2:StartInstances",
        "ec2:StopInstances"
      ],
      "Resource": "*"
    }
  ]
}
EOF

  default_sts_ttl = 3600
  max_sts_ttl = 14400
}
```

### CyberArk Credential Provider
```yaml
# CyberArk AIM Provider configuration
AIMCredentialProvider:
  Logging:
    Enable: "Yes"
    Level: "Info"
    FilePath: "C:\\Program Files\\CyberArk\\Logs"
  
  Applications:
    - AppID: "DBScriptRunner"
      UserName: "svc_db_runner"
      Folder: "Root\\Applications"
      Object: "ProductionDB-ServiceAccount"
      Query: "Safe=ProductionDB;Folder=Root;Object=svc_db_runner"
  
  ConnectionTimeout: 30
  UseVaultCache: "Yes"
```

## Break Glass Procedure

### Emergency Access Protocol
```yaml
break_glass:
  trigger_conditions:
    - "Primary PAM system unavailable (outage)"
    - "Emergency security incident requiring immediate access"
    - "All privileged users locked out"
    - "Natural disaster / facility emergency"

  break_glass_accounts:
    admin_accounts:
      - "Username: breakglass-admin-01"
        Stored: "Fireproof safe, safety deposit box"
        Verification: "Two directors must sign out"
        MFA: "Hardware token + phone call"
    
    root_credentials:
      - "Cloud root/admin accounts"
        Protection: "MFA hardware token + printed backup codes"
        Recovery: "Requires secondary IdP or out-of-band verification"

  procedure:
    step_1: "Authenticate via out-of-band channel"
    step_2: "Retrieve break glass credentials from safe"
    step_3: "Log entry in break glass register (time, reason, approver)"
    step_4: "Perform emergency actions"
    step_5: "Rotate all used break glass credentials"
    step_6: "Post-incident review within 24 hours"
    step_7: "Reset primary PAM system"

  monitoring:
    - "Break glass usage triggers immediate P1 alert to CISO"
    - "All actions from break glass accounts recorded"
    - "Session recording mandatory"
    - "Automatic incident ticket created"
```

## PAM Architecture

```
┌──────────────────┐     ┌──────────────────┐
│    End User       │────▶│  PAM Portal       │
│  (Admin/DevOps)   │     │  (Request Access)  │
└──────────────────┘     └────────┬─────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │    PAM Policy Engine       │
                    │  (Auth, Approval, MFA)    │
                    └────────┬─────────┬───────┘
                             │         │
                             ▼         ▼
              ┌──────────────────┐  ┌──────────────────┐
              │  Session Manager  │  │  Credential Vault │
              │  (Recording/Proxy)│  │  (CyberArk/Vault) │
              └────────┬─────────┘  └──────────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   Target System  │
              │  (Server/DB/K8s) │
              └──────────────────┘
```

## Compliance Mapping

| Requirement | PAM Control | Evidence |
|-------------|-------------|----------|
| SOC 2 CC6.1 | Access provisioning and deprovisioning | JIT elevation logs, PIM reports |
| SOC 2 CC6.3 | Role-based access management | PAM role assignments, separation of duties |
| PCI DSS 7.2.2 | Privileged access to cardholder data | Session recordings, elevation requests |
| PCI DSS 8.3 | Two-factor authentication for remote admin | MFA on all PAM access |
| HIPAA 164.312(a) | Unique user identification | Vault check-in/check-out logs |
| NIST 800-53 AC-2 | Account management | JIT auto-provisioning and deprovisioning |
