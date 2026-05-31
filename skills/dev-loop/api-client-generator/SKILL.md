---
name: dev-loop-api-client
description: >
  Use this skill when the user says 'API client', 'curl command', 'HTTP request', 'generate curl', 'API call', 'api client from spec', 'curl example', 'test endpoint', 'API request format'. Generates HTTP client calls in curl, httpie, fetch, axios, Python requests formats. Do NOT use for: API design or documentation.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, api, client, phase-7]
version: "2.0.0"
author: "j4flmao"
license: "MIT"
---

# Dev Loop API Client Generator

## Purpose
Generate API client calls in multiple formats (curl, httpie, fetch, axios, Python requests) from OpenAPI specs, route definitions, or existing API files. Speeds up endpoint testing and integration code authoring.

Saves developers from manually constructing HTTP requests or switching context between browser dev tools, documentation, and terminal. Given an OpenAPI specification file, a route definition from any popular web framework, or just an HTTP method and URL, this skill produces runnable client call examples across the formats your team uses. Every example includes explicit authentication handling, proper error handling patterns, best-practice request headers, and parameter serialization. No more squinting at curl man pages or digging through browser network tabs mid-workflow.

The skill covers the full spectrum of HTTP interaction patterns: simple GET requests, POST with JSON bodies, file uploads with multipart forms, authenticated calls with bearer tokens or API keys, and paginated list endpoints. Each output format is independently useful — developers can copy curl into a terminal, httpie for scripting, fetch for browser console debugging, axios for production TypeScript code, or Python requests for data analysis and testing.

## Agent Protocol

### Trigger
"API client", "curl command", "HTTP request", "generate curl", "API call", "api client from spec", "curl example", "test endpoint", "API request format"

### Input Context
- OpenAPI/Swagger spec file path or inline content — supports YAML and JSON, versions 2.0 and 3.x
- OR route definition file from a supported web framework: Express.js router, FastAPI router, Spring @RestController, Django URLconf, Gin router, Rails routes.rb, ASP.NET Core controller, Ktor route
- OR existing API client implementation file — extracts request patterns (URL structure, header conventions, body shapes, error handling) for consistent generation
- OR manual parameter input: HTTP method (GET/POST/PUT/PATCH/DELETE), full URL including query string, request headers as key-value pairs, request body as JSON or form-encoded data
- Authentication method: none, bearer token (the most common pattern), basic auth (username:password pair), API key (via header or query parameter), OAuth2 client credentials flow (with token endpoint)
- Preferred output formats: subset of the available formats if only specific ones are needed

### Output Artifact
Commented, syntax-highlighted code blocks for each requested target format containing a complete HTTP request ready to copy, paste, and execute

### Response Format
- One markdown fenced code block per format, language-tagged for proper syntax highlighting in the viewer
- Formats always output in a consistent order: curl (always first — universal), httpie (second — simplified), then language-specific clients (fetch, axios, Python requests, and any extras)
- Inline comments within each block explaining: where to inject authentication tokens, which parts of the URL to replace for different environments, what each header controls, and how error responses are parsed
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
Client call generated in at least 3 distinct formats (curl plus two language-specific client examples). Every example is syntactically valid and runnable after the user replaces placeholder values. Authentication headers or parameters are included and commented in every single example.

### Max Response Length
2000 tokens

## Architecture

### Generation Pipeline
```
Input Sources ──> Parsing Layer ──> Intermediate Model ──> Renderers ──> Output Formats
                                                                        
OpenAPI spec    OpenAPI parser      Method              curl             curl -sS -X GET ...
Route file      Framework parser    URL (base + path)   httpie           http GET ...
Manual input    Manual parser       Headers             fetch            fetch(url, {...
Existing client Pattern extractor   Query params        axios            axios.get(url,...
                                    Body schema         Python requests  requests.get(url,...
                                    Auth type           Python httpx     httpx.Client()...
                                                        Java RestTmpl    RestTemplate...
                                                        Go net/http      http.NewRequest...
```

