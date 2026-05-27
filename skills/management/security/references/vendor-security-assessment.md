# Vendor Security Assessment

## Vendor Risk Management Framework

A structured vendor risk management framework enables organizations to identify, assess, monitor, and remediate risks associated with third-party vendors, suppliers, and partners. The framework follows a continuous lifecycle approach.

### Lifecycle Phases

```
IDENTIFY → CLASSIFY → ASSESS → MONITOR → REMEDIATE → TERMINATE
    ↑                                                    |
    └──────────────── CONTINUOUS MONITORING ──────────────┘
```

### Phase 1: Identify

Identify all vendors, sub-vendors, and fourth-party relationships. Maintain a comprehensive vendor register with ownership, services provided, data access, and contract status.

```yaml
# Vendor Identification Template
vendor_register:
  - vendor_id: V-2026-001
    name: "Acme Cloud Services"
    service: "Cloud Infrastructure (IaaS)"
    data_access:
      - level: "confidential"
      - types: ["customer_pii", "financial_records"]
    contract_value: "$1,200,000/year"
    contract_start: "2025-01-01"
    contract_end: "2028-12-31"
    relationship_type: "critical"
    business_owner: "Alice Johnson"
    security_contact: "security@acmecloud.com"
    sub_vendors:
      - name: "DataCorp LLC"
        service: "Database hosting"
        critical: true
```

### Phase 2: Assess

Evaluate vendor security posture through questionnaires, document reviews, interviews, technical testing, and certifications.

### Phase 3: Monitor

Continuously monitor vendor security posture using security ratings, vulnerability feeds, breach notifications, and periodic reassessments.

### Phase 4: Remediate

Track and manage remediation of identified findings. Escalate unresolved issues through defined processes.

### Phase 5: Terminate

Securely offboard vendors with data return/destruction, access revocation, and contractual closure.

## Vendor Classification

### Risk Tier Classification

| Tier | Category | Definition | Examples | Assessment Frequency |
|------|----------|------------|----------|---------------------|
| **T1** | Critical | Direct access to sensitive data, core business operations, material impact | Cloud infrastructure, payment processors, identity providers | Annual + continuous monitoring |
| **T2** | High | Access to internal data, significant integration, moderate impact | CRM, HR systems, marketing automation, IT support | Annual + quarterly review |
| **T3** | Medium | Limited data access, indirect business impact | Office supplies, consulting services, facilities | Biennial assessment |
| **T4** | Low | No data access, minimal business impact | Janitorial services, catering, non-IT vendors | Self-assessment only |

### Data Access Levels

| Level | Description | Examples | Controls Required |
|-------|-------------|----------|-------------------|
| **Level 4** | Full data access, including PII/PHI | Cloud hosting, SaaS data processors | SOC 2 Type II, encryption, audit logging, breach insurance |
| **Level 3** | Access to aggregated/non-PII data | Analytics platforms, BI tools | Encryption, access controls, incident response |
| **Level 2** | No direct data access but significant integration | SSO providers, API gateways | Security assessment, penetration testing |
| **Level 1** | No data access, no integration | Office supplies, facilities | Minimal assessment |

### Regulatory Impact Classification

| Regulation | Triggers for Vendor Assessment | Criticality |
|------------|-------------------------------|-------------|
| **GDPR** | Vendor processes EU personal data | High - fines up to 4% revenue |
| **HIPAA** | Vendor creates/receives/transmits PHI | High - criminal penalties |
| **PCI DSS** | Vendor stores/processes cardholder data | High - fines, loss of processing |
| **SOC 2** | Vendor handles customer data for service orgs | Medium - contractual |
| **FedRAMP** | Vendor provides cloud services to US government | High - mandatory |
| **CCPA/CPRA** | Vendor processes CA resident data | Medium - statutory damages |
| **SOX** | Vendor supports financial reporting systems | High - SOX controls required |

## Assessment Methodology

### Assessment Types

| Type | Description | Depth | Duration |
|------|-------------|-------|----------|
| **Self-Assessment Questionnaire** | Vendor completes standardized security questionnaire | Basic | 1-2 weeks |
| **Document Review** | Review security policies, procedures, and certifications | Medium | 2-4 weeks |
| **Remote Assessment** | Video interviews, screen sharing, document review | Medium | 2-3 weeks |
| **On-Site Assessment** | Physical visit to vendor facilities | High | 3-5 days |
| **Penetration Test** | Technical security testing of vendor systems | Technical | 2-4 weeks |
| **Architecture Review** | Review of vendor system architecture and data flows | Technical | 1-2 weeks |
| **Code Review** | Review of vendor source code or application security | Technical | 2-4 weeks |

### Assessment Process Flow

```yaml
assessment_process:
  initiation:
    - reason: "New vendor onboarding"
    - reason: "Annual reassessment"
    - reason: "Security incident"
    - reason: "Material change in service"

  planning:
    - define_scope: ["data access level", "system criticality", "regulatory requirements"]
    - select_methodology: ["questionnaire", "document review", "on-site", "penetration test"]
    - assign_assessment_team:
        - lead_assessor: "Senior Security Engineer"
        - technical_assessor: "As needed"
        - compliance_assessor: "As needed"

  execution:
    - pre_assessment: ["review existing documentation", "analyze third-party intelligence"]
    - assessment_activities: ["questionnaire review", "interviews", "evidence collection"]
    - findings_documentation: ["risk scoring", "evidence mapping", "remediation recommendations"]

  reporting:
    - draft_report: "Share with vendor for fact-checking"
    - final_report: "Issue with risk rating and remediation plan"
    - stakeholder_briefing: "Present findings to business owner"
```

### Evidence Collection

```yaml
evidence_types:
  policies_and_procedures:
    - "Information security policy"
    - "Access control policy"
    - "Incident response plan"
    - "Business continuity / disaster recovery plan"
    - "Data protection policy"
    - "Vendor management policy"

  technical_evidence:
    - "Network architecture diagrams"
    - "Data flow diagrams"
    - "Penetration test reports (within 12 months)"
    - "Vulnerability scan results"
    - "Configuration standards"
    - "Change management records"

  compliance_evidence:
    - "SOC 2 Type II report"
    - "ISO 27001 certificate"
    - "PCI DSS Attestation of Compliance"
    - "HIPAA risk assessment"
    - "FedRAMP authorization letter"
    - "GDPR DPA (Data Processing Agreement)"

  operational_evidence:
    - "Employee security training records"
    - "Background check policy"
    - "Incident response exercise results"
    - "Business continuity test results"
    - "Security OKR/KPI reports"
```

## Standard Questionnaires

### Shared Assessments SIG (Standardized Information Gathering)

The SIG questionnaire is the industry-standard vendor assessment questionnaire developed by the Shared Assessments Program.

```yaml
sig_domains:
  - domain: "Information Security Policy"
    questions:
      - "Does the organization have a formal, documented information security policy?"
      - "How frequently is the policy reviewed and updated?"
      - "Is the policy communicated to all employees and contractors?"

  - domain: "Access Control"
    questions:
      - "What authentication methods are used for user access?"
      - "Is MFA required for privileged and remote access?"
      - "How often are access rights reviewed and certified?"
      - "What is the process for revoking access upon termination?"

  - domain: "Data Protection"
    questions:
      - "What encryption standards are used for data at rest and in transit?"
      - "How is data classified and handled?"
      - "What data backup and retention policies are in place?"
      - "Is data segregation implemented for multi-tenant environments?"

  - domain: "Network Security"
    questions:
      - "What firewall, IDS/IPS, and network segmentation controls exist?"
      - "Are vulnerability scans conducted regularly?"
      - "What is the patch management process and SLA?"

  - domain: "Incident Response"
    questions:
      - "Does the organization have an incident response plan?"
      - "What is the incident detection and notification process?"
      - "What is the SLA for security incident notification to customers?"
      - "Are incident response exercises conducted regularly?"

  - domain: "Business Continuity and Disaster Recovery"
    questions:
      - "Does the organization have a BCP and DRP?"
      - "What are the RPO and RTO targets?"
      - "How frequently are BC/DR tests conducted?"
      - "Are backups tested for restoration?"

  - domain: "Physical Security"
    questions:
      - "What physical access controls protect data centers?"
      - "Are visitor logs and escorts required?"
      - "Is video surveillance in place for sensitive areas?"

  - domain: "Compliance and Audit"
    questions:
      - "What regulatory frameworks apply to the organization?"
      - "When was the most recent external audit?"
      - "What are the findings and remediation status?"
      - "Is the right to audit contractually reserved for customers?"
```

### CSA CAIQ (Consensus Assessments Initiative Questionnaire)

The Cloud Security Alliance CAIQ is a standardized questionnaire for cloud service providers.

```yaml
caiq_controls:
  - domain: "Application & Interface Security"
    controls:
      - "AIS-01: Application security testing (SAST, DAST)"
      - "AIS-02: Secure software development lifecycle"
      - "AIS-03: Input validation and output encoding"
      - "AIS-04: API security and authentication"

  - domain: "Audit Assurance & Compliance"
    controls:
      - "AAC-01: Independent audits (SOC 2, ISO 27001)"
      - "AAC-02: Regulatory compliance mapping"
      - "AAC-03: Right to audit clause"
      - "AAC-04: Audit log retention and protection"

  - domain: "Business Continuity & Operational Resilience"
    controls:
      - "BCR-01: Business continuity plan"
      - "BCR-02: Disaster recovery plan and testing"
      - "BCR-03: Backup and restore procedures"
      - "BCR-04: RPO and RTO definitions"

  - domain: "Data Security & Information Lifecycle Management"
    controls:
      - "DSI-01: Data classification scheme"
      - "DSI-02: Encryption key management"
      - "DSI-03: Data retention and disposal"
      - "DSI-04: Data portability and return"

  - domain: "Identity & Access Management"
    controls:
      - "IAM-01: User provisioning and deprovisioning"
      - "IAM-02: Privileged access management"
      - "IAM-03: MFA for administrative access"
      - "IAM-04: Access review frequency"

  - domain: "Infrastructure & Virtualization Security"
    controls:
      - "IVS-01: Hypervisor security hardening"
      - "IVS-02: Network segmentation and micro-segmentation"
      - "IVS-03: Container security"

  - domain: "Interoperability & Portability"
    controls:
      - "IPY-01: API standards and versioning"
      - "IPY-02: Data export formats and capabilities"

  - domain: "Mobile Security"
    controls:
      - "MOS-01: Mobile device management"
      - "MOS-02: Mobile application security testing"

  - domain: "Security Incident Management, E-Discovery & Cloud Forensics"
    controls:
      - "SEF-01: Incident response plan for cloud environments"
      - "SEF-02: Forensic data collection in cloud"
      - "SEF-03: E-discovery support"

  - domain: "Supply Chain Management, Transparency & Accountability"
    controls:
      - "STA-01: Vendor risk management program"
      - "STA-02: Sub-processor management"
      - "STA-03: Software supply chain security"
      - "STA-04: SBOM maintenance"
```

### VSA (Vendor Security Alliance) Questionnaire

