# Identity Strategies for Reverse ETL
Identity resolution is critical for reverse ETL to ensure data reaches the correct customer profile in operational tools.

## Identity Resolution
- Match on unique identifiers when available (email, user_id)
- Use deterministic matching for high confidence
- Apply probabilistic matching for fuzzy matches
- Implement merge rules for conflicting identities
- Handle identity graph updates gracefully

## Key Points
- Use deterministic matching as the primary strategy
- Implement merge rules for conflicting identities
- Handle unmatchable records with dead letter queues
- Test identity resolution with operational tool APIs
- Monitor match rates and quality over time