---
name: master-orchestrator
description: >
  Use this skill when the user says 'start', 'help me build', 'initialize', 'I want to build X', 'where do I start', 'what should I do next', 'what skill should I use', or any open-ended project initiation. This is the single entry point for the entire skill suite. It inspects the project filesystem for existing artifacts and routes to the correct next skill. Do NOT use for: direct implementation, bug reports, code review requests, or deployment questions. Those route to their respective skills directly.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [orchestration, phase-0, entry-point]
---

# Master Orchestrator

## Purpose
Inspect project state and route to the correct skill. This skill NEVER implements, debugs, or designs. It only routes.

## Agent Protocol

### Trigger
Exact user phrases: "start", "help me build", "initialize", "I want to build X", "where do I start", "what skill", "what should I do next", "begin", "let's start".

### Input Context
- Working directory must be set to the project root.
- If no project root is detectable, ask the user: "Where is your project directory?"

### Output Artifact
None. This skill produces no files. It emits a routing decision as text.

### Response Format
The agent MUST output exactly one of the following templates. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick. No explanations.

Template A — Route to a single skill:
```
Next skill: **{skill-name}**
Reason: {one sentence exactly}
Context: {key facts the next skill needs}
```

Template B — Route to multiple skills (sequential):
```
Next skills:
1. **{skill-name}** — {reason}
2. **{skill-name}** — {reason}
```

Template C — Need more information:
```
Need: {what you need from the user}
Options:
- {option 1}
- {option 2}
```

### Completion Criteria
This skill is complete when:
- [ ] Project state has been checked (docs/, README, package manifests)
- [ ] Stack/language detected or asked
- [ ] A single next skill has been identified
- [ ] Output follows exactly one of the three templates above
- [ ] No implementation, debugging, or advice has been given

### Max Response Length
3 lines maximum for routing. 6 lines maximum for "need more information."

## Workflow

### Step 1: Check Filesystem
Run these checks in order. Stop at the first match.
1. `Test-Path -LiteralPath docs/brief*.md` — brief exists
2. `Test-Path -LiteralPath docs/prd*.md` — PRD exists
3. `Test-Path -LiteralPath docs/decisions/` — ADRs exist
4. `Test-Path -LiteralPath docs/specs/` — tech specs exist
5. `Test-Path -LiteralPath package.json` — Node project
6. `Test-Path -LiteralPath Cargo.toml` — Rust project
7. `Test-Path -LiteralPath go.mod` — Go project
8. `Test-Path -LiteralPath requirements.txt` or `pyproject.toml` — Python project
9. `Test-Path -LiteralPath pom.xml` or `build.gradle` — Java project

### Step 2: Route by State

State: No docs exist, no README with requirements.
  Route: create-brief
  Reason: "No product definition found. Starting with a brief to define scope."

State: docs/brief exists, no docs/prd.
  Route: create-prd
  Reason: "Brief exists. Expanding into full requirements with epics and stories."

State: docs/prd exists, no docs/decisions or docs/specs.
  Route: create-adr, create-tech-spec
  Reason: "Requirements exist. Need architecture decisions and technical specification before implementation."

State: Architecture docs exist, user describes a backend task.
  1. Detect stack (read package.json / Cargo.toml / go.mod / requirements.txt / pom.xml)
  2. Route to {stack}-architecture and backend-api-design

State: Architecture docs exist, user describes a frontend task.
  1. Detect framework (read package.json for react/next/vue/angular)
  2. Route to {framework}-architecture

State: User shows code for review.
  Route: code-review

State: User describes a bug with error message or stack trace.
  Route: debugging-strategy

State: User says "deploy", "CI/CD", "containerize".
  Route: docker-patterns, cicd-pipeline

State: User asks about project management, sprint planning, estimation, or risk.
  Route: pm
  Reason: "Project management request. Handling sprint planning, estimation, risk, or reporting."

State: User asks about requirements, user stories, acceptance criteria, or business analysis.
  Route: ba
  Reason: "Business analysis request. Writing or refining user stories and acceptance criteria."

State: User asks about test strategy, test cases, defect reporting, or test automation.
  Route: qa
  Reason: "Quality assurance request. Designing test strategy, test cases, or defect management."

