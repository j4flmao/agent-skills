# Recommended Combinations

Ready-made combinations of tracks for common situations. Each one merges the chosen level of every track (security baselines included), removes duplicates, and gives one install command.

[← Advisor home](README.md) · [Bundles](bundles.md) · [Recipes](recipes.md)

| Situation | Tracks | Skills |
|-----------|--------|--------|
| [Solo founder: web MVP in weeks](#solo-mvp) | [Startup CTO & Solo Founder](tracks/startup-cto.md) L1 + [React & Next.js Developer](tracks/react.md) L1 + [Node.js & TypeScript Backend](tracks/node-backend.md) L1 | 20 |
| [Seed-stage SaaS team (3–8 engineers)](#seed-saas) | [SaaS Product Builder](tracks/saas.md) L1–2 + [Full-Stack Product Team](tracks/fullstack.md) L1 + [DevOps & Platform Engineer](tracks/devops-platform.md) L1 + [QA & Test Engineer](tracks/quality.md) L1 | 36 |
| [Scale-up platform team](#scale-up-platform) | [Platform Engineer (IDP)](tracks/platform-engineering.md) L1–2 + [Site Reliability Engineer](tracks/sre.md) L1 + [Observability Engineer](tracks/observability.md) L1 + [Cloud Architect & Engineer](tracks/cloud.md) L1 | 27 |
| [Enterprise modernization program](#enterprise-modernization) | [Legacy Modernization Lead](tracks/legacy-modernization.md) L1–2 + [Software & Solution Architect](tracks/architecture.md) L1 + [Compliance & Privacy Engineer](tracks/compliance.md) L1 + [Java & Kotlin Backend Developer](tracks/java-kotlin-backend.md) L1 | 24 |
| [AI product startup](#ai-startup) | [LLM Application Developer](tracks/llm-app.md) L1–2 + [AI Agent Builder](tracks/ai-agents.md) L1 + [Python Backend Developer](tracks/python-backend.md) L1 + [SaaS Product Builder](tracks/saas.md) L1 | 24 |
| [Internal AI agents and tools](#internal-ai-tools) | [AI Agent Builder](tracks/ai-agents.md) L1–2 + [AI Safety & LLM Red Team](tracks/ai-safety.md) L1 + [Compliance & Privacy Engineer](tracks/compliance.md) L1 | 17 |
| [Data platform team](#data-platform-team) | [Data Engineer](tracks/data-engineering.md) L1–2 + [Analytics Engineer](tracks/analytics-engineer.md) L1 + [Streaming & Event Data Engineer](tracks/streaming.md) L1 | 22 |
| [ML product team](#ml-product-team) | [Data Scientist & Analyst](tracks/data-scientist.md) L1 + [ML & AI Engineer](tracks/ml-ai.md) L1 + [MLOps Engineer](tracks/mlops.md) L1–2 | 18 |
| [Mobile-first consumer app](#mobile-first-consumer) | [React Native Developer](tracks/react-native.md) L1–2 + [Backend Engineer](tracks/backend.md) L1 + [Product Manager & Planner](tracks/product.md) L1 | 30 |
| [Native mobile studio](#native-mobile-studio) | [iOS Developer](tracks/ios.md) L1 + [Android Developer](tracks/android.md) L1 + [Mobile Engineer](tracks/mobile.md) L1 + [QA Automation Engineer](tracks/qa-automation.md) L1 | 16 |
| [Indie game (Unity)](#indie-game) | [Unity Developer](tracks/unity.md) L1–2 + [Game Developer](tracks/game.md) L1 | 12 |
| [Online multiplayer game](#online-multiplayer) | [Online Game Backend Engineer](tracks/game-backend.md) L1–2 + [Real-Time Apps Developer](tracks/realtime.md) L1 + [Site Reliability Engineer](tracks/sre.md) L1 | 20 |
| [Fintech or payments product](#fintech-payments) | [E-commerce Engineer](tracks/ecommerce.md) L1 + [Compliance & Privacy Engineer](tracks/compliance.md) L1–2 + [Application Security & DevSecOps](tracks/appsec.md) L1 + [Backend Engineer](tracks/backend.md) L1 | 24 |
| [Web3 protocol team](#web3-protocol) | [DeFi Protocol Engineer](tracks/defi.md) L1–2 + [Zero-Knowledge & Cryptography Engineer](tracks/zk.md) L1 + [Application Security & DevSecOps](tracks/appsec.md) L1 | 17 |
| [Security team](#security-team) | [Application Security & DevSecOps](tracks/appsec.md) L1–2 + [SOC Analyst & Detection Engineer](tracks/soc.md) L1 + [Compliance & Privacy Engineer](tracks/compliance.md) L1 | 15 |
| [Open-source library](#open-source-library) | [Open-Source Maintainer](tracks/oss-maintainer.md) L1–2 + [QA & Test Engineer](tracks/quality.md) L1 + [Technical Writer & Docs Engineer](tracks/technical-writer.md) L1 | 19 |
| [Agency or freelancer building client websites](#agency-websites) | [Svelte, Solid, Astro & Qwik Developer](tracks/modern-frontend.md) L1 + [SEO & Web Growth Engineer](tracks/web-growth.md) L1–2 + [Accessibility Specialist](tracks/accessibility.md) L1 + [Designer & Design Engineer](tracks/design-ux.md) L1 | 19 |
| [New tech lead on an existing codebase](#tech-lead-onboarding) | [Tech Lead & Staff Engineer](tracks/tech-lead.md) L1–2 + [Software & Solution Architect](tracks/architecture.md) L1 | 15 |
| [Learning to code](#learning-path) | [Beginner Learning Path](tracks/beginner.md) L1–2 | 10 |
| [Low-latency trading system](#low-latency-trading) | [Low-Latency & HFT Engineer](tracks/low-latency.md) L1–2 + [Systems & Embedded Engineer](tracks/systems.md) L1 | 12 |

<a id="solo-mvp"></a>
## Solo founder: web MVP in weeks

**Situation:** One person, one web product, ship fast.

**Combines:** [Startup CTO & Solo Founder](tracks/startup-cto.md) L1 + [React & Next.js Developer](tracks/react.md) L1 + [Node.js & TypeScript Backend](tracks/node-backend.md) L1 — **20 skills**

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-prd --skill create-tech-spec --skill backend-api-design --skill docker-patterns --skill security-secrets-management --skill security-api-security --skill react-architecture --skill react-nextjs --skill frontend-state-management --skill frontend-data-fetching --skill frontend-form-handling --skill frontend-typescript-patterns --skill frontend-security --skill owasp-web-security --skill nodejs-architecture --skill nodejs-patterns --skill typescript --skill backend-database-patterns
```

**Next:** Add `saas` Level 1 once you charge money; add `quality` Level 1 before the first paying customer.

<a id="seed-saas"></a>
## Seed-stage SaaS team (3–8 engineers)

**Situation:** A small team with paying customers and a growing codebase.

**Combines:** [SaaS Product Builder](tracks/saas.md) L1–2 + [Full-Stack Product Team](tracks/fullstack.md) L1 + [DevOps & Platform Engineer](tracks/devops-platform.md) L1 + [QA & Test Engineer](tracks/quality.md) L1 — **36 skills**

```bash
npx skills add j4flmao/agent-skills --skill backend-multi-tenancy --skill backend-authorization --skill backend-api-design --skill ecommerce-payment-processing --skill enterprise-multi-tenant --skill backend-feature-flags --skill product-pricing-strategy --skill product-onboarding-flow --skill rate-limiting --skill backend-webhooks --skill security-api-security --skill security-data-security --skill security-secrets-management --skill master-orchestrator --skill project-init --skill create-tech-spec --skill backend-database-patterns --skill backend-auth-patterns --skill frontend-state-management --skill frontend-data-fetching --skill docker-patterns --skill frontend-security --skill cicd-pipeline --skill github-actions --skill terraform --skill kubernetes --skill helm-patterns --skill observability --skill devsecops --skill security-container-security --skill quality-unit-testing --skill quality-integration-testing --skill quality-e2e-testing --skill quality-regression-testing --skill quality-smoke-testing --skill security-sast-dast
```

**Next:** Swap `fullstack` for your stack tracks (for example `react` + `python-backend`) once the stack is settled.

<a id="scale-up-platform"></a>
## Scale-up platform team

**Situation:** Several product teams need a reliable, observable platform.

**Combines:** [Platform Engineer (IDP)](tracks/platform-engineering.md) L1–2 + [Site Reliability Engineer](tracks/sre.md) L1 + [Observability Engineer](tracks/observability.md) L1 + [Cloud Architect & Engineer](tracks/cloud.md) L1 — **27 skills**

```bash
npx skills add j4flmao/agent-skills --skill devops-platform-engineering --skill devops-internal-developer-platform --skill kubernetes --skill gitops --skill devops-kubernetes-operators --skill cloud-native-k8s-operators --skill devops-gitops-advanced --skill devops-policy-as-code --skill devops-progressive-delivery --skill helm-patterns --skill devsecops --skill security-container-security --skill security-secrets-management --skill devops-sre-practices --skill sre-sli-slo-management --skill devops-incident-response --skill observability --skill monitoring --skill alerting --skill devops-opentelemetry --skill backend-structured-logging --skill backend-data-masking --skill cloud-architecture --skill terraform --skill devops-finops --skill cloud-native-security-defensive --skill zero-trust-identity
```

**Next:** Add `finops` Level 1 when the cloud bill becomes a board topic.

<a id="enterprise-modernization"></a>
## Enterprise modernization program

**Situation:** Moving a large legacy estate to cloud and services.

**Combines:** [Legacy Modernization Lead](tracks/legacy-modernization.md) L1–2 + [Software & Solution Architect](tracks/architecture.md) L1 + [Compliance & Privacy Engineer](tracks/compliance.md) L1 + [Java & Kotlin Backend Developer](tracks/java-kotlin-backend.md) L1 — **24 skills**

```bash
npx skills add j4flmao/agent-skills --skill enterprise-legacy-migration --skill dev-loop-refactor-guide --skill enterprise-integration-patterns --skill cloud-migration --skill microservices --skill architecture-domain-driven-design --skill backend-transactional-outbox --skill database-migration --skill quality-regression-testing --skill threat-modeling --skill security-secrets-management --skill create-tech-spec --skill system-design-database-sharding --skill distributed-consensus --skill backend-event-driven --skill zero-trust-identity --skill enterprise-compliance-audit --skill enterprise-data-governance --skill security-data-security --skill java --skill spring-boot-architecture --skill spring-boot-patterns --skill backend-api-design --skill security-api-security
```

**Next:** Replace `java-kotlin-backend` with `dotnet` for Microsoft shops.

<a id="ai-startup"></a>
## AI product startup

**Situation:** An LLM-powered product with RAG and agents.

**Combines:** [LLM Application Developer](tracks/llm-app.md) L1–2 + [AI Agent Builder](tracks/ai-agents.md) L1 + [Python Backend Developer](tracks/python-backend.md) L1 + [SaaS Product Builder](tracks/saas.md) L1 — **24 skills**

```bash
npx skills add j4flmao/agent-skills --skill prompt-few-shot --skill prompt-chain-of-thought --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill data-vector-databases --skill tool-calling-principles --skill ai-agentic-workflows --skill agent-observability --skill ml-inference-optimization --skill genai-vision --skill ai-defense-mechanisms --skill adversarial-prompting --skill security-data-security --skill ai-agent-architectures --skill ai-agent-core-loop --skill security-secrets-management --skill python --skill python-fastapi-architecture --skill backend-api-design --skill backend-database-patterns --skill security-api-security --skill backend-multi-tenancy --skill backend-authorization --skill ecommerce-payment-processing
```

**Next:** Add `ai-safety` Level 1 before opening the product to untrusted users.

<a id="internal-ai-tools"></a>
## Internal AI agents and tools

**Situation:** Agents that act on internal systems for employees.

**Combines:** [AI Agent Builder](tracks/ai-agents.md) L1–2 + [AI Safety & LLM Red Team](tracks/ai-safety.md) L1 + [Compliance & Privacy Engineer](tracks/compliance.md) L1 — **17 skills**

```bash
npx skills add j4flmao/agent-skills --skill ai-agent-architectures --skill ai-agent-core-loop --skill tool-calling-principles --skill ai-agentic-workflows --skill prompt-chain-of-thought --skill ai-agent-memory-systems --skill ai-multi-agent-systems --skill multi-agent-topology --skill agent-observability --skill sandbox-execution --skill llm-rag-retrieval-internals --skill ai-defense-mechanisms --skill security-secrets-management --skill adversarial-prompting --skill enterprise-compliance-audit --skill enterprise-data-governance --skill security-data-security
```

**Next:** Put human approval in front of every tool that changes production; see `.claude/rules/agent-persona-design.md`.

<a id="data-platform-team"></a>
## Data platform team

**Situation:** A central team running pipelines, warehouse and streaming.

**Combines:** [Data Engineer](tracks/data-engineering.md) L1–2 + [Analytics Engineer](tracks/analytics-engineer.md) L1 + [Streaming & Event Data Engineer](tracks/streaming.md) L1 — **22 skills**

```bash
npx skills add j4flmao/agent-skills --skill data-etl-pipeline --skill data-data-warehouse --skill data-dimensional-modeling --skill data-data-quality --skill data-relational-database --skill data-streaming --skill data-data-lakehouse --skill data-data-lake --skill data-batch-processing --skill data-distributed-compute --skill data-formats --skill data-schema-registry --skill data-data-contracts --skill data-data-observability --skill data-lineage --skill data-testing --skill data-pipeline-cicd --skill security-data-security --skill security-secrets-management --skill data-science-analytics-engineering --skill data-kafka-event-streaming --skill backend-data-streaming
```

**Next:** Add `mlops` Level 1 when models start consuming the platform's data.

<a id="ml-product-team"></a>
## ML product team

**Situation:** Data scientists and ML engineers shipping models to users.

**Combines:** [Data Scientist & Analyst](tracks/data-scientist.md) L1 + [ML & AI Engineer](tracks/ml-ai.md) L1 + [MLOps Engineer](tracks/mlops.md) L1–2 — **18 skills**

```bash
npx skills add j4flmao/agent-skills --skill data-science-statistical-analysis --skill data-science-experimentation --skill ml-classical-ml --skill ml-model-evaluation --skill security-data-security --skill ml-deep-learning --skill ml-feature-engineering --skill prompt-few-shot --skill prompt-chain-of-thought --skill ai-defense-mechanisms --skill devops-mlops --skill ml-model-serving --skill ml-experiment-tracking --skill ml-ml-pipeline --skill ml-feature-store --skill ml-inference-optimization --skill devops-kubernetes-for-data --skill security-secrets-management
```

**Next:** Add `gpu-kernels` Level 1 only if serving cost or latency is the bottleneck.

<a id="mobile-first-consumer"></a>
## Mobile-first consumer app

**Situation:** One cross-platform app plus a backend and growth loop.

**Combines:** [React Native Developer](tracks/react-native.md) L1–2 + [Backend Engineer](tracks/backend.md) L1 + [Product Manager & Planner](tracks/product.md) L1 — **30 skills**

```bash
npx skills add j4flmao/agent-skills --skill react-native-expertise --skill typescript --skill mobile-patterns --skill mobile-networking --skill mobile-storage --skill react-native-architecture --skill mobile-testing --skill mobile-performance --skill mobile-push-notifications --skill mobile-deployment --skill frontend-state-management --skill mobile-security --skill backend-api-design --skill backend-api-response --skill backend-database-patterns --skill backend-auth-patterns --skill backend-structured-logging --skill backend-clean-architecture --skill quality-unit-testing --skill quality-integration-testing --skill security-api-security --skill security-secrets-management --skill owasp-web-security --skill create-brief --skill create-prd --skill create-story --skill planning-create-roadmap --skill product-user-research --skill pm --skill threat-modeling
```

**Next:** Swap `react-native` for `flutter` if your team writes Dart.

<a id="native-mobile-studio"></a>
## Native mobile studio

**Situation:** Separate native iOS and Android apps.

**Combines:** [iOS Developer](tracks/ios.md) L1 + [Android Developer](tracks/android.md) L1 + [Mobile Engineer](tracks/mobile.md) L1 + [QA Automation Engineer](tracks/qa-automation.md) L1 — **16 skills**

```bash
npx skills add j4flmao/agent-skills --skill ios --skill lang-swift --skill mobile-patterns --skill mobile-networking --skill mobile-storage --skill mobile-security --skill android --skill lang-kotlin --skill mobile-testing --skill mobile-performance --skill security-secrets-management --skill quality-e2e-testing --skill qa-e2e-playwright --skill quality-regression-testing --skill quality-smoke-testing --skill security-sast-dast
```

**Next:** Add `design-ux` Level 1 if designers work in the same repository.

<a id="indie-game"></a>
## Indie game (Unity)

**Situation:** A small team shipping a single-player or light multiplayer game.

**Combines:** [Unity Developer](tracks/unity.md) L1–2 + [Game Developer](tracks/game.md) L1 — **12 skills**

```bash
npx skills add j4flmao/agent-skills --skill unity --skill unity-csharp --skill lang-csharp --skill game-engine-patterns --skill ecs-architecture --skill ecs-pattern --skill physics-engine --skill input-systems --skill animation-systems --skill audio-engine --skill anti-cheat-server --skill security-api-security
```

**Next:** Swap `unity` for `godot` or `unreal` to match your engine.

<a id="online-multiplayer"></a>
## Online multiplayer game

**Situation:** Authoritative servers, matchmaking and live operations.

**Combines:** [Online Game Backend Engineer](tracks/game-backend.md) L1–2 + [Real-Time Apps Developer](tracks/realtime.md) L1 + [Site Reliability Engineer](tracks/sre.md) L1 — **20 skills**

```bash
npx skills add j4flmao/agent-skills --skill authoritative-server --skill multiplayer-netcode --skill matchmaking-lobby --skill interest-management --skill scaling-architecture --skill game-engine-multiplayer-netcode --skill backend-websocket-patterns --skill devops-kubernetes-autoscaling --skill anti-cheat-server --skill security-api-security --skill backend-web-real-time --skill backend-message-queue --skill devops-sre-practices --skill sre-sli-slo-management --skill devops-incident-response --skill observability --skill monitoring --skill alerting --skill security-secrets-management --skill security-container-security
```

**Next:** Add your engine track (`unity`, `unreal` or `godot`) at Level 1 for the client side.

<a id="fintech-payments"></a>
## Fintech or payments product

**Situation:** Money movement, ledgers, compliance and fraud risk.

**Combines:** [E-commerce Engineer](tracks/ecommerce.md) L1 + [Compliance & Privacy Engineer](tracks/compliance.md) L1–2 + [Application Security & DevSecOps](tracks/appsec.md) L1 + [Backend Engineer](tracks/backend.md) L1 — **24 skills**

```bash
npx skills add j4flmao/agent-skills --skill ecommerce-checkout-cart --skill ecommerce-payment-processing --skill backend-idempotency --skill security-api-security --skill security-data-security --skill enterprise-compliance-audit --skill enterprise-data-governance --skill backend-audit-logging --skill backend-data-masking --skill rbac --skill abac-access-control --skill security-secrets-management --skill threat-modeling --skill security-sast-dast --skill devsecops --skill backend-api-design --skill backend-api-response --skill backend-database-patterns --skill backend-auth-patterns --skill backend-structured-logging --skill backend-clean-architecture --skill quality-unit-testing --skill quality-integration-testing --skill owasp-web-security
```

**Next:** Read `.claude/rules/distributed-safeguards.md`: idempotency on every money-moving endpoint.

<a id="web3-protocol"></a>
## Web3 protocol team

**Situation:** Smart contracts holding real value.

**Combines:** [DeFi Protocol Engineer](tracks/defi.md) L1–2 + [Zero-Knowledge & Cryptography Engineer](tracks/zk.md) L1 + [Application Security & DevSecOps](tracks/appsec.md) L1 — **17 skills**

```bash
npx skills add j4flmao/agent-skills --skill blockchain-defi --skill smart-contract-security --skill blockchain-application --skill blockchain-testing --skill defi-protocols --skill defi-smart-contracts --skill blockchain-patterns --skill blockchain-cross-chain --skill blockchain-data-indexing --skill blockchain-security --skill blockchain-zk --skill zero-knowledge-proofs --skill blockchain-cryptography --skill threat-modeling --skill security-sast-dast --skill security-secrets-management --skill devsecops
```

**Next:** Plan an external audit before mainnet; the skills do not replace one.

<a id="security-team"></a>
## Security team

**Situation:** AppSec, detection and compliance in one small team.

**Combines:** [Application Security & DevSecOps](tracks/appsec.md) L1–2 + [SOC Analyst & Detection Engineer](tracks/soc.md) L1 + [Compliance & Privacy Engineer](tracks/compliance.md) L1 — **15 skills**

```bash
npx skills add j4flmao/agent-skills --skill threat-modeling --skill security-sast-dast --skill security-secrets-management --skill devsecops --skill security-sbom --skill security-container-security --skill security-api-security --skill owasp-web-security --skill frontend-security --skill soc-operations --skill siem-engineering --skill detection-engineering --skill enterprise-compliance-audit --skill enterprise-data-governance --skill security-data-security
```

**Next:** Add `ai-safety` Level 1 if the company ships LLM features.

<a id="open-source-library"></a>
## Open-source library

**Situation:** A public package with contributors and releases.

**Combines:** [Open-Source Maintainer](tracks/oss-maintainer.md) L1–2 + [QA & Test Engineer](tracks/quality.md) L1 + [Technical Writer & Docs Engineer](tracks/technical-writer.md) L1 — **19 skills**

```bash
npx skills add j4flmao/agent-skills --skill dev-loop-readme-writer --skill dev-loop-changelog-generator --skill dev-loop-pr-writer --skill dev-loop-git-workflow --skill github-actions --skill dependency-management --skill conflict-resolution --skill husky-and-hooks --skill code-review --skill security-sbom --skill security-secrets-management --skill quality-unit-testing --skill quality-integration-testing --skill quality-e2e-testing --skill quality-regression-testing --skill quality-smoke-testing --skill security-sast-dast --skill backend-openapi-documentation --skill api-documentation
```

**Next:** Add your language track (for example `rust` or `python-backend`) at Level 1.

<a id="agency-websites"></a>
## Agency or freelancer building client websites

**Situation:** Many fast, accessible, search-friendly marketing sites.

**Combines:** [Svelte, Solid, Astro & Qwik Developer](tracks/modern-frontend.md) L1 + [SEO & Web Growth Engineer](tracks/web-growth.md) L1–2 + [Accessibility Specialist](tracks/accessibility.md) L1 + [Designer & Design Engineer](tracks/design-ux.md) L1 — **19 skills**

```bash
npx skills add j4flmao/agent-skills --skill frontend-svelte-architecture --skill sveltekit --skill frontend-typescript-patterns --skill frontend-rendering-strategies --skill frontend-security --skill seo-fundamentals --skill frontend-seo --skill web-performance --skill seo-structured-data --skill programmatic-seo --skill seo-ai-content-optimization --skill product-growth-engineering --skill product-analytics --skill product-ab-testing --skill design-accessibility --skill frontend-accessibility --skill design-visual-design --skill design-systems --skill frontend-design-system
```

**Next:** Use `react` Level 1 instead of `modern-frontend` for Next.js-based clients.

<a id="tech-lead-onboarding"></a>
## New tech lead on an existing codebase

**Situation:** You inherited a codebase and need to steer it.

**Combines:** [Tech Lead & Staff Engineer](tracks/tech-lead.md) L1–2 + [Software & Solution Architect](tracks/architecture.md) L1 — **15 skills**

```bash
npx skills add j4flmao/agent-skills --skill code-review --skill dev-loop-refactor-guide --skill create-tech-spec --skill dev-loop-tech-debt-tracker --skill architecture-domain-driven-design --skill backend-clean-architecture --skill team-rules --skill dev-loop-performance-profiler --skill dev-loop-security-auditor --skill threat-modeling --skill system-design-database-sharding --skill distributed-consensus --skill microservices --skill backend-event-driven --skill zero-trust-identity
```

**Next:** Add the stack track of the codebase at Level 1.

<a id="learning-path"></a>
## Learning to code

**Situation:** A student or career switcher building solid habits.

**Combines:** [Beginner Learning Path](tracks/beginner.md) L1–2 — **10 skills**

```bash
npx skills add j4flmao/agent-skills --skill python --skill typescript --skill dev-loop-git-workflow --skill dev-loop-debugging-strategy --skill quality-unit-testing --skill frontend-patterns --skill backend-api-design --skill backend-database-patterns --skill core-algorithms-system-design --skill security-secrets-management
```

**Next:** Move to one product track (for example `react` or `python-backend`) after your first finished project.

<a id="low-latency-trading"></a>
## Low-latency trading system

**Situation:** Market data, order routing and microsecond budgets.

**Combines:** [Low-Latency & HFT Engineer](tracks/low-latency.md) L1–2 + [Systems & Embedded Engineer](tracks/systems.md) L1 — **12 skills**

```bash
npx skills add j4flmao/agent-skills --skill lock-free-ring-buffers --skill kernel-bypass-dpdk --skill cpu-architecture --skill lang-cpp --skill ebpf-xdp-networking --skill network-protocols --skill lang-rust --skill dev-loop-performance-profiler --skill lang-c --skill core-algorithms-system-design --skill modern-cryptography --skill security-sbom
```

**Next:** Add `compliance` Level 1 for regulated markets.
