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

## Advanced Configuration

### Workspace-Level Settings
Workspace settings override user settings and are shared via `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.preferences.quoteStyle": "single",
  "files.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/dist": true
  },
  "search.exclude": {
    "**/coverage": true,
    "**/__snapshots__": true
  },
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/.next/**": true
  }
}
```

### Recommended Extensions (monorepo pattern)
`.vscode/extensions.json` — share recommended extensions:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "github.vscode-github-actions",
    "ms-azuretools.vscode-docker",
    "eamodio.gitlens",
    "streetsidesoftware.code-spell-checker"
  ],
  "unwantedRecommendations": [
    "hookyqr.beautify",
    "ms-vscode.vscode-typescript-tslint-plugin"
  ]
}
```

### Debugger Configurations
`.vscode/launch.json` — multi-target debugging:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeExecutable": "node",
      "runtimeArgs": ["--loader", "ts-node/esm"],
      "args": ["src/server.ts"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "env": { "NODE_ENV": "development" }
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests (current file)",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--runTestsByPath",
        "${relativeFile}",
        "--config",
        "jest.config.js"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Frontend",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src",
      "sourceMapPathOverrides": {
        "webpack:///src/*": "${webRoot}/*"
      }
    },
    {
      "type": "node-terminal",
      "request": "launch",
      "name": "Run Script (terminal)",
      "command": "npm run dev"
    }
  ],
  "compounds": [
    {
      "name": "Full Stack Debug",
      "configurations": ["Debug Server", "Debug Frontend"],
      "stopAll": true
    }
  ]
}
```

### Tasks for Common Operations
`.vscode/tasks.json` — automate builds, lint, test:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Lint all files",
      "type": "npm",
      "script": "lint",
      "problemMatcher": ["$eslint-stylish"],
      "group": { "kind": "build", "isDefault": true }
    },
    {
      "label": "Run tests with coverage",
      "type": "shell",
      "command": "npx jest --coverage",
      "options": { "cwd": "${workspaceFolder}" },
      "problemMatcher": [],
      "group": { "kind": "test", "isDefault": true }
    },
    {
      "label": "TypeScript compile check",
      "type": "typescript",
      "tsconfig": "tsconfig.json",
      "option": "watch",
      "problemMatcher": ["$tsc-watch"],
      "group": "build"
    }
  ]
}
```

### Keyboard Shortcuts
Keybindings that boost productivity (`keybindings.json`):
```json
[
  {
    "key": "ctrl+shift+h",
    "command": "workbench.action.replaceInFiles",
    "when": "editorFocus"
  },
  {
    "key": "ctrl+alt+l",
    "command": "editor.action.formatDocument"
  },
  {
    "key": "ctrl+shift+enter",
    "command": "workbench.action.terminal.runSelectedText"
  },
  {
    "key": "ctrl+k ctrl+s",
    "command": "workbench.action.files.saveAll"
  },
  {
    "key": "alt+up",
    "command": "editor.action.moveLinesUpAction",
    "when": "editorTextFocus && !editorReadonly"
  },
  {
    "key": "alt+down",
    "command": "editor.action.moveLinesDownAction",
    "when": "editorTextFocus && !editorReadonly"
  }
]
```

### Multi-Root Workspaces
For monorepos with independent projects:
```json
{
  "folders": [
    { "name": "API", "path": "packages/api" },
    { "name": "Web", "path": "packages/web" },
    { "name": "Shared", "path": "packages/shared" }
  ],
  "settings": {
    "typescript.tsdk": "packages/api/node_modules/typescript/lib",
    "eslint.workingDirectories": [
      { "directory": "packages/api", "changeProcessCWD": true },
      { "directory": "packages/web", "changeProcessCWD": true },
      { "directory": "packages/shared", "changeProcessCWD": true }
    ]
  }
}
```

### Extension Development Quick Start
```javascript
// extension.js — minimal command
const vscode = require('vscode');

function activate(context) {
  const disposable = vscode.commands.registerCommand('hello.world', () => {
    vscode.window.showInformationMessage('Hello from my extension!');
  });
  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
```
Run with F5 in the extension development host window.

### Snippets for Code Patterns
`.vscode/component.code-snippets`:
```json
{
  "React Component": {
    "prefix": "rfc",
    "body": [
      "import React from 'react';",
      "",
      "interface ${1:Component}Props {",
      "  $2",
      "}",
      "",
      "export const ${1:Component}: React.FC<${1:Component}Props> = ({ $3 }) => {",
      "  return <div>$4</div>;",
      "};",
      "",
      "export default ${1:Component};"
    ],
    "description": "React functional component with TypeScript"
  },
  "Jest Test Block": {
    "prefix": "describe",
    "body": [
      "describe('${1:feature}', () => {",
      "  beforeEach(() => {",
      "    $2",
      "  });",
      "",
      "  it('should $3', () => {",
      "    $4",
      "  });",
      "});"
    ],
    "description": "Jest test block"
  }
}
```

### Performance Tuning
Settings for large projects (100k+ LOC):
```json
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/build/**": true,
    "**/.next/**": true,
    "**/coverage/**": true
  },
  "search.followSymlinks": false,
  "typescript.tsserver.maxTsServerMemory": 4096,
  "typescript.tsserver.experimental.enableProjectDiagnostics": false,
  "editor.minimap.enabled": true,
  "editor.occurrencesHighlight": false,
  "editor.renderWhitespace": "selection",
  "git.enableStatusBarSync": false,
  "git.autofetch": false,
  "extensions.autoCheckUpdates": false,
  "workbench.startupEditor": "none"
}
```

### Remote Development Patterns

**Dev Containers** (`.devcontainer/devcontainer.json`):
```json
{
  "name": "Node.js 20",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:20",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "forwardPorts": [3000, 5173],
  "postCreateCommand": "npm install",
  "customizations": {
    "vscode": {
      "extensions": ["dbaeumer.vscode-eslint"]
    }
  }
}
```

**SSH Target config** (`~/.ssh/config`):
```
Host dev-server
  HostName 192.168.1.100
  User developer
  IdentityFile ~/.ssh/dev_key
  ForwardAgent yes
```

**Port forwarding** — access remote services locally:
```json
{
  "remote.SSH.showLoginTerminal": true,
  "remote.SSH.forwardX11": false,
  "remote.SSH.path": "C:\\Windows\\System32\\OpenSSH\\ssh.exe"
}
```

### Troubleshooting

**VS Code slow or unresponsive:**
- `Ctrl+Shift+P` → "Developer: Reload Window" — quick restart
- `Ctrl+Shift+P` → "Developer: Startup Performance" — trace bottlenecks
- Disable extensions one by one to find culprit
- Check `Help → Toggle Developer Tools` (Console tab) for errors
- Delete `.vscode` cache: `rm -rf ~/.vscode/CachedData`

**Extensions not working:**
- Check extension output: View → Output → dropdown to select extension
- Verify extension supports current VS Code version
- Check for conflicting extensions (e.g., two formatters)
- `Ctrl+Shift+P` → "Developer: Reload Extensions With Webview Host"

**IntelliSense not working:**
- `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
- Check tsconfig.json is valid and in root
- Check `typescript.tsdk` setting points to correct install
- Delete project's `node_modules/.cache/` and `tsconfig.tsbuildinfo`

**Git integration issues:**
- `Ctrl+Shift+P` → "Git: Open Repository" — accidentally wrong folder?
- Check `git.enabled` setting
- Verify git is installed and on PATH
- Restart Git extension: Developer: Reload Extensions