State: User asks about code quality, quality gates, static analysis, or technical debt.
  Route: qc
  Reason: "Quality control request. Enforcing quality gates, static analysis, or technical debt tracking."

State: User asks about SOLID, OOP, DRY, GRASP, or design principles.
  Route: oop-principles
  Reason: "Object-oriented or software design principles request."

State: User asks about design patterns, GoF, pattern selection, creational/structural/behavioral.
  Route: design-patterns
  Reason: "Design pattern selection or implementation request."

State: User asks about microservices, saga, CQRS, event sourcing, service decomposition.
  Route: microservices
  Reason: "Microservices architecture and distributed patterns request."

State: User asks about microfrontend, Module Federation, frontend composition.
  Route: microfrontend
  Reason: "Microfrontend architecture request."

State: User asks about frontend component patterns, hooks patterns, component design.
  Route: frontend-patterns
  Reason: "Frontend design patterns request."

State: User asks about team rules, code review, branch strategy, communication protocol, incident response.
  Route: team-rules
  Reason: "Team collaboration protocols request."

State: User asks about frontend design patterns, component patterns, hooks patterns.
  Route: frontend-patterns
  Reason: "Frontend component and hooks pattern request."

State: User asks about API response format, Response<T>, error handling, exception mapping, error codes.
  Route: api-response
  Reason: "API response standardization request."

State: User asks about security team, appsec, vulnerability management, security review, threat model.
  Route: security
  Reason: "Security team operations request."

State: User asks about pentesting, penetration test, vulnerability assessment, bug bounty.
  Route: pentesting
  Reason: "Penetration testing and reporting request."

State: User asks about alert rules, alert fatigue, notification routing, Prometheus alerts, Grafana alerts.
  Route: alerting
  Reason: "Alert rule design request."

State: User asks about monitoring, Prometheus, Grafana, Loki, ELK, metrics, dashboards.
  Route: monitoring
  Reason: "Monitoring stack configuration request."

State: User asks about Helm, Helm chart, values management, chart deployment.
  Route: helm-patterns
  Reason: "Helm chart patterns request."

State: User asks about Terraform, IaC, infrastructure provisioning.
  Route: terraform
  Reason: "Terraform infrastructure patterns request."

State: User asks about Ansible, playbook, configuration management.
  Route: ansible
  Reason: "Ansible automation patterns request."

State: User asks about Jenkins, CI/CD pipeline, Jenkinsfile.
  Route: jenkins
  Reason: "Jenkins pipeline patterns request."

State: User asks about Longhorn, distributed storage, persistent volumes, backup.
  Route: longhorn
  Reason: "Longhorn storage patterns request."

State: Node.js stack detected and user describes a backend task.
  Route: nodejs-architecture
  Reason: "Node.js backend detected. Setting up Express/Fastify/Hono project structure."

State: Node.js stack detected and user asks about patterns, async handlers, DI.
  Route: nodejs-patterns
  Reason: "Node.js patterns request."

State: ElysiaJS stack detected (bun, elysia in dependencies).
  Route: elysia-architecture
  Reason: "ElysiaJS on Bun detected. Setting up Elysia project structure."

State: ElysiaJS user asks about plugins, guards, Eden Treaty.
  Route: elysia-patterns
  Reason: "ElysiaJS patterns request."

State: Ruby on Rails stack detected (Gemfile, rails).
  Route: rails
  Reason: "Ruby on Rails backend detected."

State: PHP stack detected (composer.json, PHP files).
  1. Read composer.json for framework.
  2. Route to php-laravel if "laravel/framework" in require.
  3. Route to php-zend if "laminas/laminas-mvc" or "zendframework/zend-mvc" in require.
  4. Route to php-pure otherwise.
  Reason: "PHP stack detected. Routing to appropriate PHP framework."

State: User asks about Laravel, Artisan, Eloquent, Blade.
  Route: php-laravel
  Reason: "Laravel framework request."

State: User asks about Zend, Laminas, Zend Framework, ZF3.
  Route: php-zend
  Reason: "Zend/Laminas framework request."

State: User asks about plain PHP, pure PHP, PHP without framework, PSR-7, PSR-15.
  Route: php-pure
  Reason: "Plain PHP request."

State: SvelteKit stack detected (package.json has @sveltejs/kit).
  Route: sveltekit
  Reason: "SvelteKit frontend detected."

