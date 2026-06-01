# Compliance Frameworks Mapping

## Overview

AI safety controls must satisfy multiple regulatory frameworks simultaneously. This reference maps common safety controls to regulatory requirements across EU AI Act, GDPR, HIPAA, SOC 2, and emerging standards (NIST AI RMF, ISO/IEC 42001). Use this to identify which controls satisfy which requirements and avoid duplicating work.

## Framework Comparison Matrix

### Scope and Applicability

| Framework | Scope | Applies To | Enforcement | Penalties |
|-----------|-------|------------|-------------|-----------|
| EU AI Act | AI system risk categories | Providers + deployers in EU | National authorities | Up to 7% global revenue or EUR 35M |
| GDPR | Personal data processing | Any org processing EU resident data | DPA | Up to 4% global revenue or EUR 20M |
| HIPAA | Protected health information | Healthcare providers, plans, clearinghouses | OCR | Up to $1.9M/year per violation category |
| SOC 2 | Service organization controls | Service providers handling customer data | AICPA (audit) | Loss of certification |
| NIST AI RMF | Trustworthy AI | Voluntary framework | N/A (voluntary) | N/A |
| ISO/IEC 42001 | AI management system | Organizations deploying AI | Accreditation bodies | Loss of certification |

### Control Mapping

| Safety Control | EU AI Act | GDPR | HIPAA | SOC 2 | NIST AI RMF | ISO 42001 |
|----------------|-----------|------|-------|-------|-------------|-----------|
| Risk assessment | Art. 9 | Art. 35 | Sec. 164.308 | CC6, CC7 | MAP 1.1 | 6.1 |
| Threat modeling | Art. 9, Annex IV | Art. 32 | Sec. 164.308(a)(1) | CC7.1 | MAP 1.2 | 6.1.2 |
| Input guardrails | Art. 15 | Art. 25 (PbD) | Sec. 164.312(c) | CC6.1 | GOVERN 1.2 | 8.1 |
| Output moderation | Art. 15 | Art. 5(1)(f) | Sec. 164.312(b) | CC6.1 | MAP 2.3 | 8.2 |
| PII redaction | Art. 10 | Art. 5(1)(c) | Sec. 164.514 | CC6.1 | GOVERN 3.2 | 8.3 |
| Bias evaluation | Art. 10 | Art. 22 | N/A | N/A | MAP 2.4 | 6.1.3 |
| Red teaming | Art. 15 | Art. 32 | Sec. 164.308(a)(8) | CC7.1 | MAP 2.5 | 8.4 |
| Human oversight | Art. 14 | Art. 22 | Sec. 164.308(a)(3) | CC2.2 | GOVERN 2.3 | 7.4 |
| Transparency labeling | Art. 50 | Art. 13 | Sec. 164.520 | N/A | COMMUNICATE 2.1 | 7.3 |
| Incident response | Art. 20 | Art. 33 | Sec. 164.308(a)(6) | CC7.4 | MAP 2.6 | 8.5 |
| Audit logging | Art. 12 | Art. 30 | Sec. 164.312(b) | CC3.2 | GOVERN 4.2 | 9.1 |
| Monitoring | Art. 15 | Art. 32 | Sec. 164.308(a)(1)(ii) | CC7.2 | MAP 2.2 | 9.2 |
| Access controls | Art. 10 | Art. 32 | Sec. 164.312(a) | CC6.2 | GOVERN 3.1 | 8.6 |
| Data minimization | Art. 10 | Art. 5(1)(c) | Sec. 164.502(b) | P4.2 | GOVERN 3.3 | 6.1.4 |
| Documentation | Annex IV | Art. 30 | Sec. 164.308(a)(2) | CC3.1 | GOVERN 4.1 | 7.2 |

## EU AI Act Detailed Mapping

### Risk Classification and Obligations

```
System Description
        |
        v
  Prohibited? ---------> Cannot deploy (Art. 5)
  (social scoring,
   manipulative AI,
   biometric categoriz.)
        | no
        v
  High-Risk? ----------> Conformity assessment required
  (safety components,    Risk management (Art. 9)
   critical infra,       Data governance (Art. 10)
   employment,           Technical docs (Art. 11 + Annex IV)
   essential services,   Record-keeping (Art. 12)
   law enforcement,      Transparency (Art. 13)
   migration, justice)   Human oversight (Art. 14)
        | no              Accuracy/robustness (Art. 15)
        v
  Limited Risk? -------> Transparency obligations (Art. 50)
  (chatbots, content     Disclose AI interaction
   generation,            Label AI-generated content
   emotion recognition)   Provide capability info
        | no
        v
  Minimal Risk --------> No specific obligations
  (games, spam filters)  AI literacy encouraged
```

