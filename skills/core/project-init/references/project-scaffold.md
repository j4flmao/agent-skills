# Project Scaffolding Reference

## Scaffolding Commands per Stack

### NestJS
```bash
nest new project-name --strict --package-manager npm
cd project-name
mkdir -p src/modules src/shared src/config test
```

### Golang
```bash
mkdir -p project-name/{cmd/server,internal/{domain,application,infrastructure,config},api,migrations}
cd project-name
go mod init github.com/org/project-name
```

### Rust
```bash
cargo new project-name --lib
cd project-name
mkdir -p crates/{domain,application,infrastructure,api}/src
```

### FastAPI
```bash
mkdir -p project-name/src/{api/v1/endpoints,core,domain,application/use_cases,infrastructure/database,schemas}
cd project-name
python -m venv .venv
```

### Django
```bash
django-admin startproject config project-name
cd project-name
python -m venv .venv
mkdir -p apps static templates
```

### Spring Boot
```bash
mkdir -p project-name/src/{main/{java/com/project,resources},test/java/com/project}
```

### React
```bash
npm create vite@latest project-name -- --template react-ts
cd project-name
mkdir -p src/{app,features,shared/{components,hooks,utils},lib,assets}
```

### Vue
```bash
npm create vue@latest project-name
cd project-name
mkdir -p src/{router,stores,features,shared/{components,composables},assets}
```

### Angular
```bash
ng new project-name --strict --routing --style=scss
cd project-name
mkdir -p src/app/{features,shared,core}
```

## Init Workflow

1. Detect or ask about stack
2. Generate folder tree preview
3. Show tree to user — wait for confirmation
4. Create directories
5. Write AGENTS.md
6. Write .gitignore
7. Write docs/ skeleton (decisions/, stories/, specs/)

## AGENTS.md Template

```markdown
# Project Rules
Stack: {stack}
Framework: {framework}
Test: {inferred test command}
Lint: {inferred lint command}
Build: {inferred build command}
Conventions: conventional commits, test before commit
```

## .gitignore Essentials

```
node_modules/
target/
build/
dist/
.env
*.log
.DS_Store
coverage/
.idea/
*.iml
.vscode/
```

## docs/ Skeleton

```
docs/
├── decisions/    # ADRs
├── stories/      # User stories
└── specs/        # Technical specs
```
