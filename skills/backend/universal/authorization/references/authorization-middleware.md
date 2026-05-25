# Authorization Middleware — Framework Integration

## Express.js

```javascript
// express-authz.js — Reusable authorization middleware
const { authorize } = require('./auth-engine');

function withAuthorization(action, resourceType, options = {}) {
  return async (req, res, next) => {
    try {
      // Extract user from auth middleware (set by passport/jwt)
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Resource-aware: extract resource ID from params
      const resourceId = req.params.id;
      let resource = { type: resourceType, id: resourceId };

      // Load resource attributes if needed (for ABAC)
      if (options.loadResource) {
        resource = await options.loadResource(resourceId, req);
      }

      // Build context
      const context = {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        method: req.method,
        path: req.path,
        time: new Date().getHours(),
        day: new Date().getDay(),
      };

      const allowed = await authorize(
        user,
        `${resourceType}.${action}`,
        resource,
        context
      );

      if (!allowed) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Attach resource for downstream use
      req.authorizedResource = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// Usage
router.get(
  '/invoices/:id',
  authenticate,
  withAuthorization('read', 'invoice', {
    loadResource: async (id) => loadInvoice(id),
  }),
  InvoiceController.getById
);

router.post(
  '/invoices/:id/approve',
  authenticate,
  withAuthorization('approve', 'invoice', {
    loadResource: async (id) => loadInvoice(id),
  }),
  InvoiceController.approve
);
```

### Resource-loading middleware (for ABAC)

```javascript
// Decoupled: load resource once, reuse for multiple checks
async function loadResourceMiddleware(req, res, next) {
  const { resourceType } = req.params;
  const loaders = {
    invoice: loadInvoice,
    document: loadDocument,
    workspace: loadWorkspace,
    user: loadUserProfile,
  };

  const loader = loaders[resourceType];
  if (!loader) return next();

  req.resourceContext = {
    type: resourceType,
    data: await loader(req.params.id),
  };
  next();
}

function requirePermission(action) {
  return async (req, res, next) => {
    const allowed = await authorize(
      req.user,
      action,
      req.resourceContext.data,
      buildContext(req)
    );
    if (!allowed) return res.status(403).json({ error: 'Access denied' });
    next();
  };
}

// Usage
router.get(
  '/:resourceType/:id',
  authenticate,
  loadResourceMiddleware,
  requirePermission('read'),
  Controller.handle
);
```

## NestJS

```typescript
// authz.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService } from './authz.service';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authzService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions) return true;

    const { user, params } = context.switchToHttp().getRequest();
    if (!user) return false;

    for (const permission of requiredPermissions) {
      const [resource, action] = permission.split('.');
      const resourceObj = await this.loadResource(resource, params);
      const allowed = await this.authzService.check(user, action, resourceObj);
      if (!allowed) return false;
    }
    return true;
  }
}

// Controller usage
@Controller('invoices')
export class InvoiceController {
  @Post(':id/approve')
  @UseGuards(AuthGuard, AuthorizationGuard)
  @Permissions('invoice.approve')
  async approve(@Param('id') id: string) {
    return this.service.approve(id);
  }
}
```

## FastAPI (Python)

```python
# authz.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import Optional
import httpx

security = HTTPBearer()

class User(BaseModel):
    id: str
    role: str
    department: Optional[str] = None

async def get_current_user(token: str = Depends(security)) -> User:
    # Decode JWT, fetch user
    ...

class AuthzChecker:
    def __init__(self, action: str, resource_type: str):
        self.action = action
        self.resource_type = resource_type

    async def __call__(
        self,
        user: User = Depends(get_current_user),
        resource_id: Optional[str] = None,
    ):
        resource = {"type": self.resource_type, "id": resource_id}
        # Call OPA or local engine
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "http://opa:8181/v1/data/authz/allow",
                json={
                    "input": {
                        "subject": user.model_dump(),
                        "resource": resource,
                        "action": self.action,
                    }
                },
            )
            result = resp.json()
            if not result.get("result", False):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied",
                )

# Usage
@app.post("/invoices/{invoice_id}/approve")
async def approve_invoice(
    invoice_id: str,
    _: None = Depends(AuthzChecker("approve", "invoice")),
):
    return {"status": "approved"}
```

## Spring Boot (Java/Kotlin)

