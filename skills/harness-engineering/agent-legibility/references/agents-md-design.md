# AGENTS.md Design Reference

## Overview

The `AGENTS.md` file is the primary instruction surface for AI coding agents operating within
a repository. Unlike documentation written for humans, AGENTS.md files must be structured for
deterministic machine parsing while remaining human-readable. This reference covers the complete
design methodology for creating effective AGENTS.md files.

## Purpose and Scope

AGENTS.md serves as the **canonical contract** between the repository maintainer and any AI
agent that operates within the codebase. It defines:

- What the project is and how it is organized
- What conventions must be followed
- What actions are forbidden
- How tools should be invoked
- What workflows the agent should execute

---

## 1. File Structure and Anatomy

### 1.1 Canonical Section Order

An effective AGENTS.md follows a strict section hierarchy:

```markdown
# AGENTS.md

## Project Overview
## Architecture
## Directory Structure
## Conventions
## Constraints
## Never-Do List
## Tool Instructions
## Workflow Patterns
## Testing Requirements
## Deployment Notes
```

### 1.2 Why Order Matters

AI agents process files sequentially. The most critical context must appear first because:

1. Token windows have limits — early sections are always in context
2. Agents build a mental model progressively — foundational context first
3. Override rules should appear after base rules to ensure correct precedence

### 1.3 Section Weight Distribution

```
┌─────────────────────────────────────────────────────────┐
│ Section                    │ Target Lines │ Priority     │
├─────────────────────────────────────────────────────────┤
│ Project Overview           │  15-30       │ Critical     │
│ Architecture               │  20-50       │ High         │
│ Directory Structure        │  15-40       │ High         │
│ Conventions                │  30-60       │ Critical     │
│ Constraints                │  20-40       │ Critical     │
│ Never-Do List              │  10-20       │ Critical     │
│ Tool Instructions          │  20-40       │ Medium       │
│ Workflow Patterns          │  20-50       │ Medium       │
│ Testing Requirements       │  15-30       │ High         │
│ Deployment Notes           │  10-20       │ Low          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Project Overview Section

### 2.1 Structure

The project overview is the first thing an agent reads. It must answer five questions:

1. **What** is this project?
2. **Why** does it exist?
3. **Who** maintains it?
4. **How** is it built?
5. **Where** are the key entry points?

### 2.2 Template

```markdown
## Project Overview

This is a [type] project that [primary function].

- **Language**: TypeScript 5.x
- **Runtime**: Node.js 20+ / Bun 1.x
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL 16 via Prisma ORM
- **Package Manager**: pnpm 9.x
- **Monorepo Tool**: Turborepo

### Key Entry Points
- Application: `apps/web/src/app/layout.tsx`
- API Routes: `apps/web/src/app/api/`
- Shared Library: `packages/shared/src/index.ts`
- Database Schema: `packages/db/prisma/schema.prisma`
```

### 2.3 Anti-Patterns

```
BAD:  "This is a web app built with modern tools."
GOOD: "This is a Next.js 14 App Router application using TypeScript 5.4,
       deployed on Vercel, with PostgreSQL 16 via Prisma ORM."

BAD:  "See the docs for more info."
GOOD: "Architecture decisions are recorded in docs/adr/. Start with
       docs/adr/0001-use-app-router.md for the routing decision."
```

---

## 3. Architecture Section

### 3.1 Layer Diagram

Include an ASCII architecture diagram that agents can parse:

```markdown
## Architecture