### Decision Tree: Input Source
```
What do you have?
├── OpenAPI/Swagger spec file
│   → Parse paths/methods, extract server URL, security schemes, parameter schemas
│   → Fallback: if spec version is 2.0, convert to 3.x internally for consistent model
├── Framework route definition file
│   → Parse framework-specific route patterns and middleware
│   → Infer auth from middleware (JWT middleware, auth guards, @Authenticated decorators)
├── Existing client implementation
│   → Pattern-match URL construction, header injection, error handling
│   → Extract consistent patterns for new endpoint generation
└── Manual method + URL only
    → Accept direct input with no parsing needed
    → Useful for one-off testing or internal APIs without specs
```

## Workflow

1. **Read target** — Parse the input source to extract the HTTP request shape. For OpenAPI specs: extract the base URL from `servers[0].url`, iterate `paths` to match the requested path, read the `method`, `parameters` (path, query, header, cookie), `requestBody` schema, and `security` requirements. For route definition files: parse framework-specific route registrations — Express `router.get('/users', handler)`, FastAPI `@app.post('/users')`, Spring `@PostMapping("/users")`, Django `path('users/', UserList.as_view())`. For manual input: accept the method, URL, headers map, and body directly. For existing client code: pattern-match the URL construction, header injection, and body serialization to understand the API shape.

2. **Generate curl** — Build the curl command with explicit, self-documenting flags. Start with `-sS` for silent execution that still surfaces server errors. Add `-X METHOD` for non-GET requests. Construct the full URL by combining base, path, and serialized query parameters. Add `-H` flags for each header: Content-Type, Accept, Authorization, and any custom headers. Format the request body as pretty-printed JSON for readability. Include a commented-out alternative with `-v` for verbose debugging output.

3. **Generate httpie** — httpie uses a significantly simpler syntax that most developers find more intuitive. Start with `http` followed by the HTTP method, then the URL. Headers are passed inline as `Header:Value` pairs. JSON body fields are passed directly as `key=value` pairs. httpie automatically sets Content-Type to JSON when it detects JSON fields. Include the authentication header inline for consistency with the other examples.

4. **Generate language clients** — Generate a minimum of four language-specific examples. fetch (vanilla JavaScript, browser-native API, works in Node.js 18+ with the built-in fetch). axios (most popular HTTP library for TypeScript/JavaScript, supports interceptors for cross-cutting auth and error handling). Python requests (most popular synchronous HTTP library, simple and widely understood). Python httpx (modern alternative supporting async/await, HTTP/2, and connection pooling). Optionally extend with: Java RestTemplate (Spring ecosystem), Java WebClient (reactive Spring), Go net/http (standard library with no external deps), Rust reqwest (with error type mapping), Ruby Net::HTTP, PHP Guzzle (with middleware), C# HttpClient (with typed responses).

5. **Generate error handling** — For language clients, wrap the request in structured error handling. Check HTTP status codes and parse structured error responses. For REST APIs, the error body typically contains `error`, `message`, or `errors` fields. For GraphQL, check the `errors` array alongside `data`. Show how to differentiate between network errors (no connectivity, DNS failure, timeout) and application errors (4xx, 5xx status). Include retry logic for transient failures with exponential backoff.

6. **Generate pagination examples** — If the endpoint supports pagination, include a commented example showing how to iterate through pages. Cover offset-based (page/limit), cursor-based (cursor/next), and token-based (nextPageToken) pagination patterns. Show how to detect the last page (empty response, null cursor, no next link). Include a complete loop example for language clients and a pagination function for reuse.

## Models

### Authentication Header Reference
```
None:      (no Authorization header)
Bearer:    Authorization: Bearer <your-token-here>
Basic:     Authorization: Basic $(echo -n "username:password" | base64)
API Key:   X-API-Key: <your-api-key>           (header)
           ?api_key=<your-api-key>              (query param)
OAuth2:    Authorization: Bearer <access-token> (from token endpoint)
```

