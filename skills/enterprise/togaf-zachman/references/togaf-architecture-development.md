# TOGAF Architecture Development

## Overview

The TOGAF Architecture Development Method (ADM) is a comprehensive, iterative methodology for developing and managing enterprise architecture. This reference provides a deep dive into each ADM phase, deliverables, gate reviews, tailoring strategies, integration with agile practices, and operational considerations for running ADM cycles effectively.

## ADM Cycle Overview

### The ADM in Context

`
Preliminary: Framework and Principles
     |
     v
Phase A: Architecture Vision
     |
     v
Phase B: Business Architecture
     |
     v
Phase C: Information Systems Architectures
     |         |
     |    Data Architecture
     |    Application Architecture
     |
     v
Phase D: Technology Architecture
     |
     v
Phase E: Opportunities and Solutions
     |
     v
Phase F: Migration Planning
     |
     v
Phase G: Implementation Governance
     |
     v
Phase H: Architecture Change Management
     |
     v
Requirements Management (continuous throughout)
`

### ADM Phase Summary

| Phase | Purpose | Key Outputs | Stakeholders |
|---|---|---|---|
| Preliminary | Establish architecture capability | Architecture principles, governance framework, tools | CIO, EA team |
| A | Define scope and vision | Vision statement, stakeholder map, value chain | Executives, business leaders |
| B | Business architecture | Process models, organizational structure, business goals | Business owners, operations |
| C (Data) | Data architecture | Data entities, data models, data flow diagrams | Data architects, CDO |
| C (Application) | Application architecture | Application portfolio, interfaces, application map | Application owners, developers |
| D | Technology architecture | Technology reference model, infrastructure design | Infrastructure, CTO |
| E | Solutions roadmap | Implementation projects, work packages | Program managers, architects |
| F | Migration plan | Migration timeline, cost estimates, phasing | Project managers, finance |
| G | Implementation governance | Architecture contracts, compliance reviews | Governance board, project teams |
| H | Change management | Change requests, architecture updates | EA team, governance board |
| Requirements | Traceability | Requirements repository, impact analysis | All stakeholders |

## Phase A: Architecture Vision

### Objectives
- Define the architecture scope, constraints, and expectations
- Identify stakeholders and their concerns
- Create the Architecture Vision
- Obtain approval to proceed

### Activities

**1. Establish the Architecture Project**

```yaml
architecture_project:
  name: "Digital Transformation Architecture"
  sponsor: "CEO"
  scope:
    business_domains: ["Sales", "Marketing", "Customer Service"]
    time_horizon: "18 months"
    depth: "Strategic architecture (Level 1-2)"
  constraints:
    budget: "5M for architecture phase"
    timeline: "Architecture complete in 3 months"
    compliance: ["GDPR", "SOC 2 Type II"]
  risks:
    - "Stakeholder availability for workshops"
    - "Legacy system complexity underestimated"
    - "Organizational resistance to change"
```

**2. Identify Stakeholders and Concerns**

```yaml
stakeholders:
  - role: "CEO"
    concerns: ["Time to market", "Competitive advantage", "ROI"]
    viewpoint: "Enterprise scope, business outcomes"
  - role: "CFO"
    concerns: ["Cost reduction", "Budget control", "Total cost of ownership"]
    viewpoint: "Financial impact, cost/benefit"
  - role: "Head of Sales"
    concerns: ["Sales process efficiency", "Customer data access", "Channel integration"]
    viewpoint: "Business process, operational effectiveness"
  - role: "CTO"
    concerns: ["Technology stack", "Scalability", "Innovation capability"]
    viewpoint: "Technology architecture, standards"
  - role: "Head of Security"
    concerns: ["Risk management", "Compliance", "Data protection"]
    viewpoint: "Security architecture, controls"
  - role: "Product Managers"
    concerns: ["Feature delivery", "Integration complexity", "Platform capabilities"]
    viewpoint: "Application architecture, APIs"
```

**3. Develop Architecture Vision**

```
Architecture Vision: {title}

The enterprise architecture vision for {domain/initiative} is to
{describe target state in business terms} by {timeframe}.

This will enable the organization to {key business benefits}.

The scope covers {included domains, business units, geographies}.

Key architecture changes include:
- {change 1}
- {change 2}
- {change 3}

Success is measured by:
- {metric 1}: {target value}
- {metric 2}: {target value}
```

