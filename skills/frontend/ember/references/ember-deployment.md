# Ember.js Deployment

## Build Pipeline

```bash
# Development
ember serve                    # http://localhost:4200

# Production build
ember build --environment=production
# Output: dist/  (ready for deployment)
```

### Build Configuration

```js
// ember-cli-build.js
'use strict'
const EmberApp = require('ember-cli/lib/broccoli/ember-app')

module.exports = function (defaults) {
  const app = new EmberApp(defaults, {
    // Fingerprinting
    fingerprint: {
      enabled: true,
      prepend: '/assets/',
      extensions: ['js', 'css', 'png', 'jpg', 'gif', 'map', 'svg'],
      replaceExtensions: ['html', 'css', 'js'],
    },

    // Source maps
    sourcemaps: { enabled: false },

    // Minification
    'ember-cli-uglify': { enabled: true },

    // Auto-import
    autoImport: { publicAssetURL: '/assets/' },
  })

  return app.toTree()
}
```

## Deployment Targets

### Static Hosting (Netlify, Vercel, S3)

```toml
# netlify.toml
[build]
  command = "ember build --environment=production"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

```nginx
# nginx.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
```

## Performance Budget

| Asset | Target |
|-------|--------|
| Initial JS | <200kB |
| Initial CSS | <50kB |
| Time to interactive | <3s |
| Lighthouse score | >85 |

## Environment Configuration

```js
// config/environment.js
module.exports = function (environment) {
  const ENV = {
    modulePrefix: 'my-app',
    environment,
    rootURL: '/',
    locationType: 'history',
    EmberENV: {
      FEATURES: {},
      EXTEND_PROTOTYPES: { Date: false },
    },
    APP: {
      apiHost: environment === 'production' ? 'https://api.example.com'
            : environment === 'staging' ? 'https://staging-api.example.com'
            : 'http://localhost:3000',
    },
  }

  if (environment === 'production') {
    ENV.locationType = 'history'
  }

  return ENV
}
```

## Addon Management for Production

```bash
# List addons
ember addon:list

# Remove unused addons
npm uninstall @ember/optional-features ember-cli-deprecation-workflow

# Audit dependencies
ember audit
```

## CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: ember build --environment=production
```

## Deployment Checklist

- [ ] Ember CLI version pinned in package.json
- [ ] `rootURL` matches deployment path
- [ ] API host configured per environment
- [ ] Fingerprinting enabled for cache busting
- [ ] SPA fallback redirect (/* -> /index.html)
- [ ] CSP headers configured
- [ ] Source maps disabled in production
- [ ] Tests pass before build
- [ ] Lighthouse audit passes
