# ITIL Service Lifecycle

## Introduction

ITIL 4 defines the service lifecycle as a comprehensive framework for managing IT services from strategy through continuous improvement. The lifecycle consists of five stages, each with specific processes, roles, and deliverables.

## Service Strategy

### Objective
Define the strategy for service management, ensuring services deliver value to customers and stakeholders.

### Key Processes
| Process | Description | Key Deliverables |
|---------|-------------|-----------------|
| Service Portfolio Management | Manage the portfolio of services throughout lifecycle | Service portfolio, service pipeline, service catalog |
| Financial Management | Budget, accounting, and charging for IT services | Budget plans, cost models, chargeback reports |
| Demand Management | Understand and influence customer demand | Demand patterns, business activity patterns |
| Business Relationship Management | Maintain strong customer relationships | Customer agreements, satisfaction surveys, business requirements |

### Service Portfolio
```
Service Pipeline -> Service Catalog -> Retired Services
  (Proposed)        (Live/Operational)    (Decommissioned)
```

### Service Provider Types
- **Type I**: Internal service provider embedded in a business unit
- **Type II**: Shared services provider serving multiple business units
- **Type III**: External service provider offering services to external customers

## Service Design

### Objective
Design new and changed services for transition into the live environment.

### Key Processes
| Process | Description | Key Deliverables |
|---------|-------------|-----------------|
| Design Coordination | Coordinate all service design activities | Service design package (SDP) |
| Service Catalog Management | Maintain and control service catalog | Service catalog, service definitions |
| Service Level Management | Negotiate and manage SLAs | SLAs, OLAs, UCs, service reports |
| Availability Management | Ensure services meet availability targets | Availability plan, availability reports |
| Capacity Management | Ensure capacity meets demand | Capacity plan, capacity reports |
| IT Service Continuity Management | Manage risks to service continuity | Continuity plans, BCPs, DR plans |
| Information Security Management | Ensure information security | Security policies, risk assessments |
| Supplier Management | Manage supplier relationships and contracts | Supplier contracts, supplier assessments |

### Service Design Package (SDP)
A SDP contains:
- Service requirements and design specifications
- Architecture and technology decisions
- Process documentation and procedures
- Roles and responsibilities
- Service acceptance criteria
- Transition plan and schedule
- Operational readiness requirements

## Service Transition

### Objective
Transition new and changed services into the live environment with minimal risk.

### Key Processes
| Process | Description | Key Deliverables |
|---------|-------------|-----------------|
| Transition Planning and Support | Plan and coordinate service transitions | Transition plan, transition checklist |
| Change Management | Control and manage changes | RFCs, change records, CAB minutes |
| Service Asset and Configuration Management | Manage assets and configuration items | CMDB, configuration baselines |
| Release and Deployment Management | Manage releases and deployments | Release policy, release plans |
| Service Validation and Testing | Validate service meets requirements | Test plans, test results, acceptance |
| Change Evaluation | Evaluate significant changes | Evaluation reports, impact assessments |
| Knowledge Management | Maintain knowledge and information | SKMS, knowledge articles, known error database |

### Service Knowledge Management System (SKMS)
```
SKMS Components:
  +-----------------------------+
  | Knowledge Portal             |
  +-----------------------------+
  | CMS / CMDB                   |
  +-----------------------------+
  | Known Error Database (KEDB)  |
  +-----------------------------+
  | Service Portfolio            |
  +-----------------------------+
  | Process Documentation        |
  +-----------------------------+
  | Learning Histories           |
  +-----------------------------+
```

## Service Operation

### Objective
Deliver and manage services at agreed levels to business users and customers.

### Key Processes
| Process | Description | Key Deliverables |
|---------|-------------|-----------------|
| Incident Management | Restore normal service operation as quickly as possible | Incident records, major incident reports |
| Problem Management | Diagnose root causes of incidents | Problem records, known errors, RCA reports |
| Request Fulfillment | Handle service requests | Request records, service request catalogs |
| Event Management | Monitor and respond to events | Event logs, event thresholds, escalation procedures |
| Access Management | Grant authorized access to services | Access rights, access reviews, audit logs |

### Service Desk Functions
- **Service Desk**: Single point of contact for users
  - Incident logging and initial support
  - Request fulfillment coordination
  - Communication and status updates
  - Escalation management
- **Technical Management**: Technical infrastructure and support
- **Application Management**: Application maintenance and support
- **IT Operations Management**: Day-to-day IT operations execution

## Continual Service Improvement (CSI)

### Objective
Continuously improve IT services and service management processes.

### CSI Approach -- The 7-Step Improvement Process
1. **Define what to measure**: Identify business goals and improvement objectives
2. **Define what can be measured**: Determine measurable indicators aligned to goals
3. **Gather the data**: Collect baseline and current data
4. **Process the data**: Transform data into meaningful information
5. **Analyze the data**: Identify trends, gaps, and improvement opportunities
6. **Present and use the information**: Communicate findings to stakeholders
7. **Implement corrective action**: Plan and execute improvement initiatives

### CSI Register
| Item | Description | Priority | Owner | Target Date | Status |
|------|-------------|----------|-------|-------------|--------|
| CSI-001 | Improve first-call resolution rate | High | Service Desk Manager | Q2 | In Progress |
| CSI-002 | Reduce average incident resolution time | Medium | Incident Manager | Q3 | Identified |
| CSI-003 | Automate password reset process | Low | Operations Manager | Q4 | Proposed |

### CSI Metrics
- **Critical Success Factors (CSFs)**: Key areas for CSI focus
- **Key Performance Indicators (KPIs)**: Measurable targets for CSFs
- **Baselines**: Current performance levels
- **Targets**: Desired performance levels with timelines

### Deming Cycle (Plan-Do-Check-Act)
- **Plan**: Define improvement objectives and plan
- **Do**: Execute the improvement plan
- **Check**: Measure and evaluate results
- **Act**: Standardize successful improvements or iterate

## Process Integration Across Lifecycle

### Key Integration Points
- Service strategy defines what services to offer
- Service design creates the blueprint
- Service transition moves designs into production
- Service operation delivers day-to-day service
- CSI feeds improvements back into all stages
- Each stage provides inputs and receives outputs from adjacent stages
- Knowledge and information flows across all stages through the SKMS
