# Risk Management in Delivery

## Overview

Risk management in software delivery is the systematic process of identifying, assessing, responding to, and monitoring uncertainties that could affect project objectives. Effective risk management shifts the focus from reactive firefighting to proactive planning, increasing predictability and reducing the likelihood of delivery failures.

## Risk Management Frameworks

### ISO 31000

ISO 31000 provides principles, framework, and a process for managing risk across any organization. It is principles-based rather than prescriptive.

```yaml
iso_31000:
  principles:
    - "Risk management creates and protects value"
    - "Risk management is an integral part of all organizational processes"
    - "Risk management is systematic, structured, and timely"
    - "Risk management is based on the best available information"
    - "Risk management is tailored to the organization"
    - "Risk management takes human and cultural factors into account"
    - "Risk management is transparent and inclusive"
    - "Risk management is dynamic, iterative, and responsive to change"
    - "Risk management facilitates continual improvement"

  framework:
    mandate_and_commitment: "Leadership demonstrates commitment to risk management"
    design_of_framework: "Define risk management policy, roles, accountabilities"
    implementing: "Apply risk management process across the organization"
    monitoring_and_review: "Measure framework performance against indicators"
    continual_improvement: "Act on deviations, adapt the framework"

  process:
    communication_and_consultation: "Engage stakeholders throughout"
    establishing_context: "Define internal and external parameters"
    risk_assessment:
      identification: "Find, recognize, and describe risks"
      analysis: "Understand the nature and level of risk"
      evaluation: "Compare risk levels against criteria"
    risk_treatment: "Select and implement response options"
    monitoring_and_review: "Track risks and effectiveness of treatment"
```

### COSO ERM (Enterprise Risk Management)

COSO ERM is widely used in corporate governance, linking risk management to strategy and performance.

```yaml
coso_erm:
  components:
    governance_and_culture:
      - "Board risk oversight"
      - "Operating structure"
      - "Desired culture definition"
      - "Commitment to core values"
      - "Attracting and retaining talent"

    strategy_and_objective_setting:
      - "Risk appetite definition"
      - "Alternative strategy evaluation"
      - "Business objective formulation"
      - "Risk tolerances aligned to objectives"

    performance:
      - "Risk identification"
      - "Risk severity assessment"
      - "Risk prioritization"
      - "Risk response implementation"
      - "Portfolio view of risk"

    review_and_revision:
      - "Substantial change assessment"
      - "Risk and performance review"
      - "Improvement initiatives"

    information_communication_and_reporting:
      - "Risk data management"
      - "Communication channels"
      - "Reporting on risk, culture, and performance"

  application_to_delivery:
    - "Define risk appetite for delivery (how much schedule/cost uncertainty is acceptable)"
    - "Assess risks against strategic objectives (does this risk affect strategic goals?)"
    - "Portfolio view of risks across projects (not just individual project risks)"
    - "Link risk responses to performance metrics"
```

### PMI Risk Management (PMBOK)

The Project Management Institute's risk management process is widely used in traditional and hybrid delivery.

```yaml
pmi_risk_management:
  process_groups:
    plan_risk_management:
      description: "Define approach for risk management activities"
      inputs: "Project charter, stakeholder register, org process assets"
      outputs: "Risk management plan (methodology, roles, budget, timing, scoring)"
    
    identify_risks:
      description: "Determine which risks might affect the project"
      inputs: "Risk management plan, scope baseline, schedule, cost estimates"
      outputs: "Risk register (initial entries)"
    
    perform_qualitative_risk_analysis:
      description: "Prioritize individual risks for further analysis"
      inputs: "Risk register, risk management plan"
      outputs: "Updated risk register with priority rankings"
    
    perform_quantitative_risk_analysis:
      description: "Numerically analyze the effect of identified risks"
      inputs: "Risk register, schedule/cost baselines"
      outputs: "Probabilistic analysis of project objectives"
    
    plan_risk_responses:
      description: "Develop options to reduce threats and enhance opportunities"
      inputs: "Risk register, risk management plan"
      outputs: "Risk responses, contingency plans, fallback plans"
    
    implement_risk_responses:
      description: "Execute agreed-upon risk response plans"
      inputs: "Risk register, approved change requests"
      outputs: "Change requests, project document updates"
    
    monitor_risks:
      description: "Track identified risks, monitor residual risks, identify new risks"
      inputs: "Risk register, work performance data"
      outputs: "Work performance information, change requests"
```

### FAIR Model (Factor Analysis of Information Risk)

FAIR is a quantitative risk analysis framework focused on information security but applicable to delivery risk.

```yaml
fair_model:
  core_concepts:
    loss_event_frequency:
      threat_event_frequency: "How often a threat agent acts"
      vulnerability: "Probability of successful action"
    
    probable_loss_magnitude:
      primary_loss: "Direct costs (labor, response, replacement)"
      secondary_loss: "Indirect costs (reputation, competitive disadvantage)"
    
    loss_forms:
      - "Productivity loss (delays, rework)"
      - "Response costs (investigation, remediation)"
      - "Replacement costs (rebuilding, re-architecting)"
      - "Competitive advantage loss (missed market window)"
      - "Reputational damage"

  analysis_steps:
    - "Scope the risk scenario (what, who, when, how)"
    - "Estimate probable loss event frequency"
    - "Estimate probable loss magnitude"
    - "Calculate: Annualized Loss Expectancy = Frequency × Magnitude"
    - "Compare risk to cost of mitigation (ROI analysis)"
  
  delivery_application:
    scenario: "Critical dependency fails to deliver on time"
    threat_event_frequency: 3 times per year (vendor delay history)
    vulnerability: 40% (chance the delay impacts our delivery)
    primary_loss: "$120,000 (team idle, replanning, overtime)"
    secondary_loss: "$80,000 (missed market opportunity)"
    annualized_loss_expectancy: "3 × 0.4 × ($120K + $80K) = $240,000"
```

## Risk Identification Techniques

### Brainstorming

```yaml
brainstorming:
  format: "Structured group session"
  duration: "30-60 minutes"
  participants: "Cross-functional team, stakeholders, SMEs"
  
  rules:
    - "No criticism or evaluation during ideation"
    - "Encourage wild ideas"
    - "Build on others' ideas"
    - "Quantity over quality in initial phase"
  
  process:
    - "Define the scope and context clearly"
    - "Start with prompt categories (technical, schedule, resource)"
    - "Each person contributes 1 risk per round"
    - "Record all ideas visibly (whiteboard, digital board)"
    - "After session, group and categorize"
    - "Vote or dot-vote to prioritize for analysis"
  
  facilitation_prompts:
    technical:
      - "What could break in our architecture?"
      - "What dependencies are fragile?"
      - "Where do we have unknowns?"
    schedule:
      - "What could delay our delivery?"
      - "Which tasks have the most uncertainty?"
      - "Where are our estimation gaps?"
    resource:
      - "What if a key person leaves?"
      - "What skills are missing?"
      - "What budget risk exists?"
```

### Delphi Method

```yaml
delphi_method:
  description: "Anonymous, iterative expert consensus technique"
  when_to_use: "Sensitive risks, political concerns, remote experts, bias reduction"
  
  process:
    round_1:
      - "Select panel of 8-15 experts"
      - "Distribute questionnaire anonymously"
      - "Experts list risks independently"
      - "Facilitator compiles consolidated list"
    
    round_2:
      - "Share compiled list with all experts"
      - "Each expert rates likelihood and impact"
      - "Results anonymized and summarized (median, range)"
    
    round_3:
      - "Share summary statistics with experts"
      - "Experts re-evaluate their ratings considering group input"
      - "Outliers explain their reasoning"
    
    round_4:
      - "Repeat until consensus emerges (typically 3-4 rounds)"
      - "Document final risk assessment"
  
  advantages:
    - "Reduces groupthink and anchoring bias"
    - "Handles geographically distributed experts"
    - "Surface risks others might not identify"
    - "Equal participation regardless of seniority"
  
  disadvantages:
    - "Time-consuming (weeks for multi-round)"
    - "Requires skilled facilitator"
    - "Low engagement may cause drop-out"
```

### SWOT Analysis

```yaml
swot_risk_identification:
  method: "Analyze Strengths, Weaknesses, Opportunities, Threats"
  purpose: "Identify internal and external risks through strategic analysis"
  
  quadrants:
    strengths:
      focus: "Internal positive attributes"
      risk_implication: "How could strengths be lost or undermined?"
      examples:
        - "Strong senior engineers → risk of turnover"
        - "Good testing infrastructure → risk of degradation without maintenance"
    
    weaknesses:
      focus: "Internal negative attributes"
      risk_implication: "How could weaknesses cause failure?"
      examples:
        - "Knowledge silos → bus factor risk"
        - "Manual deployment → deployment failure risk"
    
    opportunities:
      focus: "External positive conditions"
      risk_implication: "What risks exist in pursuing opportunities?"
      examples:
        - "New technology adoption → integration risks"
        - "Market expansion → scope creep risk"
    
    threats:
      focus: "External negative conditions"
      risk_implication: "What external factors could derail the project?"
      examples:
        - "Regulatory changes → compliance risk"
        - "Competitor releases → market timing risk"
```

### Assumption Analysis

