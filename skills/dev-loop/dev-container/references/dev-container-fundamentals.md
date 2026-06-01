# Dev Container Fundamentals

## Overview
Dev containers provide reproducible, isolated development environments defined as code. A single .devcontainer/devcontainer.json with a Dockerfile or image reference ensures every developer gets the exact same tools and configuration.

## Core Concepts

### Concept 1: devcontainer.json
The configuration file defines: image or Dockerfile, features (pre-packaged tool installers), VS Code settings/extensions, post-create commands, mount points, forwarded ports, and remote user. Each environment variable, extension, and tool is explicitly declared.

### Concept 2: Base Image Selection
Choose from Microsoft base images (ubuntu, debian, alpine, mcr.microsoft.com/devcontainers/universal), language-specific images (dotnet, node, python, java, rust), or custom Dockerfile. Start slim (full universal image is 10GB+), layer features for tools.

### Concept 3: Features
Self-contained units of installation logic: common-utils (zsh, git, curl), language-specific (dotnet, node, python, rust), database clients (docker-in-docker, sqlite, postgres), and CLI tools (azure-cli, gh, terraform). Features are idempotent and run as scripts after image build.

### Concept 4: Lifecycle Hooks
Ordered hooks: onCreate (run once per container lifetime, after container created), updateContentCommand (run after repo cloned), postCreateCommand (run after container ready), postStartCommand (run every start), and postAttachCommand (run per VS Code attach).

### Concept 5: Volume and Mount Management
Bind mounts for source code (fast, changes reflected both ways), named volumes for persistence (node_modules, ~/.nuget, ~/.cache), tmpfs for ephemeral workspace, and SSH agent forwarding for git operations.

## Best Practices

- Start with minimal base image (add features as needed)
- Pin image tags (never :latest)
- Lock feature versions
- Use lifecycle hooks for setup (not Dockerfile RUN)
- Separate tooling from source mounts
- Forward Docker socket (docker-in-docker) when needed
- Include project-specific VS Code extensions
- Set resource limits (memory, CPUs)
- Keep image build fast (leverage cache)

## Anti-Patterns

- Universal image for everything (slow pulls, 10GB+)
- No feature version pinning (unexpected changes)
- All setup in Dockerfile (slow rebuilds)
- Sensitive data in devcontainer.json (committed to repo)
- Modifying container state outside devcontainer.json (unreproducible)
- Not using lifecycle hooks appropriately
- Missing .dockerignore (build context too large)
- No resource limits (consumes host resources)