```yaml
vsa_questions:
  - category: "Security Organization"
    questions:
      - "Who is the head of information security and what are their credentials?"
      - "How is the security team structured and resourced?"
      - "Is there a dedicated incident response team?"

  - category: "Asset Management"
    questions:
      - "How does the organization track hardware and software assets?"
      - "Is asset inventory automated?"
      - "How are unauthorized devices handled?"

  - category: "Vulnerability Management"
    questions:
      - "What is the frequency of internal and external vulnerability scans?"
      - "What is the remediation SLA for critical vulnerabilities?"
      - "Are penetration tests conducted annually?"

  - category: "Logging and Monitoring"
    questions:
      - "What logs are collected and retained?"
      - "What is the log retention period?"
      - "Is a SIEM or log analysis solution in place?"
      - "Are alerts reviewed 24/7?"

  - category: "Application Security"
    questions:
      - "Is a secure SDLC methodology followed?"
      - "Are code reviews required for all changes?"
      - "Is automated security testing integrated into CI/CD?"
      - "Do you maintain a bug bounty program?"

  - category: "Employee Security"
    questions:
      - "What background checks are performed on employees?"
      - "Is security awareness training provided annually?"
      - "Are acceptable use policies enforced?"
      - "Are employees required to sign NDAs?"

  - category: "Third-Party and Supply Chain"
    questions:
      - "How do you assess your own vendors and sub-processors?"
      - "Is there a vendor risk management program?"
      - "Are sub-processors disclosed to customers?"
```

## Security Domains

### Access Control

```yaml
access_control_requirements:
  authentication:
    password_policy:
      minimum_length: 12
      complexity: "uppercase, lowercase, numbers, special characters"
      hashing: "bcrypt / argon2"
      rotation: "Not required (NIST SP 800-63B)"
    mfa:
      requirement: "Required for all privileged and remote access"
      acceptable_methods: ["TOTP", "FIDO2/WebAuthn", "Push notification", "Hardware token"]
    sso:
      protocols: ["SAML 2.0", "OIDC", "OAuth 2.0"]
      requirement: "Centralized identity management preferred"

  authorization:
    model: "RBAC with attribute-based policy enforcement"
    principles: ["least privilege", "need to know", "separation of duties"]
    privileged_access:
      - "Just-in-time (JIT) elevation"
      - "Session recording for critical systems"
      - "Approval workflow for privilege escalation"
    access_reviews:
      frequency: "Quarterly for privileged, annually for standard"
      certification: "Manager must certify access appropriateness"

  session_management:
    idle_timeout: "15 minutes for privileged, 30 minutes for standard"
    concurrent_sessions: "Maximum 3"
    session_termination: "On account disable or role change"
```

### Data Protection

```yaml
data_protection_requirements:
  data_classification:
    levels:
      - name: "Public"
        examples: ["Marketing materials", "Published research"]
        controls: ["No restrictions"]
      - name: "Internal"
        examples: ["Source code", "Internal documentation"]
        controls: ["Access control", "TLS in transit"]
      - name: "Confidential"
        examples: ["Customer data", "Financial records", "Trade secrets"]
        controls: ["AES-256 encryption at rest", "TLS 1.2+", "Access logging"]
      - name: "Restricted"
        examples: ["PII", "PHI", "Credentials", "Payment card data"]
        controls: ["AES-256 + field-level encryption", "mTLS", "Immutable audit logs", "Dedicated HSMs"]

  encryption:
    at_rest:
      standard: "AES-256"
      key_management: "Automated key rotation, HSM for critical keys"
      scope: "All data volumes, databases, backups"
    in_transit:
      standard: "TLS 1.2 minimum, TLS 1.3 preferred"
      certificate_management: "Automated certificate lifecycle, short-lived certs"
      scope: "All network communications including internal"

  data_residency:
    requirements:
      - "Data must remain in approved geographic regions"
      - "Data export mechanisms for cross-border transfers"
      - "Data classification for international transfers"
      - "Standard Contractual Clauses (SCC) for EU data"
```

### Network Security

```yaml
network_security_requirements:
  segmentation:
    - "Production, staging, and development networks separated"
    - "DMZ for public-facing services"
    - "Micro-segmentation for zero-trust"
    - "No direct internet access for database servers"

  perimeter_security:
    - "Next-generation firewall with IPS"
    - "Web application firewall (WAF)"
    - "DDoS protection"
    - "DNS security filtering"

  monitoring:
    - "Network intrusion detection / prevention"
    - "Network traffic analysis"
    - "DNS query monitoring"
    - "NetFlow/IPFIX analysis"
    - "TLS/SSL inspection"

  remote_access:
    - "VPN with MFA for all remote access"
    - "Zero Trust Network Access (ZTNA) preferred"
    - "Jump hosts / bastion hosts for production access"
    - "Session recording for privileged remote sessions"
```

### Incident Response

```yaml
incident_response_requirements:
  plan:
    existence: "Formal, documented incident response plan required"
    alignment: "NIST SP 800-61 or equivalent framework"
    testing: "Tabletop exercises at least annually"
    updates: "Reviewed and updated quarterly"

  notification:
    sla:
      critical: "Within 1 hour of incident confirmation"
      high: "Within 4 hours"
      medium: "Within 24 hours"
      low: "Within 72 hours"
    method:
      primary: "Phone call to security contact"
      secondary: "Email with encrypted details"
      confirmation: "Require acknowledgment of receipt"

  investigation:
    - "Provide access to logs, telemetry, and forensic data"
    - "Maintain chain of custody for evidence"
    - "Support joint investigation with customer security team"
    - "Preserve all relevant data for legal and compliance purposes"

  post_incident:
    - "Root cause analysis within 7 days"
    - "Written incident report within 14 days"
    - "Preventive action plan with timeline"
    - "Customer debrief within 30 days"
```

### Business Continuity and Disaster Recovery

```yaml
bc_dr_requirements:
  uptime_slas:
    - "99.99% availability for critical services"
    - "99.9% for standard services"
    - "Defined maintenance windows"

  rpo_rto:
    critical_services:
      rpo: "< 15 minutes"
      rto: "< 1 hour"
    standard_services:
      rpo: "< 4 hours"
      rto: "< 8 hours"

  backup:
    - "Daily backups with 30-day retention minimum"
    - "Weekly backups with 12-month retention"
    - "Monthly backups with 7-year retention (compliance)"
    - "Backup stored in separate geographic region"
    - "Immutable backups to prevent ransomware damage"
    - "Quarterly backup restoration testing"

  disaster_recovery:
    - "Multi-region / multi-AZ deployment"
    - "Automated failover capabilities"
    - "Annual full DR test"
    - "Quarterly component failover tests"
    - "DR runbooks maintained and tested"
```

## Compliance Assessment

### SOC 2 Assessment

```yaml
soc_2_assessment:
  trust_service_criteria:
    - "Security: Protection against unauthorized access"
    - "Availability: System availability commitments met"
    - "Processing Integrity: Complete, accurate, timely processing"
    - "Confidentiality: Confidential information protected"
    - "Privacy: Personal information collected, used, retained, disclosed"

  review_period:
    type_i: "Point-in-time (auditor opinion on design)"
    type_ii: "Period of time (auditor opinion on design and operating effectiveness)"
    coverage: "Minimum 6 months for Type II"

  key_controls_to_review:
    - "Logical and physical access controls"
    - "System operations and monitoring"
    - "Change management processes"
    - "Risk mitigation activities"
    - "Vendor and sub-processor management"
    - "Incident response procedures"

  evaluation_criteria:
    - "Were there any exceptions noted?"
    - "Were exceptions pervasive or isolated?"
    - "Did the vendor remediate identified gaps?"
    - "Were complementary user entity controls (CUEC) reasonable?"
```

### ISO 27001 Assessment

```yaml
iso_27001_assessment:
  certificate_verification:
    - "Verify certificate is current and not expired"
    - "Verify scope includes relevant services"
    - "Verify certification body is accredited (UKAS, ANAB, etc.)"
    - "Review surveillance audit findings"

  annex_a_controls_review:
    a5: "Information security policies"
    a6: "Organization of information security"
    a7: "Human resource security"
    a8: "Asset management"
    a9: "Access control"
    a10: "Cryptography"
    a11: "Physical and environmental security"
    a12: "Operations security"
    a13: "Communications security"
    a14: "System acquisition, development and maintenance"
    a15: "Supplier relationships"
    a16: "Information security incident management"
    a17: "Information security aspects of business continuity"
    a18: "Compliance"

  findings_review:
    non_conformities:
      major: "Significant control failure requiring immediate remediation"
      minor: "Partial control failure requiring planned remediation"
    observations: "Opportunities for improvement"
    ofis: "Opportunities for improvement identified by auditor"
```

### PCI DSS Assessment

```yaml
pci_dss_assessment:
  applicable_if:
    - "Vendor stores, processes, or transmits cardholder data"
    - "Vendor could impact security of cardholder data environment"
    - "Vendor provides services that could bypass PCI controls"

  requirements_mapping:
    req_3: "Protect stored cardholder data"
    req_4: "Encrypt transmission of cardholder data"
    req_7: "Restrict access to cardholder data by need to know"
    req_8: "Identify and authenticate access to system components"
    req_10: "Track and monitor all access to cardholder data"
    req_11: "Regularly test security systems and processes"
    req_12: "Maintain information security policy"

  validation:
    level_1: "Annual Report on Compliance (ROC) by QSA"
    level_2: "Annual Self-Assessment Questionnaire (SAQ)"
    level_3: "Annual SAQ"
    level_4: "Annual SAQ"

  saq_types:
    - "SAQ A: Card-not-present merchants"
    - "SAQ B: Imprint or standalone terminals"
    - "SAQ C: Internet-based payment systems"
    - "SAQ D: All other merchants"
```

### HIPAA Assessment

```yaml
hipaa_assessment:
  applicable_if:
    - "Vendor creates, receives, maintains, or transmits PHI"
    - "Vendor provides services involving PHI on behalf of covered entity"

  required_documentation:
    - "Business Associate Agreement (BAA)"
    - "HIPAA security risk assessment"
    - "Security policies and procedures"
    - "Incident response procedure"
    - "Breach notification procedure"
    - "Contingency plan"
    - "Sanction policy"

  safeguards_review:
    administrative:
      - "Security management process"
      - "Assigned security responsibility"
      - "Workforce security and training"
      - "Information access management"
      - "Contingency plan"
      - "Evaluation"
    physical:
      - "Facility access controls"
      - "Workstation security"
      - "Device and media controls"
    technical:
      - "Access control (unique user ID, emergency access, auto logoff)"
      - "Audit controls"
      - "Integrity controls"
      - "Person or entity authentication"
      - "Transmission security"
```

### FedRAMP Assessment

```yaml
fedramp_assessment:
  impact_levels:
    - "Low: Limited impact on agency operations"
    - "Moderate: Significant impact on agency operations"
    - "High: Severe impact on agency operations"

  authorization_paths:
    - "JAB P-ATO: Joint Authorization Board Provisional ATO"
    - "Agency ATO: Individual agency authorization"
    - "FedRAMP Connect: Prioritized JAB authorizations"

  key_documents:
    - "System Security Plan (SSP)"
    - "FedRAMP Security Assessment Report (SAR)"
    - "FedRAMP Plan of Action and Milestones (POA&M)"
    - "Continuous Monitoring Plan"

  continuous_monitoring:
    - "Monthly vulnerability scanning"
    - "Quarterly summary reports"
    - "Annual security assessment"
    - "Significant change reporting"
```

## Technical Assessment

### Penetration Testing

