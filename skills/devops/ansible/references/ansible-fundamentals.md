# Ansible Fundamentals

## Overview
Ansible is an open-source automation tool for configuration management, application deployment, task automation, and IT orchestration. It uses agentless architecture with SSH/WinRM for remote execution and YAML-based playbooks for declarative automation.

## Core Concepts

### Agentless Architecture
Ansible connects to managed nodes via SSH (Linux) or WinRM (Windows) without installing any agent. It executes tasks asynchronously and cleans up after completion. This reduces management overhead and attack surface compared to agent-based tools.

### Idempotency
Ansible modules are designed to be idempotent -- running the same playbook multiple times produces the same result without side effects. Modules check current state before applying changes, skipping tasks that are already in the desired state.

### Inventory
Inventory defines managed nodes and their grouping. Static inventory uses INI or YAML files. Dynamic inventory pulls from cloud providers (AWS EC2, Azure, GCP) via inventory plugins. Inventory variables can be assigned per host, per group, or nested.

### Modules
Modules are discrete units of code that perform specific tasks (package install, file copy, service management). Ansible ships with hundreds of built-in modules. Custom modules can be written in any language that returns JSON.

### Playbooks
Playbooks are YAML files defining automation workflows. They contain plays (mapping hosts to tasks), tasks (calling modules), handlers (triggered on change), and variables. Playbooks support conditionals, loops, and includes.

## Key Components

### Control Node
Any machine with Python and Ansible installed. Manages inventory, playbooks, and roles. Pushes modules to managed nodes for execution. Should be secured and backed up.

### Managed Nodes
Target systems being automated. No Ansible installation required -- only Python (Linux) or PowerShell (Windows). Nodes need network access to control node or vice versa (pull mode).

### Inventory
```ini
[webservers]
web1.example.com ansible_user=ubuntu
web2.example.com ansible_user=ubuntu

[databases]
db1.example.com ansible_user=admin
db2.example.com ansible_user=admin

[production:children]
webservers
databases
```

### Playbook Structure
```yaml
---
- name: Configure web server
  hosts: webservers
  become: yes
  vars:
    http_port: 80
    max_clients: 200

  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present

    - name: Start nginx service
      service:
        name: nginx
        state: started
        enabled: yes

    - name: Copy configuration
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: restart nginx

  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted
```

## Basic Commands
```bash
# Ad-hoc commands
ansible all -m ping
ansible webservers -m shell -a "uptime"
ansible databases -m apt -a "name=postgresql state=latest" --become

# Playbook execution
ansible-playbook site.yml
ansible-playbook site.yml --check  # Dry run
ansible-playbook site.yml --limit webservers
ansible-playbook site.yml --tags nginx
ansible-playbook site.yml --skip-tags monitoring

# Inventory management
ansible-inventory --list
ansible-inventory --graph
```

## Best Practices
- Use roles to organize playbooks into reusable components.
- Store secrets in Ansible Vault, never plain text in files.
- Use ansible-lint to validate playbook syntax and best practices.
- Implement idempotent tasks -- check mode verifies without changes.
- Use dynamic inventory for cloud environments.
- Pin Ansible and collection versions in requirements.yml.
- Use ansible-doc to explore module options before writing tasks.

## References
- ansible-advanced.md -- Advanced Ansible topics
- playbook-development.md -- Playbook Development
- inventory-management.md -- Inventory Management
- ansible-roles.md -- Ansible Roles
- ansible-vault-secrets.md -- Ansible Vault and Secrets
