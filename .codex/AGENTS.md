# .codex/AGENTS.md -- j4flmao/skills

Codex CLI project config for the agent skill suite. 76 skills, compressed output, stack-based routing.

## Compress (ALWAYS)

Strip all output: a/an/the | just/really/basically/actually/simply | sure/happy/glad/please | I think/I believe/might be/perhaps/probably/likely | as you know/as mentioned/in other words | however/moreover/furthermore/therefore | code explanation (show code only) | preamble/postamble.

Write pattern: `[thing] [action] [reason]. [next].`

Full prose exceptions: security warnings. destructive operations. user confusion. resume after interruption.

## Routing

No trigger match -> `skills/core/master-orchestrator/SKILL.md`. Detect stack, then route.

Phase order: planning -> backend -> frontend -> mobile -> dev-loop -> devops -> management.

### Quick map

```
planning/    -> brief, prd, adr, tech spec, story
backend/     -> nestjs, nodejs, elysia, go, rust, python, spring, dotnet, rails
               universal: oop, api-design, api-response, database, auth, testing
frontend/    -> react, nextjs, vue, nuxt, angular, sveltekit
               universal: state, a11y, design-system, performance, testing, microfrontend
mobile/      -> ios, android, deploy
devops/      -> docker, k8s, terraform, helm, ansible, jenkins, longhorn, monitoring
dev-loop/    -> review, debug, refactor, git, security, performance, changelog, readme
management/  -> pm, ba, qa, qc, team-rules, security, pentesting, alerting
```

### Stack detection

- `package.json`: nestjs/nodejs/elysia/react/vue/sveltekit
- `go.mod`: golang
- `Cargo.toml`: rust
- `Gemfile`: rails
- `requirements.txt` / `pyproject.toml`: python
- `pom.xml` / `build.gradle`: spring-boot
- `*.csproj` / `*.sln`: dotnet

## Project structure

```
agent-skills/
  .claude/           Claude Code
  .opencode/         OpenCode
  .amp/              Amazon Q
  .github/           GitHub Copilot
  .gemini/           Gemini
  .cursor/           Cursor
  .codex/            Codex CLI (this file)
  skills/            76 skills
  bundles/           13 bundle definitions
```