```kotlin
// AuthorizationAspect.kt
@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
annotation class RequirePermission(
    val action: String,
    val resource: String
)

@Aspect
@Component
class AuthorizationAspect(
    private val authzClient: AuthzClient
) {
    @Around("@annotation(requirePermission)")
    fun checkPermission(
        joinPoint: ProceedingJoinPoint,
        requirePermission: RequirePermission
    ): Any? {
        val auth = SecurityContextHolder.getContext().authentication
        val user = auth.principal as UserPrincipal

        val args = joinPoint.args
        val resourceId = args.find { it is String }
            ?: throw AuthorizationException("Resource ID required")

        val decision = authzClient.check(
            user.id, user.role,
            requirePermission.resource, resourceId as String,
            requirePermission.action
        )

        if (!decision.allowed) {
            throw AccessDeniedException("Access denied")
        }

        return joinPoint.proceed()
    }
}

// Controller usage
@RestController
@RequestMapping("/invoices")
class InvoiceController {
    @PostMapping("/{id}/approve")
    @RequirePermission(action = "approve", resource = "invoice")
    fun approve(@PathVariable id: String): ResponseEntity<*> {
        return ResponseEntity.ok(service.approve(id))
    }
}
```

## ASP.NET Core (C#)

```csharp
// AuthzHandler.cs
public class AuthorizationRequirement : IAuthorizationRequirement
{
    public string Action { get; }
    public string Resource { get; }
    public AuthorizationRequirement(string action, string resource)
    {
        Action = action;
        Resource = resource;
    }
}

public class ResourceAuthorizationHandler
    : AuthorizationHandler<AuthorizationRequirement>
{
    private readonly IAuthzService _authz;

    public ResourceAuthorizationHandler(IAuthzService authz)
    {
        _authz = authz;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        AuthorizationRequirement requirement)
    {
        var user = context.User;
        var userId = user.FindFirst("sub")?.Value;
        var role = user.FindFirst("role")?.Value;

        // Extract resource ID from route
        var resourceId = (context.Resource as HttpContext)?
            .Request.RouteValues["id"]?.ToString();

        var allowed = await _authz.Check(userId, role,
            requirement.Resource, resourceId, requirement.Action);

        if (allowed) context.Succeed(requirement);
    }
}

// Controller usage
[ApiController]
[Route("invoices")]
public class InvoiceController : ControllerBase
{
    [HttpPost("{id}/approve")]
    [Authorize(Policy = "invoice.approve")]
    public IActionResult Approve(string id) => Ok();
}
```

## Go (Gin)

```go
// authz_middleware.go
package middleware

import (
    "github.com/gin-gonic/gin"
    "github.com/your/app/authz"
)

func RequirePermission(resource, action string) gin.HandlerFunc {
    return func(c *gin.Context) {
        user, exists := c.Get("user")
        if !exists {
            c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
            return
        }

        resourceID := c.Param("id")
        allowed := authz.Check(
            user.(authz.User),
            resource,
            action,
            resourceID,
        )

        if !allowed {
            c.AbortWithStatusJSON(403, gin.H{"error": "forbidden"})
            return
        }

        c.Next()
    }
}

// Usage
r := gin.Default()
r.Use(authMiddleware)

api := r.Group("/invoices")
api.POST("/:id/approve",
    RequirePermission("invoice", "approve"),
    approveHandler,
)
```

## Fast path optimization

```javascript
// Skip ABAC for read-only actions when RBAC is sufficient
const RBAC_ONLY_ACTIONS = new Set([
  'dashboard.read',
  'profile.read',
  'settings.read',
  'report.read',
  'notification.read',
]);

function createOptimizedAuthz(permission) {
  if (RBAC_ONLY_ACTIONS.has(permission)) {
    // Fast path: RBAC only
    return async (req, res, next) => {
      const userPerms = getRolePermissions(req.user.role);
      if (!hasPermission(userPerms, permission)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      next();
    };
  }

  // Slow path: full authorization with ABAC
  return async (req, res, next) => {
    const allowed = await fullAuthorize(req.user, permission, req.resource);
    if (!allowed) return res.status(403).json({ error: 'Access denied' });
    next();
  };
}
```

## Middleware pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Resource loading per check | N+1 DB calls per request | Cache resource, load once |
| User lookup per request | Repeated DB call | Enrich user in auth middleware |
| ABAC evaluation on every endpoint | 80% of endpoints don't need it | RBAC fast path for most, ABAC only for sensitive |
| Caching authorization decisions | Stale decisions if roles change | Only cache RBAC (roles change rarely), never cache ABAC |
| Async middleware without timeout | Hanging requests | Add timeout to authorization calls |
| Silent deny on missing attribute | Hard-to-debug denials | Log which attribute was missing |