```yaml
assumption_analysis:
  description: "Identify and validate assumptions — assumptions are hidden risks"
  process:
    - "List every explicit and implicit assumption in the plan"
    - "Classify assumptions by stability: solid, plausible, optimistic, speculative"
    - "Test each assumption — is it valid?"
    - "For unstable assumptions, identify the risk if the assumption is wrong"
  
  common_delivery_assumptions:
    - "All team members will be available as planned"
    - "Third-party APIs will meet their documented SLAs"
    - "Requirements are stable after sprint planning"
    - "Testing environments will be available when needed"
    - "Stakeholders will provide timely feedback"
    - "The chosen technology will perform as expected"
    - "No significant organizational changes during delivery"
    - "Budget will not be reduced mid-project"
  
  assumption_testing_techniques:
    - "Spike/Proof-of-Concept to validate technical assumptions"
    - "Stakeholder interviews to validate priority assumptions"
    - "Historical data analysis to validate estimation assumptions"
    - "Environment provisioning in advance to validate availability"
    - "Prototyping to validate design assumptions with users"
```

### Risk Checklists

```yaml
risk_checklists:
  description: "Standardized lists of common risks across similar projects"
  value: "Ensures consistent coverage, reduces cognitive bias toward recent events"
  
  delivery_risk_checklist_example:
    scope_risks:
      - "Are requirements complete and unambiguous?"
      - "Are there hidden dependencies between requirements?"
      - "Is there a clear Definition of Done for each item?"
      - "Is the MVP scope clearly defined?"
      - "Are there known or expected scope changes?"
    
    schedule_risks:
      - "Are estimates based on historical data?"
      - "Are dependencies mapped and dated?"
      - "Is there slack in the schedule?"
      - "Are critical path items identified?"
      - "Is there buffer for unknowns?"
    
    technical_risks:
      - "Is the technology stack proven or novel?"
      - "Are integration points documented?"
      - "Are performance requirements validated?"
      - "Is there a rollback plan for each deployment?"
      - "Are security requirements addressed?"
    
    resource_risks:
      - "Are key personnel identified with backup?"
      - "Are skill gaps identified and addressed?"
      - "Is the budget realistic and approved?"
      - "Are external vendor commitments secured?"
      - "Are environment/resource requirements met?"
```

## Risk Categories

```yaml
risk_categories:
  technical:
    description: "Risks related to technology, architecture, and engineering"
    examples:
      - "Performance or scalability limitations"
      - "Technology integration complexity"
      - "Data migration errors or data loss"
      - "Security vulnerabilities"
      - "Technical debt accumulation"
      - "Architecture not meeting non-functional requirements"
  
  schedule:
    description: "Risks affecting timeline and delivery milestones"
    examples:
      - "Underestimation of effort"
      - "Dependency delays"
      - "Unrealistic deadlines"
      - "Scope creep"
      - "Sequential bottlenecks"
      - "Rework from changing requirements"
  
  cost:
    description: "Risks affecting project budget and financials"
    examples:
      - "Budget cuts or reallocation"
      - "Unforeseen expenses (tools, licenses, infrastructure)"
      - "Cost overruns from delays"
      - "Currency fluctuations (for global teams)"
      - "Vendor cost increases"
  
  resource:
    description: "Risks related to people, skills, and capacity"
    examples:
      - "Team member turnover"
      - "Key person dependency (bus factor)"
      - "Skill gaps in critical areas"
      - "Availability conflicts (PTO, support duty)"
      - "Hiring delays for planned roles"
      - "Health or personal emergencies"
  
  operational:
    description: "Risks from processes, tools, and day-to-day operations"
    examples:
      - "Inefficient or broken processes"
      - "Tooling limitations or failures"
      - "Environment availability issues"
      - "Poor code quality processes"
      - "Inadequate testing coverage"
      - "Deployment process failures"
  
  market:
    description: "Risks from market conditions and competition"
    examples:
      - "Market timing — too early or too late"
      - "Competitor releases superseding our features"
      - "Changing customer needs or preferences"
      - "Economic downturn affecting adoption"
      - "Partner or channel dependency"
  
  legal_regulatory:
    description: "Risks from laws, regulations, and compliance"
    examples:
      - "Changing data protection laws (GDPR, CCPA)"
      - "Industry-specific regulations (HIPAA, PCI DSS, SOX)"
      - "Licensing compliance for third-party components"
      - "Accessibility compliance requirements"
      - "Export control or trade restrictions"
  
  security:
    description: "Risks from security threats and vulnerabilities"
    examples:
      - "Data breaches or leaks"
      - "Supply chain attacks (compromised dependencies)"
      - "Access control weaknesses"
      - "Insufficient audit logging for security events"
      - "Zero-day vulnerabilities in dependencies"
```

## Risk Assessment

### Probability × Impact Matrix

```yaml
probability_impact_matrix:
  description: "Qualitative assessment combining likelihood and consequence"
  
  probability_scale:
    1_rare: "< 10% — only in exceptional circumstances"
    2_unlikely: "10-25% — could occur at some point"
    3_possible: "25-50% — might occur"
    4_likely: "50-75% — will probably occur"
    5_almost_certain: "> 75% — expected to occur"
  
  impact_scale:
    1_negligible: "Minimal impact — < 1% budget/schedule impact"
    2_minor: "Minor impact — 1-5% budget/schedule impact"
    3_moderate: "Moderate impact — 5-15% budget/schedule impact"
    4_major: "Major impact — 15-30% budget/schedule impact"
    5_critical: "Critical impact — > 30% budget/schedule impact, or project failure"
  
  heat_map:
    cells:
      - probability: 5  # Almost certain
        impacts:
          1: "Medium"    # 5×1 = 5
          2: "High"      # 5×2 = 10
          3: "High"      # 5×3 = 15
          4: "Critical"  # 5×4 = 20
          5: "Critical"  # 5×5 = 25
      
      - probability: 4  # Likely
        impacts:
          1: "Low"       # 4×1 = 4
          2: "Medium"    # 4×2 = 8
          3: "High"      # 4×3 = 12
          4: "High"      # 4×4 = 16
          5: "Critical"  # 4×5 = 20
      
      - probability: 3  # Possible
        impacts:
          1: "Low"       # 3×1 = 3
          2: "Medium"    # 3×2 = 6
          3: "Medium"    # 3×3 = 9
          4: "High"      # 3×4 = 12
          5: "High"      # 3×5 = 15
      
      - probability: 2  # Unlikely
        impacts:
          1: "Low"       # 2×1 = 2
          2: "Low"       # 2×2 = 4
          3: "Medium"    # 2×3 = 6
          4: "Medium"    # 2×4 = 8
          5: "High"      # 2×5 = 10
      
      - probability: 1  # Rare
        impacts:
          1: "Low"       # 1×1 = 1
          2: "Low"       # 1×2 = 2
          3: "Low"       # 1×3 = 3
          4: "Medium"    # 1×4 = 4
          5: "Medium"    # 1×5 = 5

  response_guidance_by_rating:
    critical_score_15_25:
      response: "Immediate action required. Escalate to project sponsor. Implement mitigation plan within 48 hours."
      monitoring: "Daily review"
    high_score_10_14:
      response: "Active mitigation required. Assign owner. Plan and execute response within sprint."
      monitoring: "Weekly review"
    medium_score_5_9:
      response: "Monitor and plan response. Assign owner for tracking."
      monitoring: "Bi-weekly review during regular risk review"
    low_score_1_4:
      response: "Accept or monitor. Include in risk register for awareness."
      monitoring: "Monthly review or per project milestone"
```

### Qualitative vs. Quantitative Analysis

```yaml
qualitative_analysis:
  description: "Subjective assessment using ordinal scales"
  when_to_use: "Early-stage, limited data, quick triage, prioritization"
  outputs: "Risk ranking, priority list, heat map"
  techniques:
    - "Probability × Impact matrix"
    - "Risk urgency assessment"
    - "Risk categorization by source"
    - "Comparative risk ranking"
  advantages: "Fast, low cost, requires minimal data"
  limitations: "Subjective, imprecise, rater bias, ordinal scales don't sum"

quantitative_analysis:
  description: "Numerical analysis of risk impact on project objectives"
  when_to_use: "High-stakes decisions, complex projects, sufficient data"
  outputs: "Probabilistic forecasts, confidence intervals, sensitivity analysis"
  techniques:
    - "Monte Carlo simulation"
    - "Decision tree analysis"
    - "Sensitivity analysis (tornado diagram)"
    - "Expected Monetary Value (EMV)"
    - "Three-point estimation with PERT"
  advantages: "Objective, precise, supports data-driven decisions"
  limitations: "Time-consuming, requires data and expertise, false precision risk"
```

### Risk Scoring

```yaml
risk_scoring:
  single_dimensional:
    formula: "Risk Score = Probability × Impact"
    example:
      probability: 4  (likely)
      impact: 3  (moderate)
      score: 12  (high risk)
  
  multi_dimensional:
    formula: "Risk Score = (P × I) + (U × I) where U is Uncertainty/Detectability"
    rationale: "Harder-to-detect risks deserve higher priority"
    example:
      probability: 3
      impact: 4
      uncertainty_detectability: 3 (hard to detect)
      score: "(3 × 4) + (3 × 4) = 24"
  
  weighted:
    formula: "Risk Score = w₁P × w₂I (where w are organizational weights)"
    example:
      cost_weight: 1.5 (organization is cost-sensitive)
      schedule_weight: 1.0
      quality_weight: 1.2
      score: cost_impact × 1.5 + schedule_impact × 1.0 + quality_impact × 1.2
  
  scoring_tips:
    - "Use consistent scales across all risks for comparability"
    - "Score based on inherent risk (before mitigation), not residual risk"
    - "Document rationale for each score to ensure traceability"
    - "Review and recalibrate scores periodically as conditions change"
    - "Avoid false precision — whole numbers are sufficient for qualitative scoring"
```

