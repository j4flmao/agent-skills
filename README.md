# @j4flmao/agent-skills

321 agent skills for software development — planning, backend, frontend, desktop, mobile, devops, management, enterprise, product, ml, ai, security, data, design, quality. Each skill is a `SKILL.md` defining triggers, rules, and response format.

## Installation

### Option 1: Use in the repo directly (no install needed)

Agent config files are already in this repo. Open this project in your agent and it works immediately:

```bash
git clone https://github.com/j4flmao/agent-skills
cd agent-skills
# Open your agent here — configs are ready
```

| Agent | Auto-loaded files |
|-------|-------------------|
| Claude Code | `.claude/CLAUDE.md` + `.claude/rules/` + `.claude/skills/` + `.claude/hooks/` + `.claude/settings.json` |
| OpenCode | `.opencode/AGENTS.md` + `.opencode/commands/*.md` |
| Amp | `.amp/AGENTS.md` + `.amp/agent-skills.md` + `.amp/subagents.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Gemini | `.gemini/INSTRUCTIONS.md` |
| Cursor | `.cursor/rules/agent-skills.mdc` + `.cursor/rules/compression.mdc` |
| Codex CLI | `.codex/AGENTS.md` + `.codex/rules/` + `.codex/hooks/` + `.codex/skills/` |
| Windsurf | `.windsurf/rules/*.md` |

### Option 2: Copy skills into another project

Clone once, then copy the agent config folder into any project:

```bash
# Clone skills repo somewhere on your machine
git clone https://github.com/j4flmao/agent-skills ~/skills

# Copy the config for your agent into your project
cp -r ~/skills/.claude /path/to/your/project/     # Claude Code
cp -r ~/skills/.opencode /path/to/your/project/   # OpenCode
cp -r ~/skills/.cursor /path/to/your/project/     # Cursor
cp -r ~/skills/.amp /path/to/your/project/        # Amp
cp -r ~/skills/.codex /path/to/your/project/      # Codex CLI
cp -r ~/skills/.windsurf /path/to/your/project/    # Windsurf
```

Or cherry-pick individual skills:

```bash
# Copy only the skills you need
cp -r ~/skills/skills/backend/dotnet /path/to/project/skills/
cp -r ~/skills/skills/devops/docker-patterns /path/to/project/skills/
```

### Option 3: npx skills add (after pushing to GitHub)

```bash
# Requires the repo to be pushed to GitHub
npx skills add j4flmao/agent-skills            # all 323 skills
npx skills add j4flmao/agent-skills --bundle backend-only
npx skills add j4flmao/agent-skills -g          # global (every project)
```

## Bundles

```bash
npx skills add j4flmao/agent-skills --bundle <name>
```

| Bundle | Skills | Description |
|--------|--------|-------------|
| `fullstack-nestjs-react` | 230+ | NestJS + React |
| `fullstack-golang-vue` | 230+ | Go + Vue |
| `fullstack-rust-angular` | 230+ | Rust + Angular |
| `fullstack-dotnet-react` | 230+ | .NET + React |
| `fullstack-nodejs-react` | 230+ | Node.js + React |
| `fullstack-elysia-react` | 230+ | ElysiaJS + React |
| `fullstack-rails-svelte` | 228+ | Rails + SvelteKit |
| `backend-only` | 185+ | Backend only (includes ai, ml, security, data skills) |
| `frontend-only` | 80+ | Frontend only (includes design skills) |
| `devops-only` | 55+ | DevOps only (includes security, nomad, incident-response) |
| `management-only` | 65+ | Management only (includes data, quality, cost-benefit, hiring, stakeholder) |
| `mobile-ios` | 95+ | iOS + universal mobile skills + deployment |
| `mobile-android` | 95+ | Android + universal mobile skills + deployment |
| `mobile-flutter` | 98+ | Flutter + universal mobile skills + deployment |
| `mobile-react-native` | 98+ | React Native + universal mobile skills + deployment |

## How Skills Work

1. User makes a request
2. Agent matches trigger keywords in `skills/**/SKILL.md`
3. Agent reads the matched SKILL.md + reference files
4. Agent responds following that skill's Response Format

No need to remember skill names. Just describe the problem.

### Examples

```
User: "write a brief for a chat app"          → create-brief
User: "design the order database schema"       → database-patterns
User: "review this PR for security issues"     → code-review
User: "set up Docker for this project"         → docker-patterns
User: "build an iOS order list screen"         → ios
```

No keyword match? Agent routes through `master-orchestrator`, detects the project stack, and picks the right skill.

## Skills Table

| Phase | Skills |
|-------|--------|
| **0 — Core** | `master-orchestrator`, `project-init`, `onboarding`, `context-compressor` |
| **1 — Planning** | `create-brief`, `create-prd`, `create-adr`, `create-tech-spec`, `create-story`, `create-roadmap`, `create-pitch-deck`, `market-analysis` |
| **2 — Backend Universal** | `oop-principles`, `design-patterns`, `microservices`, `clean-architecture`, `api-design`, `api-response`, `database-patterns`, `auth-patterns`, `event-driven`, `testing`, `grpc-patterns`, `websocket-patterns`, `message-queue`, `caching`, `rate-limiting`, `load-testing`, `api-gateway`, `graphql-patterns`, `background-jobs`, `search-patterns`, `data-streaming`, `file-storage`, `feature-flags`, `internationalization`, `structured-logging`, `observability`, `resilience-patterns`, `openapi-documentation`, `contract-testing`, `idempotency`, `distributed-locking`, `webhooks`, `api-versioning`, `scheduling-cron`, `multi-tenancy`, `bff-pattern`, `data-masking`, `audit-logging`, `plugin-architecture` |
| **2b — Stack Backend** | `nestjs-a/p`, `nodejs-a/p`, `elysia-a/p`, `golang-a/p`, `rust-a/p`, `python-fastapi`, `python-django`, `spring-boot-a`, `dotnet-a/p`, `rails`, `php-pure`, `php-laravel`, `php-zend`, `kotlin-a/p`, `java-micronaut`, `java-quarkus`, `scala-play`, `swift-vapor`, `python-flask`, `php-symfony`, `nodejs-hono`, `nodejs-fastify`, `deno-oak`, `bun` |
| **3 — Frontend Universal** | `design-system`, `state-management`, `performance`, `accessibility`, `testing`, `patterns`, `microfrontend`, `tailwind-css`, `storybook`, `pwa`, `seo`, `animation`, `form-handling`, `data-fetching`, `bundler-tools`, `image-optimization`, `theming`, `internationalization`, `authentication`, `error-handling`, `rendering-strategies`, `css-strategy`, `typescript-patterns`, `security`, `browser-caching`, `responsive-design`, `feature-flags` |
| **3b — Stack Frontend** | `react-a`, `react-nextjs`, `vue-a`, `vue-nuxt`, `angular-a/p`, `sveltekit`, `remix-a/p`, `astro-a`, `solidjs-a/p`, `qwik-a`, `svelte-a/p`, `lit`, `preact`, `alpinejs`, `htmx`, `ember`, `stencil` |
| **3c — Desktop** | `electron`, `tauri`, `qt`, `gtk`, `wpf`, `winui3`, `uwp`, `winforms`, `swiftui`, `appkit`, `gnome`, `kde` |
| **4 — Dev Loop** | `code-review`, `debugging-strategy`, `refactor-guide`, `git-workflow`, `security-auditor`, `performance-profiler`, `changelog-generator`, `readme-writer`, `pr-writer`, `dev-container`, `tech-debt-tracker`, `api-client-generator` |
| **5 — DevOps** | `docker-patterns`, `cicd-pipeline`, `kubernetes-patterns`, `observability`, `helm-patterns`, `terraform`, `ansible`, `jenkins`, `longhorn`, `monitoring`, `github-actions`, `gitops`, `vault`, `aws`, `serverless`, `monorepo`, `dependency-management`, `api-documentation`, `argo-cd`, `azure`, `gcp`, `chaos-engineering`, `service-mesh`, `finops`, `backup-dr`, `database-migration`, `dataops`, `mlops`, `kubernetes-for-data`, `cloud-cost-optimization` |
| **6 — Management** | `pm`, `ba`, `qa`, `qc`, `team-rules`, `security`, `pentesting`, `alerting`, `okr-kpi`, `sprint-retro`, `risk-management`, `cost-benefit`, `hiring`, `stakeholder` |
| **7 — AI** | `ai-prompt-engineering`, `ai-rag-patterns`, `ai-llm-ops`, `ai-vector-databases`, `ai-ai-agents`, `ai-ai-evals`, `ai-model-training`, `ai-embeddings`, `ai-multimodal`, `ai-ai-safety`, `ai-ai-testing`, `ai-ai-cost-optimization`, `ai-langchain-patterns`, `ai-mcp-patterns`, `ai-ai-observability` |
| **7b — Security** | `security-sast-dast`, `security-sbom`, `security-secrets-management`, `security-container-security`, `security-api-security`, `security-data-security` |
| **7c — Data** | `data-etl-pipeline`, `data-data-warehouse`, `data-streaming`, `data-bi-tools`, `data-data-quality`, `data-distributed-storage`, `data-distributed-compute`, `data-data-lake`, `data-data-lakehouse`, `data-batch-processing`, `data-workflow-orchestration`, `data-cdc-patterns`, `data-data-replication`, `data-data-platform`, `data-data-catalog`, `data-data-observability`, `data-data-contracts`, `data-data-mesh`, `data-data-versioning`, `data-data-api`, `data-data-virtualization`, `data-schema-registry`, `data-relational-database`, `data-nosql-database`, `data-graph-database`, `data-search-engine`, `data-data-lineage`, `data-data-cost-optimization`, `data-data-testing`, `data-feature-store`, `data-reverse-etl`, `data-data-pipeline-cicd`, `data-data-clean-room`, `data-data-formats` |
| **7d — Design** | `design-design-systems`, `design-ux-research`, `design-accessibility`, `design-prototyping` |
| **7e — Quality** | `quality-e2e-testing`, `quality-visual-testing`, `quality-load-testing`, `quality-contract-testing` |
| **7f — ML** | `ml-experiment-tracking`, `ml-classical-ml`, `ml-deep-learning`, `ml-feature-engineering`, `ml-hyperparameter-tuning`, `ml-model-evaluation`, `ml-model-interpretability`, `ml-time-series`, `ml-nlp`, `ml-computer-vision`, `ml-recommender`, `ml-anomaly-detection`, `ml-ml-pipeline`, `ml-feature-store`, `ml-model-serving`, `ml-math-foundations` |
| **8 — Mobile Stacks** | `ios`, `android`, `flutter`, `react-native`, `kotlin-multiplatform`, `ionic-capacitor`, `dotnet-maui` |
| **8b — Mobile Universal** | `mobile-patterns`, `mobile-testing`, `mobile-performance`, `mobile-security`, `mobile-networking`, `mobile-storage`, `mobile-deployment`, `push-notifications`, `in-app-purchase`, `crash-reporting`, `deep-linking`, `offline-first`, `biometrics`, `map-location`, `camera-media`, `analytics` |
| **9 — Enterprise** | `compliance-audit`, `cost-governance`, `data-governance`, `identity-provider`, `integration-patterns`, `legacy-migration`, `multi-tenant`, `sla-management` |
| **10 — Product** | `ab-testing`, `analytics`, `feature-prioritization`, `go-to-market`, `growth-engineering`, `onboarding-flow`, `pricing-strategy`, `user-research` |

Mobile universal skills apply across all platforms: patterns, testing, performance, security, networking, storage, deployment, push-notifications, in-app-purchase, crash-reporting, deep-linking, offline-first, biometrics, map-location, camera-media, analytics.

Enterprise skills cover compliance, governance, identity, integration, legacy migration, multi-tenancy, and SLA management. Product skills cover analytics, growth, onboarding, pricing, research, and feature prioritization.

`-a` = architecture, `-p` = patterns. Example: `nestjs-a` = `nestjs-architecture`.

## Architecture

```
User → [master-orchestrator] → Planning → Backend → Frontend → Desktop → Mobile → Dev Loop → DevOps
                                        ↓
                                   Management
