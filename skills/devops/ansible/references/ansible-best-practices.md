# Ansible Best Practices

## Performance
- Use `pipelining = True` in ansible.cfg.
- Set `gather_facts: no` unless facts are needed.
- Use `delegate_to: localhost` for cloud API calls.
- Use `serial: 10%` for rolling updates.

## Security
- Encrypt secrets with `ansible-vault`.
- Never use `--ask-pass` — use SSH keys.
- Use `no_log: true` on tasks with secrets.