## Quantitative Risk Analysis Techniques

### Monte Carlo Simulation

```yaml
monte_carlo:
  description: "Run thousands of simulations using probability distributions for uncertain variables"
  
  steps:
    - "Build a model of project variables (task durations, costs, dependencies)"
    - "Assign probability distributions to uncertain variables"
    - "Run simulation (1,000-10,000 iterations)"
    - "Aggregate results into probability distribution of outcomes"
    - "Report: P10, P50, P90 values for completion date or cost"
  
  typical_distributions:
    triangular:
      params: "Min, Most Likely, Max"
      use_case: "Expert estimates with limited data"
      example: "Task A: 5d, 8d, 14d"
    
    pert_beta:
      params: "Min, Most Likely, Max (weighted: (Min + 4×ML + Max) / 6)"
      use_case: "More realistic than triangular — tails are thinner"
      example: "Task B: (5 + 4×8 + 14) / 6 = 8.5d"
    
    normal:
      params: "Mean, Standard Deviation"
      use_case: "Historical data with normal variation"
      example: "Task C: mean 10d, σ 2d"
    
    uniform:
      params: "Min, Max (equal probability within range)"
      use_case: "High uncertainty, no mode known"
      example: "Integration testing: 5-15d"
  
  simulation_output:
    example: "Project completion date simulation (10,000 runs)"
    p10: "June 15 (10% chance of completing by this date)"
    p50: "July 8 (50% chance — the median)"
    p90: "August 2 (90% chance — use this for commitments)"
    
  python_implementation:
    description: "Simple Monte Carlo for project duration"
    code: |
      ```python
      import random
      import statistics
      
      
      def triangular(min_val: float, most_likely: float, max_val: float) -> float:
          """Sample from triangular distribution."""
          u = random.random()
          fc = (most_likely - min_val) / (max_val - min_val)
          if u < fc:
              return min_val + (u * (max_val - min_val) * (most_likely - min_val)) ** 0.5
          else:
              return max_val - ((1 - u) * (max_val - min_val) * (max_val - most_likely)) ** 0.5
      
      
      def run_monte_carlo(tasks: list[dict], iterations: int = 10000):
          """Run Monte Carlo simulation on project tasks."""
          results = []
          for _ in range(iterations):
              total = 0
              for task in tasks:
                  total += triangular(task["min"], task["ml"], task["max"])
              results.append(total)
          
          return {
              "p10": round(sorted(results)[int(iterations * 0.1)], 1),
              "p50": round(statistics.median(results), 1),
              "p90": round(sorted(results)[int(iterations * 0.9)], 1),
              "mean": round(statistics.mean(results), 1),
              "stdev": round(statistics.stdev(results), 1),
          }
      
      
      # Example tasks
      tasks = [
          {"name": "Backend API", "min": 10, "ml": 15, "max": 25},
          {"name": "Frontend UI", "min": 8, "ml": 12, "max": 20},
          {"name": "Integration", "min": 5, "ml": 8, "max": 15},
          {"name": "Testing", "min": 5, "ml": 10, "max": 18},
          {"name": "Deployment", "min": 2, "ml": 3, "max": 5},
      ]
      
      result = run_monte_carlo(tasks)
      print(f"P10: {result['p10']} days")
      print(f"P50: {result['p50']} days")
      print(f"P90: {result['p90']} days")
      print(f"Mean: {result['mean']} days")
      print(f"Std Dev: {result['stdev']} days")
      ```
```

### Decision Trees

```yaml
decision_trees:
  description: "Evaluate alternative courses of action under uncertainty"
  
  calculation:
    expected_monetary_value_emv: "Σ (Probability of outcome × Value of outcome)"
    decision_criterion: "Choose the option with highest EMV (for opportunities) or lowest expected cost (for threats)"
  
  build_tree:
    - "Decision node: choices available"
    - "Chance node: uncertain outcomes with probabilities"
    - "End node: value ($, days, quality metric)"
    - "Prune dominated branches (inferior choices)"
  
  decision_tree_example:
    scenario: "Build vs. Buy decision for payment integration"
    
    build_option:
      cost: "$200,000"
      outcome_success_70:
        probability: 0.7
        value: "$500,000"
      outcome_delayed_20:
        probability: 0.2
        value: "$300,000"
      outcome_failed_10:
        probability: 0.1
        value: "$0 (revert to buy)"
      emv: "(0.7 × $500K) + (0.2 × $300K) + (0.1 × $0) = $410K"
      net_emv: "$410K - $200K = $210K"
    
    buy_option:
      cost: "$350,000 (licensing + integration)"
      outcome_works_90:
        probability: 0.9
        value: "$500,000"
      outcome_limited_10:
        probability: 0.1
        value: "$300,000"
      emv: "(0.9 × $500K) + (0.1 × $300K) = $480K"
      net_emv: "$480K - $350K = $130K"
    
    decision: "Choose Build (net EMV $210K > $130K)"
    sensitivity: "If build success probability drops below 55%, Buy becomes better"
```

### Sensitivity Analysis

```yaml
sensitivity_analysis:
  description: "Identify which variables have the most impact on project outcomes"
  
  tornado_diagram:
    method: "Vary each variable independently from low to high; observe effect on target"
    output: "Ranked bars showing each variable's influence"
    interpretation: "Focus risk management on top-ranked variables"
  
  steps:
    - "Identify key assumptions and variables"
    - "Define range for each variable (pessimistic, expected, optimistic)"
    - "Run model varying one variable at a time"
    - "Measure impact on target outcome (cost, schedule)"
    - "Rank variables by swing (difference between pessimistic and optimistic outcome)"
    - "Visualize as tornado diagram (horizontal bars)"
  
  example:
    project_target: "Delivery date"
    variables:
      api_integration:
        optimistic: "2 weeks"
        expected: "4 weeks"
        pessimistic: "10 weeks"
        swing: "8 weeks"
      
      team_capacity:
        optimistic: "100% available"
        expected: "85% available"
        pessimistic: "60% available"
        swing: "6 weeks"
      
      requirements_stability:
        optimistic: "No changes"
        expected: "10% change"
        pessimistic: "30% change"
        swing: "5 weeks"
      
      testing_environment:
        optimistic: "Available immediately"
        expected: "2 week wait"
        pessimistic: "8 week wait"
        swing: "4 weeks"
    
    ranking:
      1: "api_integration (8 weeks swing) — focus risk response here"
      2: "team_capacity (6 weeks swing)"
      3: "requirements_stability (5 weeks swing)"
      4: "testing_environment (4 weeks swing)"
```

## Risk Response Planning

### Response Strategies for Threats

```yaml
threat_response_strategies:
  avoid:
    description: "Eliminate the threat entirely"
    approach: "Change plan, scope, or technology to remove the risk"
    example: "Choose proven technology instead of cutting-edge to avoid unknown performance risks"
    when_to_use: "High-probability, high-impact risks with feasible alternatives"
    cost: "Often requires scope/timeline changes"
  
  mitigate:
    description: "Reduce probability or impact to an acceptable level"
    approach: "Proactive actions to reduce likelihood or consequences"
    examples:
      - "Add testing to reduce defect probability"
      - "Cross-train to reduce bus factor impact"
      - "Build in slack to reduce schedule overrun impact"
    when_to_use: "Risks that can't be avoided but can be meaningfully reduced"
    cost: "Invest now to avoid larger costs later"
  
  transfer:
    description: "Shift the risk to a third party"
    approach: "Contract, insurance, warranty, or outsourcing"
    examples:
      - "Fixed-price contract with vendor (transfers cost overrun risk)"
      - "Cyber insurance for breach recovery costs"
      - "SaaS instead of custom build (transfers operational risk)"
    when_to_use: "Risk is better managed by an external party"
    cost: "Premium paid to the accepting party"
    note: "Transfer doesn't eliminate risk — it changes who bears the financial impact"
  
  accept:
    description: "Acknowledge the risk and take no proactive action"
    types:
      active: "Contingency plan in place, monitor for triggers"
      passive: "No action — deal with it if it occurs"
    when_to_use: "Low-probability or low-impact risks, cost of response exceeds expected loss"
    requirement: "Document the decision and rationale"
```

### Response Strategies for Opportunities

```yaml
opportunity_response_strategies:
  exploit:
    description: "Ensure the opportunity is realized"
    approach: "Allocate resources to capture the opportunity"
    example: "Assign best engineers to accelerate a high-value feature to market"
    when_to_use: "High-value opportunity with clear path to capture"
  
  enhance:
    description: "Increase probability or impact of the opportunity"
    approach: "Optimize conditions and remove barriers"
    example: "Run a spike to validate a performance optimization early"
    when_to_use: "Opportunity can be amplified with reasonable effort"
  
  share:
    description: "Allocate ownership to a third party best able to capture it"
    approach: "Partner, joint venture, or risk-sharing contract"
    example: "Partner with a platform provider to accelerate market entry"
    when_to_use: "External party has better capability to capture the opportunity"
  
  accept:
    description: "Be willing to take advantage if it occurs naturally"
    approach: "No proactive pursuit, but prepared to capitalize"
    example: "Ready to scale up if user adoption exceeds projections"
    when_to_use: "Low-cost, low-effort opportunity with uncertain outcome"
```

### Contingency Plans