```yaml
penetration_testing_requirements:
  frequency:
    external: "Annual minimum"
    internal: "Annual minimum"
    application: "Annual minimum, plus after major changes"
    api: "Annual minimum"

  methodology:
    - "OWASP Testing Guide"
    - "OSSTMM"
    - "NIST SP 800-115"
    - "PTES"

  scope:
    - "All external-facing IP addresses and domains"
    - "Web applications and APIs"
    - "Mobile applications"
    - "Internal network segmentation testing"
    - "Social engineering testing (if applicable)"

  requirements:
    - "Independent third-party testing firm"
    - "Full-disclosure report with findings categorized by severity"
    - "Remediation retesting within 30 days"
    - "CVSS 3.1 scoring for all findings"
    - "No critical or high findings open after remediation"

  reporting:
    format: "Standard penetration test report template"
    sections:
      - "Executive summary"
      - "Scope and methodology"
      - "Finding severity summary"
      - "Detailed findings with evidence"
      - "Remediation recommendations"
      - "Retest results"
```

### Vulnerability Scanning

```yaml
vulnerability_scanning_requirements:
  frequency:
    external: "Weekly"
    internal: "Weekly"
    authenticated: "Monthly"
    container: "Every build"
    web_application: "Weekly + on every change"

  tools:
    - "Tenable Nessus / Tenable.io"
    - "Qualys VMDR"
    - "Rapid7 InsightVM"
    - "OpenVAS / Greenbone"

  scope:
    - "All internet-facing assets"
    - "All internal production assets"
    - "Development and staging environments"
    - "Cloud infrastructure (AWS, Azure, GCP)"
    - "Containers and container registries"
    - "Serverless functions"

  sla:
    critical: "24 hours to verify, 7 days to remediate"
    high: "7 days to remediate"
    medium: "30 days to remediate"
    low: "90 days to remediate"
```

### Architecture Review

```yaml
architecture_review_checklist:
  data_flows:
    - "Data flow diagrams provided and current"
    - "All data flows identified and documented"
    - "Encryption points clearly marked"
    - "Trust boundaries identified"

  network_architecture:
    - "Network segmentation clearly defined"
    - "Firewall rules documented and minimal"
    - "Load balancers, WAF, CDN configurations"
    - "Cloud network architecture (VPC, subnets, security groups)"

  authentication_and_authorization:
    - "Identity provider architecture"
    - "Token and session management"
    - "Role hierarchy and permission model"
    - "API authentication and authorization"

  deployment_architecture:
    - "CI/CD pipeline security"
    - "Containerization and orchestration"
    - "Infrastructure as Code security"
    - "Secret management architecture"

  monitoring_and_logging:
    - "Log aggregation and storage architecture"
    - "SIEM and alerting pipeline"
    - "Incident response integration"
    - "Audit trail completeness"

  encryption_architecture:
    - "Key management system architecture"
    - "Certificate lifecycle management"
    - "Database encryption architecture"
    - "Backup encryption architecture"
```

### Code Review

```yaml
code_review_requirements:
  scope:
    - "Authentication and authorization modules"
    - "Data encryption and handling"
    - "API endpoints and input validation"
    - "Third-party library usage"
    - "Configuration and secrets management"

  automated_scanning:
    - "SAST integrated into CI/CD pipeline"
    - "Dependency scanning with SCA tools"
    - "Secret scanning in repositories"
    - "Container image scanning"
    - "IaC scanning"

  manual_review_focus:
    - "Business logic flaws"
    - "Authentication bypass"
    - "Authorization weaknesses"
    - "Insecure direct object references"
    - "Cryptographic implementation issues"
    - "Session management flaws"

  tools:
    sast: ["Semgrep", "SonarQube", "Checkmarx", "Veracode", "CodeQL"]
    sca: ["Snyk", "Dependabot", "Black Duck", "JFrog Xray"]
    secrets: ["GitLeaks", "TruffleHog", "GitGuardian"]
    container: ["Trivy", "Grype", "Clair", "Anchore"]
    iac: ["Checkov", "tfsec", "KICS", "Bridgecrew"]
```

## Contractual Security Requirements

### SLA Definitions

```yaml
service_level_agreements:
  availability:
    critical: "99.99% uptime"
    standard: "99.9% uptime"
    measurement: "Monthly rolling average"
    exclusion: "Planned maintenance with 7-day notice"

  incident_response:
    critical:
      initial_response: "15 minutes"
      status_update: "Every 60 minutes"
      resolution: "4 hours"
    high:
      initial_response: "1 hour"
      status_update: "Every 8 hours"
      resolution: "24 hours"
    medium:
      initial_response: "4 hours"
      status_update: "Daily"
      resolution: "5 business days"

  security_patching:
    critical: "7 days"
    high: "14 days"
    medium: "30 days"
    low: "90 days"

  credits:
    critical_sla_breach: "10% monthly credit per 30 minutes"
    standard_sla_breach: "5% monthly credit per hour"
    cap: "100% of monthly service fee"
```

### Right to Audit

```yaml
right_to_audit_clause:
  standard_language: >
    Customer or its designated representative (including external auditors)
    may audit Vendor's facilities, systems, books, and records related to
    the Services upon 30 days written notice, not more than once annually,
    during normal business hours. Vendor shall cooperate with such audits.

  key_terms:
    notice_period: "30 days written notice"
    frequency: "Annually (more if incident occurs)"
    scope: "Facilities, systems, books, records related to services"
    cost: "Customer bears audit cost; Vendor bears if findings show material non-compliance"
    reports: "Audit results shared with Vendor for remediation"
    confidential: "Audit findings treated as confidential"
```

### Breach Notification

```yaml
breach_notification_clause:
  trigger: >
    Vendor shall notify Customer immediately upon discovery or reasonable
    suspicion of any security breach involving Customer Data or Vendor
    systems processing Customer Data.

  notification_timeline:
    confirmed_breach: "Within 24 hours"
    suspected_breach: "Within 48 hours (with updates as investigation proceeds)"

  notification_content:
    - "Description of the incident"
    - "Date and time of discovery"
    - "Type of data potentially affected"
    - "Current response status"
    - "Contact information for incident response lead"

  ongoing_updates:
    - "Status updates every 24 hours during active response"
    - "Root cause analysis within 7 business days"
    - "Final incident report within 14 business days"

  indemnification:
    - "Vendor indemnifies Customer for breach-related damages"
    - "Coverage for notification costs, credit monitoring, regulatory fines"
    - "Minimum insurance coverage: $5M cyber liability"
```

### Liability and Indemnification

```yaml
liability_terms:
  data_breach_liability: "Vendor liable for breaches caused by Vendor negligence"
  indemnification: "Vendor indemnifies customer for third-party claims arising from breach"
  cyber_insurance:
    minimum_coverage: "$5,000,000"
    requirements:
      - "Cyber liability insurance"
      - "Errors and omissions insurance"
      - "Commercial general liability"
      - "Additional insured status for customer"
    notice: "30 days notice of material change or cancellation"
    primary: "Vendor insurance primary over customer insurance"

  limitation_of_liability:
    standard: "Fees paid over 12 months"
    data_breach: "Excluded from limitation caps"
    ip_infringement: "Excluded from limitation caps"
    gross_negligence: "Excluded from limitation caps"
```

## Data Protection Assessment

### Data Residency Requirements

```python
# Data Residency Compliance Checker
class DataResidencyChecker:
    def __init__(self, regulations):
        self.regulations = regulations

    def check_vendor_compliance(self, vendor_data, customer_regions):
        findings = []

        for region in customer_regions:
            if region not in vendor_data.get("data_centers", []):
                findings.append({
                    "severity": "HIGH",
                    "region": region,
                    "issue": f"Vendor has no data center in {region}",
                    "mitigation": "Verify data processing agreements and cross-border transfer mechanisms"
                })

        # Check for adequate data transfer mechanisms
        if any(self._is_restricted_region(r) for r in customer_regions):
            mechanisms = vendor_data.get("data_transfer_mechanisms", [])
            required_mechanisms = ["SCC", "BCR", "adequacy_decision"]

            for required in required_mechanisms:
                if required not in mechanisms:
                    findings.append({
                        "severity": "MEDIUM",
                        "issue": f"Missing data transfer mechanism: {required}",
                        "mitigation": f"Vendor must implement {required} for cross-border data transfers"
                    })

                    # Check for sub-processors in restricted regions
        for sub in vendor_data.get("sub_processors", []):
            if self._is_restricted_region(sub.get("region", "")):
                if "DPA" not in sub.get("agreements", []):
                    findings.append({
                        "severity": "HIGH",
                        "sub_processor": sub["name"],
                        "issue": f"Sub-processor in restricted region without DPA",
                        "mitigation": "Require sub-processor DPA with appropriate safeguards"
                    })

        return findings

    def _is_restricted_region(self, region):
        restricted = ["EU", "EEA", "UK", "California", "China", "Russia"]
        return any(r.lower() in region.lower() for r in restricted)
```

### Data Classification Handling

```yaml
data_classification_assessment:
  vendor_capabilities:
    classification_scheme:
      required: true
      assessment: "Does vendor have a formal data classification policy?"
    handling_procedures:
      - "Labeling and marking of classified data"
      - "Handling requirements per classification level"
      - "Storage and transmission controls per level"
      - "Destruction procedures per level"

  customer_data_protection:
    segregation:
      - "Logical separation from other customer data"
      - "Encryption with customer-specific keys"
      - "Separate database instances or schemas"
    access_controls:
      - "Customer data access limited to authorized personnel"
      - "Just-in-time access for customer data"
      - "Access logged and auditable"

  encryption_standards:
    at_rest:
      algorithm: "AES-256"
      key_length: "256-bit minimum"
      key_management: "Automated KMS or HSM"
      scope: "All storage systems, databases, backups"
    in_transit:
      protocol: "TLS 1.2 minimum, TLS 1.3 preferred"
      certificate: "Valid, non-expired, trusted CA"
      internal: "All internal service-to-service communication encrypted"
    field_level:
      sensitive_fields: "Credit cards, SSN, credentials"
      technique: "Application-level encryption independent of transport"
```

### Data Retention and Disposal

```yaml
data_retirement_assessment:
  retention_policies:
    - "Formal data retention schedule by data type"
    - "Legal hold / litigation hold capabilities"
    - "Automated deletion after retention period"
    - "Audit trail of data deletion"

  data_disposal:
    digital:
      - "Secure erasure (DoD 5220.22-M or NIST SP 800-88)"
      - "Cryptographic erasure for encrypted data"
      - "Degaussing for magnetic media"
      - "Physical destruction (shredding, pulverizing)"
    certification:
      - "Certificate of destruction provided"
      - "Witnessed destruction available"
      - "Chain of custody for disposal process"

  data_return:
    - "Customer data returned in standard format (CSV, JSON, XML)"
    - "Data export within 30 days of request"
    - "Full data extraction capability"
    - "Verification of data completeness"
```

## Cloud Vendor Assessment

### AWS Shared Responsibility Assessment

```yaml
aws_shared_responsibility:
  aws_responsible:
    hardware: ["Compute", "Storage", "Networking"]
    infrastructure: ["Regions", "Availability Zones", "Edge Locations"]
    managed_services: ["RDS", "S3", "DynamoDB", "Lambda", "ECS/Fargate"]

  customer_responsible:
    data: ["Classification", "Encryption", "Access management"]
    platform: ["OS patching", "Firewall configuration", "Network ACLs"]
    iam: ["Users", "Groups", "Roles", "Policies", "MFA"]
    logging: ["CloudTrail", "VPC Flow Logs", "S3 access logs"]
    security: ["WAF rules", "Security group rules", "Encryption keys"]

  assessment_focus:
    iam_practices:
      - "Are IAM roles used instead of long-lived access keys?"
      - "Is MFA enforced for all users?"
      - "Are IAM policies scoped to least privilege?"
      - "Are service control policies (SCPs) in use?"
    data_protection:
      - "Is S3 default encryption enabled?"
      - "Are S3 buckets blocked from public access?"
      - "Is EBS encryption enabled by default?"
      - "Is RDS encryption enabled?"
      - "Are KMS keys rotated annually?"
    logging:
      - "Is CloudTrail enabled in all regions?"
      - "Are CloudTrail logs delivered to S3 with access logging?"
      - "Is VPC Flow Logs enabled?"
      - "Are GuardDuty and Security Hub enabled?"
    network:
      - "Are VPCs segmented by environment?"
      - "Are security groups scoped to specific CIDRs?"
      - "Are public subnets minimized?"
      - "Is AWS WAF in use for web applications?"
```

