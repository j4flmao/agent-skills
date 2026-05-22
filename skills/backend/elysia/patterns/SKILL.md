---
name: elysia-patterns
description: >
  Use this skill for ElysiaJS patterns — plugins, guards, decorators, macros,
  Eden Treaty, lifecycle hooks, error handling, validation, and auth patterns.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, elysia, phase-4]
---

# ElysiaJS Patterns

## Purpose
Implement production-grade ElysiaJS backends using plugins, guards, decorators, macros, lifecycle hooks, and Eden Treaty type-safe clients.

## Agent Protocol

### Trigger
User request includes: `elysia plugin`, `elysia guard`, `elysia macro`, `eden treaty`, `elysia decorator`, `elysia lifecycle`, `elysia error handling`, `elysia validation`, `elysia auth`.

### Input Context
- Elysia app instance
- Plugin architecture requirements
- Auth strategy (JWT, session, API key)
- Validation library (Elysia built-in, Zod)
- Client generation needs (Eden Treaty)

### Output Artifact
A markdown document containing: plugin setup, guard/decorator patterns, macro definitions, lifecycle hooks, Eden Treaty client, error handling, validation schemas, auth integration.

### Response Format
Produce the artifact directly. No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Max Response Length
4096 tokens

## Workflow

### Step 1: Plugin Architecture
Design plugin hierarchy. Register shared plugins (auth, logging, error handling) first. Then feature plugins (orders, users, products) with prefixes. Keep plugins scoped to avoid cross-plugin coupling. One plugin per concern.

### Step 2: Auth & Guard Setup
Register auth guard as scoped plugin with `derive`. Use JWT verification in `derive` to inject user context. Apply `as: 'scoped'` to limit guard to specific routes. Bypass for public routes (login, register, health). Never use `onBeforeHandle` for auth — `derive` is lazy, `onBeforeHandle` always runs.

### Step 3: Define Decorators & Macros
Use `decorator` to attach shared utilities (logger, metrics, email service) to app context. Use `macro` for custom route-level behavior — rate limiting, role checks, validation overrides. Macros run at build time, not runtime. Keep macro handlers pure.

### Step 4: Implement Lifecycle Hooks
Use `onBeforeHandle` for pre-route checks (rate limiting, role verification). Use `onAfterHandle` for response transformation (wrapping, logging). Use `onError` for centralized error handling — map errors to proper status codes, strip stack traces in production. Use `onRequest`/`onResponse` for telemetry.

### Step 5: Validation & Error Handling
Define schemas with Elysia's `t` or Zod. Attach at route or plugin level. Centralize error handling in `onError` — map known errors to proper HTTP status codes. Keep stack traces out of production responses. Use typed errors for client-friendly error messages.

### Step 6: Eden Treaty Client
Generate Eden Treaty client from server types. Share types via dedicated package or monorepo workspace. Configure base URL, auth header injection, request/response interceptors. Eden Treaty gives full-stack type safety without codegen tools.

### Step 7: Eden Treaty Client Patterns
Generate typed Eden Treaty client from server instance. Export `app` type with `App` type inference. Create separate client module that imports `EdenTreaty` from `@elysiajs/eden-treaty`. Configure base URL per environment. Inject auth headers via `onRequest` interceptor. Use `$get`, `$post`, `$put`, `$delete` for type-safe calls. Handle errors with `try/catch` matching server error types. Share types between server and client via monorepo workspace or dedicated package. Never duplicate type definitions — Eden Treaty's power is single-source type safety.

### Step 8: Deployment Patterns
Build for production with `bun build --target bun --outdir ./dist`. Set `NODE_ENV=production` to strip dev routes. Use `Bun.serve({ fetch: app.fetch })` for custom server entry. Containerize with multi-stage Dockerfile: build stage copies source and runs build, production stage copies only dist and runs with non-root user. Configure health checks on `/health` endpoint — must verify DB connectivity, not just return 200. Use PM2 or systemd process manager for process resurrection. Set `maxRequestBodySize` for file uploads. Enable compression with `@elysiajs/compression`. Use `@elysiajs/cors` with explicit origin list — never allow all origins in production. Add rate limiting with `@elysiajs/rate-limit` at the proxy level. Configure graceful shutdown with `process.on('SIGTERM')` to drain connections.

