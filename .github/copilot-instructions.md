# GitHub Copilot Instructions — j4flmao/skills

## Entry Point

No trigger keyword match → route to `skills/core/master-orchestrator/SKILL.md`

## Routing Rules

### Phase Order
planning → backend → frontend → mobile → desktop → dev-loop → devops → management → ai → ml → data → design → quality → security → enterprise → product

### Quick Keyword Map

| Keywords | Route |
|----------|-------|
| brief, prd, adr, tech-spec, story, roadmap, pitch-deck, market-analysis | `planning/` |
| nestjs, nodejs, elysia, go, rust, python, spring, dotnet, rails, php | `backend/{stack}/` |
| hono, fastify, express, oak, vapor, play, micronaut, quarkus, django, fastapi, flask, symfony | `backend/{stack}/` |
| oop, microservices, clean-arch, api-design, api-response, database, auth, testing | `backend/universal/` |
| react, nextjs, vue, nuxt, angular, sveltekit, remix, astro, solidjs, qwik | `frontend/{framework}/` |
| alpinejs, ember, htmx, preact, stencil, lit, web-components | `frontend/{framework}/` |
| state, a11y, design-system, performance, testing, microfrontend, tailwind, storybook, pwa, seo | `frontend/universal/` |
| animation, forms, data-fetching, bundler, images, theming, i18n, auth | `frontend/universal/` |
| ios, android, flutter, react-native, kotlin-multiplatform, ionic, dotnet-maui | `mobile/` |
| electron, tauri, qt, gtk, wpf, winui3, uwp, winforms, swiftui, appkit, gnome, kde | `desktop/` |
| docker, k8s, terraform, helm, ansible, jenkins, longhorn, monitoring | `devops/` |
| github-actions, gitops, vault, aws, serverless, monorepo | `devops/` |
| argo-cd, azure, gcp, chaos-engineering, service-mesh, finops | `devops/` |
| review, debug, refactor, git, security, performance, changelog, readme | `dev-loop/` |
| compliance, multi-tenant, integration, data-governance, sla, legacy, identity, cost-gov | `enterprise/` |
| analytics, ab-testing, user-research, growth, pricing, gtm, onboarding, prioritization | `product/` |
| prompt-engineering, rag, llmops, vector-db, ai-agent, ai-eval, model-training | `ai/` |
| embeddings, multimodal, ai-safety, ai-testing, ai-cost, langchain, mcp, ai-observability | `ai/` |
| sast, dast, sbom, secrets, container-security, api-security, data-security | `security/` |
| etl, warehouse, streaming, bi, data-quality, distributed-storage, data-lake, lakehouse | `data/` |
| batch-processing, workflow-orchestration, cdc, replication, data-platform, catalog | `data/` |
| observability, contracts, mesh, versioning, api, virtualization, schema-registry, db | `data/` |
| experiment-tracking, classical-ml, deep-learning, feature-engineering, hyperparameter | `ml/` |
| model-evaluation, interpretability, time-series, nlp, computer-vision, recommender | `ml/` |
| anomaly-detection, ml-pipeline, feature-store, model-serving | `ml/` |
| design-system, ux-research, accessibility, prototyping | `design/` |
| e2e, visual, load, contract-testing | `quality/` |

## Stack Detection

- `package.json`: @nestjs/core → nestjs, elysia → elysia, express/hono/fastify → nodejs
- `go.mod` → golang
- `Cargo.toml` → rust
- `Gemfile` → rails
- `requirements.txt` with fastapi → python-fastapi, with django → python-django
- `pyproject.toml` with django → python-django
- `pom.xml` / `build.gradle` → spring-boot
- `*.csproj` / `*.sln` → dotnet
- `Package.swift` / `*.xcworkspace` → ios / swiftui / appkit
- `pubspec.yaml` → flutter
- `package.json` with react-native → react-native
- `*.pro` / `CMakeLists.txt` with Qt → desktop-qt
- `package.json` with electron → desktop-electron
- `Cargo.toml` with tauri → desktop-tauri

