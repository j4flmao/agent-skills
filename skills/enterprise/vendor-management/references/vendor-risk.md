# Vendor Risk Management

## Introduction

Vendor risk management (VRM) identifies, assesses, and mitigates risks associated with third-party vendors. Effective VRM protects the organization from security breaches, operational disruptions, financial loss, and regulatory non-compliance arising from vendor relationships.

## Risk Tiers

### Tier Classification
| Tier | Definition | Examples | Assessment Frequency |
|------|------------|----------|---------------------|
| Tier 1 -- Critical | Direct access to sensitive data, critical infrastructure, regulatory impact | Cloud providers, payment processors, identity platforms | Initial + Quarterly |
| Tier 2 -- High | Access to internal systems, processes business data, moderate impact | SaaS platforms, managed services, system integrators | Initial + Semi-Annual |
| Tier 3 -- Medium | Limited data access, non-critical services, low impact | Marketing tools, office supplies, consulting | Initial + Annual |
| Tier 4 -- Low | No data access, commoditized services, minimal impact | Cleaning services, catering, general supplies | Initial only |

### Tier Assignment Criteria
- **Data Access**: Does vendor handle PII, PHI, cardholder data, or confidential information?
- **System Access**: Does vendor connect to internal networks or systems?
- **Business Criticality**: Would vendor disruption cause significant business impact?
- **Regulatory Exposure**: Is vendor subject to or does it impact regulatory compliance?
- **Financial Dependency**: Is there significant financial exposure to vendor failure?
- **Concentration Risk**: Is this vendor a single point of failure?

## Vendor Risk Assessment

### Security Assessment

| Domain | Assessment Areas | Evidence Required |
|--------|-----------------|-------------------|
| Access Control | User authentication, MFA, privilege management, access reviews | SOC 2 report, policy documents |
| Data Protection | Encryption at rest/transit, key management, data classification | DPA, encryption standards |
| Network Security | Firewall configs, segmentation, vulnerability management | Pen test reports, vulnerability scans |
| Application Security | SDLC, code review, vulnerability scanning, secrets management | SDLC documentation |
| Incident Response | IR plan, detection, response, communication, lessons learned | IR policy, recent IR reports |
| Business Continuity | BCP, DR plan, backup/restore, RTO/RPO targets | BCP document, DR test results |
| Physical Security | Data center access controls, environmental controls, CCTV | SOC 2 / ISO 27001, site visit |

### Financial Assessment
| Criterion | Assessment | Risk Indicator |
|-----------|------------|---------------|
| Revenue trend | Growing, stable, declining | Declining >2 consecutive years |
| Profitability | Profitable, break-even, loss-making | Sustained losses |
| Funding | Bootstrapped, venture-backed, public | Early-stage, cash burn high |
| Customer concentration | No single customer >10% vs. >50% from one | High concentration |
| Debt level | Low, moderate, high | Debt-to-equity > 2:1 |
| Credit rating | Investment grade, speculative, none | Below investment grade |

### Operational Assessment
| Criterion | Assessment Areas |
|-----------|-----------------|
| Staffing | Key person dependency, turnover rate, team size and location |
| Support Model | Support hours, channels, escalation process, language support |
| Change Management | Change process, release frequency, regression testing |
| Compliance | Certifications, regulatory compliance, audit history |
| Insurance | Coverage types, limits, policy renewal dates |

## Due Diligence Process

### Due Diligence by Tier

| Activity | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|----------|--------|--------|--------|--------|
| Security questionnaire | Required | Required | Required | Not required |
| SOC 2 / ISO 27001 review | Required | Required | Recommended | Not required |
| Pen test report review | Required | Required | Recommended | Not required |
| Financial review | Required | Required | Recommended | Not required |
| On-site assessment | Required | Recommended | Not required | Not required |
| Background checks | Required | Required | Not required | Not required |
| Reference calls | Required | Required | Recommended | Not required |
| Data processing agreement | Required | Required | Conditional | Not required |
| Sub-processor review | Required | Recommended | Not required | Not required |
| Business continuity review | Required | Recommended | Not required | Not required |

### Due Diligence Artifacts
- Completed security questionnaire (SSE No. 17, CAIQ, or custom)
- SOC 2 Type II report (most recent 12 months)
- ISO 27001 certificate (current and valid)
- Penetration test report (within last 12 months)
- Financial statements (last 2 fiscal years)
- Insurance certificates with proof of coverage
- Business continuity and disaster recovery plan
- Data Processing Agreement (DPA)
- Sub-processor list and agreements
- Third-party certifications (PCI DSS, HIPAA, FedRAMP)

## Ongoing Monitoring

### Continuous Monitoring
| Monitoring Type | Frequency | Sources |
|-----------------|-----------|---------|
| Security incident monitoring | Real-time | Vendor security notifications, news feeds |
| Vulnerability disclosure tracking | Weekly | CVE feeds, security advisories |
| Financial health monitoring | Quarterly | Credit reports, financial news |
| Compliance status checks | Quarterly | Certification renewal dates, audit reports |
| Service performance reviews | Monthly | SLA reports, dashboards |
| Risk reassessment | Per tier schedule | Updated questionnaire, evidence review |

### Trigger-Based Reassessment
- Contract renewal or renegotiation
- Material change in vendor's business (acquisition, leadership change)
- Security incident or data breach at vendor
- Change in regulatory requirements
- Introduction of new services or data sharing
- Significant SLA violations
- Negative news or market intelligence

## Exit Strategy

### Exit Strategy Components
| Component | Description | Timeline |
|-----------|-------------|----------|
| Data Retrieval | Process to extract customer data | Before termination |
| Data Deletion | Vendor certifies secure deletion of all customer data | Within 30 days of termination |
| Service Transition | Plan to migrate to alternative provider | 30-90 days |
| Knowledge Transfer | Documentation, training, and support for transition | During notice period |
| Contractual Obligations | Final payments, termination notice, post-termination support | Per contract terms |

### Exit Triggers
- Material breach not cured within notice period
- Vendor insolvency or bankruptcy
- Change of control without consent
- Persistent SLA non-compliance
- Security incident with significant impact
- Regulatory requirement changes vendor cannot meet

### Exit Documentation
- Data extraction and verification checklist
- Migration runbook with rollback procedures
- Transition timeline with milestones
- Knowledge transfer completion criteria
- Final acceptance and closure sign-off
