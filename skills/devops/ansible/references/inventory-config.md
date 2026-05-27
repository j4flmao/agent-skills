# Ansible Inventory and Configuration

## Overview
Ansible inventory defines managed hosts and groups. The configuration file (ansible.cfg) controls runtime behavior. This reference covers static/dynamic inventory, patterns, variables, connection settings, and inventory plugins.

## Static Inventory

### INI Format
```ini
# inventory.ini
[webservers]
web1 ansible_host=192.168.1.10 ansible_user=ubuntu
web2 ansible_host=192.168.1.11 ansible_user=ubuntu

[databases]
db1 ansible_host=192.168.1.20
db2 ansible_host=192.168.1.21

[loadbalancers]
lb01 ansible_host=192.168.1.30

[production:children]
webservers
databases
loadbalancers

[production:vars]
ansible_user=deploy
ansible_ssh_private_key_file=/path/to/prod_key
```

### YAML Format
```yaml
# inventory.yml
all:
  children:
    webservers:
      hosts:
        web1:
          ansible_host: 192.168.1.10
          ansible_user: ubuntu
        web2:
          ansible_host: 192.168.1.11
          ansible_user: ubuntu
    databases:
      hosts:
        db1:
          ansible_host: 192.168.1.20
        db2:
          ansible_host: 192.168.1.21
    production:
      children:
        - webservers
        - databases
      vars:
        ansible_user: deploy
        ansible_ssh_private_key_file: /path/to/prod_key
```

## Host Patterns

### Pattern Selection
```yaml
# Single host
ansible web1 -m ping

# Group
ansible webservers -m ping

# All hosts
ansible all -m ping
ansible '*' -m ping

# Multiple groups
ansible webservers:databases -m ping

# Group exclusion
ansible webservers:!databases -m ping

# Intersection
ansible webservers:&production -m ping

# Wildcards
ansible '*.example.com' -m ping
ansible 'web*' -m ping
```

## Host Variables

### Variable Definitions
```ini
# inventory/host_vars/web1.yml
---
ansible_host: 192.168.1.10
ansible_port: 22
ansible_user: ubuntu
app_port: 3000
log_level: debug
monitoring_enabled: true
```

### Group Variables
```ini
# inventory/group_vars/webservers.yml
---
nginx_port: 80
ssl_cert_path: /etc/ssl/certs
max_connections: 1024
health_check_endpoint: /health
```

## Dynamic Inventory

### AWS EC2 Plugin
```yaml
# aws_ec2.yml
plugin: aws_ec2
regions:
  - us-east-1
  - us-west-2
filters:
  tag:Environment: production
keyed_groups:
  - key: tags.Role
    prefix: role
  - key: placement.region
    prefix: aws_region
hostnames:
  - tag:Name
  - dns-name
compose:
  ansible_host: public_ip_address
```

### Custom Script Inventory
```python
#!/usr/bin/env python3
"""Custom dynamic inventory script."""
import json
import subprocess

def get_inventory():
    hosts = subprocess.check_output(["list-instances", "--format", "json"])
    instances = json.loads(hosts)

    inventory = {
        "_meta": {"hostvars": {}},
        "all": {"children": ["webservers", "databases"]},
        "webservers": {"hosts": []},
        "databases": {"hosts": []},
    }

    for inst in instances:
        hostname = inst["hostname"]
        inventory["_meta"]["hostvars"][hostname] = {
            "ansible_user": "admin",
            "ansible_host": inst["private_ip"],
        }

        if inst["role"] == "web":
            inventory["webservers"]["hosts"].append(hostname)
        elif inst["role"] == "db":
            inventory["databases"]["hosts"].append(hostname)

    return inventory

if __name__ == "__main__":
    print(json.dumps(get_inventory()))
```

## Ansible Configuration

### ansible.cfg
```ini
[defaults]
inventory = ./inventory
remote_user = ansible
host_key_checking = False
forks = 20
timeout = 30
log_path = /var/log/ansible.log
ansible_managed = Ansible managed: {file} modified on %Y-%m-%d
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts
fact_caching_timeout = 3600
stdout_callback = yaml
callback_whitelist = profile_tasks

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
pipelining = True
control_path = /tmp/ansible-%%h-%%p-%%r
```

### Environment Variables
```bash
# Override config with environment
export ANSIBLE_INVENTORY=/path/to/inventory
export ANSIBLE_REMOTE_USER=deploy
export ANSIBLE_HOST_KEY_CHECKING=False
export ANSIBLE_FORKS=50
export ANSIBLE_LOG_PATH=/var/log/ansible.log
export ANSIBLE_SSH_PIPELINING=True
```

## Connection Plugins

### SSH Configuration
```yaml
# ansible.cfg
[ssh_connection]
ssh_args: -o ControlMaster=auto -o ControlPersist=60s
pipelining: True
control_path: /tmp/ansible-%%h-%%p-%%r
scp_if_ssh: False
transfer_method: smart
```

### WinRM for Windows
```yaml
# inventory
win_server:
  hosts:
    winsrv1:
      ansible_host: 192.168.1.50
      ansible_connection: winrm
      ansible_winrm_server_cert_validation: ignore
      ansible_user: Administrator
      ansible_password: "{{ vault_win_password }}"
```

## Privilege Escalation

### Become Configuration
```yaml
# Playbook level
- hosts: all
  become: yes
  become_method: sudo
  become_user: root
  become_ask_pass: false

# Task level
- name: Run as specific user
  command: /usr/local/bin/deploy.sh
  become: yes
  become_user: deploy

# Config file
# ansible.cfg
[privilege_escalation]
become = True
become_method = sudo
become_user = root
become_ask_pass = False
```

## Vault for Secrets

### Encrypted Variables
```bash
# Create encrypted file
ansible-vault create secrets.yml

# Encrypt existing file
ansible-vault encrypt vars/passwords.yml

# View encrypted file
ansible-vault view secrets.yml

# Edit encrypted file
ansible-vault edit secrets.yml
```

### Using Vault in Playbooks
```yaml
- hosts: all
  vars_files:
    - secrets.yml

  tasks:
    - name: Use vault variable
      debug:
        msg: "DB password: {{ vault_db_password }}"
      no_log: true

    - name: Configure with secret
      template:
        src: config.j2
        dest: /etc/app/config.ini
      no_log: true
```

## Key Points
- Inventory defines managed hosts and groups in INI or YAML format
- Host patterns filter which hosts to target
- Dynamic inventory plugins integrate with cloud providers
- ansible.cfg controls runtime behavior and SSH settings
- Connection plugins support SSH, WinRM, and local execution
- Privilege escalation (become) enables command execution as other users
- Vault encrypts sensitive variables for secure storage
- Group inheritance allows organizing hosts hierarchically
- Host and group vars override each other by precedence
- Use environment variables to override config file settings
- Fact caching improves performance for large inventories
- Pipelining reduces SSH operations for faster execution
