# WAL and MVCC (Database Concurrency)

## 1. Write-Ahead Logging (WAL)
If a database loses power right after saying "Transaction Committed", how does it not lose data?
Databases do not immediately write your SQL `UPDATE` to the massive 8KB data files (because random disk I/O is slow).
Instead, they use a **Write-Ahead Log (WAL)**.
1. The `UPDATE` command is immediately serialized and *appended* sequentially to the end of the WAL file. (Sequential disk writes are incredibly fast).
2. The database confirms the commit to the user.
3. Later, an asynchronous background thread actually writes the changes to the real data files.
If the server crashes, upon reboot, the database reads the WAL and replays the missed operations. 

## 2. Multi-Version Concurrency Control (MVCC)
In older databases, if Alice was reading a row, she placed a "Read Lock" on it. If Bob tried to update that row, he had to wait. This destroyed performance at scale.
Modern databases (PostgreSQL) use **MVCC** so *Readers never block Writers, and Writers never block Readers*.

### How MVCC Works (PostgreSQL)
When you run `UPDATE users SET name = 'Bob' WHERE id = 1`:
1. Postgres does **not** delete or overwrite the old row (name='Alice').
2. Instead, it inserts a completely new row (name='Bob') with a hidden tag: `created_at_tx = 105`.
3. It tags the old row with `deleted_at_tx = 105`.

**The Magic**: 
- If Charlie started his `SELECT` query *before* Transaction 105 committed, his query continues to read the old 'Alice' row (because his snapshot is older than 105).
- If Dave starts his query *after* 105 committed, he sees the new 'Bob' row.

### The Downside (VACUUM)
Because old rows are never deleted during an `UPDATE`, the database physically grows with "Dead Tuples". 
Postgres must run a background process called **VACUUM** to periodically scan the disk, find rows that are no longer visible to any active transaction, and mark their space as reusable. If VACUUM breaks, your disk fills up and the database crashes (Transaction ID Wraparound).
