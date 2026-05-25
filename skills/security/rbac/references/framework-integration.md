# RBAC Framework Integration

## NestJS + CASL

```typescript
// ability.factory.ts — Define permissions using CASL
import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import { Injectable } from '@nestjs/common';

type Actions = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export';
type Subjects = 'Document' | 'Invoice' | 'User' | 'Workspace' | 'Report' | 'all';

export type AppAbility = Ability<[Actions, Subjects]>;

@Injectable()
export class AbilityFactory {
  createForUser(user: User): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<
      Ability<[Actions, Subjects]>
    >(Ability as AbilityClass<AppAbility>);

    // Super admin: everything
    if (user.role === 'super-admin') {
      can('manage', 'all');
      return build();
    }

    // Role-based permissions
    const rolePermissions = {
      'org-admin': [
        { actions: ['create', 'read', 'update', 'delete', 'approve', 'export'], subject: 'Document' },
        { actions: ['create', 'read', 'update', 'delete'], subject: 'Workspace' },
        { actions: ['create', 'read', 'update'], subject: 'User', conditions: { orgId: user.orgId } },
        { actions: ['read', 'export'], subject: 'Report' },
      ],
      'manager': [
        { actions: ['create', 'read', 'update'], subject: 'Document', conditions: { departmentId: user.deptId } },
        { actions: ['approve'], subject: 'Document', conditions: { departmentId: user.deptId, ownerId: { $ne: user.id } } },
        { actions: ['read', 'create'], subject: 'Report' },
        { actions: ['read'], subject: 'Workspace' },
      ],
      'editor': [
        { actions: ['create', 'read', 'update'], subject: 'Document', conditions: { departmentId: user.deptId } },
        { actions: ['read'], subject: 'Workspace' },
      ],
      'viewer': [
        { actions: ['read'], subject: 'Document' },
        { actions: ['read'], subject: 'Report' },
      ],
    };

    const permissions = rolePermissions[user.role] || [];
    for (const perm of permissions) {
      can(perm.actions, perm.subject, perm.conditions);
    }

    // Global restrictions
    cannot(['delete', 'export'], 'all', { ownerId: { $ne: user.id } })
      .unless(user.role === 'super-admin' || user.role === 'org-admin');

    return build();
  }
}

// Guard using CASL
@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly abilityFactory: AbilityFactory,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.get<PolicyHandler[]>(
      'policy',
      context.getHandler(),
    );

    if (!policy) return true;

    const { user } = context.switchToHttp().getRequest();
    const ability = this.abilityFactory.createForUser(user);

    return policy.every(handler => handler(ability));
  }
}

// Usage
@Controller('documents')
export class DocumentController {
  @Post(':id/approve')
  @UseGuards(AuthGuard, PoliciesGuard)
  @SetMetadata('policy', [
    (ability: AppAbility) => ability.can('approve', 'Document'),
  ])
  async approve(@Param('id') id: string) {
    return this.service.approve(id);
  }
}
```

## Spring Boot / Spring Security

```java
// RoleHierarchy.java
@Bean
public RoleHierarchy roleHierarchy() {
    RoleHierarchyImpl hierarchy = new RoleHierarchyImpl();
    
    // super-admin inherits org-admin inherits manager inherits...
    hierarchy.setHierarchy(
        "ROLE_SUPER_ADMIN > ROLE_ORG_ADMIN\n" +
        "ROLE_ORG_ADMIN > ROLE_MANAGER\n" +
        "ROLE_MANAGER > ROLE_LEAD\n" +
        "ROLE_LEAD > ROLE_MEMBER\n" +
        "ROLE_MEMBER > ROLE_VIEWER"
    );
    return hierarchy;
}

// PermissionEvaluator.java
@Component
public class DocumentPermissionEvaluator implements PermissionEvaluator {
    @Override
    public boolean hasPermission(
        Authentication auth, Object targetDomainObject, Object permission
    ) {
        UserPrincipal user = (UserPrincipal) auth.getPrincipal();
        Document doc = (Document) targetDomainObject;
        String action = (String) permission;

        // RBAC check
        if (!user.hasPermission(action)) return false;

        // Scope check
        if (!user.getOrgId().equals(doc.getOrgId())) return false;
        if (doc.getClassification() == Classification.CONFIDENTIAL
            && user.getClearance() < 3) return false;

        return true;
    }

    @Override
    public boolean hasPermission(
        Authentication auth, Serializable targetId,
        String targetType, Object permission
    ) {
        // Load resource and delegate
        Document doc = documentRepository.findById((Long) targetId)
            .orElseThrow();
        return hasPermission(auth, doc, permission);
    }
}

// Controller usage
@RestController
public class DocumentController {
    @PreAuthorize("hasPermission(#doc, 'delete')")
    @DeleteMapping("/documents/{id}")
    public void delete(@PathVariable Document doc) {
        documentService.delete(doc);
    }
}
```

## ASP.NET Core Policy-Based Auth

