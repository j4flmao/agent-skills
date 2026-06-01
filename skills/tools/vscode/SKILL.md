# VS Code Skill

## Overview
VS Code is a lightweight but powerful code editor with extensive extension ecosystem, integrated debugging, and task automation. This skill covers workspace configuration, extension development, debugging setup, and productivity patterns.

## Decision Tree: Editor Setup

### Extension Selection
```
What do I need to do?
├── Write TypeScript/JavaScript → ESLint, Prettier, TypeScript + Volar
├── Write Python → Python extension, Pylance, Ruff
├── Write Go → Go extension (gopls)
├── Write Rust → rust-analyzer, crates, TOML
├── Write Java → Extension Pack for Java
├── Write C# → C# Dev Kit
├── Write CSS/Tailwind → Tailwind CSS IntelliSense, PostCSS
└── General → GitLens, Error Lens, Path Intellisense, GitHub Copilot
```

### Workspace vs User Settings
```
Which settings file?
├── Setting applies to all projects → User settings (settings.json)
├── Setting is project-specific → Workspace settings (.vscode/settings.json)
│   e.g., formatter, lint config, debug config
├── Setting should be shared with team → Workspace settings (committed to repo)
├── Setting is personal preference → User settings (NOT committed)
└── Task/debug config → Always workspace (.vscode/tasks.json, .vscode/launch.json)
```

## Workspace Configuration

