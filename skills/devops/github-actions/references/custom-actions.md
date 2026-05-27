# Custom GitHub Actions Development

## Overview
Custom actions encapsulate reusable automation logic. GitHub supports three action types: Docker containers, JavaScript/TypeScript, and composite actions. This reference covers action development, metadata files, inputs/outputs, testing, and distribution.

## Action Types

### Composite Action
```yaml
# .github/actions/setup/action.yml
name: 'Setup Environment'
description: 'Setup Node.js, install dependencies, and configure tools'
inputs:
  node-version:
    description: 'Node.js version'
    required: true
    default: '18'
  install-deps:
    description: 'Whether to install dependencies'
    default: 'true'
  registry-url:
    description: 'NPM registry URL'
    required: false

outputs:
  node-path:
    description: 'Node.js executable path'
    value: ${{ steps.node-path.outputs.path }}

runs:
  using: 'composite'
  steps:
    - name: Setup Node.js
      id: setup-node
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        registry-url: ${{ inputs.registry-url }}

    - name: Get Node path
      id: node-path
      shell: bash
      run: echo "path=$(which node)" >> $GITHUB_OUTPUT

    - name: Install dependencies
      if: inputs.install-deps == 'true'
      shell: bash
      run: npm ci
      env:
        NODE_AUTH_TOKEN: ${{ inputs.registry-url && env.NODE_AUTH_TOKEN || '' }}
```

### JavaScript Action
```javascript
// .github/actions/deploy-notify/index.js
const core = require('@actions/core');
const github = require('@actions/github');
const fetch = require('node-fetch');

async function run() {
  try {
    const webhookUrl = core.getInput('webhook-url', { required: true });
    const message = core.getInput('message') || 'Deployment completed';
    const status = core.getInput('status') || 'success';

    const payload = {
      text: message,
      attachments: [{
        color: status === 'success' ? '#36a64f' : '#ff0000',
        fields: [
          { title: 'Repository', value: github.context.repo.repo, short: true },
          { title: 'Branch', value: github.context.ref, short: true },
          { title: 'Commit', value: github.context.sha.substring(0, 7), short: true },
          { title: 'Actor', value: github.context.actor, short: true },
        ],
      }],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      core.setFailed(`Webhook returned ${response.status}`);
    }

    core.setOutput('response-status', response.status);
    core.setOutput('timestamp', new Date().toISOString());

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
```

```yaml
# .github/actions/deploy-notify/action.yml
name: 'Deploy Notification'
description: 'Send deployment notifications to Slack/Teams'
inputs:
  webhook-url:
    description: 'Webhook URL for notification'
    required: true
  message:
    description: 'Notification message'
    required: false
  status:
    description: 'Deployment status'
    required: false
    default: 'success'

outputs:
  response-status:
    description: 'HTTP response status code'
  timestamp:
    description: 'Notification timestamp'

runs:
  using: 'node20'
  main: 'index.js'
```

```json
// .github/actions/deploy-notify/package.json
{
  "name": "deploy-notify",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@actions/core": "^1.10.0",
    "@actions/github": "^6.0.0",
    "node-fetch": "^2.7.0"
  }
}
```

### Docker Action
```dockerfile
# .github/actions/lint-check/Dockerfile
FROM alpine:3.18

RUN apk add --no-cache shellcheck

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

```yaml
# .github/actions/lint-check/action.yml
name: 'Lint Check'
description: 'Run ShellCheck on shell scripts'
inputs:
  path:
    description: 'Path to check'
    required: true
    default: '.'
  severity:
    description: 'Minimum severity level'
    default: 'style'
    required: false

runs:
  using: 'docker'
  image: 'Dockerfile'
  args:
    - ${{ inputs.path }}
    - ${{ inputs.severity }}
```

## Action Metadata

### Full action.yml Schema
```yaml
name: 'Action Name'
author: 'Author Name'
description: 'Description of the action'

branding:
  icon: 'activity'  # Feather icon name
  color: 'blue'     # One of: white, yellow, blue, green, orange, red, purple, gray, dark

inputs:
  input-name:
    description: 'Input description'
    required: true
    default: 'default-value'
    deprecationMessage: 'Use new-input-name instead'

outputs:
  output-name:
    description: 'Output description'
    value: ${{ steps.step-id.outputs.result }}

runs:
  using: 'node20'
  main: 'dist/index.js'
  pre: 'setup.js'
  post: 'cleanup.js'
  post-if: success()
```

## Testing Actions

### Unit Tests
```typescript
// __tests__/action.test.ts
import * as core from '@actions/core';
import { run } from '../src/main';

jest.mock('@actions/core');
jest.mock('@actions/github', () => ({
  context: {
    repo: { repo: 'test-repo', owner: 'test-owner' },
    ref: 'refs/heads/main',
    sha: 'abc123',
    actor: 'test-user',
  },
}));

describe('Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'webhook-url': 'https://hooks.example.com/test',
        message: 'Test message',
      };
      return inputs[name];
    });
  });

  it('should send notification successfully', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await run();

    expect(core.setOutput).toHaveBeenCalledWith('response-status', 200);
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('should handle webhook failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    await run();

    expect(core.setFailed).toHaveBeenCalledWith('Webhook returned 500');
  });

  it('should handle missing required input', async () => {
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      if (name === 'webhook-url') throw new Error('Input required');
      return '';
    });

    await run();

    expect(core.setFailed).toHaveBeenCalled();
  });
});
```

## Development Workflow

### Action Development Setup
```bash
# Create action structure
mkdir -p .github/actions/my-action
cd .github/actions/my-action

# Initialize for JavaScript action
npm init -y
npm install @actions/core @actions/github
npm install -D @types/node typescript jest

# Build and package
npm run build
npm run test

# For composite actions - no build needed
# Simply reference in workflow
```

### Versioning Strategy
```yaml
# Release with semantic versioning
# v1.0.0, v1.1.0, v2.0.0

# Create major version tag
git tag -a v1 -m "v1 release"
git push origin v1

# Update major tag on minor/patch releases
git tag -fa v1 -m "Update v1 tag"
git push origin v1 --force

# Reference in workflows
uses: org/my-action@v1    # Major version
uses: org/my-action@v1.2  # Minor version
uses: org/my-action@v1.2.3  # Exact version
```

## Key Points
- Three action types: composite, JavaScript, Docker
- Composite actions compose multiple steps without build
- JavaScript actions use @actions/core for input/output
- Docker actions allow any language with containerization
- Action metadata (action.yml) defines interface contracts
- Branding configures the icon and color in Marketplace
- Pre/post steps enable setup and cleanup phases
- Semantic versioning with major version tags
- Tests should mock @actions/core and @actions/github
- Package actions with ncc for zero-dependency distribution
- Composite actions support shell steps natively
- Docker actions provide full environment control
- Publish to Marketplace for public distribution
