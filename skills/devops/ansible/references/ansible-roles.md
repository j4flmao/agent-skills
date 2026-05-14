# Ansible Role Design

## Role Convention
- Every role does ONE thing (single responsibility).
- `defaults/` for configurable variables (lowest precedence).
- `vars/` for non-overridable variables.
- `tasks/main.yml` as entry point.
- `handlers/` for service restarts.
- `templates/` for config files (Jinja2).
- `files/` for static files.
- `meta/main.yml` for role dependencies and galaxy info.
