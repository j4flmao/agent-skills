# Platform Maturity Model

## Level 1: Ad Hoc
No standard platform: teams manage own infrastructure. Manual provisioning: click-ops in cloud console. No self-service: platform team is bottleneck for all infrastructure requests. No golden paths: every team makes independent tech choices. No standard tooling: Terraform, Helm, scripts, manual configs in parallel. Metrics: no visibility into developer experience or platform usage.

## Level 2: Centralized
Dedicated platform team: central team manages shared infrastructure. Standardized IaC: Terraform modules, Helm charts for common patterns. Basic self-service: service catalog with manual approval. Limited golden paths: defined but not enforced. Manual onboarding: ticket-based, takes weeks. Metrics: ticket volume, deployment frequency, MTTR.

## Level 3: Product-Oriented
Platform as product: team treats internal developers as customers. Self-service portal: Backstage, Port, or custom developer portal. Golden paths enforced: scaffolded templates with built-in best practices. Automated onboarding: self-serve with guardrails. Resource governance: cost allocation, quota enforcement, compliance checks. Metrics: developer satisfaction (DSAT), time-to-prod, platform adoption.

## Level 4: Automated
Fully automated: infrastructure provisioned via GitOps. Policy-as-code: compliance and security enforced automatically. Cost visibility: per-team, per-service cost breakdown. Automated upgrades: dependency updates, platform version updates. Cross-cutting concerns: observability, security, compliance built into golden paths. Metrics: NPS, platform reliability (SLO), automation percentage.

## Level 5: Adaptive
Dynamic optimization: auto-scaling, auto-tuning, auto-remediation. AI-driven insights: anomaly detection, capacity prediction, cost optimization. Self-healing infrastructure: automatic rollback, failover, resource replacement. Developer-driven platform: developers contribute platform improvements. Ecosystem: plugin marketplace, custom golden path creation. Metrics: platform revenue (cost savings), innovation velocity.

## References
- platform-engineering-fundamentals.md -- Fundamentals
- platform-patterns.md -- Patterns
- platform-product-management.md -- Product Management
- platform-teams.md -- Team Structure
- idp-blueprint.md -- IDP Blueprint
