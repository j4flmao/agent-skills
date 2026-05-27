# Plugin API Versioning

Plugin APIs must evolve without breaking existing plugins. Versioning strategies ensure backward compatibility.

## Semantic Versioning for Plugin APIs

```
API version: MAJOR.MINOR.PATCH
  MAJOR: breaking change (removed method, changed signature)
  MINOR: additive change (new method, new parameter with default)
  PATCH: bugfix (behavioral fix, no API change)
```

Plugin manifest declares both API version and plugin version:

```json
{
  "name": "payment-stripe",
  "apiVersion": "2.1.0",
  "pluginVersion": "3.0.0",
  "minHostVersion": "1.5.0",
  "entry": "./index.js"
}
```

## Compatibility Checking

Check API version at registration time:

```typescript
class HostAPI {
  constructor(private apiVersion: string) {}

  checkCompatibility(manifest: PluginManifest): boolean {
    const [hostMajor] = this.apiVersion.split('.').map(Number);
    const [pluginMajor] = manifest.apiVersion.split('.').map(Number);
    return hostMajor === pluginMajor;
  }
}
```

## Backward-Compatible Changes

Adding methods to the SPI without breaking existing plugins:

```typescript
// v1.0.0: original interface
interface AuthProvider {
  authenticate(credentials: Credentials): AuthResult;
}

// v2.0.0: new method with default implementation
interface AuthProvider {
  authenticate(credentials: Credentials): AuthResult;

  // New in v2 — plugin can override, but not required
  refresh?(token: string): AuthResult;
}

// Host: safely call optional method
function refreshToken(provider: AuthProvider, token: string): AuthResult {
  return provider.refresh?.(token) ?? defaultRefresh(token);
}
```

## Version Negotiation

Allow plugins to declare which API version they support:

```typescript
interface Plugin {
  apiVersion(): string;
  init(context: PluginContext): void;
}

class PluginContext {
  constructor(
    public hostVersion: string,
    public apiFeatures: APIFeatureSet
  ) {}

  hasFeature(name: string): boolean {
    return this.apiFeatures.supports(name);
  }
}

// Plugin checks features at init
class MyPlugin implements Plugin {
  apiVersion(): string { return '1.0.0'; }

  init(context: PluginContext): void {
    if (!context.hasFeature('async-hooks')) {
      this.useLegacyMode();
    }
  }
}
```

## Deprecation Strategy

Mark methods as deprecated before removal:

```typescript
// v2.0.0 — deprecate old method
interface NotificationPlugin {
  // @deprecated Use sendNotification() instead
  notify?(channel: string, message: string): void;

  sendNotification?(request: NotificationRequest): Promise<NotificationResult>;
}

// Host: support both old and new
async function dispatch(plugin: NotificationPlugin, request: NotificationRequest) {
  if (plugin.sendNotification) {
    return plugin.sendNotification(request);
  }
  // Fallback to deprecated method
  console.warn(`Plugin ${plugin.name} uses deprecated notify()`);
  return plugin.notify?.(request.channel, request.message);
}
```

## Migration Between Versions

Run multiple API versions side by side:

```typescript
class PluginRegistry {
  private adapters = new Map<string, APIVersionAdapter>();

  register(manifest: PluginManifest): void {
    const adapter = this.adapters.get(manifest.apiVersion);
    if (adapter) {
      adapter.wrap(manifest);
    } else {
      throw new Error(`Unsupported API version: ${manifest.apiVersion}`);
    }
  }
}

// Adapter translates between plugin and host API versions
class V1toV2Adapter implements APIVersionAdapter {
  wrap(manifest: PluginManifest): void {
    // wraps v1 plugin to expose v2 interface
  }
}
```

## Key Points
- Use semantic versioning for plugin APIs (MAJOR.MINOR.PATCH)
- Match MAJOR version between host and plugin
- Add optional methods (with `?`) for backward-compatible extensions
- Support feature detection over version checking
- Provide default implementations for new optional methods
- Deprecate before removing — keep old methods for one MAJOR cycle
- Use adapters for cross-version compatibility during migration
