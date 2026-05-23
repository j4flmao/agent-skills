# Routing Decision Tree

## Top-Level Decision Flow

```
User Request
    │
    ▼
Check project state ─────────────────────────────────────────────┐
    │                                                             │
    ├── No docs exist, no README → create-brief                   │
    ├── Brief exists, no PRD → create-prd                         │
    ├── PRD exists, no ADRs/specs → create-adr + create-tech-spec │
    ├── Architecture exists → detect stack                        │
    └── Already has code → route by intent                        │
                                                                  │
    ┌─────────────────────────────────────────────────────────────┘
    │
    ▼
Detect intent from user request ─────────────────────────────────┐
    │                                                             │
    ├── "build", "implement", "create feature"                    │
    │   → route to stack+feature skill                            │
    │                                                             │
    ├── "bug", "error", "broken", stack trace                     │
    │   → debugging-strategy                                      │
    │                                                             │
    ├── "review", "PR", "code review", "look at this"             │
    │   → code-review                                             │
    │                                                             │
    ├── "deploy", "CI/CD", "release", "ship"                      │
    │   → cicd-pipeline or docker-patterns                        │
    │                                                             │
    ├── "init", "scaffold", "new project"                         │
    │   → project-init                                            │
    │                                                             │
    ├── "onboarding", "new dev", "setup"                          │
    │   → core-onboarding                                         │
    │                                                             │
    ├── "test", "e2e", "integration test"                         │
    │   → quality-e2e-testing or backend-testing                  │
    │                                                             │
    ├── "load test", "k6", "locust", "performance"                │
    │   → quality-load-testing                                    │
    │                                                             │
    ├── "design", "component", "Storybook", "FIGMA"               │
    │   → design-design-systems                                   │
    │                                                             │
    ├── "accessibility", "a11y", "WCAG"                           │
    │   → design-accessibility                                    │
    │                                                             │
    ├── Project management, sprint, estimation                    │
    │   → pm                                                      │
    │                                                             │
    ├── Requirements, stories, acceptance criteria                │
    │   → ba                                                      │
    │                                                             │
    ├── Architecture discussion, tech decision                    │
    │   → create-adr + detect stack for implementation            │
    │                                                             │
    └── Unknown → ask user: "What would you like to do?"          │
                                                                  │
    ┌─────────────────────────────────────────────────────────────┘
    │
    ▼
Route to skill with context payload
```

## Stack Detection Subtree

```
Detect Stack
    │
    ├── package.json exists
    │   ├── @nestjs/core → nestjs
    │   ├── elysia → elysia
    │   ├── @sveltejs/kit → sveltekit
    │   ├── next → react-nextjs
    │   ├── react → react
    │   ├── vue → vue
    │   ├── nuxt → vue-nuxt
    │   ├── express/fastify/hono (no nest/elysia) → nodejs
    │   └── none of above → nodejs (generic)
    │
    ├── go.mod → golang
    ├── Cargo.toml → rust
    ├── Gemfile → rails
    ├── pyproject.toml
    │   ├── django → python-django
    │   └── fastapi → python-fastapi
    │
    ├── requirements.txt
    │   ├── django → python-django
    │   └── fastapi → python-fastapi
    │
    ├── pom.xml / build.gradle → spring-boot
    ├── *.csproj / *.sln → dotnet
    ├── angular.json → angular
    ├── pubspec.yaml → flutter
    ├── Package.swift → ios
    └── No detection → ask user
```

## Domain Detection Subtree

