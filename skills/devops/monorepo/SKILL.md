---
name: monorepo
description: >
  Use this skill when the user says 'monorepo', 'Nx', 'Turborepo', 'NX', 'nx
  build', 'nx affected', 'workspace', 'dependency graph', 'build
  orchestration', 'remote caching', 'task orchestration', 'shared
  configuration', 'lerna', 'pnpm workspace', 'yarn workspace', 'npm workspace',
  'project graph', 'module boundary', 'computation caching'.
  Covers: Nx workspaces, Turborepo pipelines, dependency graph management, build
  orchestration, caching, task distribution, module boundary enforcement.
  Do NOT use this for: single-package projects, non-JS/TS monorepos without
  build tooling, or Git submodule strategies.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, monorepo, nx, turborepo, build-tools, phase-5]
---

# Monorepo

## Purpose
Configure and manage monorepo workspaces with Nx or Turborepo for efficient build orchestration and caching.

## Agent Protocol

### Trigger
Exact user phrases: "monorepo", "Nx", "Turborepo", "nx build", "nx affected", "workspace", "dependency graph", "build orchestration", "remote caching", "pnpm workspace", "yarn workspace", "project graph", "module boundary".

### Input Context
Before activating, verify:
- Package manager (pnpm, yarn, npm).
- Monorepo tool (Nx, Turborepo, or both).
- CI provider (GitHub Actions, GitLab CI, CircleCI).
- Remote caching preference (Nx Cloud, Turborepo remote, self-hosted).

### Output Artifact
Writes to `nx.json`, `turbo.json`, `project.json`, workspace config, and CI workflow files.

### Response Format
nx.json, turbo.json, project.json, or CI config with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
This skill is complete when:
- [ ] Workspace is configured (pnpm-workspace.yaml or nx.json).
- [ ] Task pipeline/dependency graph is defined.
- [ ] Caching is configured (local + remote).
- [ ] CI workflow uses affected commands for incremental builds.
- [ ] Module boundary rules are enforced (Nx).

### Max Response Length
Direct file write. No response text.

## Quick Start
Nx workspace: `npx create-nx-workspace@latest` → configure `nx.json` with cacheable operations → `nx build app` → `nx affected:test --base=main`. Turborepo: `turbo.json` with pipeline → `turbo run build --filter=app`.

## Decision Tree: Nx vs Turborepo vs Lerna
| Tool | Best For | Key Feature |
|------|----------|-------------|
| **Nx** | Large monorepos, need module boundaries, code generation | Dependency graph, affected commands, generators, enforce-module-boundaries |
| **Turborepo** | Simpler monorepos, focused on caching | Zero-config caching, remote cache, pipeline |
| **Lerna** | Legacy monorepos, npm publishing | Package publishing, canary releases, independent versioning |

## Core Workflow

### Step 1: Workspace Configuration
```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
  - "libs/*"
  - "tools/*"
```

```json
// nx.json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "defaultBase": "main",
  "nxCloudAccessToken": "…",
  "plugins": [
    {
      "plugin": "@nx/js/typescript",
      "options": {
        "buildTargetName": "build"
      }
    }
  ],
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true,
      "inputs": ["{projectRoot}/**/*", "sharedGlobals"]
    },
    "test": {
      "dependsOn": ["build"],
      "cache": true,
      "inputs": ["default", "^production"]
    },
    "lint": {
      "cache": true
    }
  }
}
```

### Step 2: Turborepo Pipeline
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "globalEnv": ["NODE_ENV", "API_URL", "CI"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true,
      "inputs": ["$TURBO_DEFAULT$", ".env.production"],
      "outputs": ["dist/**", ".next/**", "build/**"],
      "env": ["NODE_ENV", "DATABASE_URL"]
    },
    "test": {
      "dependsOn": ["build"],
      "cache": true,
      "inputs": ["$TURBO_DEFAULT$", "vitest.config.ts"],
      "outputs": []
    },
    "lint": { "cache": false },
    "typecheck": { "dependsOn": ["^build"], "cache": false },
    "dev": { "cache": false, "persistent": true }
  }
}
```

### Step 3: Project Configuration (Nx)
```json
{
  "name": "web",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/web/src",
  "projectType": "application",
  "tags": ["scope:web", "type:app"],
  "implicitDependencies": ["shared-ui"],
  "targets": {
    "build": {
      "executor": "@nx/next:build",
      "options": { "outputPath": "dist/apps/web" }
    }
  }
}
```

### Step 4: CI Pipeline with Affected Commands
```yaml
name: CI
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

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
    - name: Derive appropriate SHAs for base and head
      uses: nrwl/nx-set-shas@v4
    - run: npx nx-cloud record -- nx format:check
    - run: npx nx affected -t lint,test,build --parallel=3

# Turborepo equivalent:
# turbo run build test lint --filter=...[main]
```

### Step 5: Remote Caching Configuration
```bash
# Nx Cloud
npx nx connect-to-nx-cloud

# Turborepo remote cache (Vercel)
turbo login
turbo link

