# ESLint Skill

## Overview
ESLint is a pluggable JavaScript/TypeScript linting tool that enforces code quality, style, and best practices. This skill covers configuration, custom rule authoring, plugin usage, and integration patterns.

## Decision Tree: Configuration Approach

### Flat Config (ESLint >=9) vs Legacy (.eslintrc)
- **New project, ESLint 9+**: Use `eslint.config.js` (flat config)
- **Existing project on ESLint <9**: Stay on `.eslintrc` until migration
- **Migrating from <9 to >=9**: Use `--config` flag; run `npx @eslint/migrate-config`
- **Plugin needs flat-config only**: Check plugin docs — some still only support legacy

### Choosing a Config Preset
- **TypeScript project**: `typescript-eslint` (replaces `@typescript-eslint/eslint-plugin`)
- **React project**: `eslint-plugin-react` + `eslint-plugin-react-hooks`
- **Next.js project**: `eslint-config-next`
- **Angular project**: `@angular-eslint`
- **Vue project**: `eslint-plugin-vue`
- **Node.js project**: `eslint-plugin-node` + `eslint-plugin-import`
- **Minimal/configuration-free**: `@eslint/js` recommended config

## Configuration Patterns

### Flat Config (Recommended)
```javascript
// eslint.config.js
import js from '@eslint/js';
import ts from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { react: reactPlugin },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      'react/jsx-no-target-blank': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'max-lines': 'off',
    },
  },
  { ignores: ['dist/', 'node_modules/', 'coverage/'] },
];
```

### Legacy Config
```json
{
  "root": true,
  "env": { "browser": true, "es2022": true, "node": true },
  "parser": "@typescript-eslint/parser",
  "parserOptions": { "project": "./tsconfig.json" },
  "plugins": ["@typescript-eslint", "react", "import"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:import/typescript"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "import/order": ["error", { "alphabetize": { "order": "asc" } }]
  },
  "ignorePatterns": ["dist/", "*.generated.ts"]
}
```

## Custom Rule Authoring

### Rule Structure Decision Tree
```
Need to enforce a project convention?
├── YES → Can existing plugin rule handle it?
│   ├── YES → Configure the existing rule
│   └── NO → Write custom rule
│       ├── Simple pattern match? → Use AST selector rule
│       ├── Complex logic needed? → Full visitor pattern rule
│       └── Auto-fixable? → Add fixer function
└── NO → No rule needed
```

### Pattern: AST Selector Rule
```javascript
// eslint-local-rules/no-direct-state-mutation.js
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow direct state mutation in React' },
    schema: [],
    messages: {
      noDirectMutation: 'Do not mutate state directly. Use setState.',
    },
  },
  create(context) {
    return {
      'AssignmentExpression[left.object.name="state"]'(node) {
        context.report({ node, messageId: 'noDirectMutation' });
      },
    };
  },
};
```

### Pattern: Rule with Complexity Scoring
```javascript
module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Enforce cognitive complexity limits' },
    schema: [
      {
        type: 'object',
        properties: {
          max: { type: 'number', default: 15 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooComplex:
        'Function "{{name}}" has complexity {{actual}}, max is {{max}}.',
    },
  },
  create(context) {
    const max = context.options[0]?.max || 15;

    function calculateComplexity(node) {
      let score = 0;
      const incrementors = new Set([
        'IfStatement', 'ElseIfStatement', 'SwitchCase',
        'ForStatement', 'ForInStatement', 'ForOfStatement',
        'WhileStatement', 'DoWhileStatement', 'CatchClause',
        'LogicalExpression', 'ConditionalExpression',
      ]);

      const visitor = {
        enter(child) {
          if (incrementors.has(child.type)) {
            // Nested incrementors add more complexity
            let parent = child.parent;
            let nesting = 0;
            while (parent) {
              if (incrementors.has(parent.type)) nesting++;
              parent = parent.parent;
            }
            score += 1 + nesting;
          }
        },
      };

      context.sourceCode.traverse(node, visitor);
      return score;
    }

    return {
      FunctionDeclaration(node) {
        const score = calculateComplexity(node);
        if (score > max) {
          context.report({
            node,
            messageId: 'tooComplex',
            data: {
              name: node.id?.name || '(anonymous)',
              actual: score,
              max,
            },
          });
        }
      },
    };
  },
};
```

## Plugin Architecture

### Creating a Plugin
```javascript
// eslint-plugin-mycompany/index.js
module.exports = {
  configs: {
    recommended: {
      plugins: ['mycompany'],
      rules: {
        'mycompany/no-secrets': 'error',
        'mycompany/logger-usage': 'warn',
      },
    },
    strict: {
      plugins: ['mycompany'],
      rules: {
        'mycompany/no-secrets': 'error',
        'mycompany/logger-usage': 'error',
        'mycompany/no-direct-state-mutation': 'error',
      },
    },
  },
  rules: {
    'no-secrets': require('./rules/no-secrets'),
    'logger-usage': require('./rules/logger-usage'),
    'no-direct-state-mutation': require('./rules/no-direct-state-mutation'),
  },
};
```

