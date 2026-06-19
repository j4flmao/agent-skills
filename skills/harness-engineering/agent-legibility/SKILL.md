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

## Implementation Patterns

### AGENTS.md Generator

```python
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class AgentDocsConfig:
    project_name: str
    tech_stack: List[str]
    architecture_style: str
    constraint_rules: List[str] = field(default_factory=list)
    navigation_map: dict = field(default_factory=dict)
    workflow_steps: dict = field(default_factory=dict)

class AgentsMDGenerator:
    def __init__(self, config: AgentDocsConfig):
        self.config = config

    def generate(self) -> str:
        sections = [
            self._identity_block(),
            self._architecture_section(),
            self._constraints_section(),
            self._navigation_section(),
            self._workflows_section(),
            self._conventions_section(),
        ]
        return "\n\n".join(sections)

    def _identity_block(self) -> str:
        stack = ", ".join(self.config.tech_stack)
        return (
            f"# {self.config.project_name}\n\n"
            f"**Stack**: {stack}\n\n"
            f"**Architecture**: {self.config.architecture_style}\n\n"
            f"## Identity\n"
            f"- Primary language: {self.config.tech_stack[0] if self.config.tech_stack else 'Unknown'}\n"
            f"- Framework: {self.config.tech_stack[1] if len(self.config.tech_stack) > 1 else 'N/A'}\n"
            f"- Package manager: {self._detect_package_manager()}\n"
        )

    def _detect_package_manager(self) -> str:
        managers = {"node": "npm/pnpm/yarn", "python": "pip/poetry", "go": "go mod",
                     "rust": "cargo", "ruby": "bundler"}
        for tech in self.config.tech_stack:
            tech_lower = tech.lower()
            for key, val in managers.items():
                if key in tech_lower:
                    return val
        return "unknown"

    def _constraints_section(self) -> str:
        rules = self.config.constraint_rules
        if not rules:
            return "## Constraints\nNo specific constraints defined."
        lines = ["## Constraints\n"]
        for rule in rules:
            if rule.startswith("DO NOT") or rule.startswith("Never"):
                lines.append(f"- ❌ **{rule}**")
            elif rule.startswith("DO") or rule.startswith("Always"):
                lines.append(f"- ✅ **{rule}**")
            else:
                lines.append(f"- {rule}")
        return "\n".join(lines)

    def _navigation_section(self) -> str:
        if not self.config.navigation_map:
            return "## Navigation\nNo navigation map defined."
        lines = ["## Navigation\n"]
        lines.append("| Directory | Purpose | Key Files |")
        lines.append("|---|---|---|")
        for path, info in self.config.navigation_map.items():
            files = ", ".join(info.get("key_files", []))
            lines.append(f"| `{path}` | {info.get('purpose', '')} | {files} |")
        return "\n".join(lines)

    def _workflows_section(self) -> str:
        if not self.config.workflow_steps:
            return "## Workflows\nNo workflows defined."
        lines = ["## Common Workflows\n"]
        for name, steps in self.config.workflow_steps.items():
            lines.append(f"### {name}")
            for i, step in enumerate(steps, 1):
                lines.append(f"{i}. {step}")
            lines.append("")
        return "\n".join(lines)

    def _conventions_section(self) -> str:
        return (
            "## Code Conventions\n\n"
            "- **Imports**: Group by stdlib → third-party → local. Alphabetical within groups.\n"
            "- **Naming**: snake_case for files/functions, PascalCase for classes, UPPER_CASE for constants.\n"
            "- **Types**: Every function must have typed parameters and return type annotation.\n"
            "- **Error handling**: Use early returns for error cases. Log at point of failure.\n"
            "- **Testing**: One test file per source file. Test files mirror source directory structure.\n"
        )
```

### Navigation Map Builder

