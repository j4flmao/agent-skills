# OpenAPI Tools

## Documentation Tooling

| Tool | Purpose | Output |
|------|---------|--------|
| Swagger UI | Interactive API documentation | HTML with Try-it-out |
| Redoc | Beautiful static documentation | Standalone HTML page |
| Stoplight Elements | Component-based API docs | React/Vanilla JS web components |
| Swagger Editor | Online spec editor with live preview | YAML/JSON with validation |
| Spectral | Linting and style enforcement | CLI and IDE integration |
| Redocly CLI | Lint, preview, bundle, diff | CLI toolchain |
| swagger-cli | Validate, bundle, convert | CLI tools |

## Swagger UI Configuration

```yaml
# Swagger UI config (swagger-initializer.js)
window.onload = function() {
  window.ui = SwaggerUIBundle({
    url: "/api/openapi.yaml",
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset,
    ],
    plugins: [SwaggerUIBundle.plugins.DownloadUrl],
    layout: "StandaloneLayout",
    tryItOutEnabled: true,
    requestSnippetsEnabled: true,
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3,
    docExpansion: "list",
    filter: true,  // Enable endpoint search
    showExtensions: true,
    showCommonExtensions: true,
    supportedSubmitMethods: ['get', 'put', 'post', 'delete', 'patch'],
  });
};
```

## Linting with Spectral

```yaml
# .spectral.yaml — custom ruleset
extends: spectral:oas
rules:
  # Enforce naming conventions
  operation-operationId: error
  operation-tag-defined: error
  path-params: error
  no-$ref-siblings: error

  # Custom rules
  my-rules:
    description: "All endpoints must have summary"
    message: "{{property}} must have a summary"
    severity: error
    given: "$.paths[*][*]"
    then:
      field: summary
      function: defined

    description: "Operation IDs must be camelCase"
    message: "operationId should be camelCase"
    severity: warn
    given: "$.paths[*][*].operationId"
    then:
      function: pattern
      functionOptions:
        match: "^[a-z][a-zA-Z0-9]*$"
```

## Validation in CI

```yaml
# .github/workflows/api-spec-check.yml
name: API Spec Check
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Spectral
        run: npm install -g @stoplight/spectral-cli

      - name: Lint OpenAPI spec
        run: spectral lint api/openapi.yaml

      - name: Validate with swagger-cli
        run: |
          npx swagger-cli validate api/openapi.yaml

      - name: Check for breaking changes
        run: |
          npx @redocly/cli diff \
            api/production-openapi.yaml \
            api/openapi.yaml \
            --format markdown

      - name: Preview docs
        run: npx redocly preview-docs api/openapi.yaml --port 8080 &
```

## Mock Server Generation

```bash
# Prism — HTTP mock server from OpenAPI spec
npx @stoplight/prism-cli mock api/openapi.yaml --port 4010
# Dynamic responses based on schema
# Static responses from examples when available

# Micro — lightweight mock
npx open-api-mocker --spec api/openapi.yaml --port 4010

# Spring Cloud Contract stub runner
# Generates WireMock stubs from OpenAPI spec
```

## SDK Generation

```yaml
sdk_generation:
  openapi_generator:
    cli: "@openapitools/openapi-generator-cli"
    config: "openapitools.json"
    languages:
      typescript: "typescript-axios"
      python: "python"
      java: "java"
      go: "go"
      csharp: "csharp-netcore"
      rust: "rust"

  fern:
    description: "SDK generation with type-safe endpoints"
    features: [pagination, retries, error handling]
    output: "generated/sdks"

  kiota:
    description: "Microsoft API SDK generator"
    languages: [dotnet, typescript, java, python, go]
    features: [chainable methods, request builders]
```

## Breaking Change Detection

```bash
# OpenAPI Diff — detect breaking changes between spec versions
npx openapi-diff \
  --old api/v1/openapi.yaml \
  --new api/v2/openapi.yaml \
  --fail-on-breaking

# Redocly diff
npx @redocly/cli diff \
  api/v1/openapi.yaml \
  api/v2/openapi.yaml

# Possible breaking changes:
# - Removing a path or operation
# - Removing a required property
# - Adding a required property to request body
# - Making a property required that was optional
# - Narrowing a type (string→enum, number→integer)
# - Adding a new required parameter
```

## Documentation Hosting

```yaml
hosting_options:
  swagger_ui:
    deployment: "Static files (Nginx, S3, CDN)"
    customization: "CSS variables, custom JS"
    auth: "OAuth2 implicit flow, API key"

  redoc:
    deployment: "Static HTML (single file)"
    customization: "Theming options, code samples"
    features: "Search, path collapsing, download"

  stoplight_elements:
    deployment: "React/Vanilla JS component"
    customization: "Full React component API"
    integration: "Embedded in existing app"

  readme.io:
    deployment: "SaaS hosted"
    pricing: "Freemium"
    features: "Versioning, changelog, guides, API keys"
```

## API Changelog Generation

```bash
# Generate changelog from OpenAPI spec history
npx @redocly/cli split openapi.yaml --outDir ./docs/versions/v1

# Track changes
git diff --name-only docs/versions/

# Generate changelog
npx openapi-diff \
  --old docs/versions/v1/openapi.yaml \
  --new docs/versions/v2/openapi.yaml \
  --format markdown > CHANGELOG_API.md
```