State: .NET stack detected and user describes a backend task.
  Route: dotnet-architecture
  Reason: "C# .NET backend detected. Setting up project structure and architecture."

State: .NET stack detected and user asks about patterns, CQRS, MediatR, EF Core patterns.
  Route: dotnet-patterns
  Reason: "C# .NET patterns request. Implementing CQRS, Result pattern, or pipeline behaviors."

State: NestJS stack detected and user asks about patterns, modules, guards, interceptors.
  Route: nestjs-patterns
  Reason: "NestJS patterns request."

State: Go stack detected and user asks about patterns, concurrency, error handling, idiomatic Go.
  Route: golang-patterns
  Reason: "Go patterns request."

State: Rust stack detected and user asks about patterns, error handling, ownership, async Rust.
  Route: rust-patterns
  Reason: "Rust patterns request."

State: Angular detected and user asks about patterns, RxJS, NgRx, modules.
  Route: angular-patterns
  Reason: "Angular patterns request."

State: User asks about Docker, Dockerfile, docker-compose, containerization.
  Route: docker-patterns
  Reason: "Docker containerization request."

State: User says deploy, CI/CD, GitHub Actions, GitLab CI, pipeline automation.
  Route: cicd-pipeline
  Reason: "CI/CD pipeline request."

State: User asks about Kubernetes, k8s, pods, deployments, services, ingress.
  Route: kubernetes-patterns
  Reason: "Kubernetes orchestration request."

State: User asks about GitHub Actions, CI/CD workflow, pipeline automation.
  Route: github-actions
  Reason: "GitHub Actions CI/CD request."

State: User asks about GitOps, ArgoCD, Flux, Git-based deployment.
  Route: gitops
  Reason: "GitOps deployment strategy request."

State: User asks about Vault, secrets management, HashiCorp Vault, secret storage.
  Route: vault
  Reason: "Vault secrets management request."

State: User asks about AWS, EC2, S3, Lambda, RDS, cloud infrastructure.
  Route: aws
  Reason: "AWS cloud infrastructure request."

State: User asks about serverless, Lambda, Cloud Functions, FaaS.
  Route: serverless
  Reason: "Serverless architecture request."

State: User asks about monorepo, Nx, Turborepo, workspace organization.
  Route: monorepo
  Reason: "Monorepo tooling and workspace request."

State: User asks about Dependabot, Renovate, dependency updates, vulnerability scanning.
  Route: dependency-management
  Reason: "Dependency management automation request."

State: User asks about API documentation, Swagger, OpenAPI, API spec generation.
  Route: api-documentation
  Reason: "API documentation generation request."

State: User asks about observability, tracing, OpenTelemetry, distributed tracing, span.
  Route: observability
  Reason: "Observability and distributed tracing request."

State: User asks about API design, RESTful, OpenAPI, versioning, endpoint structure.
  Route: backend-api-design
  Reason: "API design request."

State: User asks about authentication, authorization, JWT, OAuth, SSO, RBAC.
  Route: backend-auth-patterns
  Reason: "Authentication and authorization patterns request."

State: User asks about clean architecture, hexagonal, onion, ports and adapters, dependency rule.
  Route: backend-clean-architecture
  Reason: "Clean architecture patterns request."

State: User asks about database design, SQL, migrations, ORM, schema design, indexing.
  Route: backend-database-patterns
  Reason: "Database design patterns request."

State: User asks about event-driven, messaging, Kafka, RabbitMQ, pub-sub, event bus.
  Route: backend-event-driven
  Reason: "Event-driven architecture request."

State: User asks about gRPC, protobuf, streaming, bidirectional RPC.
  Route: grpc-patterns
  Reason: "gRPC and protobuf patterns request."

State: User asks about WebSocket, real-time, socket.io, WS, live updates.
  Route: websocket-patterns
  Reason: "WebSocket and real-time communication request."

State: User asks about message queue, message broker, RabbitMQ, Kafka, SQS.
  Route: message-queue
  Reason: "Message queue and broker patterns request."

State: User asks about caching, Redis cache, CDN, cache strategy, cache invalidation.
  Route: caching
  Reason: "Caching strategy and implementation request."

