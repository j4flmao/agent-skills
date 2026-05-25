---
name: project-init
description: >
  Use this skill when the user says 'create project structure', 'scaffold project', 'initialize project', 'set up folder structure', 'new project from scratch', or when a new project needs folders and config files created. This skill scaffolds the full project tree based on detected or stated stack and creates AGENTS.md with project-specific rules. Do NOT use for: adding files to an existing project, planning features, or installing dependencies.
version: "1.0.0"
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

## Agent Protocol

### Trigger
Exact user phrases: "create project structure", "scaffold project", "initialize project", "set up folder structure", "new project from scratch", "create new project", "start new project".

### Input Context
Before activating, verify:
- User has specified or you have detected: backend stack, frontend framework, monorepo preference.
- Working directory is the parent of the intended project.
- If user says "scaffold" without specifying stack, ask: "Which backend stack? (nestjs, golang, rust, fastapi, django, spring, none)"

### Output Artifact
- Creates directories and placeholder files.
- Writes `AGENTS.md` at project root.
- Writes `.gitignore` at project root.
- Writes `docs/` with skeleton folders.

### Response Format
After scaffolding, output exactly:
```
Scaffolded {project-name} at {path}.

Folders created: {n}
Config files: .gitignore, AGENTS.md, docs/
```

Then output the folder tree as a code block. No commentary. No congratulations.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Folder tree matches the selected stack template.
- [ ] AGENTS.md contains project-specific rules.
- [ ] .gitignore is stack-appropriate.
- [ ] docs/ has decisions/, stories/, specs/ subdirectories.
- [ ] User confirmed the folder tree before creation.
- [ ] No implementation code was written.

### Max Response Length
After creation: folder tree block (unlimited lines) + 2-line summary. No more.

## Workflow

### Step 1: Gather Requirements
Ask ONE question at a time. Do not list all questions.

First question: "Backend stack? (nestjs, golang, rust, fastapi, django, spring, none)"
Second question: "Frontend framework? (react, nextjs, vue, nuxt, angular, none)"
Third question: "Project name? (default: my-app)"

### Step 2: Generate Folder Tree as Markdown
Show the tree to the user. Wait for confirmation ("yes", "looks good", "proceed"). Do NOT create anything before confirmation.

### Step 3: Create Directories
Run commands to create the folder structure.

### Step 4: Write AGENTS.md
Write AGENTS.md containing:
- Stack and framework
- Testing command: (infer from stack)
- Lint command: (infer from stack)
- Build command: (infer from stack)
- Key architectural rules from the relevant skill
- Standard workflow: "run tests before commit", "follow conventional commits"

### Step 5: Write .gitignore
Standard .gitignore for the selected stack. Include at minimum: node_modules/, target/, build/, dist/, .env, *.log, .DS_Store, coverage/, .idea/, *.iml, .vscode/.

### Step 6: Write docs/ skeleton
Empty placeholder files:
- docs/decisions/.gitkeep
- docs/stories/.gitkeep
- docs/specs/.gitkeep

## Stack Templates

### NestJS
```
src/modules/ src/shared/ src/config/ test/
```

### Go
```
cmd/server/ internal/domain/ internal/application/ internal/infrastructure/ internal/config/ api/ migrations/
```

### Rust
```
crates/domain/src/ crates/application/src/ crates/infrastructure/src/ crates/api/src/
```

### FastAPI
```
src/api/v1/endpoints/ src/core/ src/domain/ src/application/use_cases/ src/infrastructure/database/ src/schemas/
```

### Django
```
config/settings/ apps/ static/ templates/
```

### Spring Boot
```
src/main/java/com/project/ src/main/resources/ src/test/java/com/project/
```

### React
```
src/app/ src/features/ src/shared/components/ src/shared/hooks/ src/shared/utils/ src/lib/ src/assets/
```

### Vue
```
src/router/ src/stores/ src/features/ src/shared/components/ src/shared/composables/ src/assets/
```

### Angular
```
src/app/features/ src/app/shared/ src/app/core/ src/assets/
```

## Rules
- Do NOT create any files before user confirms the folder tree.
- Do NOT write implementation code of any kind. Placeholders only.
- Do NOT run npm install, cargo build, or any dependency installation.
- AGENTS.md must be under 30 lines. Gitignore must be under 20 lines.
- If the project already exists, ask: "The directory {name} already exists. Overwrite specific files? (yes/no/list)"

## References
- `references/config-reference.md` — Project configuration files reference
- `references/config-templates.md` — Configuration templates for common stacks
- `references/project-scaffold.md` — Project scaffolding patterns and directory structures
- `references/stack-templates.md` — Stack-specific project templates and conventions

## Handoff
Output: Scaffolded project at {path}
Next skill: create-brief — to define what gets built.
Carry forward: project path, stack, framework.
