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
version: "1.0.0"
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

## Workflow

1. **Read target** — Parse the input source to extract the HTTP request shape. For OpenAPI specs: extract the base URL from `servers[0].url`, iterate `paths` to match the requested path, read the `method`, `parameters` (path, query, header, cookie), `requestBody` schema, and `security` requirements. For route definition files: parse framework-specific route registrations — Express `router.get('/users', handler)`, FastAPI `@app.post('/users')`, Spring `@PostMapping("/users")`, Django `path('users/', UserList.as_view())`. For manual input: accept the method, URL, headers map, and body directly. For existing client code: pattern-match the URL construction, header injection, and body serialization to understand the API shape.

2. **Generate curl** — Build the curl command with explicit, self-documenting flags. Start with `-sS` for silent execution that still surfaces server errors. Add `-X METHOD` for non-GET requests. Construct the full URL by combining base, path, and serialized query parameters. Add `-H` flags for each header: Content-Type, Accept, Authorization, and any custom headers. Format the request body as pretty-printed JSON for readability. Include a commented-out alternative with `-v` for verbose debugging output.

3. **Generate httpie** — httpie uses a significantly simpler syntax that most developers find more intuitive. Start with `http` followed by the HTTP method, then the URL. Headers are passed inline as `Header:Value` pairs. JSON body fields are passed directly as `key=value` pairs. httpie automatically sets Content-Type to JSON when it detects JSON fields. Include the authentication header inline for consistency with the other examples.

4. **Generate language clients** — Generate a minimum of four language-specific examples. fetch (vanilla JavaScript, browser-native API, works in Node.js 18+ with the built-in fetch). axios (most popular HTTP library for TypeScript/JavaScript, supports interceptors for cross-cutting auth and error handling). Python requests (most popular synchronous HTTP library, simple and widely understood). Python httpx (modern alternative supporting async/await, HTTP/2, and connection pooling). Optionally extend with: Java RestTemplate (Spring ecosystem), Java WebClient (reactive Spring), Go net/http (standard library with no external deps), Rust reqwest (with error type mapping), Ruby Net::HTTP, PHP Guzzle (with middleware), C# HttpClient (with typed responses).

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

## Related Skills

- **api-documentation** — Generate full API docs from the OpenAPI specs used for client generation
- **code-review** — Review generated client code for correctness, security, and style conformance
- **testing** — Integrate generated client calls into integration test suites for API contract validation
- **security-auditor** — Audit client examples for exposed secrets, hardcoded tokens, or insecure transport
- **debugging-strategy** — Debug failed API calls using generated curl verbose output for request inspection

## References
- `references/api-client-examples.md` — Api Client Examples
- `references/client-test-patterns.md` — Client Test Patterns
- `references/client-test-strategies.md` — Client Test Strategies
- `references/codegen-comparison.md` — Codegen Comparison

## Handoff
master-orchestrator. Generated client code examples can be passed to the main orchestrator for integration into test suites, API documentation, example galleries, or application code.
