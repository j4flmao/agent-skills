# Ansible AWX/Tower

## AWX Architecture

| Component | Purpose |
|-----------|---------|
| Web UI | Dashboard, job monitoring, inventory management |
| API | REST API for automation and CI/CD integration |
| Task Engine | Runs Ansible playbook jobs on isolated worker nodes |
| Database | PostgreSQL — job history, credential store, inventory |
| Redis | Task queue, job event streaming |
| Execution Nodes | Isolated environments for running playbooks (containers/VMs) |

## Job Templates

```yaml
- name: Deploy Application
  job_template:
    name: deploy-app
    project: app-deployment
    playbook: deploy.yml
    inventory: production
    credentials:
      - ssh-key
      - vault-password
    ask_variables_on_launch: true
    extra_vars:
      app_version: "{{ version }}"
    forks: 10
    job_tags: deploy,healthcheck
    timeout: 3600
```

## RBAC

| Role | Scope | Permissions |
|------|-------|-------------|
| Admin | Organization | Full control |
| Auditor | Organization | Read-only |
| Execute | Job Template | Run jobs |
| Admin | Project | Update, delete |
| Use | Credential | Use in job templates |
| Admin | Inventory | Manage groups, hosts |

## Workflows

```yaml
- name: Full Deployment
  workflow_job_template:
    name: full-deploy
    organization: engineering
    schema:
      - job:
          job_template: deploy-app
          success: apply-migrations
          failure: rollback-app
      - job:
          job_template: run-migrations
          identifier: apply-migrations
          success: run-smoke-tests
          failure: rollback-db
      - job:
          job_template: smoke-tests
          identifier: run-smoke-tests
```

## Inventory Management

| Source | Type | Refresh | Use Case |
|--------|------|---------|----------|
| Manual | Static hosts | Manual | Small, stable environments |
| AWS EC2 | Dynamic | Timed | Cloud auto-scaling groups |
| Azure RM | Dynamic | Timed | Azure VM scale sets |
| GCP | Dynamic | Timed | GCP compute instances |
| VMware | Dynamic | Timed | On-premise VM inventory |
| OpenStack | Dynamic | Timed | Private cloud |
| Custom script | Dynamic | Timed | Any API-based source |

## CI/CD Integration

```yaml
# GitHub Actions trigger AWX job
- name: Trigger Ansible deployment
  run: |
    curl -X POST https://awx.example.com/api/v2/job_templates/10/launch/ \
      -H "Authorization: Bearer $AWX_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"extra_vars": {"version": "${{ github.sha }}"}}'
```

## Best Practices

- Groups of one playbook per job template
- Use survey fields for user input instead of raw extra_vars
- Store secrets in AWX credential store, never in playbooks
- Enable job isolation for security
- Schedule inventory sync before deployment jobs
- Set timeout on all job templates
- Use workflow approval nodes for production deployments
