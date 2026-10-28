# Performance Tuning for Large API Specs and Doc Sites

Large OpenAPI documents (thousands of operations, deep schema graphs) slow down rendering, linting, code generation and editors. This reference covers how to measure the cost, restructure specs, and configure renderers and pipelines for speed.

## Symptoms and Causes

| Symptom | Likely cause |
|---------|--------------|
| Doc page takes seconds to become interactive | Rendering every operation and schema at load; huge bundled JSON |
| Browser tab memory spikes | Fully dereferenced spec with repeated inlined schemas |
| Lint/bundle in CI takes minutes | Many external `$ref`s resolved over network; recursive schemas |
| Generated SDK huge | Inline anonymous schemas duplicated per operation |
| Editor lag | Single multi-megabyte YAML file |

## Measure

```bash
npx @redocly/cli stats openapi.yaml       # counts of paths, operations, schemas, refs
ls -lh dist/openapi.json                  # bundled size
gzip -c dist/openapi.json | wc -c         # transfer size
time npx @redocly/cli lint
```

In the browser, check Lighthouse/Performance panel for long tasks during render and the JSON download size.

## Spec Structure

- Prefer `$ref` to shared `components.schemas` over inline repeated schemas. Bundling (`redocly bundle`) keeps refs; dereferencing (`--dereferenced`) expands them and can multiply size, so ship the bundled (not dereferenced) form to renderers.
- Remove unused components (`no-unused-components` rule, `redocly bundle --remove-unused-components`).
- Split very large APIs into multiple specs by domain (orders, billing, catalog) and publish separate reference pages.
- Keep examples concise; one representative example per scenario instead of large payloads. Link to downloadable sample files for big bodies.
- Avoid deeply nested `allOf` chains; flatten where inheritance adds no meaning.
- Recursive schemas (trees) are valid, but some tools struggle; keep the recursion through a named component ref.

## Rendering Options

| Renderer | Performance-relevant settings |
|----------|------------------------------|
| Redoc | `lazyRendering` (render sections on scroll) in older versions; Redocly's newer reference docs render per page; `expandResponses` off; `jsonSampleExpandLevel` low |
| Swagger UI | `docExpansion: 'none'`, `defaultModelsExpandDepth: -1` (hide models section), `filter: true` |
| Scalar | Per-operation rendering; large specs still benefit from splitting |
| Static site generators (Docusaurus OpenAPI, Mintlify) | One page per operation: fast loads, good SEO |

Swagger UI example:

```js
SwaggerUIBundle({
  url: '/specs/orders.json',
  dom_id: '#swagger-ui',
  docExpansion: 'none',
  defaultModelsExpandDepth: -1,
  defaultModelExpandDepth: 1,
  filter: true,
  deepLinking: true,
});
```

Option names and availability change between renderer versions; verify against the version you pin.

Generating one static page per operation (pre-rendered HTML) usually gives the best load time for very large APIs because the browser never parses the whole spec.

## Delivery

- Serve the spec as JSON (faster to parse than YAML in browsers) with Brotli/gzip compression.
- Fingerprint bundled assets and cache them long-term; keep the spec URL short-cached with ETags.
- Host renderer JS on your domain/CDN; avoid blocking third-party scripts.
- Preload the spec: `<link rel="preload" href="/specs/orders.json" as="fetch" crossorigin>`.

## CI Pipeline Speed

- Resolve external refs from local files (vendor shared components into the repo or a package) instead of HTTP during lint.
- Lint only changed specs in monorepos (path filters in CI).
- Cache `node_modules`/tool binaries; pin versions to keep caches valid.
- Run lint, diff and build in parallel jobs.
- For code generation, generate only changed SDK languages per PR; full matrix on release.

## Code Generation Size

- Name every schema (`components.schemas`) so generators emit one model instead of `InlineResponse200_1` duplicates.
- Use `oneOf` with discriminators thoughtfully; some generators produce large wrapper types.
- Exclude internal operations (`x-internal`) before generating public SDKs.

## Editor Experience

- Split into multiple files (`paths/`, `schemas/`) referenced from a root; editors and diffs stay fast.
- Use language-server tooling (Redocly VS Code extension, Spectral extension) that validates incrementally.

## Server-Generated Specs (code-first)

Generating the spec on every request to `/openapi.json` costs CPU on large apps. Most frameworks cache after the first build (FastAPI caches `app.openapi_schema`); otherwise generate at build time and serve the static file.

## Checklist

- [ ] Spec stats and bundled size tracked over time
- [ ] Shared components referenced, unused ones removed
- [ ] Bundled (not dereferenced) spec served, compressed, as JSON
- [ ] Renderer configured to collapse models/operations by default, or per-operation static pages
- [ ] Very large APIs split by domain
- [ ] CI resolves refs locally and lints only changed specs
- [ ] Named schemas to keep generated SDKs small
