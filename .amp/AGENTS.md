# j4flmao/agent-skills — Amp guidance

76 skills across 8 phases. Each `skills/<area>/<name>/SKILL.md` defines trigger keywords, rules, and response format.

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
- `skills/mobile/` — ios, android, mobile-deployment
- `skills/dev-loop/` — code-review, debugging, refactor, git-workflow, security-audit, performance-profile, changelog, readme
- `skills/devops/` — docker, cicd, kubernetes, observability, helm, terraform, ansible, jenkins, longhorn, monitoring
- `skills/management/` — pm, ba, qa, qc, team-rules, security, pentesting, alerting

## Phases

planning → backend → frontend → mobile → dev-loop → devops → management

## Bundles

See @bundles/bundle-definitions.json for 13 skill bundles.

## Agent configs

- `.claude/` — Claude Code (CLAUDE.md + rules/ + skills/ + hooks/)
- `.opencode/` — OpenCode (AGENTS.md + commands/)
- `.amp/` — Amp (this file + agent-skills.md + subagents.md)
- `.github/` — Copilot (copilot-instructions.md)
- `.gemini/` — Gemini (INSTRUCTIONS.md)
- `.cursor/` — Cursor (rules/)
- `.codex/` — Codex CLI (AGENTS.md + rules/ + hooks/ + skills/)
