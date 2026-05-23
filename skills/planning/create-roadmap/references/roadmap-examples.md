# Roadmap Examples

Real-world roadmap examples for different product stages.

## Example 1: Early-Stage SaaS (Now/Next/Later)

Product: Team collaboration tool for remote engineers.
Stage: Pre-seed, 2 engineers, 50 beta users.

### Strategic Themes

| Theme | Outcome Statement | Key Metric |
|-------|-------------------|------------|
| Core experience | Engineers can create and assign tasks in under 5 seconds | Time to first task |
| Real-time sync | Team members see changes within 500ms | Sync latency P95 |
| Team onboarding | New members can join and contribute within 2 minutes | Time to first contribution |
| Reliability | Platform is available 99.5% of the time | Uptime percentage |

### Timeline

| Now (Sprint 1-2) | Next (Sprint 3-6) | Later (Sprint 7-12) |
|---|---|---|
| Real-time task sync (WebSocket) | Team dashboard with activity feed | Mobile responsive layout |
| Markdown task description | Drag-and-drop board view | Notification system (email + push) |
| Basic auth (email + Google) | Comment threads on tasks | File attachments |
| 1 engineer, 1 project context | CLI tool for task creation | GitHub integration |
| Keyboard shortcuts (core) | Search and filter tasks | Public API v1 |

### RICE Prioritization

| Feature | Reach | Impact | Confidence | Effort | RICE | MoSCoW |
|---------|-------|--------|------------|--------|------|--------|
| Real-time task sync | 200 users | 3 | 90% | 10 days | 54 | Must have |
| Basic auth (email + Google) | 300 users | 3 | 95% | 5 days | 171 | Must have |
| Team dashboard | 200 users | 2 | 80% | 8 days | 40 | Should have |
| CLI tool | 80 users | 2 | 60% | 12 days | 8 | Could have |
| File attachments | 150 users | 1 | 70% | 6 days | 17.5 | Could have |
| GitHub integration | 100 users | 2 | 50% | 15 days | 6.7 | Won't have |

### Capacity Allocation

| Category | % | Days/Sprint |
|----------|---|-------------|
| Feature work | 60% | 6 |
| Tech debt | 20% | 2 |
| Unplanned | 20% | 2 |
| **Total** | **100%** | **10** |

---

## Example 2: Growth-Stage Product (Q1-Q4)

Product: B2B invoice processing platform.
Stage: Series A, 12 engineers, 500 paying customers.

### Strategic Themes

| Theme | Outcome Statement | Key Metric |
|-------|-------------------|------------|
| Scale | System processes 10K invoices/day without degradation | P95 processing time < 30s |
| Enterprise readiness | Enterprise prospects pass security review | SOC 2 certification |
| Automation | 80% of invoices require zero manual intervention | Auto-processing rate |
| Platform expansion | Partners build on our API | Active API integrations |

### Q1 Timeline

| Theme | January | February | March |
|-------|---------|----------|-------|
| Scale | Database read replicas | CDN for invoice images | Query optimization |
| Enterprise readiness | SSO (SAML/OIDC) | Audit log export | SOC 2 Type I audit |
| Automation | Auto-match POs to invoices | ML vendor name cleanup | Default GL coding |
| Platform expansion | Public API documentation | Webhook event types | Partner onboarding flow |

### Q2 Timeline

| Theme | April | May | June |
|-------|-------|-----|------|
| Scale | Horizontal pod autoscaling | Multi-region deployment | Load testing to 50K/day |
| Enterprise readiness | RBAC with custom roles | Data retention policies | SOC 2 Type II audit |
| Automation | Line-item extraction (ML) | Two-way ERP sync | Auto-approval rules |
| Platform expansion | API rate limit tiers | SDK (Python, Node.js) | API marketplace |

### Q3 Timeline

| Theme | July | August | September |
|-------|------|--------|-----------|
| Enterprise readiness | GDPR data export | SLA dashboard | Whitelabel branding |
| Automation | Vendor portal | Dispute management | Batch invoice processing |
| Platform expansion | GraphQL API | Embedded iframe widget | Partner revenue sharing |

### Q4 Timeline

| Theme | October | November | December |
|-------|---------|----------|----------|
| Scale | Database sharding prep | Cache warming strategies | Performance SLA guarantee |
| Automation | AI-powered approval routing | Exception handling workflow | Self-healing OCR retry |
| Platform expansion | Mobile app (approval only) | International payments | ISO 27001 certification |

### RICE Prioritization (Q1)

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---------|-------|--------|------------|--------|------|
| SSO (SAML/OIDC) | 50 prospects | 3 | 95% | 15 days | 9.5 |
| SOC 2 Type I | 50 prospects | 3 | 100% | 20 days | 7.5 |
| Read replicas | 10K invoices | 2 | 90% | 8 days | 2,250 |
| Public API docs | 20 partners | 2 | 80% | 5 days | 6.4 |
| Auto-match POs | 5K invoices | 3 | 60% | 25 days | 360 |

### Capacity Allocation (12 engineers)

| Category | % | Engineer-Days/Sprint |
|----------|---|---------------------|
| Feature work | 60% | 72 |
| Tech debt | 20% | 24 |
| Unplanned | 20% | 24 |
| **Total** | **100%** | **120** |

---

## Example 3: Maintenance Phase (Quarterly Themes)

Product: Mature e-commerce platform.
Stage: Post-Series B, 40 engineers, 10K merchants.

### Annual Themes

| Theme | Q1 | Q2 | Q3 | Q4 |
|-------|----|----|----|----|
| Platform stability | Error budget improvement | Incident response drill | SLO/SLI definition | Chaos engineering |
| Merchant growth | Shopify migration tool | Referral program | International shipping | B2B wholesale |
| Platform monetization | Transaction fee restructure | Premium analytics tier | Marketplace fees | API usage billing |
| Developer platform | Public API GA | Plugin marketplace sandbox | Plugin review system | Revenue sharing launch |

### Capacity Allocation (40 engineers)

| Category | % | Engineer-Days/Sprint |
|----------|---|---------------------|
| Feature work | 50% | 200 |
| Tech debt | 25% | 100 |
| Platform stability | 10% | 40 |
| Unplanned | 15% | 60 |
| **Total** | **100%** | **400** |

Note: Lower feature allocation reflects platform maturity. More
investment in stability and debt reflects the scaling phase.