```
┌─────────────────────────────────────────────┐
│                 Presentation                 │
│  Next.js App Router / React Server Components│
├─────────────────────────────────────────────┤
│                 Application                  │
│  Server Actions / API Routes / tRPC          │
├─────────────────────────────────────────────┤
│                   Domain                     │
│  Business Logic / Validation / Types         │
├─────────────────────────────────────────────┤
│               Infrastructure                 │
│  Prisma ORM / Redis / S3 / Email             │
└─────────────────────────────────────────────┘
```
```

### 3.2 Module Dependency Rules

```markdown
### Dependency Rules
- Presentation → Application → Domain → Infrastructure
- NEVER import from Presentation in Domain layer
- NEVER import from Infrastructure in Domain layer
- Domain types are the source of truth for all layers
- Shared utilities live in `packages/shared/` and may be imported by any layer
```

### 3.3 Data Flow Documentation

```markdown
### Request Lifecycle
1. Request hits Next.js middleware (`middleware.ts`)
2. Auth check via `lib/auth/session.ts`
3. Route handler or Server Component processes request
4. Domain service performs business logic
5. Repository layer handles data access via Prisma
6. Response serialized through DTOs defined in `types/api/`
```

---

## 4. Directory Structure Section

### 4.1 Annotated Tree

```markdown
## Directory Structure

```
project-root/
├── apps/
│   └── web/                    # Main Next.js application
│       ├── src/
│       │   ├── app/            # App Router pages and layouts
│       │   ├── components/     # React components (PascalCase files)
│       │   ├── lib/            # Shared utilities and helpers
│       │   ├── hooks/          # Custom React hooks (use*.ts)
│       │   ├── types/          # TypeScript type definitions
│       │   └── styles/         # Global styles and Tailwind config
│       ├── public/             # Static assets
│       └── tests/              # Test files mirror src/ structure
├── packages/
│   ├── shared/                 # Shared types, utils, constants
│   ├── db/                     # Prisma schema and migrations
│   ├── ui/                     # Shared UI component library
│   └── config/                 # Shared ESLint, TS, Tailwind configs
├── docs/
│   ├── adr/                    # Architecture Decision Records
│   └── api/                    # API documentation
├── scripts/                    # Build and deployment scripts
├── .github/                    # GitHub Actions workflows
└── turbo.json                  # Turborepo pipeline configuration
```
```

### 4.2 File Naming Convention Table

```markdown
### File Naming Conventions

| Location          | Convention        | Example                    |
|-------------------|-------------------|----------------------------|
| Components        | PascalCase        | `UserProfile.tsx`          |
| Hooks             | camelCase, use*   | `useAuth.ts`               |
| Utilities         | camelCase         | `formatDate.ts`            |
| Types             | PascalCase        | `UserTypes.ts`             |
| API Routes        | kebab-case dirs   | `api/user-profile/route.ts`|
| Tests             | *.test.ts(x)      | `UserProfile.test.tsx`     |
| Styles            | *.module.css      | `UserProfile.module.css`   |
| Constants         | SCREAMING_SNAKE   | `API_ENDPOINTS.ts`         |
```

---

## 5. Conventions Section

### 5.1 Code Style Rules

```markdown
## Conventions

### Code Style
1. Use TypeScript strict mode — no `any` types unless explicitly justified
2. Prefer `const` over `let`; never use `var`
3. Use named exports, not default exports (except Next.js pages)
4. Maximum function length: 40 lines
5. Maximum file length: 300 lines
6. All functions must have explicit return types
7. Use template literals over string concatenation

### Component Conventions
1. Use functional components exclusively — no class components
2. Props interfaces must be defined above the component
3. Use `React.FC` sparingly — prefer explicit props typing
4. Colocate component tests: `Component.tsx` → `Component.test.tsx`
5. Extract hooks when component state logic exceeds 15 lines

### Import Order
1. Node built-in modules (`node:fs`, `node:path`)
2. External packages (`react`, `next`)
3. Internal packages (`@repo/shared`, `@repo/ui`)
4. Local absolute imports (`@/lib/`, `@/components/`)
5. Relative imports (`./utils`, `../types`)
6. Type-only imports (`import type { ... }`)
```

### 5.2 Git Conventions

```markdown
### Git Conventions
- Branch naming: `type/description` (e.g., `feat/user-auth`, `fix/login-redirect`)
- Commit format: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Squash merge to main
- No force-pushing to shared branches
- PR description must reference issue number
```

### 5.3 Naming Conventions

```markdown
### Naming Conventions

