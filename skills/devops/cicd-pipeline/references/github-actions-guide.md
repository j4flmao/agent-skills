# GitHub Actions Patterns

## Standard CI Pipeline
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    needs: lint
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:testpass@localhost:5432/test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run build

  security:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm audit --audit-level=high
      - uses: github/codeql-action/analyze@v3
```

## Dependency Caching by Language

| Language | Cache Key | Path |
|----------|-----------|------|
| Node.js (npm) | `${{ runner.os }}-npm-${{ hashFiles('package-lock.json') }}` | `~/.npm` |
| Node.js (pnpm) | `${{ runner.os }}-pnpm-${{ hashFiles('pnpm-lock.yaml') }}` | `~/.local/share/pnpm/store` |
| Go | `${{ runner.os }}-go-${{ hashFiles('go.sum') }}` | `~/go/pkg/mod` |
| Rust | `${{ runner.os }}-cargo-${{ hashFiles('Cargo.lock') }}` | `~/.cargo/registry` |
| Python | `${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}` | `~/.cache/pip` |

## Docker Build & Push
```yaml
  docker:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - run: echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
      - run: docker build -t ghcr.io/${{ github.repository }}:${{ github.sha }} .
      - run: docker push ghcr.io/${{ github.repository }}:${{ github.sha }}
```

## Matrix Build
```yaml
  test:
    strategy:
      matrix:
        node-version: [20, 22]
        os: [ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

## Environment Deployment
```yaml
  deploy-staging:
    needs: [build, security]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: echo "Deploying to staging..."

  deploy-production:
    needs: [build, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: echo "Deploying to production..."
```

## Secrets Management
- Store in GitHub Secrets / Environments → Settings → Secrets and variables → Actions
- Reference as `${{ secrets.DATABASE_URL }}`
- Never hardcode secrets in YAML files
- Use environment-level secrets for per-environment values
