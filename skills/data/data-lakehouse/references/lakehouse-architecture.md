# Lakehouse Architecture: Layers and Commit Mechanics

A lakehouse stores data as open files on object storage and adds a table format and catalog so that many engines get warehouse semantics (ACID, schema, time travel) over the same data. This reference explains the layers and how a commit works. Format internals are in `lakehouse-format-deep-dive.md`; medallion data flow in `medallion-architecture.md`.

## 1. Layer Stack

```
Consumers      BI, notebooks, ML, apps, partners
    ▲
Engines        Spark, Flink, Trino, Snowflake, Databricks SQL, Athena, BigQuery, DuckDB, StarRocks, Dremio
    ▲
Catalog        table name → current metadata pointer, access control, credential vending
               (Iceberg REST, Unity Catalog, Glue, Polaris, Nessie, HMS)
    ▲
Table format   Iceberg / Delta Lake / Hudi / Paimon metadata (snapshots, manifests, log, stats)
    ▲
File format    Parquet (most common), ORC, Avro
    ▲
Storage        S3, ADLS Gen2, GCS, S3-compatible object stores
```

| Layer | Responsibility | Lock-in risk |
|---|---|---|
| Storage | Durability, cost tiers | Low (data is plain files) |
| File format | Columnar encoding, compression, page stats | Low |
| Table format | Atomic commits, schema/partition evolution, time travel, file-level stats | Medium (choose one per table) |
| Catalog | Naming, atomic pointer swap, governance | Medium–high (policies are catalog-specific) |
| Engine | Query planning and execution | Low if catalog is open |

## 2. Why the Table Format Layer Exists

Plain Parquet directories have no transactions: readers see partial writes, there is no consistent snapshot, and listing large prefixes is slow. Table formats keep an explicit list of the files that make up each table version. Readers use the list instead of directory listings; writers publish a new list atomically.

## 3. Commit Protocol (Optimistic Concurrency)

Iceberg:

```
1. Read current metadata pointer from catalog → metadata v12
2. Write new data files (not visible to anyone yet)
3. Write new manifest(s) + manifest list + metadata v13 referencing them
4. Ask catalog: "swap pointer v12 → v13" (compare-and-swap)
   ├─ success → commit visible to all new readers
   └─ pointer moved (someone committed v13') → re-validate against v13',
      rewrite metadata as v14 if no conflict, retry swap
```

Delta Lake:

```
1. Read _delta_log up to latest version N (checkpoint + JSON commits)
2. Write new data files
3. Create _delta_log/000...(N+1).json with add/remove actions, put-if-absent
   ├─ success → version N+1 committed
   └─ file exists → check conflicts with winning commit, retry as N+2
```

Consequences:
- Data files are written before commit; failed commits leave orphan files cleaned up later.
- Conflicts are detected at commit time, so long-running writers lose to frequent short ones.
- Readers always see a complete snapshot; they never block writers.

## 4. Separation of Storage and Compute

- Multiple engines read the same table without copies; each scales independently.
- Storage cost is object-storage pricing; compute is paid per engine use.
- The catalog becomes the shared contract: who can see a table, which metadata is current, and which credentials to use.

## 5. Choosing Components

| Decision | Options | Guidance |
|---|---|---|
| Table format | Iceberg, Delta, Hudi, Paimon | Iceberg for widest multi-engine/vendor support; Delta on Databricks-centric platforms; Paimon for Flink-based high-rate upserts; Hudi where already established |
| Catalog | Iceberg REST (Polaris, Lakekeeper, Nessie, S3 Tables, Unity Catalog), Glue, HMS | Prefer a REST catalog with credential vending for multi-engine access |
| Primary write engine | Spark, Flink, managed platform | One engine family writes each table |
| Query engines | Trino, Databricks SQL, Snowflake, Athena, DuckDB | Pick by concurrency and BI needs; all read via the catalog |

## 6. Lakehouse vs Warehouse vs Lake

| | Data lake | Warehouse | Lakehouse |
|---|---|---|---|
| Storage | Open files | Proprietary managed storage | Open files + open table format |
| ACID | No | Yes | Yes |
| Engines | Many, uncoordinated | One | Many, coordinated via catalog |
| Schema enforcement | On read | On write | On write, with evolution |
| Unstructured / ML data | Yes | Limited | Yes |
| Fine-grained governance | Weak | Strong | Catalog-dependent |

## Pitfalls

- Treating the catalog as an afterthought: Hive-style path tables without a catalog lose atomic commits for Iceberg.
- Writing the same table from several engines through different catalogs.
- Assuming all engines support all table features (deletion vectors, v3 types, row filters); check reader support.
- No maintenance plan: metadata, small files, and snapshots grow without bound.

## Checklist

- [ ] Table format and catalog chosen per platform, documented as an ADR.
- [ ] One write engine family per table; readers enumerated.
- [ ] Catalog provides access control and credential vending.
- [ ] Maintenance (compaction, snapshot expiry, orphan cleanup) owned and scheduled.
