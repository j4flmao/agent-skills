# Ansible Role Design

## Role Convention
- Every role does ONE thing (single responsibility principle).
- `defaults/` for configurable variables (lowest precedence, overridable by inventory).
- `vars/` for non-overridable variables (constants, internal calculations).
- `tasks/main.yml` as entry point; use `include_tasks` for multi-stage workflows.
- `handlers/` for service restarts; notify handlers from multiple tasks, never duplicate.
- `templates/` for config files (Jinja2); use `.j2` extension.
- `files/` for static files that don't need template processing.
- `meta/main.yml` for role dependencies and galaxy info.

```
my-role/
├── defaults/
│   └── main.yml          # User-facing defaults
├── vars/
│   └── main.yml          # Non-overridable variables
├── tasks/
│   ├── main.yml          # Entry point
│   ├── install.yml       # Installation steps
│   └── configure.yml     # Configuration steps
├── handlers/
│   └── main.yml          # Service restart handlers
├── templates/
│   └── config.conf.j2    # Jinja2 config template
├── files/
│   └── static.conf       # Static config file
├── meta/
│   └── main.yml          # Dependencies + galaxy metadata
├── molecule/
│   └── default/          # Test scenarios
└── README.md             # Document inputs, outputs, dependencies
```

## Dependencies
```yaml
# meta/main.yml
dependencies:
  - role: common-tools
    version: ">=1.0,<2.0"
  - role: geerlingguy.docker
```

## Variables Precedence (lowest to highest)
1. Role defaults (`defaults/main.yml`)
2. Inventory group_vars
3. Inventory host_vars
4. Play vars
5. `vars/main.yml`
6. `include_vars`
7. Role parameters (passed in play)

## Tags Convention
- Tag every task with at least one tag for selective execution.
- Use hierarchical tags: `install`, `configure`, `service`, `firewall`.
- Common tags: `always`, `never`, `debug`, `validate`.
- `tags: always` runs unless `--skip-tags always` is specified.

## Testing with Molecule
```yaml
# molecule/default/molecule.yml
dependency:
  name: galaxy
driver:
  name: docker
platforms:
  - name: instance
    image: geerlingguy/docker-${MOLECULE_DISTRO:-ubuntu2204}-ansible:latest
provisioner:
  name: ansible
verifier:
  name: ansible
```

## Anti-Patterns
- Conditional `include_role` inside loops (`include_role` is static; use `include_role` with `loop` sparingly).
- Hardcoding paths that differ across OS distros (use `ansible_facts['os_family']` or `vars/{{ ansible_os_family }}.yml`).
- Multiple roles modifying the same config file (race conditions; use a single config management role).
- Role with >15 tasks in main.yml (split into include files by phase).
