# Third-Party and Supply Chain Continuity

## Overview
Third-party and supply chain risks are among the top continuity threats. A vendor outage can take down Tier-1 services just as surely as a cloud region failure. This reference covers assessing, monitoring, and mitigating vendor and supply chain continuity risks.

## Vendor Criticality Classification

### Classification Criteria
| Tier | Definition | Examples | Continuity Requirements |
|------|------------|----------|------------------------|
| Critical | Outage directly causes Tier-1 service outage | Payment processor, auth provider, DNS | Documented fallback, tested quarterly |
| Important | Outage significantly degrades Tier-1 or causes Tier-2 outage | CDN, monitoring, email delivery | Fallback identified, tested annually |
| Supporting | Outage causes Tier-3 impact | Analytics, project management | Acceptable delay, no formal fallback |
| Commodity | Easily replaceable | Office supplies, non-critical SaaS | No formal plan |

### Assessment Criteria for Each Vendor
- Data access: Does vendor process our customer data? What type?
- Integration depth: Can we switch without re-architecture?
- Switching cost: Time, money, effort to replace
- Vendor health: Financial stability, ownership changes, market position
- Dependency concentration: Multiple critical services on same vendor?
- SLA terms: What guarantees exist? What are the credits/exclusions?

## Vendor Due Diligence

### Pre-Onboarding Assessment
1. Security questionnaire (SOC2 report, ISO cert, pen test results)
2. Financial health review (D&B report, annual report, funding status)
3. Business continuity review (vendor's BCP, DR test results)
4. Data processing agreement (DPA) review
5. Sub-processor list and their assessments
6. Exit plan: data export capabilities, contract termination terms

### Ongoing Monitoring
- Quarterly: Review vendor SOC2/ISO certificates (are they current?)
- Quarterly: Track vendor SLA performance (are they meeting commitments?)
- Monthly: Check vendor security advisories and breach notifications
- Annually: Full vendor risk reassessment
- Event-driven: On vendor acquisition, funding round, leadership change

## Fallback Strategy

### Pre-Integration Requirements
For every Critical vendor, the fallback must be pre-integrated before going to production with the primary. Configuration-as-code means the fallback infrastructure should be deployable in minutes.

### Fallback Patterns
| Pattern | Description | Switchover Time |
|---------|-------------|-----------------|
| Active-Passive | Both vendors configured, primary active | Minutes (config flip) |
| Warm Standby | Fallback deployed but idle | 15-30 min (DNS + config) |
| Cold Standby | Fallback documented but not deployed | Hours-days (provision) |
| Manual Workaround | Business process without vendor | 24h+ |

### Fallback Testing
- Quarterly: Switch to fallback in staging, measure switchover time
- Semi-annual: Full production fallover during low-traffic period
- Document: Actual switchover time, data loss, performance degradation
- Automate: One manual step at a time per quarter

## Supply Chain Attack Defense

### Software Supply Chain
- SBOM (Software Bill of Materials) for all dependencies
- Dependency vulnerability scanning (SCA tools)
- Vendor package signing verification
- Mirrored/internal package registries (no direct internet pulls)
- Build reproducibility verification
- Supply chain Levels for Software Artifacts (SLSA) framework

### Hardware Supply Chain
- Trusted vendor list with verified sourcing
- Component provenance tracking
- Firmware verification before deployment
- Secure receiving and inspection procedures
- Tamper-evident packaging requirements

## Incident Response with Vendors

### Vendor Outage Playbook
1. Verify: Is this a vendor-side outage or our configuration issue?
2. Declare: When SLA breach threshold met or service impact confirmed
3. Communicate: Open vendor support ticket, escalate per severity
4. Fallback: Initiate fallback if outage exceeds RTO
5. Monitor: Track vendor restoration ETA and status
6. Return: Switch back after vendor confirms resolution and stabilization period
7. Review: Post-incident review with vendor, update fallback plan

### Multi-Vendor Dependency Failure
If multiple Critical vendors fail simultaneously (e.g., cloud region outage takes out multiple SaaS vendors), the mitigation must be at the architecture level. Design services to degrade gracefully when dependency clusters fail. The war-room should coordinate across vendors.

## Key Points
- Every Critical vendor needs a fallback that is pre-integrated and tested
- Vendor due diligence must include BC/DR capability assessment
- Supply chain attacks require SBOM, verified builds, and internal registries
- Vendor outage response must be part of the BCP, not a separate process
- Vendor concentration risk (all critical vendors in one cloud) must be assessed
- Contractual SLA credits do not replace operational continuity planning
- Sub-processors of vendors are also in scope for due diligence