### Azure Shared Responsibility Assessment

```yaml
azure_shared_responsibility:
  microsoft_responsible:
    infrastructure: ["Physical datacenters", "Network infrastructure", "Hypervisor"]
    saas: ["Office 365", "Dynamics 365", "Azure AD"]
    paas: ["Azure SQL", "App Service", "Functions"]

  customer_responsible:
    iaas: ["OS hardening", "VM security", "Network configuration"]
    data: ["Classification", "Encryption keys", "Access management"]
    identity: ["Azure AD configuration", "Conditional access", "MFA"]
    application: ["Code security", "Dependency management"]
    monitoring: ["Azure Monitor", "Microsoft Defender for Cloud"]

  assessment_focus:
    identity:
      - "Is Azure AD P2 in use for identity protection?"
      - "Are conditional access policies configured?"
      - "Is MFA enforced for all administrators?"
      - "Are legacy authentication protocols blocked?"
    monitoring:
      - "Is Microsoft Defender for Cloud enabled?"
      - "Are diagnostic settings configured for all resources?"
      - "Is Sentinel deployed for SIEM?"
      - "Are activity logs retained appropriately?"
    network:
      - "Are NSGs configured with least privilege?"
      - "Is Azure Firewall or NVA in use?"
      - "Are private endpoints used for PaaS services?"
      - "Is DDoS Protection Standard enabled?"
    data:
      - "Is Azure Storage encryption with customer-managed keys?"
      - "Is Azure SQL transparent data encryption enabled?"
      - "Are Azure Key Vault soft-delete and purge protection enabled?"
```

### GCP Shared Responsibility Assessment

```yaml
gcp_shared_responsibility:
  google_responsible:
    infrastructure: ["Physical security", "Network", "Hypervisor"]
    managed_services: ["Cloud Storage", "BigQuery", "Cloud SQL", "Cloud Functions"]

  customer_responsible:
    projects: ["Organization policies", "IAM configuration"]
    data: ["Classification", "Encryption keys (CMEK)", "Access management"]
    network: ["VPC configuration", "Firewall rules", "Cloud NAT"]
    application: ["GKE security", "Cloud Run security", "App Engine security"]
    logging: ["Cloud Audit Logs", "Cloud Logging", "Security Command Center"]

  assessment_focus:
    organization:
      - "Are organization policies enforced?"
      - "Are IAM roles granted at organization level?"
      - "Is VPC Service Controls enabled?"
    data:
      - "Is CMEK used for data encryption?"
      - "Are Cloud Storage buckets with uniform bucket-level access?"
      - "Is Cloud DLP configured for sensitive data discovery?"
    security:
      - "Is Security Command Center Premium enabled?"
      - "Are vulnerability scans configured?"
      - "Is Web Security Scanner enabled for App Engine?"
      - "Is Cloud Armor configured for WAF?"
    network:
      - "Is VPC network segmented by environment?"
      - "Are firewall rules scoped to least privilege?"
      - "Are Cloud NAT and Private Google Access configured?"
      - "Are Private Service Connect endpoints used?"
```

### Cloud-Specific Certifications

| Certification | AWS | Azure | GCP |
|---------------|-----|-------|-----|
| SOC 1/2/3 | Available | Available | Available |
| ISO 27001 | Certified | Certified | Certified |
| ISO 27017 | Certified | Certified | Certified |
| ISO 27018 | Certified | Certified | Certified |
| PCI DSS Level 1 | Compliant | Compliant | Compliant |
| FedRAMP | JAB P-ATO | JAB P-ATO | JAB P-ATO |
| HIPAA | BAA available | BAA available | BAA available |
| GDPR | DPA available | DPA available | DPA available |
| IRAP | Protected | Protected | Protected |
| SOC for Cybersecurity | Available | Available | Available |

## Supply Chain Security

### Sub-Vendor Management

```yaml
sub_vendor_management:
  disclosure:
    - "Vendor must disclose all sub-processors and subcontractors"
    - "Sub-vendors processing customer data must be identified by name and service"
    - "Notification of sub-vendor changes required 30 days in advance"
    - "Customer right to object to new sub-vendors"

  assessment_requirements:
    - "Vendor is responsible for sub-vendor security posture"
    - "Sub-vendors subject to equivalent security requirements"
    - "Vendor must flow down contractual security requirements to sub-vendors"
    - "Right to audit extends to sub-vendors upon request"

  termination:
    - "Right to terminate if sub-vendor fails security requirements"
    - "Vendor must replace non-compliant sub-vendors"
    - "Data migration support for sub-vendor changes"
```

### Fourth-Party Risk

Fourth-party risk refers to risks introduced by a vendor's own vendors (sub-vendors). These relationships create transitive risk that must be managed.

```
YOUR COMPANY → Vendor (first party) → Sub-Vendor (second party) → Sub-Sub-Vendor (third party)
    ↑                                                                     ↓
    └───────────────── Fourth-party risk evaluation ──────────────────────┘
```

**Key Fourth-Party Risk Considerations:**

- Vendor's vendor management program maturity
- Concentration risk (multiple vendors using same sub-vendor)
- Cascading failures in supply chain
- Data flow through multiple levels of subcontracting
- Contractual flow-down of security requirements
- Audit rights at each supply chain level

### Software Supply Chain Security (SBOM)

```yaml
sbom_requirements:
  format: "SPDX 2.2+ or CycloneDX 1.4+"
  content:
    - "All direct and transitive dependencies"
    - "Version information for each component"
    - "Licenses for each component"
    - "Known vulnerabilities (CVEs)"
    - "Component supplier/author information"

  frequency:
    initial: "At contract signing"
    updates: "With every software release"
    vulnerability: "Within 24 hours of new CVE disclosure"

  verification:
    - "SBOM authenticity verified via cryptographic signature"
    - "Dependencies checked against known vulnerability databases"
    - "Open source components scanned for license compliance"
    - "Container base images verified for provenance"
```

## Continuous Monitoring

### Periodic Reassessment Schedule

| Tier | Full Assessment | Document Review | Security Rating | Vulnerability Feed | Business Review |
|------|----------------|-----------------|-----------------|-------------------|----------------|
| **T1 (Critical)** | Annual | Quarterly | Continuous | Continuous | Quarterly |
| **T2 (High)** | Annual | Semi-Annual | Monthly | Continuous | Semi-Annual |
| **T3 (Medium)** | Biennial | Annual | Quarterly | Monthly | Annual |
| **T4 (Low)** | Self-assessment | N/A | N/A | N/A | N/A |

### Vulnerability Feed Monitoring

```python
# Vendor Vulnerability Monitoring
import requests
import json
from datetime import datetime, timedelta

class VendorVulnerabilityMonitor:
    def __init__(self, config):
        self.nvd_api = config.get("nvd_api_key")
        self.cve_feeds = config.get("cve_feeds", [])
        self.vendor_software = config.get("vendor_software", {})

    def check_vendor_vulnerabilities(self, vendor_id):
        vendor_software = self.vendor_software.get(vendor_id, [])
        findings = []

        for software in vendor_software:
            name = software["name"]
            version = software["version"]

            # Query NVD for CVEs
            cves = self._query_nvd(name, version)
            for cve in cves:
                findings.append({
                    "vendor_id": vendor_id,
                    "cve_id": cve["id"],
                    "severity": cve["severity"],
                    "cvss_score": cve["cvss_score"],
                    "description": cve["description"],
                    "affected_software": name,
                    "affected_version": version,
                    "published": cve["published"],
                    "remediation": cve.get("remediation", "Unknown")
                })

        return sorted(findings, key=lambda x: x.get("cvss_score", 0), reverse=True)

    def _query_nvd(self, software_name, version):
        url = f"https://services.nvd.nist.gov/rest/json/cves/2.0"
        params = {
            "keywordSearch": f"{software_name} {version}",
            "resultsPerPage": 50
        }
        headers = {}
        if self.nvd_api:
            headers["apiKey"] = self.nvd_api

        try:
            response = requests.get(url, params=params, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()

            cves = []
            for vuln in data.get("vulnerabilities", []):
                cve = vuln["cve"]
                metrics = cve.get("metrics", {})
                cvss_v31 = metrics.get("cvssMetricV31", [{}])[0].get("cvssData", {})
                cvss_v30 = metrics.get("cvssMetricV30", [{}])[0].get("cvssData", {})

                cvss = cvss_v31 or cvss_v30
                cves.append({
                    "id": cve["id"],
                    "severity": cvss.get("baseSeverity", "UNKNOWN"),
                    "cvss_score": cvss.get("baseScore", 0),
                    "description": cve.get("descriptions", [{}])[0].get("value", ""),
                    "published": cve.get("published", ""),
                    "remediation": self._get_recommendation(cve)
                })

            return cves
        except Exception as e:
            return [{"error": str(e)}]

    def _get_recommendation(self, cve):
        # Extract remediation from references
        for ref in cve.get("references", []):
            tags = ref.get("tags", [])
            if "Patch" in tags or "Vendor Advisory" in tags:
                return ref.get("url", "")
        return "No known remediation"
```

### Breach Notification Monitoring

```python
# Breach Notification Monitoring System
import re
from datetime import datetime

class BreachNotificationMonitor:
    def __init__(self):
        self.sources = [
            "https://haveibeenpwned.com",
            "https://www.databreachtoday.com",
            "https://krebsonsecurity.com",
            "https://www.bleepingcomputer.com",
            "https://www.securityweek.com"
        ]
        self.monitored_vendors = {}

    def add_vendor_keywords(self, vendor_id, keywords):
        self.monitored_vendors[vendor_id] = keywords

    def check_breach_notifications(self, vendor_id):
        if vendor_id not in self.monitored_vendors:
            return []

        keywords = self.monitored_vendors[vendor_id]
        matches = []

        for source in self.sources:
            try:
                content = self._fetch_source(source)
                for keyword in keywords:
                    if re.search(keyword, content, re.IGNORECASE):
                        matches.append({
                            "source": source,
                            "keyword": keyword,
                            "timestamp": datetime.utcnow().isoformat(),
                            "vendor_id": vendor_id,
                            "severity": self._assess_severity(content, keyword)
                        })
            except Exception:
                continue

        return matches

    def _assess_severity(self, content, keyword):
        severity_patterns = {
            "HIGH": ["breach", "exposed", "leak", "ransomware", "compromised"],
            "MEDIUM": ["vulnerability", "flaw", "weakness", "incident"],
            "LOW": ["update", "release", "patch", "advisory"]
        }

        for severity, patterns in severity_patterns.items():
            for pattern in patterns:
                if re.search(pattern, content, re.IGNORECASE) and \
                   re.search(keyword, content, re.IGNORECASE):
                    return severity

        return "UNKNOWN"
```

## Vendor Security Rating Services

### Major Providers