## Response Format

Produce the artifact directly. No preamble, no postamble, no explanations.

## Compress Output

Strip: a/an/the, just/really/basically, sure/happy/glad/please, I think/I believe, as you know, however/moreover, code explanations (show code only), preamble/postamble.

## [MANDATORY] CORE ENGINEERING STANDARDS
1. **Commit Standards**: ALL commits must use Conventional Commits (eat:, ix:, chore:, etc.).
2. **Coding Guidelines**: 
   - NEVER leave // TODO or placeholders. Write the full implementation.
   - Fail Fast: Throw exceptions immediately, do not swallow errors.
   - Use Structured Logging with context.
3. **Testing Requirements (Zero-Prompt)**: 
   - ALWAYS write unit tests for new logic using the Arrange-Act-Assert (AAA) pattern.
   - Test edge cases (nulls, out-of-bounds), not just happy paths.
4. **RAG & Vector Search**:
   - ALWAYS implement Hybrid Search (Dense + BM25). Pure Dense search is forbidden.
   - ALWAYS use Semantic or Parent-Child Chunking. Naive character chunking is forbidden.
   - MUST implement a Cross-Encoder Re-ranking stage (Two-Stage Retrieval).
5. **Multi-Agent Architecture**:
   - Anti-God Agent: Max 5 tools per agent. Use orchestrators for complex tasks.
   - Principle of Least Privilege: e.g., Reviewers get ead_file, not write_file.
   - HITL (Human-in-the-loop): Destructive actions (SQL DROP, Deploy) MUST have a pause/checkpoint for human approval.

## [MANDATORY] ML & GPU STANDARDS
- Never load large models in FP32. Always use 	orch.float16 or 	orch.bfloat16 to prevent OOM.
- For production LLM APIs, never use 	ransformers.pipeline(). Must use LLM or TGI for PagedAttention and continuous batching.
- Never hardcode cuda:0. Use dynamic device selection.

## [MANDATORY] DISTRIBUTED SYSTEMS STANDARDS
- Assume the network will fail. ALL cross-service HTTP/gRPC calls MUST implement Retries with Exponential Backoff and explicitly defined Timeouts.
- All state-changing operations (POST/PUT/DELETE) MUST be strictly idempotent (e.g., use an Idempotency-Key) to prevent duplicate processing on network retries.

## [MANDATORY] CRYPTOGRAPHY & SECURITY STANDARDS
- NEVER use MD5 or SHA-1. Use SHA-256 or SHA-3.
- NEVER use RSA-1024. Use Ed25519 or RSA-2048/4096 (with OAEP/PSS padding).
- When implementing symmetric encryption for sensitive data, use AES-256-GCM (Quantum Resistant).
- NEVER use normal hashes for passwords. MUST use Argon2id or bcrypt.

## [MANDATORY] EBPF & LINUX KERNEL STANDARDS
- All eBPF C code MUST include strict pointer bounds-checking to pass the Linux Kernel Verifier.
- Use libbpf and CO-RE (Compile Once Run Everywhere) instead of legacy BCC python scripts.
- Use BPF Maps (like RINGBUF) for user-space to kernel-space communication.

## [MANDATORY] DATABASE DESIGN STANDARDS
- NEVER use random UUIDv4 as Primary Keys in relational databases (causes B-Tree fragmentation). Use UUIDv7, ULID, or sequential IDs.
- Rely on the DB for data integrity (Use UNIQUE, FOREIGN KEY, and CHECK constraints). Do not just rely on app-level validation.
- ALWAYS use batching (e.g. DataLoader) or JOINs to prevent N+1 query problems.

## [MANDATORY] ZERO-KNOWLEDGE (ZK) STANDARDS
- When writing ZK circuits (Circom/Halo2), ALL signals must be explicitly mathematically constrained. Do not just assign values.
- Never leak Private Witnesses into public outputs unless properly hashed.
- Explicitly constrain boolean signals (e.g.,  * (b - 1) === 0).
