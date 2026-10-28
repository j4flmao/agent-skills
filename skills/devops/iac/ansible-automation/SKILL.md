---
name: ansible-automation
description: >
  Use this skill when the user says 'ansible playbook basics', 'ansible inventory', 'ansible idempotent task', 'ansible roles structure', 'ansible vault', 'ansible handlers', 'configure servers with ansible', 'ansible-lint', 'molecule test'. Writes idempotent, lint-clean Ansible automation: inventory, playbooks, roles, handlers, secrets with Ansible Vault, and testing with Molecule. Do NOT use for: advanced Ansible (AWX/AAP, dynamic inventory plugins at scale, custom modules) (ansible), provisioning cloud infrastructure (terraform-patterns / terraform), Kubernetes app deployment (helm-patterns).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [devops, iac, ansible, configuration-management, idempotency]
---

# Ansible Configuration Management

## Purpose
Configure servers reproducibly over SSH (or WinRM/PSRP for Windows) with no agent on targets. Correct Ansible is idempotent: running it twice changes nothing the second time, and `--check --diff` shows exactly what would change.

## Agent Protocol

### Trigger
"ansible playbook", "ansible inventory", "idempotent task", "ansible roles", "ansible vault", "handlers", "configure servers with ansible", "ansible-lint", "molecule".

### Input Context
- Target OS families, connection method, privilege escalation.
- Desired state (packages, files, services, users).
- Secret material and where it should come from.

### Output Artifact
Inventory, playbook, role skeleton. No file unless requested.

### Response Format
```
Inventory: {static INI/YAML | dynamic plugin}
Play: hosts={group} become={yes|no}
Roles: {list}
Secrets: {ansible-vault | lookup from external store}
Verify: ansible-lint, --check --diff, molecule test
```

### Completion Criteria
- [ ] Second run reports `changed=0`.
- [ ] Modules used instead of `shell`/`command` where a module exists; any `command` has `creates`/`changed_when`.
- [ ] FQCN module names (`ansible.builtin.copy`), lint passes.

## Execution Model
- Control node runs `ansible-playbook`; for each task, a module is copied to the target and executed with the target's Python, returning JSON (`changed`, `failed`, results). Network devices and Windows use different connection plugins; the `raw` module needs no Python (used to bootstrap it).
- Plays map host groups → tasks; tasks run in order across hosts in parallel (`forks`, default 5). `serial` gives rolling batches.
- Variable precedence: role defaults (lowest) < inventory group_vars < host_vars < play vars < role vars < task vars < extra vars (`-e`, highest). Put tunables in `defaults/main.yml`.

## Inventory
```yaml
# inventories/prod/hosts.yml
all:
  children:
    web:
      hosts:
        web-01.example.com:
        web-02.example.com:
    db:
      hosts:
        db-01.example.com:
          postgresql_version: 16
  vars:
    ansible_user: deploy
```
Dynamic inventories (cloud plugins like `amazon.aws.aws_ec2`) generate groups from tags.

## Role Layout
```
roles/nginx/
├── defaults/main.yml     # overridable defaults
├── tasks/main.yml
├── handlers/main.yml
├── templates/nginx.conf.j2
└── meta/main.yml
```

```yaml
# roles/nginx/tasks/main.yml
- name: Install nginx
  ansible.builtin.package:
    name: nginx
    state: present

- name: Deploy nginx config
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    owner: root
    group: root
    mode: "0644"
    validate: nginx -t -c %s
  notify: Reload nginx

- name: Ensure nginx is running and enabled
  ansible.builtin.service:
    name: nginx
    state: started
    enabled: true

- name: Initialize app schema once
  ansible.builtin.command: /opt/app/bin/init-db
  args:
    creates: /var/lib/app/.db-initialized   # makes command idempotent

# roles/nginx/handlers/main.yml
- name: Reload nginx
  ansible.builtin.service:
    name: nginx
    state: reloaded
```
Handlers run once at the end of the play (or at `meta: flush_handlers`), only if notified by a changed task.

## Playbook with Rolling Update
```yaml
# site.yml
- name: Configure web tier
  hosts: web
  become: true
  serial: "25%"                 # rolling batches
  max_fail_percentage: 0
  pre_tasks:
    - name: Drain from load balancer
      ansible.builtin.uri:
        url: "https://lb.example.com/api/pools/web/members/{{ inventory_hostname }}/disable"
        method: POST
      delegate_to: localhost
  roles:
    - nginx
  post_tasks:
    - name: Wait for health
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}/healthz"
        status_code: 200
      register: health
      retries: 10
      delay: 3
      until: health.status == 200
```

## Secrets
```bash
ansible-vault encrypt_string 'S3cr3t!' --name 'db_password' >> group_vars/db/vault.yml
ansible-playbook site.yml --vault-password-file ~/.vault_pass   # or a script that fetches from a secret manager
```
Alternatively look up at runtime (`community.hashi_vault.vault_kv2_get`, `amazon.aws.aws_secret` lookups). Use `no_log: true` on tasks handling secrets.

## Testing
```bash
ansible-lint                         # style + best-practice rules
ansible-playbook site.yml --check --diff -l web-01.example.com
molecule test                        # create instance(s), converge, idempotence check, verify, destroy
```

## Anti-Patterns
- `shell: apt-get install -y nginx` instead of the package module.
- `command`/`shell` tasks without `changed_when`/`creates` → always "changed".
- Secrets in plain group_vars committed to Git.
- Huge single playbooks without roles; tags as the only structure.
- `ignore_errors: true` to make runs green.

## Checklist
- [ ] Roles with defaults; FQCN modules; lint clean.
- [ ] Idempotence verified (Molecule idempotence step).
- [ ] Vault or external secret lookups; `no_log` where needed.
- [ ] Rolling `serial` + health checks for service changes.
- [ ] Collections pinned in `requirements.yml`.

## References
- Related skills: `skills/devops/ansible/SKILL.md`, `skills/devops/iac/terraform-patterns/SKILL.md`.
