# Zero Trust Fundamentals

## Overview
Zero Trust is a security model based on the principle "never trust, always verify." Unlike traditional perimeter-based security, Zero Trust assumes no implicit trust based on network location. Every access request is authenticated, authorized, and continuously validated before granting access to resources. Zero Trust is not a single product but a strategic framework encompassing multiple security disciplines.

## Core Concepts

### Concept 1: Zero Trust Principles (NIST SP 800-207)
1. **All data sources and computing services are resources**: Any device, API, or service that provides or consumes data
2. **All communication is secured regardless of network location**: Encrypt everything, no trust based on network location
3. **Access to resources is granted per-session**: Least privilege, just-in-time access
4. **Access is determined by dynamic policy**: Based on user identity, device health, location, data sensitivity, and risk
5. **Monitor and measure all assets and traffic**: Visibility is essential for verification
6. **Dynamic authentication and authorization before access**: Continuous verification, not just at login
7. **Collect information about asset state, network behavior, and activity**: Context-aware policy decisions

### Concept 2: Zero Trust Architecture Pillars
| Pillar | Description | Key Technologies |
|--------|-------------|-----------------|
| **Identity** | Verify user identity before access | SSO, MFA, PAM, Identity Governance |
| **Device** | Ensure device is healthy and compliant | MDM, EDR, device posture assessment |
| **Network** | Micro-segment and encrypt traffic | Micro-segmentation, SD-WAN, TLS, mTLS |
| **Application** | Secure applications and APIs | WAF, API gateways, runtime protection |
| **Data** | Classify and protect sensitive data | DLP, encryption, data classification |
| **Infrastructure** | Secure compute, storage, and networks | CSPM, CIEM, workload identity |

### Concept 3: Policy Decision Points
- **PEP (Policy Enforcement Point)**: Gate that enforces access decisions (gateway, reverse proxy, VPN)
- **PDP (Policy Decision Point)**: Engine that evaluates policies and makes access decisions
- **PIP (Policy Information Point)**: Sources of context (IdP, MDM, threat intel, SIEM)

### Concept 4: Deployment Models
- **NIST Model**: Enhanced identity governance + micro-segmentation
- **Google BeyondCorp**: Device and user-based access without VPN
- **Zscaler/Cloud ZTNA**: Cloud-delivered Zero Trust via ZTNA broker
- **Microsoft Zero Trust**: Integrated Microsoft stack (Azure AD, Intune, Defender)

## Implementation Guide

### Step 1: Zero Trust Policy Engine (PDP Example)
```rego
package zero_trust

import future.keywords.if

# User attributes
user_roles := {
    "alice": ["billing_admin", "finance_team"],
    "bob": ["developer", "engineering_team"],
    "carol": ["viewer", "marketing_team"],
}

# Device compliance from MDM
device_compliance := data.devices[input.device_id]

# Allowed access by role + data sensitivity
allowed_access := {
    "billing_admin": {"sensitivity": ["confidential", "restricted"]},
    "developer": {"sensitivity": ["public", "internal"]},
    "viewer": {"sensitivity": ["public"]},
}

# Risk scoring
risk_score := score {
    # Location risk
    loc_risk := 5 if input.geo_country not in trusted_countries
    loc_risk := 0 if input.geo_country in trusted_countries

    # Device risk
    dev_risk := 10 if not device_compliance.is_compliant
    dev_risk := 0 if device_compliance.is_compliant

    # Time risk
    time_risk := 3 if input.access_time not in business_hours
    time_risk := 0 if input.access_time in business_hours

    score := loc_risk + dev_risk + time_risk
}

# Access decision
allow if {
    # User must have role
    user_roles[input.user][_]

    # Role must have access to resource sensitivity
    user_roles[input.user][role]
    allowed_access[role].sensitivity[_] == input.resource_sensitivity

    # Risk score must be below threshold
    risk_score <= 5
}

# Step-up authentication for higher risk
deny["step_up_auth_required"] if {
    user_roles[input.user][_]
    risk_score > 5
    risk_score <= 10
    not input.mfa_verified
}

# Deny high risk
deny["access_denied_high_risk"] if {
    risk_score > 10
}
```

### Step 2: ZTNA Configuration (Cloudflare Access)
```yaml
# Cloudflare Zero Trust Access configuration
access_application:
  name: "Internal Billing App"
  domain: "billing.internal.example.com"
  session_duration: "1h"

  policies:
    - name: "Billing Team"
      decision: "allow"
      rules:
        - selector: "email"
          operator: "ends_with"
          value: "@example.com"
        - selector: "group"
          operator: "includes"
          value: "billing-team"

    - name: "Contractor Access"
      decision: "allow"
      rules:
        - selector: "email"
          operator: "ends_with"
          value: "@contractor.example.com"
        - selector: "device_posture"
          operator: "is"
          value: "managed_device"
        - selector: "geo"
          operator: "in"
          values: ["US", "CA"]
      session_duration: "4h"
      require_mfa: true
```

