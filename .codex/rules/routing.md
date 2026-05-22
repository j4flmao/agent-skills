# Routing -- 109 skills

## Entry

`skills/core/master-orchestrator/SKILL.md` (no trigger match -> route here)

## Trigger keywords

```
brief/prd/adr/story       -> planning/
nestjs/nodejs/elysia/go   -> backend/{stack}/
rust/python/spring/dotnet -> backend/{stack}/
rails                     -> backend/ruby/rails
php/laravel/eloquent/artisan -> backend/php/{framework}
oop/solid/microservices   -> backend/universal/
api-design/api-response   -> backend/universal/
database/auth/event-driven-> backend/universal/
react/next/vue/nuxt       -> frontend/
angular/sveltekit         -> frontend/
state/a11y/design-system  -> frontend/universal/
performance/testing       -> frontend/universal/
microfrontend             -> frontend/universal/
ios/swift                 -> mobile/ios
android/kotlin            -> mobile/android
mobile-deploy/testflight  -> mobile/universal/deployment
review/debug/refactor     -> dev-loop/
docker/k8s/terraform      -> devops/
grpc/protobuf/streaming   -> backend/universal/grpc-patterns
websocket/socket-io/realtime -> backend/universal/websocket-patterns
kafka/rabbitmq/message-queue -> backend/universal/message-queue
redis/caching/cdn         -> backend/universal/caching
api-gateway/kong/nginx-gateway/bff -> backend/universal/api-gateway
rate-limit/throttle       -> backend/universal/rate-limiting
load-test/k6/benchmark    -> backend/universal/load-testing
tailwind/utility-css      -> frontend/universal/tailwind-css
storybook                 -> frontend/universal/storybook
pwa/service-worker/offline -> frontend/universal/pwa
seo/meta/og/structured-data -> frontend/universal/seo
github-actions/ci         -> devops/github-actions
gitops/argocd/flux        -> devops/gitops
vault/secrets             -> devops/vault
aws/ec2/s3/lambda         -> devops/aws
serverless/lambda/cloud-functions -> devops/serverless
monorepo/nx/turborepo     -> devops/monorepo
dependabot/renovate       -> devops/dependency-management
swagger/openapi           -> devops/api-documentation
apns/fcm/push-notification -> mobile/universal/push-notifications
in-app-purchase/subscription -> mobile/universal/in-app-purchase
sentry/crashlytics        -> mobile/universal/crash-reporting
pm/ba/qa/qc/security      -> management/
```

## Phase order

planning -> backend -> frontend -> mobile -> dev-loop -> devops -> management

## Full skill table

| Phase | Skills |
|-------|--------|
| core (2) | master-orchestrator, project-init |
| planning (5) | create-brief, create-prd, create-adr, create-tech-spec, create-story |
| backend-stack (13) | nestjs, nodejs, elysia, golang, rust, python-fastapi, python-django, spring-boot, dotnet, rails, php-pure, php-laravel, php-zend |
| backend-universal (17) | oop-principles, design-patterns, microservices, clean-architecture, api-design, api-response, database-patterns, auth-patterns, event-driven, testing, grpc-patterns, websocket-patterns, message-queue, caching, rate-limiting, load-testing, api-gateway |
| frontend-stack (6) | react, react-nextjs, vue, vue-nuxt, angular, sveltekit |
| frontend-universal (11) | patterns, state-management, accessibility, design-system, performance, testing, microfrontend, tailwind-css, storybook, pwa, seo |
| mobile-stack (4) | ios, android, flutter, react-native |
| mobile-universal (10) | patterns, testing, performance, security, networking, storage, deployment, push-notifications, in-app-purchase, crash-reporting |
| dev-loop (8) | code-review, debugging-strategy, refactor-guide, git-workflow, security-auditor, performance-profiler, changelog-generator, readme-writer |
| devops (18) | docker-patterns, cicd-pipeline, kubernetes-patterns, observability, helm-patterns, terraform, ansible, jenkins, longhorn, monitoring, github-actions, gitops, vault, aws, serverless, monorepo, dependency-management, api-documentation |
| management (8) | pm, ba, qa, qc, team-rules, security, pentesting, alerting |
