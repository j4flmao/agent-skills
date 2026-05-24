# .opencode/AGENTS.md — j4flmao/skills (283)

LOCAL MODEL (qwen 14b). CONTEXT LIMITED. EVERY TOKEN COUNTS.

## Compress (ALWAYS)
Strip: a/an/the | just/really/basically | sure/happy/glad | I think/might be | however/moreover | code explain (show code) | preamble/postamble.
Pattern: `[thing] [action] [why]. [next].`

Bad: "The reason your component re-renders is because..."
Good: "New object ref each render. Wrap in `useMemo`."

Full prose: security. destructive. confused.

## Routing
No match → `skills/core/master-orchestrator/SKILL.md` then detect stack.

### Quick
```
planning/    → brief, prd, adr, roadmap, pitch-deck, market-analysis
backend/     → {nestjs,nodejs,elysia,go,rust,python,spring,dotnet,rails,php-pure,php-laravel,php-zend}
frontend/    → {react,vue,angular,sveltekit,remix,astro,solidjs,qwik,svelte-core}
mobile/      → ios, android, flutter, react-native, kmp, ionic-capacitor, dotnet-maui
               universal: patterns, testing, performance, security, networking, storage, deployment,
               push, iap, crash, deep-linking, offline, biometrics, maps, camera, analytics
devops/      → docker, k8s, terraform, helm, github-actions, gitops, vault, aws, serverless, monorepo,
               argo-cd, azure, gcp, chaos, service-mesh, finops, backup-dr, db-migration,
               dataops, mlops, kubernetes-for-data, cloud-cost-optimization
dev-loop/    → review, debug, refactor, pr-writer, dev-container, tech-debt, api-client
management/  → pm, ba, qa, qc, security, okr-kpi, sprint-retro, risk
core/        → onboarding, context-compressor
enterprise/  → compliance-audit, multi-tenant, integration-patterns, data-governance, sla-management, legacy-migration, identity-provider, cost-governance
product/     → analytics, ab-testing, user-research, growth-engineering, pricing-strategy, go-to-market, onboarding-flow, feature-prioritization
ai/          → ai-prompt-engineering, ai-rag-patterns, ai-llm-ops, ai-vector-databases, ai-ai-agents, ai-ai-evals, ai-model-training, ai-embeddings, ai-multimodal, ai-ai-safety, ai-ai-testing, ai-ai-cost-optimization, ai-langchain-patterns, ai-mcp-patterns, ai-ai-observability
security/    → security-sast-dast, security-sbom, security-secrets-management, security-container-security, security-api-security, security-data-security
ml/          → ml-experiment-tracking, ml-classical-ml, ml-deep-learning, ml-feature-engineering, ml-hyperparameter-tuning, ml-model-evaluation, ml-model-interpretability, ml-time-series, ml-nlp, ml-computer-vision, ml-recommender, ml-anomaly-detection, ml-ml-pipeline, ml-feature-store, ml-model-serving
data/        → data-etl-pipeline, data-data-warehouse, data-streaming, data-bi-tools, data-data-quality, data-distributed-storage, data-distributed-compute, data-data-lake, data-data-lakehouse, data-batch-processing, data-workflow-orchestration, data-cdc-patterns, data-data-replication, data-data-platform, data-data-catalog, data-data-observability, data-data-contracts, data-data-mesh, data-data-versioning, data-data-api, data-data-virtualization, data-schema-registry, data-relational-database, data-nosql-database, data-graph-database, data-search-engine
design/      → design-design-systems, design-ux-research, design-accessibility, design-prototyping
quality/     → quality-e2e-testing, quality-visual-testing, quality-load-testing, quality-contract-testing
blockchain/  → blockchain-core, blockchain-cryptography, blockchain-ethereum, blockchain-bitcoin, blockchain-patterns, blockchain-application, blockchain-web3, blockchain-testing, blockchain-infrastructure, blockchain-security, blockchain-management, blockchain-solana, blockchain-defi, blockchain-cross-chain, blockchain-zk, blockchain-data-indexing
```

### Universal (backend + frontend)
```
oop/solid/microservices   → backend/universal/
api-design/api-response   → backend/universal/
database/auth/event-driven→ backend/universal/
grpc/websocket/mq/cache/rate-limit/load-test/api-gateway → backend/universal/
graphql/bg-jobs/search/streaming/file-storage/feature-flags/i18n/logging → backend/universal/
state/a11y/design-system  → frontend/universal/
performance/testing/microfrontend → frontend/universal/
tailwind/storybook/pwa/seo → frontend/universal/
animation/form/data-fetching/bundler/img-opt/theming → frontend/universal/
```

## Project
```
skills/ (283) + bundles/ (16)
```
