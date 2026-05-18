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

## When to Use This Skill
- Setting up a new monorepo for a multi-package project
- Migrating from separate repos to a single monorepo
- Optimizing CI build times with caching and affected commands
- Enforcing module boundaries and dependency rules

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
// turbo.json
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
    "lint": {
      "cache": false
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Step 3: Project Configuration (Nx)
```json
// apps/web/project.json
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
      "options": {
        "outputPath": "dist/apps/web"
      }
    },
    "serve": {
      "executor": "@nx/next:server",
      "options": {
        "buildTarget": "web:build",
        "port": 4200
      }
    }
  }
}
```

### Step 4: Dependency Graph and Affected Commands
```bash
# Graph visualization
nx graph
nx graph --focus web
nx graph --affected --base=main

# Affected commands (CI)
nx affected:test --base=main --parallel=3
nx affected:build --base=main --parallel=3
nx affected:lint --base=main --parallel=3

# Turborepo filter equivalents
turbo run build --filter=...[main]
turbo run test --filter=...[main]
turbo run lint --filter=...[main]
```

### Step 5: Module Boundaries (Nx)
```json
// .eslintrc.json (or .eslintrc.base.json)
{
  "rules": {
    "@nx/enforce-module-boundaries": [
      "error",
      {
        "allow": [],
        "depConstraints": [
          {
            "sourceTag": "scope:web",
            "onlyDependOnLibsWithTags": ["scope:web", "scope:shared"]
          },
          {
            "sourceTag": "scope:api",
            "onlyDependOnLibsWithTags": ["scope:api", "scope:shared"]
          },
          {
            "sourceTag": "scope:shared",
            "onlyDependOnLibsWithTags": ["scope:shared"]
          },
          {
            "sourceTag": "type:app",
            "onlyDependOnLibsWithTags": ["type:feature", "type:ui", "type:util"]
          },
          {
            "sourceTag": "type:feature",
            "onlyDependOnLibsWithTags": ["type:ui", "type:util"]
          },
          {
            "sourceTag": "type:ui",
            "onlyDependOnLibsWithTags": ["type:util"]
          },
          {
            "sourceTag": "type:util",
            "onlyDependOnLibsWithTags": []
          }
        ]
      }
    ]
  }
}
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

## Output Format
`nx.json`, `turbo.json`, `project.json` files, ESLint module boundary config, and CI workflow.

## References
- `references/monorepo-tools.md` — workspace managers, tool comparison, best practices
- `references/nx-guide.md` — Nx workspace setup, generators, executors, plugins
- `references/turborepo-guide.md` — Turborepo pipeline, filtering, remote caching
- `references/dependency-management.md` — workspace dependencies, versioning, publishing

## Handoff
After completing this skill:
- Next skill: **dependency-management** — Dependabot, Renovate for mono-repo deps
- Pass context: workspace structure, package manager, CI pipeline
