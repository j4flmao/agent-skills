# API Client Generator Customization

## Overview

The API client generator can be customized to match team conventions, framework requirements, and project-specific patterns. This reference covers template customization, output format configuration, custom generators for additional languages, middleware/plugin system, and integration with existing codebases.

## Template System

### Template Architecture

The generator uses a template-based rendering system where each output format has a corresponding template file. Templates use Handlebars-like syntax for conditional logic, iteration, and variable interpolation.

```yaml
template_directory_structure:
  templates/
  ├── curl/
  │   ├── request.hbs          # Main curl command template
  │   ├── auth.hbs             # Authentication header template
  │   ├── pagination.hbs       # Pagination comment template
  │   └── multipart.hbs        # Multipart body template
  ├── httpie/
  │   └── request.hbs
  ├── fetch/
  │   ├── request.hbs
  │   ├── error-handling.hbs
  │   └── pagination.hbs
  ├── axios/
  │   ├── request.hbs
  │   ├── interceptor.hbs
  │   ├── error-handling.hbs
  │   └── pagination.hbs
  ├── python/
  │   ├── requests.hbs
  │   ├── httpx.hbs
  │   ├── error-handling.hbs
  │   └── pagination.hbs
  └── custom_format/
      └── request.hbs
```

### Default Template Example (curl)

```handlebars
{{! templates/curl/request.hbs }}
{{! Request: {{method}} {{fullUrl}} }}
{{! Auth: {{auth.type}} }}
{{! Content-Type: {{contentType}} }}
{{#if methodIsNotGET}}
curl -sS -X {{method}} \
{{else}}
curl -sS \
{{/if}}
  '{{fullUrl}}' \
{{#each headers}}
  -H '{{@key}}: {{this}}' \
{{/each}}
{{#if hasAuth}}
  -H 'Authorization: {{auth.headerValue}}' \
{{/if}}
{{#if hasBody}}
  -d '{{{bodyJson}}}' \
{{/if}}
{{#if hasPagination}}
  {{! Uncomment for pagination: }}
  {{!-- --data-urlencode 'page=1' --data-urlencode 'limit=100' \ --}}
{{/if}}
{{! For verbose output, add -v flag }}
```

### Custom Template Variables

```typescript
// Template context passed to each template
interface TemplateContext {
    // Request details
    method: string;
    baseUrl: string;
    path: string;
    fullUrl: string;
    queryParams: Record<string, string>;
    headers: Record<string, string>;
    body: unknown;
    bodyJson: string;  // Pretty-printed JSON body
    contentType: string;

    // Authentication
    auth: {
        type: 'none' | 'bearer' | 'basic' | 'api-key' | 'oauth2';
        headerValue: string;  // Full Authorization header value
        tokenPlaceholder: string;
    };

    // Computed helpers
    methodIsNotGET: boolean;
    hasAuth: boolean;
    hasBody: boolean;
    hasPagination: boolean;
    isMultipart: boolean;

    // Environment
    env: {
        apiUrl: string;  // $API_URL or process.env.API_URL
        token: string;   // $TOKEN or process.env.AUTH_TOKEN
    };

    // Custom extensions
    customVariables: Record<string, unknown>;
}
```

### Creating Custom Templates

