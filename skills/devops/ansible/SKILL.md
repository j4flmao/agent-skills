---
name: ansible
description: >
  Use this skill when implementing Ansible configuration management — playbook structure, roles, inventory, vault, modules, idempotency, CI/CD integration. This skill enforces: Ansible Galaxy role structure, group-based inventory organization, encrypted secrets via ansible-vault, Molecule testing, idempotent playbooks. Do NOT use for: infrastructure provisioning (use Terraform), Kubernetes configuration (use Helm), container orchestration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, ansible, phase-5]
---

# Ansible Patterns

## Purpose
Define and enforce Ansible playbook structure, role design, inventory organization, and CI/CD integration.

## Agent Protocol

### Trigger
User request includes: `ansible`, `playbook`, `ansible role`, `ansible vault`, `inventory`, `ansible module`, `configuration management`, `ansible-galaxy`, `molecule`.

### Input Context
- Target infrastructure (bare metal, VMs, cloud)
- Configuration management needs
- Inventory source (static, dynamic, cloud)
- Secrets management requirement

### Output Artifact
A markdown document containing:
- Repository structure (playbooks, roles, inventory)
- Role design patterns (tasks, handlers, defaults, vars, templates)
- Inventory organization (static groups, dynamic in cloud)
- Vault strategy for secrets
- Testing strategy (Molecule)
- CI/CD integration

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Role structure aligned with Ansible Galaxy best practices
- Inventory organized by group hierarchy
- Vault strategy defined (per env or per secret)
- Molecule tests configured for roles
- Idempotency documented and enforced

### Max Response Length
4096 tokens

## Workflow

### Step 1: Set Up Repository Structure
```
ansible/
├── playbooks/
│   ├── site.yml                # Master playbook
│   ├── webservers.yml
│   ├── databases.yml
│   └── monitoring.yml
├── roles/
│   ├── common/
│   │   ├── tasks/
│   │   │   └── main.yml
│   │   ├── handlers/
│   │   │   └── main.yml
│   │   ├── defaults/
│   │   │   └── main.yml
│   │   ├── vars/
│   │   │   └── main.yml
│   │   ├── templates/
│   │   ├── files/
│   │   ├── meta/
│   │   │   └── main.yml
│   │   ├── molecule/
│   │   │   └── default/
│   │   │       ├── molecule.yml
│   │   │       ├── converge.yml
│   │   │       └── verify.yml
│   │   └── README.md
│   ├── nginx/
│   ├── postgresql/
│   ├── docker/
│   └── monitoring/
├── inventories/
│   ├── production/
│   │   ├── hosts.ini
│   │   ├── group_vars/
│   │   │   ├── all.yml
│   │   │   ├── webservers.yml
│   │   │   └── databases.yml
│   │   └── host_vars/
│   │       └── web01.yml
│   ├── staging/
│   │   └── ...
│   └── development/
│       └── ...
├── vault/
│   ├── production.yml
│   ├── staging.yml
│   └── development.yml
├── ansible.cfg
└── requirements.yml
```

### Step 2: Design Roles

```yaml
# roles/nginx/defaults/main.yml
nginx_port: 80
nginx_worker_processes: auto
nginx_max_body_size: 1M
nginx_enable_ssl: false
nginx_ssl_cert_path: /etc/ssl/certs
nginx_ssl_key_path: /etc/ssl/private
```

```yaml
# roles/nginx/tasks/main.yml
---
- name: Install Nginx
  apt:
    name: nginx
    state: present
  become: yes

- name: Configure Nginx
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify: restart nginx

- name: Enable Nginx
  service:
    name: nginx
    enabled: yes
    state: started
```

```yaml
# roles/nginx/handlers/main.yml
---
- name: restart nginx
  service:
    name: nginx
    state: restarted
```

### Step 3: Create Templates
```jinja
# roles/nginx/templates/nginx.conf.j2
worker_processes {{ nginx_worker_processes }};
events {
    worker_connections 1024;
}
http {
    server {
        listen {{ nginx_port }};
        client_max_body_size {{ nginx_max_body_size }};
        location / {
            proxy_pass http://localhost:8080;
        }
    }
}
```

### Step 4: Organize Inventory
```ini
# inventories/production/hosts.ini
[webservers]
web01 ansible_host=10.0.1.10 ansible_user=ubuntu
web02 ansible_host=10.0.1.11 ansible_user=ubuntu

[databases]
db01 ansible_host=10.0.2.10 ansible_user=ubuntu

[monitoring]
monitor01 ansible_host=10.0.3.10 ansible_user=ubuntu

[production:children]
webservers
databases
monitoring
```

```yaml
# inventories/production/group_vars/all.yml
ansible_python_interpreter: /usr/bin/python3
ntp_servers:
  - 0.pool.ntp.org
  - 1.pool.ntp.org
```

### Step 5: Configure Vault Strategy
```bash
# Encrypt entire variable file
ansible-vault encrypt inventories/production/group_vars/all.yml

# Or encrypt specific variables inline
# In vault/production.yml
vault_db_password: !vault |
  $ANSIBLE_VAULT;1.1;AES256
  663864396532363...

# Reference in playbook
- name: Set DB password
  template:
    src: app.conf.j2
    dest: /etc/app.conf
  vars:
    db_password: "{{ vault_db_password }}"
```

### Step 6: Test with Molecule
```yaml
# roles/nginx/molecule/default/molecule.yml
dependency:
  name: galaxy
driver:
  name: docker
platforms:
  - name: instance
    image: ubuntu:22.04
    pre_build_image: true
provisioner:
  name: ansible
verifier:
  name: ansible
```

### Step 7: Integrate with CI/CD
```yaml
# .github/workflows/ansible.yml
name: Ansible
on:
  pull_request:
    paths: ['ansible/**']
  push:
    branches: [main]
    paths: ['ansible/**']

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install ansible-lint
        run: pip install ansible-lint
      - name: Lint playbooks
        run: ansible-lint playbooks/
      - name: Syntax check
        run: ansible-playbook playbooks/site.yml --syntax-check
```

## Rules
- Every playbook must pass `ansible-lint` and `--syntax-check`.
- All plays idempotent — running twice produces identical state.
- Secrets encrypted with `ansible-vault`. Never plaintext.
- Roles published with semantic versioning.
- `gather_facts: no` unless facts are actually used (performance).
- Use `tags:` on all tasks for selective execution.

## References
  - references/ansible-advanced.md — Ansible Advanced Topics
  - references/ansible-best-practices.md — Ansible Best Practices
  - references/ansible-fundamentals.md — Ansible Fundamentals
  - references/ansible-roles.md — Ansible Role Design
  - references/ansible-security.md — Ansible Security
  - references/ansible-tower.md — Ansible AWX/Tower
  - references/automation-playbooks.md — Ansible Automation Playbooks
  - references/inventory-config.md — Ansible Inventory and Configuration
## Handoff
Hand off to `devops/terraform/SKILL.md` for infrastructure provisioning. Hand off to `devops/monitoring/SKILL.md` for monitoring agent configuration.
