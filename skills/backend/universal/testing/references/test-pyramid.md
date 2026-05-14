# Test Pyramid

## Structure
```
         /\
        /e2e\          5-10 per service
       /------\
      /integr.\        1-2 per adapter
     /----------\
    / unit tests \     Cover all domain + application logic
   /--------------\
```

## Unit Tests
- **Scope**: Domain entities, value objects, domain services, use case logic
- **Dependencies**: None (mock repository interfaces)
- **Speed**: < 1ms per test
- **Naming**: `should_{expected}_when_{condition}`
- **Framework**: Jest, pytest, Go test, cargo test, JUnit

## Integration Tests
- **Scope**: Repository implementations, external API clients, message consumers
- **Dependencies**: Real database (testcontainers), real message broker
- **Speed**: < 100ms per test
- **Setup**: Use test lifecycle hooks for container management

## E2E Tests
- **Scope**: Critical user journeys through the full stack
- **Dependencies**: Real services (staging environment)
- **Speed**: < 10s per test
- **Number**: Keep under 10 per service
