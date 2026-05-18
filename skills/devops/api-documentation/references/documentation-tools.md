# Documentation Tools

## Swagger UI

```yaml
# Docker deployment
version: "3"
services:
  swagger-ui:
    image: swaggerapi/swagger-ui:latest
    environment:
      API_URL: https://api.example.com/openapi.yaml
      SWAGGER_JSON_URL: /spec/openapi.yaml
      VALIDATOR_URL: ""  # Disable online validator for private APIs
      OAUTH2_REDIRECT_URL: https://docs.example.com/oauth2-redirect.html
    volumes:
      - ./openapi.yaml:/usr/share/nginx/html/spec/openapi.yaml
    ports:
      - "8080:8080"
```

```html
<!-- Standalone HTML -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "/openapi.yaml",
      dom_id: "#swagger-ui",
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout",
      docExpansion: "list",
      defaultModelsExpandDepth: 1,
      tryItOutEnabled: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    });
  </script>
</body>
</html>
```

## Redoc

```html
<!-- Redoc standalone HTML -->
<!DOCTYPE html>
<html>
<head>
  <title>API Documentation</title>
</head>
<body>
  <div id="redoc-container"></div>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  <script>
    Redoc.init("/openapi.yaml", {
      scrollYOffset: 60,
      hideDownloadButton: false,
      expandResponses: "200,201",
      pathInMiddlePanel: true,
      theme: {
        colors: {
          primary: { main: "#0066cc" },
          success: { main: "#28a745" },
        },
        typography: {
          fontFamily: "Inter, sans-serif",
          fontSize: "14px",
        },
      },
    }, document.getElementById("redoc-container"));
  </script>
</body>
</html>
```

## Stoplight Elements

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css" />
</head>
<body>
  <div id="api-docs"></div>
  <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
  <script>
    const api = document.createElement("elements-api");
    api.apiDescriptionUrl = "/openapi.yaml";
    api.router = "hash";
    api.layout = "sidebar";
    document.getElementById("api-docs").appendChild(api);
  </script>
</body>
</html>
```

## CI Documentation Build

```yaml
# .github/workflows/docs.yml
name: API Docs
on:
  push:
    branches: [main]
    paths:
      - "openapi.yaml"

jobs:
  build-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Validate
      - run: npx @redocly/cli lint openapi.yaml

      # Bundle spec
      - run: npx @redocly/cli bundle openapi.yaml -o public/spec/openapi.yaml

      # Generate HTML docs
      - run: |
          npx redoc-cli bundle openapi.yaml \
            --output public/index.html \
            --title "My API Docs" \
            --options.hideDownloadButton \
            --options.theme.colors.primary.main=#0066cc

      # Deploy to GitHub Pages
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public
```

## Tool Comparison

| Tool | Style | Try-it-out | Mobile | Search | Theming |
|------|-------|------------|--------|--------|---------|
| Swagger UI | Two-panel | ✅ | Poor | ✅ | Limited |
| Redoc | Three-panel | ❌ | Good | ✅ | ✅ Full |
| Redocly | Three-panel | ✅ | Good | ✅ | ✅ Full |
| Stoplight Elements | Sidebar | ✅ | Good | ✅ | ✅ Full |
| Scalar | Modern | ✅ | Excellent | ✅ | ✅ Full |
| Speakeasy | Modern | ✅ | Good | ✅ | ✅ Full |

## Changelog / Versioning Docs

```markdown
# API Changelog

## 2025-03-15 — v2.0.0
### Breaking Changes
- Removed `/v1/users` endpoint — migrate to `/v2/users`
- `GET /v2/users` now returns paginated format instead of array
- `POST /v2/users` now requires `email` field

### New Features
- Added `PATCH /v2/users/{id}` for partial updates
- Added filtering via `?status=` query parameter
- Added rate limiting headers (`X-RateLimit-Remaining`)

## 2025-02-01 — v1.2.0
### Non-breaking
- Added `role` field to User schema
- Added `page` and `limit` query parameters for pagination
```

## Hosting Options

| Platform | Free tier | Custom domain | Authentication |
|----------|-----------|---------------|----------------|
| GitHub Pages | ✅ | ✅ | ❌ (public) |
| Cloudflare Pages | ✅ | ✅ | ❌ (public) |
| Vercel | ✅ | ✅ | Edge Middleware |
| Netlify | ✅ | ✅ | ✅ (team) |
| SwaggerHub | Limited | ✅ | ✅ |
| ReadMe.io | Paid trial | ✅ | ✅ |
| Postman | Limited | ✅ | ✅ |
