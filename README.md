# @j4flmao/agent-skills

641 agent skills for software development, from planning and architecture to backend, frontend, mobile, desktop, DevOps, data, AI/ML, security, blockchain, games, low-level systems and quantum computing. Each skill is a `SKILL.md` with triggers, rules and a response format, plus optional deep-dive `references/`.

| | Count |
|---|---|
| Skills (`SKILL.md`) | 641 in 43 categories |
| Reference files | 3,942 |
| Bundles | 59 (43 focused, 16 broad) |
| Advisor tracks | 78 |
| Agent integrations | 8 (Claude Code, Codex CLI, OpenCode, Amp, Cursor, Gemini, GitHub Copilot, Windsurf) |

## Not sure what to install? Start with the advisor

**[Skill Combination Advisor →](skill-advisor/README.md)** — pick a track for your role, choose a level (Essentials → Professional → Specialist), and copy one install command.

| Area | Tracks |
|------|--------|
| Build products | [Frontend Engineer](skill-advisor/tracks/frontend.md) · [Backend Engineer](skill-advisor/tracks/backend.md) · [Full-Stack Product Team](skill-advisor/tracks/fullstack.md) · [Mobile Engineer](skill-advisor/tracks/mobile.md) · [Desktop App Engineer](skill-advisor/tracks/desktop.md) · [Designer & Design Engineer](skill-advisor/tracks/design-ux.md) |
| Stack specialists | [React & Next.js Developer](skill-advisor/tracks/react.md) · [Vue & Nuxt Developer](skill-advisor/tracks/vue.md) · [Angular Developer](skill-advisor/tracks/angular.md) · [Node.js & TypeScript Backend](skill-advisor/tracks/node-backend.md) · [Python Backend Developer](skill-advisor/tracks/python-backend.md) · [Go Backend Developer](skill-advisor/tracks/go-backend.md) · [Java & Kotlin Backend Developer](skill-advisor/tracks/java-kotlin-backend.md) · [.NET Developer](skill-advisor/tracks/dotnet.md) · [PHP & Ruby Web Developer](skill-advisor/tracks/php-ruby.md) · [iOS Developer](skill-advisor/tracks/ios.md) · [Android Developer](skill-advisor/tracks/android.md) · [Flutter Developer](skill-advisor/tracks/flutter.md) · [React Native Developer](skill-advisor/tracks/react-native.md) · [Rust Developer](skill-advisor/tracks/rust.md) · [Elixir & Phoenix Developer](skill-advisor/tracks/elixir.md) · [Svelte, Solid, Astro & Qwik Developer](skill-advisor/tracks/modern-frontend.md) |
| Cloud and operations | [DevOps & Platform Engineer](skill-advisor/tracks/devops-platform.md) · [Site Reliability Engineer](skill-advisor/tracks/sre.md) · [Cloud Architect & Engineer](skill-advisor/tracks/cloud.md) · [Observability Engineer](skill-advisor/tracks/observability.md) · [Database Engineer](skill-advisor/tracks/database.md) · [Platform Engineer (IDP)](skill-advisor/tracks/platform-engineering.md) · [FinOps & Cloud Cost Engineer](skill-advisor/tracks/finops.md) |
| Data and AI | [Data Engineer](skill-advisor/tracks/data-engineering.md) · [ML & AI Engineer](skill-advisor/tracks/ml-ai.md) · [AI Agent Builder](skill-advisor/tracks/ai-agents.md) · [LLM Application Developer](skill-advisor/tracks/llm-app.md) · [MLOps Engineer](skill-advisor/tracks/mlops.md) · [Data Scientist & Analyst](skill-advisor/tracks/data-scientist.md) · [Analytics Engineer](skill-advisor/tracks/analytics-engineer.md) · [Streaming & Event Data Engineer](skill-advisor/tracks/streaming.md) · [Search & Retrieval Engineer](skill-advisor/tracks/search.md) · [Prompt Engineer & AI Evaluator](skill-advisor/tracks/prompt-engineer.md) · [AI Safety & LLM Red Team](skill-advisor/tracks/ai-safety.md) · [GPU Kernel & Inference Engineer](skill-advisor/tracks/gpu-kernels.md) |
| Security | [Security Engineer](skill-advisor/tracks/security.md) · [Application Security & DevSecOps](skill-advisor/tracks/appsec.md) · [SOC Analyst & Detection Engineer](skill-advisor/tracks/soc.md) · [Compliance & Privacy Engineer](skill-advisor/tracks/compliance.md) |
| Game development | [Game Developer](skill-advisor/tracks/game.md) · [Unity Developer](skill-advisor/tracks/unity.md) · [Unreal Engine Developer](skill-advisor/tracks/unreal.md) · [Godot Developer](skill-advisor/tracks/godot.md) · [Game Engine Programmer](skill-advisor/tracks/engine-programmer.md) · [Online Game Backend Engineer](skill-advisor/tracks/game-backend.md) |
| Product types | [SaaS Product Builder](skill-advisor/tracks/saas.md) · [E-commerce Engineer](skill-advisor/tracks/ecommerce.md) · [Real-Time Apps Developer](skill-advisor/tracks/realtime.md) · [Blockchain & Web3 Engineer](skill-advisor/tracks/blockchain.md) · [DeFi Protocol Engineer](skill-advisor/tracks/defi.md) |
| Specialized engineering | [Systems & Embedded Engineer](skill-advisor/tracks/systems.md) · [Software & Solution Architect](skill-advisor/tracks/architecture.md) · [Performance Engineer](skill-advisor/tracks/performance.md) · [Accessibility Specialist](skill-advisor/tracks/accessibility.md) · [QA & Test Engineer](skill-advisor/tracks/quality.md) · [Low-Latency & HFT Engineer](skill-advisor/tracks/low-latency.md) · [IoT & Edge Engineer](skill-advisor/tracks/iot-edge.md) · [Zero-Knowledge & Cryptography Engineer](skill-advisor/tracks/zk.md) · [Quantum Computing Researcher](skill-advisor/tracks/quantum.md) · [Microservices Engineer](skill-advisor/tracks/microservices.md) · [GraphQL API Engineer](skill-advisor/tracks/graphql.md) · [Legacy Modernization Lead](skill-advisor/tracks/legacy-modernization.md) |
| Roles and career | [Startup CTO & Solo Founder](skill-advisor/tracks/startup-cto.md) · [Tech Lead & Staff Engineer](skill-advisor/tracks/tech-lead.md) · [Product Manager & Planner](skill-advisor/tracks/product.md) · [Engineering Manager & Delivery Lead](skill-advisor/tracks/management.md) · [Open-Source Maintainer](skill-advisor/tracks/oss-maintainer.md) · [Technical Writer & Docs Engineer](skill-advisor/tracks/technical-writer.md) · [Beginner Learning Path](skill-advisor/tracks/beginner.md) |
| Delivery and growth | [QA Automation Engineer](skill-advisor/tracks/qa-automation.md) · [SEO & Web Growth Engineer](skill-advisor/tracks/web-growth.md) · [Agile Coach & Scrum Master](skill-advisor/tracks/agile-coach.md) |

