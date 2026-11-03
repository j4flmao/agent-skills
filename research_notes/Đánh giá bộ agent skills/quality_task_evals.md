# Evaluating task-performance quality of agent skills (with-skill vs without-skill)

Scope: how to measure whether a SKILL.md actually improves a coding agent's output on realistic tasks; applied to a 641-skill library (j4flmao/skills). Current as of 2026-11-03. Items marked [older] predate 2025; items marked [prior knowledge, not re-fetched] are from well-known papers that this session did not re-open. Check them before quoting exact numbers.

## 1. A/B design: with-skill vs no-skill vs old-skill; skill-creator workflow; other published approaches

### Takeaway
The standard design runs the same task prompts in two arms: the skill loaded vs. no skill (new skill) or the previous skill snapshot (edited skill). Each arm gets several runs, graders check objective assertions, and you report per-arm mean ± stddev plus a delta. Anthropic ships two tools that do this: skill-creator (`evals/evals.json`) and `claude plugin eval` (with/without "ablation"). Published results show skills help on average but hurt on about 19% of tasks, and a skill that never gets invoked has zero effect. So every eval must measure invocation separately from quality.

### Cited Findings
**Anthropic skill-creator workflow (github.com/anthropics/skills)**
- Test cases live in `evals/evals.json`: `{skill_name, evals:[{id, prompt, expected_output, files[], expectations[]}]}`. Expectations are "verifiable statements." — [skill-creator schemas.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/references/schemas.md)
- Workspace layout: `<skill>-workspace/iteration-N/eval-<id>/{with_skill|without_skill|old_skill}/outputs/`. For a new skill the baseline is no skill. To improve a skill, `cp -r <skill-path> <workspace>/skill-snapshot/` before editing and point the baseline at the snapshot (`old_skill/`). Spawn the with-skill and baseline runs in the same turn. — [skill-creator SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md)
- Timing and tokens (`total_tokens`, `duration_ms`) are captured per run into `timing.json`. The doc says this is the only chance to capture them. — [skill-creator SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md)
- Assertions should be objectively verifiable with descriptive names. Subjective qualities are left to human review. Programmatic checks are run as scripts. — [skill-creator SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md)
- A grader subagent (`agents/grader.md`) writes `grading.json` with `expectations[{text, passed, evidence}]`, `summary{passed, failed, total, pass_rate}`, `execution_metrics` (tool_calls, errors, output_chars), `timing`, `claims[{claim, type, verified, evidence}]`, and an optional `eval_feedback.suggestions` that critiques weak assertions. — [schemas.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/references/schemas.md)
- `python -m scripts.aggregate_benchmark <workspace>/iteration-N --skill-name <name>` produces `benchmark.json`/`benchmark.md`. Its `run_summary` has `pass_rate`, `time_seconds`, and `tokens`, each with `{mean, stddev, min, max}` for `with_skill` and `without_skill`, plus a signed `delta`. — [schemas.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/references/schemas.md)
- An analyzer agent looks for "non-discriminating assertions" (assertions that pass regardless of the skill), high-variance or flaky evals, and time/token tradeoffs. An optional blind comparator (`agents/comparator.md`) judges A vs B without knowing which is which and writes `comparison.json` with a winner, rubric scores (content: correctness/completeness/accuracy; structure: organization/formatting/usability), and the per-side expectation pass rate. — [SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md); [schemas.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/references/schemas.md)
- skill-creator does not specify the number of runs per eval for the quality benchmark. The only explicit repeat count is in description/trigger optimization: 20 queries (8–10 should-trigger, 8–10 near-miss should-not-trigger), a 60/40 train/test split, 3 runs per query, up to 5 iterations, and `best_description` chosen by held-out test score. — [SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md)

