# .codex/AGENTS.md -- j4flmao/skills

Codex CLI project config for the agent skill suite. 176 skills, compressed output, stack-based routing.

## Compress (ALWAYS)

Strip all output: a/an/the | just/really/basically/actually/simply | sure/happy/glad/please | I think/I believe/might be/perhaps/probably/likely | as you know/as mentioned/in other words | however/moreover/furthermore/therefore | code explanation (show code only) | preamble/postamble.

Write pattern: `[thing] [action] [reason]. [next].`

Full prose exceptions: security warnings. destructive operations. user confusion. resume after interruption.

## Routing

No trigger match -> `skills/core/master-orchestrator/SKILL.md`. Detect stack, then route.

Phase order: planning -> backend -> frontend -> mobile -> dev-loop -> devops -> management.

### Quick map

```
planning/    -> brief, prd, adr, tech spec, story, roadmap, pitch-deck, market-analysis
backend/     -> nestjs, nodejs, elysia, go, rust, python, spring, dotnet, rails, php-pure, php-laravel, php-zend
               universal: oop, api-design, api-response, database, auth, testing,
               grpc, websocket, message-queue, caching, rate-limiting, load-testing, api-gateway,
               graphql, bg-jobs, search, streaming, file-storage, feature-flags, i18n, logging
frontend/    -> react, nextjs, vue, nuxt, angular, sveltekit,
               remix, astro, solidjs, qwik, svelte-core
               universal: state, a11y, design-system, performance, testing, microfrontend,
               tailwind, storybook, pwa, seo, animation, form, data-fetching, bundler, img-opt, theming
mobile/      -> ios, android, flutter, react-native, kmp, ionic-capacitor, dotnet-maui
               universal: patterns, testing, performance, security, networking, storage, deployment,
               push-notifications, in-app-purchase, crash-reporting,
               deep-linking, offline-first, biometrics, map-location, camera-media, analytics
devops/      -> docker, k8s, terraform, helm, ansible, jenkins, longhorn, monitoring,
               github-actions, gitops, vault, aws, serverless, monorepo,
               dependency-management, api-documentation,
               argo-cd, azure, gcp, chaos, service-mesh, finops, backup-dr, db-migration
dev-loop/    -> review, debug, refactor, git, security, performance, changelog, readme,
               pr-writer, dev-container, tech-debt, api-client
management/  -> pm, ba, qa, qc, team-rules, security, pentesting, alerting,
               okr-kpi, sprint-retro, risk
enterprise/  -> compliance-audit, multi-tenant, integration-patterns,
               data-governance, sla-management, legacy-migration,
               identity-provider, cost-governance
product/     -> analytics, ab-testing, user-research, growth-engineering,
               pricing-strategy, go-to-market, onboarding-flow,
               feature-prioritization
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
  skills/            176 skills
  bundles/           15 bundle definitions
```
