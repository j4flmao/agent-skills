# Data Modeling Best Practices

## Naming Conventions
Consistent naming improves model discoverability, maintainability, and cross-team collaboration.

## Model Hierarchy
- Source: Raw data as received from source systems
- Staging: Cleaned and standardized source data
- Intermediate: Business logic transformations
- Marts: Consumer-ready aggregated models

## Documentation Standards
- Document model purpose and business context
- Define column descriptions and data types
- Describe transformations and business rules
- Note data freshness and SLAs
- Identify data owners and stewards

## Review Process
- Peer review for all model changes
- Schema impact analysis before deployment
- Performance review for complex transformations
- Stakeholder sign-off for critical models
- Periodic model review and deprecation

## Key Points
- Apply consistent naming conventions across all models
- Organize models in a clear hierarchy (source, staging, intermediate, marts)
- Document model purpose, columns, and transformations
- Implement peer review for model changes
- Regularly review and deprecate unused models
