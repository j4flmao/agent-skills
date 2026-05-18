# SKILL.md Reference Template

Every skill in this repo follows this exact structure. Use this template when creating a new skill.

## Template

```markdown
---
name: {area}-{skill-name}
description: >
  Use this skill when the user says '{trigger keywords}'. This skill enforces
  {key constraints}. Applies to {applicable stacks}. Do NOT use for: {exclusions}.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [{area}, {skill-name}, {phase}, {category}]
---

# {Skill Title}

## Purpose
One sentence describing what this skill does and when to apply it.

## Agent Protocol

### Trigger
Exact user phrases that activate this skill. List 5-10 keywords.

### Input Context
What the agent must verify before activating: prerequisites, required knowledge, files that must exist.

### Output Artifact
What this skill produces: file type, structure, contents. "No file output unless requested" if text-only.

### Response Format
How the agent structures its response. Specify templates, code block formats, and include the compression rule.

### Completion Criteria
- [ ] Checklist of conditions that mark this skill complete

### Max Response Length
Token limit or line count for the response.

## Workflow

### Step 1: {First Action}
Explanation and code examples.

### Step 2: {Second Action}
Explanation and code examples.

### Step N: ...
Additional steps as needed.

## Rules
- Bullet list of hard constraints the agent must follow
- Security rules, anti-patterns to avoid
- Always prefer short, actionable rules over explanations

## References
- `references/{ref1}.md` — Brief description
- `references/{ref2}.md` — Brief description

## Handoff
Next skill to route to after this one completes.
Carry forward: context variables the next skill needs.
```

## Compression Rule

Every SKILL.md Response Format section must end with:

```
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.
```

## Frontmatter Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier: `{area}-{skill-name}` |
| `description` | Yes | Multi-line trigger description with exclusions |
| `version` | Yes | Semver |
| `author` | Yes | GitHub username |
| `license` | Yes | SPDX identifier |
| `compatibility` | Yes | Agent compatibility flags |
| `tags` | Yes | Categorization tags |

## Section Order

1. Frontmatter (YAML between `---` delimiters)
2. H1 title
3. Purpose
4. Agent Protocol (Trigger / Input Context / Output Artifact / Response Format / Completion Criteria / Max Response Length)
5. Workflow (Step 1..N)
6. Rules
7. References
8. Handoff

## Reference Files

Each reference file is a standalone `.md` in the `references/` subdirectory:

```markdown
# {Title}

## Overview
Brief description of what this reference covers.

## Content
Detailed technical content with code examples, tables, and configuration snippets.

## Key Points
- Actionable takeaways
```
