# Delta Lake Time Travel

## Time Travel Fundamentals
Delta Lake time travel allows querying previous versions of a table, enabling reproducibility, audit, and rollback.

## Time Travel Operations
- Query by version number
- Query by timestamp
- Restore table to previous version
- Compare versions for change analysis
- Vacuum old versions for storage optimization

## Vacuum Strategies
- Set appropriate retention period (default 7 days)
- Schedule vacuum during low-activity windows
- Exclude necessary versions from cleanup
- Monitor storage savings from vacuum operations
- Implement multi-step vacuum for large tables

## Key Points
- Use time travel for reproducibility and audit compliance
- Set version retention based on recovery requirements
- Schedule vacuum to manage storage costs
- Test vacuum operations before production deployment
- Combine with table maintenance (optimize, Z-order)