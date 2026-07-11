# Convention and Constraint Files Reference

## Overview

Convention and constraint files are machine-readable configuration files that implicitly
guide AI agent behavior by encoding project standards, formatting rules, and quality
requirements. Unlike explicit instructions (AGENTS.md), these files are enforced by
tooling, making them the most reliable form of agent guidance.

---

## 1. The Convention-Constraint Spectrum

```
┌───────────────────────────────────────────────────────────────────────┐
│ Soft Convention ◄─────────────────────────────────────► Hard Constraint│
│                                                                       │
│ .editorconfig    .prettierrc    .eslintrc    tsconfig    CI/CD checks │
│ (formatting      (style         (linting     (type       (build gate) │
│  hints)           rules)         rules)       safety)                 │
│                                                                       │
│ "should follow"  "auto-fixed"   "must pass"  "won't     "cannot      │
│                                               compile"   merge"       │
└───────────────────────────────────────────────────────────────────────┘
```

### 1.1 Why Convention Files Matter for Agents

AI agents read configuration files to understand:

1. **Code formatting expectations** — How to indent, quote, and structure code
2. **Quality thresholds** — What rules must pass for code to be accepted
3. **Type safety requirements** — How strict the type system is configured
4. **Project boundaries** — What imports are allowed, what patterns are banned
5. **Tool configurations** — Which tools to use and how to invoke them

### 1.2 File Discovery Order

```
Agent file discovery:
1. package.json (scripts, engines, config references)
2. tsconfig.json / jsconfig.json (TypeScript/JS config)
3. .editorconfig (universal formatting)
4. .prettierrc* (code formatting)
5. .eslintrc* / eslint.config.* (linting rules)
6. .stylelintrc* (CSS linting)
7. CONTRIBUTING.md (contribution guidelines)
8. .github/PULL_REQUEST_TEMPLATE.md (PR format)
```

---

## 2. EditorConfig (`.editorconfig`)

### 2.1 Purpose

EditorConfig provides universal formatting rules that every editor and AI agent should
respect. It's the lowest common denominator for code formatting.

### 2.2 Comprehensive Configuration

```ini
# .editorconfig
# https://editorconfig.org

# Top-most EditorConfig file
root = true

# Default settings for all files
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2
max_line_length = 100

# TypeScript and JavaScript
[*.{ts,tsx,js,jsx,mjs,cjs}]
indent_size = 2
max_line_length = 100

# JSON files
[*.json]
indent_size = 2
insert_final_newline = true

# YAML files
[*.{yml,yaml}]
indent_size = 2

# Python files
[*.py]
indent_size = 4
max_line_length = 88

# Go files
[*.go]
indent_style = tab
indent_size = 4

# Rust files
[*.rs]
indent_size = 4
max_line_length = 100

# Markdown
[*.md]
trim_trailing_whitespace = false
max_line_length = 80

# Makefiles (must use tabs)
[Makefile]
indent_style = tab

# Shell scripts
[*.sh]
indent_size = 2
end_of_line = lf

# Windows batch files
[*.{bat,cmd}]
end_of_line = crlf

# Docker
[Dockerfile*]
indent_size = 4

# Prisma
[*.prisma]
indent_size = 2

# GraphQL
[*.{graphql,gql}]
indent_size = 2

# Configuration files
[.{eslintrc,prettierrc,stylelintrc}]
indent_size = 2

# Lock files — do not modify
[{pnpm-lock.yaml,package-lock.json,yarn.lock}]
indent_size = 2
insert_final_newline = false
```

### 2.3 Agent Interpretation Rules

