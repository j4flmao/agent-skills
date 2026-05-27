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

## Key Points
- URI versioning (/v1/, /v2/) is most common and straightforward
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
