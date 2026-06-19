# RBAC Advanced Topics

## Introduction
Advanced RBAC covers dynamic role assignment (context-aware RBAC), attribute-based role assignment, RBAC as code, RBAC audit and compliance automation, and hybrid RBAC-ABAC architectures for fine-grained access control at enterprise scale.

## Dynamic Role Assignment
Assign roles based on context rather than static assignment:
- **Time-based**: Role active only during business hours
- **Location-based**: Different roles based on network (office vs VPN vs public)
- **Device-based**: Reduced privileges on unmanaged devices
- **Risk-based**: Elevated authentication required for high-risk actions
- **Project-based**: Auto-assign developer role when added to a project

## RBAC as Code
Version-controlled RBAC policies using tools like OPA/Rego:

```rego
package rbac

# Role definitions
user_roles = {
    "alice": ["admin"],
    "bob": ["developer", "maintainer"],
    "carol": ["viewer"],
}

role_permissions = {
    "admin": ["*:*"],
    "maintainer": ["project:admin", "member:manage", "deploy:staging"],
    "developer": ["project:write", "code:push", "issue:create", "issue:update"],
    "viewer": ["project:read", "issue:view"],
}

# Inherited permissions through hierarchy
role_hierarchy = {"admin": ["maintainer"], "maintainer": ["developer"], "developer": ["viewer"]}

allowed_permissions[user] = perms {
    user_roles[user][_]
    perms := effective_permissions(user_roles[user][_])
}

effective_permissions(role) = perms {
    direct := role_permissions[role]
    inherited := [p | h := role_hierarchy[role][_]; p := effective_permissions(h)]
    perms := direct | inherited
}

allow {
    user_roles[input.user][_]
    effective_permissions(user_roles[input.user][_])[input.permission]
}
```

## RBAC Audit Automation
```python
class RBACAudit:
    """Automated RBAC audit checks."""

    def find_orphaned_assignments(self) -> list[dict]:
        """Find role assignments for inactive/deleted employees."""
        return [
            {"user": u, "role": r}
            for u, roles in self.user_roles.items()
            if self.is_inactive(u)
            for r in roles
        ]

    def find_sod_violations(self) -> list[dict]:
        """Find users with conflicting role assignments."""
        violations = []
        for user, roles in self.user_roles.items():
            for sod_a, sod_b in self.sof_pairs:
                if sod_a in roles and sod_b in roles:
                    violations.append({"user": user, "roles": [sod_a, sod_b]})
        return violations

    def find_overpermissive_roles(self) -> list[str]:
        """Find roles with more permissions than any user needs."""
        # Logic to analyze permission usage
        pass
```

## Hybrid RBAC-ABAC
Use RBAC for broad access levels and ABAC for fine-grained controls:
- RBAC determines "can user access the module?" (e.g., "Billing Manager" can access billing)
- ABAC determines "can user access this specific record?" (e.g., only invoices for their region)
- RBAC handles 80% of access decisions; ABAC handles the remaining 20% requiring context

## Key Points
- Dynamic RBAC assigns roles based on context (time, location, device, risk)
- RBAC as code enables version-controlled, auditable role definitions
- Automated RBAC audits find orphaned assignments, SoD violations, over-permissive roles
- Hybrid RBAC-ABAC provides scalable, fine-grained access control
- Role mining discovers natural permission clusters from existing access patterns
- RBAC policies should be tested like code — with automated test suites
- Monitor role usage: which permissions are never used and can be removed?
