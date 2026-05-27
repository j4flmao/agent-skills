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

State: User asks about project management, sprint planning, estimation, or risk.
  Route: management-pm
  Reason: "Project management request. Handling sprint planning, estimation, risk, or reporting."

State: User asks about requirements, user stories, acceptance criteria, or business analysis.
  Route: management-ba
  Reason: "Business analysis request. Writing or refining user stories and acceptance criteria."

State: User asks about test strategy, test cases, defect reporting, or test automation.
  Route: management-qa
  Reason: "Quality assurance request. Designing test strategy, test cases, or defect management."

State: User asks about code quality, quality gates, static analysis, or technical debt.
  Route: management-qc
  Reason: "Quality control request. Enforcing quality gates, static analysis, or technical debt tracking."

State: User asks about SOLID, OOP, DRY, GRASP, or design principles.
  Route: oop-principles
  Reason: "Object-oriented or software design principles request."

State: User asks about design patterns, GoF, pattern selection, creational/structural/behavioral.
  Route: design-patterns
  Reason: "Design pattern selection or implementation request."

State: User asks about solution architecture, high-level design, system design, HLD, architecture overview, architecture decision, tech stack decision, cross-cutting concerns.
  Route: solution-architecture
  Reason: "Solution architecture request."

State: User asks about microservices, saga, CQRS, event sourcing, service decomposition.
  Route: backend-microservices
  Reason: "Microservices architecture and distributed patterns request."

State: User asks about microfrontend, Module Federation, frontend composition.
  Route: frontend-microfrontend
  Reason: "Microfrontend architecture request."

State: User asks about frontend component patterns, hooks patterns, component design.
  Route: frontend-patterns
  Reason: "Frontend design patterns request."

State: User asks about team rules, code review, branch strategy, communication protocol, incident response.
  Route: team-rules
  Reason: "Team collaboration protocols request."



State: User asks about API response format, Response<T>, error handling, exception mapping, error codes.
  Route: api-response
  Reason: "API response standardization request."

State: User asks about security team, appsec, vulnerability management, security review, threat model.
  Route: management-security
  Reason: "Security team operations request."

State: User asks about pentesting, penetration test, vulnerability assessment, bug bounty.
  Route: management-pentesting
  Reason: "Penetration testing and reporting request."

State: User asks about alert rules, alert fatigue, notification routing, Prometheus alerts, Grafana alerts.
  Route: management-alerting
  Reason: "Alert rule design request."

State: User asks about monitoring, Prometheus, Grafana, Loki, ELK, metrics, dashboards.
  Route: devops-monitoring
  Reason: "Monitoring stack configuration request."

State: User asks about Helm, Helm chart, values management, chart deployment.
  Route: helm-patterns
  Reason: "Helm chart patterns request."

State: User asks about Terraform, IaC, infrastructure provisioning.
  Route: devops-terraform
  Reason: "Terraform infrastructure patterns request."

State: User asks about Ansible, playbook, configuration management.
  Route: devops-ansible
  Reason: "Ansible automation patterns request."

State: User asks about Jenkins, CI/CD pipeline, Jenkinsfile.
  Route: devops-jenkins
  Reason: "Jenkins pipeline patterns request."

State: User asks about Longhorn, distributed storage, persistent volumes, backup.
  Route: devops-longhorn
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
  Route: backend-rails
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

State: User asks about Symfony, Symfony framework, Symfony DI, Doctrine.
  Route: php-symfony
  Reason: "Symfony framework request."

State: Python stack detected with Django (Django in dependencies).
  Route: python-django
  Reason: "Django backend detected."

State: Python stack detected with FastAPI (fastapi in dependencies).
  Route: python-fastapi
  Reason: "FastAPI backend detected."

State: Python stack detected with Flask (flask in dependencies).
  Route: python-flask
  Reason: "Flask backend detected."

State: User asks about Hono, Hono backend, Hono middleware.
  Route: nodejs-hono
  Reason: "Hono backend request."

State: User asks about Fastify, Fastify backend, Fastify plugins.
  Route: nodejs-fastify
  Reason: "Fastify backend request."

State: Deno stack detected with Oak (oak in imports).
  Route: deno-oak
  Reason: "Deno Oak backend detected."

State: Swift stack detected with Vapor (Vapor in Package.swift).
  Route: swift-vapor
  Reason: "Swift Vapor backend detected."

