# DuckDB (In-Process OLAP)

## 1. Skill Context
**Focus**: Fast analytical SQL inside the application process (Python, R, Node, Java, CLI, WASM), with no database server.
**Triggers**: duckdb, in-process-olap, vectorized-execution, apache-arrow.

## 2. "SQLite for Analytics"
SQLite is in-process and row-oriented, which suits transactional CRUD (OLTP). DuckDB is also in-process, but uses **columnar storage** and **vectorized execution**: operators process batches of one column at a time ("vectors", 2,048 values by default). Batches stay in CPU cache, compilers can apply SIMD, and queries run in parallel across cores.
A database file can be opened for writing by only one process at a time. DuckDB does not replace a multi-user OLTP server.

## 3. Reading Data Where It Lives
- **Files**: Query them directly: `SELECT * FROM 'events/*.parquet'`, `read_csv('x.csv')`, `read_json(...)`. The `httpfs` extension adds S3/HTTP access; the iceberg and delta extensions read those table formats.
- **DataFrames**: Reference a Pandas, Polars, or Arrow object in scope by its variable name in SQL (replacement scan).
  - Arrow-backed data (Arrow tables, Polars) is scanned without copying.
  - Pandas data may be converted for some column types (e.g. object-dtype strings).
- **Results**: Fetch them with `.df()`, `.pl()`, `.arrow()`, or `.fetchall()`.

## 4. When to Use
- **Good**: Local/embedded analytics, ETL steps over Parquet, notebook exploration, CI data tests, in-browser analytics (WASM).
- **Not good**: High-concurrency writes from many clients, or multi-TB workloads that need a distributed engine. For shared access, use MotherDuck or a warehouse.