**4. Value Chain and Capability Maps**

```yaml
primary_activities:
  - "Inbound Marketing"
  - "Sales Conversion"
  - "Order Fulfillment"
  - "Customer Support"
  - "Retention and Upsell"
support_activities:
  - "Technology Platform"
  - "Data Management"
  - "Security and Compliance"
  - "Human Resources"
```

### Outputs

```yaml
phase_a_deliverables:
  - "Approved Architecture Vision statement"
  - "Stakeholder map and concerns matrix"
  - "Value chain diagrams"
  - "Business capability map"
  - "Architecture scope and constraints document"
  - "Risk assessment"
  - "Architecture work plan for Phases B-D"
```

## Phase B: Business Architecture

### Objectives
- Develop the baseline business architecture
- Develop the target business architecture
- Perform gap analysis
- Identify business architecture roadmap

### Activities

**1. Develop Baseline Business Architecture Description**

```yaml
process_inventory:
  - id: "P-001"
    name: "Lead Capture"
    owner: "Marketing"
    criticality: "High"
    current_state: "Manual entry from web forms"
    systems: ["Website", "Excel tracker"]
    pain_points: ["Manual data entry errors", "No real-time visibility"]
  - id: "P-002"
    name: "Order Processing"
    owner: "Sales Operations"
    criticality: "Critical"
    current_state: "Partially automated through CRM"
    systems: ["CRM", "ERP", "Email"]
    pain_points: ["Order entry errors", "Slow approval cycles"]
  - id: "P-003"
    name: "Customer Onboarding"
    owner: "Customer Success"
    criticality: "High"
    current_state: "Manual, multi-department process"
    systems: ["Email", "Shared drives"]
    pain_points: ["No standardization", "Missed steps", "Long cycle time"]
```

**2. Develop Target Business Architecture**

```yaml
target_state:
  process_improvements:
    - "Lead-to-Cash automated process across Marketing, Sales, Operations"
    - "Straight-through processing for standard orders"
    - "Omnichannel customer service with unified case management"
  automation_targets:
    - "Lead assignment: automated by rules engine"
    - "Order validation: automated checks, manual exceptions only"
    - "Customer onboarding: 80% automated with digital forms"
  kpi_targets:
    lead_to_quote_time: "Reduced from 5 days to 4 hours"
    order_accuracy: "Increased from 92% to 99.5%"
    first_response_time: "Reduced from 4 hours to 5 minutes"
```

**3. Perform Gap Analysis**

```yaml
business_gap_analysis:
  gaps:
    - id: "BG-001"
      description: "No unified customer view across departments"
      severity: "Critical"
      impact: "Inconsistent customer experience, missed upsell opportunities"
      resolution: "Implement Customer Data Platform with master data management"
      owner: "CDO"
      timeline: "6 months"
    - id: "BG-002"
      description: "Manual order processing bottleneck"
      severity: "High"
      impact: "Order-to-fulfillment takes 3 days average"
      resolution: "Implement automated order validation and approval workflow"
      owner: "Head of Sales Ops"
      timeline: "3 months"
    - id: "BG-003"
      description: "No integration between CRM and ERP"
      severity: "High"
      impact: "Duplicate data entry, order errors"
      resolution: "API integration with event-driven sync"
      owner: "Integration Lead"
      timeline: "4 months"
```

## Phase C: Information Systems Architecture

### Data Architecture (Phase C, Part 1)

```yaml
data_entities:
  - entity: "Customer"
    definition: "Person or organization that purchases or engages with products"
    attributes:
      - "CustomerID (PK)"
      - "Name"
      - "Email"
      - "Phone"
      - "Address"
      - "Segment"
      - "Status"
    data_domain: "Customer"
    system_of_record: "CRM"
  - entity: "Product"
    definition: "Goods or services offered for sale"
    attributes:
      - "ProductID (PK)"
      - "Name"
      - "Description"
      - "Category"
      - "Price"
      - "SKU"
    data_domain: "Product"
    system_of_record: "ERP"
  - entity: "Order"
    definition: "Customer request to purchase products"
    attributes:
      - "OrderID (PK)"
      - "CustomerID (FK)"
      - "OrderDate"
      - "Status"
      - "TotalAmount"
    data_domain: "Order"
    system_of_record: "ERP"
```

### Application Architecture (Phase C, Part 2)

