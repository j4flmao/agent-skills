# IAM Governance Advanced Topics

## Introduction
Advanced IAM governance covers AI-driven access certification, continuous access evaluation, zero-standing-privileges architecture, identity threat detection and response (ITDR), and IAM in multi-cloud/ hybrid environments.

## AI-Driven Access Certification
ML models can assist access reviewers:
- Predict which access is likely needed based on role, department, and peer group
- Flag anomalous access (user has access that no peer has)
- Recommend revocation of unused access (> 90 days without access)
- Prioritize review items by risk (privileged access, sensitive data, compliance critical)

## Continuous Access Evaluation
Instead of periodic certification, continuously evaluate access:
- Real-time risk scoring for each access request
- Automatic revocation when user behavior deviates (unusual login location, time, device)
- Context-aware access decisions based on: user role, device posture, network, resource sensitivity
- Integration with UEBA for risk-based access decisions

## Zero Standing Privileges
Eliminate permanent privileged access entirely:
- All privileged access is JIT — requested when needed, auto-revoked after use
- Privileged access requires approval with business justification
- Session duration limited to minimum required (typically 1-4 hours)
- All privileged sessions recorded for audit
- Break glass accounts for emergencies with immediate notification

## Identity Threat Detection and Response (ITDR)
ITDR extends IAM with threat detection for identity attacks:
- Detect credential theft (unusual login from new location)
- Detect session hijacking (simultaneous logins from different geos)
- Detect MFA fatigue attacks (repeated MFA push notifications)
- Detect privilege escalation (user grants themselves additional roles)
- Respond: revoke sessions, force password reset, trigger MFA challenge

## Key Points
- AI assists access certification by predicting needed access and flagging anomalies
- Continuous access evaluation replaces periodic reviews with real-time risk scoring
- Zero standing privileges eliminates all permanent privileged access
- ITDR detects and responds to identity-based attacks
- Multi-cloud IAM requires federated identity and centralized governance
- SCIM enables automated provisioning across cloud applications
- Monitor identity attack patterns: credential theft, MFA fatigue, session hijacking
