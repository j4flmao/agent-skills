# Routing — 267 skills

## Entry
`skills/core/master-orchestrator/SKILL.md` (no trigger match → route here)

## Phase Order
planning → backend → frontend → mobile → dev-loop → devops → management

## Quick Map
| Phase | Skills |
|-------|--------|
| core | master-orchestrator, project-init, onboarding, context-compressor |
| planning | create-brief, create-prd, create-adr, create-tech-spec, create-story, create-roadmap, create-pitch-deck, market-analysis |
| backend-stack | nestjs, nodejs, elysia, golang, rust, python-fastapi, python-django, spring-boot, dotnet, rails, php-pure, php-laravel, php-zend |
| backend-universal | oop-principles, design-patterns, microservices, clean-architecture, api-design, api-response, database-patterns, auth-patterns, event-driven, testing, grpc-patterns, websocket-patterns, message-queue, caching, rate-limiting, load-testing, api-gateway, graphql-patterns, background-jobs, search-patterns, data-streaming, file-storage, feature-flags, internationalization, structured-logging |
| frontend-stack | react, react-nextjs, vue, vue-nuxt, angular, sveltekit, remix-architecture, remix-patterns, astro-architecture, solidjs-architecture, solidjs-patterns, qwik-architecture, svelte-architecture, svelte-patterns |
| frontend-universal | patterns, state-management, accessibility, design-system, performance, testing, microfrontend, tailwind-css, storybook, pwa, seo, animation, form-handling, data-fetching, bundler-tools, image-optimization, theming |
| mobile-stack | ios, android, flutter, react-native, kotlin-multiplatform, ionic-capacitor, dotnet-maui |
| mobile-universal | patterns, testing, performance, security, networking, storage, deployment, push-notifications, in-app-purchase, crash-reporting, deep-linking, offline-first, biometrics, map-location, camera-media, analytics |
| dev-loop | code-review, debugging-strategy, refactor-guide, git-workflow, security-auditor, performance-profiler, changelog-generator, readme-writer, pr-writer, dev-container, tech-debt-tracker, api-client-generator |
| devops | docker-patterns, cicd-pipeline, kubernetes-patterns, observability, helm-patterns, terraform, ansible, jenkins, longhorn, monitoring, github-actions, gitops, vault, aws, serverless, monorepo, dependency-management, api-documentation, argo-cd, azure, gcp, chaos-engineering, service-mesh, finops, backup-dr, database-migration, dataops, mlops, kubernetes-for-data, cloud-cost-optimization |
| management | pm, ba, qa, qc, team-rules, security, pentesting, alerting, okr-kpi, sprint-retro, risk-management |
| ai (15) | ai-prompt-engineering, ai-rag-patterns, ai-llm-ops, ai-vector-databases, ai-ai-agents, ai-ai-evals, ai-model-training, ai-embeddings, ai-multimodal, ai-ai-safety, ai-ai-testing, ai-ai-cost-optimization, ai-langchain-patterns, ai-mcp-patterns, ai-ai-observability |
| security (6) | security-sast-dast, security-sbom, security-secrets-management, security-container-security, security-api-security, security-data-security |
| data (26) | data-etl-pipeline, data-data-warehouse, data-streaming, data-bi-tools, data-data-quality, data-distributed-storage, data-distributed-compute, data-data-lake, data-data-lakehouse, data-batch-processing, data-workflow-orchestration, data-cdc-patterns, data-data-replication, data-data-platform, data-data-catalog, data-data-observability, data-data-contracts, data-data-mesh, data-data-versioning, data-data-api, data-data-virtualization, data-schema-registry, data-relational-database, data-nosql-database, data-graph-database, data-search-engine |
| ml (15) | ml-experiment-tracking, ml-classical-ml, ml-deep-learning, ml-feature-engineering, ml-hyperparameter-tuning, ml-model-evaluation, ml-model-interpretability, ml-time-series, ml-nlp, ml-computer-vision, ml-recommender, ml-anomaly-detection, ml-ml-pipeline, ml-feature-store, ml-model-serving |
| design (4) | design-design-systems, design-ux-research, design-accessibility, design-prototyping |
| quality (4) | quality-e2e-testing, quality-visual-testing, quality-load-testing, quality-contract-testing |
| enterprise (8) | compliance-audit, multi-tenant, integration-patterns, data-governance, sla-management, legacy-migration, identity-provider, cost-governance |
| product (8) | analytics, ab-testing, user-research, growth-engineering, pricing-strategy, go-to-market, onboarding-flow, feature-prioritization |

