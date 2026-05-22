# @j4flmao/agent-skills

176 agent skills for software development — planning, backend, frontend, mobile, devops, management, enterprise, product. Each skill is a `SKILL.md` defining triggers, rules, and response format.

## Installation

### Option 1: Use in the repo directly (no install needed)

Agent config files are already in this repo. Open this project in your agent and it works immediately:

```bash
git clone https://github.com/j4flmao/agent-skills
cd agent-skills
# Open your agent here — configs are ready
```

| Agent | Auto-loaded files |
|-------|-------------------|
| Claude Code | `.claude/CLAUDE.md` + `.claude/rules/` + `.claude/skills/` + `.claude/hooks/` + `.claude/settings.json` |
| OpenCode | `.opencode/AGENTS.md` + `.opencode/commands/*.md` |
| Amp | `.amp/AGENTS.md` + `.amp/agent-skills.md` + `.amp/subagents.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Gemini | `.gemini/INSTRUCTIONS.md` |
| Cursor | `.cursor/rules/agent-skills.mdc` + `.cursor/rules/compression.mdc` |
| Codex CLI | `.codex/AGENTS.md` + `.codex/rules/` + `.codex/hooks/` + `.codex/skills/` |
| Windsurf | `.windsurf/rules/*.md` |

### Option 2: Copy skills into another project

Clone once, then copy the agent config folder into any project:

```bash
# Clone skills repo somewhere on your machine
git clone https://github.com/j4flmao/agent-skills ~/skills

# Copy the config for your agent into your project
cp -r ~/skills/.claude /path/to/your/project/     # Claude Code
cp -r ~/skills/.opencode /path/to/your/project/   # OpenCode
cp -r ~/skills/.cursor /path/to/your/project/     # Cursor
cp -r ~/skills/.amp /path/to/your/project/        # Amp
cp -r ~/skills/.codex /path/to/your/project/      # Codex CLI
cp -r ~/skills/.windsurf /path/to/your/project/    # Windsurf
```

Or cherry-pick individual skills:

```bash
# Copy only the skills you need
cp -r ~/skills/skills/backend/dotnet /path/to/project/skills/
cp -r ~/skills/skills/devops/docker-patterns /path/to/project/skills/
```

### Option 3: npx skills add (after pushing to GitHub)

```bash
# Requires the repo to be pushed to GitHub
npx skills add j4flmao/agent-skills            # all 176 skills
npx skills add j4flmao/agent-skills --bundle backend-only
npx skills add j4flmao/agent-skills -g          # global (every project)
```

## Bundles

```bash
npx skills add j4flmao/agent-skills --bundle <name>
```

| Bundle | Skills | Description |
|--------|--------|-------------|
| `fullstack-nestjs-react` | 88 | NestJS + React |
| `fullstack-golang-vue` | 88 | Go + Vue |
| `fullstack-rust-angular` | 88 | Rust + Angular |
| `fullstack-dotnet-react` | 88 | .NET + React |
| `fullstack-nodejs-react` | 88 | Node.js + React |
| `fullstack-elysia-react` | 88 | ElysiaJS + React |
| `fullstack-rails-svelte` | 86 | Rails + SvelteKit |
| `backend-only` | 90 | Backend only |
| `frontend-only` | 52 | Frontend only |
| `devops-only` | 31 | DevOps only |
| `management-only` | 11 | Management only |
| `mobile-ios` | 54 | iOS + universal mobile skills + deployment |
| `mobile-android` | 54 | Android + universal mobile skills + deployment |
| `mobile-flutter` | 61 | Flutter + universal mobile skills + deployment |
| `mobile-react-native` | 61 | React Native + universal mobile skills + deployment |

## How Skills Work

1. User makes a request
2. Agent matches trigger keywords in `skills/**/SKILL.md`
3. Agent reads the matched SKILL.md + reference files
4. Agent responds following that skill's Response Format

No need to remember skill names. Just describe the problem.

### Examples

```
User: "write a brief for a chat app"          → create-brief
User: "design the order database schema"       → database-patterns
User: "review this PR for security issues"     → code-review
User: "set up Docker for this project"         → docker-patterns
User: "build an iOS order list screen"         → ios
```

No keyword match? Agent routes through `master-orchestrator`, detects the project stack, and picks the right skill.

## Skills Table

| Phase | Skills |
|-------|--------|
| **0 — Core** | `master-orchestrator`, `project-init`, `onboarding`, `context-compressor` |
| **1 — Planning** | `create-brief`, `create-prd`, `create-adr`, `create-tech-spec`, `create-story`, `create-roadmap`, `create-pitch-deck`, `market-analysis` |
| **2 — Backend Universal** | `oop-principles`, `design-patterns`, `microservices`, `clean-architecture`, `api-design`, `api-response`, `database-patterns`, `auth-patterns`, `event-driven`, `testing`, `grpc-patterns`, `websocket-patterns`, `message-queue`, `caching`, `rate-limiting`, `load-testing`, `api-gateway`, `graphql-patterns`, `background-jobs`, `search-patterns`, `data-streaming`, `file-storage`, `feature-flags`, `internationalization`, `structured-logging` |
| **2b — Stack Backend** | `nestjs-a/p`, `nodejs-a/p`, `elysia-a/p`, `golang-a/p`, `rust-a/p`, `python-fastapi`, `python-django`, `spring-boot-a`, `dotnet-a/p`, `rails`, `php-pure`, `php-laravel`, `php-zend` |
| **3 — Frontend Universal** | `design-system`, `state-management`, `performance`, `accessibility`, `testing`, `patterns`, `microfrontend`, `tailwind-css`, `storybook`, `pwa`, `seo`, `animation`, `form-handling`, `data-fetching`, `bundler-tools`, `image-optimization`, `theming` |
| **3b — Stack Frontend** | `react-a`, `react-nextjs`, `vue-a`, `vue-nuxt`, `angular-a/p`, `sveltekit`, `remix-a/p`, `astro-a`, `solidjs-a/p`, `qwik-a`, `svelte-a/p` |
| **4 — Dev Loop** | `code-review`, `debugging-strategy`, `refactor-guide`, `git-workflow`, `security-auditor`, `performance-profiler`, `changelog-generator`, `readme-writer`, `pr-writer`, `dev-container`, `tech-debt-tracker`, `api-client-generator` |
| **5 — DevOps** | `docker-patterns`, `cicd-pipeline`, `kubernetes-patterns`, `observability`, `helm-patterns`, `terraform`, `ansible`, `jenkins`, `longhorn`, `monitoring`, `github-actions`, `gitops`, `vault`, `aws`, `serverless`, `monorepo`, `dependency-management`, `api-documentation`, `argo-cd`, `azure`, `gcp`, `chaos-engineering`, `service-mesh`, `finops`, `backup-dr`, `database-migration` |
| **6 — Management** | `pm`, `ba`, `qa`, `qc`, `team-rules`, `security`, `pentesting`, `alerting`, `okr-kpi`, `sprint-retro`, `risk-management` |
| **7 — Mobile Stacks** | `ios`, `android`, `flutter`, `react-native`, `kotlin-multiplatform`, `ionic-capacitor`, `dotnet-maui` |
| **7b — Mobile Universal** | `mobile-patterns`, `mobile-testing`, `mobile-performance`, `mobile-security`, `mobile-networking`, `mobile-storage`, `mobile-deployment`, `push-notifications`, `in-app-purchase`, `crash-reporting`, `deep-linking`, `offline-first`, `biometrics`, `map-location`, `camera-media`, `analytics` |
| **8 — Enterprise** | `compliance-audit`, `cost-governance`, `data-governance`, `identity-provider`, `integration-patterns`, `legacy-migration`, `multi-tenant`, `sla-management` |
| **9 — Product** | `ab-testing`, `analytics`, `feature-prioritization`, `go-to-market`, `growth-engineering`, `onboarding-flow`, `pricing-strategy`, `user-research` |

Mobile universal skills apply across all platforms: patterns, testing, performance, security, networking, storage, deployment, push-notifications, in-app-purchase, crash-reporting, deep-linking, offline-first, biometrics, map-location, camera-media, analytics.

Enterprise skills cover compliance, governance, identity, integration, legacy migration, multi-tenancy, and SLA management. Product skills cover analytics, growth, onboarding, pricing, research, and feature prioritization.

`-a` = architecture, `-p` = patterns. Example: `nestjs-a` = `nestjs-architecture`.

## Architecture

```
User → [master-orchestrator] → Planning → Backend → Frontend → Mobile → Dev Loop → DevOps
                                        ↓
                                  Management
