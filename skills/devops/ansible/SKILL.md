---
name: ansible
description: >
  Use this skill when the user says 'Ansible', 'ansible-playbook', 'ansible-galaxy',
  'playbook', 'inventory', 'role', 'task', 'module', 'ad-hoc command',
  'configuration management', 'infrastructure automation', 'idempotent',
  'Ansible Tower', 'AWX', 'Ansible Automation Platform'.
  Covers: playbooks, roles, inventory management, modules, variables,
  conditionals, loops, Jinja2 templates, vault encryption, Tower/AWX,
  collection development, CI/CD integration, idempotent automation.
  Do NOT use for: Terraform (use terraform), Puppet, Chef, SaltStack, or
  other configuration management tools.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, ansible, configuration-management, automation, phase-5]
---

# Ansible

## Purpose
Automate configuration management, application deployment, and infrastructure orchestration using Ansible playbooks, roles, and modules with idempotency and security best practices.

## Agent Protocol

### Trigger
Exact user phrases: "Ansible", "ansible-playbook", "playbook", "inventory", "role", "task", "ansible-galaxy", "ansible-vault", "Ansible Tower", "AWX", "Ansible Automation Platform".

### Input Context
Before activating, verify:
- Managed node OS (RHEL, Debian, Windows, network devices) — affects module selection.
- Inventory source (static INI/YAML, dynamic from cloud/inventory plugin).
- Authentication method (SSH key, password with sshpass, WinRM, API token).
- Ansible control node version (2.9 vs 2.14+ changes module behavior).
- Execution mode (ad-hoc, playbook, pull-mode, Tower/AWX workflow).

### Output Artifact
Writes to Ansible playbooks YAML, role directory structure, inventory files, Jinja2 templates, and vars files.

### Response Format
YAML playbooks/roles with inline configuration. No extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Playbook defined with idempotent tasks.
- [ ] Inventory configured (static or dynamic).
- [ ] Variables externalized in group_vars/host_vars.
- [ ] Roles structured per Ansible Galaxy best practices.
- [ ] Sensitive data encrypted with ansible-vault.
- [ ] Idempotency verified (playbook can be re-run safely).

### Max Response Length
Direct file write. No response text.

## Architecture Decision Trees

### Execution Mode: Ad-hoc vs Playbook vs Pull vs Tower/AWX
| Mode | Use Case | When to Use |
|---|---|---|
| Ad-hoc | Single task, quick check | "Restart service X on all web servers" |
| Playbook | Multi-step orchestration | Full application deployment with pre/post steps |
| Pull mode | Ephemeral nodes, auto-provisioning | Containers, auto-scaling groups, IoT devices |
| Tower/AWX | Enterprise, RBAC, scheduling | >50 nodes, team access, compliance auditing |

### Module Choice by Task Type
| Task | Recommended Module | Alternative |
|---|---|---|
| Package install | `package` (OS-agnostic) | `apt`/`yum`/`dnf` for OS-specific options |
| File operations | `copy`, `template`, `lineinfile` | `blockinfile` for multi-line blocks |
| Service control | `service` (generic) | `systemd` for systemd-specific features |
| Command execution | `command` (idempotent shell) | `shell` when pipes/redirects needed |
| Cloud provisioning | `amazon.aws.ec2_instance` (collection) | Raw `ec2` module (deprecated) |
| Docker management | `community.docker.docker_container` | `docker compose` module |
| Kubernetes | `kubernetes.core.k8s` | `helm` module for Helm charts |
| Git operations | `git` | `subversion` for SVN repos |
| Database | `mysql_db`, `postgresql_db` | `mongo` modules |
| Windows | `win_package`, `win_service` | `win_command` as fallback |

### Inventory Source Decision
| Scenario | Best Choice |
|---|---|
| < 50 static servers | INI or YAML inventory files |
| AWS EC2 dynamic | `amazon.aws.aws_ec2` inventory plugin |
| GCP Compute | `google.cloud.gcp_compute` inventory plugin |
| Azure VMs | `azure.azcollection.azure_rm` inventory plugin |
| VMware vSphere | `community.vmware.vmware_vm_inventory` |
| Kubernetes pods | `kubernetes.core.k8s` inventory |
| Mixed cloud/on-prem | Custom script or Tower/AWX smart inventories |