```

## Output Compression

Every skill enforces: **No filler. No preamble/postamble. Why use many token when few do trick.**

Agent config files contain the compression rules:
- `.claude/rules/compression.md`
- `.opencode/AGENTS.md`
- `.amp/AGENTS.md`
- `.cursor/rules/compression.mdc`
- `.github/copilot-instructions.md`
- `.gemini/INSTRUCTIONS.md`
- `.codex/rules/compression.md`
- `.windsurf/rules/compression.md`

## File Structure

```
.
├── .claude/          Claude Code
├── .opencode/        OpenCode
├── .amp/             Amp
├── .github/          GitHub Copilot
├── .gemini/          Gemini
├── .cursor/          Cursor
├── .codex/           Codex CLI
├── .windsurf/        Windsurf
├── docs/             quickstart, skill-template, team-guide, enterprise-guide, agent-reference,
│                     ai-ml-guide, data-guide, security-guide, ci-cd-patterns,
│                     backend-guide, frontend-guide, devops-guide, mobile-guide,
│                     desktop-guide, dev-loop-guide, management-guide, product-guide
├── skills/
│   ├── core/         4 skills
│   ├── planning/     8 skills
│   ├── backend/      75 skills (36 stack + 39 universal)
│   │   ├── nodejs/       Node.js (architecture, patterns, express, prisma, fastify, hono)
│   │   ├── nestjs/       NestJS (architecture, patterns)
│   │   ├── go/           Go (architecture, patterns)
│   │   ├── rust/         Rust (architecture, patterns)
│   │   ├── python/       Python (fastapi, django, flask)
│   │   ├── spring-boot/  Spring Boot (architecture, patterns)
│   │   ├── java/         Java (micronaut, quarkus)
│   │   ├── kotlin/       Kotlin (architecture, patterns)
│   │   ├── dotnet/       .NET (architecture, patterns)
│   │   ├── scala/        Scala (play)
│   │   ├── swift/        Swift (vapor)
│   │   ├── elysia/       ElysiaJS (architecture, patterns)
│   │   ├── php/          PHP (laravel, pure, zend, symfony)
│   │   ├── ruby/         Ruby (rails)
│   │   ├── elixir/       Elixir
│   │   ├── deno/         Deno (oak)
│   │   ├── bun/          Bun
│   │   └── universal/    39 skills
│   ├── frontend/     52 skills (25 stack + 27 universal)
│   │   ├── react/        React (architecture, nextjs)
│   │   ├── vue/          Vue (architecture, nuxt, patterns)
│   │   ├── angular/      Angular (architecture, patterns)
│   │   ├── svelte/       Svelte (architecture, patterns, sveltekit)
│   │   ├── remix/        Remix (architecture, patterns)
│   │   ├── astro/        Astro (architecture, patterns)
│   │   ├── solidjs/      SolidJS (architecture, patterns)
│   │   ├── qwik/         Qwik (architecture, patterns)
│   │   ├── lit/          Lit
│   │   ├── preact/       Preact
│   │   ├── alpinejs/     Alpine.js
│   │   ├── htmx/         htmx
│   │   ├── ember/        Ember.js
│   │   ├── stencil/      Stencil
│   │   └── universal/    27 skills
│   ├── desktop/    12 skills
│   │   ├── electron/     Cross-platform (Chromium + Node)
│   │   ├── tauri/        Cross-platform (Rust + web)
│   │   ├── qt/           Cross-platform (C++, QML)
│   │   ├── gtk/          Cross-platform (C, Python, Rust)
│   │   ├── wpf/          Windows (.NET, XAML)
│   │   ├── winui3/       Windows 10+ (WinAppSDK)
│   │   ├── uwp/          Windows 10+ (UWP)
│   │   ├── winforms/     Windows (.NET classic)
│   │   ├── swiftui/      macOS (Swift)
│   │   ├── appkit/       macOS (AppKit)
│   │   ├── gnome/        Linux (GTK 4, libadwaita)
│   │   └── kde/          Linux (Qt 6, Kirigami)
│   ├── mobile/      24+ skills
│   │   ├── ios/           iOS native
│   │   ├── android/       Android native
│   │   ├── flutter/       Flutter
│   │   ├── react-native/  React Native
│   │   ├── kotlin-multiplatform/  KMP
│   │   ├── ionic-capacitor/       Ionic/Capacitor
│   │   ├── dotnet-maui/           .NET MAUI
│   │   └── universal/     16 skills
│   ├── dev-loop/     12 skills
│   ├── devops/       32 skills (30 + nomad, incident-response)
│   ├── management/   14 skills (11 + cost-benefit, hiring, stakeholder)
│   ├── enterprise/    8 skills
│   ├── product/       8 skills
│   ├── ai/            15 skills
│   ├── ml/            16 skills (15 + math-foundations)
│   ├── security/      6 skills
│   ├── data/          34 skills
│   ├── design/        4 skills
│   ├── quality/       4 skills
└── bundles/
    └── bundle-definitions.json
```

Total: **321 SKILL.md** + **853+ reference .md files** + **17 docs/ guides** + **agent configs** = **1191+ files**.

## License

MIT © j4flmao
