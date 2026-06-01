# Conditional Access and Zero-Trust Identity

## Overview
Conditional access policies evaluate identity, device, location, and risk signals at every authentication request. Zero-trust identity extends this with continuous verification beyond login. This reference covers designing, implementing, and operating conditional access for identity security.

## Conditional Access Signals

### Signal Categories
| Signal | Examples | How Collected |
|--------|----------|---------------|
| User identity | Who is authenticating | IdP from token claims |
| Device health | Compliant? Managed? Jailbroken? | MDM (Intune, Jamf), device attestation |
| Location | IP address, geo-coordinates | IdP from request IP, geo-IP databases |
| Network | Corporate VPN? Trusted IP range? | IdP from client IP |
| Risk | Anomalous sign-in, impossible travel, leaked credentials | IdP risk detection, threat intelligence |
| Application | Which app is being accessed | OAuth client_id, SAML SP entity |

### Risk Scoring
| Risk Level | Indicators | Action |
|------------|------------|--------|
| Low | Known device, usual location, normal behavior | Allow |
| Medium | New device, different region, off-hours access | Require MFA |
| High | Impossible travel, known compromised device, leaked credentials | Block + alert + investigate |
| Critical | Confirmed compromise, insider threat indicators | Block + immediate incident response |

## Policy Design

### Policy Structure
```
WHEN {conditions} THEN {controls}
```
Conditions: user/group, device compliance, location/network, application, risk level, authentication strength.

Controls: Allow (with or without MFA), Require specific MFA strength, Block, Require terms of use acceptance, Require device enrollment, Limit session duration.

### Policy Priority
Policies are evaluated in order. First match applies. Explicit deny policies should be highest priority. Granular policies before broad policies.

### Common Policy Templates
| Scenario | Policy |
|----------|--------|
| Admin access | Require hardware key MFA + compliant device + corporate network |
| Remote access | Require MFA + device compliance + session timeout 4h |
| Third-party access | Require MFA + limited session (1h) + IP restriction |
| High-risk sign-in | Block if impossible travel, require step-up MFA if suspicious |
| New device | Require MFA + device enrollment + periodic re-auth |
| Off-hours access | Require MFA + alert + session timeout 2h |

## Zero-Trust Identity

### Continuous Access Evaluation (CAE)
Beyond login-time verification. Events that trigger session re-evaluation: device becomes non-compliant, user's account is disabled, risk score increases, location changes significantly, leaked credentials detected.

### Session Revocation Events
| Event | Action |
|-------|--------|
| User terminated | Immediate revocation of all sessions |
| Device lost/stolen | Revoke sessions from that device |
| Password change | Revoke all sessions except current |
| MFA reset | Revoke all sessions, require re-enrollment |
| Risk threshold exceeded | Step-up auth or session termination |
| IP geolocation change | Re-evaluate policies |

### Token Binding
Bind tokens to the device's TLS connection. Prevents token theft and replay. Implemented via DPoP (Demonstration of Proof-of-Possession) or mTLS. Required for high-security environments.

## Implementation

### Azure AD / Entra ID Conditional Access
```json
{
  "displayName": "Require MFA for Admin Apps",
  "conditions": {
    "applications": { "includeApplications": ["Office365", "AzureManagement"] },
    "users": { "includeRoles": ["Global Administrator", "Application Administrator"] },
    "locations": { "includeLocations": ["AllTrusted"] }
  },
  "grantControls": {
    "builtInControls": ["mfa", "compliantDevice"],
    "authenticationStrength": {
      "requirements": "fido2"
    }
  },
  "sessionControls": {
    "signInFrequency": {
      "value": 4,
      "type": "hours"
    }
  }
}
```

### Okta Contextual Access
```json
{
  "name": "Require Hardware MFA for Sensitive Apps",
  "conditions": {
    "people": { "groups": { "include": ["sensitive-app-users"] } },
    "device": { "isManaged": true },
    "network": { "connection": "ANYWHERE" }
  },
  "actions": {
    "requireFactor": ["webauthn"],
    "enroll": { "require": ["webauthn"] },
    "maxSessionLifetime": "PT4H"
  }
}
```

### Keycloak Conditional Authentication
Keycloak provides conditional authentication through authentication flows with conditional execution. Example: require OTP only if login from untrusted IP. Configured via the Authentication > Flows UI or JSON realm config.

## Operations

### Policy Testing
- Reports-only mode: evaluate policies without enforcement, observe effect
- Gradual rollout: start with small user group, expand over weeks
- A/B testing: different policies for different user segments
- Alert on policy failures: legitimate users being blocked = policy too aggressive

### Policy Monitoring
Track: total authentications evaluated, number of MFA challenges, number of blocked requests, policy evaluation failures, user-reported access issues. Review policy effectiveness monthly.

### Troubleshooting
When users report access issues: check sign-in logs for policy evaluation details, verify device compliance status, check risk score at time of sign-in, review conditional access policy order, test with what-if tool (Azure AD).

## Key Points
- Conditional access evaluates user, device, location, and risk at every authentication
- Zero-trust extends beyond login with continuous session re-evaluation
- Explicit deny policies must be highest priority
- Risk scoring enables adaptive authentication without blocking legitimate users
- Token binding (DPoP/mTLS) prevents token theft and replay
- Policy testing in reports-only mode before enforcement prevents user lockout
- Session revocation on risk events prevents lateral movement after compromise
- Monitor policy effectiveness and user impact, adjust based on data