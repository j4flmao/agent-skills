---
name: enterprise-vendor-management
description: >
  Use this skill when managing third-party vendors, suppliers, and service providers.
  This skill enforces: vendor selection, contract negotiation, risk assessment, performance management.
  Do NOT use for: employee hiring, procurement of off-the-shelf goods, internal resource allocation.
version: "3.0.0"
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

## Framework/Methodology

### VENDOR-LIFECYCLE Framework
A seven-phase framework for systematic vendor management:

Phase 1 - Identify: Define business requirements, scope of services, budget parameters, and timeline. Determine vendor risk tier based on data access, system criticality, and regulatory impact. Identify potential vendors through market research, referrals, and RFI.

Phase 2 - Evaluate: Issue RFP with clear evaluation criteria. Score responses using weighted methodology. Conduct demos, reference checks, and technical validation. Shortlist and negotiate.

Phase 3 - Negotiate: Define pricing model, SLA commitments, termination rights, IP ownership, liability caps, and data protection terms. Execute MSA and initial SOW.

Phase 4 - Onboard: Plan integration activities. Configure access controls and security requirements. Establish communication channels. Set up performance monitoring. Train internal teams.

Phase 5 - Operate: Monitor SLAs and KPIs daily. Conduct operational reviews monthly, strategic QBRs quarterly. Manage escalations and corrective actions. Maintain relationship.

Phase 6 - Assess: Continuously monitor vendor health. Review financial stability quarterly. Track security posture. Conduct annual formal reassessment. Evaluate competitive alternatives.

Phase 7 - Renew or Exit: Evaluate renewal based on performance, cost, and market conditions. Exercise exit strategy if needed. Execute transition plan for replacement.

### Vendor Risk Tier Classification

Tier 1 - Critical: Vendors with direct access to production systems, customer data, or core business processes. Financial impact if disrupted is severe. Requires enhanced due diligence, quarterly business reviews, on-site assessments, and exit strategy before contract signing.

Tier 2 - High: Vendors with indirect data access or significant operational dependency. Requires standard due diligence, bi-annual business reviews, and documented fallback plan.

Tier 3 - Medium: Vendors providing non-critical services with limited data access. Requires basic due diligence and annual review.

Tier 4 - Low: Off-the-shelf tools and services with no data access. Requires minimum documentation.

### Evaluation Criteria Weighting Model

| Criterion             | Typical Weight | Description                                      |
|------------------------|----------------|--------------------------------------------------|
| Functional Fit        | 25%            | How well does the solution meet requirements?     |
| Total Cost of Ownership| 20%           | License, implementation, integration, training, ops|
| Security & Compliance | 20%            | Certifications, data protection, incident response|
| Technical Architecture| 15%            | Integration capability, scalability, API quality  |
| Vendor Stability      | 10%            | Financial health, market position, track record   |
| Support & Service     | 10%            | SLA terms, support model, professional services   |

Adjust weights based on procurement context: security-heavy for data processors, cost-heavy for commodity services.

## Decision Trees

### Vendor Risk Tier Assignment Decision Tree

1. Does the vendor have direct access to production systems or customer data?
   - YES -> Potential Tier 1 or Tier 2. Go to 2.
   - NO -> Potential Tier 3 or Tier 4. Go to 4.

2. Is the vendor critical to core business operations (outage would cause revenue loss > $100K/hour)?
   - YES -> Tier 1 - Critical. Enhanced due diligence required. Exit strategy before signing.
   - NO -> Go to 3.

3. Does the vendor handle PII, PHI, or other regulated data?
   - YES -> Tier 1 - Critical. DPA required. Regulatory compliance validation.
   - NO -> Tier 2 - High. Standard due diligence. Fallback plan required.

4. Does the vendor have any data access (even indirect or aggregated)?
   - YES -> Tier 3 - Medium. Basic due diligence. Annual review.
   - NO -> Tier 4 - Low. Minimum documentation. No formal review required.

### Make vs Buy Decision Tree

1. Is the capability core to your business differentiation?
   - YES -> Build in-house. Control over roadmap, data, and IP. Higher initial cost but long-term strategic value.
   - NO -> Buy from vendor. Focus internal resources on differentiators. Commodity capabilities belong to vendors.

