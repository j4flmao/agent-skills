# ESLint Flat Configuration

## Overview
ESLint 9.0+ uses the flat config system (eslint.config.js) which replaces the legacy .eslintrc format. The flat config provides a composable, array-based configuration with better module resolution and simplified inheritance.

## Basic Flat Config

### Simple Configuration
```javascript
// eslint.config.js
import js from '@eslint/js';

export default [
  js.configs.recommended,

  {
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'error',
      'prefer-const': 'error',
    },
  },
];
```

### TypeScript Configuration
```javascript
// eslint.config.js
import js from '@eslint/js';
import ts from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...ts.configs.recommended,

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
      }],
    },
  },

  // Override for test files
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'max-lines': 'off',
    },
  },
];
```

## File Pattern Matching

### File-Specific Configs
```javascript
export default [
  // Global config
  {
    rules: {
      'no-console': 'error',
    },
  },

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },

  // Test files
  {
    files: ['**/*.test.*', '**/*.spec.*'],
    rules: {
      'max-nested-callbacks': ['error', { max: 5 }],
      'no-console': 'off',
    },
  },

  // Configuration files
  {
    files: ['**/*.config.*'],
    rules: {
      'import/no-default-export': 'off',
    },
  },

  // Ignore files (replaces .eslintignore)
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/node_modules/**',
      '**/coverage/**',
    ],
  },
];
```

## Plugin Integration

### Using Plugins
```javascript
// eslint.config.js
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  // React configuration
  {
    files: ['**/*.jsx', '**/*.tsx'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/jsx-no-target-blank': 'error',
      'react/prop-types': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // Import plugin
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      }],
      'import/no-unused-modules': 'error',
    },
  },
];
```

## Custom Config Objects

### Shared Configs
```javascript
// configs/base.js
export const baseConfig = {
  rules: {
    'no-var': 'error',
    'prefer-const': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
};

// configs/typescript.js
import ts from 'typescript-eslint';
import { baseConfig } from './base.js';

export const typescriptConfig = [
  ...ts.configs.recommended,
  baseConfig,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
];

// eslint.config.js
import { typescriptConfig } from './configs/typescript.js';

export default [
  ...typescriptConfig,
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
```

## Language Options

### Parser and Environment
```javascript
export default [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',

      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },

      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',

        // Node.js globals
        process: 'readonly',
        require: 'readonly',

        // Test globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
      },
    },
  },
];
```

## Linter Options

### Linter Settings
```javascript
export default [
  {
    linterOptions: {
      reportUnusedDisableDirectives: true,
      noInlineConfig: false,
    },
  },

  {
    files: ['**/*.ts'],
    rules: {
      'require-await': 'error',
    },
  },

  // Disable rules for generated files
  {
    files: ['**/generated/**'],
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
```

## Migration from .eslintrc

### Equivalence Mapping
```javascript
// Legacy .eslintrc
{
  "root": true,
  "env": { "browser": true, "es2022": true },
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "project": "./tsconfig.json" },
  "plugins": ["@typescript-eslint"],
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "rules": { "no-console": "error" },
  "ignorePatterns": ["dist/", "*.generated.ts"]
}

// Flat config equivalent
export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parser: tsParser,
      parserOptions: { project: './tsconfig.json' },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-console': 'error',
    },
  },
  { ignores: ['dist/', '*.generated.ts'] },
];
```

## Key Points
- Flat config uses eslint.config.js (ESM) file
- Configuration is an array of config objects
- files pattern limits config to matching files
- ignores replaces .eslintignore file
- plugins object maps plugin names to plugin objects
- languageOptions replaces env and parserOptions
- linterOptions controls linting behavior
- Configs can be imported and composed from separate files
- Each config object is complete (no cascading by default)
- Override behavior is explicit through array ordering
- All rules default to "off" in flat config
- ecmaVersion: "latest" uses the latest supported version
- Flat config natively supports ESM
- Config merging follows specific precedence rules
- Shared configs are exported from modules
- Plugins export configs via .configs property
- Built-in configs: js.configs.recommended, js.configs.all
- TypeScript uses typescript-eslint package
- React plugins export .configs.flat for flat config
- Prettier integration via eslint-plugin-prettier
- Inline config comments still work in flat config
- CLI flags remain compatible with flat config
- Config inspection via --print-config flag
- Type safety through TypeScript for config files
