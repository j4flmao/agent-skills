# Platform Engineering Patterns

## Platform Team Topologies
| Topology | Description | Best For |
|----------|-------------|----------|
| Enabling team | Helps dev teams adopt tools, no platform ownership | Small orgs (< 50 devs) |
| Platform team | Owns and operates the platform | Medium orgs (50-500 devs) |
| Platform as product | Platform team treats devs as customers | Large orgs (500+ devs) |
| Federated platform | Multiple platform teams aligned to domains | Enterprise (multiple business units) |

## Platform Maturity Model
| Level | Name | Characteristics |
|-------|------|----------------|
| 0 | Ad-hoc | No platform, every team configures everything |
| 1 | Standardized | Shared CI/CD, base images, documented standards |
| 2 | Automated | Infrastructure automation, self-service for basic needs |
| 3 | Productized | Developer portal, golden paths, service catalog |
| 4 | Intelligent | AI-assisted scaffolding, automated policy, cost showback |

## Anti-Patterns
- Building everything from scratch instead of composing existing tools
- Forcing adoption without developer buy-in
- Platform team as a bottleneck (too few platform engineers)
- Golden path that's too rigid — no escape hatch
- Measuring success by features shipped, not developer velocity