```yaml
contingency_plans:
  description: "Pre-planned responses triggered when a risk materializes"
  
  components:
    trigger_condition: "Specific, measurable event that activates the plan"
    response_actions: "Step-by-step actions to execute"
    trigger_owner: "Person who monitors and declares the trigger"
    timeline: "When the response must be executed"
    budget: "Pre-approved contingency budget"
  
  examples:
    risk: "Vendor misses delivery deadline by > 2 weeks"
    trigger: "Vendor confirms delay > 14 days"
    actions:
      - "Activate fallback vendor (pre-qualified)"
      - "Apply schedule buffer to dependent tasks"
      - "Escalate to vendor management for SLA discussion"
    owner: "Procurement lead"
    budget: "$50,000 (contractual penalty not covering full impact)"
    
    risk: "Key engineer leaves mid-project"
    trigger: "Resignation notice received"
    actions:
      - "Contractor (pre-identified) starts within 5 days"
      - "Knowledge transfer sprint (remaining team)"
      - "Cross-trained team member backfills critical path items"
    owner: "Engineering manager"
    budget: "$80,000 (contractor + KT overhead)"
```

## Risk Monitoring and Control

### Risk Register

```yaml
risk_register_template:
  purpose: "Central repository for all identified risks"
  update_frequency: "At minimum, every sprint/iteration planning"
  
  fields:
    risk_id: "RISK-001 — unique identifier"
    date_identified: "YYYY-MM-DD"
    category: "technical | schedule | cost | resource | operational | market | legal | security"
    description: "Clear, specific description of the risk event"
    probability: "1-5 (qualitative) or percentage"
    impact: "1-5 (qualitative) or $/days"
    risk_score: "P × I (calculated)"
    risk_rating: "Low | Medium | High | Critical"
    response_strategy: "Avoid | Mitigate | Transfer | Accept"
    mitigation_actions: "Specific actions taken or planned"
    contingency_plan: "If risk materializes, we will..."
    owner: "Person accountable for monitoring and response"
    status: "Open | Monitoring | Mitigated | Closed"
    last_reviewed: "YYYY-MM-DD"
    trend: "Increasing | Stable | Decreasing"
  
  risk_register_example:
    - risk_id: "RISK-001"
      date_identified: "2026-01-15"
      category: "technical"
      description: "Third-party payment API may not support our volume requirements"
      probability: 4
      impact: 4
      risk_score: 16
      risk_rating: "Critical"
      response: "Mitigate"
      mitigation: "Run load tests in sandbox, implement queuing layer"
      contingency: "Activate backup payment provider (pre-contracted)"
      owner: "Backend Lead"
      status: "Mitigating"
      trend: "Decreasing"
    
    - risk_id: "RISK-002"
      date_identified: "2026-01-20"
      category: "resource"
      description: "QA engineer may be on leave during critical testing phase"
      probability: 3
      impact: 3
      risk_score: 9
      risk_rating: "Medium"
      response: "Mitigate"
      mitigation: "Cross-train developer on testing procedures by Feb 1"
      contingency: "Contract QA agency for 3-week coverage"
      owner: "Scrum Master"
      status: "Monitoring"
      trend: "Stable"
```

### Risk Review Cadence

```yaml
risk_review_cadence:
  sprint_planning:
    frequency: "Every 2 weeks"
    duration: "15 minutes"
    participants: "Team + Scrum Master + PO"
    agenda:
      - "Review open risks in risk register"
      - "Add new risks identified during sprint"
      - "Close risks that are no longer relevant"
      - "Update probability/impact for changed risks"
      - "Review effectiveness of current mitigations"
  
  project_risk_review:
    frequency: "Monthly"
    duration: "30-60 minutes"
    participants: "PM, Tech Lead, Stakeholders, Risk Owners"
    agenda:
      - "Review all open risks"
      - "Assess top 5 risks in detail"
      - "Review mitigation progress"
      - "Update risk trends and scores"
      - "Identify new systemic risks"
      - "Review risk response budget"
  
  management_risk_review:
    frequency: "Quarterly"
    duration: "60 minutes"
    participants: "Executive sponsor, PMO, portfolio managers"
    agenda:
      - "Portfolio-level risk heat map"
      - "Top 10 organizational risks"
      - "Risk budget status"
      - "Risk culture and process health check"
      - "Escalated items requiring executive decision"
  
  risk_triggers:
    description: "Pre-defined events that trigger immediate risk review"
    triggers:
      - "Scope change > 10%"
      - "Schedule variance > 15%"
      - "Budget variance > 10%"
      - "Key team member departure"
      - "Major dependency failure"
      - "Security incident"
      - "Regulatory change affecting delivery"
```

## Delivery Risk Areas

### Scope Creep

```yaml
scope_creep:
  description: "Uncontrolled expansion of project scope without corresponding adjustments to time, cost, or resources"
  
  causes:
    - "Unclear or incomplete requirements at project start"
    - "Stakeholders adding features without prioritization trade-offs"
    - "Gold-plating — teams adding unrequested features"
    - "Yes culture — inability to say no to requests"
    - "No change control process"
    - "Requirements evolving without re-estimation"
  
  detection_signals:
    - "Story count increases sprint over sprint"
    - "Average story size increases (split less)"
    - "Estimate-to-actual ratio degrades"
    - "Sprint goal consistently missed"
    - "New stories added mid-sprint"
    - "Team reports pressure to take on more"
  
  prevention:
    - "Clear, signed-off MVP scope"
    - "Change control board for scope changes"
    - "Visible trade-offs: 'What do you want to de-prioritize?'"
    - "Time-boxed sprints enforce scope discipline"
    - "MoSCoW prioritization (Must, Should, Could, Won't)"
    - "Regular stakeholder demos to validate direction"
  
  response:
    immediate: "Pause new scope, assess cumulative impact"
    short_term: "Escalate with options: descope, extend, add resources"
    long_term: "Implement change control process, educate stakeholders"
```

### Misaligned Expectations

```yaml
misaligned_expectations:
  description: "Different understanding of what will be delivered, when, and at what quality"
  
  common_misalignments:
    - "Stakeholder expects all features by launch; PM expects phased rollout"
    - "Business expects 100% bug-free; engineering expects known issues in backlog"
    - "Stakeholder expects daily updates; PM provides weekly reports"
    - "Customer expects custom UX; team delivers template-based UX"
    - "Management expects fixed date; team delivers only with scope flexibility"
  
  prevention:
    - "Stakeholder alignment workshop at project kickoff"
    - "Written project charter with explicit scope, timeline, and constraints"
    - "Regular demos of working software (not slide decks)"
    - "Inclusive language: commitments vs. estimates vs. targets"
    - "Visual roadmap with confidence levels (committed, target, stretch)"
  
  alignment_techniques:
    expectation_document:
      description: "One-page document defining what is and isn't in scope"
      sections: "In scope, Out of scope, Assumptions, Dependencies, Constraints"
    
    working_agreement:
      description: "Explicit agreement on collaboration model"
      items:
        - "Communication frequency and channels"
        - "Decision escalation path"
        - "Change request process"
        - "Acceptance criteria standards"
        - "Definition of Done"
```

### Technology Uncertainty

```yaml
technology_uncertainty:
  description: "Lack of knowledge about how a technology will perform in the target environment"
  
  sources:
    - "New/unproven technology stack"
    - "Novel architecture patterns"
    - "Scale not previously tested"
    - "Integration with poorly documented systems"
    - "Team unfamiliarity with chosen technology"
    - "Rapidly evolving technology with breaking changes"
  
  risk_reduction_techniques:
    spike_proof_of_concept:
      description: "Time-boxed investigation to answer specific questions"
      approach: "Allocate 1-2 sprints for critical unknowns before committing to full build"
      output: "Working prototype, performance data, architectural decision record"
    
    vertical_slice:
      description: "Build a thin, end-to-end slice of the system"
      approach: "Validate all layers (DB, API, UI) with a single small feature"
      benefit: "Exposes integration risks early; validates architecture decisions"
    
    technology_radar:
      description: "Categorize technologies by adoption level"
      categories:
        adopt: "Proven, recommended for use"
        trial: "Promising, use cautiously with monitoring"
        assess: "Worth exploring — allocate time for spike"
        hold: "Known issues, avoid or limit use"
    
    progressive_exposure:
      description: "Introduce new technology gradually"
      phases:
        - "Isolated POC (dev environment, small scope)"
        - "Limited production use (low-risk feature, monitored)"
        - "Expanded adoption (main feature set, with rollback plan)"
        - "Full adoption (default standard, team trained)"
  
  estimation_uncertainty_cone:
    description: "Uncertainty decreases as the project progresses"
    early_discovery: "-50% to +100%"
    after_spec: "-25% to +50%"
    after_design: "-15% to +30%"
    after_first_sprint: "-10% to +15%"
    mid_project: "-5% to +10%"
    late_project: "-2% to +5%"
    implication: "Don't treat early estimates as commitments — communicate uncertainty range"
```

## Estimation Risk

### Sources of Estimation Uncertainty

