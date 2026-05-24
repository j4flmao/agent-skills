# Plugin Security Reference

## Sandboxing

### Isolation Levels

| Level | Technique | Isolation Strength | Performance Impact | Use Case |
|-------|-----------|--------------------|--------------------|----------|
| None | Same process | None | None | First-party, trusted plugins |
| VM isolation | Separate runtime (isolated_vm) | Moderate | 5-15% overhead | Third-party JS plugins |
| Process isolation | child_process / subprocess | Strong | 10-30% overhead | Node/Python plugins |
| Container isolation | Docker / WASM | Strongest | 15-40% overhead | Untrusted third-party |
| Firecracker microVM | Lightweight VM | Strongest | 20-50% overhead | Multi-tenant plugin hosting |

### Node.js VM Sandbox
```javascript
import vm from 'node:vm';

class PluginSandbox {
  createContext(pluginName: string, permissions: string[]) {
    const sandbox = {
      console: createRestrictedConsole(pluginName),
      fetch: createRestrictedFetch(permissions),
      setTimeout: createBoundedTimeout(pluginName),
      Math, JSON, Array, Object, String, Number,
    };

    const context = vm.createContext(sandbox, {
      // Disable code generation from strings
      codeGeneration: { strings: false, wasm: false },
    });

    return { vm, context };
  }

  run(pluginCode: string, context: vm.Context, timeout = 5000) {
    const script = new vm.Script(pluginCode, {
      filename: 'plugin.js',
      timeout,
    });
    return script.runInContext(context, {
      timeout,
      breakOnSigint: true,
    });
  }
}
```

### Process Isolation (Node.js)
```javascript
import { fork } from 'child_process';

class ProcessPluginSandbox {
  start(pluginPath: string): ChildProcess {
    const child = fork(pluginPath, [], {
      execArgv: ['--experimental-vm-modules'],
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: { NODE_ENV: 'production', PLUGIN_SANDBOX: 'true' },
      // Resource limits
      resourceLimits: {
        maxOldGenerationSizeMb: 128,
        maxYoungGenerationSizeMb: 32,
        codeRangeSizeMb: 16,
      }
    });

    // Kill if no heartbeat
    const heartbeat = setInterval(() => {
      child.send({ type: 'heartbeat' });
    }, 5000);

    child.on('exit', (code) => {
      clearInterval(heartbeat);
      logger.warn(`Plugin process exited with code ${code}`);
    });

    return child;
  }

  // Kill hanging plugin
  terminate(child: ChildProcess) {
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 5000);
  }
}
```

## Capability Systems

Declarative permission model where plugins declare capabilities they need.

```yaml
capability_model:
  system:
    - name: "network"
      description: "Make HTTP requests"
      permissions:
        - "network:api.stripe.com:443"
        - "network:api.github.com:443"
    - name: "storage"
      description: "Read/write plugin configuration"
      permissions:
        - "storage:config:read"
        - "storage:config:write"
    - name: "event"
      description: "Subscribe to and emit events"
      permissions:
        - "event:subscribe:order.placed"
        - "event:emit:order.processed"
    - name: "filesystem"
      description: "Access specific directories"
      permissions:
        - "filesystem:read:/tmp/plugins/{name}/"
```

### Capability Enforcement
```typescript
class CapabilityEnforcer {
  private allowed: Set<string>;

  constructor(manifest: PluginManifest) {
    this.allowed = new Set(manifest.permissions);
  }

  check(capability: string): void {
    // Exact match
    if (this.allowed.has(capability)) return;

    // Pattern match (e.g., "network:*.stripe.com:*")
    for (const pattern of this.allowed) {
      if (this.matchPattern(pattern, capability)) return;
    }

    throw new CapabilityDeniedError(capability);
  }

  private matchPattern(pattern: string, actual: string): boolean {
    const patternParts = pattern.split(':');
    const actualParts = actual.split(':');
    return patternParts.every((part, i) =>
      part === '*' || part === actualParts[i]
    );
  }
}
```

