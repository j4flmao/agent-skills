# CI/CD Caching Strategies

Effective caching reduces pipeline runtime by preserving dependencies, build artifacts, and Docker layers across runs.

## Dependency Caching

### npm

```yaml
- name: Cache npm
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-cache-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      npm-cache-${{ runner.os }}-

- name: Install dependencies
  run: npm ci
```

### pip

```yaml
- name: Cache pip
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: pip-cache-${{ runner.os }}-${{ hashFiles('requirements.txt') }}
    restore-keys: |
      pip-cache-${{ runner.os }}-

- name: Install dependencies
  run: pip install -r requirements.txt
```

### Go Modules

```yaml
- name: Cache Go modules
  uses: actions/cache@v4
  with:
    path: |
      ~/go/pkg/mod
      ~/.cache/go-build
    key: go-cache-${{ runner.os }}-${{ hashFiles('go.sum') }}

- name: Download dependencies
  run: go mod download
```

### Maven

```yaml
- name: Cache Maven
  uses: actions/cache@v4
  with:
    path: ~/.m2/repository
    key: maven-cache-${{ runner.os }}-${{ hashFiles('**/pom.xml') }}
    restore-keys: |
      maven-cache-${{ runner.os }}-

- name: Build
  run: mvn clean package -o  # offline mode
```

### Cargo

```yaml
- name: Cache Cargo
  uses: actions/cache@v4
  with:
    path: |
      ~/.cargo/registry
      ~/.cargo/git
      target
    key: cargo-cache-${{ runner.os }}-${{ hashFiles('Cargo.lock') }}
```

### Yarn PnP

```yaml
- name: Cache Yarn
  uses: actions/cache@v4
  with:
    path: |
      .yarn/cache
      .pnp.*
    key: yarn-cache-${{ runner.os }}-${{ hashFiles('yarn.lock') }}
    restore-keys: |
      yarn-cache-${{ runner.os }}-
```

## Docker Layer Caching

### BuildKit Cache Mounts

```dockerfile
# dockerfile
FROM node:22-alpine
WORKDIR /app

RUN --mount=type=cache,target=/root/.npm \
    npm set cache /root/.npm && \
    npm ci

COPY . .
RUN npm run build
```

### GitHub Actions Docker Cache

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and cache
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: ghcr.io/myorg/myapp:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Registry Cache

```yaml
- name: Build with registry cache
  uses: docker/build-push-action@v5
  with:
    context: .
    tags: ghcr.io/myorg/myapp:${{ github.sha }}
    cache-from: |
      type=registry,ref=ghcr.io/myorg/myapp:buildcache
    cache-to: |
      type=registry,ref=ghcr.io/myorg/myapp:buildcache,mode=max
```

## Monorepo Cache Strategies

### Path-based Cache Keys

```yaml
- name: Cache per package
  uses: actions/cache@v4
  with:
    path: |
      packages/**/node_modules
      .cache
    key: mono-cache-${{ runner.os }}-${{ hashFiles('yarn.lock', 'packages/*/package.json') }}
    restore-keys: |
      mono-cache-${{ runner.os }}-
```

### Turborepo

```yaml
- name: Cache Turborepo
  uses: actions/cache@v4
  with:
    path: |
      .turbo
      node_modules/.cache/turbo
    key: turbo-cache-${{ runner.os }}-${{ github.sha }}
    restore-keys: |
      turbo-cache-${{ runner.os }}-

- name: Build
  run: npx turbo run build --cache-dir=.turbo
```

### Nx

```yaml
- name: Cache Nx
  uses: actions/cache@v4
  with:
    path: .nx/cache
    key: nx-cache-${{ runner.os }}-${{ github.sha }}
    restore-keys: |
      nx-cache-${{ runner.os }}-

- name: Build affected
  run: npx nx affected:build --parallel=3
```

## Cache Invalidation

```yaml
# Semantic versioning scheme
- name: Cache with version bump
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-cache-v2-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      npm-cache-v2-${{ runner.os }}-
      npm-cache-v1-${{ runner.os }}-

# Force clear on demand
env:
  CACHE_CLEAR: ${{ secrets.CACHE_CLEAR_VERSION || '1' }}
```

## Multi-Arch Caching

```yaml
- name: Build multi-arch with cache
  uses: docker/build-push-action@v5
  with:
    platforms: linux/amd64,linux/arm64
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

## Cache Size Management

```yaml
- name: Clean and cache
  run: |
    # Remove unnecessary files before caching
    rm -rf node_modules/.cache
    npm prune --production
  # Then cache
```

| Strategy | Hit Rate | Speedup | Maintenance |
|----------|----------|---------|-------------|
| Lockfile key | High | 50-80% | Low |
| Partial restore | Medium | 30-50% | Low |
| Docker layer | High | 60-90% | Medium |
| Monorepo turborepo | High | 70-90% | Medium |
| Registry cache | High | 80-95% | High |

Choose cache keys that balance hit rate (specific) with fault tolerance (restore keys) for optimal pipeline performance.
