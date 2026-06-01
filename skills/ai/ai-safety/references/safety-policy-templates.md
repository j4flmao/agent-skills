# Safety Policy Templates

## Overview

Safety policy templates provide production-ready configurations for common AI safety scenarios. Each template covers a specific use case with guardrail configuration, threat model, moderation thresholds, red teaming requirements, and monitoring setup. Adapt thresholds and rules to your specific risk tolerance and regulatory context.

## Template 1: General-Purpose Chatbot

### Use Case
Open-domain conversational AI for customer-facing general chat. Moderate risk — wide topic range, potential for misuse.

### Policy Configuration

```yaml
# chatbot-safety-policy.yaml
meta:
  name: general_chatbot_safety
  version: "1.0"
  last_reviewed: "2026-01-01"
  risk_level: moderate

threat_model:
  prompt_injection:
    severity: high
    likelihood: medium
    mitigation: input guardrails + LLM detection
  jailbreak:
    severity: high
    likelihood: medium
    mitigation: pattern detection + topic restriction
  toxicity:
    severity: critical
    likelihood: low
    mitigation: output moderation + refusal
  data_leakage:
    severity: critical
    likelihood: low
    mitigation: PII filtering + rate limiting

guardrails:
  input:
    enabled: true
    flows:
      - name: toxicity_check
        provider: openai_moderation
        threshold: 0.8
        action: block
      - name: jailbreak_detection
        provider: regex_patterns
        patterns:
          - "ignore (all |previous |your )?(instructions?|rules?)"
          - "act as (DAN|unfiltered|without restrictions)"
          - "you are (now |replaced by |free from )"
        action: block
      - name: pii_detection
        provider: regex_patterns
        patterns:
          - "\\b\\d{3}-\\d{2}-\\d{4}\\b"  # SSN
          - "\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b"  # email
        action: redact
      - name: rate_limiting
        provider: sliding_window
        requests_per_minute: 30
        action: throttle

  output:
    enabled: true
    flows:
      - name: toxicity_filter
        provider: openai_moderation
        threshold: 0.7
        action: regenerate
      - name: pii_leakage
        provider: regex_patterns
        patterns:
          - "\\b\\d{3}-\\d{2}-\\d{4}\\b"
          - "\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b"
        action: redact
      - name: topic_restriction
        provider: llm_classifier
        blocked_topics:
          - illegal_activities
          - self_harm
          - weapons_manufacture
        action: block

moderation:
  category_thresholds:
    hate: 0.7
    hate_threatening: 0.5
    harassment: 0.8
    violence: 0.8
    self_harm: 0.5
    sexual: 0.8
    sexual_minors: 0.3

red_teaming:
  frequency: weekly
  automated: true
  tools: [garak, promptfoo]
  probe_categories:
    - jailbreak
    - prompt_injection
    - toxicity
    - data_leakage
  pass_threshold: 0.95

monitoring:
  metrics:
    - block_rate
    - violation_by_category
    - false_positive_rate
    - guardrail_latency
  alerting:
    slack_channel: "#safety-alerts"
    pagerduty_severity: critical
  logging:
    level: info
    retention_days: 90
```

## Template 2: Customer Support Agent

### Use Case
Bounded-domain customer support for e-commerce or SaaS. Lower risk due to narrow scope, but requires high accuracy.

### Policy Configuration

```yaml
# customer-support-safety-policy.yaml
meta:
  name: customer_support_safety
  version: "1.0"
  last_reviewed: "2026-01-01"
  risk_level: low

allowed_topics:
  - account_management
  - billing_and_payments
  - product_questions
  - troubleshooting
  - returns_and_refunds
  - shipping_and_delivery

blocked_topics:
  - medical_advice
  - legal_advice
  - financial_investment
  - mental_health_crisis
  - weapons_or_violence

guardrails:
  input:
    enabled: true
    flows:
      - name: topic_classification
        provider: llm_classifier
        allowed: *allowed_topics
        action: off_topic_response
      - name: pii_detection
        provider: regex_patterns
        patterns:
          - credit_card: "\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b"
          - ssn: "\\b\\d{3}-\\d{2}-\\d{4}\\b"
        action: redact
      - name: rate_limiting
        requests_per_minute: 20
        action: throttle

  output:
    enabled: true
    flows:
      - name: factuality_check
        provider: rag_verification
        knowledge_base: product_catalog
        threshold: 0.9
        action: flag_for_review
      - name: tone_check
        provider: llm_classifier
        required_tone: helpful_professional
        action: regenerate
      - name: pii_leakage
        provider: regex_patterns
        action: redact

red_teaming:
  frequency: monthly
  automated: true
  focus_areas:
    - topic_escape
    - prompt_injection
    - misinformation
  pass_threshold: 0.98

monitoring:
  metrics:
    - off_topic_rate
    - factuality_accuracy
    - customer_satisfaction
  human_review:
    rate: 0.05
    focus: flagged_outputs
```

