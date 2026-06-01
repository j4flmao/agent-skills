# Prettier Skill

## Overview
Prettier is an opinionated code formatter supporting JavaScript, TypeScript, CSS, JSON, Markdown, and more. This skill covers configuration patterns, integration, plugin development, and team workflows.

## Decision Tree: Configuration Approach

### Should I Use Prettier?
```
Do I need consistent formatting across the team?
├── YES → Use Prettier (opinionated, no debates about style)
├── YES, but also want linting → Prettier + ESLint (Prettier for format, ESLint for quality)
├── Solo project, no formatting preference → Still use Prettier (set and forget)
└── Already using a formatter (dprint, biome, etc.) → Stick with it; similar principles apply
```

### Config Location Decision
```
What type of project?
├── Monorepo with shared config → Create @company/prettier-config npm package
├── Single project → .prettierrc at root
├── VS Code only, no CLI → Add prettier config to .vscode/settings.json
├── Need dynamic config (plugins) → prettier.config.js (ESM) or .prettierrc.js
└── Want JSON simplicity → .prettierrc (JSON) or .prettierrc.yaml
```

## Core Configuration Patterns

### Default Overrides Architecture
```javascript
// prettier.config.js
export default {
  // Sensible defaults for the team
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  arrowParens: 'always',
  endOfLine: 'lf',

  // Language-specific overrides
  overrides: [
    {
      files: '*.{ts,tsx}',
      options: { parser: 'typescript', printWidth: 120 },
    },
    {
      files: '*.vue',
      options: { parser: 'vue', htmlWhitespaceSensitivity: 'strict' },
    },
    {
      files: '*.md',
      options: { parser: 'markdown', proseWrap: 'always' },
    },
    {
      files: '*.{yml,yaml}',
      options: { parser: 'yaml', singleQuote: false },
    },
    {
      files: 'package.json',
      options: { parser: 'json-stringify' },
    },
  ],
};
```

### Shareable Config Package
```javascript
// @company/prettier-config/index.js
const baseConfig = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
};

const plugins = {
  tailwind: {
    plugins: ['prettier-plugin-tailwindcss'],
    tailwindConfig: './tailwind.config.ts',
  },
  importSort: {
    plugins: ['@trivago/prettier-plugin-sort-imports'],
    importOrder: [
      '^react',
      '^@/',
      '^[./]',
    ],
    importOrderSeparation: true,
  },
};

module.exports = { baseConfig, plugins };

// Consumer usage:
// const { baseConfig, plugins } = require('@company/prettier-config');
// module.exports = { ...baseConfig, ...plugins.tailwind };
```

## Plugin Architecture

### Plugin Development Decision Tree
```
Need to format a custom language?
├── Language has parsers available (ANTLR, etc.) → Write Prettier plugin
├── Language is simple / DSL → Write parser + printer plugin
├── Language can be embedded in JS strings → Use embed handler
└── Language has existing Prettier plugin → Use existing; contribute fixes upstream
```

### Plugin Structure Pattern
```javascript
// prettier-plugin-mylang/index.js
module.exports = {
  languages: [
    {
      name: 'MyLang',
      parsers: ['mylang-parser'],
      extensions: ['.my'],
      linguistLanguageId: 123,
      vscodeLanguageIds: ['mylang'],
    },
  ],
  parsers: {
    'mylang-parser': {
      parse: (text) => parseMyLang(text),
      astFormat: 'mylang-ast',
      locStart: (node) => node.start,
      locEnd: (node) => node.end,
    },
  },
  printers: {
    'mylang-ast': {
      print: (path, options, print) => {
        const node = path.getValue();
        switch (node.type) {
          case 'Program':
            return printChildren(path, options, print);
          case 'Assignment':
            return `${node.name} = ${node.value};`;
          default:
            return '';
        }
      },
    },
  },
  options: {
    mylangStyle: {
      type: 'choice',
      default: 'compact',
      description: 'Output style',
      choices: [
        { value: 'compact', description: 'Minimal whitespace' },
        { value: 'verbose', description: 'Verbose style' },
      ],
    },
  },
};
```

### Doc Builder Patterns
```javascript
const { builders } = require('prettier/doc');
const { group, indent, line, hardline, softline, fill, ifBreak } = builders;

// Pattern: Group tries to fit on one line
group([
  'function',
  ' ',
  node.name,
  '(',
  indent(softline),
  print(params),
  softline,
  ')',
]);

// Pattern: Fill for line wrapping (like prose)
fill([
  print(item),
  line,
  print(nextItem),
]);

// Pattern: Conditional breaks
ifBreak('{ ... }', '{ ... }');  // Different content based on line break
```

## Integration Patterns

### ESLint + Prettier
```javascript
// eslint.config.js
import prettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier';

export default [
  // ... other configs ...
  prettier, // MUST be last — disables conflicting ESLint rules
  {
    plugins: { prettier: eslintPluginPrettier },
    rules: { 'prettier/prettier': 'error' },
  },
];
```

### Pre-commit Hook Pattern
```json
{
  "lint-staged": {
    "*.{js,ts,tsx,jsx}": ["prettier --write", "eslint --fix"],
    "*.{json,md,yml,css,scss}": ["prettier --write"]
  }
}
```

### CI Check Pattern
```yaml
format:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npx prettier --check .
    # On failure: npx prettier --write . && git diff to show changes
```

## Editor Integration

### VS Code Workspace Settings
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.formatOnPaste": false,
  "prettier.requireConfig": true,
  "prettier.configPath": ".prettierrc",
  "[javascript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[json]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[markdown]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }
}
```

### WebStorm/IntelliJ
```
Settings → Languages & Frameworks → Prettier
- Run on save: enable
- Prettier package: select project node_modules
- Config file: auto-detect
```

## Debugging Prettier

### Config Resolution
```bash
# Check which config file is being used
npx prettier --find-config-path src/file.ts

# Check effective config
npx prettier --config .prettierrc --debug-check src/file.ts

# Show what would change
npx prettier --check src/
```

### Ignoring Files
```bash
# .prettierignore — similar to .gitignore
node_modules
dist
build
coverage
*.generated.*
*.min.*
package-lock.json
pnpm-lock.yaml
```

### Inline Disable
```javascript
// prettier-ignore
const matrix = [
  1, 2, 3,
  4, 5, 6,
];

// prettier-ignore-start
// ... block of code to ignore ...
// prettier-ignore-end
```

## Key Anti-Patterns
- **Arguing about Prettier defaults**: The whole point is to stop debating formatting
- **Customizing every option**: If you change many defaults, reconsider whether you need Prettier
- **Not running Prettier in CI**: Formatting drifts without enforcement
- **Using Prettier for code quality rules**: Prettier is formatting-only; use ESLint for quality
- **No `.prettierignore`**: Prettier may try to format build artifacts
- **Inconsistent `endOfLine` across team**: Set `"lf"` to avoid cross-platform diffs
- **Multi-root workspace without config**: Each root needs its own Prettier config
- **Formatting on save without `requireConfig`**: Prettier may use defaults unexpectedly

## Migrating to Prettier

### Gradual Adoption
1. Add Prettier config to project root
2. Run `npx prettier --write .` to format all files
3. Add `.prettierignore` for generated/build files
4. Add pre-commit hook with `lint-staged`
5. Update ESLint config to disable conflicting rules
6. Add CI check
7. Share team config as npm package for multi-project orgs

### Large Codebase Migration
```bash
# Format by directory to review changes incrementally
npx prettier --write src/components/
npx prettier --write src/pages/
npx prettier --write src/utils/

# Or use --list-different to find unformatted files first
npx prettier --list-different src/
```
