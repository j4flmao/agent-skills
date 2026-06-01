---
name: data-data-strategy
description: >
  Use this skill when designing data strategy, data vision, data operating model, data culture, data maturity assessment, data ownership, or data governance roadmap. This skill enforces: maturity model assessment across people/process/tech/governance, vision and strategic pillar definition, operating model selection (centralized/federated/hybrid), data culture building with literacy programs, and data ownership frameworks with RACI and SLA. Do NOT use for: specific data platform architecture, ETL pipeline design, or tool-specific data engineering decisions.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [data, strategy, governance, phase-7]
---

# Data Strategy

## Purpose
Define and execute a comprehensive data strategy covering maturity assessment, vision and strategic pillars, operating model design, data culture development, and data ownership frameworks with clear accountability.

## Agent Protocol

### Trigger
Exact user phrases: "data strategy", "data vision", "data maturity", "data operating model", "data culture", "data ownership", "data governance roadmap", "CDO", "chief data officer", "data literacy", "data champions", "data transformation", "data COE", "data domain", "data steward".

### Input Context
- Organization size, industry, and current data maturity level
- Existing data infrastructure and tooling
- Business priorities and use cases for data
- Organizational structure and reporting lines
- Regulatory and compliance requirements
- Current data challenges (quality, access, trust, skills)
- Budget and resource constraints
- Executive sponsorship level
- Existing data-related roles and responsibilities

### Output Artifact
Data strategy document with maturity assessment, vision statement, strategic roadmap, operating model design, culture plan, ownership framework, investment model, and KPI dashboard.

### Response Format
```yaml
# Maturity assessment results
# Strategic pillars
# Operating model design
```
```markdown
# Vision statement
# Use case prioritization
# 3-year roadmap
```
```sql
-- Domain ownership tables
-- RACI matrix
-- KPI definitions
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Data maturity assessed across people, process, tech, governance
- [ ] Vision statement drafted with strategic pillars
- [ ] Operating model (centralized/federated/hybrid) selected and designed
- [ ] Data culture plan with literacy program and champion network
- [ ] Data ownership framework with domain definitions, RACI, and SLAs
- [ ] 3-year investment roadmap with quick wins identified
- [ ] KPIs and metrics defined for strategy tracking
- [ ] Data ethics principles documented
- [ ] Change management approach defined

### Max Response Length
300 lines of code and configuration.

## Workflow

### Step 1: Assess Data Maturity
Evaluate current state across four dimensions using a 5-level maturity model.

#### Maturity Dimensions & Assessment Matrix

| Dimension | Level 1: Initial | Level 2: Managed | Level 3: Defined | Level 4: Quantitatively Managed | Level 5: Optimizing |
|---|---|---|---|---|---|
| **People** | No data roles, skills ad-hoc | Basic data roles defined | Data stewards, analysts embedded | Data champions, career paths | Continuous learning, data-driven culture |
| **Process** | No standards, manual processes | Basic standards, project-level docs | Enterprise standards, data lineage | Automated quality, SLA-driven | Continuous improvement, adaptive |
| **Technology** | Spreadsheets, siloed DBs | Basic warehouse, reporting tools | Data lake/platform, catalog tools | Automated pipelines, ML ops | AI-driven optimization, self-service |
| **Governance** | No governance, no ownership | Basic policies, project-level owners | Enterprise governance body, stewards | Measured compliance, automated policies | Continuous governance, risk monitoring |

#### Assessment Scoring
Rate each dimension 1-5 using interviews, surveys, and system audits. Weighted score: w₁×People + w₂×Process + w₃×Tech + w₄×Governance where weights sum to 1.0 (default equal weighting, adjust per industry). Overall score = sum of weighted dimension scores. Use the overall score to prioritize: Level 1-2 → foundational build; Level 3 → scale and embed; Level 4-5 → optimize and innovate.

#### Data Maturity Assessment Survey Template
```
1. Does the organization have a defined data strategy?
   a) No b) Draft c) Approved but not funded d) Funded with team e) Executed with metrics
2. Are data quality metrics tracked?
   a) Never b) Manually per project c) Automated for key data d) Enterprise-wide e) Real-time
