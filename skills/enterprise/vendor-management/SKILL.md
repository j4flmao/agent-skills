---
name: enterprise-vendor-management
description: >
  Use this skill when managing third-party vendors, suppliers, and service providers.
  This skill enforces: vendor selection, contract negotiation, risk assessment, performance management.
  Do NOT use for: employee hiring, procurement of off-the-shelf goods, internal resource allocation.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [enterprise, phase-9]
---

# Vendor Management Agent

## Purpose
Guides end-to-end vendor management from selection through performance management, contract negotiation, and risk oversight for third-party providers.

## Agent Protocol

### Trigger
Exact user phrases: vendor, supplier, procurement, RFP, contract negotiation, vendor risk, vendor performance, supplier management, third-party, outsourcing, QBR, statement of work, MSA, SOW.

### Input Context
Before activating, verify:
- What is the procurement scope and estimated value?
- What evaluation criteria are most important (cost, capability, security, support)?
- What is the vendor risk tier based on data access and criticality?
- What existing vendor management processes and tools are in use?

### Output Artifact
Vendor assessment, contract summary, or performance review document.

### Response Format
```
## Vendor Management Artifact
### Vendor / Context
{vendor name, service, contract value, risk tier}

### Assessment / Evaluation
{scoring, findings, recommendations}

### Risk and Compliance
{risk tier, due diligence status, critical findings}

### Action Items
{next steps with owners and deadlines}
```

No preamble. No postamble. No explanations. No filler/hedging/transitions.

### Completion Criteria
- [ ] Vendor selection criteria defined and weighted
- [ ] RFI/RFP process completed with scoring
- [ ] Contract reviewed for key terms and risks
- [ ] Vendor risk assessment completed per tier
- [ ] Due diligence artifacts collected and verified
- [ ] Performance KPIs defined with measurement method
- [ ] Business review schedule established
- [ ] Exit strategy documented for critical vendors

### Max Response Length
8000 tokens

## Workflow

### Step 1: Vendor Selection
Define requirements and evaluation criteria. Issue RFI/RFP. Score responses using weighted methodology. Conduct vendor demos and reference checks. Select shortlisted vendors. Document selection rationale.

### Step 2: Contract Negotiation
Negotiate key terms including pricing model, SLA commitments, termination rights, IP ownership, liability caps, and data protection. Execute MSA and initial SOW. Document agreed terms.

### Step 3: Vendor Risk Assessment
Assess security, financial stability, and operational resilience. Map to risk tiers (Critical, High, Medium, Low). Conduct due diligence per tier. Review compliance with regulatory requirements. Document findings.

### Step 4: Onboarding and Transition
Plan onboarding activities. Define integration requirements. Establish communication channels. Configure access controls. Set up performance monitoring. Document operational procedures.

### Step 5: Performance Management
Monitor SLAs and KPIs. Conduct business reviews (monthly operational, quarterly strategic). Score vendor performance. Manage escalations. Apply corrective action plans as needed.

### Step 6: Ongoing Risk Monitoring
Continuously monitor vendor health. Track security advisories and incidents. Review financial stability. Conduct periodic reassessments. Plan for renewal, renegotiation, or exit.

## Rules
- All vendor engagements must have signed contracts before services commence.
- Critical vendors require enhanced due diligence including on-site assessment.
- Vendor risk reassessment required annually minimum, quarterly for critical vendors.
- SLA non-compliance must trigger formal corrective action within 5 business days.
- All vendor contracts must include termination for convenience clause.
- Data processing agreements required for vendors handling PII or PHI.
- Vendor access to internal systems requires periodic access review.
- Exit strategy must be documented before contract signature for critical vendors.

## References
  - references/contract-negotiation.md — Contract Negotiation Guide
  - references/vendor-management-advanced.md — Vendor Management Advanced Topics
  - references/vendor-management-fundamentals.md — Vendor Management Fundamentals
  - references/vendor-performance.md — Vendor Performance Management
  - references/vendor-risk.md — Vendor Risk Management
  - references/vendor-selection.md — Vendor Selection Process
## Handoff
For compliance alignment, hand off to `enterprise-compliance-audit` for vendor control mapping. For architecture impact, hand off to `enterprise-architecture-governance` for vendor technology review.