| Service | Rating Methodology | Key Features | Use Case |
|---------|-------------------|--------------|----------|
| **SecurityScorecard** | A-F letter grade across 10 factor groups | External scanning, DNS, endpoints, patching cadence, social engineering | Continuous monitoring, benchmark comparisons |
| **BitSight** | 250-900 rating scale | External scanning, risk vectors, compromised systems, diligence, user behavior | Portfolio monitoring, M&A due diligence |
| **UpGuard** | 0-950 rating scale | External scanning, web application testing, data breach databases | Vendor risk assessments, third-party monitoring |
| **Panorays** | 0-100 rating score | External scanning, supply chain, customized questionnaires | Automated vendor assessments, dynamic questionnaires |
| **RiskRecon** | A-D severity rating | External scanning, compliance monitoring | Continuous monitoring, compliance validation |
| **Black Kite** | A-F letter grade | Financial impact analysis, ransomware readiness, compliance mapping | Cyber risk quantification, supply chain analysis |

### Rating Factor Analysis

```yaml
securityscorecard_factors:
  factor_1: "Application Security"
    weight: 15%
    metrics: ["Web application vulnerabilities", "CSP headers", "HTTPS configuration"]

  factor_2: "DNS Health"
    weight: 10%
    metrics: ["DNSSEC", "SPF/DKIM/DMARC", "DNS resolvers"]

  factor_3: "Endpoint Security"
    weight: 15%
    metrics: ["Open ports", "SSL/TLS vulnerabilities", "Patching cadence"]

  factor_4: "IP Reputation"
    weight: 15%
    metrics: ["Botnet infections", "Spam activity", "Malware servers"]

  factor_5: "Network Security"
    weight: 15%
    metrics: ["Firewall configuration", "WAF detection", "DDoS protection"]

  factor_6: "Patching Cadence"
    weight: 10%
    metrics: ["Time to patch", "Patch completion rate", "Critical patch volume"]

  factor_7: "Social Engineering"
    weight: 10%
    metrics: ["Phishing susceptibility", "Exposed credentials", "Dark web data"]

  factor_8: "Hacker Chatter"
    weight: 5%
    metrics: ["Underground forum mentions", "Marketplace listings"]

  factor_9: "Information Leak"
    weight: 5%
    metrics: ["Exposed source code", "Credentials in public repos"]

  factor_10: "Cubit Score"
    weight: 0%
    metrics: ["Custom scoring", "Historical analysis"]

bitsight_risk_vectors:
  - "Botnet infections"
  - "Spam propagation"
  - "Malware servers"
  - "Unsolicited communications"
  - "Potentially exploited"
  - "DDoS attacks"
  - "SSL/TLS configurations"
  - "Open ports"
  - "Web application headers"
  - "Social engineering"
  - "File sharing - P2P"
  - "Mobile application security"
```

## Remediation Management

### Finding Tracking

```yaml
finding_tracking_system:
  statuses:
    - "Open: Identified and awaiting action"
    - "In Progress: Remediation work underway"
    - "Verified: Fix implemented and confirmed"
    - "Accepted: Risk formally accepted"
    - "Overdue: Past remediation deadline"
    - "Closed: Remediation confirmed and accepted"

  severity_based_slas:
    critical:
      initial_response: "24 hours"
      remediation: "7 days"
      verification: "Within 48 hours of fix"
    high:
      initial_response: "3 days"
      remediation: "30 days"
      verification: "Within 1 week of fix"
    medium:
      initial_response: "7 days"
      remediation: "90 days"
      verification: "Within 2 weeks of fix"
    low:
      initial_response: "14 days"
      remediation: "180 days"
      verification: "Within 30 days of fix"
```

### Remediation Timeline Calculation

```python
# Remediation SLA Calculator
from datetime import datetime, timedelta

class RemediationSLACalculator:
    def __init__(self):
        self.slas = {
            "critical": {"initial_response": 1, "remediation": 7, "verification": 2},
            "high": {"initial_response": 3, "remediation": 30, "verification": 7},
            "medium": {"initial_response": 7, "remediation": 90, "verification": 14},
            "low": {"initial_response": 14, "remediation": 180, "verification": 30}
        }

    def calculate_deadlines(self, finding_date, severity):
        severity = severity.lower()
        if severity not in self.slas:
            raise ValueError(f"Unknown severity: {severity}")

        finding = finding_date if isinstance(finding_date, datetime) \
            else datetime.fromisoformat(finding_date)

        sla = self.slas[severity]
        return {
            "finding_date": finding.isoformat(),
            "initial_response_deadline": (finding + timedelta(days=sla["initial_response"])).isoformat(),
            "remediation_deadline": (finding + timedelta(days=sla["remediation"])).isoformat(),
            "verification_deadline": (finding + timedelta(
                days=sla["remediation"] + sla["verification"])).isoformat()
        }

    def is_overdue(self, finding):
        severity = finding.get("severity", "").lower()
        if severity not in self.slas:
            return False

        finding_date = datetime.fromisoformat(finding["finding_date"])
        sla = self.slas[severity]

        status = finding.get("status", "open").lower()
        today = datetime.now()

        if status == "open" or status == "in progress":
            return today > (finding_date + timedelta(days=sla["remediation"]))
        elif status == "verified":
            verified_date = datetime.fromisoformat(finding["verified_date"])
            return today > (verified_date + timedelta(days=sla["verification"]))

        return False
```

### Exception Management

```yaml
exception_management_process:
  exception_types:
    - "Risk Acceptance: Acknowledged risk with compensating controls"
    - "SLA Extension: Additional time needed for remediation"
    - "Compensating Control: Alternative control reduces risk to acceptable level"

  approval_matrix:
    critical:
      risk_acceptance: "CISO approval required"
      sla_extension: "CISO approval required"
      duration_limit: "30 days maximum"
    high:
      risk_acceptance: "Security Director approval required"
      sla_extension: "Security Director approval required"
      duration_limit: "90 days maximum"
    medium:
      risk_acceptance: "Security Manager approval required"
      sla_extension: "Security Manager approval required"
      duration_limit: "180 days maximum"
    low:
      risk_acceptance: "Assessment Lead approval"
      sla_extension: "Assessment Lead approval"
      duration_limit: "365 days maximum"

  exception_record:
    template: |
      ## Security Exception Request

      - **Vendor:** {vendor_name}
      - **Finding ID:** {finding_id}
      - **Control:** {control_description}
      - **Risk:** {risk_description}
      - **Compensating Controls:** {compensating_controls}
      - **Duration:** {start_date} to {end_date}
      - **Requested By:** {requester}
      - **Approved By:** {approver}
      - **Review Date:** {next_review_date}

      ## Justification
      {justification}

      ## Conditions
      {conditions}
```

## Termination

### Data Return and Destruction

```yaml
data_return_process:
  data_return:
    - "Return all customer data in agreed format"
    - "Data export within 30 days of termination"
    - "Verifiable complete data extraction"
    - "Option for structured and unstructured data"

  data_destruction:
    standards:
      - "NIST SP 800-88 Guidelines for Media Sanitization"
      - "DoD 5220.22-M for magnetic media"
      - "Cryptographic erasure for encrypted data"
    methods:
      - "Secure overwrite (7+ passes for HDD)"
      - "Physical destruction (shredding, incineration)"
      - "Degaussing for magnetic media"
      - "Cryptographic erase for SSDs (secure erase command)"
    certification:
      - "Certificate of destruction within 14 days"
      - "Chain of custody documentation"
      - "Witnessed destruction option"
      - "Independent verification option"

  verification:
    - "Written confirmation of data deletion"
    - "Forensic verification option if required by contract"
    - "Right to verify destruction within 90 days"
    - "Records of destruction maintained for compliance period"
```

### Access Revocation

```yaml
access_revocation_checklist:
  vendor_systems:
    - "Disable all vendor user accounts"
    - "Revoke API keys and tokens"
    - "Remove vendor from integration points"
    - "Deactivate SSO/federated identity"
    - "Remove vendor access from source code repositories"
    - "Revoke cloud provider access"
    - "Disable VPN access"

  customer_systems:
    - "Remove vendor from security groups"
    - "Revoke firewall rules for vendor IPs"
    - "Remove vendor from load balancer target groups"
    - "Disable cross-account IAM roles"
    - "Revoke database access"
    - "Remove vendor from monitoring and alerting tools"

  physical_access:
    - "Terminate badge access"
    - "Recover keys and access cards"
    - "Deactivate biometric access"
    - "Update visitor management system"

  verification:
    - "Confirm all accounts disabled within 24 hours"
    - "Run access audit to verify no residual access"
    - "Document revocation completion"
    - "Provide access revocation report"
  ```

### Transition Planning

```yaml
transition_planning_requirements:
  transition_period:
    standard: "60-90 days notice"
    critical: "120-180 days notice"
    level_of_effort: "Proportional to service complexity"

  transition_support:
    - "Data migration assistance"
    - "Integration transition support"
    - "Knowledge transfer sessions"
    - "API usage documentation for transition"
    - "Support for parallel operations during transition"

  exit_conditions:
    - "Data export complete and verified"
    - "Data destruction complete and certified"
    - "All access revoked and verified"
    - "Outstanding payments settled"
    - "Technical dependencies removed"
    - "Sub-vendor relationships transferred or terminated"
    - "Legal obligations satisfied"
```

## Due Diligence for M&A

### Target Company Vendor Assessment

```yaml
m_a_vendor_assessment:
  scope:
    - "All material vendor relationships of the target company"
    - "Vendors with access to critical data or systems"
    - "Vendors with significant contract value (>$100K/year)"
    - "Vendors providing infrastructure or security services"

  key_questions:
    - "Does the target company have a vendor risk management program?"
    - "Are all vendor relationships documented and tracked?"
    - "What is the current assessment coverage?"
    - "Are there any overdue or high-risk assessments?"
    - "Have there been any vendor-related security incidents?"
    - "Are vendor contracts assignable to the acquirer?"

  red_flags:
    - "No vendor risk management program"
    - "Critical vendors not assessed"
    - "Missing contracts or expired BAAs/DPAs"
    - "Vendors with recent security incidents"
    - "Vendor concentration risk (single vendor dependency)"
    - "Inadequate contractual security protections"
    - "Unassignable or change-of-control termination clauses"
```

### Inherited Risk Evaluation

```yaml
inherited_risk_calculation:
  factors:
    vendor_count:
      weight: 20%
      scoring:
        low: "< 50 vendors"
        medium: "50-200 vendors"
        high: "> 200 vendors"

    critical_vendor_pct:
      weight: 25%
      scoring:
        low: "< 10% critical"
        medium: "10-25% critical"
        high: "> 25% critical"

    assessment_coverage:
      weight: 25%
      scoring:
        low: "> 80% assessed"
        medium: "50-80% assessed"
        high: "< 50% assessed"

    incident_history:
      weight: 15%
      scoring:
        low: "No vendor incidents in 3 years"
        medium: "1-2 vendor incidents"
        high: "> 3 vendor incidents"

    contractual_strength:
      weight: 15%
      scoring:
        low: "All contracts with standard security terms"
        medium: "Partial security terms"
        high: "Weak or missing security terms"

  composite_score:
    low_risk: "< 25"
    medium_risk: "25-50"
    high_risk: "51-75"
    critical_risk: "> 75"
```

## Third-Party Risk Management Tools

### Major TPRM Platforms

