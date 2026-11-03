# Evaluating skill/tool triggering and routing accuracy for agent skill libraries

Scope: methods, metrics and dataset design for checking whether an agent picks the right skill from a prompt. Target is the j4flmao/skills repo: 641 SKILL.md files, many of them near-duplicates. Research date: 2026-11-03. Primary sources are Anthropic, agentskills.io and OpenAI docs, plus local skill-creator scripts. Benchmark numbers marked "secondary" were not checked against the original paper.

Measured locally on this repo (Python over `skills/**/SKILL.md`, 2026-11-03):
- 641 SKILL.md files. All have a `description`.
- Description lengths: 319,177 characters in total, median 530, max 1,152. At least one description is over the 1,024-character spec limit.
- Descriptions already use the "Use this skill when the user says ... Do NOT use for: X (path)" pattern. Example: `skills/ai/agentic-workflows/SKILL.md`.

## 1. How Anthropic (and peers) recommend testing skill descriptions/triggering: formats and commands

### Takeaway
Anthropic offers two official, incompatible ways to test triggering.
- **skill-creator's description-optimization loop** uses a `[{query, should_trigger}]` JSON file with about 20 queries, runs each query 3 times through `claude -p` with a 0.5 trigger-rate threshold, splits the set 60/40 train/test, and runs up to 5 iterations, choosing the description by its test score.
- **`claude plugin eval`** uses one case directory per prompt (`prompt.md` plus `graders/*.md`) with a `tool_used: Skill` grader. It runs 3 times per arm with a no-plugin baseline and is CI-gateable.

Both measure one skill at a time (binary trigger or no trigger). Neither does N-way routing or confusion analysis across many skills, so a 641-skill library needs a custom harness.

### Cited Findings

**skill-creator (anthropics/skills) description optimization**
- Eval set format: a JSON array of `{"query": "...", "should_trigger": true|false}`. Use 20 queries in total, 8–10 should-trigger and 8–10 should-not-trigger — [skill-creator SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md)
- Negatives should be near-misses: queries that "share keywords or adjacent concepts but need a different tool". Avoid obviously irrelevant negatives. Positives should include cases where the skill "competes with another but should win" — [skill-creator SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md)
- Loop command: `python -m scripts.run_loop --eval-set <json> --skill-path <dir> --model <model-id> --max-iterations 5 --verbose`. It splits 60% train / 40% held-out test, runs each query 3 times, and picks `best_description` by test score, not train score, to avoid overfitting — [skill-creator SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md)
- Local copy of `scripts/run_eval.py` (Anthropic skill-creator plugin bundled in this environment):
  - CLI flags: `--eval-set`, `--skill-path`, `--description` (override), `--num-workers` (default 10), `--timeout` (default 30 s), `--runs-per-query` (default 3), `--trigger-threshold` (default 0.5), `--model`, `--verbose`.
  - Detection: it injects the skill into the available-skills list and runs `claude -p --output-format stream-json --include-partial-messages`. A query counts as triggered when a `Skill` tool_use names the skill, or a `Read` targets the skill file. Detection happens early, from stream events.
  - Pass rule: a should-trigger query passes if trigger_rate ≥ threshold; a should-not-trigger query passes if trigger_rate < threshold.
  - `run_loop.py`'s `split_eval_set` is stratified by `should_trigger` with seed 42, and holds out at least 1 query per class.
  - Source: local file `skill-creator/scripts/run_eval.py`, `run_loop.py` (no URL; same code lives in [anthropics/skills skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator)).