#### Variables and Functions
- camelCase for variables and functions: `getUserById`, `isAuthenticated`
- PascalCase for types, interfaces, classes: `UserProfile`, `AuthState`
- SCREAMING_SNAKE_CASE for constants: `MAX_RETRY_COUNT`, `API_BASE_URL`
- Prefix booleans with `is`, `has`, `should`, `can`: `isLoading`, `hasError`

#### Files and Directories
- Component files: PascalCase (`UserCard.tsx`)
- Utility files: camelCase (`formatDate.ts`)
- Test files: same name + `.test` suffix (`formatDate.test.ts`)
- Directory names: kebab-case (`user-management/`)
```

---

## 6. Constraints Section

### 6.1 Hard Constraints

```markdown
## Constraints

### Hard Constraints (Must Never Violate)
1. All code must pass `pnpm lint` and `pnpm typecheck` before committing
2. No runtime dependencies over 500KB unpacked size without approval
3. All API endpoints must have input validation via Zod schemas
4. Database migrations must be reversible
5. No secrets or API keys in code — use environment variables
6. All user-facing text must use i18n translation keys
7. Accessibility: all interactive elements must be keyboard-navigable

### Soft Constraints (Prefer Unless Justified)
1. Prefer server components over client components
2. Prefer Tailwind CSS over custom CSS
3. Prefer Prisma queries over raw SQL
4. Prefer `zod` for validation over manual checks
5. Prefer `date-fns` over `moment.js`
```

### 6.2 Performance Constraints

```markdown
### Performance Constraints
- Page load (LCP): < 2.5 seconds
- Time to Interactive: < 3.5 seconds
- Bundle size per route: < 150KB gzipped
- API response time: < 200ms for read operations
- Database queries: < 50ms average
- No N+1 queries — use Prisma `include` or `select`
```

### 6.3 Security Constraints

```markdown
### Security Constraints
- All inputs must be validated and sanitized
- SQL injection prevention via parameterized queries (Prisma)
- XSS prevention via React's built-in escaping
- CSRF protection on all mutating endpoints
- Rate limiting on authentication endpoints
- CORS configured for specific origins only
- Content Security Policy headers required
```

---

## 7. Never-Do List

### 7.1 Template

```markdown
## Never-Do List

> These are absolute prohibitions. Violating any of these will break the build,
> introduce security vulnerabilities, or corrupt data.

1. **NEVER** commit `.env` files or secrets to version control
2. **NEVER** use `eval()` or `Function()` constructor
3. **NEVER** disable TypeScript strict checks (`// @ts-ignore`, `// @ts-nocheck`)
4. **NEVER** use `innerHTML` or `dangerouslySetInnerHTML` without sanitization
5. **NEVER** bypass authentication middleware
6. **NEVER** delete or modify migration files that have been applied
7. **NEVER** use synchronous file I/O in API routes
8. **NEVER** store user passwords in plain text
9. **NEVER** use `*` imports — always use named imports
10. **NEVER** commit code with `console.log` debugging statements
11. **NEVER** mutate function arguments directly
12. **NEVER** use `any` type without a `// TODO: type properly` comment
13. **NEVER** skip error handling in async functions
14. **NEVER** hardcode URLs — use environment variables or constants
```

### 7.2 Enforcement Mechanism

The Never-Do List should be backed by automated enforcement:

```json
{
  "eslint_rules": {
    "no-eval": "error",
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-explicit-any": "warn",
    "no-restricted-imports": ["error", { "patterns": ["../**/internal/*"] }]
  },
  "pre_commit_hooks": {
    "detect-secrets": true,
    "lint-staged": true,
    "type-check": true
  }
}
```

---

## 8. Tool Instructions Section

### 8.1 Build Commands

```markdown
## Tool Instructions

### Package Manager
- **Install**: `pnpm install` (never use npm or yarn)
- **Add dependency**: `pnpm add <package> --filter <workspace>`
- **Add dev dependency**: `pnpm add -D <package> --filter <workspace>`
- **Remove dependency**: `pnpm remove <package> --filter <workspace>`

