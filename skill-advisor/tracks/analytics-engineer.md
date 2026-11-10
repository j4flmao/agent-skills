# Analytics Engineer

**Who this is for:** You model warehouse data with dbt and serve trusted metrics.

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
| [`data-science-analytics-engineering`](../../skills/data-science/analytics-engineering/SKILL.md) | `data-science/analytics-engineering` | Design and build production analytics pipelines with dbt Core (models, materializations, Jinja macros, ref/source, tests, documentation), metrics… |
| [`data-dimensional-modeling`](../../skills/data/dimensional-modeling/SKILL.md) | `data/dimensional-modeling` | Design robust dimensional data models for analytical workloads following Kimball methodology, star schema best practices, slowly changing… |
| [`data-data-warehouse`](../../skills/data/data-warehouse/SKILL.md) | `data/data-warehouse` | Design data warehouse schemas with dimensional modeling, platform-specific optimization, materialized views, and cost controls. |
| [`data-data-quality`](../../skills/data/data-quality/SKILL.md) | `data/data-quality` | Build a data quality framework covering quality dimensions (completeness, accuracy, timeliness, consistency, uniqueness, integrity), automated… |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`data-bi-tools`](../../skills/data/bi-tools/SKILL.md) | `data/bi-tools` | Select BI tools (Metabase, Superset, Looker, Tableau, PowerBI), design semantic layers and dashboard layouts (KPI, trend, comparison, funnel),… |
| [`data-testing`](../../skills/data/data-testing/SKILL.md) | `data/data-testing` | Implement automated data testing across the data platform: unit tests for dbt models, regression detection between environments, data quality… |
| [`data-lineage`](../../skills/data/data-lineage/SKILL.md) | `data/data-lineage` | Capture, store, query, and visualize end-to-end data lineage from source systems through transformations to dashboards, supporting impact… |
| [`data-data-contracts`](../../skills/data/data-contracts/SKILL.md) | `data/data-contracts` | Design and enforce data contracts between producers and consumers covering schema, semantics, SLA, ownership, versioning, and compatibility — with… |
| [`data-data-catalog`](../../skills/data/data-catalog/SKILL.md) | `data/data-catalog` | Design and deploy a data catalog platform with metadata ingestion, column-level lineage, business glossary, data discovery, ownership model, and… |

## Level 3 — Specialist (3 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`data-reverse-etl`](../../skills/data/reverse-etl/SKILL.md) | `data/reverse-etl` | Sync aggregated, transformed data from a data warehouse to operational SaaS tools (CRM, marketing, support) to power customer-facing and internal… |
| [`data-data-observability`](../../skills/data/data-observability/SKILL.md) | `data/data-observability` | Design comprehensive data observability across pipelines: freshness, volume, schema, quality, lineage, and incident management. |
| [`data-science-experimentation`](../../skills/data-science/experimentation/SKILL.md) | `data-science/experimentation` | Design and analyze rigorous A/B tests and experiments. |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill data-science-analytics-engineering --skill data-dimensional-modeling --skill data-data-warehouse --skill data-data-quality --skill security-data-security
```

**Level 1 + 2 + security baseline (10 skills):**

```bash
npx skills add j4flmao/agent-skills --skill data-science-analytics-engineering --skill data-dimensional-modeling --skill data-data-warehouse --skill data-data-quality --skill data-bi-tools --skill data-testing --skill data-lineage --skill data-data-contracts --skill data-data-catalog --skill security-data-security
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`data-engineering`](../bundles.md#data-engineering) | 45 | Data engineering: pipelines, orchestration, streaming/CDC, lakes and lakehouses, warehousing, modeling, quality, governance |
| [`data-platform`](../bundles.md#data-platform) | 39 | Data platform: ETL, warehouse, streaming, BI, quality, storage, compute, lake, lakehouse, batch, orchestration, CDC, replication, catalog, observability, contracts, mesh, versioning, API, virtualization, schema registry, relational, NoSQL, graph, search, clean-room, cost-optimization, formats, lineage, pipeline-CI/CD, testing, reverse-ETL |

## Combine with

- [Data Engineer](data-engineering.md)
- [Data Scientist & Analyst](data-scientist.md)

## Watch out

dbt metrics now live in MetricFlow (semantic layer); older `metrics:` blocks in tutorials are legacy.
