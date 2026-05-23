# Onboarding Flow

## Day-by-Day Flow Design

### Day 1 — Welcome and Environment Setup
**Goal:** Health endpoint returns HTTP 200.  
**Duration:** Full day (6-8 hours).  
**Activities:** Welcome meeting with manager, onboarding buddy introduction, environment setup pairing session, first test suite run.  
**Verification:** Developer runs `curl http://localhost:3000/health` and gets `{"status":"ok"}`. Developer runs the test suite and all tests pass.  
**Output:** A GitHub issue documenting any missing or incorrect setup steps found during the process.

### Day 2 — Architecture and Domain
**Goal:** Developer can draw the request flow from memory.  
**Duration:** 4-6 hours.  
**Activities:** 60-minute architecture walkthrough with tech lead, self-guided exploration of key directories, event topology review, deployment pipeline overview, CI/CD config file review.  
**Verification:** Developer presents a whiteboard diagram of the request flow covering: CDN → load balancer → API gateway → service → database/cache → queue → response. No gaps in the flow.  
**Output:** The architecture diagram (updated if gaps were found) committed as a PR to docs/diagrams/.

### Day 3 — First Code Change
**Goal:** Draft PR open with green CI.  
**Duration:** 4-6 hours.  
**Activities:** Buddy assigns a small well-scoped ticket (documentation fix, minor bug, small enhancement), pairs on the full development cycle, teaches branch creation, commit conventions, test writing, and CI pipeline monitoring.  
**Verification:** PR exists on GitHub in draft state, CI pipeline shows all green checks, PR description follows the team template.  
**Output:** Draft pull request with at least one meaningful code change and associated tests.

### Day 4 — Review and Merge
**Goal:** First PR merged to main branch.  
**Duration:** 2-4 hours.  
**Activities:** Buddy reviews the draft PR, a second reviewer provides additional feedback, developer addresses all comments, buddy approves, developer merges using the team's merge strategy, developer verifies the change in staging.  
**Verification:** PR is merged, CI/CD pipeline completes successfully for the merge commit, change is visible in staging environment.  
**Output:** Merged pull request, celebration, and a clear understanding of the full PR lifecycle.

### Day 5 — Retrospective and Planning
**Goal:** Documented learnings and next ticket assigned.  
**Duration:** 2-4 hours.  
**Activities:** Developer writes a structured retrospective, manager and buddy review and prioritize improvements, first independent ticket is assigned.  
**Verification:** Retro document is shared with the team, the top 3 improvement items have tracking tickets, the developer has a clear week 2 plan.  
**Output:** Retrospective document, improvement tickets, first independent ticket assignment.

## Welcome Message Templates

### Pre-Start Email
```
Subject: Welcome to the team, {name}!

Hi {name},

Welcome to {team}! Your onboarding starts on {start_date}. Here's what to expect:

- Your onboarding buddy is {buddy_name} — they will guide you through your first week.
- Your engineering manager is {manager_name} — you will have a weekly 1:1 starting week 1.
- Before day 1, please complete: install {required_tools}, set up SSH keys on GitHub, review the project README.

Your day 1 agenda:
1. 9:00 AM — Welcome meeting with {manager_name}
2. 10:00 AM — Environment setup with {buddy_name}
3. 12:00 PM — Team lunch
4. 1:00 PM — First code walkthrough
5. 3:00 PM — Test suite and health check

See you on {start_date}!
```

### Day 1 Slack Message
```
Welcome @{name}! :wave: Your buddy @{buddy} is here to help. 
Day 1 checklist:
- [ ] Repo cloned
- [ ] bin/setup completed
- [ ] Dev server running (health check = 200)
- [ ] Tests all green
- [ ] Met the team in #general
Ask anything in #engineering — no question is too small!
```

### Buddy Introduction
```
Hey {name}, I'm {buddy_name} and I'll be your onboarding buddy for the next 2 weeks.
I've blocked time for pairing on:
- Day 1 (9-11am): Environment setup
- Day 2 (10-11am): Architecture walkthrough
- Day 3 (1-3pm): First PR pairing
- Day 4 (10-11am): Review and merge
- Day 5 (10-11am): Retro and week 2 planning

Outside those times, I'm available async on Slack. My calendar is open if you want
to grab time. Don't hesitate to DM me with any question, no matter how small.
```

## First-Run Experience

### bin/setup Script Design
The setup script is the single entry point for new developers. It must be idempotent — running it multiple times produces the same result. It prints clear status for each step:

