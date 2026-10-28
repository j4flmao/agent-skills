# @j4flmao/agent-skills

641 agent skills for software development — planning, architecture, low-level, backend, frontend, desktop, mobile, devops, management, enterprise, product, ml, ai, security, data, data-science, design, quality, blockchain, prompt-engineering, cloud-native, system-design, site-reliability-engineering, game. Each skill is a `SKILL.md` defining triggers, rules, and response format.


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
npx skills add j4flmao/agent-skills            # all 641 skills
npx skills add j4flmao/agent-skills --bundle backend-only
npx skills add j4flmao/agent-skills -g          # global (every project)
```

## Bundles

```bash
npx skills add j4flmao/agent-skills --bundle <name>
```

| Bundle | Skills | Description |
|--------|--------|-------------|
| `blockchain-all` | 16 | All blockchain: core, cryptography, Ethereum, Bitcoin, patterns, application, web3, testing, infrastructure, security, management, Solana, DeFi, cross-chain, ZK, data indexing |
| `fullstack-nestjs-react` | 225 | NestJS + React |
| `fullstack-golang-vue` | 225 | Go + Vue |
| `fullstack-rust-angular` | 225 | Rust + Angular |
| `fullstack-dotnet-react` | 225 | .NET + React |
| `fullstack-nodejs-react` | 225 | Node.js + React |
| `fullstack-elysia-react` | 225 | ElysiaJS + React |
| `fullstack-rails-svelte` | 223 | Rails + SvelteKit |
| `backend-only` | 186 | Backend only (includes ai, ml, security, data skills) |
| `backend-patterns` | 27 | CQRS, Event Sourcing, Saga, Outbox + universal patterns |
| `infra-cloud` | 36 | Infrastructure & Cloud: IaC, CI/CD, K8s, cloud providers, observability |
| `security-all` | 23 | All security: Zero Trust, CSPM, EDR, SOC, SIEM, SOAR, Threat Intel, Red Team, Blue Team |
| `advanced-security-bundle` | 11 | Advanced security (Educational): Red Team, Blue Team, Cloud Attacks, Exploit Patterns |
| `frontend-only` | 66 | Frontend only (includes design skills) |
| `devops-only` | 68 | DevOps only (includes security, nomad, consul, incident-response) |
| `management-only` | 65 | Management only (includes data, quality, cost-benefit, hiring, stakeholder) |
| `mobile-ios` | 116 | iOS + universal mobile skills + deployment |
| `mobile-android` | 116 | Android + universal mobile skills + deployment |
| `mobile-flutter` | 120 | Flutter + universal mobile skills + deployment |
| `mobile-react-native` | 120 | React Native + universal mobile skills + deployment |
| `desktop-all` | 30 | Desktop: Electron, Tauri, Qt, Gtk, WPF, WinUI, UWP, WinForms, SwiftUI, AppKit, GNOME, KDE |
| `data-platform` | 39 | ETL, warehouse, streaming, BI, quality, storage, compute, lake, lakehouse, batch, orchestration, CDC, replication, catalog, observability, contracts, mesh, versioning, API, virtualization, schema registry, relational, NoSQL, graph, search, clean-room, cost-optimization, formats, lineage, pipeline-CI/CD, testing, reverse-ETL |
| `soc-all` | 18 | SOC: operations, SIEM engineering, SOAR automation, threat intelligence, EDR/XDR |
| `cloud-architecture` | 15 | Cloud architecture: landing zone, well-architected framework, governance, multi-cloud |
| `ecommerce-all` | 13 | E-commerce: payment processing, checkout and cart, order management |
| `api-all` | 9 | API ecosystem: GraphQL Federation, API product management, API design, API gateway |

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
User: "build an iOS order list screen"         → ios
```

No keyword match? Agent routes through `master-orchestrator`, detects the project stack, and picks the right skill.

## Skills Table