**`claude plugin eval` (Claude Code, 2026)**
- Each case is a directory with `prompt.md` plus `graders/`. There are 6 grader types. `regex`, `tool_used`, `tool_order`, and `file_exists` are free and deterministic. `llm` (the judge votes PASS in at least 2 of 3 votes) and `baseline` (at least as good as a reference transcript) call a judge. — [Claude Code docs: plugin evals](https://code.claude.com/docs/en/plugin-evals.md)
- "Each case runs three times by default" (`runs` 1–50). A run's score is the fraction of graders passed, optionally weighted. The case score is the mean across runs. `--threshold` defaults to 1.0. — [plugin evals](https://code.claude.com/docs/en/plugin-evals.md)
- No-plugin baseline: the runs are repeated with no plugin loaded and the report shows `WITH`, `W/OUT`, and `Δ`. "If a case scores 1.0 both with and without the plugin, the plugin isn't what made it pass." Set it with `--ablation with-without|none`. Graders can be scoped with `arm: with-only` (e.g. `tool_used: Skill`, which tracks invocation). — [plugin evals](https://code.claude.com/docs/en/plugin-evals.md)
- Cost ≈ cases × runs × 2 arms, plus 3 judge calls per llm/baseline grader per run. Other options: `--max-cost-usd`, `--judge-model`, exit code 1 below threshold for CI gating, and a JSON result with `aggregates.casesPassed` and `cases[].arms.with/without`. Bash runs in an OS sandbox with workspace-confined writes. The docs note that the skill-creator `evals.json` and plugin-eval case formats can't read each other's files. — [plugin evals](https://code.claude.com/docs/en/plugin-evals.md)
- Doc tips: grade long generated files with `regex` over file contents and keep `llm` graders for short outputs with concrete PASS/FAIL rubrics. If `tool_used: Skill` passes but Δ is negative, "suspect the judge before the plugin" and rerun with a stronger judge. To check a build or test, have the prompt write the outcome to a file, grade that file, and assert the command ran via `tool_used` with `input_match`. — [plugin evals](https://code.claude.com/docs/en/plugin-evals.md)

**Published with/without-skill studies**
- SkillsBench (arXiv 2602.12670, Feb 2026) has 86 tasks across 11 domains (84 evaluated). Each task is run in 3 conditions: no skills, curated skills, and self-generated skills. It covers 7 agent-model configs (Claude Code, Gemini CLI, Codex CLI) with 5 runs per task at temperature 0, for 7,308 trajectories. Verifiers are deterministic pytest (fewer than 10 tests, no LLM judge). — [SkillsBench](https://arxiv.org/html/2602.12670v1)
- SkillsBench results: curated skills average +16.2pp (abstract), though the Fig. 2 caption says +12.66pp (internal inconsistency). Self-generated skills average −1.3pp. By domain: Healthcare +51.9pp, Manufacturing +41.9pp, Software Engineering only +4.5pp (34.4→38.9%), Math +6.0pp. 16/84 tasks (19%) got worse with skills, e.g. −39.3pp on taxonomy-tree-merge. — [SkillsBench](https://arxiv.org/html/2602.12670v1)
- Skill form matters in SkillsBench: "Detailed" +18.8pp, "Compact" +17.1pp, "Comprehensive" −2.9pp (N=140, small bin). 1 skill +17.8pp, 2–3 skills +18.6pp, 4+ skills +5.9pp. — [SkillsBench](https://arxiv.org/html/2602.12670v1)
- SkillsBench limitations: no length-matched control, so gains may partly come from extra context. Curated skills came from the top quality quartile (benchmark skills 10.1/12 vs ecosystem average 6.2/12). It uses normalized gain g=(p_skill−p_vanilla)/(1−p_vanilla), and the authors warn g can mislead (90→95% and 10→55% both give g=0.5). — [SkillsBench](https://arxiv.org/html/2602.12670v1)
- Leakage controls in SkillsBench: skills may not contain task-specific filenames, constants, exact commands, or test references. A leakage-audit agent runs in CI. Oracle solutions must pass 100%. Reviewers run tasks with and without skills to confirm signal. — [SkillsBench](https://arxiv.org/html/2602.12670v1)
- vals.ai runs a live SkillsBench leaderboard: average 36.33% without skills vs 51.21% with skills (+14.88pp). The page date (8/12/2026) was not verified. — [vals.ai SkillsBench](https://vals.ai/benchmarks/skillsbench)
- Vercel (Jan 27, 2026) tested Next.js 16 APIs absent from training data. Overall pass rate: baseline 53%, skill at default 53%, skill with explicit "use the skill" instructions 79%, and an 8KB AGENTS.md docs index 100%. The default skill was not invoked in 56% of cases. Hardening: they removed test leakage, fixed contradictory prompts, switched to behavior-based assertions, and scored Build/Lint/Test separately with retries. — [Vercel blog](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)

### Inferences
- Use three arms for edits: no-skill, old-skill, and new-skill. "New vs old" detects regressions. "New vs none" shows whether the skill earns its context cost at all.
- Separate the triggering metric (was the skill loaded?) from the conditional-quality metric (given it was loaded, did the output improve?). Vercel's 53%=53% shows that an unused skill can look useless even if its content is good. One way to separate them: run an extra "forced-load" arm, with the skill injected or explicitly invoked, to isolate content quality.
- Add a length-matched control arm (an irrelevant or generic doc of similar token count) for a sample of skills. This tests the "extra context" confound SkillsBench flagged.
- For this repo, the domain heterogeneity in SkillsBench is directly relevant. Software-engineering skills, the majority of the 641, show the smallest average gains (+4.5pp), so expected effects are small and need more trials (see section 4).

### Gaps
- skill-creator gives no recommended number of runs per eval for the with/without quality benchmark.
- No published study found of length-matched controls for skills.
- SkillsBench appendix E.1 (confidence intervals) was not read. The text reports no significance tests.

## 2. Grading: deterministic checks, execution-based tests, LLM-as-judge

### Takeaway
Prefer outcome-based deterministic graders, such as compile/run/lint, schema or regex checks on produced files, and tool-call assertions. Use an LLM judge only for qualities that can't be checked mechanically. When you do, use concrete PASS/FAIL rubrics, one isolated judge per dimension, majority voting, an "Unknown" escape, position-swapped pairwise comparison, and periodic calibration against human labels. Use a judge from a different model family when possible, to blunt self-preference.

### Cited Findings
- Anthropic (Jan 9, 2026) defines task, trial, grader, transcript, and outcome. The outcome is "the final state in the environment," not what the agent says it did. — [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- The same article compares grader types. Code-based graders are fast, cheap, objective, and reproducible, but brittle to valid variation. Model-based graders are flexible but non-deterministic and need human calibration. Human graders are the gold standard but slow. Scores can be weighted, binary (all must pass), or hybrid. — [Anthropic evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- Guidance from the article: grade outcomes, not the exact path (rigid step checks penalize valid solutions); use partial credit for multi-part tasks; balance cases where a behavior should and shouldn't occur; provide a reference solution proving each task is solvable; treat 0% across many trials as a broken task or grader; make graders resistant to bypasses; read transcripts. — [Anthropic evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- Judge calibration from the article: "calibrate closely against human experts," give the judge an "Unknown" option, use structured rubrics, and score each dimension with a separate, isolated judge. Human review can become occasional once the system is robust. — [Anthropic evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- MT-Bench/Chatbot Arena (Zheng et al., 2023) [older]: a strong LLM judge (GPT-4) agrees with human preferences over 80% of the time, "the same level of agreement between humans." It identifies position, verbosity, and self-enhancement biases plus limited reasoning on math/grading. — [arXiv 2306.05685](https://arxiv.org/abs/2306.05685). Mitigations described in the paper body (swap positions and count only consistent wins, few-shot, chain-of-thought, reference-guided judging) are [prior knowledge, not re-fetched]: [full paper](https://arxiv.org/html/2306.05685v4)
- Position bias in pairwise LLM judges is systematic and varies by judge and task. The proposed metrics are repetition stability, position consistency, and preference fairness. — [Judging the Judges, arXiv 2406.07791](https://arxiv.org/html/2406.07791v1)
- Self-preference bias: judges favor outputs resembling their own, linked to lower perplexity (familiarity). — [Self-Preference Bias in LLM-as-a-Judge, arXiv 2410.21819](https://arxiv.org/pdf/2410.21819). Survey of judge methods and biases: [arXiv 2412.05579](https://arxiv.org/pdf/2412.05579)
- Verbosity bias: length-controlled win rates (Dubois et al. 2024, AlpacaEval LC) are a post-hoc correction [older; summarized via search, not re-fetched]. — [search summary of 2604.23178 / survey](https://arxiv.org/pdf/2604.23178)
- G-Eval (Liu et al. 2023) [older; prior knowledge, not re-fetched]: chain-of-thought form-filling with a probability-weighted score improves correlation with human judgments on summarization and dialogue. — [arXiv 2303.16634](https://arxiv.org/abs/2303.16634)
- `claude plugin eval` implements judge robustness as 3 votes with a 2/3 majority, a configurable `--judge-model`, and a judge that sees the first 12 and last 12 messages of the trace. A small judge can fail a correct answer over formatting. — [plugin evals](https://code.claude.com/docs/en/plugin-evals.md)
- SkillsBench avoided LLM judges entirely: deterministic pytest, numeric tolerances, binary pass/fail. — [SkillsBench](https://arxiv.org/html/2602.12670v1)
- Vercel scored Build/Lint/Test separately and switched from implementation-detail checks to behavior-based assertions. — [Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)

### Inferences
Grader recipes for the example tasks in this repo:
- **"Write a Helm chart"** — deterministic: `helm lint`, `helm template | kubeconform -strict`, and policy checks (conftest/kyverno) on the rendered YAML for resource limits, probes, and non-root. Asserting specific values (`securityContext.runAsNonRoot: true`) works well as a regex or YAML-path check.
- **"Design an idempotent payment API"** — partly deterministic, through an OpenAPI schema lint (spectral) and assertions that an `Idempotency-Key` header exists on POST and a 409/422 conflict behavior is documented. If code is produced, an execution test should send the same POST twice after a simulated timeout and assert a single charge. Use an LLM judge only for design-rationale quality, with rubric items stated as PASS/FAIL ("key stored atomically with the side effect: PASS if …").
- **"Review this PR for security"** — seed the PR with known, planted vulnerabilities (SQLi, SSRF, hard-coded secret) and decoys. Grade recall on the planted items and the false-positive rate on decoys, matched by file/line regex or a narrow per-finding judge. This follows the "balanced problem set" guidance.
- **Response-format compliance**: each SKILL.md in this repo defines a "Response Format". Check it with regex/structure graders (required headings, code block present). Report format compliance separately from task correctness so format adherence can't inflate quality scores.
- Judge setup: pointwise PASS/FAIL per rubric item, which is easier to calibrate and keeps assertion-level analysis possible. Use pairwise blind comparison, with both orders and only order-consistent wins counted, for holistic "which is better" questions between old and new skill. Use a different-family judge, or an ensemble across families, when the agent model is Claude. Calibrate by hand-labelling around 50–100 outputs per rubric and tracking judge-human agreement (Cohen's κ). That number is a heuristic from this note, not from a cited source.

### Gaps
- No primary source found giving a recommended minimum human-label set size for judge calibration.
- Exact MT-Bench numbers with and without ties, and the position-consistency rates, were not re-verified this session.

## 3. Agentic task evals: sandboxed repos, pass@k / pass^k, harnesses

### Takeaway
Realistic skill evals should run the actual agent harness (e.g. Claude Code headless) in a fresh container or worktree per trial. Each task needs a reference solution, deterministic verifier tests, and a fixed resource budget. Report pass@1 (mean success) as the headline. Add pass^k for consistency, which matters for skills meant to make behavior reliable, and pass@k only where one success out of k is the real use case.

### Cited Findings
- pass@k is the probability that at least one of k trials succeeds and rises with k. pass^k is the probability that all k succeed and falls with k: a 75% per-trial rate gives about 42% pass^3. — [Anthropic evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents). The unbiased pass@k estimator 1−C(n−c,k)/C(n,k) comes from the Codex/HumanEval paper [older; prior knowledge]: [arXiv 2107.03374](https://arxiv.org/abs/2107.03374). pass^k was introduced in τ-bench [older; prior knowledge]: [arXiv 2406.12045](https://arxiv.org/abs/2406.12045)
- Isolation: start each trial from a clean environment, since leftover files and caches cause correlated failures. In one example an agent exploited git history from earlier trials. Resource limits such as memory can make trials non-independent. — [Anthropic evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- Suite lifecycle: start with "20-50 simple tasks drawn from real failures." Capability evals should start at a low pass rate. Regression evals should sit near 100%. Capability evals "graduate" into regression suites. Watch for saturation. — [Anthropic evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- Terminal-Bench 2.0 (arXiv 2601.11868, Jan 2026) has 89 tasks, each with a container environment, a human-written solution, and tests. Every task was manually verified by three reviewers, with oracle-solution runs and an LLM check for common mistakes. Tasks use the Harbor format and harness, which supports Claude Code, Codex CLI, and Terminus 2. The paper reports 32,000+ trials, with frontier models below 65% and small models around 15%. Leaderboard submissions use 5 trials per task (`-k 5`) and may not override timeouts or resource limits. That leaderboard detail comes from a secondary 2026 survey. — [Terminal-Bench 2.0](https://arxiv.org/abs/2601.11868v1); [survey 2606.20683](https://arxiv.org/pdf/2606.20683)
- Terminal-Bench 2.1 was reportedly released May 6, 2026. This is unverified and comes from a secondary source. — [systems-analysis.ru](https://systems-analysis.ru/eng/Terminal-Bench)
- SkillsBench copies the skills directory into each container at agent-specific paths, so the harness discovers skills natively instead of having them pasted into the prompt. — [SkillsBench search summary](https://www.emergentmind.com/topics/skillsbench-benchmark); [paper](https://arxiv.org/html/2602.12670v1)
- SWE-bench (Jimenez et al. 2023) [older; prior knowledge, not re-fetched] uses real GitHub issues, and grading runs repo unit tests: FAIL_TO_PASS tests must pass and PASS_TO_PASS tests must keep passing. SWE-bench Verified is a 500-task human-validated subset (OpenAI, Aug 2024). — [arXiv 2310.06770](https://arxiv.org/abs/2310.06770); [OpenAI SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/)
- METR time horizons: a logistic fit of success against log(human task duration), with the 50% horizon taken where the curve crosses 0.5. The 2025 paper reported a doubling time of about 7 months. METR's March 2026 note says alternative fits shift the 50% horizon by up to 35%, and measurements above 16 hours are unreliable on the TH1.1 suite. — [METR paper arXiv 2503.14499](https://arxiv.org/html/2503.14499v3); [METR modelling-assumptions note](https://metr.org/notes/2026-03-20-impact-of-modelling-assumptions-on-time-horizon-results/); [METR time horizons](https://metr.org/time-horizons/)
- `claude plugin eval` sandboxing: a fresh non-interactive session per run with only the plugin loaded, an OS-level Bash sandbox, network limited to granted domains, and mock MCP servers with recorded replays (`mocks/.replay/`) so CI runs stay repeatable. — [plugin evals](https://code.claude.com/docs/en/plugin-evals.md)

### Inferences
- Map the skill library onto a Harbor- or SWE-bench-style task format: Dockerfile or seed repo, `instruction.md`, `solution.sh` (oracle), and `tests/` (verifier). Run each task under {none, old, new} skill with the skill files placed where the harness discovers them, plus a trigger assertion.
- METR-style human-time estimates per task help stratify the suite (quick checklist-style vs multi-hour design) and show where a skill helps, for example only on longer tasks.
- Store a per-run outcome, a transcript, tokens, and wall time. Skills can raise pass rates while raising cost; skill-creator's benchmark tracks tokens and time deltas for this reason.

### Gaps
- No public harness found that is specific to evaluating large skill libraries (hundreds of skills) beyond SkillsBench (86 tasks) and the per-plugin tools.

## 4. Variance and statistics; how many runs and tasks; sampling across 641 skills

### Takeaway
Treat tasks as samples from a task universe. Compute paired per-task differences (with − without), averaged over K runs per task. Report mean Δ ± 1.96·SE, clustered by task family, and use a power analysis to size the suite. With realistic per-skill suites of 5–20 tasks, only large effects (roughly ≥15–25pp) are detectable per skill. Small effects must be estimated in aggregate across a stratified sample of skills, using a hierarchical or pooled analysis.

### Cited Findings
- The CLT standard error for binary scores is √(p(1−p)/n), with a 95% CI of mean ± 1.96·SE. — [Miller, Adding Error Bars to Evals, arXiv 2411.00640 (Nov 2024) [older but still the reference]](https://arxiv.org/html/2411.00640v1); [Anthropic research summary](https://www.anthropic.com/research/statistical-approach-to-model-evals)
- Clustered SEs: when questions share a source, cluster on the unit of randomization. Clustered SEs were "over three times as large as naive" (DROP: 1.34 vs 0.44). — [arXiv 2411.00640](https://arxiv.org/html/2411.00640v1); [Anthropic](https://www.anthropic.com/research/statistical-approach-to-model-evals)
- Paired differences: SE_{A−B} = √(SE_A² + SE_B² − 2·SE_A·SE_B·ρ). Frontier models showed question-score correlations of about 0.3–0.7, making pairing "free" variance reduction. Report the mean difference, SE, CI, and correlation. — [Anthropic](https://www.anthropic.com/research/statistical-approach-to-model-evals); [paper](https://arxiv.org/html/2411.00640v1)
- Resampling: averaging K samples per question shrinks conditional variance by a factor of K. In the paper's example, K=2 cuts total variance by 1/3, K=4 by 1/2, K=6 by 5/9, with a ceiling of 2/3. Don't lower temperature just to cut variance. — [arXiv 2411.00640](https://arxiv.org/html/2411.00640v1)
- Sample size: n = (z_{α/2}+z_β)²·(ω² + σ_A²/K_A + σ_B²/K_B)/δ². Example: ω²=1/9, δ=3pp, α=0.05, 80% power gives about 969 questions. Inverted MDE: n=198, σ²=1/6, K=1 gives MDE about 13.2%, and K=10 gives about 7.6%. — [arXiv 2411.00640](https://arxiv.org/html/2411.00640v1)
- The `errorbars` PyPI package implements paired and cluster-robust (CR1 sandwich) comparisons. Inspect computes SEs with resampling through `epochs`. — [errorbars on PyPI](https://pypi.org/project/errorbars/); [Anthropic](https://www.anthropic.com/research/statistical-approach-to-model-evals)
- Run counts in practice: SkillsBench uses 5 per task, Terminal-Bench leaderboard 5 (`-k 5`), `claude plugin eval` 3 by default (1–50), and skill-creator trigger optimization 3 per query. — [SkillsBench](https://arxiv.org/html/2602.12670v1); [survey](https://arxiv.org/pdf/2606.20683); [plugin evals](https://code.claude.com/docs/en/plugin-evals.md); [skill-creator](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md)
- The skill-creator benchmark reports only mean ± stddev, min, and max per configuration, with no CI or significance test. — [schemas.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/references/schemas.md)
- Anthropic's starting suite size is 20–50 tasks from real failures, with larger suites needed as effects get smaller. — [Anthropic evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

### Inferences
Worked numbers apply the Miller formula with assumed variances; they are illustrative, not sourced.
- Per-skill MDE: n=10 tasks, K=5 runs per arm, binary outcomes, assumed task-level paired-difference variance ω²≈0.1 and within-task variance σ²≈0.2 per arm. Variance term = 0.1 + 0.2/5 + 0.2/5 = 0.18, and MDE ≈ 2.8·√(0.18/10) ≈ 0.38, about 38pp. With n=20 tasks the MDE is about 27pp, and with n=40 about 19pp. Per-skill suites therefore only detect large effects. That is fine for gating "does this skill help a lot or hurt," but not for measuring +5pp effects in the SWE domain.
- Runs beyond K≈5 buy little once task-level variance dominates. More tasks reduce SE faster than more runs.
- Analysis per skill: paired task-level Δ, a bootstrap CI over tasks (resample tasks, not runs; use a clustered bootstrap if tasks share a seed repo), and a sign test or Wilcoxon signed-rank on task deltas as a small-n robustness check. Across skills, use a mixed-effects or hierarchical model (Δ ~ 1 + (1|category) + (1|skill) + (1|task)) or simply cluster SEs by skill. This estimates the library-wide effect and per-category effects with partial pooling.
- Sampling across 641 skills: stratify by category (43 categories; backend 91, devops 70, frontend 60, data 39, and so on, per `.claude/rules/structure.md`). Weight sample size by traffic (route or trigger frequency from logs) and by risk, putting security, payments, and destructive-ops skills first. A practical tiering:
  - Tier A: top ~50 by traffic or risk. Full suite of 10–20 tasks × K=5 × 3 arms, rerun on every edit and model release.
  - Tier B: a stratified random sample of ~10% per category each cycle. 3–5 tasks × K=3.
  - Tier C: the rest. Static lint plus a trigger eval only, rotated over time.
- Report "fraction of skills with a significantly negative Δ" as a key library health metric, since SkillsBench found 19% of tasks hurt.
- Use normalized gain only alongside the absolute Δ, given SkillsBench's warning.

### Gaps
- No published variance estimates (ω², σ²) exist for skill-induced deltas on coding tasks. The numbers above are assumptions; pilot runs are needed to estimate them.
- No published guidance found specifically on sampling strategy across large skill libraries.

## 5. Detecting regressions when a skill is edited

### Takeaway
Snapshot the old skill and run the old-vs-new pair on the same tasks with paired statistics. Keep a near-100% regression suite, graduated from capability evals, gated in CI with a threshold and cost ceiling. Flag any task whose Δ turns negative, and re-run the suite on model releases, because a skill that helped an old model may be neutral or harmful for a new one.

### Cited Findings
- skill-creator snapshots the skill before editing (`skill-snapshot/`) and uses it as the `old_skill` baseline. The viewer compares iterations with `--previous-workspace`. — [skill-creator SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md)
- `claude plugin eval` is meant to "catch regressions when you change the plugin or a new model is released." It exits 1 below `--threshold` for CI gating. Cases with negative Δ get a red edge in `report.html`, and the verdict line reads "improved N, flat N, regressed N of M cases." For cheap per-change suites, use only non-judge graders and `--ablation none`. Exclude `partial` and `skippedPaidGraders` runs from trends. — [plugin evals](https://code.claude.com/docs/en/plugin-evals.md)
- Regression evals should sit near 100%, and capability evals graduate into them. — [Anthropic evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- Description edits change triggering. skill-creator chooses descriptions by held-out test score to avoid overfitting. — [skill-creator SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md)
- Model dependence: in SkillsBench, self-generated skills helped only Opus 4.6 (+1.4pp) and hurt on average, and smaller models with skills can match larger models without them. — [SkillsBench](https://arxiv.org/html/2602.12670v1)
- In Vercel's results, wording of the invocation instruction swung the score from 53% to 79%, so small wording edits can cause large regressions. — [Vercel](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)

### Inferences
- CI recipe per edited SKILL.md:
  1. Lint and schema check (frontmatter, Trigger, Rules, Response Format).
  2. Trigger eval (20 near-miss queries, 3 runs).
  3. Old-vs-new paired quality run on that skill's tasks (K≥3).
  4. Block the merge if the lower bound of the paired 95% CI on Δ is below −δ_tolerance (e.g. −10pp), or if any regression-suite task drops from 100%.
  5. Otherwise attach the report.
- Use a one-sided non-inferiority framing for edits ("not worse by more than X") rather than requiring a significant improvement. Small per-skill suites can't show improvements but can catch large drops.
- Re-baseline the whole Tier A set on each new agent model. Track Δ(skill) over model versions and retire skills whose Δ approaches zero or turns negative.
- Watch for non-discriminating assertions, which pass in both arms. Prune or harden them, or they hide regressions. skill-creator's analyzer does this.

### Gaps
- No public data found on how often small SKILL.md edits cause regressions in practice.
