---
name: dev-loop-dev-container
description: >
  Use this skill when the user says 'dev container', 'development container', 'devcontainer.json', 'VS Code devcontainer', 'development environment', 'dev environment setup', 'containerized dev', 'remote container'. Produces devcontainer.json configuration and Docker setup for consistent development environments. Do NOT use for: production Docker configuration or CI pipelines.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, container, dev-environment, phase-7]
version: "2.0.0"
author: "j4flmao"
license: "MIT"
---

# Dev Loop Dev Container

## Purpose
Provision reproducible development environments using VS Code Dev Containers. Defines container images, tooling, extensions, and service dependencies so every team member works in an identical environment regardless of host OS.

Eliminates "works on my machine" by baking the entire development environment into a container definition checked into version control. Every dependency, tool, VS Code extension, and service is version-pinned and declared in `.devcontainer/`. New team members go from clone to running application in one command — `git clone` then `Reopen in Container`. No Brewfiles. No manual system installs. No "oh, you need to install PostgreSQL 16 specifically." The configuration is deterministic, auditable, and reproducible across macOS, Windows, and Linux hosts.

The dev container becomes the single source of truth for the development environment. If something is missing from the container definition, it is a bug in the configuration, not a missing manual step. This shifts the burden of environment maintenance from every individual developer to one shared configuration file that improves over time.

## Agent Protocol

### Trigger
"dev container", "development container", "devcontainer.json", "VS Code devcontainer", "development environment", "dev environment setup", "containerized dev", "remote container"

### Input Context
- Project language and runtime: Node.js (18/20/22), Python (3.11/3.12), Go (1.21/1.22), Rust (1.75+), Java (17/21), .NET (8/9), Ruby (3.2/3.3), PHP (8.2/8.3)
- Required CLI tools and their purpose: git (version control), curl (HTTP requests), jq (JSON processing), gh (GitHub CLI), docker (container builds), make (task runner), httpie (API testing), ripgrep (code search), fd (file search)
- Service dependencies with specific versions: PostgreSQL 16, Redis 7.2, RabbitMQ 3.13, Kafka 3.6, MinIO latest, MailHog (for catching dev emails), Elasticsearch 8.x
- VS Code extensions: language intelligence (ESLint, Prettier, Python, Go, rust-analyzer, Java extension pack), debuggers (Node.js, Python, Chrome), test runners (Jest, pytest, vitest), supporting tools (YAML, Docker, markdownlint, GitLens, GitHub Pull Requests)
- Environment variables and their sources: which are public defaults, which come from .env files, which come from the host machine's secrets
- Port mapping: web app port (3000, 5173, 8080), API port (4000, 8000), database ports (5432, 6379, 5672), debugger ports (9229, 5858), admin UI ports (15672, 9001)

### Output Artifact
- `.devcontainer/devcontainer.json` — primary configuration: image or Dockerfile path, features, mounts, customizations, post-create and post-start commands, port forwards, remote user
- `.devcontainer/Dockerfile` — multi-stage Dockerfile for custom base image (only needed when devcontainers registry images are insufficient)
- `.devcontainer/docker-compose.yml` — multi-service orchestration for databases, caches, queues, and supporting services (only needed when the project depends on external services)
- Post-create and post-start shell scripts for automation of setup and startup tasks

### Response Format
- File contents rendered as complete, independently valid code blocks with language-appropriate syntax highlighting
- Inline comments in JSONC, YAML, and Dockerfile annotating each significant setting with its purpose
- Each config file is complete and independently usable — no hidden cross-file dependencies or external URLs required
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
Project has a working dev container configuration in `.devcontainer/`. Running `Reopen in Container` in VS Code opens the project with all tools, extensions, and service dependencies operational. The developer can start the dev server, hit the health endpoint, and get a 200 response without any manual intervention.

### Max Response Length
3000 tokens

## Architecture

### Dev Container System Architecture
```
┌─────────────────────────────────────────────────────┐
│                      Host Machine                     │
│  macOS / Windows / Linux                             │
│  Docker Desktop or Docker Engine                     │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│              Dev Container Runtime                    │
│  VS Code Server (headless) or Cursor                │
│  Language servers, debuggers, terminal              │
│  Extensions: ESLint, Prettier, GitLens, etc.        │
├─────────────────┬───────────────────────────────────┤
│   ┌─────────────▼─────────────┐  ┌────────────────┐ │
│   │   App Container           │  │  PostgreSQL    │ │
│   │   Node.js 20 + deps       │  │  Redis         │ │
│   │   Source code (mount)     │  │  RabbitMQ      │ │
│   │   git config, SSH keys    │  │  (docker-compose)│
│   └───────────────────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Decision Tree: Dev Container Configuration
```
Project complexity?
├── Simple (single runtime, no external services)
│   → Use `image` property with devcontainers registry image
│   → Example: "image": "mcr.microsoft.com/devcontainers/typescript-node:20"
│   → Add features for additional tools
├── Moderate (single runtime + 1-2 services)
│   → Use `build` property with custom Dockerfile
│   → docker-compose.yml for services (PostgreSQL, Redis)
│   → Wire hostnames via containerEnv or .env
└── Complex (multiple runtimes, 3+ services, microservices)
    → Full docker-compose.yml with app service + all dependencies
    → Multi-stage Dockerfile for each service
    → Init scripts for database seeding
    → Health check dependencies in postStartCommand