# Self-hosted remote cache (S3-compatible)
# Turborepo: TURBO_API, TURBO_TOKEN, TURBO_TEAM env vars
# Nx: NX_CLOUD_NO_TIMEOUTS, custom NX_CLOUD_API
```

### Step 6: Module Boundaries
```json
{
  "rules": {
    "@nx/enforce-module-boundaries": [
      "error",
      {
        "allow": [],
        "depConstraints": [
          { "sourceTag": "scope:web", "onlyDependOnLibsWithTags": ["scope:web", "scope:shared"] },
          { "sourceTag": "scope:api", "onlyDependOnLibsWithTags": ["scope:api", "scope:shared"] },
          { "sourceTag": "scope:shared", "onlyDependOnLibsWithTags": ["scope:shared"] },
          { "sourceTag": "type:app", "onlyDependOnLibsWithTags": ["type:feature", "type:ui", "type:util"] },
          { "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:ui", "type:util"] },
          { "sourceTag": "type:ui", "onlyDependOnLibsWithTags": ["type:util"] },
          { "sourceTag": "type:util", "onlyDependOnLibsWithTags": [] }
        ]
      }
    ]
  }
}
```

### Step 7: Nx Generators (Custom Code Generation)
```typescript
// tools/generators/feature/index.ts
import { Tree, formatFiles, generateFiles, joinPathFragments } from '@nx/devkit';

export default async function (tree: Tree, schema: { name: string; path: string }) {
  generateFiles(tree, joinPathFragments(__dirname, 'files'), schema.path, {
    name: schema.name,
    tmpl: '',
  });
  await formatFiles(tree);
}
```

### Step 8: Task Distribution (Nx Agents)
```yaml
# nx.json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx-cloud",
      "options": {
        "cacheableOperations": ["build", "test", "lint"],
        "parallel": 3,
        "agent": {
          "containers": 4
        }
      }
    }
  }
}
```

### Step 9: Dependency Graph Analysis
```bash
# Visualize full dependency graph
nx graph

# Focus on specific project
nx graph --focus=my-app

# Show affected by a change
nx graph --affected --base=main

# Export graph data
nx graph --file=graph.html

# Find circular dependencies
nx graph --focus=my-app --watch
```

### Step 10: Migrating to Monorepo
```bash
# Nx: add Nx to existing project
npx nx@latest init

# Move existing package into workspace
npx nx generate @nx/workspace:move my-package --destination packages/my-package

# Set up shared config
# tsconfig.base.json with path mappings
{
  "compilerOptions": {
    "paths": {
      "@myorg/shared": ["packages/shared/src/index.ts"]
    }
  }
}

# Extract shared code into library
npx nx g @nx/js:lib shared --directory=packages/shared
```

## Rules & Constraints
- Every project must have a type and scope tag for module boundary enforcement
- Build pipeline must define dependency order via `dependsOn` / `^build`
- Always cache build outputs (dist, .next, build/) — never cache node_modules
- Use affected commands in CI to only build/test changed projects
- Pin remote cache to branch — never cache main branch results to feature branches
- Use `inputs` to define exactly which files invalidate the cache
- Do not use `npx nx` — install Nx globally or use `pnpm exec nx`
- Every `tsconfig.json` should extend the root tsconfig.base.json

## Production Considerations
- Set `fetch-depth: 0` in CI for proper git history needed by affected commands.
- Pin Nx/Turborepo versions in package.json to avoid breaking changes.
- Use `nx.json` `inputs` to fine-tune cache invalidation per target.
- Run `nx graph --affected --base=main` before merge to validate dependency impact.
- Configure Nx Cloud or Turborepo remote cache for faster CI across branches.
- Use task distribution (Nx Agents) for large monorepos with 50+ projects.
- Regularly audit circular dependencies with `nx graph --watch`.
- Pin `tsconfig.paths` to enforce type-safe module resolution.
- Use `pnpm` over `npm` or `yarn` for faster installs and disk efficiency.

## Anti-Patterns
- Not setting `fetch-depth: 0` in CI — affected commands don't detect changes.
- Using `npm` workspaces — slower installs, no lockfile deduplication.
- No module boundary enforcement — circular dependencies proliferate.
- Building everything on every PR — slow CI, defeating monorepo purpose.
- No remote cache — every CI run rebuilds from scratch.
- `latest` tag in shared dependencies — can't reproduce builds.
- One giant `project.json` target for everything — no incremental benefit.
- Mixing package managers (pnpm + yarn) — lockfile conflicts.

## References
  - references/dependency-management.md — Dependency Management
  - references/monorepo-advanced.md — Monorepo Advanced Topics
  - references/monorepo-fundamentals.md — Monorepo Fundamentals
  - references/monorepo-tools.md — Monorepo Tools
  - references/nx-guide.md — Nx Guide
  - references/turborepo-guide.md — Turborepo Guide
## Handoff
After completing this skill:
- Next skill: **dependency-management** — Dependabot, Renovate for mono-repo deps
- Pass context: workspace structure, package manager, CI pipeline