### Recommended Workspace Settings
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "editor.minimap.enabled": false,
  "editor.renderWhitespace": "boundary",
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": true,
  "editor.suggestSelection": "first",
  "editor.stickyScroll.enabled": true,
  "files.autoSave": "onFocusChange",
  "files.exclude": {
    "**/node_modules": true,
    "**/.git": true,
    "**/dist": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true,
    "pnpm-lock.yaml": true
  },
  "typescript.updateImportsOnFileMove.enabled": "always",
  "javascript.updateImportsOnFileMove.enabled": "always",
  "workbench.startupEditor": "none",
  "workbench.editor.enablePreview": false
}
```

### Language-Specific Settings
```json
{
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true
  },
  "[markdown]": {
    "editor.wordWrap": "on",
    "editor.quickSuggestions": {
      "comments": "on",
      "strings": "on",
      "other": "on"
    }
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## Extension Development Patterns

### Extension Structure Decision Tree
```
What kind of extension?
├── Add commands → package.json commands + activation handler
├── Language features → Provider pattern (Completion, Hover, Definition, etc.)
├── Custom UI → WebView panel with HTML/JS
├── Theme → Color theme .json file
├── Snippet → Just JSON snippets file
├── Debugger → Debug Adapter Protocol implementation
└── Language support → Language server (LSP) — separate process
```

### Activation Event Strategy
```json
{
  "activationEvents": [
    "onLanguage:typescript",
    "onCommand:extension.myCommand",
    "onStartupFinished"
  ]
}
```

Choose specific activation over `"*"` for performance.

### Provider Pattern
```typescript
// Register providers in activate()
export function activate(context: vscode.ExtensionContext) {
  // Completion provider
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language: 'typescript' },
      new MyCompletionProvider(),
      '.', '"', "'"
    )
  );

  // Diagnostic provider
  context.subscriptions.push(
    vscode.languages.createDiagnosticCollection('my-linter')
  );

  // Code action provider
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file', language: 'typescript' },
      new MyCodeActionProvider()
    )
  );
}
```

### Disposable Management Pattern
```typescript
// GOOD: Add all disposables to context.subscriptions
context.subscriptions.push(
  vscode.commands.registerCommand('ext.myCommand', handler),
  vscode.workspace.onDidChangeTextDocument(listener),
  vscode.window.registerTreeDataProvider('myView', provider),
);

// BAD: Never clean up event listeners
// vscode.workspace.onDidChangeTextDocument(listener)  // Memory leak!
```

## Debugging Setup

### Debug Configuration Decision Tree
```
What am I debugging?
├── Node.js app → "type": "node"
├── Browser app → "type": "chrome" or "type": "msedge"
├── Python app → "type": "debugpy"
├── Docker container → "type": "node" with attach
├── Multiple processes → Compound launch config
└── Tests → Custom runtime exec with test runner
```

### Node.js Debugging Patterns
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch API",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/index.ts",
      "runtimeArgs": ["--loader", "ts-node/esm"],
      "env": { "NODE_ENV": "development", "PORT": "3000" },
      "skipFiles": ["<node_internals>/**"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "sourceMaps": true,
      "console": "integratedTerminal",
      "preLaunchTask": "Build"
    },
    {
      "name": "Attach to Remote",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "restart": true,
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/app"
    }
  ],
  "compounds": [
    {
      "name": "Full Stack",
      "configurations": ["Launch API", "Launch Web"],
      "stopAll": true
    }
  ]
}
```

### Test Debugging Pattern
```json
{
  "name": "Debug Tests",
  "type": "node",
  "request": "launch",
  "runtimeExecutable": "npx",
  "runtimeArgs": ["jest", "--runInBand", "--testNamePattern"],
  "args": ["${fileBasenameNoExtension}"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Task Automation

### Task Types Decision
```
What kind of automation?
├── Run npm script → "type": "npm"
├── Run shell command → "type": "shell"
├── Run compiler → "type": "typescript" or shell
├── Run long-lived process → "isBackground": true
├── Run multiple tasks → Compound task with dependsOn
└── Parse output for errors → problemMatcher
```

### Problem Matcher Patterns
```json
{
  "label": "Lint",
  "type": "shell",
  "command": "npx eslint src/ --format compact",
  "problemMatcher": {
    "owner": "eslint",
    "severity": "warning",
    "pattern": [
      {
        "regexp": "^(.+): line (\\d+), col (\\d+), (Error|Warning) - (.+) \\((.+)\\)$",
        "file": 1,
        "line": 2,
        "column": 3,
        "severity": 4,
        "message": 5,
        "code": 6
      }
    ]
  }
}
```

## Productivity Patterns

### Keyboard Shortcuts
```json
// Cmd+K Cmd+S to open keyboard shortcuts
{
  "key": "ctrl+shift+h",
  "command": "editor.action.goToSymbol",
  "when": "editorTextFocus"
},
{
  "key": "alt+up",
  "command": "editor.action.moveLinesUpAction",
  "when": "editorTextFocus"
},
{
  "key": "alt+down",
  "command": "editor.action.moveLinesDownAction",
  "when": "editorTextFocus"
}
```

### Multi-root Workspace
```json
{
  "folders": [
    { "name": "API", "path": "packages/api" },
    { "name": "Web", "path": "packages/web" },
    { "name": "Shared", "path": "packages/shared" }
  ],
  "settings": {
    "typescript.tsdk": "node_modules/typescript/lib"
  },
  "extensions": {
    "recommendations": [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "bradlc.vscode-tailwindcss"
    ]
  }
}
```

### Snippet Creation
```json
{
  "React Component": {
    "prefix": "rfc",
    "body": [
      "import React from 'react';",
      "",
      "interface ${1:ComponentName}Props {",
      "  $2",
      "}",
      "",
      "export function ${1:ComponentName}({ $2 }: ${1:ComponentName}Props) {",
      "  return (",
      "    <div>$3</div>",
      "  );",
      "}",
      ""
    ],
    "description": "React Functional Component"
  }
}
```

## Key Anti-Patterns
- **Installing too many extensions**: Each one slows startup; audit regularly
- **Committing personal settings**: Never commit user settings; always workspace
- **Ignoring TS Server errors**: View Output → TypeScript for diagnostics
- **Not using multi-cursor**: `Ctrl+Shift+L` selects all occurrences
- **Manual file tree navigation**: Use `Ctrl+P` for quick file opening
- **Not configuring `files.exclude`**: Cluttered file explorer reduces focus
- **Using mouse for common operations**: Learn keyboard shortcuts for speed
- **Skipping problem matchers**: Missing inline errors in output panel
- **Not setting `formatOnSave`**: Manual formatting is inconsistent
- **Not using `GitLens` blame annotations**: Reduces git blame context-switching

## Remote Development Patterns

### Dev Containers
```json
{
  "image": "mcr.microsoft.com/devcontainers/typescript-node:1-20",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "customizations": {
    "vscode": {
      "extensions": ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode"]
    }
  },
  "postCreateCommand": "npm install",
  "forwardPorts": [3000, 5173]
}
```

### SSH Remote Pattern
```json
{
  "remote.SSH.showLoginTerminal": true,
  "remote.SSH.defaultExtensions": ["dbaeumer.vscode-eslint"],
  "remote.SSH.configFile": "~/.ssh/config"
}
```
