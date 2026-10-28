# Automated Validation Hooks

Validation hooks run deterministic checks automatically at fixed points of an agent's lifecycle (before a tool runs, after a file is written, before the agent declares completion) and feed results back to the agent. They turn "please run the tests" in a prompt into a guarantee enforced by the harness.

## 1. Hook Points

| Hook point | Typical checks | On failure |
|---|---|---|
| Pre-tool-use | Argument validation, path allow-list, command deny-list, approval requirement | Block the call; return reason to the model |
| Post-tool-use | Format/lint changed files, type-check, quick unit tests, schema validation of tool output | Return diagnostics as feedback |
| Pre-completion (stop) | Full test suite, build, acceptance criteria, diff review | Refuse completion; agent continues with the failures |
| Session start | Environment checks, dependency install, load project rules | Abort or warn |
| Pre-commit / pre-push | Secret scanning, conventional commit format, generated-file checks | Block commit |

## 2. Claude Code Hooks Example

Claude Code runs shell commands configured in `.claude/settings.json` on events such as `PreToolUse`, `PostToolUse`, `Stop`, `UserPromptSubmit`, and `SessionStart`. The hook receives JSON on stdin; exit code 2 blocks the action (for `PreToolUse`) or feeds stderr back to Claude (for `PostToolUse`/`Stop`).

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{ "type": "command", "command": ".claude/hooks/scripts/post-edit-check.sh" }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": ".claude/hooks/scripts/block-destructive.sh" }]
      }
    ]
  }
}
```

```bash
#!/usr/bin/env bash
# post-edit-check.sh: lint the edited file, report problems back to the agent
set -euo pipefail
file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0
case "$file" in
  *.py)
    if ! out=$(uv run ruff check "$file" 2>&1); then
      echo "ruff found issues in $file:" >&2
      echo "$out" >&2
      exit 2          # stderr is shown to the agent, which then fixes the file
    fi ;;
  *.ts|*.tsx)
    if ! out=$(npx eslint "$file" 2>&1); then
      echo "$out" >&2; exit 2
    fi ;;
esac
exit 0
```

Check the current hooks documentation for event names, input fields, and exit-code semantics before relying on them; they evolve between releases.

## 3. Framework-Agnostic Hook Runner

```python
from __future__ import annotations
import subprocess
from dataclasses import dataclass
from typing import Callable

@dataclass(frozen=True, slots=True)
class HookResult:
    ok: bool
    feedback: str = ""

Hook = Callable[[dict], HookResult]

def command_hook(cmd: list[str], *, timeout: float = 120.0) -> Hook:
    def run(_event: dict) -> HookResult:
        try:
            p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        except subprocess.TimeoutExpired:
            return HookResult(False, f"{' '.join(cmd)} timed out after {timeout}s")
        if p.returncode == 0:
            return HookResult(True)
        return HookResult(False, (p.stdout + p.stderr)[-4000:])   # keep feedback within budget
    return run

class HookRegistry:
    def __init__(self) -> None:
        self.hooks: dict[str, list[Hook]] = {}

    def on(self, point: str, hook: Hook) -> None:
        self.hooks.setdefault(point, []).append(hook)

    def run(self, point: str, event: dict) -> HookResult:
        failures = [r.feedback for h in self.hooks.get(point, []) if not (r := h(event)).ok]
        return HookResult(not failures, "\n\n".join(failures))
```

Agent loop integration:

```python
result = hooks.run("pre_completion", {"run_id": run_id})
if not result.ok:
    messages.append({"role": "user",
                     "content": f"Completion blocked. Fix these failures, then finish:\n{result.feedback}"})
    continue   # agent loop proceeds; step budget still applies
```

## 4. Designing Good Feedback

- Deterministic tools (compilers, linters, tests, schema validators) over LLM opinions.
- Trim output to the actionable part: first errors, file and line, failing test names. Large logs waste context.
- Include the command so the agent can reproduce it.
- Stable ordering of messages so repeated runs are comparable.

## 5. Performance Budget

| Hook point | Target latency | Strategy |
|---|---|---|
| Pre-tool | < 100 ms | Pure checks, no subprocesses where possible |
| Post-tool (per edit) | < 5–10 s | File-scoped lint/format, incremental type-check |
| Pre-completion | Minutes acceptable | Full tests, build |

Slow per-edit hooks make agents slow and expensive; move heavy checks to the completion gate.

## 6. Security of Hooks

- Hooks run with the user's or CI's permissions; review hook scripts like code.
- Hook inputs (file paths, commands) come from the model: quote them, never `eval` them.
- Hook output is fed to the model: do not echo secrets from environment or config.

## Pitfalls

- Hooks that only log: the agent never sees the failure.
- Unbounded fix loops: a hook that always fails keeps the agent working until the budget ends. Cap repeated failures of the same check and escalate.
- Flaky tests in hooks teach the agent to make random changes.
- Running the full test suite after every edit.

## Checklist

- [ ] Checks mapped to hook points by cost.
- [ ] Failures returned to the agent as concise, actionable feedback.
- [ ] Completion gated on build/tests/acceptance criteria.
- [ ] Hook scripts reviewed, quoting model-supplied input safely.
- [ ] Repeated-failure caps and escalation path.