```yaml
estimation_uncertainty:
  planning_fallacy:
    description: "Systematic tendency to underestimate task duration despite knowing similar tasks took longer"
    psychology: "Optimism bias, focusing on best-case scenarios, ignoring past experience"
    mitigation:
      - "Reference class forecasting (compare to similar projects)"
      - "Pre-mortem: 'Assume the project finishes late — why?'"
      - "Use historical actuals, not estimates, for planning"
      - "Three-point estimation with explicit best/worst cases"
  
  overconfidence_bias:
    description: "Overestimating accuracy of estimates"
    research: "When people say 90% confident, they're right only 50-70% of the time"
    mitigation:
      - "Calibrate confidence through estimation feedback loops"
      - "Require rationale for estimates, not just numbers"
      - "Independent estimates from multiple people, then discuss differences"
      - "Track estimate accuracy and provide regular feedback to estimators"
  
  anchoring:
    description: "First number mentioned disproportionately influences final estimate"
    sources:
      - "Stakeholder stating a deadline upfront"
      - "Previous project's timeline suggested as starting point"
      - "Budget-driven estimation (inverse planning)"
    mitigation:
      - "Deliberate initial estimates before revealing constraints"
      - "Planning Poker (simultaneous reveal to prevent anchoring)"
      - "Separate estimation from negotiation"
      - "Reframe: ask 'how long will this take?' before 'can we do it by X?'"
  
  availability_bias:
    description: "Overweighting recent or memorable experiences"
    example: "Remembering one easy integration and underestimating all integrations"
    mitigation:
      - "Systematic checklists covering all work types"
      - "Historical data normalized by project complexity"
      - "Estimation based on Work Breakdown Structure, not intuition"
```

### Reference Class Forecasting

```yaml
reference_class_forecasting:
  description: "Daniel Kahneman's method — use actual outcomes from similar projects instead of internal estimates"
  
  process:
    step_1: "Identify a reference class of comparable projects"
      - "Same technology type (e.g., 'microservices migration')"
      - "Similar scope and complexity"
      - "Same domain/industry if possible"
    
    step_2: "Obtain statistical data for the reference class"
      - "Duration: mean, median, standard deviation"
      - "Cost overruns: average overrun percentage"
      - "Common causes of delay"
    
    step_3: "Adjust for specific project differences"
      - "Team experience level"
      - "Organizational maturity"
      - "Technology maturity"
    
    step_4: "Use reference class distribution as baseline estimate"
      - "Replace internal estimate with reference class prediction"
      - "Represent as range, not single point"
  
  example:
    reference_class: "20 web application rebuilds in our organization"
    data:
      average_duration: "8 months"
      standard_deviation: "3 months"
      p25_p75_range: "6-10 months"
      common_delays: "Data migration (80%), API integration (70%)"
    
    our_project_estimate:
      internal: "4 months (planning fallacy)"
      reference_class: "6-10 months (P25-P75)"
      adjusted: "7-11 months (team is less experienced than reference)"
    
    action: "Present reference class estimate alongside internal estimate to decision-makers"
```

## Dependency Risks

```yaml
dependency_risks:
  third_party_dependencies:
    description: "Risks from external vendors, open-source libraries, and partner APIs"
    
    categories:
      vendor_delivery:
        description: "Vendor fails to deliver on time or to specification"
        mitigation:
          - "Fixed-price contracts with penalty clauses"
          - "Regular vendor milestone reviews"
          - "Pre-qualified backup vendors"
          - "Acceptance testing period in contract"
      
      api_stability:
        description: "External API changes, deprecates, or has breaking changes"
        mitigation:
          - "API version pinning"
          - "Contract tests against external API"
          - "Adapter pattern to isolate external dependency"
          - "Monitoring for API deprecation notices"
      
      library_vulnerability:
        description: "Critical vulnerability discovered in dependency"
        mitigation:
          - "Software Bill of Materials (SBOM)"
          - "Automated dependency scanning in CI"
          - "Patch SLA within 48 hours for critical CVEs"
          - "Minimize dependency count"
    
    vendor_risk_assessment:
      dimensions:
        financial_health: "Will the vendor exist in 12 months?"
        support_quality: "Are support SLAs being met?"
        roadmap_alignment: "Is the vendor's direction aligned with ours?"
        vendor_lock_in: "How hard is it to switch?"
        security_posture: "Does the vendor meet our security requirements?"
  
  cross_team_dependencies:
    description: "Internal dependencies between teams in the same organization"
    
    coordination_patterns:
      shared_backlog:
        description: "Teams pull from same backlog, pick up items after integration"
        risk: "Integration delays, last-minute conflicts"
        mitigation: "Shared Definition of Done, early and frequent integration"
      
      producer_consumer:
        description: "Team A produces something Team B consumes"
        risk: "Team A delays blocks Team B"
        mitigation: "Contract-first development, mock interfaces, buffer time"
      
      shared_resource:
        description: "Teams compete for same limited resource (environment, expert, tool)"
        risk: "Contention, queuing, delays"
        mitigation: "Scheduling, self-service resources, reservation system"
    
    dependency_management_practices:
      - "PI Planning dependency board with clear owner and due date per dependency"
      - "Weekly dependency sync between dependent teams"
      - "Consumer-driven contracts for API dependencies"
      - "Mock/simulated interfaces for parallel development"
      - "Integration testing environment available early"
      - "Feature flags to decouple deployment from integration completion"
```

## Resource Risks

```yaml
resource_risks:
  staffing_changes:
    description: "Unexpected changes in team composition"
    
    types:
      turnover:
        description: "Voluntary or involuntary departure of team members"
        impact: "Knowledge loss, hiring cost, ramp-up time"
        mitigation:
          - "Knowledge sharing as part of Definition of Done"
          - "Pair programming and mob programming"
          - "Cross-training in critical areas"
          - "Documentation of architecture decisions and system design"
          - "Competitive compensation and retention programs"
      
      reassignment:
        description: "Team member moved to higher-priority project"
        impact: "Reprioritization overhead, remaining team carries extra load"
        mitigation:
          - "Capacity buffers (15-20% slack)"
          - "Cross-trained backups for each role"
          - "Agreement with leadership on reassignment notice period"
      
      availability:
        description: "Planned and unplanned absences"
        impact: "Sprint capacity reduction, deadline pressure on remaining team"
        mitigation:
          - "Track PTO in capacity planning"
          - "Maintain 20% capacity buffer for unplanned absences"
          - "Cross-training to cover critical functions"
          - "Document critical processes and procedures"
  
  skill_gaps:
    description: "Missing or insufficient skills for project requirements"
    
    identification:
      - "Skills inventory: assess current vs. required skills at project start"
      - "Technical spikes reveal capability gaps early"
      - "Code review quality flags indicate skill deficiencies"
      - "Retrospectives surface areas where team struggled"
    
    mitigation:
      - "Training sprints before technical work begins"
      - "Pairing junior with senior engineers"
      - "External contractors/SMEs for specialized skills"
      - "Enablement team to build team capabilities"
      - "Adjust scope to match team capabilities"
  
  budget_constraints:
    description: "Insufficient or reduced funding for project completion"
    
    effects:
      - "Reduced team size or contractor hours"
      - "Cannot afford necessary tools or licenses"
      - "Testing environments scaled back"
      - "Training budget eliminated"
      - "Cannot hire planned additional headcount"
    
    mitigation:
      - "Prioritize ruthlessly — smaller scope fully delivered"
      - "Open-source alternatives where possible"
      - "Cloud pay-as-you-go instead of upfront infrastructure"
      - "Phase delivery to match cash flow"
      - "Transparent escalation when budget threatens delivery"
```

## Technical Debt as Risk

```yaml
technical_debt:
  description: "Technical debt is deferred work that will cost more to fix later than now"
  
  as_risk:
    characteristic: "Technical debt increases the probability and impact of delivery failures"
    mechanisms:
      - "Slows delivery velocity (interest payments)"
      - "Increases defect introduction rate"
      - "Makes estimation more uncertain"
      - "Increases integration friction"
      - "Reduces team morale and increases turnover"
      - "Creates fragile systems prone to regression"
  
  accumulation_patterns:
    intentional:
      description: "Deliberate shortcut for speed, with plan to refactor"
      risk_level: "Manageable with tracking and repayment plan"
      management: "Track in backlog with explicit repayment schedule"
    
    inadvertent:
      description: "Accumulated without awareness through changing standards or cut-and-run coding"
      risk_level: "Dangerous — invisible until velocity drops sharply"
      management: "Squad health metrics, code quality gates, regular refactoring"
    
    bit_rot:
      description: "Code degrades over time without changes (dependencies age, platforms become unsupported)"
      risk_level: "Gradual — predictable if monitored"
      management: "Dependency updates, platform version tracking, tech refresh cycles"
  
  measurement:
    code_metrics:
      - "Cyclomatic complexity per module"
      - "Code coverage percentage"
      - "Duplication percentage"
      - "Static analysis warning count"
      - "Module dependency depth"
    
    process_metrics:
      - "Time to implement a story of average complexity"
      - "Defect introduction rate per sprint"
      - "Change failure rate"
      - "Lead time for small changes"
    
    team_perception:
      - "Technical debt survey (1-5 scale by area)"
      - "Retrospective sentiment analysis"
      - "Effort spent on rework vs. new features"
  
  remediation_planning:
    approach: "Treat technical debt reduction as risk mitigation"
    
    prioritization:
      factors:
        - "Cost of carrying debt (velocity impact)"
        - "Cost of remediation (effort to fix)"
        - "Risk of not fixing (failure probability)"
      prioritization: "ROI = (Cost of carrying × Risk increase) / Cost of remediation"
    
    allocation:
      - "20% of each sprint capacity for debt reduction (standard)"
      - "Dedicated debt-reduction sprints every 3-4 months (intensive)"
      - "Boy Scout Rule: always leave code better than you found it"
    
    governance:
      - "Technical debt item in Definition of Done for new features"
      - "Architecture review board approval for high-impact debt"
      - "Quarterly technical debt review with stakeholders"
      - "Include debt reduction in OKRs and sprint commitments"
```

## Schedule Risks

