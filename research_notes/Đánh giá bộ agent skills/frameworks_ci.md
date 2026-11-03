# Eval frameworks for an agent-skills repo and how to run them in CI (as of Nov 2026)

Scope: a markdown-only skills repo (641 `SKILL.md`; Node.js tooling present; Python via uv allowed). Compare eval frameworks, say which can run Claude Code or an agent with skills from end to end, describe CI patterns for GitHub Actions, and describe how to manage eval-case datasets in the repo.

## Q1. Framework-by-framework capabilities (agentic, tools, sandbox, judge, assertions, sampling/variance, cost, datasets, CI, license, status)

### Takeaway
For a SKILL.md repo, the strongest fits are Anthropic's own `claude plugin eval` (built-in no-skill baseline, 3 runs by default, cost ceiling, CI exit codes) and promptfoo's Claude Agent SDK provider (`skill-used` assertion, budget cap, caching, GitHub Action with PR comments). Inspect AI with `inspect_swe` is the strongest option for sandboxed, research-grade runs. OpenAI's hosted Evals is being shut down (read-only from 31 Oct 2026, gone 30 Nov 2026), so do not adopt it.

### Cited Findings

**Anthropic `claude plugin eval` (Claude Code CLI)**
- Requires Claude Code v2.1.269 or later and a plugin manifest (`plugin.json` / `.claude-plugin/plugin.json`) or a "skills-directory plugin". If git is installed it must be 2.31 or later. — [Claude Code docs: plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Each case is a realistic prompt plus graders, stored in `evals/<case>/prompt.md` (or `case.yaml`) and `evals/<case>/graders/<name>.md`. Optional MCP mocks go in `mocks/`. Results go to `evals/results/<timestamp>/aggregate-result.json` and `report.html`, and the docs say to gitignore `results/`. `claude plugin eval init` scaffolds a suite interactively; in CI use `init --bare <name>`. — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Runs are agentic and multi-turn. Each run is a fresh, isolated non-interactive `claude -p` child process with only the plugin loaded. It gets a temporary home directory, working directory and config. No user or project CLAUDE.md, settings, MCP servers or other plugins load, and the agent cannot read the eval directory. `max_turns` defaults to 10 (cap 200) and `timeout_seconds` to 300 (cap 3600). — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Repeated sampling: `runs` defaults to 3 per arm (range 1–50). A run's score is the fraction of graders passed (weights allowed), and a case's score is the mean over its runs. The docs warn that a single run is noisy. — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- No-plugin baseline (ablation): each case runs WITH and W/OUT the plugin and reports Δ. Graders that can only pass with the plugin (for example `tool_used: Skill`) are excluded from scoring in both arms and shown only as "plugin-fired indicators". `--ablation none` halves the cost. — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Grader types: `regex`, `tool_used` (with `input_match`, min/max), `tool_order`, `file_exists` (all free and deterministic), plus `llm` (judge votes 3 times, majority PASS) and `baseline` (compare against a reference `.jsonl` transcript). "There are no custom-code graders." — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Sandboxing: read-only tools by default. `--allow-tools` grants more, `--scaffold` runs setup scripts, and MCP mocks are on by default (`--mocks record`) with replay of recorded agent-mock answers. Shell commands run under sandbox network rules, but hooks and real MCP servers are not sandboxed. — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Cost and CI: `--max-cost-usd` ceiling (exits 2 with `partial: true`), `--threshold`, `--model` / `--judge-model` pinning, `--json results.json`, `--trust-plugin`, `--no-publish`, and `-j` concurrency 1–8. Exit codes: 0 pass, 1 below threshold or error, 2 partial (cost or auth), 130/143 interrupted. The JSON (`schemaVersion: 1`) carries `aggregates.overallScore`, `casesPassed`, `meanDelta`, per-case `delta`, `costUsd`, `durationSeconds` and `claudeVersion`. Δ never changes the exit code. — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Documented CI example: `claude plugin eval . --trust-plugin --json results.json --threshold 0.8 --model claude-sonnet-5 --judge-model claude-haiku-4-5 --no-publish --max-cost-usd 20`. For cheap every-change suites the docs advise using only non-judge graders and `--ablation none`, and leaving partial runs out of trend charts. — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Stability guidance from the docs: grade long outputs with regex rather than an LLM judge. Give each case one outcome grader plus one process grader (`tool_used`/`tool_order`). If `Skill` fired but Δ is negative, suspect the judge first. — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Status: the command can be "early access" on old builds, and Anthropic can switch it off server-side ("plugin eval is currently unavailable"). — [plugin evals](https://code.claude.com/docs/en/plugin-evals)

**Anthropic skill-creator evals (plugin `skill-creator@claude-plugins-official`)**
- Interactive loop inside Claude Code. The original format stores prompts, inputs and expectations in `evals/evals.json` in the skill directory, spawns a subagent per test case for clean context, and records tokens and duration. Its format and `claude plugin eval`'s format "aren't interchangeable". — [Claude Code docs: skills](https://code.claude.com/docs/en/skills.md); [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Current skill-creator also uses case folders. `evals/evals.json` is the "older format" and is still run alongside them. Grading writes `grading.json` with `text`/`passed`/`evidence`. `scripts.aggregate_benchmark` produces `benchmark.json`/`.md` with pass rate, time and tokens per configuration (with-skill vs baseline) as mean ± stddev and the delta. An analyst pass flags non-discriminating assertions and high-variance (flaky) evals. — local skill-creator SKILL.md (anthropic-skills plugin, read from disk; mirrors [anthropics/claude-plugins-official skill-creator](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/skill-creator))
- Trigger/description optimization: about 20 should-trigger and should-not-trigger queries (near-misses stressed). `scripts.run_loop` splits them 60/40 into train and held-out test, runs each query 3 times for a trigger rate, iterates up to 5 times, and picks `best_description` by test score. It needs `claude -p`. — local skill-creator SKILL.md (same source as above)
- For plugin skills, the docs say `skillOverrides` can't disable the skill for a baseline, "so use `claude plugin eval` instead". — [Claude Code docs: skills](https://code.claude.com/docs/en/skills.md)

**promptfoo (OSS CLI, Node.js)**
- Claude Agent SDK provider `anthropic:claude-agent-sdk` (alias `anthropic:claude-code`). Key settings:
  - `working_dir` and `copy_working_dir` (fresh copy per test).
  - Tool controls: `append_allowed_tools`, `disallowed_tools`. Default tools with a working_dir are read-only.
  - `setting_sources` (needed to discover skills and CLAUDE.md; off by default) and `skills` (`'all'` or a list; auto-allows the Skill tool).
  - `permission_mode`, `max_turns`, `max_budget_usd`, `task_budget`, and a `sandbox` object (network `allowedDomains`, `failIfUnavailable`).

  — [promptfoo docs: Claude Agent SDK provider](https://www.promptfoo.dev/docs/providers/claude-agent-sdk/)
- The `skill-used` assertion checks `metadata.skillCalls`, which promptfoo derives from Skill tool calls. Raw calls are in `metadata.toolCalls`. The docs call checking skills via free text "fragile". `skills` is "a context filter, not a sandbox": unlisted skill files stay readable via Read/Bash. — [promptfoo Agent SDK provider](https://www.promptfoo.dev/docs/providers/claude-agent-sdk/)
- Responses report `cost`, `tokenUsage` (including reasoning tokens) and `metadata.modelUsage`. If accounting is unavailable, cost assertions fail rather than reading zero. Responses are cached when prompt, config and working_dir files match. Caching is off with `copy_working_dir`, MCP (unless `cache_mcp: true`), callbacks or `extra_args`. — [promptfoo Agent SDK provider](https://www.promptfoo.dev/docs/providers/claude-agent-sdk/)
- For CI the provider docs recommend `ANTHROPIC_API_KEY`, `setting_sources: ['project']` so tests don't depend on user skills, and `copy_working_dir` or `maxConcurrency: 1` for tests with side effects. — [promptfoo Agent SDK provider](https://www.promptfoo.dev/docs/providers/claude-agent-sdk/)
- GitHub Action (`promptfoo/promptfoo-action`): before/after eval of edited prompts, a PR summary comment (with a web-viewer link if sharing is on), and a `cache-path` input used with `actions/cache` on `~/.cache/promptfoo`. — [promptfoo GitHub Action docs](https://promptfoo.dev/docs/integrations/github-action); [typpo/promptfoo-action](https://github.com/typpo/promptfoo-action)
- Ownership and license: OpenAI agreed to acquire Promptfoo on 9 Mar 2026. Promptfoo states the project stays open source under MIT. One analysis notes this is a stated intention, not a binding governance guarantee. — [OpenAI announcement](https://openai.com/he-IL/index/openai-to-acquire-promptfoo/); [Gigazine](https://gigazine.net/gsc_news/en/20260310-openai-to-acquire-promptfoo); [qaskills analysis](https://qaskills.sh/blog/openai-promptfoo-acquisition-explained-2026)

**Inspect AI (UK AISI) and inspect_swe / inspect_evals**
- Inspect natively supports "tool-using agents running in a sandbox", custom scorers, solvers and tools. — [Inspect tutorial](https://inspect.aisi.org.uk/tutorial.html)
- `inspect_swe.claude_code()` runs the Claude Code CLI unattended inside an Inspect sandbox (for example `sandbox="docker"`). Model calls are proxied back to Inspect, so any model can be used. It can be invoked as `inspect eval ... --solver inspect_swe/claude_code`. — [inspect_swe Claude Code docs](https://meridianlabs-ai.github.io/inspect_swe/claude_code.html)
- `claude_code()` parameters:
  - Prompt and tools: `system_prompt`, `skills`, `disallowed_tools`, `mcp_servers`, `bridged_tools`.
  - Versions and models: `version` (`auto`/`sandbox`/`stable`/`latest`/pinned `x.x.x`), `model`, `subagent_model`.
  - Execution: `attempts`, `retry_refusals`, `retry_uncaught_errors`, `cwd`, `env`, `centaur` (human-in-the-loop mode).

  — [inspect_swe Claude Code docs](https://meridianlabs-ai.github.io/inspect_swe/claude_code.html)
- inspect_swe is actively released: changelog entry 0.2.52 (9 May 2026), PyPI 0.2.61. — [changelog](https://meridianlabs-ai.github.io/inspect_swe/CHANGELOG.html); [PyPI](https://pypi.org/project/inspect-swe/0.2.61/)
- Cloud sandbox providers (for example Daytona) are available through `inspect_sandboxes`: each sample runs in a managed sandbox while Inspect runs locally. — [inspect_sandboxes](https://meridianlabs-ai.github.io/inspect_sandboxes/daytona.html)
- inspect_evals (UK AISI, Arcadia Impact, Vector Institute) is actively maintained in 2026. For example, the GDM CTF changelog of 2026-04-21 replaced the deprecated `basic_agent()` with `react()`. — [inspect_evals GDM CTF](https://ukgovernmentbeis.github.io/inspect_evals/evals/gdm_in_house_ctf/index.html); [Inspect Evals](https://ukgovernmentbeis.github.io/inspect_evals/)
- Caution: PaperBench docs warn that Docker-in-Docker is unsupported and an agent could reach the host Docker daemon. Sandbox configuration matters. — [PaperBench](https://ukgovernmentbeis.github.io/inspect_evals/evals/coding/paperbench/index.html)

**OpenAI Evals (hosted API/dashboard) and openai/evals (repo)**
- Deprecation was announced 3 Jun 2026. Existing evals became read-only on 31 Oct 2026, and the dashboard and API shut down on 30 Nov 2026. Agent Builder winds down too. OpenAI's migration guide points to promptfoo. — [kingy.ai tracker](https://kingy.ai/ai-launch-tracker/openai-evals-read-only-october-31-shutdown-november-30-2026/); [DEV: hosted Evals read-only](https://dev.to/evalsreview/openais-hosted-evals-goes-read-only-on-31-october-what-to-export-and-where-to-move-3mni); [Langfuse migration guide](https://langfuse.com/resources/engineering/migrate-from-openai-evals.md). These are secondary sources; the OpenAI deprecations page itself was not opened.
- The `openai/evals` GitHub repo remains up and unarchived. It accepts model-graded YAML evals but not evals that need custom code. — [aicoolies review](https://aicoolies.com/reviews/openai-evals-review) (secondary)

**DeepEval / Confident AI**
- Pytest-style OSS framework. `deepeval test run` wraps pytest with caching, parallelism and a summary. It has agent metrics such as tool correctness (right tool and params), task completion, plan adherence and step efficiency. Confident AI is an optional SaaS layer (datasets, reports, tracing), and offline evals need no account. — [mer.vin explainer (Jun 2026)](https://mer.vin/2026/06/deepeval-explained-pytest-style-llm-evals-for-agents-rag-and-ci-cd/); [respan comparison](https://www.respan.ai/market-map/compare/confident-ai-vs-deepeval)
- License is reported as Apache 2.0 by most sources and MIT by one, so it is unresolved. Free-tier limits reported for Confident AI (5 test runs/week, 1-week retention) may be stale. — [AI Tools Atlas](https://aitoolsatlas.ai/tools/deepeval/review)
- Reportedly v3.9.x added agent metrics and multi-turn synthetic goldens. This comes from a vendor-adjacent blog. — [futureagi](https://futureagi.com/blog/ragas-alternatives-2026/)

**Braintrust (SaaS)**
- The official `braintrustdata/eval-action` GitHub Action runs evals on each PR and posts results as a PR comment (needs `pull-requests: write`). — [Braintrust CI/CD docs](https://www.braintrust.dev/learn/ci-cd/v0); [Braintrust experiments](https://braintrust.dev/docs/core/experiments/run)
- Pricing has a free Starter tier (about 1 GB processed data and 10k scores). Pro is reported as $249/mo by one source and "$99+" by another (conflicting); Enterprise is custom. — [TrueFoundry](https://www.truefoundry.com/blog/braintrust-pricing); [budgetforge](https://www.budgetforge.dev/tools/braintrust-pricing-2026)

**LangSmith (LangChain; SaaS)**
- The pytest plugin (`langsmith[pytest]`, ≥0.3.4) and Vitest integration use `@pytest.mark.langsmith`. Failures raise locally, so CI can gate on them. `LANGSMITH_TEST_SUITE` names the suite. `LANGCHAIN_TEST_CACHE` provides checked-in cassettes for CI cost control. `LANGCHAIN_TEST_TRACKING=false` gives local-only runs. — [LangSmith pytest docs](https://docs.langchain.com/langsmith/pytest); [LangChain blog](https://blog.langchain.com/pytest-and-vitest-for-langsmith-evals)

**Ragas**
- It is mainly a RAG-eval library, but it has `ToolCallAccuracy` and `AgentGoalAccuracyWithReference` that work on multi-turn traces (`multi_turn_ascore`). — [Arize Phoenix Ragas integration](https://arize.com/docs/phoenix/integrations/evaluation-integrations/ragas)
- Maintenance is disputed. One comparison says the last release was v0.4.3 (13 Jan 2026), there have been no main-branch commits since 24 Feb, and an unpatched CVE exists ("looks dormant"). This was not verified against GitHub. — [ecorpit comparison](https://ecorpit.com/rag-evaluation-tools-ragas-deepeval-braintrust-giskard-2026/)

**Custom harness on the Claude Agent SDK**
- The Agent SDK loads skills from `.claude/skills/` (`SKILL.md`). If `settingSources` is set explicitly, it must include project or user for skills to load. The SKILL.md `allowed-tools` frontmatter is not applied in the SDK; use `allowedTools` instead. — [Agent SDK skills docs](https://code.claude.com/docs/en/agent-sdk/skills) (via search summary)

### Inferences
- Comparison matrix (synthesized from the findings above; ✓ = documented, ~ = partial or via plugins, ? = not verified):

| Framework | Agentic multi-turn | Runs Claude Code + skills E2E | Sandbox | LLM judge | Deterministic asserts | Repeats/variance | Cost tracking/cap | Dataset in repo | CI hook | License/hosting | Status Nov 2026 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `claude plugin eval` | ✓ | ✓ (native, + no-skill Δ) | ✓ isolated temp env, read-only tools by default | ✓ (3-vote) | ✓ regex/tool_used/tool_order/file_exists | ✓ runs=3 default, mean | ✓ `--max-cost-usd`, costUsd | ✓ `evals/<case>/` | ✓ exit codes, JSON | Claude Code CLI (proprietary), local | Active; can be toggled off server-side |
| skill-creator | ✓ | ✓ (inside a session) | ~ subagents | ✓ grader agent | ✓ scripts | ✓ mean ± stddev, trigger-rate ×3 | ~ tokens/time | ✓ case folders / evals.json | ✗ interactive | Plugin (Apache-style LICENSE in plugin) ? | Active |
| promptfoo | ✓ | ✓ `anthropic:claude-agent-sdk` + `skill-used` | ~ SDK sandbox obj, copy_working_dir | ✓ | ✓ | ~ `--repeat` ? | ✓ cost, `max_budget_usd` | ✓ YAML | ✓ GH Action + PR comment | MIT OSS (OpenAI-owned) | Active |
| Inspect AI + inspect_swe | ✓ | ✓ `claude_code()` in Docker | ✓ Docker/cloud | ✓ | ✓ | ✓ epochs ? | ✓ token usage ? | ✓ Python/JSONL | ~ CLI, logs | MIT ? OSS, local | Active |
| DeepEval | ✓ | ~ (wrap SDK yourself) | ✗ | ✓ | ✓ | ? | ? | ✓ | ✓ pytest | OSS (Apache/MIT disputed) + SaaS | Active |
| Braintrust | ✓ | ~ (wrap SDK) | ✗ | ✓ | ✓ | ? | ✓ ? | SaaS datasets | ✓ eval-action PR comment | SaaS | Active |
| LangSmith | ✓ | ~ (wrap SDK) | ✗ | ✓ | ✓ | ? | ? | SaaS datasets | ✓ pytest/vitest | SaaS | Active |
| Ragas | ~ | ✗ | ✗ | ✓ | ~ | ? | ? | ✓ | ~ | OSS | Possibly dormant |
| OpenAI Evals (hosted) | — | ✗ | — | — | — | — | — | — | — | SaaS | Shut down 30 Nov 2026 |

- Two tools give a measured no-skill baseline Δ with no extra work: `claude plugin eval` and skill-creator. This is what matters most for a skills repo, because you want to know whether a SKILL.md adds value over the base model.
- The repo would need a plugin manifest or the "skills-directory plugin" layout for `claude plugin eval`. Its `.claude/skills/` (4 skills) fits the Agent SDK/promptfoo `setting_sources: ['project']` route directly. The 641 `skills/<area>/<name>/SKILL.md` files are not in `.claude/skills/`, so either harness would need a scaffold step that copies or symlinks the skill under test into `.claude/skills/` of the working dir.
- Recommended stack: Node tooling plus static checks (already present via `scripts/validate-agent-governance.js`), promptfoo or `claude plugin eval` for per-PR sampled live evals, and Inspect + inspect_swe (via uv) for nightly sandboxed full runs if isolation matters.

### Gaps
- Whether `claude plugin eval` accepts a plain repo of 641 skills as one "skills-directory plugin" (and how a suite scales to hundreds of skills) was not verified. The loading page was not fetched.
- promptfoo's `--repeat` and variance reporting, and Inspect `epochs` and its cost reporting, were not re-verified in this session (marked ?).
- Licenses for Inspect AI and inspect_swe, and Braintrust's open-source SDK (autoevals), were not verified from primary sources.
- LangSmith trajectory and multi-turn eval features for 2026 were not found.
- The OpenAI deprecation dates come from secondary sources.

## Q2. Which can run Claude Code / an agent with skills end-to-end?

### Takeaway
Three tools run the real Claude Code harness with skills: `claude plugin eval`, promptfoo `anthropic:claude-agent-sdk`, and Inspect `inspect_swe.claude_code()`. A custom harness on the Agent SDK can too. DeepEval, Braintrust and LangSmith only score traces you produce yourself; Ragas only scores traces.

### Cited Findings
- `claude plugin eval` runs a fresh `claude -p` per run with only the plugin loaded, and can grade `tool_used: Skill` as a plugin-fired indicator. — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- promptfoo discovers skills via `setting_sources`/`plugins`, filters them with `skills`, and asserts with `skill-used`. — [promptfoo provider](https://www.promptfoo.dev/docs/providers/claude-agent-sdk/)
- inspect_swe runs the Claude Code CLI unattended in a sandbox, with `skills`, `mcp_servers` and version pinning. — [inspect_swe](https://meridianlabs-ai.github.io/inspect_swe/claude_code.html)
- The Agent SDK loads `.claude/skills/*/SKILL.md` when setting sources include project. — [Agent SDK skills](https://code.claude.com/docs/en/agent-sdk/skills)

### Inferences
- If you need isolation from the CI runner's filesystem, use Inspect with a Docker sandbox. `claude plugin eval` isolates config and home but runs on the host, and its docs say hooks and real MCP servers run outside the sandbox. promptfoo's `skills` filter is not a sandbox.
- Pin the Claude Code version in all three (Inspect `version="x.x.x"`, npm pin for the SDK, `claudeVersion` recorded in plugin-eval JSON) so a harness upgrade isn't mistaken for a skill regression.

### Gaps
- Whether inspect_swe's `skills` parameter accepts Anthropic SKILL.md directories directly (rather than Inspect-native skills) was not confirmed.

## Q3. CI patterns (tiers, caching, budgets, secrets, flakiness, gating, reporting)

### Takeaway
Use three tiers:
- **Tier 0 (every PR, free):** static checks such as frontmatter/schema lint, link checks, trigger-keyword collisions and `claude plugin validate`.
- **Tier 1 (PRs touching `skills/**`):** live evals only on changed skills, with deterministic graders, `--ablation none` and a cost ceiling.
- **Tier 2 (nightly/weekly):** full suite with the baseline Δ, judge graders, more runs, and trend reporting.

Gate on deterministic score thresholds, and treat the judge-based Δ as advisory.

### Cited Findings
- Anthropic's own CI guidance:
  - Pin `--model` and `--judge-model` ("so a model rollout isn't mistaken for a plugin regression").
  - Use `--max-cost-usd`, `--trust-plugin`, `--no-publish` and `--json`.
  - Give quick every-change suites only non-judge graders and `--ablation none`.
  - Exclude `partial: true` and `skippedPaidGraders` runs from trends.
  - Exit code 2 means a partial run from the cost ceiling or an auth failure.

  — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- `claude plugin validate` checks syntax and schema rather than behavior, which suits the cheap tier. — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- For noise, `claude plugin eval` uses 3 runs by default and a 3-vote judge (2 of 3 PASS). The docs warn that `--runs 1` is noisy and changes should be confirmed at 3 runs. — [plugin evals](https://code.claude.com/docs/en/plugin-evals); [search summary of docs](https://code.claude.com/docs/en/plugin-evals)
- skill-creator flags high-variance evals as possibly flaky and non-discriminating assertions as useless. — local skill-creator SKILL.md
- Rate limits: plugin-eval `-j` concurrency shares the account rate limit, and runs can fail partway on usage or rate limits. — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Caching:
  - promptfoo caches agent responses keyed on prompt, config and working-dir files (bypassed by `copy_working_dir`, MCP and so on). It persists `~/.cache/promptfoo` via `actions/cache` with `cache-path`.
  - LangSmith uses checked-in cassettes (`LANGCHAIN_TEST_CACHE`).
  - plugin eval replays MCP agent-mock answers from `mocks/.replay/`.

  — [promptfoo provider](https://www.promptfoo.dev/docs/providers/claude-agent-sdk/); [promptfoo GH Action](https://promptfoo.dev/docs/integrations/github-action); [LangSmith pytest](https://docs.langchain.com/langsmith/pytest); [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Budgets: plugin eval `--max-cost-usd`, promptfoo `max_budget_usd` and `task_budget`, and promptfoo cost assertions that fail if accounting is unavailable. — [plugin evals](https://code.claude.com/docs/en/plugin-evals); [promptfoo provider](https://www.promptfoo.dev/docs/providers/claude-agent-sdk/)
- Secrets: `ANTHROPIC_API_KEY` (or cloud provider env vars) in the runner environment. plugin eval forwards only an allowlist plus `EVAL_*` vars into runs. — [plugin evals](https://code.claude.com/docs/en/plugin-evals); [promptfoo provider](https://www.promptfoo.dev/docs/providers/claude-agent-sdk/)
- Reporting:
  - plugin eval writes a self-contained `report.html` (no external requests) you can upload as a CI artifact, and a versioned JSON for scripts.
  - The promptfoo action posts a PR summary comment with a before/after comparison.
  - Braintrust `eval-action` posts PR comments (needs `pull-requests: write`).

  — [plugin evals](https://code.claude.com/docs/en/plugin-evals); [promptfoo GH Action](https://promptfoo.dev/docs/integrations/github-action); [Braintrust CI docs](https://www.braintrust.dev/learn/ci-cd/v0)

### Inferences
- Suggested GitHub Actions layout (synthesis, not from a single source):
  1. `pr-static.yml` runs on every PR: Node `scripts/validate-*.js` checks on frontmatter and Trigger/Rules/Response Format sections, duplicate-trigger detection, and `claude plugin validate`. Cost $0.
  2. `pr-evals.yml` runs on `paths: skills/**, evals/**`. It computes changed skills with `git diff --name-only origin/main...HEAD`, then runs only `--case`/`--tag <skill>` with `--runs 3 --ablation none`, deterministic graders, `--threshold 0.8` and `--max-cost-usd 5–20`. It needs the `ANTHROPIC_API_KEY` secret. Skip it for fork PRs, because secrets are unavailable there; label-gate it (`run-evals`). Add `concurrency:` to cancel superseded runs.
  3. `nightly-evals.yml` runs on a schedule: full suite, `--ablation with-without`, judge graders, pinned models, `--json`. Upload `report.html`/JSON as artifacts. Compare with the last main baseline JSON (stored as an artifact or committed `evals/baselines/*.json`) and open an issue on regressions.
  4. Gate on `overallScore` and per-case `score` vs. threshold, and alert on a Δ drop beyond tolerance (for example 1 stddev or 10 pts) instead of hard-failing on Δ.
- Flaky-eval handling: quarantine via tags (`--tag` excludes), re-run only failing cases at a higher `--runs` before failing, and track per-case variance from nightly runs to retire non-discriminating cases.
- Budget: per-PR ceilings plus a monthly cap tracked from `costUsd` in the JSON.

### Gaps
- No primary source was found for official Anthropic GitHub Actions workflow YAML for `claude plugin eval` beyond the CLI flags.
- Whether `--json` results include per-case variance or stddev was not seen; only means are documented.

## Q4. Dataset/version management for eval cases stored in the repo

### Takeaway
Keep cases next to skills, in git, in one tool's native format: `evals/<case>/prompt.md + graders/*.md` for `claude plugin eval`, or `promptfooconfig.yaml` with test YAML. Version them through git, record model and harness versions in the results, and gitignore results while committing chosen baselines.

### Cited Findings
- The plugin-eval layout is `evals/<case>/{prompt.md, case.yaml, graders/<name>.md, mocks/, fixtures}`. Cases can be nested under group directories and filtered with `tags`. `schema_version` is set automatically (default "1.1"). The eval directory can be changed. Unknown frontmatter keys are errors. `results/` should be gitignored. — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- The result JSON is versioned (`schemaVersion: 1`, additive fields only) and records `claudeVersion`. — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- skill-creator keeps cases in the skill's `evals/` (case folders, or legacy `evals/evals.json`) and trigger eval sets as JSON `{query, should_trigger}`. Its 60/40 train/test split avoids overfitting the description. — local skill-creator SKILL.md
- LangSmith pytest syncs tests to hosted datasets, and Braintrust and Confident AI keep datasets in SaaS. This is an alternative to in-repo storage. — [LangSmith pytest](https://docs.langchain.com/langsmith/pytest); [respan comparison](https://www.respan.ai/market-map/compare/confident-ai-vs-deepeval)

### Inferences
- For this repo, a practical layout is `evals/<area>/<skill>/<case>/...` (or co-located `skills/<area>/<name>/evals/`) with `tags: [<area>, <skill>, tier1|nightly]` so CI can select by changed path.
- Add a lint step that every SKILL.md with evals has at least one outcome grader and one process grader.
- Keep a trigger set (`triggers.json`) per skill for routing and description accuracy, which matters a lot with 641 overlapping skills.
- Treat eval-case changes like code: review them in PRs, never change cases and the skill in the same PR without re-baselining, and tag baseline JSONs with the model ID and `claudeVersion`.

### Gaps
- No source covered scaling a single suite to hundreds of skills (runtime, cost estimates), or cross-skill routing/collision evals specifically.
