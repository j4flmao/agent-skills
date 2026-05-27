# VS Code Tasks and Launch Configurations

## Overview
VS Code tasks automate build, test, and lint operations. Launch configurations define debugging sessions for various runtimes. Together they provide integrated development workflows.

## Task Configuration

### Basic Tasks
```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Build Project",
      "type": "npm",
      "script": "build",
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": ["$tsc"],
      "presentation": {
        "reveal": "always",
        "panel": "dedicated",
        "group": "build"
      }
    },
    {
      "label": "Run Tests",
      "type": "shell",
      "command": "npm test",
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "dedicated"
      }
    },
    {
      "label": "Watch Mode",
      "type": "npm",
      "script": "watch",
      "isBackground": true,
      "problemMatcher": "$tsc-watch",
      "presentation": {
        "reveal": "never"
      }
    }
  ]
}
```

### Shell Tasks
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Lint All Files",
      "type": "shell",
      "command": "npx eslint src/ --ext .ts,.tsx",
      "group": "build",
      "presentation": {
        "reveal": "silent"
      },
      "problemMatcher": {
        "owner": "eslint",
        "pattern": [
          {
            "regexp": "^(.*):(\\d+):(\\d+):\\s+(error|warning|info)\\s+(.*)\\s+(.*)$",
            "file": 1,
            "line": 2,
            "column": 3,
            "severity": 4,
            "message": 5,
            "code": 6
          }
        ]
      }
    },
    {
      "label": "Type Check",
      "type": "shell",
      "command": "npx tsc --noEmit",
      "group": "build",
      "problemMatcher": "$tsc"
    },
    {
      "label": "Run All Tests",
      "type": "shell",
      "command": "npx vitest run",
      "group": "test",
      "problemMatcher": "$jest"
    }
  ]
}
```

### Compound Tasks
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Full Check",
      "dependsOn": ["Lint All Files", "Type Check", "Run All Tests"],
      "dependsOrder": "sequence",
      "presentation": {
        "reveal": "always",
        "panel": "dedicated",
        "showReuseMessage": false
      }
    },
    {
      "label": "Quick Check",
      "dependsOn": ["Lint All Files", "Type Check"],
      "dependsOrder": "parallel"
    }
  ]
}
```

### Background Tasks
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Dev Server",
      "type": "npm",
      "script": "dev",
      "isBackground": true,
      "problemMatcher": {
        "pattern": [
          {
            "regexp": ".",
            "file": 1
          }
        ],
        "background": {
          "beginsPattern": ".*(ready|started|listening).*",
          "endsPattern": ".*(error|failed).*"
        }
      },
      "presentation": {
        "group": "dev"
      }
    },
    {
      "label": "Start API Server",
      "type": "shell",
      "command": "dotnet run --project src/Api",
      "isBackground": true,
      "problemMatcher": [],
      "presentation": {
        "group": "dev"
      }
    }
  ]
}
```

## Launch Configurations

### Node.js Debugging
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/index.ts",
      "preLaunchTask": "tsc: build - tsconfig.json",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "sourceMaps": true,
      "env": {
        "NODE_ENV": "development",
        "PORT": "3000"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Process",
      "port": 9229,
      "restart": true,
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/app"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current File",
      "program": "${file}",
      "runtimeArgs": [
        "--require",
        "ts-node/register"
      ],
      "sourceMaps": true,
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Run Tests (Current File)",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["vitest", "run", "${relativeFile}"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Browser Debugging
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome against localhost",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}",
      "sourceMapPathOverrides": {
        "webpack:///src/*": "${webRoot}/src/*"
      },
      "preLaunchTask": "Start Dev Server",
      "userDataDir": "${workspaceFolder}/.vscode/chrome-debug-profile"
    },
    {
      "type": "msedge",
      "request": "launch",
      "name": "Launch Edge against localhost",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    },
    {
      "type": "chrome",
      "request": "attach",
      "name": "Attach to Chrome",
      "port": 9222,
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

### Python Debugging
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "debugpy",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "app.main:app",
        "--reload",
        "--port",
        "8000"
      ],
      "jinja": true,
      "justMyCode": true,
      "env": {
        "DATABASE_URL": "postgresql://localhost:5432/mydb"
      }
    },
    {
      "name": "Python: Current File",
      "type": "debugpy",
      "request": "launch",
      "program": "${file}",
      "console": "integratedTerminal",
      "justMyCode": false
    },
    {
      "name": "Python: Django",
      "type": "debugpy",
      "request": "launch",
      "program": "${workspaceFolder}/manage.py",
      "args": ["runserver", "0.0.0.0:8000"],
      "django": true
    },
    {
      "name": "Python: Test File",
      "type": "debugpy",
      "request": "launch",
      "module": "pytest",
      "args": [
        "${file}",
        "-v"
      ],
      "console": "integratedTerminal"
    }
  ]
}
```

### Compound Launch
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "API Server",
      "program": "${workspaceFolder}/api/src/index.ts",
      "preLaunchTask": "Build API"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Web Server",
      "program": "${workspaceFolder}/web/node_modules/.bin/vite",
      "args": ["--port", "3000"],
      "console": "integratedTerminal"
    }
  ],
  "compounds": [
    {
      "name": "Full Stack",
      "configurations": ["API Server", "Web Server"],
      "stopAll": true,
      "preLaunchTask": "Build All"
    }
  ]
}
```

## Variables Reference

### Common Variables
```json
{
  "${workspaceFolder}": "Root workspace path",
  "${workspaceFolderBasename}": "Workspace folder name",
  "${file}": "Current open file",
  "${fileWorkspaceFolder}": "Workspace folder of current file",
  "${relativeFile}": "File path relative to workspace",
  "${fileBasename}": "Current file name",
  "${fileBasenameNoExtension}": "File name without extension",
  "${fileDirname}": "Directory of current file",
  "${fileExtname}": "Extension of current file",
  "${cwd}": "Current working directory",
  "${lineNumber}": "Current active line number",
  "${selectedText}": "Current selected text",
  "${execPath}": "Path to VS Code executable",
  "${defaultBuildTask}": "Default build task name",
  "${env:VARIABLE}": "Environment variable",
  "${config:setting}": "VS Code setting value",
  "${command:commandID}": "Command output"
}
```

## Key Points
- tasks.json defines build, test, and automation tasks
- Shell tasks run arbitrary commands with problem matchers
- npm tasks run package.json scripts
- Compound tasks chain multiple tasks together
- Background tasks run continuously (dev servers)
- Problem matchers parse output for errors/warnings
- Presentation controls terminal panel behavior
- launch.json configures debugger sessions
- Node.js debugging supports source maps and TypeScript
- Browser debugging launches Chrome/Edge with source maps
- Compound launch sessions debug multiple processes
- Pre-launch tasks run before debugging starts
- Variables reference workspace, file, and environment
- JustMyCode skips library code in debugging
- Remote attach connects to running processes
- Watch variables track expression values
- Debug console evaluates expressions
- Breakpoints support conditions, hit counts, and log points
- Function breakpoints break on function entry
- Exception breakpoints catch thrown errors
- Restart frame re-executes current function
- Step filters skip specific code paths
- Launch.target selects debug target type
- ServerReadyAction opens browser when server starts
- Debug configurations can inherit from other configs
- Multi-root workspaces support folder-specific tasks
- Task output encoding configures terminal character set
