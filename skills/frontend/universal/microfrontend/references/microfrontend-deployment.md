# Microfrontend Deployment Reference

## Deployment Strategies

MFEs are independently deployable, allowing each team to release on their own schedule.

```yaml
# CI/CD pipeline for a single MFE (GitHub Actions)
name: Deploy Orders MFE

on:
  push:
    branches: [main]
    paths:
      - 'packages/orders/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build -- --filter=orders
      - run: npm test -- --filter=orders
      - name: Deploy to CDN
        run: |
          aws s3 sync packages/orders/dist s3://mfe-bucket/orders/${{ github.sha }}
          aws s3 cp packages/orders/dist/remoteEntry.js s3://mfe-bucket/orders/latest/remoteEntry.js
```

## Version Management

```json
// Module Federation plugin configuration
{
  "plugins": [
    {
      "name": "orders",
      "exposes": {
        "./OrderList": "./src/OrderList",
        "./OrderDetail": "./src/OrderDetail"
      },
      "shared": {
        "react": { "singleton": true, "requiredVersion": "^18.0.0" },
        "react-dom": { "singleton": true, "requiredVersion": "^18.0.0" }
      }
    }
  ]
}
```

## Deployment Manifest

```json
{
  "version": "1.2.3",
  "mfe": "orders",
  "remoteEntry": "https://cdn.example.com/orders/latest/remoteEntry.js",
  "compatibility": {
    "shell": "^2.0.0",
    "shared-deps": {
      "react": "18.2.0",
      "react-dom": "18.2.0"
    }
  },
  "features": {
    "cart-integration": true,
    "new-checkout-flow": false
  }
}
```

## Canary Releases

```typescript
// Shell reads deployment manifest for canary routing
const mfeRegistry = {
  orders: {
    stable: 'https://cdn.example.com/orders/1.2.3/remoteEntry.js',
    canary: 'https://cdn.example.com/orders/1.3.0-canary/remoteEntry.js',
  },
};

function getMFEUrl(name, user) {
  if (user.inCanaryGroup(name)) {
    return mfeRegistry[name].canary;
  }
  return mfeRegistry[name].stable;
}
```

## Rollback Strategy

```bash
# Quick rollback via CDN path update
aws s3 cp s3://mfe-bucket/orders/1.2.2/remoteEntry.js \
  s3://mfe-bucket/orders/latest/remoteEntry.js

# Or via deployment manifest version change
curl -X PATCH https://api.example.com/manifest \
  -d '{"orders": {"version": "1.2.2"}}'
```

## Key Points

- Each MFE deploys independently via its own CI/CD pipeline
- Module Federation remoteEntry.js points to CDN-hosted bundles
- Deployment manifest maps MFE versions to remote entry URLs
- Canary releases route a percentage of users to new versions
- Rollback reverts the manifest or CDN path to previous version
- Shared dependencies must be compatible across MFEs
- Feature flags gate new functionality without deployment
- Shell handles MFE version negotiation at bootstrap
- Asset caching with content hashes enables long-term caching
- Monitoring tracks MFE load errors and performance
