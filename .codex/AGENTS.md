# .codex/AGENTS.md -- j4flmao/skills

Codex CLI project config for the agent skill suite. 105 skills, compressed output, stack-based routing.

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
               universal: oop, api-design, api-response, database, auth, testing,
               grpc, websocket, message-queue, caching, rate-limiting, load-testing
frontend/    -> react, nextjs, vue, nuxt, angular, sveltekit
               universal: state, a11y, design-system, performance, testing, microfrontend,
               tailwind, storybook, pwa, seo
mobile/      -> ios, android, flutter, react-native
               universal: patterns, testing, performance, security, networking, storage, deployment,
               push-notifications, in-app-purchase, crash-reporting
devops/      -> docker, k8s, terraform, helm, ansible, jenkins, longhorn, monitoring,
               github-actions, gitops, vault, aws, serverless, monorepo,
               dependency-management, api-documentation
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
- `pubspec.yaml`: flutter
- `package.json` with `react-native`: react-native

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
  skills/            105 skills
  bundles/           15 bundle definitions
```
