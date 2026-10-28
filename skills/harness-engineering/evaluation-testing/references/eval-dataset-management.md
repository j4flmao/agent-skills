# Evaluation Dataset Management for LLM and Agent Systems

How to build, version, label, split and maintain the datasets used to evaluate LLM applications and agents, so evaluation results stay trustworthy as prompts, models and products change.

## Dataset Types

| Type | Contents | Purpose |
|---|---|---|
| Golden set | Curated inputs with reference outputs or rubrics | Regression gate in CI |
| Production sample | Real (sanitized) traffic, stratified | Measures real-world quality |
| Adversarial / red-team | Jailbreaks, prompt injection, edge cases | Safety and robustness |
| Capability probes | Targeted skills (tool selection, long context, math) | Diagnose specific weaknesses |
| Synthetic | LLM-generated cases, then human-reviewed | Coverage for rare scenarios |

## Record Schema

```json
{
  "id": "faq-0142",
  "input": {"messages": [{"role": "user", "content": "How do I rotate my API key?"}]},
  "context": {"retrieved_doc_ids": ["kb-77", "kb-80"]},
  "reference": {"answer": "Go to Settings > API Keys and click Rotate...", "must_include": ["Settings", "Rotate"]},
  "rubric": "Answer must give the navigation path and warn that the old key stops working.",
  "tags": ["faq", "account", "en"],
  "difficulty": "easy",
  "source": "production-2026-09",
  "created_at": "2026-10-02",
  "label_provenance": {"labeler": "support-team", "reviewed_by": "qa-lead", "agreement": 1.0},
  "split": "test"
}
```

Required fields: stable `id`, input, either a reference or a rubric, tags for slicing, source and provenance.

## Building the Set

1. Define the task taxonomy (intents, user segments, languages, tool paths) and target coverage per slice.
2. Seed from production logs: sample stratified by slice, de-duplicate (exact and near-duplicate via embeddings), remove PII.
3. Add known failures from incidents and user reports; every fixed bug becomes a test case.
4. Add adversarial cases (prompt injection via retrieved content, refusals that should and should not happen).
5. Use synthetic generation for gaps; review each synthetic case before admission.
6. Label with guidelines; double-label a sample to measure agreement.

## Labeling Quality

| Practice | Detail |
|---|---|
| Written guidelines | Examples of good/bad answers per rubric item |
| Inter-annotator agreement | Cohen's/Fleiss' kappa or Krippendorff's alpha on overlap sample; revise guidelines when low |
| Adjudication | Disagreements resolved by a senior reviewer, recorded |
| Calibration of LLM judges | Compare judge scores with human labels on a held-out sample before trusting the judge |

## Splits and Leakage

- `dev` for prompt iteration, `test` for gating decisions, optional `holdout` touched rarely (e.g. quarterly) to detect overfitting to `test`.
- Never tune prompts or few-shot examples on `test`; few-shot examples must not appear in any eval split.
- Keep near-duplicates in the same split.
- For fine-tuning, ensure eval items are excluded from training data (hash-based exclusion lists).

## Versioning

- Store datasets as immutable versioned artifacts (JSONL in object storage with content hash, DVC, Hugging Face datasets with revisions, or an eval platform's dataset versions).
- Every eval result records dataset name + version + hash, model ID, prompt version and judge version.
- Changes go through review: added/removed items, label changes with reasons (changelog).

```text
datasets/support-faq/
  v7/data.jsonl        sha256: 3f1a...
  v7/CHANGELOG.md      +38 cases (billing slice), 4 labels corrected (#412)
```

## Size and Statistical Power

- Small sets give wide confidence intervals; report intervals (bootstrap) rather than single numbers.
- To detect a change of a few percentage points in pass rate reliably, you typically need several hundred items per compared slice; compute the required size for your expected effect rather than guessing.
- Use paired comparisons (same items, old vs new system) to reduce variance.

## Maintenance

| Trigger | Action |
|---|---|
| Product change (new feature, policy) | Add/retire cases; update rubrics |
| Saturation (near 100 % pass) | Add harder cases; the set no longer discriminates |
| Drift in production traffic | Refresh production sample quarterly |
| Label error found | Fix with changelog entry, bump version |
| Data retention / deletion request | Remove affected items; bump version |

## Privacy and Security

- Remove or pseudonymize PII before items enter datasets; record consent/legal basis where needed.
- Access control on datasets that contain sensitive business content.
- Red-team datasets may contain harmful prompts: store with restricted access and clear labeling.

## Checklist
- [ ] Taxonomy and coverage targets per slice
- [ ] Records with stable IDs, reference or rubric, tags and provenance
- [ ] Labeling guidelines with measured agreement
- [ ] dev/test/holdout splits without leakage
- [ ] Immutable versions with changelog; results tied to dataset hash
- [ ] Confidence intervals and paired comparisons in reports
- [ ] Scheduled refresh and saturation checks
