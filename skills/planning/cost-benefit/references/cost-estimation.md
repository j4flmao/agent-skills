# Cost Estimation

## Overview
Accurate cost estimation is the foundation of any business case. This reference covers build vs buy analysis, TCO components, and estimation techniques.

## Build vs Buy Decision Matrix

| Factor | Build | Buy |
|---|---|---|
| Initial cost | Higher (labor + infra) | Lower (subscription/license) |
| Time to value | Slower (development + testing) | Faster (implementation + config) |
| Customization | Complete control | Vendor-defined roadmap |
| Maintenance | Internal team required | Vendor managed |
| Lock-in | Technical (code) | Vendor (contract + data) |
| Strategic value | Core competency | Non-differentiating |

## TCO Components

### Build
- Labor: dev, QA, PM, DevOps, security review — loaded rate × estimated hours
- Infrastructure: dev/staging/prod environments, CI/CD pipelines, monitoring, backups
- Tools: IDE licenses, testing tools, monitoring SaaS, APM
- Training: developer onboarding, documentation, knowledge sharing sessions
- Migration: data migration, cutover planning, parallel run period
- Maintenance: 20-30% of initial build cost annually (bug fixes, security patches, updates)

### Buy
- Subscription: per-user or per-instance monthly/annual fee
- Implementation: vendor or partner professional services
- Customization: custom integrations, configuration, workflow changes
- Training: admin and user training sessions
- Support: included or premium tier
- Renewal escalation: 5-10% annual price increase typical

## Estimation Techniques
- **Analogous estimation**: compare to similar past projects, adjust for complexity
- **Parametric estimation**: use historical cost per unit (lines of code, function points, user stories)
- **Bottom-up estimation**: estimate each work item individually, sum total
- **Three-point estimation**: optimistic + pessimistic + most likely ÷ 3

## Key Points
- Always use loaded labor rates (salary × 1.3-1.5 for benefits, overhead, facilities)
- Include 15-20% contingency for unknown unknowns
- Document all assumptions — "assuming 3 developers for 6 months" not "reasonable effort"
- Buy option TCO must include implementation and customization — subscription is not the total cost
- Maintenance is the largest hidden cost in build decisions
