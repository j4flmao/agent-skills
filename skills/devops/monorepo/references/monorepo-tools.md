# Monorepo Tools

## Tool Comparison

| Feature | Nx | Turborepo | Lerna |
|---------|----|-----------|-------|
| Build orchestration | ✅ | ✅ | ❌ (legacy) |
| Task caching | ✅ | ✅ | ❌ |
| Distributed caching | Nx Cloud | Remote Cache API | ❌ |
| Dependency graph | ✅ | ✅ (via `turbo.json`) | ❌ |
| Affected commands | ✅ | ✅ (via `--filter`) | ❌ |
| Generators | ✅ | ❌ | ❌ |
| Module boundaries | ✅ | ❌ | ❌ |
| Code migration | ✅ | ❌ | ❌ |
| Executors | ✅ | ❌ | ❌ |
| CI integration | ✅ | ✅ | ❌ |
| Multi-language | ✅ | ❌ (primarily JS) | ✅ |

## Choosing the Right Tool

**Choose Nx when:**
- You need module boundary enforcement
- You want generators and code scaffolding
- Your project spans multiple languages (JS, Go, Rust, Python)
- You need advanced CI optimization with affected commands

**Choose Turborepo when:**
- You want the simplest possible setup
- Your stack is JS/TS only
- You prefer Vercel ecosystem integration
- You need remote caching without complexity

**Choose both when:**
- Migration path: start with Turborepo, move to Nx for advanced needs
- Nx can wrap Turborepo projects

## Workspace Managers

| Manager | Key file | Features |
|---------|----------|----------|
| pnpm | `pnpm-workspace.yaml` | Fast, strict, content-addressable store |
| yarn | `package.json` workspaces | Berry v4 with PnP support |
| npm | `package.json` workspaces | Built-in, slow for large repos |

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
  - "libs/*"
```

```json
// Root package.json workspaces
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

## Best Practices

- One root `package.json` with shared devDependencies
- Hoist common dependencies to root when possible (pnpm: `shamefully-hoist`)
- Use exact versions for shared internal packages
- Keep `tsconfig.base.json` in root — extend in each package
- Root-level ESLint, Prettier, and TypeScript configs
- Use `.npmrc` / `.pnpmrc` for consistent install behavior
- Pin package manager version with `packageManager` field
- Use `pnpm` for fastest installs in large monorepos

## Project Structure

```
my-org/
├── apps/
│   ├── web/            # Next.js app
│   ├── api/            # Express/Fastify API
│   ├── mobile/         # React Native app
│   └── docs/           # Documentation site
├── packages/
│   ├── shared-ui/      # React component library
│   ├── shared-utils/   # Utility functions
│   ├── eslint-config/  # Shared ESLint config
│   └── tsconfig/       # Shared TS base config
├── libs/
│   ├── data-access/    # API client libraries
│   └── feature-flags/  # Feature flag SDK
├── tools/
│   ├── scripts/        # Build scripts
│   └── generators/     # Custom generators
├── nx.json
├── turbo.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .eslintrc.js
└── .prettierrc
```

## Remote Caching

| Service | Nx | Turborepo |
|---------|----|-----------|
| Nx Cloud | ✅ native | ❌ |
| Vercel Remote Cache | ❌ | ✅ native |
| Self-hosted | ✅ (Nx Cloud on-prem) | ✅ (remote-cache server) |
| GitHub Actions Cache | ✅ (community) | ✅ (community) |