3. Who owns data decisions?
   a) IT only b) Business with IT support c) Data owners defined d) Data owners with SLAs e) Federated autonomous
```

### Step 2: Define Vision and Strategic Pillars

#### Vision Statement Template
A data vision should answer: "What will data enable for the organization in 3-5 years?" Structure: "We will [aspiration] by [approach] so that [business outcome]." Example: "We will become a data-driven enterprise by embedding trusted, accessible data into every business decision so that we deliver personalized customer experiences at scale."

#### Strategic Pillar Framework
Define 3-5 pillars that bridge the vision to execution. Each pillar must have: measurable objective, key initiatives, owner, success metrics, 3-year investment estimate.

| Pillar | Description | Example Objectives | Typical Budget % |
|---|---|---|---|
| Data Governance | Policies, ownership, quality, compliance | 95% critical data elements certified | 15-20% |
| Data Architecture | Platform, integration, catalog, tooling | Unified data platform with real-time streaming | 30-35% |
| Data Literacy & Culture | Training, champions, enablement | 80% of decision-makers certified | 10-15% |
| Analytics & AI | Reporting, ML, self-service | 50 automated ML models in production | 25-30% |
| Data-Driven Operations | Embed data into business processes | 90% of decisions use data | 10-15% |

#### Use Case Prioritization Matrix
Score each use case on: Business Value (1-5), Feasibility (1-5), Strategic Alignment (1-5), Data Readiness (1-5). Priority score = BV × F × SA × DR. Plot: High value + high feasibility = quick wins (do first). High value + low feasibility = strategic bets (invest). Low value + high feasibility = low-hanging fruit (do if capacity allows). Low + low = deprioritize.

#### Use Case Prioritization Example

| Use Case | Business Value | Feasibility | Strategic Alignment | Data Readiness | Priority Score | Quadrant |
|---|---|---|---|---|---|---|
| Customer 360 dashboard | 5 | 4 | 5 | 3 | 300 | Quick win |
| Real-time fraud detection | 4 | 2 | 4 | 2 | 64 | Strategic bet |
| Regulatory reporting automation | 3 | 4 | 3 | 4 | 144 | Quick win |
| Sales forecasting ML model | 4 | 3 | 3 | 2 | 72 | Strategic bet |
| Ad-hoc reporting tool upgrade | 2 | 5 | 2 | 4 | 80 | Low-hanging fruit |
| Legacy data warehouse migration | 3 | 1 | 4 | 1 | 12 | Deprioritize |

### Step 3: Design Operating Model

#### Centralized Model
Single CDO office with all data teams reporting up. Best for: low maturity organizations, consistent standards needed, small to mid-size companies. Pros: unified standards, clear accountability, efficient resource allocation. Cons: bottlenecked decision-making, business unit disconnect, scalability challenges. Key roles: CDO, enterprise data architects, data engineers (central pool), data stewards (matrixed to BUs). Decision rights: central team owns standards, tools, platform. BUs request and consume.

#### Federated Model
Data teams embedded in business units with central COE (Center of Excellence). Best for: large enterprises with autonomous BUs, high maturity, strong data culture. Pros: business-aligned, fast execution, domain expertise. Cons: inconsistent standards, duplicated efforts, harder to enforce governance. COE provides: shared tools, standards, best practices, training, architecture oversight. BU teams own: domain-specific data, local schemas, business-facing reports.

#### Hybrid Model (Recommended for most)
Central platform team with domain-aligned data stewards. Central team owns: data platform, shared infrastructure, security, enterprise catalog, standards and governance framework. Domain teams own: data products within their domain, domain-specific transformations, data quality for domain data, business reporting. Governance council: CDO, domain data owners, CTO, business heads — meets quarterly to prioritize, resolve conflicts, approve standards.

#### Data COE (Center of Excellence) Responsibilities
- Define and maintain data standards (naming, modeling, quality)
- Evaluate and recommend data tools and platforms
- Develop and deliver data literacy training
- Host data community events (show-and-tell, hackathons)
- Maintain the enterprise data catalog
- Provide architecture consulting to domain teams
- Run the data governance council
- Track and report data strategy KPIs

#### Decision Rights Matrix

| Decision Type | Central Team | Domain Teams | Governance Council |
|---|---|---|---|
| Platform tool selection | Propose | Consult | Approve |
| Data model standards | Define | Follow | Review |
| Domain schema design | Consult | Own | Approve |
| Data quality thresholds | Define minimum | Set domain-specific | Review |
| Access control policies | Define | Implement | Approve exceptions |
| Technology budget | Own | Propose | Allocate |
| Staffing and hiring | Own for central | Own for domain | Review staffing plan |

### Step 4: Build Data Culture

#### Data Literacy Program
Three-tier training program targeting different roles. Tier 1 (Basic): data concepts, reading charts and dashboards, understanding KPIs — for all employees. Tier 2 (Intermediate): SQL basics, data analysis, data visualization, critical thinking with data — for analysts, managers, power users. Tier 3 (Advanced): statistical methods, ML concepts, data modeling, data ethics — for data practitioners and leaders.

#### Training Delivery
Tier 1: self-paced online modules (2 hours total), annual refresher. Tier 2: instructor-led workshops (2 days), quarterly cohorts, capstone project. Tier 3: ongoing learning path (courses, certifications, conferences). Measure: completion rate (target >80%), knowledge assessment scores (target >80%), application in job (6-month follow-up survey).

#### Data Champion Network
One champion per business unit or department of 50+ people. Champion role: 10-20% time commitment, advocate for data initiatives, gather requirements, promote data literacy, first line of data quality issue triage, organize local data meetups. Selection criteria: data-curious, respected in their team, basic technical aptitude. Incentives: visibility with leadership, training budget, conference attendance, data certification funding.

#### Data Community Activities
Monthly show-and-tell: teams present data projects and learnings. Quarterly hackathons: 24-48 hour data challenges with business problems. Weekly data newsletter: tips, wins, resources, upcoming training, data dictionary updates. Internal data conference: annual full-day event with external speakers, workshops, awards. Recognition program: "Data Hero" award per quarter, celebrate wins in all-hands meetings.

#### Metrics-Driven Decision Framework
Train teams on: defining clear metrics before starting work, distinguishing leading vs lagging indicators, using confidence intervals (not just point estimates), avoiding common biases (confirmation bias, survivorship bias, anchoring), running experiments (A/B tests) when possible, documenting assumptions, reviewing decisions post-hoc.

### Step 5: Establish Data Ownership

#### Data Domain Definitions
Map data domains to business functions. Each domain is a sphere of data that a business function owns.

| Domain | Business Owner | Description | Key Data Entities |
|---|---|---|---|
| Customer | CMO | Customer master data, profiles, interactions | customer, contact, account, interaction |
| Product | CPO | Product catalog, inventory, pricing | product, sku, category, price |
| Finance | CFO | Financial transactions, budgets, forecasts | ledger, invoice, payment, budget |
| Supply Chain | COO | Suppliers, orders, logistics | supplier, purchase_order, shipment, inventory |
| HR | CHRO | Employee data, payroll, performance | employee, position, payroll, review |
| Sales | VP Sales | Opportunities, pipeline, commissions | opportunity, quote, order, forecast |

#### RACI Matrix Template
R = Responsible (does the work), A = Accountable (answers for the outcome), C = Consulted (provides input), I = Informed (receives updates)

| Activity | Data Owner | Data Steward | Data Engineer | CDO | IT Security | Business Users |
|---|---|---|---|---|---|---|
| Define data quality rules | A | R | C | I | - | C |
| Monitor data quality | I | R | C | I | - | C |
| Approve data access requests | C | R | C | I | A | I |
| Implement data pipeline | I | C | R | I | C | - |
| Update data dictionary | I | R | C | I | - | C |
| Approve schema changes | A | R | C | I | - | I |
| Classify data sensitivity | A | R | - | I | C | C |
| Resolve data issue | A | R | C | I | - | I |
| Define retention policy | A | R | C | I | C | C |

#### Data Owner Responsibilities
Strategic: define data strategy for the domain, prioritize data initiatives, allocate budget, champion data quality. Operational: certify data quality, approve access, resolve escalated issues, make schema decisions. Governance: participate in governance council, enforce policies, sign off on SLAs.

#### Data Steward Responsibilities
Daily: monitor data quality metrics, triage data issues, maintain data dictionary entries, guide data classification. Process: execute data quality improvement projects, onboard new data sources, document lineage. Enablement: train users on data definitions, provide data context, answer questions about the domain.

#### SLA Framework

| SLA Dimension | Gold (Critical) | Silver (Important) | Bronze (Standard) |
|---|---|---|---|
| Data Freshness | < 1 hour | < 24 hours | < 7 days |
| Data Accuracy | > 99.9% | > 99% | > 95% |
| Data Completeness | > 99.9% | > 99% | > 95% |
| Issue Response Time | < 1 hour | < 4 hours | < 24 hours |
| Issue Resolution Time | < 4 hours | < 24 hours | < 5 business days |
| Availability | 99.99% | 99.9% | 99% |

### Step 6: Build Investment Roadmap

#### 3-Year Investment Model
Phase 1 (0-6 months, Quick Wins): ~25% of total budget. Establish governance council, define top 3 data domains, deploy data catalog, launch data literacy Tier 1, implement data quality monitoring for critical data. Phase 2 (6-18 months, Foundations): ~45% of total budget. Build/upgrade data platform, implement MDM for key domains, deploy data governance tools, launch data champion network, establish data engineering team. Phase 3 (18-36 months, Transformation): ~30% of total budget. Scale self-service analytics, deploy ML/AI capabilities, implement data products/mesh, automate governance, achieve Level 4+ maturity.

#### Budget Allocation Guidelines
Total data investment: 2-5% of revenue for data-intensive industries (finance, tech, telecom), 1-2% for traditional industries. Breakdown: 30% people (hiring, training, COE), 35% technology (platform, tools, infrastructure), 20% operations (run costs, maintenance), 10% governance (tools, stewardship), 5% innovation (R&D, experiments). Adjust based on current maturity: Level 1-2 skew toward people and process; Level 3-4 skew toward technology and innovation.

#### ROI Estimation Template
For each initiative estimate: annual cost (people, tech, operations), expected benefit (revenue increase, cost reduction, efficiency gain, risk reduction), payback period, NPV at 5-year horizon, IRR. Provide confidence intervals (optimistic, expected, pessimistic). Track actuals vs projections quarterly.

### Step 7: Establish Data Ethics Framework

#### Principles
Transparency: data collection and use is visible and explainable. Fairness: algorithms and decisions do not discriminate. Accountability: clear ownership for data ethics decisions. Privacy: data collected only with consent, used only for stated purpose. Security: data protected throughout its lifecycle.

#### Ethical Review Process
Triage: does the use case involve personal data, automated decisions, vulnerable populations, or regulatory implications? If yes → ethics review. Review: data ethics board reviews against principles, assesses risks, recommends mitigations. Approval: board approves, approves with conditions, or rejects. Monitoring: periodic audit of approved use cases.

### Step 8: Plan Change Management

#### Stakeholder Mapping
Identify key stakeholders: executive sponsors (CDO, CEO, business heads), data producers (source system owners), data consumers (analysts, data scientists, business users), data enablers (IT, engineering), governance participants (data owners, stewards). Per stakeholder: assess current sentiment (champion, neutral, skeptic, blocker), influence level, engagement strategy, communication frequency.

#### Communication Plan
Kickoff: strategy announcement with CEO sponsorship — all-hands meeting, organizational email. Monthly: progress update to all stakeholders — metrics dashboard, milestone tracker, upcoming activities. Quarterly: governance council meeting — strategic review, priority adjustment, budget review. Annual: strategy refresh — survey, assessment, plan update.

#### Resistance Management
Common resistances: "data is IT's job" → reframe as business ownership with IT enablement. "we don't have time for governance" → show efficiency gains from quality data. "our data is terrible" → start with small wins to build confidence. "we already do this" → audit current practices, show gap. "this will slow us down" → demonstrate fast-path for urgent requests.

## Decision Trees

### Maturity Assessment Decision Tree
```
What is overall maturity score?
├── < 2.0 (Level 1-2)
│   └── Focus: foundational governance, basic platform, executive sponsorship
├── 2.0-3.5 (Level 2-3)
│   ├── People weakest → invest in COE, training, hiring
│   ├── Process weakest → standardize, document, automate
│   ├── Tech weakest → platform consolidation, catalog deployment
│   └── Governance weakest → council formation, ownership definition
└── > 3.5 (Level 3-4)
    └── Focus: scale culture, automate governance, advanced analytics
