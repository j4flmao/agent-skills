# IDP Architecture Blueprint

## Core Components
```
┌─────────────────────────────────────────────────────┐
│                 Developer Portal                     │
│  Backstage / Port / Cortex / Custom                 │
│  - Service Catalog  - Tech Docs  - Templates        │
│  - API Catalog      - Cost/Scorecards               │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│              Orchestration Layer                     │
│  Backstage Scaffolder / Crossplane / Custom          │
│  - Scaffold repos  - Provision infra  - Setup CI/CD  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│           Infrastructure Provisioning                │
│  Terraform / Pulumi / Crossplane / CloudFormation    │
│  - Kubernetes  - Databases  - Queues  - Storage     │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────┐
│              Policy & Governance                     │
│  OPA/Kyveno / GuardDuty / Security Hub              │
│  - Admission control  - Compliance  - Cost limits   │
└─────────────────────────────────────────────────────┘
```

## Adoption Roadmap
- Phase 1 (Month 1-2): Backstage with catalog + techdocs
- Phase 2 (Month 3-4): Software templates for 2 common paths
- Phase 3 (Month 5-6): Self-service infra provisioning
- Phase 4 (Month 7-8): Policy enforcement + scorecards
- Phase 5 (Month 9-12): Inner source, community, measurement