2. Does a mature commercial solution exist in the market?
   - YES -> Buy. Avoid reinventing the wheel. Evaluate top 3 vendors. Select based on criteria weighting.
   - NO -> Consider build or partner. If build: estimate 2-3x initial vendor cost. If partner: identify ISV for co-development.

3. Is the timeline urgent (< 6 months to production)?
   - YES -> Buy. Building from scratch takes 12-24 months for mature capability. Vendor provides faster time-to-market.
   - NO -> Either path feasible. Evaluate build vs buy TCO over 3-year horizon. Include maintenance, upgrades, and staffing.

4. Can the vendor meet security and compliance requirements?
   - YES -> Buy. Validate certifications (SOC2, ISO 27001). Review DPA. Conduct security assessment.
   - NO -> Build. Vendor cannot meet requirements. Internal development ensures compliance control.

### Contract Negotiation Priority Decision Tree

1. Is the vendor a startup (< 3 years, < $10M revenue)?
   - Highest priority: Financial stability protections. Short initial term. Performance milestones before long-term commitment. IP escrow for source code. Right to audit financial health.
   - Secondary: Flexible termination. Data portability guarantee.

2. Is the vendor handling regulated data (PII, PHI, PCI)?
   - Highest priority: Data protection terms. DPA with specific data handling requirements. Breach notification within 24 hours. Sub-processor approval rights. Data deletion certification.
   - Secondary: Liability cap for data breaches (exclude from standard cap). Audit rights for security controls.

3. Is the vendor a sole-source or critical dependency?
   - Highest priority: SLA commitments with meaningful credits. Termination assistance terms. Transition period with knowledge transfer. Source code escrow (if applicable).
   - Secondary: Price protection (multi-year cap). Right to assign. Non-solicitation of your employees.

4. Is the contract high-value (> $1M annual)?
   - Highest priority: Volume discounts. Price protection duration. Right to audit pricing. Most-favored-customer clause.
   - Secondary: Professional services scope and rates. Overage pricing. Support tier and response times.

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

Requirements definition: separate must-have from nice-to-have. Must-have items are non-negotiable and any vendor lacking them is disqualified. Nice-to-have items add scoring points.

RFI vs RFP: RFI is used early-stage to understand the market and narrow the field. RFP is a formal solicitation with detailed requirements, pricing, and contractual terms. Use RFI first for unfamiliar markets.

Reference checks: ask for 3 customer references in similar industry and scale. Prepare specific questions about uptime, support quality, contract flexibility, and migration difficulty. Call references, do not just email.

### Step 2: Contract Negotiation
Negotiate key terms including pricing model, SLA commitments, termination rights, IP ownership, liability caps, and data protection. Execute MSA and initial SOW. Document agreed terms.

Key negotiation points:
- Pricing: volume discounts, annual vs monthly commitment, price protection duration, CPI adjustment caps
- SLA: uptime commitments, credit structure, measurement methodology, exclusion windows (scheduled maintenance)
- Termination: for convenience (notice period), for cause (cure period), termination assistance (transition support)
- IP: ownership of deliverables, pre-existing IP, improvements, license grants
- Liability: cap (typically 12 months fees), exclusions (IP infringement, data breach, confidentiality breach)
- Data protection: DPA, data processing locations, sub-processor list, breach notification timeline

Negotiation strategy: anchor with your ideal position, prepare walk-away criteria, prioritize 3-5 must-have terms, concede on lower-priority items. Document all agreed terms in the contract.

### Step 3: Vendor Risk Assessment
Assess security, financial stability, and operational resilience. Map to risk tiers (Critical, High, Medium, Low). Conduct due diligence per tier. Review compliance with regulatory requirements. Document findings.

Security due diligence: review SOC2 report, ISO 27001 certificate, penetration test results, security questionnaire responses, data processing agreement, incident response process, sub-processor list.

Financial due diligence: review financial statements (if private, request summary), funding history, revenue trend, customer concentration, runway (if startup), ownership structure.

Operational due diligence: support model, escalation path, SLAs on configuration, geographic redundancy, business continuity plan, key personnel, employee turnover rate.

### Step 4: Onboarding and Transition
Plan onboarding activities. Define integration requirements. Establish communication channels. Configure access controls. Set up performance monitoring. Document operational procedures.

