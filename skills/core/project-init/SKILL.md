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

## Handoff
Output: Scaffolded project at {path}
Next skill: create-brief — to define what gets built.
Carry forward: project path, stack, framework.
