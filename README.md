# @j4flmao/agent-skills

76 agent skills for software development — planning, backend, frontend, mobile, devops, management. Each skill is a `SKILL.md` defining triggers, rules, and response format.

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
npx skills add j4flmao/agent-skills            # all 76 skills
npx skills add j4flmao/agent-skills --bundle backend-only
npx skills add j4flmao/agent-skills -g          # global (every project)
```

## Bundles

```bash
npx skills add j4flmao/agent-skills --bundle <name>
```

| Bundle | Skills | Description |
|--------|--------|-------------|
| `fullstack-nestjs-react` | 41 | NestJS + React |
| `fullstack-golang-vue` | 41 | Go + Vue |
| `fullstack-rust-angular` | 41 | Rust + Angular |
| `fullstack-dotnet-react` | 41 | .NET + React |
| `fullstack-nodejs-react` | 41 | Node.js + React |
| `fullstack-elysia-react` | 41 | ElysiaJS + React |
| `fullstack-rails-svelte` | 39 | Rails + SvelteKit |
| `backend-only` | 47 | Backend only |
| `frontend-only` | 28 | Frontend only |
| `devops-only` | 15 | DevOps only |
| `management-only` | 8 | Management only |
| `mobile-ios` | 26 | iOS native + deployment |
| `mobile-android` | 26 | Android native + deployment |

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
| **0 — Core** | `master-orchestrator`, `project-init` |
| **1 — Planning** | `create-brief`, `create-prd`, `create-adr`, `create-tech-spec`, `create-story` |
| **2 — Backend Universal** | `oop-principles`, `design-patterns`, `microservices`, `clean-architecture`, `api-design`, `api-response`, `database-patterns`, `auth-patterns`, `event-driven`, `backend-testing` |
| **2b — Stack Backend** | `nestjs-a/p`, `nodejs-a/p`, `elysia-a/p`, `golang-a/p`, `rust-a/p`, `python-fastapi`, `python-django`, `spring-boot-a`, `dotnet-a/p`, `rails` |
| **3 — Frontend Universal** | `design-system`, `state-management`, `performance`, `accessibility`, `frontend-testing`, `patterns`, `microfrontend` |
| **3b — Stack Frontend** | `react-a`, `react-nextjs`, `vue-a`, `vue-nuxt`, `angular-a/p`, `sveltekit` |
| **4 — Dev Loop** | `code-review`, `debugging-strategy`, `refactor-guide`, `git-workflow`, `security-auditor`, `performance-profiler`, `changelog-generator`, `readme-writer` |
| **5 — DevOps** | `docker-patterns`, `cicd-pipeline`, `kubernetes-patterns`, `observability`, `helm-patterns`, `terraform`, `ansible`, `jenkins`, `longhorn`, `monitoring` |
| **6 — Management** | `pm`, `ba`, `qa`, `qc`, `team-rules`, `security`, `pentesting`, `alerting` |
| **7 — Mobile** | `ios`, `android`, `mobile-deployment` |

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

## File Structure

```
.
├── .claude/          Claude Code (CLAUDE.md + 3 rules + 4 skills + 6 hooks + settings.json)
├── .opencode/        OpenCode (AGENTS.md + 3 commands)
├── .amp/             Amp (AGENTS.md + agent-skills.md + subagents.md + plugins/)
├── .github/          GitHub Copilot instructions
├── .gemini/          Gemini instructions
├── .cursor/          Cursor (2 rules)
├── .codex/           Codex CLI (AGENTS.md + 3 rules + 5 hooks + 1 skill)
├── skills/
│   ├── core/         2 skills
│   ├── planning/     5 skills
│   ├── backend/      20 skills (10 stacks + 10 universal)
│   ├── frontend/     13 skills (4 stacks + 7 universal)
│   ├── mobile/       3 skills
│   ├── dev-loop/     8 skills
│   ├── devops/       10 skills
│   └── management/   8 skills
└── bundles/
    └── bundle-definitions.json
```

Total: **76 SKILL.md** + **128 reference .md files** + **agent configs** = **215+ files**.

## License

MIT © j4flmao
