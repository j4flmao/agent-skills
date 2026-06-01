# REST API Versioning Strategies

## Overview
API versioning manages changes to public interfaces without breaking existing clients. Strategies include URI versioning, header versioning, query parameter versioning, and content negotiation.

## URI Versioning

### Path-Based Versioning
```typescript
// v1 API routes
import { Router } from 'express';

const v1Router = Router();

v1Router.get('/v1/users', getUsersV1);
v1Router.get('/v1/users/:id', getUserV1);
v1Router.post('/v1/users', createUserV1);

// v2 API routes
const v2Router = Router();

v2Router.get('/v2/users', getUsersV2);
v2Router.get('/v2/users/:id', getUserV2);
v2Router.post('/v2/users', createUserV2);

// Mount both versions
app.use('/api', v1Router);
app.use('/api', v2Router);
```

### Versioned Module Structure
```typescript
// Modular version support
// src/api/v1/users.ts
export const getUsers = async (req: Request, res: Response) => {
  const users = await User.findAll();
  res.json({ users, version: '1.0' });
};

// src/api/v2/users.ts
export const getUsers = async (req: Request, res: Response) => {
  const users = await User.findAll();
  res.json({
    data: users,
    meta: {
      count: users.length,
      version: '2.0',
      page: req.query.page || 1,
    },
  });
};

// Versioned imports
import { getUsers as getUsersV1 } from './api/v1/users';
import { getUsers as getUsersV2 } from './api/v2/users';
```

## Header Versioning

### Accept Header Versioning
```typescript
// Content negotiation versioning
app.get('/api/users', (req, res) => {
  const acceptHeader = req.headers['accept'] || '';
  const match = acceptHeader.match(/application\/vnd\.myapp\.v(\d+)\+json/);
  const version = match ? parseInt(match[1]) : 1;

  switch (version) {
    case 1:
      return getUsersV1(req, res);
    case 2:
      return getUsersV2(req, res);
    default:
      return getUsersLatest(req, res);
  }
});

// Client request example
// GET /api/users
// Accept: application/vnd.myapp.v2+json
```

### Custom Header Versioning
```typescript
// X-API-Version header
app.use('/api', (req, res, next) => {
  const version = req.headers['x-api-version'] || '1';
  req.apiVersion = parseInt(version as string);

  // Validate version
  if (req.apiVersion < 1 || req.apiVersion > 2) {
    return res.status(400).json({
      error: 'Invalid API version. Supported versions: 1, 2',
    });
  }

  next();
});

app.get('/api/users', (req, res) => {
  const version = (req as any).apiVersion;

  switch (version) {
    case 1:
      return getUsersV1(req, res);
    case 2:
      return getUsersV2(req, res);
  }
});
```

## Query Parameter Versioning

### URL Query Versioning
```typescript
// Query parameter versioning
app.get('/api/users', (req, res) => {
  const version = parseInt(req.query.v as string) || 1;

  switch (version) {
    case 1:
      return getUsersV1(req, res);
    case 2:
      return getUsersV2(req, res);
    default:
      return res.status(400).json({
        error: `Unsupported API version: ${version}`,
        supportedVersions: ['1', '2'],
      });
  }
});

// GET /api/users?v=2
```

## Version Lifecycle

### Deprecation Headers
```typescript
// Deprecation middleware
function versioningMiddleware(req: Request, res: Response, next: NextFunction) {
  const version = getVersion(req);

  // Deprecation warnings for old versions
  if (version === 1) {
    res.setHeader('Deprecation', new Date('2025-06-01').toUTCString());
    res.setHeader('Sunset', new Date('2025-12-01').toUTCString());
    res.setHeader('Link', '</api/docs/migration-v1-to-v2>; rel="deprecation"');
  }

  // Set current version header
  res.setHeader('X-API-Version', version.toString());
  res.setHeader('X-API-Latest-Version', '2');

  next();
}

// Usage
app.use('/api', versioningMiddleware);
```

### Version Discovery
```typescript
// API root with version info
app.get('/api', (req, res) => {
  res.json({
    versions: [
      {
        version: '1',
        status: 'deprecated',
        sunset: '2025-12-01',
        documentation: '/docs/v1',
      },
      {
        version: '2',
        status: 'active',
        documentation: '/docs/v2',
      },
    ],
    latest: '2',
    migrationGuide: '/docs/migration-v1-to-v2',
  });
});
```

## Version Strategy Comparison

### Strategy Pros and Cons
```typescript
// URI versioning
// Pros: Clear, cacheable, easy to route
// Cons: URL pollution, multiple code paths

// Header versioning
// Pros: Clean URLs, RESTful
// Cons: Harder to test, not cache-friendly, harder discovery

// Query parameter versioning
// Pros: Simple, easy to test
// Cons: URL pollution, caching issues

// Content negotiation
// Pros: Most RESTful, clean URLs
// Cons: Complex client setup, harder debugging
```

## Backward Compatibility

### Compatible Changes
```typescript
// Adding new fields (backward compatible)
interface UserV1 {
  id: number;
  name: string;
  email: string;
}

interface UserV2 extends UserV1 {
  phone?: string;  // Optional new field
  profileImage?: string;  // Optional new field
}

// Never remove or rename existing fields
// Never change field types
// Never make optional fields required

// Example of backward-compatible extension
app.get('/v2/users/:id', (req, res) => {
  const user = getUser(req.params.id);
  res.json({
    ...user,  // All v1 fields preserved
    phone: user.phone || undefined,  // New optional field
    profileImage: user.profileImage || undefined,  // New optional field
  });
});
```

## Decision Trees