```yaml
schedule_risks:
  critical_path_analysis:
    description: "Identify the longest sequence of dependent activities determining minimum project duration"
    
    key_concepts:
      critical_path: "Tasks with zero float — any delay directly extends the project"
      total_float: "Amount a task can be delayed without affecting the project end date"
      free_float: "Amount a task can be delayed without affecting successor tasks"
      near_critical_path: "Second-longest path — becomes critical if critical path is shortened"
    
    risk_implications:
      - "Any risk on the critical path is a schedule risk — no buffer exists"
      - "Focus risk response on critical path tasks"
      - "Monitor near-critical path — it may become critical"
      - "Critical path changes as project progresses — re-analyze regularly"
    
    critical_path_risks:
      - "Tasks on critical path have the highest schedule impact"
      - "Long critical paths (> 10 tasks) have cumulative uncertainty"
      - "Merge points (multiple paths converging) are high-risk areas"
      - "External dependencies on critical path are especially risky"
  
  buffer_management:
    types:
      project_buffer:
        description: "Reserve at end of project to absorb overall delay"
        sizing: "Typically 25-50% of estimated duration (based on uncertainty)"
        use: "Only when task completions consume the task buffer"
      
      feeding_buffer:
        description: "Buffer at the point where non-critical path feeds into critical path"
        purpose: "Protect critical path from delays on non-critical tasks"
      
      task_buffer:
        description: "Buffer built into individual task estimates"
        sizing: "25-33% of estimated task duration"
        problem: "Hidden buffers encourage Parkinson's Law (work expands to fill time)"
    
    buffer_consumption_tracking:
      method: "Track buffer consumption vs. project progress"
      warning_threshold: "Buffer consumption exceeds progress percentage"
      action: "Expedite critical path tasks, apply schedule compression"
  
  schedule_compression:
    crashing:
      description: "Add resources to critical path tasks"
      upside: "Can reduce duration"
      downside: "Diminishing returns (Brook's Law), increased cost, coordination overhead"
      when_to_use: "Tasks that are parallelizable, have independent work streams"
    
    fast_tracking:
      description: "Run tasks in parallel that were planned sequentially"
      upside: "No additional cost"
      downside: "Increased rework risk, coordination complexity"
      when_to_use: "Tasks with low dependency that were conservatively sequenced"
      risk_of_fast_tracking: "Can increase total effort due to rework — track carefully"
```

## Communication Risks

```yaml
communication_risks:
  information_silos:
    description: "Critical information is known to some stakeholders but not shared with those who need it"
    
    effects:
      - "Teams make decisions without full context"
      - "Duplicate work or conflicting approaches"
      - "Surprises during integration or handoffs"
      - "Late discovery of issues that were known elsewhere"
    
    prevention:
      - "Cross-team demos and showcases"
      - "Shared knowledge repositories (not just email/chat)"
      - "Communities of Practice for cross-pollination"
      - "Explicit escalation paths for critical information"
      - "Pre-mortems shared across teams"
  
  miscommunication:
    description: "Information is transmitted but understood differently by receiver"
    
    causes:
      - "Ambiguous language (e.g., 'soon' means different things to different people)"
      - "Cultural and language differences in distributed teams"
      - "Assumed context — sender assumes receiver has background knowledge"
      - "Written communication lacks tone and body language"
      - "Jargon and acronyms not understood by all"
    
    mitigation:
      - "Use concrete, measurable language (dates, numbers, specific criteria)"
      - "Confirm understanding: 'Can you summarize your understanding?'"
      - "Visual communication: diagrams, wireframes, mockups"
      - "Write down decisions and circulate for confirmation"
      - "Record meetings for async review"
  
  stakeholder_alignment:
    description: "Stakeholders have different or conflicting priorities, not resolved"
    
    symptoms:
      - "Conflicting requests from different stakeholders"
      - "Re-opened decisions that were previously closed"
      - "Stakeholders bypassing the project structure"
      - "Late-stage changes from influential stakeholders who were uninvolved"
    
    framework:
      stakeholder_matrix:
        dimensions: "Power × Interest"
        quadrants:
          high_power_high_interest: "Manage closely — regular updates, involve in decisions"
          high_power_low_interest: "Keep satisfied — periodic updates, escalate critical issues"
          low_power_high_interest: "Keep informed — regular communication, involve selectively"
          low_power_low_interest: "Monitor — minimal effort, periodic check-ins"
      
      alignment_mechanisms:
        - "Project charter signed by all key stakeholders"
        - "Steering committee with decision authority"
        - "Prioritization framework (everyone agrees on rules)"
        - "Disagree-and-commit protocol for deadlocked decisions"
        - "Escalation path for unresolved alignment issues"
```

## Risk Throughout Project Lifecycle

```yaml
risk_lifecycle:
  initiation:
    focus: "Strategic risks, feasibility, stakeholder alignment"
    activities:
      - "Identify top 10 project-level risks"
      - "Assess project feasibility and viability"
      - "Define risk appetite and tolerances"
      - "Identify regulatory and compliance risks"
      - "Document key assumptions"
    output: "Preliminary risk identification in project charter"
  
  planning:
    focus: "Detailed risk identification, analysis, response planning"
    activities:
      - "Comprehensive risk identification (brainstorming, Delphi, checklists)"
      - "Qualitative risk analysis for all identified risks"
      - "Quantitative analysis for high-priority risks"
      - "Risk response planning for top risks"
      - "Establish risk management plan and risk register"
      - "Allocate risk contingency budget"
      - "Define risk review cadence"
    output: "Risk register, risk management plan, contingency reserves"
  
  execution:
    focus: "Risk response implementation, issue management, new risk identification"
    activities:
      - "Execute planned risk responses"
      - "Monitor risk triggers and thresholds"
      - "Identify and assess new risks"
      - "Update risk register with status changes"
      - "Manage issues (risks that materialized)"
      - "Implement workarounds for unplanned risks"
    output: "Updated risk register, issue log, change requests"
  
  monitoring_and_control:
    focus: "Tracking, review, and adjustment of risk management activities"
    activities:
      - "Risk reviews at regular cadence (sprint planning, monthly, quarterly)"
      - "Track risk trends (increasing/decreasing)"
      - "Evaluate risk response effectiveness"
      - "Adjust risk responses as conditions change"
      - "Reassess residual risks"
      - "Track contingency reserve usage"
    output: "Risk status reports, trend analysis, reserve utilization"
  
  closure:
    focus: "Final risk assessment, lessons learned"
    activities:
      - "Final risk register review"
      - "Document residual risks for operations team"
      - "Analyze what risks materialized and why"
      - "Evaluate risk management effectiveness"
      - "Document lessons learned for future projects"
      - "Update organizational risk checklists and templates"
    output: "Lessons learned, risk management effectiveness report"
```

## Agile Risk Management

### Risk-Adjusted Backlogs

```yaml
risk_adjusted_backlog:
  description: "Incorporate risk reduction work directly into the product backlog"
  
  risk_story_types:
    enabler:
      description: "Technical work that reduces future risk"
      examples:
        - "Spike: Investigate database scaling options (reduces technical risk)"
        - "Implement CI/CD pipeline (reduces deployment failure risk)"
        - "Add monitoring and alerting (reduces operations risk)"
    
    risk_mitigation:
      description: "Story specifically addressing an identified risk"
      example: "Feature: Rate limiting middleware (mitigates API abuse risk)"
    
    compliance:
      description: "Work required for regulatory or security compliance"
      example: "Feature: GDPR data export endpoint (mitigates legal risk)"
  
  backlog_risk_weighting:
    approach: "Add risk score as factor in backlog prioritization"
    formula: "WSJF = (Value + Time Criticality + Risk Reduction) / Job Size"
    impact: "Risk reduction work competes on equal footing with feature work"
    benefit: "Teams naturally prioritize high-risk items without external mandate"
  
  risk_burndown:
    description: "Track reduction of aggregate risk score over time"
    calculation: "Sum of (Probability × Impact) for all open risks"
    
    example:
      sprint_1: 245 (risk score total)
      sprint_2: 210 (mitigated 3 risks)
      sprint_3: 165 (mitigated 4 risks, identified 1 new)
      sprint_4: 120 (mitigated 3 risks)
      sprint_5: 75  (mitigated 2 risks)
      sprint_6: 45  (mitigated 1 risk, closed 2)
    
    interpretation:
      upward_trend: "New risks being added faster than mitigations — need to revisit approach"
      plateau: "Stuck on high-impact risks that need escalation or different strategy"
      downward_trend: "Risk response is effective — continue current approach"
```

### Sprint-Level Risk Assessment

```yaml
sprint_risk_assessment:
  description: "Quick risk assessment integrated into sprint planning"
  
  process:
    step_1_backlog_item_review:
      questions:
        - "Is the acceptance criteria clear and testable?"
        - "Do we have all necessary information to implement?"
        - "Are there any external dependencies?"
        - "Is this similar to work we've done before?"
    
    step_2_identify_sprint_risks:
      items: "1-3 risks specific to this sprint's scope"
      examples:
        - "Integration with new payment gateway (first time)"
        - "Team member on PTO Wednesday-Friday"
        - "Performance threshold for this feature is ambitious"
    
    step_3_assign_mitigation:
      for_each_sprint_risk:
        - "Define immediate mitigation (do within sprint)"
        - "Assign owner"
        - "Define success criteria for mitigation"
    
    step_4_include_in_sprint_board:
      location: "Visible column or section on sprint board"
      review: "Daily standup check-in on risk mitigation progress"
  
  sprint_risk_template:
    sprint: "Sprint 12 (June 1-14)"
    
    sprint_risks:
      - description: "New payment API integration — first time using this provider"
        likelihood: "Medium"
        impact: "High"
        mitigation: "Pair senior backend eng with developer, allocate 2 extra days"
        owner: "Backend Lead"
        status: "Mitigating"
      
      - description: "Performance test may reveal scaling bottleneck"
        likelihood: "Medium"
        impact: "Medium"
        mitigation: "Run load test early (Day 3), have optimization options ready"
        owner: "QA Lead"
        status: "Planned"
      
      - description: "Design review may require rework (new designer joined)"
        likelihood: "High"
        impact: "Low-Medium"
        mitigation: "Design review scheduled for Day 2, buffer 1 day for revisions"
        owner: "PO"
        status: "Tracking"
```

