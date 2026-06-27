---
name: project-init
description: >
  Use this skill when the user says 'create project structure', 'scaffold project', 'initialize project', 'set up folder structure', 'new project from scratch', or when a new project needs folders and config files created. This skill scaffolds the full project tree based on detected or stated stack and creates AGENTS.md with project-specific rules. Do NOT use for: adding files to an existing project, planning features, or installing dependencies.
version: "1.1.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [orchestration, phase-0, scaffolding]
---

# Project Init

## Purpose
Scaffold a complete, production-ready project folder structure with AGENTS.md, .gitignore, and docs/ skeleton. Does not write any implementation code.

The first 5 minutes of a project determine its structural quality for years. A well-organized scaffold enforces separation of concerns, establishes naming conventions, and provides a clear home for every file type. Poor scaffolding leads to entropy-driven reorganization, tech-debt accumulation, and discovery friction for new contributors. This skill produces a deliberate, intentional structure that communicates architectural decisions before a single line of business logic is written.

## Agent Protocol

### Trigger
Exact user phrases: "create project structure", "scaffold project", "initialize project", "set up folder structure", "new project from scratch", "create new project", "start new project".

### Input Context
- User has specified or you have detected: backend stack, frontend framework, monorepo preference, project name
- Working directory is the parent of the intended project
- If user says "scaffold" without specifying stack, ask: "Which backend stack? (nestjs, golang, rust, fastapi, django, spring, none)"

### Output Artifact
- Creates directories and placeholder files matching selected stack template
- Writes AGENTS.md at project root with stack-specific rules
- Writes .gitignore at project root with stack-appropriate patterns
- Writes docs/ skeleton with decisions/, stories/, specs/ subdirectories

### Response Format
After scaffolding, output exactly:
```
Scaffolded {project-name} at {path}.
Folders created: {n}
Config files: .gitignore, AGENTS.md, docs/
```
Then output the folder tree as a code block. No commentary. No congratulations. No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Folder tree matches selected stack template
- [ ] AGENTS.md contains project-specific rules (stack, test/lint/build commands, architectural rules)
- [ ] .gitignore is stack-appropriate
- [ ] docs/ has decisions/, stories/, specs/ subdirectories with .gitkeep
- [ ] User confirmed folder tree before creation
- [ ] No implementation code written

### Max Response Length
After creation: folder tree block (unlimited lines) + 2-line summary. No more.

## Decision Trees

### Stack Detection Flow
```
User says "scaffold project":
├── Stack specified?
│   ├── YES → Use specified stack
│   └── NO → Ask ONE question at a time:
│       ├── Q1: "Backend stack? (nestjs, golang, rust, fastapi, django, spring, none)"
│       ├── Q2: "Frontend framework? (react, nextjs, vue, nuxt, angular, none)"
│       └── Q3: "Project name? (default: my-app)"
├── Directory exists?
│   ├── NO → Create directory, scaffold
│   └── YES → Ask: "Directory {name} already exists. Overwrite specific files? (yes/no/list)"
└── Generate tree → Show user → Wait for confirmation → Create
```

### Template Selection
```
Backend + Frontend combo:
├── Both specified → Monorepo structure with /packages or /apps
├── Backend only → Single backend structure
├── Frontend only → Single frontend structure
└── None → Generic project (flat, minimal)

Monorepo preference:
├── User specified monorepo → /packages/app (frontend), /packages/api (backend), /packages/shared
├── User specified polyrepo → Separate directories, separate scaffolds
└── Not specified → Ask: "Monorepo or separate repos?"
```

## Workflow

### Step 1: Gather Requirements (One Question at a Time)
First: "Backend stack? (nestjs, golang, rust, fastapi, django, spring, none)"
Second: "Frontend framework? (react, nextjs, vue, nuxt, angular, none)"  
Third: "Project name? (default: my-app)"
Do NOT list all questions at once. Ask sequentially.

### Step 2: Generate Folder Tree as Markdown
Show tree to user. Wait for explicit confirmation ("yes", "looks good", "proceed"). Do NOT create anything before confirmation.