### Build
- **Full build**: `pnpm build` (runs Turborepo pipeline)
- **Single app**: `pnpm build --filter=web`
- **Type check**: `pnpm typecheck`
- **Lint**: `pnpm lint`
- **Lint fix**: `pnpm lint:fix`

### Development
- **Start dev server**: `pnpm dev`
- **Start specific app**: `pnpm dev --filter=web`
- **Database studio**: `pnpm db:studio`
- **Generate Prisma client**: `pnpm db:generate`

### Testing
- **Run all tests**: `pnpm test`
- **Run specific test**: `pnpm test -- --grep "test name"`
- **Watch mode**: `pnpm test:watch`
- **Coverage report**: `pnpm test:coverage`
- **E2E tests**: `pnpm test:e2e`

### Database
- **Create migration**: `pnpm db:migrate:dev --name <migration-name>`
- **Apply migrations**: `pnpm db:migrate:deploy`
- **Reset database**: `pnpm db:reset` (WARNING: destroys all data)
- **Seed database**: `pnpm db:seed`
```

### 8.2 Tool Configuration Matrix

```
┌──────────────────────────────────────────────────────────────┐
│ Task              │ Command              │ When to Use        │
├──────────────────────────────────────────────────────────────┤
│ Format code       │ pnpm format          │ Before every commit│
│ Check types       │ pnpm typecheck       │ Before every commit│
│ Run linter        │ pnpm lint            │ Before every commit│
│ Run tests         │ pnpm test            │ After code changes │
│ Update deps       │ pnpm update          │ Scheduled/manual   │
│ Generate types    │ pnpm db:generate     │ After schema change│
│ Create migration  │ pnpm db:migrate:dev  │ After schema change│
│ Build production  │ pnpm build           │ Before deployment  │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Multi-Agent Configuration

### 9.1 Agent Role Definitions

When multiple AI agents operate in the same repository, AGENTS.md must define roles:

```markdown
## Multi-Agent Configuration

### Agent Roles

#### Code Agent (Primary)
- **Scope**: All files in `apps/` and `packages/`
- **Permissions**: Create, modify, delete code files
- **Restrictions**: Cannot modify CI/CD configurations
- **Workflow**: Feature branches with PR creation

#### Review Agent
- **Scope**: Read-only access to all files
- **Permissions**: Comment on PRs, suggest changes
- **Restrictions**: Cannot push code directly
- **Workflow**: Triggered on PR creation

#### Documentation Agent
- **Scope**: `docs/`, `*.md` files, JSDoc comments
- **Permissions**: Create, modify documentation files
- **Restrictions**: Cannot modify source code logic
- **Workflow**: Runs after code agent completes

#### DevOps Agent
- **Scope**: `.github/`, `Dockerfile`, `docker-compose.yml`, infra/
- **Permissions**: Modify CI/CD and infrastructure configs
- **Restrictions**: Cannot modify application code
- **Workflow**: Triggered on infrastructure changes
```

### 9.2 Agent Communication Protocol

```markdown
### Agent Communication

Agents communicate through structured files:

#### Handoff File: `.agent/handoff.json`
```json
{
  "from": "code-agent",
  "to": "review-agent",
  "timestamp": "2025-01-15T10:30:00Z",
  "context": {
    "branch": "feat/user-auth",
    "files_changed": ["src/lib/auth.ts", "src/app/api/login/route.ts"],
    "summary": "Implemented JWT-based authentication",
    "tests_passing": true,
    "lint_clean": true
  },
  "instructions": "Review for security best practices and auth flow correctness"
}
```

#### Status File: `.agent/status.json`
```json
{
  "agent": "code-agent",
  "status": "completed",
  "timestamp": "2025-01-15T10:29:55Z",
  "artifacts": {
    "files_created": 3,
    "files_modified": 5,
    "tests_added": 8,
    "coverage_delta": "+4.2%"
  }
}
```
```

### 9.3 Conflict Resolution

