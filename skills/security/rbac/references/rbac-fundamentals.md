# RBAC Fundamentals

## Overview
Role-Based Access Control (RBAC) grants access based on organizational roles — users are assigned to roles, and roles are granted permissions. RBAC simplifies access management by grouping permissions into logical roles that reflect job functions. It's the most widely deployed access control model for enterprise systems.

## Core Concepts

### Concept 1: Core RBAC Elements
- **User**: Individual who needs access to resources
- **Role**: Collection of permissions representing a job function (e.g., "Billing Admin", "Developer", "Auditor")
- **Permission**: Approval to perform an operation on a resource (e.g., "read invoices", "deploy to production")
- **Session**: Mapping of user to activated subset of their roles

### Concept 2: NIST RBAC Model Levels
- **Level 0 (Flat RBAC)**: Users assigned to roles, roles have permissions. Simple, no hierarchy
- **Level 1 (Hierarchical RBAC)**: Role hierarchy — senior roles inherit from junior roles. Reduces redundancy
- **Level 2 (Constrained RBAC)**: Adds separation of duties (SoD) — mutually exclusive roles prevent conflicts
- **Level 3 (Consolidated RBAC)**: Adds role review, audit, and administration policies

### Concept 3: Separation of Duties (SoD)
Prevent fraud and errors by dividing critical operations:
- **Static SoD**: User cannot be assigned conflicting roles simultaneously
- **Dynamic SoD**: User can have both roles but cannot exercise both in same session
- **Object-based SoD**: User cannot approve their own transaction (requester ≠ approver)

### Concept 4: Role Engineering
Designing roles that balance granularity with manageability:
- **Top-down**: Analyze business functions and define roles from organizational structure
- **Bottom-up**: Analyze existing permissions and cluster them into roles
- **Hybrid**: Combine top-down business analysis with bottom-up permission analysis

## Implementation Guide

### Step 1: Role Definition
```yaml
roles:
  viewer:
    description: "Read-only access to project resources"
    permissions:
      - "project:read"
      - "issue:view"
      - "wiki:read"
    scope: "assigned_projects"

  developer:
    description: "Can create and modify project resources"
    inherits: ["viewer"]
    permissions:
      - "project:write"
      - "issue:create"
      - "issue:update"
      - "code:push"
      - "code:review"
    scope: "assigned_projects"

  maintainer:
    description: "Can manage project settings and members"
    inherits: ["developer"]
    permissions:
      - "project:admin"
      - "member:manage"
      - "pipeline:configure"
      - "deploy:staging"
    scope: "assigned_projects"

  admin:
    description: "Full access across all projects"
    inherits: ["maintainer"]
    permissions:
      - "project:*"
      - "member:*"
      - "deploy:production"
      - "settings:*"
      - "billing:*"
    scope: "global"
```

### Step 2: Role Assignment Automation
```python
# Role assignment engine
class RoleAssignmentEngine:
    """Automatically assign and manage roles."""

    def __init__(self):
        self.role_hierarchy = {
            "admin": ["maintainer"],
            "maintainer": ["developer"],
            "developer": ["viewer"],
        }
        self.sod_pairs = [
            ("billing_processor", "payment_approver"),  # Can't process and approve payments
            ("requester", "approver"),  # Can't request and approve same thing
        ]

    def assign_role(self, user_id: str, role: str, scope: str, assigned_by: str):
        """Assign a role to a user with proper inheritance and SoD checks."""
        # Check SoD conflicts
        user_roles = self._get_user_roles(user_id)
        for existing_role in user_roles:
            if self._are_conflicting(role, existing_role):
                raise ValueError(f"SoD conflict: {role} conflicts with {existing_role}")

        # Assign the role (implementation details vary by system)
        self._create_assignment(user_id, role, scope, assigned_by)

        # If hierarchical, also assign inherited roles
        for inherited_role in self._get_inherited_roles(role):
            if inherited_role not in user_roles:
                self._create_assignment(user_id, inherited_role, scope, assigned_by)

    def _are_conflicting(self, role_a: str, role_b: str) -> bool:
        return (role_a, role_b) in self.sof_pairs or (role_b, role_a) in self.sof_pairs

    def _get_inherited_roles(self, role: str) -> list[str]:
        """Return all roles inherited by this role."""
        inherited = []
        for parent, children in self.role_hierarchy.items():
            if role in children:
                inherited.append(parent)
                inherited.extend(self._get_inherited_roles(parent))
        return inherited
```

### Step 3: RBAC in API Middleware
```python
# API authorization middleware
from functools import wraps
from flask import request, abort

def require_permission(permission: str):
    """Decorator to check if current user has a specific permission."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user or not user.has_permission(permission):
                abort(403, f"Missing required permission: {permission}")
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# Usage
@app.route('/api/projects/<id>/deploy')
@require_permission('deploy:production')
def deploy_project(id):
    # Only users with deploy:production permission can access
    return jsonify({"status": "deploying"})
```

## Best Practices
- Start with few broad roles, then refine — avoid role explosion
- Use role hierarchy to inherit permissions (admin inherits from maintainer, etc.)
- Implement separation of duties for compliance-critical functions
- Regular role review: are roles still relevant? are permissions still needed?
- Use role mining tools to identify permission clusters for new roles
- Automate role assignment based on job function, department, and seniority
- Document each role's purpose, permissions, scope, and intended audience
- Monitor role usage — unused roles should be investigated
- Implement emergency role elevation with approval and audit trail
- Use temporary roles for time-limited access (contractors, interns)

## Common Pitfalls
- Role explosion — hundreds of roles that become unmanageable
- Too much granularity — permissions so fine-grained they're impossible to administer
- Too little granularity — broad roles granting excessive privileges
- No role hierarchy — repeating permissions across similar roles
- Roles tied to individuals, not functions (role is "John's role" not "Billing Admin")
- No separation of duties — single role can initiate and approve financial transactions
- Stale roles — roles remaining long after the job function changed
- Orphaned role assignments — user left the company, role assignment remains
- Role inheritance without understanding — granting unintended permissions through hierarchy
- Manual role management at scale — automation is essential for > 100 users

## RBAC Maturity Model
| Level | Name | Characteristics |
|-------|------|----------------|
| 1 | Ad-hoc | No formal RBAC, permissions managed per-user, manual |
| 2 | Flat | Basic roles defined, users assigned to roles, role hierarchy absent |
| 3 | Hierarchical | Role hierarchy implemented, permissions inherited, reduced role count |
| 4 | Constrained | SoD enforced, role review process, certification campaigns |
| 5 | Optimized | Automated role mining, dynamic roles based on context, continuous certification, AI-assisted role recommendations |

## Key Points
- RBAC groups permissions into roles that reflect job functions
- NIST levels: Flat → Hierarchical → Constrained → Consolidated
- Role engineering: analyze business functions to define roles
- Use role hierarchy to reduce role count and redundancy
- Enforce SoD for compliance-critical operations
- Automate role assignment from HR/identity data
- Review roles regularly to prevent role explosion
- Implement temporary and emergency role elevation
- Monitor role usage and remove orphaned assignments