| Platform | Key Features | Strengths | Use Case |
|----------|-------------|-----------|----------|
| **OneTrust Vendorpedia** | Questionnaire automation, evidence collection, risk scoring, continuous monitoring | Integrated privacy platform, global regulations | Enterprise TPRM with privacy compliance |
| **ServiceNow TPRM** | Integrated with ITSM, workflow automation, risk register | ServiceNow ecosystem, ITIL alignment | Organizations using ServiceNow platform |
| **Prevalent** | Continuous monitoring, automated assessments, threat intelligence | Threat intelligence integration, real-time alerts | Midsize to large enterprises |
| **Whistic** | Vendor portal, self-assessments, document sharing | Modern UX, easy vendor collaboration | Lean security teams, fast onboarding |
| **BitSight for Third Party** | Security ratings, continuous monitoring, portfolio management | External ratings data, benchmarks | Continuous monitoring of vendor security |
| **ProcessUnity** | Full lifecycle management, customizable workflows, risk scoring | Highly configurable, mature workflows | Regulated industries (financial services) |
| **Venminder** | Assessment management, expert services, vendor portal | Advisory services, user-friendly | Organizations needing external expertise |
| **ecurityScorecard for TPRM** | Security ratings, continuous monitoring, questionnaire automation | Broad coverage, easy portfolio view | High volume vendor environments |

### TPRM Automation Example

```python
# TPRM Automation Framework
import json
import requests
from datetime import datetime

class TPRMWorkflowEngine:
    def __init__(self, config):
        self.api_endpoints = config.get("api_endpoints", {})
        self.sla_config = config.get("sla_config", {})
        self.risk_thresholds = config.get("risk_thresholds", {
            "critical": 80,
            "high": 60,
            "medium": 40,
            "low": 20
        })

    def initiate_assessment(self, vendor_data):
        assessment = {
            "vendor_id": vendor_data["vendor_id"],
            "vendor_name": vendor_data["name"],
            "tier": vendor_data.get("tier", "T3"),
            "initiated_at": datetime.utcnow().isoformat(),
            "status": "pending",
            "tasks": []
        }

        # Create assessment tasks based on vendor tier
        if vendor_data["tier"] in ["T1", "T2"]:
            assessment["tasks"].extend([
                {"type": "questionnaire", "assigned_to": "vendor"},
                {"type": "document_review", "assigned_to": "assessor"},
                {"type": "technical_review", "assigned_to": "security_engineer"},
                {"type": "compliance_review", "assigned_to": "compliance_officer"}
            ])
        elif vendor_data["tier"] == "T3":
            assessment["tasks"].extend([
                {"type": "questionnaire", "assigned_to": "vendor"},
                {"type": "document_review", "assigned_to": "assessor"}
            ])
        else:
            assessment["tasks"].extend([
                {"type": "questionnaire", "assigned_to": "vendor"}
            ])

        # Set SLA deadlines
        assessment["response_deadline"] = self._calculate_deadline(
            vendor_data.get("response_sla_days", 14)
        )

        return assessment

    def calculate_risk_score(self, assessment_data):
        weights = {
            "questionnaire_score": 0.30,
            "security_rating": 0.20,
            "technical_findings": 0.20,
            "compliance_status": 0.15,
            "incident_history": 0.15
        }

        score = 0
        details = {}

        for component, weight in weights.items():
            component_score = self._get_component_score(assessment_data, component)
            score += component_score * weight
            details[component] = component_score

        risk_level = self._classify_risk(score)

        return {
            "total_score": round(score, 2),
            "risk_level": risk_level,
            "details": details,
            "calculated_at": datetime.utcnow().isoformat()
        }

    def _get_component_score(self, data, component):
        if component == "questionnaire_score":
            responses = data.get("questionnaire", {})
            if not responses:
                return 100  # Default to high risk if not completed

            total = len(responses)
            passed = sum(1 for r in responses.values() if r.get("status") == "passed")
            return (1 - (passed / total)) * 100 if total > 0 else 100

        elif component == "security_rating":
            rating = data.get("security_rating", {}).get("score", 0)
            # Convert rating (e.g., 0-900 for BitSight) to 0-100 risk score
            if isinstance(rating, int) and rating <= 900:
                return max(0, 100 - (rating / 900) * 100)
            return rating

        elif component == "technical_findings":
            findings = data.get("technical_findings", [])
            if not findings:
                return 0
            critical = sum(1 for f in findings if f["severity"] == "critical")
            high = sum(1 for f in findings if f["severity"] == "high")
            return min(100, (critical * 30 + high * 15))

        elif component == "compliance_status":
            status = data.get("compliance_status", {})
            failed = status.get("failed_controls", 0)
            total_controls = status.get("total_controls", 100)
            return (failed / total_controls) * 100 if total_controls > 0 else 50

        elif component == "incident_history":
            incidents = data.get("incidents_12_months", 0)
            return min(100, incidents * 25)

        return 50  # Default moderate risk

    def _classify_risk(self, score):
        for level, threshold in sorted(
            self.risk_thresholds.items(), key=lambda x: x[1], reverse=True
        ):
            if score >= threshold:
                return level.upper()
        return "LOW"

    def _calculate_deadline(self, days):
        return (datetime.now() + timedelta(days=days)).isoformat()
```

### Vendor Portal Features

```yaml
vendor_portal:
  vendor_self_service:
    - "Complete security questionnaires online"
    - "Upload supporting documentation and evidence"
    - "Track assessment status and upcoming deadlines"
    - "View assessment results and findings"
    - "Submit remediation plans and updates"
    - "Access security requirements and standards"
    - "Manage organizational contacts and information"

  document_repository:
    - "Centralized storage for all vendor documents"
    - "Version control and change tracking"
    - "Access controls based on vendor relationship"
    - "Expiration tracking and renewal reminders"
    - "Batch upload and auto-classification"
    - "Encrypted storage for sensitive documents"

  status_tracking:
    - "Assessment progress dashboard"
    - "Overdue task notifications"
    - "Remediation status tracking"
    - "SLA compliance monitoring"
    - "Risk score trending over time"
    - "Automated reminders for upcoming deadlines"

  reporting:
    - "Vendor portfolio risk summary"
    - "Assessment completion rates"
    - "Finding closure trends"
    - "Risk score distribution"
    - "Compliance gap analysis"
    - "Regulatory coverage mapping"
```

## Metrics

### Vendor Risk Score Distribution

```python
# Vendor Portfolio Risk Analytics
from collections import Counter
from datetime import datetime, timedelta

class VendorPortfolioMetrics:
    def __init__(self):
        self.vendors = {}

    def add_vendor(self, vendor_id, risk_score, tier, status, assessment_date):
        self.vendors[vendor_id] = {
            "risk_score": risk_score,
            "tier": tier,
            "status": status,
            "assessment_date": assessment_date
        }

    def portfolio_summary(self):
        if not self.vendors:
            return {"total_vendors": 0}

        risk_levels = Counter()
        tiers = Counter()
        statuses = Counter()

        for data in self.vendors.values():
            score = data["risk_score"]
            if score >= 80:
                risk_levels["critical"] += 1
            elif score >= 60:
                risk_levels["high"] += 1
            elif score >= 40:
                risk_levels["medium"] += 1
            else:
                risk_levels["low"] += 1

            tiers[data["tier"]] += 1
            statuses[data["status"]] += 1

        total = len(self.vendors)
        return {
            "total_vendors": total,
            "risk_distribution": {
                "critical": risk_levels.get("critical", 0),
                "high": risk_levels.get("high", 0),
                "medium": risk_levels.get("medium", 0),
                "low": risk_levels.get("low", 0),
                "critical_pct": round(risk_levels.get("critical", 0) / total * 100, 2),
                "high_plus_critical_pct": round(
                    (risk_levels.get("critical", 0) + risk_levels.get("high", 0)) / total * 100, 2
                )
            },
            "tier_distribution": dict(tiers),
            "status_distribution": dict(statuses),
            "assessment_coverage": round(
                statuses.get("assessed", 0) / total * 100, 2
            ) if total > 0 else 0
        }

    def overdue_assessments(self):
        now = datetime.now()
        overdue = []

        for vendor_id, data in self.vendors.items():
            assessment_date = data["assessment_date"]
            if isinstance(assessment_date, str):
                assessment_date = datetime.fromisoformat(assessment_date)

            # Check if overdue based on tier
            tier_frequencies = {"T1": 365, "T2": 365, "T3": 730, "T4": 730}
            max_frequency = tier_frequencies.get(data["tier"], 365)

            days_since = (now - assessment_date).days
            if days_since > max_frequency:
                overdue.append({
                    "vendor_id": vendor_id,
                    "tier": data["tier"],
                    "days_overdue": days_since - max_frequency,
                    "risk_score": data["risk_score"]
                })

        return sorted(overdue, key=lambda x: x["days_overdue"], reverse=True)

    def finding_closure_rate(self, completed_findings, total_findings_by_period):
        rates = {}
        for period, total in total_findings_by_period.items():
            completed = completed_findings.get(period, 0)
            rates[period] = {
                "total": total,
                "completed": completed,
                "closure_rate": round(completed / total * 100, 2) if total > 0 else 0
            }
        return rates

    def risk_trend(self, months=12):
        trend = {}
        for vendor_id, data in self.vendors.items():
            period = data["assessment_date"].strftime("%Y-%m")
            if period not in trend:
                trend[period] = {"total": 0, "sum_scores": 0, "count": 0}
            trend[period]["total"] += data["risk_score"]
            trend[period]["count"] += 1

        for period in trend:
            trend[period]["average"] = round(
                trend[period]["total"] / trend[period]["count"], 2
            ) if trend[period]["count"] > 0 else 0

        return trend
```

### Key Performance Indicators

| Metric | Definition | Target | Measurement |
|--------|------------|--------|-------------|
| **Assessment Coverage** | Percentage of vendors with current assessment | > 90% | Assessed vendors / Total vendors |
| **On-Time Completion** | Assessments completed within SLA | > 85% | On-time assessments / Total assessments |
| **Finding Closure Rate** | Remediated findings within SLA | > 90% | Closed findings / Total findings |
| **Risk Acceptance Rate** | Findings accepted vs remediated | < 10% | Accepted findings / Total findings |
| **Critical Vendor Coverage** | T1 vendors with current assessment | 100% | Assessed T1 / Total T1 |
| **Overdue Assessments** | Assessments past due date | < 10% | Overdue assessments / Total assessments |
| **Average Risk Score** | Mean risk score across portfolio | < 40 | Sum of scores / Vendor count |
| **Vendor Incident Rate** | Security incidents per vendor | < 2% | Vendors with incidents / Total vendors |
| **Assessment Cycle Time** | Days to complete full assessment | < 30 days | Sum of durations / Assessments |

## Compliance Mapping

### Control to Regulation Crosswalk