```

## Workflow

1. **Define dev container** — Create `.devcontainer/devcontainer.json`. Choose between `image` (pointing to a prebuilt container from the devcontainers registry — best for standard stacks) or `build` (referencing a local Dockerfile — best when custom system packages are needed). Add `features` from the devcontainers registry for commonly needed tools: `ghcr.io/devcontainers/features/git:1` for Git, `ghcr.io/devcontainers/features/docker-outside-of-docker:1` for Docker access, `ghcr.io/devcontainers/features/github-cli:1` for GitHub CLI. Configure `mounts` for host resources: SSH keys from `~/.ssh`, Git configuration from `~/.gitconfig`, npm or Gem credentials from `~/.npmrc` or `~/.gem/credentials`, shell history for persistence across rebuilds. Set `remoteUser` to `vscode` or a project-specific non-root user for security and filesystem permission compatibility.

2. **Configure tooling** — Set Git user name and email either through a dotfiles repository or via a `postCreateCommand` script that runs `git config --global user.name` and `git config --global user.email`. Install and configure shell preferences: zsh as default shell, oh-my-zsh with plugins (git, docker, npm, node, kubectl, history-substring-search), Powerlevel10k theme for a fast and informative prompt, useful aliases (`ga` for git add, `gc` for git commit, `gp` for git push, `gst` for git status, `dcup` for docker compose up, `dcdown` for docker compose down). List VS Code extensions in `customizations.vscode.extensions` array — organize by category with comments: language extensions first, then linters and formatters, then debuggers, then productivity tools. Set editor defaults in `customizations.vscode.settings`: `editor.formatOnSave: true`, `editor.defaultFormatter` per language, `editor.codeActionsOnSave: { "source.fixAll": "explicit" }` for auto-lint on save, `files.autoSave: "onFocusChange"`, `terminal.integrated.defaultProfile.linux: "zsh"`, `workbench.colorTheme` for consistent visuals.

3. **Add service dependencies** — Create `.devcontainer/docker-compose.yml` when the project needs external services like databases, caches, or queues. Structure the compose file with one service for the dev container itself (using `build: .` or `image:` with a `command: sleep infinity` to keep it alive) and one service per dependency. For PostgreSQL: set the image tag (`postgres:16-alpine`), configure environment variables (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`), add a health check, and optionally mount init scripts. For Redis: use `redis:7-alpine` with `appendonly: yes` for persistence. For RabbitMQ: enable the management plugin with additional environment variables and expose port 15672. For MailHog: use the `mailhog/mailhog` image with SMTP port 1025 and UI port 8025. Wire service hostnames into devcontainer.json `runServices` so they auto-start, and update the application configuration to point at these internal hostnames.

4. **Establish dev workflow** — `postCreateCommand` (runs once after the container image is built, ideal for expensive operations): installs project dependencies (`npm install`, `pip install -r requirements.txt`, `bundle install`, `cargo build`), sets up Git hooks (pre-commit via husky or lefthook, commit-msg for conventional commits), creates `.env` file from `.env.example` with default values, and runs any one-time setup scripts. `postStartCommand` (runs every time the container starts, ideal for idempotent operations): applies database migrations (`npx prisma migrate deploy`, `python manage.py migrate`), runs seed scripts if the database is empty, verifies that all dependent services are reachable, and starts any background watchers (file watchers, test watchers). Configure `forwardPorts` array with every port the developer needs to access from the host. Add `portsAttributes` object to assign human-readable labels and visibility settings to each port.

5. **Configure environment inheritance** — Define how environment variables flow into the container. Three sources: `containerEnv` in devcontainer.json for static defaults (e.g., `NODE_ENV=development`), `.env` file support via `runArgs: ["--env-file", ".env"]` for project-specific secrets, and host mounts for personal credentials (SSH, git config, npmrc). Never store secrets in the devcontainer.json or Dockerfile. Use `containerEnv` only for non-sensitive defaults. Document required environment variables in the project README with instructions for setting them up.

