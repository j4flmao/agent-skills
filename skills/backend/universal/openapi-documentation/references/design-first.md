# Design-First API Development

## Workflow

```
1. Design spec   → openapi.yaml (collaborative review)
2. Validate spec → swagger-cli validate, redocly lint
3. Mock server   → Prism, Stoplight, or Mockoon
4. Generate code → OpenAPI Generator (server stubs, client SDKs)
5. Implement     → Fill in generated server stubs
6. Test          → Contract tests against spec
7. Document      → Publish with Swagger UI or Redoc
```

## Spec Validation

```bash
# Structural validation
swagger-cli validate openapi.yaml
redocly lint openapi.yaml

# Breaking change detection (OpenAPI Diff)
npx openapi-diff openapi-v1.yaml openapi-v2.yaml --fail-on-breaking

# Semantic validation
npx @stoplight/spectral-cli lint openapi.yaml
```

## Spectral Rules

```yaml
# .spectral.yaml
extends: [[all, off]]

rules:
  openapi-tags:
    message: "OpenAPI spec must have tags"
    given: "$"
    then:
      field: tags
      function: truthy

  operation-operationId:
    message: "Every operation must have an operationId"
    given: "$.paths[*][*]"
    then:
      field: operationId
      function: truthy

  operation-summary:
    message: "Every operation must have a summary"
    given: "$.paths[*][*]"
    then:
      field: summary
      function: truthy

  response-success-status:
    message: "Every operation must define a 2xx response"
    given: "$.paths[*][*].responses"
    then:
      function: truthy
      functionOptions:
        atLeast: 1

  response-error-status:
    message: "Every operation must define a 4xx or 5xx response"
    given: "$.paths[*][*].responses"
    then:
      function: truthy

  snake-case-parameters:
    message: "Query/header parameters must be snake_case"
    severity: warn
    given: "$.paths[*][*].parameters[?(@.in == 'query' || @.in == 'header')].name"
    then:
      function: casing
      functionOptions:
        type: snake

  no-inline-schemas:
    message: "Use $ref to reference schemas instead of inline definitions"
    severity: warn
    given: "$.paths[*][*].responses[*].content[*].schema[?(@.type)]"
    then:
      function: undefined
```

## Mock Servers

```bash
# Stoplight Prism
npx @stoplight/prism-cli mock openapi.yaml -p 4010

# Test against mock
curl http://localhost:4010/users/123
# Returns realistic mock data based on schema types

# Dynamic responses (examples)
curl -H "Prefer: code=404" http://localhost:4010/users/123
```

## Contract Testing

```yaml
# .github/workflows/contract-test.yml
name: Contract Test
on:
  pull_request:
    paths:
      - "openapi.yaml"
      - "src/api/**"

jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run start:test &  # Start server
      - run: npx @stoplight/prism-cli mock openapi.yaml -p 4010 &

      # Verify provider matches spec
      - run: |
          npx openapi-validation \
            --spec openapi.yaml \
            --server http://localhost:3000

      # Verify consumer requests match spec
      - run: |
          npx pact-provider-verifier \
            --provider-base-url http://localhost:3000 \
            --pact-urls ./pacts/*.json
```

## Code Generation

```bash
# Install OpenAPI Generator CLI
npm install @openapitools/openapi-generator-cli -g

# Server stubs
openapi-generator-cli generate -i openapi.yaml -g typescript-express -o src/generated
openapi-generator-cli generate -i openapi.yaml -g python-fastapi -o src/generated
openapi-generator-cli generate -i openapi.yaml -g spring -o src/generated
openapi-generator-cli generate -i openapi.yaml -g go-gin-server -o src/generated
openapi-generator-cli generate -i openapi.yaml -g rust-server -o src/generated

# Client SDKs
openapi-generator-cli generate -i openapi.yaml -g typescript-fetch -o clients/ts
openapi-generator-cli generate -i openapi.yaml -g python -o clients/python
openapi-generator-cli generate -i openapi.yaml -g go -o clients/go
openapi-generator-cli generate -i openapi.yaml -g java -o clients/java
openapi-generator-cli generate -i openapi.yaml -g dart -o clients/dart

# Custom generator options
openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-fetch \
  -o clients/ts \
  --additional-properties=npmName=@org/api-client,npmVersion=1.0.0,supportsES6=true
```

## Design-First Tools

| Tool | Purpose | Hosting |
|------|---------|---------|
| Stoplight Studio | Visual API design editor | Desktop, Web |
| Swagger Editor | OpenAPI editor with preview | Web, Docker |
| Redocly CLI | Lint, bundle, preview | CLI |
| SwaggerHub | Spec management, teams, mock | SaaS, On-prem |
| Postman | Design, test, document | Desktop, SaaS |
| Insomnia | Design, test, generate | Desktop |
| OpenAPI Generator | Code generation from spec | CLI, Maven, Gradle |