```python
from pathlib import Path
from typing import Dict, List

class NavigationMapBuilder:
    def __init__(self, root_dir: Path):
        self.root = root_dir

    def build_map(self) -> Dict[str, dict]:
        result = {}
        for path in sorted(self.root.rglob("*")):
            if not path.is_dir() or path.name.startswith(".") or path.name == "__pycache__":
                continue
            rel_path = path.relative_to(self.root)
            key_files = self._get_key_files(path)
            purpose = self._infer_purpose(path)
            if key_files or purpose:
                result[str(rel_path)] = {
                    "purpose": purpose,
                    "key_files": [str(f.relative_to(self.root)) for f in key_files],
                    "child_count": len(list(path.iterdir())),
                }
        return result

    def _get_key_files(self, directory: Path) -> List[Path]:
        key_files = []
        for ext in [".py", ".ts", ".js", ".tsx", ".jsx", ".go", ".rs", ".rb"]:
            key_files.extend(directory.glob(f"*{ext}"))
        return sorted(key_files)[:5]

    def _infer_purpose(self, path: Path) -> str:
        name = path.name.lower()
        if name in ("src", "lib", "app"):
            return "Application source code"
        if name in ("tests", "__tests__", "spec"):
            return "Test suite"
        if name in ("docs", "documentation"):
            return "Documentation"
        if name in ("api", "routes", "endpoints"):
            return "API layer"
        if name in ("models", "entities", "schemas"):
            return "Data models"
        if name in ("middleware",):
            return "Middleware layer"
        if name in ("config", "configuration"):
            return "Configuration"
        if name in ("migrations",):
            return "Database migrations"
        if name in ("scripts", "bin"):
            return "Utility scripts"
        if name in ("docker", "deploy", "k8s"):
            return "Deployment configuration"
        return "Module"
```

### Progressive Context Disclosure Layers

```python
from typing import List, Optional

class ContextLayer:
    def __init__(self, level: int, name: str, content: str, token_cost: int):
        self.level = level
        self.name = name
        self.content = content
        self.token_cost = token_cost

class ProgressiveDisclosure:
    LAYERS = {
        0: "Project Identity",
        1: "Architecture Overview",
        2: "Coding Conventions",
        3: "Module Details",
        4: "Implementation Details",
    }

    def __init__(self, agent_context_budget: int = 8000):
        self.budget = agent_context_budget
        self.layers: List[ContextLayer] = []

    def add_layer(self, level: int, name: str, content: str):
        import tiktoken
        enc = tiktoken.get_encoding("cl100k_base")
        tokens = len(enc.encode(content))
        self.layers.append(ContextLayer(level, name, content, tokens))

    def load_for_task(self, task_type: str) -> List[ContextLayer]:
        loaded = []
        budget_remaining = self.budget

        # Always load identity layer
        for layer in sorted(self.layers, key=lambda l: l.level):
            if layer.level == 0:
                loaded.append(layer)
                budget_remaining -= layer.token_cost
                break

        if task_type in ("simple_fix", "read_only", "minor_change"):
            for layer in sorted(self.layers, key=lambda l: l.level):
                if layer.level <= 2 and layer.token_cost <= budget_remaining:
                    loaded.append(layer)
                    budget_remaining -= layer.token_cost
        elif task_type in ("add_feature", "refactor"):
            for layer in sorted(self.layers, key=lambda l: l.level):
                if layer.level <= 3 and layer.token_cost <= budget_remaining:
                    loaded.append(layer)
                    budget_remaining -= layer.token_cost
        else:
            for layer in sorted(self.layers, key=lambda l: l.level):
                if layer.token_cost <= budget_remaining:
                    loaded.append(layer)
                    budget_remaining -= layer.token_cost

        return loaded
```

### Convention File Parser

```python
import re
from typing import List, Dict, Optional

class ConventionParser:
    def __init__(self):
        self.rules: List[Dict] = []

    def parse_file(self, content: str) -> List[Dict]:
        rules = []
        lines = content.split("\n")
        current_section = "general"

        for line in lines:
            if line.startswith("## "):
                current_section = line.strip("# ")
                continue
            rule = self._parse_rule(line)
            if rule:
                rule["section"] = current_section
                rules.append(rule)

        self.rules = rules
        return rules

    def _parse_rule(self, line: str) -> Optional[Dict]:
        line = line.strip()
        if not line or line.startswith("#"):
            return None
        if line.startswith("- ") or line.startswith("* "):
            content = line[2:]
        elif line.startswith("-"):
            content = line[1:]
        else:
            return None

        rule_type = "info"
        if any(kw in content.upper() for kw in ["DO NOT", "NEVER", "DON'T", "AVOID", "FORBIDDEN"]):
            rule_type = "negative"
        elif any(kw in content.upper() for kw in ["DO ", "ALWAYS", "MUST", "REQUIRED", "SHOULD"]):
            rule_type = "positive"

        return {"type": rule_type, "text": content}

    def find_conflicts(self, other_parser: "ConventionParser") -> List[str]:
        conflicts = []
        for rule in self.rules:
            if rule["type"] == "positive":
                for other in other_parser.rules:
                    if other["type"] == "negative":
                        if self._texts_overlap(rule["text"], other["text"]):
                            conflicts.append(
                                f"'{rule['text'][:50]}' conflicts with '{other['text'][:50]}'"
                            )
        return conflicts

    def _texts_overlap(self, a: str, b: str) -> bool:
        words_a = set(a.lower().split())
        words_b = set(b.lower().split())
        common = words_a & words_b
        return len(common) >= 3
```

