# .gemini/INSTRUCTIONS.md — j4flmao/skills

Gemini: 1M context. Can fit details. Still compress output.

## Compress (ALWAYS)
Strip: a/an/the | just/really/basically | sure/happy/glad | I think/might be | however/moreover | code explain (show code) | preamble/postamble
Pattern: `[thing] [action] [why]. [next].`
Full prose: security. destructive.

## Routing
No match → `skills/core/master-orchestrator/SKILL.md`. Detect stack first.

### All Skills (105)
```
core (2):       master-orchestrator, project-init
planning (5):   create-brief, create-prd, create-adr, create-tech-spec, create-story
backend (26):   nestjs-a/p, nodejs-a/p, elysia-a/p, golang-a/p, rust-a/p
                python-fastapi, python-django, spring-boot-a, dotnet-a/p, rails
                universal: oop, design-patterns, microservices, clean-architecture,
                api-design, api-response, database-patterns, auth-patterns,
                event-driven, testing, grpc-patterns, websocket-patterns,
                message-queue, caching, rate-limiting, load-testing
frontend (17):  react-a, react-nextjs, vue-a, vue-nuxt, angular-a/p, sveltekit
                universal: patterns, state-management, accessibility,
                design-system, performance, testing, microfrontend,
                tailwind-css, storybook, pwa, seo
mobile-stack (4): ios, android, flutter, react-native
mobile-universal (10): patterns, testing, performance, security, networking, storage, deployment,
                push-notifications, in-app-purchase, crash-reporting
dev-loop (8):   code-review, debugging-strategy, refactor-guide, git-workflow,
                security-auditor, performance-profiler, changelog-generator, readme-writer
devops (18):    docker-patterns, cicd-pipeline, kubernetes-patterns, observability,
                helm-patterns, terraform, ansible, jenkins, longhorn, monitoring,
                github-actions, gitops, vault, aws, serverless,
                monorepo, dependency-management, api-documentation
mgt (8):        pm, ba, qa, qc, team-rules, security, pentesting, alerting
```
Note: `-a` = architecture, `-p` = patterns.
