# Project Init Fundamentals

## Core Principles

### Scaffold Before Code
Creating the project structure before any implementation code establishes architectural boundaries, naming conventions, and separation of concerns from day one. Refactoring a structure is significantly harder than setting it right initially. The scaffold communicates the architecture without a single line of business logic.

### Template Selection Matches Stack
Each technology stack has established conventions for project structure. A Go project follows `cmd/internal` layout. A NestJS project uses module-based organization. A Rust project uses cargo workspace with crate-based structure. Using stack-standard layouts reduces cognitive overhead for contributors and enables tooling to work correctly.

### AGENTS.md as Contract
The AGENTS.md file serves as a machine-readable and human-readable contract for how the project should be built, tested, and maintained. It contains the essential rules an AI agent needs to work correctly with this project. It replaces the need for agents to re-learn project conventions on each interaction.

## Key Concepts

### docs/ Skeleton
The docs/ directory with decisions/, stories/, and specs/ subdirectories provides:
- **decisions/**: Architecture Decision Records capturing why decisions were made. Essential for future maintainers to understand tradeoffs.
- **stories/**: User stories and requirements. Links implementation to business value.
- **specs/**: Technical specifications. Detailed design documents for complex features.

### Phase-0 Positioning
Project init is the first phase in a multi-phase workflow (Phase 0). It creates the container before content. Later phases (create-brief, implementation, testing, deployment) operate within the structure established here. Getting Phase 0 right ensures all downstream phases have a proper foundation.

### .gitignore Best Practices
- Framework-specific ignores (node_modules/, target/, build/)
- OS-specific ignores (.DS_Store, Thumbs.db)
- IDE ignores (.idea/, *.iml, .vscode/)
- Security-sensitive ignores (.env, *.key, *.pem, credentials.json)
- Build artifact ignores (dist/, coverage/, *.log)
- Dependency directory ignores (vendor/ for Go, .venv/ for Python)

## Deciding What to Scaffold

### Always Create
- Complete directory tree matching stack template
- AGENTS.md with stack-aware rules
- .gitignore with stack-appropriate patterns
- docs/ skeleton with decisions, stories, specs subdirectories
- .gitkeep files in empty directories

### Never Create
- Implementation code (no .ts, .rs, .go, .py, .java files with logic)
- No package.json, Cargo.toml, go.mod, or similar dependency files
- No Dockerfile, CI config, or deployment manifests
- No README.md (create-brief or similar skills handle this)

### Conditionally Create
- .editorconfig when team has established formatting standards
- .prettierrc for frontend projects
- Makefile for projects with multiple commands to orchestrate

## Common Mistakes

### Too Deep Nesting
Structures deeper than 4 levels create import path confusion and refactoring friction. Flat is better than nested. Group by domain/feature, not by technical layer.

### Mixing Concerns
A `src/utils/` directory becomes a junk drawer. Instead name directories by their domain purpose: `src/auth/`, `src/payments/`, `src/notifications/`. Each domain contains its own components, hooks, services, and tests.

### Implementation Code in Scaffold Phase
Writing "just a little" implementation code during scaffolding creates confusion about where the scaffold ends and the implementation begins. Strict separation: scaffold defines structure, not content.

### No User Confirmation
Creating files before the user confirms the tree leads to wasted work when the user wants a different structure. Always show the tree first, wait for explicit confirmation.
