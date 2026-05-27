---
name: blockchain-data-indexing
description: >-
  Blockchain indexing covering The Graph subgraphs, Dune Analytics, Goldsky
  pipelines, ChainIndex custom indexers, and ETL event-warehousing patterns.
version: 1.0.0
author: j4flmao
license: MIT
tags:
  - blockchain
  - indexing
  - data
  - subgraph
  - dune
  - phase-blockchain
---

# blockchain-data-indexing

## Trigger keywords

- blockchain indexer
- subgraph
- The Graph
- Dune Analytics / Dune
- Goldsky
- ChainIndex
- indexer architecture
- event indexing / event handler
- call handler / block handler
- data source template / dynamic data source
- spellbook / decoded table
- pipeline / mirror
- ETL blockchain
- reorg handling / chain reorg
- log polling / event-driven indexing
- fromBlock / toBlock / healing

## Rules

1.  **Prefer The Graph for standard EVM event/call/block indexing** unless the user needs SQL-based exploration, in which case recommend Dune Analytics.
2.  **Dune queries must use Databricks SQL syntax** and prefer `crypto_` / `ethereum_` tables or `spellbook` models over raw decoded tables unless raw data is explicitly needed.
3.  **Goldsky pipelines** should be structured as declarative YAML source → transformation → sink; use Mirror for complex joins or multi-chain aggregation.
4.  **ChainIndex custom indexers** should be suggested only when the team needs tight control over storage schema, reorg strategy, or batch processing — otherwise default to The Graph.
5.  **Always model reorg handling explicitly** — every event-driven design must specify confirmation depth, unwind logic, and a `fromBlock`/`toBlock` healing window.
6.  **Subgraph manifests** (`subgraph.yaml`) must pin a specific `startBlock` and use a `network` matching the target chain; never leave `startBlock: 0` for production.
7.  **Security & correctness**: never expose RPC URLs or API keys in code; use environment variables; validate event signatures against known ABIs before processing.

## Response Format

When asked about blockchain data indexing, respond with:

1.  **Recommendation** – which tool or protocol fits the use case (The Graph, Dune, Goldsky, ChainIndex, or a hybrid).
2.  **Architecture** – one-paragraph overview of the indexing pipeline (source chain → data source → transformation → storage → query layer).
3.  **Key configuration snippet** – relevant YAML/SQL/AssemblyScript excerpt (e.g. subgraph.yaml, a Dune query, a Goldsky pipeline spec, or an event handler).
4.  **Reorg & safety** – how the design handles reorgs, missing blocks, and data consistency.
5.  **Alternatives / trade-offs** – when another approach would be better and why.

## References
  - references/blockchain-data-indexing-advanced.md — Blockchain Data Indexing Advanced Topics
  - references/blockchain-data-indexing-fundamentals.md — Blockchain Data Indexing Fundamentals
  - references/blockchain-data-query.md — Blockchain Data Query Patterns
  - references/dune-analytics.md — Dune Analytics Reference
  - references/event-processing.md — Blockchain Event Processing
  - references/goldsky-chainindex.md — Goldsky & ChainIndex Reference
  - references/indexer-architecture.md — Indexer Architecture Patterns
  - references/the-graph-subgraph.md — The Graph — Subgraph Reference
## Phase: blockchain → blockchain-data-indexing

This skill belongs to the `blockchain` phase group. Activate it when the user's question matches any trigger keyword above.