```
$ bin/setup
==> Checking prerequisites...                          PASS
==> Installing runtime (Node.js 20.x)...                PASS
==> Installing dependencies (npm ci)...                 PASS
==> Creating .env from .env.example...                  PASS
==> Creating database...                                PASS
==> Running migrations...                               PASS
==> Seeding development data...                         PASS
==> Starting dev server...                              PASS
==> Running health check...                             PASS  (HTTP 200)
==> Running test suite...                               PASS  (142/142)

Setup complete! Development environment is ready.
  Dev server: http://localhost:3000
  Health endpoint: http://localhost:3000/health
  API docs: http://localhost:3000/docs
  Test suite: npm test
```

Each step is isolated — if step N fails, the script prints the error and suggests a fix command. The script never exits without a clear message about what failed and what to do next.

### Post-Setup Verification Script
A verification script confirms the environment is fully functional:
```
$ bin/verify
[PASS] Git configured — user.name and user.email set
[PASS] SSH keys found — can authenticate to GitHub
[PASS] Runtime version matches .nvmrc (20.x)
[PASS] Dependencies installed — node_modules exists
[PASS] .env file exists with required variables
[PASS] Dev server responds on port 3000 (HTTP 200)
[PASS] Database connected — can run SELECT 1
[PASS] Test suite passes — 142/142 tests green
[PASS] Linter passes — 0 errors, 0 warnings
[PASS] TypeScript compiler — 0 type errors
```

## Persistence and Context

### Configuration Persistence
All local configuration must survive git operations and machine restarts. The .env file stores environment-specific variables and is gitignored. Framework config files (tsconfig.json, jest.config.js, vite.config.ts, next.config.js) are committed as defaults with local overrides in gitignored sibling files. Editor settings are committed in .vscode/settings.json or .idea/ and apply to all developers. Git hooks installed by husky or lefthook are configured to run automatically on clone via the setup script.

### Context Preservation Between Sessions
The developer's context — which branch they were on, what they were working on, what database state they had — should persist between sessions. Docker volumes preserve database state. The dev server logs to a persistent file. The setup script detects whether this is a first run or a re-run and skips completed steps. A .opencode directory tracks session state if the developer uses opencode for development.

## Customization

### Local Override Mechanisms
Developers can override any configuration without affecting teammates. Environment overrides go in .env.local (loaded after .env). Editor overrides go in .vscode/settings.local.json (gitignored). Docker Compose overrides go in docker-compose.override.yml (gitignored). Linter rule overrides go in .eslintrc.local.js. Prettier overrides go in .prettierrc.local.json. The gitignore file includes all local override patterns by default.

### Optional Service Toggling
Developers can enable or disable optional infrastructure services. A docker-compose.profiles.yml defines profiles: `core` (database, cache, queue — always on), `optional` (mail catcher, job worker, search engine — opt-in), `dev` (all services — for full-stack development). The developer selects their profile in .env.local:
```
COMPOSE_PROFILES=core,optional
```

## Troubleshooting

### Common Issues and Solutions
| Symptom | Likely Cause | Solution |
|---|---|---|
| `port 3000 already in use` | Another dev server is running | `npx kill-port 3000` or change the port in .env |
| `ECONNREFUSED database` | Database container is not running | `docker compose up -d db` |
| `node-gyp rebuild failed` | Missing C++ build tools | Windows: `npm install -g windows-build-tools`. macOS: `xcode-select --install`. Linux: `apt install build-essential` |
| `Module not found: 'sharp'` | Native module build failure | `npm rebuild sharp` or `npx sharp install` |
| `Authentication failed` | Expired vault token | `op signin` or `aws sso login` |
| `Network timeout` | Corporate proxy blocking | Set `HTTP_PROXY` and `HTTPS_PROXY` in .env.local |
| `Docker: no space left` | Docker image/container accumulation | `docker system prune -af` |
| `Permission denied (publickey)` | SSH key not added to agent | `ssh-add ~/.ssh/id_ed25519` |
| `fatal: not a git repository` | Wrong working directory | `cd project-root/` |

### Diagnostic Commands
```bash
# Check all prerequisites
bin/verify

# Check Docker health
docker compose ps

# Check database connection
psql "$DATABASE_URL" -c "SELECT 1"

# Check dev server
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health

# Check test framework
npx jest --listTests 2>/dev/null | head -5

# Check linting
npx eslint . --max-warnings 0
```
