# Service Level Management

## Introduction

Service Level Management (SLM) negotiates, agrees upon, and manages service level targets between service providers and customers. SLM ensures services are delivered to agreed quality levels through continuous monitoring, reporting, and improvement.

## Service Level Agreements (SLAs)

### SLA Types
| Type | Scope | Example |
|------|-------|---------|
| Service-Based | Covers one service for all customers | Email service SLA for all departments |
| Customer-Based | Covers all services for one customer | Enterprise customer SLA for all IT services |
| Multi-Level | Hierarchical SLAs (Corporate, Customer, Service) | Enterprise SLA structure with three tiers |

### SLA Components
- **Service Description**: Scope, exclusions, service hours
- **Service Targets**: Measurable KPIs with thresholds
- **Roles and Responsibilities**: Provider and customer obligations
- **Measurement and Reporting**: How targets are measured and reported
- **Review and Revision**: SLA review cadence and amendment process
- **Escalation and Dispute**: Process for unresolved issues
- **Service Credits**: Penalties for missed targets
- **Signatures**: Authorized representatives from both parties

### Common SLA Metrics

| Metric | Target Example | Measurement Method | Reporting Frequency |
|--------|---------------|--------------------|--------------------|
| Availability | 99.9% uptime (monthly) | Uptime monitoring | Monthly |
| Incident Response Time | <= 15 min for P1 | Ticket timestamp | Monthly |
| Incident Resolution Time | <= 4 hours for P1 | Ticket timestamp | Monthly |
| First Call Resolution | >= 75% | Service desk system | Monthly |
| Service Request Fulfillment | <= 2 business days | Request system | Monthly |
| Mean Time to Respond | <= 30 minutes | Monitoring system | Weekly |

### SLA Negotiation Process
1. **Requirement Gathering**: Business needs, constraints, budget
2. **Baseline Measurement**: Current service performance data
3. **Draft SLA**: Proposed targets based on baselines and requirements
4. **Review and Negotiate**: Customer and provider review targets
5. **Cost Impact Assessment**: Resource implications and cost adjustments
6. **Finalize and Sign**: Agreed SLA with authorized signatures
7. **Communication**: Publish to all stakeholders

### SLA Targets -- SMART Criteria
- **Specific**: Clearly defined and unambiguous
- **Measurable**: Quantifiable with established metrics
- **Achievable**: Realistic given current capabilities
- **Relevant**: Aligned to business outcomes
- **Time-bound**: Defined measurement period

## Operational Level Agreements (OLAs)

### Definition
Internal agreements between IT support groups defining how they work together to support the SLA.

### OLA Components
- Service provided between internal teams
- Roles and responsibilities of each team
- Handoff procedures and response times
- Escalation paths and timeframes
- Communication protocols
- Performance targets and KPIs

### OLA Examples
| Internal Groups | OLA Content |
|----------------|-------------|
| Service Desk -> Network Team | Network incident handoff within 30 minutes |
| Database Team -> Application Team | Database change notification 24 hours prior |
| Security Team -> All Teams | Security incident notification within 15 minutes |

## Underpinning Contracts (UCs)

### Definition
Contracts with external suppliers supporting the delivery of IT services.

### UC Components
- Service description and scope
- Performance targets aligned to SLAs
- Financial terms and penalties
- Reporting requirements
- Dispute resolution process
- Termination conditions
- Data protection and confidentiality

## Service Catalog

### Catalog Structure
```
Service Catalog
|- Business Services (Customer View)
|   |- Email and Collaboration
|   |- Enterprise Resource Planning
|   |- Customer Relationship Management
|   |- Business Intelligence
|- Technical Services (Internal View)
    |- Infrastructure Services
    |- Application Services
    |- Security Services
    |- Network Services
```

### Service Catalog Contents
- Service name and description
- Service owner and support team
- Service hours and availability targets
- Request process and fulfillment times
- Pricing and chargeback model (if applicable)
- Supporting SLAs and OLAs references

## Service Reporting

### Reporting Framework
| Report Type | Audience | Frequency | Content |
|-------------|----------|-----------|---------|
| Executive Summary | Leadership | Monthly, Quarterly | Service performance trends, major incidents, improvement progress |
| Operational Reports | Service Owners, IT Management | Weekly, Monthly | SLA compliance, incident trends, capacity utilization |
| Customer Reports | Business Customers | Monthly | SLA achievement, service availability, request fulfillment |
| Supplier Reports | Supplier Managers | Monthly | Supplier performance against UC targets |

### Report Content Standards
- **Period**: Reporting period with clear start and end dates
- **Scope**: Services and systems included in report
- **Performance Summary**: Executive overview of performance
- **SLA Achievement**: Performance against each SLA target
- **Exceptions**: SLA breaches with explanations and remediation
- **Trends**: Performance trends over prior periods
- **Incidents**: Incident volumes, categories, and resolution times
- **Capacity**: Resource utilization and capacity forecasts
- **Improvement Actions**: CSI actions and their status

## Continual Service Improvement Register

### CSI Register Structure
| Item ID | Description | Priority | Owner | Target Date | Status | Benefit |
|---------|-------------|----------|-------|-------------|--------|---------|
| CSI-001 | Automate incident categorization | H | Incident Manager | Q2 2026 | In Progress | Reduce manual effort |
| CSI-002 | Improve monitoring coverage for payment service | H | Monitoring Lead | Q1 2026 | Completed | Reduce P1 detection time |
| CSI-003 | Implement self-service password reset | M | Service Desk Lead | Q3 2026 | Proposed | Reduce service desk calls |

### CSI Process
1. **Identify**: Capture improvement opportunities from all sources (incidents, problems, reviews, feedback)
2. **Prioritize**: Rank by business benefit, effort, and strategic alignment
3. **Plan**: Define scope, resources, timeline, and success criteria
4. **Implement**: Execute improvement with change management integration
5. **Review**: Measure outcome against success criteria
6. **Standardize**: If successful, incorporate into standard operations

### Sources of Improvement Opportunities
- Incident trend analysis
- Problem management outcomes (root causes)
- Post-implementation reviews
- Customer satisfaction surveys
- Service performance reports
- Audit findings and compliance gaps
- Employee suggestions
- Industry benchmarks and best practices