State: Scala stack detected with Play (Play Framework in build.sbt).
  Route: scala-play
  Reason: "Scala Play backend detected."

State: Java stack detected with Micronaut (micronaut in build config).
  Route: java-micronaut
  Reason: "Micronaut backend detected."

State: Java stack detected with Quarkus (quarkus in build config).
  Route: java-quarkus
  Reason: "Quarkus backend detected."

State: Kotlin stack detected (kotlin in build config, no Android).
  Route: backend-kotlin-architecture
  Reason: "Kotlin backend detected."

State: SvelteKit stack detected (package.json has @sveltejs/kit).
  Route: frontend-sveltekit
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

State: NestJS stack detected and user asks about NestJS project structure, modules architecture.
  Route: nestjs-architecture
  Reason: "NestJS architecture request."

State: Go stack detected and user asks about patterns, concurrency, error handling, idiomatic Go.
  Route: backend-go-patterns
  Reason: "Go patterns request."

State: Go stack detected and user asks about Go project structure, Go architecture.
  Route: backend-go-architecture
  Reason: "Go architecture request."

State: Kotlin stack detected and user asks about Kotlin patterns.
  Route: backend-kotlin-patterns
  Reason: "Kotlin patterns request."

State: Spring Boot stack detected and user asks about Spring Boot patterns, Spring beans.
  Route: backend-spring-boot-patterns
  Reason: "Spring Boot patterns request."

State: Spring Boot stack detected and user asks about Spring Boot project structure.
  Route: backend-spring-boot-architecture
  Reason: "Spring Boot architecture request."

State: Rust stack detected and user asks about patterns, error handling, ownership, async Rust.
  Route: rust-patterns
  Reason: "Rust patterns request."

State: Rust stack detected and user asks about Rust project structure, Rust modules.
  Route: rust-architecture
  Reason: "Rust architecture request."

State: Angular detected and user asks about patterns, RxJS, NgRx, modules.
  Route: angular-patterns
  Reason: "Angular patterns request."

State: Angular detected and user asks about Angular project structure, Angular architecture.
  Route: angular-architecture
  Reason: "Angular architecture request."

State: React detected and user asks about React project structure, React architecture.
  Route: react-architecture
  Reason: "React architecture request."

State: React detected and Next.js in dependencies.
  Route: react-nextjs
  Reason: "React Next.js request."

State: Vue detected and user asks about Vue project structure, Vue architecture.
  Route: vue-architecture
  Reason: "Vue architecture request."

State: Vue detected and Nuxt in dependencies.
  Route: vue-nuxt
  Reason: "Vue Nuxt request."

State: Svelte detected and user asks about Svelte project structure, Svelte architecture.
  Route: svelte-architecture
  Reason: "Svelte architecture request."

State: Svelte detected and user asks about Svelte patterns, Svelte runes, Svelte 5.
  Route: svelte-patterns
  Reason: "Svelte patterns request."

State: SolidJS detected and user asks about SolidJS project structure.
  Route: solidjs-architecture
  Reason: "SolidJS architecture request."

State: SolidJS detected and user asks about SolidJS patterns, Solid signals.
  Route: solidjs-patterns
  Reason: "SolidJS patterns request."

State: Qwik detected and user asks about Qwik project structure, Qwik City.
  Route: qwik-architecture
  Reason: "Qwik architecture request."

State: Remix detected and user asks about Remix architecture.
  Route: remix-architecture
  Reason: "Remix architecture request."

State: Remix detected and user asks about Remix patterns, Remix loaders.
  Route: remix-patterns
  Reason: "Remix patterns request."

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
  Route: devops-gitops
  Reason: "GitOps deployment strategy request."

State: User asks about Vault, secrets management, HashiCorp Vault, secret storage.
  Route: devops-vault
  Reason: "Vault secrets management request."

State: User asks about AWS, EC2, S3, Lambda, RDS, cloud infrastructure.
  Route: devops-aws
  Reason: "AWS cloud infrastructure request."

State: User asks about serverless, Lambda, Cloud Functions, FaaS.
  Route: devops-serverless
  Reason: "Serverless architecture request."

State: User asks about monorepo, Nx, Turborepo, workspace organization.
  Route: devops-monorepo
  Reason: "Monorepo tooling and workspace request."

State: User asks about Dependabot, Renovate, dependency updates, vulnerability scanning.
  Route: dependency-management
  Reason: "Dependency management automation request."