6. **Test on a clean clone** — The ultimate validation is cloning the repository to a fresh directory on a different machine and opening in VS Code. Steps: clone the repo, open in VS Code, accept "Reopen in Container" prompt, verify the container builds without errors, verify all services start (PostgreSQL accepting connections, Redis ping succeeds), verify the development server starts and is accessible from the host browser, run the test suite to confirm the environment is fully functional. Document any manual steps required as configuration bugs to fix.

7. **Iterate and maintain** — The dev container configuration evolves with the project. Update it when: adding new language runtimes or tools, adding new service dependencies, changing Node.js/Python/Go versions, updating VS Code extension recommendations, changing port mappings. Review the configuration quarterly to remove unused tools and services. Keep the dev container lean — each unnecessary tool adds build time and image size. Track configuration changes in version control with descriptive commit messages.

## Models

### Dev Container File Structure
```
.devcontainer/
├── devcontainer.json     # Primary config: image, features, extensions, commands
├── Dockerfile            # Custom image definition (optional)
├── docker-compose.yml    # Multi-service orchestration (optional)
└── setup.sh              # Post-create setup script (optional, for complex setup)
```

### Service Port Mapping
| Service | Internal Port | Forwarded Port | Label |
|---|---|---|---|
| Web App | 3000 | 3000 | "Application" |
| PostgreSQL | 5432 | 5432 | "Database" |
| Redis | 6379 | 6379 | "Cache" |
| MailHog UI | 8025 | 8025 | "Email UI" |
| Inspector | 9229 | 9229 | "Debugger" |

### Configuration Variants
| Approach | Image Source | Services | Best For |
|----------|-------------|----------|----------|
| Single image | DevContainers registry | None | Simple apps, static sites |
| Dockerfile | Custom Dockerfile | None | Apps needing system packages |
| Docker Compose | Dockerfile + compose | Databases, queues, caches | Full-stack apps, microservices |

## Rules

- **Pin base image versions** — Never use `latest`. Always use concrete version tags: `node:20-bookworm`, `python:3.12-slim`, `golang:1.22-bookworm`, `mcr.microsoft.com/devcontainers/base:ubuntu-22.04`. Pinned versions ensure reproducible environments.
- **Mount workspace, never copy** — Use `workspaceMount` in devcontainer.json and bind mounts in docker-compose.yml. Never COPY source code into the image — that pattern is for production builds, not development.
- **Keep image size small** — Use multi-stage builds in Dockerfile so the final dev stage contains only what development needs. Clean apt caches in the same RUN layer with `&& rm -rf /var/lib/apt/lists/*`. Combine multiple RUN commands with `&&`.
- **Document every service port** — In devcontainer.json, add inline comments mapping port numbers to service names. Developers should not need to read docker-compose.yml to find where PostgreSQL is running.
- **Validate on a clean clone** — The ultimate test is cloning the repository into a brand new directory on a different machine and opening in VS Code. Any manual step required means the config is incomplete.
- **Self-contained compose file** — The devcontainer compose file references no external URLs or files outside `.devcontainer/`. It must work offline after the initial image pull.
- **Secrets never in the image** — Use host mount bindings for SSH keys (`~/.ssh`), use `containerEnv` in devcontainer.json for environment variable defaults, and use VS Code's built-in secrets API for sensitive values. Hardcoded credentials in the image or compose file are a security risk.
- **Non-root user is the default** — Set `remoteUser` to `vscode` or a project-specific user. Running as root inside the container can cause filesystem permission mismatches on mounted directories, especially when the host is macOS or Linux.
- **Health checks for all dependent services** — Every service in docker-compose.yml must have a `healthcheck` block. The postStartCommand should wait for all health checks to pass before running migrations or starting the dev server.
- **Idempotent lifecycle scripts** — Both postCreateCommand and postStartCommand must be idempotent. Running them multiple times should produce the same result. Use conditional checks: `if [ ! -f .env ]; then cp .env.example .env; fi`.
- **Dotfiles repository for personalization** — Encourage developers to use a dotfiles repository for personal shell preferences, Git aliases, and custom tooling. The dev container provides the shared baseline; dotfiles provide the personal layer.
- **Document required VS Code settings** — In the project README, document any VS Code settings that are required but cannot be automated (e.g., specific theme, font, or keybinding preferences).

## Common Pitfalls

