# API Client Generator Advanced Usage

## Overview

This reference covers advanced API client generation patterns beyond basic request construction. Topics include: working with complex OpenAPI specs, multi-auth strategies, streaming and WebSocket clients, SDK generation, GraphQL support, gRPC client generation, testing generated clients, and integrating generated code into production applications.

## Complex OpenAPI Spec Handling

### Composed Schemas (allOf, oneOf, anyOf)

```yaml
allOf_handling:
  description: "Combine multiple schemas into one (merge all properties)"
  strategy: "Merge all properties from all referenced schemas"
  example:
    spec: |
      User:
        allOf:
          - $ref: '#/components/schemas/BaseEntity'
          - type: object
            properties:
              name: { type: string }
              email: { type: string }
    generated: |
      interface User extends BaseEntity {
        name: string;
        email: string;
      }

oneOf_handling:
  description: "Exactly one of the referenced schemas (discriminated union)"
  strategy: "Generate discriminated union type with discriminator"
  example:
    spec: |
      PaymentMethod:
        oneOf:
          - $ref: '#/components/schemas/CreditCard'
          - $ref: '#/components/schemas/PayPal'
          - $ref: '#/components/schemas/Crypto'
        discriminator:
          propertyName: type
    generated: |
      type PaymentMethod = CreditCard | PayPal | Crypto;
      // discriminator: 'type' property determines which variant

anyOf_handling:
  description: "One or more of the referenced schemas"
  strategy: "Generate union type without discriminator"
  example: |
    type AnyOfResult = SchemaA | SchemaB | SchemaC;
    // Runtime validation needed to determine actual shape
```

### Circular References

```yaml
issue:
  description: "Schema A references Schema B which references Schema A"
  challenge: "Infinite recursion in type generation and serialization"

handling_strategies:
  lazy:
    description: "Use lazy type references"
    example: |
      interface TreeNode {
        children?: TreeNode[];  // Self-referential — fine in TypeScript
      }

  forward_declaration:
    description: "Declare type before usage"
    example: |
      interface Employee {
        manager?: Employee;  // Self-reference
        reports: Employee[];
      }

  manual_break:
    description: "Break the circle with type annotation"
    tool_output: |
      // Circular reference detected between Employee and Department
      // Manual intervention required — add type annotation
      type Employee_Department = /* resolve circular ref */ any;
```

### Polymorphism with Discriminators

```typescript
// OpenAPI discriminator generates type-safe discriminated unions
// Spec defines:
// Pet:
//   discriminator:
//     propertyName: petType
//   oneOf:
//     - $ref: '#/components/schemas/Cat'
//     - $ref: '#/components/schemas/Dog'

// Generated TypeScript:
interface Cat extends BasePet {
    petType: 'cat';
    huntingSkill: 'lazy' | 'adventurous';
}

interface Dog extends BasePet {
    petType: 'dog';
    packSize: number;
}

type Pet = Cat | Dog;

// Type-safe handling:
function handlePet(pet: Pet) {
    switch (pet.petType) {
        case 'cat':
            console.log(`Cat hunting skill: ${pet.huntingSkill}`);
            break;
        case 'dog':
            console.log(`Dog pack size: ${pet.packSize}`);
            break;
    }
}
```

## Multi-Auth Strategy Generation

### Multiple Security Schemes

```typescript
// OpenAPI spec with multiple auth methods
// securitySchemes:
//   bearerAuth:
//     type: http
//     scheme: bearer
//   apiKey:
//     type: apiKey
//     in: header
//     name: X-API-Key
//   oauth2:
//     type: oauth2
//     flows:
//       authorizationCode:
//         authorizationUrl: https://auth.example.com/authorize
//         tokenUrl: https://auth.example.com/token

// Generated flexible auth client
interface AuthConfig {
    method: 'bearer' | 'apiKey' | 'oauth2' | 'basic';
    credentials: {
        // Bearer
        token?: string;
        // API Key
        apiKey?: string;
        apiKeyHeader?: string;
        // OAuth2
        clientId?: string;
        clientSecret?: string;
        tokenEndpoint?: string;
        // Basic
        username?: string;
        password?: string;
    };
}

function createAuthInterceptor(config: AuthConfig) {
    return async (request: RequestConfig) => {
        switch (config.method) {
            case 'bearer':
                request.headers['Authorization'] = `Bearer ${config.credentials.token}`;
                break;
            case 'apiKey':
                request.headers[config.credentials.apiKeyHeader || 'X-API-Key'] = config.credentials.apiKey;
                break;
            case 'oauth2':
                const token = await fetchOAuth2Token(config.credentials);
                request.headers['Authorization'] = `Bearer ${token}`;
                break;
            case 'basic':
                const encoded = Buffer.from(`${config.credentials.username}:${config.credentials.password}`).toString('base64');
                request.headers['Authorization'] = `Basic ${encoded}`;
                break;
        }
        return request;
    };
}
```

