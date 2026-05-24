# Data Maturity Reference

## Maturity Model Overview

A data maturity model provides a structured framework to assess an organization's current data capabilities and define a path for improvement. The most widely adopted is a 5-level model covering four dimensions: People, Process, Technology, and Governance.

### Level 1: Initial (Ad-Hoc)
Data is managed informally with no standardized processes or tools. Decisions are based on intuition rather than data.

**People:** No dedicated data roles; data tasks are secondary responsibilities. Limited data skills across the organization. No data literacy awareness.

**Process:** No formal processes for data management. Data is collected and stored manually. No data quality checks. No documentation standards.

**Technology:** Spreadsheets and file shares for data storage. No centralized data platform. Access is uncontrolled and ad-hoc. No catalog or metadata management.

**Governance:** No governance framework. No data owners or stewards. No policies for data access, retention, or privacy. No compliance controls.

**Assessment Indicators:**
- No data catalog exists
- Data quality is reactive (fix when broken)
- Reports are manually created in Excel
- No single source of truth for key metrics
- Data silos across departments

### Level 2: Managed (Project-Level)
Data management begins within individual projects or departments. Basic standards emerge but are not enterprise-wide.

**People:** Project-level data roles assigned informally. Some team members have data skills. Initial data training provided. Departmental data champions emerge.

**Process:** Basic data standards within projects. Documentation exists but is inconsistent. Simple quality checks on critical data. Backup and recovery procedures in place.

**Technology:** Departmental databases and tools. Basic data integration between key systems. Some use of data warehousing. Simple reporting tools deployed.

**Governance:** Project-level governance for data access. Initial data ownership assigned per project. Basic privacy controls (who can see what). Compliance addressed at project level.

**Assessment Indicators:**
- Per-department data standards exist but conflict
- Data quality issues found and fixed within teams
- Some metadata documented
- Backup and recovery processes exist
- Department-level reports use consistent definitions

### Level 3: Defined (Enterprise Standards)
Enterprise-wide data standards, processes, and tools are established. Data is recognized as a shared asset.

**People:** Data steward roles created. CDO or equivalent appointed. Data literacy program launched. Data community of practice established. Training paths defined.

**Process:** Enterprise data standards published. Data quality metrics tracked. SLA framework for data services. Change management process for data structures. Master data management initiated.

**Technology:** Enterprise data platform (data lake/warehouse). Data catalog implemented. ETL/ELT tooling standardized. Data quality tooling deployed. Metadata management system in place.

**Governance:** Data governance council established. Data owners assigned for critical data domains. Data policies published and communicated. Access control framework implemented. Privacy impact assessments conducted.

**Assessment Indicators:**
- Enterprise data catalog with business glossary
- Data quality dashboards with SLAs
- Master data management for key domains
- Data governance council meets regularly
- Data owners and stewards assigned

### Level 4: Quantitatively Managed (Measured)
Data management processes are measured, controlled, and data-driven. Predictive analytics inform data quality and governance.

**People:** Advanced data skills across the organization. Data-driven decision-making is the norm. Self-service analytics adopted broadly. Data champions drive improvements.

**Process:** Processes measured with KPIs. Predictive quality monitoring. Automated data lineage tracking. Cost optimization processes for data. Continuous improvement cycles.

**Technology:** Automated data quality monitoring. Real-time data pipelines. Advanced analytics and ML platform. Data observability tools. Automated governance enforcement.

**Governance:** Governance metrics tracked and reported. Automated policy enforcement. Data value measured and reported. Risk-based data protection. Audit-ready compliance posture.

**Assessment Indicators:**
- Predictive data quality alerts
- Automated column-level lineage
- Self-service analytics adopted across functions
- Data costs tracked per domain
- Governance metrics on executive dashboard

### Level 5: Optimizing (Continuous Improvement)
Data capabilities are continuously optimized. Data is a strategic asset driving competitive advantage.

**People:** Data culture embedded in organizational DNA. Continuous learning and improvement. Data roles evolve with changing needs. External data community engagement.

**Process:** Automated optimization of data pipelines. AI-driven data management. Continuous feedback loops improve data products. Data innovation process formalized.

