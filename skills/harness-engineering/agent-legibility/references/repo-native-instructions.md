# Repository-Native Instructions Reference

## Overview

Repository-native instructions are configuration files placed within a codebase that provide
AI agents with project-specific guidance. Unlike AGENTS.md (which is a convention), these
are platform-recognized configuration directories and files that each AI coding tool
natively discovers and ingests. This reference covers all major platforms and their
instruction file formats.

---

## 1. Claude Code Configuration (`.claude/`)

### 1.1 Directory Structure

```
.claude/
├── settings.json          # Project-level Claude settings
├── commands/              # Custom slash commands
│   ├── build.md           # /project:build command
│   ├── test.md            # /project:test command
│   ├── review.md          # /project:review command
│   └── deploy.md          # /project:deploy command
└── CLAUDE.md              # Primary instruction file
```

### 1.2 CLAUDE.md File

The `CLAUDE.md` file is Claude Code's native instruction format. It supports Markdown
and is automatically loaded when Claude Code operates in the repository.

```markdown
# CLAUDE.md

## Project Context
This is a Next.js 14 application using the App Router pattern.
TypeScript strict mode is enforced across all packages.

## Build Commands
- `pnpm install` — Install all dependencies
- `pnpm dev` — Start development server on port 3000
- `pnpm build` — Production build
- `pnpm test` — Run test suite
- `pnpm lint` — Run ESLint
- `pnpm typecheck` — Run TypeScript compiler check

## Code Style
- Use TypeScript for all new files
- Prefer named exports over default exports
- Use functional components with explicit prop types
- Follow the existing import order: external → internal → relative
- All async functions must have error handling

## Architecture Rules
- Server Components by default, Client Components only when necessary
- Use Server Actions for mutations
- Prisma for all database access — no raw SQL
- Zod schemas for all input validation

## Testing Requirements
- Every new feature needs unit tests
- Minimum 80% code coverage for new files
- Integration tests for API routes
- Use MSW for API mocking in tests

## Important Files
- `prisma/schema.prisma` — Database schema (source of truth)
- `src/app/layout.tsx` — Root layout
- `src/lib/auth.ts` — Authentication utilities
- `.env.example` — Required environment variables

## Never Do
- Never use `any` type
- Never disable ESLint rules inline
- Never commit .env files
- Never use synchronous I/O in server code
- Never bypass authentication checks
```

### 1.3 Custom Commands

Claude Code supports custom commands defined as Markdown files:

```markdown
<!-- .claude/commands/review.md -->
# Code Review Command

Review the currently staged changes for:

1. **Type Safety**: Check for proper TypeScript usage, no `any` types
2. **Error Handling**: Ensure all async operations have try/catch
3. **Security**: Look for injection vulnerabilities, exposed secrets
4. **Performance**: Check for N+1 queries, unnecessary re-renders
5. **Conventions**: Verify naming conventions, import order
6. **Tests**: Confirm adequate test coverage for changes

Output format:
- List each file reviewed
- For each issue found, provide:
  - Severity: 🔴 Critical / 🟡 Warning / 🔵 Info
  - File and line number
  - Description
  - Suggested fix
```

```markdown
<!-- .claude/commands/test.md -->
# Test Generation Command

For the specified file or component:

1. Analyze the module's exports and public API
2. Identify edge cases and error conditions
3. Generate comprehensive test file using:
   - Vitest as the test runner
   - React Testing Library for components
   - MSW for API mocking
4. Place test file adjacent to source: `Component.test.tsx`
5. Include tests for:
   - Happy path
   - Error states
   - Edge cases
   - Boundary conditions
   - Loading states (for async operations)
```

### 1.4 Settings Configuration

```json
// .claude/settings.json
{
  "permissions": {
    "allow": [
      "Bash(pnpm *)",
      "Bash(npx prisma *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Read(*)",
      "Write(src/**)",
      "Write(tests/**)",
      "Write(docs/**)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push *)",
      "Bash(git merge *)",
      "Write(.env*)",
      "Write(.github/**)"
    ]
  }
}
```

### 1.5 Per-Directory CLAUDE.md

Claude Code supports hierarchical instruction files:

```
project/
├── CLAUDE.md                    # Root: global rules
├── src/
│   ├── CLAUDE.md                # src-level: code conventions
│   ├── app/
│   │   └── CLAUDE.md            # App Router specific rules
│   └── components/
│       └── CLAUDE.md            # Component-specific rules
└── packages/
    └── db/
        └── CLAUDE.md            # Database package rules
```