```markdown
### Conflict Resolution Rules
1. If two agents modify the same file, the agent with higher scope priority wins
2. Priority order: Code Agent > DevOps Agent > Documentation Agent > Review Agent
3. Agents must check `.agent/locks.json` before modifying shared files
4. Lock expiration: 30 minutes maximum
5. Stale locks are automatically released by the CI pipeline

#### Lock File: `.agent/locks.json`
```json
{
  "locks": [
    {
      "file": "src/lib/auth.ts",
      "agent": "code-agent",
      "acquired": "2025-01-15T10:25:00Z",
      "expires": "2025-01-15T10:55:00Z",
      "reason": "Implementing authentication refactor"
    }
  ]
}
```
```

---

## 10. Version Control for AGENTS.md

### 10.1 Versioning Strategy

```markdown
<!-- AGENTS.md version: 2.3.1 -->
<!-- Last updated: 2025-01-15 -->
<!-- Reviewed by: @maintainer -->
```

### 10.2 Change Log Section

```markdown
## Changelog

### v2.3.1 (2025-01-15)
- Added multi-agent configuration section
- Updated tool instructions for pnpm 9.x
- Added security constraints for CORS

### v2.3.0 (2025-01-10)
- Migrated from Pages Router to App Router conventions
- Updated directory structure for new monorepo layout
- Added never-do list entries for server components

### v2.2.0 (2024-12-20)
- Initial multi-agent support
- Added handoff protocol documentation
```

### 10.3 Conditional Sections

Use HTML comments to create agent-specific sections:

```markdown
<!-- AGENT:claude-code -->
### Claude Code Specific Instructions
- Use `bash` tool for running commands
- Prefer `edit` tool over full file rewrites
- Always read files before editing them
<!-- /AGENT:claude-code -->

<!-- AGENT:cursor -->
### Cursor Specific Instructions
- Use Composer for multi-file changes
- Reference files with @file syntax
- Use codebase search before making changes
<!-- /AGENT:cursor -->

<!-- AGENT:codex -->
### Codex Specific Instructions
- Work within the sandbox environment
- All file access is relative to project root
- Use the provided shell for command execution
<!-- /AGENT:codex -->
```

---

## 11. Complete AGENTS.md Template

```markdown
# AGENTS.md
<!-- Version: 1.0.0 | Updated: 2025-01-15 -->

## Project Overview

This is a [PROJECT_TYPE] built with [TECH_STACK].

- **Language**: [LANGUAGE]
- **Runtime**: [RUNTIME]
- **Framework**: [FRAMEWORK]
- **Database**: [DATABASE]
- **Package Manager**: [PACKAGE_MANAGER]

### Key Entry Points
- Main application: `[PATH]`
- API layer: `[PATH]`
- Database schema: `[PATH]`
- Configuration: `[PATH]`

## Architecture

[ASCII DIAGRAM]

### Dependency Rules
- [LAYER] → [LAYER] → [LAYER]
- Never import from [LAYER] in [LAYER]

## Directory Structure

```
[ANNOTATED TREE]
```

## Conventions

### Code Style
1. [CONVENTION_1]
2. [CONVENTION_2]
...

### Naming
| Entity    | Convention  | Example       |
|-----------|-------------|---------------|
| [ENTITY]  | [PATTERN]   | [EXAMPLE]     |

### Git
- Branch: `type/description`
- Commits: Conventional Commits
- Merge: Squash to main

## Constraints

### Hard Constraints
1. [CONSTRAINT_1]
2. [CONSTRAINT_2]
...

### Performance
- [METRIC]: [THRESHOLD]

## Never-Do List

1. **NEVER** [ACTION_1]
2. **NEVER** [ACTION_2]
...

## Tool Instructions

### Common Commands
- Build: `[COMMAND]`
- Test: `[COMMAND]`
- Lint: `[COMMAND]`
- Dev: `[COMMAND]`

### Database
- Migrate: `[COMMAND]`
- Seed: `[COMMAND]`

## Testing

- Unit tests: `[PATH]` using [FRAMEWORK]
- Integration tests: `[PATH]` using [FRAMEWORK]
- E2E tests: `[PATH]` using [FRAMEWORK]
- Minimum coverage: [PERCENTAGE]%

## Deployment

- Environment: [PLATFORM]
- CI/CD: [TOOL]
- Preview: [MECHANISM]
```