```typescript
// Custom template registration
import { TemplateRegistry } from './generator/templates';

const registry = TemplateRegistry.getInstance();

// Register custom curl template with company-specific conventions
registry.registerTemplate('curl', 'request', {
    content: `
{{! Company-specific curl template }}
{{! @team-api: use --connect-timeout 30 for all requests }}
curl -sS --connect-timeout 30 \
{{#if methodIsNotGET}}
  -X {{method}} \
{{/if}}
  '{{fullUrl}}' \
{{#each headers}}
  -H '{{@key}}: {{this}}' \
{{/each}}
{{#if auth.type}}
  -H 'Authorization: {{#if auth.isOAuth2}}{{auth.tokenType}} {{auth.token}}{{else}}{{auth.headerValue}}{{/if}}' \
{{/if}}
{{#if hasBody}}
  -d '{{{bodyJson}}}' \
{{/if}}
{{! Company API guidelines: always include correlation ID }}
  -H 'X-Correlation-ID: $(uuidgen)' \
`,
    priority: 100,  // Higher priority overrides default
});

// Custom template for TypeScript fetch with error handling
registry.registerTemplate('typescript-fetch', 'request', {
    content: `
/**
 * {{method}} {{path}}
 *
{{#if auth.type}}
 * Authentication: {{auth.type}}
{{/if}}
 * @see API docs: {{fullUrl}}
 */
export async function {{operationName}}(
{{#if hasPathParams}}
  params: {{{pathParamsType}}},
{{/if}}
{{#if hasBody}}
  data: {{{bodyType}}},
{{/if}}
  options?: RequestOptions
): Promise<{{{responseType}}}> {
  const url = new URL('{{path}}', getBaseUrl());

{{#if hasPathParams}}
  // Interpolate path parameters
  Object.entries(params).forEach(([key, value]) => {
    url.pathname = url.pathname.replace(\`:\${key}\`, encodeURIComponent(String(value)));
  });
{{/if}}

{{#if queryParams}}
  // Set query parameters
  Object.entries({{{queryParamsObject}}}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
{{/if}}

  const response = await fetch(url.toString(), {
    method: '{{method}}',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
{{#if auth.type}}
      ...getAuthHeaders(),
{{/if}}
      ...options?.headers,
    },
{{#if hasBody}}
    body: JSON.stringify(data),
{{/if}}
    signal: options?.signal,
  });

  if (!response.ok) {
    const error = await parseApiError(response);
    throw error;
  }

{{#if noContent}}
  return undefined as {{{responseType}}};
{{else}}
  return response.json() as Promise<{{{responseType}}}>;
{{/if}}
}
`,
});
```

## Output Format Configuration

### Format Options

```typescript
// Output format configuration
interface FormatConfig {
    // Which formats to generate
    formats: {
        curl: boolean;
        httpie: boolean;
        fetch: boolean;
        axios: boolean;
        'python-requests': boolean;
        'python-httpx': boolean;
        'go-nethttp': boolean;
        'rust-reqwest': boolean;
        'java-resttemplate': boolean;
        'java-webclient': boolean;
        'csharp-httpclient': boolean;
        'ruby-nethttp': boolean;
        'php-guzzle': boolean;
    };

    // Format-specific options
    options: {
        curl: {
            includeVerbose: boolean;       // Add -v flag in comment
            useShortFlags: boolean;        // -H instead of --header
            followRedirects: boolean;      // Add -L flag
            maxTime: number;               // --max-time seconds
            connectTimeout: number;        // --connect-timeout seconds
        };
        axios: {
            importStyle: 'require' | 'import';
            useInterceptors: boolean;      // Generate interceptor patterns
            responseType: 'json' | 'text' | 'blob';
            withCredentials: boolean;
        };
        fetch: {
            target: 'browser' | 'node18+' | 'node-fetch';
            abortController: boolean;      // Add AbortController pattern
        };
        'python-requests': {
            useSession: boolean;           // Use requests.Session
            timeout: number;               // Default timeout seconds
            verifySSL: boolean;
        };
    };
}
```

### Language-Specific Conventions

```yaml
typescript:
  convention: "camelCase for properties, PascalCase for types"
  config: |
    generatorConfig.typescript = {
      style: 'functional',  // or 'class-based'
      moduleSystem: 'esm',
      generateTypes: true,
      strictNullChecks: true,
      importHelpers: true,
    };

python:
  convention: "snake_case for properties and functions"
  config: |
    generatorConfig.python = {
      style: 'async',  // or 'sync'
      typeHints: true,
      usePydantic: true,  // Generate pydantic models
      useHttpx: true,     // httpx instead of requests
    };

go:
  convention: "PascalCase for exported types"
  config: |
    generatorConfig.go = {
      packageName: 'api',
      generateTypes: true,
      useContext: true,
      errorHandling: 'standard',  // or 'custom error types'
    };

rust:
  convention: "snake_case for functions, PascalCase for types"
  config: |
    generatorConfig.rust = {
      useReqwest: true,
      errorType: 'anyhow',  // or 'thiserror'
      asyncClient: true,
      generateSerde: true,
    };
```

## Plugin System

### Plugin Architecture

```typescript
// Plugin interface
interface GeneratorPlugin {
    name: string;
    version: string;

    // Hook into generation lifecycle
    hooks: {
        // Before input parsing
        beforeParse?: (input: ParseInput) => ParseInput;

        // After parsing, before intermediate model construction
        afterParse?: (spec: ParsedSpec) => ParsedSpec | void;

        // Before template rendering
        beforeRender?: (context: TemplateContext) => TemplateContext;

        // After template rendering, before output
        afterRender?: (output: RenderedOutput) => RenderedOutput;

        // Custom format rendering
        renderFormat?: {
            name: string;  // Format identifier
            render: (context: TemplateContext) => string;
        };
    };
}
```

### Example Plugins

```typescript
// Plugin: Add correlation ID to all examples
const correlationIdPlugin: GeneratorPlugin = {
    name: 'correlation-id',
    version: '1.0.0',
    hooks: {
        beforeRender(context) {
            context.headers['X-Correlation-ID'] = 'generated-uuid';
            context.customVariables.correlationId = context.env === 'production'
                ? process.env.CORRELATION_ID || 'auto'
                : 'test-correlation-id';
            return context;
        },
    },
};

// Plugin: Add rate limit comments
const rateLimitPlugin: GeneratorPlugin = {
    name: 'rate-limit-notes',
    version: '1.0.0',
    hooks: {
        afterRender(output) {
            const rateLimitNotice = '\n# Note: API rate limit is 1000 req/min\n';
            return {
                ...output,
                content: output.content + rateLimitNotice,
            };
        },
    },
};

// Plugin: Custom format for Postman collection
const postmanPlugin: GeneratorPlugin = {
    name: 'postman-export',
    version: '1.0.0',
    hooks: {
        renderFormat: {
            name: 'postman',
            render(context) {
                return JSON.stringify({
                    info: { name: context.operationName, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/' },
                    item: [{
                        name: context.operationName,
                        request: {
                            method: context.method,
                            url: context.fullUrl,
                            header: Object.entries(context.headers).map(([key, value]) => ({
                                key, value, type: 'text',
                            })),
                            body: context.hasBody ? {
                                mode: 'raw',
                                raw: context.bodyJson,
                                options: { raw: { language: 'json' } },
                            } : undefined,
                        },
                    }],
                }, null, 2);
            },
        },
    },
};
```

### Plugin Registration

```typescript
// Register plugins with the generator
const generator = new ApiClientGenerator({
    plugins: [
        correlationIdPlugin,
        rateLimitPlugin,
        postmanPlugin,
    ],
});

// Or load from configuration file
// api-client-generator.config.json
{
    "plugins": [
        { "name": "correlation-id", "enabled": true },
        { "name": "rate-limit-notes", "enabled": true, "config": { "limit": 2000 } },
        { "name": "postman-export", "enabled": false }
    ]
}
```

## Middleware System

### Request/Response Middleware

```typescript
// Middleware types for generated clients
interface Middleware {
    name: string;
    request?: (req: RequestConfig) => Promise<RequestConfig>;
    response?: (res: Response, req: RequestConfig) => Promise<Response>;
    error?: (error: Error, req: RequestConfig) => Promise<Error>;
}

// Built-in middleware
const loggingMiddleware: Middleware = {
    name: 'logging',
    request: async (req) => {
        console.log(`[API] ${req.method} ${req.path}`);
        return req;
    },
    response: async (res, req) => {
        console.log(`[API] ${req.method} ${req.path} -> ${res.status}`);
        return res;
    },
    error: async (error, req) => {
        console.error(`[API] ${req.method} ${req.path} failed:`, error.message);
        return error;
    },
};

const retryMiddleware: Middleware = {
    name: 'retry',
    request: async (req) => {
        // Implementation up to 3 retries for 5xx errors
        return req;
    },
};

// Generated client with middleware
const client = new ApiClient({
    baseUrl: 'https://api.example.com',
    middleware: [loggingMiddleware, retryMiddleware],
});
```

### Generated Middleware Configuration

```typescript
// Generator configuration for middleware
// api-client-generator.config.json
{
    "client": {
        "middleware": {
            "logging": {
                "enabled": true,
                "config": {
                    "logRequestBody": false,
                    "logResponseBody": true
                }
            },
            "retry": {
                "enabled": true,
                "config": {
                    "maxRetries": 3,
                    "retryOnStatus": [429, 502, 503, 504],
                    "backoffStrategy": "exponential"
                }
            },
            "timeout": {
                "enabled": true,
                "config": {
                    "defaultTimeoutMs": 30000,
                    "timeoutPerMethod": {
                        "GET": 10000,
                        "POST": 30000,
                        "PUT": 30000,
                        "DELETE": 15000
                    }
                }
            },
            "auth": {
                "enabled": true,
                "config": {
                    "tokenEnvVar": "API_TOKEN",
                    "refreshEndpoint": "/auth/refresh",
                    "refreshBeforeExpiryMs": 300000
                }
            }
        }
    }
}
```

## Integration with Existing Codebases

### Overlay Existing Conventions

```typescript
// Read existing client code to extract conventions
class ConventionExtractor {
    async extractFromExistingCode(filePath: string): Promise<ClientConventions> {
        const source = await readFile(filePath, 'utf-8');

        return {
            // Extract URL construction pattern
            baseUrlPattern: this.extractBaseUrl(source),
            // Extract auth header pattern
            authHeaderPattern: this.extractAuthHeader(source),
            // Extract error handling pattern
            errorHandling: this.extractErrorHandling(source),
            // Extract header conventions
            commonHeaders: this.extractCommonHeaders(source),
            // Extract pagination pattern
            pagination: this.extractPagination(source),
            // Extract naming conventions
            naming: this.extractNamingConventions(source),
        };
    }

    private extractBaseUrl(source: string): string {
        const match = source.match(/baseURL\s*[:=]\s*['"](.+?)['"]/);
        return match?.[1] || 'https://api.example.com';
    }

    private extractAuthHeader(source: string): string {
        if (source.includes('Bearer')) return 'Bearer';
        if (source.includes('X-API-Key')) return 'X-API-Key';
        if (source.includes('Basic')) return 'Basic';
        return 'Bearer';
    }

    private extractErrorHandling(source: string): ErrorHandlingConfig {
        const hasInterceptor = source.includes('interceptor');
        const hasRetry = source.includes('retry');
        return { hasInterceptor, hasRetry };
    }
}
```

### Incremental Code Generation

```typescript
// Merge generated code with existing codebase
class IncrementalGenerator {
    async generateWithExistingContext(specPath: string, existingClientPath: string): Promise<void> {
        // Extract conventions from existing code
        const extractor = new ConventionExtractor();
        const conventions = await extractor.extractFromExistingCode(existingClientPath);

        // Generate new client code matching existing conventions
        const generator = new ApiClientGenerator({
            conventions,
            existingImports: await this.extractImports(existingClientPath),
            outputPath: existingClientPath,
        });

        // Generate only the endpoints that don't exist yet
        const existingEndpoints = await this.extractExistingEndpoints(existingClientPath);
        const spec = await parseSpec(specPath);
        const newEndpoints = spec.endpoints.filter(
            ep => !existingEndpoints.includes(ep.operationId),
        );

        // Append new endpoints to existing file
        const generatedCode = await generator.generateEndpoints(newEndpoints, conventions);
        await appendToFile(existingClientPath, generatedCode);
    }
}
```

## Generator Configuration File

```yaml
# api-client-generator.yaml
version: "2.0"
project: "my-api-client"

input:
  openapi: "./api-spec.yaml"
  # Or from route files:
  # routes: "./src/routes/*.ts"

output:
  directory: "./src/generated"
  format: "typescript"
  # One file per endpoint group or single file
  fileStrategy: "per-domain"  # "single" | "per-domain" | "per-endpoint"

client:
  name: "ApiClient"
  baseUrl: "https://api.example.com/v2"
  timeout: 30000
  retry:
    maxRetries: 3
    baseDelayMs: 1000
    retryOnStatus: [429, 502, 503, 504]
  auth:
    default: "bearer"
    tokenStorage: "secure"

templates:
  format: "custom"  # Override default templates
  directory: "./templates"
  extends: ["base-templates"]

plugins:
  - name: "correlation-id"
    enabled: true
  - name: "rate-limit-notes"
    enabled: true
    config:
      limit: 1000
      interval: "1 minute"
  - name: "custom-auth"
    enabled: true
    config:
      provider: "./plugins/custom-auth.ts"

types:
  dateType: "Date"          # Generate Date objects, not strings
  unknownType: "unknown"    # Use unknown instead of any
  generateEnums: true       # Generate enum types
  strictNullChecks: true    # Use T | null for nullable fields
  prefix: "Api"             # Prefix generated types: ApiUser, ApiOrder
  suffix: ""                # No suffix

generate:
  tests: true
  types: true
  client: true
  sdk: false                # Don't generate full SDK package
  paginationHelpers: true
  errorClasses: true
  interceptors: true
  middleware: ["logging", "timeout"]

conventions:
  importStyle: "import"     # ES module imports
  semicolons: true
  quotes: "single"
  indentSize: 2
  trailingComma: "all"
  sortImports: true
  generateBarrel: true      # Generate index.ts barrel export
```

## References

- api-client-generator-advanced.md — Advanced generation patterns
- API Client Examples — Common API request examples
- Client Test Patterns — Testing generated clients
- Codegen Comparison — Code generation tools comparison