### Step 3: Create Directories
Run commands to create folder structure matching selected template.

### Step 4: Write AGENTS.md
Must contain: stack and framework, testing command (inferred from stack), lint command (inferred from stack), build command (inferred from stack), key architectural rules from relevant skill, standard workflow ("run tests before commit", "follow conventional commits"). AGENTS.md must be under 30 lines.

### Step 5: Write .gitignore
Stack-appropriate. Include at minimum: node_modules/, target/, build/, dist/, .env, *.log, .DS_Store, coverage/, .idea/, *.iml, .vscode/. Under 20 lines.

### Step 6: Write docs/ Skeleton
Empty placeholder files with .gitkeep:
- docs/decisions/.gitkeep
- docs/stories/.gitkeep
- docs/specs/.gitkeep

## Stack Templates

### Backend Templates

**NestJS**: `src/modules/ src/shared/ src/config/ test/`

**Go**: `cmd/server/ internal/domain/ internal/application/ internal/infrastructure/ internal/config/ api/ migrations/`

**Rust**: `crates/domain/src/ crates/application/src/ crates/infrastructure/src/ crates/api/src/`

**FastAPI**: `src/api/v1/endpoints/ src/core/ src/domain/ src/application/use_cases/ src/infrastructure/database/ src/schemas/`

**Django**: `config/settings/ apps/ static/ templates/`

**Spring Boot**: `src/main/java/com/project/ src/main/resources/ src/test/java/com/project/`

### Frontend Templates

**React**: `src/app/ src/features/ src/shared/components/ src/shared/hooks/ src/shared/utils/ src/lib/ src/assets/`

**Vue**: `src/router/ src/stores/ src/features/ src/shared/components/ src/shared/composables/ src/assets/`

**Angular**: `src/app/features/ src/app/shared/ src/app/core/ src/assets/`

### Monorepo Template
```
packages/
  app/          # Frontend (React, Vue, etc.)
  api/          # Backend (NestJS, Go, Rust, etc.)
  shared/       # Shared types, utils, configs
  database/     # Migrations, seeds, schemas
docs/
  decisions/
  stories/
  specs/
```

## AGENTS.md Template
```markdown
# Project Rules

## Stack
- Backend: {backend_stack}
- Frontend: {frontend_stack}
- Monorepo: {yes/no}

## Commands
- Test: {inferred_test_command}
- Lint: {inferred_lint_command}
- Build: {inferred_build_command}

## Rules
- Run tests before every commit
- Follow conventional commits format
- {stack-specific rule 1}
- {stack-specific rule 2}
- {stack-specific rule 3}

## Handoff
- project-init → create-brief (defines what gets built)
```

## Rules
- Do NOT create any files before user confirms the folder tree
- Do NOT write implementation code of any kind. Placeholders only
- Do NOT run npm install, cargo build, or any dependency installation
- AGENTS.md must be under 30 lines. Gitignore must be under 20 lines
- If project directory already exists, ask before overwriting any files
- One question at a time during requirements gathering — do not list all questions
- After scaffolding, output folder tree as code block + 2-line summary. Nothing more

## Production Considerations

### Repository Structure Best Practices
- **Monorepo**: Use when sharing types, utils, or configs across packages. Prefer pnpm workspaces, turborepo, or nx for tooling.
- **Polyrepo**: Use when teams are independent, deployment is independent, or security boundaries require strict separation.
- **Naming conventions**: kebab-case for directories and files (language-standard for most ecosystems). PascalCase for components and classes. camelCase for functions and variables.
- **Depth limitation**: Max 4 levels deep from root. Deeply nested structures create import path confusion and refactoring friction.
- **docs/ structure**: decisions/ for ADRs, stories/ for user stories/user journeys, specs/ for technical specifications.

### CI/CD Integration Points
- Include `.github/workflows/`, `.gitlab-ci.yml`, or `.circleci/config.yml` as placeholder when appropriate
- CI should mirror the test → lint → build → security stages defined in AGENTS.md
- Add `Dockerfile` placeholder for containerized deployments

