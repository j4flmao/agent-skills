---
name: dev-loop-api-client-generator
description: >
  Use when the user asks about generating API clients, OpenAPI/Swagger code generation, REST API client SDKs, or automating API client creation. Do NOT use for: writing API servers, or manual HTTP request code.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, api-client, code-generation, openapi]
---

# API Client Generator

## Purpose
Generate type-safe, idiomatic API client SDKs from OpenAPI/Swagger specifications, GraphQL schemas, or gRPC protobuf definitions. Automated client generation eliminates manual HTTP code, ensures type safety, and keeps clients synchronized with API changes.

## Agent Protocol

### Trigger
Exact user phrases: "generate API client", "OpenAPI client", "Swagger codegen", "API SDK generation", "client generator", "auto-generate client", "OpenAPI TypeScript", "openapi-generator", "NSwag", "kiota".

### Input Context
- API specification format (OpenAPI 3.x, Swagger 2.0, GraphQL, gRPC protobuf)
- Target language/framework (TypeScript, C#, Python, Java, Go, Rust, Kotlin)
- HTTP client library (fetch, axios, HttpClient, httpx, reqwest)
- Authentication method (Bearer token, API key, OAuth2, mTLS, custom header)
- Existing API spec location (URL, file path, registry URL)
- Generation tool preferences (openapi-generator, NSwag, kiota, or custom)
- Customization needs (naming conventions, package structure, error handling)

### Output Artifact
Generated API client with typed models, service methods, authentication, error handling, and generated code configuration.

### Completion Criteria
- [ ] API spec validated and loaded
- [ ] Generation tool selected and configured
- [ ] Client code generated in target language
- [ ] Models/entities typed according to spec schemas
- [ ] Service methods for all API endpoints
- [ ] Authentication configured (bearer token, API key, OAuth2)
- [ ] Error handling and response parsing
- [ ] Request/response interceptors or middleware configured
- [ ] Package/namespace structure defined
- [ ] Generation config committed (can regenerate)
- [ ] Tests for generated client
- [ ] CI regeneration step configured

### Max Response Length
250 lines.

## Framework/Methodology

### Client Generation Decision Tree
```
What is the API format?
├── OpenAPI 3.x (REST) → openapi-generator, NSwag, kiota
│   ├── TypeScript → openapi-generator (typescript-fetch, typescript-axios)
│   ├── C# → NSwag, kiota, openapi-generator (csharp)
│   ├── Python → openapi-generator (python), kiota
│   ├── Java → openapi-generator (java, spring), kiota
│   ├── Go → openapi-generator (go), oapi-codegen
│   └── Rust → openapi-generator (rust), octorust, paperclip
├── GraphQL → graphql-codegen
│   ├── TypeScript → @graphql-codegen/typescript
│   └── Any → graphql-client (Apollo, urql, Relay)
└── gRPC → protoc + language plugin
    ├── Go → protoc-gen-go-grpc
    ├── C# → Grpc.Tools
    ├── Python → grpcio-tools
    └── Rust → tonic-build
```

### Generation Workflow
```
API Spec (openapi.yaml / schema.graphql / .proto)
    ↓
Generator Config (language, naming, auth, output dir)
    ↓
Code Generation (openapi-generator CLI, graphql-codegen, protoc)
    ↓
Generated Artifacts (models, API clients, enums, interceptors)
    ↓
Integration (install as package, commit generated code, or build step)
    ↓
CI Validation (diff check, spec change triggers regeneration)
```

## Workflow

### Step 1: Configure OpenAPI Generator

```yaml
# openapi-generator-config.yaml
generatorName: typescript-fetch
inputSpec: ./api/openapi.yaml
outputDir: ./src/generated/api
additionalProperties:
  npmName: "@myorg/api-client"
  npmVersion: "1.0.0"
  typescriptThreePlus: true
  supportsES6: true
  withInterfaces: true
  useSingleRequestParameter: true
  modelPropertyNaming: camelCase
  enumPropertyNaming: UPPERCASE
  ensureUniqueParams: true
  allowUnicodeIdentifiers: false
  prependFormOrBodyParameters: true
```

### Step 2: Generate Client

```bash
# OpenAPI Generator CLI
npx @openapitools/openapi-generator-cli generate \
  -g typescript-fetch \
  -i ./api/openapi.yaml \
  -o ./src/generated/api \
  -c openapi-generator-config.yaml

# NSwag (C#)
nswag openapi2csclient /input:openapi.yaml \
  /classname:MyApiClient \
  /namespace:MyApp.Api.Client \
  /output:ApiClient.cs

# Kiota (Microsoft)
kiota generate -l typescript \
  -d openapi.yaml \
  -o ./src/generated/api \
  -n @myorg/api-client
```

### Step 3: Wrap Generated Client

```typescript
// src/api/client.ts - Typed wrapper around generated client
import { Configuration, DefaultApi, type ApiResponse } from '../generated/api';

export interface ApiClientConfig {
  baseUrl: string;
  tokenProvider: () => Promise<string | null>;
  onError?: (error: Error) => void;
}

export class ApiClient {
  private client: DefaultApi;

  constructor(private config: ApiClientConfig) {
    const apiConfig = new Configuration({
      basePath: config.baseUrl,
      accessToken: config.tokenProvider,
      middleware: [{
        post: async (context): Promise<ApiResponse> => {
          if (!context.response.ok) {
            const error = await this.parseError(context.response);
            config.onError?.(error);
            throw error;
          }
          return context.response as unknown as ApiResponse;
        }
      }]
    });
    this.client = new DefaultApi(apiConfig);
  }

  async getItems(): Promise<Item[]> {
    const response = await this.client.getItems();
    return response;
  }

  async createItem(data: CreateItemRequest): Promise<Item> {
    return this.client.createItem({ createItemRequest: data });
  }

  private async parseError(response: Response): Promise<ApiError> {
    const body = await response.text();
    return new ApiError(
      response.status,
      response.statusText,
      body ? JSON.parse(body) : null
    );
  }
}
```

### Step 4: Authentication Interceptor

```typescript
// Authentication configuration
export function createAuthMiddleware(tokenProvider: () => Promise<string | null>): Middleware {
  return {
    pre: async (context: RequestContext): Promise<RequestContext> => {
      const token = await tokenProvider();
      if (token) {
        context.init.headers = {
          ...context.init.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return context;
    }
  };
}

// For API key auth
export function createApiKeyMiddleware(apiKey: string, headerName = 'X-API-Key'): Middleware {
  return {
    pre: async (context: RequestContext): Promise<RequestContext> => {
      context.init.headers = {
        ...context.init.headers,
        [headerName]: apiKey,
      };
      return context;
    }
  };
}
```

### Step 5: Type-Safe Error Handling

```typescript
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly statusText: string,
    public readonly body: unknown
  ) {
    super(`API Error ${statusCode}: ${statusText}`);
    this.name = 'ApiError';
  }

  get isNotFound(): boolean { return this.statusCode === 404; }
  get isUnauthorized(): boolean { return this.statusCode === 401; }
  get isForbidden(): boolean { return this.statusCode === 403; }
  get isValidationError(): boolean { return this.statusCode === 422; }
  get isServerError(): boolean { return this.statusCode >= 500; }
  get isRateLimited(): boolean { return this.statusCode === 429; }

  get validationErrors(): ValidationError[] | null {
    return this.isValidationError ? (this.body as any)?.errors ?? null : null;
  }
}

// Usage
try {
  await client.createItem(data);
} catch (error) {
  if (error instanceof ApiError) {
    if (error.isValidationError) {
      // Show form validation errors
      error.validationErrors?.forEach(e => form.setError(e.field, e.message));
    } else if (error.isUnauthorized) {
      // Redirect to login
      authService.logout();
    } else if (error.isRateLimited) {
      // Retry with backoff
      await delay(5000);
      return retry();
    }
  }
}
```

### Step 6: CI Regeneration

```yaml
# .github/workflows/api-client-update.yml
name: Update API Client
on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday 6AM
  workflow_dispatch:
    inputs:
      spec_url:
        description: 'OpenAPI spec URL'
        required: true
        default: 'https://api.example.com/openapi.json'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - name: Generate client
        run: |
          npm run generate-api -- --spec-url ${{ github.event.inputs.spec_url }}
      - name: Check for changes
        id: diff
        run: |
          if git diff --stat --exit-code; then
            echo "no changes"  # No changes needed
          else
            echo "changes=true" >> $GITHUB_OUTPUT
          fi
      - name: Create PR
        if: steps.diff.outputs.changes == 'true'
        run: |
          git checkout -b chore/update-api-client
          git add src/generated/
          git commit -m "chore: update API client from spec"
          gh pr create --title "chore: update API client" --body "Auto-generated from spec"
```

## Common Pitfalls

| Pitfall | Description | Prevention |
|---------|-------------|------------|
| Not pinning generator version | Breaking changes in generator | Pin version in package.json or config |
| Ignoring spec validation | Generating from invalid spec | Validate spec before generation |
| Overwriting custom code | Manual edits lost on regeneration | Separate generated from hand-written code |
| No authentication middleware | Every request repeats auth setup | Pre-configure middleware/interceptors |
| Missing nullable/optional types | Runtime errors on undefined values | Use strict null checks |
| Committing large generated files | Bloated repo, noisy diffs | .gitignore generated, build-time generation |
| Not wrapping generated client | Tight coupling to generated API | Abstract behind repository pattern |
| Ignoring response status codes | All errors treated the same | Type-specific error classes |
| Generated code in source control | Stale generated code, merge conflicts | Generate at build time or via CI |
| No rate limit handling | 429 responses crash the app | Retry with exponential backoff |

## Best Practices

| Practice | Rationale |
|----------|-----------|
| Validate spec before generation | Catches schema errors early, before code breaks |
| Pin generator version | Prevent breaking changes from generator updates |
| Separate generated and custom code | Generated code in `src/generated/`, custom wrappers elsewhere |
| Abstract behind repository/service | Swap implementation without changing consumers |
| Use typed errors | Discriminated unions or instanceof checks for error types |
| Generate at build time (not commit) | Always fresh, no stale generated code in repo |
| Set up CI diff check | PR fails if generated code is out of date |
| Use consistent naming conventions | camelCase for TypeScript, PascalCase for C# |
| Handle 401/403 globally | Refresh token or redirect to login automatically |
| Include request/response logging in dev | Debug API issues, but never log tokens |
| Use interceptors for cross-cutting | Logging, retry, caching, auth — all in middleware |

## Templates

### OpenAPI Generator Config by Language
```yaml
# TypeScript (fetch)
generatorName: typescript-fetch
additionalProperties:
  typescriptThreePlus: true
  withInterfaces: true

# C#
generatorName: csharp
additionalProperties:
  packageName: MyOrg.ApiClient
  useDateTimeOffset: true
  targetFramework: net8.0

# Python
generatorName: python
additionalProperties:
  packageName: myorg_api_client
  useOneOfDiscriminatorLookup: true

# Go
generatorName: go
additionalProperties:
  packageName: apiclient
  isGoSubmodule: true
```

## Implementation Patterns

### OpenAPI Client Generator

```python
from typing import Dict, List, Optional
import json
import subprocess
from pathlib import Path

class OpenAPIClientGenerator:
    def __init__(self, spec_path: str, output_dir: str):
        self.spec_path = spec_path
        self.output_dir = output_dir
        self.generators = {
            "typescript": {
                "npm_package": "@openapitools/openapi-generator-cli",
                "command": "npx @openapitools/openapi-generator-cli generate",
            },
            "python": {
                "pip_package": "openapi-generator-cli",
                "command": "openapi-generator generate",
            },
        }

    def generate_typescript(self, options: Optional[Dict] = None) -> bool:
        opts = options or {}
        cmd = [
            "npx", "@openapitools/openapi-generator-cli", "generate",
            "-i", self.spec_path,
            "-g", "typescript-axios",
            "-o", f"{self.output_dir}/typescript",
            "--additional-properties=supportsES6=true,withInterfaces=true,useSingleRequestParameter=true",
        ]
        if opts.get("npm_name"):
            cmd.append(f"--additional-properties=npmName={opts['npm_name']}")
        return self._run(cmd)

    def generate_python(self, options: Optional[Dict] = None) -> bool:
        opts = options or {}
        cmd = [
            "openapi-generator", "generate",
            "-i", self.spec_path,
            "-g", "python",
            "-o", f"{self.output_dir}/python",
            "--additional-properties=packageName=api_client",
        ]
        if opts.get("package_name"):
            cmd.append(f"--additional-properties=packageName={opts['package_name']}")
        return self._run(cmd)

    def generate_go(self, options: Optional[Dict] = None) -> bool:
        opts = options or {}
        cmd = [
            "openapi-generator", "generate",
            "-i", self.spec_path,
            "-g", "go",
            "-o", f"{self.output_dir}/go",
            "--additional-properties=packageName=apiclient,isGoSubmodule=true",
        ]
        if opts.get("package_name"):
            cmd.append(f"--additional-properties=packageName={opts['package_name']}")
        return self._run(cmd)

    def _run(self, cmd: List[str]) -> bool:
        try:
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode == 0:
                print(f"Generated client at {self.output_dir}")
                return True
            print(f"Generation failed: {result.stderr[:200]}")
            return False
        except FileNotFoundError as e:
            print(f"Generator not found: {e}")
            return False
```

## Architecture Decision Trees

### Client Generation Strategy

```
What language/framework?
├── TypeScript
│   ├── axios-based → @openapitools/typescript-axios
│   ├── fetch-based → @openapitools/typescript-fetch
│   ├── Angular → @openapitools/typescript-angular
│   └── Node.js → @openapitools/typescript-node
│
├── Python
│   └── httpx/requests → openapi-generator python
│
├── Go
│   └── net/http → openapi-generator go
│
├── Java
│   ├── Spring → openapi-generator spring
│   └── Retrofit → openapi-generator retrofit
│
└── Custom framework
    └── Use openapi-generator with custom template
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Hand-writing API clients | Inconsistent with spec, manual sync needed | Generate from OpenAPI spec |
| Modifying generated code | Changes lost on regeneration | Extend generated client, never modify |
| No spec validation before generation | Generated client mirrors spec bugs | Validate spec with spectral before generation |
| Stale generated clients | Client doesn't reflect current API | CI pipeline regenerates on spec change |
| Ignoring breaking changes in spec | Production breakage on deployment | Contract testing between client and spec |

## Performance Optimization

- **Tree-shake generated clients**: Use tree-shaking to remove unused endpoints from generated clients. Reduces bundle size by up to 60% for apps using only a subset of the API.
- **Lazy client initialization**: Generate client code in lazy-loaded chunks for large APIs. Dynamically import endpoint modules on first use.