## Template 3: Code Generation Assistant

### Use Case
AI coding assistant that generates, reviews, and explains code. Requires security vulnerability prevention.

### Policy Configuration

```yaml
# code-gen-safety-policy.yaml
meta:
  name: code_generation_safety
  version: "1.0"
  risk_level: moderate

guardrails:
  input:
    enabled: true
    flows:
      - name: prompt_injection
        provider: llm_classifier
        action: block
      - name: code_scope_restriction
        provider: llm_classifier
        blocked_categories:
          - malware
          - exploit_generation
          - phishing_code
          - cryptominers
          - backdoor_code
        action: block

  output:
    enabled: true
    flows:
      - name: vulnerability_scan
        provider: semgrep
        ruleset: security
        action: flag_and_explain
      - name: secret_detection
        provider: regex_patterns
        patterns:
          - api_key: "(?i)(api[_-]?key|secret|token)\\s*[=:]\\s*['\"][A-Za-z0-9_-]{16,}['\"]"
          - password: "(?i)password\\s*[=:]\\s*['\"][^'\"]+['\"]"
        action: redact_and_warn
      - name: license_compliance
        provider: license_checker
        allowed_licenses:
          - MIT
          - Apache-2.0
          - BSD-3-Clause
          - BSD-2-Clause
          - Unlicense
        action: flag_with_alternative

red_teaming:
  frequency: weekly
  probes:
    - code_injection
    - backdoor_generation
    - vulnerability_introduction
  pass_threshold: 0.98

evaluation:
  benchmarks:
    - security_eval
    - cyber_bench
  bias_checks:
    - representation_in_examples
    - language_bias_in_comments
```

## Template 4: Content Moderation System

### Use Case
Dedicated content moderation service for user-generated content. High sensitivity — must balance safety with free expression.

### Policy Configuration

```yaml
# content-moderation-policy.yaml
meta:
  name: content_moderation_system
  version: "1.0"
  risk_level: high

moderation_tiers:
  tier_1_automatic:
    description: "Clear violations — block immediately"
    threshold: 0.9
    categories:
      - child_sexual_abuse_material
      - terrorist_content
      - direct_incitement_to_violence
      - self_harm_methods
    action: block_and_escalate

  tier_2_flagged:
    description: "Potential violations — flag for human review"
    threshold: 0.7
    categories:
      - hate_speech
      - harassment
      - misinformation
      - graphic_violence
    action: flag_for_review

  tier_3_contextual:
    description: "Context-dependent — LLM-based judgment"
    threshold: 0.5
    categories:
      - satire_or_parody
      - educational_content
      - news_reporting
      - artistic_expression
    action: contextual_review

guardrails:
  input:
    flows:
      - name: image_moderation
        provider: vision_api
        action: block_if_unsafe
      - name: text_moderation
        provider: multi_layer
        layers:
          - regex_blocklist
          - ml_classifier
          - llm_judge
        action: route_by_tier

  output:
    flows:
      - name: moderation_decision_log
        provider: structured_logging
        fields:
          - content_hash
          - moderation_tier
          - category_scores
          - reviewer_decision
          - appeal_status

human_review:
  queue_management:
    max_queue_time_minutes: 15
    priority_categories:
      - self_harm: 0
      - terrorist_content: 0
      - hate_speech: 5
      - misinformation: 15
  reviewer_tools:
    - context_viewer
    - similar_content_lookup
    - policy_reference
  quality_assurance:
    random_review_rate: 0.05
    disagreement_escalation: true
```

## Template 5: Agent / Tool-Using System

### Use Case
Autonomous agent that reads and writes data via tools and APIs. High risk — action execution requires strict controls.

### Policy Configuration