```yaml
compliance_crosswalk:
  access_control:
    soc_2: "CC6.1 - Logical and physical access controls"
    iso_27001: "A.9 - Access control"
    hipaa: "164.312(a)(1) - Access control"
    pci_dss: "Requirement 7 - Restrict access by need to know"
    gdpr: "Article 32 - Security of processing"
    fedramp: "AC - Access Control (NIST SP 800-53)"
    sox: "ITGC - Access to programs and data"

  encryption:
    soc_2: "CC6.7 - Encryption of data in transit and at rest"
    iso_27001: "A.10 - Cryptography"
    hipaa: "164.312(e)(2)(ii) - Encryption and decryption"
    pci_dss: "Requirement 3 - Protect stored cardholder data"
    gdpr: "Article 32(1)(a) - Pseudonymization and encryption"
    fedramp: "SC - System and Communications Protection"
    sox: "ITGC - Data integrity controls"

  incident_response:
    soc_2: "CC7.3 - Incident response and communication"
    iso_27001: "A.16 - Information security incident management"
    hipaa: "164.308(a)(6) - Security incident procedures"
    pci_dss: "Requirement 12.10 - Implement incident response"
    gdpr: "Articles 33-34 - Breach notification"
    fedramp: "IR - Incident Response (NIST SP 800-53)"
    sox: "ITGC - System monitoring and logging"

  vulnerability_management:
    soc_2: "CC7.1 - System monitoring and vulnerability management"
    iso_27001: "A.12.6 - Technical vulnerability management"
    hipaa: "164.308(a)(1) - Security management process"
    pci_dss: "Requirement 11 - Test security systems"
    gdpr: "Article 32 - Security of processing"
    fedramp: "RA - Risk Assessment, SI - System and Information Integrity"
    sox: "ITGC - Change management controls"

  business_continuity:
    soc_2: "A1.2 - System recovery and contingency planning"
    iso_27001: "A.17 - Business continuity management"
    hipaa: "164.308(a)(7) - Contingency plan"
    pci_dss: "Requirement 12.10 - Business continuity"
    gdpr: "Article 32 - Resilience of processing systems"
    fedramp: "CP - Contingency Planning (NIST SP 800-53)"
    sox: "ITGC - Availability and processing continuity"

  vendor_management:
    soc_2: "CC9.2 - Vendor and business partner management"
    iso_27001: "A.15 - Supplier relationships"
    hipaa: "164.308(b) - Business associate contracts"
    pci_dss: "Requirement 12.8 - Third-party service providers"
    gdpr: "Article 28 - Processor obligations"
    fedramp: "SA - System and Services Acquisition"
    sox: "ITGC - Third-party service organization controls"
```

### Automated Compliance Mapping

```python
# Compliance Control Mapper
class ComplianceMapper:
    def __init__(self):
        self.mappings = {
            "access_control": {
                "SOC_2": "CC6.1",
                "ISO_27001": "A.9",
                "HIPAA": "164.312(a)(1)",
                "PCI_DSS": "Req 7",
                "GDPR": "Art 32",
                "FedRAMP": "AC-2",
                "NIST_C SF": "PR.AC"
            },
            "encryption_at_rest": {
                "SOC_2": "CC6.7",
                "ISO_27001": "A.10.1",
                "HIPAA": "164.312(a)(2)(iv)",
                "PCI_DSS": "Req 3.4",
                "GDPR": "Art 32(1)(a)",
                "FedRAMP": "SC-28",
                "NIST_CSF": "PR.DS"
            }
        }

    def map_control(self, control_name):
        return self.mappings.get(control_name, {})

    def map_vendor_controls(self, vendor_controls, target_framework):
        coverage = {
            "mapped": [],
            "unmapped": [],
            "coverage_percentage": 0
        }

        total_controls = len(vendor_controls)
        mapped_count = 0

        for control in vendor_controls:
            framework_ref = self.find_mapping(control, target_framework)
            if framework_ref:
                mapped_count += 1
                coverage["mapped"].append({
                    "vendor_control": control,
                    "framework_ref": framework_ref
                })
            else:
                coverage["unmapped"].append(control)

        coverage["coverage_percentage"] = round(
            mapped_count / total_controls * 100, 2
        ) if total_controls > 0 else 0

        return coverage

    def find_mapping(self, control, framework):
        for domain, mappings in self.mappings.items():
            if control.lower() in domain.lower():
                return mappings.get(framework)
        return None

    def generate_compliance_report(self, vendor_assessment, framework):
        report = {
            "vendor": vendor_assessment.get("vendor_name"),
            "framework": framework,
            "assessed_at": datetime.utcnow().isoformat(),
            "total_controls": 0,
            "compliant_controls": 0,
            "non_compliant_controls": 0,
            "not_applicable_controls": 0,
            "details": []
        }

        controls = vendor_assessment.get("controls", [])
        report["total_controls"] = len(controls)

        for control in controls:
            framework_ref = self.find_mapping(control["name"], framework)
            status = control.get("status", "non_compliant")

            detail = {
                "control": control["name"],
                "framework_ref": framework_ref,
                "status": status,
                "evidence": control.get("evidence"),
                "notes": control.get("notes")
            }

            if status == "compliant":
                report["compliant_controls"] += 1
            elif status == "non_compliant":
                report["non_compliant_controls"] += 1
            else:
                report["not_applicable_controls"] += 1

            report["details"].append(detail)

        if report["total_controls"] > 0:
            applicable = report["total_controls"] - report["not_applicable_controls"]
            report["compliance_percentage"] = round(
                report["compliant_controls"] / applicable * 100, 2
            ) if applicable > 0 else 0

        return report
```

## Reporting

### Executive Dashboard

```yaml
executive_vendor_risk_dashboard:
  portfolio_overview:
    - "Total vendors in portfolio"
    - "Critical vendors (T1)"
    - "High risk vendors (score > 60)"
    - "Assessment coverage percentage"
    - "Risk trend (improving / stable / declining)"

  risk_summary:
    vendor_risk_distribution:
      chart_type: "Donut chart"
      segments:
        - "Critical risk (score 80-100)"
        - "High risk (score 60-79)"
        - "Medium risk (score 40-59)"
        - "Low risk (score 0-39)"

    top_riskiest_vendors:
      table_columns: ["Vendor Name", "Tier", "Risk Score", "Top Finding", "Status"]

    assessment_overdue:
      chart_type: "Bar chart"
      metrics: ["Overdue by tier", "Coming due in 30 days"]

  trend_analysis:
    - "Average risk score over time (line chart)"
    - "Assessment completion rate over time (line chart)"
    - "Finding closure rate over time (line chart)"
    - "Incident volume by vendor (bar chart)"

  action_items:
    - "Vendors requiring immediate attention"
    - "Overdue assessments requiring escalation"
    - "Critical findings past remediation deadline"
    - "Vendors due for reassessment this quarter"
```

### Board-Level Reporting

```markdown
# Board-Level Vendor Risk Report

## Executive Summary
[Quarter] [Year] Vendor Risk Overview

## Portfolio at a Glance
- **Total Vendors:** 350
- **Critical Vendors (T1):** 45 (13%)
- **Assessment Coverage:** 92% (target: 90%)
- **High Risk Vendors:** 12 (3.4%)
- **Year-over-Year Trend:** Risk scores improved 8%

## Key Highlights
1. Achieved 100% assessment coverage for critical (T1) vendors
2. Closed 95% of high-severity findings within SLA
3. Two vendor security incidents (both low impact, no data exposure)
4. Implemented continuous monitoring for top 50 vendors

## Risk Score Distribution
| Risk Level | Range | Count | % of Portfolio | Change from Last Quarter |
|------------|-------|-------|----------------|-------------------------|
| Critical | 80-100 | 3 | 0.9% | -1 |
| High | 60-79 | 9 | 2.6% | -2 |
| Medium | 40-59 | 62 | 17.7% | +5 |
| Low | 0-39 | 276 | 78.8% | +12 |

## Top Risks
1. **Cloud Provider Concentration:** 5 critical vendors use the same IaaS provider
2. **Sub-Processor Visibility:** 30% of T1 vendors have incomplete sub-processor disclosures
3. **Legacy Contract Terms:** 15% of critical vendor contracts lack breach notification SLAs

## Compliance Posture
| Framework | Coverage | Gaps |
|-----------|----------|------|
| SOC 2 | 85% of T1 vendors | 7 vendors pending SOC 2 reports |
| ISO 27001 | 72% of T1 vendors | 12 vendors not certified |
| HIPAA | 100% of BAA vendors | No gaps |
| PCI DSS | 100% of payment vendors | No gaps |

## Recommendations
1. Remediate cloud provider concentration risk with diversification strategy
2. Launch sub-processor disclosure campaign for T1 vendors
3. Initiate contract remediation for 15% of critical vendor agreements
4. Increase continuous monitoring coverage from 50 to 75 vendors
```

### Audit Committee Reporting

```yaml
audit_committee_report:
  compliance_validation:
    - "SOC 2 report review findings"
    - "ISO 27001 surveillance audit results"
    - "Regulatory examination findings"
    - "Internal audit vendor management findings"

  control_testing:
    testing_methodology:
      - "Sample-based testing of vendor controls"
      - "Automated control testing via APIs"
      - "Third-party attestation review"
    testing_results:
      - "Controls tested this quarter: 45"
      - "Control failures identified: 2"
      - "Remediation status: 1 closed, 1 in progress"

  incidents:
    - "Vendor security incidents in period: 0"
    - "Vendor compliance violations: 1 (minor)"
    - "Breach notifications received: 0"

  risk_acceptances:
    - "New risk acceptances this quarter: 3"
    - "Expired risk acceptances requiring review: 1"
    - "CISO-approved exceptions: 2"

  forward_look:
    - "Upcoming vendor reassessments: 15 in next quarter"
    - "New vendor onboarding pipeline: 8 in progress"
    - "Regulatory changes impacting vendor management: GDPR updates"
    - "Budget and resource requirements: 2 additional assessors needed"
```

## Code Examples

### Risk Scoring Formula

```python
# Quantitative Vendor Risk Scoring
from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class VendorRiskFactors:
    data_sensitivity: int  # 1-5
    access_level: int  # 1-5
    integration_depth: int  # 1-5
    regulatory_impact: int  # 1-5
    business_criticality: int  # 1-5

@dataclass
class SecurityControls:
    encryption: float  # 0-1
    access_control: float  # 0-1
    incident_response: float  # 0-1
    vulnerability_mgmt: float  # 0-1
    bc_dr: float  # 0-1

class VendorRiskScorer:
    def __init__(self):
        self.inherent_weights = {
            "data_sensitivity": 0.30,
            "access_level": 0.25,
            "integration_depth": 0.15,
            "regulatory_impact": 0.20,
            "business_criticality": 0.10
        }

    def calculate_inherent_risk(self, factors: VendorRiskFactors) -> float:
        score = 0
        for factor_name, weight in self.inherent_weights.items():
            factor_value = getattr(factors, factor_name)
            score += factor_value / 5 * weight * 100
        return round(score, 2)

    def calculate_control_effectiveness(self, controls: SecurityControls) -> float:
        weights = {
            "encryption": 0.30,
            "access_control": 0.25,
            "incident_response": 0.15,
            "vulnerability_mgmt": 0.15,
            "bc_dr": 0.15
        }

        score = 0
        for control_name, weight in weights.items():
            control_value = getattr(controls, control_name)
            score += control_value * weight * 100
        return round(score, 2)

    def calculate_residual_risk(self, inherent_risk: float,
                                 control_effectiveness: float) -> float:
        residual_risk = inherent_risk * (1 - control_effectiveness / 100)
        return round(max(0, min(100, residual_risk)), 2)

    def classify_risk(self, residual_risk: float) -> str:
        if residual_risk >= 80:
            return "CRITICAL"
        elif residual_risk >= 60:
            return "HIGH"
        elif residual_risk >= 40:
            return "MEDIUM"
        else:
            return "LOW"

    def score_vendor(self, factors: VendorRiskFactors,
                     controls: SecurityControls) -> Dict:
        inherent = self.calculate_inherent_risk(factors)
        control_eff = self.calculate_control_effectiveness(controls)
        residual = self.calculate_residual_risk(inherent, control_eff)

        return {
            "inherent_risk": inherent,
            "inherent_level": self.classify_risk(inherent),
            "control_effectiveness": control_eff,
            "residual_risk": residual,
            "residual_level": self.classify_risk(residual),
            "scoring_date": datetime.utcnow().isoformat()
        }


# Usage example
if __name__ == "__main__":
    scorer = VendorRiskScorer()

    # Vendor with high data sensitivity, extensive access
    factors = VendorRiskFactors(
        data_sensitivity=5,
        access_level=4,
        integration_depth=3,
        regulatory_impact=4,
        business_criticality=4
    )

    # Vendor with strong controls
    controls = SecurityControls(
        encryption=0.95,
        access_control=0.88,
        incident_response=0.75,
        vulnerability_mgmt=0.82,
        bc_dr=0.70
    )

    result = scorer.score_vendor(factors, controls)
    print(json.dumps(result, indent=2))
```