State: User asks about API documentation, Swagger, OpenAPI, API spec generation.
  Route: api-documentation
  Reason: "API documentation generation request."

State: User asks about observability, tracing, OpenTelemetry, distributed tracing, span.
  Route: devops-observability
  Reason: "Observability and distributed tracing request."

State: User asks about caching, Redis cache, CDN, cache strategy, cache invalidation.
  Route: backend-caching
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
  Route: frontend-storybook
  Reason: "Storybook component documentation request."

State: User asks about PWA, service worker, offline support, manifest, progressive web app.
  Route: frontend-pwa
  Reason: "Progressive web app implementation request."

State: User asks about SEO, meta tags, Open Graph, structured data, sitemap, search optimization.
  Route: frontend-seo
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
  Route: mobile-ios
  Reason: "iOS native development request."

State: User says Android, Kotlin, Jetpack Compose, Google Play.
  Route: mobile-android
  Reason: "Android native development request."

State: User says Flutter, Dart, cross-platform mobile, widgets, pubspec.
  Route: mobile-flutter
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

State: User asks about observability, tracing, OpenTelemetry, distributed tracing.
  Route: backend-observability
  Reason: "Observability request."

State: User asks about resilience, circuit breaker, retry, bulkhead, rate limiting.
  Route: backend-resilience-patterns
  Reason: "Resilience patterns request."

State: User asks about OpenAPI, Swagger, API specification.
  Route: backend-openapi-documentation
  Reason: "OpenAPI documentation request."

State: User asks about contract testing, Pact, consumer-driven contracts.
  Route: backend-contract-testing
  Reason: "Contract testing request."

State: User asks about idempotency, idempotent API, duplicate detection.
  Route: backend-idempotency
  Reason: "Idempotency request."

State: User asks about distributed lock, Redlock, distributed mutex, lease.
  Route: backend-distributed-locking
  Reason: "Distributed locking request."

State: User asks about webhook, webhook delivery, outgoing webhook.
  Route: backend-webhooks
  Reason: "Webhook request."

State: User asks about API versioning, version strategy, versioning header.
  Route: backend-api-versioning
  Reason: "API versioning request."

State: User asks about scheduled tasks, cron jobs, Quartz, job scheduling.
  Route: backend-scheduling-cron
  Reason: "Scheduling/cron request."

State: User asks about multi-tenancy, multi-tenant architecture, tenant isolation backend.
  Route: backend-multi-tenancy
  Reason: "Multi-tenancy request."

State: User asks about BFF, Backend for Frontend, BFF pattern.
  Route: backend-bff-pattern
  Reason: "BFF pattern request."

State: User asks about data masking, data redaction, PII masking.
  Route: backend-data-masking
  Reason: "Data masking request."

State: User asks about audit log, audit trail, audit logging.
  Route: backend-audit-logging
  Reason: "Audit logging request."

State: User asks about plugin architecture, plugin system, extension point.
  Route: backend-plugin-architecture
  Reason: "Plugin architecture request."

State: User asks about CQRS, command query segregation, read model, write model, command handler, query handler, materialized view.
  Route: backend-cqrs-patterns
  Reason: "CQRS patterns request."

State: User asks about event sourcing, event store, event stream, rehydrate, event replay, projection rebuild, append-only log.
  Route: backend-event-sourcing
  Reason: "Event sourcing request."

State: User asks about saga, distributed transaction, choreography saga, orchestration saga, compensating transaction, saga state machine, long running transaction.
  Route: backend-saga-patterns
  Reason: "Saga patterns request."

State: User asks about transactional outbox, outbox pattern, reliable event publishing, dual write, CDC outbox, message relay, outbox table.
  Route: backend-transactional-outbox
  Reason: "Transactional outbox request."

State: User asks about Remix, Remix routing, Remix loaders/actions.
  Route: frontend-remix-architecture or frontend-remix-patterns
  Reason: "Remix stack request."

State: User asks about Astro, Astro islands, content collections.
  Route: frontend-astro-architecture
  Reason: "Astro stack request."

State: User asks about Astro patterns, Astro integrations, Astro content.
  Route: frontend-astro-patterns
  Reason: "Astro patterns request."

State: User asks about Qwik patterns, Qwik City, Qwik components.
  Route: frontend-qwik-patterns
  Reason: "Qwik patterns request."

State: User asks about Vue patterns, Vue composables, Vue composition API.
  Route: vue-patterns
  Reason: "Vue patterns request."

