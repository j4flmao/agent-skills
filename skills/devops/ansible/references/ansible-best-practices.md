# Ansible Best Practices

## Performance
- Use `pipelining = True` in ansible.cfg (reduces SSH operations by 50-70%).
- Set `gather_facts: no` unless facts are needed; use `gather_subset: min` when partial facts suffice.
- Use `delegate_to: localhost` for cloud API calls (avoids SSH overhead to remote).
- Use `serial: 10%` or `serial: 1` for rolling updates to control blast radius.
- Use `async:` for long-running tasks that don't need immediate results.
- Disable fact caching if running against fewer than 50 hosts; enable redis-based cache for larger fleets.
- Use `strategy: free` for independent host tasks (no wait for slow hosts).

## Security
- Encrypt secrets with `ansible-vault`; store vault passwords in a secure secret manager (HashiCorp Vault, 1Password, etc.).
- Never use `--ask-pass` — always use SSH keys (preferably ed25519).
- Use `no_log: true` on tasks that handle passwords, tokens, or keys.
- Restrict `become` usage: prefer dedicated sudo rules over blanket passwordless sudo.
- Sign playbooks and roles with GPG when distributing to untrusted networks.
- Validate SSL certificates in URI modules; use `validate_certs: true`.

## Structure
- One `requirements.yml` per project listing all external role dependencies.
- Pin role versions: `src: geerlingguy.nginx version: 3.1.4`.
- Use `group_vars/` and `host_vars/` over inline variables; never hardcode per-environment values.
- Split `group_vars/` by environment (`group_vars/prod/`, `group_vars/staging/`).
- Use `inventory/` with `inventory/hosts.yml` as the inventory source; keep dynamic inventory scripts separate.

## Testing
- Use `ansible-playbook --check --diff` to dry-run before applying.
- Use `molecule` for role testing with scenario-based test matrices.
- Validate syntax: `ansible-playbook --syntax-check playbook.yml`.
- Use `assert` modules to verify post-conditions rather than relying on changed_status.

## CI/CD Integration
```
lint → syntax-check → molecule test (all scenarios) → dry-run (staging) → deploy (prod)
```
- Run `ansible-lint` in CI to enforce community best practices.
- Store vault passwords in CI secrets; never commit vault passwords.
- Use `--vault-id` with multiple vault keys for environment separation.