### Step 9: Testing Patterns
Test plugins in isolation with `Elysia({ prefix: '/test' }).use(plugin)`. Use `app.handle(req)` for integration tests — returns `Response` object. Mock external services with `@sinonjs/fake-timers` or `mockttp`. Test guards by sending requests without valid auth — expect 401. Test macros by defining inline routes with macro options. Use `afterAll` to close app and clean up. Write per-plugin test files in `__tests__` directory. Aim for 90%+ coverage on plugin handlers, guards, and error middleware. Run tests in parallel per plugin group. Generate coverage reports with `bun test --coverage`. Test Eden Treaty client against a mock server to verify type safety end-to-end.

### Step 10: Performance Optimization
Profile routes with `@elysiajs/opentelemetry` for tracing. Use `bun run build --minify` for production bundles. Enable HTTP/2 for multiplexing. Use connection pooling for database clients. Cache repeated computations with `t.transform` at schema level. Avoid `onBeforeHandle` for heavy operations — prefer lazy evaluation with `derive`. Stream large responses with `Response` body streams instead of buffering. Use ETags for cache validation on GET endpoints. Monitor response times per plugin and set SLOs.

### Step 11: WebSocket Patterns
Register WebSocket routes with `app.ws('/ws', handler)`. Use `ws:open` for connection tracking, `ws:message` for message routing, `ws:close` for cleanup. Scope WebSocket handlers to authenticated users via `derive` context. Implement heartbeat with `ws:ping`/`ws:pong` to detect stale connections. Broadcast messages with room-based pub/sub pattern. Handle reconnection on client side with exponential backoff. Rate-limit messages per connection to prevent abuse.

### Step 12: Logging & Observability
Use `@elysiajs/opentelemetry` for distributed tracing across plugins. Attach correlation IDs with `onRequest` using `crypto.randomUUID()`. Log structured JSON with `pino` or `bunyan` — never `console.log`. Export metrics to Prometheus via `@elysiajs/swagger` with custom metric endpoints. Set up `onError` to log error context (path, method, user ID) without leaking sensitive data. Use log levels: `error` for failures, `warn` for degraded paths, `info` for lifecycle events, `debug` for development.

## Rules

1. Plugins must be scoped with `as: 'scoped'` — never expose internal state globally.
2. Guards run in `derive` — never in `onBeforeHandle` for auth checks (`derive` is lazy, `onBeforeHandle` always executes).
3. Validate all input at route boundary — never trust parsed body/params/queries without schema.
4. Use `onError` for centralized error handling — never try/catch in individual route handlers.
5. Macros are compile-time — avoid runtime state in macro handler closures.
6. Eden Treaty client must match server types exactly — share types via common package.
7. Lifecycle hooks must remain synchronous-or-promise — never block event loop.
8. Disable `DetailedHTMLResponse` in production — response body may leak error details.
9. Eden Treaty client must use `as const` on server app — without it, type inference breaks for route paths.
10. Never expose `app.fetch` directly in production — always wrap with `Bun.serve` or adapter for request lifecycle management.
11. Plugin prefixes must be unique — two plugins sharing the same prefix cause silent route overwrites.
12. Use `t.Object` for request body validation — `t.Object` gives exact type narrowing while plain `object` allows excess properties.
13. Test every guard with both authenticated and unauthenticated requests — guards are the most commonly broken pattern in refactors.
14. Deployment health checks must hit a route that tests DB connectivity, not just returns 200 — surface real readiness.
15. WebSocket connections must have a max lifetime and message cap per session — never allow unbounded WebSocket resources.
16. Use `onRequest` for logging and `onResponse` for metrics — never log in individual route handlers.
17. Rate limiting must be applied at the router level, not per-route — use `@elysiajs/rate-limit` globally.
18. WebSocket message handlers must validate input just like HTTP routes — never trust WebSocket message payloads without schema validation.
19. All plugin options must have defaults — never require consumers to pass every config parameter.

## Monitoring

Track these metrics per plugin: request count, p50/p95/p99 latency, error rate by status code, active WebSocket connections, auth failure rate. Export via OpenTelemetry to your observability backend. Alert on p99 latency > 500ms, error rate > 1%, WebSocket connection leak > 10% above baseline. Set up `onResponse` hook to record duration and status code for every request.

## References
- `references/eden-treaty.md` — Eden Treaty client setup and patterns
- `references/elysia-performance.md` — Elysia performance optimization

## Handoff
Hand off to `backend/universal/api-design/SKILL.md` for REST API design patterns. Carry forward: plugin hierarchy, guard scopes, Eden Treaty type definitions.