```

### Operating Model Decision Tree
```
Organization structure?
├── Single business unit (< 500 people)
│   └── Centralized model
├── Multiple autonomous BUs
│   ├── Low data maturity → Hybrid (central platform + domain stewards)
│   └── High data maturity → Federated (BU teams + COE)
├── Global enterprise (> 5000 people)
│   └── Hybrid with regional CDOs
└── Startup / scale-up
    └── Centralized (evolve to hybrid at 200+ employees)

Culture and readiness?
├── Strong executive sponsorship, data-curious → Federated
├── IT-driven, business less engaged → Centralized
└── Mixed readiness → Hybrid (centralize governance, federate execution)
```

### Data Culture Investment Decision Tree
```
Current literacy level?
├── < 20% basic literacy
│   ├── Launch Tier 1 training for all
│   └── Identify 5-10 champions
├── 20-50% basic literacy
│   ├── Launch Tier 2 for power users
│   ├── Expand champion network
│   └── Start community activities
└── > 50% basic literacy
    ├── Launch Tier 3 for practitioners
    ├── Scale hackathons and innovation
    └── Embed data metrics into performance reviews
```

## Rules
- Maturity assessment is the foundation — never skip it before defining strategy
- Vision must connect to business outcomes, not just technology
- Operating model must match organizational culture, not aspirational ideal
- Data literacy programs need executive sponsorship to succeed
- Data owners are business roles, not IT roles
- RACI matrix must cover all data domains and decision types
- 3-year roadmap includes quick wins (0-6 months), foundations (6-18 months), and transformation (18-36 months)
- Review and update strategy annually based on progress and changing business needs
- Data ethics principles must be defined before any AI/ML initiative
- Change management is a continuous activity, not a one-time kickoff
- Investment must balance people, process, and technology — not just tools
- Quick wins in first 6 months build credibility and momentum
- Every strategic pillar must have a named executive sponsor
- Data strategy is owned by the business, enabled by IT
- Measure progress quarterly against maturity targets

## KPIs and Metrics Dashboard

| Category | KPI | Target | Measurement Frequency |
|---|---|---|---|
| Maturity | Overall maturity score | +0.5/year | Annual |
| Governance | Certified data elements | > 80% of critical | Quarterly |
| Quality | Data quality score (critical data) | > 95% | Monthly |
| Adoption | Active data catalog users | > 50% of analysts | Monthly |
| Literacy | Training completion rate | > 80% | Quarterly |
| Culture | Data champion network size | 1 per 50 employees | Quarterly |
| Trust | Self-service satisfaction score | > 4.0/5.0 | Semi-annual |
| Value | Initiatives delivering ROI | > 80% on track | Quarterly |
| Talent | Data roles filled | > 90% | Monthly |
| Operations | Data platform uptime | > 99.9% | Monthly |

## Industry-Specific Considerations

### Financial Services
Regulatory focus: Basel III/IV, SOX, MiFID II, GDPR. Additional requirements: data lineage for audit trails, model risk management for AI/ML, customer data privacy at core, BCBS 239 compliance for risk data aggregation. Strategy emphasis: risk data governance, regulatory reporting automation, customer 360 for cross-sell/upsell.

### Healthcare
Regulatory focus: HIPAA, HITECH, GDPR for patient data. Additional requirements: strict data classification (PHI, PII), data sharing agreements for research, interoperability standards (HL7 FHIR). Strategy emphasis: clinical data quality, interoperability, patient data privacy, analytics for population health.

### Retail/CPG
Focus: customer data unification, real-time inventory optimization, demand forecasting, personalization engines. Strategy emphasis: customer data platform (CDP), real-time streaming for inventory, AI-driven supply chain optimization.

### Technology/SaaS
Focus: product analytics, usage data, experimentation platform, data-driven product decisions. Strategy emphasis: self-service analytics culture, data product thinking, experimentation at scale, real-time product metrics.

### Manufacturing
Focus: IoT sensor data, predictive maintenance, supply chain optimization, quality analytics. Additional requirements: OT/IT data integration, edge computing for factory floors, real-time monitoring dashboards. Strategy emphasis: digital twin enablement, connected factory data platform, AI-driven quality control.

## Data Monetization Strategies

### Direct Monetization
Data-as-a-Service (DaaS): sell curated datasets, APIs, or insights to external customers. Common in financial services (credit risk scores), retail (market basket insights), and healthcare (de-identified claims data). Pricing: subscription, per-query, revenue share. Requires: data licensing agreements, privacy compliance, data product management.

### Indirect Monetization
Data-driven product improvement: use data to enhance existing products and services. Operational efficiency: reduce costs through data-driven optimization (predictive maintenance, dynamic pricing). Customer experience: personalize offerings, reduce churn through data insights. Risk reduction: fraud detection, compliance automation, credit risk modeling.

### Data Sharing Partnerships
Cooperative data pools: multiple organizations share data for mutual benefit (fraud detection consortiums, supply chain visibility). Data for equity: share data with partners in exchange for access to their data or services. Industry benchmarks: aggregate data across industry for benchmarking and trend analysis.

### Data Monetization Maturity

| Level | Approach | Value | Requirements |
|---|---|---|---|
| 1 | Internal operational use | Cost savings | Basic analytics, data quality |
| 2 | Internal strategic use | Competitive advantage | Advanced analytics, ML |
| 3 | External data sharing | Partnership value | Data governance, legal framework |
| 4 | Direct data sales | Revenue generation | Data products, pricing, sales |
| 5 | Data ecosystem platform | Network effects | Platform, marketplace, standards |

## Vendor Evaluation Framework

### Evaluation Criteria Matrix

| Category | Weight | Criteria |
|---|---|---|
| Functional fit | 30% | Feature coverage, integration, scalability, performance |
| Total cost | 25% | Licensing, implementation, training, operations, migration |
| Technical architecture | 20% | API quality, security, compliance, data residency, uptime SLA |
| Vendor health | 15% | Financial stability, roadmap, support quality, community size |
| Ecosystem | 10% | Partner integrations, marketplace, third-party extensions |

### Selection Process
1. Requirements definition: functional and non-functional requirements documented
2. Market scan: 5-10 vendors identified from analyst reports (Gartner, Forrester)
3. RFI: 5-8 vendors submit responses scored against criteria
4. Demos: 3-4 top vendors do use-case specific demos with stakeholder scoring
5. POC: 1-2 vendors run 2-4 week proof of concept with real data
6. Reference calls: 3-5 customer references checked
7. TCO analysis: 3-year total cost of ownership modeled
8. Decision: finalist selected, negotiated, and contracted

## Organizational Capability Framework

### Data Role Definitions

| Role | Level | Key Skills | Typical Background |
|---|---|---|---|
| Chief Data Officer | Executive | Strategy, leadership, governance | Business or IT leadership |
| Data Architect | Senior | Architecture, modeling, standards | Engineering, data platform |
| Data Engineer | Mid-Senior | ETL/ELT, pipelines, platform | Software engineering |
| Data Analyst | Mid | SQL, visualization, business context | Business analysis, statistics |
| Data Scientist | Senior | ML/AI, statistics, experimentation | Quantitative field (PhD/MS) |
| Data Steward | Mid | Data quality, domain knowledge | Business operations |
| Analytics Engineer | Mid | dbt, SQL, data modeling | Data analysis + engineering |
| ML Engineer | Senior | MLOps, model deployment | Software engineering, ML |

### Career Progression Paths
Individual contributor: Analyst → Senior → Staff → Principal → Distinguished. Management: Lead → Manager → Director → VP → CDO. Hybrid: individual contributor with project leadership responsibility. Cross-functional rotations: analyst learns engineering, engineer learns ML, etc.

### Team Topologies for Data
Stream-aligned team: owns data for a specific business domain (sales data team). Enabling team: helps stream-aligned teams with capabilities (data literacy training, dbt best practices). Complicated subsystem team: builds and maintains specialized systems (real-time streaming platform). Platform team: provides internal data platform as a service (data catalog, compute platform, storage). Choose topology based on strategy phase: centralized during build-out, stream-aligned during scale.

## Data Strategy Success Criteria

### Leading Indicators (6-12 months)
- Executive sponsorship confirmed and sustained
- Governance council operating with regular cadence
- Data catalog deployed with 5+ source systems registered
- 3+ data quality metrics tracked and improving
- Data literacy Tier 1 launched with >50% completion
- Data owner assigned for top 3 domains

### Lagging Indicators (12-36 months)
- Maturity score improved by 1+ levels
- Self-service adoption exceeds 50% of target users
- Data quality scores >95% on critical data elements
- 3+ data products in production with documented ROI
- Data-driven decisions measured in business KPIs
- CDO recognized as strategic business partner

## Architecture Decision Records (ADR) for Data Strategy

### ADR Template
```
# ADR-{number}: {title}

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[Problem description, constraints, and decision drivers]