### EU AI Act Safety Control Requirements

```yaml
eu_ai_act_requirements:
  high_risk_systems:
    risk_management:
      - Establish continuous risk management process
      - Identify known and foreseeable risks
      - Test and validate mitigation measures
      - Document residual risk acceptance
      artifacts:
        - risk_management_plan.md
        - risk_assessment_report.md
        - testing_and_validation_results.md

    data_governance:
      - Examine training data for biases
      - Ensure data relevance and representativeness
      - Implement data governance practices
      - Document data provenance
      artifacts:
        - data_specification.md
        - bias_analysis_report.md
        - data_provenance_log.md

    technical_documentation:
      - General description of system
      - Detailed design and development methodology
      - System specifications and capabilities
      - Performance benchmarks and accuracy metrics
      - Robustness and cybersecurity measures
      artifacts:
        - technical_documentation_annex_iv.md
        - model_card.md
        - system_architecture_diagram.md

    record_keeping:
      - Automatic event logging during operation
      - Log duration and intensity of use
      - Log input data and predictions
      - Enable post-hoc auditing
      artifacts:
        - logging_configuration.md
        - audit_trail_sample.md

    transparency:
      - Inform users they are interacting with AI
      - Explain system capabilities and limitations
      - Provide contact information
      artifacts:
        - transparency_statement.md
        - user_disclosure_template.md

    human_oversight:
      - Implement human review for high-risk decisions
      - Enable override or stop functionality
      - Ensure humans understand system limitations
      artifacts:
        - human_oversight_procedure.md
        - override_mechanism_design.md

    accuracy_and_robustness:
      - Define and measure accuracy metrics
      - Test robustness against adversarial inputs
      - Implement cybersecurity protections
      - Monitor for drift and degradation
      artifacts:
        - accuracy_benchmark_report.md
        - adversarial_testing_results.md
        - drift_monitoring_plan.md
```

## GDPR Safety Controls

### Key Provisions for AI Safety

```
GDPR Article | Requirement | Safety Implementation
-------------|-------------|----------------------
Art. 5(1)(c) | Data minimization | Log safety events without storing full PII; redact PII before processing
Art. 13-14   | Right to information | Disclose data processing in AI interactions; explain safety decisions
Art. 15      | Right of access | Provide users with their safety interaction history
Art. 17      | Right to erasure | Implement data deletion for safety logs on request (with compliance exceptions)
Art. 22      | Automated decisions | Human review for high-stakes AI decisions; right to not be subject to solely automated decisions
Art. 25      | Privacy by design | Design guardrails with privacy baked in; minimize data collection
Art. 30      | Records of processing | Document all AI safety processing activities
Art. 32      | Security of processing | Implement appropriate technical controls including safety measures
Art. 33      | Breach notification | Report safety incidents affecting personal data within 72 hours
Art. 35      | DPIA | Conduct Data Protection Impact Assessment covering AI safety risks
```

### GDPR Compliance Checklist for AI Safety

```
[ ] Data Protection Impact Assessment (DPIA) completed
[ ] Lawful basis documented for all data processing in safety pipeline
[ ] PII redaction implemented on input and output guardrails
[ ] Data minimization: logs store hashed/anonymized data where possible
[ ] Retention policy documented and enforced (auto-purge logs)
[ ] Right to erasure process documented (with compliance exception logic)
[ ] Automated decision-making logged with rationale
[ ] Human review available for significant automated decisions
[ ] Data processing records maintained per Art. 30
[ ] Security measures documented including guardrail configurations
[ ] Breach notification procedure includes safety incident reporting
[ ] Privacy information notice covers AI interaction data processing
```

## HIPAA Safety Controls

### Key Provisions for AI Safety

