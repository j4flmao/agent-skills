# Nx Guide

## Installation

```bash
# Create new workspace
npx create-nx-workspace@latest my-org \
  --preset=empty \
  --packageManager=pnpm \
  --nxCloud=false

# Add to existing project
npx nx@latest init

# Generate app/lib
nx g @nx/next:app web --directory=apps/web
nx g @nx/react:lib shared-ui --directory=libs/shared-ui
nx g @nx/nest:app api --directory=apps/api
nx g @nx/js:lib util --directory=libs/util
```

## nx.json Configuration

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "defaultBase": "main",
  "nxCloudAccessToken": "…",
  "useDaemonProcess": true,
  "parallel": 5,
  "cacheDirectory": "tmp/cache",
  "plugins": [
    {
      "plugin": "@nx/js/typescript",
      "options": {
        "buildTargetName": "build",
        "typecheckTargetName": "typecheck"
      }
    }
  ],
  "targetDefaults": {
    "build": {
      "cache": true,
      "dependsOn": ["^build"],
      "inputs": [
        "{projectRoot}/**/*",
        "{projectRoot}/tsconfig*.json",
        "!{projectRoot}/**/*.md"
      ],
      "outputs": ["{projectRoot}/dist", "{projectRoot}/build"]
    },
    "test": {
      "cache": true,
      "inputs": [
        "default",
        "^production",
        "{workspaceRoot}/vitest.workspace.ts"
      ]
    },
    "lint": {
      "cache": true,
      "inputs": [
        "default",
        "{workspaceRoot}/.eslintrc.base.json",
        "{workspaceRoot}/eslint.config.js"
      ]
    }
  },
  "release": {
    "version": {
      "conventionalCommits": true
    }
  }
}
```

## Generators

```bash
# List generators
nx list @nx/next
nx list @nx/react

# Dry-run
nx g @nx/react:component button --dry-run

# Skip interactive prompts
nx g @nx/react:component button \
  --project=shared-ui \
  --export \
  --directory=libs/shared-ui/src/atoms
```

## Executors (Targets)

```json
{
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "options": {
        "main": "src/index.ts",
        "outputPath": "dist",
        "tsConfig": "tsconfig.lib.json",
        "assets": ["src/**/*.json"]
      },
      "configurations": {
        "production": {
          "optimization": true,
          "sourceMap": false
        }
      }
    },
    "serve": {
      "executor": "@nx/js:node",
      "options": {
        "buildTarget": "build",
        "watch": true
      }
    }
  }
}
```

## Affected Commands

```bash
# Only run for projects affected by changes since base
nx affected:test --base=main
nx affected:build --base=main --parallel=3
nx affected:lint --base=main --exclude=docs

# Using HEAD~1 for branch comparison
nx affected:build --base=HEAD~1

# Using specific SHA
nx affected:test --base=abc123def --head=def456abc

# Output formatting
nx affected:build --base=main --graph
nx affected:test --base=main --verbose
```

## Environment Variables

```bash
# Target-specific environment variables in nx.json
{
  "targetDefaults": {
    "build": {
      "options": {
        "env": {
          "CI": "true",
          "NODE_ENV": "production"
        }
      }
    }
  }
}

# Per-project .env files
apps/web/.env
apps/web/.env.production
apps/web/.env.local  # gitignored
```

## CI Setup

```yaml
# .github/workflows/ci.yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: npx nx-cloud start-ci-run
        env:
          NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}

      - run: npx nx affected:test --base=main --parallel=3
      - run: npx nx affected:build --base=main --parallel=3
      - run: npx nx affected:lint --base=main --parallel=3

      - run: npx nx-cloud stop-all-agents
        if: always()
```

## Nx Console (IDE)

```bash
# VS Code: Install "Nx Console" extension
# Features:
# - Generate projects/components
# - Run targets with UI
# - Visualize dep graph
# - Debug affected commands
```

## Useful Commands

```bash
nx show projects                             # List all projects
nx show project web                          # Show project details
nx graph                                     # Open dep graph
nx graph --focus=shared-ui                   # Focus on one project
nx graph --affected --base=main              # Only affected projects
nx sync                                      # Sync workspace config
nx daemon                                    # Start daemon
nx reset                                     # Clear cache
nx migrate latest                            # Migrate to latest Nx
nx report                                    # Debug workspace info
```
