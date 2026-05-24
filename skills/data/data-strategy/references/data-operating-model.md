# Data Operating Model Reference

## Operating Model Types

### Centralized Model
A single central data organization (CDO office) owns all data capabilities, resources, and delivery.

**Structure:**
- Chief Data Officer (CDO) with executive authority
- Central data engineering, analytics, and governance teams
- All data practitioners report into the central organization
- Business units consume data services but don't build them

**Best for:**
- Organizations starting their data journey (Level 1-2 maturity)
- Highly regulated industries needing consistent governance
- Small to medium organizations with limited data talent
- Organizations with homogeneous business units

**Pros:**
- Consistent standards and governance
- Efficient resource utilization
- Single point of accountability
- Easier to build critical mass of expertise
- Faster implementation of enterprise initiatives

**Cons:**
- Can become a bottleneck for business requests
- Less business context in data solutions
- May not meet domain-specific needs
- Slower response to local requirements
- Business units may feel disempowered

**Decision Rights:**

| Decision Type | Authority |
|---------------|-----------|
| Data platform architecture | CDO / Central Architecture |
| Data standards and policies | CDO / Governance Office |
| Data tool selection | CDO / Central Platform |
| Use case prioritization | CDO + Business Stakeholders |
| Data quality SLAs | Central Data Quality Team |
| Budget allocation | CDO |

### Federated Model
Data capabilities are distributed across business units with a small central coordinating body.

**Structure:**
- Small central COE (3-10 people) sets standards and provides shared services
- Data teams embedded in each business unit
- Embedded teams report to business unit leadership (dotted line to COE)
- COE provides governance framework, shared platform, and best practices

**Best for:**
- Organizations with diverse business units (conglomerates)
- Mature data organizations (Level 3+)
- Large enterprises with independent P&L units
- Organizations where business context is critical

**Pros:**
- Deep business domain knowledge in data solutions
- Fast response to business needs
- High business ownership and engagement
- Domain-specific optimization

**Cons:**
- Duplication of effort across units
- Inconsistent standards and tools
- Difficult to share data across domains
- Harder to build enterprise-wide capabilities
- Higher total cost

**Decision Rights:**

| Decision Type | Authority |
|---------------|-----------|
| Data platform architecture | COE (standards) + Domain (implementation) |
| Data standards and policies | COE (enterprise) + Domain (local extensions) |
| Data tool selection | COE (platform) + Domain (domain-specific) |
| Use case prioritization | Domain Leadership |
| Data quality SLAs | Domain Data Teams |
| Budget allocation | Domain Leadership + COE Co-investment |

### Hybrid Model (Recommended)
A central data platform team provides shared infrastructure and governance, while domain-aligned data teams manage data products within their business areas.

**Structure:**
- Central Data Platform Team: builds and maintains shared infrastructure (data lake, warehouse, catalog, tools)
- Domain Data Teams: embedded in business units, manage domain data products end-to-end
- Data Governance Office: enterprise-wide policies, standards, and stewardship coordination
- Data COE: center of excellence provides training, best practices, community management

**Best for:**
- Most large enterprises
- Organizations with diverse domains requiring both consistency and flexibility
- Organizations at Level 3+ maturity transitioning from centralized or federated

**Pros:**
- Shared infrastructure efficiency + domain context
- Consistent governance + flexible execution
- Career paths in both platform and domain
- Balance of control and autonomy

**Cons:**
- Requires strong coordination
- Potential for tension between central and domain teams
- More complex decision rights
- Needs clear scope boundaries

**Decision Rights:**

| Decision Type | Central Platform | Domain Team | Governance Office |
|---------------|-----------------|-------------|-------------------|
| Platform architecture | Own | Input | Input |
| Data standards | Input | Input | Own |
| Tool selection | Own (infra tools) | Own (domain tools) | Approve |
| Use case prioritization | Input | Own | Input |
| Data quality | Provide tooling | Own measurement | Audit |
| Data sharing | Enable | Execute | Approve policies |
| Budget | Platform budget | Domain budget | Co-investment |

## Data Organization Structures

### Chief Data Officer (CDO) Office

```
Chief Data Officer (CDO)
├── Data Governance Office
│   ├── Data Governance Manager
│   ├── Data Stewards (domain-aligned)
│   └── Compliance & Privacy Officer
├── Data Platform Team
│   ├── Data Architecture
│   ├── Platform Engineering
│   ├── DataOps / CI-CD
│   └── Tool Administration
├── Data Products & Analytics
│   ├── Data Product Managers
│   ├── Data Scientists
│   └── BI / Visualization Team
└── Data Literacy & Culture
    ├── Training & Enablement
    ├── Data Champion Coordination
    └── Internal Communications
```