## Quick Start
Inventory file with host groups → ansible.cfg for optimization → Playbook with pre_tasks, roles, post_tasks → Encrypt secrets with ansible-vault → Run with `ansible-playbook -i inventory site.yml --ask-vault-pass`.

## Core Workflow

### Step 1: Ansible Configuration
```ini
# ansible.cfg
[defaults]
inventory = ./inventory/hosts.ini
host_key_checking = False
retry_files_enabled = False
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_cache
fact_caching_timeout = 3600
stdout_callback = yaml
callback_whitelist = profile_tasks, timer, mail
ansible_managed = Ansible managed: {file} modified on %Y-%m-%d %H:%M:%S

[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
control_path = /tmp/ansible-%%h-%%p-%%r
```

### Step 2: Inventory Structure
```ini
# inventory/hosts.ini
[web]
web-01 ansible_host=10.0.1.10 ansible_user=deploy
web-02 ansible_host=10.0.1.11 ansible_user=deploy

[db]
db-primary ansible_host=10.0.2.10 ansible_user=deploy
db-replica ansible_host=10.0.2.11 ansible_user=deploy

[cache]
redis-01 ansible_host=10.0.3.10 ansible_user=deploy

[production:children]
web
db
cache

[production:vars]
ansible_ssh_private_key_file = ~/.ssh/production_rsa
environment = production
```

```yaml
# inventory/hosts.yml — YAML format for complex setups
all:
  children:
    web:
      hosts:
        web-01:
          ansible_host: 10.0.1.10
        web-02:
          ansible_host: 10.0.1.11
      vars:
        http_port: 443
        ssl_enabled: true
    db:
      hosts:
        db-primary:
          ansible_host: 10.0.2.10
        db-replica:
          ansible_host: 10.0.2.11
    production:
      children:
        web: {}
        db: {}
```

### Step 3: Variable Organization
```yaml
# group_vars/all.yml — applies to all hosts
ntp_servers:
  - 0.pool.ntp.org
  - 1.pool.ntp.org
timezone: UTC
package_cache_valid_hours: 24

# group_vars/web.yml — applies to web group
nginx_worker_processes: 4
nginx_worker_connections: 2048
app_replicas: 2

# host_vars/web-01.yml — applies only to web-01
ansible_host: 10.0.1.10
custom_certificate: web-01.example.com.pem
```

### Step 4: Role Structure
```
roles/
  nginx/
    defaults/          # Lowest precedence vars
      main.yml
    vars/              # Higher precedence vars
      main.yml
    tasks/
      main.yml
      ssl.yml
      security.yml
    handlers/
      main.yml
    templates/
      nginx.conf.j2
      site.conf.j2
    files/
      dhparam.pem
    meta/
      main.yml
    tests/
      test.yml
      inventory
```

### Step 5: Playbook with Roles
```yaml
# site.yml — main playbook
---
- name: Configure all production servers
  hosts: production
  become: true
  gather_facts: true
  pre_tasks:
    - name: Update apt cache
      apt:
        update_cache: true
        cache_valid_time: "{{ package_cache_valid_hours * 3600 }}"
      when: ansible_os_family == "Debian"

    - name: Set hostname
      hostname:
        name: "{{ inventory_hostname }}"
      tags: [system, hostname]

  roles:
    - role: common
      tags: [common]

    - role: nginx
      when: "'web' in group_names"
      tags: [web, nginx]

    - role: postgresql
      when: "'db' in group_names"
      tags: [db, postgresql]

    - role: redis
      when: "'cache' in group_names"
      tags: [cache, redis]

  post_tasks:
    - name: Register with monitoring
      uri:
        url: "https://monitoring.internal/register"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          groups: "{{ group_names }}"
        status_code: 201
      tags: [monitoring]
```