Onboarding checklist:
- [ ] Contract fully executed and filed
- [ ] Security requirements validated
- [ ] Access controls configured and tested
- [ ] Integration completed and verified
- [ ] Monitoring dashboards operational
- [ ] SLA measurement configured
- [ ] Escalation contacts distributed
- [ ] Internal team trained on new vendor tool/service
- [ ] Operational runbooks documented
- [ ] Data migration (if applicable) validated

### Step 5: Performance Management
Monitor SLAs and KPIs. Conduct business reviews (monthly operational, quarterly strategic). Score vendor performance. Manage escalations. Apply corrective action plans as needed.

Performance metrics:
- Uptime / Availability vs SLA target
- Incident response time (P1-P4)
- Resolution time (MTTR)
- Support ticket volume and trends
- Feature delivery / roadmap adherence
- Security incident count
- Cost vs budget

Quarterly Business Review (QBR) agenda:
1. Performance scorecard review (10 min)
2. Incident review and root cause analysis (15 min)
3. Roadmap alignment and new requirements (15 min)
4. Contract changes and renewals (10 min)
5. Relationship health and feedback (10 min)

### Step 6: Ongoing Risk Monitoring
Continuously monitor vendor health. Track security advisories and incidents. Review financial stability. Conduct periodic reassessments. Plan for renewal, renegotiation, or exit.

Monitoring sources:
- Vendor security blogs and status pages
- Industry news (financial trouble, leadership changes, lawsuits)
- Third-party risk monitoring platforms
- Internal incident data (vendor-related outages)
- Renewal timing (start renewal process 6 months before end of term)

## Governance Framework

### Vendor Governance Board Structure
- Procurement Lead: Owns vendor selection process. Manages RFP issuance. Oversees contract execution.
- Security Officer: Validates vendor security posture. Reviews due diligence artifacts. Approves data access.
- Legal Counsel: Reviews contract terms. Negotiates liability, IP, and data protection clauses.
- Business Owner: Defines requirements. Validates functional fit. Monitors day-to-day performance.
- Finance Representative: Validates pricing and TCO. Approves budget. Tracks total vendor spend.

### Vendor Review Cadence

| Review Type | Frequency | Participants | Focus |
|---|---|---|---|
| Operational Review | Monthly | Vendor PM + Internal Owner | SLA metrics, incidents, support tickets |
| Business Review | Quarterly | Vendor Account Team + Internal Stakeholders | Performance scorecard, roadmap, relationship health |
| Risk Review | Bi-Annual | Security + Vendor CISO | Security posture, penetration test results, compliance changes |
| Strategic Review | Annual | Executive Sponsors | Contract renewal, market alternatives, strategic alignment |
| Competitive Review | Annual | Procurement + Business Owner | Market evaluation, pricing benchmark, alternative vendors |

### Vendor Consolidation Criteria
Consolidation triggers: redundant tools with overlapping capabilities. Total vendor count exceeds management capacity. Spend fragmentation across multiple small vendors. Lack of standardization creating integration complexity.

Consolidation process:
1. Inventory all vendors by category and spend
2. Identify overlapping capabilities
3. Score each vendor on performance, cost, strategic value
4. Select primary vendor per category
5. Plan migration from secondary vendors
6. Execute phase-out with sunset timelines
7. Track savings realization

## Common Pitfalls

Pitfall 1: Selecting on cost alone. The cheapest vendor often costs more in the long run through hidden fees, poor support, and migration pain. Total cost of ownership includes implementation, integration, training, and eventual exit.

Pitfall 2: Signing without legal review of liability terms. Standard vendor contracts limit liability to the contract value (12 months fees). This may be insufficient for critical vendors where outage cost exceeds contract value. Negotiate higher caps for critical vendors.

Pitfall 3: No exit strategy. Once a vendor is embedded in your operations, replacing them is expensive and slow. Document exit strategy before signing. Maintain data portability. Avoid proprietary formats and deep integration lock-in.

Pitfall 4: Skipping reference calls. Vendor demos and sales materials show the product at its best. Reference calls reveal the reality: support quality, hidden costs, contract negotiation difficulty, migration challenges.

