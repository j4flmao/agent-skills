#!/bin/bash
# PreToolUse hook (matcher: Bash): deny destructive filesystem and disk commands.
# stdin:  { "tool_name": "Bash", "tool_input": { "command": "..." }, ... }
# stdout: a "deny" decision, or nothing (exit 0) to let the command run.
# Pure bash: no jq, no grep -P, so it cannot silently fail open on macOS or Git Bash.

input=$(cat)

# Extract tool_input.command from the JSON text; fall back to the whole payload so a
# parsing surprise still gets scanned instead of skipped.
json_string='"command"[[:space:]]*:[[:space:]]*"(([^"\\]|\\.)*)"'
if [[ "$input" =~ $json_string ]]; then command="${BASH_REMATCH[1]}"; else command="$input"; fi
command=${command//\\\"/\"}
command=${command//\\\\/\\}

deny() {
  local reason="${1//\\/\\\\}"
  reason="${reason//\"/\\\"}"
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$reason"
  exit 0
}

# Paths that must never be removed recursively.
protected='^(/|/\*|~|~/|~/\*|\$HOME|\$\{HOME\}|\$HOME/\*|\.|\./|\./\*|\.\.|\.\./|\*|/(bin|boot|dev|etc|home|lib|lib64|opt|proc|root|sbin|srv|sys|usr|var)(/\*?)?|[A-Za-z]:(\\|/)?|[A-Za-z]:(\\|/)\*)$'

# Split on ; && || | and newlines, then inspect each simple command.
segments=$(printf '%s' "$command" | sed 's/&&/\n/g; s/||/\n/g; s/[;|]/\n/g')
while IFS= read -r segment; do
  read -r -a words <<< "$segment"
  i=0
  # skip wrappers: sudo, env, command, time, nohup, xargs and VAR=value assignments
  while [ $i -lt ${#words[@]} ]; do
    case "${words[$i]}" in
      sudo|doas|env|command|time|nohup|xargs|exec|builtin) i=$((i + 1)) ;;
      -*) [ $i -gt 0 ] && i=$((i + 1)) || break ;;
      *=*) i=$((i + 1)) ;;
      *) break ;;
    esac
  done
  cmd="${words[$i]##*/}"
  args=("${words[@]:$((i + 1))}")

  case "$cmd" in
    rm)
      recursive=0; targets=()
      for a in "${args[@]}"; do
        case "$a" in
          --no-preserve-root) deny "Blocked: rm --no-preserve-root" ;;
          --recursive) recursive=1 ;;
          --*) ;;
          -*[rR]*) recursive=1 ;;
          -*) ;;
          *) targets+=("${a%\"}") ;;
        esac
      done
      if [ $recursive -eq 1 ]; then
        for t in "${targets[@]}"; do
          t="${t#\"}"; t="${t#\'}"; t="${t%\'}"
          [[ "$t" =~ $protected ]] && deny "Blocked: recursive rm of a protected path ($t). Remove specific subpaths instead."
        done
      fi
      ;;
    mkfs|mkfs.*|wipefs|shred) deny "Blocked: $cmd can destroy disks or data" ;;
    dd)
      for a in "${args[@]}"; do [[ "$a" =~ ^of=/dev/ ]] && deny "Blocked: dd writing to a device"; done ;;
    chmod|chown)
      if [[ " ${args[*]} " =~ \ -[a-zA-Z]*R ]] && [[ " ${args[*]} " =~ \ (/|/\*|~|/etc|/usr|/var)\  ]]; then
        deny "Blocked: recursive $cmd on a system path"
      fi ;;
    find)
      if [[ " ${args[*]} " =~ \ -delete\  || " ${args[*]} " =~ \ -delete$ ]] && [[ "${args[0]}" =~ ^(/|~|\$HOME)$ ]]; then
        deny "Blocked: find -delete from the filesystem root or home"
      fi ;;
  esac
done <<< "$segments"

# Fork bomb
[[ "$command" == *':(){'*':|:&'*'};:'* ]] && deny "Blocked: fork bomb"

exit 0
