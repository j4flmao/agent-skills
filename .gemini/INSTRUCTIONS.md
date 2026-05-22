# .gemini/INSTRUCTIONS.md — j4flmao/skills

Gemini: 1M context. Can fit details. Still compress output.

## Compress (ALWAYS)
Strip: a/an/the | just/really/basically | sure/happy/glad | I think/might be | however/moreover | code explain (show code) | preamble/postamble
Pattern: `[thing] [action] [why]. [next].`
Full prose: security. destructive.

## Routing
No match → `skills/core/master-orchestrator/SKILL.md`. Detect stack first.

### All Skills (217)
```
core (4):       master-orchestrator, project-init, onboarding, context-compressor
planning (8):   create-brief, create-prd, create-adr, create-tech-spec, create-story,
                create-roadmap, create-pitch-deck, market-analysis
backend (38):   nestjs-a/p, nodejs-a/p, elysia-a/p, golang-a/p, rust-a/p
                python-fastapi, python-django, spring-boot-a, dotnet-a/p, rails
                php-pure, php-laravel, php-zend
                universal: oop, design-patterns, microservices, clean-architecture,
                api-design, api-response, database-patterns, auth-patterns,
                event-driven, testing, grpc-patterns, websocket-patterns,
                message-queue, caching, rate-limiting, load-testing, api-gateway,
                graphql-patterns, background-jobs, search-patterns, data-streaming,
                file-storage, feature-flags, internationalization, structured-logging
                plus: express, prisma, deno, bun, elixir, spring-boot-patterns
frontend (25):  react-a, react-nextjs, vue-a, vue-nuxt, angular-a/p, sveltekit,
                remix-a/p, astro-a, solidjs-a/p, qwik-a, svelte-a/p
                universal: patterns, state-management, accessibility,
                design-system, performance, testing, microfrontend,
                tailwind-css, storybook, pwa, seo, animation, form-handling,
                data-fetching, bundler-tools, image-optimization, theming
                plus: astro-patterns, qwik-patterns, vue-patterns, lit, web-components
mobile-stack (7): ios, android, flutter, react-native, kotlin-multiplatform,
                ionic-capacitor, dotnet-maui
mobile-universal (16): patterns, testing, performance, security, networking, storage, deployment,
                push-notifications, in-app-purchase, crash-reporting,
                deep-linking, offline-first, biometrics, map-location, camera-media, analytics
mobile-plus (1): ar-vr
dev-loop (12):  code-review, debugging-strategy, refactor-guide, git-workflow,
                security-auditor, performance-profiler, changelog-generator, readme-writer,
                pr-writer, dev-container, tech-debt-tracker, api-client-generator
devops (26):    docker-patterns, cicd-pipeline, kubernetes-patterns, observability,
                helm-patterns, terraform, ansible, jenkins, longhorn, monitoring,
                github-actions, gitops, vault, aws, serverless,
                monorepo, dependency-management, api-documentation,
                argo-cd, azure, gcp, chaos-engineering, service-mesh, finops, backup-dr, database-migration
devops-plus (2): nomad, incident-response
mgt (11):       pm, ba, qa, qc, team-rules, security, pentesting, alerting,
                okr-kpi, sprint-retro, risk-management
mgt-plus (3):   cost-benefit, hiring, stakeholder
ai (6):         ai-prompt-engineering, ai-rag-patterns, ai-llm-ops, ai-vector-databases, ai-ai-agents, ai-ai-evals
security (5):   security-sast-dast, security-sbom, security-secrets-management, security-container-security, security-api-security
data (5):       data-etl-pipeline, data-data-warehouse, data-streaming, data-bi-tools, data-data-quality
design (4):     design-design-systems, design-ux-research, design-accessibility, design-prototyping
quality (4):    quality-e2e-testing, quality-visual-testing, quality-load-testing, quality-contract-testing
enterprise (8): compliance-audit, multi-tenant, integration-patterns,
                data-governance, sla-management, legacy-migration,
                identity-provider, cost-governance
product (8):    analytics, ab-testing, user-research, growth-engineering,
                pricing-strategy, go-to-market,
                onboarding-flow, feature-prioritization
```
Note: `-a` = architecture, `-p` = patterns.