- skill-creator advises "pushy" descriptions because "Claude tends to undertrigger skills", and says to put all "when to use" information in the description, not the body. Claude skips skills for simple one-step tasks, so trigger queries must be substantive enough — [skill-creator SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md)
- Known pitfall: a community issue tracker reports that `claude -p` did not trigger skills in the skill-creator loop, which gave 0% recall. The issue was reportedly closed in June 2026. A second report links non-triggering to heavy configs (40+ skills plus MCP servers) that dilute the system prompt. Secondary source, not verified on GitHub — [claudeissues #36570](https://claudeissues.com/issue/36570-claude-p-does-not-trigger-skills-skill-creator-eval-loop-always-shows-0-recall); [claudeissues #34648](https://claudeissues.com/issue/34648-skills-never-trigger-in-p-mode-with-heavy-config-40-skills-mcp-servers)

**agentskills.io (open Agent Skills spec site): "Optimizing skill descriptions"**
- Same recipe as skill-creator: about 20 queries (8–10 positive, 8–10 negative), 3 runs per query, trigger-rate threshold 0.5, train about 60% / validation about 40% with a proportional class mix, a fixed split across iterations, and selection of the best iteration by validation pass rate. "Five iterations is usually enough." After selection, write 5–10 fresh queries as a final honest check — [agentskills.io optimizing-descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)
- Anti-overfitting and leakage guidance: "Avoid adding specific keywords from failed queries — that's overfitting. Instead, find the general category." The most useful positives are those where "the connection isn't obvious from the query alone". Weak negatives such as "Write a fibonacci function" test nothing — [agentskills.io](https://agentskills.io/skill-creation/optimizing-descriptions)
- Reference detection script: `claude -p "$query" --output-format json | jq 'any(.messages[].content[]; .type=="tool_use" and .name=="Skill" and .input.skill==$skill)'`. It also suggests early-stopping a run once the outcome is clear — [agentskills.io](https://agentskills.io/skill-creation/optimizing-descriptions)
- The spec sets a hard limit of 1024 characters for `description` — [agentskills.io](https://agentskills.io/skill-creation/optimizing-descriptions)

**`claude plugin eval` (Claude Code ≥ v2.1.269)**
- Case layout: `evals/<case>/prompt.md` (frontmatter `allowed_tools: [Read, Glob, Grep, Skill]`), `graders/*.md`, and an optional `case.yaml` (`schema_version: "1.1"`). `claude plugin eval init` proposes cases interactively, including prompts that should and shouldn't trigger. `claude plugin eval init --bare <name>` writes a blank template — [Claude Code docs: plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Skill-fired grader: `type: tool_used`, `tool: Skill`, `input_match: '"skill"\s*:\s*"(?:[\w-]+:)?your-skill-name"'`. For "must NOT invoke" checks, use `min: 0`, `max: 0` with `arm: both` — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Grader types: `regex`, `tool_used`, `tool_order` and `file_exists` are free. `llm` and `baseline` call a judge model. There are no custom-code graders — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Scoring:
  - Each case runs 3 times by default per arm. A with-plugin and a no-plugin baseline give Δ.
  - Case score is the mean over runs of the fraction of graders passed. `--threshold` defaults to 1.0. Exit codes: 0 pass, 1 fail, 2 partial or cost-capped.
  - `tool_used: Skill` graders count as unscored "plugin-fired indicators" in two-arm runs, so they don't inflate Δ.
  - Source: [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- The docs say the most common first finding is "Δ near zero with the case's `tool_used: Skill` grader failing", meaning Claude isn't choosing the skill on natural phrasing — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- CI example: `--trust-plugin --json results.json --threshold 0.8 --model <pinned> --judge-model <pinned> --no-publish --max-cost-usd 20`. Other flags: `--runs`, `-j/--concurrency` (1–8), `--ablation none|with-without`, `--case <glob>`, `--tag`, `--eval-dir`. Output is `aggregate-result.json` (`schemaVersion: 1`) plus `report.html` — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- skill-creator's `evals/evals.json` and the `claude plugin eval` case format are not interchangeable. "neither tool reads the other's case files" — [plugin evals](https://code.claude.com/docs/en/plugin-evals); [Claude Code skills docs](https://code.claude.com/docs/en/skills)
- Third-party option: `sjnims/cc-plugin-eval`, an MIT-licensed 4-stage framework. It tests skill/agent/command/hook/MCP activation with direct triggers, paraphrases, edge cases and negatives, using programmatic detection plus an LLM judge — [GitHub cc-plugin-eval](https://github.com/sjnims/cc-plugin-eval)

**Claude Code listing mechanics (critical at 641 skills)**
- Claude matches the request against `description` plus `when_to_use`. The combined text is truncated at 1,536 characters per skill (`skillListingMaxDescChars`) — [Claude Code skills docs](https://code.claude.com/docs/en/skills)
- "The listing always contains every skill name, but if you have many skills, Claude Code drops some descriptions to fit the listing's character budget". The budget is "1% of the model's context window". Descriptions are dropped starting from the least-invoked skills. You can raise it with `skillListingBudgetFraction` (e.g. 0.02) or `SLASH_COMMAND_TOOL_CHAR_BUDGET`, or set low-priority skills to `"name-only"` in `skillOverrides`. `/doctor`, `/skill-doctor` and `/context` report the cost — [Claude Code skills docs](https://code.claude.com/docs/en/skills)
- Official troubleshooting: for "not triggering", add keywords users would naturally say and check `What skills are available?`. For "triggers too often", make the description more specific or set `disable-model-invocation: true` — [Claude Code skills docs](https://code.claude.com/docs/en/skills)

**Peers**
- OpenAI Codex/ChatGPT skills:
  - Selection is implicit (description match) or explicit (`$skill`, `/skills`, `@`). The docs advise putting "the key use case and trigger words first" so matching survives shortening.
  - The initial list budget is at most 2% of the context window, or 8,000 characters if the window is unknown. It is adjustable via `skills.max_context_tokens` up to 10,000 tokens. With many skills, Codex shortens descriptions and "may omit some skills" with a warning.
  - `agents/openai.yaml` has `policy.allow_implicit_invocation` (default true).
  - No formal eval process is documented, only "test prompts against the skill description".
  - Source: [OpenAI build-skills docs](https://learn.chatgpt.com/docs/build-skills) (redirected from developers.openai.com/codex/skills)
- Cursor rules: rule types are Always Apply (`alwaysApply: true`), Apply Intelligently (`description` only, and the agent decides), Apply to Specific Files (`globs`), and Apply Manually (@-mention). No testing method is documented — [Cursor rules docs](https://cursor.com/docs/context/rules)

### Inferences
- **The budget math is the biggest finding for this repo.**
  - The 641 descriptions total about 319K characters. A budget of 1% of a 200K-token window is about 2K tokens, roughly 8K characters. Even a 1M window gives only about 40K characters at roughly 4 characters per token. The docs do not state whether the budget is counted in characters or tokens; this is an assumption.
  - So if all 641 were installed as native Claude Code skills, most descriptions would be dropped and Claude would route mostly by name. Codex's ≤10K-token cap gives the same picture.
  - Routing accuracy therefore depends heavily on skill names, and on which skills keep their descriptions. Any eval must run under the real listing budget, not with all descriptions injected as skill-creator does for a single skill.
- The repo currently routes through `CLAUDE.md` and `rules/routing.md` keyword maps plus `master-orchestrator`, not through native `.claude/skills` discovery. Eval two systems separately: (a) the keyword router (deterministic and testable offline), and (b) native description-based triggering if skills are ever installed as a plugin.
- skill-creator's 20-query / 3-run recipe gives 60 calls per skill. For 641 skills that is about 38K `claude -p` calls per pass, so a full per-skill pass is expensive. Use stratified sampling plus tiering (see §3 and §5).
- The `claude plugin eval` `tool_used: Skill` grader with `input_match` and `min/max` can encode "skill A fired AND skill B did not fire". This is the closest built-in primitive for confusable pairs.

### Gaps
- No Anthropic doc found that defines multi-skill routing metrics (top-k, confusion matrix) or recommends a number of skills.
- Units and exact numbers of the "1% of context" listing budget for a given model were not stated in the fetched text.
- No published Anthropic numbers on skill trigger accuracy as a function of the number of installed skills.
- Cursor docs do not mention SKILL.md support in the fetched page. Status unverified.

## 2. Metrics: per-skill P/R/F1, top-k, false-trigger rate, confusion among confusables, abstain cases

### Takeaway
Public tooling reports only per-query trigger rate and pass rate. Benchmarks add two ideas worth borrowing:
- relevance and irrelevance detection: BFCL's separate "should call" and "should abstain" scores;
- a similar-choices subtask and "None" reliability: MetaTool's Correct Selection Rate.

For 641 skills, combine per-skill precision/recall/F1, top-1 and top-k routing accuracy, a no-skill false-trigger rate, and a confusion matrix restricted to confusable clusters.

### Cited Findings
- skill-creator and agentskills.io metric: per-query trigger_rate = triggers/runs, a 0.5 threshold, and a pass rate on train and validation — [agentskills.io](https://agentskills.io/skill-creation/optimizing-descriptions); [skill-creator](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md)
- `claude plugin eval` reports per-case WITH, W/OUT and Δ, suite score, cases passing threshold, and "perfect runs" (the share of runs where every grader passed) — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- BFCL reports relevance detection (calls when needed) and irrelevance detection (correctly abstains on "no_call" cases) separately. EvalScope lists BFCL v4 subsets `irrelevance` (240 samples), `live_irrelevance` (884) and `live_relevance` (only 16). Leaderboard rows show trade-offs such as relevance 100% vs irrelevance 56%. Secondary sources; official Gorilla docs not fetched — [EvalScope BFCL v4](https://evalscope.readthedocs.io/en/latest/benchmarks/bfcl_v4.html); [benchmarklist example](https://benchmarklist.com/models/amazon-nova-2-lite-v1-0/)
- MetaTool (ICLR 2024) subtasks: similar choices, specific scenarios, reliability issues (correct answer "None" when no tool fits), and multi-tool selection. Its metric is the Correct Selection Rate. Most LLMs "struggle with tool usage awareness and reliable tool selection", especially on reliability — [MetaTool arXiv 2310.03128](https://arxiv.org/html/2310.03128v5); [MetaTool GitHub](https://github.com/HowieHwong/MetaTool)
- ToolRet scores tool retrieval with IR metrics such as nDCG@10. A secondary source reports NV-embed-v1 at about 33.83 nDCG@10 (unverified) — [ToolRet summary](https://aitopics.org/doc/arxivorg:DCB3A6F3)

### Inferences
Recommended metric set for this repo:
- **Per skill (multi-class over 641 classes plus a NONE class):**
  - precision = correct triggers of S / all triggers of S;
  - recall = correct triggers of S / prompts labeled S;
  - F1;
  - report the macro-average (each skill weighted equally) and the micro-average.
- **Routing:** top-1 accuracy, top-k accuracy (k=3,5) when the router returns a ranked list (embedding or keyword router), and MRR.
- **Multi-label:** some prompts legitimately need 2 skills, such as caching plus Redis. Use set-based precision and recall, or "any acceptable skill" labels with a primary/acceptable distinction.
- **Abstain / false trigger:** on a NONE set (generic chit-chat, tasks the base model handles), measure false-trigger rate = fraction of prompts that fire any skill. Separately, measure wrong-skill rate on in-domain prompts.
- **Confusables:** build a confusion matrix only within clusters, e.g. {backend/universal/caching, backend/caching-strategies, frontend/universal/browser-caching}. Report pairwise confusion rate C[A→B]. Flag a pair when C > 10–20%, or when the pair is asymmetric. Name-collision clusters already visible in the routing map: `devops/chaos-engineering` vs `site-reliability-engineering/chaos-engineering` vs `quality-assurance/testing-strategies/chaos-engineering`; `devops/gitops` vs `devops/gitops-advanced` vs `cloud-native/gitops` vs `cloud-native/gitops-workflows`; `data/etl-pipeline` vs `data/etl-pipelines`; `ml/feature-store` vs `data/feature-store`.
- **Stability:** trigger rate variance over 3+ runs. Report the share of "flaky" prompts, those with rate strictly between 0 and 1.
- **Cost:** tokens of the listing (`/context` Skills row) next to accuracy, because adding descriptions trades context for recall.

### Gaps
- No standard published metric was found specifically for "skill library routing" with hundreds of skills. The metrics above are adapted from classification and IR practice.
- No acceptance thresholds from authoritative sources for per-skill F1 or false-trigger rate.

## 3. Building positive, negative and near-miss prompt sets; size; synthetic vs human; keyword leakage

### Takeaway
Official guidance:
- about 20 queries per skill (8–10 positive, 8–10 near-miss negatives);
- realistic detail, with paths, context and typos;
- vary explicitness, so many positives don't name the domain;
- a fixed stratified 60/40 split;
- never copy failed-query keywords into the description.

For a 641-skill library, add cluster-level near-miss sets and a shared NONE set. Generate synthetically with an LLM, then have humans review: skill-creator has a review HTML step, and `plugin eval init` proposes cases interactively.

### Cited Findings
- Vary positives on phrasing (formal, casual, typos), explicitness (names the domain or only describes the need), detail, and complexity (the skill buried in a multi-step chain). The most valuable positives are those where "the connection isn't obvious from the query alone" — [agentskills.io](https://agentskills.io/skill-creation/optimizing-descriptions)
- Negatives: the most valuable are "near-misses — queries that share keywords or concepts with your skill but actually need something different". Example: for a CSV-analysis skill, "update the formulas in my Excel budget" and "python script that reads a csv and uploads each row to postgres" are good negatives — [agentskills.io](https://agentskills.io/skill-creation/optimizing-descriptions)
- skill-creator generates the set with Claude, then has the user edit it in `assets/eval_review.html` and export `eval_set.json`. That is synthetic generation followed by human review — [skill-creator SKILL.md](https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md)
- `claude plugin eval init`: Claude "proposes prompts that should and shouldn't trigger the plugin, designs graders for each, runs them once as a trial". Prompts should be phrased "the way a user would type it rather than naming the skill" — [plugin evals](https://code.claude.com/docs/en/plugin-evals)
- Leakage and overfitting: "Avoid adding specific keywords from failed queries". Keep validation results out of the revision process. Pick the best iteration by validation score. Finally test 5–10 fresh queries — [agentskills.io](https://agentskills.io/skill-creation/optimizing-descriptions)
- Simple one-step tasks may not trigger a skill even with a perfect description, because the agent handles them with basic tools. Positives must need specialized knowledge — [agentskills.io](https://agentskills.io/skill-creation/optimizing-descriptions)
- MetaTool builds "similar choices" items by pairing the ground-truth tool with semantically similar alternatives. It also has a "None" option for reliability — [MetaTool](https://arxiv.org/html/2310.03128v5)

### Inferences
Dataset design for 641 skills:
- **Three tiers:**
  - T1 (all 641 skills): 3–5 positives each, about 2–3K prompts, for a cheap routing sanity pass.
  - T2 (confusable clusters, likely 50–100 clusters): 8–10 positives per member plus cross-labeled near-misses. Each member's positives are the other members' negatives, so near-miss sets come almost free.
  - T3 (high-traffic or critical skills): the full skill-creator 20-query recipe with train/validation split.
- **Shared NONE set:** about 100–200 prompts that should trigger nothing, such as trivial edits, chit-chat and one-step reads, to measure false triggers globally.
- **Leakage controls:**
  - Generate prompts from a task or scenario description, not from the SKILL.md description text.
  - Forbid the skill name and its listed trigger keywords in at least about 50% of positives. The repo's descriptions literally list "Use this skill when the user says 'X', 'Y'", so keyword-echo prompts inflate scores.
  - Measure n-gram or BM25 overlap between each prompt and its target description, and report accuracy bucketed by overlap. Low-overlap accuracy is the honest number.
- **Sources:** mine real prompts where available (session logs, GitHub issues). Use LLM synthesis with a different model family from the one under test to reduce self-agreement bias, then human spot-review about 10–20%. Label multi-skill prompts with primary and acceptable skills.
- **Splits:** stratify by cluster. Keep the validation split frozen. Hold out whole paraphrase families, not individual variants, to avoid near-duplicate leakage between train and validation.

### Gaps
- No empirical source found on the optimal number of prompts per skill for statistical power at the library scale. 20 is a heuristic from Anthropic and agentskills.io for one skill.
- No published comparison of synthetic vs human-written trigger prompts for skills specifically.

## 4. Research on tool-selection accuracy vs number of tools, and implications for 600+ skills

### Takeaway
Evidence consistently shows selection accuracy falls as candidate count and similarity rise. The fixes are retrieval and deferred loading:
- Anthropic's Tool Search Tool raised MCP-eval accuracy from 49%→74% (Opus 4) and 79.5%→88.1% (Opus 4.5).
- RAG-MCP reports 43.13% vs 13.62%.
- ToolRet shows standard retrievers are weak at tool retrieval.

For 641 skills, plan retrieval-first routing and evaluate the retriever (recall@k) separately from the model's final pick.

### Cited Findings
- Anthropic: "The most common failures are wrong tool selection and incorrect parameters, especially when tools have similar names like `notification-send-user` vs. `notification-send-channel`". With Tool Search Tool, Opus 4 went from 49% to 74% and Opus 4.5 from 79.5% to 88.1% on MCP evals. Token use fell from about 77K to about 8.7K (−85%). 58 tools across 5 servers took about 55K tokens. Tool use examples improved complex-parameter accuracy from 72% to 90% — [Anthropic engineering: advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use)
- Tool search docs: `defer_loading: true`, regex and BM25 variants. Keep the 3–5 most-used tools non-deferred — [Claude docs: tool search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)
- RAG-MCP (Gan & Sun, arXiv 2505.03275, May 2025): retrieving relevant MCP descriptions before prompting raised selection accuracy from 13.62% to 43.13% and cut prompt tokens from 2133.84 to 1084 on MCPBench web-search tasks — [arXiv 2505.03275](https://arxiv.org/html/2505.03275v1). The scaling figures (85% at 5 tools → 45% at 20 for the baseline; RAG-MCP 80%+ at 50 tools) come from a secondary summary only — [alphaXiv overview](https://www.alphaxiv.org/overview/2505.03275v1)
- ToolRet (Findings of ACL 2025): 7.6k retrieval tasks over a 43k-tool corpus. Strong conventional IR models "exhibit poor performance", and low retrieval quality degrades end-task pass rate. The authors release a 200k+ training set — [ToolRet summary](https://aitopics.org/doc/arxivorg:DCB3A6F3)
- MetaTool: LLMs struggle with selection among similar tools and with saying "None" — [MetaTool](https://arxiv.org/html/2310.03128v5)
- "Less is More" (arXiv 2411.15399, 2024): giving the model fewer, relevant tools via LLM-guessed descriptions plus similarity search improved success rates, with up to 70% less execution time and 40% less power on edge devices — [arXiv 2411.15399](https://arxiv.org/html/2411.15399v1)
- MCP-Atlas (arXiv 2602.00933, 2026): 36 real MCP servers, 220 tools. Errors cluster in tool usage, including incorrect server selection — [MCP-Atlas](https://arxiv.org/html/2602.00933v1)
- Practitioner claims (unverified, blog-level):
  - Haiku 4.5 at 91% with 10 tools falling to 87% with 15; Sonnet 4 at ≥90% up to 20 tools, below 90% by 30;
  - "knee" estimates of about 30–50 tools.
  - Sources: [alphasignal substack](https://alphasignalai.substack.com/p/why-your-mcp-server-picks-the-wrong); [archestra blog](https://archestra.ai/blog/how-many-mcp-tools-too-many)
- Anthropic tool-search accuracy figures are first-party but internal, with no released eval set. Model versions (Opus 4 / 4.5) are about a year old relative to Nov 2026 — [Anthropic engineering](https://www.anthropic.com/engineering/advanced-tool-use)

### Inferences
- 641 skills is about 10–20× past every reported "knee" (20–50 tools). Skills are lighter than tool schemas because only name and description are shown, but Claude Code's listing budget already forces name-only entries at this scale (see §1). Expect strong degradation unless routing is hierarchical (category first, then skill) or retrieval-based (BM25 or embeddings over descriptions, then the model picks from the top-k).
- Evaluate a two-stage router as two numbers:
  - retriever recall@k: is the gold skill in the top-k?
  - conditional selection accuracy: given gold in the candidates, did the model pick it?
  End-to-end accuracy ≈ recall@k × conditional accuracy. This shows whether to fix descriptions (stage 2) or indexing and names (stage 1).
- Near-duplicate skills hurt both stages, as MetaTool's similar-choices result and Anthropic's similar-names failure show. Merging or clearly differentiating confusable clusters likely beats tuning descriptions alone.

### Gaps
- No controlled study found that sweeps the number of skills (as opposed to tools) into the hundreds with SKILL.md-style progressive disclosure.
- Official Gorilla BFCL v4 docs and the exact current leaderboard weighting were not fetched. BFCL details are secondary.
- The ToolBench (ToolLLM) retriever numbers were not retrieved in this session.

## 5. Cheap offline proxies (embedding similarity, keyword overlap) vs live-model trigger tests

### Takeaway
Offline proxies are cheap enough to run on all 641×641 pairs and every PR. Use them to find confusable clusters, lint descriptions and score the keyword or embedding router. They do not predict what Claude actually triggers, because live triggering depends on listing truncation, model judgment and the "simple tasks skip skills" behavior. Use offline proxies as a filter and live `claude -p` / `claude plugin eval` runs as ground truth on sampled prompts.

### Cited Findings
- Anthropic's Tool Search ships BM25 and regex search variants. These are lexical retrievers Anthropic considers good enough for first-stage tool discovery — [tool search tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)
- RAG-MCP: better embedding models for indexing gave better tool-selection accuracy (secondary summary) — [alphaXiv overview](https://www.alphaxiv.org/overview/2505.03275v1)
- ToolRet: general IR embedding models underperform on tool retrieval, so off-the-shelf embedding similarity is an imperfect proxy — [ToolRet summary](https://aitopics.org/doc/arxivorg:DCB3A6F3)
- Live tests capture behavior that proxies miss: Claude skips skills for simple tasks ([agentskills.io](https://agentskills.io/skill-creation/optimizing-descriptions)), and descriptions get dropped under the listing budget ([Claude Code skills](https://code.claude.com/docs/en/skills)). Heavy configs reportedly suppress triggering in `-p` mode ([claudeissues #34648](https://claudeissues.com/issue/34648-skills-never-trigger-in-p-mode-with-heavy-config-40-skills-mcp-servers), secondary).
- Live-test cost: each `plugin eval` case is runs × 2 arms plus judge calls, all billed to the user's plan or API. Free graders (`tool_used`, `regex`) avoid judge cost, and `--ablation none` halves runs — [plugin evals](https://code.claude.com/docs/en/plugin-evals)

### Inferences
Practical pipeline for this repo:
1. **Static lint on every PR, free:**
   - description ≤1,024 characters per the spec (at least one current description is 1,152);
   - key use case in the first about 200 characters, because truncation keeps the start;
   - a "Do NOT use for" clause that references sibling skills;
   - unique `name`.
2. **Confusability map, cheap:**
   - Embed all 641 descriptions with 2 different embedding models. Compute pairwise cosine similarity plus BM25 and Jaccard keyword overlap.
   - Flag pairs above a percentile, e.g. the top 1%, or about 0.85 cosine; calibrate this. Flag name collisions such as identical leaf names in different categories.
   - Output is the list of confusable clusters that drives the T2 dataset.
3. **Offline router eval, cheap:** run the labeled prompt set through the deterministic `routing.md` keyword map and through a BM25 or embedding retriever. Report top-1/top-5 and confusion within clusters.
4. **Live eval, expensive and sampled:** run `claude -p` with stream-json detection (skill-creator `run_eval.py` style) or `claude plugin eval` with `tool_used: Skill` graders.
   - Use a pinned model.
   - Run the real listing configuration: all skills installed, real budget.
   - Cover T2 clusters plus a random sample of T1 and the NONE set. Run 3 times each.
   - Compare live confusions against the offline proxy to check how far the proxy can be trusted.
5. **Regression gate:** re-run 3 and a small live subset whenever a description in a flagged cluster changes. Pin the model so a model rollout isn't mistaken for a regression, as the plugin eval docs advise.

Proxy correlation with live triggering should itself be measured (Spearman between cosine-rank and live confusion rate). No published figure exists.

### Gaps
- No published study found that quantifies correlation between description embedding similarity and live LLM skill confusion.
- Embedding model choice for skill descriptions is not benchmarked in any source found. ToolRet suggests tool-tuned retrievers are needed.
