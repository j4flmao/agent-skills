---
name: Agent Task Checklist Management
description: "Rules for breaking down complex projects into granular checklists in task.md, using specific notation, and updating frequently for transparency."
---

# Agent Task Checklist Management

**MANDATORY DIRECTIVE: You MUST maintain a `task.md` file for all complex projects.**

## Core Rules (Strict Enforcement)
1. **Granularity**: Break down complex projects into atomic, actionable steps.
2. **Notation**: Use exact markdown notation for task states:
   - `[ ]` : Uncompleted
   - `[/]` : In-Progress
   - `[x]` : Completed
3. **Transparency**: Frequent, incremental updates to `task.md` are **NON-NEGOTIABLE**. Reflect state changes immediately upon starting or finishing a step.

## Lifecycle Architecture

```mermaid
%%{init: {"theme": "default", "themeVariables": {"fontSize": "28px"}, "flowchart": {"useMaxWidth": false}}}%%
flowchart TD
    A[Start Project] --> B[Break down into granular tasks]
    B --> C["Create/Update task.md with `[ ]` notation"]
    C --> D{Select next task}
    D --> E["Mark task as In-Progress `[/]`"]
    E --> F[Execute task]
    F --> G["Mark task as Completed `[x]`"]
    G --> H{More tasks?}
    H -- Yes --> D
    H -- No --> I[Project Complete]
```