```markdown
<!-- src/components/CLAUDE.md -->
# Component Development Rules

In this directory:
- Every component must have a corresponding `.test.tsx` file
- Use Tailwind CSS exclusively — no inline styles or CSS modules
- Props interfaces must be exported and named `{Component}Props`
- Components must be wrapped in `React.memo` if they accept complex props
- Storybook stories are optional but encouraged for shared components
```

---

## 2. Cursor Configuration (`.cursor/`)

### 2.1 Directory Structure

```
.cursor/
├── rules/                     # Rule files (MDC format)
│   ├── general.mdc            # Global project rules
│   ├── typescript.mdc         # TypeScript-specific rules
│   ├── testing.mdc            # Testing rules
│   ├── database.mdc           # Database rules
│   └── security.mdc           # Security rules
├── prompts/                   # Reusable prompts
│   ├── refactor.md            # Refactoring prompt
│   └── review.md              # Code review prompt
└── .cursorignore              # Files to exclude from context
```

### 2.2 Rule Files (MDC Format)

Cursor uses MDC (Markdown Components) format with YAML frontmatter:

```markdown
---
description: TypeScript coding conventions for this project
globs:
  - "**/*.ts"
  - "**/*.tsx"
alwaysApply: false
---

# TypeScript Conventions

## Type Safety
- Enable strict mode in tsconfig.json
- Never use `any` — use `unknown` and narrow types
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use `satisfies` operator for type-safe configurations
- Always specify return types for exported functions

## Patterns
- Use discriminated unions for state management
- Prefer `Result<T, E>` pattern over throwing exceptions
- Use branded types for IDs: `type UserId = string & { __brand: 'UserId' }`

## Imports
```typescript
// 1. Node built-ins
import { readFile } from 'node:fs/promises';

// 2. External packages
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// 3. Internal packages
import { logger } from '@repo/shared';

// 4. Local imports
import { validateUser } from '@/lib/validation';
import { UserCard } from './UserCard';

// 5. Type-only imports
import type { User, Session } from '@/types';
```
```

```markdown
---
description: Database and Prisma conventions
globs:
  - "packages/db/**"
  - "**/prisma/**"
  - "**/*.prisma"
alwaysApply: false
---

# Database Conventions

## Schema Design
- Use UUID v7 for primary keys (time-sortable)
- Always include `createdAt` and `updatedAt` timestamps
- Use soft deletes with `deletedAt` nullable DateTime
- Define explicit relation names for self-referencing models
- Add database indexes for frequently queried fields

## Prisma Patterns
```typescript
// Always use select/include to avoid over-fetching
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    profile: {
      select: { displayName: true, avatar: true }
    }
  }
});

// Use transactions for multi-step operations
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  await tx.auditLog.create({
    data: { action: 'USER_CREATED', userId: user.id }
  });
  return user;
});
```

## Migration Rules
- Migration names must be descriptive: `add_user_profile_table`
- Never modify existing migrations
- Always test migrations with `pnpm db:migrate:dev` before committing
- Include rollback instructions in migration comments
```

### 2.3 Cursorignore Configuration

```
# .cursor/.cursorignore
# Exclude large generated files from context
node_modules/
.next/
dist/
build/
coverage/
*.lock
*.map
.git/
__generated__/

# Exclude binary files
*.png
*.jpg
*.gif
*.ico
*.woff
*.woff2

# Exclude large data files
*.csv
*.sql
fixtures/large-*.json
```

### 2.4 Glob Pattern Strategies

```
┌──────────────────────────────────────────────────────────────┐
│ Pattern                  │ Matches                           │
├──────────────────────────────────────────────────────────────┤
│ **/*.ts                  │ All TypeScript files               │
│ src/app/**/route.ts      │ All API route handlers             │
│ src/components/**/*.tsx  │ All React components               │
│ **/tests/**              │ All test directories               │
│ packages/db/**           │ Entire database package            │
│ !**/*.test.ts            │ Exclude test files                 │
│ src/app/**/page.tsx      │ All page components                │
│ src/app/**/layout.tsx    │ All layout components              │
│ **/*.config.{ts,js,mjs}  │ All config files                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Gemini Configuration (`.gemini/`)

### 3.1 Directory Structure

```
.gemini/
├── settings.json          # Gemini CLI settings
├── GEMINI.md              # Primary instruction file (project root also works)
└── styleguide.md          # Optional style guide reference
```

### 3.2 GEMINI.md Instruction File

```markdown
# GEMINI.md