```

## Output Compression

Every skill enforces: **No filler. No preamble/postamble. Why use many token when few do trick.**

Agent config files contain the compression rules:
- `.claude/rules/compression.md`
- `.opencode/AGENTS.md`
- `.amp/AGENTS.md`
- `.cursor/rules/compression.mdc`
- `.github/copilot-instructions.md`
- `.gemini/INSTRUCTIONS.md`
- `.codex/rules/compression.md`
- `.windsurf/rules/compression.md`

## File Structure

```
.
├── .claude/          Claude Code
├── .opencode/        OpenCode
├── .amp/             Amp
├── .github/          GitHub Copilot
├── .gemini/          Gemini
├── .cursor/          Cursor
├── .codex/           Codex CLI
├── .windsurf/        Windsurf
├── docs/             quickstart, skill-template, team-guide, enterprise-guide, agent-reference
├── skills/
│   ├── core/         4 skills
│   ├── planning/     8 skills
│   ├── backend/      44 skills (19 stack files from 13 stacks + 25 universal)
│   ├── frontend/     32 skills (15 stack files from 8 stacks + 17 universal)
│   ├── mobile/
│   │   ├── ios/           iOS native
│   │   ├── android/       Android native
│   │   ├── flutter/       Flutter
│   │   ├── react-native/  React Native
│   │   ├── kotlin-multiplatform/  KMP
│   │   ├── ionic-capacitor/       Ionic/Capacitor
│   │   ├── dotnet-maui/           .NET MAUI
│   │   └── universal/     16 skills
│   ├── dev-loop/     12 skills
│   ├── devops/       26 skills
│   ├── management/   11 skills
│   ├── enterprise/    8 skills
│   └── product/       8 skills
└── bundles/
    └── bundle-definitions.json
```

Total: **176 SKILL.md** + **390+ reference .md files** + **docs/ + agent configs** = **570+ files**.

## License

MIT © j4flmao
