# Token Management

## Token Budgeting

### Understanding Token Costs
Each token represents roughly 4 characters of English text or approximately 3/4 of a word. Different language models have different context window sizes:

| Model | Context Window | Recommended Compressed Summary Size |
|---|---|---|
| Claude 4 Sonnet | 200K tokens | 50 lines (~400 tokens) |
| Claude 3.5 Sonnet | 200K tokens | 50 lines (~400 tokens) |
| GPT-4 Turbo | 128K tokens | 75 lines (~600 tokens) |
| GPT-4o | 128K tokens | 75 lines (~600 tokens) |
| Gemini 1.5 Pro | 1M tokens | 100 lines (~800 tokens) |
| Llama 3 70B | 8K tokens | 30 lines (~250 tokens) |

The compressed summary should never exceed 10% of the model's context window to leave room for the actual work content. For most models, 50 lines is the safe maximum.

### Budget Allocation
Within the 50-line budget, allocate tokens proportionally to importance:

| Section | Target Lines | Tokens | Notes |
|---|---|---|---|
| Decisions | 20 | ~160 | Preserve every decision with rationale |
| Files Changed | 10 | ~80 | Path, change description, line ranges |
| Current State | 1 | ~8 | Single line, no exceptions |
| Next Steps | 10 | ~80 | Numbered, actionable, dependency-ordered |
| Open Questions | 9 | ~72 | Include even if empty ("None") |

Total: 50 lines, ~400 tokens. This leaves 85-95% of the context window for the actual work.

## Context Window Optimization

### Token-Efficient Formatting Rules
- Use `- ` for bullets instead of `* ` or numbered lists (saves 1 character per item).
- Use `→` (single Unicode character) instead of `->` or `→` (saves 1-2 characters).
- Use `=` over `equals` or `is set to`.
- Use forward slashes for paths: `src/auth/middleware.ts` not `src/auth/middleware.ts:1-50` when line ranges aren't critical.
- Omit trailing periods on all lines.
- Omit spaces after colons in key-value pairs: `PORT=3000` not `PORT: 3000`.
- Use tab characters for indentation where the format allows (tabs are 1 token, spaces can be 1 token each if consecutive spaces form words).

### Structural Optimization
- Remove all blank lines between bullets — each blank line costs 1 token.
- Use comma-separated lists instead of separate bullets where items are related: `FEAT_FLAGS: new-dash=enabled, dark-mode=disabled` instead of two separate items.
- Combine related file changes: `src/auth/*.ts` instead of listing each auth file separately.
- Use `et al.` for long lists of similar items: `updated deps: lodash, express, axios et al. (7 total)`.

### Compression Footer
Every compressed output ends with a single-line footer for traceability:
```
— comp: core-context-compressor/v1 | lines=42/50 | tokens=~340 | ts=<ISO-timestamp>
```

The footer does not count toward the 50-line limit but must not exceed 1 line. It includes the skill version, line count, estimated token count, and timestamp.

## Relevance Ranking

### Scoring Algorithm
Each piece of information is scored on 3 dimensions:

1. **Recency** (0-10): How recently was this information created or confirmed? Information from the last 5 exchanges scores 10. Information from exchanges 6-15 scores 7. Information from earlier exchanges scores 4. Information from a previous session scores 2.

2. **Impact** (0-10): How much does this information affect future work? Critical decisions score 10. Configuration values score 8. File changes score 5. Progress updates score 2.

3. **Dependency** (0-10): How many subsequent decisions depend on this information? Foundational decisions score 10. Derived decisions score 5. Terminal decisions (no dependents) score 2.

**Total score** = Recency * 0.3 + Impact * 0.4 + Dependency * 0.3

### Threshold-Based Inclusion
- Score >= 8: Always include regardless of budget.
- Score >= 5: Include if space permits after including all score >= 8 items.
- Score < 5: Include only if there is remaining space after all higher-scoring items.

### Round-Trip Safety Check
After producing the compressed summary, test round-trip safety:
1. Remove the compressed summary from view.
2. Ask: "What was the most important decision made?" — answer should be immediately apparent from the Decisions section.
3. Ask: "What do I need to do next?" — answer should be immediately apparent from the Next Steps section.
4. Ask: "What's blocking me?" — answer should be immediately apparent from the Open Questions section.
5. Ask: "What files did I change?" — answer should be immediately apparent from the Files Changed section.

If any question cannot be answered from the summary alone, the compression is not round-trip safe and needs revision.

## Line Counting Standards

### What Counts as a Line
- Every line of text in the output counts toward the 50-line limit.
- Blank lines between sections count.
- The ## section headers count.
- The compression footer does NOT count (it is appended after the line count is verified).
- Inline code blocks count as their constituent lines.
- Table rows count as individual lines (header + separator + each data row).

### Line Counting Technique
After writing the summary, count lines explicitly:
```
$summary = @"..."@
$lines = $summary -split "`n"
$lineCount = $lines.Count
if ($lineCount -gt 50) { "OVER LIMIT: $lineCount lines — compress further" }
else { "WITHIN LIMIT: $lineCount/50 lines" }
```

## Context Budget Monitoring

### When to Compress
Compression is needed when any of these conditions is met:
- The conversation has exceeded 30 exchanges (regardless of tokens).
- The user explicitly requests compression.
- The assistant detects degraded response quality (hallucination, repetition, or irrelevant tangents).
- The estimated context usage exceeds 70% of the model's context window.
- A new work session begins and the previous summary was not carried over.

### Compression Cadence
| Session Type | Compression Frequency |
|---|---|
| Single short session (< 20 exchanges) | Not needed |
| Single long session (20-50 exchanges) | Once at end |
| Single very long session (50+ exchanges) | Every 20-30 exchanges + at end |
| Multi-session work | At session start (merge previous summary) |
| Debugging/analysis session | At each major finding |
| Code generation session | At each file completion |

### Token Budget Reallocation
When compressing at mid-session (not at handoff), the compressed summary should be smaller than the handoff summary because the current agent continues working:
- Mid-session: 30 lines max (240 tokens) — only decisions and open questions.
- End-of-session: 50 lines max (400 tokens) — full 5-section format.
- Session start (merge mode): 50 lines max — full format with merged history.

## Footer Format

### Standard Footer
```
— comp: core-context-compressor/v1 | lines=42/50 | tokens=~340 | ts=2026-05-23T14:30:00Z
```

### Footer Fields
| Field | Description | Example |
|---|---|---|
| `comp` | Skill identifier | `core-context-compressor/v1` |
| `lines` | Line count out of budget | `42/50` |
| `tokens` | Estimated token count | `~340` |
| `ts` | ISO 8601 timestamp | `2026-05-23T14:30:00Z` |

Footer is a single line, always appended as the final line of the output. It does NOT count toward the 50-line limit.

## Summary Quality Metrics

### Self-Evaluation Questions
After writing the compressed summary, evaluate:
1. Completeness: Are all critical decisions preserved? (Score 0-10)
2. Clarity: Can a new reader understand the state without additional context? (Score 0-10)
3. Actionability: Are all next steps specific and ordered correctly? (Score 0-10)
4. Brevity: Is the summary under 50 lines? (Pass/Fail)
5. Round-trip: Can the work continue without reviewing full history? (Pass/Fail)

### Quality Thresholds
- **Acceptable**: Completeness >= 7, Clarity >= 7, Actionability >= 7, Brevity = Pass, Round-trip = Pass
- **Good**: All scores >= 8
- **Excellent**: All scores >= 9

If the summary fails any threshold, revise before delivering.