## Project Summary
This project is an e-commerce platform built with:
- Next.js 14 (App Router)
- TypeScript 5.4
- PostgreSQL 16 + Prisma ORM
- Redis for caching
- Stripe for payments

## Development Setup
```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Start database
docker compose up -d postgres redis

# Run migrations
pnpm db:migrate:dev

# Seed development data
pnpm db:seed

# Start development server
pnpm dev
```

## Code Conventions
- TypeScript strict mode — all files
- Functional components only
- Server Components by default
- Zod for all input validation
- Prisma for all database queries
- Error handling with Result type pattern
- No console.log in production code

## File Conventions
- Components: PascalCase.tsx
- Utilities: camelCase.ts
- Types: PascalCase.types.ts
- Tests: *.test.ts(x) colocated with source
- API Routes: app/api/[resource]/route.ts

## When Making Changes
1. Run `pnpm typecheck` to verify types
2. Run `pnpm lint` to check style
3. Run `pnpm test` to verify tests pass
4. Verify no unused imports remain
5. Ensure all new functions have JSDoc comments
```

### 3.3 Settings Configuration

```json
// .gemini/settings.json
{
  "codeExecution": {
    "allowedCommands": [
      "pnpm install",
      "pnpm build",
      "pnpm test",
      "pnpm lint",
      "pnpm typecheck",
      "pnpm dev",
      "npx prisma generate",
      "npx prisma migrate dev"
    ]
  }
}
```

---

## 4. Codex Configuration (`.codex/`)

### 4.1 Directory Structure

```
.codex/
└── AGENTS.md              # Primary Codex instruction file (also reads root AGENTS.md)
```

Codex also reads instructions from the root-level `AGENTS.md` file.

### 4.2 Codex AGENTS.md

```markdown
# AGENTS.md (Codex-Optimized)

## Sandbox Environment
Codex operates in a sandboxed environment. Keep in mind:
- No network access during code generation
- All dependencies must be pre-installed
- File access is scoped to the project directory
- Shell commands execute in the project root

## Setup Commands
Run these before starting work:
```bash
pnpm install
pnpm db:generate
```

## Project Structure
```
src/
├── app/          # Next.js App Router
├── components/   # React components
├── lib/          # Shared utilities
├── hooks/        # Custom React hooks
├── types/        # Type definitions
└── styles/       # CSS and Tailwind
```

## Code Patterns

### Creating a New API Route
```typescript
// src/app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  // define input schema
});

export async function GET(request: NextRequest) {
  try {
    const data = await prisma.resource.findMany();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Creating a New Component
```typescript
// src/components/ResourceCard.tsx
import type { Resource } from '@/types';

interface ResourceCardProps {
  resource: Resource;
  onSelect?: (id: string) => void;
}

export function ResourceCard({ resource, onSelect }: ResourceCardProps) {
  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{resource.name}</h3>
      <p className="text-gray-600">{resource.description}</p>
      {onSelect && (
        <button
          onClick={() => onSelect(resource.id)}
          className="mt-2 rounded bg-blue-500 px-4 py-2 text-white"
        >
          Select
        </button>
      )}
    </div>
  );
}
```

## Testing
- Framework: Vitest + React Testing Library
- Run: `pnpm test`
- Coverage: `pnpm test:coverage`
- Pattern: describe → it → arrange → act → assert
```

---

## 5. Windsurf Configuration (`.windsurf/`)

### 5.1 Directory Structure

```
.windsurf/
├── rules/                    # Cascade rule files
│   ├── global.md             # Always-active rules
│   ├── typescript.md         # TypeScript rules (auto-attached)
│   └── react.md              # React rules (auto-attached)
└── .windsurfignore           # Files to exclude from indexing
```

### 5.2 Rule Files

```markdown
<!-- .windsurf/rules/global.md -->
---
trigger: always
---

# Global Project Rules

## Project Type
Full-stack Next.js application with TypeScript.

## Key Commands
- Install: `pnpm install`
- Dev: `pnpm dev`
- Build: `pnpm build`
- Test: `pnpm test`
- Lint: `pnpm lint`

## Critical Rules
1. Use TypeScript for all files
2. No `any` types
3. Named exports only (except page.tsx/layout.tsx)
4. Functional components exclusively
5. All API inputs validated with Zod
```

