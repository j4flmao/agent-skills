# ABAC Fundamentals

## Overview
Attribute-Based Access Control (ABAC) grants access based on attributes of the user, resource, action, and environment. ABAC evaluates policies against attribute values at runtime, enabling fine-grained, context-aware authorization. ABAC is more flexible than RBAC (role-based) — access can depend on user department, resource classification, time of day, location, and risk score.

## Core Concepts

### Concept 1: Attribute Types
- **Subject attributes**: User role, department, clearance level, location, device posture
- **Resource attributes**: Document classification, data sensitivity, owner, project
- **Action attributes**: Read, write, delete, share, export
- **Environment attributes**: Time of day, network location, threat level, compliance mode

### Concept 2: Policy Structure
ABAC policies use boolean logic combining attributes: `if user.department == resource.project_owner AND action == "read" AND environment.time between 9:00 and 17:00 then allow`. Policies are evaluated at runtime by a policy decision point (PDP).

### Concept 3: Policy Decision Point (PDP)
The PDP evaluates access requests against policies and returns a decision (allow/deny). The PDP is stateless and scales horizontally. It receives: subject attributes, resource attributes, action, and environment context. It returns: permit, deny, or not-applicable.

### Concept 4: Policy Enforcement Point (PEP)
The PEP intercepts access requests and enforces the PDP's decision. PEPs are deployed at application gateways, API gateways, service meshes, or within applications. The PEP caches decisions for performance.

## ABAC vs RBAC

| Aspect | RBAC | ABAC |
|--------|------|------|
| Access model | Role-based | Attribute-based |
| Granularity | Coarse (role level) | Fine (attribute level) |
| Flexibility | Low — roles change infrequently | High — attributes evaluated per request |
| Complexity | Simple to implement | Complex — policy management needed |
| Scale | Works for < 100 roles | Scales to millions of attribute combos |
| Audit | Clear (role assignments) | Complex (attribute value traceability) |
| Performance | Fast (static role check) | Slower (policy evaluation) |
| Best for | Simple orgs, stable permissions | Dynamic orgs, complex rules |
| Hybrid | RBAC for broad roles, ABAC for fine-grained decisions | |

## Implementation Guide

### Step 1: Define Attributes
```yaml
attributes:
  subject:
    department: ["engineering", "finance", "hr", "legal"]
    clearance: ["confidential", "secret", "top-secret"]
    location: ["office", "remote", "travel"]
    device_type: ["managed", "unmanaged", "mobile"]
  resource:
    classification: ["public", "internal", "confidential", "restricted"]
    owner_department: ["engineering", "finance", "hr"]
    project: ["project-alpha", "project-beta"]
  action:
    type: ["create", "read", "update", "delete", "share", "export"]
  environment:
    time: "business hours (9-17) or after hours"
    network: ["corporate", "vpn", "public"]
    threat_level: ["low", "medium", "high", "critical"]
```

### Step 2: Write OPA/Rego Policies
```rego
# policy/authz.rego
package authz

# Default deny
default allow = false

# Engineering can read internal docs during business hours
allow {
    input.subject.department == "engineering"
    input.resource.classification == "internal"
    input.action.type == "read"
    input.environment.time >= 9
    input.environment.time <= 17
}

# Finance managers can read and export financial data
allow {
    input.subject.department == "finance"
    input.subject.role == "manager"
    input.resource.classification == "confidential"
    input.action.type in ["read", "export"]
    input.resource.owner_department == "finance"
}

# HR can manage employee records for their own department
allow {
    input.subject.department == "hr"
    input.resource.classification == "restricted"
    input.resource.owner_department == input.subject.department
    input.action.type in ["create", "read", "update"]
}

# Any employee can access public resources
allow {
    input.resource.classification == "public"
    input.action.type == "read"
}
```

## Best Practices
- Start with RBAC, add ABAC for fine-grained rules on top
- Keep policies simple — complex boolean logic is hard to debug
- Use deny-by-default — only allow what's explicitly permitted
- Cache PDP decisions for performance (short TTL: 30-60s)
- Log all denied access attempts for audit and policy tuning
- Version control policies alongside application code
- Test policies with automated policy test suites
- Monitor policy evaluation time — slow policies affect user experience
- Use policy documentation generation from Rego comments

## Common Pitfalls
- Too many policies without hierarchy (hard to debug and maintain)
- Missing attribute values causing unexpected denies (set defaults)
- Policy evaluation bottlenecks (use decision caching)
- Overly fine-grained policies that change frequently (balance with RBAC)
- No policy testing (policies with bugs create security gaps or lockouts)
- Environment attribute manipulation (don't trust client-provided attributes)
- Attribute explosion — too many unique attribute values to manage

## Key Points
- ABAC grants access based on subject, resource, action, and environment attributes
- More flexible than RBAC for complex, context-aware authorization
- OPA/Rego is the leading open-source policy engine for ABAC
- Default deny — only explicitly allow authorized access
- Cache PDP decisions for performance
- Test policies with automated test suites
- Log denies for audit and policy tuning
- Combine with RBAC for practical enterprise deployments
