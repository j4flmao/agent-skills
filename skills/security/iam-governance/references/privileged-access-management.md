# Privileged Access Management (PAM)

## PAM Components
- **Credential vault**: Securely stores privileged credentials (CyberArk, BeyondTrust, Delinea)
- **Session manager**: Records and monitors privileged sessions
- **JIT access**: On-demand privileged access with time limit
- **Password rotation**: Automatic rotation after each use or on schedule
- **Approval workflow**: Request → approve → access → auto-revoke
- **Emergency access**: Break glass procedure for urgent situations

## JIT Access Patterns
### Approval-Based JIT
```
User requests access → Manager approves → Access granted for N hours → Auto-revoked
```
### Event-Triggered JIT
```
Incident created → Access auto-granted for SOC team → Revoked when incident closed
```
### Scheduled JIT
```
Change window approved → Access granted for window duration → Auto-revoked
```

## Service Account Management
- Inventory all service and application accounts
- Use managed identities (AWS IAM Roles, Azure Managed Identities, GCP Service Accounts)
- Rotate service account credentials automatically
- Monitor service account usage — flag unused accounts
- Remove hardcoded credentials — use workload identity federation

## Emergency Access (Break Glass)
- Documented procedure for emergency privileged access
- Pre-approved accounts with complex passwords stored in sealed envelope
- Access triggers immediate notification to security team
- All break glass activity recorded and audited
- Post-emergency review: why was break glass needed, how to prevent recurrence

## Key Points
- PAM manages privileged access through vaulting, JIT, session recording, and rotation
- JIT access eliminates standing privileges
- Service accounts use managed identities where possible
- Break glass procedures for emergencies with full audit trail
- Credential vault auto-rotates passwords after each use
- Monitor privileged session activity in real-time
