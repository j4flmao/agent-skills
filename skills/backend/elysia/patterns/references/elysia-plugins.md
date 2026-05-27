# Elysia Plugin Development

## Plugin Architecture

### Plugin Lifecycle
```
Register → Initialize → Start → Handle Requests → Stop → Cleanup
```

### Plugin Structure
```typescript
import { Elysia } from "elysia";

export const myPlugin = (config?: PluginConfig) => (app: Elysia) =>
  app
    .state("pluginState", initialState)
    .decorate("pluginMethod", () => {})
    .onRequest(({ request }) => {
      // Per-request logic
    })
    .onResponse(({ response }) => {
      // Post-response logic
    })
    .get("/plugin-status", () => ({ status: "ok" }));

// Usage
const app = new Elysia().use(myPlugin({ option: "value" }));
```

### Plugin Configuration
```typescript
interface PluginConfig {
  prefix?: string;
  enabled?: boolean;
  options?: Record<string, unknown>;
}

interface PluginContext {
  config: PluginConfig;
  state: AppState;
  logger: Logger;
}
```

## Built-in Plugins

### Static File Serving
```typescript
import { staticPlugin } from "@elysiajs/static";

const app = new Elysia()
  .use(staticPlugin({
    assets: "./public",
    prefix: "/static",
    alwaysStatic: false,
    noCache: true,
  }));
```

### CORS
```typescript
import { cors } from "@elysiajs/cors";

const app = new Elysia()
  .use(cors({
    origin: ["https://app.example.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 3600,
  }));
```

### JWT Authentication
```typescript
import { jwt } from "@elysiajs/jwt";

const app = new Elysia()
  .use(jwt({
    name: "jwt",
    secret: process.env.JWT_SECRET!,
    exp: "7d",
  }))
  .get("/protected", async ({ jwt, headers }) => {
    const token = headers.authorization?.split(" ")[1];
    const payload = await jwt.verify(token);
    if (!payload) throw new Error("Invalid token");
    return payload;
  });
```

### Swagger Documentation
```typescript
import { swagger } from "@elysiajs/swagger";

const app = new Elysia()
  .use(swagger({
    path: "/docs",
    documentation: {
      info: { title: "API", version: "1.0.0" },
      tags: [{ name: "Users", description: "User endpoints" }],
    },
  }));
```

### Rate Limiting
```typescript
import { rateLimit } from "elysia-rate-limit";

const app = new Elysia()
  .use(rateLimit({
    max: 100,
    duration: 60000,
    errorResponse: {
      type: "https://api.example.com/errors/rate-limit",
      title: "Rate Limit Exceeded",
      detail: "Too many requests",
    },
  }));
```

## Custom Plugin Patterns

### Logging Plugin
```typescript
import { Elysia } from "elysia";
import pino from "pino";

export const loggingPlugin = (options?: { level?: string }) => {
  const logger = pino({ level: options?.level ?? "info" });

  return (app: Elysia) =>
    app
      .decorate("log", logger)
      .onRequest(({ request }) => {
        logger.info({ method: request.method, url: request.url }, "Request");
      })
      .onResponse(({ response }) => {
        logger.info({ status: response.status }, "Response");
      });
};
```

### Auth Guard Plugin
```typescript
import { Elysia, t } from "elysia";

export const authGuard = (app: Elysia) =>
  app
    .derive(({ headers, jwt }) => {
      const token = headers.authorization?.split(" ")[1];
      if (!token) throw new Error("Missing authorization header");
      return { userId: jwt.verify(token) };
    })
    .onError(({ code, error, set }) => {
      if (code === "VALIDATION" || error.message.includes("auth")) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
    });

// Usage
const app = new Elysia()
  .use(jwtPlugin)
  .group("/admin", (app) => app.use(authGuard).get("/users", () => {}));
```

### Error Handler Plugin
```typescript
import { Elysia } from "elysia";
import { logger } from "./logger";

export const errorHandler = (app: Elysia) =>
  app.onError(({ code, error, set, request }) => {
    logger.error({ code, error, url: request.url });

    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        type: "https://api.example.com/errors/not-found",
        title: "Resource not found",
        detail: `No resource at ${request.url}`,
      };
    }

    if (code === "VALIDATION") {
      set.status = 422;
      return {
        type: "https://api.example.com/errors/validation",
        title: "Validation failed",
        detail: error.message,
        errors: error.all,
      };
    }

    set.status = 500;
    return {
      type: "https://api.example.com/errors/internal",
      title: "Internal server error",
      detail: "An unexpected error occurred",
    };
  });
```

