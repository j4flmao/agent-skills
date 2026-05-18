# .github/copilot-instructions.md — j4flmao/skills

Copilot: instruction file loaded into system prompt. Keep lean.

## Compress (ALWAYS)
Strip: a/an/the | just/really/simply | sure/happy/glad | I think/might be | however/moreover | code explain (show code) | preamble/postamble
Pattern: `[thing] [action] [why]. [next].`
Full prose: security warnings only.

## Routing
No match → `skills/core/master-orchestrator/SKILL.md`. Detect stack first.
Phase order: planning → backend → frontend → mobile → dev-loop → devops → management.

## Keywords
planning/ → brief, prd, adr, story
backend/  → nestjs, nodejs, elysia, go, rust, python, spring, dotnet, rails + universal (oop/api/db/auth/testing)
frontend/ → react, vue, angular, sveltekit + universal (state/a11y/performance/testing/microfrontend)
mobile/   → ios, android, flutter, react-native + universal (patterns/testing/performance/security/networking/storage/deployment)
devops/   → docker, k8s, terraform, helm, ansible, monitoring
dev-loop/ → review, debug, refactor, git, changelog
management/ → pm, ba, qa, qc, security, pentesting, alerting
