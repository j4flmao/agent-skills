# NoSQL Performance Tuning
NoSQL database performance requires different tuning strategies than relational databases.

## Query Optimization
- Design access patterns around data model
- Use appropriate index types (secondary, composite, sparse)
- Leverage query filtering with partition keys
- Avoid table scans with proper key design
- Page through large result sets with cursors

## Caching Strategies
- Implement client-side caching for hot data
- Use database-level cache (MongoDB WiredTiger, Cassandra row cache)
- Apply application-level caching (Redis, Memcached)
- Set appropriate TTLs and invalidation strategies

## Key Points
- Design data model around access patterns first
- Optimize key design for even distribution
- Use caching at multiple layers for performance
- Monitor and tune connection pooling
- Benchmark with production-like data volumes