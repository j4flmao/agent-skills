---
name: zero-trust
description: >
  Zero Trust Architecture (ZTA) — "never trust, always verify". Design and implement
  zero trust networks, identity-first security, microsegmentation, and continuous verification.
  Use when the user asks about zero trust, ZTA, BeyondCorp, microsegmentation, zero trust proxy, or least privilege access.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, zero-trust, zta, phase-8]
---

# Zero Trust Architecture

## Purpose
Define and implement Zero Trust Architecture principles including identity-first security, network microsegmentation, zero trust access proxies, and continuous verification workflows. Eliminate implicit trust based on network location and enforce per-request authorization.

## Agent Protocol

### Trigger
- "zero trust", "ZTA", "BeyondCorp", "never trust always verify"
- "microsegmentation", "identity-aware proxy", "zero trust network access", "ZTNA"
- "Pomerium", "Teleport", "Cloudflare Tunnel", "Tailscale", "Cilium", "Calico"
- "NIST SP 800-207", "continuous verification", "device posture", "JIT access"
- "least privilege access", "service-to-service mTLS", "workload identity"

### Input Context
- Current network architecture (on-prem, cloud, hybrid, multi-cloud)
- Existing identity provider (IdP) and SSO solution (Okta, Azure AD, Keycloak)
- Workload types: Kubernetes, VMs, serverless, legacy on-prem
- User access patterns: remote, office, third-party, service accounts
- Compliance requirements (PCI, HIPAA, SOC 2, FedRAMP)
- Current VPN and remote access infrastructure

### Output Artifact
Zero Trust architecture diagrams, access policy configurations, microsegmentation rules, deployment plans with phased migration.

### Response Format
```
## Architecture Overview
{ZTA deployment model per NIST SP 800-207, components, data flows}

## Access Policies
{Identity-aware proxy rules, segmentation policies, continuous verification}

## Implementation Plan
{Phased rollout, migration strategy, success criteria, timeline}
```

### Completion Criteria
- [ ] ZTA deployment model selected (NIST SP 800-207 deployment option 1-4)
- [ ] Identity-aware access proxy configured with policy rules
- [ ] Microsegmentation policies defined for workload segments
- [ ] Continuous verification controls implemented (device posture, UBA, risk scoring)
- [ ] Least privilege access enforced with JIT elevation
- [ ] Service-to-service mTLS enabled for east-west traffic
- [ ] Migration plan from legacy VPN to ZTNA

## Architecture / Decision Trees

### ZTA Deployment Model Selection (NIST SP 800-207)

```
What is the primary use case?
├── User-to-application access
│   ├── Remote workforce → Option 2 (Endpoint-Initiated, agent-based, e.g., Cloudflare WARP, Tailscale)
│   ├── Office workers → Option 1 (Enterprise Gateway, e.g., Pomerium, Teleport)
│   └── Both → Option 1 + 2 hybrid (gateway for internal apps, agent for remote)
├── Application-to-application (service mesh)
│   ├── Kubernetes-native → Option 3 (Resource Portal with mTLS, e.g., Cilium, Istio)
│   └── Multi-platform → Option 4 (Service mesh for all workloads, e.g., Consul, Istio)
├── Third-party / partner access → Option 2 (agent-based, restricted access)
└── All of the above → Combined model with multiple components

What is the current network model?
├── Flat network, no segmentation → Start with microsegmentation (Phase 1)
├── Basic VLAN segmentation → Add identity-aware proxy (Phase 2)
├── Cloud-native (K8s, serverless) → Service mesh + workload identity (Phase 3)
└── Full on-prem legacy → Start with ZTNA gateway for remote access (Phase 1)
```

### Zero Trust Maturity Model

| Level | Name | Characteristics | User Access | Workload Access | Monitoring |
|-------|------|----------------|-------------|-----------------|------------|
| 1 | Traditional | VPN-based, perimeter security | VPN + AD credentials | Network ACLs, firewalls | Basic logging |
| 2 | Initial | ZTNA pilot for remote access | ZTNA gateway + IdP + MFA | VLANs, security groups | SIEM integration |
| 3 | Defined | Identity-aware access for all apps | Policy engine + device posture | mTLS service mesh for critical workloads | Continuous monitoring |
| 4 | Managed | Full microsegmentation | JIT access, risk-based auth | All workload traffic encrypted, policy-enforced | UBA, risk scoring |
| 5 | Optimized | Adaptive, automated ZTA | AI-driven policies, zero standing privileges | Full zero trust for all workload types | Predictive risk analysis |

