# DuckDB (In-Process OLAP)

## 1. Skill Context
**Focus**: Lightning-fast analytical (OLAP) SQL queries running entirely inside the application process, without a dedicated database server.
**Triggers**: duckdb, in-process-olap, vectorized-execution, apache-arrow.

## 2. The SQLite for Analytics
SQLite is an in-process database, but it reads data row-by-row (good for transactional CRUD / OLTP). 
DuckDB is in-process but uses **Columnar Storage** and **Vectorized Query Execution**.
- Instead of processing one row at a time, DuckDB processes chunks of data (e.g., arrays of 1024 values) using tight loops that fit perfectly into the CPU's L1 Cache and utilize SIMD instructions.

## 3. Zero-Copy with Arrow
DuckDB natively speaks Apache Arrow (the in-memory standard for columnar data). You can pass a Pandas DataFrame or a Polars DataFrame directly into a DuckDB SQL query, and it will query the RAM instantly without copying or serializing the data.