### Step 6: Idempotent Tasks
```yaml
# roles/nginx/tasks/main.yml
---
- name: Install nginx
  ansible.builtin.package:
    name: nginx
    state: present  # idempotent — won't reinstall if present

- name: Remove default site
  ansible.builtin.file:
    path: /etc/nginx/sites-enabled/default
    state: absent  # idempotent — no-op if already absent

- name: Deploy nginx config
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    mode: '0644'
    owner: root
    group: root
    validate: nginx -t %s  # validate before applying
  notify: reload nginx      # only restarts if config changed

- name: Deploy site config
  ansible.builtin.template:
    src: "{{ app_template | default('site.conf.j2') }}"
    dest: "/etc/nginx/sites-available/{{ app_name }}.conf"
    mode: '0644'
  notify: reload nginx

- name: Enable site
  ansible.builtin.file:
    src: "/etc/nginx/sites-available/{{ app_name }}.conf"
    dest: "/etc/nginx/sites-enabled/{{ app_name }}.conf"
    state: link
  notify: reload nginx
```

```yaml
# roles/nginx/handlers/main.yml
---
- name: reload nginx
  ansible.builtin.systemd:
    name: nginx
    state: reloaded  # graceful reload, no connection drop
    daemon_reload: true
```

### Step 7: Jinja2 Templating
```jinja
# roles/nginx/templates/nginx.conf.j2
user www-data;
worker_processes {{ nginx_worker_processes }};
worker_rlimit_nofile {{ nginx_worker_connections * 2 }};
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections {{ nginx_worker_connections }};
    multi_accept on;
    use epoll;
}

http {
    ##
    # Basic Settings
    ##
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 64M;
    server_tokens off;

    ##
    # SSL Settings
    ##
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    ##
    # Logging Settings
    ##
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    ##
    # Virtual Host Configs
    ##
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

### Step 8: Ansible Vault for Secrets
```yaml
# Encrypt a file
# ansible-vault encrypt group_vars/production/vault.yml

# vault.yml (encrypted)
vault_db_password: "s3cur3p@ssw0rd!"
vault_api_key: "ak-abc123def456"
vault_ssl_private_key: |
  -----BEGIN PRIVATE KEY-----
  MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
  -----END PRIVATE KEY-----

# Reference in playbook
- name: Configure database
  postgresql_db:
    name: "{{ app_name }}"
    password: "{{ vault_db_password }}"
  no_log: true  # prevent password logging
```

### Step 9: Dynamic Inventory with AWS
```yaml
# inventory/aws_ec2.yml
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
  - us-west-2
hostnames:
  - private-dns-name
keyed_groups:
  - key: tags.Environment
    prefix: env
  - key: tags.Role
    prefix: role
  - key: placement.region
    prefix: region
filters:
  instance-state-name: running
  tag:Environment: production
compose:
  ansible_host: private_ip_address
