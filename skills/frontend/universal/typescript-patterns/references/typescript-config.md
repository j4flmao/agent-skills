# TypeScript Configuration

## Recommended tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "coverage"]
}
```

## Strict Mode Breakdown

| Option | Purpose | Effect |
|--------|---------|--------|
| `strict: true` | Enables all strict checks | Catches most common errors |
| `noUncheckedIndexedAccess` | `arr[i]` is `T \| undefined` | Prevents index out of bounds |
| `exactOptionalPropertyTypes` | `prop?: string` doesn't accept `undefined` explicitly | Stricter optional handling |
| `noUnusedLocals` | Error on unused variables | Cleaner code |
| `noUnusedParameters` | Error on unused params (prefix with `_` to suppress) | Cleaner code |
| `noImplicitReturns` | All paths must return | Prevents accidental undefined |
| `noFallthroughCasesInSwitch` | Switch without break = error | Prevents fallthrough bugs |
| `strictNullChecks` | `null` and `undefined` are distinct | Prevents null reference errors |

## Path Aliases

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@features/*": ["./src/features/*"],
      "@lib/*": ["./src/lib/*"],
      "@types/*": ["./src/types/*"]
    }
  }
}
```

```typescript
// Also configure in bundler
// vite.config.ts
resolve: {
  alias: { '@': path.resolve(__dirname, 'src') },
}

// webpack.config.js
resolve: {
  alias: { '@': path.resolve(__dirname, 'src') },
}
```

## Module Resolution Strategies

| Strategy | Use Case | Example |
|----------|----------|---------|
| `bundler` | Vite, Webpack, modern bundlers | `moduleResolution: "bundler"` |
| `node16` | Node.js ESM | `moduleResolution: "node16"` |
| `nodenext` | Latest Node.js | `moduleResolution: "nodenext"` |
| `classic` | Legacy (avoid) | Only for very old projects |

## Type Declarations

```typescript
// Global type declarations (src/types/global.d.ts)
declare global {
  interface Window {
    __INITIAL_DATA__: Record<string, unknown>
    gtag: (...args: unknown[]) => void
  }

  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      VITE_API_URL: string
      VITE_SENTRY_DSN: string
    }
  }
}

export {}
```

## Type Export Patterns

```typescript
// Barrel exports — prefer named exports
// types/index.ts
export type { User, CreateUserDTO, UpdateUserDTO } from './user'
export type { Order, OrderStatus } from './order'
export type { ApiResponse, PaginatedResponse } from './api'

// Inline type exports
export interface ButtonProps {
  variant: 'primary' | 'secondary'
  size: 'sm' | 'md' | 'lg'
}

// Re-export types
export type { Props as ButtonProps } from './Button'
```

## Incremental Build

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

Caches type-checking results. Subsequent builds only check changed files. Can reduce type-check time by 50-80%.

## TypeScript + ESLint

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "rules": {
    "@typescript-eslint/no-unnecessary-condition": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }]
  }
}
```

## Configuration Checklist

- [ ] `strict: true` enabled
- [ ] `noUncheckedIndexedAccess` enabled
- [ ] `noUnusedLocals` and `noUnusedParameters` enabled
- [ ] Path aliases configured (matching bundler config)
- [ ] `moduleResolution: "bundler"` for modern bundlers
- [ ] `isolatedModules: true` for bundler compatibility
- [ ] `skipLibCheck: true` for faster checks
- [ ] `tsBuildInfoFile` for incremental builds
- [ ] Type declarations for global variables
- [ ] ESLint configured for type-aware linting
- [ ] `exactOptionalPropertyTypes` enabled for strictness
- [ ] `forceConsistentCasingInFileNames` enabled