### Step 3: Micro-segmentation with Network Policies
```yaml
# Kubernetes Network Policy for zero trust
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-tier-policy
spec:
  podSelector:
    matchLabels:
      tier: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              tier: frontend
      ports:
        - protocol: TCP
          port: 8080
    - from:
        - namespaceSelector:
            matchLabels:
              name: monitoring
      ports:
        - protocol: TCP
          port: 9090
  egress:
    - to:
        - podSelector:
            matchLabels:
              tier: database
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              app: auth-service
      ports:
        - protocol: TCP
          port: 5000
```

### Step 4: Zero Trust Access Flow (Python)
```python
class ZeroTrustAccess:
    """Zero Trust access decision engine."""

    def evaluate_access(self, request: AccessRequest) -> AccessDecision:
        """Evaluate all policies and return access decision."""
        # 1. Identity verification
        if not self.verify_identity(request.user, request.token):
            return AccessDecision.DENY

        # 2. Device posture check
        device = self.get_device(request.device_id)
        if not device.is_compliant:
            return AccessDecision.DENY

        # 3. Context evaluation
        risk_context = self.calculate_risk(request, device)

        # 4. Policy evaluation
        policy_result = self.policy_engine.evaluate(
            user=request.user,
            resource=request.resource,
            action=request.action,
            context=risk_context,
        )

        # 5. Step-up auth if needed
        if policy_result.step_up_required and not request.mfa_verified:
            return AccessDecision.STEP_UP_AUTH

        # 6. Allow or deny
        if policy_result.allowed:
            self.audit_log(request, "ALLOWED")
            return AccessDecision.ALLOW
        else:
            self.audit_log(request, "DENIED", policy_result.reason)
            return AccessDecision.DENY

    def calculate_risk(self, request: AccessRequest, device: Device) -> RiskContext:
        """Calculate risk score based on context."""
        score = 0
        # Location
        if request.geo_country not in self.TRUSTED_COUNTRIES:
            score += 10
        # Device age
        if device.last_patch > 30:  # days
            score += 5
        # Time
        if not self.is_business_hours(request.timestamp):
            score += 3
        # Behavior anomaly
        if self.is_anomalous_behavior(request):
            score += 20

        return RiskContext(score=score, factors={
            "geo": request.geo_country,
            "device_age": device.last_patch,
            "time": request.timestamp,
            "behavior_anomaly": self.is_anomalous_behavior(request),
        })
```

## Best Practices
- Start with identity as the new perimeter (SSO + MFA for everything)
- Implement device posture checks before granting access
- Use micro-segmentation to limit lateral movement
- Encrypt all traffic in transit (TLS everywhere)
- Implement just-in-time and just-enough-access (JIT/JEA)
- Log and monitor all access decisions
- Apply least privilege principle to every resource
- Implement continuous verification — don't trust after initial auth
- Phase implementation: pilot with one application, then expand
- Automate policy enforcement with infrastructure as code

## Common Pitfalls
- Treating Zero Trust as a product (it's a framework, not a single purchase)
- VPN replacement only — Zero Trust is more than ZTNA
- No device posture checks — identity alone is not enough
- Static policies without risk context — misses anomalous behavior
- Not monitoring access patterns — can't improve without data
- Trying to achieve Zero Trust overnight — it's a journey, not a project
- Overly complex policies — hard to maintain, audit, and debug
- Ignoring data classification — can't protect what you don't understand
- No continuous verification — compromise after auth is still possible
- Not involving the business — security decisions affect productivity

## Key Points
- Zero Trust: never trust, always verify — no implicit trust based on location
- NIST SP 800-207 defines 7 core principles
- Six pillars: Identity, Device, Network, Application, Data, Infrastructure
- PEP/PDP/PIP architecture for access decisions
- Continuous verification — not just at login
- Micro-segmentation limits lateral movement
- JIT/JEA access reduces privilege blast radius
- Encrypt all traffic; log all decisions
- Phased implementation: start with one app, then expand
- Zero Trust is a framework, not a product

## Zero Trust Maturity Model
| Phase | Network | Identity | Device | Applications |
|-------|---------|----------|--------|-------------|
| **Traditional** | VPN-based, network segmentation | Password only | Manual compliance | WAF |
| **Initial** | Cloud proxy, SD-WAN | SSO + MFA | MDM enrollment | ZTNA for web apps |
| **Advanced** | Micro-segmentation, encryption | Conditional access | Device posture check | mTLS for all comms |
| **Optimal** | AI-driven segmentation | Passwordless, continuous auth | Zero-touch compliance | Runtime protection |