## Workflow

### Step 1: Assess Current State

**Network Architecture Mapping:**
```
Current State:
┌─────────────┐     VPN Tunnel     ┌──────────────────┐
│ User Laptop  │ ───────────────→ │  Corporate Network  │
└─────────────┘                    │                    │
                                   │  ┌──────────────┐  │
                                   │  │  App Server   │  │
                                   │  │  (internal IP)│  │
                                   │  └──────────────┘  │
                                   │  ┌──────────────┐  │
                                   │  │  DB Server    │  │
                                   │  │  (internal IP)│  │
                                   │  └──────────────┘  │
                                   │  ┌──────────────┐  │
                                   │  │  Legacy App   │  │
                                   │  │  (no auth)    │  │
                                   │  └──────────────┘  │
                                   └──────────────────┘
```

**Findings:** Implicit trust inside network, flat network, no encryption between services, legacy apps without authentication, VPN provides full network access.

### Step 2: Define Trust Zones and Segmentation

```
Trust Zone Model:
┌─────────────────────────────────────────────────┐
│  Internet (Untrusted)                            │
│  - All external traffic                          │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  User Access Zone (Zero Trust Proxy)             │
│  - Authenticated users, device posture checks    │
│  - Per-request authorization                     │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Public-Facing Zone                              │
│  - Web servers, API gateways                     │
│  - WAF, DDoS protection                          │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Application Zone                                │
│  - Business logic servers                        │
│  - mTLS between services                         │
│  - Network policy: app tier can only connect     │
│    to data tier on specific ports               │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Data Zone                                       │
│  - Databases, storage                            │
│  - Encryption at rest + transit                  │
│  - No direct access from user zone               │
│  - Access only via application tier API          │
└─────────────────────────────────────────────────┘
```

**Segmentation Policy Examples:**
```yaml
segmentation_policies:
  web_to_app:
    source_zone: "public-facing"
    dest_zone: "application"
    protocol: "HTTPS"
    port: 443
    allow: true
    mTLS: true
    logging: "all"

  app_to_data:
    source_zone: "application"
    dest_zone: "data"
    protocol: "PostgreSQL/TLS"
    port: 5432
    allow: true
    auth: "x509 certificate"
    logging: "all"
    allowed_source_apps: ["order-service", "user-service"]

  user_to_db:
    source_zone: "user-access"
    dest_zone: "data"
    action: "deny"  # No direct user-to-database access
    logging: "all"
    alert: true
```

### Step 3: Implement Identity-Aware Proxy (ZTNA)

**Pomerium Configuration:**
```yaml
# Pomerium Zero Trust Access Proxy
authenticate:
  idp: "okta"
  provider_url: "https://company.okta.com"
  client_id: "${OKTA_CLIENT_ID}"
  client_secret: "${OKTA_CLIENT_SECRET}"

policies:
  - from: "https://internal.company.com/app-1"
    to: "http://app-1.internal:8080"
    allow_public_unauthenticated: false
    allow_websockets: true
    pass_identity_headers: true
    policy:
      - allow:
          or:
            - domain:
                is: "company.com"
            - email:
                is: "admin@company.com"
      - deny:
          or:
            - ip:
                is_private: false  # Block external IPs
      - ceck_session:
        - id_token:
            groups:
              has: "engineering"

  - from: "https://ssh.company.com"
    to: "tcp://ssh-bastion.internal:22"
    tcp_upstream: true
    policy:
      - allow:
          and:
            - email:
                domain: "company.com"
            - groups:
                has: "ssh-access"
```

**Teleport for Infrastructure Access:**
```yaml
# teleport.yaml
teleport:
  auth_server: "auth.company.com:3025"
  auth_token: "/var/lib/teleport/token"

auth_service:
  enabled: true
  authentication:
    type: github
    second_factor: "otp"
  cluster_name: "company-prod"

proxy_service:
  enabled: true
  public_addr: "proxy.company.com:443"
  acme: true
  acme_email: "devops@company.com"

ssh_service:
  enabled: true
  commands:
    - name: "hostname"
      command: ["hostname"]
      period: 1m

kubernetes_service:
  enabled: true
  kubeconfig_groups:
    - "cluster-admins"
    - "developers"
```

### Step 4: Service-to-Service mTLS (East-West Security)