### HTTP Method to OpenAPI Operation Mapping
| HTTP Method | CRUD | curl Flag | Body Expected |
|---|---|---|---|
| GET | Read / List | default | No |
| POST | Create | -X POST | Yes |
| PUT | Full Replace | -X PUT | Yes |
| PATCH | Partial Update | -X PATCH | Yes |
| DELETE | Remove | -X DELETE | Usually no |

### Intermediate Request Model
```typescript
interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  baseUrl: string;
  path: string;
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
  auth: { type: 'none' | 'bearer' | 'basic' | 'api-key' | 'oauth2'; config: unknown };
  pagination?: { type: 'offset' | 'cursor' | 'token'; params: string[] };
}
```

## Rules

- **Always include authentication** — Every generated example must include an explicit Authorization header or authentication flag. Never output an unauthenticated request without a clear warning comment indicating that authentication was omitted.
- **Always include error handling in language examples** — Language-specific examples must wrap the request in try-catch (or equivalent error handling pattern). Show how to check the HTTP status code and parse structured error responses.
- **Cover all common HTTP methods** — Always be prepared to generate GET, POST, PUT, PATCH, and DELETE. Include query parameter serialization for GET and DELETE requests (which commonly use query strings).
- **Show both minimal and production variants** — Minimal example: the absolute minimum configuration to make a successful request. Full example: with explicit timeout, retry logic, comprehensive error handling, and typed response parsing.
- **Version-annotate each example** — Note which software version the example targets: `axios ^1.7` differs from `axios ^0.27`, OpenAPI 3.1 differs from 2.0, Node.js built-in fetch differs from node-fetch v2.
- **Handle multipart file uploads explicitly** — When the request includes file uploads, show curl's `-F` flag, Python requests' `files=` parameter, fetch's `FormData` constructor, and axios's `FormData` support.
- **URL-encode query parameters** — Show proper encoding of special characters: spaces as `%20`, Unicode characters via `encodeURIComponent` in JavaScript, and Python requests' `params` dictionary which auto-encodes.
- **Use environment variables everywhere** — Every example uses `$TOKEN`, `$API_URL`, or `process.env.API_URL` for configurable values. Never hardcode secrets, tokens, or environment-specific URLs.
- **Include pagination guidance** — If the endpoint supports pagination patterns (page/limit, cursor-based, offset-based), include a commented example showing how to paginate through results.
- **Path parameters must be interpolated** — OpenAPI path templates like `/users/{userId}` must have `{userId}` replaced with an actual value or placeholder. Never output `{userId}` in the URL.
- **Content-Type must match body** — If the body is JSON, Content-Type is `application/json`. If form-encoded, use `application/x-www-form-urlencoded`. If multipart, use `multipart/form-data` with boundary.
- **Accept header should be explicit** — Include `Accept: application/json` to ensure the server returns the expected format. Some APIs return XML or HTML without an explicit Accept header.
- **Example timestamps should be static** — Use fixed example dates, not dynamic dates like `new Date().toISOString()`, so examples are reproducible and screenshot-friendly.

## Common Pitfalls

- **Missing path parameter interpolation**: OpenAPI spec paths like `/users/{userId}` are output as-is, resulting in invalid URLs. Always interpolate with example values.
- **Incorrect Content-Type for body**: Sending JSON with `Content-Type: application/x-www-form-urlencoded` causes server parse errors. Match Content-Type to body format.
- **No error response handling**: Most API clients fail silently on non-2xx responses. Always include status code checking and structured error parsing.
- **Hardcoded bearer tokens**: Tokens in examples get copied to production code. Use environment variables or placeholder values.
- **Pagination not demonstrated**: Consumers of the generated code may not know how to paginate. Always include a commented pagination example for list endpoints.
- **Overlooking request body schema**: Required fields in the request body are omitted, causing 400 errors. Check `required` array in the body schema and include all required fields.
- **Authentication method mismatch**: OpenAPI specifies multiple security schemes — generating a bearer token example when the API uses API key auth produces broken requests.
- **Ignoring rate limiting**: Generated examples lack rate limit awareness. Add comments about checking `X-RateLimit-Remaining` headers and implementing backoff.