```
Analyze Domain Keywords
    │
    ├── Backend keywords: API, database, endpoint, server, route
    │   └── Sub-detection:
    │       ├── API design → backend-api-design
    │       ├── Database → backend-database-patterns
    │       ├── Auth → backend-auth-patterns
    │       ├── Caching → caching
    │       ├── Events/Kafka → backend-event-driven
    │       ├── GraphQL → backend-graphql-patterns
    │       ├── gRPC → grpc-patterns
    │       └── General backend → {stack}-architecture
    │
    ├── Frontend keywords: UI, component, page, hook, style
    │   └── Sub-detection:
    │       ├── State management → frontend-state-management
    │       ├── Testing → frontend-testing
    │       ├── Performance → frontend-performance
    │       ├── Animation → frontend-animation
    │       ├── Forms → frontend-form-handling
    │       ├── Data fetching → frontend-data-fetching
    │       ├── Design system → frontend-design-system
    │       └── General frontend → {framework}-architecture
    │
    ├── DevOps keywords: deploy, CI, CD, pipeline, Docker, K8s
    │   └── Sub-detection:
    │       ├── Docker → docker-patterns
    │       ├── Kubernetes → kubernetes-patterns
    │       ├── CI/CD → cicd-pipeline
    │       ├── Terraform → terraform
    │       ├── Helm → helm-patterns
    │       └── General DevOps → {specific tool}
    │
    ├── Mobile keywords: iOS, Android, Flutter, React Native
    │   └── Sub-detection:
    │       ├── iOS → ios
    │       ├── Android → android
    │       ├── Flutter → flutter
    │       ├── React Native → react-native
    │       └── General mobile → mobile-patterns
    │
    ├── Data keywords: ETL, pipeline, warehouse, streaming
    │   └── Sub-detection:
    │       ├── ETL → data-etl-pipeline
    │       ├── Warehouse → data-data-warehouse
    │       ├── Streaming → data-streaming
    │       ├── Quality → data-data-quality
    │       └── General data → {specific tool}
    │
    ├── AI/ML keywords: model, training, LLM, vector, RAG
    │   └── Sub-detection:
    │       ├── LLM → ai-prompt-engineering
    │       ├── RAG → ai-rag-patterns
    │       ├── Training → ai-model-training
    │       ├── Classic ML → ml-classical-ml
    │       └── General AI → {specific domain}
    │
    ├── Security keywords: vuln, CVE, pentest, threat, auth
    │   └── Sub-detection:
    │       ├── Pentest → pentesting
    │       ├── SAST/DAST → security-sast-dast
    │       ├── Secrets → security-secrets-management
    │       └── General security → security
    │
    ├── Quality keywords: E2E, visual regression, contract test
    │   └── Sub-detection:
    │       ├── E2E → quality-e2e-testing
    │       ├── Visual → quality-visual-testing
    │       ├── Load → quality-load-testing
    │       └── Contract → quality-contract-testing
    │
    └── Management keywords: PM, retro, OKR, risk, stakeholder
        └── Sub-detection:
            ├── PM → pm
            ├── Retro → management-sprint-retro
            ├── OKR → management-okr-kpi
            ├── Risk → management-risk-management
            ├── Stakeholder → stakeholder
            └── Hiring → hiring
```

## Routing Priority Rules

### Phase Priority (earlier phase wins)
```
Phase 0: Scaffolding, config → project-init, create-brief
Phase 1: Planning → create-prd, create-story
Phase 2: Architecture → create-adr, create-tech-spec
Phase 3: Implementation → stack-architecture, specific patterns
Phase 4: Testing → quality-*, backend-testing, frontend-testing
Phase 5: Deployment → cicd-pipeline, docker-patterns
Phase 6: Operations → monitoring, alerting, observability
Phase 7: Maintenance → refactor-guide, performance-profiler
```

### Specificity Priority (most specific match wins)
```
1. Exact keyword match → "NestJS guards" → nestjs-patterns
2. Domain + stack match → "API design in Go" → backend-api-design + golang context
3. Domain match only → "database design" → backend-database-patterns
4. Stack match only → "help with Node.js" → nodejs-architecture
5. General match → "help me build something" → ask clarifying question
```

### Context Priority (carried state matters)
```
- If previous session used a skill, prefer adjacent skills in the same phase
- If project files exist in a language, prefer that language's skills
- If ADRs exist, prefer implementation skills over planning skills
- If test files exist, prefer quality skills
```

## Disambiguation Rules

When multiple skills match, apply in order:

1. **Phase check**: Is the project in a phase that makes this skill relevant? Don't route to testing if no code exists.
2. **Specificity check**: Which skill matches the most specific keywords?
3. **Last-used check**: Did we just use a related skill? Continue the flow.
4. **Ask**: If still ambiguous, ask the user: "I can help with {option A} or {option B}. Which would you prefer?"