Pitfall 5: No SLA monitoring. An SLA without monitoring is a placebo. Configure automated monitoring of SLA metrics from day one. Alert on approaching SLA breach. Collect evidence for credit claims.

Pitfall 6: Under-resourcing relationship management. Assigning an owner who has no bandwidth to attend QBRs or review performance. Vendor relationships require ongoing attention, not just annual renewal review.

Pitfall 7: Not negotiating data portability terms. When the relationship ends, you need your data back in a usable format. Negotiate data export assistance and timeline into the contract.

Pitfall 8: Vendor lock-in through proprietary APIs or data formats. The vendor becomes irreplaceable because migration cost exceeds value. Mitigation: require standard APIs, data export in open formats, and documented migration assistance terms.

Pitfall 9: Ignoring sub-processor risk. The vendor may subcontract your work to third parties without your knowledge. Require sub-processor list and approval rights in contract. Monitor sub-processor changes quarterly.

## Best Practices

Practice 1: Maintain a vendor scorecard. Rate each vendor quarterly on performance, cost, support, and risk. Flag declining trends. The scorecard informs renewal and consolidation decisions.

Practice 2: Build redundancy for critical vendors. For Tier-1 vendors, maintain pre-integrated fallback capabilities. This is not double-cost if the fallback is at reduced capacity (maintenance mode, manual process).

Practice 3: Conduct annual competitive reviews. Even with a happy vendor, evaluate the market annually. Competitive quotes validate pricing. New vendors may offer better technology. This strengthens negotiating position.

Practice 4: Standardize onboarding with a playbook. Create a repeatable vendor onboarding process with security review, integration pattern, monitoring setup, and documentation requirements. Apply to all vendors regardless of size.

Practice 5: Centralize vendor data. A vendor management system or spreadsheet with all contracts, contacts, renewal dates, and key terms. Assign owners. Set renewal reminders 90 days in advance.

Practice 6: Include vendor performance in internal SLAs. When a vendor outage causes internal service degradation, the internal team should not bear the SLA impact alone. Map vendor SLAs to internal service commitments.

Practice 7: Conduct post-exit vendor reviews. After every vendor transition, document lessons learned: what went well, what went wrong, what would improve future transitions. Build findings into onboarding playbook updates.

Practice 8: Align vendor incentives with business outcomes. Structure contracts so vendor success metrics align with business success. Example: link support tier pricing to resolution time, not ticket volume.

## Templates & Tools

### Vendor Evaluation Scorecard
```
Vendor: {name}
Evaluation Date: {date}
Evaluator: {name}

| Criterion             | Weight | Score (1-5) | Weighted Score |
|-----------------------|--------|-------------|----------------|
| Functional Fit        | 25%    | {score}     | {result}       |
| Total Cost of Ownership| 20%   | {score}     | {result}       |
| Security & Compliance | 20%    | {score}     | {result}       |
| Technical Architecture| 15%    | {score}     | {result}       |
| Vendor Stability      | 10%    | {score}     | {result}       |
| Support & Service     | 10%    | {score}     | {result}       |

Total Weighted Score: {score}/5.0
Recommendation: {Select / Shortlist / Reject}

Notes: {key findings, concerns, differentiators}
```

### Contract Summary Template
```
Contract ID: {id}
Vendor: {name}
Service: {description}
Contract Value: ${amount} (annual)
Term: {start} to {end} ({duration})
Renewal: {auto/manual}, notice period {days}

Key Terms:
- Pricing: {model, discounts, price protection}
- SLA: {uptime target, credit structure}
- Termination: {for cause, for convenience, cure period}
- Liability Cap: {amount or formula}
- Data Protection: {DPA status, sub-processors}
- IP: {ownership, license grants}

Risk Tier: {Critical/High/Medium/Low}
Exit Strategy: {documented location, portability terms}
```

### QBR Scorecard Template
```
### QBR Scorecard: {Vendor Name}
Period: {quarter} {year}
Review Date: {date}

| Category | Rating (1-5) | Trend | Notes |
|----------|-------------|-------|-------|
| SLA Attainment | {score} | {up/down/flat} | {notes} |
| Support Quality | {score} | {up/down/flat} | {notes} |
| Incident Response | {score} | {up/down/flat} | {notes} |
| Feature Delivery | {score} | {up/down/flat} | {notes} |
| Cost/Value | {score} | {up/down/flat} | {notes} |
| Relationship | {score} | {up/down/flat} | {notes} |

Overall Score: {score}/5.0
Overall Trend: {improving/stable/declining}
Verdict: {renew/renegotiate/replace}
```