### Choose Versioning Strategy
```
Is this a public API consumed by external developers?
├── Yes → Is URL cleanliness important?
│   ├── Yes → URL path versioning (e.g., /api/v1/users)
│   └── No → Header versioning (e.g., Accept: application/vnd.api+json;version=1)
├── No → Is this an internal/microservice API?
│   ├── Yes → Is it consumed by few services?
│   │   ├── Yes → Contract-based versioning (tolerant reader / Postel's law)
│   │   └── No → Header or query parameter versioning
│   └── No → Is it a mobile-facing API?
│       ├── Yes → URL path versioning (mobile apps update slowly)
│       └── No → Feature flags with backward compatibility
```

### When to Bump Version
```
Is the change backward-compatible?
├── Yes → Is it adding a new field/resource?
│   ├── Yes → No version bump (additive change)
│   └── No → Is it a bug fix that matches documented behavior?
│       ├── Yes → No version bump (patch)
│       └── No → Is it a performance improvement?
│           ├── Yes → No version bump (internal change)
│           └── No → Minor version bump
└── No → Is it removing a field/endpoint?
    ├── Yes → Deprecate first, then major version bump
    └── No → Is it changing a field type/semantics?
        ├── Yes → Major version bump required
        └── No → Is it changing authentication/error behavior?
            ├── Yes → Major version bump required
            └── No → Minor version bump
```

## Anti-Patterns
- **Versioning via request body**: Cannot route or cache based on body
- **No deprecation period**: Breaking changes without warning break clients
- **Indefinite old version support**: Infinite maintenance burden
- **Version in hostname**: CORS, DNS, and certificate overhead
- **SemVer in URLs**: Use v1, v2, not v1.2.3 (too many versions)
- **Default to latest without opt-in**: Clients should explicitly request version
- **No sunset header**: Clients cannot plan migration
- **Multiple versioning strategies mixed**: Confuses clients and tooling
- **No version in error responses**: Debugging without version context is hard
- **No version health metrics**: Cannot make data-driven deprecation decisions

## Implementation Patterns

### Express Version Router
```javascript
const express = require('express');
const app = express();

// Version middleware
function apiVersion(version) {
  return (req, res, next) => {
    req.apiVersion = version;
    next();
  };
}

// Route version via URL
app.use('/api/v1', apiVersion('v1'), require('./v1/routes'));
app.use('/api/v2', apiVersion('v2'), require('./v2/routes'));

// Route version via header
app.use('/api', (req, res, next) => {
  const version = req.headers['accept-version'] || 'v1';
  req.apiVersion = version;
  next();
});

// Deprecation middleware
function deprecationCheck(version, sunsetDate) {
  return (req, res, next) => {
    res.set('Sunset', sunsetDate);
    res.set('Deprecation', `version=${version};`);
    next();
  };
}

app.use('/api/v1', deprecationCheck('v1', 'Sat, 31 Dec 2026 23:59:59 GMT'), v1Routes);
```

### Platform/OS Version-Based Routing
```javascript
function platformVersionMiddleware(req, res, next) {
  const userAgent = req.headers['user-agent'] || '';
  let platform = 'web';
  let appVersion = '0.0.0';

  if (userAgent.includes('MyApp-iOS')) {
    platform = 'ios';
    appVersion = userAgent.match(/MyApp-iOS\/(\d+\.\d+\.\d+)/)?.[1] || '1.0.0';
  } else if (userAgent.includes('MyApp-Android')) {
    platform = 'android';
    appVersion = userAgent.match(/MyApp-Android\/(\d+\.\d+\.\d+)/)?.[1] || '1.0.0';
  }

  req.platform = platform;
  req.appVersion = appVersion;
  req.apiVersion = resolveApiVersion(platform, appVersion);
  next();
}

function resolveApiVersion(platform, appVersion) {
  const versionMap = {
    ios: { '1.0.0': 'v1', '1.1.0': 'v1', '2.0.0': 'v2' },
    android: { '1.0.0': 'v1', '1.5.0': 'v1', '2.0.0': 'v2' },
    web: { default: 'v2' },
  };
  return versionMap[platform]?.[appVersion] || versionMap[platform]?.default || 'v1';
}
```

### Parallel Version Deployment
```javascript
// API Gateway routes to version-specific services
// In docker-compose or Kubernetes:

// v1-service: runs old code
// v2-service: runs new code
// gateway: routes /api/v1/* -> v1-service, /api/v2/* -> v2-service

// NGINX config block:
// location /api/v1/ {
//     proxy_pass http://v1-service:3000/;
// }
// location /api/v2/ {
//     proxy_pass http://v2-service:3000/;
// }
```

## Key Points
- Header versioning keeps URLs clean but harder to discover
- Query parameter versioning is simple but clutters URLs
- Deprecation headers communicate version lifecycle
- Sunset dates give clients migration timeline
- Version discovery endpoint lists available versions
- Semantic versioning for internal API changes
- Never break existing clients with backward-incompatible changes
- Additive changes (new fields, new endpoints) don't require version bump
- Breaking changes (remove fields, change types) require new version
- Multiple versions run concurrently during migration
- Deprecated versions eventually reach sunset and are removed
- Version migration guides help clients transition
- API changelog documents version differences
- Version in response body helps debugging
- Request logging includes API version
- Client-requested version validates against supported range
- Default version serves the latest stable version
- Long-term support (LTS) versions have extended support windows
- Pre-release versions (alpha, beta) for early access
- Feature flags complement versioning for gradual rollouts
- Internal microservices use different versioning than public APIs
- Version negotiation with content type (vendor MIME)
- API gateway handles version routing for microservices
- Testing matrix includes all supported versions
- Contract testing validates version compatibility
- OpenAPI/Swagger documents version-specific schemas
- Version sunset policies communicated well in advance
- Analytics track version usage to plan deprecation
- Rate limiting may differ by version for stability
