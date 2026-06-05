---
name: agent-legibility
description: >
  Use this skill to make codebases, repositories, and documentation optimally readable and navigable by AI coding agents. Covers AGENTS.md design, repo-native instruction files, convention and constraint files, progressive context disclosure patterns, agent-optimized README structures, and workspace configuration.
  This skill enforces: structured metadata files, layered context loading, navigation hint systems, and machine-parseable documentation conventions.
  Do NOT use for: human-only documentation styling, marketing copy, or API reference generation.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [harness-engineering, agent-legibility, agents-md, documentation, workspace-config]
---

# Agent Legibility Skill

## Purpose
Establishes a production-grade framework for structuring codebases, documentation, and configuration files so that AI coding agents can efficiently discover project conventions, navigate file structures, understand architectural constraints, and follow repository-specific instructions without human intervention. This system provides standardized file formats, progressive disclosure strategies, and navigation hint patterns that minimize agent context consumption while maximizing task-relevant information retrieval.

---

## Core Principles
1. **Machine-First Documentation**: Documentation must be structured for parsing by agents first, with human readability as a secondary concern. Use explicit headers, consistent formatting, and parseable metadata blocks.
2. **Progressive Context Disclosure**: Never dump the entire codebase context at once. Layer information from high-level summaries to detailed specifications, letting agents load only what they need for the current task.
3. **Convention over Configuration**: Establish clear naming conventions, file placement rules, and structural patterns that agents can infer without reading extensive configuration files.
4. **Explicit Navigation Hints**: Provide explicit pointers between related files, modules, and documentation sections. Agents cannot browse; they need directed links.
5. **Constraint Files as Guardrails**: Use dedicated constraint and convention files to prevent agents from making architectural violations, even when they lack full codebase context.

---

## Agent Protocol

### Triggers
Use this skill when processing:
- New repository setup requiring agent-readable documentation infrastructure.
- AGENTS.md file creation or updates for AI coding agent integration.
- Convention files (.cursorrules, .clinerules, CLAUDE.md, .windsurfrules, codex.md) authoring.
- Progressive context disclosure system design for large monorepos.
- Workspace configuration for multi-agent or multi-IDE environments.
- README restructuring for agent consumption optimization.

### Input Context Required
- **Repository Structure**: The directory tree and key file listing of the target codebase.
- **Tech Stack**: Languages, frameworks, build tools, and dependency managers in use.
- **Architectural Constraints**: Patterns, anti-patterns, and structural rules that agents must follow.
- **Agent Target**: Which agents will consume the documentation (Claude Code, Cursor, Codex, Windsurf).

### Output Artifact
- **AGENTS.md File**: A structured instruction file for AI agents with sections for identity, constraints, workflows, and navigation.
- **Convention Files**: Agent-specific instruction files (.cursorrules, CLAUDE.md, etc.) tailored to each IDE/agent.
- **Navigation Map**: A structured file-to-purpose mapping that agents use for directed code exploration.

### Response Formats
For programmatic integration, the agent legibility audit result must follow this structure:

```json
{
  "repository": "my-project",
  "legibility_score": 0.82,
  "files_created": [
    "AGENTS.md",
    ".cursorrules",
    "CLAUDE.md",
    "docs/ARCHITECTURE.md",
    "docs/CONVENTIONS.md"
  ],
  "coverage": {
    "navigation_hints": true,
    "constraint_files": true,
    "progressive_disclosure": true,
    "workspace_config": true
  },
  "gaps": [
    "Missing module-level README in src/payments/",
    "No error handling conventions documented"
  ]
}
```

---

## Decision Matrix for Documentation Strategy

```
What does the agent need to understand?
├── Project Overview (first contact)
│   ├── Small project (< 50 files) → Single AGENTS.md with inline conventions.
│   └── Large project (50+ files)  → AGENTS.md + ARCHITECTURE.md + module READMEs.
│
├── Coding Conventions
│   ├── Single agent type  → One convention file (e.g., CLAUDE.md).
│   └── Multi-agent setup  → Per-agent convention files + shared CONVENTIONS.md.
│
├── Architectural Constraints
│   ├── Simple constraints  → Inline in AGENTS.md under ## Constraints section.
│   └── Complex constraints → Dedicated CONSTRAINTS.md with decision trees.
│
├── File Navigation
│   ├── Flat structure     → Directory listing in AGENTS.md.
│   └── Deep nesting       → Navigation map file + module-level breadcrumbs.
│
└── Task-Specific Context
    ├── Common tasks        → Workflow section in AGENTS.md.
    └── Specialized tasks   → Task-specific instruction files in docs/agent-tasks/.
```

---

## Detailed Architectural Overview