- **Using `latest` tag**: Base image `latest` tag produces different environments at different points in time. Always pin to a specific version tag for reproducibility.
- **Missing health checks**: Without health checks, the dev server may start before PostgreSQL is ready, causing connection errors. All services need health checks with `depends_on: condition: service_healthy`.
- **Root user permissions**: Running as root inside the container creates files owned by root on the host filesystem, causing permission errors when the host user tries to edit or delete them.
- **Slow image builds**: Installing unnecessary system packages, not combining RUN commands, and not cleaning apt caches all contribute to slow builds. Keep the Dockerfile lean.
- **Forgotten port forwards**: Developers need to know which ports to access. If a port is not in `forwardPorts`, they may assume the service is not running. Document all service ports.
- **Non-idempotent setup scripts**: If `postCreateCommand` fails on the second run because it tries to create an already-existing resource, debugging is frustrating. Always make scripts idempotent.
- **Git config not configured**: Without `git config user.name` and `user.email` set in the container, commits are attributed to the container's default user. Configure this in postCreateCommand.
- **Hardcoded environment variables**: Database passwords, API keys, and secrets in devcontainer.json or Dockerfile are security risks and make the configuration non-portable across team members.

## Compared With

| Approach | Reproducibility | Setup Time | Flexibility | Team Adoption |
|----------|----------------|------------|-------------|---------------|
| Dev Containers (VS Code) | High (pinned versions) | First build: 2-10 min | High (custom Dockerfile) | High |
| Dev Containers (Cursor) | High | First build: 2-10 min | High | Medium (Cursor-specific) |
| Docker Compose only | Medium (no editor config) | First build: 2-10 min | High | Medium |
| Vagrant | High (VM-based) | First build: 10-30 min | Very High (full VM) | Low (slow, heavy) |
| Nix + direnv | Very High (pure functional) | First eval: 2-20 min | High (Nix ecosystem) | Low (steep learning) |
| Manual setup script | Low (OS-dependent) | 10-60 min per dev | High (any OS commands) | Low (fails on edge cases) |
| Cloud IDE (GitHub Codespaces) | High | First start: 1-5 min | Medium (VS Code only) | High (no local setup) |

## Performance

- First build time: 2-10 minutes depending on image size, network speed, and number of features
- Subsequent rebuilds: 10-30 seconds (layer caching when Dockerfile changes, instant when only source changes)
- Image size: DevContainers base images range from 500MB (slim variants) to 2GB (full with tools)
- Memory usage: container typically uses 200-800MB on host depending on runtime and services
- CPU overhead: near-zero for compute, 5-10% for filesystem operations on macOS (osxfs translation layer)
- Docker Compose startup: 10-30 seconds for all services to pass health checks
- VS Code Server start: 3-8 seconds from container start to editor ready
- Disk usage: Docker images + container layers typically consume 1-5GB per project
- Cross-platform: Linux has best performance (native Docker), macOS uses Hyper-V VM (15-20% filesystem overhead), Windows uses WSL2 (near-native performance)

## Tooling

| Tool | Category | Use Case |
|------|----------|----------|
| VS Code Dev Containers extension | Runtime | Primary container management |
| Cursor Dev Containers | Runtime | Alternative IDE support |
| GitHub Codespaces | Cloud runtime | Cloud-hosted dev containers |
| Docker Desktop | Container engine | Local container runtime (macOS/Windows) |
| Podman | Container engine | Container runtime (Linux, daemonless) |
| devcontainer CLI | CLI | Build and run without VS Code |
| devcontainers CLI (GitHub) | CLI | CI-based dev container testing |
| Docker Compose | Orchestration | Multi-service dev environment |
| devcontainer features | Tool registry | Community-maintained tool installers |
| dotfiles repository | Personalization | Developer-specific shell and tool config |
| Renovate / Dependabot | Maintenance | Automated version updates for base images |

## Related Skills

- **code-review** — Review the dev container configuration for security and best practices
- **refactor-guide** — Restructure existing Dockerfiles and compose files into the dev container pattern
- **git-workflow** — Commit and push the new .devcontainer configuration
- **debugging-strategy** — Debug container build failures, dependency issues, and port conflicts

## References
  - references/dev-container-advanced.md — Dev Container Advanced Topics
  - references/dev-container-fundamentals.md — Dev Container Fundamentals
  - references/devcontainer-advanced.md — Advanced Dev Container Configuration
  - references/devcontainer-setup.md — Dev Container Setup Reference
  - references/dockerfile-patterns.md — Dockerfile Patterns for Dev Containers
  - references/vscode-extensions.md — VS Code Extensions for Dev Containers
  - references/dev-container-multi-service.md — Dev Container Multi-Service Configuration
  - references/dev-container-security-hardening.md — Dev Container Security Hardening
## Handoff
master-orchestrator. After the dev container configuration is created, tested on a clean clone, and committed, hand off to master-orchestrator for the next development task.
