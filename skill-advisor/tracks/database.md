# Database Engineer

**Who this is for:** You design schemas, tune queries and run databases at scale.

[← Advisor home](../README.md) · [Build a custom bundle](../custom-bundles.md) · [Recipes](../recipes.md)

## Security baseline (2 skills, installed with every level)

These skills make the agent apply this domain's security practices by default. They are included in every install command below; the repository-wide baseline is in [`.claude/rules/secure-by-default.md`](../../.claude/rules/secure-by-default.md).

| Skill | Path | What it covers |
|-------|------|----------------|
| [`security-data-security`](../../skills/security/data-security/SKILL.md) | `security/data-security` | Implements data security controls: encryption, key management, masking, column-level security, and data anonymization for regulatory compliance. |
| [`security-secrets-management`](../../skills/security/secrets-management/SKILL.md) | `security/secrets-management` | Design a secrets management strategy covering detection (GitLeaks, truffleHog, ggshield), centralized storage (Vault, AWS Secrets Manager, GCP… |

## Level 1 — Essentials (3 skills)

Install these first. They cover the everyday work of this role and rarely conflict.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`data-relational-database`](../../skills/data/relational-database/SKILL.md) | `data/relational-database` | Design relational database schemas with proper indexing, partitioning, replication, connection pooling, and query optimization strategies. |
| [`backend-database-patterns`](../../skills/backend/universal/database-patterns/SKILL.md) | `backend/universal/database-patterns` | Design efficient, maintainable database schemas and queries. |
| [`database-migration`](../../skills/devops/database-migration/SKILL.md) | `devops/database-migration` | Plan and execute database migrations including schema changes, cross-engine migration, zero-downtime deployments, and rollback strategies. |

## Level 2 — Professional (5 skills)

Add when the project grows: production concerns, scaling and team workflows.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`data-nosql-database`](../../skills/data/nosql-database/SKILL.md) | `data/nosql-database` | Select and design NoSQL databases by access patterns, data shape, consistency requirements, and scale. |
| [`database-internals-mechanics`](../../skills/data/database-internals/SKILL.md) | `data/database-internals` | Explain why a database behaves the way it does under a workload: why random-key inserts hurt a B-tree, why an LSM store has read and space… |
| [`architecture-postgresql-internals`](../../skills/architecture/databases/postgresql-internals/SKILL.md) | `architecture/databases/postgresql-internals` | Most PostgreSQL production issues (bloat, sudden slowdowns, replication lag, wraparound emergencies, bad plans) are direct consequences of how… |
| [`architecture-database-scaling`](../../skills/architecture/databases/scaling-and-sharding/SKILL.md) | `architecture/databases/scaling-and-sharding` | Sharding is the most expensive scaling step: it complicates queries, transactions, schema changes, and operations forever. |
| [`system-design-database-sharding`](../../skills/system-design/database-sharding/SKILL.md) | `system-design/database-sharding` | Sharding splits one logical dataset across independent database servers so writes and storage scale horizontally. |

## Level 3 — Specialist (5 skills)

Add one at a time, only for the problem in front of you. These are deep and narrow.

| Skill | Path | What it covers |
|-------|------|----------------|
| [`data-graph-database`](../../skills/data/graph-database/SKILL.md) | `data/graph-database` | Design graph data models for connected domains (social networks, recommendation engines, knowledge graphs, fraud detection) with optimal traversal… |
| [`data-search-engine`](../../skills/data/search-engine/SKILL.md) | `data/search-engine` | Design and configure search engine clusters for full-text search, log analytics, and real-time data exploration with proper indexing, query… |
| [`data-vector-databases`](../../skills/data/vector-databases/SKILL.md) | `data/vector-databases` | Store embedding vectors with metadata and return the nearest neighbors of a query vector fast enough for interactive use. |
| [`architecture-crdts`](../../skills/architecture/crdts/SKILL.md) | `architecture/crdts` | CRDTs let replicas accept writes independently (offline, peer-to-peer, multi-region) and still converge to the same state once they have seen the… |
| [`distributed-consensus`](../../skills/system-design/distributed-consensus/SKILL.md) | `system-design/distributed-consensus` | Consensus lets a group of machines agree on a sequence of values (a replicated log) despite crashes and network partitions, which is how etcd,… |

## Install

Add `-a <agent>` (for example `-a claude-code`) to target one agent, `-g` for a global install, `-y` to skip prompts.

**Level 1 + security baseline (5 skills):**

```bash
npx skills add j4flmao/agent-skills --skill data-relational-database --skill backend-database-patterns --skill database-migration --skill security-data-security --skill security-secrets-management
```

**Level 1 + 2 + security baseline (10 skills):**

```bash
npx skills add j4flmao/agent-skills --skill data-relational-database --skill backend-database-patterns --skill database-migration --skill data-nosql-database --skill database-internals-mechanics --skill architecture-postgresql-internals --skill architecture-database-scaling --skill system-design-database-sharding --skill security-data-security --skill security-secrets-management
```

Level 3: add single skills with `--skill <name>` when you need them.

## Ready-made bundles

Bundles are installed with the same command; each one's full command is on the [bundles page](../bundles.md).

| Bundle | Skills | Description |
|--------|--------|-------------|
| [`data-engineering`](../bundles.md#data-engineering) | 45 | Data engineering: pipelines, orchestration, streaming/CDC, lakes and lakehouses, warehousing, modeling, quality, governance |
| [`backend-patterns`](../bundles.md#backend-patterns) | 27 | Advanced backend patterns: CQRS, Event Sourcing, Saga, Transactional Outbox + related universal skills |

## Combine with

- [Backend Engineer](backend.md)
- [Data Engineer](data-engineering.md)

## Watch out

Read `.claude/rules/database-design-standards.md` (keys, soft deletes, constraints, N+1).