### Token Refresh Interceptor

```typescript
// Generated token refresh interceptor
class AuthenticatedClient {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private refreshPromise: Promise<void> | null = null;

    constructor(
        private baseUrl: string,
        private onTokenRefresh: (tokens: { access: string; refresh: string }) => void,
    ) {}

    async request<T>(config: RequestConfig): Promise<T> {
        const response = await fetch(`${this.baseUrl}${config.path}`, {
            method: config.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.accessToken}`,
                ...config.headers,
            },
            body: config.body ? JSON.stringify(config.body) : undefined,
        });

        if (response.status === 401 && this.refreshToken) {
            // Token expired — attempt refresh
            await this.refreshAccessToken();
            // Retry original request with new token
            return this.request<T>(config);
        }

        if (!response.ok) {
            throw new ApiError(response.status, await response.json());
        }

        return response.json();
    }

    private async refreshAccessToken(): Promise<void> {
        // Deduplicate concurrent refresh attempts
        if (this.refreshPromise) return this.refreshPromise;

        this.refreshPromise = (async () => {
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: this.refreshToken }),
            });

            if (!response.ok) {
                this.accessToken = null;
                this.refreshToken = null;
                this.onTokenRefresh({ access: '', refresh: '' });
                throw new AuthError('Session expired');
            }

            const tokens = await response.json();
            this.accessToken = tokens.accessToken;
            this.refreshToken = tokens.refreshToken;
            this.onTokenRefresh(tokens);
        })();

        try {
            await this.refreshPromise;
        } finally {
            this.refreshPromise = null;
        }
    }
}
```

## Streaming and WebSocket Clients

### Server-Sent Events (SSE) Client

```typescript
// Generated SSE client for streaming endpoints
// OpenAPI extension: x-streaming: true on endpoint
class SSEStreamClient {
    private eventSource: EventSource | null = null;

    connect(
        path: string,
        handlers: {
            onMessage: (data: unknown) => void;
            onError: (error: Event) => void;
            onOpen?: () => void;
        },
    ): void {
        this.disconnect();

        this.eventSource = new EventSource(`${this.baseUrl}${path}`, {
            withCredentials: true,
        });

        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handlers.onMessage(data);
            } catch (error) {
                console.error('Failed to parse SSE message:', error);
            }
        };

        this.eventSource.onerror = (event) => {
            handlers.onError(event);
            // Auto-reconnect after 3 seconds
            setTimeout(() => this.connect(path, handlers), 3000);
        };

        this.eventSource.onopen = () => handlers.onOpen?.();
    }

    disconnect(): void {
        this.eventSource?.close();
        this.eventSource = null;
    }
}
```

### WebSocket Client

```typescript
// Generated WebSocket client
class WebSocketClient {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private messageHandlers: Map<string, (data: unknown) => void> = new Map();

    connect(path: string, token: string): void {
        const url = `${this.wsBaseUrl}${path}?token=${token}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            this.reconnectAttempts = 0;
            console.log('WebSocket connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const handler = this.messageHandlers.get(message.type);
                if (handler) {
                    handler(message.payload);
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        this.ws.onclose = () => {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                setTimeout(() => this.connect(path, token), delay);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    send(type: string, payload: unknown): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type, payload }));
        } else {
            console.error('WebSocket not connected');
        }
    }

    on(type: string, handler: (data: unknown) => void): void {
        this.messageHandlers.set(type, handler);
    }

    disconnect(): void {
        this.ws?.close();
        this.ws = null;
    }
}
```

## GraphQL Client Generation

### From OpenAPI to GraphQL Operations

```typescript
// Generate GraphQL queries from REST endpoint descriptions
// Input: OpenAPI GET /users/{id}
// Output:
const GET_USER_QUERY = `
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
      role
      createdAt
    }
  }
`;

// Generate mutation from POST endpoint
const CREATE_USER_MUTATION = `
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
    }
  }