Agent legibility infrastructure creates a layered information architecture that agents traverse from general to specific. Below is the system architecture showing how agents discover and consume project information.

```
+------------------+     +---------------+     +-----------------------+     +------------------+
| Agent Entry      | ──► | AGENTS.md     | ──► | Convention Files      | ──► | Module READMEs   |
| (repo root scan) |     | (top-level)   |     | (.cursorrules, etc.)  |     | (per-directory)  |
+------------------+     +---------------+     +-----------------------+     +------------------+
                                │                                                     │
                                ▼                                                     ▼
+------------------+     +---------------+     +-----------------------+     +------------------+
| Agent Working    | ◄── | Navigation    | ◄── | ARCHITECTURE.md       | ◄── | Code Comments    |
| Context          |     | Map / Hints   |     | (system design)       |     | (inline hints)   |
+------------------+     +---------------+     +-----------------------+     +------------------+
```

### Agent Context Loading Lifecycle
Below is the progressive disclosure pipeline agents follow when onboarding to a repository:

```
[Agent Starts Task]
       │
       ├──► (A) Root Scan ──► Read AGENTS.md / CLAUDE.md / .cursorrules at repo root
       │
       ├──► (B) Architecture Load ──► Parse ARCHITECTURE.md for system boundaries
       │
       ├──► (C) Convention Load ──► Extract coding standards and constraint rules
       │
       ├──► (D) Navigation Resolution ──► Follow file pointers to task-relevant modules
       │
       ├──► (E) Module Context ──► Read module-level README + key source files
       │
       └──► (F) Task Execution ──► Apply conventions and constraints during code generation
```

---

## Workflow Steps

### Phase 1: Repository Assessment
1. **Inventory File Structure**: Map the complete directory tree, noting depth, file counts per directory, and language distribution.
2. **Identify Entry Points**: Locate main application files, configuration roots, and build system entry points.
3. **Assess Current Documentation**: Evaluate existing README, docs/, and inline comments for agent-parseable structure.
4. **Determine Agent Targets**: Identify which AI agents (Claude Code, Cursor, Codex, Windsurf) will operate on this repo.

### Phase 2: AGENTS.md Design
1. **Write Identity Block**: Define project name, tech stack, primary language, and architecture style in a structured header.
2. **Define Constraint Rules**: List explicit do/don't rules that prevent common agent mistakes (e.g., "Never modify migration files directly").
3. **Map Workflow Instructions**: Provide step-by-step instructions for common tasks (add feature, fix bug, add test).
4. **Build Navigation Section**: Create a file-to-purpose map pointing agents to key directories and their roles.

### Phase 3: Convention File Authoring
1. **Create Agent-Specific Files**: Write .cursorrules, CLAUDE.md, .windsurfrules, codex.md with agent-specific formatting.
2. **Extract Shared Conventions**: Factor common rules into a shared CONVENTIONS.md referenced by all agent files.
3. **Define Output Formats**: Specify expected code style, import ordering, error handling patterns, and test structure.
4. **Version Convention Files**: Tag convention file versions so agents can detect when rules have changed.

### Phase 4: Progressive Context Architecture
1. **Define Disclosure Layers**: Structure information into layers: L0 (project identity), L1 (architecture), L2 (conventions), L3 (module details).
2. **Implement Layer Triggers**: Define which agent actions trigger loading of each disclosure layer.
3. **Set Context Budgets**: Allocate token budgets per layer to prevent context overflow in large repos.
4. **Build Cross-References**: Add explicit links between layers so agents can drill down or up as needed.

### Phase 5: Navigation Hint System
1. **Create Directory Manifest**: Write a structured map of every top-level directory with its purpose and key files.
2. **Add Module Breadcrumbs**: Place lightweight README.md files in each module directory with parent/child links.
3. **Tag Entry Points**: Mark files that serve as entry points for specific features or subsystems.
4. **Define Search Strategies**: Document recommended search patterns for common tasks (e.g., "To find auth logic, start at src/auth/").

### Phase 6: Workspace Configuration
1. **Configure IDE Settings**: Set up .vscode/, .cursor/, .windsurf/ directories with agent-relevant settings.
2. **Define Task Templates**: Create task description templates that agents can use as starting points.
3. **Set Environment Variables**: Document required environment variables and their purposes in a structured format.
4. **Establish Update Protocols**: Define when and how agent documentation should be updated as the codebase evolves.

---

## Extended Troubleshooting Guide

When implementing agent legibility infrastructure, you may encounter the following issues:

| Symptom | Primary Cause | Mitigation Action |
| :--- | :--- | :--- |
| **Agent ignores AGENTS.md instructions** | File not at repository root or agent doesn't support the file format. | Place AGENTS.md at repo root and create agent-specific variants (CLAUDE.md, .cursorrules). |
| **Agent makes architectural violations** | Constraints listed in prose paragraphs, not parseable rules. | Restructure constraints as bullet-point rules with explicit "DO" and "DO NOT" prefixes. |
| **Agent loads too much context** | No progressive disclosure; entire docs/ loaded on first read. | Implement layered disclosure with L0-L3 levels and explicit "read this next" pointers. |
| **Agent can't find relevant source files** | No navigation hints or directory manifest in documentation. | Add a ## Navigation section to AGENTS.md with directory-to-purpose mappings. |
| **Convention conflicts between agents** | Different agents read different convention files with conflicting rules. | Create a single CONVENTIONS.md as source of truth; derive agent-specific files from it. |
| **Agent produces inconsistent code style** | Code style rules described ambiguously with natural language. | Provide concrete code examples for every convention rule showing correct and incorrect patterns. |
| **Stale documentation causes wrong assumptions** | AGENTS.md not updated when architecture changed. | Add a documentation update checklist to PR templates and CI validation. |

---

## Complete Execution Scenario

Below is a scenario showing how an agent onboards to a new repository and uses the legibility infrastructure:

```
[Agent Receives Task] ──► "Add a rate limiting middleware to the API"
        │
[Step 1] ──► Scan repo root ──► Find AGENTS.md, CLAUDE.md, .cursorrules
        │       └── Parse AGENTS.md: Tech stack = Node.js + Express + TypeScript
        │
[Step 2] ──► Read ## Architecture section
        │       └── "Middleware lives in src/middleware/, follows Express pattern"
        │
[Step 3] ──► Read ## Conventions section
        │       ├── "All middleware must export a factory function"
        │       ├── "Use src/middleware/__tests__/ for middleware tests"
        │       └── "Error responses use src/utils/error-response.ts format"
        │
[Step 4] ──► Follow navigation hint to src/middleware/
        │       └── Read src/middleware/README.md ──► List existing middleware patterns
        │
[Step 5] ──► Read existing middleware (e.g., src/middleware/auth.ts) as reference
        │       └── Extract factory function pattern and error handling style
        │
[Step 6] ──► Generate rate-limiter.ts following all discovered conventions
        │       └── Write test in src/middleware/__tests__/rate-limiter.test.ts
```

---

## Rules and Guidelines
- **Rule 1**: AGENTS.md must be placed at the repository root. It is the first file agents look for when onboarding to a project.
- **Rule 2**: Every constraint rule must be actionable and testable. Avoid vague guidance like "write clean code"; instead specify "functions must not exceed 50 lines."
- **Rule 3**: Navigation hints must use relative paths from the repository root. Absolute paths break when repos are cloned to different locations.
- **Rule 4**: Convention files must include concrete code examples for every rule. A rule without an example is a rule that will be misinterpreted.
- **Rule 5**: Documentation must be updated as part of the same PR that changes the architecture or conventions it describes. Stale docs are worse than no docs.

---

## Reference Guides
Below are links to the reference guides detailing the patterns, templates, and implementations used in this agent legibility framework:

- [agents-md-design.md](references/agents-md-design.md)
  Covers AGENTS.md file structure, section templates, identity blocks, constraint formatting, and multi-agent variant strategies.
- [repo-native-instructions.md](references/repo-native-instructions.md)
  Details repository-level agent configuration files, instruction layering, and how different agents discover and parse native instructions.
- [structured-documentation.md](references/structured-documentation.md)
  Defines documentation patterns optimized for agent consumption including structured headers, metadata blocks, and parseable formats.
- [convention-constraint-files.md](references/convention-constraint-files.md)
  Specifies convention and constraint file design patterns, rule formatting, example-driven conventions, and conflict resolution.
- [progressive-context-disclosure.md](references/progressive-context-disclosure.md)
  Implements layered context loading strategies that reveal information incrementally based on agent task requirements.
- [agent-optimized-readmes.md](references/agent-optimized-readmes.md)
  Provides README patterns specifically designed for agent legibility including structured sections, navigation blocks, and metadata.
- [workspace-configuration.md](references/workspace-configuration.md)
  Covers workspace and IDE configuration for agent-ready environments including settings files, task templates, and environment setup.
- [codebase-navigation-hints.md](references/codebase-navigation-hints.md)
  Details navigation hint systems that help agents traverse codebases efficiently using manifests, breadcrumbs, and directed pointers.

---

## Handoff
For projects requiring tool orchestration within agent-legible codebases, hand off to `tool-orchestration`. For context window optimization when agents load codebase documentation, hand off to `context-engineering`. For architectural constraint enforcement referenced in AGENTS.md, hand off to `architectural-constraints`.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with agent legibility patterns, progressive disclosure, and multi-agent documentation standards.
-->