## Permission Models

### Least Privilege Principle
```yaml
plugin_permission_audit:
  plugin: "slack-notifier"
  declared_permissions:
    - "network:slack.com:443"
    - "event:subscribe:notification.*"
    - "storage:config:read"
  actual_usage:
    - "network:slack.com:443"        # Used: YES
    - "event:subscribe:notification.*" # Used: YES
    - "storage:config:read"           # Used: YES
  unnecessary:
    - none
  verdict: "PASS — all permissions used"

  plugin: "analytics-tracker"
  declared_permissions:
    - "network:api.google.com:443"
    - "network:api.facebook.com:443"  # Used: NO
    - "filesystem:read:/etc"          # Used: NO, and suspicious
    - "storage:all"                   # Too broad!
  verdict: "FAIL — overprivileged, revoke excessive permissions"
```

## Code Signing

```typescript
import crypto from 'node:crypto';

class PluginSigner {
  sign(pluginBuffer: Buffer, privateKey: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(pluginBuffer);
    return sign.sign(privateKey, 'base64');
  }
}

class PluginVerifier {
  verify(pluginBuffer: Buffer, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(pluginBuffer);
    return verify.verify(publicKey, signature, 'base64');
  }

  verifyManifest(manifest: PluginManifest): boolean {
    if (!manifest.signature) return false;
    // Verify against known publisher keys
    const publisherKey = trustedPublishers.get(manifest.publisher);
    if (!publisherKey) return false;
    return this.verify(
      Buffer.from(JSON.stringify(manifest)),
      manifest.signature,
      publisherKey
    );
  }
}
```

## Resource Limits

```typescript
interface PluginResourceLimits {
  cpu: {
    maxPercent: number;       // Max CPU usage
    quota: number;            // CPU time in ms per second
  };
  memory: {
    maxHeapMb: number;        // Max heap size
    maxStackMb: number;       // Max stack depth
  };
  network: {
    maxRequestsPerMin: number; // Rate limit
    allowedDomains: string[];  // Domain allowlist
    maxResponseSizeMb: number; // Max response body
  };
  filesystem: {
    allowedPaths: string[];    // Path allowlist
    maxFileSizeMb: number;    // Max file operation size
    readOnly: boolean;        // Write protection
  };
  execution: {
    timeoutMs: number;         // Max execution time
    maxNestedCalls: number;    // Call stack limit
    maxEventListeners: number; // Subscription limit
  };
}
```

## Plugin Validation

### Pre-Load Validation Flow
```typescript
async function validatePlugin(path: string): Promise<ValidationResult> {
  // 1. Check manifest format
  const manifest = await readManifest(path);
  if (!isValidManifest(manifest)) return fail('Invalid manifest');

  // 2. Verify code signature
  if (!verifySignature(manifest)) return fail('Invalid signature');

  // 3. Scan for malicious patterns
  const source = await readPluginSource(path);
  const issues = await scanForMalware(source);
  if (issues.length > 0) return fail(`Security issues: ${issues}`);

  // 4. Check dependency vulnerabilities
  const vulns = await checkVulnerabilities(manifest.dependencies);
  if (vulns.length > 0) return fail(`Vulnerable deps: ${vulns}`);

  // 5. Verify permission necessity
  const usage = await analyzePermissionUsage(source);
  for (const perm of manifest.permissions) {
    if (!usage.includes(perm)) warn(`Unused permission: ${perm}`);
  }

  return pass();
}
```

## Security Best Practices

- **Never eval()**: Plugin execution should use proper sandboxes, never `eval` or `new Function`
- **Timeout enforcement**: Kill plugins exceeding execution time limits
- **Network restrict**: Domain allowlists prevent data exfiltration
- **No shared state**: Each plugin gets isolated state — no cross-plugin data access
- **Audit all actions**: Log every capability usage for forensic analysis
- **API version gate**: Plugins must declare host API version; reject mismatches
- **Resource accounting**: Track CPU, memory, and network per plugin for billing/throttling
