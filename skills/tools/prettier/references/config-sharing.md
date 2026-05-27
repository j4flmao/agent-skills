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