State: User asks about Lit, LitElement, LitHtml, lit-html.
  Route: frontend-lit
  Reason: "Lit request."

State: User asks about web components, custom elements, shadow DOM, HTML templates.
  Route: frontend-web-components
  Reason: "Web components request."

State: User asks about AR/VR, augmented reality, virtual reality, WebXR.
  Route: mobile-ar-vr
  Reason: "AR/VR request."

State: User asks about Nomad, HashiCorp Nomad, job scheduling.
  Route: devops-nomad
  Reason: "Nomad request."

State: User asks about incident response, on-call, PagerDuty, incident management.
  Route: devops-incident-response
  Reason: "Incident response request."

State: User asks about cost-benefit, ROI, TCO, cost analysis.
  Route: management-cost-benefit
  Reason: "Cost-benefit analysis request."

State: User asks about hiring, interview, recruitment, technical screen.
  Route: management-hiring
  Reason: "Hiring request."

State: User asks about stakeholder, stakeholder communication, steerco, status update.
  Route: management-stakeholder
  Reason: "Stakeholder communication request."

### ML Skills

State: User asks about experiment tracking, MLflow, experiment management.
  Route: ml-experiment-tracking
  Reason: "Experiment tracking request."

State: User asks about classical ML, scikit-learn, sklearn, regression, classification, clustering.
  Route: ml-classical-ml
  Reason: "Classical ML request."

State: User asks about deep learning, PyTorch, TensorFlow, neural networks, CNN, RNN, transformer.
  Route: ml-deep-learning
  Reason: "Deep learning request."

State: User asks about feature engineering, feature creation, feature selection, feature transformation.
  Route: ml-feature-engineering
  Reason: "Feature engineering request."

State: User asks about hyperparameter tuning, Optuna, grid search, Bayesian optimization.
  Route: ml-hyperparameter-tuning
  Reason: "Hyperparameter tuning request."

State: User asks about model evaluation, confusion matrix, ROC AUC, precision recall, cross-validation.
  Route: ml-model-evaluation
  Reason: "Model evaluation request."

State: User asks about model interpretability, SHAP, LIME, explainable AI, feature importance.
  Route: ml-model-interpretability
  Reason: "Model interpretability request."

State: User asks about time series, Prophet, forecasting, seasonality, trend analysis.
  Route: ml-time-series
  Reason: "Time series request."

State: User asks about NLP, HuggingFace, transformers, text classification, NER, sentiment analysis.
  Route: ml-nlp
  Reason: "NLP request."

State: User asks about computer vision, YOLO, object detection, image classification, segmentation.
  Route: ml-computer-vision
  Reason: "Computer vision request."

State: User asks about recommender system, collaborative filtering, matrix factorization, content-based filtering.
  Route: ml-recommender
  Reason: "Recommender system request."

State: User asks about anomaly detection, outlier detection, fraud detection, novelty detection.
  Route: ml-anomaly-detection
  Reason: "Anomaly detection request."

State: User asks about ML pipeline, Kubeflow, ML workflow, model training pipeline.
  Route: ml-ml-pipeline
  Reason: "ML pipeline request."

State: User asks about feature store, Feast, feature serving, feature registry.
  Route: ml-feature-store
  Reason: "Feature store request."

State: User asks about model serving, BentoML, Triton, model deployment, model inference.
  Route: ml-model-serving
  Reason: "Model serving request."

State: User asks about math foundations, linear algebra, calculus, statistics for ML.
  Route: ml-math-foundations
  Reason: "Math foundations for ML request."

### New AI Skills

State: User asks about model training, fine-tuning, LoRA, QLoRA, training loop, distributed training.
  Route: ai-model-training
  Reason: "Model training request."

State: User asks about embeddings, sentence-transformers, text embedding, vector embedding.
  Route: ai-embeddings
  Reason: "Embeddings request."

State: User asks about multimodal, CLIP, LLaVA, image-text, vision-language model.
  Route: ai-multimodal
  Reason: "Multimodal AI request."

State: User asks about AI safety, guardrails, content moderation, responsible AI, model alignment.
  Route: ai-ai-safety
  Reason: "AI safety request."

State: User asks about AI testing, LLM testing, eval harness, model evaluation.
  Route: ai-ai-testing
  Reason: "AI testing request."

State: User asks about AI cost optimization, token efficiency, model quantization, inference cost.
  Route: ai-ai-cost-optimization
  Reason: "AI cost optimization request."