## References
  - references/boilerplate-generation.md — Boilerplate Generation
  - references/config-reference.md — Config File Reference
  - references/config-templates.md — Config Templates Reference
  - references/project-init-advanced.md — Project Init Advanced Topics
  - references/project-init-checklist.md — Project Init Checklist
  - references/project-init-fundamentals.md — Project Init Fundamentals
  - references/project-scaffold.md — Project Scaffolding Reference
  - references/stack-templates.md — Stack Templates

## Project Kickoff Checklist

### Pre-Scaffold Validation
Before creating any files, verify:
- [ ] Project name is kebab-case and URL-friendly
- [ ] Target directory doesn't exist or user confirmed overwrite
- [ ] Required tools are installed (Node 20+, Python 3.12+, etc.)
- [ ] Package manager chosen (npm/pnpm/yarn/bun) and available
- [ ] Git is initialized (or will be by init command)
- [ ] License file will be generated (MIT/Apache/GPL — ask user)
- [ ] CI platform selected (GitHub Actions / CircleCI / GitLab CI)
- [ ] Target environment (Node/Deno/Bun, browser targets, mobile OS versions)

### Stack Decision Tree
```
What kind of project?
├── Web App
│   ├── Full-stack: Next.js, tRPC, Prisma, Postgres
│   ├── Frontend only: Vite + React/Vue/Svelte, deployed to CDN
│   └── Backend only: Fastify/Express, Postgres, Redis
├── API / Backend Service
│   ├── REST: Fastify/Express/Flask/Django
│   ├── GraphQL: Apollo/Relay/Hasura
│   └── gRPC: Buf build, protoc, server reflection
├── CLI Tool
│   ├── Node: Commander/oclif, pkg/dist for binaries
│   ├── Go: Cobra, single binary output
│   └── Rust: Clap, cross-compile targets
├── Mobile App
│   ├── React Native: Expo + file-based routing
│   ├── Flutter: Dart, single codebase
│   └── Kotlin Multiplatform: Shared business logic
├── Library / Package
│   ├── npm package: TypeScript, tsup/bundling, changesets
│   └── Python package: uv/pip, pyproject.toml, hatchling
└── Static Site
    ├── Astro: content-focused, island architecture
    └── Eleventy/Hugo: markdown-driven, fast builds
```

### Modern Stack Templates

**Next.js 15 (App Router + TypeScript):**
```bash
npx create-next-app@latest my-app --typescript --tailwind --eslint \
  --app --src-dir --import-alias "@/*" --use-pnpm
```

**Vite + React + TypeScript:**
```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install @tanstack/react-query zustand react-router-dom
npm install -D vitest @testing-library/react msw
```

**Fastify + TypeScript backend:**
```bash
mkdir my-api && cd my-api
pnpm init
pnpm add fastify @fastify/cors @fastify/env zod pino
pnpm add -D typescript @types/node tsx
# Create tsconfig.json, src/server.ts
```

**Flutter mobile app:**
```bash
flutter create --org com.mycompany --project-name my_app \
  --platforms=ios,android,web my_app
cd my_app
flutter pub add go_router riverpod flutter_secure_storage
```

**Python FastAPI backend:**
```bash
mkdir my-api && cd my-api
uv init --app
uv add fastapi uvicorn[standard] sqlalchemy asyncpg pydantic
uv add -d pytest httpx
# Create src/main.py with app factory
```

**npm library package:**
```bash
mkdir my-lib && cd my-lib
pnpm init
pnpm add -D typescript @types/node tsup vitest
# Create src/index.ts with exports
# Create tsconfig.json with declaration: true
```

### Project Structure Templates

