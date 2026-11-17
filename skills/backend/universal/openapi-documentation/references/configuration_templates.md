# API Documentation Configuration Templates

Copy-ready configuration for the common docs toolchain: Redocly CLI, Spectral rulesets, Swagger UI, Scalar, oasdiff, Prism mocks, and framework code-first generators. Adjust names and URLs; verify option names against the version you install.

## Redocly CLI (`redocly.yaml`)

```yaml
apis:
  orders@v1:
    root: openapi/orders/openapi.yaml
  billing@v2:
    root: openapi/billing/openapi.yaml

extends:
  - recommended

rules:
  operation-operationId: error
  operation-summary: error
  operation-4xx-response: warn
  no-invalid-media-type-examples: error
  no-unused-components: warn
  tag-description: warn
  security-defined: error
  info-license: off

decorators:
  filter-out:
    property: x-internal
    value: true
```

Commands:

```bash
npx @redocly/cli lint
npx @redocly/cli bundle orders@v1 -o dist/orders.yaml
npx @redocly/cli build-docs dist/orders.yaml -o dist/orders.html
npx @redocly/cli stats orders@v1
```

## Spectral Ruleset (`.spectral.yaml`)

```yaml
extends:
  - spectral:oas
rules:
  operation-tags: error
  operation-description: warn
  oas3-api-servers: error

  paths-kebab-case:
    description: Path segments must be kebab-case
    severity: error
    given: $.paths[*]~
    then:
      function: pattern
      functionOptions:
        match: '^(/([a-z0-9-]+|\{[a-zA-Z0-9]+\}))+$'

  properties-camel-case:
    severity: error
    given: $..properties[*]~
    then:
      function: casing
      functionOptions: { type: camel }

  error-responses-use-problem-json:
    description: 4xx/5xx responses must use application/problem+json
    severity: error
    given: $.paths.*.*.responses[?(@property >= '400' && @property < '600')].content
    then:
      field: application/problem+json
      function: truthy

  no-http-servers:
    severity: error
    given: $.servers[*].url
    then:
      function: pattern
      functionOptions: { match: '^https://' }
```

Run: `npx @stoplight/spectral-cli lint openapi.yaml --ruleset .spectral.yaml --fail-severity=error`.

Shareable rulesets can extend remote URLs or npm packages (e.g. OWASP API security ruleset `@stoplight/spectral-owasp-ruleset`).

## Swagger UI (standalone)

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Orders API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/specs/orders.yaml',
      dom_id: '#swagger-ui',
      deepLinking: true,
      persistAuthorization: false,
      tryItOutEnabled: false,
      supportedSubmitMethods: ['get'],
      validatorUrl: null,
    });
  </script>
</body>
</html>
```

Pin exact versions, self-host assets for production, and restrict "Try it out" against production.

## Scalar API Reference

```html
<!doctype html>
<html>
<head><meta charset="utf-8" /><title>Orders API</title></head>
<body>
  <script id="api-reference" data-url="/specs/orders.yaml"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>
```

Pin the package version in production. Framework integrations exist (e.g. `@scalar/nestjs-api-reference`, `@scalar/express-api-reference`, `Scalar.AspNetCore`).

## oasdiff (breaking-change detection)

```bash
oasdiff breaking base/openapi.yaml head/openapi.yaml --fail-on ERR
oasdiff changelog base/openapi.yaml head/openapi.yaml --format markdown > CHANGELOG-api.md
```

## Prism Mock Server

```bash
npx @stoplight/prism-cli mock openapi.yaml --port 4010          # static examples
npx @stoplight/prism-cli mock openapi.yaml --dynamic            # generated data
npx @stoplight/prism-cli proxy openapi.yaml https://staging.example.com --errors  # validate live traffic
```

## Schemathesis (property-based contract tests)

```bash
schemathesis run openapi.yaml --url https://staging.example.com \
  --header "Authorization: Bearer $STAGING_TOKEN" \
  --checks all
```

Run against staging only; it sends many generated requests.

## Code-First Generators

FastAPI:

```python
app = FastAPI(
    title="Orders API",
    version="1.4.0",
    openapi_url="/openapi.json",
    docs_url="/docs" if settings.expose_docs else None,
    redoc_url=None,
)
```

NestJS:

```typescript
const config = new DocumentBuilder()
  .setTitle('Orders API').setVersion('1.4.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
if (process.env.EXPOSE_DOCS === 'true') SwaggerModule.setup('docs', app, document);
writeFileSync('openapi.json', JSON.stringify(document, null, 2)); // commit/diff in CI
```

Spring Boot (springdoc-openapi):

```yaml
springdoc:
  api-docs:
    path: /v3/api-docs
  swagger-ui:
    path: /swagger-ui.html
    enabled: ${EXPOSE_DOCS:false}
  packages-to-scan: com.example.orders.api
```

## Docusaurus OpenAPI Plugin (excerpt)

```js
// docusaurus.config.js
plugins: [
  ['docusaurus-plugin-openapi-docs', {
    id: 'api',
    docsPluginId: 'classic',
    config: {
      orders: { specPath: 'specs/orders.yaml', outputDir: 'docs/orders', sidebarOptions: { groupPathsBy: 'tag' } },
    },
  }],
],
themes: ['docusaurus-theme-openapi-docs'],
```

## Checklist

- [ ] Lint configuration committed with severities that fail CI
- [ ] Style rules (casing, problem+json, https servers) encoded
- [ ] Internal operations filtered from public bundles
- [ ] UI assets version-pinned and self-hosted for production
- [ ] Breaking-change diff and changelog generation configured
- [ ] Code-first apps export spec to a file for diffing
