---
name: deploy
description: Deploy the project to production. Only user-invocable — never auto-trigger.
disable-model-invocation: true
allowed-tools: Bash(git *) Bash(npm *) Bash(gh *)
shell: powershell
---

## Deploy Checklist

1. Run full test suite
2. Build the application
3. `git push`
4. `gh release create v<version> --generate-notes`
5. Verify deployment status

$ARGUMENTS

## Args
- `$0` or `$version`: specific version tag (e.g. `v1.2.3`)
