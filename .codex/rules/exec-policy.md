# Codex CLI execution policy rules

Define which shell commands Codex can run outside the sandbox. Rules use Starlark syntax. See https://developers.openai.com/codex/rules for full reference.

## Usage

Place `.rules` files in this directory. Codex scans all active config layers for `rules/*.rules` on startup.

## Example: allow safe commands, prompt for risky ones

```starlark
# default.rules -- basic safety rules

prefix_rule(
    pattern = ["git", "add"],
    decision = "allow",
    justification = "Staging changes is safe",
)

prefix_rule(
    pattern = ["git", "push"],
    decision = "prompt",
    justification = "Pushing to remote needs confirmation",
)

prefix_rule(
    pattern = ["rm", "-rf"],
    decision = "forbidden",
    justification = "Use safe delete instead",
)
```

## Example: Docker safety

```starlark
prefix_rule(
    pattern = ["docker", "ps"],
    decision = "allow",
)

prefix_rule(
    pattern = ["docker", "rm"],
    decision = "prompt",
    justification = "Container removal requires approval",
)

prefix_rule(
    pattern = ["docker", "system", "prune"],
    decision = "prompt",
    justification = "Docker system prune can delete data",
)
```

## Rule fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `pattern` | yes | - | Command prefix to match (list of strings or unions) |
| `decision` | no | "allow" | `allow`, `prompt`, or `forbidden` |
| `justification` | no | "" | Human-readable reason shown during prompt/rejection |
| `match` | no | [] | Example commands that should match (validated on load) |
| `not_match` | no | [] | Example commands that should NOT match (validated on load) |

## Testing rules

```bash
codex execpolicy check --pretty --rules ~/.codex/rules/default.rules -- <command>
```
