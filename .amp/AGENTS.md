# j4flmao/agent-skills — Amp guidance

105 skills across 8 phases. Each `skills/<area>/<name>/SKILL.md` defines trigger keywords, rules, and response format.

## Use

- Match request to skill trigger keywords
- No match → master-orchestrator routes via `skills/core/master-orchestrator/SKILL.md`
- Detect stack: package.json (js/ts), go.mod (go), Cargo.toml (rust), Gemfile (ruby), requirements.txt/pyproject.toml (python), pom.xml/build.gradle (java), *.csproj/*.sln (dotnet)
- Compression: no filler, no preamble/postamble, strip a/an/the. Why use many token when few do trick.

## Skills

- `skills/core/` — master-orchestrator, project-init
- `skills/planning/` — brief, prd, adr, tech-spec, story
- `skills/backend/` — nestjs, nodejs, elysia, golang, rust, python-fastapi, python-django, spring-boot, dotnet, rails, oop-principles, design-patterns, microservices, clean-architecture, api-design, api-response, database-patterns, auth-patterns, event-driven, testing
- `skills/frontend/` — react, nextjs, vue, nuxt, angular, sveltekit, patterns, state-management, accessibility, design-system, performance, testing, microfrontend
- `skills/mobile/` — ios, android, flutter, react-native, patterns, testing, performance, security, networking, storage, deployment
- `skills/dev-loop/` — code-review, debugging, refactor, git-workflow, security-audit, performance-profile, changelog, readme
- `skills/devops/` — docker, cicd, kubernetes, observability, helm, terraform, ansible, jenkins, longhorn, monitoring
- `skills/management/` — pm, ba, qa, qc, team-rules, security, pentesting, alerting

## Phases

planning → backend → frontend → mobile → dev-loop → devops → management

## Bundles

See @bundles/bundle-definitions.json for 15 skill bundles.

## Agent configs

- `.claude/` — Claude Code (CLAUDE.md + rules/ + skills/ + hooks/)
- `.opencode/` — OpenCode (AGENTS.md + commands/)
- `.amp/` — Amp (this file + agent-skills.md + subagents.md)
- `.github/` — Copilot (copilot-instructions.md)
- `.gemini/` — Gemini (INSTRUCTIONS.md)
- `.cursor/` — Cursor (rules/)
- `.codex/` — Codex CLI (AGENTS.md + rules/ + hooks/ + skills/)

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