```
HIPAA Rule      | Requirement | Safety Implementation
----------------|-------------|----------------------
Privacy Rule    | Protect PHI | PHI detection and redaction in all inputs/outputs; minimum necessary standard
Security Rule   | Safeguards   | Access controls for safety logs; audit trails; integrity controls
Breach Rule     | Notification | Report breaches affecting PHI within 60 days
Enforcement Rule| Penalties   | Document safety controls: failure to protect PHI carries significant penalties

PHI Categories to Detect:
- Names and contact information
- Dates (birth, admission, discharge, death)
- Phone/fax numbers and email addresses
- Social Security Numbers and medical record numbers
- Health plan beneficiary numbers
- Account numbers and certificate/license numbers
- Vehicle identifiers and device identifiers
- URLs, IP addresses, and biometric identifiers
- Full-face photos and any other unique identifying characteristic
```

### HIPAA Compliance Checklist for AI Safety

```
[ ] Business Associate Agreement (BAA) signed with all AI vendors
[ ] PHI detection and redaction implemented on input and output
[ ] Minimum necessary standard applied to all AI interactions
[ ] Access controls: role-based access to safety logs containing PHI
[ ] Audit controls: log all access to PHI in safety pipeline
[ ] Integrity controls: prevent unauthorized alteration of safety logs
[ ] Person/entity authentication: verify user identity before processing
[ ] Security awareness training covers AI safety risks
[ ] Contingency plan: backup safety configuration and incident response
[ ] Facility access controls for servers running safety services
[ ] Device and media controls for test data containing de-identified PHI
[ ] Documentation: policies, procedures, and safety configurations retained 6 years
```

## SOC 2 Safety Controls

### Trust Service Criteria Mapping

```
SOC 2 Category | Criteria | Safety Implementation
----------------|----------|----------------------
Security       | CC6.1    | Guardrails prevent unauthorized access/modification of model behavior
Security       | CC7.1    | Threat detection: identify safety violations in real-time
Security       | CC7.2    | Monitor safety metrics and alert on anomalies
Security       | CC7.4    | Respond to safety incidents with documented procedures
Availability   | A1.1     | Guardrail high-availability: fail closed, circuit breakers
Availability   | A1.2     | Safety service monitoring and capacity planning
Processing Integrity | PI1.1 | Safety processing is complete, accurate, timely, authorized
Processing Integrity | PI1.2 | Monitor safety processing for errors and anomalies
Confidentiality | C1.1   | Identify and protect confidential information in prompts/responses
Confidentiality | C1.2   | Restrict access to safety configuration and violation data
Privacy        | P4.1    | Privacy notice covers AI interaction data
Privacy        | P4.2    | Data retention and disposal for safety logs
```

### SOC 2 Compliance Checklist for AI Safety

```
[ ] Safety controls documented in system description
[ ] Guardrails tested for effectiveness during audit period
[ ] Incident response procedure includes safety violations
[ ] Monitoring tools generate alerts for safety anomalies
[ ] Change management covers safety configuration updates
[ ] Logical access controls restrict guardrail configuration changes
[ ] Physical security for safety infrastructure
[ ] Risk assessment includes AI safety risks
[ ] Vendor management: assess AI model providers' safety practices
[ ] Penetration testing includes AI safety bypass attempts
[ ] Availability monitoring: track safety service uptime
[ ] Processing integrity: sample transactions verify guardrail correctness
```

## NIST AI Risk Management Framework

### Core Functions Mapping

```
NIST AI RMF Function | Action | Safety Implementation
----------------------|--------|----------------------
GOVERN (Govern)       | Culture, processes | Safety policy framework, roles and responsibilities, training
MAP (Map)             | Context, risks     | Threat model, risk assessment, attack surface mapping
MEASURE (Measure)     | Metrics, testing   | Bias benchmarks, red team metrics, pass rates, false positive rates
MANAGE (Manage)       | Treatment, response| Guardrails, alignment, incident response, continuous monitoring

Characteristic Mapping:
| Characteristic | Safety Implementation |
|----------------|----------------------|
| Valid and Reliable | Accuracy benchmarks, factuality checks, consistency testing |
| Safe | Guardrails, toxicity filters, prompt injection detection |
| Secure and Resilient | Red teaming, adversarial testing, circuit breakers |
| Accountable and Transparent | Audit logging, compliance documentation, transparency labels |
| Explainable and Interpretable | Decision logging for safety actions, rationale for blocks |
| Privacy-Enhanced | PII detection/redaction, data minimization |
| Fair with Harmful Bias Managed | Bias evaluation, demographic parity monitoring |
```