```yaml
application_portfolio:
  - application: "Salesforce CRM"
    type: "SaaS"
    owner: "Sales"
    criticality: "Critical"
    users: "200 sales reps"
    lifecycle: "Active - strategic"
  - application: "SAP ERP"
    type: "On-premise"
    owner: "Operations"
    criticality: "Critical"
    users: "50 operations staff"
    lifecycle: "Stable - modernize (target: S/4HANA)"
  - application: "Zendesk"
    type: "SaaS"
    owner: "Customer Service"
    criticality: "High"
    users: "100 agents"
    lifecycle: "Active - strategic"
```

## Phase D: Technology Architecture

```yaml
technology_reference_model:
  approved_categories:
    compute:
      - "AWS EC2 (Linux: Amazon Linux 2023)"
      - "AWS EKS (Kubernetes 1.28+)"
      - "AWS Lambda (Node.js 20, Python 3.12)"
    database:
      - "Primary: Amazon Aurora PostgreSQL"
      - "NoSQL: Amazon DynamoDB"
      - "Caching: Amazon ElastiCache (Redis)"
      - "Analytics: Amazon Redshift"
    integration:
      - "API: Amazon API Gateway"
      - "Messaging: Amazon SQS + SNS"
      - "Event Streaming: Amazon MSK (Kafka)"
      - "ETL: AWS Glue"
    monitoring:
      - "Metrics: Amazon CloudWatch + Grafana"
      - "Logging: Amazon OpenSearch Service"
      - "Tracing: AWS X-Ray"
      - "Alerting: PagerDuty"
    security:
      - "IAM: AWS IAM + IAM Identity Center"
      - "Secrets: AWS Secrets Manager"
      - "Certificate: AWS Certificate Manager"
      - "WAF: AWS WAF"
```

## Phase E: Opportunities and Solutions

```yaml
work_packages:
  - id: "WP-001"
    name: "Customer Data Platform"
    description: "Implement unified customer data platform for 360 view"
    estimated_cost: "1.2M"
    estimated_duration: "9 months"
    dependencies: []
  - id: "WP-002"
    name: "API Gateway and Integration Platform"
    description: "Enterprise integration backbone for system connectivity"
    estimated_cost: "800K"
    estimated_duration: "6 months"
    dependencies: []
  - id: "WP-003"
    name: "Cloud Migration"
    description: "Migrate on-premise workloads to AWS"
    estimated_cost: "2.5M"
    estimated_duration: "18 months"
    dependencies: ["WP-002"]
```

## Phase F: Migration Planning

```yaml
migration_plan:
  wave_1:
    timeframe: "Q1-Q2 2026"
    budget: "2M"
    projects:
      - "API Gateway deployment"
      - "Lead management automation"
      - "CRM-ERP real-time sync"
  wave_2:
    timeframe: "Q3-Q4 2026"
    budget: "3.5M"
    projects:
      - "Customer Data Platform"
      - "Cloud migration - Wave 1"
      - "Data quality framework"
  wave_3:
    timeframe: "Q1-Q2 2027"
    budget: "4M"
    projects:
      - "Cloud migration - Wave 2"
      - "Omnichannel customer service"
      - "Legacy application retirement"
```

## Phase G: Implementation Governance

```yaml
compliance_review:
  review_points:
    - milestone: "Project Initiation"
      review_type: "Architecture alignment check"
    - milestone: "Design Complete"
      review_type: "Architecture compliance review"
    - milestone: "Pre-Production"
      review_type: "Architecture conformance check"
  classifications:
    conformant: "Meets all architecture requirements"
    conformant_with_exceptions: "Exception approved with expiry and mitigation"
    non_conformant: "Requires re-architecture and board escalation"
```

## Phase H: Architecture Change Management

```yaml
architecture_changes:
  simplified_updates:
    - "Technology product version upgrades (minor)"
    - "New applications fitting existing architecture"
    process: "Architect approval only"
  governed_changes:
    - "New technology platform introduced"
    - "Significant scope increase"
    - "Architecture principle exception"
    process: "Architecture Board review and approval"
  transformative_changes:
    - "New business model requiring architecture change"
    - "Merger or acquisition integration"
    - "Major technology shift"
    process: "Full ADM cycle triggered"
```

## ADM Phase Gate Reviews