**Istio Service Mesh mTLS Configuration:**
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT  # Require mTLS for all service-to-service communication
---
# Per-namespace override for non-mesh services
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: legacy-ns
  namespace: legacy
spec:
  mtls:
    mode: PERMISSIVE  # Allow plaintext during migration
---
# Authorization policy: only allow specific services
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: order-service-authz
  namespace: prod
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/prod/sa/api-gateway"]
            namespaces: ["prod"]
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/orders/*"]
```

**Cilium Network Policies (eBPF-based microsegmentation):**
```yaml
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: "app-tier-policy"
spec:
  endpointSelector:
    matchLabels:
      tier: application
  ingress:
    - fromEndpoints:
        - matchLabels:
            tier: public-facing
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
  egress:
    - toEndpoints:
        - matchLabels:
            tier: data
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
---
apiVersion: "cilium.io/v2"
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: "deny-all-cross-namespace"
spec:
  endpointSelector: {}
  ingress:
    - fromEndpoints:
        - matchLabels:
            "k8s:io.kubernetes.pod.namespace": "$NAMESPACE"
  egress:
    - toEndpoints:
        - matchLabels:
            "k8s:io.kubernetes.pod.namespace": "$NAMESPACE"
```

### Step 5: Continuous Verification

**Device Posture Checks:**
```yaml
device_posture_policy:
  required_checks:
    - "OS patch level": "Within 14 days of latest"
    - "Disk encryption": "Full disk encryption enabled"
    - "Firewall": "Enabled with managed policy"
    - "Antivirus": "Running and up to date"
    - "Screen lock": "Enabled with < 5 min timeout"
    - "Disk encryption": "FileVault/BitLocker enabled"
    - "Certificate": "Valid device certificate present"

  enrollment:
    - "Device must be MDM-enrolled (Jamf, Intune, Workspace ONE)"
    - "Device certificate issued by internal CA"
    - "Renewed every 90 days"
    - "Revoked if device decommissioned or offboarded"

  compliance_action:
    - "Non-compliant: Block access to sensitive applications"
    - "Non-compliant > 7 days: Block all corporate access"
    - "Unknown device: Web-only access, no data download"
```

**Risk-Based Authentication:**
```python
risk_scoring_engine = {
    "factors": {
        "user_behavior": {
            "unusual_login_time": 20,
            "new_geo_location": 30,
            "multiple_failed_logins": 25,
            "access_from_new_device": 15
        },
        "device_health": {
            "missing_patches": 20,
            "disabled_firewall": 30,
            "outdated_antivirus": 20,
            "jailbroken_device": 50
        },
        "network_context": {
            "unknown_wifi": 15,
            "vpn_from_high_risk_country": 40,
            "tor_exit_node": 50
        },
        "resource_sensitivity": {
            "standard_app": 10,
            "financial_data": 30,
            "pii_data": 40,
            "admin_console": 50
        }
    },
    "thresholds": {
        "allow": "< 30",
        "step_up_auth": "30-60",  # Require additional MFA factor
        "block": "> 60"
    }
}

def evaluate_risk(session_context: dict) -> str:
    """
    Evaluate risk score and return auth decision.
    Returns: "allow", "step_up", or "block".
    """
    score = 0
    factors = risk_scoring_engine["factors"]

    # Evaluate user behavior factors
    if session_context.get("unusual_hours"):
        score += factors["user_behavior"]["unusual_login_time"]
    if session_context.get("new_geo"):
        score += factors["user_behavior"]["new_geo_location"]
    if session_context.get("failed_logins", 0) > 3:
        score += factors["user_behavior"]["multiple_failed_logins"]

    # Device health
    if session_context.get("missing_patches", 0) > 5:
        score += factors["device_health"]["missing_patches"]
    if not session_context.get("encryption_enabled"):
        score += factors["device_health"]["disabled_firewall"]

    # Network
    if session_context.get("high_risk_country"):
        score += factors["network_context"]["vpn_from_high_risk_country"]

    # Resource sensitivity
    score += factors["resource_sensitivity"].get(
        session_context.get("resource_type", "standard_app"), 10
    )

    # Decision
    if score < risk_scoring_engine["thresholds"]["allow"]:
        return "allow"
    elif score < 60:
        return "step_up"
    else:
        return "block"
```

### Step 6: Just-in-Time (JIT) Access

```python
import boto3
from datetime import datetime, timedelta
import hashlib

class JITAccessManager:
    """Just-in-time privileged access management for cloud."""

    def __init__(self):
        self.iam = boto3.client('iam')
        self.aws_orgs = boto3.client('organizations')

    def request_elevated_access(self, user_id: str, role_arn: str,
                                 reason: str, duration_minutes: int = 60) -> dict:
        """
        Request temporary elevated access to a cloud role.
        Requires manager approval for roles with admin privileges.
        """
        if duration_minutes > 240:
            return {"error": "Maximum elevation duration is 4 hours"}

        # Check if role is admin-level (requires approval)
        admin_roles = ["AdministratorAccess", "arn:aws:iam::aws:policy/AdministratorAccess"]
        is_admin = any(admin_role in role_arn for admin_role in admin_roles)

        request = {
            "user_id": user_id,
            "role_arn": role_arn,
            "reason": reason,
            "duration_minutes": duration_minutes,
            "requested_at": datetime.utcnow().isoformat(),
            "requires_approval": is_admin,
            "status": "pending_approval" if is_admin else "approved",
            "access_id": hashlib.sha256(
                f"{user_id}{role_arn}{datetime.utcnow().isoformat()}".encode()
            ).hexdigest()[:12]
        }

        if is_admin:
            # Notify manager for approval
            self._notify_approver(request)
        else:
            # Auto-approve for non-admin roles
            request = self._grant_access(request)

        return request

    def _grant_access(self, request: dict) -> dict:
        """Grant temporary access via IAM role assumption policy."""
        session_name = f"jit-{request['user_id']}-{request['access_id']}"

        # Create temporary policy that allows role assumption
        expiry = datetime.utcnow() + timedelta(minutes=request['duration_minutes'])
        temp_policy = {
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Action": "sts:AssumeRole",
                "Resource": request['role_arn'],
                "Condition": {
                    "DateLessThan": {"aws:CurrentTime": expiry.isoformat() + "Z"}
                }
            }]
        }

        # Attach temporary policy to user
        policy_name = f"jit-{request['access_id']}"
        self.iam.put_user_policy(
            UserName=request['user_id'],
            PolicyName=policy_name,
            PolicyDocument=json.dumps(temp_policy)
        )

        request['status'] = 'active'
        request['expires_at'] = expiry.isoformat()
        request['policy_name'] = policy_name
        return request

    def revoke_access(self, access_id: str):
        """Revoke JIT access before expiry."""
        # Find and remove the temporary policy
        pass
```

### Step 7: Zero Trust for Third-Party Access

```yaml
third_party_access:
  principles:
    - "No VPN — use ZTNA proxy with identity-aware access"
    - "No standing access — JIT, time-limited sessions"
    - "No broad network access — application-specific only"
    - "No data download — view-only when possible"

  implementation:
    identity_provider:
      - "Third-party users in separate IdP directory"
      - "SAML/SCIM provisioning from partner IdP if available"
      - "MFA enforced for all third-party access"

    access_policies:
      - from: "https://partner.company.com/support-tool"
        to: "http://support-tool.internal:8080"
        policy:
          - allow:
              and:
                - email:
                    domain: "partner-company.com"
                - groups:
                    has: "support-tier-1"
          - ceck_session:
              max_session_duration: "8h"
              session_inactivity_timeout: "30m"

    monitoring:
      - "All third-party sessions recorded and auditable"
      - "Real-time alert on anomalous behavior"
      - "Quarterly access review with partner manager"
      - "Auto-revoke if partner contract expires"
```

### Step 8: Migration Strategy (VPN → ZTNA)

**Phased Migration Plan:**

| Phase | Duration | Activities | Success Criteria |
|-------|----------|-----------|-----------------|
| 1 | 2 weeks | Deploy ZTNA gateway (Pomerium/Teleport), configure IdP integration, onboard 10% pilot users | Pilot users access all internal apps via ZTNA without disruption |
| 2 | 4 weeks | Deploy device posture checks, MFA enforcement, onboard remaining users, disable VPN for internal app traffic | 100% of internal app traffic through ZTNA |
| 3 | 4 weeks | Implement microsegmentation for critical workloads, deploy mTLS for top 10 inter-service communications | No lateral movement between zones, all critical traffic encrypted |
| 4 | 4 weeks | Deploy risk-based authentication, UBA, expand microsegmentation to all workloads | Risk-based auth live, all east-west traffic encrypted |
| 5 | 2 weeks | Decommission VPN, enforce ZTNA-only access, full continuous verification | VPN fully retired, zero standing access for all roles |

## Common Pitfalls

### Pitfall 1: ZTA as a Product, Not a Strategy
Buying a ZTNA tool without changing processes doesn't achieve zero trust. ZTA requires: IdP integration, device management, policy redefinition, network segmentation, and operational change.

### Pitfall 2: VPN Replacement Without Microsegmentation
Replacing VPN with ZTNA without segmenting east-west traffic leaves lateral movement unaddressed. ZTNA handles north-south (user-to-app). mTLS handles east-west (app-to-app).

### Pitfall 3: All-or-Nothing Approach
Attempting full ZTA migration in one phase causes disruption and resistance. Phased approach: start with user access, then segmentation, then automation.

### Pitfall 4: Ignoring Legacy Applications
Legacy apps without modern authentication (NTLM, basic auth, no auth) break in ZTA. Use: reverse proxy with auth injection, SAML/OpenID wrappers, application modernization.

### Pitfall 5: No Device Posture
Identity-only ZTA without device health checks is incomplete. Compromised device = compromised identity. Enforce: device certificate, patch level, encryption, AV status.

### Pitfall 6: Complex Policy Management
Hundreds of disparate authorization rules become unmanageable. Use policy engine (OPA/Rego) for centralized, version-controlled policies. Group by: application, data sensitivity, user role.

### Pitfall 7: Performance Impact of Per-Request Verification
Every request must be authenticated and authorized. For high-throughput systems, per-request overhead can be significant. Cache authorization decisions for short durations (TTL: 30-60s). Use sidecar proxies for low-latency.

### Pitfall 8: No Session Recording for Admin Access
Without recording privileged sessions, ZTA loses audit trail for admin access. Teleport records SSH sessions. Record and audit all administrative access.

## Best Practices

- Implement ZTA in phases: user access → microsegmentation → continuous verification → automation
- Enforce device posture checks alongside identity authentication
- Use mTLS for all service-to-service communication (Istio, Cilium, Consul)
- Implement JIT access for all privileged roles — zero standing privileges
- Use policy-as-code (OPA/Rego) for authorization policies — version-controlled, testable
- Deploy risk-based authentication that adapts to user, device, and network context
- Record all privileged sessions for audit and forensics
- Implement network microsegmentation with eBPF (Cilium) for granular, kernel-enforced policies
- Regularly test ZTA controls through purple team exercises
- Measure ZTA maturity: % of apps behind ZTNA, % of services with mTLS, % reduction in lateral movement

## Performance Considerations

- ZTNA proxy latency: Pomerium adds 3-10ms per request, Teleport adds 5-15ms. Acceptable for most applications
- mTLS handshake overhead: 1-5ms per new connection. Reuse connections with keep-alive
- Device posture checks: < 100ms per check, cached for 5 minutes
- Risk scoring: 10-50ms per evaluation, depending on data source latency
- Policy evaluation: OPA evaluates 10K+ rules per second per instance. Latency < 1ms per decision
- Scale: single ZTNA gateway handles 10K+ concurrent sessions. Multi-region for global deployments

## Rules
- Every access request must be authenticated and authorized regardless of source network
- No implicit trust based on network location — VPN does not grant access
- All traffic must be encrypted in transit (mTLS for service-to-service)
- Access must be dynamic and risk-aware, not static
- Assume breach: segment laterally, log everything
- Least privilege: grant only what's needed, just-in-time
- Device posture must be verified for every privileged session
- Privileged access must be recorded and auditable
- Legacy applications must be wrapped with authentication before ZTNA deployment

## References
  - references/continuous-verification.md — Continuous Verification
  - references/core-principles.md — Zero Trust Core Principles
  - references/identity-first-security.md — Identity-First Security
  - references/microsegmentation.md — Network Microsegmentation
  - references/zero-trust-advanced.md — Zero Trust Advanced Topics
  - references/zero-trust-data.md — Zero Trust Data
  - references/zero-trust-fundamentals.md — Zero Trust Fundamentals
  - references/zero-trust-networking.md — Zero Trust Networking
  - references/zt-access-proxy.md — Zero Trust Access Proxy
## Handoff
Zero Trust architecture artifacts can be handed to network-engineering for firewall configuration, platform-engineering for service mesh/mTLS, and security-engineering for SIEM integration.
