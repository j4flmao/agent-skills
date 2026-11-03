# Bundles

Every bundle is a named list of skills from [`bundles/bundle-definitions.json`](../bundles/bundle-definitions.json). The `skills` CLI installs skills by name, so each bundle below comes with the exact command that installs it.

[← Advisor home](README.md) · [Build a custom bundle](custom-bundles.md) · [Recipes](recipes.md)

Add `-a <agent>` (for example `-a claude-code`), `-g` (global) or `-y` (no prompts) to any command. Prefer a focused bundle: every installed skill takes listing space in the agent's context.

## Index

| Bundle | Skills | Kind |
|--------|--------|------|
| [access-control](#access-control) | 7 | focused |
| [advanced-security-bundle](#advanced-security-bundle) | 11 | focused |
| [ai-agents](#ai-agents) | 14 | focused |
| [ai-engineering](#ai-engineering) | 26 | focused |
| [api-all](#api-all) | 9 | focused |
| [architecture-system-design](#architecture-system-design) | 23 | focused |
| [backend-capabilities](#backend-capabilities) | 10 | focused |
| [backend-patterns](#backend-patterns) | 27 | focused |
| [blockchain-all](#blockchain-all) | 20 | focused |
| [cloud-architecture](#cloud-architecture) | 15 | focused |
| [data-engineering](#data-engineering) | 45 | focused |
| [data-platform](#data-platform) | 39 | focused |
| [design-ux](#design-ux) | 14 | focused |
| [desktop-all](#desktop-all) | 30 | focused |
| [dev-workflow](#dev-workflow) | 23 | focused |
| [ecommerce-all](#ecommerce-all) | 13 | focused |
| [embedded-iot](#embedded-iot) | 9 | focused |
| [enterprise](#enterprise) | 18 | focused |
| [fintech-payments](#fintech-payments) | 13 | focused |
| [frontend-foundations](#frontend-foundations) | 28 | focused |
| [frontend-frameworks](#frontend-frameworks) | 24 | focused |
| [game-development](#game-development) | 32 | focused |
| [game-server](#game-server) | 9 | focused |
| [gpu-hpc](#gpu-hpc) | 14 | focused |
| [infra-cloud](#infra-cloud) | 36 | focused |
| [infra-foundations](#infra-foundations) | 15 | focused |
| [kubernetes-platform](#kubernetes-platform) | 36 | focused |
| [languages](#languages) | 14 | focused |
| [ml-engineering](#ml-engineering) | 24 | focused |
| [mobile-cross-platform](#mobile-cross-platform) | 28 | focused |
| [personas](#personas) | 17 | focused |
| [planning-docs](#planning-docs) | 17 | focused |
| [product-growth](#product-growth) | 18 | focused |
| [quality-testing](#quality-testing) | 20 | focused |
| [quantum-computing](#quantum-computing) | 12 | focused |
| [research-frontier](#research-frontier) | 12 | focused |
| [security-all](#security-all) | 30 | focused |
| [serverless-edge](#serverless-edge) | 9 | focused |
| [soc-all](#soc-all) | 18 | focused |
| [sre-reliability](#sre-reliability) | 20 | focused |
| [starter-playbooks](#starter-playbooks) | 7 | focused |
| [systems-programming](#systems-programming) | 17 | focused |
| [web-performance-seo](#web-performance-seo) | 14 | focused |
| [fullstack-nestjs-react](#fullstack-nestjs-react) | 225 | broad |
| [fullstack-golang-vue](#fullstack-golang-vue) | 218 | broad |
| [fullstack-rust-angular](#fullstack-rust-angular) | 217 | broad |
| [fullstack-dotnet-react](#fullstack-dotnet-react) | 218 | broad |
| [fullstack-nodejs-react](#fullstack-nodejs-react) | 223 | broad |
| [fullstack-elysia-react](#fullstack-elysia-react) | 218 | broad |
| [fullstack-rails-svelte](#fullstack-rails-svelte) | 216 | broad |
| [backend-only](#backend-only) | 184 | broad |
| [frontend-only](#frontend-only) | 66 | broad |
| [devops-only](#devops-only) | 68 | broad |
| [management-only](#management-only) | 66 | broad |
| [mobile-ios](#mobile-ios) | 116 | broad |
| [mobile-android](#mobile-android) | 116 | broad |
| [mobile-flutter](#mobile-flutter) | 120 | broad |
| [mobile-react-native](#mobile-react-native) | 120 | broad |
| [backend-stacks](#backend-stacks) | 83 | broad |

## Focused bundles

### access-control

Authentication and authorization: auth patterns, RBAC, ABAC, fine-grained policies, identity providers, zero trust identity — **7 skills**

```bash
npx skills add j4flmao/agent-skills --skill backend-auth-patterns --skill backend-authorization --skill rbac --skill abac-access-control --skill enterprise-identity-provider --skill zero-trust-identity --skill frontend-authentication
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`backend-authorization`](../skills/backend/universal/authorization/SKILL.md), [`rbac`](../skills/security/rbac/SKILL.md), [`abac-access-control`](../skills/security/abac/SKILL.md), [`enterprise-identity-provider`](../skills/enterprise/identity-provider/SKILL.md), [`zero-trust-identity`](../skills/cybersecurity/zero-trust-identity/SKILL.md), [`frontend-authentication`](../skills/frontend/universal/authentication/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@backend-auth-patterns",
    "j4flmao/agent-skills@backend-authorization",
    "j4flmao/agent-skills@rbac",
    "j4flmao/agent-skills@abac-access-control",
    "j4flmao/agent-skills@enterprise-identity-provider",
    "j4flmao/agent-skills@zero-trust-identity",
    "j4flmao/agent-skills@frontend-authentication"
  ]
}
```

</details>

### advanced-security-bundle

Advanced security skills including red team, blue team, and cloud attacks (educational) — **11 skills**

```bash
npx skills add j4flmao/agent-skills --skill redteam-operations --skill attack-patterns --skill exploit-development-concepts --skill blueteam-operations --skill detection-engineering --skill purpleteam-collaboration --skill cloud-native-security-offensive --skill cloud-native-security-defensive --skill reverse-engineering --skill advanced-binary-exploitation --skill malware-analysis-internals
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`redteam-operations`](../skills/security/redteam-operations/SKILL.md), [`attack-patterns`](../skills/security/attack-patterns/SKILL.md), [`exploit-development-concepts`](../skills/security/exploit-development-concepts/SKILL.md), [`blueteam-operations`](../skills/security/blueteam-operations/SKILL.md), [`detection-engineering`](../skills/security/detection-engineering/SKILL.md), [`purpleteam-collaboration`](../skills/security/purpleteam-collaboration/SKILL.md), [`cloud-native-security-offensive`](../skills/cloud-native/cloud-security-offensive/SKILL.md), [`cloud-native-security-defensive`](../skills/cloud-native/cloud-security-defensive/SKILL.md), [`reverse-engineering`](../skills/cybersecurity/reverse-engineering/SKILL.md), [`advanced-binary-exploitation`](../skills/security/advanced-binary-exploitation/SKILL.md), [`malware-analysis-internals`](../skills/security/malware-analysis-internals/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@redteam-operations",
    "j4flmao/agent-skills@attack-patterns",
    "j4flmao/agent-skills@exploit-development-concepts",
    "j4flmao/agent-skills@blueteam-operations",
    "j4flmao/agent-skills@detection-engineering",
    "j4flmao/agent-skills@purpleteam-collaboration",
    "j4flmao/agent-skills@cloud-native-security-offensive",
    "j4flmao/agent-skills@cloud-native-security-defensive",
    "j4flmao/agent-skills@reverse-engineering",
    "j4flmao/agent-skills@advanced-binary-exploitation",
    "j4flmao/agent-skills@malware-analysis-internals"
  ]
}
```

</details>

### ai-agents

Building AI agents: architectures, memory, tool calling, multi-agent topologies, observability, sandboxing, agent planning docs — **14 skills**

```bash
npx skills add j4flmao/agent-skills --skill ai-agent-architectures --skill ai-agent-core-loop --skill ai-agent-memory-systems --skill multi-agent-topology --skill tool-calling-principles --skill ai-agentic-workflows --skill ai-multi-agent-systems --skill agent-observability --skill sandbox-execution --skill swarm-architectures --skill write-implementation-plan --skill agent-task-checklist --skill agent-walkthrough-report --skill core-context-compressor
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`ai-agent-architectures`](../skills/ai/ai-agents/SKILL.md), [`ai-agent-core-loop`](../skills/ai/ai-agents/core-architectures/SKILL.md), [`ai-agent-memory-systems`](../skills/ai/ai-agents/memory-systems/SKILL.md), [`multi-agent-topology`](../skills/ai/ai-agents/multi-agent-topology/SKILL.md), [`tool-calling-principles`](../skills/ai/ai-agents/tool-calling-principles/SKILL.md), [`ai-agentic-workflows`](../skills/ai/agentic-workflows/SKILL.md), [`ai-multi-agent-systems`](../skills/ai/multi-agent-systems/SKILL.md), [`agent-observability`](../skills/harness-engineering/agent-observability/SKILL.md), [`sandbox-execution`](../skills/harness-engineering/sandbox-execution/SKILL.md), [`swarm-architectures`](../skills/rnd/ai-agents/swarm-architectures/SKILL.md), [`write-implementation-plan`](../skills/planning/agent-implementation-plan/SKILL.md), [`agent-task-checklist`](../skills/planning/agent-task-checklist/SKILL.md), [`agent-walkthrough-report`](../skills/planning/agent-walkthrough-report/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@ai-agent-architectures",
    "j4flmao/agent-skills@ai-agent-core-loop",
    "j4flmao/agent-skills@ai-agent-memory-systems",
    "j4flmao/agent-skills@multi-agent-topology",
    "j4flmao/agent-skills@tool-calling-principles",
    "j4flmao/agent-skills@ai-agentic-workflows",
    "j4flmao/agent-skills@ai-multi-agent-systems",
    "j4flmao/agent-skills@agent-observability",
    "j4flmao/agent-skills@sandbox-execution",
    "j4flmao/agent-skills@swarm-architectures",
    "j4flmao/agent-skills@write-implementation-plan",
    "j4flmao/agent-skills@agent-task-checklist",
    "j4flmao/agent-skills@agent-walkthrough-report",
    "j4flmao/agent-skills@core-context-compressor"
  ]
}
```

</details>

### ai-engineering

AI engineering: LLM apps, RAG, prompting, fine-tuning, inference, vector search, agent harnesses — **26 skills**

```bash
npx skills add j4flmao/agent-skills --skill ai-agentic-workflows --skill ai-agent-architectures --skill ai-agent-core-loop --skill ai-agent-memory-systems --skill multi-agent-topology --skill tool-calling-principles --skill genai-vision --skill llm-kv-cache-paged-attention --skill llm-model-quantization --skill llm-rag-retrieval-internals --skill llm-finetuning --skill ai-multi-agent-systems --skill prompt-chain-of-thought --skill prompt-few-shot --skill prompt-rag-query-design --skill prompt-tree-of-thoughts --skill data-vector-databases --skill ml-inference-optimization --skill agent-observability --skill sandbox-execution --skill local-slm-inference --skill multimodal-pipelines --skill swarm-architectures --skill adversarial-prompting --skill ai-defense-mechanisms --skill ai-architect
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`ai-agentic-workflows`](../skills/ai/agentic-workflows/SKILL.md), [`ai-agent-architectures`](../skills/ai/ai-agents/SKILL.md), [`ai-agent-core-loop`](../skills/ai/ai-agents/core-architectures/SKILL.md), [`ai-agent-memory-systems`](../skills/ai/ai-agents/memory-systems/SKILL.md), [`multi-agent-topology`](../skills/ai/ai-agents/multi-agent-topology/SKILL.md), [`tool-calling-principles`](../skills/ai/ai-agents/tool-calling-principles/SKILL.md), [`genai-vision`](../skills/ai/genai-vision/SKILL.md), [`llm-kv-cache-paged-attention`](../skills/ai/llm-engineering/kv-cache/SKILL.md), [`llm-model-quantization`](../skills/ai/llm-engineering/model-quantization/SKILL.md), [`llm-rag-retrieval-internals`](../skills/ai/llm-engineering/rag-architecture/SKILL.md), [`llm-finetuning`](../skills/ai/llm-finetuning/SKILL.md), [`ai-multi-agent-systems`](../skills/ai/multi-agent-systems/SKILL.md), [`prompt-chain-of-thought`](../skills/prompt-engineering/chain-of-thought/SKILL.md), [`prompt-few-shot`](../skills/prompt-engineering/few-shot-prompting/SKILL.md), [`prompt-rag-query-design`](../skills/prompt-engineering/rag-design/SKILL.md), [`prompt-tree-of-thoughts`](../skills/prompt-engineering/tree-of-thoughts/SKILL.md), [`data-vector-databases`](../skills/data/vector-databases/SKILL.md), [`ml-inference-optimization`](../skills/ml/inference-optimization/SKILL.md), [`agent-observability`](../skills/harness-engineering/agent-observability/SKILL.md), [`sandbox-execution`](../skills/harness-engineering/sandbox-execution/SKILL.md), [`local-slm-inference`](../skills/rnd/ai-agents/local-slm-inference/SKILL.md), [`multimodal-pipelines`](../skills/rnd/ai-agents/multimodal-pipelines/SKILL.md), [`swarm-architectures`](../skills/rnd/ai-agents/swarm-architectures/SKILL.md), [`adversarial-prompting`](../skills/rnd/security/adversarial-prompting/SKILL.md), [`ai-defense-mechanisms`](../skills/rnd/security/ai-defense-mechanisms/SKILL.md), [`ai-architect`](../skills/personas/ai-architect/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@ai-agentic-workflows",
    "j4flmao/agent-skills@ai-agent-architectures",
    "j4flmao/agent-skills@ai-agent-core-loop",
    "j4flmao/agent-skills@ai-agent-memory-systems",
    "j4flmao/agent-skills@multi-agent-topology",
    "j4flmao/agent-skills@tool-calling-principles",
    "j4flmao/agent-skills@genai-vision",
    "j4flmao/agent-skills@llm-kv-cache-paged-attention",
    "j4flmao/agent-skills@llm-model-quantization",
    "j4flmao/agent-skills@llm-rag-retrieval-internals",
    "j4flmao/agent-skills@llm-finetuning",
    "j4flmao/agent-skills@ai-multi-agent-systems",
    "j4flmao/agent-skills@prompt-chain-of-thought",
    "j4flmao/agent-skills@prompt-few-shot",
    "j4flmao/agent-skills@prompt-rag-query-design",
    "j4flmao/agent-skills@prompt-tree-of-thoughts",
    "j4flmao/agent-skills@data-vector-databases",
    "j4flmao/agent-skills@ml-inference-optimization",
    "j4flmao/agent-skills@agent-observability",
    "j4flmao/agent-skills@sandbox-execution",
    "j4flmao/agent-skills@local-slm-inference",
    "j4flmao/agent-skills@multimodal-pipelines",
    "j4flmao/agent-skills@swarm-architectures",
    "j4flmao/agent-skills@adversarial-prompting",
    "j4flmao/agent-skills@ai-defense-mechanisms",
    "j4flmao/agent-skills@ai-architect"
  ]
}
```

</details>

### api-all

API ecosystem: GraphQL Federation, API product management, API design, API gateway — **9 skills**

```bash
npx skills add j4flmao/agent-skills --skill api-graphql-federation --skill api-product-management --skill backend-api-design --skill backend-graphql-patterns --skill api-documentation --skill backend-openapi-documentation --skill backend-api-versioning --skill backend-api-response --skill backend-grpc-patterns
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`api-graphql-federation`](../skills/backend/universal/api/graphql-federation/SKILL.md), [`api-product-management`](../skills/backend/universal/api/product-management/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`api-documentation`](../skills/devops/api-documentation/SKILL.md), [`backend-openapi-documentation`](../skills/backend/universal/openapi-documentation/SKILL.md), [`backend-api-versioning`](../skills/backend/universal/api-versioning/SKILL.md), [`backend-api-response`](../skills/backend/universal/api-response/SKILL.md), [`backend-grpc-patterns`](../skills/backend/universal/grpc-patterns/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@api-graphql-federation",
    "j4flmao/agent-skills@api-product-management",
    "j4flmao/agent-skills@backend-api-design",
    "j4flmao/agent-skills@backend-graphql-patterns",
    "j4flmao/agent-skills@api-documentation",
    "j4flmao/agent-skills@backend-openapi-documentation",
    "j4flmao/agent-skills@backend-api-versioning",
    "j4flmao/agent-skills@backend-api-response",
    "j4flmao/agent-skills@backend-grpc-patterns"
  ]
}
```

</details>

### architecture-system-design

Software and solution architecture: system design, DDD, microservices, event-driven, CQRS/ES, sagas, CRDTs, sharding, consensus, ADRs — **23 skills**

```bash
npx skills add j4flmao/agent-skills --skill architecture-crdts --skill architecture-postgresql-internals --skill architecture-database-scaling --skill architecture-event-driven --skill architecture-micro-frontends --skill architecture-domain-driven-design --skill architecture-microservices-patterns --skill core-algorithms-system-design --skill system-design-database-sharding --skill distributed-consensus --skill system-design-rate-limiting --skill backend-clean-architecture --skill microservices --skill backend-event-driven --skill backend-cqrs-patterns --skill backend-event-sourcing --skill backend-transactional-outbox --skill backend-resilience-patterns --skill create-tech-spec --skill enterprise-architecture-governance --skill enterprise-togaf-zachman --skill enterprise-integration-patterns --skill system-architect
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`architecture-crdts`](../skills/architecture/crdts/SKILL.md), [`architecture-postgresql-internals`](../skills/architecture/databases/postgresql-internals/SKILL.md), [`architecture-database-scaling`](../skills/architecture/databases/scaling-and-sharding/SKILL.md), [`architecture-event-driven`](../skills/architecture/event-driven/SKILL.md), [`architecture-micro-frontends`](../skills/architecture/micro-frontends/SKILL.md), [`architecture-domain-driven-design`](../skills/architecture/system-design/domain-driven-design/SKILL.md), [`architecture-microservices-patterns`](../skills/architecture/system-design/microservices-patterns/SKILL.md), [`core-algorithms-system-design`](../skills/system-design/core-algorithms/SKILL.md), [`system-design-database-sharding`](../skills/system-design/database-sharding/SKILL.md), [`distributed-consensus`](../skills/system-design/distributed-consensus/SKILL.md), [`system-design-rate-limiting`](../skills/system-design/rate-limiting/SKILL.md), [`backend-clean-architecture`](../skills/backend/universal/clean-architecture/SKILL.md), [`microservices`](../skills/backend/universal/microservices/SKILL.md), [`backend-event-driven`](../skills/backend/universal/event-driven/SKILL.md), [`backend-cqrs-patterns`](../skills/backend/universal/cqrs-patterns/SKILL.md), [`backend-event-sourcing`](../skills/backend/universal/event-sourcing/SKILL.md), [`backend-transactional-outbox`](../skills/backend/universal/transactional-outbox/SKILL.md), [`backend-resilience-patterns`](../skills/backend/universal/resilience-patterns/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`enterprise-architecture-governance`](../skills/enterprise/architecture-governance/SKILL.md), [`enterprise-togaf-zachman`](../skills/enterprise/togaf-zachman/SKILL.md), [`enterprise-integration-patterns`](../skills/enterprise/integration-patterns/SKILL.md), [`system-architect`](../skills/personas/system-architect/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@architecture-crdts",
    "j4flmao/agent-skills@architecture-postgresql-internals",
    "j4flmao/agent-skills@architecture-database-scaling",
    "j4flmao/agent-skills@architecture-event-driven",
    "j4flmao/agent-skills@architecture-micro-frontends",
    "j4flmao/agent-skills@architecture-domain-driven-design",
    "j4flmao/agent-skills@architecture-microservices-patterns",
    "j4flmao/agent-skills@core-algorithms-system-design",
    "j4flmao/agent-skills@system-design-database-sharding",
    "j4flmao/agent-skills@distributed-consensus",
    "j4flmao/agent-skills@system-design-rate-limiting",
    "j4flmao/agent-skills@backend-clean-architecture",
    "j4flmao/agent-skills@microservices",
    "j4flmao/agent-skills@backend-event-driven",
    "j4flmao/agent-skills@backend-cqrs-patterns",
    "j4flmao/agent-skills@backend-event-sourcing",
    "j4flmao/agent-skills@backend-transactional-outbox",
    "j4flmao/agent-skills@backend-resilience-patterns",
    "j4flmao/agent-skills@create-tech-spec",
    "j4flmao/agent-skills@enterprise-architecture-governance",
    "j4flmao/agent-skills@enterprise-togaf-zachman",
    "j4flmao/agent-skills@enterprise-integration-patterns",
    "j4flmao/agent-skills@system-architect"
  ]
}
```

</details>

### backend-capabilities

Backend product capabilities: caching, event-driven, GraphQL, bulk import, email, SMS, reports, real-time — **10 skills**

```bash
npx skills add j4flmao/agent-skills --skill backend-caching-strategies --skill backend-event-driven-architecture --skill backend-graphql-optimization --skill backend-bulk-import --skill backend-transactional-email --skill backend-sms-messaging --skill backend-report-generation --skill backend-web-real-time --skill backend-concurrency-mechanics --skill microservice-design-patterns
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`backend-caching-strategies`](../skills/backend/caching-strategies/SKILL.md), [`backend-event-driven-architecture`](../skills/backend/event-driven-architecture/SKILL.md), [`backend-graphql-optimization`](../skills/backend/graphql-optimization/SKILL.md), [`backend-bulk-import`](../skills/backend/bulk-import/SKILL.md), [`backend-transactional-email`](../skills/backend/transactional-email/SKILL.md), [`backend-sms-messaging`](../skills/backend/sms-messaging/SKILL.md), [`backend-report-generation`](../skills/backend/report-generation/SKILL.md), [`backend-web-real-time`](../skills/backend/web-real-time/SKILL.md), [`backend-concurrency-mechanics`](../skills/backend/universal/concurrency/SKILL.md), [`microservice-design-patterns`](../skills/backend/universal/design-patterns/microservices/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@backend-caching-strategies",
    "j4flmao/agent-skills@backend-event-driven-architecture",
    "j4flmao/agent-skills@backend-graphql-optimization",
    "j4flmao/agent-skills@backend-bulk-import",
    "j4flmao/agent-skills@backend-transactional-email",
    "j4flmao/agent-skills@backend-sms-messaging",
    "j4flmao/agent-skills@backend-report-generation",
    "j4flmao/agent-skills@backend-web-real-time",
    "j4flmao/agent-skills@backend-concurrency-mechanics",
    "j4flmao/agent-skills@microservice-design-patterns"
  ]
}
```

</details>

### backend-patterns

Advanced backend patterns: CQRS, Event Sourcing, Saga, Transactional Outbox + related universal skills — **27 skills**

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill design-patterns --skill microservices --skill backend-clean-architecture --skill backend-api-design --skill backend-api-response --skill backend-database-patterns --skill backend-auth-patterns --skill backend-event-driven --skill quality-unit-testing --skill quality-integration-testing --skill backend-cqrs-patterns --skill backend-event-sourcing --skill backend-transactional-outbox --skill backend-grpc-patterns --skill backend-websocket-patterns --skill backend-message-queue --skill backend-caching --skill rate-limiting --skill quality-load-testing --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-security-auditor --skill dev-loop-git-workflow --skill docker-patterns --skill cicd-pipeline
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`design-patterns`](../skills/backend/universal/design-patterns/SKILL.md), [`microservices`](../skills/backend/universal/microservices/SKILL.md), [`backend-clean-architecture`](../skills/backend/universal/clean-architecture/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-api-response`](../skills/backend/universal/api-response/SKILL.md), [`backend-database-patterns`](../skills/backend/universal/database-patterns/SKILL.md), [`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`backend-event-driven`](../skills/backend/universal/event-driven/SKILL.md), [`quality-unit-testing`](../skills/quality/unit-testing/SKILL.md), [`quality-integration-testing`](../skills/quality/integration-testing/SKILL.md), [`backend-cqrs-patterns`](../skills/backend/universal/cqrs-patterns/SKILL.md), [`backend-event-sourcing`](../skills/backend/universal/event-sourcing/SKILL.md), [`backend-transactional-outbox`](../skills/backend/universal/transactional-outbox/SKILL.md), [`backend-grpc-patterns`](../skills/backend/universal/grpc-patterns/SKILL.md), [`backend-websocket-patterns`](../skills/backend/universal/websocket-patterns/SKILL.md), [`backend-message-queue`](../skills/backend/universal/message-queue/SKILL.md), [`backend-caching`](../skills/backend/universal/caching/SKILL.md), [`rate-limiting`](../skills/backend/universal/rate-limiting/SKILL.md), [`quality-load-testing`](../skills/quality/load-testing/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-security-auditor`](../skills/dev-loop/security-auditor/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@master-orchestrator",
    "j4flmao/agent-skills@project-init",
    "j4flmao/agent-skills@design-patterns",
    "j4flmao/agent-skills@microservices",
    "j4flmao/agent-skills@backend-clean-architecture",
    "j4flmao/agent-skills@backend-api-design",
    "j4flmao/agent-skills@backend-api-response",
    "j4flmao/agent-skills@backend-database-patterns",
    "j4flmao/agent-skills@backend-auth-patterns",
    "j4flmao/agent-skills@backend-event-driven",
    "j4flmao/agent-skills@quality-unit-testing",
    "j4flmao/agent-skills@quality-integration-testing",
    "j4flmao/agent-skills@backend-cqrs-patterns",
    "j4flmao/agent-skills@backend-event-sourcing",
    "j4flmao/agent-skills@backend-transactional-outbox",
    "j4flmao/agent-skills@backend-grpc-patterns",
    "j4flmao/agent-skills@backend-websocket-patterns",
    "j4flmao/agent-skills@backend-message-queue",
    "j4flmao/agent-skills@backend-caching",
    "j4flmao/agent-skills@rate-limiting",
    "j4flmao/agent-skills@quality-load-testing",
    "j4flmao/agent-skills@code-review",
    "j4flmao/agent-skills@dev-loop-debugging-strategy",
    "j4flmao/agent-skills@dev-loop-security-auditor",
    "j4flmao/agent-skills@dev-loop-git-workflow",
    "j4flmao/agent-skills@docker-patterns",
    "j4flmao/agent-skills@cicd-pipeline"
  ]
}
```

</details>

### blockchain-all

All blockchain skills: core, cryptography, Ethereum, Bitcoin, patterns, application, web3, testing, infrastructure, security, management, Solana, DeFi, cross-chain, ZK, data indexing — **20 skills**

```bash
npx skills add j4flmao/agent-skills --skill blockchain-core --skill blockchain-cryptography --skill blockchain-ethereum --skill blockchain-bitcoin --skill blockchain-patterns --skill blockchain-application --skill blockchain-web3 --skill blockchain-testing --skill blockchain-infrastructure --skill blockchain-security --skill blockchain-management --skill blockchain-solana --skill blockchain-defi --skill blockchain-cross-chain --skill blockchain-zk --skill blockchain-data-indexing --skill defi-protocols --skill smart-contract-security --skill zero-knowledge-proofs --skill defi-smart-contracts
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`blockchain-core`](../skills/blockchain/blockchain-core/SKILL.md), [`blockchain-cryptography`](../skills/blockchain/blockchain-cryptography/SKILL.md), [`blockchain-ethereum`](../skills/blockchain/blockchain-ethereum/SKILL.md), [`blockchain-bitcoin`](../skills/blockchain/blockchain-bitcoin/SKILL.md), [`blockchain-patterns`](../skills/blockchain/blockchain-patterns/SKILL.md), [`blockchain-application`](../skills/blockchain/blockchain-application/SKILL.md), [`blockchain-web3`](../skills/blockchain/blockchain-web3/SKILL.md), [`blockchain-testing`](../skills/blockchain/blockchain-testing/SKILL.md), [`blockchain-infrastructure`](../skills/blockchain/blockchain-infrastructure/SKILL.md), [`blockchain-security`](../skills/blockchain/blockchain-security/SKILL.md), [`blockchain-management`](../skills/blockchain/blockchain-management/SKILL.md), [`blockchain-solana`](../skills/blockchain/blockchain-solana/SKILL.md), [`blockchain-defi`](../skills/blockchain/blockchain-defi/SKILL.md), [`blockchain-cross-chain`](../skills/blockchain/blockchain-cross-chain/SKILL.md), [`blockchain-zk`](../skills/blockchain/blockchain-zk/SKILL.md), [`blockchain-data-indexing`](../skills/blockchain/blockchain-data-indexing/SKILL.md), [`defi-protocols`](../skills/blockchain/defi-protocols/SKILL.md), [`smart-contract-security`](../skills/blockchain/smart-contract-security/SKILL.md), [`zero-knowledge-proofs`](../skills/blockchain/zero-knowledge-proofs/SKILL.md), [`defi-smart-contracts`](../skills/niche/fintech-web3/defi-smart-contracts/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@blockchain-core",
    "j4flmao/agent-skills@blockchain-cryptography",
    "j4flmao/agent-skills@blockchain-ethereum",
    "j4flmao/agent-skills@blockchain-bitcoin",
    "j4flmao/agent-skills@blockchain-patterns",
    "j4flmao/agent-skills@blockchain-application",
    "j4flmao/agent-skills@blockchain-web3",
    "j4flmao/agent-skills@blockchain-testing",
    "j4flmao/agent-skills@blockchain-infrastructure",
    "j4flmao/agent-skills@blockchain-security",
    "j4flmao/agent-skills@blockchain-management",
    "j4flmao/agent-skills@blockchain-solana",
    "j4flmao/agent-skills@blockchain-defi",
    "j4flmao/agent-skills@blockchain-cross-chain",
    "j4flmao/agent-skills@blockchain-zk",
    "j4flmao/agent-skills@blockchain-data-indexing",
    "j4flmao/agent-skills@defi-protocols",
    "j4flmao/agent-skills@smart-contract-security",
    "j4flmao/agent-skills@zero-knowledge-proofs",
    "j4flmao/agent-skills@defi-smart-contracts"
  ]
}
```

</details>

### cloud-architecture

Cloud architecture: landing zone, well-architected framework, governance, multi-cloud — **15 skills**

```bash
npx skills add j4flmao/agent-skills --skill cloud-architecture --skill cloud-cost-optimization --skill aws --skill devops-azure --skill devops-gcp --skill terraform --skill helm-patterns --skill cloud-native-kubernetes-patterns --skill docker-patterns --skill cicd-pipeline --skill monitoring --skill alerting --skill security --skill enterprise-compliance-audit --skill enterprise-cost-governance
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`cloud-architecture`](../skills/devops/cloud-architecture/SKILL.md), [`cloud-cost-optimization`](../skills/devops/cloud-cost-optimization/SKILL.md), [`aws`](../skills/devops/aws/SKILL.md), [`devops-azure`](../skills/devops/azure/SKILL.md), [`devops-gcp`](../skills/devops/gcp/SKILL.md), [`terraform`](../skills/devops/terraform/SKILL.md), [`helm-patterns`](../skills/devops/helm-patterns/SKILL.md), [`cloud-native-kubernetes-patterns`](../skills/cloud-native/kubernetes-patterns/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md), [`enterprise-cost-governance`](../skills/enterprise/cost-governance/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@cloud-architecture",
    "j4flmao/agent-skills@cloud-cost-optimization",
    "j4flmao/agent-skills@aws",
    "j4flmao/agent-skills@devops-azure",
    "j4flmao/agent-skills@devops-gcp",
    "j4flmao/agent-skills@terraform",
    "j4flmao/agent-skills@helm-patterns",
    "j4flmao/agent-skills@cloud-native-kubernetes-patterns",
    "j4flmao/agent-skills@docker-patterns",
    "j4flmao/agent-skills@cicd-pipeline",
    "j4flmao/agent-skills@monitoring",
    "j4flmao/agent-skills@alerting",
    "j4flmao/agent-skills@security",
    "j4flmao/agent-skills@enterprise-compliance-audit",
    "j4flmao/agent-skills@enterprise-cost-governance"
  ]
}
```

</details>

### data-engineering

Data engineering: pipelines, orchestration, streaming/CDC, lakes and lakehouses, warehousing, modeling, quality, governance — **45 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill data-batch-processing --skill data-bi-tools --skill data-data-api --skill data-data-catalog --skill data-clean-room --skill data-data-contracts --skill data-cost-optimization --skill data-lake-architecture --skill data-kafka-event-streaming --skill data-formats --skill data-data-lake --skill data-data-lakehouse --skill data-lineage --skill data-data-mesh --skill data-modeling --skill data-data-observability --skill data-pipeline-cicd --skill data-data-platform --skill data-data-quality --skill data-data-strategy --skill data-testing --skill data-data-versioning --skill data-data-virtualization --skill data-data-warehouse --skill database-internals-mechanics --skill data-dimensional-modeling --skill data-distributed-compute --skill data-distributed-storage --skill data-etl-pipeline --skill data-airflow-dbt-orchestration --skill data-feature-store --skill data-graph-database --skill data-nosql-database --skill data-relational-database --skill data-reverse-etl --skill data-schema-registry --skill data-search-engine --skill data-streaming --skill data-vector-databases --skill architecture-postgresql-internals --skill architecture-database-scaling --skill devops-dataops --skill devops-kubernetes-for-data --skill enterprise-data-governance --skill data-engineer
```

</details>

<details><summary>Skills</summary>

[`data-batch-processing`](../skills/data/batch-processing/SKILL.md), [`data-bi-tools`](../skills/data/bi-tools/SKILL.md), [`data-data-api`](../skills/data/data-api/SKILL.md), [`data-data-catalog`](../skills/data/data-catalog/SKILL.md), [`data-clean-room`](../skills/data/data-clean-room/SKILL.md), [`data-data-contracts`](../skills/data/data-contracts/SKILL.md), [`data-cost-optimization`](../skills/data/data-cost-optimization/SKILL.md), [`data-lake-architecture`](../skills/data/data-engineering/data-lake-architecture/SKILL.md), [`data-kafka-event-streaming`](../skills/data/data-engineering/kafka-event-streaming/SKILL.md), [`data-formats`](../skills/data/data-formats/SKILL.md), [`data-data-lake`](../skills/data/data-lake/SKILL.md), [`data-data-lakehouse`](../skills/data/data-lakehouse/SKILL.md), [`data-lineage`](../skills/data/data-lineage/SKILL.md), [`data-data-mesh`](../skills/data/data-mesh/SKILL.md), [`data-modeling`](../skills/data/data-modeling/SKILL.md), [`data-data-observability`](../skills/data/data-observability/SKILL.md), [`data-pipeline-cicd`](../skills/data/data-pipeline-cicd/SKILL.md), [`data-data-platform`](../skills/data/data-platform/SKILL.md), [`data-data-quality`](../skills/data/data-quality/SKILL.md), [`data-data-strategy`](../skills/data/data-strategy/SKILL.md), [`data-testing`](../skills/data/data-testing/SKILL.md), [`data-data-versioning`](../skills/data/data-versioning/SKILL.md), [`data-data-virtualization`](../skills/data/data-virtualization/SKILL.md), [`data-data-warehouse`](../skills/data/data-warehouse/SKILL.md), [`database-internals-mechanics`](../skills/data/database-internals/SKILL.md), [`data-dimensional-modeling`](../skills/data/dimensional-modeling/SKILL.md), [`data-distributed-compute`](../skills/data/distributed-compute/SKILL.md), [`data-distributed-storage`](../skills/data/distributed-storage/SKILL.md), [`data-etl-pipeline`](../skills/data/etl-pipeline/SKILL.md), [`data-airflow-dbt-orchestration`](../skills/data/etl-pipelines/SKILL.md), [`data-feature-store`](../skills/data/feature-store/SKILL.md), [`data-graph-database`](../skills/data/graph-database/SKILL.md), [`data-nosql-database`](../skills/data/nosql-database/SKILL.md), [`data-relational-database`](../skills/data/relational-database/SKILL.md), [`data-reverse-etl`](../skills/data/reverse-etl/SKILL.md), [`data-schema-registry`](../skills/data/schema-registry/SKILL.md), [`data-search-engine`](../skills/data/search-engine/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`data-vector-databases`](../skills/data/vector-databases/SKILL.md), [`architecture-postgresql-internals`](../skills/architecture/databases/postgresql-internals/SKILL.md), [`architecture-database-scaling`](../skills/architecture/databases/scaling-and-sharding/SKILL.md), [`devops-dataops`](../skills/devops/dataops/SKILL.md), [`devops-kubernetes-for-data`](../skills/devops/kubernetes-for-data/SKILL.md), [`enterprise-data-governance`](../skills/enterprise/data-governance/SKILL.md), [`data-engineer`](../skills/personas/data-engineer/SKILL.md)

</details>

### data-platform

Data platform: ETL, warehouse, streaming, BI, quality, storage, compute, lake, lakehouse, batch, orchestration, CDC, replication, catalog, observability, contracts, mesh, versioning, API, virtualization, schema registry, relational, NoSQL, graph, search, clean-room, cost-optimization, formats, lineage, pipeline-CI/CD, testing, reverse-ETL — **39 skills**

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill data-etl-pipeline --skill data-data-warehouse --skill data-streaming --skill data-bi-tools --skill data-data-quality --skill data-distributed-storage --skill data-distributed-compute --skill data-data-lake --skill data-data-lakehouse --skill data-batch-processing --skill data-data-platform --skill data-data-catalog --skill data-data-observability --skill data-data-contracts --skill data-data-mesh --skill data-data-versioning --skill data-data-api --skill data-data-virtualization --skill data-schema-registry --skill data-relational-database --skill data-nosql-database --skill data-graph-database --skill data-search-engine --skill data-clean-room --skill data-cost-optimization --skill data-formats --skill data-lineage --skill data-pipeline-cicd --skill data-testing --skill data-reverse-etl --skill docker-patterns --skill cicd-pipeline --skill terraform --skill monitoring --skill alerting --skill security --skill core-onboarding --skill core-context-compressor
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`data-etl-pipeline`](../skills/data/etl-pipeline/SKILL.md), [`data-data-warehouse`](../skills/data/data-warehouse/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`data-bi-tools`](../skills/data/bi-tools/SKILL.md), [`data-data-quality`](../skills/data/data-quality/SKILL.md), [`data-distributed-storage`](../skills/data/distributed-storage/SKILL.md), [`data-distributed-compute`](../skills/data/distributed-compute/SKILL.md), [`data-data-lake`](../skills/data/data-lake/SKILL.md), [`data-data-lakehouse`](../skills/data/data-lakehouse/SKILL.md), [`data-batch-processing`](../skills/data/batch-processing/SKILL.md), [`data-data-platform`](../skills/data/data-platform/SKILL.md), [`data-data-catalog`](../skills/data/data-catalog/SKILL.md), [`data-data-observability`](../skills/data/data-observability/SKILL.md), [`data-data-contracts`](../skills/data/data-contracts/SKILL.md), [`data-data-mesh`](../skills/data/data-mesh/SKILL.md), [`data-data-versioning`](../skills/data/data-versioning/SKILL.md), [`data-data-api`](../skills/data/data-api/SKILL.md), [`data-data-virtualization`](../skills/data/data-virtualization/SKILL.md), [`data-schema-registry`](../skills/data/schema-registry/SKILL.md), [`data-relational-database`](../skills/data/relational-database/SKILL.md), [`data-nosql-database`](../skills/data/nosql-database/SKILL.md), [`data-graph-database`](../skills/data/graph-database/SKILL.md), [`data-search-engine`](../skills/data/search-engine/SKILL.md), [`data-clean-room`](../skills/data/data-clean-room/SKILL.md), [`data-cost-optimization`](../skills/data/data-cost-optimization/SKILL.md), [`data-formats`](../skills/data/data-formats/SKILL.md), [`data-lineage`](../skills/data/data-lineage/SKILL.md), [`data-pipeline-cicd`](../skills/data/data-pipeline-cicd/SKILL.md), [`data-testing`](../skills/data/data-testing/SKILL.md), [`data-reverse-etl`](../skills/data/reverse-etl/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`terraform`](../skills/devops/terraform/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@master-orchestrator",
    "j4flmao/agent-skills@data-etl-pipeline",
    "j4flmao/agent-skills@data-data-warehouse",
    "j4flmao/agent-skills@data-streaming",
    "j4flmao/agent-skills@data-bi-tools",
    "j4flmao/agent-skills@data-data-quality",
    "j4flmao/agent-skills@data-distributed-storage",
    "j4flmao/agent-skills@data-distributed-compute",
    "j4flmao/agent-skills@data-data-lake",
    "j4flmao/agent-skills@data-data-lakehouse",
    "j4flmao/agent-skills@data-batch-processing",
    "j4flmao/agent-skills@data-data-platform",
    "j4flmao/agent-skills@data-data-catalog",
    "j4flmao/agent-skills@data-data-observability",
    "j4flmao/agent-skills@data-data-contracts",
    "j4flmao/agent-skills@data-data-mesh",
    "j4flmao/agent-skills@data-data-versioning",
    "j4flmao/agent-skills@data-data-api",
    "j4flmao/agent-skills@data-data-virtualization",
    "j4flmao/agent-skills@data-schema-registry",
    "j4flmao/agent-skills@data-relational-database",
    "j4flmao/agent-skills@data-nosql-database",
    "j4flmao/agent-skills@data-graph-database",
    "j4flmao/agent-skills@data-search-engine",
    "j4flmao/agent-skills@data-clean-room",
    "j4flmao/agent-skills@data-cost-optimization",
    "j4flmao/agent-skills@data-formats",
    "j4flmao/agent-skills@data-lineage",
    "j4flmao/agent-skills@data-pipeline-cicd",
    "j4flmao/agent-skills@data-testing",
    "j4flmao/agent-skills@data-reverse-etl",
    "j4flmao/agent-skills@docker-patterns",
    "j4flmao/agent-skills@cicd-pipeline",
    "j4flmao/agent-skills@terraform",
    "j4flmao/agent-skills@monitoring",
    "j4flmao/agent-skills@alerting",
    "j4flmao/agent-skills@security",
    "j4flmao/agent-skills@core-onboarding",
    "j4flmao/agent-skills@core-context-compressor"
  ]
}
```

</details>

### design-ux

Design and UX: visual design, design systems, accessibility, motion, IA, brand, UX research, theming, visual testing — **14 skills**

```bash
npx skills add j4flmao/agent-skills --skill design-accessibility --skill design-brand-identity --skill design-systems --skill design-information-architecture --skill design-motion-design --skill design-ux-research --skill design-visual-design --skill frontend-design-system --skill frontend-accessibility --skill frontend-theming --skill frontend-animation --skill quality-visual-testing --skill product-user-research --skill product-persona-development
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`design-accessibility`](../skills/design/accessibility/SKILL.md), [`design-brand-identity`](../skills/design/brand-identity/SKILL.md), [`design-systems`](../skills/design/design-systems/SKILL.md), [`design-information-architecture`](../skills/design/information-architecture/SKILL.md), [`design-motion-design`](../skills/design/motion-design/SKILL.md), [`design-ux-research`](../skills/design/ux-research/SKILL.md), [`design-visual-design`](../skills/design/visual-design/SKILL.md), [`frontend-design-system`](../skills/frontend/universal/design-system/SKILL.md), [`frontend-accessibility`](../skills/frontend/universal/accessibility/SKILL.md), [`frontend-theming`](../skills/frontend/universal/theming/SKILL.md), [`frontend-animation`](../skills/frontend/universal/animation/SKILL.md), [`quality-visual-testing`](../skills/quality/visual-testing/SKILL.md), [`product-user-research`](../skills/product/user-research/SKILL.md), [`product-persona-development`](../skills/product/persona-development/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@design-accessibility",
    "j4flmao/agent-skills@design-brand-identity",
    "j4flmao/agent-skills@design-systems",
    "j4flmao/agent-skills@design-information-architecture",
    "j4flmao/agent-skills@design-motion-design",
    "j4flmao/agent-skills@design-ux-research",
    "j4flmao/agent-skills@design-visual-design",
    "j4flmao/agent-skills@frontend-design-system",
    "j4flmao/agent-skills@frontend-accessibility",
    "j4flmao/agent-skills@frontend-theming",
    "j4flmao/agent-skills@frontend-animation",
    "j4flmao/agent-skills@quality-visual-testing",
    "j4flmao/agent-skills@product-user-research",
    "j4flmao/agent-skills@product-persona-development"
  ]
}
```

</details>

### desktop-all

Desktop: Electron, Tauri, Qt, Gtk, WPF, WinUI, UWP, WinForms, SwiftUI, AppKit, GNOME, KDE — **30 skills**

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-brief --skill create-prd --skill create-tech-spec --skill create-story --skill desktop-electron --skill desktop-tauri --skill desktop-qt --skill desktop-gtk --skill desktop-wpf --skill desktop-uwp --skill desktop-winforms --skill desktop-swiftui --skill desktop-appkit --skill desktop-gnome --skill design-patterns --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-git-workflow --skill docker-patterns --skill cicd-pipeline --skill github-actions --skill monitoring --skill alerting --skill team-rules --skill security --skill pentesting --skill core-onboarding --skill core-context-compressor
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`create-story`](../skills/planning/create-story/SKILL.md), [`desktop-electron`](../skills/desktop/electron/SKILL.md), [`desktop-tauri`](../skills/desktop/tauri/SKILL.md), [`desktop-qt`](../skills/desktop/qt/SKILL.md), [`desktop-gtk`](../skills/desktop/gtk/SKILL.md), [`desktop-wpf`](../skills/desktop/wpf/SKILL.md), [`desktop-uwp`](../skills/desktop/uwp/SKILL.md), [`desktop-winforms`](../skills/desktop/winforms/SKILL.md), [`desktop-swiftui`](../skills/desktop/swiftui/SKILL.md), [`desktop-appkit`](../skills/desktop/appkit/SKILL.md), [`desktop-gnome`](../skills/desktop/gnome/SKILL.md), [`design-patterns`](../skills/backend/universal/design-patterns/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`github-actions`](../skills/devops/github-actions/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@master-orchestrator",
    "j4flmao/agent-skills@project-init",
    "j4flmao/agent-skills@create-brief",
    "j4flmao/agent-skills@create-prd",
    "j4flmao/agent-skills@create-tech-spec",
    "j4flmao/agent-skills@create-story",
    "j4flmao/agent-skills@desktop-electron",
    "j4flmao/agent-skills@desktop-tauri",
    "j4flmao/agent-skills@desktop-qt",
    "j4flmao/agent-skills@desktop-gtk",
    "j4flmao/agent-skills@desktop-wpf",
    "j4flmao/agent-skills@desktop-uwp",
    "j4flmao/agent-skills@desktop-winforms",
    "j4flmao/agent-skills@desktop-swiftui",
    "j4flmao/agent-skills@desktop-appkit",
    "j4flmao/agent-skills@desktop-gnome",
    "j4flmao/agent-skills@design-patterns",
    "j4flmao/agent-skills@code-review",
    "j4flmao/agent-skills@dev-loop-debugging-strategy",
    "j4flmao/agent-skills@dev-loop-git-workflow",
    "j4flmao/agent-skills@docker-patterns",
    "j4flmao/agent-skills@cicd-pipeline",
    "j4flmao/agent-skills@github-actions",
    "j4flmao/agent-skills@monitoring",
    "j4flmao/agent-skills@alerting",
    "j4flmao/agent-skills@team-rules",
    "j4flmao/agent-skills@security",
    "j4flmao/agent-skills@pentesting",
    "j4flmao/agent-skills@core-onboarding",
    "j4flmao/agent-skills@core-context-compressor"
  ]
}
```

</details>

### dev-workflow

Developer workflow: code review, debugging, refactoring, git, PRs, changelogs, dev containers, CI, monorepos, dependencies — **23 skills**

```bash
npx skills add j4flmao/agent-skills --skill dev-loop-api-client-generator --skill dev-loop-changelog-generator --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-dev-container --skill dev-loop-git-workflow --skill dev-loop-performance-profiler --skill dev-loop-pr-writer --skill dev-loop-readme-writer --skill dev-loop-refactor-guide --skill dev-loop-security-auditor --skill dev-loop-tech-debt-tracker --skill advanced-workflows --skill conflict-resolution --skill husky-and-hooks --skill github-actions --skill github-actions-pipelines --skill monorepo --skill dependency-management --skill core-context-compressor --skill master-orchestrator --skill core-onboarding --skill project-init
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`dev-loop-api-client-generator`](../skills/dev-loop/api-client-generator/SKILL.md), [`dev-loop-changelog-generator`](../skills/dev-loop/changelog-generator/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-dev-container`](../skills/dev-loop/dev-container/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`dev-loop-performance-profiler`](../skills/dev-loop/performance-profiler/SKILL.md), [`dev-loop-pr-writer`](../skills/dev-loop/pr-writer/SKILL.md), [`dev-loop-readme-writer`](../skills/dev-loop/readme-writer/SKILL.md), [`dev-loop-refactor-guide`](../skills/dev-loop/refactor-guide/SKILL.md), [`dev-loop-security-auditor`](../skills/dev-loop/security-auditor/SKILL.md), [`dev-loop-tech-debt-tracker`](../skills/dev-loop/tech-debt-tracker/SKILL.md), [`advanced-workflows`](../skills/tools/git/advanced-workflows/SKILL.md), [`conflict-resolution`](../skills/tools/git/conflict-resolution/SKILL.md), [`husky-and-hooks`](../skills/tools/git/husky-and-hooks/SKILL.md), [`github-actions`](../skills/devops/github-actions/SKILL.md), [`github-actions-pipelines`](../skills/devops/ci-cd/github-actions-pipelines/SKILL.md), [`monorepo`](../skills/devops/monorepo/SKILL.md), [`dependency-management`](../skills/devops/dependency-management/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md), [`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@dev-loop-api-client-generator",
    "j4flmao/agent-skills@dev-loop-changelog-generator",
    "j4flmao/agent-skills@code-review",
    "j4flmao/agent-skills@dev-loop-debugging-strategy",
    "j4flmao/agent-skills@dev-loop-dev-container",
    "j4flmao/agent-skills@dev-loop-git-workflow",
    "j4flmao/agent-skills@dev-loop-performance-profiler",
    "j4flmao/agent-skills@dev-loop-pr-writer",
    "j4flmao/agent-skills@dev-loop-readme-writer",
    "j4flmao/agent-skills@dev-loop-refactor-guide",
    "j4flmao/agent-skills@dev-loop-security-auditor",
    "j4flmao/agent-skills@dev-loop-tech-debt-tracker",
    "j4flmao/agent-skills@advanced-workflows",
    "j4flmao/agent-skills@conflict-resolution",
    "j4flmao/agent-skills@husky-and-hooks",
    "j4flmao/agent-skills@github-actions",
    "j4flmao/agent-skills@github-actions-pipelines",
    "j4flmao/agent-skills@monorepo",
    "j4flmao/agent-skills@dependency-management",
    "j4flmao/agent-skills@core-context-compressor",
    "j4flmao/agent-skills@master-orchestrator",
    "j4flmao/agent-skills@core-onboarding",
    "j4flmao/agent-skills@project-init"
  ]
}
```

</details>

### ecommerce-all

E-commerce: payment processing, checkout and cart, order management — **13 skills**

```bash
npx skills add j4flmao/agent-skills --skill ecommerce-payment-processing --skill ecommerce-checkout-cart --skill backend-api-design --skill backend-auth-patterns --skill backend-database-patterns --skill quality-unit-testing --skill quality-integration-testing --skill docker-patterns --skill cicd-pipeline --skill monitoring --skill alerting --skill security --skill enterprise-compliance-audit
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`ecommerce-payment-processing`](../skills/ecommerce/payment-processing/SKILL.md), [`ecommerce-checkout-cart`](../skills/ecommerce/checkout-cart/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`backend-database-patterns`](../skills/backend/universal/database-patterns/SKILL.md), [`quality-unit-testing`](../skills/quality/unit-testing/SKILL.md), [`quality-integration-testing`](../skills/quality/integration-testing/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@ecommerce-payment-processing",
    "j4flmao/agent-skills@ecommerce-checkout-cart",
    "j4flmao/agent-skills@backend-api-design",
    "j4flmao/agent-skills@backend-auth-patterns",
    "j4flmao/agent-skills@backend-database-patterns",
    "j4flmao/agent-skills@quality-unit-testing",
    "j4flmao/agent-skills@quality-integration-testing",
    "j4flmao/agent-skills@docker-patterns",
    "j4flmao/agent-skills@cicd-pipeline",
    "j4flmao/agent-skills@monitoring",
    "j4flmao/agent-skills@alerting",
    "j4flmao/agent-skills@security",
    "j4flmao/agent-skills@enterprise-compliance-audit"
  ]
}
```

</details>

### embedded-iot

Embedded and IoT: RTOS, bare-metal Rust, C/C++ patterns, IoT protocols, edge AI — **9 skills**

```bash
npx skills add j4flmao/agent-skills --skill bare-metal-rust --skill c-cpp-patterns --skill edge-ai --skill iot-protocols --skill rtos --skill rtos-fundamentals --skill lang-c --skill lang-rust --skill cpu-architecture
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`bare-metal-rust`](../skills/embedded-systems/bare-metal-rust/SKILL.md), [`c-cpp-patterns`](../skills/embedded-systems/c-cpp-patterns/SKILL.md), [`edge-ai`](../skills/embedded-systems/edge-ai/SKILL.md), [`iot-protocols`](../skills/embedded-systems/iot-protocols/SKILL.md), [`rtos`](../skills/embedded-systems/rtos/SKILL.md), [`rtos-fundamentals`](../skills/embedded-systems/rtos-fundamentals/SKILL.md), [`lang-c`](../skills/languages/c/SKILL.md), [`lang-rust`](../skills/languages/rust/SKILL.md), [`cpu-architecture`](../skills/low-level/cpu-architecture/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@bare-metal-rust",
    "j4flmao/agent-skills@c-cpp-patterns",
    "j4flmao/agent-skills@edge-ai",
    "j4flmao/agent-skills@iot-protocols",
    "j4flmao/agent-skills@rtos",
    "j4flmao/agent-skills@rtos-fundamentals",
    "j4flmao/agent-skills@lang-c",
    "j4flmao/agent-skills@lang-rust",
    "j4flmao/agent-skills@cpu-architecture"
  ]
}
```

</details>

### enterprise

Enterprise: governance, compliance, identity, multi-tenancy, legacy migration, ITIL, vendors, FinOps, release engineering — **18 skills**

```bash
npx skills add j4flmao/agent-skills --skill enterprise-architecture-governance --skill enterprise-business-continuity --skill enterprise-capacity-planning --skill enterprise-compliance-audit --skill enterprise-cost-governance --skill enterprise-data-governance --skill enterprise-finops-cloud-cost --skill enterprise-high-availability --skill enterprise-identity-provider --skill enterprise-integration-patterns --skill enterprise-itil-service-mgmt --skill enterprise-legacy-migration --skill enterprise-multi-tenant --skill enterprise-rd-poc-management --skill enterprise-release-engineering --skill enterprise-sla-management --skill enterprise-togaf-zachman --skill enterprise-vendor-management
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`enterprise-architecture-governance`](../skills/enterprise/architecture-governance/SKILL.md), [`enterprise-business-continuity`](../skills/enterprise/business-continuity/SKILL.md), [`enterprise-capacity-planning`](../skills/enterprise/capacity-planning/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md), [`enterprise-cost-governance`](../skills/enterprise/cost-governance/SKILL.md), [`enterprise-data-governance`](../skills/enterprise/data-governance/SKILL.md), [`enterprise-finops-cloud-cost`](../skills/enterprise/finops-cloud-cost/SKILL.md), [`enterprise-high-availability`](../skills/enterprise/high-availability/SKILL.md), [`enterprise-identity-provider`](../skills/enterprise/identity-provider/SKILL.md), [`enterprise-integration-patterns`](../skills/enterprise/integration-patterns/SKILL.md), [`enterprise-itil-service-mgmt`](../skills/enterprise/itil-service-mgmt/SKILL.md), [`enterprise-legacy-migration`](../skills/enterprise/legacy-migration/SKILL.md), [`enterprise-multi-tenant`](../skills/enterprise/multi-tenant/SKILL.md), [`enterprise-rd-poc-management`](../skills/enterprise/rd-poc-management/SKILL.md), [`enterprise-release-engineering`](../skills/enterprise/release-engineering/SKILL.md), [`enterprise-sla-management`](../skills/enterprise/sla-management/SKILL.md), [`enterprise-togaf-zachman`](../skills/enterprise/togaf-zachman/SKILL.md), [`enterprise-vendor-management`](../skills/enterprise/vendor-management/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@enterprise-architecture-governance",
    "j4flmao/agent-skills@enterprise-business-continuity",
    "j4flmao/agent-skills@enterprise-capacity-planning",
    "j4flmao/agent-skills@enterprise-compliance-audit",
    "j4flmao/agent-skills@enterprise-cost-governance",
    "j4flmao/agent-skills@enterprise-data-governance",
    "j4flmao/agent-skills@enterprise-finops-cloud-cost",
    "j4flmao/agent-skills@enterprise-high-availability",
    "j4flmao/agent-skills@enterprise-identity-provider",
    "j4flmao/agent-skills@enterprise-integration-patterns",
    "j4flmao/agent-skills@enterprise-itil-service-mgmt",
    "j4flmao/agent-skills@enterprise-legacy-migration",
    "j4flmao/agent-skills@enterprise-multi-tenant",
    "j4flmao/agent-skills@enterprise-rd-poc-management",
    "j4flmao/agent-skills@enterprise-release-engineering",
    "j4flmao/agent-skills@enterprise-sla-management",
    "j4flmao/agent-skills@enterprise-togaf-zachman",
    "j4flmao/agent-skills@enterprise-vendor-management"
  ]
}
```

</details>

### fintech-payments

Fintech and payments: ledgers, payment processing, checkout, idempotency, audit trails, data masking, compliance — **13 skills**

```bash
npx skills add j4flmao/agent-skills --skill defi-smart-contracts --skill double-entry-ledger --skill ecommerce-checkout-cart --skill checkout-optimization --skill headless-ecommerce --skill ecommerce-payment-processing --skill stripe-payments --skill backend-idempotency --skill backend-audit-logging --skill backend-data-masking --skill backend-transactional-outbox --skill security-data-security --skill enterprise-compliance-audit
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`defi-smart-contracts`](../skills/niche/fintech-web3/defi-smart-contracts/SKILL.md), [`double-entry-ledger`](../skills/niche/fintech-web3/double-entry-ledger/SKILL.md), [`ecommerce-checkout-cart`](../skills/ecommerce/checkout-cart/SKILL.md), [`checkout-optimization`](../skills/ecommerce/checkout-optimization/SKILL.md), [`headless-ecommerce`](../skills/ecommerce/headless/SKILL.md), [`ecommerce-payment-processing`](../skills/ecommerce/payment-processing/SKILL.md), [`stripe-payments`](../skills/ecommerce/payments/SKILL.md), [`backend-idempotency`](../skills/backend/universal/idempotency/SKILL.md), [`backend-audit-logging`](../skills/backend/universal/audit-logging/SKILL.md), [`backend-data-masking`](../skills/backend/universal/data-masking/SKILL.md), [`backend-transactional-outbox`](../skills/backend/universal/transactional-outbox/SKILL.md), [`security-data-security`](../skills/security/data-security/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@defi-smart-contracts",
    "j4flmao/agent-skills@double-entry-ledger",
    "j4flmao/agent-skills@ecommerce-checkout-cart",
    "j4flmao/agent-skills@checkout-optimization",
    "j4flmao/agent-skills@headless-ecommerce",
    "j4flmao/agent-skills@ecommerce-payment-processing",
    "j4flmao/agent-skills@stripe-payments",
    "j4flmao/agent-skills@backend-idempotency",
    "j4flmao/agent-skills@backend-audit-logging",
    "j4flmao/agent-skills@backend-data-masking",
    "j4flmao/agent-skills@backend-transactional-outbox",
    "j4flmao/agent-skills@security-data-security",
    "j4flmao/agent-skills@enterprise-compliance-audit"
  ]
}
```

</details>

### frontend-foundations

Frontend foundations for any framework: TypeScript, CSS strategy, responsive design, auth, error handling, security, forms, data fetching, state — **28 skills**

```bash
npx skills add j4flmao/agent-skills --skill frontend-accessibility --skill frontend-animation --skill frontend-authentication --skill frontend-browser-caching --skill frontend-bundler-tools --skill frontend-css-strategy --skill frontend-data-fetching --skill frontend-design-system --skill frontend-error-handling --skill frontend-feature-flags --skill frontend-form-handling --skill frontend-image-optimization --skill frontend-internationalization --skill microfrontend --skill frontend-patterns --skill frontend-performance --skill frontend-pwa --skill frontend-rendering-strategies --skill frontend-responsive-design --skill frontend-security --skill frontend-seo --skill frontend-state-management --skill frontend-storybook --skill frontend-tailwind-css --skill frontend-testing --skill frontend-theming --skill frontend-typescript-patterns --skill frontend-web-components
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`frontend-accessibility`](../skills/frontend/universal/accessibility/SKILL.md), [`frontend-animation`](../skills/frontend/universal/animation/SKILL.md), [`frontend-authentication`](../skills/frontend/universal/authentication/SKILL.md), [`frontend-browser-caching`](../skills/frontend/universal/browser-caching/SKILL.md), [`frontend-bundler-tools`](../skills/frontend/universal/bundler-tools/SKILL.md), [`frontend-css-strategy`](../skills/frontend/universal/css-strategy/SKILL.md), [`frontend-data-fetching`](../skills/frontend/universal/data-fetching/SKILL.md), [`frontend-design-system`](../skills/frontend/universal/design-system/SKILL.md), [`frontend-error-handling`](../skills/frontend/universal/error-handling/SKILL.md), [`frontend-feature-flags`](../skills/frontend/universal/feature-flags/SKILL.md), [`frontend-form-handling`](../skills/frontend/universal/form-handling/SKILL.md), [`frontend-image-optimization`](../skills/frontend/universal/image-optimization/SKILL.md), [`frontend-internationalization`](../skills/frontend/universal/internationalization/SKILL.md), [`microfrontend`](../skills/frontend/universal/microfrontend/SKILL.md), [`frontend-patterns`](../skills/frontend/universal/patterns/SKILL.md), [`frontend-performance`](../skills/frontend/universal/performance/SKILL.md), [`frontend-pwa`](../skills/frontend/universal/pwa/SKILL.md), [`frontend-rendering-strategies`](../skills/frontend/universal/rendering-strategies/SKILL.md), [`frontend-responsive-design`](../skills/frontend/universal/responsive-design/SKILL.md), [`frontend-security`](../skills/frontend/universal/security/SKILL.md), [`frontend-seo`](../skills/frontend/universal/seo/SKILL.md), [`frontend-state-management`](../skills/frontend/universal/state-management/SKILL.md), [`frontend-storybook`](../skills/frontend/universal/storybook/SKILL.md), [`frontend-tailwind-css`](../skills/frontend/universal/tailwind-css/SKILL.md), [`frontend-testing`](../skills/frontend/universal/testing/SKILL.md), [`frontend-theming`](../skills/frontend/universal/theming/SKILL.md), [`frontend-typescript-patterns`](../skills/frontend/universal/typescript-patterns/SKILL.md), [`frontend-web-components`](../skills/frontend/universal/web-components/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@frontend-accessibility",
    "j4flmao/agent-skills@frontend-animation",
    "j4flmao/agent-skills@frontend-authentication",
    "j4flmao/agent-skills@frontend-browser-caching",
    "j4flmao/agent-skills@frontend-bundler-tools",
    "j4flmao/agent-skills@frontend-css-strategy",
    "j4flmao/agent-skills@frontend-data-fetching",
    "j4flmao/agent-skills@frontend-design-system",
    "j4flmao/agent-skills@frontend-error-handling",
    "j4flmao/agent-skills@frontend-feature-flags",
    "j4flmao/agent-skills@frontend-form-handling",
    "j4flmao/agent-skills@frontend-image-optimization",
    "j4flmao/agent-skills@frontend-internationalization",
    "j4flmao/agent-skills@microfrontend",
    "j4flmao/agent-skills@frontend-patterns",
    "j4flmao/agent-skills@frontend-performance",
    "j4flmao/agent-skills@frontend-pwa",
    "j4flmao/agent-skills@frontend-rendering-strategies",
    "j4flmao/agent-skills@frontend-responsive-design",
    "j4flmao/agent-skills@frontend-security",
    "j4flmao/agent-skills@frontend-seo",
    "j4flmao/agent-skills@frontend-state-management",
    "j4flmao/agent-skills@frontend-storybook",
    "j4flmao/agent-skills@frontend-tailwind-css",
    "j4flmao/agent-skills@frontend-testing",
    "j4flmao/agent-skills@frontend-theming",
    "j4flmao/agent-skills@frontend-typescript-patterns",
    "j4flmao/agent-skills@frontend-web-components"
  ]
}
```

</details>

### frontend-frameworks

Frontend frameworks beyond React/Vue/Angular: Svelte, Solid, Qwik, Astro, Remix, Preact, Lit, Stencil, Ember, htmx, Alpine — **24 skills**

```bash
npx skills add j4flmao/agent-skills --skill frontend-svelte-architecture --skill frontend-svelte-patterns --skill sveltekit --skill frontend-solidjs-architecture --skill frontend-solidjs-patterns --skill frontend-qwik-architecture --skill frontend-qwik-patterns --skill frontend-astro-architecture --skill frontend-astro-patterns --skill frontend-remix-architecture --skill frontend-remix-patterns --skill preact --skill frontend-lit --skill stencil --skill ember --skill htmx --skill alpinejs --skill module-federation-runtime-sharing --skill webgpu-webgl-rendering --skill micro-frontends-adoption --skill react-server-components --skill react-zustand-redux-toolkit --skill frontend-playwright-testing --skill react-fiber-architecture
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`frontend-svelte-architecture`](../skills/frontend/svelte/architecture/SKILL.md), [`frontend-svelte-patterns`](../skills/frontend/svelte/patterns/SKILL.md), [`sveltekit`](../skills/frontend/svelte/sveltekit/SKILL.md), [`frontend-solidjs-architecture`](../skills/frontend/solidjs/architecture/SKILL.md), [`frontend-solidjs-patterns`](../skills/frontend/solidjs/patterns/SKILL.md), [`frontend-qwik-architecture`](../skills/frontend/qwik/architecture/SKILL.md), [`frontend-qwik-patterns`](../skills/frontend/qwik/patterns/SKILL.md), [`frontend-astro-architecture`](../skills/frontend/astro/architecture/SKILL.md), [`frontend-astro-patterns`](../skills/frontend/astro/patterns/SKILL.md), [`frontend-remix-architecture`](../skills/frontend/remix/architecture/SKILL.md), [`frontend-remix-patterns`](../skills/frontend/remix/patterns/SKILL.md), [`preact`](../skills/frontend/preact/SKILL.md), [`frontend-lit`](../skills/frontend/lit/SKILL.md), [`stencil`](../skills/frontend/stencil/SKILL.md), [`ember`](../skills/frontend/ember/SKILL.md), [`htmx`](../skills/frontend/htmx/SKILL.md), [`alpinejs`](../skills/frontend/alpinejs/SKILL.md), [`module-federation-runtime-sharing`](../skills/frontend/architecture/micro-frontends/SKILL.md), [`webgpu-webgl-rendering`](../skills/frontend/architecture/webgpu-webgl/SKILL.md), [`micro-frontends-adoption`](../skills/frontend/advanced-architecture/micro-frontends/SKILL.md), [`react-server-components`](../skills/frontend/advanced-architecture/react-server-components/SKILL.md), [`react-zustand-redux-toolkit`](../skills/frontend/state-management/SKILL.md), [`frontend-playwright-testing`](../skills/frontend/e2e-testing/SKILL.md), [`react-fiber-architecture`](../skills/frontend/react/react-fiber/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@frontend-svelte-architecture",
    "j4flmao/agent-skills@frontend-svelte-patterns",
    "j4flmao/agent-skills@sveltekit",
    "j4flmao/agent-skills@frontend-solidjs-architecture",
    "j4flmao/agent-skills@frontend-solidjs-patterns",
    "j4flmao/agent-skills@frontend-qwik-architecture",
    "j4flmao/agent-skills@frontend-qwik-patterns",
    "j4flmao/agent-skills@frontend-astro-architecture",
    "j4flmao/agent-skills@frontend-astro-patterns",
    "j4flmao/agent-skills@frontend-remix-architecture",
    "j4flmao/agent-skills@frontend-remix-patterns",
    "j4flmao/agent-skills@preact",
    "j4flmao/agent-skills@frontend-lit",
    "j4flmao/agent-skills@stencil",
    "j4flmao/agent-skills@ember",
    "j4flmao/agent-skills@htmx",
    "j4flmao/agent-skills@alpinejs",
    "j4flmao/agent-skills@module-federation-runtime-sharing",
    "j4flmao/agent-skills@webgpu-webgl-rendering",
    "j4flmao/agent-skills@micro-frontends-adoption",
    "j4flmao/agent-skills@react-server-components",
    "j4flmao/agent-skills@react-zustand-redux-toolkit",
    "j4flmao/agent-skills@frontend-playwright-testing",
    "j4flmao/agent-skills@react-fiber-architecture"
  ]
}
```

</details>

### game-development

Game development: engines, ECS, rendering, physics, animation, audio, input, streaming, netcode, game servers — **32 skills**

```bash
npx skills add j4flmao/agent-skills --skill animation-systems --skill audio-engine --skill input-systems --skill level-streaming --skill cocos2d --skill ecs-architecture --skill cocos2d-patterns --skill godot-gdscript --skill physics-engine --skill unity-csharp --skill vulkan --skill asset-pipeline --skill ecs-pattern --skill job-system --skill math-foundation --skill memory-management --skill game-engine-multiplayer-netcode --skill game-engine-patterns --skill platform-abstraction --skill render-graph --skill anti-cheat-server --skill authoritative-server --skill interest-management --skill matchmaking-lobby --skill scaling-architecture --skill godot --skill multiplayer-netcode --skill unity --skill unreal --skill lead-tech-game-engine --skill raytracing-mathematics --skill webgpu-compute-shaders
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`animation-systems`](../skills/game/client-engine/animation-systems/SKILL.md), [`audio-engine`](../skills/game/client-engine/audio-engine/SKILL.md), [`input-systems`](../skills/game/client-engine/input-systems/SKILL.md), [`level-streaming`](../skills/game/client-engine/level-streaming/SKILL.md), [`cocos2d`](../skills/game/cocos2d/SKILL.md), [`ecs-architecture`](../skills/game/ecs-architecture/SKILL.md), [`cocos2d-patterns`](../skills/game/game-development/cocos2d-patterns/SKILL.md), [`godot-gdscript`](../skills/game/game-development/godot-gdscript/SKILL.md), [`physics-engine`](../skills/game/game-development/physics-engine/SKILL.md), [`unity-csharp`](../skills/game/game-development/unity-csharp/SKILL.md), [`vulkan`](../skills/game/game-development/vulkan/SKILL.md), [`asset-pipeline`](../skills/game/game-engine/asset-pipeline/SKILL.md), [`ecs-pattern`](../skills/game/game-engine/ecs-pattern/SKILL.md), [`job-system`](../skills/game/game-engine/job-system/SKILL.md), [`math-foundation`](../skills/game/game-engine/math-foundation/SKILL.md), [`memory-management`](../skills/game/game-engine/memory-management/SKILL.md), [`game-engine-multiplayer-netcode`](../skills/game/game-engine/multiplayer-netcode/SKILL.md), [`game-engine-patterns`](../skills/game/game-engine/patterns/SKILL.md), [`platform-abstraction`](../skills/game/game-engine/platform-abstraction/SKILL.md), [`render-graph`](../skills/game/game-engine/render-graph/SKILL.md), [`anti-cheat-server`](../skills/game/game-server/anti-cheat-server/SKILL.md), [`authoritative-server`](../skills/game/game-server/authoritative-server/SKILL.md), [`interest-management`](../skills/game/game-server/interest-management/SKILL.md), [`matchmaking-lobby`](../skills/game/game-server/matchmaking-lobby/SKILL.md), [`scaling-architecture`](../skills/game/game-server/scaling-architecture/SKILL.md), [`godot`](../skills/game/godot/SKILL.md), [`multiplayer-netcode`](../skills/game/multiplayer-netcode/SKILL.md), [`unity`](../skills/game/unity/SKILL.md), [`unreal`](../skills/game/unreal/SKILL.md), [`lead-tech-game-engine`](../skills/personas/lead-tech-game-engine/SKILL.md), [`raytracing-mathematics`](../skills/niche/graphics-math/raytracing-mathematics/SKILL.md), [`webgpu-compute-shaders`](../skills/niche/graphics-math/webgpu-compute-shaders/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@animation-systems",
    "j4flmao/agent-skills@audio-engine",
    "j4flmao/agent-skills@input-systems",
    "j4flmao/agent-skills@level-streaming",
    "j4flmao/agent-skills@cocos2d",
    "j4flmao/agent-skills@ecs-architecture",
    "j4flmao/agent-skills@cocos2d-patterns",
    "j4flmao/agent-skills@godot-gdscript",
    "j4flmao/agent-skills@physics-engine",
    "j4flmao/agent-skills@unity-csharp",
    "j4flmao/agent-skills@vulkan",
    "j4flmao/agent-skills@asset-pipeline",
    "j4flmao/agent-skills@ecs-pattern",
    "j4flmao/agent-skills@job-system",
    "j4flmao/agent-skills@math-foundation",
    "j4flmao/agent-skills@memory-management",
    "j4flmao/agent-skills@game-engine-multiplayer-netcode",
    "j4flmao/agent-skills@game-engine-patterns",
    "j4flmao/agent-skills@platform-abstraction",
    "j4flmao/agent-skills@render-graph",
    "j4flmao/agent-skills@anti-cheat-server",
    "j4flmao/agent-skills@authoritative-server",
    "j4flmao/agent-skills@interest-management",
    "j4flmao/agent-skills@matchmaking-lobby",
    "j4flmao/agent-skills@scaling-architecture",
    "j4flmao/agent-skills@godot",
    "j4flmao/agent-skills@multiplayer-netcode",
    "j4flmao/agent-skills@unity",
    "j4flmao/agent-skills@unreal",
    "j4flmao/agent-skills@lead-tech-game-engine",
    "j4flmao/agent-skills@raytracing-mathematics",
    "j4flmao/agent-skills@webgpu-compute-shaders"
  ]
}
```

</details>

### game-server

Online game backends: authoritative servers, netcode, interest management, matchmaking, anti-cheat, scaling — **9 skills**

```bash
npx skills add j4flmao/agent-skills --skill anti-cheat-server --skill authoritative-server --skill interest-management --skill matchmaking-lobby --skill scaling-architecture --skill multiplayer-netcode --skill game-engine-multiplayer-netcode --skill backend-websocket-patterns --skill backend-web-real-time
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`anti-cheat-server`](../skills/game/game-server/anti-cheat-server/SKILL.md), [`authoritative-server`](../skills/game/game-server/authoritative-server/SKILL.md), [`interest-management`](../skills/game/game-server/interest-management/SKILL.md), [`matchmaking-lobby`](../skills/game/game-server/matchmaking-lobby/SKILL.md), [`scaling-architecture`](../skills/game/game-server/scaling-architecture/SKILL.md), [`multiplayer-netcode`](../skills/game/multiplayer-netcode/SKILL.md), [`game-engine-multiplayer-netcode`](../skills/game/game-engine/multiplayer-netcode/SKILL.md), [`backend-websocket-patterns`](../skills/backend/universal/websocket-patterns/SKILL.md), [`backend-web-real-time`](../skills/backend/web-real-time/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@anti-cheat-server",
    "j4flmao/agent-skills@authoritative-server",
    "j4flmao/agent-skills@interest-management",
    "j4flmao/agent-skills@matchmaking-lobby",
    "j4flmao/agent-skills@scaling-architecture",
    "j4flmao/agent-skills@multiplayer-netcode",
    "j4flmao/agent-skills@game-engine-multiplayer-netcode",
    "j4flmao/agent-skills@backend-websocket-patterns",
    "j4flmao/agent-skills@backend-web-real-time"
  ]
}
```

</details>

### gpu-hpc

GPU and high-performance computing: CUDA, Triton, PTX/SASS, attention kernels, quantization, distributed training, RDMA — **14 skills**

```bash
npx skills add j4flmao/agent-skills --skill cuda-programming --skill distributed-training --skill extreme-quantization-mastery --skill flash-attention --skill paged-attention --skill ptx-assembly --skill rdma-roce --skill sass-machine-code --skill tensorrt-optimization --skill tpu-systolic-arrays --skill triton-kernels --skill cpu-architecture --skill ml-inference-optimization --skill gpu-engineer
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`cuda-programming`](../skills/hardware-acceleration/cuda-programming/SKILL.md), [`distributed-training`](../skills/hardware-acceleration/distributed-training/SKILL.md), [`extreme-quantization-mastery`](../skills/hardware-acceleration/extreme-quantization/SKILL.md), [`flash-attention`](../skills/hardware-acceleration/flash-attention/SKILL.md), [`paged-attention`](../skills/hardware-acceleration/paged-attention/SKILL.md), [`ptx-assembly`](../skills/hardware-acceleration/ptx-assembly/SKILL.md), [`rdma-roce`](../skills/hardware-acceleration/rdma-roce/SKILL.md), [`sass-machine-code`](../skills/hardware-acceleration/sass-machine-code/SKILL.md), [`tensorrt-optimization`](../skills/hardware-acceleration/tensorrt-optimization/SKILL.md), [`tpu-systolic-arrays`](../skills/hardware-acceleration/tpu-systolic-arrays/SKILL.md), [`triton-kernels`](../skills/hardware-acceleration/triton-kernels/SKILL.md), [`cpu-architecture`](../skills/low-level/cpu-architecture/SKILL.md), [`ml-inference-optimization`](../skills/ml/inference-optimization/SKILL.md), [`gpu-engineer`](../skills/personas/gpu-engineer/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@cuda-programming",
    "j4flmao/agent-skills@distributed-training",
    "j4flmao/agent-skills@extreme-quantization-mastery",
    "j4flmao/agent-skills@flash-attention",
    "j4flmao/agent-skills@paged-attention",
    "j4flmao/agent-skills@ptx-assembly",
    "j4flmao/agent-skills@rdma-roce",
    "j4flmao/agent-skills@sass-machine-code",
    "j4flmao/agent-skills@tensorrt-optimization",
    "j4flmao/agent-skills@tpu-systolic-arrays",
    "j4flmao/agent-skills@triton-kernels",
    "j4flmao/agent-skills@cpu-architecture",
    "j4flmao/agent-skills@ml-inference-optimization",
    "j4flmao/agent-skills@gpu-engineer"
  ]
}
```

</details>

### infra-cloud

Infrastructure & Cloud: IaC, CI/CD, K8s, cloud providers, observability, networking — **36 skills**

```bash
npx skills add j4flmao/agent-skills --skill docker-patterns --skill cicd-pipeline --skill cloud-native-kubernetes-patterns --skill helm-patterns --skill terraform --skill ansible --skill github-actions --skill gitops --skill vault --skill devops-pulumi --skill devops-gitlab-ci --skill circleci --skill devops-kubernetes-autoscaling --skill apm-observability --skill cilium-ebpf --skill devops-opentelemetry --skill observability --skill monitoring --skill aws --skill devops-azure --skill devops-gcp --skill oracle-cloud --skill digitalocean --skill ibm-cloud --skill alibaba-cloud --skill hetzner-cloud --skill devops-serverless --skill cloud-architecture --skill cloud-migration --skill cloud-cost-optimization --skill hybrid-cloud --skill devops-platform-engineering --skill cloud-native-distributed-tracing --skill cloud-native-event-driven-scaling --skill cloud-native-gitops-workflows --skill cloud-native-serverless-cold-starts
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`cloud-native-kubernetes-patterns`](../skills/cloud-native/kubernetes-patterns/SKILL.md), [`helm-patterns`](../skills/devops/helm-patterns/SKILL.md), [`terraform`](../skills/devops/terraform/SKILL.md), [`ansible`](../skills/devops/ansible/SKILL.md), [`github-actions`](../skills/devops/github-actions/SKILL.md), [`gitops`](../skills/devops/gitops/SKILL.md), [`vault`](../skills/devops/vault/SKILL.md), [`devops-pulumi`](../skills/devops/pulumi/SKILL.md), [`devops-gitlab-ci`](../skills/devops/gitlab-ci/SKILL.md), [`circleci`](../skills/devops/circleci/SKILL.md), [`devops-kubernetes-autoscaling`](../skills/devops/kubernetes-autoscaling/SKILL.md), [`apm-observability`](../skills/devops/apm-observability/SKILL.md), [`cilium-ebpf`](../skills/devops/cilium-ebpf/SKILL.md), [`devops-opentelemetry`](../skills/devops/opentelemetry/SKILL.md), [`observability`](../skills/devops/observability/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`aws`](../skills/devops/aws/SKILL.md), [`devops-azure`](../skills/devops/azure/SKILL.md), [`devops-gcp`](../skills/devops/gcp/SKILL.md), [`oracle-cloud`](../skills/devops/oracle-cloud/SKILL.md), [`digitalocean`](../skills/devops/digitalocean/SKILL.md), [`ibm-cloud`](../skills/devops/ibm-cloud/SKILL.md), [`alibaba-cloud`](../skills/devops/alibaba-cloud/SKILL.md), [`hetzner-cloud`](../skills/devops/hetzner/SKILL.md), [`devops-serverless`](../skills/devops/serverless/SKILL.md), [`cloud-architecture`](../skills/devops/cloud-architecture/SKILL.md), [`cloud-migration`](../skills/devops/cloud-migration/SKILL.md), [`cloud-cost-optimization`](../skills/devops/cloud-cost-optimization/SKILL.md), [`hybrid-cloud`](../skills/devops/hybrid-cloud/SKILL.md), [`devops-platform-engineering`](../skills/devops/platform-engineering/SKILL.md), [`cloud-native-distributed-tracing`](../skills/cloud-native/distributed-tracing/SKILL.md), [`cloud-native-event-driven-scaling`](../skills/cloud-native/event-driven-scaling/SKILL.md), [`cloud-native-gitops-workflows`](../skills/cloud-native/gitops-workflows/SKILL.md), [`cloud-native-serverless-cold-starts`](../skills/cloud-native/serverless-cold-starts/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@docker-patterns",
    "j4flmao/agent-skills@cicd-pipeline",
    "j4flmao/agent-skills@cloud-native-kubernetes-patterns",
    "j4flmao/agent-skills@helm-patterns",
    "j4flmao/agent-skills@terraform",
    "j4flmao/agent-skills@ansible",
    "j4flmao/agent-skills@github-actions",
    "j4flmao/agent-skills@gitops",
    "j4flmao/agent-skills@vault",
    "j4flmao/agent-skills@devops-pulumi",
    "j4flmao/agent-skills@devops-gitlab-ci",
    "j4flmao/agent-skills@circleci",
    "j4flmao/agent-skills@devops-kubernetes-autoscaling",
    "j4flmao/agent-skills@apm-observability",
    "j4flmao/agent-skills@cilium-ebpf",
    "j4flmao/agent-skills@devops-opentelemetry",
    "j4flmao/agent-skills@observability",
    "j4flmao/agent-skills@monitoring",
    "j4flmao/agent-skills@aws",
    "j4flmao/agent-skills@devops-azure",
    "j4flmao/agent-skills@devops-gcp",
    "j4flmao/agent-skills@oracle-cloud",
    "j4flmao/agent-skills@digitalocean",
    "j4flmao/agent-skills@ibm-cloud",
    "j4flmao/agent-skills@alibaba-cloud",
    "j4flmao/agent-skills@hetzner-cloud",
    "j4flmao/agent-skills@devops-serverless",
    "j4flmao/agent-skills@cloud-architecture",
    "j4flmao/agent-skills@cloud-migration",
    "j4flmao/agent-skills@cloud-cost-optimization",
    "j4flmao/agent-skills@hybrid-cloud",
    "j4flmao/agent-skills@devops-platform-engineering",
    "j4flmao/agent-skills@cloud-native-distributed-tracing",
    "j4flmao/agent-skills@cloud-native-event-driven-scaling",
    "j4flmao/agent-skills@cloud-native-gitops-workflows",
    "j4flmao/agent-skills@cloud-native-serverless-cold-starts"
  ]
}
```

</details>

### infra-foundations

Infrastructure foundations: Docker, Terraform, Ansible, Consul, networking, storage, bare metal, datacenters, hybrid cloud — **15 skills**

```bash
npx skills add j4flmao/agent-skills --skill devops-docker --skill docker-patterns --skill terraform --skill ansible-automation --skill terraform-patterns --skill ansible --skill consul --skill nomad --skill vault --skill devops-network-infrastructure --skill storage-infrastructure --skill bare-metal --skill datacenter --skill hybrid-cloud --skill longhorn
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`devops-docker`](../skills/devops/docker/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`terraform`](../skills/devops/terraform/SKILL.md), [`ansible-automation`](../skills/devops/iac/ansible-automation/SKILL.md), [`terraform-patterns`](../skills/devops/iac/terraform-patterns/SKILL.md), [`ansible`](../skills/devops/ansible/SKILL.md), [`consul`](../skills/devops/consul/SKILL.md), [`nomad`](../skills/devops/nomad/SKILL.md), [`vault`](../skills/devops/vault/SKILL.md), [`devops-network-infrastructure`](../skills/devops/network-infrastructure/SKILL.md), [`storage-infrastructure`](../skills/devops/storage-infrastructure/SKILL.md), [`bare-metal`](../skills/devops/bare-metal/SKILL.md), [`datacenter`](../skills/devops/datacenter/SKILL.md), [`hybrid-cloud`](../skills/devops/hybrid-cloud/SKILL.md), [`longhorn`](../skills/devops/longhorn/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@devops-docker",
    "j4flmao/agent-skills@docker-patterns",
    "j4flmao/agent-skills@terraform",
    "j4flmao/agent-skills@ansible-automation",
    "j4flmao/agent-skills@terraform-patterns",
    "j4flmao/agent-skills@ansible",
    "j4flmao/agent-skills@consul",
    "j4flmao/agent-skills@nomad",
    "j4flmao/agent-skills@vault",
    "j4flmao/agent-skills@devops-network-infrastructure",
    "j4flmao/agent-skills@storage-infrastructure",
    "j4flmao/agent-skills@bare-metal",
    "j4flmao/agent-skills@datacenter",
    "j4flmao/agent-skills@hybrid-cloud",
    "j4flmao/agent-skills@longhorn"
  ]
}
```

</details>

### kubernetes-platform

Kubernetes and platform engineering: clusters, operators, Helm, GitOps, service mesh, autoscaling, policy, IDPs — **36 skills**

```bash
npx skills add j4flmao/agent-skills --skill kubernetes --skill devops-kubernetes-autoscaling --skill devops-kubernetes-for-data --skill kubernetes-internals --skill devops-kubernetes-operators --skill docker-internals --skill kubernetes-architecture --skill helm-patterns --skill argo-cd --skill gitops --skill devops-gitops-advanced --skill gitops-argocd --skill devops-service-mesh --skill cilium-ebpf --skill devops-policy-as-code --skill devops-progressive-delivery --skill devops-platform-engineering --skill devops-internal-developer-platform --skill cloud-native-aws-serverless --skill cloud-native-azure-functions --skill cloud-native-security-defensive --skill cloud-native-security-offensive --skill cloud-native-distributed-tracing --skill cloud-native-ebpf-networking --skill cloud-native-ebpf-observability --skill cloud-native-cloudflare-workers --skill cloud-native-serverless-orchestration --skill cloud-native-event-driven-scaling --skill cloud-native-gcp-bigquery --skill cloud-native-argocd-reconciliation --skill cloud-native-gitops-workflows --skill cloud-native-k8s-operators --skill cloud-native-kubernetes-mastery --skill cloud-native-kubernetes-patterns --skill cloud-native-serverless-cold-starts --skill istio-envoy-service-mesh-mechanics
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`kubernetes`](../skills/devops/kubernetes/SKILL.md), [`devops-kubernetes-autoscaling`](../skills/devops/kubernetes-autoscaling/SKILL.md), [`devops-kubernetes-for-data`](../skills/devops/kubernetes-for-data/SKILL.md), [`kubernetes-internals`](../skills/devops/kubernetes-internals/SKILL.md), [`devops-kubernetes-operators`](../skills/devops/kubernetes-operators/SKILL.md), [`docker-internals`](../skills/devops/orchestration/docker-internals/SKILL.md), [`kubernetes-architecture`](../skills/devops/orchestration/kubernetes-architecture/SKILL.md), [`helm-patterns`](../skills/devops/helm-patterns/SKILL.md), [`argo-cd`](../skills/devops/argo-cd/SKILL.md), [`gitops`](../skills/devops/gitops/SKILL.md), [`devops-gitops-advanced`](../skills/devops/gitops-advanced/SKILL.md), [`gitops-argocd`](../skills/devops/ci-cd/gitops-argocd/SKILL.md), [`devops-service-mesh`](../skills/devops/service-mesh/SKILL.md), [`cilium-ebpf`](../skills/devops/cilium-ebpf/SKILL.md), [`devops-policy-as-code`](../skills/devops/policy-as-code/SKILL.md), [`devops-progressive-delivery`](../skills/devops/progressive-delivery/SKILL.md), [`devops-platform-engineering`](../skills/devops/platform-engineering/SKILL.md), [`devops-internal-developer-platform`](../skills/devops/internal-developer-platform/SKILL.md), [`cloud-native-aws-serverless`](../skills/cloud-native/aws-serverless/SKILL.md), [`cloud-native-azure-functions`](../skills/cloud-native/azure-functions/SKILL.md), [`cloud-native-security-defensive`](../skills/cloud-native/cloud-security-defensive/SKILL.md), [`cloud-native-security-offensive`](../skills/cloud-native/cloud-security-offensive/SKILL.md), [`cloud-native-distributed-tracing`](../skills/cloud-native/distributed-tracing/SKILL.md), [`cloud-native-ebpf-networking`](../skills/cloud-native/ebpf-networking/SKILL.md), [`cloud-native-ebpf-observability`](../skills/cloud-native/ebpf-observability/SKILL.md), [`cloud-native-cloudflare-workers`](../skills/cloud-native/edge-computing/cloudflare-workers/SKILL.md), [`cloud-native-serverless-orchestration`](../skills/cloud-native/edge-computing/serverless-orchestration/SKILL.md), [`cloud-native-event-driven-scaling`](../skills/cloud-native/event-driven-scaling/SKILL.md), [`cloud-native-gcp-bigquery`](../skills/cloud-native/gcp-bigquery/SKILL.md), [`cloud-native-argocd-reconciliation`](../skills/cloud-native/gitops/SKILL.md), [`cloud-native-gitops-workflows`](../skills/cloud-native/gitops-workflows/SKILL.md), [`cloud-native-k8s-operators`](../skills/cloud-native/k8s-operators/SKILL.md), [`cloud-native-kubernetes-mastery`](../skills/cloud-native/kubernetes-mastery/SKILL.md), [`cloud-native-kubernetes-patterns`](../skills/cloud-native/kubernetes-patterns/SKILL.md), [`cloud-native-serverless-cold-starts`](../skills/cloud-native/serverless-cold-starts/SKILL.md), [`istio-envoy-service-mesh-mechanics`](../skills/cloud-native/service-mesh/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@kubernetes",
    "j4flmao/agent-skills@devops-kubernetes-autoscaling",
    "j4flmao/agent-skills@devops-kubernetes-for-data",
    "j4flmao/agent-skills@kubernetes-internals",
    "j4flmao/agent-skills@devops-kubernetes-operators",
    "j4flmao/agent-skills@docker-internals",
    "j4flmao/agent-skills@kubernetes-architecture",
    "j4flmao/agent-skills@helm-patterns",
    "j4flmao/agent-skills@argo-cd",
    "j4flmao/agent-skills@gitops",
    "j4flmao/agent-skills@devops-gitops-advanced",
    "j4flmao/agent-skills@gitops-argocd",
    "j4flmao/agent-skills@devops-service-mesh",
    "j4flmao/agent-skills@cilium-ebpf",
    "j4flmao/agent-skills@devops-policy-as-code",
    "j4flmao/agent-skills@devops-progressive-delivery",
    "j4flmao/agent-skills@devops-platform-engineering",
    "j4flmao/agent-skills@devops-internal-developer-platform",
    "j4flmao/agent-skills@cloud-native-aws-serverless",
    "j4flmao/agent-skills@cloud-native-azure-functions",
    "j4flmao/agent-skills@cloud-native-security-defensive",
    "j4flmao/agent-skills@cloud-native-security-offensive",
    "j4flmao/agent-skills@cloud-native-distributed-tracing",
    "j4flmao/agent-skills@cloud-native-ebpf-networking",
    "j4flmao/agent-skills@cloud-native-ebpf-observability",
    "j4flmao/agent-skills@cloud-native-cloudflare-workers",
    "j4flmao/agent-skills@cloud-native-serverless-orchestration",
    "j4flmao/agent-skills@cloud-native-event-driven-scaling",
    "j4flmao/agent-skills@cloud-native-gcp-bigquery",
    "j4flmao/agent-skills@cloud-native-argocd-reconciliation",
    "j4flmao/agent-skills@cloud-native-gitops-workflows",
    "j4flmao/agent-skills@cloud-native-k8s-operators",
    "j4flmao/agent-skills@cloud-native-kubernetes-mastery",
    "j4flmao/agent-skills@cloud-native-kubernetes-patterns",
    "j4flmao/agent-skills@cloud-native-serverless-cold-starts",
    "j4flmao/agent-skills@istio-envoy-service-mesh-mechanics"
  ]
}
```

</details>

### languages

Programming language deep dives: TypeScript, Python, Go, Rust, Java, Kotlin, Swift, C#, C, C++, Scala, Elixir, Dart, Assembly — **14 skills**

```bash
npx skills add j4flmao/agent-skills --skill lang-assembly --skill lang-c --skill lang-cpp --skill lang-csharp --skill lang-dart --skill lang-elixir --skill go --skill java --skill lang-kotlin --skill python --skill lang-rust --skill lang-scala --skill lang-swift --skill typescript
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`lang-assembly`](../skills/languages/assembly/SKILL.md), [`lang-c`](../skills/languages/c/SKILL.md), [`lang-cpp`](../skills/languages/cpp/SKILL.md), [`lang-csharp`](../skills/languages/csharp/SKILL.md), [`lang-dart`](../skills/languages/dart/SKILL.md), [`lang-elixir`](../skills/languages/elixir/SKILL.md), [`go`](../skills/languages/go/SKILL.md), [`java`](../skills/languages/java/SKILL.md), [`lang-kotlin`](../skills/languages/kotlin/SKILL.md), [`python`](../skills/languages/python/SKILL.md), [`lang-rust`](../skills/languages/rust/SKILL.md), [`lang-scala`](../skills/languages/scala/SKILL.md), [`lang-swift`](../skills/languages/swift/SKILL.md), [`typescript`](../skills/languages/typescript/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@lang-assembly",
    "j4flmao/agent-skills@lang-c",
    "j4flmao/agent-skills@lang-cpp",
    "j4flmao/agent-skills@lang-csharp",
    "j4flmao/agent-skills@lang-dart",
    "j4flmao/agent-skills@lang-elixir",
    "j4flmao/agent-skills@go",
    "j4flmao/agent-skills@java",
    "j4flmao/agent-skills@lang-kotlin",
    "j4flmao/agent-skills@python",
    "j4flmao/agent-skills@lang-rust",
    "j4flmao/agent-skills@lang-scala",
    "j4flmao/agent-skills@lang-swift",
    "j4flmao/agent-skills@typescript"
  ]
}
```

</details>

### ml-engineering

Machine learning and data science: classical/deep learning, features, evaluation, serving, MLOps, experimentation — **24 skills**

```bash
npx skills add j4flmao/agent-skills --skill ml-anomaly-detection --skill ml-classical-ml --skill ml-computer-vision --skill ml-deep-learning --skill ml-experiment-tracking --skill ml-feature-engineering --skill ml-feature-store --skill ml-hyperparameter-tuning --skill ml-inference-optimization --skill ml-math-foundations --skill ml-ml-pipeline --skill ml-model-evaluation --skill ml-model-interpretability --skill ml-model-serving --skill ml-nlp --skill ml-recommendation-systems --skill ml-time-series --skill data-science-analytics-engineering --skill data-science-causal-inference --skill data-science-experimentation --skill data-science-statistical-analysis --skill devops-mlops --skill data-feature-store --skill data-analyst
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`ml-anomaly-detection`](../skills/ml/anomaly-detection/SKILL.md), [`ml-classical-ml`](../skills/ml/classical-ml/SKILL.md), [`ml-computer-vision`](../skills/ml/computer-vision/SKILL.md), [`ml-deep-learning`](../skills/ml/deep-learning/SKILL.md), [`ml-experiment-tracking`](../skills/ml/experiment-tracking/SKILL.md), [`ml-feature-engineering`](../skills/ml/feature-engineering/SKILL.md), [`ml-feature-store`](../skills/ml/feature-store/SKILL.md), [`ml-hyperparameter-tuning`](../skills/ml/hyperparameter-tuning/SKILL.md), [`ml-inference-optimization`](../skills/ml/inference-optimization/SKILL.md), [`ml-math-foundations`](../skills/ml/math-foundations/SKILL.md), [`ml-ml-pipeline`](../skills/ml/ml-pipeline/SKILL.md), [`ml-model-evaluation`](../skills/ml/model-evaluation/SKILL.md), [`ml-model-interpretability`](../skills/ml/model-interpretability/SKILL.md), [`ml-model-serving`](../skills/ml/model-serving/SKILL.md), [`ml-nlp`](../skills/ml/nlp/SKILL.md), [`ml-recommendation-systems`](../skills/ml/recommendation-systems/SKILL.md), [`ml-time-series`](../skills/ml/time-series/SKILL.md), [`data-science-analytics-engineering`](../skills/data-science/analytics-engineering/SKILL.md), [`data-science-causal-inference`](../skills/data-science/causal-inference/SKILL.md), [`data-science-experimentation`](../skills/data-science/experimentation/SKILL.md), [`data-science-statistical-analysis`](../skills/data-science/statistical-analysis/SKILL.md), [`devops-mlops`](../skills/devops/mlops/SKILL.md), [`data-feature-store`](../skills/data/feature-store/SKILL.md), [`data-analyst`](../skills/personas/data-analyst/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@ml-anomaly-detection",
    "j4flmao/agent-skills@ml-classical-ml",
    "j4flmao/agent-skills@ml-computer-vision",
    "j4flmao/agent-skills@ml-deep-learning",
    "j4flmao/agent-skills@ml-experiment-tracking",
    "j4flmao/agent-skills@ml-feature-engineering",
    "j4flmao/agent-skills@ml-feature-store",
    "j4flmao/agent-skills@ml-hyperparameter-tuning",
    "j4flmao/agent-skills@ml-inference-optimization",
    "j4flmao/agent-skills@ml-math-foundations",
    "j4flmao/agent-skills@ml-ml-pipeline",
    "j4flmao/agent-skills@ml-model-evaluation",
    "j4flmao/agent-skills@ml-model-interpretability",
    "j4flmao/agent-skills@ml-model-serving",
    "j4flmao/agent-skills@ml-nlp",
    "j4flmao/agent-skills@ml-recommendation-systems",
    "j4flmao/agent-skills@ml-time-series",
    "j4flmao/agent-skills@data-science-analytics-engineering",
    "j4flmao/agent-skills@data-science-causal-inference",
    "j4flmao/agent-skills@data-science-experimentation",
    "j4flmao/agent-skills@data-science-statistical-analysis",
    "j4flmao/agent-skills@devops-mlops",
    "j4flmao/agent-skills@data-feature-store",
    "j4flmao/agent-skills@data-analyst"
  ]
}
```

</details>

### mobile-cross-platform

Cross-platform mobile: Flutter, React Native, Kotlin Multiplatform, Ionic/Capacitor, .NET MAUI, internals, localization, widgets — **28 skills**

```bash
npx skills add j4flmao/agent-skills --skill flutter-expertise --skill react-native-expertise --skill mobile-kotlin-multiplatform --skill mobile-ionic-capacitor --skill mobile-dotnet-maui --skill flutter-internals --skill react-native-architecture --skill mobile-localization --skill mobile-widgets --skill mobile-analytics --skill mobile-ar-vr --skill mobile-biometrics --skill mobile-camera-media --skill mobile-crash-reporting --skill mobile-deep-linking --skill mobile-deployment --skill mobile-in-app-purchase --skill map-location --skill mobile-networking --skill mobile-offline-first --skill mobile-patterns --skill mobile-performance --skill mobile-push-notifications --skill mobile-security --skill mobile-storage --skill mobile-testing --skill lang-dart --skill mobile-engineer
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`flutter-expertise`](../skills/mobile/flutter/SKILL.md), [`react-native-expertise`](../skills/mobile/react-native/SKILL.md), [`mobile-kotlin-multiplatform`](../skills/mobile/kotlin-multiplatform/SKILL.md), [`mobile-ionic-capacitor`](../skills/mobile/ionic-capacitor/SKILL.md), [`mobile-dotnet-maui`](../skills/mobile/dotnet-maui/SKILL.md), [`flutter-internals`](../skills/mobile/cross-platform/flutter-internals/SKILL.md), [`react-native-architecture`](../skills/mobile/cross-platform/react-native-architecture/SKILL.md), [`mobile-localization`](../skills/mobile/mobile-localization/SKILL.md), [`mobile-widgets`](../skills/mobile/mobile-widgets/SKILL.md), [`mobile-analytics`](../skills/mobile/universal/analytics/SKILL.md), [`mobile-ar-vr`](../skills/mobile/universal/ar-vr/SKILL.md), [`mobile-biometrics`](../skills/mobile/universal/biometrics/SKILL.md), [`mobile-camera-media`](../skills/mobile/universal/camera-media/SKILL.md), [`mobile-crash-reporting`](../skills/mobile/universal/crash-reporting/SKILL.md), [`mobile-deep-linking`](../skills/mobile/universal/deep-linking/SKILL.md), [`mobile-deployment`](../skills/mobile/universal/deployment/SKILL.md), [`mobile-in-app-purchase`](../skills/mobile/universal/in-app-purchase/SKILL.md), [`map-location`](../skills/mobile/universal/map-location/SKILL.md), [`mobile-networking`](../skills/mobile/universal/networking/SKILL.md), [`mobile-offline-first`](../skills/mobile/universal/offline-first/SKILL.md), [`mobile-patterns`](../skills/mobile/universal/patterns/SKILL.md), [`mobile-performance`](../skills/mobile/universal/performance/SKILL.md), [`mobile-push-notifications`](../skills/mobile/universal/push-notifications/SKILL.md), [`mobile-security`](../skills/mobile/universal/security/SKILL.md), [`mobile-storage`](../skills/mobile/universal/storage/SKILL.md), [`mobile-testing`](../skills/mobile/universal/testing/SKILL.md), [`lang-dart`](../skills/languages/dart/SKILL.md), [`mobile-engineer`](../skills/personas/mobile-engineer/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@flutter-expertise",
    "j4flmao/agent-skills@react-native-expertise",
    "j4flmao/agent-skills@mobile-kotlin-multiplatform",
    "j4flmao/agent-skills@mobile-ionic-capacitor",
    "j4flmao/agent-skills@mobile-dotnet-maui",
    "j4flmao/agent-skills@flutter-internals",
    "j4flmao/agent-skills@react-native-architecture",
    "j4flmao/agent-skills@mobile-localization",
    "j4flmao/agent-skills@mobile-widgets",
    "j4flmao/agent-skills@mobile-analytics",
    "j4flmao/agent-skills@mobile-ar-vr",
    "j4flmao/agent-skills@mobile-biometrics",
    "j4flmao/agent-skills@mobile-camera-media",
    "j4flmao/agent-skills@mobile-crash-reporting",
    "j4flmao/agent-skills@mobile-deep-linking",
    "j4flmao/agent-skills@mobile-deployment",
    "j4flmao/agent-skills@mobile-in-app-purchase",
    "j4flmao/agent-skills@map-location",
    "j4flmao/agent-skills@mobile-networking",
    "j4flmao/agent-skills@mobile-offline-first",
    "j4flmao/agent-skills@mobile-patterns",
    "j4flmao/agent-skills@mobile-performance",
    "j4flmao/agent-skills@mobile-push-notifications",
    "j4flmao/agent-skills@mobile-security",
    "j4flmao/agent-skills@mobile-storage",
    "j4flmao/agent-skills@mobile-testing",
    "j4flmao/agent-skills@lang-dart",
    "j4flmao/agent-skills@mobile-engineer"
  ]
}
```

</details>

### personas

Expert personas: architects, engineers by domain, PM, QA, SRE, security, red team, SOC, GPU, game engine, quantum, smart-contract auditor — **17 skills**

```bash
npx skills add j4flmao/agent-skills --skill ai-architect --skill backend-engineer --skill data-analyst --skill data-engineer --skill devops-sre-engineer --skill frontend-engineer --skill gpu-engineer --skill lead-tech-game-engine --skill mobile-engineer --skill product-manager --skill qa-architect --skill quantum-scientist --skill red-team-operator --skill security-engineer --skill smart-contract-auditor --skill soc-analyst --skill system-architect
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`ai-architect`](../skills/personas/ai-architect/SKILL.md), [`backend-engineer`](../skills/personas/backend-engineer/SKILL.md), [`data-analyst`](../skills/personas/data-analyst/SKILL.md), [`data-engineer`](../skills/personas/data-engineer/SKILL.md), [`devops-sre-engineer`](../skills/personas/devops-sre-engineer/SKILL.md), [`frontend-engineer`](../skills/personas/frontend-engineer/SKILL.md), [`gpu-engineer`](../skills/personas/gpu-engineer/SKILL.md), [`lead-tech-game-engine`](../skills/personas/lead-tech-game-engine/SKILL.md), [`mobile-engineer`](../skills/personas/mobile-engineer/SKILL.md), [`product-manager`](../skills/personas/product-manager/SKILL.md), [`qa-architect`](../skills/personas/qa-architect/SKILL.md), [`quantum-scientist`](../skills/personas/quantum-scientist/SKILL.md), [`red-team-operator`](../skills/personas/red-team-operator/SKILL.md), [`security-engineer`](../skills/personas/security-engineer/SKILL.md), [`smart-contract-auditor`](../skills/personas/smart-contract-auditor/SKILL.md), [`soc-analyst`](../skills/personas/soc-analyst/SKILL.md), [`system-architect`](../skills/personas/system-architect/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@ai-architect",
    "j4flmao/agent-skills@backend-engineer",
    "j4flmao/agent-skills@data-analyst",
    "j4flmao/agent-skills@data-engineer",
    "j4flmao/agent-skills@devops-sre-engineer",
    "j4flmao/agent-skills@frontend-engineer",
    "j4flmao/agent-skills@gpu-engineer",
    "j4flmao/agent-skills@lead-tech-game-engine",
    "j4flmao/agent-skills@mobile-engineer",
    "j4flmao/agent-skills@product-manager",
    "j4flmao/agent-skills@qa-architect",
    "j4flmao/agent-skills@quantum-scientist",
    "j4flmao/agent-skills@red-team-operator",
    "j4flmao/agent-skills@security-engineer",
    "j4flmao/agent-skills@smart-contract-auditor",
    "j4flmao/agent-skills@soc-analyst",
    "j4flmao/agent-skills@system-architect"
  ]
}
```

</details>

### planning-docs

Planning and specification documents: briefs, PRDs, stories, tech specs, roadmaps, BDD/ATDD, BPMN, cost-benefit, agent plans — **17 skills**

```bash
npx skills add j4flmao/agent-skills --skill write-implementation-plan --skill agent-task-checklist --skill agent-walkthrough-report --skill planning-bdd-atdd --skill planning-bpmn-modeling --skill planning-cost-benefit --skill create-brief --skill planning-create-pitch-deck --skill create-prd --skill planning-create-roadmap --skill create-story --skill create-tech-spec --skill planning-market-analysis --skill core-context-compressor --skill master-orchestrator --skill core-onboarding --skill project-init
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`write-implementation-plan`](../skills/planning/agent-implementation-plan/SKILL.md), [`agent-task-checklist`](../skills/planning/agent-task-checklist/SKILL.md), [`agent-walkthrough-report`](../skills/planning/agent-walkthrough-report/SKILL.md), [`planning-bdd-atdd`](../skills/planning/bdd-atdd/SKILL.md), [`planning-bpmn-modeling`](../skills/planning/bpmn-modeling/SKILL.md), [`planning-cost-benefit`](../skills/planning/cost-benefit/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`planning-create-pitch-deck`](../skills/planning/create-pitch-deck/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md), [`create-story`](../skills/planning/create-story/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`planning-market-analysis`](../skills/planning/market-analysis/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md), [`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@write-implementation-plan",
    "j4flmao/agent-skills@agent-task-checklist",
    "j4flmao/agent-skills@agent-walkthrough-report",
    "j4flmao/agent-skills@planning-bdd-atdd",
    "j4flmao/agent-skills@planning-bpmn-modeling",
    "j4flmao/agent-skills@planning-cost-benefit",
    "j4flmao/agent-skills@create-brief",
    "j4flmao/agent-skills@planning-create-pitch-deck",
    "j4flmao/agent-skills@create-prd",
    "j4flmao/agent-skills@planning-create-roadmap",
    "j4flmao/agent-skills@create-story",
    "j4flmao/agent-skills@create-tech-spec",
    "j4flmao/agent-skills@planning-market-analysis",
    "j4flmao/agent-skills@core-context-compressor",
    "j4flmao/agent-skills@master-orchestrator",
    "j4flmao/agent-skills@core-onboarding",
    "j4flmao/agent-skills@project-init"
  ]
}
```

</details>

### product-growth

Product management and growth: discovery, analytics, A/B tests, pricing, GTM, onboarding, roadmaps, PRDs, OKRs — **18 skills**

```bash
npx skills add j4flmao/agent-skills --skill product-ab-testing --skill product-analytics --skill product-customer-journey --skill product-go-to-market --skill product-growth-engineering --skill product-onboarding-flow --skill product-persona-development --skill product-pricing-strategy --skill product-user-research --skill create-prd --skill planning-create-roadmap --skill planning-market-analysis --skill planning-create-pitch-deck --skill create-brief --skill pm --skill management-okr-kpi --skill data-science-experimentation --skill product-manager
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`product-ab-testing`](../skills/product/ab-testing/SKILL.md), [`product-analytics`](../skills/product/analytics/SKILL.md), [`product-customer-journey`](../skills/product/customer-journey/SKILL.md), [`product-go-to-market`](../skills/product/go-to-market/SKILL.md), [`product-growth-engineering`](../skills/product/growth-engineering/SKILL.md), [`product-onboarding-flow`](../skills/product/onboarding-flow/SKILL.md), [`product-persona-development`](../skills/product/persona-development/SKILL.md), [`product-pricing-strategy`](../skills/product/pricing-strategy/SKILL.md), [`product-user-research`](../skills/product/user-research/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md), [`planning-market-analysis`](../skills/planning/market-analysis/SKILL.md), [`planning-create-pitch-deck`](../skills/planning/create-pitch-deck/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`pm`](../skills/management/pm/SKILL.md), [`management-okr-kpi`](../skills/management/okr-kpi/SKILL.md), [`data-science-experimentation`](../skills/data-science/experimentation/SKILL.md), [`product-manager`](../skills/personas/product-manager/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@product-ab-testing",
    "j4flmao/agent-skills@product-analytics",
    "j4flmao/agent-skills@product-customer-journey",
    "j4flmao/agent-skills@product-go-to-market",
    "j4flmao/agent-skills@product-growth-engineering",
    "j4flmao/agent-skills@product-onboarding-flow",
    "j4flmao/agent-skills@product-persona-development",
    "j4flmao/agent-skills@product-pricing-strategy",
    "j4flmao/agent-skills@product-user-research",
    "j4flmao/agent-skills@create-prd",
    "j4flmao/agent-skills@planning-create-roadmap",
    "j4flmao/agent-skills@planning-market-analysis",
    "j4flmao/agent-skills@planning-create-pitch-deck",
    "j4flmao/agent-skills@create-brief",
    "j4flmao/agent-skills@pm",
    "j4flmao/agent-skills@management-okr-kpi",
    "j4flmao/agent-skills@data-science-experimentation",
    "j4flmao/agent-skills@product-manager"
  ]
}
```

</details>

### quality-testing

Quality engineering: unit, integration, contract, E2E, visual, load, property-based, regression, smoke, acceptance testing — **20 skills**

```bash
npx skills add j4flmao/agent-skills --skill quality-acceptance-testing --skill quality-contract-testing --skill e2e-testing --skill quality-integration-testing --skill quality-load-testing --skill quality-property-based-testing --skill quality-e2e-testing --skill quality-regression-testing --skill quality-smoke-testing --skill quality-unit-testing --skill quality-visual-testing --skill qa-chaos-engineering --skill qa-e2e-playwright --skill frontend-testing --skill mobile-testing --skill backend-contract-testing --skill backend-load-testing --skill qa --skill qc --skill qa-architect
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`quality-acceptance-testing`](../skills/quality/acceptance-testing/SKILL.md), [`quality-contract-testing`](../skills/quality/contract-testing/SKILL.md), [`e2e-testing`](../skills/quality/e2e-testing/SKILL.md), [`quality-integration-testing`](../skills/quality/integration-testing/SKILL.md), [`quality-load-testing`](../skills/quality/load-testing/SKILL.md), [`quality-property-based-testing`](../skills/quality/property-based-testing/SKILL.md), [`quality-e2e-testing`](../skills/quality/quality-e2e-testing/SKILL.md), [`quality-regression-testing`](../skills/quality/regression-testing/SKILL.md), [`quality-smoke-testing`](../skills/quality/smoke-testing/SKILL.md), [`quality-unit-testing`](../skills/quality/unit-testing/SKILL.md), [`quality-visual-testing`](../skills/quality/visual-testing/SKILL.md), [`qa-chaos-engineering`](../skills/quality-assurance/testing-strategies/chaos-engineering/SKILL.md), [`qa-e2e-playwright`](../skills/quality-assurance/testing-strategies/e2e-playwright/SKILL.md), [`frontend-testing`](../skills/frontend/universal/testing/SKILL.md), [`mobile-testing`](../skills/mobile/universal/testing/SKILL.md), [`backend-contract-testing`](../skills/backend/universal/contract-testing/SKILL.md), [`backend-load-testing`](../skills/backend/universal/load-testing/SKILL.md), [`qa`](../skills/management/qa/SKILL.md), [`qc`](../skills/management/qc/SKILL.md), [`qa-architect`](../skills/personas/qa-architect/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@quality-acceptance-testing",
    "j4flmao/agent-skills@quality-contract-testing",
    "j4flmao/agent-skills@e2e-testing",
    "j4flmao/agent-skills@quality-integration-testing",
    "j4flmao/agent-skills@quality-load-testing",
    "j4flmao/agent-skills@quality-property-based-testing",
    "j4flmao/agent-skills@quality-e2e-testing",
    "j4flmao/agent-skills@quality-regression-testing",
    "j4flmao/agent-skills@quality-smoke-testing",
    "j4flmao/agent-skills@quality-unit-testing",
    "j4flmao/agent-skills@quality-visual-testing",
    "j4flmao/agent-skills@qa-chaos-engineering",
    "j4flmao/agent-skills@qa-e2e-playwright",
    "j4flmao/agent-skills@frontend-testing",
    "j4flmao/agent-skills@mobile-testing",
    "j4flmao/agent-skills@backend-contract-testing",
    "j4flmao/agent-skills@backend-load-testing",
    "j4flmao/agent-skills@qa",
    "j4flmao/agent-skills@qc",
    "j4flmao/agent-skills@qa-architect"
  ]
}
```

</details>

### quantum-computing

Quantum computing: qubits and gates, algorithms (Grover, Shor), Qiskit, error correction, post-quantum cryptography — **12 skills**

```bash
npx skills add j4flmao/agent-skills --skill grovers-algorithm --skill post-quantum-crypto --skill qiskit-framework --skill quantum-algorithms --skill quantum-entanglement --skill quantum-error-correction --skill qubits-and-gates --skill shors-algorithm --skill fundamental-quantum-error-correction --skill post-quantum-crypto-poc --skill modern-cryptography --skill quantum-scientist
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`grovers-algorithm`](../skills/quantum-computing/grovers-algorithm/SKILL.md), [`post-quantum-crypto`](../skills/quantum-computing/post-quantum-crypto/SKILL.md), [`qiskit-framework`](../skills/quantum-computing/qiskit-framework/SKILL.md), [`quantum-algorithms`](../skills/quantum-computing/quantum-algorithms/SKILL.md), [`quantum-entanglement`](../skills/quantum-computing/quantum-entanglement/SKILL.md), [`quantum-error-correction`](../skills/quantum-computing/quantum-error-correction/SKILL.md), [`qubits-and-gates`](../skills/quantum-computing/qubits-and-gates/SKILL.md), [`shors-algorithm`](../skills/quantum-computing/shors-algorithm/SKILL.md), [`fundamental-quantum-error-correction`](../skills/fundamental-truths/quantum-error-correction/SKILL.md), [`post-quantum-crypto-poc`](../skills/rnd/security/post-quantum-crypto-poc/SKILL.md), [`modern-cryptography`](../skills/cybersecurity/modern-cryptography/SKILL.md), [`quantum-scientist`](../skills/personas/quantum-scientist/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@grovers-algorithm",
    "j4flmao/agent-skills@post-quantum-crypto",
    "j4flmao/agent-skills@qiskit-framework",
    "j4flmao/agent-skills@quantum-algorithms",
    "j4flmao/agent-skills@quantum-entanglement",
    "j4flmao/agent-skills@quantum-error-correction",
    "j4flmao/agent-skills@qubits-and-gates",
    "j4flmao/agent-skills@shors-algorithm",
    "j4flmao/agent-skills@fundamental-quantum-error-correction",
    "j4flmao/agent-skills@post-quantum-crypto-poc",
    "j4flmao/agent-skills@modern-cryptography",
    "j4flmao/agent-skills@quantum-scientist"
  ]
}
```

</details>

### research-frontier

Research and frontier topics: information theory, statistical mechanics, neuromorphic computing, roadmapping, R&D prototypes — **12 skills**

```bash
npx skills add j4flmao/agent-skills --skill information-theory --skill neuromorphic-computing --skill fundamental-quantum-error-correction --skill statistical-mechanics --skill aspirational-roadmapping --skill local-slm-inference --skill multimodal-pipelines --skill swarm-architectures --skill adversarial-prompting --skill ai-defense-mechanisms --skill post-quantum-crypto-poc --skill enterprise-rd-poc-management
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`information-theory`](../skills/fundamental-truths/information-theory/SKILL.md), [`neuromorphic-computing`](../skills/fundamental-truths/neuromorphic-computing/SKILL.md), [`fundamental-quantum-error-correction`](../skills/fundamental-truths/quantum-error-correction/SKILL.md), [`statistical-mechanics`](../skills/fundamental-truths/statistical-mechanics/SKILL.md), [`aspirational-roadmapping`](../skills/aspirational/roadmapping/SKILL.md), [`local-slm-inference`](../skills/rnd/ai-agents/local-slm-inference/SKILL.md), [`multimodal-pipelines`](../skills/rnd/ai-agents/multimodal-pipelines/SKILL.md), [`swarm-architectures`](../skills/rnd/ai-agents/swarm-architectures/SKILL.md), [`adversarial-prompting`](../skills/rnd/security/adversarial-prompting/SKILL.md), [`ai-defense-mechanisms`](../skills/rnd/security/ai-defense-mechanisms/SKILL.md), [`post-quantum-crypto-poc`](../skills/rnd/security/post-quantum-crypto-poc/SKILL.md), [`enterprise-rd-poc-management`](../skills/enterprise/rd-poc-management/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@information-theory",
    "j4flmao/agent-skills@neuromorphic-computing",
    "j4flmao/agent-skills@fundamental-quantum-error-correction",
    "j4flmao/agent-skills@statistical-mechanics",
    "j4flmao/agent-skills@aspirational-roadmapping",
    "j4flmao/agent-skills@local-slm-inference",
    "j4flmao/agent-skills@multimodal-pipelines",
    "j4flmao/agent-skills@swarm-architectures",
    "j4flmao/agent-skills@adversarial-prompting",
    "j4flmao/agent-skills@ai-defense-mechanisms",
    "j4flmao/agent-skills@post-quantum-crypto-poc",
    "j4flmao/agent-skills@enterprise-rd-poc-management"
  ]
}
```

</details>

### security-all

All security skills: SAST/DAST, SBOM, secrets, container, API, data, Zero Trust, EDR, SOC, SIEM, SOAR, Threat Intel — **30 skills**

```bash
npx skills add j4flmao/agent-skills --skill security-sast-dast --skill security-sbom --skill security-secrets-management --skill security-container-security --skill security-api-security --skill security-data-security --skill zero-trust-identity --skill red-team-pentest-methodology --skill edr-xdr --skill threat-intelligence --skill siem-engineering --skill soc-operations --skill redteam-operations --skill attack-patterns --skill exploit-development-concepts --skill blueteam-operations --skill detection-engineering --skill purpleteam-collaboration --skill cloud-native-security-offensive --skill cloud-native-security-defensive --skill reverse-engineering --skill advanced-binary-exploitation --skill malware-analysis-internals --skill blue-team-soc-operations --skill ebpf-threat-detection --skill modern-cryptography --skill owasp-web-security --skill devsecops --skill threat-modeling --skill security-reverse-engineering
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`security-sast-dast`](../skills/security/sast-dast/SKILL.md), [`security-sbom`](../skills/security/sbom/SKILL.md), [`security-secrets-management`](../skills/security/secrets-management/SKILL.md), [`security-container-security`](../skills/security/container-security/SKILL.md), [`security-api-security`](../skills/security/api-security/SKILL.md), [`security-data-security`](../skills/security/data-security/SKILL.md), [`zero-trust-identity`](../skills/cybersecurity/zero-trust-identity/SKILL.md), [`red-team-pentest-methodology`](../skills/cybersecurity/red-team-pentest/SKILL.md), [`edr-xdr`](../skills/security/edr-xdr/SKILL.md), [`threat-intelligence`](../skills/security/threat-intelligence/SKILL.md), [`siem-engineering`](../skills/security/siem-engineering/SKILL.md), [`soc-operations`](../skills/security/soc-operations/SKILL.md), [`redteam-operations`](../skills/security/redteam-operations/SKILL.md), [`attack-patterns`](../skills/security/attack-patterns/SKILL.md), [`exploit-development-concepts`](../skills/security/exploit-development-concepts/SKILL.md), [`blueteam-operations`](../skills/security/blueteam-operations/SKILL.md), [`detection-engineering`](../skills/security/detection-engineering/SKILL.md), [`purpleteam-collaboration`](../skills/security/purpleteam-collaboration/SKILL.md), [`cloud-native-security-offensive`](../skills/cloud-native/cloud-security-offensive/SKILL.md), [`cloud-native-security-defensive`](../skills/cloud-native/cloud-security-defensive/SKILL.md), [`reverse-engineering`](../skills/cybersecurity/reverse-engineering/SKILL.md), [`advanced-binary-exploitation`](../skills/security/advanced-binary-exploitation/SKILL.md), [`malware-analysis-internals`](../skills/security/malware-analysis-internals/SKILL.md), [`blue-team-soc-operations`](../skills/cybersecurity/blue-team-soc/SKILL.md), [`ebpf-threat-detection`](../skills/cybersecurity/ebpf-threat-detection/SKILL.md), [`modern-cryptography`](../skills/cybersecurity/modern-cryptography/SKILL.md), [`owasp-web-security`](../skills/cybersecurity/owasp-web-security/SKILL.md), [`devsecops`](../skills/security/devsecops/SKILL.md), [`threat-modeling`](../skills/security/threat-modeling/SKILL.md), [`security-reverse-engineering`](../skills/security/reverse-engineering/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@security-sast-dast",
    "j4flmao/agent-skills@security-sbom",
    "j4flmao/agent-skills@security-secrets-management",
    "j4flmao/agent-skills@security-container-security",
    "j4flmao/agent-skills@security-api-security",
    "j4flmao/agent-skills@security-data-security",
    "j4flmao/agent-skills@zero-trust-identity",
    "j4flmao/agent-skills@red-team-pentest-methodology",
    "j4flmao/agent-skills@edr-xdr",
    "j4flmao/agent-skills@threat-intelligence",
    "j4flmao/agent-skills@siem-engineering",
    "j4flmao/agent-skills@soc-operations",
    "j4flmao/agent-skills@redteam-operations",
    "j4flmao/agent-skills@attack-patterns",
    "j4flmao/agent-skills@exploit-development-concepts",
    "j4flmao/agent-skills@blueteam-operations",
    "j4flmao/agent-skills@detection-engineering",
    "j4flmao/agent-skills@purpleteam-collaboration",
    "j4flmao/agent-skills@cloud-native-security-offensive",
    "j4flmao/agent-skills@cloud-native-security-defensive",
    "j4flmao/agent-skills@reverse-engineering",
    "j4flmao/agent-skills@advanced-binary-exploitation",
    "j4flmao/agent-skills@malware-analysis-internals",
    "j4flmao/agent-skills@blue-team-soc-operations",
    "j4flmao/agent-skills@ebpf-threat-detection",
    "j4flmao/agent-skills@modern-cryptography",
    "j4flmao/agent-skills@owasp-web-security",
    "j4flmao/agent-skills@devsecops",
    "j4flmao/agent-skills@threat-modeling",
    "j4flmao/agent-skills@security-reverse-engineering"
  ]
}
```

</details>

### serverless-edge

Serverless and edge: Lambda/Functions, cold starts, Cloudflare Workers, orchestration, event-driven scaling, CDN — **9 skills**

```bash
npx skills add j4flmao/agent-skills --skill devops-serverless --skill backend-serverless --skill cloud-native-aws-serverless --skill cloud-native-azure-functions --skill cloud-native-serverless-cold-starts --skill cloud-native-cloudflare-workers --skill cloud-native-serverless-orchestration --skill cloud-native-event-driven-scaling --skill cdn-edge
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`devops-serverless`](../skills/devops/serverless/SKILL.md), [`backend-serverless`](../skills/backend/universal/serverless/SKILL.md), [`cloud-native-aws-serverless`](../skills/cloud-native/aws-serverless/SKILL.md), [`cloud-native-azure-functions`](../skills/cloud-native/azure-functions/SKILL.md), [`cloud-native-serverless-cold-starts`](../skills/cloud-native/serverless-cold-starts/SKILL.md), [`cloud-native-cloudflare-workers`](../skills/cloud-native/edge-computing/cloudflare-workers/SKILL.md), [`cloud-native-serverless-orchestration`](../skills/cloud-native/edge-computing/serverless-orchestration/SKILL.md), [`cloud-native-event-driven-scaling`](../skills/cloud-native/event-driven-scaling/SKILL.md), [`cdn-edge`](../skills/devops/cdn-edge/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@devops-serverless",
    "j4flmao/agent-skills@backend-serverless",
    "j4flmao/agent-skills@cloud-native-aws-serverless",
    "j4flmao/agent-skills@cloud-native-azure-functions",
    "j4flmao/agent-skills@cloud-native-serverless-cold-starts",
    "j4flmao/agent-skills@cloud-native-cloudflare-workers",
    "j4flmao/agent-skills@cloud-native-serverless-orchestration",
    "j4flmao/agent-skills@cloud-native-event-driven-scaling",
    "j4flmao/agent-skills@cdn-edge"
  ]
}
```

</details>

### soc-all

SOC: operations, SIEM engineering, SOAR automation, threat intelligence, EDR/XDR — **18 skills**

```bash
npx skills add j4flmao/agent-skills --skill soc-operations --skill siem-engineering --skill threat-intelligence --skill edr-xdr --skill security-sast-dast --skill security-sbom --skill security-secrets-management --skill security-container-security --skill security-api-security --skill security-data-security --skill docker-patterns --skill cicd-pipeline --skill github-actions --skill monitoring --skill alerting --skill team-rules --skill devops-incident-response --skill core-onboarding
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`soc-operations`](../skills/security/soc-operations/SKILL.md), [`siem-engineering`](../skills/security/siem-engineering/SKILL.md), [`threat-intelligence`](../skills/security/threat-intelligence/SKILL.md), [`edr-xdr`](../skills/security/edr-xdr/SKILL.md), [`security-sast-dast`](../skills/security/sast-dast/SKILL.md), [`security-sbom`](../skills/security/sbom/SKILL.md), [`security-secrets-management`](../skills/security/secrets-management/SKILL.md), [`security-container-security`](../skills/security/container-security/SKILL.md), [`security-api-security`](../skills/security/api-security/SKILL.md), [`security-data-security`](../skills/security/data-security/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`github-actions`](../skills/devops/github-actions/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`devops-incident-response`](../skills/devops/incident-response/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@soc-operations",
    "j4flmao/agent-skills@siem-engineering",
    "j4flmao/agent-skills@threat-intelligence",
    "j4flmao/agent-skills@edr-xdr",
    "j4flmao/agent-skills@security-sast-dast",
    "j4flmao/agent-skills@security-sbom",
    "j4flmao/agent-skills@security-secrets-management",
    "j4flmao/agent-skills@security-container-security",
    "j4flmao/agent-skills@security-api-security",
    "j4flmao/agent-skills@security-data-security",
    "j4flmao/agent-skills@docker-patterns",
    "j4flmao/agent-skills@cicd-pipeline",
    "j4flmao/agent-skills@github-actions",
    "j4flmao/agent-skills@monitoring",
    "j4flmao/agent-skills@alerting",
    "j4flmao/agent-skills@team-rules",
    "j4flmao/agent-skills@devops-incident-response",
    "j4flmao/agent-skills@core-onboarding"
  ]
}
```

</details>

### sre-reliability

Reliability engineering: SLOs, incident response, observability, chaos, capacity, HA, DR, alerting — **20 skills**

```bash
npx skills add j4flmao/agent-skills --skill sre-chaos-engineering --skill sre-incident-response --skill sre-observability-scaling --skill sre-sli-slo-management --skill devops-sre-practices --skill devops-incident-response --skill observability --skill opentelemetry-tracing --skill prometheus-grafana --skill monitoring --skill devops-opentelemetry --skill apm-observability --skill devops-chaos-engineering --skill backup-dr --skill enterprise-high-availability --skill enterprise-business-continuity --skill enterprise-capacity-planning --skill enterprise-sla-management --skill alerting --skill devops-sre-engineer
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`sre-chaos-engineering`](../skills/site-reliability-engineering/chaos-engineering/SKILL.md), [`sre-incident-response`](../skills/site-reliability-engineering/incident-response/SKILL.md), [`sre-observability-scaling`](../skills/site-reliability-engineering/observability-scaling/SKILL.md), [`sre-sli-slo-management`](../skills/site-reliability-engineering/sli-slo-management/SKILL.md), [`devops-sre-practices`](../skills/devops/sre-practices/SKILL.md), [`devops-incident-response`](../skills/devops/incident-response/SKILL.md), [`observability`](../skills/devops/observability/SKILL.md), [`opentelemetry-tracing`](../skills/devops/observability/opentelemetry-tracing/SKILL.md), [`prometheus-grafana`](../skills/devops/observability/prometheus-grafana/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`devops-opentelemetry`](../skills/devops/opentelemetry/SKILL.md), [`apm-observability`](../skills/devops/apm-observability/SKILL.md), [`devops-chaos-engineering`](../skills/devops/chaos-engineering/SKILL.md), [`backup-dr`](../skills/devops/backup-dr/SKILL.md), [`enterprise-high-availability`](../skills/enterprise/high-availability/SKILL.md), [`enterprise-business-continuity`](../skills/enterprise/business-continuity/SKILL.md), [`enterprise-capacity-planning`](../skills/enterprise/capacity-planning/SKILL.md), [`enterprise-sla-management`](../skills/enterprise/sla-management/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`devops-sre-engineer`](../skills/personas/devops-sre-engineer/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@sre-chaos-engineering",
    "j4flmao/agent-skills@sre-incident-response",
    "j4flmao/agent-skills@sre-observability-scaling",
    "j4flmao/agent-skills@sre-sli-slo-management",
    "j4flmao/agent-skills@devops-sre-practices",
    "j4flmao/agent-skills@devops-incident-response",
    "j4flmao/agent-skills@observability",
    "j4flmao/agent-skills@opentelemetry-tracing",
    "j4flmao/agent-skills@prometheus-grafana",
    "j4flmao/agent-skills@monitoring",
    "j4flmao/agent-skills@devops-opentelemetry",
    "j4flmao/agent-skills@apm-observability",
    "j4flmao/agent-skills@devops-chaos-engineering",
    "j4flmao/agent-skills@backup-dr",
    "j4flmao/agent-skills@enterprise-high-availability",
    "j4flmao/agent-skills@enterprise-business-continuity",
    "j4flmao/agent-skills@enterprise-capacity-planning",
    "j4flmao/agent-skills@enterprise-sla-management",
    "j4flmao/agent-skills@alerting",
    "j4flmao/agent-skills@devops-sre-engineer"
  ]
}
```

</details>

### starter-playbooks

End-to-end playbooks: AI SaaS, high-scale e-commerce, web3 dApp, with the core planning and orchestration skills — **7 skills**

```bash
npx skills add j4flmao/agent-skills --skill ai-saas-playbook --skill high-scale-ecommerce --skill web3-dapp-playbook --skill master-orchestrator --skill project-init --skill create-tech-spec --skill planning-create-roadmap
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`ai-saas-playbook`](../skills/playbooks/ai-saas/SKILL.md), [`high-scale-ecommerce`](../skills/playbooks/high-scale-ecommerce/SKILL.md), [`web3-dapp-playbook`](../skills/playbooks/web3-dapp/SKILL.md), [`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@ai-saas-playbook",
    "j4flmao/agent-skills@high-scale-ecommerce",
    "j4flmao/agent-skills@web3-dapp-playbook",
    "j4flmao/agent-skills@master-orchestrator",
    "j4flmao/agent-skills@project-init",
    "j4flmao/agent-skills@create-tech-spec",
    "j4flmao/agent-skills@planning-create-roadmap"
  ]
}
```

</details>

### systems-programming

Systems programming: C/C++/Rust/assembly, compilers, kernels, eBPF, networking, lock-free and kernel-bypass — **17 skills**

```bash
npx skills add j4flmao/agent-skills --skill lang-c --skill lang-cpp --skill lang-rust --skill lang-assembly --skill compiler-design --skill cpu-architecture --skill ebpf-engineering --skill kernel-development --skill network-protocols --skill kernel-bypass-dpdk --skill lock-free-ring-buffers --skill ebpf-xdp-networking --skill llvm-compiler-architecture --skill core-algorithms-system-design --skill system-design-database-sharding --skill distributed-consensus --skill system-design-rate-limiting
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`lang-c`](../skills/languages/c/SKILL.md), [`lang-cpp`](../skills/languages/cpp/SKILL.md), [`lang-rust`](../skills/languages/rust/SKILL.md), [`lang-assembly`](../skills/languages/assembly/SKILL.md), [`compiler-design`](../skills/low-level/compiler-design/SKILL.md), [`cpu-architecture`](../skills/low-level/cpu-architecture/SKILL.md), [`ebpf-engineering`](../skills/low-level/ebpf-engineering/SKILL.md), [`kernel-development`](../skills/low-level/kernel-development/SKILL.md), [`network-protocols`](../skills/low-level/network-protocols/SKILL.md), [`kernel-bypass-dpdk`](../skills/niche/hft/kernel-bypass-dpdk/SKILL.md), [`lock-free-ring-buffers`](../skills/niche/hft/lock-free-ring-buffers/SKILL.md), [`ebpf-xdp-networking`](../skills/niche/low-level/ebpf-xdp-networking/SKILL.md), [`llvm-compiler-architecture`](../skills/niche/low-level/llvm-compiler-architecture/SKILL.md), [`core-algorithms-system-design`](../skills/system-design/core-algorithms/SKILL.md), [`system-design-database-sharding`](../skills/system-design/database-sharding/SKILL.md), [`distributed-consensus`](../skills/system-design/distributed-consensus/SKILL.md), [`system-design-rate-limiting`](../skills/system-design/rate-limiting/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@lang-c",
    "j4flmao/agent-skills@lang-cpp",
    "j4flmao/agent-skills@lang-rust",
    "j4flmao/agent-skills@lang-assembly",
    "j4flmao/agent-skills@compiler-design",
    "j4flmao/agent-skills@cpu-architecture",
    "j4flmao/agent-skills@ebpf-engineering",
    "j4flmao/agent-skills@kernel-development",
    "j4flmao/agent-skills@network-protocols",
    "j4flmao/agent-skills@kernel-bypass-dpdk",
    "j4flmao/agent-skills@lock-free-ring-buffers",
    "j4flmao/agent-skills@ebpf-xdp-networking",
    "j4flmao/agent-skills@llvm-compiler-architecture",
    "j4flmao/agent-skills@core-algorithms-system-design",
    "j4flmao/agent-skills@system-design-database-sharding",
    "j4flmao/agent-skills@distributed-consensus",
    "j4flmao/agent-skills@system-design-rate-limiting"
  ]
}
```

</details>

### web-performance-seo

Web performance and SEO: Core Web Vitals, rendering strategies, images, caching, structured data, programmatic SEO — **14 skills**

```bash
npx skills add j4flmao/agent-skills --skill seo-fundamentals --skill seo-ai-content-optimization --skill programmatic-seo --skill seo-structured-data --skill web-micro-frontends-import-maps --skill nextjs-server-components --skill web-performance --skill web3d-webgl --skill frontend-performance --skill frontend-image-optimization --skill frontend-rendering-strategies --skill frontend-browser-caching --skill frontend-seo --skill nextjs-internals
```

<details><summary>Skills and team skill pack (package.json)</summary>

[`seo-fundamentals`](../skills/seo/SKILL.md), [`seo-ai-content-optimization`](../skills/seo/ai-content-optimization/SKILL.md), [`programmatic-seo`](../skills/seo/programmatic-seo/SKILL.md), [`seo-structured-data`](../skills/seo/structured-data/SKILL.md), [`web-micro-frontends-import-maps`](../skills/web/micro-frontends/SKILL.md), [`nextjs-server-components`](../skills/web/nextjs-server-components/SKILL.md), [`web-performance`](../skills/web/performance/SKILL.md), [`web3d-webgl`](../skills/web/web3d/SKILL.md), [`frontend-performance`](../skills/frontend/universal/performance/SKILL.md), [`frontend-image-optimization`](../skills/frontend/universal/image-optimization/SKILL.md), [`frontend-rendering-strategies`](../skills/frontend/universal/rendering-strategies/SKILL.md), [`frontend-browser-caching`](../skills/frontend/universal/browser-caching/SKILL.md), [`frontend-seo`](../skills/frontend/universal/seo/SKILL.md), [`nextjs-internals`](../skills/frontend/nextjs/internals/SKILL.md)

```json
{
  "skills": [
    "j4flmao/agent-skills@seo-fundamentals",
    "j4flmao/agent-skills@seo-ai-content-optimization",
    "j4flmao/agent-skills@programmatic-seo",
    "j4flmao/agent-skills@seo-structured-data",
    "j4flmao/agent-skills@web-micro-frontends-import-maps",
    "j4flmao/agent-skills@nextjs-server-components",
    "j4flmao/agent-skills@web-performance",
    "j4flmao/agent-skills@web3d-webgl",
    "j4flmao/agent-skills@frontend-performance",
    "j4flmao/agent-skills@frontend-image-optimization",
    "j4flmao/agent-skills@frontend-rendering-strategies",
    "j4flmao/agent-skills@frontend-browser-caching",
    "j4flmao/agent-skills@frontend-seo",
    "j4flmao/agent-skills@nextjs-internals"
  ]
}
```

</details>

## Broad bundles

Stack or role bundles with 60+ skills. Good for exploring; for daily work start from a [track](README.md#pick-your-track) instead.

### fullstack-nestjs-react

Full stack: NestJS backend + React frontend — **225 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-brief --skill create-prd --skill create-tech-spec --skill create-story --skill design-patterns --skill microservices --skill backend-clean-architecture --skill backend-api-design --skill backend-api-response --skill backend-database-patterns --skill backend-auth-patterns --skill quality-unit-testing --skill quality-integration-testing --skill frontend-design-system --skill frontend-state-management --skill frontend-performance --skill frontend-accessibility --skill frontend-testing --skill frontend-patterns --skill microfrontend --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-security-auditor --skill dev-loop-git-workflow --skill docker-patterns --skill cicd-pipeline --skill helm-patterns --skill terraform --skill ansible --skill monitoring --skill alerting --skill team-rules --skill security --skill pentesting --skill backend-grpc-patterns --skill backend-websocket-patterns --skill backend-message-queue --skill backend-caching --skill rate-limiting --skill quality-load-testing --skill frontend-tailwind-css --skill frontend-storybook --skill frontend-pwa --skill frontend-seo --skill github-actions --skill gitops --skill vault --skill aws --skill backend-serverless --skill devops-serverless --skill monorepo --skill dependency-management --skill api-documentation --skill backend-graphql-patterns --skill backend-background-jobs --skill backend-search-patterns --skill data-streaming --skill backend-file-storage --skill backend-feature-flags --skill frontend-feature-flags --skill backend-internationalization --skill frontend-internationalization --skill backend-structured-logging --skill frontend-animation --skill frontend-form-handling --skill frontend-data-fetching --skill frontend-bundler-tools --skill frontend-image-optimization --skill frontend-theming --skill mobile-kotlin-multiplatform --skill mobile-ionic-capacitor --skill mobile-dotnet-maui --skill mobile-deep-linking --skill mobile-offline-first --skill mobile-biometrics --skill map-location --skill mobile-camera-media --skill product-analytics --skill argo-cd --skill devops-azure --skill devops-gcp --skill devops-chaos-engineering --skill devops-service-mesh --skill devops-finops --skill backup-dr --skill database-migration --skill dev-loop-pr-writer --skill dev-loop-dev-container --skill dev-loop-tech-debt-tracker --skill dev-loop-api-client-generator --skill management-okr-kpi --skill sprint-retro --skill management-risk-management --skill planning-create-roadmap --skill planning-create-pitch-deck --skill planning-market-analysis --skill core-onboarding --skill core-context-compressor --skill enterprise-compliance-audit --skill enterprise-multi-tenant --skill enterprise-integration-patterns --skill enterprise-data-governance --skill enterprise-sla-management --skill enterprise-legacy-migration --skill enterprise-identity-provider --skill enterprise-cost-governance --skill product-ab-testing --skill product-user-research --skill product-growth-engineering --skill product-pricing-strategy --skill product-go-to-market --skill product-onboarding-flow --skill prompt-chain-of-thought --skill prompt-few-shot --skill prompt-tree-of-thoughts --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill ml-inference-optimization --skill llm-kv-cache-paged-attention --skill data-vector-databases --skill ai-agent-architectures --skill agent-observability --skill security-sast-dast --skill security-sbom --skill security-secrets-management --skill security-container-security --skill security-api-security --skill data-etl-pipeline --skill data-data-warehouse --skill data-bi-tools --skill data-data-quality --skill design-systems --skill design-ux-research --skill design-accessibility --skill design-motion-design --skill quality-e2e-testing --skill quality-visual-testing --skill quality-contract-testing --skill frontend-lit --skill frontend-web-components --skill mobile-ar-vr --skill nomad --skill devops-incident-response --skill cost-benefit --skill management-hiring --skill management-stakeholder --skill ml-experiment-tracking --skill ml-classical-ml --skill ml-deep-learning --skill ml-feature-engineering --skill ml-hyperparameter-tuning --skill ml-model-evaluation --skill ml-model-interpretability --skill ml-time-series --skill ml-nlp --skill ml-computer-vision --skill ml-recommendation-systems --skill ml-anomaly-detection --skill ml-ml-pipeline --skill ml-feature-store --skill ml-model-serving --skill data-distributed-storage --skill data-distributed-compute --skill data-data-lake --skill data-data-lakehouse --skill data-batch-processing --skill data-data-platform --skill data-data-catalog --skill data-data-observability --skill data-data-contracts --skill data-data-mesh --skill data-data-versioning --skill data-data-api --skill data-data-virtualization --skill data-schema-registry --skill data-relational-database --skill data-nosql-database --skill data-graph-database --skill data-search-engine --skill llm-finetuning --skill genai-vision --skill multimodal-pipelines --skill ai-defense-mechanisms --skill ai-agentic-workflows --skill tool-calling-principles --skill devops-dataops --skill devops-mlops --skill devops-kubernetes-for-data --skill cloud-cost-optimization --skill security-data-security --skill planning-bpmn-modeling --skill planning-bdd-atdd --skill agile-scrum-kanban --skill management-team-topology --skill management-change-management --skill quality-acceptance-testing --skill quality-regression-testing --skill quality-smoke-testing --skill data-data-strategy --skill data-dimensional-modeling --skill data-science-statistical-analysis --skill data-science-experimentation --skill data-science-causal-inference --skill data-science-analytics-engineering --skill enterprise-togaf-zachman --skill enterprise-itil-service-mgmt --skill enterprise-vendor-management --skill enterprise-architecture-governance --skill product-customer-journey --skill product-persona-development --skill nestjs-architecture --skill nestjs-patterns --skill nodejs-architecture --skill nodejs-drizzle --skill nodejs-express-skill --skill nodejs-fastify --skill nodejs-hono --skill nodejs-patterns --skill nodejs-prisma --skill react-architecture --skill react-nextjs --skill react-fiber-architecture --skill react-server-components
```

</details>

<details><summary>Skills</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`create-story`](../skills/planning/create-story/SKILL.md), [`design-patterns`](../skills/backend/universal/design-patterns/SKILL.md), [`microservices`](../skills/backend/universal/microservices/SKILL.md), [`backend-clean-architecture`](../skills/backend/universal/clean-architecture/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-api-response`](../skills/backend/universal/api-response/SKILL.md), [`backend-database-patterns`](../skills/backend/universal/database-patterns/SKILL.md), [`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`quality-unit-testing`](../skills/quality/unit-testing/SKILL.md), [`quality-integration-testing`](../skills/quality/integration-testing/SKILL.md), [`frontend-design-system`](../skills/frontend/universal/design-system/SKILL.md), [`frontend-state-management`](../skills/frontend/universal/state-management/SKILL.md), [`frontend-performance`](../skills/frontend/universal/performance/SKILL.md), [`frontend-accessibility`](../skills/frontend/universal/accessibility/SKILL.md), [`frontend-testing`](../skills/frontend/universal/testing/SKILL.md), [`frontend-patterns`](../skills/frontend/universal/patterns/SKILL.md), [`microfrontend`](../skills/frontend/universal/microfrontend/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-security-auditor`](../skills/dev-loop/security-auditor/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`helm-patterns`](../skills/devops/helm-patterns/SKILL.md), [`terraform`](../skills/devops/terraform/SKILL.md), [`ansible`](../skills/devops/ansible/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`backend-grpc-patterns`](../skills/backend/universal/grpc-patterns/SKILL.md), [`backend-websocket-patterns`](../skills/backend/universal/websocket-patterns/SKILL.md), [`backend-message-queue`](../skills/backend/universal/message-queue/SKILL.md), [`backend-caching`](../skills/backend/universal/caching/SKILL.md), [`rate-limiting`](../skills/backend/universal/rate-limiting/SKILL.md), [`quality-load-testing`](../skills/quality/load-testing/SKILL.md), [`frontend-tailwind-css`](../skills/frontend/universal/tailwind-css/SKILL.md), [`frontend-storybook`](../skills/frontend/universal/storybook/SKILL.md), [`frontend-pwa`](../skills/frontend/universal/pwa/SKILL.md), [`frontend-seo`](../skills/frontend/universal/seo/SKILL.md), [`github-actions`](../skills/devops/github-actions/SKILL.md), [`gitops`](../skills/devops/gitops/SKILL.md), [`vault`](../skills/devops/vault/SKILL.md), [`aws`](../skills/devops/aws/SKILL.md), [`backend-serverless`](../skills/backend/universal/serverless/SKILL.md), [`devops-serverless`](../skills/devops/serverless/SKILL.md), [`monorepo`](../skills/devops/monorepo/SKILL.md), [`dependency-management`](../skills/devops/dependency-management/SKILL.md), [`api-documentation`](../skills/devops/api-documentation/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`frontend-feature-flags`](../skills/frontend/universal/feature-flags/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`frontend-internationalization`](../skills/frontend/universal/internationalization/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`frontend-animation`](../skills/frontend/universal/animation/SKILL.md), [`frontend-form-handling`](../skills/frontend/universal/form-handling/SKILL.md), [`frontend-data-fetching`](../skills/frontend/universal/data-fetching/SKILL.md), [`frontend-bundler-tools`](../skills/frontend/universal/bundler-tools/SKILL.md), [`frontend-image-optimization`](../skills/frontend/universal/image-optimization/SKILL.md), [`frontend-theming`](../skills/frontend/universal/theming/SKILL.md), [`mobile-kotlin-multiplatform`](../skills/mobile/kotlin-multiplatform/SKILL.md), [`mobile-ionic-capacitor`](../skills/mobile/ionic-capacitor/SKILL.md), [`mobile-dotnet-maui`](../skills/mobile/dotnet-maui/SKILL.md), [`mobile-deep-linking`](../skills/mobile/universal/deep-linking/SKILL.md), [`mobile-offline-first`](../skills/mobile/universal/offline-first/SKILL.md), [`mobile-biometrics`](../skills/mobile/universal/biometrics/SKILL.md), [`map-location`](../skills/mobile/universal/map-location/SKILL.md), [`mobile-camera-media`](../skills/mobile/universal/camera-media/SKILL.md), [`product-analytics`](../skills/product/analytics/SKILL.md), [`argo-cd`](../skills/devops/argo-cd/SKILL.md), [`devops-azure`](../skills/devops/azure/SKILL.md), [`devops-gcp`](../skills/devops/gcp/SKILL.md), [`devops-chaos-engineering`](../skills/devops/chaos-engineering/SKILL.md), [`devops-service-mesh`](../skills/devops/service-mesh/SKILL.md), [`devops-finops`](../skills/devops/finops/SKILL.md), [`backup-dr`](../skills/devops/backup-dr/SKILL.md), [`database-migration`](../skills/devops/database-migration/SKILL.md), [`dev-loop-pr-writer`](../skills/dev-loop/pr-writer/SKILL.md), [`dev-loop-dev-container`](../skills/dev-loop/dev-container/SKILL.md), [`dev-loop-tech-debt-tracker`](../skills/dev-loop/tech-debt-tracker/SKILL.md), [`dev-loop-api-client-generator`](../skills/dev-loop/api-client-generator/SKILL.md), [`management-okr-kpi`](../skills/management/okr-kpi/SKILL.md), [`sprint-retro`](../skills/management/sprint-retro/SKILL.md), [`management-risk-management`](../skills/management/risk-management/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md), [`planning-create-pitch-deck`](../skills/planning/create-pitch-deck/SKILL.md), [`planning-market-analysis`](../skills/planning/market-analysis/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md), [`enterprise-multi-tenant`](../skills/enterprise/multi-tenant/SKILL.md), [`enterprise-integration-patterns`](../skills/enterprise/integration-patterns/SKILL.md), [`enterprise-data-governance`](../skills/enterprise/data-governance/SKILL.md), [`enterprise-sla-management`](../skills/enterprise/sla-management/SKILL.md), [`enterprise-legacy-migration`](../skills/enterprise/legacy-migration/SKILL.md), [`enterprise-identity-provider`](../skills/enterprise/identity-provider/SKILL.md), [`enterprise-cost-governance`](../skills/enterprise/cost-governance/SKILL.md), [`product-ab-testing`](../skills/product/ab-testing/SKILL.md), [`product-user-research`](../skills/product/user-research/SKILL.md), [`product-growth-engineering`](../skills/product/growth-engineering/SKILL.md), [`product-pricing-strategy`](../skills/product/pricing-strategy/SKILL.md), [`product-go-to-market`](../skills/product/go-to-market/SKILL.md), [`product-onboarding-flow`](../skills/product/onboarding-flow/SKILL.md), [`prompt-chain-of-thought`](../skills/prompt-engineering/chain-of-thought/SKILL.md), [`prompt-few-shot`](../skills/prompt-engineering/few-shot-prompting/SKILL.md), [`prompt-tree-of-thoughts`](../skills/prompt-engineering/tree-of-thoughts/SKILL.md), [`llm-rag-retrieval-internals`](../skills/ai/llm-engineering/rag-architecture/SKILL.md), [`prompt-rag-query-design`](../skills/prompt-engineering/rag-design/SKILL.md), [`ml-inference-optimization`](../skills/ml/inference-optimization/SKILL.md), [`llm-kv-cache-paged-attention`](../skills/ai/llm-engineering/kv-cache/SKILL.md), [`data-vector-databases`](../skills/data/vector-databases/SKILL.md), [`ai-agent-architectures`](../skills/ai/ai-agents/SKILL.md), [`agent-observability`](../skills/harness-engineering/agent-observability/SKILL.md), [`security-sast-dast`](../skills/security/sast-dast/SKILL.md), [`security-sbom`](../skills/security/sbom/SKILL.md), [`security-secrets-management`](../skills/security/secrets-management/SKILL.md), [`security-container-security`](../skills/security/container-security/SKILL.md), [`security-api-security`](../skills/security/api-security/SKILL.md), [`data-etl-pipeline`](../skills/data/etl-pipeline/SKILL.md), [`data-data-warehouse`](../skills/data/data-warehouse/SKILL.md), [`data-bi-tools`](../skills/data/bi-tools/SKILL.md), [`data-data-quality`](../skills/data/data-quality/SKILL.md), [`design-systems`](../skills/design/design-systems/SKILL.md), [`design-ux-research`](../skills/design/ux-research/SKILL.md), [`design-accessibility`](../skills/design/accessibility/SKILL.md), [`design-motion-design`](../skills/design/motion-design/SKILL.md), [`quality-e2e-testing`](../skills/quality/quality-e2e-testing/SKILL.md), [`quality-visual-testing`](../skills/quality/visual-testing/SKILL.md), [`quality-contract-testing`](../skills/quality/contract-testing/SKILL.md), [`frontend-lit`](../skills/frontend/lit/SKILL.md), [`frontend-web-components`](../skills/frontend/universal/web-components/SKILL.md), [`mobile-ar-vr`](../skills/mobile/universal/ar-vr/SKILL.md), [`nomad`](../skills/devops/nomad/SKILL.md), [`devops-incident-response`](../skills/devops/incident-response/SKILL.md), [`cost-benefit`](../skills/management/cost-benefit/SKILL.md), [`management-hiring`](../skills/management/hiring/SKILL.md), [`management-stakeholder`](../skills/management/stakeholder/SKILL.md), [`ml-experiment-tracking`](../skills/ml/experiment-tracking/SKILL.md), [`ml-classical-ml`](../skills/ml/classical-ml/SKILL.md), [`ml-deep-learning`](../skills/ml/deep-learning/SKILL.md), [`ml-feature-engineering`](../skills/ml/feature-engineering/SKILL.md), [`ml-hyperparameter-tuning`](../skills/ml/hyperparameter-tuning/SKILL.md), [`ml-model-evaluation`](../skills/ml/model-evaluation/SKILL.md), [`ml-model-interpretability`](../skills/ml/model-interpretability/SKILL.md), [`ml-time-series`](../skills/ml/time-series/SKILL.md), [`ml-nlp`](../skills/ml/nlp/SKILL.md), [`ml-computer-vision`](../skills/ml/computer-vision/SKILL.md), [`ml-recommendation-systems`](../skills/ml/recommendation-systems/SKILL.md), [`ml-anomaly-detection`](../skills/ml/anomaly-detection/SKILL.md), [`ml-ml-pipeline`](../skills/ml/ml-pipeline/SKILL.md), [`ml-feature-store`](../skills/ml/feature-store/SKILL.md), [`ml-model-serving`](../skills/ml/model-serving/SKILL.md), [`data-distributed-storage`](../skills/data/distributed-storage/SKILL.md), [`data-distributed-compute`](../skills/data/distributed-compute/SKILL.md), [`data-data-lake`](../skills/data/data-lake/SKILL.md), [`data-data-lakehouse`](../skills/data/data-lakehouse/SKILL.md), [`data-batch-processing`](../skills/data/batch-processing/SKILL.md), [`data-data-platform`](../skills/data/data-platform/SKILL.md), [`data-data-catalog`](../skills/data/data-catalog/SKILL.md), [`data-data-observability`](../skills/data/data-observability/SKILL.md), [`data-data-contracts`](../skills/data/data-contracts/SKILL.md), [`data-data-mesh`](../skills/data/data-mesh/SKILL.md), [`data-data-versioning`](../skills/data/data-versioning/SKILL.md), [`data-data-api`](../skills/data/data-api/SKILL.md), [`data-data-virtualization`](../skills/data/data-virtualization/SKILL.md), [`data-schema-registry`](../skills/data/schema-registry/SKILL.md), [`data-relational-database`](../skills/data/relational-database/SKILL.md), [`data-nosql-database`](../skills/data/nosql-database/SKILL.md), [`data-graph-database`](../skills/data/graph-database/SKILL.md), [`data-search-engine`](../skills/data/search-engine/SKILL.md), [`llm-finetuning`](../skills/ai/llm-finetuning/SKILL.md), [`genai-vision`](../skills/ai/genai-vision/SKILL.md), [`multimodal-pipelines`](../skills/rnd/ai-agents/multimodal-pipelines/SKILL.md), [`ai-defense-mechanisms`](../skills/rnd/security/ai-defense-mechanisms/SKILL.md), [`ai-agentic-workflows`](../skills/ai/agentic-workflows/SKILL.md), [`tool-calling-principles`](../skills/ai/ai-agents/tool-calling-principles/SKILL.md), [`devops-dataops`](../skills/devops/dataops/SKILL.md), [`devops-mlops`](../skills/devops/mlops/SKILL.md), [`devops-kubernetes-for-data`](../skills/devops/kubernetes-for-data/SKILL.md), [`cloud-cost-optimization`](../skills/devops/cloud-cost-optimization/SKILL.md), [`security-data-security`](../skills/security/data-security/SKILL.md), [`planning-bpmn-modeling`](../skills/planning/bpmn-modeling/SKILL.md), [`planning-bdd-atdd`](../skills/planning/bdd-atdd/SKILL.md), [`agile-scrum-kanban`](../skills/management/agile-scrum-kanban/SKILL.md), [`management-team-topology`](../skills/management/team-topology/SKILL.md), [`management-change-management`](../skills/management/change-management/SKILL.md), [`quality-acceptance-testing`](../skills/quality/acceptance-testing/SKILL.md), [`quality-regression-testing`](../skills/quality/regression-testing/SKILL.md), [`quality-smoke-testing`](../skills/quality/smoke-testing/SKILL.md), [`data-data-strategy`](../skills/data/data-strategy/SKILL.md), [`data-dimensional-modeling`](../skills/data/dimensional-modeling/SKILL.md), [`data-science-statistical-analysis`](../skills/data-science/statistical-analysis/SKILL.md), [`data-science-experimentation`](../skills/data-science/experimentation/SKILL.md), [`data-science-causal-inference`](../skills/data-science/causal-inference/SKILL.md), [`data-science-analytics-engineering`](../skills/data-science/analytics-engineering/SKILL.md), [`enterprise-togaf-zachman`](../skills/enterprise/togaf-zachman/SKILL.md), [`enterprise-itil-service-mgmt`](../skills/enterprise/itil-service-mgmt/SKILL.md), [`enterprise-vendor-management`](../skills/enterprise/vendor-management/SKILL.md), [`enterprise-architecture-governance`](../skills/enterprise/architecture-governance/SKILL.md), [`product-customer-journey`](../skills/product/customer-journey/SKILL.md), [`product-persona-development`](../skills/product/persona-development/SKILL.md), [`nestjs-architecture`](../skills/backend/nestjs/architecture/SKILL.md), [`nestjs-patterns`](../skills/backend/nestjs/patterns/SKILL.md), [`nodejs-architecture`](../skills/backend/nodejs/architecture/SKILL.md), [`nodejs-drizzle`](../skills/backend/nodejs/drizzle/SKILL.md), [`nodejs-express-skill`](../skills/backend/nodejs/express/SKILL.md), [`nodejs-fastify`](../skills/backend/nodejs/fastify/SKILL.md), [`nodejs-hono`](../skills/backend/nodejs/hono/SKILL.md), [`nodejs-patterns`](../skills/backend/nodejs/patterns/SKILL.md), [`nodejs-prisma`](../skills/backend/nodejs/prisma/SKILL.md), [`react-architecture`](../skills/frontend/react/architecture/SKILL.md), [`react-nextjs`](../skills/frontend/react/nextjs/SKILL.md), [`react-fiber-architecture`](../skills/frontend/react/react-fiber/SKILL.md), [`react-server-components`](../skills/frontend/advanced-architecture/react-server-components/SKILL.md)

</details>

### fullstack-golang-vue

Full stack: Go backend + Vue frontend — **218 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-brief --skill create-prd --skill create-tech-spec --skill create-story --skill design-patterns --skill microservices --skill backend-clean-architecture --skill backend-api-design --skill backend-api-response --skill backend-database-patterns --skill backend-auth-patterns --skill quality-unit-testing --skill quality-integration-testing --skill frontend-design-system --skill frontend-state-management --skill frontend-performance --skill frontend-accessibility --skill frontend-testing --skill frontend-patterns --skill microfrontend --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-security-auditor --skill dev-loop-git-workflow --skill docker-patterns --skill cicd-pipeline --skill helm-patterns --skill terraform --skill ansible --skill monitoring --skill alerting --skill team-rules --skill security --skill pentesting --skill backend-grpc-patterns --skill backend-websocket-patterns --skill backend-message-queue --skill backend-caching --skill rate-limiting --skill quality-load-testing --skill frontend-tailwind-css --skill frontend-storybook --skill frontend-pwa --skill frontend-seo --skill github-actions --skill gitops --skill vault --skill aws --skill backend-serverless --skill devops-serverless --skill monorepo --skill dependency-management --skill api-documentation --skill backend-graphql-patterns --skill backend-background-jobs --skill backend-search-patterns --skill data-streaming --skill backend-file-storage --skill backend-feature-flags --skill frontend-feature-flags --skill backend-internationalization --skill frontend-internationalization --skill backend-structured-logging --skill frontend-animation --skill frontend-form-handling --skill frontend-data-fetching --skill frontend-bundler-tools --skill frontend-image-optimization --skill frontend-theming --skill mobile-kotlin-multiplatform --skill mobile-ionic-capacitor --skill mobile-dotnet-maui --skill mobile-deep-linking --skill mobile-offline-first --skill mobile-biometrics --skill map-location --skill mobile-camera-media --skill product-analytics --skill argo-cd --skill devops-azure --skill devops-gcp --skill devops-chaos-engineering --skill devops-service-mesh --skill devops-finops --skill backup-dr --skill database-migration --skill dev-loop-pr-writer --skill dev-loop-dev-container --skill dev-loop-tech-debt-tracker --skill dev-loop-api-client-generator --skill management-okr-kpi --skill sprint-retro --skill management-risk-management --skill planning-create-roadmap --skill planning-create-pitch-deck --skill planning-market-analysis --skill core-onboarding --skill core-context-compressor --skill enterprise-compliance-audit --skill enterprise-multi-tenant --skill enterprise-integration-patterns --skill enterprise-data-governance --skill enterprise-sla-management --skill enterprise-legacy-migration --skill enterprise-identity-provider --skill enterprise-cost-governance --skill product-ab-testing --skill product-user-research --skill product-growth-engineering --skill product-pricing-strategy --skill product-go-to-market --skill product-onboarding-flow --skill prompt-chain-of-thought --skill prompt-few-shot --skill prompt-tree-of-thoughts --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill ml-inference-optimization --skill llm-kv-cache-paged-attention --skill data-vector-databases --skill ai-agent-architectures --skill agent-observability --skill security-sast-dast --skill security-sbom --skill security-secrets-management --skill security-container-security --skill security-api-security --skill data-etl-pipeline --skill data-data-warehouse --skill data-bi-tools --skill data-data-quality --skill design-systems --skill design-ux-research --skill design-accessibility --skill design-motion-design --skill quality-e2e-testing --skill quality-visual-testing --skill quality-contract-testing --skill frontend-lit --skill frontend-web-components --skill mobile-ar-vr --skill nomad --skill devops-incident-response --skill cost-benefit --skill management-hiring --skill management-stakeholder --skill ml-experiment-tracking --skill ml-classical-ml --skill ml-deep-learning --skill ml-feature-engineering --skill ml-hyperparameter-tuning --skill ml-model-evaluation --skill ml-model-interpretability --skill ml-time-series --skill ml-nlp --skill ml-computer-vision --skill ml-recommendation-systems --skill ml-anomaly-detection --skill ml-ml-pipeline --skill ml-feature-store --skill ml-model-serving --skill data-distributed-storage --skill data-distributed-compute --skill data-data-lake --skill data-data-lakehouse --skill data-batch-processing --skill data-data-platform --skill data-data-catalog --skill data-data-observability --skill data-data-contracts --skill data-data-mesh --skill data-data-versioning --skill data-data-api --skill data-data-virtualization --skill data-schema-registry --skill data-relational-database --skill data-nosql-database --skill data-graph-database --skill data-search-engine --skill llm-finetuning --skill genai-vision --skill multimodal-pipelines --skill ai-defense-mechanisms --skill ai-agentic-workflows --skill tool-calling-principles --skill devops-dataops --skill devops-mlops --skill devops-kubernetes-for-data --skill cloud-cost-optimization --skill security-data-security --skill planning-bpmn-modeling --skill planning-bdd-atdd --skill agile-scrum-kanban --skill management-team-topology --skill management-change-management --skill quality-acceptance-testing --skill quality-regression-testing --skill quality-smoke-testing --skill data-data-strategy --skill data-dimensional-modeling --skill data-science-statistical-analysis --skill data-science-experimentation --skill data-science-causal-inference --skill data-science-analytics-engineering --skill enterprise-togaf-zachman --skill enterprise-itil-service-mgmt --skill enterprise-vendor-management --skill enterprise-architecture-governance --skill product-customer-journey --skill product-persona-development --skill golang-architecture --skill golang-patterns --skill go --skill vue-architecture --skill vue-nuxt --skill frontend-vue-patterns
```

</details>

<details><summary>Skills</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`create-story`](../skills/planning/create-story/SKILL.md), [`design-patterns`](../skills/backend/universal/design-patterns/SKILL.md), [`microservices`](../skills/backend/universal/microservices/SKILL.md), [`backend-clean-architecture`](../skills/backend/universal/clean-architecture/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-api-response`](../skills/backend/universal/api-response/SKILL.md), [`backend-database-patterns`](../skills/backend/universal/database-patterns/SKILL.md), [`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`quality-unit-testing`](../skills/quality/unit-testing/SKILL.md), [`quality-integration-testing`](../skills/quality/integration-testing/SKILL.md), [`frontend-design-system`](../skills/frontend/universal/design-system/SKILL.md), [`frontend-state-management`](../skills/frontend/universal/state-management/SKILL.md), [`frontend-performance`](../skills/frontend/universal/performance/SKILL.md), [`frontend-accessibility`](../skills/frontend/universal/accessibility/SKILL.md), [`frontend-testing`](../skills/frontend/universal/testing/SKILL.md), [`frontend-patterns`](../skills/frontend/universal/patterns/SKILL.md), [`microfrontend`](../skills/frontend/universal/microfrontend/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-security-auditor`](../skills/dev-loop/security-auditor/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`helm-patterns`](../skills/devops/helm-patterns/SKILL.md), [`terraform`](../skills/devops/terraform/SKILL.md), [`ansible`](../skills/devops/ansible/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`backend-grpc-patterns`](../skills/backend/universal/grpc-patterns/SKILL.md), [`backend-websocket-patterns`](../skills/backend/universal/websocket-patterns/SKILL.md), [`backend-message-queue`](../skills/backend/universal/message-queue/SKILL.md), [`backend-caching`](../skills/backend/universal/caching/SKILL.md), [`rate-limiting`](../skills/backend/universal/rate-limiting/SKILL.md), [`quality-load-testing`](../skills/quality/load-testing/SKILL.md), [`frontend-tailwind-css`](../skills/frontend/universal/tailwind-css/SKILL.md), [`frontend-storybook`](../skills/frontend/universal/storybook/SKILL.md), [`frontend-pwa`](../skills/frontend/universal/pwa/SKILL.md), [`frontend-seo`](../skills/frontend/universal/seo/SKILL.md), [`github-actions`](../skills/devops/github-actions/SKILL.md), [`gitops`](../skills/devops/gitops/SKILL.md), [`vault`](../skills/devops/vault/SKILL.md), [`aws`](../skills/devops/aws/SKILL.md), [`backend-serverless`](../skills/backend/universal/serverless/SKILL.md), [`devops-serverless`](../skills/devops/serverless/SKILL.md), [`monorepo`](../skills/devops/monorepo/SKILL.md), [`dependency-management`](../skills/devops/dependency-management/SKILL.md), [`api-documentation`](../skills/devops/api-documentation/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`frontend-feature-flags`](../skills/frontend/universal/feature-flags/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`frontend-internationalization`](../skills/frontend/universal/internationalization/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`frontend-animation`](../skills/frontend/universal/animation/SKILL.md), [`frontend-form-handling`](../skills/frontend/universal/form-handling/SKILL.md), [`frontend-data-fetching`](../skills/frontend/universal/data-fetching/SKILL.md), [`frontend-bundler-tools`](../skills/frontend/universal/bundler-tools/SKILL.md), [`frontend-image-optimization`](../skills/frontend/universal/image-optimization/SKILL.md), [`frontend-theming`](../skills/frontend/universal/theming/SKILL.md), [`mobile-kotlin-multiplatform`](../skills/mobile/kotlin-multiplatform/SKILL.md), [`mobile-ionic-capacitor`](../skills/mobile/ionic-capacitor/SKILL.md), [`mobile-dotnet-maui`](../skills/mobile/dotnet-maui/SKILL.md), [`mobile-deep-linking`](../skills/mobile/universal/deep-linking/SKILL.md), [`mobile-offline-first`](../skills/mobile/universal/offline-first/SKILL.md), [`mobile-biometrics`](../skills/mobile/universal/biometrics/SKILL.md), [`map-location`](../skills/mobile/universal/map-location/SKILL.md), [`mobile-camera-media`](../skills/mobile/universal/camera-media/SKILL.md), [`product-analytics`](../skills/product/analytics/SKILL.md), [`argo-cd`](../skills/devops/argo-cd/SKILL.md), [`devops-azure`](../skills/devops/azure/SKILL.md), [`devops-gcp`](../skills/devops/gcp/SKILL.md), [`devops-chaos-engineering`](../skills/devops/chaos-engineering/SKILL.md), [`devops-service-mesh`](../skills/devops/service-mesh/SKILL.md), [`devops-finops`](../skills/devops/finops/SKILL.md), [`backup-dr`](../skills/devops/backup-dr/SKILL.md), [`database-migration`](../skills/devops/database-migration/SKILL.md), [`dev-loop-pr-writer`](../skills/dev-loop/pr-writer/SKILL.md), [`dev-loop-dev-container`](../skills/dev-loop/dev-container/SKILL.md), [`dev-loop-tech-debt-tracker`](../skills/dev-loop/tech-debt-tracker/SKILL.md), [`dev-loop-api-client-generator`](../skills/dev-loop/api-client-generator/SKILL.md), [`management-okr-kpi`](../skills/management/okr-kpi/SKILL.md), [`sprint-retro`](../skills/management/sprint-retro/SKILL.md), [`management-risk-management`](../skills/management/risk-management/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md), [`planning-create-pitch-deck`](../skills/planning/create-pitch-deck/SKILL.md), [`planning-market-analysis`](../skills/planning/market-analysis/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md), [`enterprise-multi-tenant`](../skills/enterprise/multi-tenant/SKILL.md), [`enterprise-integration-patterns`](../skills/enterprise/integration-patterns/SKILL.md), [`enterprise-data-governance`](../skills/enterprise/data-governance/SKILL.md), [`enterprise-sla-management`](../skills/enterprise/sla-management/SKILL.md), [`enterprise-legacy-migration`](../skills/enterprise/legacy-migration/SKILL.md), [`enterprise-identity-provider`](../skills/enterprise/identity-provider/SKILL.md), [`enterprise-cost-governance`](../skills/enterprise/cost-governance/SKILL.md), [`product-ab-testing`](../skills/product/ab-testing/SKILL.md), [`product-user-research`](../skills/product/user-research/SKILL.md), [`product-growth-engineering`](../skills/product/growth-engineering/SKILL.md), [`product-pricing-strategy`](../skills/product/pricing-strategy/SKILL.md), [`product-go-to-market`](../skills/product/go-to-market/SKILL.md), [`product-onboarding-flow`](../skills/product/onboarding-flow/SKILL.md), [`prompt-chain-of-thought`](../skills/prompt-engineering/chain-of-thought/SKILL.md), [`prompt-few-shot`](../skills/prompt-engineering/few-shot-prompting/SKILL.md), [`prompt-tree-of-thoughts`](../skills/prompt-engineering/tree-of-thoughts/SKILL.md), [`llm-rag-retrieval-internals`](../skills/ai/llm-engineering/rag-architecture/SKILL.md), [`prompt-rag-query-design`](../skills/prompt-engineering/rag-design/SKILL.md), [`ml-inference-optimization`](../skills/ml/inference-optimization/SKILL.md), [`llm-kv-cache-paged-attention`](../skills/ai/llm-engineering/kv-cache/SKILL.md), [`data-vector-databases`](../skills/data/vector-databases/SKILL.md), [`ai-agent-architectures`](../skills/ai/ai-agents/SKILL.md), [`agent-observability`](../skills/harness-engineering/agent-observability/SKILL.md), [`security-sast-dast`](../skills/security/sast-dast/SKILL.md), [`security-sbom`](../skills/security/sbom/SKILL.md), [`security-secrets-management`](../skills/security/secrets-management/SKILL.md), [`security-container-security`](../skills/security/container-security/SKILL.md), [`security-api-security`](../skills/security/api-security/SKILL.md), [`data-etl-pipeline`](../skills/data/etl-pipeline/SKILL.md), [`data-data-warehouse`](../skills/data/data-warehouse/SKILL.md), [`data-bi-tools`](../skills/data/bi-tools/SKILL.md), [`data-data-quality`](../skills/data/data-quality/SKILL.md), [`design-systems`](../skills/design/design-systems/SKILL.md), [`design-ux-research`](../skills/design/ux-research/SKILL.md), [`design-accessibility`](../skills/design/accessibility/SKILL.md), [`design-motion-design`](../skills/design/motion-design/SKILL.md), [`quality-e2e-testing`](../skills/quality/quality-e2e-testing/SKILL.md), [`quality-visual-testing`](../skills/quality/visual-testing/SKILL.md), [`quality-contract-testing`](../skills/quality/contract-testing/SKILL.md), [`frontend-lit`](../skills/frontend/lit/SKILL.md), [`frontend-web-components`](../skills/frontend/universal/web-components/SKILL.md), [`mobile-ar-vr`](../skills/mobile/universal/ar-vr/SKILL.md), [`nomad`](../skills/devops/nomad/SKILL.md), [`devops-incident-response`](../skills/devops/incident-response/SKILL.md), [`cost-benefit`](../skills/management/cost-benefit/SKILL.md), [`management-hiring`](../skills/management/hiring/SKILL.md), [`management-stakeholder`](../skills/management/stakeholder/SKILL.md), [`ml-experiment-tracking`](../skills/ml/experiment-tracking/SKILL.md), [`ml-classical-ml`](../skills/ml/classical-ml/SKILL.md), [`ml-deep-learning`](../skills/ml/deep-learning/SKILL.md), [`ml-feature-engineering`](../skills/ml/feature-engineering/SKILL.md), [`ml-hyperparameter-tuning`](../skills/ml/hyperparameter-tuning/SKILL.md), [`ml-model-evaluation`](../skills/ml/model-evaluation/SKILL.md), [`ml-model-interpretability`](../skills/ml/model-interpretability/SKILL.md), [`ml-time-series`](../skills/ml/time-series/SKILL.md), [`ml-nlp`](../skills/ml/nlp/SKILL.md), [`ml-computer-vision`](../skills/ml/computer-vision/SKILL.md), [`ml-recommendation-systems`](../skills/ml/recommendation-systems/SKILL.md), [`ml-anomaly-detection`](../skills/ml/anomaly-detection/SKILL.md), [`ml-ml-pipeline`](../skills/ml/ml-pipeline/SKILL.md), [`ml-feature-store`](../skills/ml/feature-store/SKILL.md), [`ml-model-serving`](../skills/ml/model-serving/SKILL.md), [`data-distributed-storage`](../skills/data/distributed-storage/SKILL.md), [`data-distributed-compute`](../skills/data/distributed-compute/SKILL.md), [`data-data-lake`](../skills/data/data-lake/SKILL.md), [`data-data-lakehouse`](../skills/data/data-lakehouse/SKILL.md), [`data-batch-processing`](../skills/data/batch-processing/SKILL.md), [`data-data-platform`](../skills/data/data-platform/SKILL.md), [`data-data-catalog`](../skills/data/data-catalog/SKILL.md), [`data-data-observability`](../skills/data/data-observability/SKILL.md), [`data-data-contracts`](../skills/data/data-contracts/SKILL.md), [`data-data-mesh`](../skills/data/data-mesh/SKILL.md), [`data-data-versioning`](../skills/data/data-versioning/SKILL.md), [`data-data-api`](../skills/data/data-api/SKILL.md), [`data-data-virtualization`](../skills/data/data-virtualization/SKILL.md), [`data-schema-registry`](../skills/data/schema-registry/SKILL.md), [`data-relational-database`](../skills/data/relational-database/SKILL.md), [`data-nosql-database`](../skills/data/nosql-database/SKILL.md), [`data-graph-database`](../skills/data/graph-database/SKILL.md), [`data-search-engine`](../skills/data/search-engine/SKILL.md), [`llm-finetuning`](../skills/ai/llm-finetuning/SKILL.md), [`genai-vision`](../skills/ai/genai-vision/SKILL.md), [`multimodal-pipelines`](../skills/rnd/ai-agents/multimodal-pipelines/SKILL.md), [`ai-defense-mechanisms`](../skills/rnd/security/ai-defense-mechanisms/SKILL.md), [`ai-agentic-workflows`](../skills/ai/agentic-workflows/SKILL.md), [`tool-calling-principles`](../skills/ai/ai-agents/tool-calling-principles/SKILL.md), [`devops-dataops`](../skills/devops/dataops/SKILL.md), [`devops-mlops`](../skills/devops/mlops/SKILL.md), [`devops-kubernetes-for-data`](../skills/devops/kubernetes-for-data/SKILL.md), [`cloud-cost-optimization`](../skills/devops/cloud-cost-optimization/SKILL.md), [`security-data-security`](../skills/security/data-security/SKILL.md), [`planning-bpmn-modeling`](../skills/planning/bpmn-modeling/SKILL.md), [`planning-bdd-atdd`](../skills/planning/bdd-atdd/SKILL.md), [`agile-scrum-kanban`](../skills/management/agile-scrum-kanban/SKILL.md), [`management-team-topology`](../skills/management/team-topology/SKILL.md), [`management-change-management`](../skills/management/change-management/SKILL.md), [`quality-acceptance-testing`](../skills/quality/acceptance-testing/SKILL.md), [`quality-regression-testing`](../skills/quality/regression-testing/SKILL.md), [`quality-smoke-testing`](../skills/quality/smoke-testing/SKILL.md), [`data-data-strategy`](../skills/data/data-strategy/SKILL.md), [`data-dimensional-modeling`](../skills/data/dimensional-modeling/SKILL.md), [`data-science-statistical-analysis`](../skills/data-science/statistical-analysis/SKILL.md), [`data-science-experimentation`](../skills/data-science/experimentation/SKILL.md), [`data-science-causal-inference`](../skills/data-science/causal-inference/SKILL.md), [`data-science-analytics-engineering`](../skills/data-science/analytics-engineering/SKILL.md), [`enterprise-togaf-zachman`](../skills/enterprise/togaf-zachman/SKILL.md), [`enterprise-itil-service-mgmt`](../skills/enterprise/itil-service-mgmt/SKILL.md), [`enterprise-vendor-management`](../skills/enterprise/vendor-management/SKILL.md), [`enterprise-architecture-governance`](../skills/enterprise/architecture-governance/SKILL.md), [`product-customer-journey`](../skills/product/customer-journey/SKILL.md), [`product-persona-development`](../skills/product/persona-development/SKILL.md), [`golang-architecture`](../skills/backend/go/architecture/SKILL.md), [`golang-patterns`](../skills/backend/go/patterns/SKILL.md), [`go`](../skills/languages/go/SKILL.md), [`vue-architecture`](../skills/frontend/vue/architecture/SKILL.md), [`vue-nuxt`](../skills/frontend/vue/nuxt/SKILL.md), [`frontend-vue-patterns`](../skills/frontend/vue/patterns/SKILL.md)

</details>

### fullstack-rust-angular

Full stack: Rust backend + Angular frontend — **217 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-brief --skill create-prd --skill create-tech-spec --skill create-story --skill design-patterns --skill microservices --skill backend-clean-architecture --skill backend-api-design --skill backend-api-response --skill backend-database-patterns --skill backend-auth-patterns --skill quality-unit-testing --skill quality-integration-testing --skill frontend-design-system --skill frontend-state-management --skill frontend-performance --skill frontend-accessibility --skill frontend-testing --skill frontend-patterns --skill microfrontend --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-security-auditor --skill dev-loop-git-workflow --skill docker-patterns --skill cicd-pipeline --skill helm-patterns --skill terraform --skill ansible --skill monitoring --skill alerting --skill team-rules --skill security --skill pentesting --skill backend-grpc-patterns --skill backend-websocket-patterns --skill backend-message-queue --skill backend-caching --skill rate-limiting --skill quality-load-testing --skill frontend-tailwind-css --skill frontend-storybook --skill frontend-pwa --skill frontend-seo --skill github-actions --skill gitops --skill vault --skill aws --skill backend-serverless --skill devops-serverless --skill monorepo --skill dependency-management --skill api-documentation --skill backend-graphql-patterns --skill backend-background-jobs --skill backend-search-patterns --skill data-streaming --skill backend-file-storage --skill backend-feature-flags --skill frontend-feature-flags --skill backend-internationalization --skill frontend-internationalization --skill backend-structured-logging --skill frontend-animation --skill frontend-form-handling --skill frontend-data-fetching --skill frontend-bundler-tools --skill frontend-image-optimization --skill frontend-theming --skill mobile-kotlin-multiplatform --skill mobile-ionic-capacitor --skill mobile-dotnet-maui --skill mobile-deep-linking --skill mobile-offline-first --skill mobile-biometrics --skill map-location --skill mobile-camera-media --skill product-analytics --skill argo-cd --skill devops-azure --skill devops-gcp --skill devops-chaos-engineering --skill devops-service-mesh --skill devops-finops --skill backup-dr --skill database-migration --skill dev-loop-pr-writer --skill dev-loop-dev-container --skill dev-loop-tech-debt-tracker --skill dev-loop-api-client-generator --skill management-okr-kpi --skill sprint-retro --skill management-risk-management --skill planning-create-roadmap --skill planning-create-pitch-deck --skill planning-market-analysis --skill core-onboarding --skill core-context-compressor --skill enterprise-compliance-audit --skill enterprise-multi-tenant --skill enterprise-integration-patterns --skill enterprise-data-governance --skill enterprise-sla-management --skill enterprise-legacy-migration --skill enterprise-identity-provider --skill enterprise-cost-governance --skill product-ab-testing --skill product-user-research --skill product-growth-engineering --skill product-pricing-strategy --skill product-go-to-market --skill product-onboarding-flow --skill prompt-chain-of-thought --skill prompt-few-shot --skill prompt-tree-of-thoughts --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill ml-inference-optimization --skill llm-kv-cache-paged-attention --skill data-vector-databases --skill ai-agent-architectures --skill agent-observability --skill security-sast-dast --skill security-sbom --skill security-secrets-management --skill security-container-security --skill security-api-security --skill data-etl-pipeline --skill data-data-warehouse --skill data-bi-tools --skill data-data-quality --skill design-systems --skill design-ux-research --skill design-accessibility --skill design-motion-design --skill quality-e2e-testing --skill quality-visual-testing --skill quality-contract-testing --skill frontend-lit --skill frontend-web-components --skill mobile-ar-vr --skill nomad --skill devops-incident-response --skill cost-benefit --skill management-hiring --skill management-stakeholder --skill ml-experiment-tracking --skill ml-classical-ml --skill ml-deep-learning --skill ml-feature-engineering --skill ml-hyperparameter-tuning --skill ml-model-evaluation --skill ml-model-interpretability --skill ml-time-series --skill ml-nlp --skill ml-computer-vision --skill ml-recommendation-systems --skill ml-anomaly-detection --skill ml-ml-pipeline --skill ml-feature-store --skill ml-model-serving --skill data-distributed-storage --skill data-distributed-compute --skill data-data-lake --skill data-data-lakehouse --skill data-batch-processing --skill data-data-platform --skill data-data-catalog --skill data-data-observability --skill data-data-contracts --skill data-data-mesh --skill data-data-versioning --skill data-data-api --skill data-data-virtualization --skill data-schema-registry --skill data-relational-database --skill data-nosql-database --skill data-graph-database --skill data-search-engine --skill llm-finetuning --skill genai-vision --skill multimodal-pipelines --skill ai-defense-mechanisms --skill ai-agentic-workflows --skill tool-calling-principles --skill devops-dataops --skill devops-mlops --skill devops-kubernetes-for-data --skill cloud-cost-optimization --skill security-data-security --skill planning-bpmn-modeling --skill planning-bdd-atdd --skill agile-scrum-kanban --skill management-team-topology --skill management-change-management --skill quality-acceptance-testing --skill quality-regression-testing --skill quality-smoke-testing --skill data-data-strategy --skill data-dimensional-modeling --skill data-science-statistical-analysis --skill data-science-experimentation --skill data-science-causal-inference --skill data-science-analytics-engineering --skill enterprise-togaf-zachman --skill enterprise-itil-service-mgmt --skill enterprise-vendor-management --skill enterprise-architecture-governance --skill product-customer-journey --skill product-persona-development --skill rust-architecture --skill rust-patterns --skill lang-rust --skill angular-architecture --skill angular-patterns
```

</details>

<details><summary>Skills</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`create-story`](../skills/planning/create-story/SKILL.md), [`design-patterns`](../skills/backend/universal/design-patterns/SKILL.md), [`microservices`](../skills/backend/universal/microservices/SKILL.md), [`backend-clean-architecture`](../skills/backend/universal/clean-architecture/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-api-response`](../skills/backend/universal/api-response/SKILL.md), [`backend-database-patterns`](../skills/backend/universal/database-patterns/SKILL.md), [`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`quality-unit-testing`](../skills/quality/unit-testing/SKILL.md), [`quality-integration-testing`](../skills/quality/integration-testing/SKILL.md), [`frontend-design-system`](../skills/frontend/universal/design-system/SKILL.md), [`frontend-state-management`](../skills/frontend/universal/state-management/SKILL.md), [`frontend-performance`](../skills/frontend/universal/performance/SKILL.md), [`frontend-accessibility`](../skills/frontend/universal/accessibility/SKILL.md), [`frontend-testing`](../skills/frontend/universal/testing/SKILL.md), [`frontend-patterns`](../skills/frontend/universal/patterns/SKILL.md), [`microfrontend`](../skills/frontend/universal/microfrontend/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-security-auditor`](../skills/dev-loop/security-auditor/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`helm-patterns`](../skills/devops/helm-patterns/SKILL.md), [`terraform`](../skills/devops/terraform/SKILL.md), [`ansible`](../skills/devops/ansible/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`backend-grpc-patterns`](../skills/backend/universal/grpc-patterns/SKILL.md), [`backend-websocket-patterns`](../skills/backend/universal/websocket-patterns/SKILL.md), [`backend-message-queue`](../skills/backend/universal/message-queue/SKILL.md), [`backend-caching`](../skills/backend/universal/caching/SKILL.md), [`rate-limiting`](../skills/backend/universal/rate-limiting/SKILL.md), [`quality-load-testing`](../skills/quality/load-testing/SKILL.md), [`frontend-tailwind-css`](../skills/frontend/universal/tailwind-css/SKILL.md), [`frontend-storybook`](../skills/frontend/universal/storybook/SKILL.md), [`frontend-pwa`](../skills/frontend/universal/pwa/SKILL.md), [`frontend-seo`](../skills/frontend/universal/seo/SKILL.md), [`github-actions`](../skills/devops/github-actions/SKILL.md), [`gitops`](../skills/devops/gitops/SKILL.md), [`vault`](../skills/devops/vault/SKILL.md), [`aws`](../skills/devops/aws/SKILL.md), [`backend-serverless`](../skills/backend/universal/serverless/SKILL.md), [`devops-serverless`](../skills/devops/serverless/SKILL.md), [`monorepo`](../skills/devops/monorepo/SKILL.md), [`dependency-management`](../skills/devops/dependency-management/SKILL.md), [`api-documentation`](../skills/devops/api-documentation/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`frontend-feature-flags`](../skills/frontend/universal/feature-flags/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`frontend-internationalization`](../skills/frontend/universal/internationalization/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`frontend-animation`](../skills/frontend/universal/animation/SKILL.md), [`frontend-form-handling`](../skills/frontend/universal/form-handling/SKILL.md), [`frontend-data-fetching`](../skills/frontend/universal/data-fetching/SKILL.md), [`frontend-bundler-tools`](../skills/frontend/universal/bundler-tools/SKILL.md), [`frontend-image-optimization`](../skills/frontend/universal/image-optimization/SKILL.md), [`frontend-theming`](../skills/frontend/universal/theming/SKILL.md), [`mobile-kotlin-multiplatform`](../skills/mobile/kotlin-multiplatform/SKILL.md), [`mobile-ionic-capacitor`](../skills/mobile/ionic-capacitor/SKILL.md), [`mobile-dotnet-maui`](../skills/mobile/dotnet-maui/SKILL.md), [`mobile-deep-linking`](../skills/mobile/universal/deep-linking/SKILL.md), [`mobile-offline-first`](../skills/mobile/universal/offline-first/SKILL.md), [`mobile-biometrics`](../skills/mobile/universal/biometrics/SKILL.md), [`map-location`](../skills/mobile/universal/map-location/SKILL.md), [`mobile-camera-media`](../skills/mobile/universal/camera-media/SKILL.md), [`product-analytics`](../skills/product/analytics/SKILL.md), [`argo-cd`](../skills/devops/argo-cd/SKILL.md), [`devops-azure`](../skills/devops/azure/SKILL.md), [`devops-gcp`](../skills/devops/gcp/SKILL.md), [`devops-chaos-engineering`](../skills/devops/chaos-engineering/SKILL.md), [`devops-service-mesh`](../skills/devops/service-mesh/SKILL.md), [`devops-finops`](../skills/devops/finops/SKILL.md), [`backup-dr`](../skills/devops/backup-dr/SKILL.md), [`database-migration`](../skills/devops/database-migration/SKILL.md), [`dev-loop-pr-writer`](../skills/dev-loop/pr-writer/SKILL.md), [`dev-loop-dev-container`](../skills/dev-loop/dev-container/SKILL.md), [`dev-loop-tech-debt-tracker`](../skills/dev-loop/tech-debt-tracker/SKILL.md), [`dev-loop-api-client-generator`](../skills/dev-loop/api-client-generator/SKILL.md), [`management-okr-kpi`](../skills/management/okr-kpi/SKILL.md), [`sprint-retro`](../skills/management/sprint-retro/SKILL.md), [`management-risk-management`](../skills/management/risk-management/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md), [`planning-create-pitch-deck`](../skills/planning/create-pitch-deck/SKILL.md), [`planning-market-analysis`](../skills/planning/market-analysis/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md), [`enterprise-multi-tenant`](../skills/enterprise/multi-tenant/SKILL.md), [`enterprise-integration-patterns`](../skills/enterprise/integration-patterns/SKILL.md), [`enterprise-data-governance`](../skills/enterprise/data-governance/SKILL.md), [`enterprise-sla-management`](../skills/enterprise/sla-management/SKILL.md), [`enterprise-legacy-migration`](../skills/enterprise/legacy-migration/SKILL.md), [`enterprise-identity-provider`](../skills/enterprise/identity-provider/SKILL.md), [`enterprise-cost-governance`](../skills/enterprise/cost-governance/SKILL.md), [`product-ab-testing`](../skills/product/ab-testing/SKILL.md), [`product-user-research`](../skills/product/user-research/SKILL.md), [`product-growth-engineering`](../skills/product/growth-engineering/SKILL.md), [`product-pricing-strategy`](../skills/product/pricing-strategy/SKILL.md), [`product-go-to-market`](../skills/product/go-to-market/SKILL.md), [`product-onboarding-flow`](../skills/product/onboarding-flow/SKILL.md), [`prompt-chain-of-thought`](../skills/prompt-engineering/chain-of-thought/SKILL.md), [`prompt-few-shot`](../skills/prompt-engineering/few-shot-prompting/SKILL.md), [`prompt-tree-of-thoughts`](../skills/prompt-engineering/tree-of-thoughts/SKILL.md), [`llm-rag-retrieval-internals`](../skills/ai/llm-engineering/rag-architecture/SKILL.md), [`prompt-rag-query-design`](../skills/prompt-engineering/rag-design/SKILL.md), [`ml-inference-optimization`](../skills/ml/inference-optimization/SKILL.md), [`llm-kv-cache-paged-attention`](../skills/ai/llm-engineering/kv-cache/SKILL.md), [`data-vector-databases`](../skills/data/vector-databases/SKILL.md), [`ai-agent-architectures`](../skills/ai/ai-agents/SKILL.md), [`agent-observability`](../skills/harness-engineering/agent-observability/SKILL.md), [`security-sast-dast`](../skills/security/sast-dast/SKILL.md), [`security-sbom`](../skills/security/sbom/SKILL.md), [`security-secrets-management`](../skills/security/secrets-management/SKILL.md), [`security-container-security`](../skills/security/container-security/SKILL.md), [`security-api-security`](../skills/security/api-security/SKILL.md), [`data-etl-pipeline`](../skills/data/etl-pipeline/SKILL.md), [`data-data-warehouse`](../skills/data/data-warehouse/SKILL.md), [`data-bi-tools`](../skills/data/bi-tools/SKILL.md), [`data-data-quality`](../skills/data/data-quality/SKILL.md), [`design-systems`](../skills/design/design-systems/SKILL.md), [`design-ux-research`](../skills/design/ux-research/SKILL.md), [`design-accessibility`](../skills/design/accessibility/SKILL.md), [`design-motion-design`](../skills/design/motion-design/SKILL.md), [`quality-e2e-testing`](../skills/quality/quality-e2e-testing/SKILL.md), [`quality-visual-testing`](../skills/quality/visual-testing/SKILL.md), [`quality-contract-testing`](../skills/quality/contract-testing/SKILL.md), [`frontend-lit`](../skills/frontend/lit/SKILL.md), [`frontend-web-components`](../skills/frontend/universal/web-components/SKILL.md), [`mobile-ar-vr`](../skills/mobile/universal/ar-vr/SKILL.md), [`nomad`](../skills/devops/nomad/SKILL.md), [`devops-incident-response`](../skills/devops/incident-response/SKILL.md), [`cost-benefit`](../skills/management/cost-benefit/SKILL.md), [`management-hiring`](../skills/management/hiring/SKILL.md), [`management-stakeholder`](../skills/management/stakeholder/SKILL.md), [`ml-experiment-tracking`](../skills/ml/experiment-tracking/SKILL.md), [`ml-classical-ml`](../skills/ml/classical-ml/SKILL.md), [`ml-deep-learning`](../skills/ml/deep-learning/SKILL.md), [`ml-feature-engineering`](../skills/ml/feature-engineering/SKILL.md), [`ml-hyperparameter-tuning`](../skills/ml/hyperparameter-tuning/SKILL.md), [`ml-model-evaluation`](../skills/ml/model-evaluation/SKILL.md), [`ml-model-interpretability`](../skills/ml/model-interpretability/SKILL.md), [`ml-time-series`](../skills/ml/time-series/SKILL.md), [`ml-nlp`](../skills/ml/nlp/SKILL.md), [`ml-computer-vision`](../skills/ml/computer-vision/SKILL.md), [`ml-recommendation-systems`](../skills/ml/recommendation-systems/SKILL.md), [`ml-anomaly-detection`](../skills/ml/anomaly-detection/SKILL.md), [`ml-ml-pipeline`](../skills/ml/ml-pipeline/SKILL.md), [`ml-feature-store`](../skills/ml/feature-store/SKILL.md), [`ml-model-serving`](../skills/ml/model-serving/SKILL.md), [`data-distributed-storage`](../skills/data/distributed-storage/SKILL.md), [`data-distributed-compute`](../skills/data/distributed-compute/SKILL.md), [`data-data-lake`](../skills/data/data-lake/SKILL.md), [`data-data-lakehouse`](../skills/data/data-lakehouse/SKILL.md), [`data-batch-processing`](../skills/data/batch-processing/SKILL.md), [`data-data-platform`](../skills/data/data-platform/SKILL.md), [`data-data-catalog`](../skills/data/data-catalog/SKILL.md), [`data-data-observability`](../skills/data/data-observability/SKILL.md), [`data-data-contracts`](../skills/data/data-contracts/SKILL.md), [`data-data-mesh`](../skills/data/data-mesh/SKILL.md), [`data-data-versioning`](../skills/data/data-versioning/SKILL.md), [`data-data-api`](../skills/data/data-api/SKILL.md), [`data-data-virtualization`](../skills/data/data-virtualization/SKILL.md), [`data-schema-registry`](../skills/data/schema-registry/SKILL.md), [`data-relational-database`](../skills/data/relational-database/SKILL.md), [`data-nosql-database`](../skills/data/nosql-database/SKILL.md), [`data-graph-database`](../skills/data/graph-database/SKILL.md), [`data-search-engine`](../skills/data/search-engine/SKILL.md), [`llm-finetuning`](../skills/ai/llm-finetuning/SKILL.md), [`genai-vision`](../skills/ai/genai-vision/SKILL.md), [`multimodal-pipelines`](../skills/rnd/ai-agents/multimodal-pipelines/SKILL.md), [`ai-defense-mechanisms`](../skills/rnd/security/ai-defense-mechanisms/SKILL.md), [`ai-agentic-workflows`](../skills/ai/agentic-workflows/SKILL.md), [`tool-calling-principles`](../skills/ai/ai-agents/tool-calling-principles/SKILL.md), [`devops-dataops`](../skills/devops/dataops/SKILL.md), [`devops-mlops`](../skills/devops/mlops/SKILL.md), [`devops-kubernetes-for-data`](../skills/devops/kubernetes-for-data/SKILL.md), [`cloud-cost-optimization`](../skills/devops/cloud-cost-optimization/SKILL.md), [`security-data-security`](../skills/security/data-security/SKILL.md), [`planning-bpmn-modeling`](../skills/planning/bpmn-modeling/SKILL.md), [`planning-bdd-atdd`](../skills/planning/bdd-atdd/SKILL.md), [`agile-scrum-kanban`](../skills/management/agile-scrum-kanban/SKILL.md), [`management-team-topology`](../skills/management/team-topology/SKILL.md), [`management-change-management`](../skills/management/change-management/SKILL.md), [`quality-acceptance-testing`](../skills/quality/acceptance-testing/SKILL.md), [`quality-regression-testing`](../skills/quality/regression-testing/SKILL.md), [`quality-smoke-testing`](../skills/quality/smoke-testing/SKILL.md), [`data-data-strategy`](../skills/data/data-strategy/SKILL.md), [`data-dimensional-modeling`](../skills/data/dimensional-modeling/SKILL.md), [`data-science-statistical-analysis`](../skills/data-science/statistical-analysis/SKILL.md), [`data-science-experimentation`](../skills/data-science/experimentation/SKILL.md), [`data-science-causal-inference`](../skills/data-science/causal-inference/SKILL.md), [`data-science-analytics-engineering`](../skills/data-science/analytics-engineering/SKILL.md), [`enterprise-togaf-zachman`](../skills/enterprise/togaf-zachman/SKILL.md), [`enterprise-itil-service-mgmt`](../skills/enterprise/itil-service-mgmt/SKILL.md), [`enterprise-vendor-management`](../skills/enterprise/vendor-management/SKILL.md), [`enterprise-architecture-governance`](../skills/enterprise/architecture-governance/SKILL.md), [`product-customer-journey`](../skills/product/customer-journey/SKILL.md), [`product-persona-development`](../skills/product/persona-development/SKILL.md), [`rust-architecture`](../skills/backend/rust/architecture/SKILL.md), [`rust-patterns`](../skills/backend/rust/patterns/SKILL.md), [`lang-rust`](../skills/languages/rust/SKILL.md), [`angular-architecture`](../skills/frontend/angular/architecture/SKILL.md), [`angular-patterns`](../skills/frontend/angular/patterns/SKILL.md)

</details>

### fullstack-dotnet-react

Full stack: C# .NET backend + React frontend — **218 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-brief --skill create-prd --skill create-tech-spec --skill create-story --skill design-patterns --skill microservices --skill backend-clean-architecture --skill backend-api-design --skill backend-api-response --skill backend-database-patterns --skill backend-auth-patterns --skill quality-unit-testing --skill quality-integration-testing --skill frontend-design-system --skill frontend-state-management --skill frontend-performance --skill frontend-accessibility --skill frontend-testing --skill frontend-patterns --skill microfrontend --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-security-auditor --skill dev-loop-git-workflow --skill docker-patterns --skill cicd-pipeline --skill helm-patterns --skill terraform --skill ansible --skill monitoring --skill alerting --skill team-rules --skill security --skill pentesting --skill backend-grpc-patterns --skill backend-websocket-patterns --skill backend-message-queue --skill backend-caching --skill rate-limiting --skill quality-load-testing --skill frontend-tailwind-css --skill frontend-storybook --skill frontend-pwa --skill frontend-seo --skill github-actions --skill gitops --skill vault --skill aws --skill backend-serverless --skill devops-serverless --skill monorepo --skill dependency-management --skill api-documentation --skill backend-graphql-patterns --skill backend-background-jobs --skill backend-search-patterns --skill data-streaming --skill backend-file-storage --skill backend-feature-flags --skill frontend-feature-flags --skill backend-internationalization --skill frontend-internationalization --skill backend-structured-logging --skill frontend-animation --skill frontend-form-handling --skill frontend-data-fetching --skill frontend-bundler-tools --skill frontend-image-optimization --skill frontend-theming --skill mobile-kotlin-multiplatform --skill mobile-ionic-capacitor --skill mobile-dotnet-maui --skill mobile-deep-linking --skill mobile-offline-first --skill mobile-biometrics --skill map-location --skill mobile-camera-media --skill product-analytics --skill argo-cd --skill devops-azure --skill devops-gcp --skill devops-chaos-engineering --skill devops-service-mesh --skill devops-finops --skill backup-dr --skill database-migration --skill dev-loop-pr-writer --skill dev-loop-dev-container --skill dev-loop-tech-debt-tracker --skill dev-loop-api-client-generator --skill management-okr-kpi --skill sprint-retro --skill management-risk-management --skill planning-create-roadmap --skill planning-create-pitch-deck --skill planning-market-analysis --skill core-onboarding --skill core-context-compressor --skill enterprise-compliance-audit --skill enterprise-multi-tenant --skill enterprise-integration-patterns --skill enterprise-data-governance --skill enterprise-sla-management --skill enterprise-legacy-migration --skill enterprise-identity-provider --skill enterprise-cost-governance --skill product-ab-testing --skill product-user-research --skill product-growth-engineering --skill product-pricing-strategy --skill product-go-to-market --skill product-onboarding-flow --skill prompt-chain-of-thought --skill prompt-few-shot --skill prompt-tree-of-thoughts --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill ml-inference-optimization --skill llm-kv-cache-paged-attention --skill data-vector-databases --skill ai-agent-architectures --skill agent-observability --skill security-sast-dast --skill security-sbom --skill security-secrets-management --skill security-container-security --skill security-api-security --skill data-etl-pipeline --skill data-data-warehouse --skill data-bi-tools --skill data-data-quality --skill design-systems --skill design-ux-research --skill design-accessibility --skill design-motion-design --skill quality-e2e-testing --skill quality-visual-testing --skill quality-contract-testing --skill frontend-lit --skill frontend-web-components --skill mobile-ar-vr --skill nomad --skill devops-incident-response --skill cost-benefit --skill management-hiring --skill management-stakeholder --skill ml-experiment-tracking --skill ml-classical-ml --skill ml-deep-learning --skill ml-feature-engineering --skill ml-hyperparameter-tuning --skill ml-model-evaluation --skill ml-model-interpretability --skill ml-time-series --skill ml-nlp --skill ml-computer-vision --skill ml-recommendation-systems --skill ml-anomaly-detection --skill ml-ml-pipeline --skill ml-feature-store --skill ml-model-serving --skill data-distributed-storage --skill data-distributed-compute --skill data-data-lake --skill data-data-lakehouse --skill data-batch-processing --skill data-data-platform --skill data-data-catalog --skill data-data-observability --skill data-data-contracts --skill data-data-mesh --skill data-data-versioning --skill data-data-api --skill data-data-virtualization --skill data-schema-registry --skill data-relational-database --skill data-nosql-database --skill data-graph-database --skill data-search-engine --skill llm-finetuning --skill genai-vision --skill multimodal-pipelines --skill ai-defense-mechanisms --skill ai-agentic-workflows --skill tool-calling-principles --skill devops-dataops --skill devops-mlops --skill devops-kubernetes-for-data --skill cloud-cost-optimization --skill security-data-security --skill planning-bpmn-modeling --skill planning-bdd-atdd --skill agile-scrum-kanban --skill management-team-topology --skill management-change-management --skill quality-acceptance-testing --skill quality-regression-testing --skill quality-smoke-testing --skill data-data-strategy --skill data-dimensional-modeling --skill data-science-statistical-analysis --skill data-science-experimentation --skill data-science-causal-inference --skill data-science-analytics-engineering --skill enterprise-togaf-zachman --skill enterprise-itil-service-mgmt --skill enterprise-vendor-management --skill enterprise-architecture-governance --skill product-customer-journey --skill product-persona-development --skill dotnet-architecture --skill dotnet-patterns --skill lang-csharp --skill react-architecture --skill react-nextjs --skill react-fiber-architecture
```

</details>

<details><summary>Skills</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`create-story`](../skills/planning/create-story/SKILL.md), [`design-patterns`](../skills/backend/universal/design-patterns/SKILL.md), [`microservices`](../skills/backend/universal/microservices/SKILL.md), [`backend-clean-architecture`](../skills/backend/universal/clean-architecture/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-api-response`](../skills/backend/universal/api-response/SKILL.md), [`backend-database-patterns`](../skills/backend/universal/database-patterns/SKILL.md), [`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`quality-unit-testing`](../skills/quality/unit-testing/SKILL.md), [`quality-integration-testing`](../skills/quality/integration-testing/SKILL.md), [`frontend-design-system`](../skills/frontend/universal/design-system/SKILL.md), [`frontend-state-management`](../skills/frontend/universal/state-management/SKILL.md), [`frontend-performance`](../skills/frontend/universal/performance/SKILL.md), [`frontend-accessibility`](../skills/frontend/universal/accessibility/SKILL.md), [`frontend-testing`](../skills/frontend/universal/testing/SKILL.md), [`frontend-patterns`](../skills/frontend/universal/patterns/SKILL.md), [`microfrontend`](../skills/frontend/universal/microfrontend/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-security-auditor`](../skills/dev-loop/security-auditor/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`helm-patterns`](../skills/devops/helm-patterns/SKILL.md), [`terraform`](../skills/devops/terraform/SKILL.md), [`ansible`](../skills/devops/ansible/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`backend-grpc-patterns`](../skills/backend/universal/grpc-patterns/SKILL.md), [`backend-websocket-patterns`](../skills/backend/universal/websocket-patterns/SKILL.md), [`backend-message-queue`](../skills/backend/universal/message-queue/SKILL.md), [`backend-caching`](../skills/backend/universal/caching/SKILL.md), [`rate-limiting`](../skills/backend/universal/rate-limiting/SKILL.md), [`quality-load-testing`](../skills/quality/load-testing/SKILL.md), [`frontend-tailwind-css`](../skills/frontend/universal/tailwind-css/SKILL.md), [`frontend-storybook`](../skills/frontend/universal/storybook/SKILL.md), [`frontend-pwa`](../skills/frontend/universal/pwa/SKILL.md), [`frontend-seo`](../skills/frontend/universal/seo/SKILL.md), [`github-actions`](../skills/devops/github-actions/SKILL.md), [`gitops`](../skills/devops/gitops/SKILL.md), [`vault`](../skills/devops/vault/SKILL.md), [`aws`](../skills/devops/aws/SKILL.md), [`backend-serverless`](../skills/backend/universal/serverless/SKILL.md), [`devops-serverless`](../skills/devops/serverless/SKILL.md), [`monorepo`](../skills/devops/monorepo/SKILL.md), [`dependency-management`](../skills/devops/dependency-management/SKILL.md), [`api-documentation`](../skills/devops/api-documentation/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`frontend-feature-flags`](../skills/frontend/universal/feature-flags/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`frontend-internationalization`](../skills/frontend/universal/internationalization/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`frontend-animation`](../skills/frontend/universal/animation/SKILL.md), [`frontend-form-handling`](../skills/frontend/universal/form-handling/SKILL.md), [`frontend-data-fetching`](../skills/frontend/universal/data-fetching/SKILL.md), [`frontend-bundler-tools`](../skills/frontend/universal/bundler-tools/SKILL.md), [`frontend-image-optimization`](../skills/frontend/universal/image-optimization/SKILL.md), [`frontend-theming`](../skills/frontend/universal/theming/SKILL.md), [`mobile-kotlin-multiplatform`](../skills/mobile/kotlin-multiplatform/SKILL.md), [`mobile-ionic-capacitor`](../skills/mobile/ionic-capacitor/SKILL.md), [`mobile-dotnet-maui`](../skills/mobile/dotnet-maui/SKILL.md), [`mobile-deep-linking`](../skills/mobile/universal/deep-linking/SKILL.md), [`mobile-offline-first`](../skills/mobile/universal/offline-first/SKILL.md), [`mobile-biometrics`](../skills/mobile/universal/biometrics/SKILL.md), [`map-location`](../skills/mobile/universal/map-location/SKILL.md), [`mobile-camera-media`](../skills/mobile/universal/camera-media/SKILL.md), [`product-analytics`](../skills/product/analytics/SKILL.md), [`argo-cd`](../skills/devops/argo-cd/SKILL.md), [`devops-azure`](../skills/devops/azure/SKILL.md), [`devops-gcp`](../skills/devops/gcp/SKILL.md), [`devops-chaos-engineering`](../skills/devops/chaos-engineering/SKILL.md), [`devops-service-mesh`](../skills/devops/service-mesh/SKILL.md), [`devops-finops`](../skills/devops/finops/SKILL.md), [`backup-dr`](../skills/devops/backup-dr/SKILL.md), [`database-migration`](../skills/devops/database-migration/SKILL.md), [`dev-loop-pr-writer`](../skills/dev-loop/pr-writer/SKILL.md), [`dev-loop-dev-container`](../skills/dev-loop/dev-container/SKILL.md), [`dev-loop-tech-debt-tracker`](../skills/dev-loop/tech-debt-tracker/SKILL.md), [`dev-loop-api-client-generator`](../skills/dev-loop/api-client-generator/SKILL.md), [`management-okr-kpi`](../skills/management/okr-kpi/SKILL.md), [`sprint-retro`](../skills/management/sprint-retro/SKILL.md), [`management-risk-management`](../skills/management/risk-management/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md), [`planning-create-pitch-deck`](../skills/planning/create-pitch-deck/SKILL.md), [`planning-market-analysis`](../skills/planning/market-analysis/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md), [`enterprise-multi-tenant`](../skills/enterprise/multi-tenant/SKILL.md), [`enterprise-integration-patterns`](../skills/enterprise/integration-patterns/SKILL.md), [`enterprise-data-governance`](../skills/enterprise/data-governance/SKILL.md), [`enterprise-sla-management`](../skills/enterprise/sla-management/SKILL.md), [`enterprise-legacy-migration`](../skills/enterprise/legacy-migration/SKILL.md), [`enterprise-identity-provider`](../skills/enterprise/identity-provider/SKILL.md), [`enterprise-cost-governance`](../skills/enterprise/cost-governance/SKILL.md), [`product-ab-testing`](../skills/product/ab-testing/SKILL.md), [`product-user-research`](../skills/product/user-research/SKILL.md), [`product-growth-engineering`](../skills/product/growth-engineering/SKILL.md), [`product-pricing-strategy`](../skills/product/pricing-strategy/SKILL.md), [`product-go-to-market`](../skills/product/go-to-market/SKILL.md), [`product-onboarding-flow`](../skills/product/onboarding-flow/SKILL.md), [`prompt-chain-of-thought`](../skills/prompt-engineering/chain-of-thought/SKILL.md), [`prompt-few-shot`](../skills/prompt-engineering/few-shot-prompting/SKILL.md), [`prompt-tree-of-thoughts`](../skills/prompt-engineering/tree-of-thoughts/SKILL.md), [`llm-rag-retrieval-internals`](../skills/ai/llm-engineering/rag-architecture/SKILL.md), [`prompt-rag-query-design`](../skills/prompt-engineering/rag-design/SKILL.md), [`ml-inference-optimization`](../skills/ml/inference-optimization/SKILL.md), [`llm-kv-cache-paged-attention`](../skills/ai/llm-engineering/kv-cache/SKILL.md), [`data-vector-databases`](../skills/data/vector-databases/SKILL.md), [`ai-agent-architectures`](../skills/ai/ai-agents/SKILL.md), [`agent-observability`](../skills/harness-engineering/agent-observability/SKILL.md), [`security-sast-dast`](../skills/security/sast-dast/SKILL.md), [`security-sbom`](../skills/security/sbom/SKILL.md), [`security-secrets-management`](../skills/security/secrets-management/SKILL.md), [`security-container-security`](../skills/security/container-security/SKILL.md), [`security-api-security`](../skills/security/api-security/SKILL.md), [`data-etl-pipeline`](../skills/data/etl-pipeline/SKILL.md), [`data-data-warehouse`](../skills/data/data-warehouse/SKILL.md), [`data-bi-tools`](../skills/data/bi-tools/SKILL.md), [`data-data-quality`](../skills/data/data-quality/SKILL.md), [`design-systems`](../skills/design/design-systems/SKILL.md), [`design-ux-research`](../skills/design/ux-research/SKILL.md), [`design-accessibility`](../skills/design/accessibility/SKILL.md), [`design-motion-design`](../skills/design/motion-design/SKILL.md), [`quality-e2e-testing`](../skills/quality/quality-e2e-testing/SKILL.md), [`quality-visual-testing`](../skills/quality/visual-testing/SKILL.md), [`quality-contract-testing`](../skills/quality/contract-testing/SKILL.md), [`frontend-lit`](../skills/frontend/lit/SKILL.md), [`frontend-web-components`](../skills/frontend/universal/web-components/SKILL.md), [`mobile-ar-vr`](../skills/mobile/universal/ar-vr/SKILL.md), [`nomad`](../skills/devops/nomad/SKILL.md), [`devops-incident-response`](../skills/devops/incident-response/SKILL.md), [`cost-benefit`](../skills/management/cost-benefit/SKILL.md), [`management-hiring`](../skills/management/hiring/SKILL.md), [`management-stakeholder`](../skills/management/stakeholder/SKILL.md), [`ml-experiment-tracking`](../skills/ml/experiment-tracking/SKILL.md), [`ml-classical-ml`](../skills/ml/classical-ml/SKILL.md), [`ml-deep-learning`](../skills/ml/deep-learning/SKILL.md), [`ml-feature-engineering`](../skills/ml/feature-engineering/SKILL.md), [`ml-hyperparameter-tuning`](../skills/ml/hyperparameter-tuning/SKILL.md), [`ml-model-evaluation`](../skills/ml/model-evaluation/SKILL.md), [`ml-model-interpretability`](../skills/ml/model-interpretability/SKILL.md), [`ml-time-series`](../skills/ml/time-series/SKILL.md), [`ml-nlp`](../skills/ml/nlp/SKILL.md), [`ml-computer-vision`](../skills/ml/computer-vision/SKILL.md), [`ml-recommendation-systems`](../skills/ml/recommendation-systems/SKILL.md), [`ml-anomaly-detection`](../skills/ml/anomaly-detection/SKILL.md), [`ml-ml-pipeline`](../skills/ml/ml-pipeline/SKILL.md), [`ml-feature-store`](../skills/ml/feature-store/SKILL.md), [`ml-model-serving`](../skills/ml/model-serving/SKILL.md), [`data-distributed-storage`](../skills/data/distributed-storage/SKILL.md), [`data-distributed-compute`](../skills/data/distributed-compute/SKILL.md), [`data-data-lake`](../skills/data/data-lake/SKILL.md), [`data-data-lakehouse`](../skills/data/data-lakehouse/SKILL.md), [`data-batch-processing`](../skills/data/batch-processing/SKILL.md), [`data-data-platform`](../skills/data/data-platform/SKILL.md), [`data-data-catalog`](../skills/data/data-catalog/SKILL.md), [`data-data-observability`](../skills/data/data-observability/SKILL.md), [`data-data-contracts`](../skills/data/data-contracts/SKILL.md), [`data-data-mesh`](../skills/data/data-mesh/SKILL.md), [`data-data-versioning`](../skills/data/data-versioning/SKILL.md), [`data-data-api`](../skills/data/data-api/SKILL.md), [`data-data-virtualization`](../skills/data/data-virtualization/SKILL.md), [`data-schema-registry`](../skills/data/schema-registry/SKILL.md), [`data-relational-database`](../skills/data/relational-database/SKILL.md), [`data-nosql-database`](../skills/data/nosql-database/SKILL.md), [`data-graph-database`](../skills/data/graph-database/SKILL.md), [`data-search-engine`](../skills/data/search-engine/SKILL.md), [`llm-finetuning`](../skills/ai/llm-finetuning/SKILL.md), [`genai-vision`](../skills/ai/genai-vision/SKILL.md), [`multimodal-pipelines`](../skills/rnd/ai-agents/multimodal-pipelines/SKILL.md), [`ai-defense-mechanisms`](../skills/rnd/security/ai-defense-mechanisms/SKILL.md), [`ai-agentic-workflows`](../skills/ai/agentic-workflows/SKILL.md), [`tool-calling-principles`](../skills/ai/ai-agents/tool-calling-principles/SKILL.md), [`devops-dataops`](../skills/devops/dataops/SKILL.md), [`devops-mlops`](../skills/devops/mlops/SKILL.md), [`devops-kubernetes-for-data`](../skills/devops/kubernetes-for-data/SKILL.md), [`cloud-cost-optimization`](../skills/devops/cloud-cost-optimization/SKILL.md), [`security-data-security`](../skills/security/data-security/SKILL.md), [`planning-bpmn-modeling`](../skills/planning/bpmn-modeling/SKILL.md), [`planning-bdd-atdd`](../skills/planning/bdd-atdd/SKILL.md), [`agile-scrum-kanban`](../skills/management/agile-scrum-kanban/SKILL.md), [`management-team-topology`](../skills/management/team-topology/SKILL.md), [`management-change-management`](../skills/management/change-management/SKILL.md), [`quality-acceptance-testing`](../skills/quality/acceptance-testing/SKILL.md), [`quality-regression-testing`](../skills/quality/regression-testing/SKILL.md), [`quality-smoke-testing`](../skills/quality/smoke-testing/SKILL.md), [`data-data-strategy`](../skills/data/data-strategy/SKILL.md), [`data-dimensional-modeling`](../skills/data/dimensional-modeling/SKILL.md), [`data-science-statistical-analysis`](../skills/data-science/statistical-analysis/SKILL.md), [`data-science-experimentation`](../skills/data-science/experimentation/SKILL.md), [`data-science-causal-inference`](../skills/data-science/causal-inference/SKILL.md), [`data-science-analytics-engineering`](../skills/data-science/analytics-engineering/SKILL.md), [`enterprise-togaf-zachman`](../skills/enterprise/togaf-zachman/SKILL.md), [`enterprise-itil-service-mgmt`](../skills/enterprise/itil-service-mgmt/SKILL.md), [`enterprise-vendor-management`](../skills/enterprise/vendor-management/SKILL.md), [`enterprise-architecture-governance`](../skills/enterprise/architecture-governance/SKILL.md), [`product-customer-journey`](../skills/product/customer-journey/SKILL.md), [`product-persona-development`](../skills/product/persona-development/SKILL.md), [`dotnet-architecture`](../skills/backend/dotnet/architecture/SKILL.md), [`dotnet-patterns`](../skills/backend/dotnet/patterns/SKILL.md), [`lang-csharp`](../skills/languages/csharp/SKILL.md), [`react-architecture`](../skills/frontend/react/architecture/SKILL.md), [`react-nextjs`](../skills/frontend/react/nextjs/SKILL.md), [`react-fiber-architecture`](../skills/frontend/react/react-fiber/SKILL.md)

</details>

### fullstack-nodejs-react

Full stack: Node.js backend + React frontend — **223 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-brief --skill create-prd --skill create-tech-spec --skill create-story --skill design-patterns --skill microservices --skill backend-clean-architecture --skill backend-api-design --skill backend-api-response --skill backend-database-patterns --skill backend-auth-patterns --skill quality-unit-testing --skill quality-integration-testing --skill frontend-design-system --skill frontend-state-management --skill frontend-performance --skill frontend-accessibility --skill frontend-testing --skill frontend-patterns --skill microfrontend --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-security-auditor --skill dev-loop-git-workflow --skill docker-patterns --skill cicd-pipeline --skill helm-patterns --skill terraform --skill ansible --skill monitoring --skill alerting --skill team-rules --skill security --skill pentesting --skill backend-grpc-patterns --skill backend-websocket-patterns --skill backend-message-queue --skill backend-caching --skill rate-limiting --skill quality-load-testing --skill frontend-tailwind-css --skill frontend-storybook --skill frontend-pwa --skill frontend-seo --skill github-actions --skill gitops --skill vault --skill aws --skill backend-serverless --skill devops-serverless --skill monorepo --skill dependency-management --skill api-documentation --skill backend-graphql-patterns --skill backend-background-jobs --skill backend-search-patterns --skill data-streaming --skill backend-file-storage --skill backend-feature-flags --skill frontend-feature-flags --skill backend-internationalization --skill frontend-internationalization --skill backend-structured-logging --skill frontend-animation --skill frontend-form-handling --skill frontend-data-fetching --skill frontend-bundler-tools --skill frontend-image-optimization --skill frontend-theming --skill mobile-kotlin-multiplatform --skill mobile-ionic-capacitor --skill mobile-dotnet-maui --skill mobile-deep-linking --skill mobile-offline-first --skill mobile-biometrics --skill map-location --skill mobile-camera-media --skill product-analytics --skill argo-cd --skill devops-azure --skill devops-gcp --skill devops-chaos-engineering --skill devops-service-mesh --skill devops-finops --skill backup-dr --skill database-migration --skill dev-loop-pr-writer --skill dev-loop-dev-container --skill dev-loop-tech-debt-tracker --skill dev-loop-api-client-generator --skill management-okr-kpi --skill sprint-retro --skill management-risk-management --skill planning-create-roadmap --skill planning-create-pitch-deck --skill planning-market-analysis --skill core-onboarding --skill core-context-compressor --skill enterprise-compliance-audit --skill enterprise-multi-tenant --skill enterprise-integration-patterns --skill enterprise-data-governance --skill enterprise-sla-management --skill enterprise-legacy-migration --skill enterprise-identity-provider --skill enterprise-cost-governance --skill product-ab-testing --skill product-user-research --skill product-growth-engineering --skill product-pricing-strategy --skill product-go-to-market --skill product-onboarding-flow --skill prompt-chain-of-thought --skill prompt-few-shot --skill prompt-tree-of-thoughts --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill ml-inference-optimization --skill llm-kv-cache-paged-attention --skill data-vector-databases --skill ai-agent-architectures --skill agent-observability --skill security-sast-dast --skill security-sbom --skill security-secrets-management --skill security-container-security --skill security-api-security --skill data-etl-pipeline --skill data-data-warehouse --skill data-bi-tools --skill data-data-quality --skill design-systems --skill design-ux-research --skill design-accessibility --skill design-motion-design --skill quality-e2e-testing --skill quality-visual-testing --skill quality-contract-testing --skill frontend-lit --skill frontend-web-components --skill mobile-ar-vr --skill nomad --skill devops-incident-response --skill cost-benefit --skill management-hiring --skill management-stakeholder --skill ml-experiment-tracking --skill ml-classical-ml --skill ml-deep-learning --skill ml-feature-engineering --skill ml-hyperparameter-tuning --skill ml-model-evaluation --skill ml-model-interpretability --skill ml-time-series --skill ml-nlp --skill ml-computer-vision --skill ml-recommendation-systems --skill ml-anomaly-detection --skill ml-ml-pipeline --skill ml-feature-store --skill ml-model-serving --skill data-distributed-storage --skill data-distributed-compute --skill data-data-lake --skill data-data-lakehouse --skill data-batch-processing --skill data-data-platform --skill data-data-catalog --skill data-data-observability --skill data-data-contracts --skill data-data-mesh --skill data-data-versioning --skill data-data-api --skill data-data-virtualization --skill data-schema-registry --skill data-relational-database --skill data-nosql-database --skill data-graph-database --skill data-search-engine --skill llm-finetuning --skill genai-vision --skill multimodal-pipelines --skill ai-defense-mechanisms --skill ai-agentic-workflows --skill tool-calling-principles --skill devops-dataops --skill devops-mlops --skill devops-kubernetes-for-data --skill cloud-cost-optimization --skill security-data-security --skill planning-bpmn-modeling --skill planning-bdd-atdd --skill agile-scrum-kanban --skill management-team-topology --skill management-change-management --skill quality-acceptance-testing --skill quality-regression-testing --skill quality-smoke-testing --skill data-data-strategy --skill data-dimensional-modeling --skill data-science-statistical-analysis --skill data-science-experimentation --skill data-science-causal-inference --skill data-science-analytics-engineering --skill enterprise-togaf-zachman --skill enterprise-itil-service-mgmt --skill enterprise-vendor-management --skill enterprise-architecture-governance --skill product-customer-journey --skill product-persona-development --skill nodejs-architecture --skill nodejs-drizzle --skill nodejs-express-skill --skill nodejs-fastify --skill nodejs-hono --skill nodejs-patterns --skill nodejs-prisma --skill typescript --skill react-architecture --skill react-nextjs --skill react-fiber-architecture
```

</details>

<details><summary>Skills</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`create-story`](../skills/planning/create-story/SKILL.md), [`design-patterns`](../skills/backend/universal/design-patterns/SKILL.md), [`microservices`](../skills/backend/universal/microservices/SKILL.md), [`backend-clean-architecture`](../skills/backend/universal/clean-architecture/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-api-response`](../skills/backend/universal/api-response/SKILL.md), [`backend-database-patterns`](../skills/backend/universal/database-patterns/SKILL.md), [`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`quality-unit-testing`](../skills/quality/unit-testing/SKILL.md), [`quality-integration-testing`](../skills/quality/integration-testing/SKILL.md), [`frontend-design-system`](../skills/frontend/universal/design-system/SKILL.md), [`frontend-state-management`](../skills/frontend/universal/state-management/SKILL.md), [`frontend-performance`](../skills/frontend/universal/performance/SKILL.md), [`frontend-accessibility`](../skills/frontend/universal/accessibility/SKILL.md), [`frontend-testing`](../skills/frontend/universal/testing/SKILL.md), [`frontend-patterns`](../skills/frontend/universal/patterns/SKILL.md), [`microfrontend`](../skills/frontend/universal/microfrontend/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-security-auditor`](../skills/dev-loop/security-auditor/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`helm-patterns`](../skills/devops/helm-patterns/SKILL.md), [`terraform`](../skills/devops/terraform/SKILL.md), [`ansible`](../skills/devops/ansible/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`backend-grpc-patterns`](../skills/backend/universal/grpc-patterns/SKILL.md), [`backend-websocket-patterns`](../skills/backend/universal/websocket-patterns/SKILL.md), [`backend-message-queue`](../skills/backend/universal/message-queue/SKILL.md), [`backend-caching`](../skills/backend/universal/caching/SKILL.md), [`rate-limiting`](../skills/backend/universal/rate-limiting/SKILL.md), [`quality-load-testing`](../skills/quality/load-testing/SKILL.md), [`frontend-tailwind-css`](../skills/frontend/universal/tailwind-css/SKILL.md), [`frontend-storybook`](../skills/frontend/universal/storybook/SKILL.md), [`frontend-pwa`](../skills/frontend/universal/pwa/SKILL.md), [`frontend-seo`](../skills/frontend/universal/seo/SKILL.md), [`github-actions`](../skills/devops/github-actions/SKILL.md), [`gitops`](../skills/devops/gitops/SKILL.md), [`vault`](../skills/devops/vault/SKILL.md), [`aws`](../skills/devops/aws/SKILL.md), [`backend-serverless`](../skills/backend/universal/serverless/SKILL.md), [`devops-serverless`](../skills/devops/serverless/SKILL.md), [`monorepo`](../skills/devops/monorepo/SKILL.md), [`dependency-management`](../skills/devops/dependency-management/SKILL.md), [`api-documentation`](../skills/devops/api-documentation/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`frontend-feature-flags`](../skills/frontend/universal/feature-flags/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`frontend-internationalization`](../skills/frontend/universal/internationalization/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`frontend-animation`](../skills/frontend/universal/animation/SKILL.md), [`frontend-form-handling`](../skills/frontend/universal/form-handling/SKILL.md), [`frontend-data-fetching`](../skills/frontend/universal/data-fetching/SKILL.md), [`frontend-bundler-tools`](../skills/frontend/universal/bundler-tools/SKILL.md), [`frontend-image-optimization`](../skills/frontend/universal/image-optimization/SKILL.md), [`frontend-theming`](../skills/frontend/universal/theming/SKILL.md), [`mobile-kotlin-multiplatform`](../skills/mobile/kotlin-multiplatform/SKILL.md), [`mobile-ionic-capacitor`](../skills/mobile/ionic-capacitor/SKILL.md), [`mobile-dotnet-maui`](../skills/mobile/dotnet-maui/SKILL.md), [`mobile-deep-linking`](../skills/mobile/universal/deep-linking/SKILL.md), [`mobile-offline-first`](../skills/mobile/universal/offline-first/SKILL.md), [`mobile-biometrics`](../skills/mobile/universal/biometrics/SKILL.md), [`map-location`](../skills/mobile/universal/map-location/SKILL.md), [`mobile-camera-media`](../skills/mobile/universal/camera-media/SKILL.md), [`product-analytics`](../skills/product/analytics/SKILL.md), [`argo-cd`](../skills/devops/argo-cd/SKILL.md), [`devops-azure`](../skills/devops/azure/SKILL.md), [`devops-gcp`](../skills/devops/gcp/SKILL.md), [`devops-chaos-engineering`](../skills/devops/chaos-engineering/SKILL.md), [`devops-service-mesh`](../skills/devops/service-mesh/SKILL.md), [`devops-finops`](../skills/devops/finops/SKILL.md), [`backup-dr`](../skills/devops/backup-dr/SKILL.md), [`database-migration`](../skills/devops/database-migration/SKILL.md), [`dev-loop-pr-writer`](../skills/dev-loop/pr-writer/SKILL.md), [`dev-loop-dev-container`](../skills/dev-loop/dev-container/SKILL.md), [`dev-loop-tech-debt-tracker`](../skills/dev-loop/tech-debt-tracker/SKILL.md), [`dev-loop-api-client-generator`](../skills/dev-loop/api-client-generator/SKILL.md), [`management-okr-kpi`](../skills/management/okr-kpi/SKILL.md), [`sprint-retro`](../skills/management/sprint-retro/SKILL.md), [`management-risk-management`](../skills/management/risk-management/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md), [`planning-create-pitch-deck`](../skills/planning/create-pitch-deck/SKILL.md), [`planning-market-analysis`](../skills/planning/market-analysis/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md), [`enterprise-multi-tenant`](../skills/enterprise/multi-tenant/SKILL.md), [`enterprise-integration-patterns`](../skills/enterprise/integration-patterns/SKILL.md), [`enterprise-data-governance`](../skills/enterprise/data-governance/SKILL.md), [`enterprise-sla-management`](../skills/enterprise/sla-management/SKILL.md), [`enterprise-legacy-migration`](../skills/enterprise/legacy-migration/SKILL.md), [`enterprise-identity-provider`](../skills/enterprise/identity-provider/SKILL.md), [`enterprise-cost-governance`](../skills/enterprise/cost-governance/SKILL.md), [`product-ab-testing`](../skills/product/ab-testing/SKILL.md), [`product-user-research`](../skills/product/user-research/SKILL.md), [`product-growth-engineering`](../skills/product/growth-engineering/SKILL.md), [`product-pricing-strategy`](../skills/product/pricing-strategy/SKILL.md), [`product-go-to-market`](../skills/product/go-to-market/SKILL.md), [`product-onboarding-flow`](../skills/product/onboarding-flow/SKILL.md), [`prompt-chain-of-thought`](../skills/prompt-engineering/chain-of-thought/SKILL.md), [`prompt-few-shot`](../skills/prompt-engineering/few-shot-prompting/SKILL.md), [`prompt-tree-of-thoughts`](../skills/prompt-engineering/tree-of-thoughts/SKILL.md), [`llm-rag-retrieval-internals`](../skills/ai/llm-engineering/rag-architecture/SKILL.md), [`prompt-rag-query-design`](../skills/prompt-engineering/rag-design/SKILL.md), [`ml-inference-optimization`](../skills/ml/inference-optimization/SKILL.md), [`llm-kv-cache-paged-attention`](../skills/ai/llm-engineering/kv-cache/SKILL.md), [`data-vector-databases`](../skills/data/vector-databases/SKILL.md), [`ai-agent-architectures`](../skills/ai/ai-agents/SKILL.md), [`agent-observability`](../skills/harness-engineering/agent-observability/SKILL.md), [`security-sast-dast`](../skills/security/sast-dast/SKILL.md), [`security-sbom`](../skills/security/sbom/SKILL.md), [`security-secrets-management`](../skills/security/secrets-management/SKILL.md), [`security-container-security`](../skills/security/container-security/SKILL.md), [`security-api-security`](../skills/security/api-security/SKILL.md), [`data-etl-pipeline`](../skills/data/etl-pipeline/SKILL.md), [`data-data-warehouse`](../skills/data/data-warehouse/SKILL.md), [`data-bi-tools`](../skills/data/bi-tools/SKILL.md), [`data-data-quality`](../skills/data/data-quality/SKILL.md), [`design-systems`](../skills/design/design-systems/SKILL.md), [`design-ux-research`](../skills/design/ux-research/SKILL.md), [`design-accessibility`](../skills/design/accessibility/SKILL.md), [`design-motion-design`](../skills/design/motion-design/SKILL.md), [`quality-e2e-testing`](../skills/quality/quality-e2e-testing/SKILL.md), [`quality-visual-testing`](../skills/quality/visual-testing/SKILL.md), [`quality-contract-testing`](../skills/quality/contract-testing/SKILL.md), [`frontend-lit`](../skills/frontend/lit/SKILL.md), [`frontend-web-components`](../skills/frontend/universal/web-components/SKILL.md), [`mobile-ar-vr`](../skills/mobile/universal/ar-vr/SKILL.md), [`nomad`](../skills/devops/nomad/SKILL.md), [`devops-incident-response`](../skills/devops/incident-response/SKILL.md), [`cost-benefit`](../skills/management/cost-benefit/SKILL.md), [`management-hiring`](../skills/management/hiring/SKILL.md), [`management-stakeholder`](../skills/management/stakeholder/SKILL.md), [`ml-experiment-tracking`](../skills/ml/experiment-tracking/SKILL.md), [`ml-classical-ml`](../skills/ml/classical-ml/SKILL.md), [`ml-deep-learning`](../skills/ml/deep-learning/SKILL.md), [`ml-feature-engineering`](../skills/ml/feature-engineering/SKILL.md), [`ml-hyperparameter-tuning`](../skills/ml/hyperparameter-tuning/SKILL.md), [`ml-model-evaluation`](../skills/ml/model-evaluation/SKILL.md), [`ml-model-interpretability`](../skills/ml/model-interpretability/SKILL.md), [`ml-time-series`](../skills/ml/time-series/SKILL.md), [`ml-nlp`](../skills/ml/nlp/SKILL.md), [`ml-computer-vision`](../skills/ml/computer-vision/SKILL.md), [`ml-recommendation-systems`](../skills/ml/recommendation-systems/SKILL.md), [`ml-anomaly-detection`](../skills/ml/anomaly-detection/SKILL.md), [`ml-ml-pipeline`](../skills/ml/ml-pipeline/SKILL.md), [`ml-feature-store`](../skills/ml/feature-store/SKILL.md), [`ml-model-serving`](../skills/ml/model-serving/SKILL.md), [`data-distributed-storage`](../skills/data/distributed-storage/SKILL.md), [`data-distributed-compute`](../skills/data/distributed-compute/SKILL.md), [`data-data-lake`](../skills/data/data-lake/SKILL.md), [`data-data-lakehouse`](../skills/data/data-lakehouse/SKILL.md), [`data-batch-processing`](../skills/data/batch-processing/SKILL.md), [`data-data-platform`](../skills/data/data-platform/SKILL.md), [`data-data-catalog`](../skills/data/data-catalog/SKILL.md), [`data-data-observability`](../skills/data/data-observability/SKILL.md), [`data-data-contracts`](../skills/data/data-contracts/SKILL.md), [`data-data-mesh`](../skills/data/data-mesh/SKILL.md), [`data-data-versioning`](../skills/data/data-versioning/SKILL.md), [`data-data-api`](../skills/data/data-api/SKILL.md), [`data-data-virtualization`](../skills/data/data-virtualization/SKILL.md), [`data-schema-registry`](../skills/data/schema-registry/SKILL.md), [`data-relational-database`](../skills/data/relational-database/SKILL.md), [`data-nosql-database`](../skills/data/nosql-database/SKILL.md), [`data-graph-database`](../skills/data/graph-database/SKILL.md), [`data-search-engine`](../skills/data/search-engine/SKILL.md), [`llm-finetuning`](../skills/ai/llm-finetuning/SKILL.md), [`genai-vision`](../skills/ai/genai-vision/SKILL.md), [`multimodal-pipelines`](../skills/rnd/ai-agents/multimodal-pipelines/SKILL.md), [`ai-defense-mechanisms`](../skills/rnd/security/ai-defense-mechanisms/SKILL.md), [`ai-agentic-workflows`](../skills/ai/agentic-workflows/SKILL.md), [`tool-calling-principles`](../skills/ai/ai-agents/tool-calling-principles/SKILL.md), [`devops-dataops`](../skills/devops/dataops/SKILL.md), [`devops-mlops`](../skills/devops/mlops/SKILL.md), [`devops-kubernetes-for-data`](../skills/devops/kubernetes-for-data/SKILL.md), [`cloud-cost-optimization`](../skills/devops/cloud-cost-optimization/SKILL.md), [`security-data-security`](../skills/security/data-security/SKILL.md), [`planning-bpmn-modeling`](../skills/planning/bpmn-modeling/SKILL.md), [`planning-bdd-atdd`](../skills/planning/bdd-atdd/SKILL.md), [`agile-scrum-kanban`](../skills/management/agile-scrum-kanban/SKILL.md), [`management-team-topology`](../skills/management/team-topology/SKILL.md), [`management-change-management`](../skills/management/change-management/SKILL.md), [`quality-acceptance-testing`](../skills/quality/acceptance-testing/SKILL.md), [`quality-regression-testing`](../skills/quality/regression-testing/SKILL.md), [`quality-smoke-testing`](../skills/quality/smoke-testing/SKILL.md), [`data-data-strategy`](../skills/data/data-strategy/SKILL.md), [`data-dimensional-modeling`](../skills/data/dimensional-modeling/SKILL.md), [`data-science-statistical-analysis`](../skills/data-science/statistical-analysis/SKILL.md), [`data-science-experimentation`](../skills/data-science/experimentation/SKILL.md), [`data-science-causal-inference`](../skills/data-science/causal-inference/SKILL.md), [`data-science-analytics-engineering`](../skills/data-science/analytics-engineering/SKILL.md), [`enterprise-togaf-zachman`](../skills/enterprise/togaf-zachman/SKILL.md), [`enterprise-itil-service-mgmt`](../skills/enterprise/itil-service-mgmt/SKILL.md), [`enterprise-vendor-management`](../skills/enterprise/vendor-management/SKILL.md), [`enterprise-architecture-governance`](../skills/enterprise/architecture-governance/SKILL.md), [`product-customer-journey`](../skills/product/customer-journey/SKILL.md), [`product-persona-development`](../skills/product/persona-development/SKILL.md), [`nodejs-architecture`](../skills/backend/nodejs/architecture/SKILL.md), [`nodejs-drizzle`](../skills/backend/nodejs/drizzle/SKILL.md), [`nodejs-express-skill`](../skills/backend/nodejs/express/SKILL.md), [`nodejs-fastify`](../skills/backend/nodejs/fastify/SKILL.md), [`nodejs-hono`](../skills/backend/nodejs/hono/SKILL.md), [`nodejs-patterns`](../skills/backend/nodejs/patterns/SKILL.md), [`nodejs-prisma`](../skills/backend/nodejs/prisma/SKILL.md), [`typescript`](../skills/languages/typescript/SKILL.md), [`react-architecture`](../skills/frontend/react/architecture/SKILL.md), [`react-nextjs`](../skills/frontend/react/nextjs/SKILL.md), [`react-fiber-architecture`](../skills/frontend/react/react-fiber/SKILL.md)

</details>

### fullstack-elysia-react

Full stack: ElysiaJS (Bun) backend + React frontend — **218 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-brief --skill create-prd --skill create-tech-spec --skill create-story --skill design-patterns --skill microservices --skill backend-clean-architecture --skill backend-api-design --skill backend-api-response --skill backend-database-patterns --skill backend-auth-patterns --skill quality-unit-testing --skill quality-integration-testing --skill frontend-design-system --skill frontend-state-management --skill frontend-performance --skill frontend-accessibility --skill frontend-testing --skill frontend-patterns --skill microfrontend --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-security-auditor --skill dev-loop-git-workflow --skill docker-patterns --skill cicd-pipeline --skill helm-patterns --skill terraform --skill ansible --skill monitoring --skill alerting --skill team-rules --skill security --skill pentesting --skill backend-grpc-patterns --skill backend-websocket-patterns --skill backend-message-queue --skill backend-caching --skill rate-limiting --skill quality-load-testing --skill frontend-tailwind-css --skill frontend-storybook --skill frontend-pwa --skill frontend-seo --skill github-actions --skill gitops --skill vault --skill aws --skill backend-serverless --skill devops-serverless --skill monorepo --skill dependency-management --skill api-documentation --skill backend-graphql-patterns --skill backend-background-jobs --skill backend-search-patterns --skill data-streaming --skill backend-file-storage --skill backend-feature-flags --skill frontend-feature-flags --skill backend-internationalization --skill frontend-internationalization --skill backend-structured-logging --skill frontend-animation --skill frontend-form-handling --skill frontend-data-fetching --skill frontend-bundler-tools --skill frontend-image-optimization --skill frontend-theming --skill mobile-kotlin-multiplatform --skill mobile-ionic-capacitor --skill mobile-dotnet-maui --skill mobile-deep-linking --skill mobile-offline-first --skill mobile-biometrics --skill map-location --skill mobile-camera-media --skill product-analytics --skill argo-cd --skill devops-azure --skill devops-gcp --skill devops-chaos-engineering --skill devops-service-mesh --skill devops-finops --skill backup-dr --skill database-migration --skill dev-loop-pr-writer --skill dev-loop-dev-container --skill dev-loop-tech-debt-tracker --skill dev-loop-api-client-generator --skill management-okr-kpi --skill sprint-retro --skill management-risk-management --skill planning-create-roadmap --skill planning-create-pitch-deck --skill planning-market-analysis --skill core-onboarding --skill core-context-compressor --skill enterprise-compliance-audit --skill enterprise-multi-tenant --skill enterprise-integration-patterns --skill enterprise-data-governance --skill enterprise-sla-management --skill enterprise-legacy-migration --skill enterprise-identity-provider --skill enterprise-cost-governance --skill product-ab-testing --skill product-user-research --skill product-growth-engineering --skill product-pricing-strategy --skill product-go-to-market --skill product-onboarding-flow --skill prompt-chain-of-thought --skill prompt-few-shot --skill prompt-tree-of-thoughts --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill ml-inference-optimization --skill llm-kv-cache-paged-attention --skill data-vector-databases --skill ai-agent-architectures --skill agent-observability --skill security-sast-dast --skill security-sbom --skill security-secrets-management --skill security-container-security --skill security-api-security --skill data-etl-pipeline --skill data-data-warehouse --skill data-bi-tools --skill data-data-quality --skill design-systems --skill design-ux-research --skill design-accessibility --skill design-motion-design --skill quality-e2e-testing --skill quality-visual-testing --skill quality-contract-testing --skill frontend-lit --skill frontend-web-components --skill mobile-ar-vr --skill nomad --skill devops-incident-response --skill cost-benefit --skill management-hiring --skill management-stakeholder --skill ml-experiment-tracking --skill ml-classical-ml --skill ml-deep-learning --skill ml-feature-engineering --skill ml-hyperparameter-tuning --skill ml-model-evaluation --skill ml-model-interpretability --skill ml-time-series --skill ml-nlp --skill ml-computer-vision --skill ml-recommendation-systems --skill ml-anomaly-detection --skill ml-ml-pipeline --skill ml-feature-store --skill ml-model-serving --skill data-distributed-storage --skill data-distributed-compute --skill data-data-lake --skill data-data-lakehouse --skill data-batch-processing --skill data-data-platform --skill data-data-catalog --skill data-data-observability --skill data-data-contracts --skill data-data-mesh --skill data-data-versioning --skill data-data-api --skill data-data-virtualization --skill data-schema-registry --skill data-relational-database --skill data-nosql-database --skill data-graph-database --skill data-search-engine --skill llm-finetuning --skill genai-vision --skill multimodal-pipelines --skill ai-defense-mechanisms --skill ai-agentic-workflows --skill tool-calling-principles --skill devops-dataops --skill devops-mlops --skill devops-kubernetes-for-data --skill cloud-cost-optimization --skill security-data-security --skill planning-bpmn-modeling --skill planning-bdd-atdd --skill agile-scrum-kanban --skill management-team-topology --skill management-change-management --skill quality-acceptance-testing --skill quality-regression-testing --skill quality-smoke-testing --skill data-data-strategy --skill data-dimensional-modeling --skill data-science-statistical-analysis --skill data-science-experimentation --skill data-science-causal-inference --skill data-science-analytics-engineering --skill enterprise-togaf-zachman --skill enterprise-itil-service-mgmt --skill enterprise-vendor-management --skill enterprise-architecture-governance --skill product-customer-journey --skill product-persona-development --skill elysia-architecture --skill elysia-patterns --skill bun --skill react-architecture --skill react-nextjs --skill react-fiber-architecture
```

</details>

<details><summary>Skills</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`create-story`](../skills/planning/create-story/SKILL.md), [`design-patterns`](../skills/backend/universal/design-patterns/SKILL.md), [`microservices`](../skills/backend/universal/microservices/SKILL.md), [`backend-clean-architecture`](../skills/backend/universal/clean-architecture/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-api-response`](../skills/backend/universal/api-response/SKILL.md), [`backend-database-patterns`](../skills/backend/universal/database-patterns/SKILL.md), [`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`quality-unit-testing`](../skills/quality/unit-testing/SKILL.md), [`quality-integration-testing`](../skills/quality/integration-testing/SKILL.md), [`frontend-design-system`](../skills/frontend/universal/design-system/SKILL.md), [`frontend-state-management`](../skills/frontend/universal/state-management/SKILL.md), [`frontend-performance`](../skills/frontend/universal/performance/SKILL.md), [`frontend-accessibility`](../skills/frontend/universal/accessibility/SKILL.md), [`frontend-testing`](../skills/frontend/universal/testing/SKILL.md), [`frontend-patterns`](../skills/frontend/universal/patterns/SKILL.md), [`microfrontend`](../skills/frontend/universal/microfrontend/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-security-auditor`](../skills/dev-loop/security-auditor/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`helm-patterns`](../skills/devops/helm-patterns/SKILL.md), [`terraform`](../skills/devops/terraform/SKILL.md), [`ansible`](../skills/devops/ansible/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`backend-grpc-patterns`](../skills/backend/universal/grpc-patterns/SKILL.md), [`backend-websocket-patterns`](../skills/backend/universal/websocket-patterns/SKILL.md), [`backend-message-queue`](../skills/backend/universal/message-queue/SKILL.md), [`backend-caching`](../skills/backend/universal/caching/SKILL.md), [`rate-limiting`](../skills/backend/universal/rate-limiting/SKILL.md), [`quality-load-testing`](../skills/quality/load-testing/SKILL.md), [`frontend-tailwind-css`](../skills/frontend/universal/tailwind-css/SKILL.md), [`frontend-storybook`](../skills/frontend/universal/storybook/SKILL.md), [`frontend-pwa`](../skills/frontend/universal/pwa/SKILL.md), [`frontend-seo`](../skills/frontend/universal/seo/SKILL.md), [`github-actions`](../skills/devops/github-actions/SKILL.md), [`gitops`](../skills/devops/gitops/SKILL.md), [`vault`](../skills/devops/vault/SKILL.md), [`aws`](../skills/devops/aws/SKILL.md), [`backend-serverless`](../skills/backend/universal/serverless/SKILL.md), [`devops-serverless`](../skills/devops/serverless/SKILL.md), [`monorepo`](../skills/devops/monorepo/SKILL.md), [`dependency-management`](../skills/devops/dependency-management/SKILL.md), [`api-documentation`](../skills/devops/api-documentation/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`frontend-feature-flags`](../skills/frontend/universal/feature-flags/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`frontend-internationalization`](../skills/frontend/universal/internationalization/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`frontend-animation`](../skills/frontend/universal/animation/SKILL.md), [`frontend-form-handling`](../skills/frontend/universal/form-handling/SKILL.md), [`frontend-data-fetching`](../skills/frontend/universal/data-fetching/SKILL.md), [`frontend-bundler-tools`](../skills/frontend/universal/bundler-tools/SKILL.md), [`frontend-image-optimization`](../skills/frontend/universal/image-optimization/SKILL.md), [`frontend-theming`](../skills/frontend/universal/theming/SKILL.md), [`mobile-kotlin-multiplatform`](../skills/mobile/kotlin-multiplatform/SKILL.md), [`mobile-ionic-capacitor`](../skills/mobile/ionic-capacitor/SKILL.md), [`mobile-dotnet-maui`](../skills/mobile/dotnet-maui/SKILL.md), [`mobile-deep-linking`](../skills/mobile/universal/deep-linking/SKILL.md), [`mobile-offline-first`](../skills/mobile/universal/offline-first/SKILL.md), [`mobile-biometrics`](../skills/mobile/universal/biometrics/SKILL.md), [`map-location`](../skills/mobile/universal/map-location/SKILL.md), [`mobile-camera-media`](../skills/mobile/universal/camera-media/SKILL.md), [`product-analytics`](../skills/product/analytics/SKILL.md), [`argo-cd`](../skills/devops/argo-cd/SKILL.md), [`devops-azure`](../skills/devops/azure/SKILL.md), [`devops-gcp`](../skills/devops/gcp/SKILL.md), [`devops-chaos-engineering`](../skills/devops/chaos-engineering/SKILL.md), [`devops-service-mesh`](../skills/devops/service-mesh/SKILL.md), [`devops-finops`](../skills/devops/finops/SKILL.md), [`backup-dr`](../skills/devops/backup-dr/SKILL.md), [`database-migration`](../skills/devops/database-migration/SKILL.md), [`dev-loop-pr-writer`](../skills/dev-loop/pr-writer/SKILL.md), [`dev-loop-dev-container`](../skills/dev-loop/dev-container/SKILL.md), [`dev-loop-tech-debt-tracker`](../skills/dev-loop/tech-debt-tracker/SKILL.md), [`dev-loop-api-client-generator`](../skills/dev-loop/api-client-generator/SKILL.md), [`management-okr-kpi`](../skills/management/okr-kpi/SKILL.md), [`sprint-retro`](../skills/management/sprint-retro/SKILL.md), [`management-risk-management`](../skills/management/risk-management/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md), [`planning-create-pitch-deck`](../skills/planning/create-pitch-deck/SKILL.md), [`planning-market-analysis`](../skills/planning/market-analysis/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md), [`enterprise-multi-tenant`](../skills/enterprise/multi-tenant/SKILL.md), [`enterprise-integration-patterns`](../skills/enterprise/integration-patterns/SKILL.md), [`enterprise-data-governance`](../skills/enterprise/data-governance/SKILL.md), [`enterprise-sla-management`](../skills/enterprise/sla-management/SKILL.md), [`enterprise-legacy-migration`](../skills/enterprise/legacy-migration/SKILL.md), [`enterprise-identity-provider`](../skills/enterprise/identity-provider/SKILL.md), [`enterprise-cost-governance`](../skills/enterprise/cost-governance/SKILL.md), [`product-ab-testing`](../skills/product/ab-testing/SKILL.md), [`product-user-research`](../skills/product/user-research/SKILL.md), [`product-growth-engineering`](../skills/product/growth-engineering/SKILL.md), [`product-pricing-strategy`](../skills/product/pricing-strategy/SKILL.md), [`product-go-to-market`](../skills/product/go-to-market/SKILL.md), [`product-onboarding-flow`](../skills/product/onboarding-flow/SKILL.md), [`prompt-chain-of-thought`](../skills/prompt-engineering/chain-of-thought/SKILL.md), [`prompt-few-shot`](../skills/prompt-engineering/few-shot-prompting/SKILL.md), [`prompt-tree-of-thoughts`](../skills/prompt-engineering/tree-of-thoughts/SKILL.md), [`llm-rag-retrieval-internals`](../skills/ai/llm-engineering/rag-architecture/SKILL.md), [`prompt-rag-query-design`](../skills/prompt-engineering/rag-design/SKILL.md), [`ml-inference-optimization`](../skills/ml/inference-optimization/SKILL.md), [`llm-kv-cache-paged-attention`](../skills/ai/llm-engineering/kv-cache/SKILL.md), [`data-vector-databases`](../skills/data/vector-databases/SKILL.md), [`ai-agent-architectures`](../skills/ai/ai-agents/SKILL.md), [`agent-observability`](../skills/harness-engineering/agent-observability/SKILL.md), [`security-sast-dast`](../skills/security/sast-dast/SKILL.md), [`security-sbom`](../skills/security/sbom/SKILL.md), [`security-secrets-management`](../skills/security/secrets-management/SKILL.md), [`security-container-security`](../skills/security/container-security/SKILL.md), [`security-api-security`](../skills/security/api-security/SKILL.md), [`data-etl-pipeline`](../skills/data/etl-pipeline/SKILL.md), [`data-data-warehouse`](../skills/data/data-warehouse/SKILL.md), [`data-bi-tools`](../skills/data/bi-tools/SKILL.md), [`data-data-quality`](../skills/data/data-quality/SKILL.md), [`design-systems`](../skills/design/design-systems/SKILL.md), [`design-ux-research`](../skills/design/ux-research/SKILL.md), [`design-accessibility`](../skills/design/accessibility/SKILL.md), [`design-motion-design`](../skills/design/motion-design/SKILL.md), [`quality-e2e-testing`](../skills/quality/quality-e2e-testing/SKILL.md), [`quality-visual-testing`](../skills/quality/visual-testing/SKILL.md), [`quality-contract-testing`](../skills/quality/contract-testing/SKILL.md), [`frontend-lit`](../skills/frontend/lit/SKILL.md), [`frontend-web-components`](../skills/frontend/universal/web-components/SKILL.md), [`mobile-ar-vr`](../skills/mobile/universal/ar-vr/SKILL.md), [`nomad`](../skills/devops/nomad/SKILL.md), [`devops-incident-response`](../skills/devops/incident-response/SKILL.md), [`cost-benefit`](../skills/management/cost-benefit/SKILL.md), [`management-hiring`](../skills/management/hiring/SKILL.md), [`management-stakeholder`](../skills/management/stakeholder/SKILL.md), [`ml-experiment-tracking`](../skills/ml/experiment-tracking/SKILL.md), [`ml-classical-ml`](../skills/ml/classical-ml/SKILL.md), [`ml-deep-learning`](../skills/ml/deep-learning/SKILL.md), [`ml-feature-engineering`](../skills/ml/feature-engineering/SKILL.md), [`ml-hyperparameter-tuning`](../skills/ml/hyperparameter-tuning/SKILL.md), [`ml-model-evaluation`](../skills/ml/model-evaluation/SKILL.md), [`ml-model-interpretability`](../skills/ml/model-interpretability/SKILL.md), [`ml-time-series`](../skills/ml/time-series/SKILL.md), [`ml-nlp`](../skills/ml/nlp/SKILL.md), [`ml-computer-vision`](../skills/ml/computer-vision/SKILL.md), [`ml-recommendation-systems`](../skills/ml/recommendation-systems/SKILL.md), [`ml-anomaly-detection`](../skills/ml/anomaly-detection/SKILL.md), [`ml-ml-pipeline`](../skills/ml/ml-pipeline/SKILL.md), [`ml-feature-store`](../skills/ml/feature-store/SKILL.md), [`ml-model-serving`](../skills/ml/model-serving/SKILL.md), [`data-distributed-storage`](../skills/data/distributed-storage/SKILL.md), [`data-distributed-compute`](../skills/data/distributed-compute/SKILL.md), [`data-data-lake`](../skills/data/data-lake/SKILL.md), [`data-data-lakehouse`](../skills/data/data-lakehouse/SKILL.md), [`data-batch-processing`](../skills/data/batch-processing/SKILL.md), [`data-data-platform`](../skills/data/data-platform/SKILL.md), [`data-data-catalog`](../skills/data/data-catalog/SKILL.md), [`data-data-observability`](../skills/data/data-observability/SKILL.md), [`data-data-contracts`](../skills/data/data-contracts/SKILL.md), [`data-data-mesh`](../skills/data/data-mesh/SKILL.md), [`data-data-versioning`](../skills/data/data-versioning/SKILL.md), [`data-data-api`](../skills/data/data-api/SKILL.md), [`data-data-virtualization`](../skills/data/data-virtualization/SKILL.md), [`data-schema-registry`](../skills/data/schema-registry/SKILL.md), [`data-relational-database`](../skills/data/relational-database/SKILL.md), [`data-nosql-database`](../skills/data/nosql-database/SKILL.md), [`data-graph-database`](../skills/data/graph-database/SKILL.md), [`data-search-engine`](../skills/data/search-engine/SKILL.md), [`llm-finetuning`](../skills/ai/llm-finetuning/SKILL.md), [`genai-vision`](../skills/ai/genai-vision/SKILL.md), [`multimodal-pipelines`](../skills/rnd/ai-agents/multimodal-pipelines/SKILL.md), [`ai-defense-mechanisms`](../skills/rnd/security/ai-defense-mechanisms/SKILL.md), [`ai-agentic-workflows`](../skills/ai/agentic-workflows/SKILL.md), [`tool-calling-principles`](../skills/ai/ai-agents/tool-calling-principles/SKILL.md), [`devops-dataops`](../skills/devops/dataops/SKILL.md), [`devops-mlops`](../skills/devops/mlops/SKILL.md), [`devops-kubernetes-for-data`](../skills/devops/kubernetes-for-data/SKILL.md), [`cloud-cost-optimization`](../skills/devops/cloud-cost-optimization/SKILL.md), [`security-data-security`](../skills/security/data-security/SKILL.md), [`planning-bpmn-modeling`](../skills/planning/bpmn-modeling/SKILL.md), [`planning-bdd-atdd`](../skills/planning/bdd-atdd/SKILL.md), [`agile-scrum-kanban`](../skills/management/agile-scrum-kanban/SKILL.md), [`management-team-topology`](../skills/management/team-topology/SKILL.md), [`management-change-management`](../skills/management/change-management/SKILL.md), [`quality-acceptance-testing`](../skills/quality/acceptance-testing/SKILL.md), [`quality-regression-testing`](../skills/quality/regression-testing/SKILL.md), [`quality-smoke-testing`](../skills/quality/smoke-testing/SKILL.md), [`data-data-strategy`](../skills/data/data-strategy/SKILL.md), [`data-dimensional-modeling`](../skills/data/dimensional-modeling/SKILL.md), [`data-science-statistical-analysis`](../skills/data-science/statistical-analysis/SKILL.md), [`data-science-experimentation`](../skills/data-science/experimentation/SKILL.md), [`data-science-causal-inference`](../skills/data-science/causal-inference/SKILL.md), [`data-science-analytics-engineering`](../skills/data-science/analytics-engineering/SKILL.md), [`enterprise-togaf-zachman`](../skills/enterprise/togaf-zachman/SKILL.md), [`enterprise-itil-service-mgmt`](../skills/enterprise/itil-service-mgmt/SKILL.md), [`enterprise-vendor-management`](../skills/enterprise/vendor-management/SKILL.md), [`enterprise-architecture-governance`](../skills/enterprise/architecture-governance/SKILL.md), [`product-customer-journey`](../skills/product/customer-journey/SKILL.md), [`product-persona-development`](../skills/product/persona-development/SKILL.md), [`elysia-architecture`](../skills/backend/elysia/architecture/SKILL.md), [`elysia-patterns`](../skills/backend/elysia/patterns/SKILL.md), [`bun`](../skills/backend/bun/SKILL.md), [`react-architecture`](../skills/frontend/react/architecture/SKILL.md), [`react-nextjs`](../skills/frontend/react/nextjs/SKILL.md), [`react-fiber-architecture`](../skills/frontend/react/react-fiber/SKILL.md)

</details>

### fullstack-rails-svelte

Full stack: Ruby on Rails backend + SvelteKit frontend — **216 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-brief --skill create-prd --skill create-tech-spec --skill create-story --skill design-patterns --skill microservices --skill backend-clean-architecture --skill backend-api-design --skill backend-api-response --skill backend-database-patterns --skill backend-auth-patterns --skill quality-unit-testing --skill quality-integration-testing --skill frontend-design-system --skill frontend-state-management --skill frontend-performance --skill frontend-accessibility --skill frontend-testing --skill frontend-patterns --skill microfrontend --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-security-auditor --skill dev-loop-git-workflow --skill docker-patterns --skill cicd-pipeline --skill helm-patterns --skill terraform --skill ansible --skill monitoring --skill alerting --skill team-rules --skill security --skill pentesting --skill backend-grpc-patterns --skill backend-websocket-patterns --skill backend-message-queue --skill backend-caching --skill rate-limiting --skill quality-load-testing --skill frontend-tailwind-css --skill frontend-storybook --skill frontend-pwa --skill frontend-seo --skill github-actions --skill gitops --skill vault --skill aws --skill backend-serverless --skill devops-serverless --skill monorepo --skill dependency-management --skill api-documentation --skill backend-graphql-patterns --skill backend-background-jobs --skill backend-search-patterns --skill data-streaming --skill backend-file-storage --skill backend-feature-flags --skill frontend-feature-flags --skill backend-internationalization --skill frontend-internationalization --skill backend-structured-logging --skill frontend-animation --skill frontend-form-handling --skill frontend-data-fetching --skill frontend-bundler-tools --skill frontend-image-optimization --skill frontend-theming --skill mobile-kotlin-multiplatform --skill mobile-ionic-capacitor --skill mobile-dotnet-maui --skill mobile-deep-linking --skill mobile-offline-first --skill mobile-biometrics --skill map-location --skill mobile-camera-media --skill product-analytics --skill argo-cd --skill devops-azure --skill devops-gcp --skill devops-chaos-engineering --skill devops-service-mesh --skill devops-finops --skill backup-dr --skill database-migration --skill dev-loop-pr-writer --skill dev-loop-dev-container --skill dev-loop-tech-debt-tracker --skill dev-loop-api-client-generator --skill management-okr-kpi --skill sprint-retro --skill management-risk-management --skill planning-create-roadmap --skill planning-create-pitch-deck --skill planning-market-analysis --skill core-onboarding --skill core-context-compressor --skill enterprise-compliance-audit --skill enterprise-multi-tenant --skill enterprise-integration-patterns --skill enterprise-data-governance --skill enterprise-sla-management --skill enterprise-legacy-migration --skill enterprise-identity-provider --skill enterprise-cost-governance --skill product-ab-testing --skill product-user-research --skill product-growth-engineering --skill product-pricing-strategy --skill product-go-to-market --skill product-onboarding-flow --skill prompt-chain-of-thought --skill prompt-few-shot --skill prompt-tree-of-thoughts --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill ml-inference-optimization --skill llm-kv-cache-paged-attention --skill data-vector-databases --skill ai-agent-architectures --skill agent-observability --skill security-sast-dast --skill security-sbom --skill security-secrets-management --skill security-container-security --skill security-api-security --skill data-etl-pipeline --skill data-data-warehouse --skill data-bi-tools --skill data-data-quality --skill design-systems --skill design-ux-research --skill design-accessibility --skill design-motion-design --skill quality-e2e-testing --skill quality-visual-testing --skill quality-contract-testing --skill frontend-lit --skill frontend-web-components --skill mobile-ar-vr --skill nomad --skill devops-incident-response --skill cost-benefit --skill management-hiring --skill management-stakeholder --skill ml-experiment-tracking --skill ml-classical-ml --skill ml-deep-learning --skill ml-feature-engineering --skill ml-hyperparameter-tuning --skill ml-model-evaluation --skill ml-model-interpretability --skill ml-time-series --skill ml-nlp --skill ml-computer-vision --skill ml-recommendation-systems --skill ml-anomaly-detection --skill ml-ml-pipeline --skill ml-feature-store --skill ml-model-serving --skill data-distributed-storage --skill data-distributed-compute --skill data-data-lake --skill data-data-lakehouse --skill data-batch-processing --skill data-data-platform --skill data-data-catalog --skill data-data-observability --skill data-data-contracts --skill data-data-mesh --skill data-data-versioning --skill data-data-api --skill data-data-virtualization --skill data-schema-registry --skill data-relational-database --skill data-nosql-database --skill data-graph-database --skill data-search-engine --skill llm-finetuning --skill genai-vision --skill multimodal-pipelines --skill ai-defense-mechanisms --skill ai-agentic-workflows --skill tool-calling-principles --skill devops-dataops --skill devops-mlops --skill devops-kubernetes-for-data --skill cloud-cost-optimization --skill security-data-security --skill planning-bpmn-modeling --skill planning-bdd-atdd --skill agile-scrum-kanban --skill management-team-topology --skill management-change-management --skill quality-acceptance-testing --skill quality-regression-testing --skill quality-smoke-testing --skill data-data-strategy --skill data-dimensional-modeling --skill data-science-statistical-analysis --skill data-science-experimentation --skill data-science-causal-inference --skill data-science-analytics-engineering --skill enterprise-togaf-zachman --skill enterprise-itil-service-mgmt --skill enterprise-vendor-management --skill enterprise-architecture-governance --skill product-customer-journey --skill product-persona-development --skill ruby-rails --skill frontend-svelte-architecture --skill frontend-svelte-patterns --skill sveltekit
```

</details>

<details><summary>Skills</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`create-story`](../skills/planning/create-story/SKILL.md), [`design-patterns`](../skills/backend/universal/design-patterns/SKILL.md), [`microservices`](../skills/backend/universal/microservices/SKILL.md), [`backend-clean-architecture`](../skills/backend/universal/clean-architecture/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-api-response`](../skills/backend/universal/api-response/SKILL.md), [`backend-database-patterns`](../skills/backend/universal/database-patterns/SKILL.md), [`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`quality-unit-testing`](../skills/quality/unit-testing/SKILL.md), [`quality-integration-testing`](../skills/quality/integration-testing/SKILL.md), [`frontend-design-system`](../skills/frontend/universal/design-system/SKILL.md), [`frontend-state-management`](../skills/frontend/universal/state-management/SKILL.md), [`frontend-performance`](../skills/frontend/universal/performance/SKILL.md), [`frontend-accessibility`](../skills/frontend/universal/accessibility/SKILL.md), [`frontend-testing`](../skills/frontend/universal/testing/SKILL.md), [`frontend-patterns`](../skills/frontend/universal/patterns/SKILL.md), [`microfrontend`](../skills/frontend/universal/microfrontend/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-security-auditor`](../skills/dev-loop/security-auditor/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`helm-patterns`](../skills/devops/helm-patterns/SKILL.md), [`terraform`](../skills/devops/terraform/SKILL.md), [`ansible`](../skills/devops/ansible/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`backend-grpc-patterns`](../skills/backend/universal/grpc-patterns/SKILL.md), [`backend-websocket-patterns`](../skills/backend/universal/websocket-patterns/SKILL.md), [`backend-message-queue`](../skills/backend/universal/message-queue/SKILL.md), [`backend-caching`](../skills/backend/universal/caching/SKILL.md), [`rate-limiting`](../skills/backend/universal/rate-limiting/SKILL.md), [`quality-load-testing`](../skills/quality/load-testing/SKILL.md), [`frontend-tailwind-css`](../skills/frontend/universal/tailwind-css/SKILL.md), [`frontend-storybook`](../skills/frontend/universal/storybook/SKILL.md), [`frontend-pwa`](../skills/frontend/universal/pwa/SKILL.md), [`frontend-seo`](../skills/frontend/universal/seo/SKILL.md), [`github-actions`](../skills/devops/github-actions/SKILL.md), [`gitops`](../skills/devops/gitops/SKILL.md), [`vault`](../skills/devops/vault/SKILL.md), [`aws`](../skills/devops/aws/SKILL.md), [`backend-serverless`](../skills/backend/universal/serverless/SKILL.md), [`devops-serverless`](../skills/devops/serverless/SKILL.md), [`monorepo`](../skills/devops/monorepo/SKILL.md), [`dependency-management`](../skills/devops/dependency-management/SKILL.md), [`api-documentation`](../skills/devops/api-documentation/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`frontend-feature-flags`](../skills/frontend/universal/feature-flags/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`frontend-internationalization`](../skills/frontend/universal/internationalization/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`frontend-animation`](../skills/frontend/universal/animation/SKILL.md), [`frontend-form-handling`](../skills/frontend/universal/form-handling/SKILL.md), [`frontend-data-fetching`](../skills/frontend/universal/data-fetching/SKILL.md), [`frontend-bundler-tools`](../skills/frontend/universal/bundler-tools/SKILL.md), [`frontend-image-optimization`](../skills/frontend/universal/image-optimization/SKILL.md), [`frontend-theming`](../skills/frontend/universal/theming/SKILL.md), [`mobile-kotlin-multiplatform`](../skills/mobile/kotlin-multiplatform/SKILL.md), [`mobile-ionic-capacitor`](../skills/mobile/ionic-capacitor/SKILL.md), [`mobile-dotnet-maui`](../skills/mobile/dotnet-maui/SKILL.md), [`mobile-deep-linking`](../skills/mobile/universal/deep-linking/SKILL.md), [`mobile-offline-first`](../skills/mobile/universal/offline-first/SKILL.md), [`mobile-biometrics`](../skills/mobile/universal/biometrics/SKILL.md), [`map-location`](../skills/mobile/universal/map-location/SKILL.md), [`mobile-camera-media`](../skills/mobile/universal/camera-media/SKILL.md), [`product-analytics`](../skills/product/analytics/SKILL.md), [`argo-cd`](../skills/devops/argo-cd/SKILL.md), [`devops-azure`](../skills/devops/azure/SKILL.md), [`devops-gcp`](../skills/devops/gcp/SKILL.md), [`devops-chaos-engineering`](../skills/devops/chaos-engineering/SKILL.md), [`devops-service-mesh`](../skills/devops/service-mesh/SKILL.md), [`devops-finops`](../skills/devops/finops/SKILL.md), [`backup-dr`](../skills/devops/backup-dr/SKILL.md), [`database-migration`](../skills/devops/database-migration/SKILL.md), [`dev-loop-pr-writer`](../skills/dev-loop/pr-writer/SKILL.md), [`dev-loop-dev-container`](../skills/dev-loop/dev-container/SKILL.md), [`dev-loop-tech-debt-tracker`](../skills/dev-loop/tech-debt-tracker/SKILL.md), [`dev-loop-api-client-generator`](../skills/dev-loop/api-client-generator/SKILL.md), [`management-okr-kpi`](../skills/management/okr-kpi/SKILL.md), [`sprint-retro`](../skills/management/sprint-retro/SKILL.md), [`management-risk-management`](../skills/management/risk-management/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md), [`planning-create-pitch-deck`](../skills/planning/create-pitch-deck/SKILL.md), [`planning-market-analysis`](../skills/planning/market-analysis/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md), [`enterprise-multi-tenant`](../skills/enterprise/multi-tenant/SKILL.md), [`enterprise-integration-patterns`](../skills/enterprise/integration-patterns/SKILL.md), [`enterprise-data-governance`](../skills/enterprise/data-governance/SKILL.md), [`enterprise-sla-management`](../skills/enterprise/sla-management/SKILL.md), [`enterprise-legacy-migration`](../skills/enterprise/legacy-migration/SKILL.md), [`enterprise-identity-provider`](../skills/enterprise/identity-provider/SKILL.md), [`enterprise-cost-governance`](../skills/enterprise/cost-governance/SKILL.md), [`product-ab-testing`](../skills/product/ab-testing/SKILL.md), [`product-user-research`](../skills/product/user-research/SKILL.md), [`product-growth-engineering`](../skills/product/growth-engineering/SKILL.md), [`product-pricing-strategy`](../skills/product/pricing-strategy/SKILL.md), [`product-go-to-market`](../skills/product/go-to-market/SKILL.md), [`product-onboarding-flow`](../skills/product/onboarding-flow/SKILL.md), [`prompt-chain-of-thought`](../skills/prompt-engineering/chain-of-thought/SKILL.md), [`prompt-few-shot`](../skills/prompt-engineering/few-shot-prompting/SKILL.md), [`prompt-tree-of-thoughts`](../skills/prompt-engineering/tree-of-thoughts/SKILL.md), [`llm-rag-retrieval-internals`](../skills/ai/llm-engineering/rag-architecture/SKILL.md), [`prompt-rag-query-design`](../skills/prompt-engineering/rag-design/SKILL.md), [`ml-inference-optimization`](../skills/ml/inference-optimization/SKILL.md), [`llm-kv-cache-paged-attention`](../skills/ai/llm-engineering/kv-cache/SKILL.md), [`data-vector-databases`](../skills/data/vector-databases/SKILL.md), [`ai-agent-architectures`](../skills/ai/ai-agents/SKILL.md), [`agent-observability`](../skills/harness-engineering/agent-observability/SKILL.md), [`security-sast-dast`](../skills/security/sast-dast/SKILL.md), [`security-sbom`](../skills/security/sbom/SKILL.md), [`security-secrets-management`](../skills/security/secrets-management/SKILL.md), [`security-container-security`](../skills/security/container-security/SKILL.md), [`security-api-security`](../skills/security/api-security/SKILL.md), [`data-etl-pipeline`](../skills/data/etl-pipeline/SKILL.md), [`data-data-warehouse`](../skills/data/data-warehouse/SKILL.md), [`data-bi-tools`](../skills/data/bi-tools/SKILL.md), [`data-data-quality`](../skills/data/data-quality/SKILL.md), [`design-systems`](../skills/design/design-systems/SKILL.md), [`design-ux-research`](../skills/design/ux-research/SKILL.md), [`design-accessibility`](../skills/design/accessibility/SKILL.md), [`design-motion-design`](../skills/design/motion-design/SKILL.md), [`quality-e2e-testing`](../skills/quality/quality-e2e-testing/SKILL.md), [`quality-visual-testing`](../skills/quality/visual-testing/SKILL.md), [`quality-contract-testing`](../skills/quality/contract-testing/SKILL.md), [`frontend-lit`](../skills/frontend/lit/SKILL.md), [`frontend-web-components`](../skills/frontend/universal/web-components/SKILL.md), [`mobile-ar-vr`](../skills/mobile/universal/ar-vr/SKILL.md), [`nomad`](../skills/devops/nomad/SKILL.md), [`devops-incident-response`](../skills/devops/incident-response/SKILL.md), [`cost-benefit`](../skills/management/cost-benefit/SKILL.md), [`management-hiring`](../skills/management/hiring/SKILL.md), [`management-stakeholder`](../skills/management/stakeholder/SKILL.md), [`ml-experiment-tracking`](../skills/ml/experiment-tracking/SKILL.md), [`ml-classical-ml`](../skills/ml/classical-ml/SKILL.md), [`ml-deep-learning`](../skills/ml/deep-learning/SKILL.md), [`ml-feature-engineering`](../skills/ml/feature-engineering/SKILL.md), [`ml-hyperparameter-tuning`](../skills/ml/hyperparameter-tuning/SKILL.md), [`ml-model-evaluation`](../skills/ml/model-evaluation/SKILL.md), [`ml-model-interpretability`](../skills/ml/model-interpretability/SKILL.md), [`ml-time-series`](../skills/ml/time-series/SKILL.md), [`ml-nlp`](../skills/ml/nlp/SKILL.md), [`ml-computer-vision`](../skills/ml/computer-vision/SKILL.md), [`ml-recommendation-systems`](../skills/ml/recommendation-systems/SKILL.md), [`ml-anomaly-detection`](../skills/ml/anomaly-detection/SKILL.md), [`ml-ml-pipeline`](../skills/ml/ml-pipeline/SKILL.md), [`ml-feature-store`](../skills/ml/feature-store/SKILL.md), [`ml-model-serving`](../skills/ml/model-serving/SKILL.md), [`data-distributed-storage`](../skills/data/distributed-storage/SKILL.md), [`data-distributed-compute`](../skills/data/distributed-compute/SKILL.md), [`data-data-lake`](../skills/data/data-lake/SKILL.md), [`data-data-lakehouse`](../skills/data/data-lakehouse/SKILL.md), [`data-batch-processing`](../skills/data/batch-processing/SKILL.md), [`data-data-platform`](../skills/data/data-platform/SKILL.md), [`data-data-catalog`](../skills/data/data-catalog/SKILL.md), [`data-data-observability`](../skills/data/data-observability/SKILL.md), [`data-data-contracts`](../skills/data/data-contracts/SKILL.md), [`data-data-mesh`](../skills/data/data-mesh/SKILL.md), [`data-data-versioning`](../skills/data/data-versioning/SKILL.md), [`data-data-api`](../skills/data/data-api/SKILL.md), [`data-data-virtualization`](../skills/data/data-virtualization/SKILL.md), [`data-schema-registry`](../skills/data/schema-registry/SKILL.md), [`data-relational-database`](../skills/data/relational-database/SKILL.md), [`data-nosql-database`](../skills/data/nosql-database/SKILL.md), [`data-graph-database`](../skills/data/graph-database/SKILL.md), [`data-search-engine`](../skills/data/search-engine/SKILL.md), [`llm-finetuning`](../skills/ai/llm-finetuning/SKILL.md), [`genai-vision`](../skills/ai/genai-vision/SKILL.md), [`multimodal-pipelines`](../skills/rnd/ai-agents/multimodal-pipelines/SKILL.md), [`ai-defense-mechanisms`](../skills/rnd/security/ai-defense-mechanisms/SKILL.md), [`ai-agentic-workflows`](../skills/ai/agentic-workflows/SKILL.md), [`tool-calling-principles`](../skills/ai/ai-agents/tool-calling-principles/SKILL.md), [`devops-dataops`](../skills/devops/dataops/SKILL.md), [`devops-mlops`](../skills/devops/mlops/SKILL.md), [`devops-kubernetes-for-data`](../skills/devops/kubernetes-for-data/SKILL.md), [`cloud-cost-optimization`](../skills/devops/cloud-cost-optimization/SKILL.md), [`security-data-security`](../skills/security/data-security/SKILL.md), [`planning-bpmn-modeling`](../skills/planning/bpmn-modeling/SKILL.md), [`planning-bdd-atdd`](../skills/planning/bdd-atdd/SKILL.md), [`agile-scrum-kanban`](../skills/management/agile-scrum-kanban/SKILL.md), [`management-team-topology`](../skills/management/team-topology/SKILL.md), [`management-change-management`](../skills/management/change-management/SKILL.md), [`quality-acceptance-testing`](../skills/quality/acceptance-testing/SKILL.md), [`quality-regression-testing`](../skills/quality/regression-testing/SKILL.md), [`quality-smoke-testing`](../skills/quality/smoke-testing/SKILL.md), [`data-data-strategy`](../skills/data/data-strategy/SKILL.md), [`data-dimensional-modeling`](../skills/data/dimensional-modeling/SKILL.md), [`data-science-statistical-analysis`](../skills/data-science/statistical-analysis/SKILL.md), [`data-science-experimentation`](../skills/data-science/experimentation/SKILL.md), [`data-science-causal-inference`](../skills/data-science/causal-inference/SKILL.md), [`data-science-analytics-engineering`](../skills/data-science/analytics-engineering/SKILL.md), [`enterprise-togaf-zachman`](../skills/enterprise/togaf-zachman/SKILL.md), [`enterprise-itil-service-mgmt`](../skills/enterprise/itil-service-mgmt/SKILL.md), [`enterprise-vendor-management`](../skills/enterprise/vendor-management/SKILL.md), [`enterprise-architecture-governance`](../skills/enterprise/architecture-governance/SKILL.md), [`product-customer-journey`](../skills/product/customer-journey/SKILL.md), [`product-persona-development`](../skills/product/persona-development/SKILL.md), [`ruby-rails`](../skills/backend/ruby/rails/SKILL.md), [`frontend-svelte-architecture`](../skills/frontend/svelte/architecture/SKILL.md), [`frontend-svelte-patterns`](../skills/frontend/svelte/patterns/SKILL.md), [`sveltekit`](../skills/frontend/svelte/sveltekit/SKILL.md)

</details>

### backend-only

Backend-only: OOP, design patterns, microservices, clean architecture, API, DB, auth, testing, all stacks — **184 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-brief --skill create-prd --skill create-tech-spec --skill create-story --skill design-patterns --skill microservices --skill backend-clean-architecture --skill backend-api-design --skill backend-api-response --skill backend-database-patterns --skill backend-auth-patterns --skill backend-event-driven --skill backend-cqrs-patterns --skill backend-event-sourcing --skill backend-transactional-outbox --skill quality-unit-testing --skill quality-integration-testing --skill nestjs-architecture --skill nestjs-patterns --skill golang-architecture --skill golang-patterns --skill rust-architecture --skill rust-patterns --skill dotnet-architecture --skill dotnet-patterns --skill nodejs-architecture --skill nodejs-patterns --skill elysia-architecture --skill elysia-patterns --skill ruby-rails --skill python-fastapi-architecture --skill python-django-architecture --skill spring-boot-architecture --skill helm-patterns --skill terraform --skill ansible --skill monitoring --skill alerting --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-security-auditor --skill dev-loop-git-workflow --skill docker-patterns --skill cicd-pipeline --skill team-rules --skill security --skill pentesting --skill backend-grpc-patterns --skill backend-websocket-patterns --skill backend-message-queue --skill backend-caching --skill rate-limiting --skill quality-load-testing --skill github-actions --skill gitops --skill vault --skill aws --skill backend-serverless --skill monorepo --skill dependency-management --skill api-documentation --skill backend-graphql-patterns --skill backend-background-jobs --skill backend-search-patterns --skill data-streaming --skill backend-file-storage --skill backend-feature-flags --skill backend-internationalization --skill backend-structured-logging --skill argo-cd --skill devops-azure --skill devops-gcp --skill devops-chaos-engineering --skill devops-service-mesh --skill devops-finops --skill backup-dr --skill database-migration --skill dev-loop-pr-writer --skill dev-loop-dev-container --skill dev-loop-tech-debt-tracker --skill dev-loop-api-client-generator --skill planning-create-roadmap --skill planning-create-pitch-deck --skill planning-market-analysis --skill core-onboarding --skill core-context-compressor --skill enterprise-compliance-audit --skill enterprise-multi-tenant --skill enterprise-integration-patterns --skill enterprise-data-governance --skill enterprise-sla-management --skill enterprise-legacy-migration --skill enterprise-identity-provider --skill enterprise-cost-governance --skill prompt-chain-of-thought --skill prompt-few-shot --skill prompt-tree-of-thoughts --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill ml-inference-optimization --skill llm-kv-cache-paged-attention --skill data-vector-databases --skill ai-agent-architectures --skill agent-observability --skill security-sast-dast --skill security-sbom --skill security-secrets-management --skill security-container-security --skill security-api-security --skill data-etl-pipeline --skill data-data-warehouse --skill data-bi-tools --skill data-data-quality --skill nodejs-express-skill --skill nodejs-prisma --skill deno --skill bun --skill backend-elixir --skill spring-boot-patterns --skill nomad --skill devops-incident-response --skill cost-benefit --skill ml-experiment-tracking --skill ml-classical-ml --skill ml-deep-learning --skill ml-feature-engineering --skill ml-hyperparameter-tuning --skill ml-model-evaluation --skill ml-model-interpretability --skill ml-time-series --skill ml-nlp --skill ml-computer-vision --skill ml-recommendation-systems --skill ml-anomaly-detection --skill ml-ml-pipeline --skill ml-feature-store --skill ml-model-serving --skill data-distributed-storage --skill data-distributed-compute --skill data-data-lake --skill data-data-lakehouse --skill data-batch-processing --skill data-data-platform --skill data-data-catalog --skill data-data-observability --skill data-data-contracts --skill data-data-mesh --skill data-data-versioning --skill data-data-api --skill data-data-virtualization --skill data-schema-registry --skill data-relational-database --skill data-nosql-database --skill data-graph-database --skill data-search-engine --skill llm-finetuning --skill genai-vision --skill multimodal-pipelines --skill ai-defense-mechanisms --skill ai-agentic-workflows --skill tool-calling-principles --skill security-data-security --skill planning-bpmn-modeling --skill planning-bdd-atdd --skill agile-scrum-kanban --skill management-team-topology --skill management-change-management --skill quality-acceptance-testing --skill quality-regression-testing --skill quality-smoke-testing --skill data-data-strategy --skill data-dimensional-modeling --skill data-science-statistical-analysis --skill data-science-experimentation --skill data-science-causal-inference --skill data-science-analytics-engineering --skill enterprise-togaf-zachman --skill enterprise-itil-service-mgmt --skill enterprise-vendor-management --skill enterprise-architecture-governance --skill product-customer-journey --skill product-persona-development
```

</details>

<details><summary>Skills</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`create-story`](../skills/planning/create-story/SKILL.md), [`design-patterns`](../skills/backend/universal/design-patterns/SKILL.md), [`microservices`](../skills/backend/universal/microservices/SKILL.md), [`backend-clean-architecture`](../skills/backend/universal/clean-architecture/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-api-response`](../skills/backend/universal/api-response/SKILL.md), [`backend-database-patterns`](../skills/backend/universal/database-patterns/SKILL.md), [`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`backend-event-driven`](../skills/backend/universal/event-driven/SKILL.md), [`backend-cqrs-patterns`](../skills/backend/universal/cqrs-patterns/SKILL.md), [`backend-event-sourcing`](../skills/backend/universal/event-sourcing/SKILL.md), [`backend-transactional-outbox`](../skills/backend/universal/transactional-outbox/SKILL.md), [`quality-unit-testing`](../skills/quality/unit-testing/SKILL.md), [`quality-integration-testing`](../skills/quality/integration-testing/SKILL.md), [`nestjs-architecture`](../skills/backend/nestjs/architecture/SKILL.md), [`nestjs-patterns`](../skills/backend/nestjs/patterns/SKILL.md), [`golang-architecture`](../skills/backend/go/architecture/SKILL.md), [`golang-patterns`](../skills/backend/go/patterns/SKILL.md), [`rust-architecture`](../skills/backend/rust/architecture/SKILL.md), [`rust-patterns`](../skills/backend/rust/patterns/SKILL.md), [`dotnet-architecture`](../skills/backend/dotnet/architecture/SKILL.md), [`dotnet-patterns`](../skills/backend/dotnet/patterns/SKILL.md), [`nodejs-architecture`](../skills/backend/nodejs/architecture/SKILL.md), [`nodejs-patterns`](../skills/backend/nodejs/patterns/SKILL.md), [`elysia-architecture`](../skills/backend/elysia/architecture/SKILL.md), [`elysia-patterns`](../skills/backend/elysia/patterns/SKILL.md), [`ruby-rails`](../skills/backend/ruby/rails/SKILL.md), [`python-fastapi-architecture`](../skills/backend/python/fastapi/SKILL.md), [`python-django-architecture`](../skills/backend/python/django/SKILL.md), [`spring-boot-architecture`](../skills/backend/spring-boot/architecture/SKILL.md), [`helm-patterns`](../skills/devops/helm-patterns/SKILL.md), [`terraform`](../skills/devops/terraform/SKILL.md), [`ansible`](../skills/devops/ansible/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-security-auditor`](../skills/dev-loop/security-auditor/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`backend-grpc-patterns`](../skills/backend/universal/grpc-patterns/SKILL.md), [`backend-websocket-patterns`](../skills/backend/universal/websocket-patterns/SKILL.md), [`backend-message-queue`](../skills/backend/universal/message-queue/SKILL.md), [`backend-caching`](../skills/backend/universal/caching/SKILL.md), [`rate-limiting`](../skills/backend/universal/rate-limiting/SKILL.md), [`quality-load-testing`](../skills/quality/load-testing/SKILL.md), [`github-actions`](../skills/devops/github-actions/SKILL.md), [`gitops`](../skills/devops/gitops/SKILL.md), [`vault`](../skills/devops/vault/SKILL.md), [`aws`](../skills/devops/aws/SKILL.md), [`backend-serverless`](../skills/backend/universal/serverless/SKILL.md), [`monorepo`](../skills/devops/monorepo/SKILL.md), [`dependency-management`](../skills/devops/dependency-management/SKILL.md), [`api-documentation`](../skills/devops/api-documentation/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`argo-cd`](../skills/devops/argo-cd/SKILL.md), [`devops-azure`](../skills/devops/azure/SKILL.md), [`devops-gcp`](../skills/devops/gcp/SKILL.md), [`devops-chaos-engineering`](../skills/devops/chaos-engineering/SKILL.md), [`devops-service-mesh`](../skills/devops/service-mesh/SKILL.md), [`devops-finops`](../skills/devops/finops/SKILL.md), [`backup-dr`](../skills/devops/backup-dr/SKILL.md), [`database-migration`](../skills/devops/database-migration/SKILL.md), [`dev-loop-pr-writer`](../skills/dev-loop/pr-writer/SKILL.md), [`dev-loop-dev-container`](../skills/dev-loop/dev-container/SKILL.md), [`dev-loop-tech-debt-tracker`](../skills/dev-loop/tech-debt-tracker/SKILL.md), [`dev-loop-api-client-generator`](../skills/dev-loop/api-client-generator/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md), [`planning-create-pitch-deck`](../skills/planning/create-pitch-deck/SKILL.md), [`planning-market-analysis`](../skills/planning/market-analysis/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md), [`enterprise-multi-tenant`](../skills/enterprise/multi-tenant/SKILL.md), [`enterprise-integration-patterns`](../skills/enterprise/integration-patterns/SKILL.md), [`enterprise-data-governance`](../skills/enterprise/data-governance/SKILL.md), [`enterprise-sla-management`](../skills/enterprise/sla-management/SKILL.md), [`enterprise-legacy-migration`](../skills/enterprise/legacy-migration/SKILL.md), [`enterprise-identity-provider`](../skills/enterprise/identity-provider/SKILL.md), [`enterprise-cost-governance`](../skills/enterprise/cost-governance/SKILL.md), [`prompt-chain-of-thought`](../skills/prompt-engineering/chain-of-thought/SKILL.md), [`prompt-few-shot`](../skills/prompt-engineering/few-shot-prompting/SKILL.md), [`prompt-tree-of-thoughts`](../skills/prompt-engineering/tree-of-thoughts/SKILL.md), [`llm-rag-retrieval-internals`](../skills/ai/llm-engineering/rag-architecture/SKILL.md), [`prompt-rag-query-design`](../skills/prompt-engineering/rag-design/SKILL.md), [`ml-inference-optimization`](../skills/ml/inference-optimization/SKILL.md), [`llm-kv-cache-paged-attention`](../skills/ai/llm-engineering/kv-cache/SKILL.md), [`data-vector-databases`](../skills/data/vector-databases/SKILL.md), [`ai-agent-architectures`](../skills/ai/ai-agents/SKILL.md), [`agent-observability`](../skills/harness-engineering/agent-observability/SKILL.md), [`security-sast-dast`](../skills/security/sast-dast/SKILL.md), [`security-sbom`](../skills/security/sbom/SKILL.md), [`security-secrets-management`](../skills/security/secrets-management/SKILL.md), [`security-container-security`](../skills/security/container-security/SKILL.md), [`security-api-security`](../skills/security/api-security/SKILL.md), [`data-etl-pipeline`](../skills/data/etl-pipeline/SKILL.md), [`data-data-warehouse`](../skills/data/data-warehouse/SKILL.md), [`data-bi-tools`](../skills/data/bi-tools/SKILL.md), [`data-data-quality`](../skills/data/data-quality/SKILL.md), [`nodejs-express-skill`](../skills/backend/nodejs/express/SKILL.md), [`nodejs-prisma`](../skills/backend/nodejs/prisma/SKILL.md), [`deno`](../skills/backend/deno/SKILL.md), [`bun`](../skills/backend/bun/SKILL.md), [`backend-elixir`](../skills/backend/elixir/SKILL.md), [`spring-boot-patterns`](../skills/backend/spring-boot/patterns/SKILL.md), [`nomad`](../skills/devops/nomad/SKILL.md), [`devops-incident-response`](../skills/devops/incident-response/SKILL.md), [`cost-benefit`](../skills/management/cost-benefit/SKILL.md), [`ml-experiment-tracking`](../skills/ml/experiment-tracking/SKILL.md), [`ml-classical-ml`](../skills/ml/classical-ml/SKILL.md), [`ml-deep-learning`](../skills/ml/deep-learning/SKILL.md), [`ml-feature-engineering`](../skills/ml/feature-engineering/SKILL.md), [`ml-hyperparameter-tuning`](../skills/ml/hyperparameter-tuning/SKILL.md), [`ml-model-evaluation`](../skills/ml/model-evaluation/SKILL.md), [`ml-model-interpretability`](../skills/ml/model-interpretability/SKILL.md), [`ml-time-series`](../skills/ml/time-series/SKILL.md), [`ml-nlp`](../skills/ml/nlp/SKILL.md), [`ml-computer-vision`](../skills/ml/computer-vision/SKILL.md), [`ml-recommendation-systems`](../skills/ml/recommendation-systems/SKILL.md), [`ml-anomaly-detection`](../skills/ml/anomaly-detection/SKILL.md), [`ml-ml-pipeline`](../skills/ml/ml-pipeline/SKILL.md), [`ml-feature-store`](../skills/ml/feature-store/SKILL.md), [`ml-model-serving`](../skills/ml/model-serving/SKILL.md), [`data-distributed-storage`](../skills/data/distributed-storage/SKILL.md), [`data-distributed-compute`](../skills/data/distributed-compute/SKILL.md), [`data-data-lake`](../skills/data/data-lake/SKILL.md), [`data-data-lakehouse`](../skills/data/data-lakehouse/SKILL.md), [`data-batch-processing`](../skills/data/batch-processing/SKILL.md), [`data-data-platform`](../skills/data/data-platform/SKILL.md), [`data-data-catalog`](../skills/data/data-catalog/SKILL.md), [`data-data-observability`](../skills/data/data-observability/SKILL.md), [`data-data-contracts`](../skills/data/data-contracts/SKILL.md), [`data-data-mesh`](../skills/data/data-mesh/SKILL.md), [`data-data-versioning`](../skills/data/data-versioning/SKILL.md), [`data-data-api`](../skills/data/data-api/SKILL.md), [`data-data-virtualization`](../skills/data/data-virtualization/SKILL.md), [`data-schema-registry`](../skills/data/schema-registry/SKILL.md), [`data-relational-database`](../skills/data/relational-database/SKILL.md), [`data-nosql-database`](../skills/data/nosql-database/SKILL.md), [`data-graph-database`](../skills/data/graph-database/SKILL.md), [`data-search-engine`](../skills/data/search-engine/SKILL.md), [`llm-finetuning`](../skills/ai/llm-finetuning/SKILL.md), [`genai-vision`](../skills/ai/genai-vision/SKILL.md), [`multimodal-pipelines`](../skills/rnd/ai-agents/multimodal-pipelines/SKILL.md), [`ai-defense-mechanisms`](../skills/rnd/security/ai-defense-mechanisms/SKILL.md), [`ai-agentic-workflows`](../skills/ai/agentic-workflows/SKILL.md), [`tool-calling-principles`](../skills/ai/ai-agents/tool-calling-principles/SKILL.md), [`security-data-security`](../skills/security/data-security/SKILL.md), [`planning-bpmn-modeling`](../skills/planning/bpmn-modeling/SKILL.md), [`planning-bdd-atdd`](../skills/planning/bdd-atdd/SKILL.md), [`agile-scrum-kanban`](../skills/management/agile-scrum-kanban/SKILL.md), [`management-team-topology`](../skills/management/team-topology/SKILL.md), [`management-change-management`](../skills/management/change-management/SKILL.md), [`quality-acceptance-testing`](../skills/quality/acceptance-testing/SKILL.md), [`quality-regression-testing`](../skills/quality/regression-testing/SKILL.md), [`quality-smoke-testing`](../skills/quality/smoke-testing/SKILL.md), [`data-data-strategy`](../skills/data/data-strategy/SKILL.md), [`data-dimensional-modeling`](../skills/data/dimensional-modeling/SKILL.md), [`data-science-statistical-analysis`](../skills/data-science/statistical-analysis/SKILL.md), [`data-science-experimentation`](../skills/data-science/experimentation/SKILL.md), [`data-science-causal-inference`](../skills/data-science/causal-inference/SKILL.md), [`data-science-analytics-engineering`](../skills/data-science/analytics-engineering/SKILL.md), [`enterprise-togaf-zachman`](../skills/enterprise/togaf-zachman/SKILL.md), [`enterprise-itil-service-mgmt`](../skills/enterprise/itil-service-mgmt/SKILL.md), [`enterprise-vendor-management`](../skills/enterprise/vendor-management/SKILL.md), [`enterprise-architecture-governance`](../skills/enterprise/architecture-governance/SKILL.md), [`product-customer-journey`](../skills/product/customer-journey/SKILL.md), [`product-persona-development`](../skills/product/persona-development/SKILL.md)

</details>

### frontend-only

Frontend-only: Design system, state, performance, a11y, patterns, microfrontend, testing, all frameworks — **66 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-brief --skill create-prd --skill create-tech-spec --skill create-story --skill frontend-design-system --skill frontend-state-management --skill frontend-performance --skill frontend-accessibility --skill frontend-testing --skill frontend-patterns --skill microfrontend --skill sveltekit --skill react-architecture --skill react-nextjs --skill vue-architecture --skill vue-nuxt --skill angular-architecture --skill angular-patterns --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-git-workflow --skill monitoring --skill alerting --skill team-rules --skill security --skill pentesting --skill frontend-tailwind-css --skill frontend-storybook --skill frontend-pwa --skill frontend-seo --skill backend-graphql-patterns --skill backend-background-jobs --skill backend-search-patterns --skill data-streaming --skill backend-file-storage --skill backend-feature-flags --skill frontend-feature-flags --skill backend-internationalization --skill frontend-internationalization --skill backend-structured-logging --skill frontend-animation --skill frontend-form-handling --skill frontend-data-fetching --skill frontend-bundler-tools --skill frontend-image-optimization --skill frontend-theming --skill dev-loop-pr-writer --skill dev-loop-dev-container --skill dev-loop-tech-debt-tracker --skill dev-loop-api-client-generator --skill planning-create-roadmap --skill planning-create-pitch-deck --skill planning-market-analysis --skill core-onboarding --skill core-context-compressor --skill design-systems --skill design-ux-research --skill design-accessibility --skill design-motion-design --skill frontend-astro-patterns --skill frontend-qwik-patterns --skill frontend-vue-patterns --skill frontend-lit --skill frontend-web-components
```

</details>

<details><summary>Skills</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`create-story`](../skills/planning/create-story/SKILL.md), [`frontend-design-system`](../skills/frontend/universal/design-system/SKILL.md), [`frontend-state-management`](../skills/frontend/universal/state-management/SKILL.md), [`frontend-performance`](../skills/frontend/universal/performance/SKILL.md), [`frontend-accessibility`](../skills/frontend/universal/accessibility/SKILL.md), [`frontend-testing`](../skills/frontend/universal/testing/SKILL.md), [`frontend-patterns`](../skills/frontend/universal/patterns/SKILL.md), [`microfrontend`](../skills/frontend/universal/microfrontend/SKILL.md), [`sveltekit`](../skills/frontend/svelte/sveltekit/SKILL.md), [`react-architecture`](../skills/frontend/react/architecture/SKILL.md), [`react-nextjs`](../skills/frontend/react/nextjs/SKILL.md), [`vue-architecture`](../skills/frontend/vue/architecture/SKILL.md), [`vue-nuxt`](../skills/frontend/vue/nuxt/SKILL.md), [`angular-architecture`](../skills/frontend/angular/architecture/SKILL.md), [`angular-patterns`](../skills/frontend/angular/patterns/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`frontend-tailwind-css`](../skills/frontend/universal/tailwind-css/SKILL.md), [`frontend-storybook`](../skills/frontend/universal/storybook/SKILL.md), [`frontend-pwa`](../skills/frontend/universal/pwa/SKILL.md), [`frontend-seo`](../skills/frontend/universal/seo/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`frontend-feature-flags`](../skills/frontend/universal/feature-flags/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`frontend-internationalization`](../skills/frontend/universal/internationalization/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`frontend-animation`](../skills/frontend/universal/animation/SKILL.md), [`frontend-form-handling`](../skills/frontend/universal/form-handling/SKILL.md), [`frontend-data-fetching`](../skills/frontend/universal/data-fetching/SKILL.md), [`frontend-bundler-tools`](../skills/frontend/universal/bundler-tools/SKILL.md), [`frontend-image-optimization`](../skills/frontend/universal/image-optimization/SKILL.md), [`frontend-theming`](../skills/frontend/universal/theming/SKILL.md), [`dev-loop-pr-writer`](../skills/dev-loop/pr-writer/SKILL.md), [`dev-loop-dev-container`](../skills/dev-loop/dev-container/SKILL.md), [`dev-loop-tech-debt-tracker`](../skills/dev-loop/tech-debt-tracker/SKILL.md), [`dev-loop-api-client-generator`](../skills/dev-loop/api-client-generator/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md), [`planning-create-pitch-deck`](../skills/planning/create-pitch-deck/SKILL.md), [`planning-market-analysis`](../skills/planning/market-analysis/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md), [`design-systems`](../skills/design/design-systems/SKILL.md), [`design-ux-research`](../skills/design/ux-research/SKILL.md), [`design-accessibility`](../skills/design/accessibility/SKILL.md), [`design-motion-design`](../skills/design/motion-design/SKILL.md), [`frontend-astro-patterns`](../skills/frontend/astro/patterns/SKILL.md), [`frontend-qwik-patterns`](../skills/frontend/qwik/patterns/SKILL.md), [`frontend-vue-patterns`](../skills/frontend/vue/patterns/SKILL.md), [`frontend-lit`](../skills/frontend/lit/SKILL.md), [`frontend-web-components`](../skills/frontend/universal/web-components/SKILL.md)

</details>

### devops-only

DevOps-only: Docker, CI/CD, K8s, monitoring, IaC, automation — **68 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill docker-patterns --skill cicd-pipeline --skill cloud-native-kubernetes-patterns --skill observability --skill helm-patterns --skill terraform --skill ansible --skill jenkins --skill longhorn --skill monitoring --skill alerting --skill dev-loop-git-workflow --skill team-rules --skill security --skill pentesting --skill github-actions --skill gitops --skill vault --skill aws --skill devops-serverless --skill monorepo --skill dependency-management --skill api-documentation --skill backend-graphql-patterns --skill backend-background-jobs --skill backend-search-patterns --skill data-streaming --skill backend-file-storage --skill backend-feature-flags --skill frontend-feature-flags --skill backend-internationalization --skill frontend-internationalization --skill backend-structured-logging --skill argo-cd --skill devops-azure --skill devops-gcp --skill devops-chaos-engineering --skill devops-service-mesh --skill devops-finops --skill backup-dr --skill database-migration --skill security-sast-dast --skill security-sbom --skill security-secrets-management --skill security-container-security --skill security-api-security --skill nomad --skill devops-incident-response --skill devops-dataops --skill devops-mlops --skill devops-kubernetes-for-data --skill cloud-cost-optimization --skill devops-pulumi --skill devops-gitlab-ci --skill circleci --skill devops-kubernetes-autoscaling --skill apm-observability --skill cilium-ebpf --skill devops-opentelemetry --skill oracle-cloud --skill digitalocean --skill ibm-cloud --skill alibaba-cloud --skill hetzner-cloud --skill cloud-native-distributed-tracing --skill cloud-native-event-driven-scaling --skill cloud-native-gitops-workflows --skill cloud-native-serverless-cold-starts
```

</details>

<details><summary>Skills</summary>

[`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`cloud-native-kubernetes-patterns`](../skills/cloud-native/kubernetes-patterns/SKILL.md), [`observability`](../skills/devops/observability/SKILL.md), [`helm-patterns`](../skills/devops/helm-patterns/SKILL.md), [`terraform`](../skills/devops/terraform/SKILL.md), [`ansible`](../skills/devops/ansible/SKILL.md), [`jenkins`](../skills/devops/jenkins/SKILL.md), [`longhorn`](../skills/devops/longhorn/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`github-actions`](../skills/devops/github-actions/SKILL.md), [`gitops`](../skills/devops/gitops/SKILL.md), [`vault`](../skills/devops/vault/SKILL.md), [`aws`](../skills/devops/aws/SKILL.md), [`devops-serverless`](../skills/devops/serverless/SKILL.md), [`monorepo`](../skills/devops/monorepo/SKILL.md), [`dependency-management`](../skills/devops/dependency-management/SKILL.md), [`api-documentation`](../skills/devops/api-documentation/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`frontend-feature-flags`](../skills/frontend/universal/feature-flags/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`frontend-internationalization`](../skills/frontend/universal/internationalization/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`argo-cd`](../skills/devops/argo-cd/SKILL.md), [`devops-azure`](../skills/devops/azure/SKILL.md), [`devops-gcp`](../skills/devops/gcp/SKILL.md), [`devops-chaos-engineering`](../skills/devops/chaos-engineering/SKILL.md), [`devops-service-mesh`](../skills/devops/service-mesh/SKILL.md), [`devops-finops`](../skills/devops/finops/SKILL.md), [`backup-dr`](../skills/devops/backup-dr/SKILL.md), [`database-migration`](../skills/devops/database-migration/SKILL.md), [`security-sast-dast`](../skills/security/sast-dast/SKILL.md), [`security-sbom`](../skills/security/sbom/SKILL.md), [`security-secrets-management`](../skills/security/secrets-management/SKILL.md), [`security-container-security`](../skills/security/container-security/SKILL.md), [`security-api-security`](../skills/security/api-security/SKILL.md), [`nomad`](../skills/devops/nomad/SKILL.md), [`devops-incident-response`](../skills/devops/incident-response/SKILL.md), [`devops-dataops`](../skills/devops/dataops/SKILL.md), [`devops-mlops`](../skills/devops/mlops/SKILL.md), [`devops-kubernetes-for-data`](../skills/devops/kubernetes-for-data/SKILL.md), [`cloud-cost-optimization`](../skills/devops/cloud-cost-optimization/SKILL.md), [`devops-pulumi`](../skills/devops/pulumi/SKILL.md), [`devops-gitlab-ci`](../skills/devops/gitlab-ci/SKILL.md), [`circleci`](../skills/devops/circleci/SKILL.md), [`devops-kubernetes-autoscaling`](../skills/devops/kubernetes-autoscaling/SKILL.md), [`apm-observability`](../skills/devops/apm-observability/SKILL.md), [`cilium-ebpf`](../skills/devops/cilium-ebpf/SKILL.md), [`devops-opentelemetry`](../skills/devops/opentelemetry/SKILL.md), [`oracle-cloud`](../skills/devops/oracle-cloud/SKILL.md), [`digitalocean`](../skills/devops/digitalocean/SKILL.md), [`ibm-cloud`](../skills/devops/ibm-cloud/SKILL.md), [`alibaba-cloud`](../skills/devops/alibaba-cloud/SKILL.md), [`hetzner-cloud`](../skills/devops/hetzner/SKILL.md), [`cloud-native-distributed-tracing`](../skills/cloud-native/distributed-tracing/SKILL.md), [`cloud-native-event-driven-scaling`](../skills/cloud-native/event-driven-scaling/SKILL.md), [`cloud-native-gitops-workflows`](../skills/cloud-native/gitops-workflows/SKILL.md), [`cloud-native-serverless-cold-starts`](../skills/cloud-native/serverless-cold-starts/SKILL.md)

</details>

### management-only

Management: PM, BA, QA, QC, security, pentesting, alerting, team-rules — **66 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill pm --skill ba --skill qa --skill qc --skill security --skill pentesting --skill alerting --skill team-rules --skill backend-graphql-patterns --skill backend-background-jobs --skill backend-search-patterns --skill data-streaming --skill backend-file-storage --skill backend-feature-flags --skill frontend-feature-flags --skill backend-internationalization --skill frontend-internationalization --skill backend-structured-logging --skill management-okr-kpi --skill sprint-retro --skill management-risk-management --skill product-analytics --skill product-ab-testing --skill product-user-research --skill product-growth-engineering --skill product-pricing-strategy --skill product-go-to-market --skill product-onboarding-flow --skill data-etl-pipeline --skill data-data-warehouse --skill data-bi-tools --skill data-data-quality --skill quality-e2e-testing --skill quality-visual-testing --skill quality-load-testing --skill quality-contract-testing --skill cost-benefit --skill management-hiring --skill management-stakeholder --skill data-distributed-storage --skill data-distributed-compute --skill data-data-lake --skill data-data-lakehouse --skill data-batch-processing --skill data-data-platform --skill data-data-catalog --skill data-data-observability --skill data-data-contracts --skill data-data-mesh --skill data-data-versioning --skill data-data-api --skill data-data-virtualization --skill data-schema-registry --skill data-relational-database --skill data-nosql-database --skill data-graph-database --skill data-search-engine --skill planning-bpmn-modeling --skill planning-bdd-atdd --skill agile-scrum-kanban --skill management-team-topology --skill management-change-management --skill quality-acceptance-testing --skill quality-regression-testing --skill quality-smoke-testing --skill agile-scrum
```

</details>

<details><summary>Skills</summary>

[`pm`](../skills/management/pm/SKILL.md), [`ba`](../skills/management/ba/SKILL.md), [`qa`](../skills/management/qa/SKILL.md), [`qc`](../skills/management/qc/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`frontend-feature-flags`](../skills/frontend/universal/feature-flags/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`frontend-internationalization`](../skills/frontend/universal/internationalization/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`management-okr-kpi`](../skills/management/okr-kpi/SKILL.md), [`sprint-retro`](../skills/management/sprint-retro/SKILL.md), [`management-risk-management`](../skills/management/risk-management/SKILL.md), [`product-analytics`](../skills/product/analytics/SKILL.md), [`product-ab-testing`](../skills/product/ab-testing/SKILL.md), [`product-user-research`](../skills/product/user-research/SKILL.md), [`product-growth-engineering`](../skills/product/growth-engineering/SKILL.md), [`product-pricing-strategy`](../skills/product/pricing-strategy/SKILL.md), [`product-go-to-market`](../skills/product/go-to-market/SKILL.md), [`product-onboarding-flow`](../skills/product/onboarding-flow/SKILL.md), [`data-etl-pipeline`](../skills/data/etl-pipeline/SKILL.md), [`data-data-warehouse`](../skills/data/data-warehouse/SKILL.md), [`data-bi-tools`](../skills/data/bi-tools/SKILL.md), [`data-data-quality`](../skills/data/data-quality/SKILL.md), [`quality-e2e-testing`](../skills/quality/quality-e2e-testing/SKILL.md), [`quality-visual-testing`](../skills/quality/visual-testing/SKILL.md), [`quality-load-testing`](../skills/quality/load-testing/SKILL.md), [`quality-contract-testing`](../skills/quality/contract-testing/SKILL.md), [`cost-benefit`](../skills/management/cost-benefit/SKILL.md), [`management-hiring`](../skills/management/hiring/SKILL.md), [`management-stakeholder`](../skills/management/stakeholder/SKILL.md), [`data-distributed-storage`](../skills/data/distributed-storage/SKILL.md), [`data-distributed-compute`](../skills/data/distributed-compute/SKILL.md), [`data-data-lake`](../skills/data/data-lake/SKILL.md), [`data-data-lakehouse`](../skills/data/data-lakehouse/SKILL.md), [`data-batch-processing`](../skills/data/batch-processing/SKILL.md), [`data-data-platform`](../skills/data/data-platform/SKILL.md), [`data-data-catalog`](../skills/data/data-catalog/SKILL.md), [`data-data-observability`](../skills/data/data-observability/SKILL.md), [`data-data-contracts`](../skills/data/data-contracts/SKILL.md), [`data-data-mesh`](../skills/data/data-mesh/SKILL.md), [`data-data-versioning`](../skills/data/data-versioning/SKILL.md), [`data-data-api`](../skills/data/data-api/SKILL.md), [`data-data-virtualization`](../skills/data/data-virtualization/SKILL.md), [`data-schema-registry`](../skills/data/schema-registry/SKILL.md), [`data-relational-database`](../skills/data/relational-database/SKILL.md), [`data-nosql-database`](../skills/data/nosql-database/SKILL.md), [`data-graph-database`](../skills/data/graph-database/SKILL.md), [`data-search-engine`](../skills/data/search-engine/SKILL.md), [`planning-bpmn-modeling`](../skills/planning/bpmn-modeling/SKILL.md), [`planning-bdd-atdd`](../skills/planning/bdd-atdd/SKILL.md), [`agile-scrum-kanban`](../skills/management/agile-scrum-kanban/SKILL.md), [`management-team-topology`](../skills/management/team-topology/SKILL.md), [`management-change-management`](../skills/management/change-management/SKILL.md), [`quality-acceptance-testing`](../skills/quality/acceptance-testing/SKILL.md), [`quality-regression-testing`](../skills/quality/regression-testing/SKILL.md), [`quality-smoke-testing`](../skills/quality/smoke-testing/SKILL.md), [`agile-scrum`](../skills/management/agile-scrum/SKILL.md)

</details>

### mobile-ios

Mobile iOS: Swift, SwiftUI, UIKit, CI/CD deployment — **116 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-brief --skill create-prd --skill create-tech-spec --skill create-story --skill design-patterns --skill backend-api-design --skill backend-api-response --skill backend-auth-patterns --skill quality-unit-testing --skill quality-integration-testing --skill frontend-patterns --skill ios --skill mobile-deployment --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-git-workflow --skill docker-patterns --skill cicd-pipeline --skill monitoring --skill alerting --skill team-rules --skill security --skill pentesting --skill backend-grpc-patterns --skill backend-websocket-patterns --skill backend-message-queue --skill backend-caching --skill rate-limiting --skill quality-load-testing --skill mobile-push-notifications --skill mobile-in-app-purchase --skill mobile-crash-reporting --skill backend-graphql-patterns --skill backend-background-jobs --skill backend-search-patterns --skill data-streaming --skill backend-file-storage --skill backend-feature-flags --skill frontend-feature-flags --skill backend-internationalization --skill frontend-internationalization --skill backend-structured-logging --skill frontend-animation --skill frontend-form-handling --skill frontend-data-fetching --skill frontend-bundler-tools --skill frontend-image-optimization --skill frontend-theming --skill mobile-kotlin-multiplatform --skill mobile-ionic-capacitor --skill mobile-dotnet-maui --skill mobile-deep-linking --skill mobile-offline-first --skill mobile-biometrics --skill map-location --skill mobile-camera-media --skill mobile-analytics --skill argo-cd --skill devops-azure --skill devops-gcp --skill devops-chaos-engineering --skill devops-service-mesh --skill devops-finops --skill backup-dr --skill database-migration --skill dev-loop-pr-writer --skill dev-loop-dev-container --skill dev-loop-tech-debt-tracker --skill dev-loop-api-client-generator --skill planning-create-roadmap --skill planning-create-pitch-deck --skill planning-market-analysis --skill core-onboarding --skill core-context-compressor --skill enterprise-compliance-audit --skill enterprise-multi-tenant --skill enterprise-integration-patterns --skill enterprise-data-governance --skill enterprise-sla-management --skill enterprise-legacy-migration --skill enterprise-identity-provider --skill enterprise-cost-governance --skill prompt-chain-of-thought --skill prompt-few-shot --skill prompt-tree-of-thoughts --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill ml-inference-optimization --skill llm-kv-cache-paged-attention --skill data-vector-databases --skill ai-agent-architectures --skill agent-observability --skill mobile-ar-vr --skill security-data-security --skill planning-bpmn-modeling --skill planning-bdd-atdd --skill agile-scrum-kanban --skill management-team-topology --skill management-change-management --skill quality-acceptance-testing --skill quality-regression-testing --skill quality-smoke-testing --skill data-data-strategy --skill data-dimensional-modeling --skill data-science-statistical-analysis --skill data-science-experimentation --skill data-science-causal-inference --skill data-science-analytics-engineering --skill enterprise-togaf-zachman --skill enterprise-itil-service-mgmt --skill enterprise-vendor-management --skill enterprise-architecture-governance --skill product-customer-journey --skill product-persona-development
```

</details>

<details><summary>Skills</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`create-story`](../skills/planning/create-story/SKILL.md), [`design-patterns`](../skills/backend/universal/design-patterns/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-api-response`](../skills/backend/universal/api-response/SKILL.md), [`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`quality-unit-testing`](../skills/quality/unit-testing/SKILL.md), [`quality-integration-testing`](../skills/quality/integration-testing/SKILL.md), [`frontend-patterns`](../skills/frontend/universal/patterns/SKILL.md), [`ios`](../skills/mobile/ios/SKILL.md), [`mobile-deployment`](../skills/mobile/universal/deployment/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`backend-grpc-patterns`](../skills/backend/universal/grpc-patterns/SKILL.md), [`backend-websocket-patterns`](../skills/backend/universal/websocket-patterns/SKILL.md), [`backend-message-queue`](../skills/backend/universal/message-queue/SKILL.md), [`backend-caching`](../skills/backend/universal/caching/SKILL.md), [`rate-limiting`](../skills/backend/universal/rate-limiting/SKILL.md), [`quality-load-testing`](../skills/quality/load-testing/SKILL.md), [`mobile-push-notifications`](../skills/mobile/universal/push-notifications/SKILL.md), [`mobile-in-app-purchase`](../skills/mobile/universal/in-app-purchase/SKILL.md), [`mobile-crash-reporting`](../skills/mobile/universal/crash-reporting/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`frontend-feature-flags`](../skills/frontend/universal/feature-flags/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`frontend-internationalization`](../skills/frontend/universal/internationalization/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`frontend-animation`](../skills/frontend/universal/animation/SKILL.md), [`frontend-form-handling`](../skills/frontend/universal/form-handling/SKILL.md), [`frontend-data-fetching`](../skills/frontend/universal/data-fetching/SKILL.md), [`frontend-bundler-tools`](../skills/frontend/universal/bundler-tools/SKILL.md), [`frontend-image-optimization`](../skills/frontend/universal/image-optimization/SKILL.md), [`frontend-theming`](../skills/frontend/universal/theming/SKILL.md), [`mobile-kotlin-multiplatform`](../skills/mobile/kotlin-multiplatform/SKILL.md), [`mobile-ionic-capacitor`](../skills/mobile/ionic-capacitor/SKILL.md), [`mobile-dotnet-maui`](../skills/mobile/dotnet-maui/SKILL.md), [`mobile-deep-linking`](../skills/mobile/universal/deep-linking/SKILL.md), [`mobile-offline-first`](../skills/mobile/universal/offline-first/SKILL.md), [`mobile-biometrics`](../skills/mobile/universal/biometrics/SKILL.md), [`map-location`](../skills/mobile/universal/map-location/SKILL.md), [`mobile-camera-media`](../skills/mobile/universal/camera-media/SKILL.md), [`mobile-analytics`](../skills/mobile/universal/analytics/SKILL.md), [`argo-cd`](../skills/devops/argo-cd/SKILL.md), [`devops-azure`](../skills/devops/azure/SKILL.md), [`devops-gcp`](../skills/devops/gcp/SKILL.md), [`devops-chaos-engineering`](../skills/devops/chaos-engineering/SKILL.md), [`devops-service-mesh`](../skills/devops/service-mesh/SKILL.md), [`devops-finops`](../skills/devops/finops/SKILL.md), [`backup-dr`](../skills/devops/backup-dr/SKILL.md), [`database-migration`](../skills/devops/database-migration/SKILL.md), [`dev-loop-pr-writer`](../skills/dev-loop/pr-writer/SKILL.md), [`dev-loop-dev-container`](../skills/dev-loop/dev-container/SKILL.md), [`dev-loop-tech-debt-tracker`](../skills/dev-loop/tech-debt-tracker/SKILL.md), [`dev-loop-api-client-generator`](../skills/dev-loop/api-client-generator/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md), [`planning-create-pitch-deck`](../skills/planning/create-pitch-deck/SKILL.md), [`planning-market-analysis`](../skills/planning/market-analysis/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md), [`enterprise-multi-tenant`](../skills/enterprise/multi-tenant/SKILL.md), [`enterprise-integration-patterns`](../skills/enterprise/integration-patterns/SKILL.md), [`enterprise-data-governance`](../skills/enterprise/data-governance/SKILL.md), [`enterprise-sla-management`](../skills/enterprise/sla-management/SKILL.md), [`enterprise-legacy-migration`](../skills/enterprise/legacy-migration/SKILL.md), [`enterprise-identity-provider`](../skills/enterprise/identity-provider/SKILL.md), [`enterprise-cost-governance`](../skills/enterprise/cost-governance/SKILL.md), [`prompt-chain-of-thought`](../skills/prompt-engineering/chain-of-thought/SKILL.md), [`prompt-few-shot`](../skills/prompt-engineering/few-shot-prompting/SKILL.md), [`prompt-tree-of-thoughts`](../skills/prompt-engineering/tree-of-thoughts/SKILL.md), [`llm-rag-retrieval-internals`](../skills/ai/llm-engineering/rag-architecture/SKILL.md), [`prompt-rag-query-design`](../skills/prompt-engineering/rag-design/SKILL.md), [`ml-inference-optimization`](../skills/ml/inference-optimization/SKILL.md), [`llm-kv-cache-paged-attention`](../skills/ai/llm-engineering/kv-cache/SKILL.md), [`data-vector-databases`](../skills/data/vector-databases/SKILL.md), [`ai-agent-architectures`](../skills/ai/ai-agents/SKILL.md), [`agent-observability`](../skills/harness-engineering/agent-observability/SKILL.md), [`mobile-ar-vr`](../skills/mobile/universal/ar-vr/SKILL.md), [`security-data-security`](../skills/security/data-security/SKILL.md), [`planning-bpmn-modeling`](../skills/planning/bpmn-modeling/SKILL.md), [`planning-bdd-atdd`](../skills/planning/bdd-atdd/SKILL.md), [`agile-scrum-kanban`](../skills/management/agile-scrum-kanban/SKILL.md), [`management-team-topology`](../skills/management/team-topology/SKILL.md), [`management-change-management`](../skills/management/change-management/SKILL.md), [`quality-acceptance-testing`](../skills/quality/acceptance-testing/SKILL.md), [`quality-regression-testing`](../skills/quality/regression-testing/SKILL.md), [`quality-smoke-testing`](../skills/quality/smoke-testing/SKILL.md), [`data-data-strategy`](../skills/data/data-strategy/SKILL.md), [`data-dimensional-modeling`](../skills/data/dimensional-modeling/SKILL.md), [`data-science-statistical-analysis`](../skills/data-science/statistical-analysis/SKILL.md), [`data-science-experimentation`](../skills/data-science/experimentation/SKILL.md), [`data-science-causal-inference`](../skills/data-science/causal-inference/SKILL.md), [`data-science-analytics-engineering`](../skills/data-science/analytics-engineering/SKILL.md), [`enterprise-togaf-zachman`](../skills/enterprise/togaf-zachman/SKILL.md), [`enterprise-itil-service-mgmt`](../skills/enterprise/itil-service-mgmt/SKILL.md), [`enterprise-vendor-management`](../skills/enterprise/vendor-management/SKILL.md), [`enterprise-architecture-governance`](../skills/enterprise/architecture-governance/SKILL.md), [`product-customer-journey`](../skills/product/customer-journey/SKILL.md), [`product-persona-development`](../skills/product/persona-development/SKILL.md)

</details>

### mobile-android

Mobile Android: Kotlin, Jetpack Compose, Room, Hilt, CI/CD deployment — **116 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-brief --skill create-prd --skill create-tech-spec --skill create-story --skill design-patterns --skill backend-api-design --skill backend-api-response --skill backend-auth-patterns --skill quality-unit-testing --skill quality-integration-testing --skill frontend-patterns --skill android --skill mobile-deployment --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-git-workflow --skill docker-patterns --skill cicd-pipeline --skill monitoring --skill alerting --skill team-rules --skill security --skill pentesting --skill backend-grpc-patterns --skill backend-websocket-patterns --skill backend-message-queue --skill backend-caching --skill rate-limiting --skill quality-load-testing --skill mobile-push-notifications --skill mobile-in-app-purchase --skill mobile-crash-reporting --skill backend-graphql-patterns --skill backend-background-jobs --skill backend-search-patterns --skill data-streaming --skill backend-file-storage --skill backend-feature-flags --skill frontend-feature-flags --skill backend-internationalization --skill frontend-internationalization --skill backend-structured-logging --skill frontend-animation --skill frontend-form-handling --skill frontend-data-fetching --skill frontend-bundler-tools --skill frontend-image-optimization --skill frontend-theming --skill mobile-kotlin-multiplatform --skill mobile-ionic-capacitor --skill mobile-dotnet-maui --skill mobile-deep-linking --skill mobile-offline-first --skill mobile-biometrics --skill map-location --skill mobile-camera-media --skill mobile-analytics --skill argo-cd --skill devops-azure --skill devops-gcp --skill devops-chaos-engineering --skill devops-service-mesh --skill devops-finops --skill backup-dr --skill database-migration --skill dev-loop-pr-writer --skill dev-loop-dev-container --skill dev-loop-tech-debt-tracker --skill dev-loop-api-client-generator --skill planning-create-roadmap --skill planning-create-pitch-deck --skill planning-market-analysis --skill core-onboarding --skill core-context-compressor --skill enterprise-compliance-audit --skill enterprise-multi-tenant --skill enterprise-integration-patterns --skill enterprise-data-governance --skill enterprise-sla-management --skill enterprise-legacy-migration --skill enterprise-identity-provider --skill enterprise-cost-governance --skill prompt-chain-of-thought --skill prompt-few-shot --skill prompt-tree-of-thoughts --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill ml-inference-optimization --skill llm-kv-cache-paged-attention --skill data-vector-databases --skill ai-agent-architectures --skill agent-observability --skill mobile-ar-vr --skill security-data-security --skill planning-bpmn-modeling --skill planning-bdd-atdd --skill agile-scrum-kanban --skill management-team-topology --skill management-change-management --skill quality-acceptance-testing --skill quality-regression-testing --skill quality-smoke-testing --skill data-data-strategy --skill data-dimensional-modeling --skill data-science-statistical-analysis --skill data-science-experimentation --skill data-science-causal-inference --skill data-science-analytics-engineering --skill enterprise-togaf-zachman --skill enterprise-itil-service-mgmt --skill enterprise-vendor-management --skill enterprise-architecture-governance --skill product-customer-journey --skill product-persona-development
```

</details>

<details><summary>Skills</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`create-story`](../skills/planning/create-story/SKILL.md), [`design-patterns`](../skills/backend/universal/design-patterns/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-api-response`](../skills/backend/universal/api-response/SKILL.md), [`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`quality-unit-testing`](../skills/quality/unit-testing/SKILL.md), [`quality-integration-testing`](../skills/quality/integration-testing/SKILL.md), [`frontend-patterns`](../skills/frontend/universal/patterns/SKILL.md), [`android`](../skills/mobile/android/SKILL.md), [`mobile-deployment`](../skills/mobile/universal/deployment/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`backend-grpc-patterns`](../skills/backend/universal/grpc-patterns/SKILL.md), [`backend-websocket-patterns`](../skills/backend/universal/websocket-patterns/SKILL.md), [`backend-message-queue`](../skills/backend/universal/message-queue/SKILL.md), [`backend-caching`](../skills/backend/universal/caching/SKILL.md), [`rate-limiting`](../skills/backend/universal/rate-limiting/SKILL.md), [`quality-load-testing`](../skills/quality/load-testing/SKILL.md), [`mobile-push-notifications`](../skills/mobile/universal/push-notifications/SKILL.md), [`mobile-in-app-purchase`](../skills/mobile/universal/in-app-purchase/SKILL.md), [`mobile-crash-reporting`](../skills/mobile/universal/crash-reporting/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`frontend-feature-flags`](../skills/frontend/universal/feature-flags/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`frontend-internationalization`](../skills/frontend/universal/internationalization/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`frontend-animation`](../skills/frontend/universal/animation/SKILL.md), [`frontend-form-handling`](../skills/frontend/universal/form-handling/SKILL.md), [`frontend-data-fetching`](../skills/frontend/universal/data-fetching/SKILL.md), [`frontend-bundler-tools`](../skills/frontend/universal/bundler-tools/SKILL.md), [`frontend-image-optimization`](../skills/frontend/universal/image-optimization/SKILL.md), [`frontend-theming`](../skills/frontend/universal/theming/SKILL.md), [`mobile-kotlin-multiplatform`](../skills/mobile/kotlin-multiplatform/SKILL.md), [`mobile-ionic-capacitor`](../skills/mobile/ionic-capacitor/SKILL.md), [`mobile-dotnet-maui`](../skills/mobile/dotnet-maui/SKILL.md), [`mobile-deep-linking`](../skills/mobile/universal/deep-linking/SKILL.md), [`mobile-offline-first`](../skills/mobile/universal/offline-first/SKILL.md), [`mobile-biometrics`](../skills/mobile/universal/biometrics/SKILL.md), [`map-location`](../skills/mobile/universal/map-location/SKILL.md), [`mobile-camera-media`](../skills/mobile/universal/camera-media/SKILL.md), [`mobile-analytics`](../skills/mobile/universal/analytics/SKILL.md), [`argo-cd`](../skills/devops/argo-cd/SKILL.md), [`devops-azure`](../skills/devops/azure/SKILL.md), [`devops-gcp`](../skills/devops/gcp/SKILL.md), [`devops-chaos-engineering`](../skills/devops/chaos-engineering/SKILL.md), [`devops-service-mesh`](../skills/devops/service-mesh/SKILL.md), [`devops-finops`](../skills/devops/finops/SKILL.md), [`backup-dr`](../skills/devops/backup-dr/SKILL.md), [`database-migration`](../skills/devops/database-migration/SKILL.md), [`dev-loop-pr-writer`](../skills/dev-loop/pr-writer/SKILL.md), [`dev-loop-dev-container`](../skills/dev-loop/dev-container/SKILL.md), [`dev-loop-tech-debt-tracker`](../skills/dev-loop/tech-debt-tracker/SKILL.md), [`dev-loop-api-client-generator`](../skills/dev-loop/api-client-generator/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md), [`planning-create-pitch-deck`](../skills/planning/create-pitch-deck/SKILL.md), [`planning-market-analysis`](../skills/planning/market-analysis/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md), [`enterprise-multi-tenant`](../skills/enterprise/multi-tenant/SKILL.md), [`enterprise-integration-patterns`](../skills/enterprise/integration-patterns/SKILL.md), [`enterprise-data-governance`](../skills/enterprise/data-governance/SKILL.md), [`enterprise-sla-management`](../skills/enterprise/sla-management/SKILL.md), [`enterprise-legacy-migration`](../skills/enterprise/legacy-migration/SKILL.md), [`enterprise-identity-provider`](../skills/enterprise/identity-provider/SKILL.md), [`enterprise-cost-governance`](../skills/enterprise/cost-governance/SKILL.md), [`prompt-chain-of-thought`](../skills/prompt-engineering/chain-of-thought/SKILL.md), [`prompt-few-shot`](../skills/prompt-engineering/few-shot-prompting/SKILL.md), [`prompt-tree-of-thoughts`](../skills/prompt-engineering/tree-of-thoughts/SKILL.md), [`llm-rag-retrieval-internals`](../skills/ai/llm-engineering/rag-architecture/SKILL.md), [`prompt-rag-query-design`](../skills/prompt-engineering/rag-design/SKILL.md), [`ml-inference-optimization`](../skills/ml/inference-optimization/SKILL.md), [`llm-kv-cache-paged-attention`](../skills/ai/llm-engineering/kv-cache/SKILL.md), [`data-vector-databases`](../skills/data/vector-databases/SKILL.md), [`ai-agent-architectures`](../skills/ai/ai-agents/SKILL.md), [`agent-observability`](../skills/harness-engineering/agent-observability/SKILL.md), [`mobile-ar-vr`](../skills/mobile/universal/ar-vr/SKILL.md), [`security-data-security`](../skills/security/data-security/SKILL.md), [`planning-bpmn-modeling`](../skills/planning/bpmn-modeling/SKILL.md), [`planning-bdd-atdd`](../skills/planning/bdd-atdd/SKILL.md), [`agile-scrum-kanban`](../skills/management/agile-scrum-kanban/SKILL.md), [`management-team-topology`](../skills/management/team-topology/SKILL.md), [`management-change-management`](../skills/management/change-management/SKILL.md), [`quality-acceptance-testing`](../skills/quality/acceptance-testing/SKILL.md), [`quality-regression-testing`](../skills/quality/regression-testing/SKILL.md), [`quality-smoke-testing`](../skills/quality/smoke-testing/SKILL.md), [`data-data-strategy`](../skills/data/data-strategy/SKILL.md), [`data-dimensional-modeling`](../skills/data/dimensional-modeling/SKILL.md), [`data-science-statistical-analysis`](../skills/data-science/statistical-analysis/SKILL.md), [`data-science-experimentation`](../skills/data-science/experimentation/SKILL.md), [`data-science-causal-inference`](../skills/data-science/causal-inference/SKILL.md), [`data-science-analytics-engineering`](../skills/data-science/analytics-engineering/SKILL.md), [`enterprise-togaf-zachman`](../skills/enterprise/togaf-zachman/SKILL.md), [`enterprise-itil-service-mgmt`](../skills/enterprise/itil-service-mgmt/SKILL.md), [`enterprise-vendor-management`](../skills/enterprise/vendor-management/SKILL.md), [`enterprise-architecture-governance`](../skills/enterprise/architecture-governance/SKILL.md), [`product-customer-journey`](../skills/product/customer-journey/SKILL.md), [`product-persona-development`](../skills/product/persona-development/SKILL.md)

</details>

### mobile-flutter

Flutter + universal mobile skills + deployment — **120 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-brief --skill create-prd --skill create-tech-spec --skill create-story --skill design-patterns --skill backend-clean-architecture --skill backend-api-design --skill backend-api-response --skill backend-auth-patterns --skill quality-unit-testing --skill quality-integration-testing --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-security-auditor --skill dev-loop-git-workflow --skill docker-patterns --skill cicd-pipeline --skill helm-patterns --skill terraform --skill ansible --skill monitoring --skill alerting --skill team-rules --skill security --skill pentesting --skill mobile-push-notifications --skill mobile-in-app-purchase --skill mobile-crash-reporting --skill flutter-expertise --skill mobile-patterns --skill mobile-testing --skill mobile-performance --skill mobile-security --skill mobile-networking --skill mobile-storage --skill mobile-deployment --skill backend-graphql-patterns --skill backend-background-jobs --skill backend-search-patterns --skill data-streaming --skill backend-file-storage --skill backend-feature-flags --skill frontend-feature-flags --skill backend-internationalization --skill frontend-internationalization --skill backend-structured-logging --skill frontend-animation --skill frontend-form-handling --skill frontend-data-fetching --skill frontend-bundler-tools --skill frontend-image-optimization --skill frontend-theming --skill mobile-kotlin-multiplatform --skill mobile-ionic-capacitor --skill mobile-dotnet-maui --skill mobile-deep-linking --skill mobile-offline-first --skill mobile-biometrics --skill map-location --skill mobile-camera-media --skill mobile-analytics --skill argo-cd --skill devops-azure --skill devops-gcp --skill devops-chaos-engineering --skill devops-service-mesh --skill devops-finops --skill backup-dr --skill database-migration --skill dev-loop-pr-writer --skill dev-loop-dev-container --skill dev-loop-tech-debt-tracker --skill dev-loop-api-client-generator --skill planning-create-roadmap --skill planning-create-pitch-deck --skill planning-market-analysis --skill core-onboarding --skill core-context-compressor --skill enterprise-compliance-audit --skill enterprise-multi-tenant --skill enterprise-integration-patterns --skill enterprise-data-governance --skill enterprise-sla-management --skill enterprise-legacy-migration --skill enterprise-identity-provider --skill enterprise-cost-governance --skill prompt-chain-of-thought --skill prompt-few-shot --skill prompt-tree-of-thoughts --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill ml-inference-optimization --skill llm-kv-cache-paged-attention --skill data-vector-databases --skill ai-agent-architectures --skill agent-observability --skill mobile-ar-vr --skill security-data-security --skill planning-bpmn-modeling --skill planning-bdd-atdd --skill agile-scrum-kanban --skill management-team-topology --skill management-change-management --skill quality-acceptance-testing --skill quality-regression-testing --skill quality-smoke-testing --skill data-data-strategy --skill data-dimensional-modeling --skill data-science-statistical-analysis --skill data-science-experimentation --skill data-science-causal-inference --skill data-science-analytics-engineering --skill enterprise-togaf-zachman --skill enterprise-itil-service-mgmt --skill enterprise-vendor-management --skill enterprise-architecture-governance --skill product-customer-journey --skill product-persona-development
```

</details>

<details><summary>Skills</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`create-story`](../skills/planning/create-story/SKILL.md), [`design-patterns`](../skills/backend/universal/design-patterns/SKILL.md), [`backend-clean-architecture`](../skills/backend/universal/clean-architecture/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-api-response`](../skills/backend/universal/api-response/SKILL.md), [`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`quality-unit-testing`](../skills/quality/unit-testing/SKILL.md), [`quality-integration-testing`](../skills/quality/integration-testing/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-security-auditor`](../skills/dev-loop/security-auditor/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`helm-patterns`](../skills/devops/helm-patterns/SKILL.md), [`terraform`](../skills/devops/terraform/SKILL.md), [`ansible`](../skills/devops/ansible/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`mobile-push-notifications`](../skills/mobile/universal/push-notifications/SKILL.md), [`mobile-in-app-purchase`](../skills/mobile/universal/in-app-purchase/SKILL.md), [`mobile-crash-reporting`](../skills/mobile/universal/crash-reporting/SKILL.md), [`flutter-expertise`](../skills/mobile/flutter/SKILL.md), [`mobile-patterns`](../skills/mobile/universal/patterns/SKILL.md), [`mobile-testing`](../skills/mobile/universal/testing/SKILL.md), [`mobile-performance`](../skills/mobile/universal/performance/SKILL.md), [`mobile-security`](../skills/mobile/universal/security/SKILL.md), [`mobile-networking`](../skills/mobile/universal/networking/SKILL.md), [`mobile-storage`](../skills/mobile/universal/storage/SKILL.md), [`mobile-deployment`](../skills/mobile/universal/deployment/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`frontend-feature-flags`](../skills/frontend/universal/feature-flags/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`frontend-internationalization`](../skills/frontend/universal/internationalization/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`frontend-animation`](../skills/frontend/universal/animation/SKILL.md), [`frontend-form-handling`](../skills/frontend/universal/form-handling/SKILL.md), [`frontend-data-fetching`](../skills/frontend/universal/data-fetching/SKILL.md), [`frontend-bundler-tools`](../skills/frontend/universal/bundler-tools/SKILL.md), [`frontend-image-optimization`](../skills/frontend/universal/image-optimization/SKILL.md), [`frontend-theming`](../skills/frontend/universal/theming/SKILL.md), [`mobile-kotlin-multiplatform`](../skills/mobile/kotlin-multiplatform/SKILL.md), [`mobile-ionic-capacitor`](../skills/mobile/ionic-capacitor/SKILL.md), [`mobile-dotnet-maui`](../skills/mobile/dotnet-maui/SKILL.md), [`mobile-deep-linking`](../skills/mobile/universal/deep-linking/SKILL.md), [`mobile-offline-first`](../skills/mobile/universal/offline-first/SKILL.md), [`mobile-biometrics`](../skills/mobile/universal/biometrics/SKILL.md), [`map-location`](../skills/mobile/universal/map-location/SKILL.md), [`mobile-camera-media`](../skills/mobile/universal/camera-media/SKILL.md), [`mobile-analytics`](../skills/mobile/universal/analytics/SKILL.md), [`argo-cd`](../skills/devops/argo-cd/SKILL.md), [`devops-azure`](../skills/devops/azure/SKILL.md), [`devops-gcp`](../skills/devops/gcp/SKILL.md), [`devops-chaos-engineering`](../skills/devops/chaos-engineering/SKILL.md), [`devops-service-mesh`](../skills/devops/service-mesh/SKILL.md), [`devops-finops`](../skills/devops/finops/SKILL.md), [`backup-dr`](../skills/devops/backup-dr/SKILL.md), [`database-migration`](../skills/devops/database-migration/SKILL.md), [`dev-loop-pr-writer`](../skills/dev-loop/pr-writer/SKILL.md), [`dev-loop-dev-container`](../skills/dev-loop/dev-container/SKILL.md), [`dev-loop-tech-debt-tracker`](../skills/dev-loop/tech-debt-tracker/SKILL.md), [`dev-loop-api-client-generator`](../skills/dev-loop/api-client-generator/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md), [`planning-create-pitch-deck`](../skills/planning/create-pitch-deck/SKILL.md), [`planning-market-analysis`](../skills/planning/market-analysis/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md), [`enterprise-multi-tenant`](../skills/enterprise/multi-tenant/SKILL.md), [`enterprise-integration-patterns`](../skills/enterprise/integration-patterns/SKILL.md), [`enterprise-data-governance`](../skills/enterprise/data-governance/SKILL.md), [`enterprise-sla-management`](../skills/enterprise/sla-management/SKILL.md), [`enterprise-legacy-migration`](../skills/enterprise/legacy-migration/SKILL.md), [`enterprise-identity-provider`](../skills/enterprise/identity-provider/SKILL.md), [`enterprise-cost-governance`](../skills/enterprise/cost-governance/SKILL.md), [`prompt-chain-of-thought`](../skills/prompt-engineering/chain-of-thought/SKILL.md), [`prompt-few-shot`](../skills/prompt-engineering/few-shot-prompting/SKILL.md), [`prompt-tree-of-thoughts`](../skills/prompt-engineering/tree-of-thoughts/SKILL.md), [`llm-rag-retrieval-internals`](../skills/ai/llm-engineering/rag-architecture/SKILL.md), [`prompt-rag-query-design`](../skills/prompt-engineering/rag-design/SKILL.md), [`ml-inference-optimization`](../skills/ml/inference-optimization/SKILL.md), [`llm-kv-cache-paged-attention`](../skills/ai/llm-engineering/kv-cache/SKILL.md), [`data-vector-databases`](../skills/data/vector-databases/SKILL.md), [`ai-agent-architectures`](../skills/ai/ai-agents/SKILL.md), [`agent-observability`](../skills/harness-engineering/agent-observability/SKILL.md), [`mobile-ar-vr`](../skills/mobile/universal/ar-vr/SKILL.md), [`security-data-security`](../skills/security/data-security/SKILL.md), [`planning-bpmn-modeling`](../skills/planning/bpmn-modeling/SKILL.md), [`planning-bdd-atdd`](../skills/planning/bdd-atdd/SKILL.md), [`agile-scrum-kanban`](../skills/management/agile-scrum-kanban/SKILL.md), [`management-team-topology`](../skills/management/team-topology/SKILL.md), [`management-change-management`](../skills/management/change-management/SKILL.md), [`quality-acceptance-testing`](../skills/quality/acceptance-testing/SKILL.md), [`quality-regression-testing`](../skills/quality/regression-testing/SKILL.md), [`quality-smoke-testing`](../skills/quality/smoke-testing/SKILL.md), [`data-data-strategy`](../skills/data/data-strategy/SKILL.md), [`data-dimensional-modeling`](../skills/data/dimensional-modeling/SKILL.md), [`data-science-statistical-analysis`](../skills/data-science/statistical-analysis/SKILL.md), [`data-science-experimentation`](../skills/data-science/experimentation/SKILL.md), [`data-science-causal-inference`](../skills/data-science/causal-inference/SKILL.md), [`data-science-analytics-engineering`](../skills/data-science/analytics-engineering/SKILL.md), [`enterprise-togaf-zachman`](../skills/enterprise/togaf-zachman/SKILL.md), [`enterprise-itil-service-mgmt`](../skills/enterprise/itil-service-mgmt/SKILL.md), [`enterprise-vendor-management`](../skills/enterprise/vendor-management/SKILL.md), [`enterprise-architecture-governance`](../skills/enterprise/architecture-governance/SKILL.md), [`product-customer-journey`](../skills/product/customer-journey/SKILL.md), [`product-persona-development`](../skills/product/persona-development/SKILL.md)

</details>

### mobile-react-native

React Native + universal mobile skills + deployment — **120 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-brief --skill create-prd --skill create-tech-spec --skill create-story --skill design-patterns --skill backend-clean-architecture --skill backend-api-design --skill backend-api-response --skill backend-auth-patterns --skill quality-unit-testing --skill quality-integration-testing --skill code-review --skill dev-loop-debugging-strategy --skill dev-loop-security-auditor --skill dev-loop-git-workflow --skill docker-patterns --skill cicd-pipeline --skill helm-patterns --skill terraform --skill ansible --skill monitoring --skill alerting --skill team-rules --skill security --skill pentesting --skill mobile-push-notifications --skill mobile-in-app-purchase --skill mobile-crash-reporting --skill react-native-expertise --skill mobile-patterns --skill mobile-testing --skill mobile-performance --skill mobile-security --skill mobile-networking --skill mobile-storage --skill mobile-deployment --skill backend-graphql-patterns --skill backend-background-jobs --skill backend-search-patterns --skill data-streaming --skill backend-file-storage --skill backend-feature-flags --skill frontend-feature-flags --skill backend-internationalization --skill frontend-internationalization --skill backend-structured-logging --skill frontend-animation --skill frontend-form-handling --skill frontend-data-fetching --skill frontend-bundler-tools --skill frontend-image-optimization --skill frontend-theming --skill mobile-kotlin-multiplatform --skill mobile-ionic-capacitor --skill mobile-dotnet-maui --skill mobile-deep-linking --skill mobile-offline-first --skill mobile-biometrics --skill map-location --skill mobile-camera-media --skill mobile-analytics --skill argo-cd --skill devops-azure --skill devops-gcp --skill devops-chaos-engineering --skill devops-service-mesh --skill devops-finops --skill backup-dr --skill database-migration --skill dev-loop-pr-writer --skill dev-loop-dev-container --skill dev-loop-tech-debt-tracker --skill dev-loop-api-client-generator --skill planning-create-roadmap --skill planning-create-pitch-deck --skill planning-market-analysis --skill core-onboarding --skill core-context-compressor --skill enterprise-compliance-audit --skill enterprise-multi-tenant --skill enterprise-integration-patterns --skill enterprise-data-governance --skill enterprise-sla-management --skill enterprise-legacy-migration --skill enterprise-identity-provider --skill enterprise-cost-governance --skill prompt-chain-of-thought --skill prompt-few-shot --skill prompt-tree-of-thoughts --skill llm-rag-retrieval-internals --skill prompt-rag-query-design --skill ml-inference-optimization --skill llm-kv-cache-paged-attention --skill data-vector-databases --skill ai-agent-architectures --skill agent-observability --skill mobile-ar-vr --skill security-data-security --skill planning-bpmn-modeling --skill planning-bdd-atdd --skill agile-scrum-kanban --skill management-team-topology --skill management-change-management --skill quality-acceptance-testing --skill quality-regression-testing --skill quality-smoke-testing --skill data-data-strategy --skill data-dimensional-modeling --skill data-science-statistical-analysis --skill data-science-experimentation --skill data-science-causal-inference --skill data-science-analytics-engineering --skill enterprise-togaf-zachman --skill enterprise-itil-service-mgmt --skill enterprise-vendor-management --skill enterprise-architecture-governance --skill product-customer-journey --skill product-persona-development
```

</details>

<details><summary>Skills</summary>

[`master-orchestrator`](../skills/core/master-orchestrator/SKILL.md), [`project-init`](../skills/core/project-init/SKILL.md), [`create-brief`](../skills/planning/create-brief/SKILL.md), [`create-prd`](../skills/planning/create-prd/SKILL.md), [`create-tech-spec`](../skills/planning/create-tech-spec/SKILL.md), [`create-story`](../skills/planning/create-story/SKILL.md), [`design-patterns`](../skills/backend/universal/design-patterns/SKILL.md), [`backend-clean-architecture`](../skills/backend/universal/clean-architecture/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-api-response`](../skills/backend/universal/api-response/SKILL.md), [`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`quality-unit-testing`](../skills/quality/unit-testing/SKILL.md), [`quality-integration-testing`](../skills/quality/integration-testing/SKILL.md), [`code-review`](../skills/dev-loop/code-review/SKILL.md), [`dev-loop-debugging-strategy`](../skills/dev-loop/debugging-strategy/SKILL.md), [`dev-loop-security-auditor`](../skills/dev-loop/security-auditor/SKILL.md), [`dev-loop-git-workflow`](../skills/dev-loop/git-workflow/SKILL.md), [`docker-patterns`](../skills/devops/docker-patterns/SKILL.md), [`cicd-pipeline`](../skills/devops/cicd-pipeline/SKILL.md), [`helm-patterns`](../skills/devops/helm-patterns/SKILL.md), [`terraform`](../skills/devops/terraform/SKILL.md), [`ansible`](../skills/devops/ansible/SKILL.md), [`monitoring`](../skills/devops/monitoring/SKILL.md), [`alerting`](../skills/management/alerting/SKILL.md), [`team-rules`](../skills/management/team-rules/SKILL.md), [`security`](../skills/management/security/SKILL.md), [`pentesting`](../skills/management/pentesting/SKILL.md), [`mobile-push-notifications`](../skills/mobile/universal/push-notifications/SKILL.md), [`mobile-in-app-purchase`](../skills/mobile/universal/in-app-purchase/SKILL.md), [`mobile-crash-reporting`](../skills/mobile/universal/crash-reporting/SKILL.md), [`react-native-expertise`](../skills/mobile/react-native/SKILL.md), [`mobile-patterns`](../skills/mobile/universal/patterns/SKILL.md), [`mobile-testing`](../skills/mobile/universal/testing/SKILL.md), [`mobile-performance`](../skills/mobile/universal/performance/SKILL.md), [`mobile-security`](../skills/mobile/universal/security/SKILL.md), [`mobile-networking`](../skills/mobile/universal/networking/SKILL.md), [`mobile-storage`](../skills/mobile/universal/storage/SKILL.md), [`mobile-deployment`](../skills/mobile/universal/deployment/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`data-streaming`](../skills/data/streaming/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`frontend-feature-flags`](../skills/frontend/universal/feature-flags/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`frontend-internationalization`](../skills/frontend/universal/internationalization/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`frontend-animation`](../skills/frontend/universal/animation/SKILL.md), [`frontend-form-handling`](../skills/frontend/universal/form-handling/SKILL.md), [`frontend-data-fetching`](../skills/frontend/universal/data-fetching/SKILL.md), [`frontend-bundler-tools`](../skills/frontend/universal/bundler-tools/SKILL.md), [`frontend-image-optimization`](../skills/frontend/universal/image-optimization/SKILL.md), [`frontend-theming`](../skills/frontend/universal/theming/SKILL.md), [`mobile-kotlin-multiplatform`](../skills/mobile/kotlin-multiplatform/SKILL.md), [`mobile-ionic-capacitor`](../skills/mobile/ionic-capacitor/SKILL.md), [`mobile-dotnet-maui`](../skills/mobile/dotnet-maui/SKILL.md), [`mobile-deep-linking`](../skills/mobile/universal/deep-linking/SKILL.md), [`mobile-offline-first`](../skills/mobile/universal/offline-first/SKILL.md), [`mobile-biometrics`](../skills/mobile/universal/biometrics/SKILL.md), [`map-location`](../skills/mobile/universal/map-location/SKILL.md), [`mobile-camera-media`](../skills/mobile/universal/camera-media/SKILL.md), [`mobile-analytics`](../skills/mobile/universal/analytics/SKILL.md), [`argo-cd`](../skills/devops/argo-cd/SKILL.md), [`devops-azure`](../skills/devops/azure/SKILL.md), [`devops-gcp`](../skills/devops/gcp/SKILL.md), [`devops-chaos-engineering`](../skills/devops/chaos-engineering/SKILL.md), [`devops-service-mesh`](../skills/devops/service-mesh/SKILL.md), [`devops-finops`](../skills/devops/finops/SKILL.md), [`backup-dr`](../skills/devops/backup-dr/SKILL.md), [`database-migration`](../skills/devops/database-migration/SKILL.md), [`dev-loop-pr-writer`](../skills/dev-loop/pr-writer/SKILL.md), [`dev-loop-dev-container`](../skills/dev-loop/dev-container/SKILL.md), [`dev-loop-tech-debt-tracker`](../skills/dev-loop/tech-debt-tracker/SKILL.md), [`dev-loop-api-client-generator`](../skills/dev-loop/api-client-generator/SKILL.md), [`planning-create-roadmap`](../skills/planning/create-roadmap/SKILL.md), [`planning-create-pitch-deck`](../skills/planning/create-pitch-deck/SKILL.md), [`planning-market-analysis`](../skills/planning/market-analysis/SKILL.md), [`core-onboarding`](../skills/core/onboarding/SKILL.md), [`core-context-compressor`](../skills/core/context-compressor/SKILL.md), [`enterprise-compliance-audit`](../skills/enterprise/compliance-audit/SKILL.md), [`enterprise-multi-tenant`](../skills/enterprise/multi-tenant/SKILL.md), [`enterprise-integration-patterns`](../skills/enterprise/integration-patterns/SKILL.md), [`enterprise-data-governance`](../skills/enterprise/data-governance/SKILL.md), [`enterprise-sla-management`](../skills/enterprise/sla-management/SKILL.md), [`enterprise-legacy-migration`](../skills/enterprise/legacy-migration/SKILL.md), [`enterprise-identity-provider`](../skills/enterprise/identity-provider/SKILL.md), [`enterprise-cost-governance`](../skills/enterprise/cost-governance/SKILL.md), [`prompt-chain-of-thought`](../skills/prompt-engineering/chain-of-thought/SKILL.md), [`prompt-few-shot`](../skills/prompt-engineering/few-shot-prompting/SKILL.md), [`prompt-tree-of-thoughts`](../skills/prompt-engineering/tree-of-thoughts/SKILL.md), [`llm-rag-retrieval-internals`](../skills/ai/llm-engineering/rag-architecture/SKILL.md), [`prompt-rag-query-design`](../skills/prompt-engineering/rag-design/SKILL.md), [`ml-inference-optimization`](../skills/ml/inference-optimization/SKILL.md), [`llm-kv-cache-paged-attention`](../skills/ai/llm-engineering/kv-cache/SKILL.md), [`data-vector-databases`](../skills/data/vector-databases/SKILL.md), [`ai-agent-architectures`](../skills/ai/ai-agents/SKILL.md), [`agent-observability`](../skills/harness-engineering/agent-observability/SKILL.md), [`mobile-ar-vr`](../skills/mobile/universal/ar-vr/SKILL.md), [`security-data-security`](../skills/security/data-security/SKILL.md), [`planning-bpmn-modeling`](../skills/planning/bpmn-modeling/SKILL.md), [`planning-bdd-atdd`](../skills/planning/bdd-atdd/SKILL.md), [`agile-scrum-kanban`](../skills/management/agile-scrum-kanban/SKILL.md), [`management-team-topology`](../skills/management/team-topology/SKILL.md), [`management-change-management`](../skills/management/change-management/SKILL.md), [`quality-acceptance-testing`](../skills/quality/acceptance-testing/SKILL.md), [`quality-regression-testing`](../skills/quality/regression-testing/SKILL.md), [`quality-smoke-testing`](../skills/quality/smoke-testing/SKILL.md), [`data-data-strategy`](../skills/data/data-strategy/SKILL.md), [`data-dimensional-modeling`](../skills/data/dimensional-modeling/SKILL.md), [`data-science-statistical-analysis`](../skills/data-science/statistical-analysis/SKILL.md), [`data-science-experimentation`](../skills/data-science/experimentation/SKILL.md), [`data-science-causal-inference`](../skills/data-science/causal-inference/SKILL.md), [`data-science-analytics-engineering`](../skills/data-science/analytics-engineering/SKILL.md), [`enterprise-togaf-zachman`](../skills/enterprise/togaf-zachman/SKILL.md), [`enterprise-itil-service-mgmt`](../skills/enterprise/itil-service-mgmt/SKILL.md), [`enterprise-vendor-management`](../skills/enterprise/vendor-management/SKILL.md), [`enterprise-architecture-governance`](../skills/enterprise/architecture-governance/SKILL.md), [`product-customer-journey`](../skills/product/customer-journey/SKILL.md), [`product-persona-development`](../skills/product/persona-development/SKILL.md)

</details>

### backend-stacks

Backend frameworks and runtimes: Node (Express/Fastify/Hono/Nest), Bun, Deno, Go, Rust, Python, Java/Kotlin, .NET, PHP, Ruby, Elixir, Swift, Scala — **83 skills**

<details><summary>Install command</summary>

```bash
npx skills add j4flmao/agent-skills --skill oak-backend --skill dotnet-architecture --skill dotnet-patterns --skill elysia-architecture --skill elysia-patterns --skill golang-architecture --skill golang-patterns --skill micronaut --skill quarkus-backend --skill kotlin-architecture --skill kotlin-backend-patterns --skill nestjs-architecture --skill nestjs-patterns --skill nodejs-architecture --skill nodejs-drizzle --skill nodejs-express-skill --skill nodejs-fastify --skill nodejs-hono --skill nodejs-patterns --skill nodejs-prisma --skill php-laravel --skill php-pure --skill symfony-backend --skill php-zend --skill python-django-architecture --skill python-fastapi-architecture --skill flask-backend --skill ruby-rails --skill rust-architecture --skill rust-patterns --skill scala-play --skill spring-boot-architecture --skill spring-boot-patterns --skill vapor-backend --skill backend-api-design --skill backend-api-response --skill backend-api-versioning --skill api-graphql-federation --skill api-product-management --skill backend-audit-logging --skill backend-auth-patterns --skill backend-authorization --skill backend-background-jobs --skill backend-bff-pattern --skill backend-caching --skill backend-clean-architecture --skill backend-concurrency-mechanics --skill backend-contract-testing --skill backend-cqrs-patterns --skill backend-data-masking --skill backend-data-streaming --skill backend-database-patterns --skill design-patterns --skill microservice-design-patterns --skill backend-distributed-locking --skill backend-event-driven --skill backend-event-sourcing --skill backend-feature-flags --skill backend-file-storage --skill firebase --skill backend-graphql-patterns --skill backend-grpc-patterns --skill backend-idempotency --skill backend-internationalization --skill backend-load-testing --skill backend-message-queue --skill microservices --skill backend-multi-tenancy --skill backend-openapi-documentation --skill backend-plugin-architecture --skill rate-limiting --skill backend-resilience-patterns --skill backend-scheduling-cron --skill backend-search-patterns --skill backend-serverless --skill backend-structured-logging --skill supabase --skill backend-transactional-outbox --skill backend-webhooks --skill backend-websocket-patterns --skill bun --skill deno --skill backend-elixir
```

</details>

<details><summary>Skills</summary>

[`oak-backend`](../skills/backend/deno/oak/SKILL.md), [`dotnet-architecture`](../skills/backend/dotnet/architecture/SKILL.md), [`dotnet-patterns`](../skills/backend/dotnet/patterns/SKILL.md), [`elysia-architecture`](../skills/backend/elysia/architecture/SKILL.md), [`elysia-patterns`](../skills/backend/elysia/patterns/SKILL.md), [`golang-architecture`](../skills/backend/go/architecture/SKILL.md), [`golang-patterns`](../skills/backend/go/patterns/SKILL.md), [`micronaut`](../skills/backend/java/micronaut/SKILL.md), [`quarkus-backend`](../skills/backend/java/quarkus/SKILL.md), [`kotlin-architecture`](../skills/backend/kotlin/architecture/SKILL.md), [`kotlin-backend-patterns`](../skills/backend/kotlin/patterns/SKILL.md), [`nestjs-architecture`](../skills/backend/nestjs/architecture/SKILL.md), [`nestjs-patterns`](../skills/backend/nestjs/patterns/SKILL.md), [`nodejs-architecture`](../skills/backend/nodejs/architecture/SKILL.md), [`nodejs-drizzle`](../skills/backend/nodejs/drizzle/SKILL.md), [`nodejs-express-skill`](../skills/backend/nodejs/express/SKILL.md), [`nodejs-fastify`](../skills/backend/nodejs/fastify/SKILL.md), [`nodejs-hono`](../skills/backend/nodejs/hono/SKILL.md), [`nodejs-patterns`](../skills/backend/nodejs/patterns/SKILL.md), [`nodejs-prisma`](../skills/backend/nodejs/prisma/SKILL.md), [`php-laravel`](../skills/backend/php/laravel/SKILL.md), [`php-pure`](../skills/backend/php/pure/SKILL.md), [`symfony-backend`](../skills/backend/php/symfony/SKILL.md), [`php-zend`](../skills/backend/php/zend/SKILL.md), [`python-django-architecture`](../skills/backend/python/django/SKILL.md), [`python-fastapi-architecture`](../skills/backend/python/fastapi/SKILL.md), [`flask-backend`](../skills/backend/python/flask/SKILL.md), [`ruby-rails`](../skills/backend/ruby/rails/SKILL.md), [`rust-architecture`](../skills/backend/rust/architecture/SKILL.md), [`rust-patterns`](../skills/backend/rust/patterns/SKILL.md), [`scala-play`](../skills/backend/scala/play/SKILL.md), [`spring-boot-architecture`](../skills/backend/spring-boot/architecture/SKILL.md), [`spring-boot-patterns`](../skills/backend/spring-boot/patterns/SKILL.md), [`vapor-backend`](../skills/backend/swift/vapor/SKILL.md), [`backend-api-design`](../skills/backend/universal/api-design/SKILL.md), [`backend-api-response`](../skills/backend/universal/api-response/SKILL.md), [`backend-api-versioning`](../skills/backend/universal/api-versioning/SKILL.md), [`api-graphql-federation`](../skills/backend/universal/api/graphql-federation/SKILL.md), [`api-product-management`](../skills/backend/universal/api/product-management/SKILL.md), [`backend-audit-logging`](../skills/backend/universal/audit-logging/SKILL.md), [`backend-auth-patterns`](../skills/backend/universal/auth-patterns/SKILL.md), [`backend-authorization`](../skills/backend/universal/authorization/SKILL.md), [`backend-background-jobs`](../skills/backend/universal/background-jobs/SKILL.md), [`backend-bff-pattern`](../skills/backend/universal/bff-pattern/SKILL.md), [`backend-caching`](../skills/backend/universal/caching/SKILL.md), [`backend-clean-architecture`](../skills/backend/universal/clean-architecture/SKILL.md), [`backend-concurrency-mechanics`](../skills/backend/universal/concurrency/SKILL.md), [`backend-contract-testing`](../skills/backend/universal/contract-testing/SKILL.md), [`backend-cqrs-patterns`](../skills/backend/universal/cqrs-patterns/SKILL.md), [`backend-data-masking`](../skills/backend/universal/data-masking/SKILL.md), [`backend-data-streaming`](../skills/backend/universal/data-streaming/SKILL.md), [`backend-database-patterns`](../skills/backend/universal/database-patterns/SKILL.md), [`design-patterns`](../skills/backend/universal/design-patterns/SKILL.md), [`microservice-design-patterns`](../skills/backend/universal/design-patterns/microservices/SKILL.md), [`backend-distributed-locking`](../skills/backend/universal/distributed-locking/SKILL.md), [`backend-event-driven`](../skills/backend/universal/event-driven/SKILL.md), [`backend-event-sourcing`](../skills/backend/universal/event-sourcing/SKILL.md), [`backend-feature-flags`](../skills/backend/universal/feature-flags/SKILL.md), [`backend-file-storage`](../skills/backend/universal/file-storage/SKILL.md), [`firebase`](../skills/backend/universal/firebase/SKILL.md), [`backend-graphql-patterns`](../skills/backend/universal/graphql-patterns/SKILL.md), [`backend-grpc-patterns`](../skills/backend/universal/grpc-patterns/SKILL.md), [`backend-idempotency`](../skills/backend/universal/idempotency/SKILL.md), [`backend-internationalization`](../skills/backend/universal/internationalization/SKILL.md), [`backend-load-testing`](../skills/backend/universal/load-testing/SKILL.md), [`backend-message-queue`](../skills/backend/universal/message-queue/SKILL.md), [`microservices`](../skills/backend/universal/microservices/SKILL.md), [`backend-multi-tenancy`](../skills/backend/universal/multi-tenancy/SKILL.md), [`backend-openapi-documentation`](../skills/backend/universal/openapi-documentation/SKILL.md), [`backend-plugin-architecture`](../skills/backend/universal/plugin-architecture/SKILL.md), [`rate-limiting`](../skills/backend/universal/rate-limiting/SKILL.md), [`backend-resilience-patterns`](../skills/backend/universal/resilience-patterns/SKILL.md), [`backend-scheduling-cron`](../skills/backend/universal/scheduling-cron/SKILL.md), [`backend-search-patterns`](../skills/backend/universal/search-patterns/SKILL.md), [`backend-serverless`](../skills/backend/universal/serverless/SKILL.md), [`backend-structured-logging`](../skills/backend/universal/structured-logging/SKILL.md), [`supabase`](../skills/backend/universal/supabase/SKILL.md), [`backend-transactional-outbox`](../skills/backend/universal/transactional-outbox/SKILL.md), [`backend-webhooks`](../skills/backend/universal/webhooks/SKILL.md), [`backend-websocket-patterns`](../skills/backend/universal/websocket-patterns/SKILL.md), [`bun`](../skills/backend/bun/SKILL.md), [`deno`](../skills/backend/deno/SKILL.md), [`backend-elixir`](../skills/backend/elixir/SKILL.md)

</details>