| Category | Skills (frontmatter `name`) |
|----------|--------|
| **backend** (91) | `backend-bulk-import`, `bun`, `backend-caching-strategies`, `deno`, `oak-backend`, `dotnet-architecture`, `dotnet-patterns`, `backend-elixir`, `elysia-architecture`, `elysia-patterns`, `backend-event-driven-architecture`, `golang-architecture`, `golang-patterns`, `backend-graphql-optimization`, `micronaut`, `quarkus-backend`, `kotlin-architecture`, `kotlin-backend-patterns`, `nestjs-architecture`, `nestjs-patterns`, `nodejs-architecture`, `nodejs-drizzle`, `nodejs-express-skill`, `nodejs-fastify`, `nodejs-hono`, `nodejs-patterns`, `nodejs-prisma`, `php-laravel`, `php-pure`, `symfony-backend`, `php-zend`, `python-django-architecture`, `python-fastapi-architecture`, `flask-backend`, `backend-report-generation`, `ruby-rails`, `rust-architecture`, `rust-patterns`, `scala-play`, `backend-sms-messaging`, `spring-boot-architecture`, `spring-boot-patterns`, `vapor-backend`, `backend-transactional-email`, `backend-api-design`, `backend-api-response`, `backend-api-versioning`, `api-graphql-federation`, `api-product-management`, `backend-audit-logging`, `backend-auth-patterns`, `backend-authorization`, `backend-background-jobs`, `backend-bff-pattern`, `backend-caching`, `backend-clean-architecture`, `backend-concurrency-mechanics`, `backend-contract-testing`, `backend-cqrs-patterns`, `backend-data-masking`, `backend-data-streaming`, `backend-database-patterns`, `design-patterns`, `microservice-design-patterns`, `backend-distributed-locking`, `backend-event-driven`, `backend-event-sourcing`, `backend-feature-flags`, `backend-file-storage`, `firebase`, `backend-graphql-patterns`, `backend-grpc-patterns`, `backend-idempotency`, `backend-internationalization`, `backend-load-testing`, `backend-message-queue`, `microservices`, `backend-multi-tenancy`, `backend-openapi-documentation`, `backend-plugin-architecture`, `rate-limiting`, `backend-resilience-patterns`, `backend-scheduling-cron`, `backend-search-patterns`, `backend-serverless`, `backend-structured-logging`, `supabase`, `backend-transactional-outbox`, `backend-webhooks`, `backend-websocket-patterns`, `backend-web-real-time` |
| **devops** (70) | `alibaba-cloud`, `ansible`, `api-documentation`, `apm-observability`, `argo-cd`, `aws`, `devops-azure`, `backup-dr`, `bare-metal`, `cdn-edge`, `devops-chaos-engineering`, `github-actions-pipelines`, `gitops-argocd`, `cicd-pipeline`, `cilium-ebpf`, `circleci`, `cloud-architecture`, `cloud-cost-optimization`, `cloud-migration`, `consul`, `database-migration`, `datacenter`, `devops-dataops`, `dependency-management`, `digitalocean`, `devops-docker`, `docker-patterns`, `devops-finops`, `devops-gcp`, `github-actions`, `devops-gitlab-ci`, `gitops`, `devops-gitops-advanced`, `helm-patterns`, `hetzner-cloud`, `hybrid-cloud`, `ansible-automation`, `terraform-patterns`, `ibm-cloud`, `devops-incident-response`, `devops-internal-developer-platform`, `jenkins`, `kubernetes`, `devops-kubernetes-autoscaling`, `devops-kubernetes-for-data`, `kubernetes-internals`, `devops-kubernetes-operators`, `longhorn`, `devops-mlops`, `monitoring`, `monorepo`, `devops-network-infrastructure`, `nomad`, `observability`, `opentelemetry-tracing`, `prometheus-grafana`, `devops-opentelemetry`, `oracle-cloud`, `docker-internals`, `kubernetes-architecture`, `devops-platform-engineering`, `devops-policy-as-code`, `devops-progressive-delivery`, `devops-pulumi`, `devops-serverless`, `devops-service-mesh`, `devops-sre-practices`, `storage-infrastructure`, `terraform`, `vault` |
| **frontend** (60) | `micro-frontends-adoption`, `react-server-components`, `alpinejs`, `angular-architecture`, `angular-patterns`, `module-federation-runtime-sharing`, `webgpu-webgl-rendering`, `frontend-astro-architecture`, `frontend-astro-patterns`, `frontend-playwright-testing`, `ember`, `htmx`, `frontend-lit`, `nextjs-internals`, `preact`, `frontend-qwik-architecture`, `frontend-qwik-patterns`, `react-architecture`, `react-nextjs`, `react-fiber-architecture`, `frontend-remix-architecture`, `frontend-remix-patterns`, `frontend-solidjs-architecture`, `frontend-solidjs-patterns`, `react-zustand-redux-toolkit`, `stencil`, `frontend-svelte-architecture`, `frontend-svelte-patterns`, `sveltekit`, `frontend-accessibility`, `frontend-animation`, `frontend-authentication`, `frontend-browser-caching`, `frontend-bundler-tools`, `frontend-css-strategy`, `frontend-data-fetching`, `frontend-design-system`, `frontend-error-handling`, `frontend-feature-flags`, `frontend-form-handling`, `frontend-image-optimization`, `frontend-internationalization`, `microfrontend`, `frontend-patterns`, `frontend-performance`, `frontend-pwa`, `frontend-rendering-strategies`, `frontend-responsive-design`, `frontend-security`, `frontend-seo`, `frontend-state-management`, `frontend-storybook`, `frontend-tailwind-css`, `frontend-testing`, `frontend-theming`, `frontend-typescript-patterns`, `frontend-web-components`, `vue-architecture`, `vue-nuxt`, `frontend-vue-patterns` |
| **data** (39) | `data-batch-processing`, `data-bi-tools`, `data-data-api`, `data-data-catalog`, `data-clean-room`, `data-data-contracts`, `data-cost-optimization`, `data-lake-architecture`, `data-kafka-event-streaming`, `data-formats`, `data-data-lake`, `data-data-lakehouse`, `data-lineage`, `data-data-mesh`, `data-modeling`, `data-data-observability`, `data-pipeline-cicd`, `data-data-platform`, `data-data-quality`, `data-data-strategy`, `data-testing`, `data-data-versioning`, `data-data-virtualization`, `data-data-warehouse`, `database-internals-mechanics`, `data-dimensional-modeling`, `data-distributed-compute`, `data-distributed-storage`, `data-etl-pipeline`, `data-airflow-dbt-orchestration`, `data-feature-store`, `data-graph-database`, `data-nosql-database`, `data-relational-database`, `data-reverse-etl`, `data-schema-registry`, `data-search-engine`, `data-streaming`, `data-vector-databases` |
| **game** (29) | `animation-systems`, `audio-engine`, `input-systems`, `level-streaming`, `cocos2d`, `ecs-architecture`, `cocos2d-patterns`, `godot-gdscript`, `physics-engine`, `unity-csharp`, `vulkan`, `asset-pipeline`, `ecs-pattern`, `job-system`, `math-foundation`, `memory-management`, `game-engine-multiplayer-netcode`, `game-engine-patterns`, `platform-abstraction`, `render-graph`, `anti-cheat-server`, `authoritative-server`, `interest-management`, `matchmaking-lobby`, `scaling-architecture`, `godot`, `multiplayer-netcode`, `unity`, `unreal` |
| **mobile** (28) | `android`, `flutter-internals`, `react-native-architecture`, `mobile-dotnet-maui`, `flutter-expertise`, `mobile-ionic-capacitor`, `ios`, `mobile-kotlin-multiplatform`, `mobile-localization`, `mobile-widgets`, `react-native-expertise`, `mobile-analytics`, `mobile-ar-vr`, `mobile-biometrics`, `mobile-camera-media`, `mobile-crash-reporting`, `mobile-deep-linking`, `mobile-deployment`, `mobile-in-app-purchase`, `map-location`, `mobile-networking`, `mobile-offline-first`, `mobile-patterns`, `mobile-performance`, `mobile-push-notifications`, `mobile-security`, `mobile-storage`, `mobile-testing` |
| **security** (23) | `abac-access-control`, `advanced-binary-exploitation`, `security-api-security`, `attack-patterns`, `blueteam-operations`, `security-container-security`, `security-data-security`, `detection-engineering`, `devsecops`, `edr-xdr`, `exploit-development-concepts`, `malware-analysis-internals`, `purpleteam-collaboration`, `rbac`, `redteam-operations`, `security-reverse-engineering`, `security-sast-dast`, `security-sbom`, `security-secrets-management`, `siem-engineering`, `soc-operations`, `threat-intelligence`, `threat-modeling` |
| **blockchain** (19) | `blockchain-application`, `blockchain-bitcoin`, `blockchain-core`, `blockchain-cross-chain`, `blockchain-cryptography`, `blockchain-data-indexing`, `blockchain-defi`, `blockchain-ethereum`, `blockchain-infrastructure`, `blockchain-management`, `blockchain-patterns`, `blockchain-security`, `blockchain-solana`, `blockchain-testing`, `blockchain-web3`, `blockchain-zk`, `defi-protocols`, `smart-contract-security`, `zero-knowledge-proofs` |
| **cloud-native** (18) | `cloud-native-aws-serverless`, `cloud-native-azure-functions`, `cloud-native-security-defensive`, `cloud-native-security-offensive`, `cloud-native-distributed-tracing`, `cloud-native-ebpf-networking`, `cloud-native-ebpf-observability`, `cloud-native-cloudflare-workers`, `cloud-native-serverless-orchestration`, `cloud-native-event-driven-scaling`, `cloud-native-gcp-bigquery`, `cloud-native-argocd-reconciliation`, `cloud-native-gitops-workflows`, `cloud-native-k8s-operators`, `cloud-native-kubernetes-mastery`, `cloud-native-kubernetes-patterns`, `cloud-native-serverless-cold-starts`, `istio-envoy-service-mesh-mechanics` |
| **enterprise** (18) | `enterprise-architecture-governance`, `enterprise-business-continuity`, `enterprise-capacity-planning`, `enterprise-compliance-audit`, `enterprise-cost-governance`, `enterprise-data-governance`, `enterprise-finops-cloud-cost`, `enterprise-high-availability`, `enterprise-identity-provider`, `enterprise-integration-patterns`, `enterprise-itil-service-mgmt`, `enterprise-legacy-migration`, `enterprise-multi-tenant`, `enterprise-rd-poc-management`, `enterprise-release-engineering`, `enterprise-sla-management`, `enterprise-togaf-zachman`, `enterprise-vendor-management` |
| **management** (18) | `agile-scrum`, `agile-scrum-kanban`, `alerting`, `ba`, `management-change-management`, `cost-benefit`, `management-hiring`, `management-okr-kpi`, `pentesting`, `pm`, `qa`, `qc`, `management-risk-management`, `security`, `sprint-retro`, `management-stakeholder`, `team-rules`, `management-team-topology` |
| **ml** (17) | `ml-anomaly-detection`, `ml-classical-ml`, `ml-computer-vision`, `ml-deep-learning`, `ml-experiment-tracking`, `ml-feature-engineering`, `ml-feature-store`, `ml-hyperparameter-tuning`, `ml-inference-optimization`, `ml-math-foundations`, `ml-ml-pipeline`, `ml-model-evaluation`, `ml-model-interpretability`, `ml-model-serving`, `ml-nlp`, `ml-recommendation-systems`, `ml-time-series` |
| **personas** (17) | `ai-architect`, `backend-engineer`, `data-analyst`, `data-engineer`, `devops-sre-engineer`, `frontend-engineer`, `gpu-engineer`, `lead-tech-game-engine`, `mobile-engineer`, `product-manager`, `qa-architect`, `quantum-scientist`, `red-team-operator`, `security-engineer`, `smart-contract-auditor`, `soc-analyst`, `system-architect` |
| **languages** (14) | `lang-assembly`, `lang-c`, `lang-cpp`, `lang-csharp`, `lang-dart`, `lang-elixir`, `go`, `java`, `lang-kotlin`, `python`, `lang-rust`, `lang-scala`, `lang-swift`, `typescript` |
| **planning** (13) | `write-implementation-plan`, `agent-task-checklist`, `agent-walkthrough-report`, `planning-bdd-atdd`, `planning-bpmn-modeling`, `planning-cost-benefit`, `create-brief`, `planning-create-pitch-deck`, `create-prd`, `planning-create-roadmap`, `create-story`, `create-tech-spec`, `planning-market-analysis` |
| **ai** (12) | `ai-agentic-workflows`, `ai-agent-architectures`, `ai-agent-core-loop`, `ai-agent-memory-systems`, `multi-agent-topology`, `tool-calling-principles`, `genai-vision`, `llm-kv-cache-paged-attention`, `llm-model-quantization`, `llm-rag-retrieval-internals`, `llm-finetuning`, `ai-multi-agent-systems` |
| **dev-loop** (12) | `dev-loop-api-client-generator`, `dev-loop-changelog-generator`, `code-review`, `dev-loop-debugging-strategy`, `dev-loop-dev-container`, `dev-loop-git-workflow`, `dev-loop-performance-profiler`, `dev-loop-pr-writer`, `dev-loop-readme-writer`, `dev-loop-refactor-guide`, `dev-loop-security-auditor`, `dev-loop-tech-debt-tracker` |
| **hardware-acceleration** (11) | `cuda-programming`, `distributed-training`, `extreme-quantization-mastery`, `flash-attention`, `paged-attention`, `ptx-assembly`, `rdma-roce`, `sass-machine-code`, `tensorrt-optimization`, `tpu-systolic-arrays`, `triton-kernels` |
| **quality** (11) | `quality-acceptance-testing`, `quality-contract-testing`, `e2e-testing`, `quality-integration-testing`, `quality-load-testing`, `quality-property-based-testing`, `quality-e2e-testing`, `quality-regression-testing`, `quality-smoke-testing`, `quality-unit-testing`, `quality-visual-testing` |
| **desktop** (10) | `desktop-appkit`, `desktop-electron`, `desktop-gnome`, `desktop-gtk`, `desktop-qt`, `desktop-swiftui`, `desktop-tauri`, `desktop-uwp`, `desktop-winforms`, `desktop-wpf` |
| **product** (9) | `product-ab-testing`, `product-analytics`, `product-customer-journey`, `product-go-to-market`, `product-growth-engineering`, `product-onboarding-flow`, `product-persona-development`, `product-pricing-strategy`, `product-user-research` |
| **niche** (8) | `defi-smart-contracts`, `double-entry-ledger`, `raytracing-mathematics`, `webgpu-compute-shaders`, `kernel-bypass-dpdk`, `lock-free-ring-buffers`, `ebpf-xdp-networking`, `llvm-compiler-architecture` |
| **quantum-computing** (8) | `grovers-algorithm`, `post-quantum-crypto`, `qiskit-framework`, `quantum-algorithms`, `quantum-entanglement`, `quantum-error-correction`, `qubits-and-gates`, `shors-algorithm` |
| **architecture** (7) | `architecture-crdts`, `architecture-postgresql-internals`, `architecture-database-scaling`, `architecture-event-driven`, `architecture-micro-frontends`, `architecture-domain-driven-design`, `architecture-microservices-patterns` |
| **cybersecurity** (7) | `blue-team-soc-operations`, `ebpf-threat-detection`, `modern-cryptography`, `owasp-web-security`, `red-team-pentest-methodology`, `reverse-engineering`, `zero-trust-identity` |
| **design** (7) | `design-accessibility`, `design-brand-identity`, `design-systems`, `design-information-architecture`, `design-motion-design`, `design-ux-research`, `design-visual-design` |
| **embedded-systems** (6) | `bare-metal-rust`, `c-cpp-patterns`, `edge-ai`, `iot-protocols`, `rtos`, `rtos-fundamentals` |
| **rnd** (6) | `local-slm-inference`, `multimodal-pipelines`, `swarm-architectures`, `adversarial-prompting`, `ai-defense-mechanisms`, `post-quantum-crypto-poc` |
| **ecommerce** (5) | `ecommerce-checkout-cart`, `checkout-optimization`, `headless-ecommerce`, `ecommerce-payment-processing`, `stripe-payments` |
| **low-level** (5) | `compiler-design`, `cpu-architecture`, `ebpf-engineering`, `kernel-development`, `network-protocols` |
| **core** (4) | `core-context-compressor`, `master-orchestrator`, `core-onboarding`, `project-init` |
| **data-science** (4) | `data-science-analytics-engineering`, `data-science-causal-inference`, `data-science-experimentation`, `data-science-statistical-analysis` |
| **fundamental-truths** (4) | `information-theory`, `neuromorphic-computing`, `fundamental-quantum-error-correction`, `statistical-mechanics` |
| **prompt-engineering** (4) | `prompt-chain-of-thought`, `prompt-few-shot`, `prompt-rag-query-design`, `prompt-tree-of-thoughts` |
| **seo** (4) | `seo-fundamentals`, `seo-ai-content-optimization`, `programmatic-seo`, `seo-structured-data` |
| **site-reliability-engineering** (4) | `sre-chaos-engineering`, `sre-incident-response`, `sre-observability-scaling`, `sre-sli-slo-management` |
| **system-design** (4) | `core-algorithms-system-design`, `system-design-database-sharding`, `distributed-consensus`, `system-design-rate-limiting` |
| **web** (4) | `web-micro-frontends-import-maps`, `nextjs-server-components`, `web-performance`, `web3d-webgl` |
| **playbooks** (3) | `ai-saas-playbook`, `high-scale-ecommerce`, `web3-dapp-playbook` |
| **tools** (3) | `advanced-workflows`, `conflict-resolution`, `husky-and-hooks` |
| **harness-engineering** (2) | `agent-observability`, `sandbox-execution` |
| **quality-assurance** (2) | `qa-chaos-engineering`, `qa-e2e-playwright` |
| **aspirational** (1) | `aspirational-roadmapping` |