`;

// Generated GraphQL client
class GraphQLClient {
    constructor(private endpoint: string, private getToken: () => string | null) {}

    async query<TData, TVariables = Record<string, unknown>>(
        query: string,
        variables?: TVariables,
    ): Promise<TData> {
        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.getToken() ? `Bearer ${this.getToken()}` : '',
            },
            body: JSON.stringify({ query, variables }),
        });

        const result = await response.json();

        if (result.errors) {
            throw new GraphQLError(result.errors);
        }

        return result.data as TData;
    }
}
```

## SDK Generation

### Full SDK Structure

```typescript
// Generated SDK package structure
sdk/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Main export — all public API
│   ├── client.ts             # Base HTTP client with interceptors
│   ├── types.ts              # All generated types and interfaces
│   ├── api/
│   │   ├── users.ts          # Users API (CRUD operations)
│   │   ├── orders.ts         # Orders API
│   │   ├── products.ts       # Products API
│   │   └── auth.ts           # Auth endpoints
│   ├── interceptors/
│   │   ├── auth.ts           # Auth interceptor (bearer token)
│   │   ├── retry.ts          # Retry logic with exponential backoff
│   │   ├── logging.ts        # Request/response logging
│   │   └── error-handling.ts # Structured error handling
│   ├── errors/
│   │   ├── api-error.ts      # Base API error
│   │   ├── auth-error.ts     # Authentication error
│   │   ├── validation.ts     # Request validation error
│   │   └── rate-limit.ts     # Rate limiting error
│   └── utils/
│       ├── pagination.ts     # Pagination helpers
│       ├── serialization.ts  # Custom serialization
│       └── validation.ts     # Request validation
├── tests/
│   ├── unit/
│   │   ├── client.test.ts
│   │   ├── users.test.ts
│   │   └── interceptors.test.ts
│   └── integration/
│       ├── users.int.test.ts
│       └── auth.int.test.ts
└── README.md
```

### SDK Client with Full Error Handling

```typescript
// Generated base client
class ApiClient {
    private interceptors: Interceptor[] = [];

    constructor(private config: ClientConfig) {}

    use(interceptor: Interceptor): void {
        this.interceptors.push(interceptor);
    }

    async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
        // Apply request interceptors
        let currentConfig = { ...config, baseUrl: this.config.baseUrl };
        for (const interceptor of this.interceptors) {
            if (interceptor.request) {
                currentConfig = await interceptor.request(currentConfig);
            }
        }

        try {
            const response = await fetch(
                `${currentConfig.baseUrl}${currentConfig.path}`,
                {
                    method: currentConfig.method,
                    headers: currentConfig.headers,
                    body: currentConfig.body ? JSON.stringify(currentConfig.body) : undefined,
                    signal: currentConfig.signal,
                },
            );

            // Parse response
            const data = response.status === 204
                ? null
                : await response.json();

            // Apply response interceptors
            const apiResponse: ApiResponse<T> = {
                data: data as T,
                status: response.status,
                headers: response.headers,
                ok: response.ok,
            };

            for (const interceptor of this.interceptors) {
                if (interceptor.response) {
                    await interceptor.response(apiResponse);
                }
            }

            if (!response.ok) {
                throw new ApiError(response.status, data, response.headers);
            }

            return apiResponse;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new NetworkError('Network request failed', { cause: error });
        }
    }
}
```

## Testing Generated Clients

### Unit Testing

```typescript
import { ApiClient } from './generated/client';

// Mock fetch for unit tests
global.fetch = jest.fn();

describe('Users API Client', () => {
    let client: ApiClient;

    beforeEach(() => {
        client = new ApiClient({ baseUrl: 'https://api.example.com' });
        jest.clearAllMocks();
    });

    it('should fetch user by ID', async () => {
        const mockUser = { id: '1', name: 'John Doe', email: 'john@example.com' };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: async () => mockUser,
            headers: new Headers(),
        });

        const response = await client.users.getUser({ id: '1' });

        expect(response.data).toEqual(mockUser);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.example.com/users/1',
            expect.objectContaining({ method: 'GET' }),
        );
    });

    it('should handle 404 error', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 404,
            json: async () => ({ error: 'User not found' }),
            headers: new Headers(),
        });

        await expect(client.users.getUser({ id: '999' })).rejects.toThrow(ApiError);
    });
});
```

### Contract Testing

