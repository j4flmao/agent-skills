# Data Scientist & Analyst

**Who this is for:** You analyze data, run experiments and build models.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (1 skill, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-data-security`](../../skills/security/data-security/SKILL.md) | `security/data-security` | Implements data security controls: encryption, key management, masking, column-level security, and data anonymization for regulatory compliance. |

## Level 1 — Essentials (4 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`data-science-statistical-analysis`](../../skills/data-science/statistical-analysis/SKILL.md) | `data-science/statistical-analysis` | Perform rigorous statistical analysis: descriptive statistics, hypothesis testing, regression, time series, Bayesian inference, and reproducible… |
| [`data-science-experimentation`](../../skills/data-science/experimentation/SKILL.md) | `data-science/experimentation` | Design and analyze rigorous A/B tests and experiments. |
| [`ml-classical-ml`](../../skills/ml/classical-ml/SKILL.md) | `ml/classical-ml` | Build supervised and unsupervised machine learning pipelines with scikit-learn, XGBoost, LightGBM, and CatBoost. |
| [`ml-model-evaluation`](../../skills/ml/model-evaluation/SKILL.md) | `ml/model-evaluation` | Design comprehensive model evaluation frameworks with appropriate metrics, cross-validation strategies, bias-variance diagnosis, and statistical… |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`data-science-causal-inference`](../../skills/data-science/causal-inference/SKILL.md) | `data-science/causal-inference` | Estimate causal effects from observational and experimental data using rigorous frameworks and methods: causal frameworks (potential outcomes /… |
| [`data-science-analytics-engineering`](../../skills/data-science/analytics-engineering/SKILL.md) | `data-science/analytics-engineering` | Design and build production analytics pipelines with dbt Core (models, materializations, Jinja macros, ref/source, tests, documentation), metrics… |
| [`ml-feature-engineering`](../../skills/ml/feature-engineering/SKILL.md) | `ml/feature-engineering` | Transform raw data into effective ML features through encoding, scaling, extraction, interaction, and selection. |
| [`ml-time-series`](../../skills/ml/time-series/SKILL.md) | `ml/time-series` | Design time series forecasting architectures with appropriate model selection, feature design, temporal cross-validation, and evaluation protocols. |
| [`data-bi-tools`](../../skills/data/bi-tools/SKILL.md) | `data/bi-tools` | Select BI tools (Metabase, Superset, Looker, Tableau, PowerBI), design semantic layers and dashboard layouts (KPI, trend, comparison, funnel),… |

## Level 3 — Specialist (4 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`ml-model-interpretability`](../../skills/ml/model-interpretability/SKILL.md) | `ml/model-interpretability` | Design interpretability strategies combining global explanations (which features matter overall) and local explanations (why this specific… |
| [`ml-anomaly-detection`](../../skills/ml/anomaly-detection/SKILL.md) | `ml/anomaly-detection` | Design anomaly detection systems with appropriate statistical, proximity-based, ensemble, and deep learning methods, including evaluation… |
| [`ml-recommendation-systems`](../../skills/ml/recommendation-systems/SKILL.md) | `ml/recommendation-systems` | Rank items for a user (or context) so that they engage, buy, or return. |
| [`data-analyst`](../../skills/personas/data-analyst/SKILL.md) | `personas/data-analyst` | Adopt the mindset of a Staff Data Analyst: tie every analysis to an actionable business metric, guard against p-hacking and Simpson's paradox, and… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill data-science-statistical-analysis --skill data-science-experimentation --skill ml-classical-ml --skill ml-model-evaluation --skill security-data-security
```

**Level 1 + 2 + security baseline (10 skills):**

```bash
npx skills add j4flmao/agent-skills --skill data-science-statistical-analysis --skill data-science-experimentation --skill ml-classical-ml --skill ml-model-evaluation --skill data-science-causal-inference --skill data-science-analytics-engineering --skill ml-feature-engineering --skill ml-time-series --skill data-bi-tools --skill security-data-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`ml-engineering`](../bundles.md#ml-engineering) | 24 | Machine learning and data science: classical/deep learning, features, evaluation, serving, MLOps, experimentation |

## Combine with

- [ML & AI Engineer](ml-ai.md)
- [Product Manager & Planner](product.md)

## Watch out

`data-science/experimentation` and `product/ab-testing` overlap; analysts keep the first, PMs the second.