**Full-stack (Next.js):**
```
my-app/
├── src/
│   ├── app/          # App Router routes
│   ├── components/   # Shared UI components
│   ├── lib/          # Utility functions
│   ├── server/       # Server-only code (DB, auth)
│   └── styles/       # Global styles
├── prisma/           # Database schema + migrations
├── public/           # Static assets
├── tests/            # Integration + e2e tests
├── .env.example
├── .env.local
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

**Backend service (layered):**
```
my-api/
├── src/
│   ├── api/          # Route handlers, middleware
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── validators/
│   ├── core/         # Business logic, use cases
│   │   ├── services/
│   │   └── domain/   # Entities, value objects
│   ├── infra/        # External dependencies: DB, queue, cache
│   │   ├── database/
│   │   ├── queue/
│   │   └── cache/
│   ├── config/       # Environment, app config
│   └── index.ts      # Entry point, DI setup
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── migrations/
├── docker-compose.yml
├── Dockerfile
└── tsconfig.json
```

### CI/CD Template Generation

**GitHub Actions (test + lint):**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test -- --coverage
      - run: pnpm build
```

**Vercel/Netlify deploy config:**
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install"
}
```

### Dependency & Tool Version Pinning

```json
{
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.15.4",
  "volta": {
    "node": "20.18.0",
    "pnpm": "9.15.4"
  }
}
```
- Use `engines` + `packageManager` in package.json
- Use `.nvmrc` / `.node-version` for nvm/nodenv
- Use `.tool-versions` for asdf (works for all languages)
- Pin exact versions in CI (GitHub Actions: `setup-node@v4` with `node-version-file: .nvmrc`)

### Configuration File Quick Reference

| Language | Linter | Formatter | Test | Build |
|----------|--------|-----------|------|-------|
| TypeScript/JS | `eslint.config.js` | `.prettierrc` | `vitest.config.ts` | `tsconfig.json` |
| Python | `pyproject.toml` (ruff) | `pyproject.toml` (ruff) | `pyproject.toml` (pytest) | `pyproject.toml` |
| Go | `.golangci.yml` | `gofumpt` | built-in `go test` | `go.mod` |
| Rust | `clippy.toml` | `rustfmt.toml` | built-in `cargo test` | `Cargo.toml` |
| Dart/Flutter | `analysis_options.yaml` | built-in `dart format` | built-in `flutter test` | `pubspec.yaml` |

### Environment Validation Script
```bash
#!/usr/bin/env bash
# scripts/check-env.sh — verifies prerequisites
set -euo pipefail

check_cmd() {
  if ! command -v "$1" &> /dev/null; then
    echo "❌ $1 is required but not installed."
    echo "   Install: $2"
    return 1
  fi
  echo "✓ $1 found: $(command -v "$1") ($("$1" --version 2>&1 | head -1))"
}

check_cmd node "https://nodejs.org/ (v20+)"
check_cmd pnpm "npm install -g pnpm"
check_cmd git "https://git-scm.com/"
check_cmd docker "https://docker.com/products/docker-desktop"

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "⚠ Created .env from .env.example — verify values"
  else
    echo "ℹ No .env or .env.example found — create one"
  fi
fi

echo "✓ Environment check complete"
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Better Approach |
|---|---|---|
| Scaffold then configure | Generates default configs that don't match team practices | Use opinionated templates with pre-configured tools |
| Ignoring monorepo costs | Hit tooling limits (TypeScript project ref, ESLint scope) | Plan from day 1 if project will grow beyond 10 packages |
| No `.gitignore` upfront | Committed node_modules, .env, secrets | Generate with project init. Block with pre-commit hook. |
| Hardcoded ports/URLs | Dev/prod conflicts, CI fails locally | Use env vars with defaults in config module |
| No Docker compose for deps | Devs install Postgres/Redis differently, env drift | docker-compose.yml with all service dependencies |
| Single tsconfig for monolith + lib | Build config and app config differ | Separate tsconfig for app, lib, build, node |
| Commit generated scaffold files | Boilerplate that will never change | Let init commands run, then prune unused files |
| Wrong package manager | pnpm users with npm lockfile conflicts | Pin in `packageManager` field, enforce in CI |

## Architecture Decision Trees

