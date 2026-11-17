# Storage Engines: B-Trees vs. LSM-Trees

## 1. Skill Context
**Focus**: Understanding how databases actually write bytes to disks. The choice of storage engine dictates whether your database can handle millions of rapid writes (IoT) or rapid random reads (E-Commerce).
**Triggers**: database-internals, storage-engine, b-tree, lsm-tree, rocksdb, cassandra, postgres.

## 2. B-Trees (The Read-Optimized Standard)
*Used by: PostgreSQL, MySQL (InnoDB), Oracle.*
A B-Tree (Balanced Tree) stores data in fixed-size blocks (Pages, typically 8KB). 
- **How it works**: The tree is constantly re-balanced. Finding a row takes `O(log N)` disk accesses. 
- **The Catch (Write Amplification)**: If you update a single 10-byte row, the database must rewrite the entire 8KB Page to disk. If you write randomly (e.g., using random UUIDs), you constantly split pages, trashing the disk and slowing down insert performance drastically.
- **Best For**: High read-heavy workloads, strong transactional integrity, and range queries.

## 3. LSM-Trees (The Write-Optimized Beast)
*Used by: Cassandra, ScyllaDB, RocksDB, LevelDB, InfluxDB.*
Log-Structured Merge-Trees abandon the concept of updating data in place.
- **How it works (The MemTable)**: All writes go directly into an in-memory tree (MemTable) and are appended to a log. This is blazing fast because it relies purely on sequential RAM writes.
- **Flushing (SSTables)**: When the MemTable gets full (e.g., 64MB), it is flushed to disk as an immutable (read-only) Sorted String Table (SSTable).
- **Compaction**: Over time, you accumulate thousands of SSTables on disk. A background thread constantly reads them, merges them, throws away deleted rows (Tombstones), and writes a new consolidated SSTable.
- **The Catch (Read Amplification)**: To find a row, you might have to search the MemTable, then check Level 0 SSTables, then Level 1, etc. Reads are inherently slower than B-Trees (mitigated by Bloom Filters).
- **Best For**: IoT data, time-series, messaging apps (Discord uses ScyllaDB), where write throughput is the absolute bottleneck.