State: User asks about API gateway, Kong, Nginx reverse proxy, AWS API Gateway, gateway pattern, BFF, API proxy, gateway aggregation.
  Route: api-gateway
  Reason: "API gateway configuration request."

State: User asks about rate limiting, throttling, API rate limit, backpressure.
  Route: rate-limiting
  Reason: "Rate limiting and throttling request."

State: User asks about load testing, k6, Locust, Artillery, benchmark, stress test.
  Route: load-testing
  Reason: "Load testing and performance benchmarking request."

State: User asks about backend testing, unit tests, integration tests, TDD, mocking.
  Route: backend-testing
  Reason: "Backend testing strategy request."

State: User asks about accessibility, a11y, WCAG, screen reader, ARIA.
  Route: frontend-accessibility
  Reason: "Frontend accessibility request."

State: User asks about design system, component library, Storybook, tokens.
  Route: frontend-design-system
  Reason: "Design system and component library request."

State: User asks about frontend performance, Core Web Vitals, Lighthouse, LCP, CLS, INP.
  Route: frontend-performance
  Reason: "Frontend performance optimization request."

State: User asks about state management, Redux, Zustand, Pinia, NgRx, Vuex.
  Route: frontend-state-management
  Reason: "Frontend state management request."

State: User asks about frontend testing, Jest, Vitest, Cypress, Playwright, testing library.
  Route: frontend-testing
  Reason: "Frontend testing strategy request."

State: User asks about Tailwind CSS, utility-first CSS, CSS design tokens.
  Route: tailwind-css
  Reason: "Tailwind CSS and utility-first styling request."

State: User asks about Storybook, component library, visual testing, component documentation.
  Route: storybook
  Reason: "Storybook component documentation request."

State: User asks about PWA, service worker, offline support, manifest, progressive web app.
  Route: pwa
  Reason: "Progressive web app implementation request."

State: User asks about SEO, meta tags, Open Graph, structured data, sitemap, search optimization.
  Route: seo
  Reason: "SEO and search optimization request."

State: User asks about changelog, release notes, semantic versioning.
  Route: changelog-generator
  Reason: "Changelog generation request."

State: User asks about git workflow, branching strategy, rebase, merge, git flow.
  Route: git-workflow
  Reason: "Git workflow and branching strategy request."

State: User asks about profiling, performance audit, bottleneck, flamegraph, CPU profile.
  Route: performance-profiler
  Reason: "Performance profiling request."

State: User asks about README, documentation, project docs, contributing guide.
  Route: readme-writer
  Reason: "README and project documentation request."

State: User asks about refactoring, code improvement, restructuring, technical debt reduction.
  Route: refactor-guide
  Reason: "Code refactoring guide request."

State: User asks about security audit, dependency check, SAST, DAST, vulnerability scan.
  Route: security-auditor
  Reason: "Security audit request."

State: User says iOS, Swift, SwiftUI, iPhone, iPad, Xcode.
  Route: ios
  Reason: "iOS native development request."

State: User says Android, Kotlin, Jetpack Compose, Google Play.
  Route: android
  Reason: "Android native development request."

State: User says Flutter, Dart, cross-platform mobile, widgets, pubspec.
  Route: flutter
  Reason: "Flutter cross-platform development request."

State: User says React Native, Expo, RN, react-native, Hermes.
  Route: react-native
  Reason: "React Native cross-platform development request."

State: User asks about mobile pattern, mobile architecture, MVVM, MVI, mobile project structure, Clean Architecture mobile.
  Route: mobile-patterns
  Reason: "Mobile architecture pattern request."

State: User asks about mobile testing, widget test, component test mobile, golden test, XCUITest, Espresso, Detox.
  Route: mobile-testing
  Reason: "Mobile testing strategy request."

State: User asks about mobile performance, app slow, jank, frame drop, memory leak mobile, app startup.
  Route: mobile-performance
  Reason: "Mobile performance optimization request."

State: User asks about mobile security, secure storage, certificate pinning, OWASP mobile, root detection, biometric.
  Route: mobile-security
  Reason: "Mobile security implementation request."

State: User asks about mobile networking, API client mobile, offline first, GraphQL mobile, REST client, caching mobile, pagination.
  Route: mobile-networking
  Reason: "Mobile networking layer request."