## Decision
[What was decided and why]

## Consequences
[Positive and negative implications]

## Compliance
[How compliance will be verified]

## Notes
[References to related ADRs, documents, or discussions]
```

### Data Strategy ADRs to Write
1. Maturity assessment methodology selection
2. Strategic pillar prioritization
3. Operating model selection justification
4. Data platform technology stack decisions
5. Data catalog tool selection
6. Data ownership domain model definition
7. Data quality SLA framework adoption
8. Data literacy program approach
9. Data ethics principles adoption
10. Investment and budget allocation model

## Data Product Thinking

### Data as a Product
Treat data as a product with: customers (internal or external), user experience (discoverable, documented, easy to consume), quality (SLA-backed), lifecycle management (version, deprecate, retire). Product manager owns the data product, defines roadmap, gathers feedback, prioritizes improvements.

### Data Product Dimensions
Discoverability: registered in data catalog with searchable metadata and business context. Understandability: documented with clear descriptions, definitions, and examples. Trustworthiness: quality metrics, certification status, freshness guarantees. Accessibility: clear access process, self-service where possible, documented API or export format. Interoperability: standard schema, conformed dimensions, documented joins.

### Data Product Lifecycle
Plan: identify need, define scope, estimate value, get stakeholder buy-in. Build: develop pipeline, document, test quality, register in catalog. Publish: set access controls, define SLA, announce to consumers. Operate: monitor quality, freshness, usage; respond to issues. Retire: deprecate with notice period, migrate consumers, archive data.

## References
  - references/data-culture.md — Data Culture Reference
  - references/data-ethics-framework.md — Data Ethics Framework
  - references/data-maturity.md — Data Maturity Reference
  - references/data-operating-model.md — Data Operating Model Reference
  - references/data-ownership.md — Data Ownership Reference
  - references/data-strategy-metrics.md — Data Strategy Metrics
  - references/data-vision.md — Data Vision and Strategy Reference
## Data Strategy Checklist

### Strategy Document Review Checklist
- Vision connects to specific business outcomes and is measurable
- Maturity assessment completed within last 6 months and reflects current reality
- Strategic pillars are 3-5, with named executive sponsors and measurable objectives
- Operating model selected based on current maturity, not aspirational state
- Data domains defined with named owners from the business
- 3-year roadmap includes quick wins (0-6m), foundations (6-18m), transformation (18-36m)
- Budget allocated across people (30%), process (15%), technology (35%), operations (20%)
- Data literacy program has executive sponsorship and dedicated budget
- Data ethics principles documented and reviewed by legal/compliance
- Change management plan identifies stakeholders, risks, and communication cadence
- KPIs defined for each pillar with quarterly review process
- Annual strategy refresh cycle established and calendared

## Handoff
`data-data-platform` for platform architecture aligned with strategy
`data-data-governance` for governance policy execution
`data-data-quality` for quality metrics and monitoring