State: User asks about LangChain, LlamaIndex, LangGraph, chain, agent framework.
  Route: ai-langchain-patterns
  Reason: "LangChain patterns request."

State: User asks about MCP, Model Context Protocol, context server, tool integration.
  Route: ai-mcp-patterns
  Reason: "MCP patterns request."

State: User asks about AI observability, LangSmith, Weights & Biases, tracing LLM, prompt monitoring.
  Route: ai-ai-observability
  Reason: "AI observability request."

### New Data Skills

State: User asks about distributed storage, HDFS, distributed file system, object storage.
  Route: data-distributed-storage
  Reason: "Distributed storage request."

State: User asks about distributed compute, Spark, Dask, distributed processing, cluster computing.
  Route: data-distributed-compute
  Reason: "Distributed compute request."

State: User asks about data lake, Delta Lake, data lake architecture, lake storage.
  Route: data-data-lake
  Reason: "Data lake request."

State: User asks about data lakehouse, lakehouse architecture, medallion architecture, Delta Lake.
  Route: data-data-lakehouse
  Reason: "Data lakehouse request."

State: User asks about batch processing, Hive, batch ETL, nightly jobs, batch pipeline.
  Route: data-batch-processing
  Reason: "Batch processing request."

State: User asks about workflow orchestration, Airflow, Prefect, Dagster, pipeline orchestration.
  Route: data-workflow-orchestration
  Reason: "Workflow orchestration request."

State: User asks about CDC, change data capture, Debezium, streaming replication.
  Route: data-cdc-patterns
  Reason: "CDC patterns request."

State: User asks about data replication, database replication, cross-region replication.
  Route: data-data-replication
  Reason: "Data replication request."

State: User asks about data platform, data engineering platform, platform engineering data.
  Route: data-data-platform
  Reason: "Data platform request."

State: User asks about data catalog, DataHub, Amundsen, data discovery, metadata management.
  Route: data-data-catalog
  Reason: "Data catalog request."

State: User asks about data observability, Monte Carlo, Sifflet, data monitoring, data downtime.
  Route: data-data-observability
  Reason: "Data observability request."

State: User asks about data contracts, contract-driven data, schema contract, data agreement.
  Route: data-data-contracts
  Reason: "Data contracts request."

State: User asks about data clean room, clean room, privacy-preserving data.
  Route: data-clean-room
  Reason: "Data clean room request."

State: User asks about data cost optimization, data storage cost, query cost.
  Route: data-cost-optimization
  Reason: "Data cost optimization request."

State: User asks about data formats, Parquet, Avro, ORC, file format.
  Route: data-formats
  Reason: "Data formats request."

State: User asks about data lineage, column lineage, dataset lineage.
  Route: data-lineage
  Reason: "Data lineage request."

State: User asks about data pipeline CI/CD, data testing in CI, dbt test, data pipeline test.
  Route: data-pipeline-cicd
  Reason: "Data pipeline CI/CD request."

State: User asks about data testing, data quality test, data diff, data validation test.
  Route: data-testing
  Reason: "Data testing request."

State: User asks about reverse ETL, reverse ETL pipeline, warehouse to SaaS.
  Route: data-reverse-etl
  Reason: "Reverse ETL request."

State: User asks about data mesh, data product, domain-driven data, decentralized data.
  Route: data-data-mesh
  Reason: "Data mesh request."

State: User asks about data versioning, DVC, data version control, dataset versioning.
  Route: data-data-versioning
  Reason: "Data versioning request."

State: User asks about data API, Hasura, data access API, GraphQL data API.
  Route: data-data-api
  Reason: "Data API request."

State: User asks about data virtualization, Trino, Presto, federated query, data federation.
  Route: data-data-virtualization
  Reason: "Data virtualization request."

State: User asks about schema registry, Avro, schema evolution, schema compatibility.
  Route: data-schema-registry
  Reason: "Schema registry request."

State: User asks about relational database, PostgreSQL, MySQL, SQL Server, database design.
  Route: data-relational-database
  Reason: "Relational database request."

State: User asks about NoSQL, MongoDB, Cassandra, DynamoDB, document database.
  Route: data-nosql-database
  Reason: "NoSQL database request."

State: User asks about graph database, Neo4j, graph DB, Cypher, knowledge graph.
  Route: data-graph-database
  Reason: "Graph database request."

