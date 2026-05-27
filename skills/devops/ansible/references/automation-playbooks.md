# Ansible Automation Playbooks

## Overview
Ansible playbooks define automation workflows using YAML. They orchestrate tasks across inventory hosts using idempotent modules. This reference covers playbook structure, variables, conditionals, loops, roles, and advanced patterns.

## Playbook Structure

### Basic Playbook
```yaml
---
- name: Configure web servers
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
```

### Multiple Plays
```yaml
---
- name: Configure all servers
  hosts: all
  tasks:
    - name: Set common config
      template:
        src: common.conf.j2
        dest: /etc/common.conf

- name: Deploy application
  hosts: app_servers
  tasks:
    - name: Deploy app binary
      copy:
        src: app.tar.gz
        dest: /opt/app/
```

## Variables and Facts

### Variable Sources
```yaml
# Play-level vars
- hosts: all
  vars:
    app_version: "1.2.3"
    environment: production

# Variable files
- hosts: all
  vars_files:
    - vars/common.yml
    - "vars/{{ environment }}.yml"

# Registered variables
- name: Check disk space
  command: df -h /data
  register: disk_result

- name: Show disk info
  debug:
    msg: "{{ disk_result.stdout_lines }}"
```

### Facts and Caching
```yaml
- name: Gather specific facts
  setup:
    filter:
      - ansible_os_family
      - ansible_distribution_version

- name: Use custom facts
  debug:
    msg: "OS: {{ ansible_os_family }} {{ ansible_distribution_version }}"

# Fact caching
- hosts: all
  gather_facts: yes
  fact_caching: jsonfile
  fact_caching_connection: /tmp/ansible_facts
  fact_caching_timeout: 3600
```

## Conditionals

### When Statements
```yaml
- name: Install Apache on Debian
  apt:
    name: apache2
    state: present
  when: ansible_os_family == "Debian"

- name: Install Apache on RedHat
  yum:
    name: httpd
    state: present
  when: ansible_os_family == "RedHat"

- name: Restart service if config changed
  service:
    name: nginx
    state: restarted
  when: nginx_config_result.changed
```

### Complex Conditions
```yaml
- name: Conditional with multiple conditions
  command: /usr/local/bin/reconfigure
  when:
    - ansible_os_family == "Debian"
    - ansible_distribution_version is version("20.04", ">=")
    - not nginx_config_result.changed

- name: Using Jinja2 expressions
  debug:
    msg: "Running in {{ 'production' if environment == 'prod' else 'staging' }}"
```

## Loops

### Standard Loops
```yaml
- name: Install required packages
  apt:
    name: "{{ item }}"
    state: present
  loop:
    - git
    - curl
    - htop
    - jq

- name: Create users with groups
  user:
    name: "{{ item.name }}"
    groups: "{{ item.groups }}"
    shell: /bin/bash
  loop:
    - { name: alice, groups: "developers" }
    - { name: bob, groups: "ops" }
    - { name: charlie, groups: "developers,ops" }
```

### Loop Control
```yaml
- name: Process with index
  debug:
    msg: "Item {{ ansible_loop.index }}: {{ item.name }}"
  loop: "{{ users }}"
  loop_control:
    index_var: ansible_loop.index
    label: "{{ item.name }}"
    pause: 1

# Until loop
- name: Wait for service
  uri:
    url: http://localhost:8080/health
    status_code: 200
  register: result
  until: result.status == 200
  retries: 30
  delay: 2
```

## Roles

### Directory Structure
```
roles/
├── common/
│   ├── tasks/
│   │   └── main.yml
│   ├── handlers/
│   │   └── main.yml
│   ├── templates/
│   │   └── config.j2
│   ├── files/
│   │   └── default.conf
│   ├── vars/
│   │   └── main.yml
│   ├── defaults/
│   │   └── main.yml
│   └── meta/
│       └── main.yml
└── app_server/
    ├── tasks/
    │   └── main.yml
    └── templates/
        └── app_config.j2
```

### Using Roles
```yaml
---
- hosts: webservers
  roles:
    - role: common
      vars:
        nginx_port: 8080
    - role: app_server
    - role: monitoring
      when: environment == "production"

# Alternative syntax
- hosts: webservers
  roles:
    - common
    - { role: app_server, tags: ["app"] }
```

## Templates

### Jinja2 Templates
```jinja2
# templates/nginx.conf.j2
server {
    listen {{ nginx_port }};
    server_name {{ server_name }};

    root {{ web_root }};
    index index.html;

    location / {
        proxy_pass http://localhost:{{ app_port }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /static/ {
        alias {{ static_dir }};
        expires 30d;
    }
}
```

### Template Task
```yaml
- name: Deploy nginx configuration
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/sites-available/default
    owner: root
    group: root
    mode: '0644'
  notify: reload nginx

- name: Create config from inline template
  copy:
    content: |
      APP_VERSION={{ app_version }}
      DB_HOST={{ db_host }}
      DB_PORT={{ db_port }}
    dest: /etc/app.env
```

## Tags and Includes

### Tag-Based Execution
```yaml
tasks:
  - name: Install packages
    apt:
      name: "{{ item }}"
    loop: "{{ packages }}"
    tags:
      - packages
      - install

  - name: Configure app
    template:
      src: app.conf.j2
      dest: /etc/app.conf
    tags:
      - configuration

# Run: ansible-playbook site.yml --tags "configuration"
# Skip: ansible-playbook site.yml --skip-tags "packages"
```

### Task Includes and Imports
```yaml
# Static import (pre-processed)
- import_tasks: setup.yml
  tags: setup

# Dynamic include (processed at runtime)
- include_tasks: "{{ task_file }}"
  when: task_file is defined

# Include role dynamically
- include_role:
    name: "{{ role_name }}"
```

## Error Handling

### Block and Rescue
```yaml
- block:
    - name: Attempt migration
      command: /usr/local/bin/migrate

  rescue:
    - name: Rollback migration
      command: /usr/local/bin/rollback

    - name: Notify failure
      mail:
        to: ops@example.com
        subject: "Migration failed"
        body: "Migration failed, rollback executed"

  always:
    - name: Cleanup temp files
      file:
        path: /tmp/migration_backup
        state: absent
```

## Key Points
- Playbooks are YAML files with plays, hosts, and tasks
- Variables come from many sources with precedence rules
- Facts provide system information for conditional logic
- Loops iterate over lists and dictionaries
- Roles organize playbooks into reusable components
- Templates use Jinja2 for dynamic file generation
- Tags control which tasks execute during a run
- Block/rescue/always provides error handling
- idempotent modules ensure safe re-execution
- Use ansible-lint for playbook quality checks
- Vault encrypts sensitive variable data
