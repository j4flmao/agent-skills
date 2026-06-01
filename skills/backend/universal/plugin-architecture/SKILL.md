---
name: backend-plugin-architecture
description: >
  Use this skill when the user says 'plugin system', 'plugin architecture', 'extension point', 'SPI', 'service provider interface', 'hot-plug', 'modular design', 'plugin loader', 'extensible', 'plugin API', 'custom extension', 'plug-in', 'dynamic loading'. This skill designs plugin/extension architecture with SPI, hot-plugging, and modular loading. Applies to any backend stack. Do NOT use for: dependency injection frameworks, micro-frontends, or NPM packages.
version: "2.0.0"
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
Design extensible backend systems where third-party code (plugins) can be loaded dynamically at runtime through well-defined extension points and service provider interfaces (SPI). A plugin architecture enables the host application to be extended without modifying its core code.

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

## Architecture Decision Tree

### Should I Build a Plugin System?

```
Do you need to support third-party extensions?
  ├── Yes → Plugin architecture
  └── No → Can the functionality be handled by configuration?
            ├── Yes → Use configuration, not plugins
            └── No → Is the extension point stable (won't change monthly)?
                      ├── Yes → Plugin architecture is appropriate
                      └── No → Plugin API will need constant breaking changes — reconsider
```

### Plugin Loading Strategy

```
Can plugins be loaded at runtime without restart?
  ├── Yes → Dynamic loading (hot-plug)
  │   ├── Language supports dynamic loading (JS, Python, Java, .NET, Go plugins)
  │   ├── Plugin discovery via file system scanning or registry
  │   └── Risk: Version conflicts, dependency hell
  └── No → Compile-time loading
      ├── Simpler, safer, no runtime isolation concerns
      ├── Requires recompile/redeploy for new plugins
      └── Use when: Plugin churn is low, safety is critical
```

### Isolation Level

```
Who writes the plugins?
  ├── Internal team (trusted code) → Same process, classloader isolation
  │   ├── Simple, fast, no IPC overhead
  │   └── Risk: Memory corruption, crash propagation
  ├── External contributors (semi-trusted) → Process isolation
  │   ├── Child process or subprocess
  │   ├── IPC for communication
  │   └── Risk: Performance overhead
  └── Third-party (untrusted) → Container or sandbox isolation
      ├── Docker, WASM, or sandboxed environment
      ├── Resource limits enforced at OS level
      └── Highest security, highest overhead
```

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
  payment.gateway:          Custom payment gateway (Stripe, PayPal, Braintree)
```

### Step 2: Define SPI Interface
```java
// Java — AuthenticationProvider SPI
public interface AuthenticationProvider {
  String getName();
  AuthResult authenticate(Credentials credentials);
  boolean supports(String providerType);
  void init(ProviderConfig config);
  void destroy();
}
```

```typescript
// TypeScript — NotificationChannel SPI
export interface NotificationChannel {
  readonly name: string;
  readonly type: string;
  send(notification: Notification): Promise<DeliveryResult>;
  validate(config: ChannelConfig): Promise<ValidationResult>;
}
```

### Step 3: Implement Plugin Loader
```javascript
// Node.js — dynamic plugin loading
class PluginLoader {
  constructor(pluginDir) {
    this.pluginDir = pluginDir;
    this.plugins = new Map();
    this.hooks = {
      beforeLoad: [],
      afterLoad: [],
      beforeUnload: [],
    };
  }

  async loadAll() {
    const entries = await fs.readdir(this.pluginDir);
    const results = [];

    for (const entry of entries) {
      if (entry.endsWith('.plugin.js') || entry.endsWith('.plugin.mjs')) {
        results.push(this.loadPlugin(entry));
      }
    }
    return Promise.all(results);
  }

  async loadPlugin(entry) {
    const pluginPath = path.join(this.pluginDir, entry);
    try {
      await this.runHook('beforeLoad', { entry });

      const plugin = await import(pluginPath);
      const manifest = plugin.manifest || {};

      // Validate plugin manifest
      this.validateManifest(manifest);

      // Check API compatibility
      if (manifest.apiVersion && !this.isCompatible(manifest.apiVersion)) {
        throw new Error(`Plugin ${manifest.name} requires API v${manifest.apiVersion}, host has v${this.hostApiVersion}`);
      }

      // Initialize plugin
      if (plugin.init) {
        await plugin.init({ config: this.config, logger: this.logger });
      }

      this.plugins.set(manifest.name, plugin);
      logger.info(`Plugin loaded: ${manifest.name} v${manifest.version}`);

      await this.runHook('afterLoad', { entry, name: manifest.name });
      return { name: manifest.name, version: manifest.version, success: true };
    } catch (error) {
      logger.error(`Failed to load plugin: ${entry}`, { error });
      return { entry, success: false, error: error.message };
    }
  }