State: User asks about mobile storage, local database, SQLite mobile, Room, Core Data, Hive, Isar, file storage mobile.
  Route: mobile-storage
  Reason: "Mobile local storage request."

State: User asks about mobile deploy, TestFlight, App Store, Play Store, mobile CI/CD, code signing.
  Route: mobile-deployment
  Reason: "Mobile app deployment request."

State: User asks about push notifications, APNs, FCM, notification payload.
  Route: push-notifications
  Reason: "Mobile push notification implementation request."

State: User asks about in-app purchase, subscription, StoreKit, Play Billing, revenue.
  Route: in-app-purchase
  Reason: "In-app purchase and subscription request."

State: User asks about crash reporting, Sentry, Crashlytics, error tracking mobile.
  Route: crash-reporting
  Reason: "Mobile crash reporting setup request."

State: User asks about user stories, story splitting, story points, backlog refinement.
  Route: create-story
  Reason: "User story creation request."

State: User says init, scaffold, new project, start fresh, project setup.
  Route: project-init
  Reason: "Project initialization request."

State: User asks about GraphQL, Apollo, schema design, resolver patterns.
  Route: backend-graphql-patterns
  Reason: "GraphQL request."

State: User asks about background jobs, task queues, workers, scheduled tasks.
  Route: backend-background-jobs
  Reason: "Background job request."

State: User asks about search, Elasticsearch, Meilisearch, search indexing.
  Route: backend-search-patterns
  Reason: "Search request."

State: User asks about data streaming, Kafka, stream processing, event streaming.
  Route: backend-data-streaming
  Reason: "Data streaming request."

State: User asks about file storage, object storage, S3, file upload.
  Route: backend-file-storage
  Reason: "File storage request."

State: User asks about feature flags, feature toggles, canary release, gradual rollout.
  Route: backend-feature-flags
  Reason: "Feature flag request."

State: User asks about i18n, internationalization, localization, translations.
  Route: backend-internationalization
  Reason: "Internationalization request."

State: User asks about logging, structured logging, JSON logging, log shipping.
  Route: backend-structured-logging
  Reason: "Structured logging request."

State: User asks about Remix, Remix routing, Remix loaders/actions.
  Route: frontend-remix-architecture or frontend-remix-patterns
  Reason: "Remix stack request."

State: User asks about Astro, Astro islands, content collections.
  Route: frontend-astro-architecture
  Reason: "Astro stack request."

State: User asks about SolidJS, Solid signals, SolidJS reactivity.
  Route: frontend-solidjs-architecture or frontend-solidjs-patterns
  Reason: "SolidJS stack request."

State: User asks about Qwik, Qwik resumable, Qwik City.
  Route: frontend-qwik-architecture
  Reason: "Qwik stack request."

State: User asks about Svelte core, Svelte runes, Svelte 5.
  Route: frontend-svelte-architecture or frontend-svelte-patterns
  Reason: "Svelte core request."

State: User asks about animation, motion, Framer Motion, GSAP.
  Route: frontend-animation
  Reason: "Animation request."

State: User asks about forms, form validation, React Hook Form.
  Route: frontend-form-handling
  Reason: "Form handling request."

State: User asks about data fetching, TanStack Query, SWR, server state.
  Route: frontend-data-fetching
  Reason: "Data fetching request."

State: User asks about bundler, Vite, Webpack, build tools.
  Route: frontend-bundler-tools
  Reason: "Bundler/tools request."

State: User asks about image optimization, responsive images, image CDN.
  Route: frontend-image-optimization
  Reason: "Image optimization request."

State: User asks about theming, dark mode, design tokens.
  Route: frontend-theming
  Reason: "Theming request."

State: User asks about Kotlin Multiplatform, KMP, Compose Multiplatform.
  Route: mobile-kotlin-multiplatform
  Reason: "KMP request."

State: User asks about Ionic, Capacitor, hybrid mobile.
  Route: mobile-ionic-capacitor
  Reason: "Ionic/Capacitor request."

State: User asks about .NET MAUI, MAUI app, Xamarin.
  Route: mobile-dotnet-maui
  Reason: ".NET MAUI request."

State: User asks about deep linking, universal links, app links.
  Route: mobile-deep-linking
  Reason: "Deep linking request."