Mobile universal skills apply across all platforms: patterns, testing, performance, security, networking, storage, deployment, push-notifications, in-app-purchase, crash-reporting, deep-linking, offline-first, biometrics, map-location, camera-media, analytics, widgets, localization.

Enterprise skills cover compliance, governance, identity, integration, legacy migration, multi-tenancy, SLA management, high availability (replica + load balancer + version sync + data migration), business continuity (BCP/DR, vendor risk, ransomware playbook), and capacity planning (forecasting + procurement). Product skills cover analytics, growth, onboarding, pricing, research, and feature prioritization.


## Architecture

```
agent-skills/
├── AGENTS.md        Repository-wide agent reliability rules (normative entry point)
├── .claude/         Claude Code (CLAUDE.md + INSTRUCTIONS.md + rules/ + skills/ + hooks/ + settings.json)
│   ├── skills/      Claude Code skills (commit, deploy, deep-research, fix-issue)
│   ├── hooks/       README + scripts/ (block-destructive.sh, log-changes.sh, session-start.sh)
│   └── logs/        Runtime hook logs (gitignored)
├── .opencode/       OpenCode (AGENTS.md + INSTRUCTIONS.md + commands/ + rules/)
├── .amp/            Amp (AGENTS.md + agent-skills.md + subagents.md + rules/)
├── .github/         GitHub Copilot (copilot-instructions.md + rules/)
├── .gemini/         Gemini (INSTRUCTIONS.md + rules/)
├── .cursor/         Cursor (INSTRUCTIONS.md + rules/*.mdc)
├── .windsurf/       Windsurf (INSTRUCTIONS.md + rules/)
├── .codex/          Codex CLI (AGENTS.md + INSTRUCTIONS.md + rules/ + hooks/ + skills/)
├── skills/          641 SKILL.md in 43 categories (each may have references/*.md)
│   ├── backend/ (91)  devops/ (70)  frontend/ (60)  data/ (39)  game/ (29)  mobile/ (28)
│   ├── security/ (23)  blockchain/ (19)  cloud-native/ (18)  enterprise/ (18)  management/ (18)
│   ├── ml/ (17)  personas/ (17)  languages/ (14)  planning/ (13)  ai/ (12)  dev-loop/ (12)
│   ├── quality/ (11)  hardware-acceleration/ (11)  desktop/ (10)  product/ (9)  niche/ (8)
│   ├── quantum-computing/ (8)  architecture/ (7)  cybersecurity/ (7)  design/ (7)
│   ├── embedded-systems/ (6)  rnd/ (6)  ecommerce/ (5)  low-level/ (5)  core/ (4)
│   ├── data-science/ (4)  fundamental-truths/ (4)  prompt-engineering/ (4)  seo/ (4)
│   ├── site-reliability-engineering/ (4)  system-design/ (4)  web/ (4)  playbooks/ (3)
│   └── tools/ (3)  harness-engineering/ (2)  quality-assurance/ (2)  aspirational/ (1)
├── bundles/         bundle-definitions.json (all bundles) + one <bundle>.json per published bundle
├── docs/            agent-reliability-spec.md, agent-governance-matrix.md, skills-master-summary.md
└── scripts/         validate-agent-governance.js (npm run validate:governance)
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
├── skills/          641 skills
│   ├── core/         4 skills
│   ├── planning/     13 skills (8 + bpmn-modeling, bdd-atdd, create-roadmap, create-pitch-deck, market-analysis)
│   ├── backend/      91 skills (46 universal + 45 stack/specialized)
│   │   ├── universal/    46 skills (incl. authorization, firebase, supabase)
│   │   ├── nodejs/       Node.js (architecture, patterns, express, prisma, fastify, hono, drizzle)
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
│   │   └── specialized/  bulk-import, caching-strategies, event-driven-architecture, fintech-patterns, graphql-optimization, report-generation, sms-messaging, transactional-email, web-real-time
│   ├── frontend/     60 skills (32 stack/specialized + 28 universal)
│   │   ├── universal/    28 skills
│   │   ├── react/        React (architecture, patterns)
│   │   ├── vue/          Vue (architecture, patterns, nuxt)
│   │   ├── angular/      Angular (architecture, patterns)
│   │   ├── svelte/       Svelte (architecture, patterns, sveltekit)
│   │   ├── remix/        Remix (architecture, patterns)
│   │   ├── astro/        Astro (architecture, patterns)
│   │   ├── solidjs/      SolidJS (architecture, patterns)
│   │   ├── qwik/         Qwik (architecture, patterns)
│   │   ├── nextjs/       Next.js
│   │   ├── lit/          Lit
│   │   ├── preact/       Preact
│   │   ├── alpinejs/     Alpine.js
│   │   ├── htmx/         htmx
│   │   ├── ember/        Ember.js
│   │   ├── stencil/      Stencil
│   │   ├── e2e-testing/  e2e testing
│   │   ├── state-management/  state management
│   │   ├── architecture/  frontend architecture
│   │   └── advanced-architecture/  advanced architecture
│   ├── desktop/     10 skills (12 dirs, kde/winui3 empty)
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
│   ├── mobile/      28 skills (universal 17 + 7 platforms + cross-platform 2 + localization/widgets)
│   │   ├── ios/           iOS native
│   │   ├── android/       Android native
│   │   ├── flutter/       Flutter
│   │   ├── react-native/  React Native
│   │   ├── kotlin-multiplatform/  KMP
│   │   ├── ionic-capacitor/       Ionic/Capacitor
│   │   ├── dotnet-maui/           .NET MAUI
│   │   ├── cross-platform/ 2 skills
│   │   └── universal/     17 skills (+ mobile-localization, mobile-widgets)
│   ├── dev-loop/     12 skills
│   ├── devops/       70 skills (incl. bare-metal, datacenter, network-infrastructure, storage-infrastructure, cdn-edge, hybrid-cloud, platform-engineering, sre-practices, internal-developer-platform, kubernetes-operators, gitops-advanced, progressive-delivery, policy-as-code, cloud-migration, cloud-architecture, nomad, consul, vault)
│   ├── management/   18 skills (incl. cost-benefit, hiring, stakeholder, agile-scrum-kanban, team-topology, change-management)
│   ├── enterprise/   18 skills (incl. high-availability, business-continuity, capacity-planning, togaf-zachman, itil-service-mgmt, vendor-management, architecture-governance)
│   ├── product/       9 skills (8 + customer-journey, persona-development)
│   ├── game/          29 skills (engine core + game server + client engine + godot, unity, unreal, cocos2d)
│   ├── ai/            12 skills
│   ├── ml/            17 skills (16 + math-foundations)
│   ├── security/      23 skills (incl. redteam, blueteam, malware-analysis, exploit-development, reverse-engineering)
│   ├── blockchain/    19 skills (incl. cross-chain, ZK, data-indexing, defi-protocols, smart-contract-security, zero-knowledge-proofs)
│   ├── data-science/   4 skills
│   ├── data/          39 skills
│   ├── design/        7 skills
│   ├── quality/       11 skills
│   ├── prompt-engineering/ 4 skills
│   ├── cloud-native/  18 skills
│   ├── system-design/  4 skills
│   ├── site-reliability-engineering/ 4 skills
│   ├── architecture/   7 skills
│   ├── languages/     14 skills
│   ├── low-level/      5 skills
│   ├── embedded-systems/ 6 skills
│   ├── hardware-acceleration/ 11 skills
│   ├── quantum-computing/ 8 skills
│   ├── cybersecurity/   7 skills
│   ├── rnd/            6 skills
│   ├── niche/          8 skills
│   ├── personas/      17 skills
│   ├── seo/            4 skills
│   ├── ecommerce/      5 skills
│   ├── tools/          3 skills
│   ├── playbooks/      3 skills
│   ├── web/            4 skills
│   ├── fundamental-truths/ 4 skills
│   ├── harness-engineering/ 2 skills
│   ├── quality-assurance/  2 skills
│   └── aspirational/   1 skill
└── bundles/
    └── bundle-definitions.json
```

**Current Scale:** 641 skills | 3,942 reference files | 256,213 SKILL.md lines + 1,678,710 reference lines

Coverage runs from web/mobile/backend through DevOps, data, AI/ML, security, and blockchain down to hardware acceleration, kernels, game engines, and quantum computing.

## License

MIT © j4flmao
