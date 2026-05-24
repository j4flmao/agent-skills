# Data Ownership Reference

## Data Domain Framework

Data domains represent the major subject areas of the business. Each domain is a bounded context with its own data assets, rules, and ownership.

### Common Data Domains

| Domain | Description | Key Data Assets | Business Area |
|--------|-------------|----------------|---------------|
| **Customer** | Individuals and organizations that buy products | Customer profile, preferences, interactions, segments | Marketing, Sales, Support |
| **Product** | Goods and services offered | Product catalog, pricing, inventory, specifications | Product, Merchandising |
| **Order** | Customer purchase transactions | Orders, line items, payments, fulfillment | Sales, Operations, Finance |
| **Finance** | Financial transactions and reporting | General ledger, accounts payable/receivable, budgets | Finance, Accounting |
| **Supply Chain** | Movement of goods from supplier to customer | Suppliers, purchase orders, shipments, inventory | Procurement, Logistics |
| **Employee** | Workforce data | Employee records, compensation, performance, training | HR, Payroll |
| **Marketing** | Campaign and engagement data | Campaigns, leads, channels, attribution | Marketing |
| **Digital** | Online/digital engagement | Web analytics, app usage, clickstream, A/B tests | Digital, Product |
| **Risk & Compliance** | Risk management and regulatory data | Risk assessments, incidents, audit logs, controls | Risk, Legal, Compliance |

### Domain Definition Template

```yaml
domain:
  name: Customer
  owner: VP of Customer Experience
  steward: Customer Data Steward
  description: >
    All data related to individuals and organizations that interact with
    the company's products and services, including identification,
    contact information, preferences, behaviors, and relationship history.
  boundaries:
    includes:
      - Individual and corporate customer profiles
      - Customer contact information and preferences
      - Customer interactions across all channels
      - Customer segments and scoring
      - Customer consent and privacy preferences
    excludes:
      - Product catalog (see Product domain)
      - Financial transactions (see Finance domain)
      - Employee data (see Employee domain)
  critical_data_elements:
    - customer_id (primary identifier)
    - customer_email (contact and dedup key)
    - customer_tier (segmentation)
    - consent_status (privacy compliance)
  systems_of_record:
    - Salesforce CRM
    - Customer Data Platform (mParticle)
    - Data Warehouse (customer tables)
  consumers:
    - Marketing (campaign targeting, segmentation)
    - Sales (account management)
    - Support (ticket resolution)
    - Product (user research)
    - Finance (billing, collections)
```

## Data Owner Role

**Data Owner:** A senior business leader accountable for data quality, access, and usage within a domain.

### Responsibilities
- Define data quality standards and SLAs for the domain
- Approve data access requests
- Resolve data quality issues and disputes
- Define data retention and archival policies
- Ensure compliance with data privacy regulations
- Prioritize data improvement initiatives
- Represent the domain in data governance council
- Allocate budget for domain data management

### Skills and Qualifications
- Senior leadership role (Director/VP level)
- Deep understanding of business processes in the domain
- Authority to make decisions about data usage and access
- Ability to allocate resources for data initiatives
- Understanding of data governance principles

### Accountability Matrix

| Data Owner Responsibility | Accountable To | Frequency |
|---------------------------|----------------|-----------|
| Data quality SLAs | Data Governance Council | Quarterly |
| Access approvals | Privacy Office (for PII) | As needed |
| Retention policy compliance | Legal/Compliance | Annually |
| Budget for data initiatives | CDO | Annually |
| Domain data strategy | CDO | Annually |

## Data Steward Role

**Data Steward:** An operational role responsible for day-to-day management of data assets within a domain.

### Responsibilities
- Document data definitions, lineage, and metadata
- Monitor data quality metrics and resolve issues
- Manage reference data and code sets
- Review and approve data access requests (operational)
- Coordinate data issue resolution with data engineers
- Train business users on data definitions and usage
- Support data catalog maintenance and enrichment
- Participate in data governance working groups

### Skills and Qualifications
- Deep domain knowledge
- Understanding of data modeling and SQL
- Familiarity with data quality tools
- Strong communication and collaboration skills
- Attention to detail and analytical mindset

### Stewardship Types

```yaml
stewardship_types:
  business_steward:
    - Role: Full-time or part-time
    - Focus: Business definitions, quality rules, usage guidance
    - Background: Business analyst, domain expert
    - Typical: 1 per domain (FTE or 50%+ allocation)

  technical_steward:
    - Role: Part-time (data engineer)
    - Focus: Technical metadata, lineage, pipeline quality
    - Background: Data engineer, data architect
    - Typical: Shared across domains (25% per domain)

  operational_steward:
    - Role: Part-time (power user)
    - Focus: Day-to-day data quality monitoring, issue triage
    - Background: Business user with data skills
    - Typical: 1-3 per department
```

## Decision Rights

### Decision Types and Authority Levels

| Decision | Data Owner | Data Steward | Domain Team | Platform Team | CDO |
|----------|------------|-------------|-------------|---------------|-----|
| Add new data element | Approve | Recommend | Propose | Consult | - |
| Modify data definition | Approve | Propose | - | Inform | - |
| Deprecate data element | Approve | Recommend | - | Inform | Inform |
| Grant data access | Approve | Recommend | - | Execute | - |
| Set quality threshold | Approve | Propose | Consult | - | Inform |
| Change data source | Approve | Consult | Propose | Consult | Inform |
| Define retention period | Approve | Propose | Consult | - | Consult |
| Resolve quality issue | Inform | Execute | Consult | Support | - |
| Add to data catalog | Inform | Execute | Propose | Support | - |

