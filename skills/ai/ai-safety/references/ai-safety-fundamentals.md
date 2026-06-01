# AI Safety Fundamentals

## What Is AI Safety

AI safety is the discipline of ensuring AI systems operate reliably, predictably, and ethically within defined boundaries. For LLMs, this means preventing harmful outputs (toxicity, misinformation), resisting adversarial inputs (prompt injection, jailbreaks), avoiding biased or discriminatory behavior, protecting user privacy, and maintaining alignment with human intent. Safety is not a single feature but a system property that must be designed, measured, and maintained across the entire model lifecycle.

## Key Concepts

### Alignment
Alignment ensures the model's goals and behaviors match what humans intend. An unaligned model might complete a task competently but in a way that causes harm (e.g., writing convincing but false information, or executing instructions literally without considering consequences). Alignment techniques include RLHF (reward model trained on human preferences then used to fine-tune the policy via PPO), DPO (direct preference optimization without a separate reward model), Constitutional AI (self-critique and revision against written principles), and KTO (optimization from binary feedback). Alignment is not binary — it exists on a spectrum and requires continuous validation.

### Guardrails
Guardrails are runtime safety checks that filter, block, or modify inputs to and outputs from an LLM. Input guardrails prevent harmful or adversarial content from reaching the model (topic restrictions, jailbreak detection, PII redaction, rate limiting). Output guardrails prevent the model from generating harmful content (toxicity filters, factuality checks, format validation, PII leakage prevention). Guardrails form the last line of defense when alignment fails and should be implemented as a multi-layer pipeline. Common frameworks: NeMo Guardrails (Colang DSL), Guardrails AI (Python validators), Lakera Guard (API-based).

### Red-Teaming
Red-teaming is systematic adversarial testing that probes a model for vulnerabilities. It simulates real-world attacks to discover weaknesses before malicious actors do. Red-teaming covers: prompt injection (breaking instruction boundaries), jailbreaks (forcing the model into unfiltered personas), toxicity generation (hate speech, harassment), data leakage (extracting training data or system prompts), bias exploitation (eliciting stereotypical outputs), and tool misuse (manipulating function calls). Red-teaming should be automated (garak, promptfoo) and manual, run continuously, and feed findings back into guardrails and alignment.

### Content Moderation
Content moderation classifies and filters content for policy violations. It operates on both inputs (blocking malicious user requests) and outputs (preventing harmful model responses). Moderation services: OpenAI Moderation API (categories: hate, harassment, violence, self-harm, sexual), Perspective API (toxicity, identity attack, threat, profanity, sexually explicit), Azure Content Safety (severity-based scoring for hate, sexual, self-harm, violence). Effective moderation uses category-specific thresholds, multi-layer pipelines, and human review for borderline and high-severity cases.

### Bias Detection
Bias detection measures whether a model treats demographic groups unfairly. Standard benchmarks: WinoBias (gender pronoun resolution), BBQ (Bias Benchmark for QA, covering race, gender, religion, age, nationality), StereoSet (stereotype consistency), Toxicity bias (unequal false positive rates across groups). Key metrics: demographic parity, equal opportunity, refusal parity. Actionable threshold: maximum disparity < 5% across any demographic group. Bias detection must run on every model version and after every alignment update.

## Safety Taxonomies

### Threat Taxonomy

```
Threat Categories:
├── Input-Level Threats
│   ├── Prompt injection: direct, indirect (via tool outputs), recursive
│   ├── Jailbreak: role-play, hypothetical, encoding, many-shot
│   ├── Data extraction: system prompt theft, training data extraction
│   └── Denial of service: many-shot attacks, infinite context loops
│
├── Output-Level Threats
│   ├── Harmful content: hate speech, violence, self-harm, sexual
│   ├── Misinformation: factual errors, conspiracy theories, hallucinations
│   ├── Bias and stereotyping: demographic, cultural, political
│   └── Privacy violations: PII leakage, confidential data exposure
│
└── System-Level Threats
    ├── Tool misuse: calling tools with malicious parameters
    ├── Privilege escalation: accessing restricted functionality
    ├── Resource abuse: excessive compute or API calls
    └── Supply chain: compromised models, poisoned training data
```

### Severity Taxonomy

