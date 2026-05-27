# Project Init Checklist

## Pre-Scaffold Validation

Before generating any project structure, validate the following:

```typescript
interface InitRequirements {
  stack: {
    backend: BackendStack;
    frontend?: FrontendStack;
    database?: DatabaseChoice;
    monorepo?: boolean;
    packageManager: PackageManager;
    runtime: RuntimeVersion;
  };
  projectName: string;
  projectDir: string;
}

type BackendStack = 'nestjs' | 'golang' | 'rust' | 'fastapi' | 'django' | 'spring';
type FrontendStack = 'react' | 'nextjs' | 'vue' | 'sveltekit' | 'angular';
type DatabaseChoice = 'postgresql' | 'mysql' | 'mongodb' | 'sqlite';
type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

function validateRequirements(req: InitRequirements): string[] {
  const warnings: string[] = [];

  if (!req.projectName.match(/^[a-z0-9-]+$/)) {
    warnings.push('Project name must be lowercase kebab-case');
  }

  if (existsSync(req.projectDir)) {
    const contents = readdirSync(req.projectDir);
    if (contents.length > 0) {
      warnings.push(`Directory ${req.projectDir} is not empty`);
    }
  }

  if (req.monorepo && !['pnpm', 'npm'].includes(req.packageManager)) {
    warnings.push('pnpm or npm recommended for monorepo workspaces');
  }

  return warnings;
}
```

## Scaffold Generation Steps

### 1. Root Structure

```typescript
interface RootStructure {
  files: string[];
  directories: string[];
}

function generateRootStructure(project: InitRequirements): RootStructure {
  const files = [
    'README.md',
    '.gitignore',
    '.editorconfig',
    '.env.example',
    'AGENTS.md',
    'Makefile',
  ];

  const directories = [
    'docs',
    'scripts',
    '.github/workflows',
    '.vscode',
  ];

  if (project.monorepo) {
    files.push('pnpm-workspace.yaml', 'turbo.json');
  }

  return { files, directories };
}
```

### 2. Stack-Specific Structure

```typescript
function generateStackStructure(stack: BackendStack): DirEntry[] {
  const structures: Record<BackendStack, DirEntry[]> = {
    nestjs: [
      { path: 'apps/api/src', type: 'dir' },
      { path: 'apps/api/src/modules', type: 'dir' },
      { path: 'apps/api/src/common', type: 'dir' },
      { path: 'apps/api/src/config', type: 'dir' },
      { path: 'apps/api/test', type: 'dir' },
      { path: 'apps/api/prisma', type: 'dir' },
    ],
    golang: [
      { path: 'cmd/server', type: 'dir' },
      { path: 'internal/api', type: 'dir' },
      { path: 'internal/db', type: 'dir' },
      { path: 'internal/models', type: 'dir' },
      { path: 'internal/services', type: 'dir' },
      { path: 'migrations', type: 'dir' },
    ],
    fastapi: [
      { path: 'app/api', type: 'dir' },
      { path: 'app/core', type: 'dir' },
      { path: 'app/models', type: 'dir' },
      { path: 'app/schemas', type: 'dir' },
      { path: 'app/services', type: 'dir' },
      { path: 'app/db', type: 'dir' },
      { path: 'alembic', type: 'dir' },
    ],
    rust: [
      { path: 'src/api', type: 'dir' },
      { path: 'src/db', type: 'dir' },
      { path: 'src/models', type: 'dir' },
      { path: 'src/services', type: 'dir' },
      { path: 'migrations', type: 'dir' },
    ],
    django: [
      { path: 'config', type: 'dir' },
      { path: 'apps', type: 'dir' },
      { path: 'static', type: 'dir' },
      { path: 'templates', type: 'dir' },
      { path: 'media', type: 'dir' },
    ],
    spring: [
      { path: 'src/main/java/com/project/api', type: 'dir' },
      { path: 'src/main/java/com/project/config', type: 'dir' },
      { path: 'src/main/java/com/project/model', type: 'dir' },
      { path: 'src/main/java/com/project/repository', type: 'dir' },
      { path: 'src/main/java/com/project/service', type: 'dir' },
      { path: 'src/main/resources/db/migration', type: 'dir' },
    ],
  };

  return structures[stack] || [];
}
```

### 3. Configuration File Templates

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          scan-ref: .
          format: sarif
          output: trivy-results.sarif
      - uses: github/codeql-action/upload-sarif@v3
```

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
```

```
# .editorconfig
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

```
# .env.example — Copy to .env and fill in values
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/project
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production
LOG_LEVEL=debug
```

## AGENTS.md Template

```markdown
# {project_name} — Agent Guidelines

## Project Overview
{description}

## Tech Stack
- Backend: {backend_stack}
- Database: {database}
- Testing: {test_framework}
- Deployment: {deployment_target}

## Conventions
- TypeScript with strict mode
- PascalCase for types/interfaces, camelCase for everything else
- No default exports
- Functional components in frontend
- Domain-driven package structure

## Commands
- `npm run dev` — Start dev server
- `npm test` — Run tests
- `npm run lint` — Lint all files
- `npm run build` — Production build
- `make migrate` — Run migrations
- `make seed` — Seed database

## Architecture Notes
- API-first: OpenAPI spec drives client generation
- CQRS with separate read models
- Event-driven communication between bounded contexts
- Idempotency keys on all write endpoints

## Related Skills
- {phase_0_skill}
- {relevant_skills}
```

## Key Points

- Validate project directory is empty before scaffolding
- Generate .gitignore from gitignore.io templates per stack
- Always include AGENTS.md for AI-assisted development
- .env.example must never contain real secrets
- CI workflow with lint, typecheck, test, and security scan
- Editorconfig ensures consistent formatting across editors
- Stack-specific directory structures follow community conventions
- Monorepo setup requires workspace configuration (pnpm-workspace, turbo)
- Makefile standardizes common commands regardless of package manager
- Docker Compose for local development dependencies
