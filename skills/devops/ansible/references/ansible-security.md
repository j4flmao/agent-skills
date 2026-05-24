# Ansible Security

## Ansible Vault

```bash
# Encrypt a file
ansible-vault encrypt secrets.yml

# View encrypted file
ansible-vault view secrets.yml

# Edit encrypted file
ansible-vault edit secrets.yml

# Rekey (change password)
ansible-vault rekey secrets.yml

# Encrypt a string for use in playbook
ansible-vault encrypt_string 'my_secret_password' --name 'db_password'

# Run playbook with vault password
ansible-playbook site.yml --ask-vault-pass
# or
ansible-playbook site.yml --vault-password-file vault.pass
```

| Vault Method | When |
|-------------|------|
| Password file | CI/CD automation |
| Ask password | Interactive use |
| AWX credential | AWX/Tower managed |
| Script (e.g., Vault CLI) | External secret store |

## SSH Hardening

```ini
# ansible.cfg
[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s -o StrictHostKeyChecking=accept-new
pipelining = True
timeout = 30
control_path = /tmp/ansible-%%h-%%p-%%r

# Host key checking
host_key_checking = True
```

## Secrets Management in AWX

```yaml
# AWX credential types
- name: Machine credential
  inputs:
    username: deploy
    ssh_key_data: "{{ lookup('file', '~/.ssh/id_rsa') }}"

- name: Vault credential
  inputs:
    vault_password: "{{ secret_password }}"

- name: Custom credential
  inputs:
    fields:
      - id: api_token
        type: string
        secret: true
```

## Compliance Automation

```yaml
- name: CIS Benchmark Audit
  hosts: all
  tasks:
    - name: Ensure root login is disabled
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^PermitRootLogin'
        line: 'PermitRootLogin no'
      notify: restart sshd

    - name: Ensure password expiration is configured
      lineinfile:
        path: /etc/login.defs
        regexp: '^PASS_MAX_DAYS'
        line: 'PASS_MAX_DAYS 90'
```

## Secrets Management

| Practice | Implementation |
|----------|---------------|
| No secrets in playbooks | Use `{{ vault_* }}` variables |
| Separate vault files | `group_vars/all/vault.yml` |
| Encrypted per environment | `vault/production.yml`, `vault/staging.yml` |
| Dynamic secrets | HashiCorp Vault lookup plugin |
| AWS/Azure secrets | `aws_secret` / `azure_keyvault_secret` lookup |
| Short-lived credentials | IAM role assumption, managed identity |

## Security Scanning with Ansible

```yaml
- name: Vulnerability scan
  hosts: all
  tasks:
    - name: Check for known vulnerabilities
      command: trivy image {{ image_name }}:{{ tag }}
      register: trivy_result
      changed_when: false
    - name: Block on critical vulnerabilities
      fail:
        msg: "CRITICAL vulnerability found: {{ item }}"
      loop: "{{ trivy_result.stdout_lines | select('search', 'CRITICAL') }}"
```
