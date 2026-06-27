---
name: prompt-deployment-pipelines
description: >
  Architectures and workflows for versioning, testing,
  and safely deploying prompt updates to production
  environments using standard CI/CD practices.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [few-shot, deployment, ci-cd, pipelines]
---

# Prompt Deployment Pipelines

## 1. Prompts are Code

The fundamental principle of prompt deployment is treating prompts as code. They must be version-controlled, peer-reviewed, automatically tested, and deployed via robust pipelines. Hardcoding a prompt string deep within a monolithic application violates this principle and guarantees future operational incidents.

## 2. Prompt Storage Architectures

### 2.1 File-Based (Gitops)
Prompts are stored as `.md` or `.yaml` files in the application repository.
- **Pros**: Easy to version control, integrates naturally with existing CI/CD.
- **Cons**: Updating a prompt requires a full application deployment.

### 2.2 CMS / Database Storage
Prompts are stored in an external database or Prompt Management System. The application fetches the active prompt variant at runtime.
- **Pros**: Enables hot-swapping prompts without redeploying code. Essential for A/B testing.
- **Cons**: Requires complex caching (to avoid database hits on every LLM call) and dedicated UI for prompt management.

## 3. The CI/CD Workflow for Prompts

A robust pipeline ensures that a degraded prompt never reaches production.

### 3.1 Stage 1: Development & PR
A prompt engineer updates the few-shot examples in `prompts/customer_support_v2.yaml`. They open a Pull Request.

### 3.2 Stage 2: Automated Evaluation (CI)
GitHub Actions triggers an evaluation suite.
1. The pipeline pulls the Golden Dataset (see `evaluation-and-testing-strategies.md`).
2. It runs the new prompt variant against the dataset.
3. If the Pass Rate drops by more than 2% compared to the `main` branch baseline, the CI build FAILS, blocking the PR.

### 3.3 Stage 3: Deployment (CD)
Once merged, the pipeline pushes the updated prompt. If using a CMS architecture, the pipeline uses an API to update the active version in the database.

## 4. Prompt Versioning Schema

When storing prompts, metadata is critical for rollback and auditing.

```yaml
# prompts/customer_support.yaml
version: 2.1.0 # Semantic versioning
name: customer_support_triage
description: Analyzes inbound tickets and routes to correct department.
model_target: gpt-4-turbo
author: data-science-team
created_at: 2023-11-15T10:00:00Z
system_instruction: |
  You are an expert customer support routing AI.
  Analyze the text and output a JSON routing object.
few_shot_examples:
  - id: example_1
    input: "My screen is cracked."
    output: '{"route": "hardware", "priority": "high"}'
  - id: example_2
    input: "How do I reset my password?"
    output: '{"route": "it_support", "priority": "low"}'
```

## 5. Implementation: GitHub Actions Pipeline

Example `.github/workflows/prompt-eval.yml` to run automated tests on PRs.

```yaml
name: Prompt Evaluation Pipeline

on:
  pull_request:
    paths:
      - 'prompts/**'

jobs:
  evaluate-prompts:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Dependencies
        run: npm ci
        
      - name: Run Prompt Evaluation Suite
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          EVAL_DATASET_PATH: ./tests/datasets/golden_set.jsonl
        run: |
          echo "Starting evaluation suite against modified prompts..."
          npm run test:prompts > eval_results.txt
          
      - name: Check Score Degradation
        run: |
          # Custom script to parse eval_results.txt and fail if score drops
          node ./scripts/check_eval_threshold.js eval_results.txt 0.95
          
      - name: Post Results to PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = fs.readFileSync('eval_results.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `### Prompt Evaluation Results\n\`\`\`\n${results}\n\`\`\``
            })
```

## 6. Advanced Rollout Strategies

### 6.1 Shadow Deployment (Dark Launching)
Deploy the new prompt to production, but DO NOT return its output to the user. Instead:
1. The user request triggers the old prompt (results sent to user).
2. The system asynchronously triggers the new prompt.
3. The results of both prompts are logged and compared for parity and quality without risking user impact.

### 6.2 Gradual Rollout
When hot-swapping prompts via database, use feature flags to route a percentage of traffic.

```typescript
// Pseudo-code for routing based on feature flag
const activePromptVersion = featureFlags.get('customer_support_prompt_version');

let promptContent;
if (activePromptVersion === 'v2' && Math.random() < 0.10) {
    // 10% of traffic gets the new experimental v2 prompt
    promptContent = await fetchPromptFromDB('customer_support', 'v2');
} else {
    // 90% get the stable v1 prompt
    promptContent = await fetchPromptFromDB('customer_support', 'v1');
}

const result = await llmClient.generate(promptContent, userInput);
```

## 7. Rollback Procedures

If a degraded prompt reaches production (e.g., causing a spike in parsing errors), the Mean Time To Recovery (MTTR) must be seconds.

1. **Database Storage**: Simply flip the active flag in the Prompt CMS back to the previous semantic version. The application will instantly begin using the stable prompt.
2. **GitOps Storage**: Execute `git revert` on the offending PR and trigger an emergency hotfix deployment.

## 8. Conclusion

Prompt engineering scales from a sandbox experiment to an enterprise application precisely at the moment a robust deployment pipeline is established. By enforcing evaluation checks in CI and utilizing shadow deployments, teams can iterate on few-shot examples rapidly without fear of breaking production systems.