State: User asks about search engine, Elasticsearch, Solr, full-text search, search index.
  Route: data-search-engine
  Reason: "Search engine request."

### New DevOps Skills

State: User asks about DataOps, data operations, data pipeline ops, data reliability.
  Route: devops-dataops
  Reason: "DataOps request."

State: User asks about MLOps, ML operations, model deployment pipeline, model monitoring.
  Route: devops-mlops
  Reason: "MLOps request."

State: User asks about Kubernetes for data, K8s data workloads, Spark on K8s, data on Kubernetes.
  Route: kubernetes-for-data
  Reason: "Kubernetes for data request."

State: User asks about cloud cost optimization, cloud spend, cost reduction, cloud billing.
  Route: cloud-cost-optimization
  Reason: "Cloud cost optimization request."

State: User asks about cloud architecture, landing zone, well-architected framework, cloud foundation, multi-cloud, cloud governance.
  Route: cloud-architecture
  Reason: "Cloud architecture request."

State: User asks about platform engineering, internal developer platform, IDP, Backstage, developer portal, golden path, platform team.
  Route: devops-platform-engineering
  Reason: "Platform engineering request."

State: User asks about SRE, site reliability engineering, SLI, SLO, error budget, toil reduction, reliability engineering, production readiness.
  Route: devops-sre-practices
  Reason: "SRE practices request."

State: User asks about internal developer platform deep dive, Backstage plugins, software templates, golden path architecture, platform APIs, platform adoption.
  Route: devops-internal-developer-platform
  Reason: "Internal developer platform request."

State: User asks about Kubernetes operator, custom controller, CRD, Kubebuilder, operator pattern, reconciliation loop.
  Route: devops-kubernetes-operators
  Reason: "Kubernetes operators request."

State: User asks about advanced GitOps, multi-cluster GitOps, ApplicationSet, ArgoCD sync waves, cluster bootstrapping, GitOps at scale.
  Route: devops-gitops-advanced
  Reason: "Advanced GitOps request."

State: User asks about progressive delivery, canary deployment, blue-green, traffic shifting, Flagger, Argo Rollouts, gradual rollout, deploy strategy.
  Route: devops-progressive-delivery
  Reason: "Progressive delivery request."

State: User asks about policy as code, OPA, Rego, Kyverno, admission controller, policy enforcement, guardrails, policy testing.
  Route: devops-policy-as-code
  Reason: "Policy as code request."

State: User asks about cloud migration, lift-and-shift, rehost, replatform, refactor, 6 Rs migration, legacy to cloud, data center migration.
  Route: devops-cloud-migration
  Reason: "Cloud migration request."

State: User asks about Pulumi, infrastructure as code with programming languages, Pulumi stack, Pulumi state.
  Route: devops-pulumi
  Reason: "Pulumi IaC request."

State: User asks about Crossplane, Crossplane composition, managed resource, provider, control plane, Crossplane function.
  Route: devops-crossplane
  Reason: "Crossplane control plane request."

State: User asks about GitLab CI, GitLab pipeline, GitLab Runner, GitLab CI/CD.
  Route: devops-gitlab-ci
  Reason: "GitLab CI/CD request."

State: User asks about CircleCI, CircleCI config, CircleCI orb, CircleCI pipeline.
  Route: devops-circleci
  Reason: "CircleCI request."

State: User asks about autoscaling, HPA, VPA, Keda, Cluster Autoscaler, pod autoscaling, node autoscaling, Kubernetes scaling.
  Route: devops-kubernetes-autoscaling
  Reason: "Kubernetes autoscaling request."

State: User asks about APM, Datadog, New Relic, application monitoring, APM instrumentation, synthetic monitoring, observability platform.
  Route: devops-apm-observability
  Reason: "APM and observability platform request."

State: User asks about Cilium, eBPF, Cilium network policy, Hubble, Cilium cluster mesh, cloud-native networking.
  Route: devops-cilium-ebpf
  Reason: "Cilium/eBPF networking request."

State: User asks about OpenTelemetry, OTel collector, distributed tracing, OpenTelemetry instrumentation, trace sampling.
  Route: devops-opentelemetry
  Reason: "OpenTelemetry request."

State: User asks about Oracle Cloud, OCI, OKE, Oracle Kubernetes Engine, Oracle database cloud.
  Route: devops-oracle-cloud
  Reason: "Oracle Cloud request."

