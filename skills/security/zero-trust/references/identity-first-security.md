# Identity-First Security

## Identity as the New Perimeter
In Zero Trust, identity is the primary security boundary. Traditional network perimeter controls are insufficient in cloud, mobile, and remote-work environments.

### Key Elements
- **SSO (Single Sign-On)**: Centralize authentication with SAML/OIDC
- **MFA (Multi-Factor Authentication)**: Require at least 2 factors for all access
- **Conditional Access**: Policies based on user, device, location, application, risk
- **Passwordless**: Transition to FIDO2, Windows Hello, biometric auth
- **PIM (Privileged Identity Management)**: JIT elevation for admin roles

### Conditional Access Policies
```json
{
  "name": "Block Unmanaged Device Access",
  "conditions": {
    "applications": ["All cloud apps"],
    "platforms": ["iOS", "Android", "Windows", "macOS"],
    "deviceStates": {"compliance": false}
  },
  "grantControls": {
    "operator": "AND",
    "builtInControls": ["block"]
  }
}
```

## Identity Governance
- Access certifications: Periodic review of user access
- Role-based provisioning: Auto-assign roles from HR system
- Segregation of duties: Prevent conflicting access combinations
- Entitlement reporting: Who has access to what?
- Lifecycle management: Disable access when employee leaves

## Key Points
- Identity is the primary security boundary in Zero Trust
- SSO + MFA for all access — no exceptions
- Conditional access policies enforce context-aware decisions
- PIM enables JIT elevation for privileged roles
- Passwordless authentication improves security and user experience
- Identity governance ensures appropriate access over time
- Continuous verification detects compromised sessions and anomalies