### Domain Data Team Structure

```
Domain Data Director (e.g., Customer Data Domain)
├── Data Engineers (2-5)
│   └── Build and maintain domain pipelines
├── Data Analysts (2-5)
│   └── Domain-specific analysis and reporting
├── Data Scientist (1-2)
│   └── Domain ML models and advanced analytics
└── Data Steward (1)
    └── Domain data quality and metadata
```

### Data Center of Excellence (COE)

```
Data COE Lead
├── Best Practices & Standards
│   ├── Coding standards and templates
│   ├── Architecture review board
│   └── Tool evaluation and POCs
├── Training & Enablement
│   ├── Data literacy curriculum
│   ├── Tool training (dbt, SQL, Python)
│   └── Community management (forums, events)
├── Shared Services
│   ├── Data catalog administration
│   ├── Reference data management
│   └── Common dimension stewardship
└── Innovation & Research
    ├── Emerging technology evaluation
    ├── POC coordination
    └── External community engagement
```

## RACI Matrix for Data Management

| Activity | CDO | Domain Owner | Data Steward | Platform Team | Business User |
|----------|-----|--------------|--------------|---------------|---------------|
| Define data strategy | A | R | C | C | C |
| Set data standards | A | R | C | I | I |
| Define data quality rules | I | A | R | C | C |
| Monitor data quality | I | A | R | C | I |
| Resolve data quality issues | I | A | R | C | I |
| Manage metadata | I | C | R | A | I |
| Manage reference data | I | C | R | A | C |
| Approve data access | C | A | R | C | I |
| Design data architecture | A | C | I | R | I |
| Build data pipelines | I | C | I | R | I |
| Manage data platform | A | I | I | R | I |
| Train data practitioners | A | I | C | R | I |
| Report data KPIs | I | A | R | C | I |

**R = Responsible** (does the work)
**A = Accountable** (answers for the outcome)
**C = Consulted** (provides input before decision)
**I = Informed** (notified after decision)

## Operating Model Transition

### Centralized → Hybrid Transition

```
Month 0-3: Assessment
  - Assess current central team capacity and bottlenecks
  - Identify natural data domain boundaries
  - Interview business unit stakeholders

Month 3-6: Pilot
  - Select 1-2 domains for pilot (e.g., Customer, Finance)
  - Assign domain data teams with dotted line to central
  - Define platform vs domain scope boundaries
  - Document decision rights and escalation paths

Month 6-12: Scale
  - Roll out domain model to remaining domains
  - Establish Data COE
  - Implement cost allocation model (chargeback/showback)
  - Continuous refinement of boundaries

Month 12-18: Optimize
  - Review and adjust domain boundaries
  - Optimize platform shared services
  - Mature cross-domain data sharing
```

### Operating Model Success Metrics

```sql
CREATE TABLE operating_model_metrics (
    metric_date DATE,
    metric_name STRING,          -- e.g., time_to_value, domain_satisfaction, platform_cost_per_domain
    metric_value DECIMAL(10,2),
    target_value DECIMAL(10,2),
    domain STRING,
    measurement_method STRING
);

-- Track time from request to data product delivery
SELECT
    domain,
    AVG(DATEDIFF('day', request_date, delivery_date)) AS avg_days_to_value
FROM data_product_requests
WHERE request_date >= DATEADD('month', -6, CURRENT_DATE)
GROUP BY domain;

-- Platform cost allocation per domain
SELECT
    domain,
    SUM(compute_cost + storage_cost + tool_cost) AS total_cost,
    COUNT(DISTINCT data_product_id) AS product_count,
    SUM(compute_cost + storage_cost + tool_cost) / NULLIF(COUNT(DISTINCT data_product_id), 0) AS cost_per_product
FROM platform_cost_allocation
WHERE month = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY domain;
```

## Rules
- Select operating model based on current maturity, not aspirational target
- Centralized for Level 1-2; Hybrid for Level 3+; Federated rarely works without strong governance
- Pilot hybrid model in 1-2 domains before organization-wide rollout
- Decision rights must be documented and agreed by all stakeholders
- Platform team is a service provider, not a controller
- Domain data teams own their data products end-to-end
- COE effectiveness depends on voluntary participation, not mandate
- Review operating model annually and adjust for organizational changes
- Cost allocation drives accountability and efficient resource use
- Escalation paths must be defined for cross-domain decisions
