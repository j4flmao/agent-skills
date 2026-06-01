# Project Init Advanced Topics

## Multi-Module and Monorepo Scaffolding

### Monorepo Structure
For projects with multiple packages sharing codebase, use a monorepo structure:
```
packages/
  app/          # Frontend
  api/          # Backend
  shared/       # Shared types, utils, configs
  database/     # Migrations, seeds, schemas
  contracts/    # Smart contracts (if applicable)
```

### Monorepo Tool Selection
| Tool | Language | Strengths | Weaknesses |
|---|---|---|---|
| pnpm workspaces | TypeScript/JS | Fast, strict isolation | Node only |
| Turborepo | TypeScript/JS | Parallel builds, caching | Node only |
| Nx | TypeScript/JS, Go, Python | Multi-language, generators | Complex config |
| Cargo workspace | Rust | Native Rust support | Rust only |
| Go workspace | Go | Native Go support | Go only |
| Bazel | Polyglot | Correct by default, remote caching | Steep learning curve |

### Cargo Workspace (Rust)
For Rust monorepos in the blockchain context:
```toml
[workspace]
members = [
    "crates/core",
    "crates/consensus",
    "crates/networking",
    "crates/storage",
    "crates/api",
]
resolver = "2"
```

## Polyrepo Strategy

### When to Choose Polyrepo
- Independent teams with independent deployment cycles
- Strict security boundaries between components
- Different tech stacks for different services
- Different release cadences (core protocol vs tools vs frontend)
- Regulatory or compliance separation requirements

### Cross-Repo Coordination
- Use git submodules or subtree for shared configs sparingly
- Maintain a shared types/contracts package published to a registry
- CI/CD should be independent per repo with cross-repo integration tests triggered by webhook
- Version all cross-repo APIs with semantic versioning and migration guides

## Template Customization

### Adding New Stack Templates
When creating a new template:
1. Research the community-standard folder structure for that stack
2. Follow existing conventions (kebab-case dirs, src/ for source)
3. Include stack-specific config file placeholders (.eslintrc, tsconfig, Cargo.toml)
4. Add stack-specific entries to AGENTS.md (test command, lint command, build command)

### Mixing Stacks
For projects that use multiple languages (e.g., Rust backend + TypeScript frontend):
- Separate by top-level directory: `backend/` and `frontend/`
- Each top-level directory uses its own stack template internally
- Root level has shared: `.gitignore`, `AGENTS.md`, `docs/`, `Makefile`
- Root .gitignore combines patterns from both stacks

## Production-Grade Defaults

### .gitignore Patterns by Stack

**TypeScript/Node**: node_modules/, dist/, build/, coverage/, .env, *.log, .next/, .cache/

**Rust**: target/, Cargo.lock (keep for applications), *.wasm

**Go**: bin/, vendor/ (if used), *.exe

**Python**: __pycache__/, *.pyc, .venv/, *.egg-info/, dist/, .mypy_cache/, .pytest_cache/

**Solidity**: artifacts/, cache/, typechain-types/, broadcasts/

### CI/CD Placeholder Placements
- GitHub Actions: `.github/workflows/ci.yml`
- GitLab CI: `.gitlab-ci.yml`
- CircleCI: `.circleci/config.yml`
- Jenkins: `Jenkinsfile`
- Buildkite: `.buildkite/pipeline.yml`
