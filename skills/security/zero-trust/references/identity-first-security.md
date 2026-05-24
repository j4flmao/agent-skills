# Identity-First Security

## BeyondCorp Model (Google)

BeyondCorp removes the concept of a privileged corporate network. Access is based entirely on identity and device context, not network location.

### Core Principles
- **No VPN**: All access goes through identity-aware proxies
- **Device inventory**: Every device is cataloged and tracked
- **Device trust**: Devices must meet security posture requirements
- **Contextual access**: Policy evaluated per request, per resource

### BeyondCorp Architecture
```
User → Device → Certificate Validation → Access Proxy → Resource
         ↓                                    ↓
    Device Inventory                  Policy Engine
                                    (User + Device + Context)
```

### Access Proxy Flow
1. User authenticates via SSO (OIDC/SAML)
2. Device presents certificate proving enrollment
3. Access proxy validates device posture (OS, patch, EDR)
4. Policy engine evaluates: user role + device + resource sensitivity
5. Access granted or denied; session logged
6. Continuous re-evaluation during session

## Cloudflare Access Model

Cloudflare Access replaces VPNs with identity-based access.

### Architecture
```
User → Cloudflare Network → Access Application → Origin
         ↓                                        ↓
    Global Network                           Cloudflare Tunnel
    (200+ edge locations)                    (no public IPs)
```

### Key Components
- **Cloudflare Tunnel**: Creates encrypted outbound-only tunnels from origin servers
- **Access Application**: Per-app identity enforcement
- **Argo Tunnel**: Outbound-only connections, no open ports
- **Gateway**: DNS-level filtering for device posture

### Configuration Example
```
# Access Policy — Admin App
Policy Name: Admin Panel
Application: admin.internal.com
Session Duration: 8h

Rules:
  - Include: Everyone → Requires Gateway
  - Require: Country = US
  - Require: Device Posture → Disk Encrypted
  - Require: Device Posture → OS Version > 11.0
  - Exclude: IP Range = 10.0.0.0/8

# Device Posture Checks
  - OS Version: minimum macOS 14, Windows 11, Ubuntu 22.04
  - Disk Encryption: FileVault, BitLocker, LUKS enabled
  - Anti-Virus: EDR process running
  - Firewall: Enabled
```

## JIT (Just-In-Time) Access

### Implementation Patterns

**Time-Bound Approvals:**
```yaml
# JIT access policy
access_rules:
  - role: devops
    resource: production-ssh
    approval: manager
    max_duration: 4h
    justification_required: true
    auto_revoke: true
  - role: dba
    resource: production-database
    approval: dba-lead + security
    max_duration: 2h
    mfa_required: true
```

**Self-Service Elevation:**
```yaml
# PAM elevation rules
elevation_policies:
  - name: "Temporary Admin Access"
    users: [developer-*, operator-*]
    groups: [on-call]
    run_as: domain-admins
    approval: workflow
    ttl: 3600
    session_audit: record
    commands_allowed: [useradd, usermod, passwd, groupmod]
    commands_blocked: [rm -rf /, chmod -R 777]
```

### Session Security

**Token Best Practices:**
- Access tokens: 15-minute expiry (OIDC)
- Refresh tokens: 24-hour rotation
- Session tokens: Bound to device fingerprint
- Never store tokens in localStorage (use httpOnly cookies)
- Implement refresh token rotation and reuse detection

**Session Monitoring:**
- Log session start, end, and duration
- Record commands executed (for SSH/RDP sessions)
- Flag anomalous behavior (unusual time, location, resource access)
- Auto-terminate idle sessions after 15 minutes
- Alert on concurrent sessions from different geographies

## Device Posture Checks

### Minimum Posture Requirements
| Check | Requirement | Enforcement |
|-------|-------------|-------------|
| OS Patch Level | Patches within 30 days | Block if behind |
| Disk Encryption | FileVault/BitLocker/LUKS | Block if off |
| EDR Running | Approved EDR agent active | Block if not |
| Screen Lock | Required with < 5min timeout | Warn/Block |
| Firewall | Active | Block if off |
| Disk Encryption | Full disk | Block if partial |
| Jailbreak/Root | Not detected | Block if detected |

### Posture Verification Flow
```
1. User authenticates → IdP issues OIDC token
2. Device agent collects posture telemetry
3. Posture data sent to verification service
4. Policy engine evaluates posture + identity
5. Token issued with posture claims
6. Proxy re-verifies posture every session refresh
```

## Enterprise Deployment Checklist

- [ ] SSO/IdP configured with all applications
- [ ] Device management (MDM/MEM/Intune) deployed
- [ ] Device certificate authority established
- [ ] Identity-aware proxy deployed (Pomerium, Cloudflare, Teleport)
- [ ] Device posture check service operational
- [ ] JIT access workflows defined and tested
- [ ] Session recording for privileged access
- [ ] Logging pipeline sending to SIEM
