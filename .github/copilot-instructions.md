# GitHub Copilot Instructions — j4flmao/skills

## Entry Point

No trigger keyword match → route to `skills/core/master-orchestrator/SKILL.md`

## Routing Rules

### Phase Order
planning → backend → frontend → mobile → desktop → dev-loop → devops → management → ai → ml → data → design → quality → security → enterprise → product

### Quick Keyword Map

| Keywords | Route |
|----------|-------|
| brief, prd, adr, tech-spec, story, roadmap, pitch-deck, market-analysis | `planning/` |
| nestjs, nodejs, elysia, go, rust, python, spring, dotnet, rails, php | `backend/{stack}/` |
| hono, fastify, express, oak, vapor, play, micronaut, quarkus, django, fastapi, flask, symfony | `backend/{stack}/` |
| oop, microservices, clean-arch, api-design, api-response, database, auth, testing | `backend/universal/` |
| react, nextjs, vue, nuxt, angular, sveltekit, remix, astro, solidjs, qwik | `frontend/{framework}/` |
| alpinejs, ember, htmx, preact, stencil, lit, web-components | `frontend/{framework}/` |
| state, a11y, design-system, performance, testing, microfrontend, tailwind, storybook, pwa, seo | `frontend/universal/` |
| animation, forms, data-fetching, bundler, images, theming, i18n, auth | `frontend/universal/` |
| ios, android, flutter, react-native, kotlin-multiplatform, ionic, dotnet-maui | `mobile/` |
| electron, tauri, qt, gtk, wpf, winui3, uwp, winforms, swiftui, appkit, gnome, kde | `desktop/` |
| docker, k8s, terraform, helm, ansible, jenkins, longhorn, monitoring | `devops/` |
| github-actions, gitops, vault, aws, serverless, monorepo | `devops/` |
| argo-cd, azure, gcp, chaos-engineering, service-mesh, finops | `devops/` |
| review, debug, refactor, git, security, performance, changelog, readme | `dev-loop/` |
| compliance, multi-tenant, integration, data-governance, sla, legacy, identity, cost-gov | `enterprise/` |
| analytics, ab-testing, user-research, growth, pricing, gtm, onboarding, prioritization | `product/` |
| prompt-engineering, rag, llmops, vector-db, ai-agent, ai-eval, model-training | `ai/` |
| embeddings, multimodal, ai-safety, ai-testing, ai-cost, langchain, mcp, ai-observability | `ai/` |
| sast, dast, sbom, secrets, container-security, api-security, data-security | `security/` |
| etl, warehouse, streaming, bi, data-quality, distributed-storage, data-lake, lakehouse | `data/` |
| batch-processing, workflow-orchestration, cdc, replication, data-platform, catalog | `data/` |
| observability, contracts, mesh, versioning, api, virtualization, schema-registry, db | `data/` |
| experiment-tracking, classical-ml, deep-learning, feature-engineering, hyperparameter | `ml/` |
| model-evaluation, interpretability, time-series, nlp, computer-vision, recommender | `ml/` |
| anomaly-detection, ml-pipeline, feature-store, model-serving | `ml/` |
| design-system, ux-research, accessibility, prototyping | `design/` |
| e2e, visual, load, contract-testing | `quality/` |

## Stack Detection

- `package.json`: @nestjs/core → nestjs, elysia → elysia, express/hono/fastify → nodejs
- `go.mod` → golang
- `Cargo.toml` → rust
- `Gemfile` → rails
- `requirements.txt` with fastapi → python-fastapi, with django → python-django
- `pyproject.toml` with django → python-django
- `pom.xml` / `build.gradle` → spring-boot
- `*.csproj` / `*.sln` → dotnet
- `Package.swift` / `*.xcworkspace` → ios / swiftui / appkit
- `pubspec.yaml` → flutter
- `package.json` with react-native → react-native
- `*.pro` / `CMakeLists.txt` with Qt → desktop-qt
- `package.json` with electron → desktop-electron
- `Cargo.toml` with tauri → desktop-tauri

## Response Format

Produce the artifact directly. No preamble, no postamble, no explanations.

## Compress Output

Strip: a/an/the, just/really/basically, sure/happy/glad/please, I think/I believe, as you know, however/moreover, code explanations (show code only), preamble/postamble.
