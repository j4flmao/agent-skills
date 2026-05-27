# Plugin Architecture Design

## Plugin Interface Design

### Core Plugin Interface
```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  dependencies?: string[];
  initialize(context: PluginContext): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  getMetadata(): PluginMetadata;
}

interface PluginContext {
  config: ConfigService;
  logger: Logger;
  eventBus: EventBus;
  dataStore: DataStore;
  httpServer: HttpServer;
  registerHook(hook: string, handler: HookHandler): void;
  registerMiddleware(priority: number, middleware: Middleware): void;
  registerRoute(method: string, path: string, handler: RouteHandler): void;
}

interface PluginMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  license: string;
  hooks: string[];
  permissions: string[];
}
```

### Plugin Loading System
```typescript
class PluginLoader {
  private plugins: Map<string, Plugin> = new Map();
  private pluginContext: PluginContext;

  constructor(private pluginDir: string) {
    this.pluginContext = this.createPluginContext();
  }

  async loadAll(): Promise<void> {
    const entries = await fs.readdir(this.pluginDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        await this.loadPlugin(entry.name);
      }
    }
  }

  async loadPlugin(name: string): Promise<void> {
    const pluginPath = path.join(this.pluginDir, name);
    const manifest = await this.loadManifest(pluginPath);

    this.validateManifest(manifest);
    this.checkDependencies(manifest);

    const plugin = await this.instantiatePlugin(pluginPath, manifest);

    await plugin.initialize(this.pluginContext);
    this.plugins.set(plugin.id, plugin);
    console.log(`Plugin loaded: ${plugin.name} v${plugin.version}`);
  }

  async activateAll(): Promise<void> {
    const sorted = this.topologicalSort();

    for (const plugin of sorted) {
      await plugin.activate();
      console.log(`Plugin activated: ${plugin.name}`);
    }
  }

  private topologicalSort(): Plugin[] {
    const visited = new Set<string>();
    const sorted: Plugin[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const plugin = this.plugins.get(id);
      for (const dep of plugin.dependencies || []) {
        visit(dep);
      }

      sorted.push(plugin);
    };

    for (const id of this.plugins.keys()) {
      visit(id);
    }

    return sorted;
  }
}
```

## Hook System

### Hook Registration
```typescript
class HookSystem {
  private hooks: Map<string, HookHandler[]> = new Map();

  registerHook(name: string, handler: HookHandler): void {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }
    this.hooks.get(name)!.push(handler);
  }

  async executeHook(name: string, context: any): Promise<void> {
    const handlers = this.hooks.get(name) || [];

    for (const handler of handlers) {
      try {
        await handler(context);
      } catch (error) {
        console.error(`Hook ${name} failed:`, error);
      }
    }
  }

  async executeHookWithResult<T>(
    name: string,
    context: any,
    initialResult: T
  ): Promise<T> {
    let result = initialResult;
    const handlers = this.hooks.get(name) || [];

    for (const handler of handlers) {
      try {
        result = await handler(context, result);
      } catch (error) {
        console.error(`Hook ${name} failed:`, error);
      }
    }

    return result;
  }
}
```

## Plugin Marketplace

### Plugin Manifest Schema
```json
{
  "id": "payment-stripe",
  "name": "Stripe Payment Gateway",
  "version": "1.0.0",
  "minAppVersion": "3.0.0",
  "maxAppVersion": "4.0.0",
  "description": "Integrates Stripe payment processing",
  "author": "Plugin Marketplace",
  "license": "MIT",
  "dependencies": ["core-payments"],
  "permissions": ["payments:process", "webhooks:receive"],
  "configSchema": {
    "apiKey": { "type": "string", "required": true, "secret": true },
    "webhookSecret": { "type": "string", "required": true, "secret": true }
  }
}
```

## Key Points
- Define a stable plugin interface with initialization, activation, lifecycle hooks
- Design plugin context with scoped access to core services
- Implement dependency resolution with topological sorting
- Use a hook system for plugins to extend core functionality
- Validate plugin manifests at load time
- Support plugin activation order based on dependencies
- Isolate plugins with sandboxed permissions
- Provide configuration schema for plugin settings
- Implement proper cleanup on plugin deactivation
- Use version constraints (min/max app version) for compatibility
