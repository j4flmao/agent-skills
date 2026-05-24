---
name: backend-plugin-architecture
description: >
  Use this skill when the user says 'plugin system', 'plugin architecture', 'extension point', 'SPI', 'service provider interface', 'hot-plug', 'modular design', 'plugin loader', 'extensible', 'plugin API', 'custom extension', 'plug-in', 'dynamic loading'. This skill designs plugin/extension architecture with SPI, hot-plugging, and modular loading. Applies to any backend stack. Do NOT use for: dependency injection frameworks, micro-frontends, or NPM packages.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, plugin-architecture, extensibility, modular, spi]
---

# Backend Plugin Architecture

## Purpose
Design extensible backend systems where third-party code (plugins) can be loaded dynamically at runtime through well-defined extension points and service provider interfaces (SPI).

## Agent Protocol

### Trigger
Exact user phrases: "plugin system", "plugin architecture", "extension point", "SPI", "service provider interface", "hot-plug", "modular design", "plugin loader", "extensible", "plugin API", "custom extension", "plug-in", "dynamic loading".

### Input Context
- What the host application does and where extensibility is needed.
- Language/runtime (supports dynamic loading?).
- Security requirements for plugin isolation.

### Output Artifact
Plugin system design or implementation code. No file unless requested.

### Response Format
```
Extension Point: {name}
SPI: {interface/contract}
Loading: {dynamic|compile-time|classpath}
Isolation: {classloader|process|container}
```

### Completion Criteria
- [ ] Extension points defined and documented.
- [ ] SPI interface created for each extension point.
- [ ] Plugin loader implemented.
- [ ] Plugin lifecycle (load, init, start, stop, destroy) managed.
- [ ] Isolation and security boundaries established.

### Max Response Length
3 lines per extension point. 20 lines for full system.

## Workflow

### Step 1: Define Extension Points
Identify where the system can be extended:
```yaml
extension-points:
  authentication.provider:  Custom auth provider (LDAP, OAuth, SAML)
  notification.channel:     Custom notification channel (SMS, push, Slack)
  pipeline.step:            Custom build/deploy pipeline step
  storage.backend:          Custom storage backend (S3, GCS, local)
  exporter.metric:          Custom metric exporter (Prometheus, Datadog)
```

### Step 2: Define SPI (Java example)
```java
public interface AuthenticationProvider {
  String getName();
  AuthResult authenticate(Credentials credentials);
  boolean supports(String providerType);
}
```

### Step 3: Implement Plugin Loader
```javascript
// Node.js example — dynamic plugin loading
class PluginLoader {
  constructor(pluginDir) {
    this.pluginDir = pluginDir;
    this.plugins = new Map();
  }

  async loadAll() {
    const entries = await fs.readdir(this.pluginDir);
    for (const entry of entries) {
      if (entry.endsWith('.plugin.js')) {
        const plugin = require(path.join(this.pluginDir, entry));
        this.plugins.set(plugin.name, plugin);
        await plugin.init?.();
      }
    }
  }

  getPlugins(type) {
    return [...this.plugins.values()].filter(p => p.type === type);
  }

  async unload(name) {
    const plugin = this.plugins.get(name);
    await plugin.destroy?.();
    this.plugins.delete(name);
  }
}
```

### Step 4: Manage Plugin Lifecycle
```
LOADED -> INITIALIZED -> STARTED -> STOPPED -> DESTROYED
```
Each plugin exports lifecycle hooks: `init()`, `start()`, `stop()`, `destroy()`.

### Step 5: Isolate Plugins
- Classloader isolation for JVM languages.
- Process isolation (child_process, subprocess) for Node/Python.
- Container isolation (Docker, WASM) for untrusted plugins.

### Step 6: Version Plugin APIs
```json
{
  "name": "my-plugin",
  "apiVersion": "1.0.0",
  "pluginVersion": "2.3.0",
  "entry": "./index.js"
}
```
Check API compatibility at load time.

## Rules
- Extension points are frozen once released — only additive changes allowed.
- Plugins must never access internal APIs — only the public SPI.
- Sandbox untrusted plugins: restrict filesystem, network, and process access.
- Always validate plugin integrity (checksum or signature) before loading.
- Plugin failures must never crash the host application.
- Log all plugin lifecycle events (load, init, start, stop, destroy).
- Provide a plugin manifest with name, version, author, and dependencies.
- Test plugins in isolation before production deployment.

## References
- `references/plugin-implementation.md` — Plugin implementation guide
- `references/plugin-lifecycle.md` — Loading, initialization, dependency resolution, hot-reload, graceful shutdown
- `references/plugin-patterns.md` — Plugin architecture design patterns
- `references/plugin-security.md` — Sandboxing, capability systems, permission models, code signing, resource limits

## Handoff
No artifact produced unless requested.
Next skill: observability — add plugin lifecycle traces to the telemetry pipeline.
Carry forward: extension points, SPI contracts, plugin manifest format.
