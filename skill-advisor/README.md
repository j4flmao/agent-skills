# Skill Combination Advisor

This repository ships **641 skills** and **59 bundles**. Installing everything makes agents slower and less precise, so this advisor helps you pick a small, well-matched set for your role and project.

## How to choose in 3 steps

1. **Pick your track** below — the role or direction closest to your work.
2. **Pick a level** — start at Level 1, add Level 2 when the project needs it, add Level 3 skills one by one.
3. **Combine** — add a second track or a recipe only for what the first one does not cover; remove overlapping skills.

| Level | Size | Use it when |
|-------|------|-------------|
| **Level 1 — Essentials** | 2–9 skills | Everyday work of the role; safe default for any project |
| **Level 2 — Professional** | +6–12 skills | Production concerns: scaling, security, delivery, team workflow |
| **Level 3 — Specialist** | add one at a time | Deep, narrow problems you actually have right now |

**Security is built in.** Most tracks have a *security baseline*: the security skills for that domain (API security, secrets, container security, AI prompt-injection defense, …). They are part of every install command on the track page, so the agent applies those practices whenever it uses the track's skills, even after the skills are copied into another project.

## Pick your track

### Build products

| Track | Who it is for | Skills in track | Closest bundle |
|-------|---------------|-----------------|----------------|
| [Frontend Engineer](tracks/frontend.md) | You build web UIs with React, Vue, Angular, Svelte or similar. | 30 | [`frontend-foundations`](bundles.md#frontend-foundations) |
| [Backend Engineer](tracks/backend.md) | You build APIs and services in any language. | 33 | [`backend-patterns`](bundles.md#backend-patterns) |
| [Full-Stack Product Team](tracks/fullstack.md) | One team owns UI, API, database and deployment. | 26 | [`fullstack-nestjs-react`](bundles.md#fullstack-nestjs-react) |
| [Mobile Engineer](tracks/mobile.md) | You ship iOS, Android or cross-platform apps. | 23 | [`mobile-ios`](bundles.md#mobile-ios) |
| [Desktop App Engineer](tracks/desktop.md) | You build native or cross-platform desktop applications. | 14 | [`desktop-all`](bundles.md#desktop-all) |
| [Designer & Design Engineer](tracks/design-ux.md) | You design interfaces and build design systems. | 16 | [`design-ux`](bundles.md#design-ux) |

### Stack specialists

| Track | Who it is for | Skills in track | Closest bundle |
|-------|---------------|-----------------|----------------|
| [React & Next.js Developer](tracks/react.md) | You build React apps, usually with Next.js. | 20 | [`fullstack-nodejs-react`](bundles.md#fullstack-nodejs-react) |
| [Vue & Nuxt Developer](tracks/vue.md) | You build Vue 3 apps, often with Nuxt. | 15 | [`fullstack-golang-vue`](bundles.md#fullstack-golang-vue) |
| [Angular Developer](tracks/angular.md) | You build Angular applications. | 14 | [`fullstack-rust-angular`](bundles.md#fullstack-rust-angular) |
| [Node.js & TypeScript Backend](tracks/node-backend.md) | You build APIs with Node.js, NestJS, Express, Fastify or Hono. | 19 | [`fullstack-nodejs-react`](bundles.md#fullstack-nodejs-react) |
| [Python Backend Developer](tracks/python-backend.md) | You build services with FastAPI, Django or Flask. | 15 | [`backend-stacks`](bundles.md#backend-stacks) |
| [Go Backend Developer](tracks/go-backend.md) | You build services and tooling in Go. | 14 | [`fullstack-golang-vue`](bundles.md#fullstack-golang-vue) |
| [Java & Kotlin Backend Developer](tracks/java-kotlin-backend.md) | You build JVM services with Spring Boot, Quarkus, Micronaut or Ktor. | 16 | [`backend-stacks`](bundles.md#backend-stacks) |
| [.NET Developer](tracks/dotnet.md) | You build services or apps with C# and .NET. | 14 | [`fullstack-dotnet-react`](bundles.md#fullstack-dotnet-react) |
| [PHP & Ruby Web Developer](tracks/php-ruby.md) | You build web apps with Laravel, Symfony or Rails. | 15 | [`fullstack-rails-svelte`](bundles.md#fullstack-rails-svelte) |
| [iOS Developer](tracks/ios.md) | You build native apps for iPhone and iPad. | 15 | [`mobile-ios`](bundles.md#mobile-ios) |
| [Android Developer](tracks/android.md) | You build native Android apps with Kotlin and Jetpack Compose. | 15 | [`mobile-android`](bundles.md#mobile-android) |
| [Flutter Developer](tracks/flutter.md) | You build iOS and Android apps from one Dart codebase. | 16 | [`mobile-flutter`](bundles.md#mobile-flutter) |
| [React Native Developer](tracks/react-native.md) | You build mobile apps with React Native or Expo. | 16 | [`mobile-react-native`](bundles.md#mobile-react-native) |
| [Rust Developer](tracks/rust.md) | You write services, tools, desktop apps or embedded code in Rust. | 13 | [`fullstack-rust-angular`](bundles.md#fullstack-rust-angular) |
| [Elixir & Phoenix Developer](tracks/elixir.md) | You build fault-tolerant services and real-time apps on the BEAM. | 10 | [`backend-stacks`](bundles.md#backend-stacks) |
| [Svelte, Solid, Astro & Qwik Developer](tracks/modern-frontend.md) | You use a newer frontend framework or a content-first site generator. | 16 | [`frontend-frameworks`](bundles.md#frontend-frameworks) |

### Cloud and operations

| Track | Who it is for | Skills in track | Closest bundle |
|-------|---------------|-----------------|----------------|
| [DevOps & Platform Engineer](tracks/devops-platform.md) | You own CI/CD, infrastructure as code, Kubernetes and the internal platform. | 29 | [`kubernetes-platform`](bundles.md#kubernetes-platform) |
| [Site Reliability Engineer](tracks/sre.md) | You own uptime, SLOs, incidents and capacity. | 19 | [`sre-reliability`](bundles.md#sre-reliability) |
| [Cloud Architect & Engineer](tracks/cloud.md) | You design and run workloads on AWS, Azure or GCP. | 22 | [`infra-cloud`](bundles.md#infra-cloud) |
| [Observability Engineer](tracks/observability.md) | You own logs, metrics, traces and alerting. | 13 | [`sre-reliability`](bundles.md#sre-reliability) |
| [Database Engineer](tracks/database.md) | You design schemas, tune queries and run databases at scale. | 15 | [`data-engineering`](bundles.md#data-engineering) |
| [Platform Engineer (IDP)](tracks/platform-engineering.md) | You build the internal developer platform and paved roads for product teams. | 17 | [`kubernetes-platform`](bundles.md#kubernetes-platform) |
| [FinOps & Cloud Cost Engineer](tracks/finops.md) | You make cloud spend visible, accountable and lower. | 10 | [`infra-cloud`](bundles.md#infra-cloud) |

### Data and AI

| Track | Who it is for | Skills in track | Closest bundle |
|-------|---------------|-----------------|----------------|
| [Data Engineer](tracks/data-engineering.md) | You build pipelines, warehouses, lakes and streaming systems. | 31 | [`data-engineering`](bundles.md#data-engineering) |
| [ML & AI Engineer](tracks/ml-ai.md) | You train, evaluate and serve models, or build LLM applications. | 24 | [`ml-engineering`](bundles.md#ml-engineering) |
| [AI Agent Builder](tracks/ai-agents.md) | You build tool-using LLM agents, multi-agent systems and their harnesses. | 22 | [`ai-agents`](bundles.md#ai-agents) |
| [LLM Application Developer](tracks/llm-app.md) | You ship features on top of LLM APIs: chat, RAG, extraction, tools. | 18 | [`ai-engineering`](bundles.md#ai-engineering) |
| [MLOps Engineer](tracks/mlops.md) | You take models from notebooks to reliable production. | 13 | [`ml-engineering`](bundles.md#ml-engineering) |
| [Data Scientist & Analyst](tracks/data-scientist.md) | You analyze data, run experiments and build models. | 14 | [`ml-engineering`](bundles.md#ml-engineering) |
| [Analytics Engineer](tracks/analytics-engineer.md) | You model warehouse data with dbt and serve trusted metrics. | 13 | [`data-engineering`](bundles.md#data-engineering) |
| [Streaming & Event Data Engineer](tracks/streaming.md) | You build Kafka, Flink and CDC pipelines. | 12 | [`data-engineering`](bundles.md#data-engineering) |
| [Search & Retrieval Engineer](tracks/search.md) | You build product search, relevance ranking and vector retrieval. | 10 | [`data-engineering`](bundles.md#data-engineering) |
| [Prompt Engineer & AI Evaluator](tracks/prompt-engineer.md) | You design prompts, evaluation sets and quality gates for LLM features. | 10 | [`ai-engineering`](bundles.md#ai-engineering) |
| [AI Safety & LLM Red Team](tracks/ai-safety.md) | You test and harden LLM apps against prompt injection, jailbreaks and data leaks. | 9 | [`ai-engineering`](bundles.md#ai-engineering) |
| [GPU Kernel & Inference Engineer](tracks/gpu-kernels.md) | You write or tune CUDA/Triton kernels and LLM serving performance. | 13 | [`gpu-hpc`](bundles.md#gpu-hpc) |

### Security

| Track | Who it is for | Skills in track | Closest bundle |
|-------|---------------|-----------------|----------------|
| [Security Engineer](tracks/security.md) | You secure applications, cloud and operations. | 23 | [`security-all`](bundles.md#security-all) |
| [Application Security & DevSecOps](tracks/appsec.md) | You make the software delivery pipeline and code secure. | 13 | [`security-all`](bundles.md#security-all) |
| [SOC Analyst & Detection Engineer](tracks/soc.md) | You detect, investigate and respond to security incidents. | 11 | [`soc-all`](bundles.md#soc-all) |
| [Compliance & Privacy Engineer](tracks/compliance.md) | You make systems meet SOC 2, ISO 27001, GDPR, HIPAA or PCI requirements. | 12 | [`enterprise`](bundles.md#enterprise) |

### Game development

| Track | Who it is for | Skills in track | Closest bundle |
|-------|---------------|-----------------|----------------|
| [Game Developer](tracks/game.md) | You build games, engines or game servers. | 24 | [`game-development`](bundles.md#game-development) |
| [Unity Developer](tracks/unity.md) | You build games in Unity with C#. | 14 | [`game-development`](bundles.md#game-development) |
| [Unreal Engine Developer](tracks/unreal.md) | You build games or real-time 3D in Unreal Engine with C++. | 12 | [`game-development`](bundles.md#game-development) |
| [Godot Developer](tracks/godot.md) | You build games in Godot 4 with GDScript or C#. | 10 | [`game-development`](bundles.md#game-development) |
| [Game Engine Programmer](tracks/engine-programmer.md) | You build engine systems: rendering, memory, jobs, assets, platforms. | 14 | [`game-development`](bundles.md#game-development) |
| [Online Game Backend Engineer](tracks/game-backend.md) | You run game servers, matchmaking and live-ops backends. | 13 | [`game-server`](bundles.md#game-server) |

### Product types

| Track | Who it is for | Skills in track | Closest bundle |
|-------|---------------|-----------------|----------------|
| [SaaS Product Builder](tracks/saas.md) | You build multi-tenant B2B or B2C SaaS. | 17 | [`backend-patterns`](bundles.md#backend-patterns) |
| [E-commerce Engineer](tracks/ecommerce.md) | You build stores, carts, checkout and order systems. | 14 | [`ecommerce-all`](bundles.md#ecommerce-all) |
| [Real-Time Apps Developer](tracks/realtime.md) | You build chat, collaboration, live dashboards or streaming features. | 12 | [`backend-capabilities`](bundles.md#backend-capabilities) |
| [Blockchain & Web3 Engineer](tracks/blockchain.md) | You write smart contracts, dApps or blockchain infrastructure. | 19 | [`blockchain-all`](bundles.md#blockchain-all) |
| [DeFi Protocol Engineer](tracks/defi.md) | You build lending, AMM or vault protocols. | 13 | [`blockchain-all`](bundles.md#blockchain-all) |

### Specialized engineering

| Track | Who it is for | Skills in track | Closest bundle |
|-------|---------------|-----------------|----------------|
| [Systems & Embedded Engineer](tracks/systems.md) | You write low-level, embedded, kernel or performance-critical code. | 23 | [`systems-programming`](bundles.md#systems-programming) |
| [Software & Solution Architect](tracks/architecture.md) | You design systems, write ADRs and govern architecture. | 24 | [`architecture-system-design`](bundles.md#architecture-system-design) |
| [Performance Engineer](tracks/performance.md) | You make web, backend and mobile software fast. | 12 | [`web-performance-seo`](bundles.md#web-performance-seo) |
| [Accessibility Specialist](tracks/accessibility.md) | You make products usable for everyone and meet WCAG. | 9 | [`design-ux`](bundles.md#design-ux) |
| [QA & Test Engineer](tracks/quality.md) | You own test strategy, automation and release confidence. | 19 | [`quality-testing`](bundles.md#quality-testing) |
| [Low-Latency & HFT Engineer](tracks/low-latency.md) | You build trading or networking systems where microseconds matter. | 10 | [`systems-programming`](bundles.md#systems-programming) |
| [IoT & Edge Engineer](tracks/iot-edge.md) | You connect devices, run code at the edge and ship ML to small hardware. | 11 | [`embedded-iot`](bundles.md#embedded-iot) |
| [Zero-Knowledge & Cryptography Engineer](tracks/zk.md) | You build ZK circuits, proof systems or cryptographic protocols. | 8 | [`blockchain-all`](bundles.md#blockchain-all) |
| [Quantum Computing Researcher](tracks/quantum.md) | You learn or prototype quantum algorithms and post-quantum migration. | 10 | [`quantum-computing`](bundles.md#quantum-computing) |
| [Microservices Engineer](tracks/microservices.md) | You split systems into services and keep them reliable in production. | 16 | [`backend-patterns`](bundles.md#backend-patterns) |
| [GraphQL API Engineer](tracks/graphql.md) | You design, federate and optimize GraphQL APIs. | 10 | [`api-all`](bundles.md#api-all) |
| [Legacy Modernization Lead](tracks/legacy-modernization.md) | You move monoliths and old platforms to modern architecture without stopping the business. | 14 | [`enterprise`](bundles.md#enterprise) |

### Roles and career

| Track | Who it is for | Skills in track | Closest bundle |
|-------|---------------|-----------------|----------------|
| [Startup CTO & Solo Founder](tracks/startup-cto.md) | You build the first version of a product with a tiny team and little time. | 18 | [`starter-playbooks`](bundles.md#starter-playbooks) |
| [Tech Lead & Staff Engineer](tracks/tech-lead.md) | You set technical direction, review code and keep quality up. | 13 | [`dev-workflow`](bundles.md#dev-workflow) |
| [Product Manager & Planner](tracks/product.md) | You define what to build: research, specs, roadmaps and growth. | 23 | [`product-growth`](bundles.md#product-growth) |
| [Engineering Manager & Delivery Lead](tracks/management.md) | You run teams, delivery, risk and stakeholders. | 17 | [`management-only`](bundles.md#management-only) |
| [Open-Source Maintainer](tracks/oss-maintainer.md) | You run a public repository with contributors and releases. | 13 | [`dev-workflow`](bundles.md#dev-workflow) |
| [Technical Writer & Docs Engineer](tracks/technical-writer.md) | You write READMEs, API docs, specs and changelogs. | 9 | [`planning-docs`](bundles.md#planning-docs) |
| [Beginner Learning Path](tracks/beginner.md) | You are learning software development and want solid habits from day one. | 13 | [`languages`](bundles.md#languages) |

### Delivery and growth

| Track | Who it is for | Skills in track | Closest bundle |
|-------|---------------|-----------------|----------------|
| [QA Automation Engineer](tracks/qa-automation.md) | You build end-to-end, visual and regression suites that run in CI. | 13 | [`quality-testing`](bundles.md#quality-testing) |
| [SEO & Web Growth Engineer](tracks/web-growth.md) | You grow organic traffic and conversion with fast, well-structured pages. | 14 | [`web-performance-seo`](bundles.md#web-performance-seo) |
| [Agile Coach & Scrum Master](tracks/agile-coach.md) | You improve how teams plan, deliver and learn. | 9 | [`management-only`](bundles.md#management-only) |

## I want to…

| Goal | Start here |
|------|-----------|
| Ship a SaaS MVP fast | [Recipe 1](recipes.md#1-saas-mvp-web) |
| Build an LLM / RAG product | [Recipe 2](recipes.md#2-ai-saas-with-rag), then [ML & AI](tracks/ml-ai.md) |
| Build AI agents | [AI Agent Builder](tracks/ai-agents.md) |
| Stop agents producing generic "AI-looking" UI | [Recipe 4](recipes.md#4-ui-that-does-not-look-ai-generated) |
| Launch a mobile app | [Recipe 3](recipes.md#3-mobile-app-with-a-managed-backend), then [Mobile](tracks/mobile.md) |
| Run Kubernetes for many teams | [Recipe 5](recipes.md#5-kubernetes-platform-team) |
| Pass a security review | [Recipe 6](recipes.md#6-security-review-before-launch) |
| Install a whole bundle | [Bundles](bundles.md) |
| Make my own team bundle | [Build a custom bundle](custom-bundles.md) |

## Install

The [`skills` CLI](https://github.com/vercel-labs/skills) installs skills by name; repeat `--skill` for each one:

```bash
npx skills add j4flmao/agent-skills --list
npx skills add j4flmao/agent-skills --skill backend-api-design --skill backend-idempotency -a claude-code
```

Every track page has ready commands for Level 1 and Level 1 + 2, and every bundle has its command on the [bundles page](bundles.md).

## Pages

- [Bundles](bundles.md) — every bundle with its install command and team skill pack
- [Build a custom bundle](custom-bundles.md) — combine bundles, pick single skills, share a set with your team
- [Recommended combinations](recommendations.md) — ready multi-track sets for common situations, one command each
- [Recipes](recipes.md) — small combinations for common situations
- Tracks: [Frontend Engineer](tracks/frontend.md), [Backend Engineer](tracks/backend.md), [Full-Stack Product Team](tracks/fullstack.md), [Mobile Engineer](tracks/mobile.md), [Desktop App Engineer](tracks/desktop.md), [Designer & Design Engineer](tracks/design-ux.md), [React & Next.js Developer](tracks/react.md), [Vue & Nuxt Developer](tracks/vue.md), [Angular Developer](tracks/angular.md), [Node.js & TypeScript Backend](tracks/node-backend.md), [Python Backend Developer](tracks/python-backend.md), [Go Backend Developer](tracks/go-backend.md), [Java & Kotlin Backend Developer](tracks/java-kotlin-backend.md), [.NET Developer](tracks/dotnet.md), [PHP & Ruby Web Developer](tracks/php-ruby.md), [iOS Developer](tracks/ios.md), [Android Developer](tracks/android.md), [Flutter Developer](tracks/flutter.md), [React Native Developer](tracks/react-native.md), [Rust Developer](tracks/rust.md), [Elixir & Phoenix Developer](tracks/elixir.md), [Svelte, Solid, Astro & Qwik Developer](tracks/modern-frontend.md), [DevOps & Platform Engineer](tracks/devops-platform.md), [Site Reliability Engineer](tracks/sre.md), [Cloud Architect & Engineer](tracks/cloud.md), [Observability Engineer](tracks/observability.md), [Database Engineer](tracks/database.md), [Platform Engineer (IDP)](tracks/platform-engineering.md), [FinOps & Cloud Cost Engineer](tracks/finops.md), [Data Engineer](tracks/data-engineering.md), [ML & AI Engineer](tracks/ml-ai.md), [AI Agent Builder](tracks/ai-agents.md), [LLM Application Developer](tracks/llm-app.md), [MLOps Engineer](tracks/mlops.md), [Data Scientist & Analyst](tracks/data-scientist.md), [Analytics Engineer](tracks/analytics-engineer.md), [Streaming & Event Data Engineer](tracks/streaming.md), [Search & Retrieval Engineer](tracks/search.md), [Prompt Engineer & AI Evaluator](tracks/prompt-engineer.md), [AI Safety & LLM Red Team](tracks/ai-safety.md), [GPU Kernel & Inference Engineer](tracks/gpu-kernels.md), [Security Engineer](tracks/security.md), [Application Security & DevSecOps](tracks/appsec.md), [SOC Analyst & Detection Engineer](tracks/soc.md), [Compliance & Privacy Engineer](tracks/compliance.md), [Game Developer](tracks/game.md), [Unity Developer](tracks/unity.md), [Unreal Engine Developer](tracks/unreal.md), [Godot Developer](tracks/godot.md), [Game Engine Programmer](tracks/engine-programmer.md), [Online Game Backend Engineer](tracks/game-backend.md), [SaaS Product Builder](tracks/saas.md), [E-commerce Engineer](tracks/ecommerce.md), [Real-Time Apps Developer](tracks/realtime.md), [Blockchain & Web3 Engineer](tracks/blockchain.md), [DeFi Protocol Engineer](tracks/defi.md), [Systems & Embedded Engineer](tracks/systems.md), [Software & Solution Architect](tracks/architecture.md), [Performance Engineer](tracks/performance.md), [Accessibility Specialist](tracks/accessibility.md), [QA & Test Engineer](tracks/quality.md), [Low-Latency & HFT Engineer](tracks/low-latency.md), [IoT & Edge Engineer](tracks/iot-edge.md), [Zero-Knowledge & Cryptography Engineer](tracks/zk.md), [Quantum Computing Researcher](tracks/quantum.md), [Microservices Engineer](tracks/microservices.md), [GraphQL API Engineer](tracks/graphql.md), [Legacy Modernization Lead](tracks/legacy-modernization.md), [Startup CTO & Solo Founder](tracks/startup-cto.md), [Tech Lead & Staff Engineer](tracks/tech-lead.md), [Product Manager & Planner](tracks/product.md), [Engineering Manager & Delivery Lead](tracks/management.md), [Open-Source Maintainer](tracks/oss-maintainer.md), [Technical Writer & Docs Engineer](tracks/technical-writer.md), [Beginner Learning Path](tracks/beginner.md), [QA Automation Engineer](tracks/qa-automation.md), [SEO & Web Growth Engineer](tracks/web-growth.md), [Agile Coach & Scrum Master](tracks/agile-coach.md)

Tracks list 551 hand-picked skills. The rest are reachable through [bundles](bundles.md) and the full catalog in the [master summary](../docs/skills-master-summary.md#skills-by-category).
