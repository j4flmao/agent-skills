# Hive and Spark SQL Reference

## Hive Metastore Architecture

```
Hive Metastore (HMS):
  +---------------+
  | Hive Metastore|  (Thrift service, port 9083)
  | Server        |
  +-------+-------+
          |
   JDBC   v
  +---------------+
  | Metastore DB  |  (PostgreSQL, MySQL, or Derby)
  | - TABLES      |  table_id, name, db_id, owner
  | - PARTITIONS  |  partition_id, table_id, part_name
  | - COLUMNS     |  column_id, column_name, type
  | - SERDE_PARAMS|  input/output format, location
  | - SDS         |  storage descriptor (location, format)
  | - TBLS        |  table metadata
  +---------------+

Key tables in HMS:
  DBS:         database id, name, location, owner
  TBLS:        table metadata (name, db, owner, create_time)
  PARTITIONS:  partition key values, location
  SDS:         serde, input/output format, location URI
  COLUMNS_V2:  column name, type, comment, ordinal
```

## Spark SQL Catalyst Optimizer

```
Phase 1 - Analysis:
  Input: unresolved logical plan (SQL text parsed)
  Actions:
    - Resolve column names (look up in catalog)
    - Resolve table names (look up in metastore)
    - Resolve data types
  Output: resolved logical plan

Phase 2 - Logical Optimization:
  Actions:
    - Constant folding (1 + 1 -> 2)
    - Predicate pushdown (filter before join)
    - Projection pruning (select only needed columns)
    - Null propagation (null in boolean expressions)
    - Simplify expressions (NOT(a > b) -> a <= b)
    - Combine filters (WHERE x > 1 AND x < 10)
  Output: optimized logical plan

Phase 3 - Physical Planning:
  Strategies:
    - Join selection: BroadcastHashJoin vs ShuffledHashJoin vs SortMergeJoin
    - Aggregate selection: HashAggregate vs SortAggregate
    - Cost-based: CBO compares multiple physical plans, picks cheapest
  Output: selected physical plan

Phase 4 - Code Generation (Tungsten):
  Whole-stage codegen: generate a single Java method per stage
  Eliminates virtual function calls, uses sun.misc.Unsafe for row access
  Output: compiled Java bytecode
```

## HQL vs Spark SQL Features

| Feature              | HiveQL (Hive 4.x)     | Spark SQL (3.x)     |
|----------------------|-----------------------|---------------------|
| ACID transactions    | Full (INSERT/UPDATE/   | No (use Delta/       |
|                      |  DELETE)              |  Iceberg for ACID)  |
| User-defined functions| Java UDF, UDAF,      | Scala/Java/Python   |
|                      |  UDTF, Transform      |  UDF/UDAF/UDTF     |
| Windowing            | Yes                   | Yes                 |
| Subqueries           | Correlated + scalar   | Correlated + scalar |
| Lateral view         | Yes (explode arrays)  | Yes                 |
| Materialized views   | Yes (rewrite)         | No (use Delta cache)|
| Merge (upsert)       | MERGE INTO            | No native (Delta)   |
| SQL standard compliance| Partial (HiveQL SQL:2011+) | Better (ANSI SQL) |
| Cost-based optimizer | Yes (Calcite)         | Yes (Catalyst + CBO)|
| Vectorized execution | Yes (ORC native)      | Yes (whole-stage)   |

## Hive Configuration (Tez Engine)

```xml
<property><name>hive.execution.engine</name><value>tez</value></property>
<property><name>hive.tez.container.size</name><value>8192</value></property>
<property><name>hive.tez.java.opts</name><value>-Xmx6553m</value></property>
<property><name>hive.vectorized.execution.enabled</name><value>true</value></property>
<property><name>hive.vectorized.execution.reduce.enabled</name><value>true</value></property>
<property><name>hive.cbo.enable</name><value>true</value></property>
<property><name>hive.stats.autogather</name><value>true</value></property>
<property><name>hive.tez.auto.reducer.parallelism</name><value>true</value></property>
<property><name>hive.merge.tezfiles</name><value>true</value></property>
<property><name>hive.merge.size.per.task</name><value>268435456</value></property>
</configuration>
```

## Spark SQL Tuning

```properties
spark.sql.shuffle.partitions = 200            # Increase for large data
spark.sql.adaptive.enabled = true
spark.sql.adaptive.coalescePartitions.enabled = true
spark.sql.adaptive.skewJoin.enabled = true
spark.sql.broadcastTimeout = 600
spark.sql.files.maxPartitionBytes = 134217728
spark.sql.files.openCostInBytes = 4194304
spark.sql.sources.bucketing.enabled = true
spark.sql.codegen.wholeStage = true
spark.sql.codegen.maxFields = 100

# Parquet specific
spark.sql.parquet.enableVectorizedReader = true
spark.sql.parquet.mergeSchema = false        # Avoid schema merge overhead
spark.sql.parquet.filterPushdown = true
spark.sql.parquet.compression.codec = zstd
```

## Hive UDF Example

```sql
-- Register UDF
ADD JAR /path/to/hive-udfs.jar;
CREATE TEMPORARY FUNCTION mask_ssn AS 'com.example.MaskSSN';

-- Usage
SELECT mask_ssn(ssn) FROM customers;

-- Custom UDF skeleton
-- Java: extend org.apache.hadoop.hive.ql.exec.UDF
-- public class MaskSSN extends UDF {
--   public Text evaluate(Text input) {
--     if (input == null) return null;
--     String ssn = input.toString();
--     return new Text("***-**-" + ssn.substring(ssn.length() - 4));
--   }
-- }
```