### Assessment Automation Script

```python
# Automated Vendor Assessment Workflow
import os
import json
import requests
from datetime import datetime
from jinja2 import Environment, FileSystemLoader

class VendorAssessmentAutomation:
    def __init__(self, config_path):
        with open(config_path) as f:
            self.config = json.load(f)

        self.template_env = Environment(
            loader=FileSystemLoader(self.config["template_dir"])
        )
        self.output_dir = self.config.get("output_dir", "./assessments")

    def generate_questionnaire(self, vendor_tier, data_access_level):
        template = self.template_env.get_template("questionnaire.j2")

        # Select question sets based on tier and data access
        question_sets = self._select_question_sets(vendor_tier, data_access_level)

        questionnaire = template.render(
            vendor_name="{{ vendor_name }}",
            tier=vendor_tier,
            data_access=data_access_level,
            question_sets=question_sets,
            generated_date=datetime.now().strftime("%Y-%m-%d"),
            due_date=(datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        )

        return questionnaire

    def send_questionnaire(self, vendor_email, questionnaire, vendor_name):
        # In production, integrate with email service or vendor portal
        payload = {
            "to": vendor_email,
            "subject": f"Security Assessment - {vendor_name}",
            "body": questionnaire,
            "attachments": [],
            "portal_url": f"{self.config['portal_url']}/assessment/{vendor_name}"
        }

        response = requests.post(
            f"{self.config['portal_api']}/send-assessment",
            json=payload,
            headers={"Authorization": f"Bearer {self.config['portal_key']}"}
        )
        return response.json()

    def _select_question_sets(self, tier, data_access):
        base_sets = ["general_security", "access_control"]

        if tier == "T1":
            base_sets.extend([
                "incident_response",
                "business_continuity",
                "penetration_testing"
            ])
        if data_access >= 3:
            base_sets.append("data_protection")
        if tier == "T1" or data_access >= 4:
            base_sets.append("physical_security")

        return base_sets

    def process_assessment_response(self, response_data):
        assessment = {
            "vendor_id": response_data["vendor_id"],
            "completed_at": datetime.now().isoformat(),
            "responses": response_data["responses"],
            "attachments": response_data.get("attachments", []),
            "status": "completed"
        }

        # Calculate scores
        scoring_results = self._score_responses(assessment["responses"])
        assessment["scores"] = scoring_results

        # Generate findings
        assessment["findings"] = self._generate_findings(
            assessment["responses"], scoring_results
        )

        # Save assessment
        os.makedirs(self.output_dir, exist_ok=True)
        output_path = os.path.join(
            self.output_dir,
            f"{assessment['vendor_id']}_{datetime.now().strftime('%Y%m%d')}.json"
        )
        with open(output_path, "w") as f:
            json.dump(assessment, f, indent=2)

        return assessment

    def _score_responses(self, responses):
        total_points = 0
        earned_points = 0
        domain_scores = {}

        for question_id, response in responses.items():
            domain = response.get("domain", "general")
            weight = response.get("weight", 1)
            max_points = response.get("max_points", 10)

            if domain not in domain_scores:
                domain_scores[domain] = {"earned": 0, "total": 0}

            domain_scores[domain]["total"] += max_points * weight

            if response.get("answer") in response.get("acceptable_answers", []):
                domain_scores[domain]["earned"] += max_points * weight
                earned_points += max_points * weight

            total_points += max_points * weight

        # Calculate percentages
        for domain in domain_scores:
            domain_scores[domain]["percentage"] = round(
                domain_scores[domain]["earned"] / domain_scores[domain]["total"] * 100,
                2
            ) if domain_scores[domain]["total"] > 0 else 0

        overall = round(earned_points / total_points * 100, 2) if total_points > 0 else 0

        return {"overall": overall, "domain_scores": domain_scores}

    def _generate_findings(self, responses, scores):
        findings = []

        # Identify control failures
        for domain, domain_score in scores["domain_scores"].items():
            if domain_score["percentage"] < 60:
                findings.append({
                    "domain": domain,
                    "severity": "HIGH",
                    "score": domain_score["percentage"],
                    "description": f"Significant gaps in {domain} controls",
                    "recommendation": f"Vendor must remediate {domain} controls to minimum 60%"
                })
            elif domain_score["percentage"] < 80:
                findings.append({
                    "domain": domain,
                    "severity": "MEDIUM",
                    "score": domain_score["percentage"],
                    "description": f"Partial gaps in {domain} controls",
                    "recommendation": f"Vendor should improve {domain} controls"
                })

        # Check for critical missing controls
        critical_controls = [
            "mfa_enabled", "encryption_at_rest", "incident_response_plan",
            "data_breach_notification", "access_reviews"
        ]

        for control in critical_controls:
            if responses.get(control, {}).get("answer") != "yes":
                findings.append({
                    "control": control,
                    "severity": "CRITICAL",
                    "description": f"Missing critical control: {control}",
                    "recommendation": f"Vendor must implement {control} immediately"
                })

        return findings

    def generate_report(self, assessment_id):
        # Load assessment data
        assessment_path = os.path.join(self.output_dir, f"{assessment_id}.json")
        with open(assessment_path) as f:
            assessment = json.load(f)

        report_template = self.template_env.get_template("assessment_report.j2")
        report = report_template.render(
            vendor_name=assessment.get("vendor_name", "Unknown"),
            assessment_date=assessment["completed_at"],
            scores=assessment["scores"],
            findings=assessment["findings"],
            risk_level=self._calculate_risk_level(assessment["scores"]["overall"])
        )

        report_path = os.path.join(
            self.output_dir, f"{assessment_id}_report.html"
        )
        with open(report_path, "w") as f:
            f.write(report)

        return report_path

    def _calculate_risk_level(self, score):
        if score >= 80:
            return "LOW"
        elif score >= 60:
            return "MEDIUM"
        elif score >= 40:
            return "HIGH"
        else:
            return "CRITICAL"
```

### Monitoring Script

```python
# Vendor Security Rating Monitoring
import json
import requests
from datetime import datetime

class VendorRatingMonitor:
    def __init__(self, config):
        self.providers = config.get("rating_providers", {})
        self.webhook_urls = config.get("webhook_urls", {})
        self.thresholds = config.get("thresholds", {
            "critical_threshold": 60,
            "high_threshold": 40
        })

    def check_vendor_rating(self, vendor_name, domain):
        results = {}

        # Check SecurityScorecard
        if "securityscorecard" in self.providers:
            results["securityscorecard"] = self._check_scorecard(vendor_name, domain)

        # Check BitSight
        if "bitsight" in self.providers:
            results["bitsight"] = self._check_bitsight(domain)

        # Check UpGuard
        if "upguard" in self.providers:
            results["upguard"] = self._check_upguard(domain)

        # Aggregate risk score (convert all to 0-100 risk scale)
        risk_scores = []
        for provider, result in results.items():
            if result and "risk_score" in result:
                risk_scores.append(result["risk_score"])

        if risk_scores:
            aggregate = {
                "vendor_name": vendor_name,
                "domain": domain,
                "timestamp": datetime.utcnow().isoformat(),
                "average_risk_score": round(sum(risk_scores) / len(risk_scores), 2),
                "provider_results": results,
                "alert_triggered": any(
                    r.get("risk_score", 0) >= self.thresholds["high_threshold"]
                    for r in results.values() if r
                )
            }

            # Trigger alert if threshold exceeded
            if aggregate["average_risk_score"] >= self.thresholds["critical_threshold"]:
                self._send_alert("CRITICAL", aggregate)
            elif aggregate["average_risk_score"] >= self.thresholds["high_threshold"]:
                self._send_alert("HIGH", aggregate)

            return aggregate

        return None

    def _check_scorecard(self, vendor_name, domain):
        config = self.providers["securityscorecard"]
        try:
            response = requests.get(
                f"https://api.securityscorecard.io/v2/companies/{domain}",
                headers={"Authorization": f"Bearer {config['api_key']}"}
            )
            data = response.json()

            # Convert grade to risk score (A=10, B=25, C=50, D=75, F=95)
            grade = data.get("grade", "C")
            grade_map = {"A": 10, "B": 25, "C": 50, "D": 75, "F": 95}

            return {
                "grade": grade,
                "risk_score": grade_map.get(grade, 50),
                "factors": data.get("factors", {}),
                "score": data.get("score", 0)
            }
        except Exception as e:
            return {"error": str(e)}

    def _check_bitsight(self, domain):
        config = self.providers["bitsight"]
        try:
            response = requests.get(
                f"https://api.bitsight.com/v2/companies/{domain}/ratings",
                headers={"Authorization": f"Bearer {config['api_key']}"}
            )
            data = response.json()

            # BitSight scores 250-900. Convert to risk (0-100).
            rating = data.get("rating", 700)
            risk_score = max(0, min(100, 100 - (rating - 250) / 650 * 100))

            return {
                "rating": rating,
                "rating_label": data.get("rating_label", ""),
                "risk_score": round(risk_score, 2),
                "risk_vectors": data.get("risk_vectors", {})
            }
        except Exception as e:
            return {"error": str(e)}

    def _check_upguard(self, domain):
        config = self.providers["upguard"]
        try:
            response = requests.get(
                f"https://api.upguard.com/v1/companies/{domain}/score",
                headers={"Authorization": f"Bearer {config['api_key']}"}
            )
            data = response.json()

            # UpGuard scores 0-950. Convert to risk (0-100).
            score = data.get("score", 500)
            risk_score = max(0, min(100, 100 - score / 950 * 100))

            return {
                "score": score,
                "risk_score": round(risk_score, 2),
                "breakdown": data.get("breakdown", {})
            }
        except Exception as e:
            return {"error": str(e)}

    def _send_alert(self, severity, data):
        # Send to Slack
        if "slack" in self.webhook_urls:
            message = {
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": f":warning: {severity} Vendor Security Alert"
                        }
                    },
                    {
                        "type": "section",
                        "fields": [
                            {"type": "mrkdwn", "text": f"*Vendor:* {data['vendor_name']}"},
                            {"type": "mrkdwn", "text": f"*Domain:* {data['domain']}"},
                            {"type": "mrkdwn", "text": f"*Risk Score:* {data['average_risk_score']}"},
                            {"type": "mrkdwn", "text": f"*Time:* {data['timestamp']}"}
                        ]
                    }
                ]
            }

            requests.post(self.webhook_urls["slack"], json=message)

        # Send to PagerDuty
        if "pagerduty" in self.webhook_urls:
            payload = {
                "routing_key": self.webhook_urls["pagerduty"],
                "event_action": "trigger",
                "payload": {
                    "summary": f"Vendor Security Alert: {data['vendor_name']} - Risk Score {data['average_risk_score']}",
                    "severity": "critical" if severity == "CRITICAL" else "warning",
                    "source": "Vendor Rating Monitor",
                    "custom_details": data
                }
            }

            requests.post(
                "https://events.pagerduty.com/v2/enqueue",
                json=payload
            )

        # Log to SIEM
        if "siem" in self.webhook_urls:
            requests.post(
                self.webhook_urls["siem"],
                json={
                    "event_type": "vendor_risk_alert",
                    "severity": severity,
                    "data": data
                }
            )
```