```markdown
<!-- .windsurf/rules/react.md -->
---
trigger: glob
globs:
  - "**/*.tsx"
  - "**/*.jsx"
---

# React Component Rules

When working with React components:

1. Define props interface above component
2. Use explicit return types
3. Prefer composition over prop drilling
4. Use React.memo for expensive pure components
5. Extract custom hooks for reusable logic
6. Always handle loading and error states
7. Use Suspense boundaries at route level
```

### 5.3 Windsurfignore

```
# .windsurf/.windsurfignore
node_modules/
.next/
dist/
coverage/
*.lock
.git/
__generated__/
```

---

## 6. Per-Directory Instructions

### 6.1 Concept

Per-directory instructions allow you to scope agent behavior to specific parts of the
codebase. This is critical for monorepos and large projects where different directories
have different conventions.

### 6.2 Inheritance Model

```
project/
├── CLAUDE.md / AGENTS.md           ← Root: applies everywhere
├── apps/
│   ├── CLAUDE.md                   ← apps/: applies to all apps
│   ├── web/
│   │   ├── CLAUDE.md               ← web/: applies to web app only
│   │   └── src/
│   │       └── components/
│   │           └── CLAUDE.md       ← components/: most specific
│   └── mobile/
│       └── CLAUDE.md               ← mobile/: applies to mobile only
└── packages/
    ├── CLAUDE.md                   ← packages/: applies to all packages
    └── db/
        └── CLAUDE.md               ← db/: database-specific rules
```

### 6.3 Inheritance Resolution

```
Effective Rules = Root Rules + Nearest Ancestor Rules + Directory Rules

Resolution Order (highest priority wins):
1. Directory-specific rules (most specific)
2. Parent directory rules
3. Root rules (most general)

Merge Strategy:
- Additive: New rules are appended to parent rules
- Override: Explicitly marked overrides replace parent rules
- Never-Do: Always inherited, never overridden
```

### 6.4 Practical Examples

```markdown
<!-- Root CLAUDE.md -->
## Global Rules
- Use TypeScript strict mode
- Use pnpm as package manager
- Follow Conventional Commits
- All code must pass linting

## Global Never-Do
- Never commit secrets
- Never use eval()
```

```markdown
<!-- apps/web/CLAUDE.md -->
## Web Application Rules
(Extends root CLAUDE.md)

### Framework
- Next.js 14 App Router
- React 18 with Server Components

### Routing
- File-based routing in `src/app/`
- Dynamic routes use `[param]` syntax
- API routes in `src/app/api/`

### State Management
- React Context for theme/auth state
- URL params for filter/pagination state
- Server state managed by React Query

### Styling
- Tailwind CSS exclusively
- Design tokens in `tailwind.config.ts`
- No CSS modules or styled-components
```

```markdown
<!-- packages/db/CLAUDE.md -->
## Database Package Rules
(Extends root CLAUDE.md)

### Schema Changes
1. Always create a migration for schema changes
2. Never modify existing migration files
3. Test migrations with `pnpm db:migrate:dev`
4. Include seed data for new tables

### Query Patterns
- Always use `select` or `include` to limit fields
- Use transactions for multi-table operations
- Add indexes for columns used in WHERE clauses
- Use `findUnique` when querying by primary key

### Performance
- No N+1 queries — use `include` for relations
- Limit result sets with `take` and `skip`
- Use `count` instead of fetching all records to count
```

---

## 7. Instruction Override Patterns

### 7.1 Explicit Override Syntax

```markdown
<!-- Override marker for agent parsers -->
## Override: Code Style

> ⚠️ OVERRIDE: The following rules replace the root Code Style section.

- In this directory, use CSS Modules instead of Tailwind
- Component files use `.module.scss` for styling
- BEM naming convention for CSS classes
```

### 7.2 Conditional Instructions

```markdown
## Conditional Rules

### When creating new components:
- Create test file alongside component
- Add Storybook story if component is in `shared/`
- Export from directory index file

### When modifying existing components:
- Update existing tests to cover changes
- Check for breaking changes in consumers
- Update Storybook stories if props changed

### When deleting components:
- Search for all imports of the component
- Update or remove all consumers
- Remove from index file exports
- Delete associated test and story files
```

### 7.3 Platform-Conditional Rules

```markdown
## Platform-Specific Instructions

<!-- These sections are only relevant to specific agents -->

### For Claude Code:
- Use `bash` tool to run build commands
- Read file contents before editing
- Create branches with `git checkout -b feat/description`

### For Cursor:
- Use Composer for multi-file refactors
- Reference files with @-mentions
- Use inline edits for small changes

### For Codex:
- Pre-install dependencies before generating code
- All code runs in sandbox — no network access
- Test commands must work offline

### For Windsurf:
- Cascade can run terminal commands directly
- Use the file search to find related code
- Apply rules from .windsurf/rules/ automatically
```