```csharp
// Startup.cs — Register policies
builder.Services.AddAuthorization(options =>
{
    // Role-based policies
    options.AddPolicy("RequireAdmin", policy =>
        policy.RequireRole("admin", "super-admin"));

    options.AddPolicy("DocumentEditor", policy =>
        policy.RequireAssertion(context =>
        {
            var user = context.User;
            var role = user.FindFirst("role")?.Value;
            var dept = user.FindFirst("department")?.Value;

            return role switch
            {
                "admin" or "super-admin" => true,
                "manager" or "editor" => true,  // Assume document dept check in handler
                _ => false,
            };
        }));

    // Resource-based policy
    options.AddPolicy("DocumentApprover", policy =>
        policy.Requirements.Add(new DocumentApprovalRequirement()));
});

// Requirement + handler
public class DocumentApprovalRequirement : IAuthorizationRequirement { }

public class DocumentApprovalHandler
    : AuthorizationHandler<DocumentApprovalRequirement>
{
    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        DocumentApprovalRequirement requirement)
    {
        var user = context.User;
        var role = user.FindFirst("role")?.Value;
        var dept = user.FindFirst("department")?.Value;

        if (context.Resource is HttpContext httpContext)
        {
            var docId = httpContext.Request.RouteValues["id"]?.ToString();
            var doc = await db.Documents.FindAsync(docId);

            if (doc == null) return;

            // Must be manager+, same dept, not self-approval
            var userId = user.FindFirst("sub")?.Value;
            if (role is "manager" or "org-admin" or "super-admin"
                && doc.DepartmentId == dept
                && doc.OwnerId != userId)
            {
                context.Succeed(requirement);
            }
        }
    }
}

// Controller usage
[HttpPost("documents/{id}/approve")]
[Authorize(Policy = "DocumentApprover")]
public IActionResult Approve(string id) => Ok();
```

## Go (Gin) with Casbin

```go
// middleware.go
package middleware

import (
    "github.com/casbin/casbin/v2"
    "github.com/gin-gonic/gin"
)

func Authorize(e *casbin.Enforcer) gin.HandlerFunc {
    return func(c *gin.Context) {
        user, exists := c.Get("user")
        if !exists {
            c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
            return
        }

        u := user.(User)
        obj := c.Request.URL.Path
        act := c.Request.Method

        // Casbin RBAC check with org scope
        allowed, err := e.Enforce(u.ID, u.OrgID, obj, act)
        if err != nil || !allowed {
            c.AbortWithStatusJSON(403, gin.H{"error": "forbidden"})
            return
        }

        c.Next()
    }
}

// main.go
func main() {
    e, _ := casbin.NewEnforcer("rbac_model.conf", "rbac_policy.csv")

    r := gin.Default()
    r.Use(authMiddleware)
    r.Use(Authorize(e))

    r.POST("/documents/:id/approve", approveHandler)
    r.Run()
}
```

## FastAPI with Casbin

```python
# authz.py
import casbin
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()
enforcer = casbin.Enforcer("rbac_model.conf", "rbac_policy.csv")

async def authorize(
    action: str,
    resource: str,
    resource_id: str,
    user: User = Depends(get_current_user),
):
    # Enforce with org scope
    allowed = enforcer.enforce(
        user.id,
        user.org_id,
        f"{resource}:{resource_id}",
        action,
    )

    if not allowed:
        raise HTTPException(status_code=403, detail="Access denied")
    return True

# Usage
@app.post("/documents/{id}/approve")
async def approve_document(
    id: str,
    _ = Depends(lambda: authorize("approve", "document", id)),
):
    return {"status": "approved"}
```

## Casbin Model Configurations

### Basic RBAC
```ini
# rbac_model.conf
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && keyMatch(r.obj, p.obj) && regexMatch(r.act, p.act)
```

### RBAC with org/tenant scope
```ini
# rbac_tenant_model.conf
[request_definition]
r = sub, org, obj, act

[policy_definition]
p = sub, org, obj, act

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub, r.org) && r.org == p.org && \
    keyMatch(r.obj, p.obj) && regexMatch(r.act, p.act)
```

```csv
# rbac_tenant_policy.csv
p, admin, org-a, /*, .*
p, admin, org-b, /*, .*
p, manager, org-a, /documents/*, (GET|POST|PUT)
p, manager, org-b, /documents/*, (GET|POST|PUT)
p, viewer, org-a, /documents, GET

g, alice, admin, org-a
g, bob, manager, org-a
g, charlie, viewer, org-b
```

### RBAC with resource roles
```ini
# rbac_resource_model.conf
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _
g2 = _, _  # resource roles

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) || g2(r.sub, p.sub) && \
    regexMatch(r.obj, p.obj) && regexMatch(r.act, p.act)
```

## Framework integration checklist

- [ ] Framework auth middleware extracts user from JWT/session.
- [ ] Authorization guard/ middleware calls the policy engine.
- [ ] Role hierarchy is configured in the framework (Spring RoleHierarchy, custom CASL).
- [ ] Resource loading for ABAC happens before or within the auth check.
- [ ] Auth failures return 403 (not 401 — that's authN).
- [ ] Framework-specific caching doesn't cache authorization decisions.
- [ ] Integration tests cover the full middleware → guard → handler chain.