```
Project Initialization Strategy
├── Project type?
│   ├── Web app → Vite + React/Next.js + TypeScript
│   ├── API service → Fastify/Express + TypeScript + OpenAPI
│   ├── CLI tool → Commander/oclif + TypeScript
│   └── Library → tsup + TypeScript + Vitest
├── Monorepo needed?
│   ├── Yes → Turborepo / Nx / pnpm workspaces
│   ├── Single package → Simple single-package setup
│   └── Microservices → Nx with buildable libraries
├── Testing strategy?
│   ├── Unit + E2E → Vitest + Playwright
│   ├── Unit only → Vitest
│   └── Type-safe mocks → Node Test Runner + testdouble
└── Deployment target?
    ├── Serverless → AWS Lambda / Vercel / Netlify
    ├── Container → Docker + Docker Compose + K8s manifests
    └── Edge → Cloudflare Workers / Deno Deploy
```

**Decision criteria**: Assess team size, deployment target, monorepo complexity, and testing maturity.

## Implementation Patterns

### Scaffold Script
```bash
#!/usr/bin/env bash
# project-init/scaffold.sh

PROJECT_NAME=$1
FRAMEWORK=$2

mkdir -p "$PROJECT_NAME"/{src,test,docs}
cd "$PROJECT_NAME"

# Initialize package
npm init -y
npm pkg set type="module"

# Install core deps
case $FRAMEWORK in
  react)
    npm create vite@latest . -- --template react-ts
    ;;
  next)
    npx create-next-app@latest . --typescript --tailwind
    ;;
  express)
    npm install express cors helmet
    npm install -D typescript @types/node vitest
    ;;
esac

# Git setup
git init
cat > .gitignore << EOF
node_modules/
dist/
.env
*.log
EOF
git add . && git commit -m "chore: initial scaffold"
```

### TypeScript Config Template
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

## Production Considerations

- **`.gitignore` completeness**: Include `node_modules/`, `dist/`, `.env`, `*.log`, `.next/`, `coverage/`, `tmp/`.
- **Environment validation**: Include `.env.example` with all required vars documented; use Zod for runtime validation.
- **CI/CD templates**: Generate `.github/workflows/ci.yml` with lint, typecheck, test, and build stages.
- **Docker support**: Include multi-stage `Dockerfile` and `docker-compose.yml` for local development.
- **Editor config**: Generate `.vscode/settings.json` with format-on-save and recommended extensions.
- **License**: Add `LICENSE` file matching project requirements (MIT, Apache 2.0, or proprietary).

## Anti-Patterns

| Anti-Pattern | Consequence | Solution |
|---|---|---|
| Hardcoded ports/URLs | Dev/prod conflicts | Use env vars with defaults |
| No Docker compose for deps | Environment drift across team | Include docker-compose.yml |
| Single tsconfig for all | Build config and app config differ | Separate tsconfigs per context |
| Committing scaffold files | Boilerplate that never changes | Prune unused files after init |
| Wrong package manager | Lockfile conflicts | Pin in packageManager field |

## Performance Optimization

- **Minimal dependencies**: Pin exact versions for critical packages; audit `node_modules` size.
- **Tree-shaking**: Configure ESM with `sideEffects: false` in `package.json` for optimal bundle.
- **Build caching**: Set up Turborepo/Nx caching for faster local and CI builds.
- **Dev server**: Use Vite (esbuild-based) for sub-second HMR; avoid webpack for new projects.
- **TypeScript project references**: Use project references for monorepo to enable incremental builds.

## Security Considerations

- **Dependency auditing**: Run `npm audit` or `pnpm audit` on init; pin dependency versions with lockfile.
- **Environment isolation**: Generate `.env` with placeholder values; never commit actual secrets.
- **Docker security**: Use non-root user in Dockerfile; pin base image digests, not tags.
- **Lint rules**: Include ESLint security plugin (`eslint-plugin-security`) for Node.js projects.
- **Git hooks**: Configure husky + lint-staged for pre-commit checks; prevent secrets from being committed.
- **License compliance**: Check dependency licenses (`license-checker`) for compatibility with project license.

## Handoff
Output: Scaffolded project at {path}
Next skill: create-brief - to define what gets built.
Carry forward: project path, stack, framework.
