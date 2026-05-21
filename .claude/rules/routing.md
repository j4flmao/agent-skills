# Routing — 106 skills

## Entry
`skills/core/master-orchestrator/SKILL.md` (no trigger match → route here)

## Phase Order
planning → backend → frontend → mobile → dev-loop → devops → management

## Quick Map
| Phase | Skills |
|-------|--------|
| core | master-orchestrator, project-init |
| planning | create-brief, create-prd, create-adr, create-tech-spec, create-story |
| backend-stack | nestjs, nodejs, elysia, golang, rust, python-fastapi, python-django, spring-boot, dotnet, rails |
| backend-universal | oop-principles, design-patterns, microservices, clean-architecture, api-design, api-response, database-patterns, auth-patterns, event-driven, testing, grpc-patterns, websocket-patterns, message-queue, caching, rate-limiting, load-testing, api-gateway |
| frontend-stack | react, react-nextjs, vue, vue-nuxt, angular, sveltekit |
| frontend-universal | patterns, state-management, accessibility, design-system, performance, testing, microfrontend |
| mobile-stack | ios, android, flutter, react-native |
| mobile-universal | patterns, testing, performance, security, networking, storage, deployment |
| dev-loop | code-review, debugging-strategy, refactor-guide, git-workflow, security-auditor, performance-profiler, changelog-generator, readme-writer |
| devops | docker-patterns, cicd-pipeline, kubernetes-patterns, observability, helm-patterns, terraform, ansible, jenkins, longhorn, monitoring |
| management | pm, ba, qa, qc, team-rules, security, pentesting, alerting |

## Trigger Keywords
```
brief/prd/adr/story       → planning/
nestjs/nodejs/elysia/go   → backend/{stack}/
rust/python/spring/dotnet → backend/{stack}/
rails                     → backend/ruby/rails
oop/solid/microservices   → backend/universal/
api-design/api-response   → backend/universal/
database/auth/event-driven→ backend/universal/
react/next/vue/nuxt       → frontend/
angular/sveltekit         → frontend/
state/a11y/design-system  → frontend/universal/
performance/testing       → frontend/universal/
microfrontend             → frontend/universal/
tailwind-css              → frontend/universal/tailwind-css
storybook                 → frontend/universal/storybook
pwa/service-worker        → frontend/universal/pwa
seo/meta/og               → frontend/universal/seo
ios/swift                 → mobile/ios
android/kotlin            → mobile/android
flutter/dart              → mobile/flutter
react-native/expo/rn      → mobile/react-native
mvvm/coordinator/clean    → mobile/universal/patterns
mobile-test/ui-test/e2e   → mobile/universal/testing
jank/memory/startup       → mobile/universal/performance
ssl-pinning/encrypt/auth   → mobile/universal/security
rest/graphql/offline/cache → mobile/universal/networking
sqlite/room/core-data/hive → mobile/universal/storage
mobile-deploy/testflight  → mobile/universal/deployment
apns/fcm/push             → mobile/universal/push-notifications
in-app-purchase/sub       → mobile/universal/in-app-purchase
sentry/crashlytics        → mobile/universal/crash-reporting
review/debug/refactor     → dev-loop/
docker/k8s/terraform      → devops/
api-gateway/kong/nginx-gateway → backend/universal/api-gateway
grpc/protobuf             → backend/universal/grpc-patterns
websocket/socket-io       → backend/universal/websocket-patterns
kafka/rabbitmq/mq         → backend/universal/message-queue
redis/caching/cdn         → backend/universal/caching
rate-limit/throttle       → backend/universal/rate-limiting
load-test/k6/benchmark    → backend/universal/load-testing
github-actions            → devops/github-actions
gitops/argocd/flux        → devops/gitops
vault/secrets             → devops/vault
aws/ec2/s3                → devops/aws
serverless/lambda         → devops/serverless
monorepo/nx/turborepo     → devops/monorepo
dependabot/renovate       → devops/dependency-management
swagger/openapi           → devops/api-documentation
pm/ba/qa/qc/security      → management/
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
