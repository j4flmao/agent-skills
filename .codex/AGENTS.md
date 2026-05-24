# .codex/AGENTS.md -- j4flmao/skills

Codex CLI project config for the agent skill suite. 301 skills, compressed output, stack-based routing.

## Compress (ALWAYS)

Strip all output: a/an/the | just/really/basically/actually/simply | sure/happy/glad/please | I think/I believe/might be/perhaps/probably/likely | as you know/as mentioned/in other words | however/moreover/furthermore/therefore | code explanation (show code only) | preamble/postamble.

Write pattern: `[thing] [action] [reason]. [next].`

Full prose exceptions: security warnings. destructive operations. user confusion. resume after interruption.

## Routing

No trigger match -> `skills/core/master-orchestrator/SKILL.md`. Detect stack, then route.

Phase order: planning -> backend -> frontend -> mobile -> dev-loop -> devops -> management.

### Quick map

```
planning/    -> brief, prd, adr, tech spec, story, roadmap, pitch-deck, market-analysis, solution-architecture, bpmn-modeling, bdd-atdd
backend/     -> nestjs, nodejs, elysia, go, rust, python, spring, dotnet, rails, php-pure, php-laravel, php-zend
               universal: oop, api-design, api-response, database, auth, testing,
               grpc, websocket, message-queue, caching, rate-limiting, load-testing, api-gateway,
               graphql, bg-jobs, search, streaming, file-storage, feature-flags, i18n, logging,
               cqrs, event-sourcing, saga, outbox
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
               argo-cd, azure, gcp, chaos, service-mesh, finops, backup-dr, db-migration,
               dataops, mlops, kubernetes-for-data, cloud-cost-optimization, cloud-architecture,
               platform-engineering, sre-practices, internal-developer-platform,
               kubernetes-operators, gitops-advanced, progressive-delivery,
               policy-as-code, cloud-migration
dev-loop/    -> review, debug, refactor, git, security, performance, changelog, readme,
               pr-writer, dev-container, tech-debt, api-client
management/  -> pm, ba, qa, qc, team-rules, security, pentesting, alerting,
                okr-kpi, sprint-retro, risk, agile-scrum-kanban, team-topology,
                change-management
enterprise/  -> compliance-audit, multi-tenant, integration-patterns,
                data-governance, sla-management, legacy-migration,
                identity-provider, cost-governance, togaf-zachman,
                itil-service-mgmt, vendor-management, architecture-governance
product/     -> analytics, ab-testing, user-research, growth-engineering,
                pricing-strategy, go-to-market, onboarding-flow,
                feature-prioritization, customer-journey, persona-development
ai/          -> ai-prompt-engineering, ai-rag-patterns, ai-llm-ops,
                ai-vector-databases, ai-ai-agents, ai-ai-evals,
                ai-model-training, ai-embeddings, ai-multimodal,
                ai-ai-safety, ai-ai-testing, ai-ai-cost-optimization,
                ai-langchain-patterns, ai-mcp-patterns, ai-ai-observability
security/    -> security-sast-dast, security-sbom, security-secrets-management,
                security-container-security, security-api-security,
                security-data-security, soc-operations, siem-engineering,
                soar-automation, threat-intelligence, edr-xdr
ml/          -> ml-experiment-tracking, ml-classical-ml, ml-deep-learning,
                ml-feature-engineering, ml-hyperparameter-tuning,
                ml-model-evaluation, ml-model-interpretability, ml-time-series,
                ml-nlp, ml-computer-vision, ml-recommender, ml-anomaly-detection,
                ml-ml-pipeline, ml-feature-store, ml-model-serving
data/        -> data-etl-pipeline, data-data-warehouse, data-streaming,
                data-bi-tools, data-data-quality,
                data-distributed-storage, data-distributed-compute,
                data-data-lake, data-data-lakehouse, data-batch-processing,
                data-workflow-orchestration, data-cdc-patterns,
                data-data-replication, data-data-platform, data-data-catalog,
                data-data-observability, data-data-contracts, data-data-mesh,
                data-data-versioning, data-data-api, data-data-virtualization,
                data-schema-registry, data-relational-database,
                data-nosql-database, data-graph-database,
                data-search-engine, data-data-strategy,
                data-dimensional-modeling
data-science/ -> statistical-analysis, experimentation, causal-inference,
                 analytics-engineering
design/      -> design-design-systems, design-ux-research, design-accessibility,
                design-prototyping, visual-design, brand-identity,
                information-architecture, motion-design
quality/     -> quality-e2e-testing, quality-visual-testing, quality-load-testing,
                quality-contract-testing, unit-testing, integration-testing,
                property-based-testing, exploratory-testing, acceptance-testing,
                 regression-testing, smoke-testing
blockchain/  -> blockchain-core, blockchain-cryptography, blockchain-ethereum,
                blockchain-bitcoin, blockchain-patterns, blockchain-application,
                blockchain-web3, blockchain-testing, blockchain-infrastructure,
                blockchain-security, blockchain-management, blockchain-solana,
                blockchain-defi
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
  skills/            301 skills
  bundles/           16 bundle definitions
```