| Gate | Criteria | Decision |
|---|---|---|
| Preliminary to A | Principles documented, governance established | Proceed or scope |
| A to B | Vision approved, stakeholders identified | Proceed or refine |
| B to C | Baseline and target documented, gap analysis done | Proceed or iterate |
| C to D | Data and application architectures complete | Proceed or refine |
| D to E | Technology architecture complete, gaps identified | Proceed or iterate |
| E to F | Work packages identified, roadmap drafted | Proceed or replan |
| F to G | Migration plan approved, business case validated | Proceed or review |
| G to H | Compliance reviewed, contracts active | Proceed or remediate |
| H to Next | Changes managed, repository updated | Continue cycle |

## Architecture Repository Structure

```
architecture-repository/
  01-principles/
  02-standards/
  03-baseline/
  04-target/
  05-roadmaps/
  06-governance/
  07-reference-library/
  08-requirements/
```

## ADM and Zachman Cross-Reference

| ADM Phase | Zachman Columns | Zachman Rows |
|---|---|---|
| Preliminary | All | Row 1 (Scope) |
| Phase A | What, How, Where | Rows 1-2 |
| Phase B | How, Who, When | Rows 2-3 |
| Phase C (Data) | What | Rows 2-4 |
| Phase C (Application) | How | Rows 2-4 |
| Phase D | Where | Rows 2-4 |
| Phase E | All | All |
| Phase F | All | All (with time perspective) |
| Phase G | All | Rows 3-6 |
| Phase H | All | All (change over time) |

## Integrating ADM with Agile

```yaml
agile_integration:
  practices:
    - "Architecture decision records (ADRs) per significant decision"
    - "Just-in-time architecture: elaborate detail only when needed"
    - "Architecture spikes in early sprints"
    - "Architecture runway items identified for upcoming PI"
```

## References

- zachman-framework-implementation.md -- Zachman Framework Implementation
- togaf-zachman-fundamentals.md -- TOGAF Zachman Fundamentals
- togaf-zachman-advanced.md -- TOGAF Zachman Advanced Topics
- togaf-framework.md -- TOGAF Architecture Development Method (ADM)
- zachman-framework.md -- Zachman Framework for Enterprise Architecture
- architecture-content.md -- Architecture Content Framework
- ea-governance.md -- Enterprise Architecture Governance

## ADM Customization for Different Organization Types

### Startup/Small Organization

```yaml
startup_adaptation:
  principles:
    - "Keep it lean: only document what adds immediate value"
    - "Focus on Phase A and E (vision and roadmap)"
    - "Skip detailed Phases B-D for non-critical domains"
    - "Phase H (change management) is informal"
  simplifications:
    - "Architecture Board: CTO + Tech Leads (weekly 30 min)"
    - "Architecture Repository: Single wiki page or Notion"
    - "Governance: Architecture review in pull requests only"
    - "Stakeholder management: All-hands updates quarterly"
  recommended_artifacts:
    - "Architecture Vision (1 page)"
    - "Technology Stack Decision Records (ADRs)"
    - "Migration/evolution roadmap (product roadmap with tech items)"
    - "Current state diagram (high-level, C4 L1-L2 only)"
```

### Mid-Size Organization (50-500 People)

```yaml
midsize_adaptation:
  principles:
    - "Balance governance with speed"
    - "Document critical domains fully, others with just-in-time detail"
    - "Automate compliance checks where possible"
    - "Phase G and H are essential for scaling"
  adaptations:
    - "Architecture Board: Head of Engineering + Domain Architects (bi-weekly)"
    - "Architecture Repository: Wiki + ADRs in repository"
    - "Governance: Architecture review for cross-domain changes only"
    - "Compliance: Automated checks in CI/CD for architecture rules"
  additional_artifacts:
    - "Domain-level capability maps (for critical domains only)"
    - "Integration landscape diagram"
    - "Architecture principles and standards document"
    - "Technology lifecycle management plan"
```

### Large Enterprise (5000+ People)