State: User asks about DigitalOcean, DOKS, DigitalOcean App Platform, Droplet, DigitalOcean Kubernetes.
  Route: devops-digitalocean
  Reason: "DigitalOcean request."

State: User asks about IBM Cloud, IBM Kubernetes Service, IBM Cloud Foundry, IBM Cloud VPC.
  Route: devops-ibm-cloud
  Reason: "IBM Cloud request."

State: User asks about Alibaba Cloud, Aliyun, ACK, Alibaba Cloud ECS, ApsaraDB.
  Route: devops-alibaba-cloud
  Reason: "Alibaba Cloud request."

State: User asks about Hetzner, Hetzner Cloud, Hetzner dedicated server, Hetzner Kubernetes.
  Route: devops-hetzner
  Reason: "Hetzner request."

### New Security Skills

State: User asks about data security, data protection, encryption at rest, data masking, data classification.
  Route: security-data-security
  Reason: "Data security request."

State: User asks about Zero Trust, zero trust architecture, ZTA, BeyondCorp, never trust always verify, identity-aware proxy, microsegmentation.
  Route: zero-trust
  Reason: "Zero Trust architecture request."

State: User asks about CSPM, cloud security posture management, Wiz, Prisma Cloud, cloud compliance, cloud misconfiguration, CIEM.
  Route: cspm
  Reason: "CSPM request."

State: User asks about penetration testing, pentest, ethical hacking, vulnerability assessment, security testing, web app pentest, network pentest, cloud pentest.
  Route: penetration-testing
  Reason: "Penetration testing request."

State: User asks about IAM governance, identity governance, access certification, privileged access management, identity lifecycle, join/move/leave, access review.
  Route: iam-governance
  Reason: "IAM governance request."

State: User asks about SOC operations, SOC tier, SOC structure, SOC runbook, security operations center, SOC shift.
  Route: soc-operations
  Reason: "SOC operations request."

State: User asks about SIEM, correlation rule, detection rule, log ingestion, SIEM architecture, Splunk, Elastic SIEM, Wazuh, Sentinel.
  Route: siem-engineering
  Reason: "SIEM engineering request."

State: User asks about SOAR, playbook automation, security automation, SOAR playbook, incident automation.
  Route: soar-automation
  Reason: "SOAR automation request."

State: User asks about threat intelligence, CTI, threat feed, IoC, TTP, threat actor, MITRE ATT&CK, OSINT, threat intel lifecycle.
  Route: threat-intelligence
  Reason: "Threat intelligence request."

State: User asks about EDR, XDR, endpoint detection, endpoint response, CrowdStrike, Defender, SentinelOne, endpoint security.
  Route: edr-xdr
  Reason: "EDR/XDR request."

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
  Route: dev-loop-api-client-generator
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

State: User asks about visual design, color theory, typography, layout, visual hierarchy, spacing, UI aesthetics.
  Route: design-visual-design
  Reason: "Visual design request."

State: User asks about brand identity, brand guidelines, logo design, brand colors, brand voice, visual identity, branding.
  Route: design-brand-identity
  Reason: "Brand identity request."

State: User asks about information architecture, sitemap, user flow, content hierarchy, navigation design, taxonomy, labeling.
  Route: design-information-architecture
  Reason: "Information architecture request."

State: User asks about motion design, UI animation, micro-interaction, Lottie, transition design, motion guidelines.
  Route: design-motion-design
  Reason: "Motion design request."

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

State: User asks about unit testing, unit test, TDD, test doubles, mocking, stubbing, FIRST principles, AAA pattern, code coverage.
  Route: quality-unit-testing
  Reason: "Unit testing request."

State: User asks about integration testing, API testing, database testing, TestContainers, WireMock, component testing, service testing.
  Route: quality-integration-testing
  Reason: "Integration testing request."

State: User asks about property-based testing, fuzzing, generative testing, fast-check, QuickCheck, invariant testing, random testing.
  Route: quality-property-based-testing
  Reason: "Property-based testing request."

State: User asks about Express, Express.js middleware, Express app.
  Route: nodejs-express
  Reason: "Express request."

State: User asks about Prisma, Prisma schema, Prisma ORM.
  Route: prisma
  Reason: "Prisma ORM request."

State: User asks about payment processing, payment gateway, Stripe, PayPal, subscription billing, PCI DSS, recurring payment.
  Route: ecommerce-payment-processing
  Reason: "Payment processing request."

