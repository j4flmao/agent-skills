# API Versioning Advanced

## Multi-Protocol Versioning

Version independently across protocols (REST, GraphQL, gRPC, WebSocket):

```typescript
// REST: URI-based
const REST_VERSIONS = ['v1', 'v2'];
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// GraphQL: schema versioning via tags/directives
// type User @version(v1) { ... }
// type User @version(v2) { ... }

// gRPC: package versioning
// package users.v1;
// package users.v2;

// WebSocket: version in connection URL
// ws://api.example.com/v1/ws/chat
// ws://api.example.com/v2/ws/chat
```

## Translation Layer

Bridge between versions without duplicating entire services:

```typescript
// V2 → V1 adapter (new API, old backend)
class UserV2Adapter {
  constructor(private v1Service: UserV1Service) {}

  async getUser(id: string): Promise<UserV2Response> {
    const v1User = await this.v1Service.getUser(id);

    return {
      id: v1User.id,
      fullName: `${v1User.firstName} ${v1User.lastName}`, // V2 combines fields
      email: v1User.email,
      profile: {
        avatar: v1User.avatarUrl,
        joinDate: v1User.createdAt,
      },
      status: v1User.active ? 'active' : 'inactive', // V2 uses enum
    };
  }
}

// V1 ← V2 adapter (old API, new backend) — for backward compat
class UserV1Adapter {
  constructor(private v2Service: UserV2Service) {}

  async getUser(id: string): Promise<UserV1Response> {
    const v2User = await this.v2Service.getUser(id);

    return {
      id: v2User.id,
      firstName: v2User.fullName.split(' ')[0],
      lastName: v2User.fullName.split(' ').slice(1).join(' '),
      email: v2User.email,
      avatarUrl: v2User.profile.avatar,
      active: v2User.status === 'active',
    };
  }
}
```

## Gradual Migration

### Step 1: Add new endpoints alongside old
```typescript
// Old
app.get('/api/v1/users/:id', v1GetUser);
// New
app.get('/api/v2/users/:id', v2GetUser);
```

### Step 2: Route clients gradually
```nginx
# Route 10% of traffic to v2 initially
split_clients "${remote_addr}" $api_version {
    10%   "v2";
    *     "v1";
}

location /api/ {
    proxy_pass http://backend-${api_version};
}
```

### Step 3: Shadow traffic
Run v2 alongside v1, compare results:
```typescript
async function shadowCompare(userId: string) {
  const [v1Result, v2Result] = await Promise.all([
    v1Service.getUser(userId),
    v2Service.getUser(userId).catch(() => null),
  ]);

  if (v2Result && JSON.stringify(v1Result) !== JSON.stringify(v2Result)) {
    logger.warn('V2 behavior differs from V1', {
      userId,
      v1: v1Result,
      v2: v2Result,
    });
  }

  return v1Result; // Still return V1 to client
}
```

## Multi-Version Router

```typescript
class VersionRouter {
  private versions: Map<string, Router> = new Map();

  register(version: string, router: Router): void {
    this.versions.set(version, router);
  }

  middleware(req: Request, res: Response, next: NextFunction) {
    const version = this.resolveVersion(req);

    if (!this.versions.has(version)) {
      return res.status(400).json({
        error: `Unsupported version: ${version}. Supported: ${[...this.versions.keys()].join(', ')}`
      });
    }

    req.version = version;
    this.versions.get(version)(req, res, next);
  }

  private resolveVersion(req: Request): string {
    // Check URI first
    const pathMatch = req.path.match(/^\/v?(\d+)\//);
    if (pathMatch) return `v${pathMatch[1]}`;

    // Check Accept header
    const accept = req.headers.accept || '';
    const versionMatch = accept.match(/version=(\d+)/);
    if (versionMatch) return `v${versionMatch[1]}`;

    // Default to latest
    return 'v2';
  }
}
```

## Deprecation Header (RFC 8594)

```typescript
function deprecateEndpoint(sunsetDate: Date, migrationUrl?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Deprecation', 'true');
    res.set('Sunset', sunsetDate.toUTCString());
    if (migrationUrl) {
      res.set('Link', `<${migrationUrl}>; rel="version"`);
    }

    // Log deprecation usage
    logger.warn('Deprecated endpoint called', {
      path: req.path,
      version: req.headers['accept-version'] || req.path.split('/')[2],
      userAgent: req.headers['user-agent'],
    });

    next();
  };
}
```
