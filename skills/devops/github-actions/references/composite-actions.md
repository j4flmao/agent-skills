# Composite Actions

## Basic Structure

```yaml
# .github/actions/setup-node/action.yml
name: "Setup Node.js"
description: "Setup Node with npm cache"
inputs:
  node-version:
    description: "Node.js version"
    required: false
    default: "22"
  registry-url:
    description: "npm registry URL"
    required: false

outputs:
  cache-hit:
    description: "Whether npm cache was hit"
    value: ${{ steps.cache.outputs.cache-hit }}

runs:
  using: "composite"
  steps:
    - uses: actions/setup-node@v4
      id: setup
      with:
        node-version: ${{ inputs.node-version }}
        registry-url: ${{ inputs.registry-url }}

    - name: Cache npm
      id: cache
      uses: actions/cache@v4
      with:
        path: ~/.npm
        key: npm-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
        restore-keys: |
          npm-${{ runner.os }}-

    - run: npm ci
      shell: bash
```

## Using a Composite Action

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-node
        with:
          node-version: "22"
      - run: npm test
```

## Publishing Composite Actions

```yaml
# action.yml (root of public repo)
name: "My Composite Action"
description: "Does something useful"
author: "org"
branding:
  icon: "activity"
  color: "blue"

inputs:
  input-1:
    description: "Some input"
    required: true

outputs:
  result:
    description: "Action output"
    value: ${{ steps.main.outputs.result }}

runs:
  using: "composite"
  steps:
    - id: main
      run: echo "result=done" >> $GITHUB_OUTPUT
      shell: bash
```

## Calling Published Actions

```yaml
steps:
  - uses: org/my-composite-action@v1
    with:
      input-1: value
```

## Shell Requirement

Composite action steps must explicitly specify `shell:`:

```yaml
runs:
  using: "composite"
  steps:
    - run: echo "Hello"
      shell: bash
    - run: Write-Output "Hello"
      shell: pwsh
    - run: echo "Hello"
      shell: sh
```

## Best Practices

- Always specify `shell:` for `run` steps
- Use `id:` on steps to reference their outputs
- Document all `inputs` and `outputs` with descriptions
- Add `branding` when publishing to the marketplace
- Keep composite actions focused — one concern per action
- Avoid secrets in inputs — use `${{ secrets.X }}` in the caller workflow
- Test local actions before publishing by referencing the path
