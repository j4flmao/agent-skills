# Prettier Plugin Development

## Overview
Prettier plugins add support for new languages or customize formatting behavior. Plugins provide parsers and printers that transform AST nodes into formatted strings.

## Plugin Structure

### Basic Plugin
```javascript
// my-prettier-plugin/index.js
const parser = require('./parser');
const printer = require('./printer');

module.exports = {
  languages: [
    {
      name: 'MyLang',
      parsers: ['mylang-parser'],
      extensions: ['.my', '.myl'],
      linguistLanguageId: 123,
      vscodeLanguageIds: ['mylang'],
    },
  ],
  parsers: {
    'mylang-parser': parser,
  },
  printers: {
    'mylang-parser': printer,
  },
};
```

### Parser Implementation
```javascript
// my-prettier-plugin/parser.js
function parse(text, parsers, options) {
  // Parse text into AST
  const ast = {
    type: 'Program',
    body: [],
    tokens: [],
    comments: [],
  };

  // Simple tokenizer
  const lines = text.split('\n');
  let currentLine = 0;

  for (const line of lines) {
    currentLine++;
    const trimmed = line.trim();

    if (trimmed.startsWith('//')) {
      ast.comments.push({
        type: 'LineComment',
        value: trimmed.slice(2).trim(),
        loc: { start: { line: currentLine, column: 0 } },
      });
      continue;
    }

    if (trimmed.startsWith('/*') && trimmed.endsWith('*/')) {
      ast.comments.push({
        type: 'BlockComment',
        value: trimmed.slice(2, -2).trim(),
        loc: { start: { line: currentLine, column: 0 } },
      });
      continue;
    }

    if (trimmed.includes('=')) {
      const [name, value] = trimmed.split('=').map((s) => s.trim());
      ast.body.push({
        type: 'Assignment',
        name,
        value,
        loc: {
          start: { line: currentLine, column: 0 },
          end: { line: currentLine, column: trimmed.length },
        },
      });
    }
  }

  return ast;
}

module.exports = { parse };
```

### Printer Implementation
```javascript
// my-prettier-plugin/printer.js
const { builders } = require('prettier/doc');

function print(path, options, print) {
  const node = path.getValue();

  switch (node.type) {
    case 'Program':
      return printProgram(path, options, print);

    case 'Assignment':
      return printAssignment(node, options);

    case 'LineComment':
      return `// ${node.value}`;

    case 'BlockComment':
      return `/* ${node.value} */`;

    default:
      return '';
  }
}

function printProgram(path, options, print) {
  const parts = [];

  // Print comments first
  const comments = path.map(print, 'comments');
  parts.push(...comments);

  // Print body
  const body = path.map(print, 'body');
  parts.push(...body);

  return builders.join(builders.hardline, parts);
}

function printAssignment(node, options) {
  const indent = options.tabWidth || 2;
  const space = options.useTabs ? '\t' : ' '.repeat(indent);

  return `${space}${node.name} = ${node.value};`;
}

module.exports = { print };
```

### Plugin Options
```javascript
// my-prettier-plugin/index.js
module.exports = {
  languages: [
    {
      name: 'MyLang',
      parsers: ['mylang-parser'],
      extensions: ['.my'],
    },
  ],
  parsers: {
    'mylang-parser': {
      parse,
      astFormat: 'mylang-ast',
      locStart: (node) => node.loc.start.line,
      locEnd: (node) => node.loc.end.line,
    },
  },
  printers: {
    'mylang-ast': {
      print,
      massageAstNode: (node) => {
        // Clean up non-standard properties
        delete node.loc;
        return node;
      },
      insertParens: (node) => {
        // Add parentheses where needed
        return false;
      },
    },
  },
  options: {
    mylangIndent: {
      type: 'choice',
      category: 'Global',
      default: 'spaces',
      description: 'Indent style for MyLang',
      choices: [
        { value: 'spaces', description: 'Use spaces' },
        { value: 'tabs', description: 'Use tabs' },
      ],
    },
    mylangMaxNewlines: {
      type: 'int',
      category: 'Global',
      default: 1,
      range: { start: 0, end: 10 },
      description: 'Maximum consecutive blank lines',
    },
  },
};
```

## Testing Plugins

### Plugin Tests
```javascript
// my-prettier-plugin/__tests__/plugin.test.js
const prettier = require('prettier');
const plugin = require('../index');

test('formats simple assignment', () => {
  const input = 'name=value';
  const output = prettier.format(input, {
    parser: 'mylang-parser',
    plugins: [plugin],
  });

  expect(output).toBe('name = value;\n');
});

test('formats multiple assignments', () => {
  const input = 'a=1\nb=2\nc=3';
  const output = prettier.format(input, {
    parser: 'mylang-parser',
    plugins: [plugin],
  });

  expect(output).toBe('a = 1;\nb = 2;\nc = 3;\n');
});

test('preserves comments', () => {
  const input = '// This is a comment\nname=value';
  const output = prettier.format(input, {
    parser: 'mylang-parser',
    plugins: [plugin],
  });

  expect(output).toContain('// This is a comment');
  expect(output).toContain('name = value;');
});

test('respects tab width option', () => {
  // Input with nested structure
  const input = 'config.port=8080';
  const output = prettier.format(input, {
    parser: 'mylang-parser',
    plugins: [plugin],
    tabWidth: 4,
  });

  expect(output).toMatch(/^\s{4}/);
});
```

## Plugin Distribution

### Package Structure
```json
// my-prettier-plugin/package.json
{
  "name": "prettier-plugin-mylang",
  "version": "1.0.0",
  "description": "Prettier plugin for MyLang",
  "main": "index.js",
  "files": ["index.js", "parser.js", "printer.js"],
  "keywords": ["prettier", "prettier-plugin"],
  "peerDependencies": {
    "prettier": ">=3.0.0"
  },
  "devDependencies": {
    "prettier": "^3.0.0",
    "jest": "^29.0.0"
  },
  "scripts": {
    "test": "jest",
    "prettier": "prettier --write ."
  }
}
```

## Key Points
- Plugin structure: languages, parsers, printers, options
- Languages array defines supported file extensions and names
- Parser converts text to AST with locStart/locEnd helpers
- Printer converts AST nodes back to formatted text
- Doc builders (hardline, group, indent, line) create flexible output
- Plugin options extend Prettier's configuration surface
- Embed support enables formatting within other languages
- tests verify formatting correctness
- peerDependencies ensures Prettier version compatibility
- Plugin auto-discovery in Prettier 3.x
- Language identifiers match Linguist for GitHub detection
- astFormat must match between parser and printer
- Callback functions (canAttachComment) customize comment handling
- MassageAstNode cleans up non-standard AST properties
- InsertParens controls parenthesization logic
- Doc IR enables advanced formatting with line-splitting
- Group doc tries to fit content on one line
- Fill doc fills lines like paragraphs
- Align doc indents content relative to parent
- IfBreak doc switches content based on line breaks
- Indent doc adds indentation to nested content
- Line doc represents a potential line break
- Hardline/softline enforce or allow line breaks
- Literal doc inserts raw text unchanged
- Plugin testing with snapshot tests
- Embed handlers format embedded languages (SQL in strings)
- Multi-parse support for template languages