State: User asks about offline-first, offline sync, connectivity.
  Route: mobile-offline-first
  Reason: "Offline-first request."

State: User asks about biometrics, Face ID, fingerprint, local auth.
  Route: mobile-biometrics
  Reason: "Biometrics request."

State: User asks about maps, location, GPS, map integration.
  Route: mobile-map-location
  Reason: "Map/location request."

State: User asks about camera, photo, video, media capture.
  Route: mobile-camera-media
  Reason: "Camera/media request."

State: User asks about analytics, event tracking, Firebase Analytics, telemetry.
  Route: mobile-analytics
  Reason: "Analytics request."

State: User asks about ArgoCD, GitOps, ArgoCD sync.
  Route: devops-argo-cd
  Reason: "ArgoCD/GitOps request."

State: User asks about Azure, Microsoft Azure, AKS.
  Route: devops-azure
  Reason: "Azure request."

State: User asks about GCP, Google Cloud, GKE.
  Route: devops-gcp
  Reason: "GCP request."

State: User asks about chaos engineering, resilience testing, fault injection.
  Route: devops-chaos-engineering
  Reason: "Chaos engineering request."

State: User asks about service mesh, Istio, Linkerd, mTLS.
  Route: devops-service-mesh
  Reason: "Service mesh request."

State: User asks about FinOps, cloud cost, cost optimization.
  Route: devops-finops
  Reason: "FinOps request."

State: User asks about backup, disaster recovery, DR plan.
  Route: devops-backup-dr
  Reason: "Backup/DR request."

State: User asks about database migration, schema migration, Flyway, Liquibase.
  Route: devops-database-migration
  Reason: "Database migration request."

State: User asks about PR description, pull request, write PR.
  Route: dev-loop-pr-writer
  Reason: "PR writer request."

State: User asks about dev container, devcontainer, dev environment.
  Route: dev-loop-dev-container
  Reason: "Dev container request."

State: User asks about tech debt, technical debt, code debt.
  Route: dev-loop-tech-debt-tracker
  Reason: "Tech debt tracker request."

State: User asks about API client, curl command, HTTP request generation.
  Route: dev-loop-api-client
  Reason: "API client request."

State: User asks about OKR, KPI, goals, key results.
  Route: management-okr-kpi
  Reason: "OKR/KPI request."

State: User asks about sprint retro, retrospective, retro.
  Route: management-sprint-retro
  Reason: "Sprint retro request."

State: User asks about risk management, risk register, risk assessment.
  Route: management-risk-management
  Reason: "Risk management request."

State: User asks about roadmap, product roadmap, feature roadmap.
  Route: planning-create-roadmap
  Reason: "Roadmap request."

State: User asks about pitch deck, investor pitch, fundraising.
  Route: planning-create-pitch-deck
  Reason: "Pitch deck request."

State: User asks about market analysis, competitive analysis, market sizing.
  Route: planning-market-analysis
  Reason: "Market analysis request."

State: User asks about onboarding, new developer setup, getting started.
  Route: core-onboarding
  Reason: "Onboarding request."

State: User asks about context compression, token budget, summarize.
  Route: core-context-compressor
  Reason: "Context compression request."

State: User asks about compliance, audit, SOC2, ISO27001, GDPR.
  Route: enterprise-compliance-audit
  Reason: "Compliance/audit request."

State: User asks about multi-tenant, SaaS architecture, tenant isolation.
  Route: enterprise-multi-tenant
  Reason: "Multi-tenant request."

State: User asks about enterprise integration, legacy integration, ESB.
  Route: enterprise-integration-patterns
  Reason: "Enterprise integration request."

State: User asks about data governance, data classification, data lineage.
  Route: enterprise-data-governance
  Reason: "Data governance request."

State: User asks about SLA, SLO, error budget, uptime, availability.
  Route: enterprise-sla-management
  Reason: "SLA management request."

State: User asks about legacy migration, strangler fig, system migration.
  Route: enterprise-legacy-migration
  Reason: "Legacy migration request."

State: User asks about identity provider, IdP, SSO, SAML, OIDC, Keycloak.
  Route: enterprise-identity-provider
  Reason: "Identity provider request."

State: User asks about cost governance, cloud cost, FinOps, budget management.
  Route: enterprise-cost-governance
  Reason: "Cost governance request."