---

## 12. Validation Checklist

Before finalizing an AGENTS.md, verify:

```
┌──────────────────────────────────────────────────────────────┐
│ Check                                        │ Status        │
├──────────────────────────────────────────────────────────────┤
│ Project overview is specific, not vague       │ [ ]           │
│ All file paths are accurate and exist         │ [ ]           │
│ Build/test commands work correctly            │ [ ]           │
│ Architecture diagram matches actual code      │ [ ]           │
│ Conventions are enforceable                   │ [ ]           │
│ Never-do list has automated enforcement       │ [ ]           │
│ Multi-agent roles are non-overlapping         │ [ ]           │
│ Tool versions match package.json              │ [ ]           │
│ Directory structure is up to date             │ [ ]           │
│ No vague or ambiguous instructions            │ [ ]           │
│ All referenced files actually exist           │ [ ]           │
│ Constraints are testable, not aspirational    │ [ ]           │
└──────────────────────────────────────────────────────────────┘
```

---

## 13. Advanced Patterns

### 13.1 Dynamic AGENTS.md Generation

For large repositories, generate AGENTS.md from source:

```python
#!/usr/bin/env python3
"""Generate AGENTS.md from repository metadata."""

import json
import os
from pathlib import Path
from datetime import datetime


def collect_project_metadata(root: Path) -> dict:
    """Collect metadata from package.json, tsconfig, etc."""
    metadata = {}
    
    pkg_path = root / "package.json"
    if pkg_path.exists():
        with open(pkg_path) as f:
            pkg = json.load(f)
            metadata["name"] = pkg.get("name", "unknown")
            metadata["version"] = pkg.get("version", "0.0.0")
            metadata["scripts"] = pkg.get("scripts", {})
            metadata["dependencies"] = list(pkg.get("dependencies", {}).keys())
            metadata["devDependencies"] = list(pkg.get("devDependencies", {}).keys())
    
    return metadata


def generate_directory_tree(root: Path, prefix: str = "", max_depth: int = 3) -> str:
    """Generate annotated directory tree."""
    lines = []
    entries = sorted(root.iterdir(), key=lambda e: (not e.is_dir(), e.name))
    
    # Filter out common ignored directories
    ignored = {".git", "node_modules", ".next", "dist", "__pycache__", ".cache"}
    entries = [e for e in entries if e.name not in ignored]
    
    for i, entry in enumerate(entries):
        is_last = i == len(entries) - 1
        connector = "└── " if is_last else "├── "
        suffix = "/" if entry.is_dir() else ""
        lines.append(f"{prefix}{connector}{entry.name}{suffix}")
        
        if entry.is_dir() and max_depth > 0:
            extension = "    " if is_last else "│   "
            subtree = generate_directory_tree(
                entry, prefix + extension, max_depth - 1
            )
            lines.append(subtree)
    
    return "\n".join(lines)


def generate_commands_section(scripts: dict) -> str:
    """Generate tool instructions from package.json scripts."""
    sections = {
        "Build": ["build", "compile", "bundle"],
        "Test": ["test", "test:unit", "test:e2e", "test:coverage"],
        "Lint": ["lint", "lint:fix", "format"],
        "Development": ["dev", "start", "serve"],
        "Database": ["db:migrate", "db:seed", "db:generate", "db:studio"],
    }
    
    lines = []
    for section_name, script_keys in sections.items():
        matching = {k: v for k, v in scripts.items() if k in script_keys}
        if matching:
            lines.append(f"\n### {section_name}")
            for key, value in matching.items():
                lines.append(f"- `pnpm {key}`: {value}")
    
    return "\n".join(lines)


def generate_agents_md(root: Path) -> str:
    """Generate complete AGENTS.md content."""
    metadata = collect_project_metadata(root)
    tree = generate_directory_tree(root)
    commands = generate_commands_section(metadata.get("scripts", {}))
    
    timestamp = datetime.now().strftime("%Y-%m-%d")
    
    template = f"""# AGENTS.md
<!-- Generated: {timestamp} | Version: {metadata.get('version', '1.0.0')} -->

## Project Overview

This is **{metadata.get('name', 'project')}** v{metadata.get('version', '0.0.0')}.

### Dependencies
{chr(10).join(f'- {dep}' for dep in metadata.get('dependencies', [])[:15])}

## Directory Structure

```
{tree}
```

## Tool Instructions
{commands}

## Conventions

> TODO: Add project-specific conventions

## Constraints

> TODO: Add project-specific constraints

## Never-Do List

> TODO: Add project-specific prohibitions
"""
    return template


if __name__ == "__main__":
    root = Path(".")
    content = generate_agents_md(root)
    
    with open("AGENTS.md", "w") as f:
        f.write(content)
    
    print(f"Generated AGENTS.md ({len(content)} chars)")
```

