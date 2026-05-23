# Backstage Configuration Guide

## Core Plugins
| Plugin | Purpose |
|--------|---------|
| catalog | Service catalog with metadata, ownership, lifecycle |
| scaffolder | Create new projects from software templates |
| techdocs | Centralized technical documentation |
| kubernetes | View K8s resources per service |
| lighthouse | Audit web app quality (PWA, SEO, accessibility) |

## Software Template Structure
```
template.yaml — template definition
skeleton/
  └── cookiecutter template files
  └── {{cookiecutter.component_id}}/
      ├── README.md
      ├── package.json
      ├── Dockerfile
      ├── kubernetes/
      │   ├── deployment.yaml
      │   └── service.yaml
      └── docs/
          └── index.md
```

## Custom Backstage Actions
Extend scaffolder with custom actions for organization-specific needs:
- Create GitHub/GitLab repository
- Provision S3 bucket or RDS instance
- Register service in catalog
- Create monitoring dashboard
- Set up CI/CD pipeline

## TechDocs Setup
- Write docs in Markdown alongside code
- Backstage renders with MkDocs
- Material for MkDocs theme recommended
- Auto-discovery from repository
- Search across all service docs
