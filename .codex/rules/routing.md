# Routing -- 417 skills

## Entry

`skills/core/master-orchestrator/SKILL.md` (no trigger match -> route here)

## Trigger keywords

```
tech-spec/technical-spec          -> planning/create-tech-spec
solution-architecture/hld/system-design -> planning/solution-architecture
cost-benefit/roi/tco              -> planning/cost-benefit
bpmn/process-modeling/business-process -> planning/bpmn-modeling
bdd/atdd/gherkin/behavior-driven       -> planning/bdd-atdd
nestjs/nodejs/elysia/go           -> backend/{stack}/
rust/python/spring/dotnet/rails   -> backend/{stack}/
php/laravel/symfony/zend          -> backend/php/{framework}
hono/express/fastify              -> backend/nodejs/{framework}
oak/deno-oak                      -> backend/deno/oak
vapor/swift-vapor                 -> backend/swift/vapor
play/scala-play                   -> backend/scala/play
micronaut/quarkus                 -> backend/java/{framework}
django/fastapi/flask              -> backend/python/{framework}
kotlin/ktor                       -> backend/kotlin
elixir/phoenix                    -> backend/elixir
deno/bun/prisma/drizzle           -> backend/{name}
oop/solid/microservices           -> backend/universal/
api-design/api-response/database  -> backend/universal/
auth/event-driven/testing         -> backend/universal/
grpc/protobuf/websocket           -> backend/universal/
kafka/rabbitmq/message-queue      -> backend/universal/
redis/caching/cdn                 -> backend/universal/
graphql/apollo/resolver           -> backend/universal/
background-jobs/search/streaming  -> backend/universal/
file-storage/feature-flags/i18n   -> backend/universal/
logging/structured-log            -> backend/universal/
observability/telemetry           -> backend/universal/observability
resilience/circuit-breaker        -> backend/universal/resilience-patterns
openapi/swagger/contract-test     -> backend/universal/{name}
idempotency/distributed-lock      -> backend/universal/{name}
webhook/api-versioning/cron       -> backend/universal/{name}
multi-tenant/bff/data-masking     -> backend/universal/{name}
audit-log/plugin/extension        -> backend/universal/{name}
react/next/vue/nuxt               -> frontend/
angular/sveltekit/remix           -> frontend/
astro/solidjs/qwik/svelte         -> frontend/
alpinejs/ember/htmx/preact/stencil -> frontend/{framework}/
lit/web-components/ar-vr          -> frontend/{framework}/
state/a11y/design-system          -> frontend/universal/
performance/testing/microfrontend -> frontend/universal/
tailwind/storybook/pwa/seo        -> frontend/universal/
animation/forms/data-fetching     -> frontend/universal/
bundler/img-opt/theming           -> frontend/universal/
auth-ui/error-handling/rendering  -> frontend/universal/
css-strategy/typescript/caching   -> frontend/universal/
responsive-design/i18n/feature-flags/security -> frontend/universal/
ios/swift/android/kotlin          -> mobile/
flutter/react-native/kmp          -> mobile/
ionic-capacitor/dotnet-maui       -> mobile/
mvvm/testing/performance          -> mobile/universal/
security/networking/storage       -> mobile/universal/
deployment/push/in-app-purchase   -> mobile/universal/
crash-reporting/deep-linking      -> mobile/universal/
offline-first/biometrics          -> mobile/universal/
map-location/camera-media/analytics -> mobile/universal/
electron/tauri/qt/gtk             -> desktop/desktop-{name}
wpf/winui/uwp/winforms            -> desktop/desktop-{name}
swiftui/appkit/gnome/kde          -> desktop/desktop-{name}
review/debug/refactor             -> dev-loop/
docker/k8s/terraform/helm         -> devops/
ansible/jenkins/longhorn/monitoring -> devops/
github-actions/gitops/vault       -> devops/
aws/serverless/monorepo           -> devops/
dependency-management/api-docs    -> devops/
argo-cd/azure/gcp/chaos           -> devops/
service-mesh/finops/backup-dr     -> devops/
db-migration/nomad/incident-response -> devops/
dataops/mlops/k8s-data/cloud-cost/cloud-arch/platform-eng/sre/operator/gitops-adv/progressive/policy/cloud-mig -> devops/
firebase/firestore/fcm           -> backend/universal/firebase
supabase/supabase-db/rls         -> backend/universal/supabase
pm/ba/qa/qc/security              -> management/
okr-kpi/sprint-retro/risk         -> management/
hiring/interview/stakeholder      -> management/
agile/scrum/kanban/sprint         -> management/agile-scrum-kanban
team-topology/conway/squad        -> management/team-topology
change-management/adkar/kotter    -> management/change-management
compliance/multi-tenant           -> enterprise/
integration/data-governance       -> enterprise/
sla/legacy/identity/cost          -> enterprise/
togaf/zachman/ea-framework        -> enterprise/togaf-zachman
itil/itsm/change-release          -> enterprise/itil-service-mgmt
vendor/supplier/procurement       -> enterprise/vendor-management
architecture-governance/arch-board -> enterprise/architecture-governance
analytics/ab-test/user-research   -> product/
growth/pricing/go-to-market       -> product/
onboarding/prioritization         -> product/
customer-journey/journey-map      -> product/customer-journey
persona/empathy-map/user-persona  -> product/persona-development
ai/llm/prompt-engineering         -> ai/ai-prompt-engineering
rag/retrieval/chunking            -> ai/ai-rag-patterns
llmops/model-serving/vector-db    -> ai/{name}
ai-agent/function-calling         -> ai/ai-ai-agents
ai-eval/model-training            -> ai/{name}
embeddings/multimodal             -> ai/{name}
ai-safety/ai-testing/ai-cost      -> ai/{name}
langchain/mcp/ai-observability    -> ai/{name}
cqrs/command-query/read-model      -> backend/universal/cqrs-patterns
event-sourcing/event-store/replay   -> backend/universal/event-sourcing
saga/choreography/compensation      -> backend/universal/saga-patterns
outbox/transactional-outbox/dual-write -> backend/universal/transactional-outbox

sast/dast/sbom/secrets            -> security/{name}
container-security/api-security   -> security/{name}
data-security                     -> security/security-data-security
soc/siem/soar/threat-intel/edr    -> security/{name}
payment/stripe/subscription       -> ecommerce/{name}
checkout/cart/order               -> ecommerce/{name}
graphql-federation/apollo         -> api/graphql-federation
api-product/api-strategy          -> api/product-management
webrtc/sfu/media-streaming        -> backend/web-real-time
etl/warehouse/streaming/bi        -> data/{name}
data-quality/distributed-storage  -> data/{name}
distributed-compute/data-lake     -> data/{name}
lakehouse/batch-processing        -> data/{name}
workflow-orchestration/cdc        -> data/{name}
replication/platform/catalog      -> data/{name}
observability/contracts/mesh      -> data/{name}
versioning/api/virtualization     -> data/{name}
schema-registry/relational-db     -> data/{name}
nosql/graph/search-engine         -> data/{name}
clean-room/cost-optimization      -> data/{name}
formats/lineage/pipeline-cicd     -> data/{name}
testing/reverse-etl               -> data/{name}
data-strategy/data-vision/data-maturity -> data/data-data-strategy
dimensional-modeling/kimball/star-schema/scd -> data/data-dimensional-modeling
statistical-analysis/hypothesis-testing/bayesian -> data-science/statistical-analysis
experimentation/ab-test/experiment-design         -> data-science/experimentation
causal-inference/causal/counterfactual            -> data-science/causal-inference
analytics-engineering/dbt/metrics-layer            -> data-science/analytics-engineering
design-system/ux/accessibility    -> design/{name}
prototyping                       -> design/design-prototyping
e2e-testing/visual/load/contract  -> quality/{name}
exploratory-testing/charter/heuristics -> quality/exploratory-testing
acceptance-testing/uat/alpha-beta      -> quality/acceptance-testing
regression-testing/regression-suite    -> quality/regression-testing
smoke-testing/smoke/bvt/build          -> quality/smoke-testing
experiment-tracking/classical-ml  -> ml/{name}
deep-learning/feature-engineering -> ml/{name}
hyperparameter-tuning/evaluation  -> ml/{name}
interpretability/time-series      -> ml/{name}
nlp/computer-vision/recommender   -> ml/{name}
anomaly-detection/ml-pipeline     -> ml/{name}
feature-store/model-serving       -> ml/{name}
math-foundations                  -> ml/ml-math-foundations

pulumi/pulumi-iac                     -> devops/pulumi
crossplane/composition                -> devops/crossplane
gitlab-ci/gitlab-pipeline             -> devops/gitlab-ci
circleci/circleci-config              -> devops/circleci
keda/autoscaling/hpa/vpa              -> devops/kubernetes-autoscaling
datadog/apm/new-relic/tracing         -> devops/apm-observability
cilium/ebpf                           -> devops/cilium-ebpf
opentelemetry/otel/collector          -> devops/opentelemetry
oracle-cloud/oci/oke                  -> devops/oracle-cloud
digitalocean/doks                     -> devops/digitalocean
ibm-cloud/ibm-kubernetes              -> devops/ibm-cloud
alibaba-cloud/aliyun/ack              -> devops/alibaba-cloud
hetzner/hcloud                        -> devops/hetzner

zero-trust/zta/beyondcorp            -> security/zero-trust
cspm/wiz/prisma-cloud                 -> security/cspm
pentest/penetration-test              -> security/penetration-testing
iam-governance/access-review          -> security/iam-governance

# blockchain
consensus/pow/pos/pbft/hotstuff/node-implementation  -> blockchain/blockchain-core
cryptography/elliptic-curve/merkle/zero-knowledge     -> blockchain/blockchain-cryptography
bitcoin/bitcoin-core/btc/taproot/lightning            -> blockchain/blockchain-bitcoin
ethereum/evm/execution-client/beacon-chain            -> blockchain/blockchain-ethereum
solidity/rust/haskell/smart-contract/move             -> blockchain/blockchain-application
erc20/erc721/proxy/oracle/mev                         -> blockchain/blockchain-patterns
web3/ethers/viem/wagmi/dapp                           -> blockchain/blockchain-web3
testing/foundry/hardhat/fuzz/invariant                -> blockchain/blockchain-testing
deploy/node/rpc/monitoring/environment                -> blockchain/blockchain-infrastructure
audit/threat-model/formal-verification                -> blockchain/blockchain-security
governance/dao/multisig/tokenomics                    -> blockchain/blockchain-management
solana/poh/anchor/solana-program/spl                   -> blockchain/blockchain-solana
defi/amm/lending/uniswap/yearn/curve                   -> blockchain/blockchain-defi
cross-chain/ibc/layerzero/wormhole/axelar               -> blockchain/blockchain-cross-chain
zk/circom/noir/zk-rollup/zkevm                          -> blockchain/blockchain-zk
subgraph/dune/indexing/the-graph                        -> blockchain/blockchain-data-indexing
```