Also: [all bundles with install commands](skill-advisor/bundles.md) · [build your own bundle](skill-advisor/custom-bundles.md) · [recipes for common situations](skill-advisor/recipes.md).

## Installation

### Option 1 — `npx skills` (recommended)

The [`skills` CLI](https://github.com/vercel-labs/skills) installs skills by name. Repeat `--skill` for each one:

```bash
npx skills add j4flmao/agent-skills --list                      # list every skill name
npx skills add j4flmao/agent-skills --skill backend-api-design --skill backend-idempotency
npx skills add j4flmao/agent-skills --skill backend-api-design -a claude-code -g   # one agent, global
```

There is no `--bundle` flag in the CLI: a bundle is a list of `--skill` options. Every bundle's full command is on the [bundles page](skill-advisor/bundles.md); teams can also pin a set in `package.json` (see [Build your own bundle](skill-advisor/custom-bundles.md#option-4--share-a-fixed-set-with-your-team-skill-pack)).

### Option 2 — Use this repository directly

Agent configs are already in the repo. Clone it and open it in your agent:

```bash
git clone https://github.com/j4flmao/agent-skills
cd agent-skills
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

### Option 3 — Copy from a local clone (offline)

```bash
git clone https://github.com/j4flmao/agent-skills ~/agent-skills
cd ~/agent-skills
node scripts/pack-skills.js --out /path/to/project/.claude/skills --bundle ai-agents
node scripts/pack-skills.js --out /path/to/project/.claude/skills backend-api-design backend-idempotency
```

`pack-skills.js` also copies the shared reference files a skill links to, so links keep working.

## Bundles

59 bundles, defined in [`bundles/bundle-definitions.json`](bundles/bundle-definitions.json); every skill belongs to at least one. Prefer a focused bundle: agents list every installed skill in their context, so smaller sets route more precisely.

**Focused bundles** (under 60 skills)

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`access-control`](skill-advisor/bundles.md#access-control) | 7 | Authentication and authorization: auth patterns, RBAC, ABAC, fine-grained policies, identity providers, zero trust identity |
| [`advanced-security-bundle`](skill-advisor/bundles.md#advanced-security-bundle) | 11 | Advanced security skills including red team, blue team, and cloud attacks (educational) |
| [`ai-agents`](skill-advisor/bundles.md#ai-agents) | 14 | Building AI agents: architectures, memory, tool calling, multi-agent topologies, observability, sandboxing, agent planning docs |
| [`ai-engineering`](skill-advisor/bundles.md#ai-engineering) | 26 | AI engineering: LLM apps, RAG, prompting, fine-tuning, inference, vector search, agent harnesses |
| [`api-all`](skill-advisor/bundles.md#api-all) | 9 | API ecosystem: GraphQL Federation, API product management, API design, API gateway |
| [`architecture-system-design`](skill-advisor/bundles.md#architecture-system-design) | 23 | Software and solution architecture: system design, DDD, microservices, event-driven, CQRS/ES, sagas, CRDTs, sharding, consensus, ADRs |
| [`backend-capabilities`](skill-advisor/bundles.md#backend-capabilities) | 10 | Backend product capabilities: caching, event-driven, GraphQL, bulk import, email, SMS, reports, real-time |
| [`backend-patterns`](skill-advisor/bundles.md#backend-patterns) | 27 | Advanced backend patterns: CQRS, Event Sourcing, Saga, Transactional Outbox + related universal skills |
| [`blockchain-all`](skill-advisor/bundles.md#blockchain-all) | 20 | All blockchain skills: core, cryptography, Ethereum, Bitcoin, patterns, application, web3, testing, infrastructure, security, management, Solana, DeFi, cross-chain, ZK, data indexing |
| [`cloud-architecture`](skill-advisor/bundles.md#cloud-architecture) | 15 | Cloud architecture: landing zone, well-architected framework, governance, multi-cloud |
| [`data-engineering`](skill-advisor/bundles.md#data-engineering) | 45 | Data engineering: pipelines, orchestration, streaming/CDC, lakes and lakehouses, warehousing, modeling, quality, governance |
| [`data-platform`](skill-advisor/bundles.md#data-platform) | 39 | Data platform: ETL, warehouse, streaming, BI, quality, storage, compute, lake, lakehouse, batch, orchestration, CDC, replication, catalog, observability, contracts, mesh, versioning, API, virtualization, schema registry, relational, NoSQL, graph, search, clean-room, cost-optimization, formats, lineage, pipeline-CI/CD, testing, reverse-ETL |
| [`design-ux`](skill-advisor/bundles.md#design-ux) | 14 | Design and UX: visual design, design systems, accessibility, motion, IA, brand, UX research, theming, visual testing |
| [`desktop-all`](skill-advisor/bundles.md#desktop-all) | 30 | Desktop: Electron, Tauri, Qt, Gtk, WPF, WinUI, UWP, WinForms, SwiftUI, AppKit, GNOME, KDE |
| [`dev-workflow`](skill-advisor/bundles.md#dev-workflow) | 23 | Developer workflow: code review, debugging, refactoring, git, PRs, changelogs, dev containers, CI, monorepos, dependencies |
| [`ecommerce-all`](skill-advisor/bundles.md#ecommerce-all) | 13 | E-commerce: payment processing, checkout and cart, order management |
| [`embedded-iot`](skill-advisor/bundles.md#embedded-iot) | 9 | Embedded and IoT: RTOS, bare-metal Rust, C/C++ patterns, IoT protocols, edge AI |
| [`enterprise`](skill-advisor/bundles.md#enterprise) | 18 | Enterprise: governance, compliance, identity, multi-tenancy, legacy migration, ITIL, vendors, FinOps, release engineering |
| [`fintech-payments`](skill-advisor/bundles.md#fintech-payments) | 13 | Fintech and payments: ledgers, payment processing, checkout, idempotency, audit trails, data masking, compliance |
| [`frontend-foundations`](skill-advisor/bundles.md#frontend-foundations) | 28 | Frontend foundations for any framework: TypeScript, CSS strategy, responsive design, auth, error handling, security, forms, data fetching, state |
| [`frontend-frameworks`](skill-advisor/bundles.md#frontend-frameworks) | 24 | Frontend frameworks beyond React/Vue/Angular: Svelte, Solid, Qwik, Astro, Remix, Preact, Lit, Stencil, Ember, htmx, Alpine |
| [`game-development`](skill-advisor/bundles.md#game-development) | 32 | Game development: engines, ECS, rendering, physics, animation, audio, input, streaming, netcode, game servers |
| [`game-server`](skill-advisor/bundles.md#game-server) | 9 | Online game backends: authoritative servers, netcode, interest management, matchmaking, anti-cheat, scaling |
| [`gpu-hpc`](skill-advisor/bundles.md#gpu-hpc) | 14 | GPU and high-performance computing: CUDA, Triton, PTX/SASS, attention kernels, quantization, distributed training, RDMA |
| [`infra-cloud`](skill-advisor/bundles.md#infra-cloud) | 36 | Infrastructure & Cloud: IaC, CI/CD, K8s, cloud providers, observability, networking |
| [`infra-foundations`](skill-advisor/bundles.md#infra-foundations) | 15 | Infrastructure foundations: Docker, Terraform, Ansible, Consul, networking, storage, bare metal, datacenters, hybrid cloud |
| [`kubernetes-platform`](skill-advisor/bundles.md#kubernetes-platform) | 36 | Kubernetes and platform engineering: clusters, operators, Helm, GitOps, service mesh, autoscaling, policy, IDPs |
| [`languages`](skill-advisor/bundles.md#languages) | 14 | Programming language deep dives: TypeScript, Python, Go, Rust, Java, Kotlin, Swift, C#, C, C++, Scala, Elixir, Dart, Assembly |
| [`ml-engineering`](skill-advisor/bundles.md#ml-engineering) | 24 | Machine learning and data science: classical/deep learning, features, evaluation, serving, MLOps, experimentation |
| [`mobile-cross-platform`](skill-advisor/bundles.md#mobile-cross-platform) | 28 | Cross-platform mobile: Flutter, React Native, Kotlin Multiplatform, Ionic/Capacitor, .NET MAUI, internals, localization, widgets |
| [`personas`](skill-advisor/bundles.md#personas) | 17 | Expert personas: architects, engineers by domain, PM, QA, SRE, security, red team, SOC, GPU, game engine, quantum, smart-contract auditor |
| [`planning-docs`](skill-advisor/bundles.md#planning-docs) | 17 | Planning and specification documents: briefs, PRDs, stories, tech specs, roadmaps, BDD/ATDD, BPMN, cost-benefit, agent plans |
| [`product-growth`](skill-advisor/bundles.md#product-growth) | 18 | Product management and growth: discovery, analytics, A/B tests, pricing, GTM, onboarding, roadmaps, PRDs, OKRs |
| [`quality-testing`](skill-advisor/bundles.md#quality-testing) | 20 | Quality engineering: unit, integration, contract, E2E, visual, load, property-based, regression, smoke, acceptance testing |
| [`quantum-computing`](skill-advisor/bundles.md#quantum-computing) | 12 | Quantum computing: qubits and gates, algorithms (Grover, Shor), Qiskit, error correction, post-quantum cryptography |
| [`research-frontier`](skill-advisor/bundles.md#research-frontier) | 12 | Research and frontier topics: information theory, statistical mechanics, neuromorphic computing, roadmapping, R&D prototypes |
| [`security-all`](skill-advisor/bundles.md#security-all) | 30 | All security skills: SAST/DAST, SBOM, secrets, container, API, data, Zero Trust, EDR, SOC, SIEM, SOAR, Threat Intel |
| [`serverless-edge`](skill-advisor/bundles.md#serverless-edge) | 9 | Serverless and edge: Lambda/Functions, cold starts, Cloudflare Workers, orchestration, event-driven scaling, CDN |
| [`soc-all`](skill-advisor/bundles.md#soc-all) | 18 | SOC: operations, SIEM engineering, SOAR automation, threat intelligence, EDR/XDR |
| [`sre-reliability`](skill-advisor/bundles.md#sre-reliability) | 20 | Reliability engineering: SLOs, incident response, observability, chaos, capacity, HA, DR, alerting |
| [`starter-playbooks`](skill-advisor/bundles.md#starter-playbooks) | 7 | End-to-end playbooks: AI SaaS, high-scale e-commerce, web3 dApp, with the core planning and orchestration skills |
| [`systems-programming`](skill-advisor/bundles.md#systems-programming) | 17 | Systems programming: C/C++/Rust/assembly, compilers, kernels, eBPF, networking, lock-free and kernel-bypass |
| [`web-performance-seo`](skill-advisor/bundles.md#web-performance-seo) | 14 | Web performance and SEO: Core Web Vitals, rendering strategies, images, caching, structured data, programmatic SEO |

**Broad bundles** (stack or role, 60+ skills)

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`fullstack-nestjs-react`](skill-advisor/bundles.md#fullstack-nestjs-react) | 225 | Full stack: NestJS backend + React frontend |
| [`fullstack-golang-vue`](skill-advisor/bundles.md#fullstack-golang-vue) | 218 | Full stack: Go backend + Vue frontend |
| [`fullstack-rust-angular`](skill-advisor/bundles.md#fullstack-rust-angular) | 217 | Full stack: Rust backend + Angular frontend |
| [`fullstack-dotnet-react`](skill-advisor/bundles.md#fullstack-dotnet-react) | 218 | Full stack: C# .NET backend + React frontend |
| [`fullstack-nodejs-react`](skill-advisor/bundles.md#fullstack-nodejs-react) | 223 | Full stack: Node.js backend + React frontend |
| [`fullstack-elysia-react`](skill-advisor/bundles.md#fullstack-elysia-react) | 218 | Full stack: ElysiaJS (Bun) backend + React frontend |
| [`fullstack-rails-svelte`](skill-advisor/bundles.md#fullstack-rails-svelte) | 216 | Full stack: Ruby on Rails backend + SvelteKit frontend |
| [`backend-only`](skill-advisor/bundles.md#backend-only) | 184 | Backend-only: OOP, design patterns, microservices, clean architecture, API, DB, auth, testing, all stacks |
| [`frontend-only`](skill-advisor/bundles.md#frontend-only) | 66 | Frontend-only: Design system, state, performance, a11y, patterns, microfrontend, testing, all frameworks |
| [`devops-only`](skill-advisor/bundles.md#devops-only) | 68 | DevOps-only: Docker, CI/CD, K8s, monitoring, IaC, automation |
| [`management-only`](skill-advisor/bundles.md#management-only) | 66 | Management: PM, BA, QA, QC, security, pentesting, alerting, team-rules |
| [`mobile-ios`](skill-advisor/bundles.md#mobile-ios) | 116 | Mobile iOS: Swift, SwiftUI, UIKit, CI/CD deployment |
| [`mobile-android`](skill-advisor/bundles.md#mobile-android) | 116 | Mobile Android: Kotlin, Jetpack Compose, Room, Hilt, CI/CD deployment |
| [`mobile-flutter`](skill-advisor/bundles.md#mobile-flutter) | 120 | Flutter + universal mobile skills + deployment |
| [`mobile-react-native`](skill-advisor/bundles.md#mobile-react-native) | 120 | React Native + universal mobile skills + deployment |
| [`backend-stacks`](skill-advisor/bundles.md#backend-stacks) | 83 | Backend frameworks and runtimes: Node (Express/Fastify/Hono/Nest), Bun, Deno, Go, Rust, Python, Java/Kotlin, .NET, PHP, Ruby, Elixir, Swift, Scala |

## How skills work

1. You describe the problem in plain words.
2. The agent matches trigger phrases in the installed skills' descriptions.
3. It loads the matching `SKILL.md`, and its `references/` only when it needs depth.
4. It answers in that skill's response format.

```
"write a brief for a chat app"          → create-brief
"design the order database schema"       → backend-database-patterns
"review this PR for security issues"     → code-review
"set up Docker for this project"         → docker-patterns
"build an iOS order list screen"         → ios
```

No match? The agent routes through `master-orchestrator`, detects the stack, and picks a skill.

## Skills by category

| Category | Skills | Reference files |
|----------|--------|-----------------|
| `backend` | 91 | 763 |
| `devops` | 70 | 511 |
| `frontend` | 60 | 397 |
| `data` | 39 | 380 |
| `game` | 29 | 108 |
| `mobile` | 28 | 234 |
| `security` | 23 | 157 |
| `blockchain` | 19 | 238 |
| `cloud-native` | 18 | 16 |
| `enterprise` | 18 | 133 |
| `management` | 18 | 134 |
| `ml` | 17 | 122 |
| `personas` | 17 | 0 |
| `languages` | 14 | 74 |
| `planning` | 13 | 102 |
| `ai` | 12 | 3 |
| `dev-loop` | 12 | 76 |
| `hardware-acceleration` | 11 | 0 |
| `quality` | 11 | 102 |
| `desktop` | 10 | 72 |
| `product` | 9 | 76 |
| `niche` | 8 | 0 |
| `quantum-computing` | 8 | 0 |
| `architecture` | 7 | 1 |
| `cybersecurity` | 7 | 0 |
| `design` | 7 | 54 |
| `embedded-systems` | 6 | 0 |
| `rnd` | 6 | 0 |
| `ecommerce` | 5 | 16 |
| `low-level` | 5 | 6 |
| `core` | 4 | 39 |
| `data-science` | 4 | 24 |
| `fundamental-truths` | 4 | 0 |
| `prompt-engineering` | 4 | 15 |
| `seo` | 4 | 1 |
| `site-reliability-engineering` | 4 | 8 |
| `system-design` | 4 | 2 |
| `web` | 4 | 0 |
| `playbooks` | 3 | 0 |
| `tools` | 3 | 0 |
| `harness-engineering` | 2 | 70 |
| `quality-assurance` | 2 | 0 |
| `aspirational` | 1 | 8 |

The full list of skill names per category is in [docs/skills-master-summary.md](docs/skills-master-summary.md); the routing keywords are in [.claude/rules/routing.md](.claude/rules/routing.md).

## Repository layout

```
agent-skills/
├── skills/            641 skills in 43 categories (+ references/)
├── skill-advisor/     Skill Combination Advisor: 78 tracks, bundles, recipes, custom bundles
├── bundles/           bundle-definitions.json (single source of truth for bundles)
├── docs/              reliability spec, governance matrix, master summary
├── reports/           research reports (evaluation architecture, visual testing)
├── scripts/           validators, generate-docs.js, pack-skills.js
├── AGENTS.md          repository-wide agent reliability rules
└── .claude/ .codex/ .opencode/ .amp/ .cursor/ .gemini/ .github/ .windsurf/   agent configs
```

## Maintaining

```bash
npm run docs       # regenerate README, docs/skills-master-summary.md and skill-advisor/ from the data
npm run validate   # names, bundles, routing, links, fences, deprecated APIs, and stale generated docs
```

Edit skills, `bundles/bundle-definitions.json` or `skill-advisor/tracks.json`, then run both. CI runs the same checks plus an external link check on every push and pull request (`.github/workflows/pr-static.yml`).

## Output compression

Every skill enforces: **no filler, no preamble, no postamble**. The rules live in `.claude/rules/compression.md` and the matching files of each agent config.

## License

MIT © j4flmao