State: User asks about product analytics, event tracking, funnel, retention.
  Route: product-analytics
  Reason: "Product analytics request."

State: User asks about A/B test, split test, experiment, hypothesis testing.
  Route: product-ab-testing
  Reason: "A/B testing request."

State: User asks about user research, user interview, persona, usability.
  Route: product-user-research
  Reason: "User research request."

State: User asks about growth engineering, viral loop, PLG, activation.
  Route: product-growth-engineering
  Reason: "Growth engineering request."

State: User asks about pricing, pricing strategy, monetization, tiers.
  Route: product-pricing-strategy
  Reason: "Pricing strategy request."

State: User asks about go-to-market, GTM, product launch, market entry.
  Route: product-go-to-market
  Reason: "Go-to-market request."

State: User asks about onboarding flow, user activation, product tour.
  Route: product-onboarding-flow
  Reason: "Onboarding flow request."

State: User asks about prioritization, RICE, Kano, backlog prioritization.
  Route: product-feature-prioritization
  Reason: "Feature prioritization request."

State: User asks about AI, LLM, prompt engineering, RAG, vector database.
  Route: ai-prompt-engineering
  Reason: "AI/prompt engineering request."

State: User asks about RAG, retrieval augmented generation, chunking.
  Route: ai-rag-patterns
  Reason: "RAG request."

State: User asks about LLMOps, model serving, fine-tuning, token cost.
  Route: ai-llm-ops
  Reason: "LLM Ops request."

State: User asks about vector database, Pinecone, Chroma, Qdrant, Milvus.
  Route: ai-vector-databases
  Reason: "Vector database request."

State: User asks about AI agent, agentic, function calling, LangChain, CrewAI.
  Route: ai-ai-agents
  Reason: "AI agent request."

State: User asks about AI evaluation, LLM eval, RAGAS, hallucination test.
  Route: ai-ai-evals
  Reason: "AI evaluation request."

State: User asks about SAST, DAST, static analysis, Semgrep, SonarQube, code scanning.
  Route: security-sast-dast
  Reason: "SAST/DAST request."

State: User asks about SBOM, software bill of materials, supply chain security.
  Route: security-sbom
  Reason: "SBOM request."

State: User asks about secrets management, secret scanning, GitLeaks, vault.
  Route: security-secrets-management
  Reason: "Secrets management request."

State: User asks about container security, image scanning, Trivy, admission control.
  Route: security-container-security
  Reason: "Container security request."

State: User asks about API security, OWASP API top 10, rate limiting.
  Route: security-api-security
  Reason: "API security request."

State: User asks about ETL, data pipeline, Airflow, dbt, data transformation.
  Route: data-etl-pipeline
  Reason: "ETL pipeline request."

State: User asks about data warehouse, Snowflake, BigQuery, Redshift, dimensional model.
  Route: data-data-warehouse
  Reason: "Data warehouse request."

State: User asks about stream processing, Kafka, Flink, real-time data.
  Route: data-streaming
  Reason: "Streaming request."

State: User asks about BI, dashboard, Metabase, Superset, Looker.
  Route: data-bi-tools
  Reason: "BI tools request."

State: User asks about data quality, Great Expectations, data validation, data contract.
  Route: data-data-quality
  Reason: "Data quality request."

State: User asks about design system, design tokens, Storybook, Figma.
  Route: design-design-systems
  Reason: "Design system request."

State: User asks about UX research, user research, usability testing, persona.
  Route: design-ux-research
  Reason: "UX research request."

State: User asks about accessibility, WCAG, a11y, screen reader, ARIA.
  Route: design-accessibility
  Reason: "Accessibility request."

State: User asks about prototyping, design prototype, micro-interaction.
  Route: design-prototyping
  Reason: "Prototyping request."

State: User asks about E2E test, Playwright, Cypress, browser test.
  Route: quality-e2e-testing
  Reason: "E2E testing request."

State: User asks about visual testing, visual regression, Percy, Chromatic.
  Route: quality-visual-testing
  Reason: "Visual testing request."

State: User asks about load testing, k6, Locust, performance test.
  Route: quality-load-testing
  Reason: "Load testing request."

State: User asks about contract testing, Pact, consumer-driven contract.
  Route: quality-contract-testing
  Reason: "Contract testing request."

