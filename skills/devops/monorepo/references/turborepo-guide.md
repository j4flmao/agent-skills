# Turborepo Guide

## Installation

```bash
# Create new
npx create-turbo@latest

# Add to existing project (must use pnpm)
npx turbo@latest init

# Install CLI
pnpm add -D turbo
```

## turbo.json Reference

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    "**/.env.*local",
    "tsconfig.base.json"
  ],
  "globalEnv": [
    "NODE_ENV",
    "CI",
    "VERCEL_ENV",
    "NEXT_PUBLIC_*"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true,
      "inputs": [
        "$TURBO_DEFAULT$",
        "src/**/*.ts",
        "src/**/*.tsx",
        "public/**/*"
      ],
      "outputs": [".next/**", "dist/**", "build/**"],
      "outputMode": "new-only",
      "env": ["NODE_ENV", "API_URL", "NEXT_PUBLIC_API_URL"],
      "persistent": false
    },
    "test": {
      "dependsOn": ["build"],
      "cache": true,
      "inputs": ["$TURBO_DEFAULT$", "vitest.config.ts"],
      "outputMode": "new-only"
    },
    "lint": {
      "cache": false,
      "outputMode": "new-only"
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "cache": false,
      "dependsOn": ["^build"]
    }
  }
}
```

## Running Tasks

```bash
# Run build for all projects
pnpm turbo run build

# Filter to specific projects
turbo run build --filter=web
turbo run build --filter=./apps/*
turbo run build --filter=@org/shared-ui

# Filter by dependency
turbo run build --filter=web...      # web + its dependencies
turbo run build --filter=...web      # web + its dependents
turbo run build --filter=web...^web  # web deps only, not web itself

# Affected by changes
turbo run build --filter=...[main]
turbo run test --filter=...[HEAD~1]

# Parallel execution
turbo run build --parallel
turbo run build --concurrency=10

# Continue on error
turbo run test --continue
```

## Remote Caching

```bash
# Enable remote caching (Vercel)
npx turbo login
npx turbo link

# Custom remote cache server
turbo run build --remote-cache-url=https://cache.example.com \
  --remote-cache-token=token

# Self-hosted remote cache (docker-compose.yml)
version: "3"
services:
  turbo-cache:
    image: ghcr.io/ducktors/turborepo-remote-cache:latest
    environment:
      PORT: 3000
      STORAGE_PROVIDER: s3
      AWS_ACCESS_KEY_ID: ...
      AWS_SECRET_ACCESS_KEY: ...
      S3_REGION: us-east-1
      S3_BUCKET: turbo-cache
    ports:
      - "3000:3000"
```

## Package Manager Configuration

```json
// Root package.json
{
  "private": true,
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "dev": "turbo run dev --parallel",
    "format": "prettier --write \"**/*.{ts,tsx,js,json}\""
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.5.0"
  }
}
```

## CI Configuration

```yaml
# GitHub Actions
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm turbo run build test --filter=...[main]
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

## Key Differences from Nx

| Aspect | Turborepo | Nx |
|--------|-----------|-----|
| Setup | Minimal config | More config, more features |
| Remote caching | Vercel or custom | Nx Cloud or custom |
| Generators | None | Built-in |
| Module boundaries | None | Built-in ESLint rule |
| Graph visualization | Limited | Full interactive graph |
| Language support | JS/TS | Multi-language |
| Migration | Easy to start | More investment, more capability |

## Best Practices

- Use `--filter=...[main]` in CI for incremental builds
- Set `outputMode: "new-only"` to reduce noise
- Define `globalDependencies` for shared config files
- List all `env` variables a task reads in `turbo.json`
- Pin `packageManager` in root `package.json`
- Use `persistent: true` for dev servers
- Configure both local and remote caching
- Keep `turbo.json` in sync with CI workflow assumptions
