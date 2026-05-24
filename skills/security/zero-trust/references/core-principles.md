# Zero Trust Core Principles

## The Three Pillars of Zero Trust

### 1. Verify Explicitly
Always authenticate and authorize based on ALL available data points:
- User identity and credentials
- Device health and posture
- Location and network context
- Data classification and sensitivity
- Time-based and behavioral anomalies

Verification happens at every request, not just at session initiation.

### 2. Use Least Privilege Access
Grant the minimum permissions required:
- JIT (Just-In-Time) elevation for privileged tasks
- JEA (Just-Enough-Administration) for specific commands
- Risk-based conditional access policies
- Time-bound access tokens with short expiration
- Automatic permission revocation after task completion

### 3. Assume Breach
Design for breach containment:
- Segment networks with micro-perimeters
- Encrypt all traffic end-to-end (not just perimeter)
- Monitor and log all access attempts
- Automated detection and response for anomalous behavior
- Assume attacker is already inside the network

## NIST SP 800-207 Framework

### Zero Trust Core Components
| Component | Function |
|-----------|----------|
| Policy Engine (PE) | Makes access decisions based on policy |
| Policy Administrator (PA) | Establishes/shuts down communication paths |
| Policy Enforcement Point (PEP) | Enables/disables communication session |
| Data Sources | CDM system, industry compliance, threat intel, logs, IdP |

### NIST Deployment Options

**Deployment Option 1 — Agent/Gateway:**
- Enterprise-managed device with agent communicates to gateway
- Gateway enforces access policy for enterprise resources
- Best for: Managed device fleets, traditional enterprise

**Deployment Option 2 — Endpoint-Initiated:**
- Device connects directly to resource with endpoint-enforced policy
- No central gateway; policy embedded in endpoint agent
- Best for: BYOD, remote work, non-gateway resources

**Deployment Option 3 — Resource Portal:**
- All resources accessed through a cloud portal/gateway
- Portal is the only PEP; no direct resource access
- Best for: SaaS-forward organizations, contractor access

**Deployment Option 4 — SaaS-Native:**
- Built into SaaS applications themselves
- Application enforces its own access policies
- Best for: Cloud-native organizations, Google Workspace, Office 365

### Logical Architecture
```
User/Device → PEP → Policy Administrator ← Policy Engine
                ↓                              ↓
           Resource                        Data Sources
                                         (CDM, Threat Intel,
                                          IdP, Logs, Compliance)
```

## Zero Trust Maturity Model

| Stage | Description | Characteristics |
|-------|-------------|-----------------|
| 1. Traditional | Perimeter-based | VPN, firewall rules, VLAN segmentation, implicit trust |
| 2. Initial | Identity controls | MFA, basic SSO, network segmentation starts |
| 3. Advanced | Policy-driven | Device posture, location-aware access, microsegmentation |
| 4. Optimal | Continuous verification | Real-time risk scoring, automated response, AI-driven policies |

## Key Design Tenets

1. **All data sources and computing services are considered resources** — No distinction between on-prem and cloud
2. **All communication is secured regardless of network location** — No "trusted" internal network
3. **Access to individual resources is granted on a per-session basis** — No broad network access
4. **Access is determined by dynamic policy** — Not static IPs or VLANs
5. **Enterprise monitors and measures all owned assets** — Visibility is mandatory
6. **All resource authentication and authorization is dynamic and strictly enforced** — Before access is allowed
7. **Enterprise collects as much information as possible** — For security posture improvement

## Practical Implementation

### Quick Wins
1. Enable MFA for all users
2. Deploy device posture checking (OS version, patch level, EDR running)
3. Replace VPN with ZTNA for remote access
4. Implement SSO with conditional access policies
5. Start logging all authentication events centrally

### Migration Strategy
- Year 1: Identity controls (MFA, SSO, device management)
- Year 2: Access proxy deployment (ZTNA), start microsegmentation
- Year 3: Full microsegmentation, continuous verification, automated response

## Related Standards
- **NIST SP 800-207**: Zero Trust Architecture — the canonical framework
- **CISA ZT Maturity Model**: Zero Trust Maturity Model v2.0
- **Forrester ZTX**: Zero Trust eXtended ecosystem
- **Gartner CARTA**: Continuous Adaptive Risk and Trust Assessment