State: User asks about Express, Express.js middleware, Express app.
  Route: nodejs-express
  Reason: "Express request."

State: User asks about Prisma, Prisma schema, Prisma ORM.
  Route: prisma
  Reason: "Prisma ORM request."

State: User asks about Deno, Deno runtime, Deno Deploy.
  Route: deno
  Reason: "Deno request."

State: User asks about Bun, Bun runtime, Bun package manager.
  Route: bun
  Reason: "Bun request."

State: User asks about Elixir, Phoenix, Erlang, Elixir OTP.
  Route: elixir
  Reason: "Elixir/Phoenix request."

State: User asks about Spring Boot patterns, Spring beans, Spring configuration.
  Route: spring-boot-patterns
  Reason: "Spring Boot patterns request."

State: User asks about Astro patterns, Astro islands, Astro components.
  Route: astro-patterns
  Reason: "Astro patterns request."

State: User asks about Qwik patterns, Qwik City, Qwik components.
  Route: qwik-patterns
  Reason: "Qwik patterns request."

State: User asks about Vue patterns, Vue composables, Vue composition API.
  Route: vue-patterns
  Reason: "Vue patterns request."

State: User asks about Lit, LitElement, LitHtml, lit-html.
  Route: lit
  Reason: "Lit request."

State: User asks about web components, custom elements, shadow DOM, HTML templates.
  Route: web-components
  Reason: "Web components request."

State: User asks about AR/VR, augmented reality, virtual reality, WebXR.
  Route: ar-vr
  Reason: "AR/VR request."

State: User asks about Nomad, HashiCorp Nomad, job scheduling.
  Route: nomad
  Reason: "Nomad request."

State: User asks about incident response, on-call, PagerDuty, incident management.
  Route: incident-response
  Reason: "Incident response request."

State: User asks about cost-benefit, ROI, TCO, cost analysis.
  Route: cost-benefit
  Reason: "Cost-benefit analysis request."

State: User asks about hiring, interview, recruitment, technical screen.
  Route: hiring
  Reason: "Hiring request."

State: User asks about stakeholder, stakeholder communication, steerco, status update.
  Route: stakeholder
  Reason: "Stakeholder communication request."

### Step 3: Detect Backend Stack
Read project files:
- package.json: if @nestjs/core present -> nestjs
- package.json: if elysia present or bun detected -> elysia
- package.json: if no @nestjs/core, no elysia, has express/fastify/hono -> nodejs
- go.mod -> golang
- Cargo.toml -> rust
- Gemfile -> rails
- requirements.txt: if fastapi present -> python-fastapi; if django present -> python-django
- pyproject.toml: if django present -> python-django
- pom.xml or build.gradle -> spring-boot
- *.csproj or *.sln -> dotnet
- None detected -> ask user: "Which backend stack does this project use? (nestjs, nodejs, elysia, golang, rust, rails, python, spring, dotnet)"

### Step 4: Detect Frontend Framework
- package.json: if @sveltejs/kit present -> sveltekit
- package.json: if next present -> react-nextjs
- package.json: if react present but no next -> react-architecture
- package.json: if vue present -> vue-architecture
- package.json: if nuxt present -> vue-nuxt
- angular.json -> angular-architecture
- None detected -> ask user

### Step 5: Detect Mobile Stack
- pubspec.yaml -> flutter
- package.json: if react-native present -> react-native
- Package.swift or *.xcworkspace -> ios
- build.gradle.kts / settings.gradle.kts with kotlin -> android
- None detected -> skip mobile stack

## Rules
- This skill produces ZERO code. No implementation. No debugging. No advice.
- End EVERY response with exactly one of the three templates in Response Format.
- If multiple skills could apply, pick the one with the highest priority (earliest phase).
- If you cannot determine the stack, ask. Do not guess.
- Never explain why you chose the skill. The template already contains "Reason."
- If the user asks a question outside routing (e.g., "how do I do X"), respond with: "That question should be handled by {skill-name}. Activate that skill with: {trigger phrase}"

## References
This skill uses no external reference files — all routing logic is inline.

## Handoff
This skill does not produce artifacts. It routes to the appropriate next skill.
Carry forward: routing decision, detected stack, detected framework, existing artifacts found.
