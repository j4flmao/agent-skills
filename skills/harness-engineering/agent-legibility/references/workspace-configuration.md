# Workspace Configuration for Coding Agents

The environment an agent runs in determines whether its commands succeed and what it is allowed to do. This reference covers reproducible toolchains, dev containers, agent permission and sandbox settings, hooks, MCP/tool configuration and secrets handling at the workspace level.

## Goals

1. Reproducible: the agent gets the same toolchain as CI and humans.
2. Fast feedback: lint, typecheck and tests runnable locally in seconds to minutes.
3. Least privilege: agents can do the task, not everything.
4. Observable: actions are logged; dangerous ones are blocked or need approval.

## Toolchain Pinning

| Ecosystem | Pin with |
|-----------|----------|
| Node | `.nvmrc`/`.node-version`, `packageManager` field in `package.json` (Corepack), lockfile |
| Python | `.python-version`, `pyproject.toml` `requires-python`, `uv.lock` |
| Go | `go` and `toolchain` directives in `go.mod` |
| Rust | `rust-toolchain.toml` |
| Java | Gradle/Maven wrapper (`gradlew`, `mvnw`) + toolchains config |
| Multi-language | `mise.toml` / `.tool-versions` (asdf), or Nix flakes / devbox |

Agents read these files; prose like "use a recent Node" leads to mismatches.

## Task Runner as the Single Interface

Expose every routine action through one runner so agents and CI call the same commands:

```makefile
.PHONY: setup lint test test-one fmt
setup:    ## Install dependencies
	uv sync
lint:     ## Lint and typecheck
	uv run ruff check . && uv run mypy src
fmt:
	uv run ruff format .
test:
	uv run pytest -q
test-one: ## make test-one T=tests/test_orders.py::test_refund
	uv run pytest -q $(T)
```

`just`, npm scripts, `Taskfile.yml` or `mise` tasks serve the same purpose. CI should call these targets rather than re-implementing them.

## Dev Containers

```json
// .devcontainer/devcontainer.json
{
  "name": "orders",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:22",
  "features": {
    "ghcr.io/devcontainers/features/docker-outside-of-docker:1": {}
  },
  "postCreateCommand": "corepack enable && pnpm install --frozen-lockfile",
  "forwardPorts": [3000, 5432],
  "remoteEnv": { "DATABASE_URL": "postgres://app:app@db:5432/app" }
}
```

Containers give agents an isolated, disposable environment matching CI. Pair with `compose.yaml` for services. Pin image tags/digests for reproducibility.

## Agent Permission Settings

Most agent tools support allow/deny lists for commands and file access. Example (Claude Code `settings.json`; other tools have equivalents):

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm test:*)",
      "Bash(pnpm lint)",
      "Bash(git status)",
      "Bash(git diff:*)"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./secrets/**)",
      "Bash(git push:*)",
      "Bash(rm -rf:*)"
    ]
  }
}
```

Guidelines:
- Allow-list frequent, safe, read-only or local commands to reduce approval fatigue.
- Deny reads of secret files and network-publishing commands (push, deploy, publish) unless explicitly needed.
- Commit shared project settings; keep personal overrides in a local, gitignored file.
- Deny rules are a guardrail, not a security boundary on their own; combine with sandboxing.

## Sandboxing

| Level | Mechanism |
|-------|-----------|
| Filesystem | Restrict writes to the workspace; read-only mounts for the rest |
| Network | Disable or allow-list egress (package registries, API docs) |
| Process | Run in a container/VM, non-root user |
| Credentials | Short-lived, scoped tokens; no production credentials in agent environments |

Ephemeral cloud sandboxes or containers per task limit blast radius and make cleanup trivial.

## Hooks

Lifecycle hooks run deterministic checks around agent actions, for example:
- Before a shell command: block destructive patterns.
- After a file edit: run the formatter or a fast linter on the changed file; log the change.
- At session start: print environment status.

```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Write|Edit", "hooks": [ { "type": "command", "command": "scripts/hooks/format-changed.sh" } ] }
    ]
  }
}
```

Keep hooks fast and idempotent; slow hooks degrade every action. Hook scripts receive tool input as JSON on stdin in tools such as Claude Code; check your tool's contract.

## MCP and Tool Configuration

- Declare project-level MCP servers in the repo config file supported by your tool (e.g. `.mcp.json` for Claude Code) so everyone gets the same tools.
- Pin server versions; review what each server can access.
- Prefer read-only modes; scope tokens to the minimum (read-only database user, single-repo GitHub token).
- Treat tool outputs as untrusted input (prompt injection); do not let tool results trigger destructive actions without approval.

## Secrets

- `.env.example` with fake values committed; real `.env` gitignored and denied to agents.
- Load secrets from a secret manager at runtime (1Password CLI, Vault, cloud secret managers, Doppler) for humans; give agents test credentials only.
- Pre-commit secret scanning (`gitleaks`, `trufflehog`) and push protection.

## Editor and Formatter Settings

- `.editorconfig` for whitespace and line endings.
- Formatter configs (`.prettierrc`, `ruff` in `pyproject.toml`, `rustfmt.toml`) committed so agent edits match project style automatically.
- `.gitattributes` for line endings (`* text=auto eol=lf`) to avoid Windows/Unix churn from agent edits.

## Verification Loop Speed

| Check | Target |
|-------|--------|
| Format + lint on changed files | Seconds |
| Typecheck | Under a minute where possible (incremental modes) |
| Unit tests for changed module | Seconds to a minute |
| Full suite | CI |

Document the fast loop in AGENTS.md so agents run it after every change.

## Checklist

- [ ] Toolchain pinned via version files and lockfiles
- [ ] One task runner used by agents, humans and CI
- [ ] Dev container or equivalent reproducible environment
- [ ] Permission allow/deny lists committed; secrets unreadable
- [ ] Sandbox with restricted network and no production credentials
- [ ] Fast hooks for formatting, logging, destructive-command blocking
- [ ] MCP servers pinned and least-privileged
- [ ] Fast local verification loop documented