```
┌──────────────────────────────────────────────────────────────┐
│ EditorConfig Property     │ Agent Behavior                   │
├──────────────────────────────────────────────────────────────┤
│ indent_style = space      │ Use spaces for indentation       │
│ indent_size = 2           │ Use 2 spaces per indent level    │
│ end_of_line = lf          │ Use Unix line endings            │
│ charset = utf-8           │ Save files as UTF-8              │
│ trim_trailing_whitespace  │ Remove trailing spaces           │
│ insert_final_newline      │ Ensure file ends with newline    │
│ max_line_length = 100     │ Wrap lines at 100 characters     │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Prettier (`.prettierrc`)

### 3.1 Purpose

Prettier enforces opinionated code formatting. When an agent generates code, it should
conform to the project's Prettier configuration to avoid unnecessary diff noise.

### 3.2 Comprehensive Configuration

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "quoteProps": "as-needed",
  "jsxSingleQuote": false,
  "proseWrap": "preserve",
  "htmlWhitespaceSensitivity": "css",
  "embeddedLanguageFormatting": "auto",
  "singleAttributePerLine": false,
  "plugins": [
    "prettier-plugin-tailwindcss",
    "prettier-plugin-organize-imports",
    "prettier-plugin-prisma"
  ],
  "overrides": [
    {
      "files": "*.json",
      "options": {
        "printWidth": 80,
        "trailingComma": "none"
      }
    },
    {
      "files": "*.md",
      "options": {
        "proseWrap": "always",
        "printWidth": 80
      }
    },
    {
      "files": ["*.yml", "*.yaml"],
      "options": {
        "singleQuote": false,
        "printWidth": 120
      }
    }
  ]
}
```

### 3.3 Prettier Ignore

```
# .prettierignore
# Dependencies
node_modules/

# Build outputs
.next/
dist/
build/
out/

# Generated files
__generated__/
*.generated.ts
prisma/migrations/

# Lock files
pnpm-lock.yaml
package-lock.json
yarn.lock

# Coverage
coverage/

# Environment
.env*

# Assets
*.svg
*.png
*.jpg
*.gif
*.ico
*.woff
*.woff2
```

### 3.4 Agent Behavior with Prettier

```
When generating code, agents should:

1. READ .prettierrc to understand formatting expectations
2. APPLY formatting rules during code generation
3. RUN `pnpm format` or `npx prettier --write <file>` after generation
4. NEVER fight Prettier — adapt code to its rules

Key agent decisions affected by Prettier:
┌──────────────────────────────────────────────────────────────┐
│ Prettier Rule          │ Agent Must                          │
├──────────────────────────────────────────────────────────────┤
│ singleQuote: true      │ Use 'string' not "string"          │
│ semi: true             │ Always add semicolons               │
│ trailingComma: "all"   │ Add trailing commas everywhere      │
│ printWidth: 100        │ Break lines at 100 chars            │
│ arrowParens: "always"  │ Use (x) => not x =>                 │
│ bracketSpacing: true   │ Use { key } not {key}               │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. ESLint Configuration

### 4.1 Flat Config Format (ESLint 9+)

```typescript
// eslint.config.ts
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import a11yPlugin from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  // Base JS rules
  eslint.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Global settings
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Custom rules for all files
  {
    rules: {
      // === Type Safety ===
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

      // === Code Quality ===
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',

      // === Import Rules ===
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
      'import/no-duplicates': 'error',
      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      'import/no-default-export': 'error',

      // === Naming Conventions ===
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
      ],
    },
  },

  // React-specific rules
  {
    files: ['**/*.tsx'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'jsx-a11y': a11yPlugin,
    },
    rules: {
      'react/jsx-no-target-blank': 'error',
      'react/no-danger': 'error',
      'react/no-array-index-key': 'warn',
      'react/self-closing-comp': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-autofocus': 'warn',
      'import/no-default-export': 'off', // Next.js pages need default exports
    },
  },

  // Test file rules
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'no-console': 'off',
    },
  },

  // Ignored paths
  {
    ignores: [
      'node_modules/',
      '.next/',
      'dist/',
      'coverage/',
      '__generated__/',
      '*.config.{js,mjs,cjs}',
    ],
  },
);
```

### 4.2 Legacy Config Format

```json
// .eslintrc.json (legacy format, ESLint < 9)
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json",
    "ecmaVersion": 2024,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "env": {
    "browser": true,
    "node": true,
    "es2024": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier"
  ],
  "plugins": [
    "@typescript-eslint",
    "react",
    "react-hooks",
    "jsx-a11y",
    "import"
  ],
  "settings": {
    "react": {
      "version": "detect"
    },
    "import/resolver": {
      "typescript": {
        "alwaysTryTypes": true,
        "project": "./tsconfig.json"
      }
    }
  },
  "rules": {
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "no-eval": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "import/no-default-export": "error",
    "import/order": [
      "error",
      {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "type"],
        "newlines-between": "always"
      }
    ]
  },
  "overrides": [
    {
      "files": ["src/app/**/page.tsx", "src/app/**/layout.tsx"],
      "rules": {
        "import/no-default-export": "off"
      }
    },
    {
      "files": ["**/*.test.ts", "**/*.test.tsx"],
      "rules": {
        "@typescript-eslint/no-explicit-any": "off",
        "no-console": "off"
      }
    }
  ]
}
```

### 4.3 Custom ESLint Rules for Agent Guidance

```typescript
// eslint-plugin-project/rules/no-raw-sql.ts
import { ESLintUtils } from '@typescript-eslint/utils';

