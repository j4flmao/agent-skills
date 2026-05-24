# Plugin Lifecycle Reference

## Lifecycle States

```
                  +-----------+
                  | DISCOVERED |
                  +-----+-----+
                        |
                        v
                  +-----------+
     +----------> | LOADED    |
     |            +-----+-----+
     |                  |
     |                  v
     |            +-----------+
     |            | INITIALIZED|
     |            +-----+-----+
     |                  |
     |                  v
     |            +-----------+
     |            | STARTED   | <------+
     |            +-----+-----+        |
     |                  |              |
     |                  v              |
     |            +-----------+        |
     |            | STOPPED   | +------+
     |            +-----+-----+
     |                  |
     |                  v
     |            +-----------+
     +------------| DESTROYED |
                  +-----------+
```

### State Transitions

| Transition | Trigger | Action |
|------------|---------|--------|
| DISCOVERED → LOADED | Plugin manifest found | Read manifest, verify signature, load metadata |
| LOADED → INITIALIZED | Dependencies resolved | Resolve imports, create sandbox, config validation |
| INITIALIZED → STARTED | Start signal received | Register hooks, open connections, start workers |
| STARTED → STOPPED | Stop or error | Graceful shutdown, close connections, flush buffers |
| STOPPED → STARTED | Restart signal | Reinitialize and start (hot-restart) |
| STOPPED → DESTROYED | Uninstall or upgrade | Free resources, remove registrations, cleanup |
| Any → ERROR | Unhandled exception | Capture error state, isolate, report |

## Loading

### Manifest-Driven Loading
```json
{
  "name": "payment-gateway-stripe",
  "apiVersion": "1.2.0",
  "version": "2.1.0",
  "entry": "./dist/index.js",
  "dependencies": {
    "http-client": "^2.0.0",
    "event-bus": "^1.5.0"
  },
  "capabilities": ["payment:process", "payment:refund", "webhook:receive"],
  "permissions": ["network:stripe.com:443", "storage:config:read"]
}
```

```typescript
interface PluginManifest {
  name: string;
  apiVersion: string;
  version: string;
  entry: string;
  dependencies: Record<string, string>;
  capabilities: string[];
  permissions: string[];
  hooks?: string[];
}
```

### Discovery Mechanisms

| Mechanism | Description | Best For |
|-----------|-------------|----------|
| File system scan | Scan plugin directory for manifests | Local, on-prem plugins |
| Registry API | Query central plugin registry | Marketplace, SaaS |
| Package manager | npm/pip/gem install + register | Developer ecosystem |
| Configuration | Explicit list in config file | Controlled environments |

## Initialization

### Dependency Resolution
```typescript
class PluginDependencyResolver {
  resolve(manifest: PluginManifest, registry: Map<string, PluginInstance>): DependencyGraph {
    const graph = new DependencyGraph();

    for (const [depName, versionRange] of Object.entries(manifest.dependencies)) {
      const provider = registry.get(depName);
      if (!provider) throw new MissingDependencyError(depName);
      if (!semver.satisfies(provider.apiVersion, versionRange)) {
        throw new VersionMismatchError(depName, versionRange, provider.apiVersion);
      }
      graph.addEdge(manifest.name, depName);
    }

    // Check for circular dependencies
    if (graph.hasCycle()) throw new CircularDependencyError(graph.getCycle());
    return graph;
  }
}
```

### Initialization Order
```typescript
async function initializePlugins(plugins: PluginManifest[]): Promise<void> {
  // 1. Sort by dependency graph (topological order)
  const sorted = topologicalSort(plugins);

  // 2. Load in dependency order
  for (const plugin of sorted) {
    try {
      const instance = await loadPlugin(plugin);
      await instance.init({ config: loadConfig(plugin.name) });
      activePlugins.set(plugin.name, instance);
    } catch (err) {
      // Failed plugins don't block others
      logger.error(`Plugin ${plugin.name} failed to init`, { error: err });
      failedPlugins.add(plugin.name);
    }
  }
}
```

## Hot-Reload

### File Watching
```typescript
import chokidar from 'chokidar';

class PluginHotReload {
  private watcher: chokidar.FSWatcher;

  start(pluginDir: string) {
    this.watcher = chokidar.watch(pluginDir, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
    });

    this.watcher.on('change', async (path) => {
      if (path.endsWith('.plugin.js')) {
        const pluginName = path.split('/').pop()!.replace('.plugin.js', '');
        await this.reloadPlugin(pluginName);
      }
    });
  }

  async reloadPlugin(name: string) {
    const instance = activePlugins.get(name);
    if (!instance) return;

    // 1. Stop current instance
    await instance.stop();
    await instance.destroy();

    // 2. Clear require cache
    delete require.cache[require.resolve(`./plugins/${name}.plugin.js`)];

    // 3. Load and start new version
    const newInstance = await loadAndInitialize(name);
    await newInstance.start();

    // 4. Swap references
    activePlugins.set(name, newInstance);
    logger.info(`Plugin ${name} hot-reloaded`);
  }
}
```

## Graceful Shutdown

```typescript
class PluginManager {
  async shutdown(timeoutMs = 30_000): Promise<void> {
    logger.info('Shutting down all plugins');

    // 1. Stop accepting new requests
    this.acceptingNewWork = false;

    // 2. Stop plugins in reverse dependency order
    const reverseOrder = topologicalSort([...activePlugins.values()]).reverse();

    const results = await Promise.allSettled(
      reverseOrder.map(plugin =>
        this.shutdownPlugin(plugin, timeoutMs / reverseOrder.length)
      )
    );

    // 3. Report failures
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        logger.error(`Plugin ${reverseOrder[i].name} shutdown failed`, {
          error: result.reason
        });
      }
    });

    // 4. Force kill if still running
    setTimeout(() => {
      logger.warn('Force killing remaining plugin processes');
      process.exit(1);
    }, timeoutMs);
  }

  private async shutdownPlugin(plugin: PluginInstance, timeout: number) {
    const timer = setTimeout(() => {
      logger.error(`Plugin ${plugin.name} shutdown timed out, force stopping`);
      plugin.forceStop();
    }, timeout);

    try {
      await plugin.stop();     // Graceful: finish in-flight work
      await plugin.destroy();   // Release resources
    } finally {
      clearTimeout(timer);
    }
  }
}
```

## Error Isolation

```typescript
class PluginSandbox {
  async execute<T>(pluginName: string, fn: () => Promise<T>): Promise<T> {
    const timeout = setTimeout(() => {
      logger.error(`Plugin ${pluginName} timed out, terminating`);
      this.terminatePlugin(pluginName);
    }, PLUGIN_TIMEOUT_MS);

    try {
      return await fn();
    } catch (err) {
      // Plugin errors must never crash host
      logger.error(`Plugin ${pluginName} error`, {
        error: err instanceof Error ? err.message : String(err),
        pluginName,
      });

      // Capture error, continue
      throw new PluginExecutionError(pluginName, err);
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

## Plugin Lifecycle Best Practices

- **Never trust plugin input**: Validate all data crossing the plugin boundary
- **Timeouts on everything**: Plugins must never block the host indefinitely
- **Version all APIs**: Host → Plugin API and Plugin → Host API both need versions
- **Immutable after release**: Plugin API changes are additive only
- **Test compatibility**: CI validates plugins against current host API version
- **Monitor lifecycle**: Every state transition is logged and metrics-instrumented