  getPlugins(type) {
    return [...this.plugins.values()].filter(p => p.type === type);
  }

  async unload(name) {
    await this.runHook('beforeUnload', { name });
    const plugin = this.plugins.get(name);
    if (plugin?.destroy) {
      await plugin.destroy();
    }
    this.plugins.delete(name);
    // Clear require cache for reload
    delete require.cache[require.resolve(path.join(this.pluginDir, name))];
    logger.info(`Plugin unloaded: ${name}`);
  }

  async reload(name) {
    await this.unload(name);
    return this.loadPlugin(name);
  }
}
```

### Step 4: Manage Plugin Lifecycle
```
                 ┌──────────┐
                 │ DISCOVERED│
                 └────┬─────┘
                      │ validate manifest
                 ┌────▼─────┐
                 │ VALIDATED │
                 └────┬─────┘
                      │ load code
                 ┌────▼─────┐
                 │  LOADED  │
                 └────┬─────┘
                      │ init(config)
                 ┌────▼─────┐
                 │INITIALIZED│
                 └────┬─────┘
                      │ start()
                 ┌────▼─────┐
                 │ STARTED  │──── active
                 └────┬─────┘
                      │ stop()
                 ┌────▼─────┐
                 │ STOPPED  │
                 └────┬─────┘
                      │ destroy()
                 ┌────▼─────┐
                 │DESTROYED │
                 └──────────┘
```

### Step 5: Isolate Plugins
```javascript
// Process isolation (Node.js child_process)
const { fork } = require('child_process');

class IsolatedPlugin {
  constructor(pluginPath) {
    this.child = fork(pluginPath, [], {
      execArgv: ['--experimental-vm-modules'],
      env: { ...process.env, PLUGIN_ISOLATED: 'true' },
    });
    this.requestId = 0;
    this.pending = new Map();
  }

  async call(method, args) {
    const id = ++this.requestId;
    this.child.send({ type: 'call', id, method, args });

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      // Timeout
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('Plugin call timed out'));
        }
      }, 30000);
    });
  }

  handleMessage(msg) {
    const pending = this.pending.get(msg.id);
    if (pending) {
      this.pending.delete(msg.id);
      if (msg.error) pending.reject(new Error(msg.error));
      else pending.resolve(msg.result);
    }
  }

  kill() {
    this.child.kill();
  }
}
```

### Step 6: Version Plugin APIs
```json
{
  "name": "my-plugin",
  "apiVersion": "1.0.0",
  "pluginVersion": "2.3.0",
  "entry": "./index.js",
  "description": "Custom payment gateway for region-specific processing",
  "author": "Acme Corp",
  "license": "MIT",
  "dependencies": {
    "host-api": "^1.0.0"
  },
  "permissions": ["network:outbound", "storage:read"]
}
```

## Implementation Patterns

### Plugin Registry Pattern
```typescript
interface PluginManifest {
  name: string;
  version: string;
  apiVersion: string;
  description: string;
  author: string;
  permissions: string[];
}

class PluginRegistry {
  private plugins = new Map<string, PluginManifest>();
  private eventBus = new EventEmitter();

  register(plugin: PluginManifest): void {
    this.plugins.set(plugin.name, plugin);
    this.eventBus.emit('plugin:registered', plugin);
  }

  unregister(name: string): void {
    this.plugins.delete(name);
    this.eventBus.emit('plugin:unregistered', name);
  }

  getManifest(name: string): PluginManifest | undefined {
    return this.plugins.get(name);
  }

  listPlugins(): PluginManifest[] {
    return [...this.plugins.values()];
  }

  onEvent(event: string, handler: (data: any) => void): void {
    this.eventBus.on(event, handler);
  }
}
```

### Extension Point Registry
```typescript
class ExtensionPoint<T> {
  private implementations: Map<string, T> = new Map();

  constructor(public readonly name: string) {}

  register(id: string, implementation: T): void {
    if (this.implementations.has(id)) {
      throw new Error(`Extension point ${this.name}: ${id} already registered`);
    }
    this.implementations.set(id, implementation);
  }

  unregister(id: string): void {
    this.implementations.delete(id);
  }

  get(id: string): T | undefined {
    return this.implementations.get(id);
  }

  getAll(): Map<string, T> {
    return new Map(this.implementations);
  }

  get count(): number {
    return this.implementations.size;
  }
}

