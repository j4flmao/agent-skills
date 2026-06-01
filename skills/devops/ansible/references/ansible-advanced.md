# Ansible Advanced Topics

## Introduction
Advanced Ansible topics cover production-grade automation patterns, custom module development, AWX/Tower integration, dynamic inventories, and performance optimization.

## Custom Module Development
Write modules in Python with standard Ansible conventions. Modules accept parameters, perform idempotent operations, return JSON results. Use AnsibleModule class for argument parsing, file operations, and exit handling. Include documentation in module DOCUMENTATION, EXAMPLES, and RETURN strings. Test with ansible-test and molecule.

## AWX and Ansible Tower
AWX (open-source) and Tower (commercial) provide web UI, RBAC, and REST API for Ansible. Job templates parameterize playbooks. Inventory syncing from cloud providers. Workflows chain multiple job templates. Schedules for automated runs. Credential management for secrets.

## Dynamic Inventory
Python-based inventory scripts return JSON with _meta for host variables. Inventory plugins (aws_ec2, azure_rm, gcp_compute) integrate with cloud APIs. Cache inventory data to reduce API calls. Group hosts by tags, region, or custom attributes. Use constructed inventory for dynamic group membership.

## Performance Optimization
Use ssh pipelining to reduce SSH connections. Enable persistent SSH connections with ControlMaster. Use async polling for long-running tasks. Set forks to appropriate concurrency level (default 5, max 50+). Use ansible-pull for agent-like push model. Use mitogen strategy plugin for dramatic speedup.

## Advanced Playbook Patterns
Use include_tasks and import_tasks for modular playbooks. Implement rolling updates with serial keyword. Use delegate_to for centralized management tasks. Use run_once for singleton tasks across a batch. Implement error handling with rescue/always blocks. Use tags for selective task execution.

## References
- ansible-fundamentals.md -- Fundamentals
- playbook-development.md -- Playbook Development
- inventory-management.md -- Inventory Management
- ansible-roles.md -- Ansible Roles
- ansible-vault-secrets.md -- Vault and Secrets
