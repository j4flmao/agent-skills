# API Codegen Tools Comparison

## Overview

| Tool | Language | Input | Output | Approach |
|------|----------|-------|--------|----------|
| OpenAPI Generator | Multi (50+) | OpenAPI 2/3 | SDK clients, server stubs | Template-based (Mustache) |
| fern | TypeScript, Python, Go, Java | OpenAPI 3.1 | Type-safe SDK clients | IR generation + codegen |
| orval | TypeScript | OpenAPI 3 | React hooks, axios/fetch | TypeScript-first codegen |
| zodios | TypeScript | OpenAPI 3 | Zod schemas + fetch client | Runtime validation |
| kiota | Multi (7) | OpenAPI 3 | SDK clients | Microsoft-authored, fluent APIs |
| tRPC | TypeScript | TypeScript types | End-to-end typesafe RPC | No codegen — type sharing |

## OpenAPI Generator

```bash
# Install
npm install @openapitools/openapi-generator-cli -g

# Generate TypeScript fetch client
openapi-generator-cli generate -i spec.yaml -g typescript-fetch -o src/gen

# Generate Python client
openapi-generator-cli generate -i spec.yaml -g python -o src/gen
```

**Strengths:** Broadest language support, active community, supports both 2.0 and 3.x
**Weaknesses:** Generated code can be verbose and includes historical decisions, template customization requires Mustache expertise, slow for large specs

**Generator groups:**
- `typescript-fetch` — native fetch, no dependencies
- `typescript-axios` — axios-based, interceptors
- `typescript-angular` — Angular HttpClient, RxJS Observables
- `python` — requests-based with model classes
- `rust` — reqwest-based with serde

## fern

```bash
# Install
npm install -g fern-api

# Generate SDK
fern generate --group sdk

# Output structure
fern/
  sdks/
    typescript/
    python/
    go/
```

**Strengths:** Clean idiomatic output, supports custom snippets, endpoint-level overrides, built-in publishing to registries (npm, PyPI, Maven)
**Weaknesses:** Newer tool with smaller ecosystem, requires fern configuration directory in the repo, opinionated project structure

## orval

```bash
# Install
npm install orval -D

# orval.config.ts
export default {
  petstore: {
    input: './petstore.yaml',
    output: {
      target: './src/gen',
      client: 'react-query',
      schemas: './src/gen/model',
    },
  },
}
```

**Strengths:** Excellent React/Query integration, generates hooks (useQuery, useMutation), supports React Query, SWR, Axios, and bare fetch, tree-shakeable output
**Weaknesses:** TypeScript only, React-centric (vanilla JS users benefit less)

## zodios

```bash
# Install
npm install @zodios/core @zodios/plugin

# Define API
const api = z.api({
  getUser: {
    method: 'get',
    path: '/users/:id',
    parameters: z.object({ id: z.number() }),
    response: UserSchema,
  },
})
```

**Strengths:** Runtime validation, automatic type inference, no codegen build step, excellent DX with IDE autocomplete
**Weaknesses:** Manual schema definition (no OpenAPI import), TypeScript only, small ecosystem

## kiota

```bash
# Install
dotnet tool install --global Microsoft.OpenApi.Kiota

# Generate
kiota generate -l TypeScript -d spec.yaml -o src/gen
```

**Strengths:** Microsoft-maintained, fluent request builders, middleware pipeline, supports authentication providers
**Weaknesses:** .NET runtime required, verbose output, limited language support

## tRPC

```typescript
// Define once on server
export const appRouter = router({
  user: {
    list: publicProcedure.query(() => db.user.findMany()),
    byId: publicProcedure.input(z.string()).query(({ input }) => db.user.findById(input)),
  },
})

// Use on client — zero codegen
const users = await trpc.user.list.query()
```

**Strengths:** No codegen step, no runtime validation duplication, true end-to-end type safety, best DX
**Weaknesses:** Server and client must both use tRPC, not suitable for public REST APIs, TypeScript only

## Selection Criteria

| Criterion | Recommendation |
|-----------|---------------|
| Public REST API, multi-language SDKs | OpenAPI Generator or fern |
| TypeScript monorepo, React frontend | orval |
| Need runtime validation + types | zodios |
| End-to-end TypeScript, internal service | tRPC |
| Microsoft ecosystem (.NET + TS) | kiota |
| Publishing SDKs to package registries | fern |

## Hybrid Strategy

Many teams combine tools:

```yaml
# OpenAPI spec as source of truth
spec: openapi.yaml

# Generated clients per need
# - fern: Published Python/Go SDKs for external consumers
# - orval: React hooks for frontend
# - OpenAPI Generator: Java SDK for Android
```

## Codegen Integration Checklist

- [ ] Codegen runs in CI, committed or cached
- [ ] Custom templates or overrides version-controlled
- [ ] Spec validation before generation (lint OpenAPI)
- [ ] Breaking changes detected in spec diff
- [ ] Generated code excluded from linting/formatting
- [ ] Dependencies pinned to exact generator versions