### 13.2 AGENTS.md Inheritance

For monorepos, use a root AGENTS.md with workspace-specific overrides:

```
project-root/
├── AGENTS.md                  # Global rules (applies everywhere)
├── apps/
│   ├── web/
│   │   └── AGENTS.md          # Web-specific rules (extends root)
│   └── mobile/
│       └── AGENTS.md          # Mobile-specific rules (extends root)
└── packages/
    └── shared/
        └── AGENTS.md          # Shared package rules (extends root)
```

Override semantics:

```markdown
<!-- apps/web/AGENTS.md -->
# AGENTS.md — Web Application

> This file extends the root AGENTS.md. All root conventions apply
> unless explicitly overridden below.

## Override: Conventions

### Additional Component Rules
- All pages must use Suspense boundaries
- Loading states are required for every route segment
- Error boundaries must be defined at the layout level

## Override: Tool Instructions

### Web-Specific Commands
- `pnpm dev --filter=web`: Start web dev server on port 3000
- `pnpm build --filter=web`: Build web application only
```

---

## 14. Quality Metrics

### 14.1 AGENTS.md Effectiveness Scoring

```
Score = (Specificity × 0.3) + (Completeness × 0.3) + (Accuracy × 0.25) + (Clarity × 0.15)

Where:
  Specificity  = ratio of concrete instructions to vague statements
  Completeness = sections present / total recommended sections
  Accuracy     = commands that work / total commands listed
  Clarity      = average reading grade level (target: 8-10)
```

### 14.2 Common Failure Modes

```
┌──────────────────────────────────────────────────────────────┐
│ Failure Mode              │ Impact     │ Frequency │ Fix     │
├──────────────────────────────────────────────────────────────┤
│ Stale directory structure │ High       │ Very High │ Automate│
│ Wrong build commands      │ Critical   │ High      │ CI test │
│ Missing constraints       │ Medium     │ High      │ Review  │
│ Vague conventions         │ Medium     │ Very High │ Examples│
│ No never-do list          │ High       │ Medium    │ Template│
│ Outdated dependencies     │ Low        │ High      │ Automate│
│ Missing tool versions     │ Medium     │ Medium    │ Script  │
│ Contradictory rules       │ Critical   │ Low       │ Review  │
└──────────────────────────────────────────────────────────────┘
```

---

## 15. Cross-References

- For repository-level configurations: `repo-native-instructions.md`
- For structured documentation patterns: `structured-documentation.md`
- For convention file examples: `convention-constraint-files.md`
- For README optimization: `agent-optimized-readmes.md`
- For workspace setup: `workspace-configuration.md`

<!-- Compression: AGENTS.md design reference covering project overview, architecture,
     directory structure, conventions, constraints, never-do lists, tool instructions,
     multi-agent configs, version control, templates, and quality metrics -->
