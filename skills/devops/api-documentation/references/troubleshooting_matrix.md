# API Documentation Troubleshooting Matrix

Common failures in OpenAPI authoring, linting, rendering, code generation and publishing, with causes and fixes. Use the symptom tables to narrow down quickly.

## Spec Validation and Parsing

| Spec Validation and Parsing symptom | Likely cause | Fix |
|-------------------------------------|--------------|-----|
| `Can't resolve $ref` | Wrong relative path; refs resolved relative to the file containing them | Fix path relative to the referencing file; run `redocly bundle` to confirm |
| `Unexpected property "nullable"` in 3.1 | 3.0 keyword in a 3.1 document | Use `type: [string, "null"]` |
| `example` ignored / warnings in 3.1 | Schema-level `example` deprecated | Use `examples: [...]` in schemas, or media-type `examples` map |
| YAML parse error on `on`, `yes`, `no`, `y` | YAML 1.1 boolean coercion in some parsers | Quote such keys and values |
| Response code keys rejected | Unquoted numeric keys in some tools | Quote status codes: `'200':` |
| Duplicate `operationId` | Copy-paste | Make unique; lint rule `operation-operationId-unique` |
| Path parameter not defined | `{id}` in path without matching parameter (or vice versa) | Add `in: path, required: true` parameter with identical name |
| Ambiguous paths `/users/{id}` and `/users/{name}` | Templated paths with same shape | Merge into one path; differentiate by query or separate resource |

## Linting

| Linting symptom | Cause | Fix |
|-----------------|-------|-----|
| Hundreds of warnings after enabling ruleset | Legacy spec | Baseline: set rules to `warn`, fix incrementally; fail only on new `error`s |
| Custom Spectral rule never triggers | JSONPath `given` matches nothing | Test path with `spectral lint --verbose`; check `~` (key) vs value selection |
| Rule fires on `$ref` objects | `given` selects before resolution | Use `resolved: false` or target resolved paths deliberately |
| Example validation errors | Example doesn't match schema (missing required, wrong format) | Fix the example; examples are part of the contract |
| Remote ruleset fetch fails in CI | Network/proxy | Vendor the ruleset or pin npm package |

## Rendering (Swagger UI, Redoc, Scalar)

| Rendering (Swagger UI, Redoc, Scalar) symptom | Cause | Fix |
|-----------------------------------------------|-------|-----|
| Blank page, console CORS error | Spec URL on another origin without CORS | Serve spec from same origin or add `Access-Control-Allow-Origin` for docs origin |
| "Try it out" fails with CORS | API doesn't allow docs origin | Configure CORS on sandbox API, not production wildcard |
| Wrong base URL in requests | `servers` missing or relative | Set absolute `servers` per environment |
| Schemas show as `object` with no fields | Unsupported keyword or unresolved ref | Check renderer 3.1 support; bundle spec first |
| Markdown not rendered | Description uses unsupported syntax/HTML | Use CommonMark; avoid raw HTML that renderer sanitizes |
| Page very slow | Huge spec, everything expanded | See `performance_tuning.md`: collapse, split, per-operation pages |
| OAuth login loop in Swagger UI | Redirect URL mismatch | Register `oauth2-redirect.html` URL with the IdP exactly |

## Code-First Generation

| Code-First Generation symptom | Cause | Fix |
|-------------------------------|-------|-----|
| NestJS DTO fields missing in spec | No `@ApiProperty()` and CLI plugin not enabled | Enable `@nestjs/swagger` plugin in `nest-cli.json` or annotate |
| Generic types/`Promise<T>` show as `{}` | Reflection loses generics | Use explicit `type` in `@ApiResponse`, wrapper schemas |
| springdoc missing endpoints | Package scan filter or profile disables docs | Check `springdoc.packages-to-scan`, `springdoc.api-docs.enabled` |
| FastAPI response schema wrong | No `response_model` | Add `response_model` or return type annotations |
| Enums duplicated per use | Inline enum schemas | Name enums (e.g. `enumName` in NestJS) to emit a shared component |
| Spec drifts from committed file | Generated at runtime only | Export in CI and diff against committed spec |

## SDK / Client Generation

| SDK / Client Generation symptom | Cause | Fix |
|---------------------------------|-------|-----|
| Classes named `InlineResponse200` | Anonymous inline schemas | Move to `components.schemas` with names |
| Method names odd or duplicated | Missing/unstable `operationId` | Set clear, unique operationIds |
| `oneOf` produces unusable types | Generator limits on polymorphism | Add discriminator with mapping; check generator options |
| Date fields as strings | `format: date-time` not mapped | Configure type mappings; check generator version |
| Breaking SDK change after "minor" spec edit | Renamed operationId/schema | Treat renames as breaking; run oasdiff |

## Breaking-Change Detection

| Breaking-Change Detection symptom | Cause | Fix |
|-----------------------------------|-------|-----|
| oasdiff reports breaking change for added enum value | Response enums: clients may not handle new values | Document extensible enums; decide policy; adjust severity config |
| Required request field added flagged | Is breaking for clients | Make optional with default, or new version |
| False negatives on `$ref` changes | Comparing unbundled files with remote refs | Bundle both base and head before diffing |

## Publishing

| Publishing symptom | Cause | Fix |
|--------------------|-------|-----|
| Old docs still shown after deploy | CDN cache on HTML/spec | Short TTL + ETag for HTML/spec; invalidate on publish |
| Internal endpoints visible publicly | Filter not applied to that build | Apply `x-internal` filter/overlay; add CI test asserting absence |
| GitHub Pages 404 on deep links | SPA routing on static host | Use hash routing or a 404.html fallback |
| Preview deploys missing | Path filters exclude changed files | Include spec and docs paths in workflow triggers |
| Docs show unreleased endpoints | Docs published from main before API release | Publish from release tags; filter `x-beta` |

## Contract Testing

| Contract Testing symptom | Cause | Fix |
|--------------------------|-------|-----|
| Schemathesis 500s on edge inputs | Server lacks validation for bounds in spec | Add server validation; good finding, not noise |
| Dredd/Schemathesis fails on auth | No credentials for test env | Provide sandbox token via CI secret |
| Response validation failures for extra fields | `additionalProperties: false` on responses | Decide policy; typically keep responses open |

## Debug Commands

```bash
npx @redocly/cli lint --format=stylish
npx @redocly/cli bundle openapi.yaml -o /tmp/b.yaml && npx @redocly/cli lint /tmp/b.yaml
npx @stoplight/spectral-cli lint openapi.yaml -v
oasdiff diff base.yaml head.yaml --format text
npx @stoplight/prism-cli proxy openapi.yaml https://staging.example.com --errors
```

## Checklist

- [ ] Reproduce with the bundled spec before debugging tools
- [ ] Confirm the tool supports your OpenAPI version
- [ ] Check CORS and `servers` for console issues
- [ ] Name schemas and operationIds for generator issues
- [ ] Verify CDN caching and filtering for publishing issues