// Usage
const authProviders = new ExtensionPoint<AuthenticationProvider>('auth.providers');
authProviders.register('oauth-google', new GoogleOAuthProvider());
authProviders.register('ldap', new LDAPProvider());
```

### Plugin Configuration Pattern
```typescript
class PluginConfigManager {
  private configs = new Map<string, object>();

  async loadConfig(pluginName: string): Promise<object> {
    if (this.configs.has(pluginName)) return this.configs.get(pluginName)!;

    try {
      const configPath = path.join(CONFIG_DIR, `${pluginName}.json`);
      const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
      this.configs.set(pluginName, config);
      return config;
    } catch {
      return {};
    }
  }

  async updateConfig(pluginName: string, config: object): Promise<void> {
    this.configs.set(pluginName, config);
    const configPath = path.join(CONFIG_DIR, `${pluginName}.json`);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }
}
```

## Production Considerations

### Plugin Failure Isolation
| Failure Type | Same Process | Subprocess | Container |
|-------------|-------------|------------|-----------|
| Crash | Kills host | Isolated | Isolated |
| Memory leak | Depletes host | Depletes subprocess | Container limit |
| Infinite loop | Blocks host thread | Killed by timeout | OOM killer |
| File system | Full access | Restricted | Read-only |
| Network | Full access | Restricted | Firewall rules |

### Plugin API Compatibility
Use semantic versioning for the plugin API:
- **Major**: Breaking change — plugins must be rewritten
- **Minor**: New feature — backward compatible
- **Patch**: Bug fix — no plugin changes needed

### Resource Limits
```typescript
class PluginResourceLimiter {
  private limits = new Map<string, {
    maxMemory: number;
    maxCpu: number;
    maxFileDescriptors: number;
    maxNetworkConnections: number;
  }>();

  setLimit(pluginName: string, limit: ResourceLimit): void {
    this.limits.set(pluginName, limit);
  }

  enforce(pluginName: string): void {
    const limit = this.limits.get(pluginName);
    if (!limit) return;

    // Check memory usage
    const usage = process.memoryUsage();
    if (usage.heapUsed > limit.maxMemory) {
      throw new Error(`Plugin ${pluginName} exceeded memory limit`);
    }
  }
}
```

## Anti-Patterns

1. **Leaky SPI abstractions**: SPI interfaces that expose host internals create tight coupling. Plugin APIs should be stable, minimal, and abstracted.
2. **No manifest validation**: Loading a plugin without validating its manifest can load incompatible code. Always check apiVersion compatibility.
3. **Shared state**: Plugins mutating shared global state causes unpredictable behavior. Each plugin should have isolated state.
4. **Ignoring plugin lifecycle**: Not managing lifecycle (init, start, stop, destroy) leads to resource leaks and partial initialization.
5. **Plugin dependency hell**: Plugins depending on specific versions of shared libraries causes conflicts. Isolate plugin dependencies.
6. **No resource limits**: An unconstrained plugin can consume all system resources. Always set memory, CPU, and network limits.
7. **Host API instability**: Frequently changing the SPI means plugins break often. Freeze the SPI once released, only add new methods.

## Performance

### Loading Overhead
| Strategy | Load Time | Memory |
|----------|-----------|--------|
| Same process (JS/Python) | 10-100ms per plugin | Module code in memory |
| Subprocess (Node fork) | 50-200ms per plugin | ~10-30MB per instance |
| Container (Docker) | 1-5s per plugin | 50-200MB per container |

### Runtime Overhead
- Same process: <1μs per plugin call (direct function call)
- Subprocess IPC: ~100μs per call (serialization + IPC)
- Container IPC: ~1-5ms per call (network/HTTP)

## Rules
- Extension points are frozen once released — only additive changes allowed.
- Plugins must never access internal APIs — only the public SPI.
- Sandbox untrusted plugins: restrict filesystem, network, and process access.
- Always validate plugin integrity (checksum or signature) before loading.
- Plugin failures must never crash the host application.
- Log all plugin lifecycle events (load, init, start, stop, destroy).
- Provide a plugin manifest with name, version, author, and dependencies.
- Test plugins in isolation before production deployment.
- Use semantic versioning for plugin API compatibility.

## References
  - references/plugin-implementation.md — Plugin Implementation
  - references/plugin-lifecycle.md — Plugin Lifecycle Reference
  - references/plugin-patterns.md — Plugin Patterns
  - references/plugin-security.md — Plugin Security Reference
  - references/plugin-system-design.md — Plugin Architecture Design
  - references/plugin-testing.md — Plugin Testing
  - references/plugin-versioning.md — Plugin API Versioning
## Handoff
No artifact produced unless requested.
Next skill: observability — add plugin lifecycle traces to the telemetry pipeline.
Carry forward: extension points, SPI contracts, plugin manifest format.
