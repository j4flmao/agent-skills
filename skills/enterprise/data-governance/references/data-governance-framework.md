# Data Governance Framework

## DAMA-DMBOK Framework Overview

DAMA-DMBOK (Data Management Body of Knowledge) defines 11 knowledge areas for data management.

### DAMA Wheel Knowledge Areas
```
1. Data Architecture — enterprise data models, integration design
2. Data Modeling and Design — conceptual, logical, physical models
3. Data Storage and Operations — database administration, storage management
4. Data Security — access control, encryption, masking
5. Data Integration and Interoperability — ETL, data sharing, APIs
6. Document and Content Management — unstructured data governance
7. Reference and Master Data — golden records, MDM hub
8. Data Warehousing and BI — analytics data platforms
9. Metadata Management — data catalog, business glossary
10. Data Quality — measurement, improvement, monitoring
11. Data Governance — strategy, stewardship, policies, compliance
```

### DAMA Maturity Model
```
Level 0: No governance — ad-hoc data management
Level 1: Initial — awareness, informal roles
Level 2: Reactive — some policies, crisis-driven
Level 3: Proactive — defined processes, stewardship assigned
Level 4: Managed — measured, monitored, continuous improvement
Level 5: Optimized — automated, predictive, industry-leading
```

## Data Stewardship

### Stewardship Roles
```
Role | Responsibility | Example
-----|--------------|--------
Business Steward | Defines business rules, data meaning | Product Manager
Technical Steward | Implements controls, manages pipelines | Data Engineer
Data Custodian | Operates systems, enforces access | DBA
Data Owner | Accountable for data quality and security | VP of Data
Data Council | Cross-functional governance decisions | Steering Committee
```

### Stewardship Operating Model
```
Operational: Business stewards per domain, weekly standups
Tactical: Data owners per division, monthly reviews
Strategic: Data council quarterly, policy approvals

RACI for Data Decisions:
| Decision | Business Steward | Technical Steward | Data Owner | Data Council |
|----------|-----------------|-------------------|------------|--------------|
| Data classification | C | C | A | I |
| Schema changes | C | R | I | A |
| Access requests | I | R | A | I |
| Quality targets | R | C | A | I |
| Retention policy | C | I | R | A |
```

## Data Catalog

### Catalog Structure
```
Domain → Dataset → Schema → Column → Ownership

Example:
Domain: Customer
  Dataset: customer_profile
    Schema: customer_id, name, email, phone, address
    Owner: Jane (Business Steward)
  Dataset: customer_transactions
    Schema: txn_id, customer_id, amount, timestamp
    Owner: Bob (Technical Steward)

Domain: Product
  Dataset: product_catalog
    Schema: sku, name, category, price, inventory
    Owner: Alice (Business Steward)
```

### Business Glossary Terms
```
Term | Definition | Synonyms | Domain | Steward
-----|-----------|----------|--------|--------
Active User | User with at least one session in 30 days | MAU, Active | Product | Jane
Net Revenue | Gross revenue minus returns and discounts | Revenue Net | Finance | Bob
Customer | Person or entity with signed contract | Client, Account | Sales | Alice
Churn Rate | % of customers lost in a period | Attrition | Product | Jane
```

### Data Discovery and Search
```
Enable search across:
- Dataset names and descriptions
- Column names and descriptions
- Business glossary terms
- Data lineage paths
- Tags and classifications

Publish data contracts for producer-consumer relationships
```

## Data Quality

### Quality Dimensions
```
Dimension | Definition | Metric
----------|-----------|-------
Completeness | No nulls in required fields | % populated
Accuracy | Matches source of truth | % matching reference
Timeliness | Available within SLA | % delivered on time
Consistency | Same value across systems | % matching across sources
Uniqueness | No duplicate records | % unique
Validity | Conforms to defined format | % conformant
Integrity | Referential integrity maintained | % valid foreign keys
```

### Data Quality Scorecard
```
| Dataset | Completeness | Accuracy | Timeliness | Consistency | Score |
|---------|-------------|----------|------------|-------------|-------|
| Customer Profile | 98% | 95% | 100% | 92% | 96% |
| Order Transactions | 100% | 99% | 98% | 97% | 99% |
| Product Catalog | 95% | 88% | 100% | 85% | 92% |
| Inventory | 99% | 96% | 95% | 90% | 95% |

Target: All datasets >95% overall quality
Owner: Business steward per domain
Review: Monthly quality review board
```

### Automated Quality Monitoring
```sql
-- Completeness check example
SELECT
  COUNT(*) as total_rows,
  COUNT(email) as email_populated,
  ROUND(100.0 * COUNT(email) / COUNT(*), 2) as completeness_pct
FROM customer_profile;

-- Uniqueness check
SELECT email, COUNT(*) as dup_count
FROM customer_profile
GROUP BY email
HAVING COUNT(*) > 1;
```

## Data Lineage

### Lineage Levels
```
Level 1: Table-level — shows source and destination tables
Level 2: Column-level — maps individual column transformations
Level 3: Row-level — tracks specific record provenance

Critical data domains require Level 2 lineage minimum
Regulatory data requires Level 3 lineage
```

### Lineage Documentation Format
```
Dataset: customer_360
Source → Transform → Target:

customer_profile (raw) → JOIN → customer_360
customer_transactions (raw) → AGG → customer_360
support_tickets (raw) → FILTER → customer_360

Columns:
customer_360.customer_id ← customer_profile.id
customer_360.total_spend ← SUM(customer_transactions.amount)
customer_360.open_tickets ← COUNT(support_tickets WHERE status='open')
```

## Data Ownership Models

### Assignment Model
```
Ownership by:
- Domain (customer, product, finance, operations)
- Data type (structured, unstructured, streaming)
- System of record (CRM, ERP, data warehouse)
- Regulatory requirement (PII, PCI, PHI)

Primary owner per dataset (accountable)
Secondary owner per dataset (backup)
Technical contact per dataset (operational)
```

### Ownership Responsibilities
```
Data Owner:
- Approve data classification and access
- Ensure quality meets targets
- Define retention and disposal
- Sponsor data improvement initiatives
- Quarterly review of governance metrics

Data Steward:
- Document business definitions
- Resolve quality issues
- Validate lineage accuracy
- Train consumers on data usage
- Weekly monitoring and triage
```
