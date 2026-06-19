# Pact Broker Deep Dive

## What is Pact Broker
The Pact Broker is a central repository for publishing, sharing, and versioning Pact contracts. It enables the can-i-deploy workflow and provides visibility into service dependencies across the microservice ecosystem.

## Key Features
- **Versioned contracts**: Every publication is versioned; supports matrix comparisons
- **Verification status**: Tracks which provider versions have verified which consumer versions
- **Dependency graph**: Auto-generated graph of consumer-provider relationships
- **Webhooks**: Trigger CI pipelines when contracts change or verification fails
- **Tags**: Label versions (prod, staging, test) for environment-specific queries
- **Can-I-Deploy**: Query compatibility before deployment
- **WIP Pacts**: Allow work-in-progress contracts during development

## Deployment Options
- **Pact Broker OSS**: Free, self-hosted Docker image, single-node
- **PactFlow (SaaS)**: Managed service with additional features (SSO, RBAC, badges)
- **Pact Broker on Kubernetes**: Helm chart available for production deployment

## Docker Setup
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: pact
      POSTGRES_PASSWORD: pact_broker
    volumes:
      - postgres_data:/var/lib/postgresql/data
  pact-broker:
    image: pactfoundation/pact-broker:latest
    ports:
      - "9292:9292"
    environment:
      PACT_BROKER_DATABASE_USERNAME: pact
      PACT_BROKER_DATABASE_PASSWORD: pact_broker
      PACT_BROKER_DATABASE_HOST: postgres
      PACT_BROKER_DATABASE_NAME: pact_broker
      PACT_BROKER_BASE_URL: https://pact-broker.company.com
```

## Webhook Configuration
```yaml
webhooks:
  consumer_contract_changed:
    events: ["contract_content_changed"]
    request:
      method: POST
      url: "https://ci.company.com/pipeline/provider-verification"
      headers:
        Authorization: "Bearer ${CI_TOKEN}"
      body: |
        {
          "provider": "${pactbroker.providerName}",
          "consumer": "${pactbroker.consumerName}",
          "version": "${pactbroker.providerVersion}"
        }
  verification_failed:
    events: ["provider_verification_failed"]
    request:
      method: POST
      url: "https://hooks.slack.com/services/T00/B00/xxx"
      body: |
        {"text": "Verification failed for ${pactbroker.consumerName} v${pactbroker.consumerVersion} on ${pactbroker.providerName}"}
```

## Can-I-Deploy Usage
```bash
# Check if consumer can deploy to production
pact-broker can-i-deploy \
  --pacticipant OrderService \
  --version 1.2.3 \
  --to-environment production

# Check with dependencies
pact-broker can-i-deploy \
  --pacticipant WebApp \
  --version 2.1.0 \
  --to-environment production \
  --pacticipant OrderService \
  --version 1.2.3

# Matrix query for specific versions
pact-broker can-i-deploy \
  --pacticipant WebApp \
  --version 2.1.0 \
  --pacticipant OrderService \
  --version 1.2.3
```

## Tag Strategies
- `prod`: Currently deployed in production — the gold standard
- `staging`: Ready for production — verified against staging
- `test`: Available for testing — not yet production-ready
- `feature-x`: Feature branch — for early validation
- `dev`: Development versions — works-in-progress

## Key Points
- Pact Broker is essential for contracts at scale across teams
- Webhooks automate provider verification when contracts change
- Tag versions by environment for targeted can-i-deploy queries
- Always run can-i-deploy before production deployment
- PactFlow adds enterprise features for large organizations
