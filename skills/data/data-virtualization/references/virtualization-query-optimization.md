# Virtualization Query Optimization
Optimizing queries on virtualized data requires understanding pushdown capabilities and query planning.

## Query Planning
- Understand how queries are distributed across worker nodes
- Use EXPLAIN plans to identify optimization opportunities
- Monitor query execution stages and resource usage
- Identify and optimize cross-source joins
- Tune memory allocation for complex queries

## Predicate Pushdown
- Ensure filters are pushed to source databases
- Avoid full source scans by applying early filters
- Use connector-specific pushdown capabilities
- Pushdown aggregations where possible for compute offloading
- Verify pushdown with EXPLAIN output

## Key Points
- Analyze query plans to identify optimization opportunities
- Maximize predicate pushdown for performance
- Use connector-specific features for optimal pushdown
- Monitor and tune resource-intensive queries
- Cache frequently accessed data for repeated queries