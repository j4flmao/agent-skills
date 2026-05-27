# Contract-Driven Testing

## Contract Testing for Data
Contract-driven testing ensures data producers and consumers agree on schema, semantics, quality, and SLAs before deployment.

## Producer Contract Tests
- Validate schema compliance before publishing
- Test backward compatibility with existing consumers
- Verify data quality meets consumer requirements
- Measure freshness and completeness SLAs

## Consumer Contract Tests
- Validate ability to process new schema versions
- Test forward compatibility
- Verify consumer expectations match producer guarantees

## Key Points
- Automate contract verification in CI/CD pipelines
- Test both forward and backward compatibility
- Maintain a registry of all active contracts
- Monitor contract compliance in production
- Notify stakeholders of contract changes
