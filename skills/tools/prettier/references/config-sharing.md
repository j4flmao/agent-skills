# Prettier Configuration and Sharing

## Overview
Prettier is an opinionated code formatter that supports multiple languages. Configuration sharing through presets and extends enables consistent formatting across projects and teams.

## Configuration Formats

### Prettier Config
```javascript
// .prettierrc
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "quoteProps": "as-needed",
  "jsxSingleQuote": false,
  "bracketSameLine": false,
  "embeddedLanguageFormatting": "auto",
  "htmlWhitespaceSensitivity": "css",
  "proseWrap": "preserve",
  "vueIndentScriptAndStyle": false
}
```

### Alternative Config Files
```javascript
// prettier.config.js (ESM)
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindConfig: './tailwind.config.ts',
};

// .prettierrc.json
{
  "semi": true,
  "singleQuote": true,
  "overrides": [
    {
      "files": "*.md",
      "options": {
        "proseWrap": "always"
      }
    },
    {
      "files": "*.{yml,yaml}",
      "options": {
        "singleQuote": false
      }
    }
  ]
}

// .prettierrc.yaml
semi: true
singleQuote: true
trailingComma: all
printWidth: 100
```

## Shareable Configs

### npm Package Config
```javascript
// @company/prettier-config/index.js
module.exports = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  plugins: ['prettier-plugin-tailwindcss'],
  overrides: [
    {
      files: '*.ts',
      options: {
        parser: 'typescript',
      },
    },
  ],
};
```

```json
// @company/prettier-config/package.json
{
  "name": "@company/prettier-config",
  "version": "1.0.0",
  "main": "index.js",
  "peerDependencies": {
    "prettier": ">=3.0.0"
  }
}
```

### Consuming Shareable Config
```javascript
// .prettierrc.js
module.exports = {
  ...require('@company/prettier-config'),
  // Project-specific overrides
  singleQuote: false,
  printWidth: 120,
};
```

## Extending Configs

### Configuration Inheritance
```javascript
// .prettierrc
"@company/prettier-config"
```

```json
// .prettierrc.json (with overrides)
{
  "extends": ["@company/prettier-config"],
  "semi": false,
  "printWidth": 80
}
```

### Multi-Language Configuration
```javascript
// prettier.config.js
module.exports = {
  // Default options
  semi: true,
  singleQuote: true,

  // Language-specific overrides
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      options: {
        parser: 'typescript',
        printWidth: 120,
      },
    },
    {
      files: '*.vue',
      options: {
        parser: 'vue',
        htmlWhitespaceSensitivity: 'strict',
        vueIndentScriptAndStyle: true,
      },
    },
    {
      files: '*.md',
      options: {
        parser: 'markdown',
        proseWrap: 'always',
      },
    },
    {
      files: '*.{yml,yaml}',
      options: {
        parser: 'yaml',
        tabWidth: 2,
      },
    },
    {
      files: '*.json',
      options: {
        parser: 'json',
        trailingComma: 'none',
      },
    },
  ],
};
```

## Integration with ESLint

### eslint-config-prettier
```javascript
// eslint.config.js
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettier, // Must be last to disable conflicting rules
  {
    rules: {
      'prettier/prettier': ['error', {
        singleQuote: true,
        semi: true,
        trailingComma: 'all',
      }],
    },
  },
];
```

## Ignoring Files

### .prettierignore
```
# Dependencies
node_modules/
package-lock.json
pnpm-lock.yaml
yarn.lock

# Build outputs
dist/
build/
.next/
out/
coverage/

# Generated files
*.generated.*
*.min.*
tsconfig.json
tsconfig.*.json

# Large files
*.svg
*.csv
*.woff
*.woff2
*.eot
*.ttf

# Specific directories
public/
static/
```

## Editor Integration

### VS Code Settings
```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "prettier.requireConfig": true,
  "prettier.configPath": ".prettierrc",
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## CI Integration

### Prettier in CI
```yaml
# .github/workflows/formatting.yml
name: Code Formatting

on: [push, pull_request]

jobs:
  prettier:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx prettier --check .
