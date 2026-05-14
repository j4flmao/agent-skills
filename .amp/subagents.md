# Subagents — Amp

Subagents via Task tool. Each has own context + tools. Main agent gets final summary only.

## When

- Independent parallel work across code areas
- Break big tasks into isolated chunks
- Keep main context clean

## Limitations

- No inter-subagent comms
- No mid-task guidance
- No step-by-step monitoring — only final summary
- Fresh context (no conversation history)

## Invoke

Amp auto-spawns. Encourage explicitly:

```
Use 2 subagents to refactor these files
Convert 5 files to Tailwind, one subagent per file
```

## Oracle

GPT-5.4 deep reasoning tool. Slower, smarter. Main agent decides when to use.

```
Ask the oracle to review this logic for edge cases
Use the oracle to analyze the bug
```

## Librarian

Code search across GitHub (public + private repos). Requires GitHub connection in settings.

```
Ask the Librarian to find how [library] handles auth
Search our docs repo for deployment patterns
```
