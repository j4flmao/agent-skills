# Ansible Testing and Validation

## Molecule Testing
Molecule: framework for Ansible role and playbook testing. Test scenarios: default, alternative OS, alternative config. Drivers: Docker (fast, isolated), Vagrant (full VM), delegated (cloud). Verify: syntax check, idempotency, convergence, custom assertions. Idempotency test ensures no changes on second run.

## Testinfra
Python test framework for infrastructure validation. Test host state: package installed, service running, port listening, file exists. Run with molecule or standalone with ansible_inventory. Tests as Python functions in tests/test_default.py. Assertions: assert host.package("nginx").is_installed. Test Jinja2 template rendering with rendered file comparison.

## Ansible Lint
Rules: syntax, best practices, idempotency, deprecation warnings. Profile: min (security), production (recommended). Custom rules via Python plugins. Ignore paths in .ansible-lint. Run in CI pipeline before playbook execution.

## Playbook Validation
Syntax check: ansible-playbook --syntax-check. Check mode: ansible-playbook --check (dry run). Diff mode: --diff shows changes without applying. Yamllint: validate YAML formatting. Integration tests: full playbook execution in isolated environment.

## CI/CD for Ansible
GitHub Actions: ansible-lint, molecule test on PR. Molecule verify in CI with parallel execution. Terraform dynamic inventory for cloud instances. Ansible Tower/AWX for centralized execution. Pre-commit hooks: ansible-lint, yamllint, schema validation.

## References
- ansible-fundamentals.md -- Fundamentals
- inventory-config.md -- Inventory
- ansible-roles.md -- Roles
- ansible-tower.md -- Tower/AWX
- ansible-best-practices.md -- Best Practices