### Plugin Naming Convention
- **Scoped**: `@scope/eslint-plugin-name` → `@scope/name`
- **Unscoped**: `eslint-plugin-name` → `name`
- **With prefix**: `eslint-plugin-react` → `react`

## Performance Optimization

### Slow Rule Detection
```bash
# Profile rule execution time
npx eslint --debug src/ 2>&1 | grep "rule"

# Use TIMING environment variable
TIMING=1 npx eslint src/
```

### Performance Patterns
- Use AST selectors over manual visitor checks
- Cache expensive computations with closures
- Use `context.sourceCode.getText(node)` sparingly
- Skip `node_modules` in file matching
- Use `linterOptions.reportUnusedDisableDirectives` carefully
- Prefer `enforce: 'pre'` for transform plugins, `enforce: 'post'` for formatters
- Batch file processing: one `eslint` invocation, not one per file

### Anti-Patterns
```javascript
// BAD: Inefficient — traverses AST per call
create(context) {
  return {
    CallExpression(node) {
      // Expensive logic on every call expression
    },
  };
}

// GOOD: Efficient — use selectors to narrow scope
create(context) {
  return {
    'CallExpression[callee.name="dangerousFunction"]'(node) {
      // Only fires for specific function calls
    },
  };
}
```

## Common Integration Patterns

### Pre-commit Hook
```json
{
  "lint-staged": {
    "*.{js,ts,tsx}": ["eslint --fix"],
    "*.{css,scss}": ["stylelint --fix"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

### VS Code Integration
```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": ["javascript", "typescript", "javascriptreact", "typescriptreact"]
}
```

### CI Integration
```yaml
lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npx eslint src/ --max-warnings 0
```

## Rule Severity Decision Tree
```
What's the impact of a violation?
├── Potential bug or security issue → "error"
├── Code quality / maintainability issue → "warn"
├── Style preference (conflicts with Prettier) → "off" (delegate to Prettier)
└── Temporary measure / migration in progress → "warn" with TODO

Is the rule controversial?
├── YES → Discuss with team; start as "warn"
├── YES, strong opinions → "off" with note in config
└── NO, widely accepted → "error"
```

## Key Anti-Patterns
- **No `eslint-disable` comments without justification**: Always include a comment explaining why
- **Extending too many configs**: Prefer explicit rules — avoid config bloat
- **Mixing Prettier and ESLint formatting rules**: Use `eslint-config-prettier` to disable conflicts
- **Running ESLint on every file in pre-commit**: Use `lint-staged` for staged-only checking
- **Using deprecated rules**: Check rule status; run with `--report-unused-disable-directives`
- **Per-project custom rules without a plugin**: Extract to a shared plugin when >1 project needs them
- **Ignoring all warnings**: Set `--max-warnings` in CI to prevent warning creep
- **Leaving `no-unused-vars` on `warn`**: Use `"error"` with `argsIgnorePattern: "^_"` instead

## Monorepo Configuration

### Workspace Configs
```javascript
// eslint.config.js (monorepo root)
import ts from 'typescript-eslint';

export default [
  ...ts.configs.recommended,
  {
    files: ['packages/*/src/**/*.ts'],
    rules: { '@typescript-eslint/explicit-function-return-type': 'error' },
  },
  {
    files: ['packages/api/**/*.ts'],
    rules: { 'no-console': 'off' },  // API needs logging
  },
  {
    files: ['packages/web/**/*.tsx'],
    rules: { 'react/prop-types': 'error' },
  },
  { ignores: ['**/dist/', '**/node_modules/'] },
];
```

## Rule Testing Patterns
- Test valid cases that should NOT trigger the rule
- Test invalid cases with expected error messages
- Test edge cases (empty files, deeply nested code, etc.)
- Test options handling (no options, all options, partial options)
- Test fixer output (both basic and edge cases)
- Use `RuleTester` from `eslint` package

```javascript
const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2020 } });
ruleTester.run('no-direct-state-mutation', rule, {
  valid: [
    'this.setState({ count: 1 })',
    'const state = { count: 1 }',
    'setState({ count: 1 })',
  ],
  invalid: [
    {
      code: 'this.state.count = 1',
      errors: [{ messageId: 'noDirectMutation' }],
    },
    {
      code: 'state.count = 1',
      errors: [{ message: /mutate state directly/i }],
    },
  ],
});
```

## Migration from Legacy to Flat Config
1. Upgrade ESLint: `npm install eslint@latest --save-dev`
2. Install `@eslint/migrate-config`: `npx @eslint/migrate-config .eslintrc.json`
3. Review generated `eslint.config.js` for correctness
4. Remove old config files (`.eslintrc*`)
5. Update CI scripts to use `eslint.config.js`
6. Remove any `eslintConfig` field from `package.json`
7. Update VS Code settings to use flat config path
