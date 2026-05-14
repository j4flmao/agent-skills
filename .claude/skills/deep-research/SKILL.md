---
name: deep-research
description: Research a topic thoroughly using codebase exploration. Use when the user wants deep investigation of a feature, bug, or pattern.
context: fork
agent: Explore
allowed-tools: Read Grep Glob
---

## Task

Research $ARGUMENTS thoroughly.

1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Trace all related code paths
4. Summarize findings with specific file:line references

## Response Format
```
## Summary
[2-3 sentence overview]

## Key Files
- path/to/file.ext:line — what it does

## Findings
[detailed analysis]
```
