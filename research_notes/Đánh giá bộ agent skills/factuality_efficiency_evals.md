# Factuality/Currency Evaluation of Technical Reference Docs + Skill Efficiency Metrics (state as of Nov 2026)

Context: corpus = ~4,600 markdown files (641 SKILL.md + ~3,900 reference docs). Part A = detect hallucinated/outdated technical claims. Part B = cost/latency/token efficiency of skills.

## (A1) Automated approaches to detect hallucinated or outdated technical claims

### Takeaway
No single tool covers this. Best practice is a layered pipeline: (1) cheap deterministic checks first (link checking, extracting code blocks and running native validators/linters, registry lookups for package names/versions, deprecated-API rule lists such as the Kubernetes deprecation guide + Pluto), then (2) LLM claim extraction + retrieval verification (FActScore/SAFE pattern) only for the prose claims that deterministic tools cannot check. Low-frequency/niche APIs are where LLM-written docs hallucinate most, so verification effort should be weighted toward niche skills.

### Cited Findings

**Long-form factuality methods (claim extraction + verification)**
- FActScore splits a long-form generation into atomic facts and computes the share supported by a reliable knowledge source; ChatGPT scored 58% on biographies. Its automated estimator (retrieval + strong LM) had "less than a 2% error rate" vs humans, and was used on 6,500 generations from 13 LMs — work estimated at $26K with human annotation. Human eval only covered biographies (domain-transfer caveat) and accuracy is tied to knowledge-source coverage. — [FActScore, arXiv 2305.14251](https://arxiv.org/abs/2305.14251)
- SAFE (Google DeepMind, "Long-form factuality in large language models", 2024): LLM splits response into individual facts, each checked via Google Search queries + multi-step reasoning. On ~16,000 facts SAFE agreed with crowdsourced annotators 72% of the time; on 100 random disagreements SAFE was judged correct 76% of the time; >20x cheaper than human annotators. Also proposes F1@K (precision balanced with recall against a target number of facts). Code + LongFact released at github.com/google-deepmind/long-form-factuality. — [DeepMind publication page](https://deepmind.google/research/publications/85420/); [Maginative summary](https://www.maginative.com/article/google-deepminds-new-research-shows-llms-can-outperform-humans-in-fact-checking); [VentureBeat](https://venturebeat.com/ai/google-deepmind-unveils-superhuman-ai-system-that-excels-in-fact-checking-saving-costs-and-improving-accuracy)
- Critique of SAFE's "superhuman" framing: it beat underpaid crowd workers, not expert fact-checkers; SAFE depends on the underlying LLM and on Google Search coverage. — [btw.media](https://btw.media/en/googles-deepmind-unveils-a-superhuman-ai-system-safe); [Maginative](https://www.maginative.com/article/google-deepminds-new-research-shows-llms-can-outperform-humans-in-fact-checking)

**Code/API hallucination evidence (what to look for)**
- Package hallucination (Spracklen et al.): 16 code models, 576,000 Python/JS samples; commercial models averaged ~5.2% hallucinated packages, open-source ~21.7%; GPT-4 Turbo lowest at 3.59%, CodeLlama >30%. — [Socket blog](https://socket.dev/blog/slopsquatting-how-ai-hallucinations-are-fueling-a-new-class-of-supply-chain-attacks); [TechRepublic](https://www.techrepublic.com/article/news-slopsquatting-vibe-coding-ai-cybersecurity-risk/)
- 2026 replication on five frontier models (single-author preprint, not peer-reviewed): inter-model range compressed to 4.62%–6.10%; 127 package names hallucinated identically by all five models, 53 still registrable after disclosure (41 PyPI, 12 npm). — [arXiv 2605.17062](https://arxiv.org/pdf/2605.17062)
- Adversarial/bait prompts on local models: 0–10% hallucination on routine prompts vs 40–73% on slopsquatting-bait prompts (secondary news summary). — [aiunderstanding.org](https://aiunderstanding.org/news/study-finds-local-coding-llms-can-hallucinate-package-names-that-create-slopsquatt)
- CloudAPIBench (Jain et al., ICSE 2025 SEIP): GPT-4o produced only 38.58% valid invocations for low-frequency APIs; Documentation-Augmented Generation raised this to 47.94% but, with sub-optimal retrievers, cut high-frequency API performance by 39.02% absolute; selectively triggering retrieval (API-index check or model confidence) gave +8.20% absolute. — [Amazon Science](https://www.amazon.science/publications/on-mitigating-code-llm-hallucinations-with-api-documentation); [ICSE 2025](https://conf.researchr.org/details/icse-2025/icse-2025-software-engineering-in-practice/33/On-Mitigating-Code-LLM-Hallucinations-with-API-Documentation)
- GitChameleon 2.0 (ACL 2026): 328 Python completion problems each conditioned on specific library versions, with executable unit tests; enterprise models at 48–51% baseline success — i.e., version-specific API knowledge is weak. — [SOTAVerified](https://sotaverified.org/papers/250712367); [ACL Anthology author page](https://aclanthology.org/people/justine-gehring/)

**Deterministic validators to run on extracted code blocks**
- Kubernetes: official Deprecated API Migration Guide lists removals per release, e.g. v1.25 removed `batch/v1beta1` CronJob, `policy/v1beta1` PodDisruptionBudget and PodSecurityPolicy (PSP replaced by Pod Security Admission), `autoscaling/v2beta1` HPA, `discovery.k8s.io/v1beta1` EndpointSlice, `events.k8s.io/v1beta1`; v1.26 removed `autoscaling/v2beta2`; v1.27 `storage.k8s.io/v1beta1` CSIStorageCapacity; v1.29/v1.32 removed `flowcontrol.apiserver.k8s.io/v1beta2`/`v1beta3`. Usable as a grep rule list over YAML snippets. — [Kubernetes deprecation guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/)
- Pluto (FairwindsOps) detects deprecated/removed apiVersions in static files (`detect-files`), Helm charts/releases (`detect-helm`), clusters (`detect-api-resources`); CI exit codes 2 = deprecations, 3 = removals; `--target-versions` checks against a planned K8s version. — [pkg.go.dev fairwindsops/pluto](https://pkg.go.dev/github.com/fairwindsops/pluto/v3)
- kubeconform validates manifests against schemas offline; `-kubernetes-version`, `-strict` (fail on unknown fields), JSON/TAP/JUnit output, custom CRD schema locations. — [kubeconform GitHub](https://github.com/yannh/kubeconform); [OneUptime guide](https://oneuptime.com/blog/post/2026-02-09-kubeconform-validate-manifests/markdown)
- actionlint (GitHub Actions): workflow-syntax key checks, `${{ }}` expression type-checking, action `with:` inputs vs action definitions, reusable-workflow inputs/secrets, shellcheck on `run:` + pyflakes on Python, script-injection detection, runner-label validation, cron syntax, a deprecated-commands rule; errors as `file:line:col: message [rule-id]`. — [actionlint GitHub](https://github.com/rhysd/actionlint)
- Other per-language validators (existence of tools; apply to extracted fenced blocks by language tag): ShellCheck — [GitHub](https://github.com/koalaman/shellcheck); hadolint (Dockerfile) — [GitHub](https://github.com/hadolint/hadolint); TFLint (Terraform, incl. deprecated syntax/provider rules) — [GitHub](https://github.com/terraform-linters/tflint); `terraform validate` — [Terraform docs](https://developer.hashicorp.com/terraform/cli/commands/validate).

**Link checking**
- lychee: async link checker for markdown; set `GITHUB_TOKEN` to avoid GitHub rate limits; cache via `--cache --max-cache-age 1d` stored in `.lycheecache` with `actions/cache`; use `--cache-exclude-status` (e.g. 429, 500–502) so transient errors are not cached; cache only saves on successful runs unless restore/save are split with `if: always()`. — [lychee caching recipe](https://lychee.cli.rs/github_action_recipes/caching); [lychee-action](https://www.github.com/lycheeverse/lychee-action); [discussion #978](https://www.github.com/lycheeverse/lychee/discussions/978)

### Inferences
- Recommended pipeline for this repo, cheapest → most expensive:
  1. **Structural extraction**: parse all fenced code blocks with language tag; extract inline-code tokens (`pkg@version`, `--flag`, `apiVersion:`, config keys) into a claims table (file, line, type, value).
  2. **Deterministic checks**: lychee on all URLs; kubeconform `-strict` + Pluto `--target-versions` on YAML; actionlint on workflow snippets; shellcheck/hadolint/tflint/`terraform validate`; `tsc --noEmit`, `python -m py_compile`/mypy, `go vet` on snippets wrapped in minimal harnesses. Snippets are often fragments → expect high false-positive rate; record "unvalidatable" separately from "invalid".
  3. **Registry existence/version checks**: for every package name mentioned, query npm/PyPI/crates.io/Maven Central (or deps.dev) for existence, latest version, and deprecation flags (npm `deprecated` field, PyPI yanked). This directly targets the slopsquatting failure mode documented above. (Registry APIs not separately fetched in this research — treat specifics as to-verify.)
  4. **Deprecated-pattern ruleset**: a curated YAML of regexes (e.g. `batch/v1beta1`, `PodSecurityPolicy`, `set-output`, `apt-key`, `MD5` for passwords, `torch_dtype=` → `dtype=`) run as grep in CI; cheap, high precision, and turns known staleness into regression tests.
  5. **LLM claim verification (SAFE/FActScore-style)** only on prose claims not covered above: extract atomic claims per section, retrieve official docs (allow-listed domains), label supported / contradicted / unverifiable. Weight sampling toward niche/low-frequency topics (CloudAPIBench finding).
- Freshness tracking: add frontmatter fields like `last_verified: YYYY-MM-DD`, `verified_against: {kubernetes: "1.34", terraform: "1.x"}`; CI flags files whose `last_verified` is older than N months or whose pinned versions are N majors behind registry latest. Staleness = age × volatility of the domain (K8s/cloud/LLM APIs change faster than algorithms).
- Score per file: hallucinated-entity rate (non-existent package/flag/key), outdated rate (exists but deprecated/removed), broken-link rate, snippet-validation pass rate.

### Gaps
- Did not fetch npm/PyPI/crates.io/Maven API docs; exact endpoints/fields (e.g. PyPI yanked flag, npm `deprecated`) should be verified before implementation.
- No published benchmark found specifically measuring hallucination rates in *agent skill/reference documentation corpora*; all rates above are for model-generated code, not docs.
- No source found quantifying false-positive rates of linting doc snippet fragments.
- VersiCode benchmark not found in search results.

## (A2) Measuring hallucination rate with human spot-check sampling and confidence intervals

### Takeaway
Use stratified random sampling of claims (not files), human-label a sample, report a proportion with a Wilson (or Clopper–Pearson) interval; when an LLM judge labels the whole corpus, use a small human-labeled calibration set and prediction-powered inference (PPI) / sensitivity-specificity correction to get unbiased corpus-level rates with valid CIs.

### Cited Findings
- PPI combines a small human-labeled set with many cheap autorater (LLM-judge) labels to produce estimates and intervals that remain valid; a worse proxy yields wider intervals, not invalid ones. — [GLIDE / arXiv 2605.31278](https://arxiv.org/pdf/2605.31278); [arXiv 2405.06034](https://arxiv.org/pdf/2405.06034v1.pdf)
- Bias-corrected LLM-judge estimation: estimate judge sensitivity (q1) and specificity (q0) on a human-labeled calibration set, then correct the judge's raw rate and compute its CI. — [arXiv 2511.21140](https://arxiv.org/pdf/2511.21140v3)
- Tooling: `truescore` (PyPI) gives bias-corrected scores, CIs, and model comparisons for LLM-judged evals; its example shows a judge-only interval missing the true value while the corrected interval contains it. — [truescore on PyPI](https://pypi.org/project/truescore/0.7.1/)
- Automated factuality judges are imperfect vs humans: SAFE 72% raw agreement with crowd workers; FActScore estimator <2% aggregate error. — [DeepMind](https://deepmind.google/research/publications/85420/); [FActScore](https://arxiv.org/abs/2305.14251)
- Wilson score interval is preferred over the normal (Wald) approximation for proportions, especially near 0 or with small n; Clopper–Pearson is the exact (conservative) alternative. — [Wikipedia: Binomial proportion confidence interval](https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval)
- Rule of three: if 0 errors are observed in n samples, the 95% upper bound on the rate is ≈ 3/n. — [Wikipedia: Rule of three (statistics)](https://en.wikipedia.org/wiki/Rule_of_three_(statistics))

### Inferences
- Unit of analysis: atomic claim (API/flag/key/version/behavior statement). Report both claim-level rate and file-level "≥1 error" rate.
- Sample sizing (normal approx., 95%): ±5pp margin at p≈0.5 needs ~385 claims; at an expected rate ~10%, ±3pp needs ~385, ±5pp needs ~140. Stratify by category (devops, backend, ai, …) with proportional or Neyman allocation, oversampling volatile categories; reweight to corpus totals.
- Protocol: 2 independent annotators on ≥20% overlap → report Cohen's kappa; labels = correct / incorrect-hallucinated / outdated / unverifiable; annotators must cite the official source URL for each verdict.
- Combine: LLM verifier labels all claims; human labels ~300–500 stratified claims; apply PPI to get corpus rate + CI. Re-run per release to track trend.

### Gaps
- No source specific to documentation corpora on annotator agreement for "outdated vs wrong" distinctions.
- Sample-size figures above are standard binomial arithmetic, not from a fetched source.

## (B1) Efficiency: tokens, context budget, latency, $ cost, tool calls, cost-per-success; progressive disclosure and prompt caching

### Takeaway
With Agent Skills, the always-on cost is the metadata listing (~100 tokens/skill per Anthropic docs; Claude Code truncates description+when_to_use at 1,536 chars), so a 641-skill library pays a large fixed per-turn tax (~64k tokens at the docs' ~100/skill estimate) before any skill is used — the dominant efficiency risk for this repo. Bodies (<5k tokens target, <500 lines) and references (zero until read) are pay-per-use. Prompt caching makes the fixed prefix cheap (reads 0.05–0.1x base) but any change to tools/system invalidates it.

### Cited Findings
- Progressive disclosure levels: Level 1 metadata (`name`+`description`) always loaded at startup, ~100 tokens per skill; Level 2 SKILL.md body loaded when triggered, "under 5k tokens"; Level 3+ resources cost nothing until accessed — reference files enter context when read, scripts run via bash and only their output enters context. `name` ≤64 chars; `description` ≤1,024 chars. — [Anthropic Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- Claude Code: description + `when_to_use` truncated at 1,536 chars in the skill listing; descriptions are in context every turn whether or not used; invoked SKILL.md persists in conversation; after compaction each skill is re-attached up to first 5,000 tokens, shared 25,000-token budget (older skills can drop). Keep SKILL.md <500 lines. Controls: `skillOverrides` (`on` / `name-only` / `user-invocable-only` / `off`), `disable-model-invocation: true` removes description from context, `context: fork` runs skill in a subagent, `paths` scopes auto-loading; `/skill-doctor` (Claude Code ≥ v2.1.252) reports each skill's context cost and usage. — [Claude Code skills docs](https://code.claude.com/docs/en/skills)
- Prompt caching: 5-min cache writes 1.25x base input, 1-hour writes 2x; reads 0.1x for most models (0.05x for Opus 5.5 / Sonnet 5.5; 0.025x for Fable 5.1 / Mythos 5.1); default TTL 5 min refreshed on read; min cacheable 512 tokens for newest models (1,024–4,096 for older). Usage fields: `cache_creation_input_tokens`, `cache_read_input_tokens`, `input_tokens`; total input = sum of the three. Prefix order tools → system → messages; changing tool definitions invalidates everything, system prompt changes invalidate system+messages. — [Anthropic prompt caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- Token counting endpoint: free (RPM-limited by tier), accepts system/tools/images/PDFs, returns an estimate that can differ slightly from actual. Claude Opus 4.7+ and the 5.x family use a newer tokenizer producing ~30% more tokens for the same text — recount per target model, don't reuse old counts. — [Anthropic token counting docs](https://platform.claude.com/docs/en/build-with-claude/token-counting)
- SkillsBench (arXiv 2602.12670): tasks run under no-skills / curated / self-generated skills with deterministic verifiers; curated skills +16.2pp average pass rate (from +4.5pp software engineering to +51.9pp healthcare); 16 of 84 tasks got worse; self-generated skills ≈ no benefit (~–1.3pp per one summary); median public skill ≈1.5k tokens; Gemini Flash + skills beat Gemini Pro without skills at 44% lower per-task API cost; 7 agent-model configs, 7,308 trajectories. — [SkillsBench arXiv](https://arxiv.org/html/2602.12670v1); [EmergentMind summary](https://www.emergentmind.com/topics/skillsbench-benchmark)
- Follow-up (NeurIPS 2026): pass rate alone insufficient; also report partial credit and token efficiency; curated skills can reduce intermediate progress while terminal success stays flat. — [NeurIPS 2026 poster](https://neurips.cc/virtual/2026/175739)
- HAL (Princeton, ICLR 2026): cost-controlled agent leaderboard plotting accuracy vs $ and tokens (Pareto frontier); 21,730 rollouts, 9 models × 9 benchmarks, ~$40k; most expensive models rarely on the frontier; scaffold choice strongly affects both accuracy and cost; acknowledges incomplete caching cost accounting. — [HAL site](https://hal.cs.princeton.edu/); [arXiv 2510.11977](https://arxiv.org/pdf/2510.11977)

### Inferences
- For this repo: 641 skills × ~100 tokens ≈ 64k always-on tokens if all exposed as model-invocable (estimate; real number depends on description lengths and tokenizer — measure with count_tokens or `/skill-doctor`). Current repo instead routes via CLAUDE.md + `routing.md` (a large always-loaded rules bundle), which is itself a fixed per-turn cost to measure the same way.
- Measure three layers separately: L1 fixed listing/rules tokens per turn; L2 tokens per triggered SKILL.md; L3 reference tokens actually read per task (from transcripts: which files were `Read`).
- Caching mitigates L1 cost on cost but not on context-window occupancy or attention dilution; keep the prefix stable (don't regenerate skill listings/rules with timestamps).

### Gaps
- Anthropic per-model $/MTok base prices not fetched in this pass; cost formulas must plug in current pricing page values.
- No source found quantifying latency impact of large skill listings (TTFT vs listing size) or trigger-accuracy decline vs number of installed skills specifically for Agent Skills.

## (B2) Which metrics matter for comparing skill variants and how to report them

### Takeaway
Compare variants (e.g. no-skill vs current vs trimmed vs references-split) on a fixed task bank with deterministic graders where possible, multiple trials per task, and report success (pass@1 plus pass^k for consistency) alongside cost-per-success, tokens (by layer, cached vs uncached), tool calls, and latency — presented as an accuracy–cost Pareto plot with CIs, not a single accuracy number.

### Cited Findings
- Run multiple trials per task (non-determinism); 20–50 tasks from real failures suffice early because large effects need small samples; isolate trials (no shared files/git state); 0% across many trials usually means broken task/grader. — [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- pass@k = P(≥1 success in k); pass^k = P(all k succeed) — e.g. 75% per-trial → pass^3 ≈ 42%; use pass^k where consistency matters. — [Anthropic evals post](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- Grader hierarchy: code-based (fast, objective, brittle), model-based (flexible, needs calibration vs humans), human (gold standard, slow); grade outcome not path. Track turns, tool calls, total tokens, TTFT, output tokens/s, time-to-last-token, cost per task. — [Anthropic evals post](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- SkillsBench design (no-skill / curated / self-generated ablation, deterministic verifiers, averaged over runs) is a template for skill A/B tests; report per-domain deltas and count of tasks with negative deltas, since averages hide harm. — [SkillsBench](https://arxiv.org/html/2602.12670v1)
- Report accuracy vs cost Pareto frontier; small accuracy gains can carry large cost (HAL commentary example: +2% at ~10x cost). — [HAL](https://hal.cs.princeton.edu/); [AI Snake Oil](https://aisnakeoil.com/p/ai-leaderboards-are-no-longer-useful)
- Beyond pass rate: partial credit, early-quitting behavior, token efficiency. — [NeurIPS 2026 poster](https://neurips.cc/virtual/2026/175739)

### Inferences
- Suggested metric table per variant (mean ± 95% CI, n tasks × k trials):
  - Effectiveness: pass@1, pass^3, partial credit, Δ vs no-skill baseline, # tasks with negative Δ.
  - Triggering: trigger precision/recall (did the right skill load? wrong skills loaded?).
  - Tokens: L1 fixed tokens/turn, L2+L3 skill tokens/task, total input (uncached / cache-write / cache-read), output tokens.
  - Cost: $/task = Σ(tokens × price × cache multiplier); **cost-per-success = total $ / # successful tasks**.
  - Agent behavior: tool calls/task, turns/task, reference files read/task.
  - Latency: TTFT, wall-clock per task (p50/p95).
  - Factual quality (from Part A): claim error rate of loaded content.
- Statistics: paired comparison on same tasks (paired bootstrap or McNemar for pass/fail); report CIs; avoid declaring wins under the noise floor.

### Gaps
- No authoritative source found prescribing a specific statistical test for agent variant comparison (Anthropic post explicitly gives none); paired bootstrap/McNemar suggestion is standard practice, not sourced here.