## Architecture Decision Trees

### Documentation Structure Decision

```
How large is the project?
├── Small (< 50 files, single module)
│   ├── Single AGENTS.md at root
│   ├── Inline conventions
│   └── No module-level READMEs needed
│
├── Medium (50-500 files, multi-module)
│   ├── AGENTS.md + ARCHITECTURE.md
│   ├── CONVENTIONS.md shared
│   ├── Module-level READMEs in key dirs
│   └── Navigation map in AGENTS.md
│
├── Large (500-5000 files, monorepo)
│   ├── AGENTS.md per top-level package
│   ├── Shared ARCHITECTURE.md + CONSTRAINTS.md
│   ├── Per-module READMEs mandatory
│   ├── Navigation index file at root
│   └── Task-specific docs in docs/agent-tasks/
│
└── Enterprise (5000+ files, multi-repo)
    ├── Per-repo AGENTS.md
    ├── Central conventions repository
    ├── Repository navigation registry
    └── Cross-repo dependency map
```

### Agent Target File Selection

```
Which agents will operate on this repo?
├── Claude Code
│   ├── File: CLAUDE.md (or AGENTS.md fallback)
│   ├── Supports: Markdown, code blocks, bullet lists
│   └── Loads: Automatically on repo open
│
├── Cursor
│   ├── File: .cursorrules
│   ├── Supports: YAML frontmatter, JSON, Markdown
│   └── Loads: On project open
│
├── Codex (GitHub Copilot)
│   ├── File: .github/copilot-instructions.md
│   ├── Supports: Markdown with specific sections
│   └── Loads: Inline in IDE
│
├── Windsurf
│   ├── File: .windsurfrules
│   ├── Supports: Markdown, YAML
│   └── Loads: On workspace init
│
└── Multi-agent (multiple above)
    ├── Shared file: CONVENTIONS.md (source of truth)
    ├── Generated files: Per-agent files derived from shared
    └── Sync: CI pipeline detects shared file changes and regenerates all
```

## Production Considerations

- **Documentation freshness checks**: Add CI step that validates AGENTS.md descriptions match actual source structure. Fail the build if significant drift detected.
- **Token budget per agent file**: Keep AGENTS.md under 2000 tokens (approximately 1500 words). Agents rarely read past the first screen of documentation.
- **Version-pinned conventions**: Pin convention file versions in CICD or package.json. Agents can then check "has my conventions changed?" before starting tasks.
- **Automated convention extraction**: Use AST analysis to auto-extract naming conventions, import patterns, and error handling styles from existing code. Generate convention files from real code patterns.

## Security Considerations

- **Instruction injection via AGENTS.md**: If agents follow AGENTS.md instructions literally, a compromised file could instruct agents to exfiltrate data. Sign AGENTS.md with GPG and verify before loading.
- **Convention file access control**: Some convention files (e.g., .cursorrules) may contain API endpoint URLs or service names. Limit access to these files to authorized contributors.
- **Agent behavior isolation**: If multiple agents operate on the same repo, convention files should specify which agent types they apply to. Prevent cross-agent configuration confusion.

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Writing AGENTS.md in dense paragraphs | Agents struggle to parse prose into actionable rules | Use structured markdown with bullet lists and explicit DO/DO NOT |
| No navigation map in large projects | Agent wastes context budget exploring directory structure | Provide directory→purpose mapping with key files listed |
| Mixing human and agent documentation | Conflicting priorities between readability and parseability | Separate sections: Human README.md and AGENTS.md |
| Over-specified conventions (>50 rules) | Agent context overwhelmed, important rules ignored | Limit to 10-15 most impactful rules, use tiered detail |
| No update procedure for docs | Architecture changes but docs stay stale, confusing agents | Add docs update to PR template checklist |
| Ignoring per-agent file formats | Compass works great in Claude Code but not in Cursor | Generate per-agent files from a shared source of truth |
| One huge AGENTS.md for monorepo | Every task loads all packages' context | Per-package AGENTS.md with cross-references |

## Performance Optimization

- **Lazy loading of convention files**: Structure convention files with the most critical rules (top 5) at the top. Agents read top-first and may stop reading after enough rules.
- **Navigation map compression**: Use abbreviated paths and group related directories. Reduces token consumption of navigation sections by 40-60%.
- **Shared cache of parsed rules**: Parse convention files once per session and cache the structured rules. Avoids re-parsing on every context load.
- **Incremental doc generation**: Only regenerate AGENTS.md sections that changed based on git diff. Full regeneration is unnecessary for single-file changes.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with agent legibility patterns, progressive disclosure, and multi-agent documentation standards.
-->
