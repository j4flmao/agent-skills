# Combination Recipes

Ready-made skill combinations for common situations. Each recipe is small on purpose: install it, then add single skills only when the agent misses something.

[← Advisor home](README.md) · [Build a custom bundle](custom-bundles.md)

Each recipe ends with its install command. Add `-a <agent>` (for example `-a claude-code`), `-g` or `-y` as needed.

## 1. SaaS MVP (web)

**Situation:** small team, one web app, accounts and billing, shipping in weeks.

| Role in the recipe | Skills |
|--------------------|--------|
| Kick-off and planning | `master-orchestrator`, `project-init`, `create-prd`, `create-tech-spec` |
| Stack (pick yours) | `nestjs-architecture`, `react-nextjs` |
| Product backbone | `backend-api-design`, `backend-multi-tenancy`, `backend-authorization`, `ecommerce-payment-processing` |
| Ship and verify | `docker-patterns`, `github-actions`, `quality-e2e-testing` |
| UI quality | `frontend-design-system`, `design-visual-design` |

```bash
npx skills add j4flmao/agent-skills --skill master-orchestrator --skill project-init --skill create-prd --skill create-tech-spec --skill nestjs-architecture --skill react-nextjs --skill backend-api-design --skill backend-multi-tenancy --skill backend-authorization --skill ecommerce-payment-processing --skill docker-patterns --skill github-actions --skill quality-e2e-testing --skill frontend-design-system --skill design-visual-design
```

Grow into: [Full-Stack track](tracks/fullstack.md) Level 2 and the `fullstack-nestjs-react` bundle (or another `fullstack-*` bundle for your stack).

## 2. AI SaaS with RAG

**Situation:** an LLM-powered product that answers from your own documents.

| Role in the recipe | Skills |
|--------------------|--------|
| Playbook | `ai-saas-playbook` |
| Retrieval | `llm-rag-retrieval-internals`, `data-vector-databases` |
| Quality and cost | `agent-observability` |
| Product backbone | `backend-api-design`, `backend-authorization` |

```bash
npx skills add j4flmao/agent-skills --skill ai-saas-playbook --skill llm-rag-retrieval-internals --skill data-vector-databases --skill agent-observability --skill backend-api-design --skill backend-authorization
```

Read `.claude/rules/rag-vector-standards.md` (hybrid search, re-ranking, chunking, evals). Grow into: [ML & AI](tracks/ml-ai.md) and [AI Agent Builder](tracks/ai-agents.md).

## 3. Mobile app with a managed backend

**Situation:** a React Native app backed by Supabase, with push and offline support.

| Role in the recipe | Skills |
|--------------------|--------|
| App | `react-native-expertise`, `mobile-offline-first`, `mobile-push-notifications` |
| Backend | `supabase` |
| Release | `mobile-deployment` |

```bash
npx skills add j4flmao/agent-skills --skill react-native-expertise --skill mobile-offline-first --skill mobile-push-notifications --skill supabase --skill mobile-deployment
```

Grow into: [Mobile track](tracks/mobile.md) and the `mobile-react-native` or `mobile-cross-platform` bundle.

## 4. UI that does not look AI-generated

**Situation:** agents build your UI and it keeps coming out generic.

| Role in the recipe | Skills |
|--------------------|--------|
| Taste and rules | `design-visual-design` (section "Avoiding the Generic AI Look") |
| System | `frontend-design-system` |
| Proof | `quality-visual-testing` |

```bash
npx skills add j4flmao/agent-skills --skill design-visual-design --skill frontend-design-system --skill quality-visual-testing
```

Workflow: give a reference screenshot, write tokens first, request changes as numbers, lock the result with visual regression tests. See [Designer & Design Engineer](tracks/design-ux.md).

## 5. Kubernetes platform team

**Situation:** you run clusters and a paved road for product teams.

| Role in the recipe | Skills |
|--------------------|--------|
| Core | `kubernetes`, `terraform`, `observability` |
| Operations | `devops-sre-practices`, `devops-incident-response` |

```bash
npx skills add j4flmao/agent-skills --skill kubernetes --skill terraform --skill observability --skill devops-sre-practices --skill devops-incident-response
```

Then add from the `kubernetes-platform` bundle. See [DevOps & Platform](tracks/devops-platform.md) and [SRE](tracks/sre.md).

## 6. Security review before launch

| Role in the recipe | Skills |
|--------------------|--------|
| Model the threats | `threat-modeling` |
| Scan | `security-sast-dast` |
| Prove it | `enterprise-compliance-audit` |

```bash
npx skills add j4flmao/agent-skills --skill threat-modeling --skill security-sast-dast --skill enterprise-compliance-audit
```

See [Security Engineer](tracks/security.md); add the `security-all` bundle for a dedicated security team.

## 7. Data platform starter

| Role in the recipe | Skills |
|--------------------|--------|
| Pipelines and storage | `data-etl-pipeline`, `data-data-warehouse` |
| Serving models from the data | `ml-model-serving`, `devops-mlops` |

```bash
npx skills add j4flmao/agent-skills --skill data-etl-pipeline --skill data-data-warehouse --skill ml-model-serving --skill devops-mlops
```

See [Data Engineer](tracks/data-engineering.md) and [ML & AI](tracks/ml-ai.md).

## 8. Multiplayer game

| Role in the recipe | Skills |
|--------------------|--------|
| Engine | `unity`, `unity-csharp` |
| Netcode | `multiplayer-netcode`, `authoritative-server` |

```bash
npx skills add j4flmao/agent-skills --skill unity --skill unity-csharp --skill multiplayer-netcode --skill authoritative-server
```

Then add the `game-server` bundle. See [Game Developer](tracks/game.md).

## 9. Legacy modernization

| Role in the recipe | Skills |
|--------------------|--------|
| Strategy | `enterprise-legacy-migration`, `enterprise-integration-patterns` |
| Code changes | `dev-loop-refactor-guide`, `code-review` |

```bash
npx skills add j4flmao/agent-skills --skill enterprise-legacy-migration --skill enterprise-integration-patterns --skill dev-loop-refactor-guide --skill code-review
```

See [Software & Solution Architect](tracks/architecture.md).

## 10. Web3 dApp

| Role in the recipe | Skills |
|--------------------|--------|
| Playbook | `web3-dapp-playbook` |

```bash
npx skills add j4flmao/agent-skills --skill web3-dapp-playbook
```

Then follow the [Blockchain & Web3](tracks/blockchain.md) track levels in order.

## Recipe rules

- Start with at most ~15 skills; every installed skill costs listing space in the agent's context.
- One stack per layer: one backend framework, one frontend framework, one mobile platform.
- When two skills overlap (each track's "Watch out" section lists known pairs), keep one.
- Add a skill when the agent gives a generic answer in its area, not "just in case".