### Escalation Paths

```
Level 1: Data Steward → Data Owner
  - Issues: Data quality disputes, access requests, definition clarifications
  - Response: Within 2 business days

Level 2: Data Owner → Data Governance Council
  - Issues: Cross-domain disputes, policy exceptions, budget allocation
  - Response: Within 1 week (next council meeting)

Level 3: Data Governance Council → CDO
  - Issues: Strategic decisions, regulatory matters, organization-wide changes
  - Response: Within 2 weeks

Level 4: CDO → Executive Committee
  - Issues: Enterprise-wide data transformation, major investment decisions
  - Response: Within 1 month
```

## SLA Framework

### Data Quality SLAs

```sql
-- SLA definition table
CREATE TABLE data_quality_slas (
    sla_id UUID,
    domain STRING,
    data_element STRING,
    quality_dimension STRING,   -- completeness, accuracy, consistency, timeliness, uniqueness, validity
    metric_name STRING,
    threshold DECIMAL(5,2),
    threshold_type STRING,      -- min, max, exact
    severity STRING,            -- critical, high, medium, low
    measurement_frequency STRING,
    owner STRING,
    escalation_path STRING
);

-- Sample SLA entries
INSERT INTO data_quality_slas VALUES
    (uuid(), 'Customer', 'customer_email', 'completeness', 'not_null_pct', 99.5, 'min', 'critical', 'daily', 'Customer Steward', 'steward→owner'),
    (uuid(), 'Customer', 'customer_email', 'validity', 'valid_email_pct', 98.0, 'min', 'high', 'daily', 'Customer Steward', 'steward→owner'),
    (uuid(), 'Order', 'order_amount', 'accuracy', 'amount_greater_than_zero', 100.0, 'min', 'critical', 'daily', 'Order Steward', 'steward→owner→council'),
    (uuid(), 'Product', 'product_name', 'completeness', 'not_null_pct', 99.0, 'min', 'medium', 'weekly', 'Product Steward', 'steward→owner'),
    (uuid(), 'Customer', 'customer_tier', 'validity', 'valid_tier_values_pct', 100.0, 'min', 'high', 'daily', 'Customer Steward', 'steward→owner');
```

### Access SLAs

| Request Type | Target Response | Escalation | Approval |
|-------------|----------------|------------|----------|
| New data access (existing role) | 2 business days | Data Steward → Data Owner | Automate if matching template |
| New data access (new role) | 5 business days | Data Steward → Data Owner | Data Owner approval |
| PII/sensitive data access | 10 business days | Data Steward → Privacy Office | Data Owner + Privacy Office |
| Emergency access | 4 hours | Data Steward (on-call) | Data Owner + Security |
| Access revocation | 24 hours | Automated | Data Owner notification |

### Issue Resolution SLAs

| Severity | Definition | Response Time | Resolution Time | Escalation |
|----------|------------|---------------|-----------------|------------|
| Critical | Data incorrect causing financial/business impact | 1 hour | 4 hours | Steward → Owner → CDO |
| High | Data incorrect but no immediate business impact | 4 hours | 24 hours | Steward → Owner |
| Medium | Data quality concern, no known impact | 24 hours | 5 business days | Steward |
| Low | Cosmetic issue or improvement suggestion | 5 business days | 30 days | Steward |

## Accountability Tracking

```sql
-- Ownership and accountability matrix
CREATE TABLE data_domain_accountability (
    domain STRING,
    data_owner STRING,
    data_owner_department STRING,
    data_steward STRING,
    steward_type STRING,          -- business, technical, operational
    steward_allocation_pct DECIMAL(3,0),
    governance_council_member BOOLEAN,
    last_review_date DATE,
    next_review_date DATE,
    status STRING                -- active, pending_assignment, under_review
);

-- Insert current ownership
INSERT INTO data_domain_accountability VALUES
    ('Customer', 'Jane Smith (VP Customer Exp)', 'Customer Experience', 'John Davis', 'business', 75, true, '2026-04-01', '2026-10-01', 'active'),
    ('Product', 'Mike Chen (VP Product)', 'Product Management', 'Sarah Lee', 'business', 50, true, '2026-03-15', '2026-09-15', 'active'),
    ('Order', 'Tom Wilson (VP Operations)', 'Operations', 'Emily Brown', 'business', 50, false, '2026-04-10', '2026-10-10', 'active'),
    ('Finance', 'Lisa Park (CFO)', 'Finance', 'Alex Turner', 'technical', 25, true, '2026-02-01', '2026-08-01', 'active');

-- Governance council roster
SELECT
    domain,
    data_owner,
    data_steward
FROM data_domain_accountability
WHERE governance_council_member = true;
```

## Rules
- Every data asset has exactly one data owner
- Data owners are business roles, not IT roles
- Data stewards are the operational arm of data ownership
- Decision rights must be documented and exercised regularly
- Escalation paths must be tested (at least annually)
- SLAs must be measurable and automatically monitored
- Ownership reviews happen every 6 months
- Cross-domain data requires joint ownership agreement
- New data domains are created by the Data Governance Council
- Data owner rotation is planned with overlap for knowledge transfer
