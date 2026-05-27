# VS Code Extension Development

## Overview
VS Code extensions enhance the editor with language support, debugging, commands, themes, and custom UI. Extensions use TypeScript/JavaScript and the VS Code Extension API.

## Extension Structure

### Project Setup
```json
// package.json
{
  "name": "my-extension",
  "displayName": "My Extension",
  "version": "0.0.1",
  "description": "VS Code extension example",
  "publisher": "my-publisher",
  "license": "MIT",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "Programming Languages",
    "Linters",
    "Formatters",
    "Snippets"
  ],
  "keywords": ["mylang", "formatter"],
  "activationEvents": [
    "onLanguage:typescript",
    "onCommand:extension.helloWorld",
    "onStartupFinished"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [],
    "configuration": {},
    "languages": [],
    "grammars": [],
    "snippets": [],
    "keybindings": []
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "lint": "eslint src/"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "typescript": "^5.3.0",
    "@vscode/test-electron": "^2.3.0"
  }
}
```

### Activation
```typescript
// src/extension.ts
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension activated');

  // Register commands
  const disposable = vscode.commands.registerCommand(
    'extension.helloWorld',
    () => {
      vscode.window.showInformationMessage('Hello World!');
    }
  );
  context.subscriptions.push(disposable);

  // Register event listeners
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.languageId === 'typescript') {
        console.log('TypeScript file changed');
      }
    })
  );

  // Register providers
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { language: 'typescript' },
      new MyCompletionProvider(),
      '.'
    )
  );
}

export function deactivate() {
  console.log('Extension deactivated');
}
```

## Commands

### Command Registration
```typescript
// src/commands.ts
import * as vscode from 'vscode';

export function registerCommands(context: vscode.ExtensionContext) {
  // Simple command
  const helloCommand = vscode.commands.registerCommand(
    'extension.sayHello',
    (name?: string) => {
      vscode.window.showInformationMessage(
        `Hello, ${name || 'World'}!`
      );
    }
  );

  // Command with progress
  const progressCommand = vscode.commands.registerCommand(
    'extension.doLongTask',
    async () => {
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Running long task...',
        cancellable: true,
      }, async (progress, token) => {
        token.onCancellationRequested(() => {
          console.log('Task cancelled');
        });

        for (let i = 0; i <= 100; i += 10) {
          progress.report({ increment: 10, message: `${i}%` });
          await delay(500);
        }
      });
    }
  );

  // Command requiring configuration
  const configCommand = vscode.commands.registerCommand(
    'extension.configureExtension',
    async () => {
      const config = vscode.workspace.getConfiguration('myExtension');
      const value = await vscode.window.showInputBox({
        prompt: 'Enter configuration value',
        value: config.get<string>('settingName'),
      });
      if (value) {
        await config.update('settingName', value, true);
      }
    }
  );

  context.subscriptions.push(helloCommand, progressCommand, configCommand);
}
```

## Language Features

### Completion Provider
```typescript
// src/providers/completion.ts
import * as vscode from 'vscode';

class MyCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    const linePrefix = document.lineAt(position).text.slice(0, position.character);

    // Return completions based on context
    const completions: vscode.CompletionItem[] = [];

    if (linePrefix.endsWith('console.')) {
      completions.push(
        createCompletionItem('log', 'Console log', vscode.CompletionItemKind.Method),
        createCompletionItem('warn', 'Console warning', vscode.CompletionItemKind.Method),
        createCompletionItem('error', 'Console error', vscode.CompletionItemKind.Method)
      );
    }

    if (linePrefix.match(/import\s+.*from\s+['"]$/)) {
      // Module import completions
      completions.push(
        createCompletionItem('react', 'React library', vscode.CompletionItemKind.Module),
        createCompletionItem('lodash', 'Lodash utilities', vscode.CompletionItemKind.Module)
      );
    }

    return completions;
  }
}

function createCompletionItem(
  label: string,
  detail: string,
  kind: vscode.CompletionItemKind
): vscode.CompletionItem {
  const item = new vscode.CompletionItem(label, kind);
  item.detail = detail;
  item.insertText = label;
  return item;
}
```

### Hover Provider
```typescript
// src/providers/hover.ts
import * as vscode from 'vscode';

class MyHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) return null;

    const word = document.getText(wordRange);

    const documentation = getDocumentation(word);
    if (documentation) {
      const markdown = new vscode.MarkdownString(documentation);
      markdown.isTrusted = true;
      return new vscode.Hover(markdown);
    }

    return null;
  }
}
```

## WebView Panel

### Custom UI
```typescript
// src/panels/webview.ts
import * as vscode from 'vscode';

export class MyWebviewPanel {
  public static currentPanel: MyWebviewPanel | undefined;
  private _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._panel.webview.html = this._getHtmlContent();

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case 'alert':
            vscode.window.showInformationMessage(message.text);
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public static show(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (MyWebviewPanel.currentPanel) {
      MyWebviewPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'myWebview',
      'My Custom View',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    MyWebviewPanel.currentPanel = new MyWebviewPanel(panel, extensionUri);
  }

  private _getHtmlContent(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          button { padding: 10px; margin: 5px; }
        </style>
      </head>
      <body>
        <h1>My Extension UI</h1>
        <button onclick="sendMessage()">Click Me</button>
        <script>
          const vscode = acquireVsCodeApi();
          function sendMessage() {
            vscode.postMessage({
              command: 'alert',
              text: 'Button clicked from webview'
            });
          }
        </script>
      </body>
      </html>
    `;
  }
}
```

## Testing

### Extension Tests
```typescript
// src/test/extension.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('publisher.my-extension'));
  });

  test('Should register commands', async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes('extension.helloWorld'));
  });

  test('Should execute command', async () => {
    const result = await vscode.commands.executeCommand(
      'extension.helloWorld'
    );
    assert.strictEqual(result, undefined);
  });
});
```

## Key Points
- Activation events define when extensions load
- Commands are registered with unique identifiers
- Providers (completion, hover, definition) extend language features
- WebView panels render custom HTML UI
- Disposables manage resource cleanup
- ExtensionContext provides workspace storage
- Contribution points define UI additions (commands, menus, keybindings)
- Configuration contributes settings
- Snippet extension provides template completions
- Language grammars (TextMate) provide syntax highlighting
- Debug adapter protocol integrates debuggers
- Workspace edits apply text changes across files
- Diagnostic collections report problems
- Status bar items display custom information
- Quick pick UI shows selection lists
- Tree views display hierarchical data
- Terminal API integrates shell operations
- Task providers define build/test tasks
- Virtual file system provides custom file access
- Extension host isolates extensions for security
- Marketplace publishes extensions for distribution
- Testing with @vscode/test-electron simulates editor
- Telemetry collects usage data
- Authentication API handles user sign-in
- Language status items show language-specific info
- Notebook API supports custom notebook types
