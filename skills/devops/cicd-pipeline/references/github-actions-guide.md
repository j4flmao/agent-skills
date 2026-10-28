# GitHub Actions Patterns

Reusable workflow shapes for CI on GitHub Actions: lint/test/build, security scanning, container publishing, matrices and gated deployments. Pin third-party actions to a full commit SHA in production repositories; major-version tags are shown here for readability.

## Standard CI Pipeline
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint

  test:
    needs: lint
    runs-on: ubuntu-latest
    timeout-minutes: 20
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: test
        ports:
          - 5432:5432
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
          cache: npm
      - run: npm ci
      - run: npm test
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
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 7
```

Notes:
- A service container is reachable on `localhost` only when the job runs directly on the runner and the port is mapped (`ports:`). In a container job, use the service name as host.
- `cancel-in-progress` on `github.ref` cancels superseded runs on the same branch/PR; avoid it on deploy workflows to `main`.

## Security Scanning (CodeQL + dependency audit)
CodeQL needs `init` before `analyze`, plus `security-events: write`.

```yaml
  codeql:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/analyze@v3

  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm audit --audit-level=high
```

For compiled languages add `github/codeql-action/autobuild@v3` (or your build commands) between `init` and `analyze`. On pull requests, `actions/dependency-review-action@v4` blocks newly introduced vulnerable dependencies.

## Dependency Caching by Language

Prefer the built-in cache of the setup action; use `actions/cache@v4` only when no setup action covers the tool.

| Language | Built-in option | Manual cache key / path |
|----------|-----------------|-------------------------|
| Node (npm) | `setup-node` `cache: npm` | `hashFiles('package-lock.json')` / `~/.npm` |
| Node (pnpm) | `pnpm/action-setup` then `setup-node` `cache: pnpm` | `hashFiles('pnpm-lock.yaml')` / output of `pnpm store path` |
| Go | `setup-go` caches by default (`go.sum`) | `~/go/pkg/mod`, `~/.cache/go-build` |
| Rust | `Swatinem/rust-cache@v2` | `~/.cargo/registry`, `~/.cargo/git`, `target/` |
| Python (pip) | `setup-python` `cache: pip` | `hashFiles('**/requirements*.txt')` / `~/.cache/pip` |
| Python (uv) | `astral-sh/setup-uv` `enable-cache: true` | `hashFiles('uv.lock')` |

## Docker Build & Push (GHCR)
```yaml
  docker:
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write        # for keyless signing / provenance
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha
            type=ref,event=branch
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          provenance: true
```

`docker/login-action` keeps the token out of shell history and process arguments; avoid `echo $TOKEN | docker login` in `run:` steps.

## Matrix Build
```yaml
  test-matrix:
    strategy:
      fail-fast: false
      matrix:
        node-version: [20, 22, 24]
        os: [ubuntu-latest, windows-latest]
        exclude:
          - os: windows-latest
            node-version: 20
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm test
```

`fail-fast: false` keeps other legs running so you see every failing combination.

## Passing Data Between Steps and Jobs
The old `set-output` workflow command was removed; write to the `$GITHUB_OUTPUT` file.

```yaml
jobs:
  version:
    runs-on: ubuntu-latest
    outputs:
      tag: ${{ steps.v.outputs.tag }}
    steps:
      - id: v
        run: echo "tag=v$(date +%Y%m%d)-${GITHUB_SHA::7}" >> "$GITHUB_OUTPUT"

  use:
    needs: version
    runs-on: ubuntu-latest
    steps:
      - run: echo "Releasing ${{ needs.version.outputs.tag }}"
```

## Environment Deployment
```yaml
  deploy-staging:
    needs: [build, codeql]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
      - run: ./scripts/deploy.sh staging

  deploy-production:
    needs: [build, codeql]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://app.example.com
    concurrency:
      group: deploy-production
      cancel-in-progress: false
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
      - run: ./scripts/deploy.sh production
```

Configure required reviewers, wait timers and branch restrictions on the `production` environment (Settings → Environments). Deploy the artifact that was tested instead of rebuilding.

## Secrets and Cloud Credentials
- Store values in repository, environment or organization secrets; reference as `${{ secrets.NAME }}`.
- Prefer OIDC federation (`permissions: id-token: write` + `aws-actions/configure-aws-credentials`, `google-github-actions/auth`, `azure/login`) over long-lived cloud keys.
- Use environment-level secrets for per-environment values so only jobs targeting that environment can read them.
- Never pass untrusted input (`github.event.pull_request.title`, branch names) directly into `run:`; assign it to an `env:` variable and quote it.
- `pull_request_target` runs with secrets in the base repo context; never check out and execute PR code in it.

## Checklist
- [ ] Top-level `permissions: contents: read`; jobs elevate only what they need
- [ ] `timeout-minutes` on long jobs
- [ ] CodeQL has `init` and `analyze`
- [ ] Outputs via `$GITHUB_OUTPUT`, no legacy `set-output` command
- [ ] Container login via `docker/login-action`; images tagged by SHA
- [ ] Production environment protected with reviewers; OIDC instead of static keys
