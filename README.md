# @j4flmao/agent-skills

420 agent skills for software development — planning, backend, frontend, desktop, mobile, devops, management, enterprise, product, ml, ai, security, data, data-science, design, quality, blockchain. Each skill is a `SKILL.md` defining triggers, rules, and response format.

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
npx skills add j4flmao/agent-skills            # all 420 skills
npx skills add j4flmao/agent-skills --bundle backend-only
npx skills add j4flmao/agent-skills -g          # global (every project)
```

## Bundles

```bash
npx skills add j4flmao/agent-skills --bundle <name>
```

| Bundle | Skills | Description |
|--------|--------|-------------|
| `blockchain-all` | 13+ | All blockchain: core, cryptography, Ethereum, Bitcoin, patterns, application, web3, testing, infrastructure, security, management, Solana, DeFi |
| `fullstack-nestjs-react` | 230+ | NestJS + React |
| `fullstack-golang-vue` | 230+ | Go + Vue |
| `fullstack-rust-angular` | 230+ | Rust + Angular |
| `fullstack-dotnet-react` | 230+ | .NET + React |
| `fullstack-nodejs-react` | 230+ | Node.js + React |
| `fullstack-elysia-react` | 230+ | ElysiaJS + React |
| `fullstack-rails-svelte` | 228+ | Rails + SvelteKit |
| `backend-only` | 190+ | Backend only (includes ai, ml, security, data skills) |
| `backend-patterns` | 28+ | CQRS, Event Sourcing, Saga, Outbox + universal patterns |
| `infra-cloud` | 34+ | Infrastructure & Cloud: IaC, CI/CD, K8s, cloud providers, observability |
| `security-all` | 15+ | All security: Zero Trust, CSPM, EDR, SOC, SIEM, SOAR, Threat Intel |
| `frontend-only` | 80+ | Frontend only (includes design skills) |
| `devops-only` | 55+ | DevOps only (includes security, nomad, incident-response) |
| `management-only` | 65+ | Management only (includes data, quality, cost-benefit, hiring, stakeholder) |
| `mobile-ios` | 95+ | iOS + universal mobile skills + deployment |
| `mobile-android` | 95+ | Android + universal mobile skills + deployment |
| `mobile-flutter` | 98+ | Flutter + universal mobile skills + deployment |
| `mobile-react-native` | 98+ | React Native + universal mobile skills + deployment |
| `backend-patterns` | 28+ | CQRS, Event Sourcing, Saga, Outbox + universal patterns |

## How Skills Work

1. User makes a request
2. Agent matches trigger keywords in `skills/**/SKILL.md`
3. Agent reads the matched SKILL.md + reference files
4. Agent responds following that skill's Response Format

No need to remember skill names. Just describe the problem.

### Examples

```
User: "write a brief for a chat app"          → create-brief
User: "design the order database schema"       → backend-database-patterns
User: "review this PR for security issues"     → code-review
User: "set up Docker for this project"         → docker-patterns
User: "build an iOS order list screen"         → mobile-ios
```

No keyword match? Agent routes through `master-orchestrator`, detects the project stack, and picks the right skill.

## Skills Table

| Phase | Skills |
|-------|--------|
| **0 — Core** | `master-orchestrator`, `project-init`, `onboarding`, `context-compressor` |
| **1 — Planning** | `create-brief`, `create-prd`, `create-adr`, `create-tech-spec`, `create-story`, `planning-create-roadmap`, `planning-create-pitch-deck`, `planning-market-analysis`, `management-cost-benefit`, `bpmn-modeling`, `bdd-atdd` |
| **2 — Backend Universal** | `oop-principles`, `design-patterns`, `backend-microservices`, `backend-clean-architecture`, `backend-api-design`, `api-response`, `backend-database-patterns`, `backend-auth-patterns`, `backend-event-driven`, `backend-testing`, `grpc-patterns`, `websocket-patterns`, `message-queue`, `backend-caching`, `rate-limiting`, `load-testing`, `api-gateway`, `backend-graphql-patterns`, `backend-background-jobs`, `backend-search-patterns`, `backend-data-streaming`, `backend-file-storage`, `backend-feature-flags`, `backend-internationalization`, `backend-structured-logging`, `backend-observability`, `backend-resilience-patterns`, `backend-openapi-documentation`, `backend-contract-testing`, `backend-idempotency`, `backend-distributed-locking`, `backend-webhooks`, `backend-api-versioning`, `backend-scheduling-cron`, `backend-multi-tenancy`, `backend-bff-pattern`, `backend-data-masking`, `backend-audit-logging`, `backend-plugin-architecture`, `backend-cqrs-patterns`, `backend-event-sourcing`, `backend-saga-patterns`, `backend-transactional-outbox` |
| **2b — Stack Backend** | `nestjs-a/p`, `nodejs-a/p`, `elysia-a/p`, `backend-go-a/p`, `rust-a/p`, `python-fastapi`, `python-django`, `backend-spring-boot-a`, `dotnet-a/p`, `backend-rails`, `php-pure`, `php-laravel`, `php-zend`, `backend-kotlin-a/p`, `java-micronaut`, `java-quarkus`, `scala-play`, `swift-vapor`, `python-flask`, `php-symfony`, `nodejs-hono`, `nodejs-fastify`, `deno-oak`, `backend-bun`, `backend-elixir`, `backend-deno` |
| **3 — Frontend Universal** | `frontend-design-system`, `frontend-state-management`, `frontend-performance`, `frontend-accessibility`, `frontend-testing`, `frontend-patterns`, `frontend-microfrontend`, `tailwind-css`, `frontend-storybook`, `frontend-pwa`, `frontend-seo`, `frontend-animation`, `frontend-form-handling`, `frontend-data-fetching`, `frontend-bundler-tools`, `frontend-image-optimization`, `frontend-theming`, `frontend-internationalization`, `frontend-authentication`, `frontend-error-handling`, `frontend-rendering-strategies`, `frontend-css-strategy`, `frontend-typescript-patterns`, `frontend-security`, `frontend-browser-caching`, `frontend-responsive-design`, `frontend-feature-flags` |
| **3b — Stack Frontend** | `react-a`, `react-nextjs`, `vue-a`, `vue-nuxt`, `angular-a/p`, `frontend-sveltekit`, `remix-a/p`, `frontend-astro-a`, `solidjs-a/p`, `qwik-a`, `svelte-a/p`, `frontend-lit`, `frontend-preact`, `frontend-alpinejs`, `frontend-htmx`, `frontend-ember`, `frontend-stencil`, `frontend-web-components` |
| **3c — Desktop** | `desktop-electron`, `desktop-tauri`, `desktop-qt`, `desktop-gtk`, `desktop-wpf`, `desktop-winui3`, `desktop-uwp`, `desktop-winforms`, `desktop-swiftui`, `desktop-appkit`, `desktop-gnome`, `desktop-kde` |
| **4 — Dev Loop** | `code-review`, `debugging-strategy`, `refactor-guide`, `git-workflow`, `security-auditor`, `performance-profiler`, `changelog-generator`, `readme-writer`, `dev-loop-pr-writer`, `dev-loop-dev-container`, `dev-loop-tech-debt-tracker`, `dev-loop-api-client-generator` |
| **5 — DevOps** | `docker-patterns`, `cicd-pipeline`, `kubernetes-patterns`, `devops-observability`, `helm-patterns`, `devops-terraform`, `devops-ansible`, `devops-jenkins`, `devops-longhorn`, `devops-monitoring`, `github-actions`, `devops-gitops`, `devops-vault`, `devops-aws`, `devops-serverless`, `devops-monorepo`, `dependency-management`, `api-documentation`, `devops-argo-cd`, `devops-azure`, `devops-gcp`, `devops-chaos-engineering`, `devops-service-mesh`, `devops-finops`, `devops-backup-dr`, `devops-database-migration`, `devops-incident-response`, `devops-nomad`, `devops-dataops`, `devops-mlops`, `kubernetes-for-data`, `cloud-cost-optimization`, `devops-bare-metal`, `devops-datacenter`, `devops-network-infrastructure`, `devops-storage-infrastructure`, `devops-cdn-edge`, `devops-hybrid-cloud`, `devops-pulumi`, `devops-crossplane`, `devops-gitlab-ci`, `devops-circleci`, `devops-kubernetes-autoscaling`, `devops-apm-observability`, `devops-cilium-ebpf`, `devops-opentelemetry`, `devops-oracle-cloud`, `devops-digitalocean`, `devops-ibm-cloud`, `devops-alibaba-cloud`, `devops-hetzner` |
| **6 — Management** | `management-pm`, `management-ba`, `management-qa`, `management-qc`, `team-rules`, `management-security`, `management-pentesting`, `management-alerting`, `management-okr-kpi`, `management-sprint-retro`, `management-risk-management`, `management-hiring`, `management-stakeholder`, `agile-scrum-kanban`, `team-topology`, `change-management` |
| **7 — AI** | `ai-prompt-engineering`, `ai-rag-patterns`, `ai-llm-ops`, `ai-vector-databases`, `ai-ai-agents`, `ai-ai-evals`, `ai-model-training`, `ai-embeddings`, `ai-multimodal`, `ai-ai-safety`, `ai-ai-testing`, `ai-ai-cost-optimization`, `ai-langchain-patterns`, `ai-mcp-patterns`, `ai-ai-observability` |
| **7b — Security** | `security-sast-dast`, `security-sbom`, `security-secrets-management`, `security-container-security`, `security-api-security`, `security-data-security`, `zero-trust`, `cspm`, `penetration-testing`, `iam-governance` |
| **7c — Data** | `data-etl-pipeline`, `data-data-warehouse`, `data-streaming`, `data-bi-tools`, `data-data-quality`, `data-distributed-storage`, `data-distributed-compute`, `data-data-lake`, `data-data-lakehouse`, `data-batch-processing`, `data-workflow-orchestration`, `data-cdc-patterns`, `data-data-replication`, `data-data-platform`, `data-data-catalog`, `data-data-observability`, `data-data-contracts`, `data-data-mesh`, `data-data-versioning`, `data-data-api`, `data-data-virtualization`, `data-schema-registry`, `data-relational-database`, `data-nosql-database`, `data-graph-database`, `data-search-engine`, `data-lineage`, `data-cost-optimization`, `data-testing`, `data-feature-store`, `data-reverse-etl`, `data-pipeline-cicd`, `data-clean-room`, `data-formats`, `data-data-strategy`, `data-dimensional-modeling` |
| **7d — Data Science** | `statistical-analysis`, `experimentation`, `causal-inference`, `analytics-engineering` |
| **7e — Design** | `design-design-systems`, `design-ux-research`, `design-accessibility`, `design-prototyping`, `visual-design`, `brand-identity`, `information-architecture`, `motion-design` |
| **7f — Quality** | `quality-e2e-testing`, `quality-visual-testing`, `quality-load-testing`, `quality-contract-testing`, `exploratory-testing`, `acceptance-testing`, `regression-testing`, `smoke-testing` |
| **7g — ML** | `ml-experiment-tracking`, `ml-classical-ml`, `ml-deep-learning`, `ml-feature-engineering`, `ml-hyperparameter-tuning`, `ml-model-evaluation`, `ml-model-interpretability`, `ml-time-series`, `ml-nlp`, `ml-computer-vision`, `ml-recommender`, `ml-anomaly-detection`, `ml-ml-pipeline`, `ml-feature-store`, `ml-model-serving`, `ml-math-foundations` |
| **8 — Mobile Stacks** | `mobile-ios`, `mobile-android`, `mobile-flutter`, `react-native`, `mobile-kotlin-multiplatform`, `mobile-ionic-capacitor`, `mobile-dotnet-maui` |
| **8b — Mobile Universal** | `mobile-patterns`, `mobile-testing`, `mobile-performance`, `mobile-security`, `mobile-networking`, `mobile-storage`, `mobile-deployment`, `push-notifications`, `in-app-purchase`, `crash-reporting`, `mobile-deep-linking`, `mobile-offline-first`, `mobile-biometrics`, `mobile-map-location`, `mobile-camera-media`, `mobile-analytics`, `mobile-ar-vr` |
| **9 — Enterprise** | `enterprise-compliance-audit`, `enterprise-cost-governance`, `enterprise-data-governance`, `enterprise-identity-provider`, `enterprise-integration-patterns`, `enterprise-legacy-migration`, `enterprise-multi-tenant`, `enterprise-sla-management`, `enterprise-high-availability`, `enterprise-business-continuity`, `enterprise-capacity-planning`, `togaf-zachman`, `itil-service-mgmt`, `vendor-management`, `architecture-governance` |
| **10 — Product** | `product-ab-testing`, `product-analytics`, `product-feature-prioritization`, `product-go-to-market`, `product-growth-engineering`, `product-onboarding-flow`, `product-pricing-strategy`, `product-user-research`, `customer-journey`, `persona-development` |
| **11 — Blockchain** (13) | `blockchain-core`, `blockchain-cryptography`, `blockchain-ethereum`, `blockchain-bitcoin`, `blockchain-patterns`, `blockchain-application`, `blockchain-web3`, `blockchain-testing`, `blockchain-infrastructure`, `blockchain-security`, `blockchain-management`, `blockchain-solana`, `blockchain-defi` |

Mobile universal skills apply across all platforms: patterns, testing, performance, security, networking, storage, deployment, push-notifications, in-app-purchase, crash-reporting, deep-linking, offline-first, biometrics, map-location, camera-media, analytics.

Enterprise skills cover compliance, governance, identity, integration, legacy migration, multi-tenancy, SLA management, high availability (replica + load balancer + version sync + data migration), business continuity (BCP/DR, vendor risk, ransomware playbook), and capacity planning (forecasting + procurement). Product skills cover analytics, growth, onboarding, pricing, research, and feature prioritization.

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
├── .github/          GitHub Copilot (copilot-instructions.md)
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
│   ├── backend/      79 skills (36 stack + 43 universal)
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
│   │   └── universal/    43 skills
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
│   ├── devops/       60 skills (incl. bare-metal, datacenter, network-infrastructure, storage-infrastructure, cdn-edge, hybrid-cloud, platform-engineering, sre-practices, internal-developer-platform, kubernetes-operators, gitops-advanced, progressive-delivery, policy-as-code, cloud-migration, cloud-architecture)
│   ├── management/   17 skills (11 + cost-benefit, hiring, stakeholder, agile-scrum-kanban, team-topology, change-management)
│   ├── enterprise/   15 skills (8 + high-availability, business-continuity, capacity-planning, togaf-zachman, itil-service-mgmt, vendor-management, architecture-governance)
│   ├── product/       10 skills (8 + customer-journey, persona-development)
│   ├── ai/            15 skills
│   ├── ml/            16 skills (15 + math-foundations)
│   ├── security/      15 skills
│   ├── data-science/   4 skills
│   ├── data/          36 skills
│   ├── design/        8 skills
│   ├── quality/       8 skills
└── bundles/
    └── bundle-definitions.json
```

Total: **409 SKILL.md** + **1165+ reference .md files** + **17 docs/ guides** + **agent configs** = **1419+ files**.

## License

MIT © j4flmao
