# NoSQL CAP Theorem
Understanding CAP theorem trade-offs is essential for choosing and operating NoSQL databases.

## CAP Trade-offs
- Consistency: All nodes see the same data simultaneously
- Availability: Every request receives a response (even if stale)
- Partition Tolerance: System continues operating despite network partitions

## Practical Trade-offs
- CP systems: HBase, MongoDB (default), Redis
- AP systems: Cassandra, CouchDB, DynamoDB (default)
- CA systems: Traditional relational databases (no partition tolerance)

## Key Points
- Apply CAP theorem understanding to NoSQL selection
- Consider PACELC for additional latency-consistency trade-offs
- Match database choice to application consistency requirements
- Configure consistency levels appropriately for each use case