```yaml
enterprise_adaptation:
  principles:
    - "Full ADM cycle for strategic transformations"
    - "Domain-specific architecture teams (business, data, application, technology)"
    - "Formal Architecture Board with executive sponsorship"
    - "Enterprise Architecture tooling (Sparx EA, LeanIX, Ardoq)"
  structure:
    enterprise_architecture_team:
      roles:
        - "Chief Architect (EA practice lead)"
        - "Domain Architects (Business, Data, Application, Technology)"
        - "Solution Architects (per project/program)"
        - "Architecture Analysts (documentation and governance)"
      ratio: "1 architect per 50-100 technical staff"
    architecture_board:
      members: ["CTO", "Chief Architect", "Domain Architects", "Head of Engineering", "Head of Product"]
      frequency: "Weekly"
      authority: "Approve/deny architecture deviations"
    governance_bodies:
      - "Architecture Review Board (technical governance)"
      - "Technical Design Authority (solution-level decisions)"
      - "Security Architecture Board (security-specific)"
```

## Integrating ADM with Other Frameworks

### ADM + SAFe

```yaml
safe_integration:
  mapping:
    adm_preliminary: "SAFe Enterprise Architect establishes EA vision"
    adm_phase_a: "SAFe Program Increment (PI) Planning context"
    adm_phase_b_d: "Architecture Runway development for upcoming PI"
    adm_phase_e_f: "Feature and Capability prioritization for PI"
    adm_phase_g: "Architecture compliance during PI execution"
    adm_phase_h: "Continuous architecture evolution across PIs"

  architecture_runway:
    concept: "Enabler Epics and Enabler Stories for architectural improvements"
    examples:
      - "Platform migration enabler epic (spans multiple PIs)"
      - "API standardization enabler feature (single PI)"
      - "Technology upgrade enabler story (single iteration)"

  practices:
    - "Architecture content included in PI objectives"
    - "Architecture assessments during PI System Demo"
    - "Architecture decisions documented as ADRs"
    - "Architecture review integrated in pull request workflow"
```

### ADM + ITIL

```yaml
itil_integration:
  service_strategy:
    adm_phases: [A, B]
    integration:
      - "Define service portfolio aligned with architecture vision"
      - "Identify service value propositions based on capability gaps"
    outputs:
      - "Service catalog mapped to business capabilities"

  service_design:
    adm_phases: [C, D]
    integration:
      - "Design services using architecture patterns from ADM"
      - "Service level requirements derived from enterprise architecture"
    outputs:
      - "Service design packages with architecture conformance"

  service_transition:
    adm_phases: [E, F, G]
    integration:
      - "Change management follows architecture governance"
      - "Release and deployment aligned with migration plan"
    outputs:
      - "Transition plans with architecture compliance gates"

  service_operation:
    adm_phase: [H]
    integration:
      - "Architecture change management extends to operational changes"
      - "Incident management may trigger architecture review"
    outputs:
      - "Continuous improvement aligned with architecture roadmap"
```

## ADM Risk Management

```yaml
adm_risk_management:
  architecture_risks:
    technical_debt:
      description: "Accumulated suboptimal architecture decisions"
      mitigation:
        - "Track ADR rationale and expiry dates"
        - "Allocate 20% of capacity for debt reduction"
        - "Automated architecture fitness function monitoring"
    stakeholder_misalignment:
      description: "Conflicting priorities among stakeholders"
      mitigation:
        - "Regular stakeholder mapping updates"
        - "Visual communication (architecture models, capability maps)"
        - "Trade-off analysis with explicit criteria"
    scope_creep:
      description: "Architecture initiative expands beyond original scope"
      mitigation:
        - "Architecture charter with explicit boundaries"
        - "Phase gate reviews with go/no-go criteria"
        - "Change request process for scope adjustments"
    technology_obsolescence:
      description: "Technology chosen during ADM becomes outdated"
      mitigation:
        - "Technology radar with quarterly refresh"
        - "Short-lived technology experiments for emerging tech"
        - "Architecture decisions with defined review dates"
    organizational_resistance:
      description: "Pushback from teams against architecture changes"
      mitigation:
        - "Early and continuous stakeholder engagement"
        - "Architecture champions in each team"
        - "Quick wins to demonstrate architecture value"
        - "Training and enablement programs"
  risk_assessment_template:
    risk_id: "RISK-001"
    description: "Detailed description of the architecture risk"
    category: "Technical|Organizational|Process|Technology"
    probability: "Low|Medium|High|Very High"
    impact: "Negligible|Minor|Moderate|Significant|Severe"
    risk_score: "probability * impact (1-25)"
    mitigation_strategy: "Accept|Mitigate|Transfer|Avoid"
    contingency_plan: "Actions if risk materializes"
    owner: "Responsible person"
    review_date: "YYYY-MM-DD"
