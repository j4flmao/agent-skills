# Routing -- 76 skills

## Entry

`skills/core/master-orchestrator/SKILL.md` (no trigger match -> route here)

## Trigger keywords

```
brief/prd/adr/story       -> planning/
nestjs/nodejs/elysia/go   -> backend/{stack}/
rust/python/spring/dotnet -> backend/{stack}/
rails                     -> backend/ruby/rails
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
pm/ba/qa/qc/security      -> management/
```

## Phase order

planning -> backend -> frontend -> mobile -> dev-loop -> devops -> management

## Full skill table

| Phase | Skills |
|-------|--------|
| core (2) | master-orchestrator, project-init |
| planning (5) | create-brief, create-prd, create-adr, create-tech-spec, create-story |
| backend-stack (10) | nestjs, nodejs, elysia, golang, rust, python-fastapi, python-django, spring-boot, dotnet, rails |
| backend-universal (10) | oop-principles, design-patterns, microservices, clean-architecture, api-design, api-response, database-patterns, auth-patterns, event-driven, testing |
| frontend-stack (6) | react, react-nextjs, vue, vue-nuxt, angular, sveltekit |
| frontend-universal (7) | patterns, state-management, accessibility, design-system, performance, testing, microfrontend |
| mobile (3) | ios, android, mobile-deployment |
| dev-loop (8) | code-review, debugging-strategy, refactor-guide, git-workflow, security-auditor, performance-profiler, changelog-generator, readme-writer |
| devops (10) | docker-patterns, cicd-pipeline, kubernetes-patterns, observability, helm-patterns, terraform, ansible, jenkins, longhorn, monitoring |
| management (8) | pm, ba, qa, qc, team-rules, security, pentesting, alerting |