## Risk Culture

```yaml
risk_culture:
  psychological_safety:
    description: "Team members feel safe to raise risks without fear of blame or retaliation"
    
    indicators:
      high_safety:
        - "Risks are raised early and openly"
        - "People admit mistakes without deflection"
        - "Bad news travels fast without being shot"
        - "Disagreement is seen as constructive"
      
      low_safety:
        - "Risks hidden until they become issues"
        - "Mistakes discovered externally, not reported internally"
        - "Bad news filtered or delayed"
        - "Problems attributed to individuals, not systems"
    
    building_safety:
      - "Leaders model vulnerability — admit their own mistakes"
      - "Separate blame from accountability"
      - "Celebrate risk identification, even if pessimistic"
      - "Explicit no-blame policy for early risk reporting"
      - "Respond to risk reports with 'thank you' not 'that won't happen'"
  
  blameless_postmortems:
    description: "Analyze failures without personal blame — focus on system improvement"
    
    principles:
      assume_good_intent: "Everyone was doing their best with the information they had"
      focus_on_systems: "How did the system allow this to happen?"
      no_individual_blame: "Don't ask 'who', ask 'what in the process failed'"
      action_oriented: "Every postmortem produces concrete improvement actions"
    
    structure:
      timeline: "What happened, in chronological order"
      detection: "How was the issue discovered?"
      impact: "What was the effect on users/business?"
      root_causes: "System-level causes, not individual errors"
      contributory_factors: "Conditions that made the failure more likely"
      action_items: "Specific changes to prevent recurrence"
      follow_up: "Owners and deadlines for each action item"
  
  transparency:
    description: "Open sharing of risk information at all levels"
    
    practices:
      visible_risks:
        - "Risk board displayed prominently (physical or digital)"
        - "Risk register accessible to all team members"
        - "Risk status updated visibly in sprint reviews"
        - "Top risks shared in all-hands and stakeholder updates"
      
      escalation_norms:
        - "Bad news should travel faster than good news"
        - "Escalate early, not when it's too late"
        - "No penalty for escalation — penalty for late escalation"
        - "Clear, known escalation paths at every level"
        - "Leaders thank people who escalate problems"
  
  risk_reward_alignment:
    description: "Incentives support good risk management behavior"
    
    aligned_incentives:
      - "Reward team for identifying and mitigating risks early"
      - "Performance reviews consider risk management contribution"
      - "Managers evaluated on speed of issue escalation, not absence of issues"
      - "Project success defined by outcome, not by sticking to an unrealistic plan"
    
    misaligned_incentives:
      - "Bonuses tied to delivering on time regardless of quality"
      - "Punishment for underestimating (encourages padding and dishonesty)"
      - "Reward for optimistic estimates (encourages planning fallacy)"
      - "Status reporting that filters bad news upward"
```

## Tools and Templates

### Risk Register Template

```yaml
risk_register_template_complete:
  header:
    project: "Project Name"
    owner: "Risk Manager"
    last_updated: "YYYY-MM-DD"
    version: "1.0"
  
  columns:
    - id: "RISK-001"
      description: "Specific, actionable risk statement"
      category: "Technical | Schedule | Resource | External"
      cause: "What would cause this risk?"
      effect: "What would happen if it materializes?"
      probability: 1-5
      impact: 1-5
      score: "P × I"
      rating: "Low | Medium | High | Critical"
      response: "Avoid | Mitigate | Transfer | Accept"
      mitigation: "Actions to reduce probability or impact"
      contingency: "Actions if risk materializes"
      trigger: "Event that activates contingency"
      owner: "Name"
      status: "Open | Monitoring | Mitigating | Closed"
      trend: "Increasing | Stable | Decreasing"
      last_reviewed: "YYYY-MM-DD"
```

### Risk Heat Map

```yaml
risk_heat_map_template:
  description: "Visual summary of risk portfolio"
  
  layout:
    x_axis: "Impact (1-5, left to right)"
    y_axis: "Probability (1-5, bottom to top)"
    
  color_zones:
    green_low: "Score 1-4 — Acceptable, monitor periodically"
    yellow_medium: "Score 5-9 — Active monitoring, planned response"
    orange_high: "Score 10-14 — Active mitigation required, owner assigned"
    red_critical: "Score 15-25 — Immediate action, escalated to sponsor"
  
  usage:
    - "Plot each risk as a labeled dot on the matrix"
    - "Show risk trend: arrows indicating direction"
    - "Update after each risk review"
    - "Include in monthly status reports"
    - "Highlight top 5 risks for executive attention"
    
  digital_implementation:
    format: "Spreadsheet with conditional formatting or dedicated risk tool"
    auto_calculation: "Formula: =probability_cell * impact_cell with color scale"
    dynamic: "Filter by category, owner, status for different views"
```

### Risk Report Template

```yaml
risk_report_template:
  header:
    project: "Project Name"
    reporting_period: "Month YYYY"
    prepared_by: "Name"
    date: "YYYY-MM-DD"
  
  executive_summary:
    risk_exposure: "Current: 145 | Previous: 162 | Trend: Decreasing"
    critical_risks: "3 (2 with active mitigation, 1 owned)"
    new_risks_this_period: "4"
    closed_risks_this_period: "6"
    risk_responded_budget: "$45,000 / $100,000 used (45%)"
  
  top_5_risks:
    - id: "RISK-001"
      description: "Brief description"
      score: "16 (Critical)"
      trend: "Decreasing"
      status: "Mitigating"
      owner: "Name"
    
    - id: "RISK-002"
      description: "Brief description"
      score: "12 (High)"
      trend: "Stable"
      status: "Monitoring"
      owner: "Name"
  
  risk_heat_map:
    location: "Insert heat map visualization here"
  
  risk_detail:
    section_per_risk:
      risk_id: "RISK-001"
      description: "Full description"
      category: "Technical"
      original_score: "20"
      current_score: "16"
      residual_score: "8"
      response_actions:
        - "Action 1 — completed"
        - "Action 2 — in progress (due YYYY-MM-DD)"
        - "Action 3 — not started"
      contingency: "Description of contingency plan"
      trigger: "Specific condition for contingency activation"
  
  new_risks:
    list: "Brief description of each new risk added this period"
  
  closed_risks:
    list: "Brief description of each risk closed this period and why"
  
  recommendations:
    - "Recommendation for executive action"
    - "Resource or budget request"
    - "Process improvement suggestion"
```

### Automated Risk Monitoring Script

