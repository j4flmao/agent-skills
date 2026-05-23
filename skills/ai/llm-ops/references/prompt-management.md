# Prompt Management

## Prompt Lifecycle

### Stages
```
Authoring → Versioning → Review → Staging → Production → Archive
    ↑                                                    │
    └────────────────── Rollback ────────────────────────┘
```

### Registry Schema
```yaml
prompt:
  name: "customer-support-system-v3"
  version: "3.2.1"
  status: "production"  # draft | staging | production | archived
  template: |
    You are a customer support agent for {company_name}.
    Answer the following question using the provided context.
    If the context doesn't contain the answer, say you don't know.
    
    Context: {context}
    Question: {question}
    
    Answer concisely and accurately.
  parameters:
    - name: company_name
      type: string
      required: true
    - name: context
      type: string
      required: true
    - name: question
      type: string
      required: true
  model: "gpt-4o-mini"
  temperature: 0.3
  max_tokens: 500
  tests: ["fact-001", "fact-002", "safe-001"]
  created_by: "team-eng"
  approved_by: "team-lead"
  change_log: "Updated system tone to be more concise"
```

## Prompt Storage

### File Structure
```
prompts/
├── customer-support/
│   ├── qa-v1.yaml
│   ├── qa-v2.yaml
│   ├── escalation-v1.yaml
│   └── sentiment-v1.yaml
├── code-assistant/
│   ├── explain-v1.yaml
│   └── review-v1.yaml
└── common/
    ├── safety-v2.yaml
    └── format-v1.yaml
```

### Git-Based Versioning
- Each prompt is a YAML file in git
- Changes go through PR review
- Tags track deployed versions
- Branch per environment (staging, production)

## A/B Testing Prompts

### Experiment Config
```yaml
experiment:
  name: "system-tone-v2"
  variants:
    control:
      prompt: "qa-v2.1.0"  # current production
      traffic: 50
    treatment:
      prompt: "qa-v2.2.0"  # candidate
      traffic: 50
  metrics:
    - faithfulness
    - user_satisfaction
    - response_length
  duration: "7d"
  minimum_samples: 10000
```

## Deployment Strategy

### Canary Deploy
```
1. Deploy to 5% of traffic
2. Monitor metrics for 30 minutes
3. If no regression, increase to 25%
4. Monitor for 2 hours
5. Increase to 100%
6. Archive previous version
```

### Rollback Triggers
- Faithfulness drops >3% in canary
- Error rate increases >1%
- User satisfaction drops >5%
- Response length exceeds threshold

## Prompt Testing

### Automated Checks
```yaml
pre-deployment:
  - validate_template:
      required_params: ["context", "question"]
      no_unused_params: true
  - test_suite:
      dataset: "golden-v3"
      min_pass_rate: 0.95
  - diff_check:
      baseline: "qa-v2.1.0"
      metrics: ["faithfulness", "safety"]
      max_regression: 0.03
```

### Manual Review Gates
- Staging deployment approved by lead
- Production deployment requires QA sign-off
- Breaking changes need team review

## Change Log Template

```markdown
## v3.2.1 (2026-03-15)
### Changed
- System tone updated: "Answer concisely and accurately" added
- Reduced max_tokens from 1000 to 500 for cost optimization

### Impact
- Faithfulness: 0.93 → 0.92 (-1%, acceptable)
- Avg response length: 350 → 180 tokens (-49%)
- Cost per query: $0.008 → $0.004 (-50%)
```

## Prompt Catalog

### Required Metadata
```
name: Unique identifier
version: Semantic version
status: Current lifecycle stage
model: Target model
temperature/params: Model configuration
owner: Team responsible
dependencies: Other prompts used (chaining)
tests: Linked test cases
```

### Discovery
- Searchable by name, tag, model, owner
- View diff between versions
- See deployment history per version
- Link to test results and metrics
