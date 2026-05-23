# VS Code Extensions for Dev Containers

## Extension Categories

### Language Support

| Extension | ID | Purpose |
|-----------|----|---------|
| Python | ms-python.python | Python language support, debugger, venv |
| Pylance | ms-python.vscode-pylance | Python type checking, IntelliSense |
| Go | golang.go | Go language support, debugger, tests |
| rust-analyzer | rust-lang.rust-analyzer | Rust language support, inline hints |
| JavaScript/TS | ms-vscode.vscode-typescript-next | TypeScript language features |
| Java Extension Pack | vscjava.vscode-java-pack | Java language, debugger, Maven/Gradle |
| C# | ms-dotnettools.csharp | C# language support, debugger |
| Ruby | rebornix.ruby | Ruby language support, debugger |
| PHP | bmewburn.vscode-intelephense-client | PHP IntelliSense, code navigation |
| Kotlin | fwcd.kotlin | Kotlin language support |

### Linters & Formatters

| Extension | ID | Purpose |
|-----------|----|---------|
| ESLint | dbaeumer.vscode-eslint | JavaScript/TypeScript linting |
| Prettier | esbenp.prettier-vscode | Code formatter (multi-language) |
| Ruff | charliermarsh.ruff | Python linter and formatter |
| Golangci-lint | golang.go | Go linting |
| markdownlint | DavidAnson.vscode-markdownlint | Markdown linting |
| Stylelint | stylelint.vscode-stylelint | CSS/SCSS linting |
| TSLint (legacy) | ms-vscode.vscode-typescript-tslint | Legacy TypeScript linting |

### Testing

| Extension | ID | Purpose |
|-----------|----|---------|
| Jest | Orta.vscode-jest | Jest test runner, inline pass/fail |
| Vitest | ZixuanChen.vitest-explorer | Vitest test explorer |
| Python Test Explorer | LittleFoxTeam.vscode-python-test-adapter | Python test discovery |
| Test Explorer UI | hbenl.vscode-test-explorer | Unified test UI |
| Live Preview | ms-vscode.live-server | Preview HTML/UI tests |
| Coverage Gutters | ryanluker.vscode-coverage-gutters | Code coverage in editor gutter |

### Debuggers

| Extension | ID | Purpose |
|-----------|----|---------|
| Debugger for Chrome | msjsdiag.debugger-for-chrome | Frontend debugging |
| JavaScript Debugger | ms-vscode.js-debug | Node.js & browser debugging (built-in) |
| Python Debugger | ms-python.debugpy | Python remote debugging |
| Go Debugger | golang.go (built-in) | Go Delve integration |
| Java Debugger | vscjava.vscode-java-debug | Java remote debugging |
| .NET Debugger | ms-dotnettools.csharp | .NET debugging |
| Live Share | ms-vscode.live-share | Collaborative debugging |

### DevOps & Containers

| Extension | ID | Purpose |
|-----------|----|---------|
| Docker | ms-azuretools.vscode-docker | Dockerfile, compose, container management |
| Dev Containers | ms-vscode-remote.remote-containers | Open folder in container |
| Remote — SSH | ms-vscode-remote.remote-ssh | SSH remote development |
| WSL | ms-vscode-remote.remote-wsl | WSL development |
| GitHub Actions | github.vscode-github-actions | Workflow file editing |
| Kubernetes | ms-kubernetes-tools.vscode-kubernetes-tools | K8s cluster management |
| Terraform | hashicorp.terraform | Terraform/HCL support |

### Productivity

| Extension | ID | Purpose |
|-----------|----|---------|
| GitLens | eamodio.gitlens | Git blame, history, code lens |
| GitHub Pull Requests | github.vscode-pull-request-github | PR review in-editor |
| Git History | donjayamanne.githistory | Interactive git log |
| Error Lens | usernamehw.errorlens | Inline error display |
| Todo Tree | Gruntfuggly.todo-tree | TODO/FIXME visualization |
| Path Intellisense | christian-kohler.path-intellisense | File path autocomplete |
| Import Cost | wix.vscode-import-cost | Import size display |
| Bracket Pair Colorizer | (built-in since 1.69) | Bracket matching |
| Indent Rainbow | oderwat.indent-rainbow | Indentation coloring |

## Recommended Extension Sets by Stack

### Node.js / TypeScript

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "Orta.vscode-jest",
        "eamodio.gitlens",
        "github.vscode-pull-request-github",
        "Gruntfuggly.todo-tree",
        "christian-kohler.path-intellisense",
        "wix.vscode-import-cost"
      ]
    }
  }
}
```

### Python

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance",
        "charliermarsh.ruff",
        "LittleFoxTeam.vscode-python-test-adapter",
        "ms-python.debugpy",
        "eamodio.gitlens",
        "Gruntfuggly.todo-tree"
      ]
    }
  }
}
```

### Go

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "golang.go",
        "eamodio.gitlens",
        "Gruntfuggly.todo-tree",
        "ms-azuretools.vscode-docker"
      ]
    }
  }
}
```

### Full-Stack (Python + TypeScript)

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance",
        "charliermarsh.ruff",
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "Orta.vscode-jest",
        "ms-azuretools.vscode-docker",
        "eamodio.gitlens",
        "Gruntfuggly.todo-tree",
        "github.vscode-pull-request-github"
      ]
    }
  }
}
```

## VS Code Settings for Dev Containers

### Editor Configuration

```json
{
  "customizations": {
    "vscode": {
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.codeActionsOnSave": {
          "source.fixAll": "explicit",
          "source.organizeImports": "explicit"
        },
        "editor.minimap.enabled": false,
        "editor.renderWhitespace": "boundary",
        "editor.bracketPairColorization.enabled": true,
        "editor.guides.bracketPairs": true,
        "files.autoSave": "onFocusChange",
        "files.exclude": {
          "**/node_modules": true,
          "**/.git": true
        },
        "terminal.integrated.defaultProfile.linux": "zsh",
        "workbench.colorTheme": "Default Dark Modern",
        "workbench.startupEditor": "none",
        "explorer.confirmDragAndDrop": false,
        "explorer.confirmDelete": false,
        "git.enableCommitSigning": true
      }
    }
  }
}
```

### Language-Specific Settings

```json
{
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.codeActionsOnSave": {
      "source.organizeImports": "explicit"
    }
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[go]": {
    "editor.defaultFormatter": "golang.go",
    "editor.formatOnSave": true
  },
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  }
}
```

## Extension Version Pinning

```json
{
  "extensions": [
    "dbaeumer.vscode-eslint@3.0.10",
    "esbenp.prettier-vscode@11.0.0"
  ]
}
```

Version pinning prevents unexpected extension updates from breaking the dev environment. Update intentionally as part of the team's tooling review cycle.

## Managing Extensions Across the Team

- Store extension list in `.devcontainer/devcontainer.json` — single source of truth
- Review extensions quarterly — remove unused, add new standards
- Document why each extension is included (purpose in comments)
- Preferred over `.vscode/extensions.json` for dev container setups
- Avoid niche or experimental extensions — stick to well-maintained ones