## Phase order

planning -> backend -> frontend -> mobile -> desktop -> dev-loop -> devops -> management

## Full skill table

| Phase | Skills |
|-------|--------|
| core (4) | master-orchestrator, project-init, onboarding, context-compressor |
| planning (12) | create-brief, create-prd, create-adr, create-tech-spec, create-story, create-roadmap, create-pitch-deck, market-analysis, cost-benefit, solution-architecture, bpmn-modeling, bdd-atdd |
| backend-stack (29) | nestjs, nodejs, elysia, golang, rust, python-fastapi, python-django, python-flask, spring-boot, dotnet, rails, php-pure, php-laravel, php-zend, php-symfony, nodejs-hono, nodejs-express, nodejs-fastify, deno-oak, swift-vapor, scala-play, java-micronaut, java-quarkus, kotlin, elixir, bun, deno, prisma, drizzle |
| backend-universal (45) | oop-principles, design-patterns, microservices, clean-architecture, api-design, api-response, database-patterns, auth-patterns, event-driven, testing, grpc-patterns, websocket-patterns, message-queue, caching, rate-limiting, load-testing, api-gateway, graphql-patterns, background-jobs, search-patterns, data-streaming, file-storage, feature-flags, internationalization, structured-logging, observability, resilience-patterns, openapi-documentation, contract-testing, idempotency, distributed-locking, webhooks, api-versioning, scheduling-cron, multi-tenancy, bff-pattern, data-masking, audit-logging, plugin-architecture, cqrs-patterns, event-sourcing, saga-patterns, transactional-outbox, firebase, supabase |
| frontend-stack (25) | react, react-nextjs, vue, vue-nuxt, angular, sveltekit, remix-architecture, remix-patterns, astro-architecture, astro-patterns, solidjs-architecture, solidjs-patterns, qwik-architecture, qwik-patterns, svelte-architecture, svelte-patterns, vue-patterns, alpinejs, ember, htmx, preact, stencil, lit, web-components, ar-vr |
| frontend-universal (27) | patterns, state-management, accessibility, design-system, performance, testing, microfrontend, tailwind-css, storybook, pwa, seo, animation, form-handling, data-fetching, bundler-tools, image-optimization, theming, authentication, error-handling, rendering-strategies, css-strategy, typescript-patterns, browser-caching, responsive-design, internationalization, feature-flags, security |
| mobile-stack (7) | ios, android, flutter, react-native, kotlin-multiplatform, ionic-capacitor, dotnet-maui |
| mobile-universal (16) | patterns, testing, performance, security, networking, storage, deployment, push-notifications, in-app-purchase, crash-reporting, deep-linking, offline-first, biometrics, map-location, camera-media, analytics |
| desktop (12) | desktop-electron, desktop-tauri, desktop-qt, desktop-gtk, desktop-wpf, desktop-winui3, desktop-uwp, desktop-winforms, desktop-swiftui, desktop-appkit, desktop-gnome, desktop-kde |
| dev-loop (12) | code-review, debugging-strategy, refactor-guide, git-workflow, security-auditor, performance-profiler, changelog-generator, readme-writer, pr-writer, dev-container, tech-debt-tracker, api-client-generator |
| devops (56) | docker-patterns, cicd-pipeline, kubernetes-patterns, observability, helm-patterns, terraform, ansible, jenkins, longhorn, monitoring, github-actions, gitops, vault, aws, serverless, monorepo, dependency-management, api-documentation, argo-cd, azure, gcp, chaos-engineering, service-mesh, finops, backup-dr, database-migration, dataops, mlops, kubernetes-for-data, cloud-cost-optimization, cloud-architecture, nomad, incident-response, cost-benefit, devops-hiring, platform-engineering, sre-practices, internal-developer-platform, kubernetes-operators, gitops-advanced, progressive-delivery, policy-as-code, cloud-migration, pulumi, crossplane, gitlab-ci, circleci, kubernetes-autoscaling, apm-observability, cilium-ebpf, opentelemetry, oracle-cloud, digitalocean, ibm-cloud, alibaba-cloud, hetzner |
| management (17) | pm, ba, qa, qc, team-rules, security, pentesting, alerting, okr-kpi, sprint-retro, risk-management, hiring, stakeholder, cost-benefit, agile-scrum-kanban, team-topology, change-management |
| ai (15) | ai-prompt-engineering, ai-rag-patterns, ai-llm-ops, ai-vector-databases, ai-ai-agents, ai-ai-evals, ai-model-training, ai-embeddings, ai-multimodal, ai-ai-safety, ai-ai-testing, ai-ai-cost-optimization, ai-langchain-patterns, ai-mcp-patterns, ai-ai-observability |
| security (15) | security-sast-dast, security-sbom, security-secrets-management, security-container-security, security-api-security, security-data-security, soc-operations, siem-engineering, soar-automation, threat-intelligence, edr-xdr, zero-trust, cspm, penetration-testing, iam-governance |
| data (36) | data-etl-pipeline, data-data-warehouse, data-streaming, data-bi-tools, data-data-quality, data-distributed-storage, data-distributed-compute, data-data-lake, data-data-lakehouse, data-batch-processing, data-workflow-orchestration, data-cdc-patterns, data-data-replication, data-data-platform, data-data-catalog, data-data-observability, data-data-contracts, data-data-mesh, data-data-versioning, data-data-api, data-data-virtualization, data-schema-registry, data-relational-database, data-nosql-database, data-graph-database, data-search-engine, data-clean-room, data-cost-optimization, data-formats, data-lineage, data-pipeline-cicd, data-testing, data-reverse-etl, data-data-strategy, data-dimensional-modeling |
| ml (16) | ml-experiment-tracking, ml-classical-ml, ml-deep-learning, ml-feature-engineering, ml-hyperparameter-tuning, ml-model-evaluation, ml-model-interpretability, ml-time-series, ml-nlp, ml-computer-vision, ml-recommender, ml-anomaly-detection, ml-ml-pipeline, ml-feature-store, ml-model-serving, ml-math-foundations |
| data-science (4) | statistical-analysis, experimentation, causal-inference, analytics-engineering |
| design (8) | design-design-systems, design-ux-research, design-accessibility, design-prototyping, visual-design, brand-identity, information-architecture, motion-design |
| quality (11) | quality-e2e-testing, quality-visual-testing, quality-load-testing, quality-contract-testing, unit-testing, integration-testing, property-based-testing, exploratory-testing, acceptance-testing, regression-testing, smoke-testing |
| ecommerce (2) | payment-processing, checkout-cart |
| api (2) | graphql-federation, product-management |
| enterprise (12) | compliance-audit, multi-tenant, integration-patterns, data-governance, sla-management, legacy-migration, identity-provider, cost-governance, togaf-zachman, itil-service-mgmt, vendor-management, architecture-governance |
| product (10) | analytics, ab-testing, user-research, growth-engineering, pricing-strategy, go-to-market, onboarding-flow, feature-prioritization, customer-journey, persona-development |
| blockchain (16) | blockchain-core, blockchain-cryptography, blockchain-ethereum, blockchain-bitcoin, blockchain-patterns, blockchain-application, blockchain-web3, blockchain-testing, blockchain-infrastructure, blockchain-security, blockchain-management, blockchain-solana, blockchain-defi, blockchain-cross-chain, blockchain-zk, blockchain-data-indexing |
