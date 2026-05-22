# Routing — 160 skills

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
| devops | docker-patterns, cicd-pipeline, kubernetes-patterns, observability, helm-patterns, terraform, ansible, jenkins, longhorn, monitoring, github-actions, gitops, vault, aws, serverless, monorepo, dependency-management, api-documentation, argo-cd, azure, gcp, chaos-engineering, service-mesh, finops, backup-dr, database-migration |
| management | pm, ba, qa, qc, team-rules, security, pentesting, alerting, okr-kpi, sprint-retro, risk-management |

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