## ISO/IEC 42001 AI Management System

### Clause Mapping

```
ISO 42001 Clause | Requirement | Safety Implementation
------------------|-------------|----------------------
4: Context        | Determine AI system scope | Document which systems need safety controls
5: Leadership     | AI policy commitment      | Executive sponsorship for safety program
6: Planning       | Risk assessment and treatment | Threat modeling, mitigation planning
7: Support        | Resources and competence   | Safety training, tooling budget
8: Operation      | Control implementation     | Guardrails, red teaming, monitoring
9: Evaluation     | Performance assessment     | Safety metrics, penetration tests, audits
10: Improvement   | Corrective actions         | Post-incident analysis, threshold tuning
```

## Compliance Documentation Templates

### Safety Control Evidence Record

```yaml
control_evidence:
  control_id: "SAF-GUARD-001"
  control_name: "Input Prompt Injection Detection"
  framework_mappings:
    - eu_ai_act: "Art. 15 (Robustness)"
    - nist_ai_rmf: "MANAGE 2.6 (Treatment)"
    - soc2: "CC7.1 (Threat Detection)"

  implementation:
    type: "automated"
    tool: "OpenAI Moderation API + custom regex patterns"
    configuration:
      - "Regex patterns for known injection patterns"
      - "ML-based classification with 0.8 threshold"
      - "LLM-as-judge fallback for ambiguous cases"

  testing:
    last_tested: "2026-03-15"
    test_method: "Automated red team suite"
    results:
      bypass_rate: 0.02
      false_positive_rate: 0.005
    tester: "safety-automation-pipeline"

  evidence_locations:
    - "guardrails/config/input_guardrails.yaml"
    - "testing/red_team_results/2026-03-15.json"
    - "monitoring/dashboards/guardrail-performance"
```

### Compliance Matrix Template

```markdown
## AI Safety Control Compliance Matrix

| Control | Framework Requirements | Implementation Status | Evidence |
|---------|----------------------|----------------------|----------|
| Input Guardrails | EU AI Act Art. 15, SOC 2 CC6.1 | Implemented | guardrail-config.yaml |
| Output Moderation | EU AI Act Art. 15, HIPAA Sec. 164.312(b) | Implemented | moderation-logs/ |
| Bias Evaluation | EU AI Act Art. 10, NIST AI RMF MAP 2.4 | Implemented | bias-reports/ |
| Red Teaming | EU AI Act Art. 15, SOC 2 CC7.1 | Implemented | red-team-reports/ |
| Human Oversight | EU AI Act Art. 14, GDPR Art. 22 | Implemented | review-logs/ |
| Incident Response | EU AI Act Art. 20, GDPR Art. 33 | Implemented | incident-reports/ |
| Audit Logging | EU AI Act Art. 12, HIPAA Sec. 164.312(b) | Implemented | audit-trail/ |
| Access Controls | GDPR Art. 32, HIPAA Sec. 164.312(a) | Implemented | access-controls/ |
| Documentation | EU AI Act Annex IV, SOC 2 CC3.1 | Implemented | docs/ |
| Transparency | EU AI Act Art. 50, GDPR Art. 13 | Implemented | transparency-statement.md |

Review Date: 2026-04-01
Next Review: 2026-07-01
Owner: AI Safety Team
```

## Key Points
- One safety control often satisfies multiple regulatory requirements — map explicitly to avoid duplication
- EU AI Act is the most comprehensive AI-specific regulation — use its structure as a baseline
- GDPR focuses on data protection in AI interactions: minimize, log rights, enable erasure
- HIPAA requires strict PHI controls: BAA with vendors, redaction, audit trails
- SOC 2 is about system controls: guardrails as security controls, monitoring as detective controls
- NIST AI RMF and ISO 42001 provide voluntary frameworks that align with regulatory requirements
- Document which controls satisfy which frameworks in a compliance matrix
- Maintain evidence artifacts for each control (config, test results, logs)
- Review compliance mapping quarterly as regulations evolve
- Engage legal and compliance teams for definitive regulatory interpretation