```
Severity Levels:
├── CRITICAL (CVSS 9.0-10.0)
│   ├── Real-world harm possible (weapon instructions, suicide methods)
│   ├── SLA: < 1 hour to respond
│   └── Action: immediate block, escalate to security team
│
├── HIGH (CVSS 7.0-8.9)
│   ├── Policy violation (hate speech, harassment, illegal content)
│   ├── SLA: < 24 hours to respond
│   └── Action: block output, log with full context, investigate
│
├── MEDIUM (CVSS 4.0-6.9)
│   ├── Inconsistent safety behavior (refusal bypass, partial compliance)
│   ├── SLA: < 1 week to respond
│   └── Action: flag for review, update guardrails
│
├── LOW (CVSS 1.0-3.9)
│   ├── Minor edge case (verbosity in refusal, unclear boundaries)
│   ├── SLA: < 1 month to respond
│   └── Action: log, include in next red team cycle
│
└── PASS (CVSS 0.0)
    ├── Model refuses appropriately and redirects
    └── Action: no action needed, log for baseline
```

### Attack Vector Taxonomy

```
Attack Vectors:
├── Evasion: encoding (base64, hex, leetspeak), token manipulation,
│              context smuggling, multi-language, adversarial suffixes
│
├── Extraction: system prompt extraction, training data extraction,
│               tool schema probing, knowledge boundary testing
│
├── Goal Hijacking: side-stepping instructions, role-playing,
│                   hypothetical framing, authority invocation
│
├── Multi-Turn: trust-building then attack, gradual escalation,
│               context poisoning, split-payload across messages
│
├── Tool-Based: tool misuse, output injection (via tool returns),
│               schema probing, resource exhaustion
│
└── Supply Chain: model poisoning, training data contamination,
│                 dependency vulnerabilities, model theft via distillation
```

## Basic Risk Assessment

### Risk Assessment Process

```
Step 1: Identify Assets
├── What is the model used for?
├── What data does it access?
├── What actions can it take?
└── Who are the users?

Step 2: Identify Threats
├── Use threat taxonomy above
├── Review OWASP LLM Top 10
├── Check known attack patterns for your model type
└── Consult industry incident databases

Step 3: Assess Likelihood
├── How easily can the threat be executed?
├── Are there existing controls?
├── What is the attacker's motivation?
└── Have similar attacks succeeded elsewhere?

Step 4: Assess Impact
├── What is the worst-case outcome?
├── How many users are affected?
├── What is the financial/reputational cost?
└── Are there regulatory consequences?

Step 5: Determine Risk Level
└── Risk = Likelihood x Impact
    ├── Low: accept or monitor
    ├── Medium: implement controls
    ├── High: prioritize remediation
    └── Critical: immediate action required

Step 6: Define Mitigations
├── Technical: guardrails, alignment, monitoring
├── Procedural: human review, incident response
└── Governance: policies, audits, compliance
```

### Risk Matrix

```
                Impact
            Low   Med   High  Critical
Likelihood ┌─────┬─────┬─────┬─────┐
Low         │ Low │ Low │ Med │ Med │
            ├─────┼─────┼─────┼─────┤
Medium      │ Low │ Med │ Med │ High│
            ├─────┼─────┼─────┼─────┤
High        │ Med │ Med │ High│ Crit│
            ├─────┼─────┼─────┼─────┤
Critical    │ Med │ High│ Crit│ Crit│
            └─────┴─────┴─────┴─────┘
```

### Minimum Viable Safety Checklist

```
For any LLM deployment:
[ ] Threat model documented (at least 3 threat scenarios)
[ ] Input guardrails active (minimum: toxicity filter + rate limit)
[ ] Output guardrails active (minimum: toxicity filter)
[ ] Red teaming performed (minimum: automated scan with garak)
[ ] Bias check run (minimum: one benchmark on gender and race)
[ ] Monitoring in place (minimum: log blocked requests)
[ ] Incident response procedure documented
[ ] Human review channel established (minimum: email alias)
[ ] Compliance requirements identified
[ ] Safety metrics defined and baseline measured
```

## Key Points
- AI safety is a system property, not a single feature — design it from the start
- Alignment, guardrails, red-teaming, moderation, and bias detection form the core pillars
- Use threat, severity, and attack vector taxonomies to structure safety work
- Risk = Likelihood x Impact — prioritize mitigations accordingly
- Every deployment needs a minimum viable safety baseline
- Re-assess risk when model, prompt, data, or deployment context changes
- Document all safety decisions, thresholds, and rationales for audit