**Technology:** AI-augmented data management. Data mesh or data fabric architecture. Real-time data sharing across ecosystem. Advanced privacy-preserving computation.

**Governance:** Self-service governance with automated guardrails. Data ethics framework operationalized. Data monetization governance. Ecosystem data sharing with trust frameworks.

**Assessment Indicators:**
- AI-driven data pipeline optimization
- Data products monetized
- Real-time data sharing with partners
- Data ethics board operational
- External data exchange participation

### Assessment Scoring Matrix

| Dimension | Level 1 | Level 2 | Level 3 | Level 4 | Level 5 |
|-----------|---------|---------|---------|---------|---------|
| **People** | No roles | Project roles | Data stewards/CDO | Advanced skills everywhere | Continuous learning |
| **Process** | None | Project standards | Enterprise standards | Measured KPIs | AI-optimized |
| **Technology** | Spreadsheets | Dept databases | Enterprise platform | Automated & real-time | Self-optimizing |
| **Governance** | None | Project-level | Council + policies | Automated enforcement | Self-service guardrails |

### Improvement Roadmap

```
Level 1 → Level 2 (3-6 months):
  - Assign data owners for critical data
  - Implement basic data quality checks
  - Document key data definitions
  - Standardize reporting for top 10 metrics

Level 2 → Level 3 (6-12 months):
  - Appoint CDO and data governance council
  - Deploy enterprise data catalog
  - Establish data steward network
  - Publish enterprise data standards

Level 3 → Level 4 (12-24 months):
  - Implement automated lineage
  - Deploy data observability
  - Enable self-service analytics
  - Track data quality with dashboards

Level 4 → Level 5 (24-36 months):
  - AI-augmented data management
  - Data product monetization
  - Ecosystem data sharing
  - Continuous optimization culture
```

### Tool-Assisted Maturity Assessment

```sql
CREATE TABLE data_maturity_scores (
    assessment_id UUID,
    assessment_date DATE,
    dimension STRING,          -- people, process, technology, governance
    sub_dimension STRING,      -- e.g., training, tools, policies
    current_level INT,         -- 1-5
    target_level INT,          -- 1-5
    score DECIMAL(5,2),        -- 0.00-5.00
    evidence TEXT,
    assessed_by STRING
);

-- Calculate overall maturity
SELECT
    AVG(current_level) AS overall_maturity,
    APPROX_PERCENTILE(current_level, 0.5) AS median_maturity,
    MIN(current_level) AS min_maturity,
    MAX(current_level) AS max_maturity
FROM data_maturity_scores
WHERE assessment_date = (SELECT MAX(assessment_date) FROM data_maturity_scores);

-- Maturity by dimension (gaps analysis)
SELECT
    dimension,
    AVG(current_level) AS current,
    AVG(target_level) AS target,
    AVG(target_level) - AVG(current_level) AS gap
FROM data_maturity_scores
WHERE assessment_date = (SELECT MAX(assessment_date) FROM data_maturity_scores)
GROUP BY dimension
ORDER BY gap DESC;
```

### Capability Mapping

Map specific capabilities to maturity levels to build targeted improvement plans:

| Capability | L1 | L2 | L3 | L4 | L5 |
|------------|----|----|----|----|----|
| Data Catalog | None | Spreadsheet | Tool deployed | Automated discovery | AI-enriched |
| Data Quality | Reactive | Basic checks | Monitored | Predictive | Automated correction |
| Data Lineage | None | Manual | Key tables | Column-level | Real-time |
| Master Data | None | Dept MDM | Enterprise MDM | Automated matching | Self-healing |
| Data Access | Shared drives | Per-project DB | Central platform | Self-service | Data marketplace |
| Analytics | Excel reports | BI dashboards | Self-service | ML-augmented | Real-time AI |

## Rules
- Assess all four dimensions; the weakest dimension limits overall maturity
- Target the next level, not the final level — incremental improvement is sustainable
- Align maturity targets with business value, not technical perfection
- Re-assess annually to track progress and adjust roadmap
- Use assessment scores to prioritize investments and initiatives
- Document evidence for each score to ensure objective assessment
- Involve stakeholders from all four dimensions in the assessment process