## Trigger Keywords
```
brief/prd/adr/story          → planning/
roadmap/pitch-deck/market     → planning/
nestjs/nodejs/elysia/go      → backend/{stack}/
rust/python/spring/dotnet    → backend/{stack}/
rails                        → backend/ruby/rails
php/laravel/eloquent/artisan → backend/php/{framework}
oop/solid/microservices      → backend/universal/
api-design/api-response      → backend/universal/
database/auth/event-driven   → backend/universal/
graphql/apollo/resolver      → backend/universal/graphql-patterns
background-jobs/queue/task   → backend/universal/background-jobs
search/elasticsearch/meilisearch → backend/universal/search-patterns
streaming/kafka/data-stream  → backend/universal/data-streaming
file-storage/s3/object-store → backend/universal/file-storage
feature-flag/toggle/canary   → backend/universal/feature-flags
i18n/internationalization    → backend/universal/internationalization
logging/structured-log/json  → backend/universal/structured-logging
react/next/vue/nuxt          → frontend/
angular/sveltekit            → frontend/
remix                        → frontend/remix-architecture
astro                        → frontend/astro-architecture
solidjs                      → frontend/solidjs-architecture
qwik                         → frontend/qwik-architecture
svelte-core/svelte-5/runes   → frontend/svelte-architecture
state/a11y/design-system     → frontend/universal/
performance/testing          → frontend/universal/
microfrontend                → frontend/universal/
tailwind-css                 → frontend/universal/tailwind-css
storybook                    → frontend/universal/storybook
pwa/service-worker           → frontend/universal/pwa
seo/meta/og                  → frontend/universal/seo
animation/motion/framer      → frontend/universal/animation
form/validation/react-hook-form → frontend/universal/form-handling
data-fetching/tanstack-query/swr → frontend/universal/data-fetching
bundler/vite/webpack         → frontend/universal/bundler-tools
image-optimization/responsive → frontend/universal/image-optimization
theming/dark-mode/tokens     → frontend/universal/theming
ios/swift                    → mobile/ios
android/kotlin               → mobile/android
flutter/dart                 → mobile/flutter
react-native/expo/rn         → mobile/react-native
kmp/kotlin-multiplatform     → mobile/kotlin-multiplatform
ionic/capacitor/hybrid       → mobile/ionic-capacitor
maui/dotnet-maui/xamarin     → mobile/dotnet-maui
mvvm/coordinator/clean       → mobile/universal/patterns
mobile-test/ui-test/e2e      → mobile/universal/testing
jank/memory/startup          → mobile/universal/performance
ssl-pinning/encrypt/auth     → mobile/universal/security
rest/graphql/offline/cache   → mobile/universal/networking
sqlite/room/core-data/hive   → mobile/universal/storage
mobile-deploy/testflight     → mobile/universal/deployment
apns/fcm/push                → mobile/universal/push-notifications
in-app-purchase/sub          → mobile/universal/in-app-purchase
sentry/crashlytics           → mobile/universal/crash-reporting
deep-linking/universal-link  → mobile/universal/deep-linking
offline-first/sync           → mobile/universal/offline-first
biometrics/face-id/fingerprint → mobile/universal/biometrics
maps/location/gps            → mobile/universal/map-location
camera/photo/video/media     → mobile/universal/camera-media
analytics/event-tracking/firebase → mobile/universal/analytics
review/debug/refactor        → dev-loop/
docker/k8s/terraform         → devops/
api-gateway/kong/nginx-gateway → backend/universal/api-gateway
grpc/protobuf                → backend/universal/grpc-patterns
websocket/socket-io          → backend/universal/websocket-patterns
kafka/rabbitmq/mq            → backend/universal/message-queue
redis/caching/cdn            → backend/universal/caching
rate-limit/throttle          → backend/universal/rate-limiting
load-test/k6/benchmark       → backend/universal/load-testing
github-actions               → devops/github-actions
gitops/argocd/flux           → devops/gitops
vault/secrets                → devops/vault
aws/ec2/s3                   → devops/aws
serverless/lambda            → devops/serverless
monorepo/nx/turborepo        → devops/monorepo
dependabot/renovate          → devops/dependency-management
swagger/openapi              → devops/api-documentation
argo-cd                      → devops/argo-cd
azure/aks                    → devops/azure
gcp/gke                      → devops/gcp
chaos-engineering/resilience → devops/chaos-engineering
service-mesh/istio/linkerd   → devops/service-mesh
finops/cloud-cost            → devops/finops
backup/dr/disaster-recovery  → devops/backup-dr
db-migration/flyway/liquibase → devops/database-migration
pr-writer/pull-request       → dev-loop/pr-writer
dev-container/devcontainer   → dev-loop/dev-container
tech-debt/technical-debt     → dev-loop/tech-debt-tracker
api-client/curl              → dev-loop/api-client-generator
pm/ba/qa/qc/security         → management/
okr/kpi/goals                → management/okr-kpi
sprint-retro/retrospective    → management/sprint-retro
risk-management/risk-register → management/risk-management
onboarding/new-dev           → core/onboarding
context-compression/token    → core/context-compressor
compliance/audit/SOC2/GDPR   → enterprise/compliance-audit
multi-tenant/saas-arch       → enterprise/multi-tenant
integration/esb              → enterprise/integration-patterns
data-governance/lineage      → enterprise/data-governance
sla/slo/error-budget         → enterprise/sla-management
legacy-migration/strangler   → enterprise/legacy-migration
identity-provider/sso/oidc   → enterprise/identity-provider
cost-governance/finops       → enterprise/cost-governance
product-analytics/funnel     → product/analytics
ab-test/split-test/experiment → product/ab-testing
user-research/persona        → product/user-research
growth-engineering/plg/activation → product/growth-engineering
pricing-strategy/monetization → product/pricing-strategy
go-to-market/gtm/product-launch → product/go-to-market
onboarding-flow/activation   → product/onboarding-flow
prioritization/rice/kano     → product/feature-prioritization
ai/llm/prompt-engineering    → ai/ai-prompt-engineering
rag/retrieval/chunking       → ai/ai-rag-patterns
llmops/model-serving/token   → ai/ai-llm-ops
vector-db/pinecone/chroma    → ai/ai-vector-databases
ai-agent/function-calling/langchain → ai/ai-ai-agents
ai-eval/ragas/hallucination  → ai/ai-ai-evals
sast/dast/static-analysis/semgrep → security/security-sast-dast
sbom/software-bill-of-materials → security/security-sbom
secrets/gitleaks/vault       → security/security-secrets-management
container-security/trivy/admission → security/security-container-security
api-security/owasp-api/rate-limit → security/security-api-security
etl/airflow/dbt/pipeline     → data/data-etl-pipeline
warehouse/snowflake/bigquery/redshift → data/data-data-warehouse
streaming/kafka/flink/real-time → data/data-streaming
bi/metabase/superset/looker  → data/data-bi-tools
data-quality/great-expectations/contract → data/data-data-quality
design-system/tokens/storybook/figma → design/design-design-systems
ux-research/persona/usability → design/design-ux-research
accessibility/wcag/a11y/aria  → design/design-accessibility
prototyping/micro-interaction → design/design-prototyping
e2e-testing/playwright/cypress → quality/quality-e2e-testing
visual-testing/percy/chromatic → quality/quality-visual-testing
load-test/k6/locust/performance-test → quality/quality-load-testing
contract-testing/pact/consumer-driven → quality/quality-contract-testing
express/expressjs/middleware  → backend/nodejs/express
prisma/orm/schema             → backend/prisma
deno/deno-deploy              → backend/deno
bun/bun-runtime               → backend/bun
elixir/phoenix/erlang         → backend/elixir
spring-boot-patterns/spring-beans → backend/spring-boot-patterns
astro-patterns/astro-islands  → frontend/astro-patterns
qwik-patterns/qwik-city       → frontend/qwik-patterns
vue-patterns/vue-composables  → frontend/vue-patterns
lit/lit-element/lit-html      → frontend/lit
web-components/custom-elements/shadow-dom → frontend/web-components
ar-vr/augmented-reality/vr   → mobile/ar-vr
nomad/hashi-nomad/orchestrator → devops/nomad
incident-response/on-call/pagerduty → devops/incident-response
cost-benefit/roi/tco          → management/cost-benefit
hiring/interview/recruitment  → management/hiring
stakeholder/communication/steerco → management/stakeholder
experiment-tracking/MLflow  → ml/ml-experiment-tracking
classical-ml/scikit-learn/sklearn  → ml/ml-classical-ml
deep-learning/PyTorch/tensorflow  → ml/ml-deep-learning
feature-engineering/feature-creation  → ml/ml-feature-engineering
hyperparameter-tuning/Optuna/grid-search  → ml/ml-hyperparameter-tuning
model-evaluation/confusion-matrix/roc  → ml/ml-model-evaluation
model-interpretability/SHAP/LIME  → ml/ml-model-interpretability
time-series/prophet/forecasting  → ml/ml-time-series
nlp/huggingface/transformers  → ml/ml-nlp
computer-vision/YOLO/object-detection  → ml/ml-computer-vision
recommender/collaborative-filtering  → ml/ml-recommender
anomaly-detection/outlier  → ml/ml-anomaly-detection
ml-pipeline/kubeflow  → ml/ml-ml-pipeline
feature-store/feast  → ml/ml-feature-store
model-serving/bentoml/triton  → ml/ml-model-serving
model-training/fine-tuning/LoRA  → ai/ai-model-training
embeddings/sentence-transformers  → ai/ai-embeddings
multimodal/CLIP/LLaVA  → ai/ai-multimodal
ai-safety/guardrails/content-moderation  → ai/ai-ai-safety
ai-testing/eval-harness  → ai/ai-ai-testing
ai-cost-optimization/token-efficiency  → ai/ai-ai-cost-optimization
langchain/llamaindex  → ai/ai-langchain-patterns
mcp/model-context-protocol  → ai/ai-mcp-patterns
ai-observability/langsmith/wandb  → ai/ai-ai-observability
dataops/data-operations  → devops/dataops
mlops/ml-operations  → devops/mlops
kubernetes-for-data/k8s-data  → devops/kubernetes-for-data
cloud-cost-optimization/cloud-spend  → devops/cloud-cost-optimization
data-security/data-protection/encryption-at-rest  → security/security-data-security
distributed-storage/hdfs  → data/data-distributed-storage
distributed-compute/spark/dask  → data/data-distributed-compute
data-lake/delta-lake  → data/data-data-lake
lakehouse/medallion  → data/data-data-lakehouse
batch-processing/hive  → data/data-batch-processing
workflow-orchestration/airflow/prefect  → data/data-workflow-orchestration
cdc/debezium/change-data-capture  → data/data-cdc-patterns
data-replication/tungsten  → data/data-data-replication
data-platform/data-engineering-platform  → data/data-data-platform
data-catalog/datahub/amundsen  → data/data-data-catalog
data-observability/monte-carlo/sifflet  → data/data-data-observability
data-contracts/contract-driven  → data/data-data-contracts
data-mesh/data-product  → data/data-data-mesh
data-versioning/dvc/data-version  → data/data-data-versioning
data-api/hasura/data-access  → data/data-data-api
data-virtualization/trino/presto  → data/data-data-virtualization
schema-registry/avro/protobuf  → data/data-schema-registry
relational-database/postgresql/mysql  → data/data-relational-database
nosql/mongodb/cassandra/dynamodb  → data/data-nosql-database
graph-database/neo4j/neo4j-cypher  → data/data-graph-database
search-engine/elasticsearch/solr  → data/data-search-engine
```

## Stack Detection
- `package.json`: nestjs/nodejs/elysia/react/vue/sveltekit
- `go.mod`: golang
- `Cargo.toml`: rust
- `Gemfile`: rails
- `requirements.txt/pyproject.toml`: python
- `pom.xml/build.gradle`: spring-boot
- `*.csproj/*.sln`: dotnet
- `pubspec.yaml`: flutter
- `package.json` with `react-native`: react-native

## Mobile phase
planning → backend → frontend → mobile → dev-loop → devops → management