State: User asks about shopping cart, checkout flow, cart management, order management, coupon system, discount engine, tax calculation.
  Route: ecommerce-checkout-cart
  Reason: "Checkout and cart request."

State: User asks about GraphQL Federation, Apollo Federation, federated schema, subgraph, supergraph, schema composition, distributed GraphQL.
  Route: api-graphql-federation
  Reason: "GraphQL Federation request."

State: User asks about API product management, API strategy, API monetization, developer portal, API lifecycle, API deprecation, API as product.
  Route: api-product-management
  Reason: "API product management request."

State: User asks about WebRTC, real-time video/audio, media streaming, SFU, MCU, signaling server, TURN/STUN, live streaming, real-time communication.
  Route: backend-web-real-time
  Reason: "Web real-time communication request."

### Step 3: Detect Backend Stack
Read project files:
- package.json: if @nestjs/core present -> nestjs-patterns
- package.json: if elysia present or bun detected -> elysia-patterns
- package.json: if no @nestjs/core, no elysia, has express/fastify/hono -> nodejs-architecture
- go.mod -> golang-patterns
- Cargo.toml -> rust-patterns
- Gemfile -> backend-rails
- requirements.txt: if fastapi present -> python-fastapi; if django present -> python-django; if flask present -> python-flask
- pyproject.toml: if django present -> python-django
- pom.xml -> backend-spring-boot-architecture; if quarkus present -> java-quarkus; if micronaut present -> java-micronaut
- build.gradle -> backend-spring-boot-architecture; if kotlin -> backend-kotlin-architecture
- build.gradle.kts: if kotlin and android -> mobile-android; if kotlin only -> backend-kotlin-architecture
- *.csproj or *.sln -> dotnet-architecture
- composer.json: if symfony in require -> php-symfony; if laravel in require -> php-laravel; if laminas/zend -> php-zend; else -> php-pure
- Package.swift: if vapor in deps -> swift-vapor
- mix.exs -> backend-elixir
- deno.json / deno.lock -> backend-deno
- bun.lock / bun.lockb -> backend-bun
- None detected -> ask user

### Step 4: Detect Frontend Framework
- package.json: if @sveltejs/kit present -> frontend-sveltekit
- package.json: if next present -> react-nextjs
- package.json: if react present but no next -> react-architecture
- package.json: if vue present -> vue-architecture
- package.json: if nuxt present -> vue-nuxt
- package.json: if @angular/core -> angular-architecture
- angular.json -> angular-architecture
- package.json: if remix -> frontend-remix-architecture
- package.json: if astro -> frontend-astro-architecture
- package.json: if solid-js -> solidjs-architecture
- package.json: if @builder.io/qwik -> qwik-architecture
- None detected -> ask user

### Step 5: Detect Mobile Stack
- pubspec.yaml -> mobile-flutter
- package.json: if react-native present -> react-native
- Package.swift or *.xcworkspace -> mobile-ios
- build.gradle.kts / settings.gradle.kts with kotlin -> mobile-android
- None detected -> skip mobile stack

### Step 6: Detect Desktop Stack
- package.json: if electron present -> desktop-electron
- Cargo.toml: if tauri in deps -> desktop-tauri
- None detected -> skip desktop stack

## Rules
- This skill produces ZERO code. No implementation. No debugging. No advice.
- End EVERY response with exactly one of the three templates in Response Format.
- If multiple skills could apply, pick the one with the highest priority (earliest phase).
- If you cannot determine the stack, ask. Do not guess.
- Never explain why you chose the skill. The template already contains "Reason."
- If the user asks a question outside routing (e.g., "how do I do X"), respond with: "That question should be handled by {skill-name}. Activate that skill with: {trigger phrase}"

## References
  - references/master-orchestrator-advanced.md — Master Orchestrator Advanced Topics
  - references/master-orchestrator-fundamentals.md — Master Orchestrator Fundamentals
  - references/orchestration-engine.md — Master Orchestrator
  - references/orchestrator-registration.md — Orchestrator Registration
  - references/phase-workflow.md — Phase Workflow Reference
  - references/routing-decision-tree.md — Routing Decision Tree
  - references/skill-registry.md — Skill Registry
  - references/skill-routing.md — Skill Routing Reference
## Handoff
This skill does not produce artifacts. It routes to the appropriate next skill.
Carry forward: routing decision, detected stack, detected framework, existing artifacts found.
