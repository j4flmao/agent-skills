# Plugin Testing

Testing plugin systems requires verifying both the host framework and individual plugins in isolation.

## Plugin Contract Tests

Verify that a plugin implements the SPI correctly:

```typescript
// Host-side contract test
describe('AuthenticationProvider SPI', () => {
  it('should register all plugin providers with unique names', () => {
    const loader = new PluginLoader('./test-plugins');
    loader.loadAll();
    const providers = loader.getPlugins('authentication.provider');
    const names = providers.map(p => p.getName());
    expect(new Set(names).size).toBe(names.length);
  });

  it('should handle plugin that returns null for unsupported type', () => {
    const result = provider.supports('unsupported_type');
    expect(result).toBe(false);
  });
});
```

## Plugin Isolation Tests

Each plugin runs in its own context and must not affect others:

```typescript
describe('Plugin isolation', () => {
  it('should not share global state between plugins', () => {
    global.someVar = 'plugin-a-value';
    const pluginA = loadPlugin('plugin-a');
    pluginA.init();
    delete global.someVar;

    const pluginB = loadPlugin('plugin-b');
    expect(() => pluginB.init()).not.toThrow();
    // plugin-b should NOT see plugin-a's global state
  });
});
```

## Lifecycle Tests

Verify plugin lifecycle transitions:

```typescript
describe('Plugin lifecycle', () => {
  it('should transition through LOADED -> INITIALIZED -> STARTED', async () => {
    const plugin = loadPlugin('test-plugin');
    expect(plugin.status).toBe('LOADED');
    await plugin.init();
    expect(plugin.status).toBe('INITIALIZED');
    await plugin.start();
    expect(plugin.status).toBe('STARTED');
  });

  it('should call destroy on failed INIT', async () => {
    const destroy = vi.fn();
    const plugin = createPlugin({ init: () => { throw new Error(); }, destroy });
    await expect(plugin.init()).rejects.toThrow();
    expect(destroy).toHaveBeenCalled();
  });
});
```

## Error Boundary Tests

Plugins must never crash the host:

```typescript
describe('Plugin error boundaries', () => {
  it('should catch unhandled plugin exceptions', async () => {
    const plugin = loadPlugin('crashy-plugin');
    const result = await host.safeCall(() => plugin.doThing());
    expect(result.isErr()).toBe(true);
    expect(host.isRunning()).toBe(true); // host survived
  });

  it('should timeout hung plugins', async () => {
    const plugin = loadPlugin('hung-plugin');
    await expect(
      host.callWithTimeout(() => plugin.neverResolves(), 1000)
    ).rejects.toThrow('Plugin timeout');
  });
});
```

## Compatibility Tests

Verify plugin API version compatibility:

```typescript
describe('Plugin API compatibility', () => {
  it('should reject plugin with incompatible API version', () => {
    const plugin = createPlugin({ apiVersion: '0.5.0' });
    expect(() => host.register(plugin)).toThrow('Incompatible API version');
  });

  it('should accept plugin with compatible semver range', () => {
    const plugin = createPlugin({ apiVersion: '1.2.0' });
    expect(() => host.register(plugin)).not.toThrow(); // host expects ^1.0.0
  });
});
```

## Resource Limit Tests

Enforce resource constraints on plugins:

```typescript
describe('Plugin resource limits', () => {
  it('should kill plugin exceeding memory limit', async () => {
    const plugin = loadPlugin('memory-hog');
    await expect(
      host.executeWithLimit(plugin, () => allocateHugeMemory())
    ).rejects.toThrow(/memory|limit/i);
  });

  it('should enforce filesystem access restrictions', () => {
    const plugin = loadPlugin('nosy-plugin');
    expect(() => plugin.readFile('/etc/passwd')).toThrow(/permission|denied/i);
  });
});
```

## Key Points
- Test SPI contracts, not plugin internals
- Verify plugin isolation (no shared global state)
- Test all lifecycle transitions and error paths
- Ensure host survives plugin crashes
- Verify API version compatibility checks
- Test resource limits (memory, CPU, filesystem)
- Use test fixtures for plugin manifests and mock plugins