```python
"""Automated risk monitoring and reporting."""

import json
import csv
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional


class Risk:
    """Represents a single risk item."""

    def __init__(
        self,
        risk_id: str,
        description: str,
        category: str,
        probability: int,
        impact: int,
        response: str,
        owner: str,
        status: str = "Open",
        mitigation: str = "",
        contingency: str = "",
        trigger: str = "",
        trend: str = "Stable"
    ):
        self.risk_id = risk_id
        self.description = description
        self.category = category
        self.probability = probability
        self.impact = impact
        self.score = probability * impact
        self.response = response
        self.owner = owner
        self.status = status
        self.mitigation = mitigation
        self.contingency = contingency
        self.trigger = trigger
        self.trend = trend
        self.date_identified = datetime.now()
        self.last_reviewed = datetime.now()
        self.history: list[dict] = []

    def update(self, probability: Optional[int] = None,
               impact: Optional[int] = None,
               status: Optional[str] = None,
               trend: Optional[str] = None) -> None:
        """Record a snapshot of current state before updating."""
        self.history.append({
            "date": self.last_reviewed.isoformat(),
            "probability": self.probability,
            "impact": self.impact,
            "score": self.score,
            "status": self.status,
        })
        if probability is not None:
            self.probability = probability
        if impact is not None:
            self.impact = impact
        if status is not None:
            self.status = status
        if trend is not None:
            self.trend = trend
        self.score = self.probability * self.impact
        self.last_reviewed = datetime.now()

    def to_dict(self) -> dict:
        return {
            "id": self.risk_id,
            "description": self.description,
            "category": self.category,
            "probability": self.probability,
            "impact": self.impact,
            "score": self.score,
            "rating": self._rating(),
            "response": self.response,
            "owner": self.owner,
            "status": self.status,
            "trend": self.trend,
        }

    def _rating(self) -> str:
        if self.score >= 15:
            return "Critical"
        elif self.score >= 10:
            return "High"
        elif self.score >= 5:
            return "Medium"
        return "Low"


class RiskRegister:
    """Manages a collection of risks."""

    def __init__(self):
        self.risks: dict[str, Risk] = {}

    def add(self, risk: Risk) -> None:
        self.risks[risk.risk_id] = risk

    def remove(self, risk_id: str) -> None:
        self.risks.pop(risk_id, None)

    def get(self, risk_id: str) -> Optional[Risk]:
        return self.risks.get(risk_id)

    def total_risk_exposure(self) -> int:
        return sum(r.score for r in self.risks.values() if r.status != "Closed")

    def by_rating(self) -> dict:
        ratings = {"Critical": [], "High": [], "Medium": [], "Low": []}
        for risk in self.risks.values():
            if risk.status != "Closed":
                ratings[risk._rating()].append(risk)
        return ratings

    def by_category(self) -> dict:
        categories: dict[str, list[Risk]] = {}
        for risk in self.risks.values():
            cat = risk.category
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(risk)
        return categories

    def by_owner(self, owner: str) -> list[Risk]:
        return [r for r in self.risks.values() if r.owner == owner]

    def critical_risks(self) -> list[Risk]:
        return [r for r in self.risks.values()
                if r._rating() == "Critical" and r.status != "Closed"]

    def risks_due_for_review(self, days: int = 30) -> list[Risk]:
        cutoff = datetime.now() - timedelta(days=days)
        return [r for r in self.risks.values()
                if r.last_reviewed < cutoff and r.status != "Closed"]

    def generate_report(self) -> dict:
        ratings = self.by_rating()
        return {
            "generated_at": datetime.now().isoformat(),
            "total_risk_exposure": self.total_risk_exposure(),
            "risk_count": len(self.risks),
            "open_count": len([r for r in self.risks.values()
                              if r.status != "Closed"]),
            "critical_count": len(ratings["Critical"]),
            "high_count": len(ratings["High"]),
            "medium_count": len(ratings["Medium"]),
            "low_count": len(ratings["Low"]),
            "top_risks": [
                r.to_dict() for r in ratings["Critical"] + ratings["High"]
            ],
            "by_category": {
                cat: len(risks)
                for cat, risks in self.by_category().items()
            },
            "new_this_month": [
                r.to_dict() for r in self.risks.values()
                if r.date_identified > datetime.now() - timedelta(days=30)
            ],
        }

    def export_csv(self, path: Path) -> None:
        with open(path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "id", "description", "category", "probability",
                "impact", "score", "rating", "response", "owner",
                "status", "trend"
            ])
            writer.writeheader()
            for risk in self.risks.values():
                writer.writerow(risk.to_dict())

    def export_json(self, path: Path) -> None:
        with open(path, "w") as f:
            json.dump(
                [r.to_dict() for r in self.risks.values()],
                f, indent=2
            )


# Example usage
register = RiskRegister()

register.add(Risk(
    risk_id="RISK-001",
    description="Payment API rate limits during peak traffic",
    category="Technical",
    probability=4,
    impact=5,
    response="Mitigate",
    owner="Backend Lead",
    mitigation="Implement caching layer + request queuing",
    contingency="Failover to backup payment provider",
    trigger="Error rate > 1% on payment endpoint"
))

register.add(Risk(
    risk_id="RISK-002",
    description="QA engineer on leave during critical testing phase",
    category="Resource",
    probability=3,
    impact=3,
    response="Transfer",
    owner="Scrum Master",
    mitigation="Cross-train developer, contract QA agency",
    contingency="Engage contract QA agency",
    trigger="Confirmed leave dates > 1 week"
))

register.add(Risk(
    risk_id="RISK-003",
    description="Regulatory change may require additional data privacy controls",
    category="Legal",
    probability=2,
    impact=4,
    response="Accept",
    owner="Legal team",
    mitigation="Monitor regulatory developments monthly",
    contingency="Sprint-zero for compliance work",
    trigger="Regulatory proposal published in gazette"
))

# Generate report
report = register.generate_report()
print("=== Risk Report ===")
print(f"Total Exposure: {report['total_risk_exposure']}")
print(f"Open Risks: {report['open_count']}")
print(f"Critical: {report['critical_count']}, "
      f"High: {report['high_count']}, "
      f"Medium: {report['medium_count']}, "
      f"Low: {report['low_count']}")
print(f"\nTop Risks:")
for risk in report["top_risks"]:
    print(f"  {risk['id']}: {risk['description'][:50]}... "
          f"({risk['rating']}, Score: {risk['score']})")

# Update a risk
register.get("RISK-001").update(probability=3, trend="Decreasing")
print(f"\nAfter mitigation, RISK-001 score: "
      f"{register.get('RISK-001').score}")

# Export
register.export_json(Path("risk_register.json"))
register.export_csv(Path("risk_register.csv"))
```

## Case Studies

### Risk Management Failure: The Challenger Disaster

```yaml
case_study_challenger:
  context: "NASA Space Shuttle Challenger, 1986"
  risk: "O-ring failure at low temperatures"
  
  risk_management_failures:
    identification:
      failure: "O-ring erosion known since 1977, but categorized as 'acceptable risk'"
      lesson: "Normalized deviance — repeated small failures become accepted as normal"
    
    assessment:
      failure: "Risk probability and impact not reassessed for the specific low-temperature launch conditions"
      lesson: "Risk assessment must account for context — generic assessments miss specific conditions"
    
    communication:
      failure: "Engineers' concerns about cold weather were not effectively escalated to decision-makers"
      lesson: "Risk communication must have a clear path to decision authority"
    
    culture:
      failure: "Hierarchical culture discouraged challenging launch decisions"
      lesson: "Psychological safety is essential for risk management — people must feel safe to say no"
  
  takeaways:
    - "Normalized deviance creeps in slowly — re-evaluate accepted risks periodically"
    - "Context-specific risk assessment matters — don't rely on generic ratings"
    - "Risk communication must reach decision-makers, not just peers"
    - "Decision authority must be willing to hear bad news"
```

### Risk Management Success: The Sydney Opera House Recovery

```yaml
case_study_sydney_opera:
  context: "Sydney Opera House, infamous for 1,400% cost overrun in original build"
  risk_recovery: "Modern maintenance and upgrade program (2000s) used lessons learned"
  
  risk_management_practices:
    structured_risk_process:
      - "Formal risk management plan before project start"
      - "Risk register reviewed monthly by steering committee"
      - "Quantitative risk analysis for all major decisions"
    
    contingency_management:
      - "15% contingency budget, released in stages"
      - "Contingency only accessible with documented risk trigger"
      - "Unused contingency returned to central budget"
    
    stakeholder_engagement:
      - "Regular risk briefings to all stakeholders"
      - "Transparent reporting on risk status and response effectiveness"
      - "Joint risk workshops with contractors"
    
    lessons_applied:
      - "Don't start construction without complete design (original mistake)"
      - "Involve contractors in risk assessment (they know execution risks)"
      - "Phase contingency release requires risk mitigation milestones"
      - "Risk register is a living document, not a one-time exercise"
  
  results:
    - "Project delivered within approved budget"
    - "No major incidents during construction"
    - "Stakeholder satisfaction with risk transparency"
    - "Risk management process cited as best practice"
```

## Best Practices and Common Pitfalls

```yaml
risk_management_best_practices:
  do:
    - "Make risk management a regular, recurring activity — not a one-time exercise"
    - "Integrate risk identification into existing ceremonies (sprint planning, daily standup)"
    - "Assign clear owners for each risk — ownership without authority is meaningless"
    - "Track risk trends over time — direction of travel matters more than absolute score"
    - "Use multiple identification techniques — each captures different risks"
    - "Differentiate between known risks and unknown unknowns (poke through uncertainty with spikes)"
    - "Link risk responses to specific actions in the project plan — risks without actions are wishes"
    - "Review closed risks periodically — they can re-emerge under different conditions"
    - "Communicate risks at the right level of detail — executives need summary, teams need specifics"
    - "Celebrate risk identification — finding a risk early is a win, not a failure"
    - "Budget explicitly for risk mitigation — 10-20% of project budget for risk responses"
    - "Build risk management capability in the team — every member should be a risk identifier"
  
  dont:
    - "Don't treat the risk register as a paperwork exercise — it's a management tool"
    - "Don't create too many risks — top 10-20 is manageable; more than 30 is noise"
    - "Don't let risk management become a blame exercise — focus on systems, not people"
    - "Don't ignore low-probability, high-impact risks — they happen more often than expected"
    - "Don't update risks only when things go wrong — review on a regular cadence"
    - "Don't use risk management to justify pessimistic estimates — be objective"
    - "Don't hide risks from stakeholders — transparency builds trust"
    - "Don't accept risks without documenting the rationale — accepted risks should be conscious decisions"
    - "Don't confuse urgency with importance — a low-risk item with an early deadline is not a critical risk"
    - "Don't stop at identification — a risk without a response is just a worry"
    - "Don't over-quantify qualitative risks — false precision undermines credibility"
```

## Key Points

- Risk management is a continuous activity, not a phase — integrate it into every ceremony and review
- The goal is not to eliminate all risk but to understand, prioritize, and manage it consciously
- A risk that is identified and tracked is already better managed than one that is hidden or ignored
- The risk register is a living document — it should change every sprint as conditions evolve
- Risk culture matters more than process — psychological safety determines whether risks get surfaced
- Quantitative analysis is valuable for major decisions but qualitative analysis covers 80% of needs
- Every risk needs an owner who has the authority to act — ownership without authority breeds frustration
- Link risk responses to the project plan — risks should be visible as tasks, spikes, or backlog items
- Distinguish between: risk (might happen), issue (happened), and impediment (blocking now) — each needs a different response
- Technical debt is a risk multiplier — it increases both the probability and impact of other risks
- The best risk mitigation is often early delivery — the fastest path to de-risking is shipping value incrementally
- Review and retire risks that are no longer relevant — an outdated risk register undermines credibility