---

## 8. Cross-Platform Configuration Matrix

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Feature               │ Claude   │ Cursor    │ Gemini   │ Codex   │ WS  │
├──────────────────────────────────────────────────────────────────────────┤
│ Instruction file      │ CLAUDE.md│ .mdc files│ GEMINI.md│ AGENTS.md│ .md │
│ Config directory      │ .claude/ │ .cursor/  │ .gemini/ │ .codex/ │.ws/ │
│ Per-dir instructions  │ ✅       │ via globs │ ❌       │ ❌      │globs│
│ Custom commands       │ ✅       │ ❌        │ ❌       │ ❌      │ ❌  │
│ Glob-based rules      │ ❌       │ ✅        │ ❌       │ ❌      │ ✅  │
│ Permission control    │ ✅       │ ❌        │ ✅       │ sandbox │ ❌  │
│ Ignore file           │ ❌       │ ✅        │ ❌       │ ❌      │ ✅  │
│ Always-apply rules    │ ✅       │ ✅        │ ✅       │ ✅      │ ✅  │
│ Conditional trigger   │ manual   │ ✅        │ manual   │ manual  │ ✅  │
│ Settings JSON         │ ✅       │ ❌        │ ✅       │ ❌      │ ❌  │
│ Root AGENTS.md        │ ✅       │ ❌        │ ✅       │ ✅      │ ❌  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Universal Instruction File

For projects that need to support multiple AI agents, create a universal instruction
strategy:

```markdown
<!-- AGENTS.md — Universal Instruction File -->
# Repository Instructions

> This file provides instructions for all AI agents. Platform-specific
> configurations are in their respective directories (.claude/, .cursor/, etc.)

## Quick Start
1. Install: `pnpm install`
2. Setup: `cp .env.example .env.local`
3. Database: `pnpm db:migrate:dev && pnpm db:seed`
4. Develop: `pnpm dev`
5. Test: `pnpm test`
6. Lint: `pnpm lint && pnpm typecheck`

## Conventions
[universal conventions that apply regardless of agent]

## Constraints
[universal constraints]

## See Also
- Claude Code: `.claude/CLAUDE.md`
- Cursor: `.cursor/rules/*.mdc`
- Gemini: `.gemini/GEMINI.md`
- Windsurf: `.windsurf/rules/*.md`
```

### 9.1 Sync Script

```python
#!/usr/bin/env python3
"""Sync universal AGENTS.md content to platform-specific instruction files."""

import re
from pathlib import Path
from typing import Dict, List


def parse_agents_md(content: str) -> Dict[str, str]:
    """Parse AGENTS.md into sections."""
    sections = {}
    current_section = ""
    current_content = []
    
    for line in content.splitlines():
        if line.startswith("## "):
            if current_section:
                sections[current_section] = "\n".join(current_content)
            current_section = line[3:].strip()
            current_content = []
        else:
            current_content.append(line)
    
    if current_section:
        sections[current_section] = "\n".join(current_content)
    
    return sections


def generate_claude_md(sections: Dict[str, str]) -> str:
    """Generate CLAUDE.md from parsed sections."""
    output = ["# CLAUDE.md", ""]
    
    for section in ["Quick Start", "Conventions", "Constraints", "Never-Do List"]:
        if section in sections:
            output.append(f"## {section}")
            output.append(sections[section])
            output.append("")
    
    return "\n".join(output)


def generate_cursor_rules(sections: Dict[str, str]) -> str:
    """Generate Cursor MDC rule file from parsed sections."""
    output = [
        "---",
        "description: Project conventions synced from AGENTS.md",
        "globs:",
        '  - "**/*"',
        "alwaysApply: true",
        "---",
        "",
    ]
    
    for section in ["Conventions", "Constraints"]:
        if section in sections:
            output.append(f"# {section}")
            output.append(sections[section])
            output.append("")
    
    return "\n".join(output)