### Tools Reference
- Coupa / SAP Ariba for procurement and vendor management
- OneTrust / Vendorpedia for vendor risk management
- BetterCloud / Torii for SaaS management
- Jira Service Management for vendor ticket tracking
- Google Sheets / Airtable for vendor registry
- DocuSign for contract execution
- SurveyMonkey / Typeform for reference check surveys

## Case Studies

### Case Study 1: Critical Vendor Failure Recovery
A SaaS company depended on a single CDN vendor for all customer traffic. When the CDN suffered a 4-hour global outage, revenue loss exceeded $2M. Post-incident analysis revealed the contract had no SLA credits and no documented fallback. The company immediately implemented a multi-CDN strategy with automatic failover. All Tier-1 vendors now have documented fallback plans tested quarterly.

### Case Study 2: M&A Vendor Portfolio Consolidation
Following an acquisition, a company found itself managing 347 unique vendors across the combined entity. Through a vendor consolidation program, they reduced to 183 vendors, saving $4.2M annually through volume discounts, eliminating redundant tools, and sunsetting unused contracts. Key success factor: an executive sponsor with authority to enforce consolidation.

### Case Study 3: Startup Vendor Negotiation
A Series A startup with limited leverage negotiated favorable terms with a critical infrastructure vendor by offering a case study, product feedback commitment, and multi-year commitment. The contract included 40% discount off list price, 90-day termination for convenience, and dedicated support. Lessons: leverage what you have (marketing value, product feedback, reference-ability) even if you lack spend volume.

### Case Study 4: Vendor Security Incident Response
A SaaS company discovered that one of their Tier-2 vendors (analytics provider) had suffered a data breach exposing customer behavioral data. The vendor took 72 hours to notify, exceeding the contract's 24-hour notification SLA. The company escalated to executive level, invoked the breach notification clause, and initiated the exit strategy they had documented at contract signing. Replacement vendor was onboarded within 30 days. Lessons: enforce SLA notifications, maintain current exit strategies, and test incident response with vendors.

## Rules
- All vendor engagements must have signed contracts before services commence.
- Critical vendors require enhanced due diligence including on-site assessment.
- Vendor risk reassessment required annually minimum, quarterly for critical vendors.
- SLA non-compliance must trigger formal corrective action within 5 business days.
- All vendor contracts must include termination for convenience clause.
- Data processing agreements required for vendors handling PII or PHI.
- Vendor access to internal systems requires periodic access review.
- Exit strategy must be documented before contract signature for critical vendors.
- Vendor evaluation must use weighted scoring methodology documented before RFP issuance.
- Reference checks completed and documented for all shortlisted vendors.
- Monthly SLA monitoring automated for all Tier-1 and Tier-2 vendors.
- Quarterly business reviews conducted with all Tier-1 vendors.
- Competitive market review conducted annually for top-20 vendors by spend.
- Vendor onboarding follows standardized playbook with security review gate.
- Contract renewal review begins minimum 90 days before end of term.
- Vendor-related security incidents reported under same SLA as internal incidents.
- Sub-processor changes require notification and approval within 30 days.
- Post-exit review conducted for all vendor transitions over $50K annual value.

## References
  - references/contract-negotiation.md -- Contract Negotiation Guide
  - references/vendor-management-advanced.md -- Vendor Management Advanced Topics
  - references/vendor-management-fundamentals.md -- Vendor Management Fundamentals
  - references/vendor-performance.md -- Vendor Performance Management
  - references/vendor-risk.md -- Vendor Risk Management
  - references/vendor-selection.md -- Vendor Selection Process
  - references/vendor-selection-evaluation.md -- Vendor Selection and Evaluation
  - references/vendor-performance-monitoring.md -- Vendor Performance Monitoring
## Handoff
For compliance alignment, hand off to `enterprise-compliance-audit` for vendor control mapping. For architecture impact, hand off to `enterprise-architecture-governance` for vendor technology review.