export const noRawSQL = ESLintUtils.RuleCreator.withoutDocs({
  meta: {
    type: 'problem',
    messages: {
      noRawSQL:
        'Raw SQL is not allowed. Use Prisma ORM for all database queries. ' +
        'See: docs/adr/0003-prisma.md',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      // Detect prisma.$queryRaw and prisma.$executeRaw
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          ['$queryRaw', '$executeRaw', '$queryRawUnsafe', '$executeRawUnsafe'].includes(
            node.callee.property.name,
          )
        ) {
          context.report({ node, messageId: 'noRawSQL' });
        }
      },
      // Detect template literals that look like SQL
      TemplateLiteral(node) {
        const fullText = context.getSourceCode().getText(node);
        if (/\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b/i.test(fullText)) {
          context.report({ node, messageId: 'noRawSQL' });
        }
      },
    };
  },
});
```

---

## 5. TypeScript Configuration

### 5.1 Strict TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    // === Strictness ===
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,

    // === Module Resolution ===
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "allowImportingTsExtensions": false,

    // === Output ===
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",

    // === Path Aliases ===
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"],
      "@/hooks/*": ["./src/hooks/*"]
    },

    // === JSX ===
    "jsx": "react-jsx",

    // === Libraries ===
    "lib": ["ES2022", "DOM", "DOM.Iterable"],

    // === Skip ===
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist", "coverage", "**/*.test.ts"]
}
```

### 5.2 Agent-Relevant TypeScript Options

```
┌──────────────────────────────────────────────────────────────────┐
│ Option                          │ Agent Impact                   │
├──────────────────────────────────────────────────────────────────┤
│ strict: true                    │ Must type everything properly  │
│ noUncheckedIndexedAccess: true  │ Array/object access may be     │
│                                 │ undefined, must check          │
│ exactOptionalPropertyTypes      │ Optional ≠ undefined, must     │
│                                 │ omit property entirely         │
│ noImplicitOverride              │ Must use `override` keyword    │
│ verbatimModuleSyntax            │ Must use `import type` for     │
│                                 │ type-only imports              │
│ paths                           │ Use @/ aliases for imports     │
│ noFallthroughCasesInSwitch      │ Must break/return in switch    │
│ noPropertyAccessFromIndexSig    │ Use bracket notation for       │
│                                 │ index signatures               │
└──────────────────────────────────────────────────────────────────┘
```

### 5.3 Monorepo TypeScript Configuration

```json
// tsconfig.base.json (root)
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "verbatimModuleSyntax": true
  }
}
```

```json
// apps/web/tsconfig.json (extends base)
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [
      { "name": "next" }
    ],
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "next-env.d.ts"],
  "exclude": ["node_modules", ".next", "dist"]
}
```

---

## 6. CONTRIBUTING.md as Agent Constraints

### 6.1 Agent-Optimized Contributing Guide

```markdown
# Contributing Guide

## Quick Reference for AI Agents

> This section contains machine-parseable contribution rules.

### Code Submission Checklist
- [ ] TypeScript strict mode — no type errors
- [ ] All tests passing — `pnpm test`
- [ ] Lint clean — `pnpm lint`
- [ ] Format applied — `pnpm format`
- [ ] No console.log statements
- [ ] All new functions have JSDoc comments
- [ ] Test coverage ≥ 80% for new code
- [ ] PR description follows template

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build
Scope: auth, api, ui, db, config, deps

Examples:
```
feat(auth): add multi-factor authentication support
fix(api): handle race condition in concurrent requests
docs(readme): update installation instructions
refactor(ui): extract shared button component
```

### Branch Naming
```
feat/short-description
fix/issue-number-description
docs/what-is-documented
refactor/what-is-refactored
chore/what-maintenance
```

### Pull Request Requirements
1. Title follows commit message format
2. Description includes:
   - What changed and why
   - How to test the changes
   - Screenshots for UI changes
   - Breaking changes noted
3. All CI checks passing
4. At least one approval from code owner
5. No merge conflicts with main

### File Organization Rules
- Components: `src/components/{ComponentName}/{ComponentName}.tsx`
- Tests: `src/components/{ComponentName}/{ComponentName}.test.tsx`
- Hooks: `src/hooks/use{HookName}.ts`
- Utils: `src/lib/{utilName}.ts`
- Types: `src/types/{TypeName}.ts`
- API Routes: `src/app/api/{resource}/route.ts`

### Prohibited Patterns
1. ❌ Default exports (except Next.js pages/layouts)
2. ❌ `any` type without justification comment
3. ❌ Inline ESLint disable comments
4. ❌ Direct DOM manipulation
5. ❌ Synchronous I/O in server code
6. ❌ Hardcoded strings (use i18n keys)
7. ❌ CSS-in-JS (use Tailwind)
8. ❌ Class components
9. ❌ Barrel files (index.ts re-exports)
10. ❌ Circular dependencies
```

