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

## Production Considerations

### Performance at Scale
For large codebases (10k+ files), ESLint performance matters. Key strategies:
- **`--cache` flag**: `npx eslint --cache src/` caches results per file, skips unchanged files. Cache stored in `.eslintcache` — gitignore it. Invalidated when file content changes or config changes.
- **`--max-warnings`**: Set in CI to enforce warning-free code. `npx eslint --max-warnings 0 src/`. Prevents warning accumulation — teams ignore 1000+ warnings.
- **File filtering**: Use glob patterns to limit scope. `eslint 'src/**/*.{ts,tsx}'` over scanning all files and ignoring in config.
- **Parallel linting**: `eslint --no-eslintrc -c config.js` with multiple processes. Use `lint-staged` for pre-commit (staged files only).
- **Memory profiling**: If ESLint runs OOM, increase Node memory: `NODE_OPTIONS="--max-old-space-size=4096" npx eslint src/`. Or split linting by directory.
- **Incremental migration**: For large codebases adopting strict rules, use `eslint-plugin-only-error` to enforce only new/changed code follows new rules.

### Monorepo Configuration Patterns
Monorepo ESLint setup with package-specific overrides:
```javascript
// eslint.config.js (root)
import ts from 'typescript-eslint';

export default [
  ...ts.configs.recommended,
  {
    files: ['packages/api/src/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['packages/web/src/**/*.tsx'],
    rules: { 'react/jsx-key': 'error' },
  },
  {
    files: ['packages/shared/src/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'error',
    },
  },
  {
    files: ['packages/*/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'max-lines-per-function': 'off',
    },
  },
  { ignores: ['**/dist/', '**/node_modules/', '**/coverage/'] },
];
```

### Plugin Compatibility Matrix
| Plugin | Flat Config | Legacy Config | Notes |
|--------|-------------|---------------|-------|
| `@eslint/js` | Native | N/A | ESLint 9+ built-in |
| `typescript-eslint` | Yes (v7+) | Yes | v8+ requires flat config |
| `eslint-plugin-react` | Yes (v7.35+) | Yes | Hooks is separate |
| `eslint-plugin-react-hooks` | Yes (v4.6+) | Yes | |
| `eslint-plugin-import` | Experimental | Yes | Use `eslint-plugin-import-x` fork |
| `eslint-plugin-prettier` | Yes | Yes | Prefer config-prettier only |
| `eslint-plugin-vue` | Yes | Yes | |
| `@angular-eslint` | Yes (v18+) | Yes | |
| `eslint-plugin-jest` | Yes | Yes | |

### Pre-commit Hook Setup (Husky 9+)
```bash
npx husky init
# .husky/pre-commit:
npx lint-staged
```
```json
{
  "lint-staged": {
    "*.{js,ts,tsx,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

### Known Limitations
- **ESLint 9 flat config still maturing**: Some plugins haven't migrated. Maintain both configs during transition.
- **`--report-unused-disable-directives` noisy during migration**: Use `--report-unused-disable-directives-severity warn`.
- **`eslint --fix` limited**: Only rules with `meta.fixable` are auto-fixed.
- **ESLint + Prettier conflict**: Use `eslint-config-prettier` as last config to disable formatting rules.
- **Large .d.ts files**: May cause false positives with `no-unused-vars`. Exclude `*.d.ts`.
- **`parserOptions.project` slows TypeScript linting 2-10x**: Use only on specific directories needing type-aware rules.

### Debugging & Troubleshooting

**Rule not firing?**
1. Check rule name includes plugin prefix: `react/jsx-key` not `jsx-key`
2. Check `files` pattern matches the file being linted
3. Check overrides aren't disabling the rule
4. Run `npx eslint --debug src/file.ts` to see rule execution
5. Run `npx eslint --print-config src/file.ts` to verify effective config
6. Check for `/* eslint-disable */` at top of file

**Config debugging commands:**
```bash
npx eslint --print-config src/app.ts          # Effective config
npx eslint --config eslint.config.js src/     # Force config file
npx eslint --debug src/                       # Trace rule application
```

**Common flat config mistakes:**
- Must export an array, not an object
- Later configs override earlier ones — put generics first, specifics last
- `ignores` as standalone config must be last item in array
- Plugins must be imported and passed in `plugins` object, not referenced as strings
- Only one parser per file — `typescript-eslint` conflicts with `@babel/eslint-parser`
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.

## Architecture Decision Trees

### Flat Config (eslint.config.js) vs Legacy (.eslintrc)

| Decision | Flat Config (v9+) | Legacy (.eslintrc) |
|---|---|---|
| Configuration | eslint.config.js (ESM) | JSON/YAML/JS |
| Overrides | Array ordering | `overrides` key |
| Plugin system | Imported as modules | String namespace |
| Performance | Faster (no config merging) | Slower (deep merge) |
| Deprecation | Active development | Deprecated in v9, removed in v10 |
| Best for | New projects, v9 migration | Existing v8 projects |

### ESLint vs Prettier vs Biome

| Aspect | ESLint | Prettier | Biome |
|---|---|---|---|
| Linting | Full (rules, plugins) | None (format only) | Lint + format in one |
| Formatting | Via prettier plugin | First-class | Built-in |
| Speed | Moderate | Fast | Very fast (Rust) |
| Ecosystem | Largest plugin registry | Broad editor support | Growing |
| Migration path | Existing projects | Add alongside | New projects |