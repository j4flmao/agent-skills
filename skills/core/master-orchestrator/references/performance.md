# Orchestrator Performance: Latency and Context Budget

For a prompt-level router, "performance" means how many tool calls and tokens a routing pass consumes and how much context it leaves for the routed skill. This reference sets budgets, describes progressive loading, and lists measurements.

## Cost Model

| Cost driver | Why it matters |
|-------------|----------------|
| Tool calls (list, read) | Each adds a round-trip of latency |
| Tokens read into context | Displace room for the routed skill and the user's code |
| Tokens emitted | Templates are short by design (3–6 lines) |
| Re-detection in later skills | Wasted work if handoff context is missing |

## Budgets per Routing Pass

| Item | Budget |
|------|--------|
| Filesystem probes | One listing of `docs/` and the root; one read per relevant manifest |
| Manifests read | Only the ones present; in monorepos only the targeted package |
| Skill files read | Zero `references/`; at most the candidate `SKILL.md` frontmatter to validate |
| Output | ≤ 3 lines (A/B), ≤ 6 lines (C) |

These are policy targets for this repository, not measured benchmarks.

## Progressive Disclosure

Load information in tiers and stop as soon as a decision is possible:

```text
Tier 0  always loaded       routing.md (Quick Map, triggers, stack detection)
Tier 1  routing pass        docs/ listing, manifests
Tier 2  routed skill        target SKILL.md
Tier 3  on demand           target references/*.md relevant to the task
```

The orchestrator stays in Tiers 0–1. Loading a skill's references during routing is the most common waste.

## Efficient Probing

### Batch independent checks
Issue independent existence checks in one round (glob `docs/{brief,prd}*.md`, `docs/{decisions,adr,specs}/`, root manifests) instead of one call per file.

```bash
# POSIX: one call lists all candidates
ls -d docs/brief*.md docs/prd*.md docs/decisions docs/adr docs/specs \
      package.json go.mod Cargo.toml pyproject.toml requirements.txt \
      pom.xml build.gradle build.gradle.kts pubspec.yaml mix.exs 2>/dev/null
```

```powershell
# PowerShell: -Path supports wildcards; -LiteralPath does not
Get-ChildItem -Path docs/brief*.md, docs/prd*.md, package.json, go.mod, Cargo.toml -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty Name
```

### Read only dependency keys
For `package.json`, parse `dependencies` and `devDependencies`; ignore scripts and config blocks.

```bash
node -e "const p=require('./package.json');console.log(Object.keys({...p.dependencies,...p.devDependencies}).join('\n'))"
```

### Avoid tree scans
Never recurse the source tree to infer the stack. Manifests are authoritative; source scanning costs many calls and can still be wrong (vendored or generated code).

## Session Caching

Within one session, detected stack and artifacts do not change unless files are written. Reuse them:

- Record stack and artifacts in the handoff `Context` line.
- Re-probe only after a skill reports writing artifacts (e.g. `planning/create-prd` created `docs/prd.md`).
- In monorepos, cache per package path.

## Output Economy

- No preamble or explanation; the `Reason` line is the only justification.
- Use skill IDs, not full file paths, in templates.
- Template C options are short noun phrases.

## Measuring

Measure on the golden routing set:

| Metric | How |
|--------|-----|
| Tool calls per route | Count from the host's transcript or hook log (`PostToolUse` logging) |
| Input tokens per route | Host usage reporting |
| Routes needing re-detection downstream | Count skills that re-read manifests already in handoff |
| Accuracy | Top-1 match against expected skill |

Compare before/after any change to routing tables or the orchestrator skill. Optimizing tokens at the expense of accuracy is a regression.

## Anti-Patterns

| Anti-pattern | Cost | Fix |
|--------------|------|-----|
| Reading every `SKILL.md` to pick one | Very large context | Route from the table |
| Opening `docs/prd.md` to "understand the project" | Tokens with no routing value | Existence check only |
| Sequential single-file probes | Latency | Batch |
| Long Template C with explanations | Tokens, user friction | 2–4 options |
| Skills re-detecting stack | Duplicate calls | Pass handoff context |

## Checklist

- [ ] Probes batched; manifests only
- [ ] No `references/` loaded during routing
- [ ] Stack/artifacts cached for the session and passed in handoff
- [ ] Output within line limits
- [ ] Token and call counts tracked on the golden set
