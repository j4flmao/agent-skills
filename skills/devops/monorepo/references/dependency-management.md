# Dependency Management

## Workspace Dependency References

```json
// packages/shared-ui/package.json
{
  "name": "@org/shared-ui",
  "version": "0.0.1",
  "dependencies": {
    "@org/shared-utils": "workspace:*",   // pnpm workspace protocol
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@org/tsconfig": "workspace:*",
    "@org/eslint-config": "workspace:*"
  }
}
```

## Versioning Strategies

### Synchronized (all packages same version)
```json
// Root using @changesets/cli or lerna
{
  "version": "1.2.5",
  "private": true
}
```

### Independent (per-package versioning)
```json
// changeset config
{
  "___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH": {
    "onlyUpdatePeerDependentsWhenOutOfRange": true
  }
}
```

## Publishing Workflow

```bash
# Using changesets
pnpm add -D @changesets/cli
pnpm changeset init

# Create changeset
pnpm changeset

# Version packages
pnpm changeset version

# Publish to npm
pnpm changeset publish
pnpm publish -r --access public
```

## Dependency Hoisting

```bash
# pnpm — strict by default, no hoisting
# .npmrc
shamefully-hoist=true    # Hoist all deps to root
node-linker=hoisted      # Traditional node_modules layout
public-hoist-pattern[]=*types*
```

## Lockfile Management

```bash
# pnpm
pnpm install --frozen-lockfile  # CI, exact
pnpm install --lockfile-only    # Regenerate lockfile
pnpm dedupe                     # Deduplicate dependencies

# Detect drift
pnpm install --frozen-lockfile || echo "Lockfile out of date"
```

## Internal Package Dependencies

```json
{
  "dependencies": {
    "@org/utils": "workspace:*",        // Always latest in workspace
    "@org/core": "workspace:^1.2.3",    // Minimum version constraint
    "@org/legacy": "workspace:1.0.0"    // Exact version
  }
}
```

## Dependency Graph Validation

```bash
# Check circular dependencies
npx madge --circular --extensions ts,tsx apps/web/src/

# Nx dependency constraints
nx lint

# Visualize graph
nx graph
nx graph --focus=shared-ui
```

## Audit and Upgrade

```bash
# Check for outdated packages
pnpm outdated
pnpm outdated -r  # Recursive

# Update all
pnpm update -r
pnpm update -r --latest

# Deduplicate
pnpm dedupe

# Check for vulnerabilities
pnpm audit
pnpm audit --fix
```

## Monorepo Dependency Rules

- All packages must use `workspace:*` for internal dependencies
- No circular dependencies — enforce with tooling
- Shared devDependencies in root, package-specific in packages
- TypeScript project references for incremental type-checking
- Keep react, next, and other framework versions synchronized
- Use exact versions for internal packages, semver ranges for external