```typescript
// Contract test between generated client and API spec
import { OpenAPIValidator } from 'openapi-validator';

describe('API Contract', () => {
    const validator = new OpenAPIValidator('./api-spec.yaml');

    it('generated client matches spec', async () => {
        // Verify all spec endpoints have client methods
        const specEndpoints = validator.getEndpoints();
        const clientMethods = getClientMethods(client);

        for (const endpoint of specEndpoints) {
            expect(clientMethods).toContain(endpoint.methodName);
        }
    });

    it('request body matches spec schema', async () => {
        const createUserRequest = {
            name: 'John Doe',
            email: 'john@example.com',
        };

        const validation = validator.validateRequestBody('POST', '/users', createUserRequest);
        expect(validation.valid).toBe(true);
    });
});
```

## Integration Patterns

### Retry with Exponential Backoff

```typescript
class RetryInterceptor implements Interceptor {
    constructor(private maxRetries = 3, private baseDelay = 1000) {}

    async response(response: ApiResponse): Promise<void> {
        if (!response.ok && this.shouldRetry(response.status)) {
            throw new RetryableError(response);
        }
    }

    async request(config: RequestConfig): Promise<RequestConfig> {
        const originalRequest = config;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                // Recreate fetch to allow retry
                const response = await fetch(
                    `${config.baseUrl}${config.path}`,
                    { method: config.method, headers: config.headers, body: config.body },
                );

                if (response.ok || !this.shouldRetry(response.status)) {
                    return originalRequest;
                }

                lastError = new RetryableError(response);
            } catch (error) {
                lastError = error as Error;
                if (!this.isNetworkError(error)) throw error;
            }

            if (attempt < this.maxRetries) {
                await this.delay(attempt);
            }
        }

        throw lastError || new Error('Max retries exceeded');
    }

    private shouldRetry(status: number): boolean {
        return [429, 502, 503, 504].includes(status);
    }

    private async delay(attempt: number): Promise<void> {
        const delay = this.baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    private isNetworkError(error: unknown): boolean {
        return error instanceof TypeError && error.message === 'Failed to fetch';
    }
}
```

### Request Deduplication

```typescript
class DeduplicationInterceptor implements Interceptor {
    private inflightRequests: Map<string, Promise<unknown>> = new Map();

    async request(config: RequestConfig): Promise<RequestConfig> {
        const key = this.getRequestKey(config);

        if (config.method === 'GET' && this.inflightRequests.has(key)) {
            // Return the inflight promise for the same GET request
            const cached = this.inflightRequests.get(key)!;
            const response = await cached;

            // Simulate returning cached response
            throw new DeduplicatedResponse(response);
        }

        return config;
    }

    private getRequestKey(config: RequestConfig): string {
        return `${config.method}:${config.baseUrl}${config.path}:${JSON.stringify(config.queryParams)}`;
    }
}
```

## Code Generation Customization

### Custom Type Mappings

```yaml
custom_mappings:
  extension: "x-type-override"
  usage: |
    # In OpenAPI spec
    properties:
      createdAt:
        type: string
        format: date-time
        x-type-override: Date  # Generate as Date, not string

  custom_annotations:
    - "x-validate: not-empty — add validation decorator"
    - "x-sensitive: true — mark sensitive (masked in logs)"
    - "x-deprecated: 'Use /api/v2/users instead' — deprecation notice"

  template_overrides:
    - "x-template: custom-curl — use custom template instead of default"
    - "x-template-params: { timeout: 30000 } — pass params to template"
```

### Generator Configuration

```typescript
// Generator configuration
interface GeneratorConfig {
    // Output configuration
    output: {
        directory: string;
        language: 'typescript' | 'python' | 'go' | 'rust' | 'java';
        moduleFormat: 'esm' | 'commonjs' | 'both';
    };

    // Client configuration
    client: {
        baseUrl: string;
        timeout: number;  // Default request timeout (ms)
        retryConfig: {
            maxRetries: number;
            baseDelayMs: number;
        };
    };

    // Type generation
    types: {
        dateType: 'string' | 'Date' | 'number';
        unknownType: 'unknown' | 'any';
        generateEnums: boolean;
        strictNullChecks: boolean;
    };

    // Auth configuration
    auth: {
        defaultMethod: 'bearer' | 'apiKey' | 'oauth2' | 'none';
        tokenStorage: 'memory' | 'localStorage' | 'secureStorage';
        enableRefresh: boolean;
    };

    // Features
    features: {
        generateTests: boolean;
        generateSDK: boolean;
        paginationHelper: boolean;
        errorClasses: boolean;
        interceptors: boolean;
    };
}
```

## References

- api-client-generator-customization.md — Generator customization guide
- API Client Examples — Common API request examples
- Client Test Patterns — Testing patterns for API clients
- Codegen Comparison — Code generation tools comparison
