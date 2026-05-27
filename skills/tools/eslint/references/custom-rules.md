# ESLint Custom Rules

## Overview
ESLint custom rules enforce project-specific code conventions. Rules use Abstract Syntax Tree (AST) traversal with visitor patterns to analyze and report code issues. This reference covers rule structure, AST selectors, fixers, testing, and rule composition.

## Rule Structure

### Basic Rule
```javascript
// eslint-local-rules/no-console-log.js
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow console.log statements',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [], // No options
    messages: {
      unexpectedLog: 'Unexpected console.log statement.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.name === 'console' &&
          node.callee.property.name === 'log'
        ) {
          context.report({
            node,
            messageId: 'unexpectedLog',
          });
        }
      },
    };
  },
};
```

### Rule with Options
```javascript
// eslint-local-rules/max-function-lines.js
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce maximum lines per function',
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: { type: 'number', default: 50 },
          excludeComments: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooManyLines:
        'Function "{{name}}" has {{lines}} lines, exceeding the max of {{max}}.',
    },
  },
  create(context) {
    const options = context.options[0] || {};
    const max = options.max || 50;
    const excludeComments = options.excludeComments !== false;

    function countLines(node) {
      const sourceCode = context.getSourceCode();
      const text = sourceCode.getText(node);
      let lines = text.split('\n').length;

      if (excludeComments) {
        const comments = sourceCode.getCommentsInside(node);
        const commentLines = new Set();
        comments.forEach((comment) => {
          for (let i = comment.loc.start.line; i <= comment.loc.end.line; i++) {
            commentLines.add(i);
          }
        });
        lines -= commentLines.size;
      }

      return lines;
    }

    return {
      FunctionDeclaration(node) {
        const lines = countLines(node);
        if (lines > max) {
          context.report({
            node,
            messageId: 'tooManyLines',
            data: {
              name: node.id?.name || 'anonymous',
              lines,
              max,
            },
          });
        }
      },
    };
  },
};
```

## AST Selectors

### Advanced Selectors
```javascript
module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Enforce naming conventions' },
  },
  create(context) {
    return {
      // Match specific patterns
      'CallExpression[callee.name="setTimeout"]'(node) {
        context.report({
          node,
          message: 'Use delay utility instead of setTimeout',
        });
      },

      // Nested selectors
      'FunctionDeclaration > Identifier[name="handler"]'(node) {
        context.report({
          node,
          message: 'Rename "handler" to a more descriptive name',
        });
      },

      // Multiple conditions
      'MemberExpression[object.name="process"][property.name="env"]'(node) {
        context.report({
          node,
          message: 'Use config module instead of process.env',
        });
      },

      // Regex matching
      'Identifier[name=/^[a-z]/]'(node) {
        // Matches identifiers starting with lowercase
      },
    };
  },
};
```

## Auto-Fixable Rules

### Rule with Fixer
```javascript
module.exports = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: { description: 'Use arrow functions for callbacks' },
    messages: {
      preferArrow: 'Prefer arrow function expression.',
    },
  },
  create(context) {
    const sourceCode = context.getSourceCode();

    return {
      'FunctionExpression:not(:has(ThisExpression))'(node) {
        // Only suggest fix for non-constructor functions without this
        if (node.parent.type === 'Property' && node.parent.method) {
          return;
        }

        context.report({
          node,
          messageId: 'preferArrow',
          fix(fixer) {
            const params = node.params.map((p) => sourceCode.getText(p));
            const body = sourceCode.getText(node.body);
            const isExpressionBody = node.body.type === 'BlockStatement' &&
              node.body.body.length === 1 &&
              node.body.body[0].type === 'ReturnStatement';

            let arrowBody;
            if (isExpressionBody) {
              const returnArg = node.body.body[0].argument;
              arrowBody = sourceCode.getText(returnArg);
            } else {
              arrowBody = body;
            }

            const paramsText = params.length === 1 ? params[0] : `(${params.join(', ')})`;
            const bodyText = isExpressionBody ? arrowBody : `(${arrowBody})`;
            const arrow = `const ${node.parent?.id?.name || 'anonymous'} = ${paramsText} => ${bodyText}`;

            return fixer.replaceText(node, arrow);
          },
        });
      },
    };
  },
};
```

## Testing Rules

### Rule Tests
```javascript
// tests/no-console-log.test.js
const { RuleTester } = require('eslint');
const rule = require('../eslint-local-rules/no-console-log');

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
});

ruleTester.run('no-console-log', rule, {
  valid: [
    'console.warn("warning")',
    'console.error("error")',
    'const log = console.log', // Not a call
    'console.info("info")',
    { code: 'console.log', options: [] }, // Member expression without call
  ],
  invalid: [
    {
      code: 'console.log("test")',
      errors: [{ messageId: 'unexpectedLog' }],
    },
    {
      code: 'if (true) { console.log("debug") }',
      errors: [{ message: 'Unexpected console.log statement.' }],
    },
  ],
});
```

## Rule Composition

### Combining Rules
```javascript
module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Enforce function complexity limits' },
  },
  create(context) {
    const rules = [
      require('./no-complex-conditions'),
      require('./max-nesting'),
      require('./no-return-assignment'),
    ].map((rule) => rule.create(context));

    // Merge visitors from multiple rules
    const visitors = {};
    rules.forEach((visitor) => {
      Object.keys(visitor).forEach((key) => {
        if (visitors[key]) {
          const original = visitors[key];
          visitors[key] = (node) => {
            original(node);
            visitor[key](node);
          };
        } else {
          visitors[key] = visitor[key];
        }
      });
    });

    return visitors;
  },
};
```

## Key Points
- Rules use AST visitor pattern with node type handlers
- meta defines rule metadata: type, docs, schema, messages
- create returns a visitor object with node handlers
- context.report() reports violations with message or messageId
- Fixable rules provide auto-fix functionality via fixer
- AST selectors enable pattern-based node matching
- Schema defines rule options with JSON Schema
- RuleTester validates rule behavior with valid/invalid cases
- SourceCode utility accesses token-level information
- Fixer methods: replaceText, insertTextAfter, removeRange
- Linter APIs define rule environments
- Multiple fixes can be applied in one report
- Use messageId over inline messages for i18n
- Collecting data in visitors uses closures
- Rule composition merges multiple rule visitors
- Scope analysis enables variable tracking across scope chain
- TypeScript rules use @typescript-eslint parser
- Rule performance matters for large codebases
- Rule categories: problem, suggestion, layout
- ESLint plugins package multiple rules together
- Test valid cases for allowed patterns
- Test invalid cases for disallowed patterns