def sync_instructions(root: Path) -> None:
    """Sync AGENTS.md to platform-specific files."""
    agents_md = root / "AGENTS.md"
    if not agents_md.exists():
        print("No AGENTS.md found")
        return
    
    sections = parse_agents_md(agents_md.read_text())
    
    # Generate Claude CLAUDE.md
    claude_dir = root / ".claude"
    claude_dir.mkdir(exist_ok=True)
    (claude_dir / "CLAUDE.md").write_text(generate_claude_md(sections))
    print("Updated .claude/CLAUDE.md")
    
    # Generate Cursor rules
    cursor_dir = root / ".cursor" / "rules"
    cursor_dir.mkdir(parents=True, exist_ok=True)
    (cursor_dir / "synced-conventions.mdc").write_text(
        generate_cursor_rules(sections)
    )
    print("Updated .cursor/rules/synced-conventions.mdc")
    
    print("Sync complete!")


if __name__ == "__main__":
    sync_instructions(Path("."))
```

---

## 10. Instruction Testing

### 10.1 Validation Script

```python
#!/usr/bin/env python3
"""Validate repository instruction files."""

import json
import sys
from pathlib import Path


def validate_commands(content: str, root: Path) -> list[str]:
    """Check that documented commands actually work."""
    errors = []
    
    # Extract commands from code blocks
    import re
    code_blocks = re.findall(r'`([^`]+)`', content)
    
    pkg_json = root / "package.json"
    if pkg_json.exists():
        pkg = json.loads(pkg_json.read_text())
        scripts = pkg.get("scripts", {})
        
        for cmd in code_blocks:
            if cmd.startswith("pnpm "):
                script_name = cmd.replace("pnpm ", "").split(" ")[0]
                if script_name not in scripts and script_name != "install":
                    errors.append(f"Command '{cmd}' references non-existent script '{script_name}'")
    
    return errors


def validate_paths(content: str, root: Path) -> list[str]:
    """Check that documented paths exist."""
    errors = []
    
    import re
    paths = re.findall(r'`((?:src|packages|apps|lib|docs)/[^`]+)`', content)
    
    for path_str in paths:
        # Skip glob patterns
        if '*' in path_str or '[' in path_str:
            continue
        
        full_path = root / path_str
        if not full_path.exists():
            errors.append(f"Referenced path does not exist: {path_str}")
    
    return errors


def main():
    root = Path(".")
    all_errors = []
    
    instruction_files = [
        "AGENTS.md",
        ".claude/CLAUDE.md",
        ".gemini/GEMINI.md",
    ]
    
    for filename in instruction_files:
        filepath = root / filename
        if filepath.exists():
            content = filepath.read_text()
            
            errors = validate_commands(content, root)
            errors += validate_paths(content, root)
            
            if errors:
                print(f"\n❌ {filename}:")
                for error in errors:
                    print(f"  - {error}")
                all_errors.extend(errors)
            else:
                print(f"✅ {filename}: valid")
    
    if all_errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
```

---

## 11. Best Practices

### 11.1 Instruction File Hygiene

1. **Keep instructions up to date** — Stale instructions are worse than no instructions
2. **Test all commands** — Every command in your instruction files should work
3. **Be specific** — "Use TypeScript 5.4 strict mode" not "Use TypeScript"
4. **Provide examples** — Show don't tell; include code patterns
5. **Version your instructions** — Track changes in instruction files
6. **Automate validation** — CI should verify instruction file accuracy

### 11.2 Common Mistakes

```
┌──────────────────────────────────────────────────────────────┐
│ Mistake                        │ Impact                      │
├──────────────────────────────────────────────────────────────┤
│ Vague project description      │ Agent makes wrong assumptions│
│ Outdated build commands        │ Agent fails to build/test    │
│ Missing directory structure    │ Agent creates files in wrong │
│                                │ locations                    │
│ No never-do list               │ Agent may violate critical   │
│                                │ constraints                  │
│ Contradictory rules across     │ Agent receives conflicting   │
│ platforms                      │ instructions                 │
│ Too many rules                 │ Agent may ignore important   │
│                                │ rules due to context limits  │
│ No examples                    │ Agent guesses at patterns    │
└──────────────────────────────────────────────────────────────┘
```

---

## 12. Cross-References

- For AGENTS.md design patterns: `agents-md-design.md`
- For documentation structure: `structured-documentation.md`
- For convention files: `convention-constraint-files.md`
- For workspace setup: `workspace-configuration.md`
- For codebase navigation: `codebase-navigation-hints.md`

<!-- Compression: Repository-native instructions reference covering .claude/, .cursor/,
     .gemini/, .codex/, .windsurf/ configurations, per-directory instructions,
     instruction inheritance, override patterns, cross-platform matrix, and sync tooling -->
