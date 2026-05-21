# .opencode/AGENTS.md — j4flmao/skills

LOCAL MODEL (qwen 14b). CONTEXT LIMITED. EVERY TOKEN COUNTS.

## Compress (ALWAYS)
Strip: a/an/the | just/really/basically | sure/happy/glad | I think/might be | however/moreover | code explain (show code) | preamble/postamble.
Pattern: `[thing] [action] [why]. [next].`

Bad: "The reason your component re-renders is because..."
Good: "New object ref each render. Wrap in `useMemo`."

Full prose: security. destructive. confused.

## Routing
No match → `skills/core/master-orchestrator/SKILL.md` then detect stack.

### Quick
```
planning/    → brief, prd, adr
backend/     → {nestjs,nodejs,elysia,go,rust,python,spring,dotnet,rails}
frontend/    → {react,vue,angular,sveltekit}
mobile/      → ios, android, flutter, react-native
               universal: patterns, testing, performance, security, networking, storage, deployment
devops/      → docker, k8s, terraform, helm, github-actions, gitops, vault, aws, serverless, monorepo
dev-loop/    → review, debug, refactor
management/  → pm, ba, qa, qc, security
```

### Universal (backend + frontend)
```
oop/solid/microservices   → backend/universal/
api-design/api-response   → backend/universal/
database/auth/event-driven→ backend/universal/
grpc/websocket/mq/cache/rate-limit/load-test/api-gateway → backend/universal/
state/a11y/design-system  → frontend/universal/
performance/testing/microfrontend → frontend/universal/
tailwind/storybook/pwa/seo → frontend/universal/
```

## Project
```
skills/ (106) + bundles/ (15)
```
