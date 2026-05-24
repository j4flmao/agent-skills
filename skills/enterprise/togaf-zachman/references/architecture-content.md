# Architecture Content Framework

## Introduction

Architecture content is the set of deliverables, artifacts, and building blocks produced during architecture development per ISO 42010. The TOGAF Content Framework provides a structured approach to classifying and organizing these outputs within the architecture repository.

## Deliverables, Artifacts, and Building Blocks

### Deliverables
- **Definition**: Contractually specified output of an ADM phase, reviewed and signed off
- **Characteristics**: Formal, reviewed, versioned, approved by governance body
- **Examples**: Architecture vision document, architecture definition document, implementation and migration plan, architecture contract
- **Lifecycle**: Draft -> Reviewed -> Approved -> Published -> Versioned -> Archived
- **Ownership**: Assigned to architecture lead with approval by architecture board

### Artifacts
- **Definition**: Component of a deliverable representing a single architectural view
- **Characteristics**: Graphical or textual, reuses notations (ArchiMate, BPMN, UML), reusable across deliverables
- **Categories**:
  - **Catalogs**: Lists of building blocks (application portfolio catalog, technology standards catalog)
  - **Matrices**: Relationships between building blocks (application-organization matrix, data-entity matrix)
  - **Diagrams**: Visual representations (capability map, process flow, network topology)
- **Ownership**: Created by domain architects, reviewed by peers

### Building Blocks
- **Definition**: Reusable component that can be combined with others to deliver solutions
- **Architecture Building Blocks (ABBs)**: Captured in architecture repository, defined at logical level, technology-agnostic
- **Solution Building Blocks (SBBs)**: Implementation-specific, procured or built, realize ABBs
- **Characteristics**:
  - Encapsulates functionality and data
  - Has interfaces and contracts
  - Can be composed with other building blocks
  - Conforms to architecture principles
  - Has defined lifecycle and ownership

## Views and Viewpoints (ISO 42010)

### Definitions
- **Viewpoint**: Specification of conventions for constructing and using a view (e.g., stakeholder concerns, modeling language, analysis methods)
- **View**: Representation of a system from the perspective of a viewpoint
- **Concern**: Interest in a system relevant to one or more stakeholders

### Viewpoint Elements
- Viewpoint name and purpose
- Stakeholders addressed
- Concerns covered
- Language and notation used
- Modeling method and analysis technique
- Source references
- Typical artifacts produced

### Common Viewpoints
| Viewpoint | Stakeholder | Concerns | Notation |
|-----------|-------------|----------|----------|
| Business Capability | Executives | What capabilities exist | Capability map |
| Process Flow | Process Owners | How work flows | BPMN |
| Application Interaction | Architects | Application dependencies | ArchiMate |
| Data Entity | Data Stewards | Data relationships | ERD |
| Deployment | Operations | Infrastructure topology | Network diagrams |
| Security | CISO | Threat posture | Threat models |

### Viewpoint Selection Process
1. Identify stakeholders and their concerns
2. Map concerns to available viewpoints
3. Select or create viewpoints that address concerns
4. Define notation and conventions
5. Create views using selected viewpoints
6. Validate views with stakeholders

## Architecture Repository

### Repository Structure
```
Architecture Repository/
  |- Architecture Metamodel/
  |- Architecture Capability/
  |    |- Governance and Processes
  |    |- Architecture Board Charter
  |    |- Architecture Maturity Model
  |- Architecture Landscape/
  |    |- Strategic Landscape
  |    |- Segment Landscape
  |    |- Capability Landscape
  |- Standards Information Base/
  |    |- Technology Standards
  |    |- Architecture Principles
  |    |- Reference Models
  |- Requirements Repository/
  |    |- Architecture Requirements
  |    |- Constraints and Assumptions
  |    |- Requirements Traceability
  |- Architecture Change Log/
  |    |- Change Requests
  |    |- Exceptions and Waivers
  |    |- Deviation Records
  |- Reference Library/
       |- Industry Standards
       |- Vendor Documentation
       |- Best Practices
```

### Repository Management
- Version control for all artifacts
- Access control based on stakeholder roles
- Baseline and target state separation
- Audit trail for changes
- Cross-reference and traceability links
- Periodic review and archiving

## Compliance Reviews

### Review Types
| Type | Scope | When | Depth |
|------|-------|------|-------|
| Project Impact | Single project | Project initiation | Lightweight |
| Architecture Compliance | Delivery project | Design review | Standard |
| Architecture Assessment | Significant change | Architecture change | Full |
| Phase Gate | ADM phase boundary | Phase completion | Based on phase |

### Compliance Review Process
1. **Submission**: Architect submits deliverables and compliance checklist
2. **Triage**: Review board determines review level (lightweight/standard/full)
3. **Review**: Board evaluates against architecture principles, standards, and repository
4. **Decision**: Approve, approve with conditions, return for revision, or reject
5. **Recording**: Decision recorded in architecture change log with rationale
6. **Follow-up**: Conditions tracked to closure; implementation verified

### Compliance Levels
- **Fully Compliant**: Architecture conforms in all respects
- **Compliant with Conditions**: Minor deviations with agreed remediation plan
- **Non-Compliant with Waiver**: Formal exception granted with time limit and mitigation
- **Non-Compliant**: Unauthorized deviation requiring remediation or escalation