```

```bash
# package.json scripts
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "format:staged": "lint-staged"
  },
  "lint-staged": {
    "*.{js,ts,tsx,json,css,md}": ["prettier --write"]
  }
}
```

## Monorepo Configuration

### Multi-Package Config Pattern
```javascript
// Root prettier.config.js (monorepo)
module.exports = {
  ...require('@company/prettier-config'),
  overrides: [
    {
      files: 'packages/web/**/*.{ts,tsx}',
      options: { singleQuote: true, printWidth: 100 },
    },
    {
      files: 'packages/api/**/*.ts',
      options: { singleQuote: false, printWidth: 120 },
    },
    {
      files: 'packages/docs/**/*.md',
      options: { proseWrap: 'always', printWidth: 80 },
    },
  ],
};
```

## Advanced Integration Patterns

### Prettier + ESLint + TypeScript
```javascript
// eslint.config.js — full setup
import js from '@eslint/js';
import ts from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import prettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier';

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { react: reactPlugin },
    rules: { ...reactPlugin.configs.recommended.rules },
  },
  prettier, // MUST be last — disables all style rules
  {
    plugins: { prettier: eslintPluginPrettier },
    rules: {
      'prettier/prettier': [
        'error',
        {
          singleQuote: true,
          semi: true,
          trailingComma: 'all',
          printWidth: 100,
        },
      ],
    },
  },
];
```

### Git Pre-Commit Hook with Prettier
```json
{
  "lint-staged": {
    "*.{js,ts,tsx,jsx}": [
      "prettier --write",
      "eslint --fix"
    ],
    "*.{json,md,yaml,yml}": [
      "prettier --write"
    ],
    "*.{css,scss,less}": [
      "prettier --write",
      "stylelint --fix"
    ]
  }
}
```

### CI Optimization
```yaml
# Only check changed files in CI for speed
jobs:
  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Need full history for diff
      - uses: actions/setup-node@v4
      - run: npm ci
      - name: Check formatting on changed files
        run: |
          CHANGED_FILES=$(git diff --name-only origin/main...HEAD | grep -E '\.(js|ts|tsx|json|md)$' || true)
          if [ -n "$CHANGED_FILES" ]; then
            npx prettier --check $CHANGED_FILES
          fi
```

## Resolving Conflicts with ESLint

### Rule Conflict Map
```javascript
// eslint-config-prettier disables these ESLint rules:
const conflictingRules = [
  'indent', 'quotes', 'semi', 'comma-dangle', 'max-len',
  'function-paren-newline', 'implicit-arrow-linebreak',
  'jsx-quotes', 'no-mixed-spaces-and-tabs', 'no-tabs',
  'object-curly-newline', 'operator-linebreak',
  'arrow-parens', 'brace-style', 'comma-style',
  'dot-location', 'keyword-spacing', 'linebreak-style',
  'newline-per-chained-call', 'no-extra-semi',
  'no-floating-decimal', 'no-multi-spaces',
  'no-multiple-empty-lines', 'nonblock-statement-body-position',
  'padded-blocks', 'quote-props', 'space-before-function-paren',
  'wrap-regex', '@typescript-eslint/quotes', '@typescript-eslint/semi',
];

// Always use eslint-config-prettier as the last config
```

## Config Pattern Decision Tree
```
Where should config live?
├── Single project → .prettierrc at repository root
├── Monorepo with shared config → @company/prettier-config npm package
├── ESM project → prettier.config.js (export default)
├── CJS project → .prettierrc.js (module.exports)
├── Simple config → .prettierrc.json
└── YAML preference → .prettierrc.yaml
```

## Key Anti-Patterns
- **Changing every default**: You lose Prettier's value as opinionated formatter
- **No prettierignore**: Prettier wastes time checking build artifacts
- **No endOfLine config**: Cross-platform diffs in PRs
- **Formatting without requireConfig**: Prettier may format with unexpected settings
- **Running Prettier after ESLint**: Run Prettier first, then ESLint (or use lint-staged)
- **Ignoring CI formatting failures**: Fix formatting before merging
- **Per-developer config drift**: Share config via package or workspace settings
- **Not formatting on save**: Inconsistent formatting across team members
- **Using Prettier for code quality**: Use ESLint for quality, Prettier for formatting only

## Key Points
- Prettier config files support .prettierrc, prettier.config.js, and package.json
- Shareable configs as npm packages (@company/prettier-config)
- Overrides section handles per-language formatting rules
- eslint-config-prettier disables conflicting ESLint rules
- .prettierignore excludes files from formatting
- Editor integration with format-on-save
- CI checks with prettier --check
- Pre-commit hooks with lint-staged
- Config extends enables layered configuration
- Plugin ecosystem extends Prettier for Tailwind CSS, imports, etc.
- YAML and JSON config alternatives for different preferences
- Multi-root workspace config for monorepos
- prettier.resolveConfig reads nearest config file
- CLI arguments override config file settings
- Inline comments disable formatting for specific sections
- Consistent endOfLine across operating systems
- ProseWrap controls markdown line wrapping
- Embedded language formatting in HTML, MDX, and Vue
- Config validation with prettier --config-check
- VS Code extension auto-detects project config
- Team-wide consistency through shared config packages