## Compared With

| Tool | Input | Output Formats | Best For |
|------|-------|---------------|----------|
| Swagger Codegen | OpenAPI spec | Full SDK client libraries | Production SDK generation |
| OpenAPI Generator | OpenAPI spec | 50+ language SDKs | Cross-language SDK generation |
| Postman | Manual + OpenAPI | Single format per collection | Interactive testing, team collections |
| Insomnia | Manual + OpenAPI | Single format per request | GUI-based API testing |
| HTTPie | Terminal | Built-in output formatting | Command-line API testing |
| This skill | OpenAPI, routes, manual | Multi-format, commented examples | Quick prototyping, learning, documentation |
| Bruno | OpenAPI, collection | Single format | Offline-first API client |
| Hoppscotch | Manual import | Single format | Browser-based API testing |

## Performance

- Generation latency: <500ms for a single endpoint across all formats, <2s for full OpenAPI spec generation
- OpenAPI spec parsing: OAS 3.x files up to 5MB parse in <1s with JSON/YAML streaming parsers
- Framework route parsing: Express/FastAPI router files typically <200ms even for large routers with 50+ routes
- Intermediate model construction: negligible overhead (~10ms) once input is parsed
- Renderer execution: each renderer (curl, httpie, fetch, axios, etc.) executes in <50ms
- Full generation of 5+ formats for a single endpoint: <800ms total including JSON serialization
- Memory: generation uses <50MB heap even for OpenAPI specs with 100+ endpoints
- Rate limiting: support generating up to 100 endpoints per minute without performance degradation

## Tooling

| Tool | Category | Use Case |
|------|----------|----------|
| swagger-parser (Java) | OpenAPI parsing | Server-side spec validation |
| @apidevtools/swagger-parser (JS) | OpenAPI parsing | Node.js spec validation |
| OpenAPI Typescript | Type generation | Generate TypeScript types from OpenAPI |
| Redoc | API documentation | Render spec as documentation |
| Swagger UI | API documentation | Interactive API explorer |
| Bruno / Postman / Insomnia | GUI testing | Manual API testing and collection management |
| Hoppscotch | Browser testing | Quick ad-hoc API testing |
| httpie / curlie | Terminal testing | Command-line API testing |
| Gatling / k6 | Load testing | Performance testing of generated endpoints |
| jaeger / zipkin | Tracing | Trace API calls for debugging |

## Related Skills

- **api-documentation** — Generate full API docs from the OpenAPI specs used for client generation
- **code-review** — Review generated client code for correctness, security, and style conformance
- **testing** — Integrate generated client calls into integration test suites for API contract validation
- **security-auditor** — Audit client examples for exposed secrets, hardcoded tokens, or insecure transport
- **debugging-strategy** — Debug failed API calls using generated curl verbose output for request inspection

## References
  - references/api-client-examples.md — API Client Examples
  - references/api-client-generator-advanced.md — Api Client Generator Advanced Topics
  - references/api-client-generator-fundamentals.md — Api Client Generator Fundamentals
  - references/client-test-patterns.md — API Client Testing Patterns
  - references/client-test-strategies.md — API Client Test Strategies
  - references/codegen-comparison.md — API Codegen Tools Comparison
  - references/api-client-generator-advanced.md — API Client Generator Advanced Usage
  - references/api-client-generator-customization.md — API Client Generator Customization
## Handoff
master-orchestrator. Generated client code examples can be passed to the main orchestrator for integration into test suites, API documentation, example galleries, or application code.