```

## Tool Comparison: Ansible vs Alternatives

| Feature | Ansible | Puppet | Chef | SaltStack |
|---|---|---|---|---|
| Architecture | Agentless (SSH/WinRM) | Agent (pull) | Agent (pull) | Hybrid (agent/agentless) |
| Language | YAML (playbooks) | DSL (Puppet lang) | Ruby DSL | YAML + Jinja |
| Idempotency | Built-in (modules) | Built-in | Built-in | Built-in |
| Learning curve | Low | Medium | High | Medium |
| Windows support | Good (WinRM) | Good | Good | Moderate |
| Cloud dynamic inventory | Plugins | Plugins | Community | Plugins |
| Orchestration | Built-in | Separate (Bolt) | Built-in | Built-in |
| Enterprise offering | AAP/Tower | Puppet Enterprise | Chef Automate | SaltStack Config |
| Community | Large | Moderate | Moderate | Moderate |
| Push vs Pull | Push (default) | Pull | Pull | Both |
| Vault integration | Built-in | Hiera + eyaml | Data bags | Built-in |

## Anti-Patterns

### Anti-Pattern 1: Shell/Command Overuse
Using `shell` or `command` modules when a dedicated module exists. Prevents idempotency and idempotent checking.

### Anti-Pattern 2: Flattened Variable Structure
Putting all variables in `group_vars/all.yml` instead of organizing by group/host. Leads to variable conflicts and unclear precedence.

### Anti-Pattern 3: Skipping Idempotent Patterns
Tasks that don't check current state before making changes. Use `state: present/absent`, `creates:`, or `changed_when` for idempotency.

### Anti-Pattern 4: Hardcoded Secrets
Storing passwords in plaintext playbooks. Always use `ansible-vault` or external secret management (HashiCorp Vault, AWS Secrets Manager).

### Anti-Pattern 5: No Idempotency Check
Assuming a task only runs once without `check_mode` or `--diff` flag validation. Always test with `--check --diff`.

### Anti-Pattern 6: Monolithic Playbooks
Single massive playbook instead of modular roles. Roles should be reusable across playbooks and projects.

## Production Considerations

### Security
- Encrypt all secrets with `ansible-vault` and store vault password in a secrets manager.
- Use SSH CA-signed keys or hardware-backed SSH keys for production access.
- Enable `no_log: true` on tasks that handle passwords, tokens, or keys.
- Use `become` only when necessary; scope become to specific tasks.
- Disable SSH password authentication; use key-based authentication.
- Validate playbooks with `ansible-lint` before execution.

### Performance
- Enable SSH pipelining (`pipelining = True` in ansible.cfg) for 2-5x speedup.
- Use `strategy: free` for parallel execution across hosts (vs default `linear`).
- Configure `forks = 50` (default is 5) for larger environments.
- Enable fact caching (JSON file or Redis) to speed up repeated runs.
- Use `gathering = smart` to only gather facts when needed.

### Error Handling
- Use `ignore_errors: true` only for non-critical tasks; handle with `failed_when`.
- Set `max_fail_percentage` to abort when too many hosts fail.
- Use `any_errors_fatal` for tasks that must succeed on all hosts.
- Implement `rescue` and `always` blocks for error recovery.

### CI/CD Integration
```yaml
# .github/workflows/ansible-ci.yml
name: Ansible CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install ansible ansible-lint
      - run: ansible-lint site.yml
  syntax:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install ansible
      - run: ansible-playbook site.yml --syntax-check
  molecule:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        distro: [ubuntu-22.04, debian-11, centos-9]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
      - run: pip install molecule molecule-plugins[docker] ansible
      - run: molecule test --scenario-name default
```

## Troubleshooting Guide

| Issue | Likely Cause | Solution |
|---|---|---|
| SSH connection timeout | Control node can't reach target | Verify security groups, SSH port, `ansible_host` value |
| Permission denied | Wrong SSH key or user | Check `ansible_user` and private key path |
| Module not found | Ansible version too old | Upgrade to 2.14+; install collection |
| Task not idempotent | Module without state check | Use dedicated module with `state: present/absent` |
| Vault decryption fails | Wrong vault password | Re-encrypt with correct vault ID/password |
| Variable undefined | Missing in group_vars/host_vars | Use `{{ variable | default('fallback') }}` |
| Template error | Jinja2 syntax issue | Test template with `ansible all -m debug -a 'msg={{ template }}'` |

## Rules & Constraints
- Playbooks must be idempotent — running twice produces the same result.
- Secrets must use ansible-vault encryption — never plaintext in YAML.
- Use FQCN (Fully Qualified Collection Names) like `ansible.builtin.copy` over short names.
- Pin collection versions in `requirements.yml`.
- Roles go in `roles/` directory, not inline in playbooks.
- Variables go in `group_vars/` and `host_vars/`, not in playbook header.
- Use `ansible-lint` before every commit — enforce in CI.
- Use `check_mode` (--check) before applying changes to production.
- Tag all tasks (`tags: [web, config]`) for selective execution.
- One playbook per workflow; split by environment (dev/staging/prod).

## Output Format
Ansible playbook YAML, role directory structure, inventory YAML/INI, Jinja2 templates.

## References
  - references/ansible-advanced.md
  - references/ansible-best-practices.md
  - references/ansible-fundamentals.md
  - references/ansible-roles.md
  - references/ansible-security.md
  - references/ansible-tower.md
  - references/automation-playbooks.md
  - references/inventory-config.md
  - references/dynamic-inventory-guide.md

## Handoff
After completing this skill:
- Next skill: **terraform** — IaC provisioning, then Ansible for configuration
- Pass context: inventory structure, role list, vault password location, CI/CD integration