---

## 7. Style Guide Files

### 7.1 Project Style Guide as Agent Instructions

```markdown
<!-- docs/style-guide.md -->
# Code Style Guide

## TypeScript Patterns

### Result Type (prefer over exceptions)
```typescript
// ✅ Good — explicit error handling
async function getUser(id: string): Promise<Result<User, NotFoundError>> {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) return err(new NotFoundError(`User ${id} not found`));
  return ok(user);
}

// ❌ Bad — throwing exceptions for expected cases
async function getUser(id: string): Promise<User> {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found');
  return user;
}
```

### Discriminated Unions (for state management)
```typescript
// ✅ Good — exhaustive pattern matching
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function renderState<T>(state: AsyncState<T>) {
  switch (state.status) {
    case 'idle': return null;
    case 'loading': return <Spinner />;
    case 'success': return <Data data={state.data} />;
    case 'error': return <ErrorDisplay error={state.error} />;
  }
}
```

### Branded Types (for type-safe IDs)
```typescript
// ✅ Good — prevents mixing IDs
type UserId = string & { readonly __brand: unique symbol };
type OrderId = string & { readonly __brand: unique symbol };

function createUserId(id: string): UserId {
  return id as UserId;
}

// Won't compile: Type 'UserId' is not assignable to 'OrderId'
function getOrder(orderId: OrderId): Promise<Order> { ... }
getOrder(createUserId('123')); // ❌ Type error!
```

### Const Assertions (for literal types)
```typescript
// ✅ Good — type-safe constants
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE'] as const;
type HttpMethod = (typeof HTTP_METHODS)[number]; // 'GET' | 'POST' | 'PUT' | 'DELETE'

const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;
type StatusCode = (typeof STATUS_CODES)[keyof typeof STATUS_CODES];
```

## React Patterns

### Component Structure
```typescript
// ✅ Recommended component structure
import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

// 1. Props interface (always exported)
export interface CardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'outlined' | 'elevated';
}

// 2. Component function (named export)
export function Card({
  title,
  description,
  children,
  className,
  variant = 'default',
}: CardProps): ReactNode {
  return (
    <div className={cn('rounded-lg p-4', variantStyles[variant], className)}>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-sm text-gray-500">{description}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

// 3. Variant map (below component)
const variantStyles = {
  default: 'bg-white border',
  outlined: 'border-2 border-gray-300',
  elevated: 'bg-white shadow-lg',
} as const;
```
```

---

## 8. Lint-Staged and Pre-Commit Hooks

### 8.1 Configuration

```json
// package.json (partial)
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "*.{json,yaml,yml}": [
      "prettier --write"
    ],
    "*.md": [
      "prettier --write"
    ],
    "*.prisma": [
      "prisma format"
    ]
  }
}
```

```yaml
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
npx tsc --noEmit
```

### 8.2 CI Configuration as Constraint

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Type Check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint --max-warnings 0

      - name: Format Check
        run: pnpm format:check

      - name: Test
        run: pnpm test -- --coverage

      - name: Coverage Threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

      - name: Build
        run: pnpm build
```

---

## 9. Cross-References

- For AGENTS.md patterns: `agents-md-design.md`
- For repository configurations: `repo-native-instructions.md`
- For structured documentation: `structured-documentation.md`
- For README optimization: `agent-optimized-readmes.md`
- For workspace configuration: `workspace-configuration.md`

<!-- Compression: Convention and constraint files reference covering .editorconfig,
     .prettierrc, ESLint (flat config and legacy), TypeScript strict mode, CONTRIBUTING.md,

