# TOGAF Architecture Development Method (ADM)

## Introduction

The TOGAF Standard, 10th Edition, defines the Architecture Development Method (ADM) as the core of TOGAF. It provides a proven, repeatable process for developing and managing enterprise architecture. The ADM is a stepwise cyclical method covering architecture development from vision through governance.

## ADM Phases

### Preliminary Phase
- **Objective**: Prepare and initiate the architecture capability
- **Activities**: Define architecture framework, governance bodies, architecture principles; select architecture tools; tailor ADM method
- **Key Deliverables**: Architecture principles statement, architecture framework definition, governance charter, architecture maturity assessment
- **Inputs**: Business strategy, IT strategy, existing frameworks
- **Gate Criteria**: Architecture capability established and approved by board

### Phase A — Architecture Vision
- **Objective**: Define scope, stakeholders, and architecture vision
- **Activities**: Identify stakeholders, define business case, develop architecture vision, obtain approval, identify key risks
- **Key Deliverables**: Architecture vision document, stakeholder map, value chain diagram, solution concept diagram, architecture business case
- **Techniques**: Stakeholder analysis, business scenario planning, capability-based planning
- **Gate Criteria**: Architecture vision approved, business case accepted

### Phase B — Business Architecture
- **Objective**: Develop baseline and target business architecture
- **Activities**: Select reference models and viewpoints, describe baseline business architecture, develop target business architecture, perform gap analysis, define roadmap components
- **Key Deliverables**: Business architecture document, organizational structure diagram, business service/function catalog, process flow diagrams, business capability map, value stream maps
- **Techniques**: Business process modeling (BPMN), capability mapping, value stream analysis
- **Gate Criteria**: Business gap analysis complete, target architecture approved

### Phase C — Information Systems Architecture (Data + Application)
#### Data Architecture Sub-phase
- **Activities**: Select data viewpoints, describe baseline data architecture, develop target data architecture, perform gap analysis
- **Key Deliverables**: Data architecture document, data entity/data component catalog, data entity/data component matrix, data migration plan, data dissemination diagram, data lifecycle diagrams
- **Techniques**: ER modeling, data lineage analysis, logical/physical data modeling

#### Application Architecture Sub-phase
- **Activities**: Select application viewpoints, describe baseline application architecture, develop target application architecture, perform gap analysis
- **Key Deliverables**: Application architecture document, application portfolio catalog, application interaction matrix, application communication diagram, application use-case diagram
- **Techniques**: Application portfolio rationalization, CRUD analysis, dependency analysis
- **Gate Criteria**: Complete gap analysis for both data and application domains

### Phase D — Technology Architecture
- **Objective**: Develop baseline and target technology architecture
- **Activities**: Select technology viewpoints, describe baseline technology architecture, develop target technology architecture, perform gap analysis
- **Key Deliverables**: Technology architecture document, technology standards catalog, technology portfolio catalog, platform decomposition diagram, network and connectivity diagram, environment and location diagram
- **Techniques**: Reference models, standards mapping, technology lifecycle analysis
- **Gate Criteria**: Technology gap analysis complete, target architecture approved

### Phase E — Opportunities and Solutions
- **Objective**: Identify implementation opportunities and solutions
- **Activities**: Consolidate gap analysis results from phases B-D, identify work packages, group into transition architectures, create implementation projects, estimate costs and benefits, prioritize projects
- **Key Deliverables**: Implementation and migration plan, transition architectures, project context diagrams, benefits realization plan, capability assessment
- **Techniques**: Dependency analysis, portfolio prioritization (MoSCoW, cost-benefit), transition roadmap
- **Gate Criteria**: Implementation roadmap approved, business case validated

### Phase F — Migration Planning
- **Objective**: Develop detailed implementation and migration plan
- **Activities**: Finalize architecture roadmap, assign business value to work packages, prioritize migration projects, develop detailed implementation plan, coordinate with change management
- **Key Deliverables**: Architecture roadmap, implementation plan, migration plan, architecture build plan for each project, change management plan
- **Gate Criteria**: Migration plan approved, resource commitments secured

### Phase G — Implementation Governance
- **Objective**: Govern implementation projects
- **Activities**: Define implementation governance, ensure compliance with architecture, conduct architecture reviews, establish conformance requirements, produce architecture contracts
- **Key Deliverables**: Architecture contract, compliance assessment, change request record, architecture board minutes
- **Gate Criteria**: Implementation conforms to architecture, deviations addressed

### Phase H — Architecture Change Management
- **Objective**: Manage changes to architecture post-deployment
- **Activities**: Monitor architecture context, establish change management processes, assess architecture changes, manage architecture versioning, operate architecture governance
- **Key Deliverables**: Architecture change requests, architecture repository updates, architecture performance monitoring reports, architecture maturity re-assessment
- **Gate Criteria**: Architecture change managed, continuous improvement cycle active

## Requirements Management (Continuous)
- **Objective**: Manage architecture requirements throughout the ADM cycle
- **Activities**: Capture requirements at each phase, maintain requirements repository, assess requirements change impact, prioritize requirements, validate requirements traceability
- **Key Deliverables**: Requirements repository, requirements impact assessment, requirements traceability matrix

## Architecture Governance

### Phase Gate Reviews
Each ADM phase requires a formal gate review before proceeding:
- Gate 0: Architecture capability readiness
- Gate 1: Architecture vision approval
- Gate 2: Business architecture approval
- Gate 3: Information systems architecture approval
- Gate 4: Technology architecture approval
- Gate 5: Opportunities and solutions approval
- Gate 6: Migration plan approval
- Gate 7: Implementation governance checkpoint
- Gate 8: Architecture maintenance trigger

### Governance Bodies
- **Architecture Board**: Strategic oversight, standards approval, major exception decisions
- **Architecture Review Board**: Phase gate reviews, compliance assessments, design reviews
- **Architecture Working Group**: Day-to-day architecture development, deliverable creation

## ADM Tailoring

### Common Adaptations
- Organization can skip or combine phases based on maturity
- Phases B-D can be executed iteratively per domain
- Preliminary phase can be revisited when capability matures
- Governance phases can scale with organization size
- Risk management can be integrated within each phase

### Iteration Types
- **Baseline-first iteration**: Establish baseline before target for complex environments
- **Target-first iteration**: Establish target architecture first for greenfield initiatives
- **Domain iteration**: Repeat phases B-D for each architecture domain
- **Architecture definition iteration**: Cycle through A-D for incremental refinement