## Lifecycle Hooks

### Hook Order
```
onRequest → derive → resolve → beforeHandle → handler → afterHandle → onResponse
                                ↓
                          onError (if error thrown)
```

### Available Hooks
```typescript
app
  // Request phase
  .onRequest(({ request }) => {})         // Raw request received
  .derive(({ headers, jwt }) => ({        // Add to context
    userId: jwt.verify(headers.auth),
  }))
  .resolve(({ params }) => ({             // Resolve async data
    user: await db.findUser(params.id),
  }))
  .beforeHandle(({ body }) => {           // Pre-handler validation
    if (!body.name) throw new Error("Name required");
  })

  // Response phase
  .afterHandle(({ response }) => ({       // Transform response
    ...response,
    timestamp: new Date().toISOString(),
  }))
  .onResponse(({ response }) => {         // Post-response logging
    console.log("Response sent");
  })

  // Error phase
  .onError(({ code, error }) => {         // Global error handler
    return { error: error.message };
  });
```

### Scoped Hooks
```typescript
app
  .guard({
    beforeHandle: ({ headers }) => {
      if (!headers.authorization) throw new Error("Unauthorized");
    },
  })
  .get("/public", () => "Public")
  .get("/protected", () => "Protected"); // Inherits guard

// Override guard for specific route
app.get("/special", () => "Special", {
  beforeHandle: [],
});
```

## Plugin Composition

### Chaining Plugins
```typescript
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { jwt } from "@elysiajs/jwt";
import { authGuard } from "./plugins/auth-guard";
import { errorHandler } from "./plugins/error-handler";

export const createApp = () =>
  new Elysia()
    .use(errorHandler)
    .use(cors())
    .use(swagger())
    .use(jwt({ secret: process.env.JWT_SECRET! }))
    .use(authGuard);
```

### Plugin Groups
```typescript
const adminPlugin = (app: Elysia) =>
  app
    .use(authGuard)
    .guard({ role: "admin" })
    .get("/admin/users", handleAdminUsers)
    .get("/admin/stats", handleAdminStats);

const apiPlugin = (app: Elysia) =>
  app
    .group("/api/v1", (app) =>
      app
        .use(adminPlugin)
        .get("/users", handleUsers)
        .post("/users", createUser),
    );

const app = new Elysia().use(apiPlugin);
```

## State and Decorators

### State Management
```typescript
app
  .state("db", createConnection())       // Mutable state
  .state("config", {                     // Immutable config
    appName: "MyApp",
    version: "1.0.0",
  })
  .get("/status", ({ store }) => ({
    app: store.config.appName,
    db: store.db.isConnected,
  }));
```

### Decorators
```typescript
import { Elysia, t } from "elysia";

export const dbPlugin = (app: Elysia) =>
  app.decorate("db", {
    findUser: async (id: string) => User.findById(id),
    createUser: async (data: CreateUserDto) => User.create(data),
  });

// Usage
app.get("/users/:id", async ({ db, params }) => {
  return db.findUser(params.id);
});
```

## Testing Plugins

### Unit Test
```typescript
import { describe, expect, it } from "bun:test";
import { Elysia } from "elysia";
import { authGuard } from "./plugins/auth-guard";

describe("authGuard", () => {
  it("rejects request without token", async () => {
    const app = new Elysia()
      .use(authGuard)
      .get("/test", () => "ok");

    const response = await app.handle(
      new Request("http://localhost/test")
    );
    expect(response.status).toBe(401);
  });

  it("accepts request with valid token", async () => {
    const token = await generateTestToken();
    const app = new Elysia()
      .use(authGuard)
      .get("/test", () => "ok");

    const response = await app.handle(
      new Request("http://localhost/test", {
        headers: { Authorization: `Bearer ${token}` },
      })
    );
    expect(response.status).toBe(200);
  });
});
```

## Key Points
- Plugins encapsulate reusable functionality via the `.use()` pattern
- Lifecycle hooks (onRequest, derive, resolve, onResponse, onError) control execution flow
- Built-in plugins: static files, CORS, JWT, Swagger, rate limiting
- Custom plugins can add state, decorators, and hooks
- Guards scope middleware to route groups
- Plugin composition chains multiple plugins together
- Decorators inject services into request context
- Test plugins by creating an Elysia app with the plugin and sending test requests