```yaml
# agent-safety-policy.yaml
meta:
  name: autonomous_agent_safety
  version: "1.0"
  risk_level: critical

tool_restrictions:
  read_only_tools:
    - search
    - retrieve_document
    - read_file
    - get_weather
  write_tools:
    - send_email
    - create_file
    - update_database
    - execute_api_call
  admin_tools:  # require explicit human approval
    - delete_resource
    - modify_access_controls
    - execute_payment
    - deploy_code

guardrails:
  input:
    flows:
      - name: tool_scope_validation
        provider: schema_checker
        validate_parameters: true
        action: block_if_invalid
      - name: prompt_injection_from_tools
        provider: llm_detection
        check_tool_outputs: true
        action: strip_and_warn

  action:
    flows:
      - name: pre_execution_validation
        provider: action_verifier
        checks:
          - tool_is_allowed_for_intent
          - parameters_are_safe
          - idempotent_if_applicable
        action: block_or_confirm
      - name: rate_limiting_per_tool
        provider: sliding_window
        per_tool_limits:
          search: 30/min
          send_email: 5/min
          execute_payment: 1/min
        action: throttle
      - name: human_in_the_loop
        provider: approval_gate
        required_for:
          - admin_tools
          - high_value_transactions
          - destructive_operations
        action: wait_for_approval

  output:
    flows:
      - name: action_confirmation
        provider: structured_output
        require_confirmation: true
        action: show_before_execute
      - name: audit_logging
        provider: immutable_log
        fields:
          - timestamp
          - tool_name
          - parameters
          - result_status
          - user_id
          - approval_id

monitoring:
  real_time: true
  metrics:
    - tool_call_success_rate
    - human_approval_rate
    - blocked_actions_by_category
    - action_latency
    - tool_misuse_attempts
  alerting:
    - condition: "blocked_action_rate > 0.1"
      severity: high
      action: pagerduty
    - condition: "unapproved_write_tool_call"
      severity: critical
      action: pagerduty + security_team

human_oversight:
  approval_timeout_minutes: 15
  escalation_on_timeout: deny
  override_requires:
    - manager_approval
    - documented_reason
```

## Template 6: Healthcare Information Assistant

### Use Case
AI assistant providing general health information (not medical advice). Strict regulatory requirements.

### Policy Configuration

```yaml
# healthcare-safety-policy.yaml
meta:
  name: healthcare_info_safety
  version: "1.0"
  risk_level: high
  regulations: [HIPAA, GDPR]

guardrails:
  input:
    flows:
      - name: phi_detection
        provider: phi_classifier
        phi_categories:
          - patient_names
          - medical_record_numbers
          - health_insurance_ids
          - dates_of_service
          - contact_information
        action: block_and_warn
      - name: diagnostic_request
        provider: llm_classifier
        detect: symptom_diagnosis_requests
        action: redirect_to_professional

  output:
    flows:
      - name: medical_claim_verification
        provider: factuality_check
        source: medical_knowledge_base
        action: require_citation
      - name: disclaimer_requirement
        provider: template_check
        required_disclaimer: |
          This information is for educational purposes only and
          does not constitute medical advice. Consult a healthcare
          professional for medical concerns.
        action: append_if_missing
      - name: phi_leakage
        provider: phi_classifier
        action: redact

red_teaming:
  focus_areas:
    - medical_misinformation
    - diagnostic_inference
    - treatment_recommendation
    - phi_extraction
  pass_threshold: 0.99

compliance:
  hipaa:
    business_associate_agreement: required
    audit_controls: enabled
    access_logs: retained_6_years
  gdpr:
    data_minimization: enabled
    right_to_explanation: enabled
    retention_limit_days: 30
```

## Policy Change Log Template

```yaml
# policy-changelog.yaml
changes:
  - version: "1.1"
    date: "2026-03-15"
    author: "safety-team"
    changes:
      - "Lowered hate_speech threshold from 0.8 to 0.7 (increased FP review)"
      - "Added new prompt injection patterns from March red team findings"
      - "Added rate limiting for code generation tool calls"
    rationale: "Response to Q1 red team findings and increasing attack attempts"
    review_status: approved
    reviewer: "security-lead"
    review_date: "2026-03-16"

  - version: "1.0"
    date: "2026-01-01"
    author: "safety-team"
    changes:
      - "Initial safety policy configuration"
    rationale: "Production launch baseline"
    review_status: approved
    reviewer: "compliance-officer"
    review_date: "2026-01-02"
```

## Key Points
- Templates are starting points — tune thresholds to your specific risk tolerance
- Document every change with rationale, reviewer, and date
- Test templates against your actual use cases before production
- Review and update templates quarterly based on new attack patterns
- Version control all policy configurations for audit trail
- Each template balances safety with utility — overly restrictive policies reduce value
- Healthcare and agent templates require additional regulatory consideration
