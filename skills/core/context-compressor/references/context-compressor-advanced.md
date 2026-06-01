# Context Compressor Advanced Topics

## Multi-Session Context Merging

### Merge Algorithm
When a new session starts with a previous compressed summary plus new conversation history:
1. Extract all decisions from the previous summary
2. Extract all decisions from the new conversation
3. For decisions on the same topic, prefer the newer decision
4. For decisions on new topics, append to the existing list
5. Merge Files Changed by combining both lists (deduplicate by file path)
6. Current State comes from the new conversation (it supersedes the old)
7. Next Steps from old summary that are still pending → carry forward
8. Open Questions: merge and deduplicate, preferring newer phrasing

### Conflict Resolution
When the same decision appears in both old summary and new conversation with different conclusions:
- If the new conversation explicitly mentions changing the decision, the new one wins
- If the new conversation doesn't mention the topic, the old decision stands
- Stale decisions (from old summary, about completed work) are archived as "Completed: {decision}"

## Cross-Skill Context Sharing

### Downstream Skill Requirements
Different skills require different context subsets:
- **Debugging**: Prioritize recent changes, configuration, and reproduction steps
- **Code generation**: Prioritize architecture decisions, file structure, and patterns
- **Code review**: Prioritize changed files, review decisions, and open discussions
- **Deployment**: Prioritize environment config, CI/CD changes, and dependency updates

### Context Injection Strategy
When handing off to another skill, prefix the compressed summary with a skill-specific extract:
```
## Handoff to {skill_name}
{3-5 most relevant bullets from the compressed summary}
```
This allows downstream skills to get what they need without scanning the full summary.

## Token-Optimized Compression

### Variable-Length Encoding
Different 5 sections have different value densities:
- **Decisions**: Highest value-to-token ratio. Never compress below 60% of the first compression pass.
- **Current State**: Extremely high value density (1 line). Perfect.
- **Next Steps**: High value density. Keep as-is.
- **Open Questions**: Critical but typically small. Keep as-is.
- **Files Changed**: Variable value — high for code generation, low for architecture discussions.

### Compression Passes
For very long conversations requiring multiple compression passes:
1. First pass: Extract and format all items without size limit
2. Second pass: Apply priority scoring, cut P4 and verbose P3 items
3. Third pass: Apply abbreviation rules more aggressively, consolidate related bullets
4. Final pass: Verify line count ≤ 50 and round-trip safety

## Cross-Framework Compatibility

### Claude Code (Anthropic)
- Respects markdown headers for section parsing
- Token budget: ~100K context window
- Compressor output fits in ~400-600 tokens of the budget
- Maximum effective compression ratio: ~100:1 (100K tokens → 1K token summary)

### Cursor (VS Code)
- Context window more limited (~32K tokens)
- Compressor output should target ~300-400 tokens
- Benefit of compression is even more significant with smaller windows

### Windsurf
- Cascade system with specialized agents
- Compressor output should include agent-specific routing info in section headers
- Each downstream agent gets skill-specific context injection

## Performance Optimization

### Scanning Speed
- For conversations under 50 exchanges, full scan is fine
- For 50-200 exchanges, use a two-pass approach: first pass identifies decision-bearing messages (containing keywords: "decided", "chose", "changed", "fixed", "added", "rejected"), second pass extracts details from those messages only
- For 200+ exchanges, sample every Nth exchange and use keyword density to focus on important segments

### Abbreviation Consistency
Establish a consistent abbreviation set at the start of each compression session. Use the abbreviation table from SKILL.md as a baseline. If the conversation introduces domain-specific terms (e.g., "PriceOracle" → "PO"), add them to the abbreviation table for that session only.
