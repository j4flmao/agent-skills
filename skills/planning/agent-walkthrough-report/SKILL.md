---
name: agent-walkthrough-report
description: Instructions for creating stunning walkthrough reports using advanced Markdown features.
---

# Agent Walkthrough Report Generation

**MANDATORY DIRECTIVE:** Execute report generation with absolute precision. Reports must be dense, visually striking, and immediately actionable. No fluff.

## Architecture

```mermaid
%%{init: {"theme": "default", "flowchart": {"useMaxWidth": true}}}%%
flowchart TD
    A[Analyze Completed Work] --> B{Determine Key Artifacts}
    B -->|Code Changes| C[Generate Diff Blocks]
    B -->|Architecture/Flows| D[Create Mermaid Diagrams]
    B -->|Visual Sequences| E[Construct Carousels]
    C --> F[Assemble Walkthrough]
    D --> F
    E --> F
    F --> G[Inject Alerts & Format]
    G --> H[Final Walkthrough Report]
```

## Core Formatting Rules

1. **GitHub Flavored Markdown (GFM)**: Enforce strict GFM standards. Use tables for dense data presentation.
2. **Alerts**: Deploy strategically to command attention.
   > [!IMPORTANT]
   > Critical insights or architectural decisions.
   > [!TIP]
   > Optimization highlights.
3. **Mermaid Diagrams**: Visualize complexity. Never explain what can be mapped.
4. **Carousels**: Group sequential or related visual data (code snippets, before/after states) using four backticks and `carousel` identifier. Split slides with `<!-- slide -->`.
5. **Diff Blocks**: Highlight structural modifications explicitly.
   ```diff
   - old_logic()
   + optimized_logic()
   ```

## Execution Standard

Summarize aggressively. Optimize for scannability. If a metric or insight doesn't drive understanding, omit it. Produce the `walkthrough.md` with absolute clarity and authority.
