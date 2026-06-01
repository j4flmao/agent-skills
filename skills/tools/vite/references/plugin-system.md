# Vite Plugin System

## Overview
Vite's plugin system extends the build pipeline through hooks that intercept module resolution, transformation, and bundling. Plugins use a Rollup-compatible interface with Vite-specific extensions for dev server and HMR.

## Plugin Structure

### Basic Plugin
```typescript
// plugins/my-plugin.ts
import type { Plugin, ResolvedConfig } from 'vite';

export function myPlugin(): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'my-plugin',

    // Vite-specific hooks
    config(config, env) {
      return {
        define: {
          __PLUGIN_VERSION__: JSON.stringify('1.0.0'),
        },
      };
    },

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        console.log(`Request: ${req.url}`);
        next();
      });
    },

    // Build hooks
    transform(code, id) {
      if (id.endsWith('.custom')) {
        return {
          code: `export default ${JSON.stringify(code)}`,
          map: null,
        };
      }
    },
  };
}
```

## Common Hooks

### Resolution and Loading
```typescript
function aliasPlugin(): Plugin {
  return {
    name: 'alias-plugin',
    enforce: 'pre',

    resolveId(source, importer) {
      if (source.startsWith('@/')) {
        const resolved = source.replace('@/', `${process.cwd()}/src/`);
        return this.resolve(resolved, importer);
      }
      return null;
    },

    load(id) {
      if (id.endsWith('.wasm')) {
        const binary = fs.readFileSync(id);
        return `export default ${JSON.stringify([...binary])}`;
      }
      return null;
    },
  };
}
```

### Transform Hooks
```typescript
function transformPlugin(): Plugin {
  return {
    name: 'transform-plugin',

    transform(code, id) {
      // Only transform source files
      if (!id.includes('node_modules')) {
        // Replace environment variables
        const transformed = code.replace(
          /__APP_VERSION__/g,
          JSON.stringify('1.0.0')
        );

        // Add debug logging in development
        if (this.meta.watchMode) {
          return {
            code: `${transformed}\nconsole.log('Loaded: ${id}')`,
            map: null,
          };
        }

        return { code: transformed, map: null };
      }
    },
  };
}
```

## Virtual Modules

### Virtual File System
```typescript
function virtualModulePlugin(): Plugin {
  const virtualModuleId = 'virtual:config';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  return {
    name: 'virtual-module',

    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
      return null;
    },

    load(id) {
      if (id === resolvedVirtualModuleId) {
        return `
          export const version = '1.0.0';
          export const environment = ${JSON.stringify(process.env.NODE_ENV)};
          export const features = {
            darkMode: true,
            analytics: false,
            beta: ${!!process.env.ENABLE_BETA},
          };
        `;
      }
      return null;
    },
  };
}
```

### Dynamic Virtual Modules
```typescript
function dynamicRoutesPlugin(): Plugin {
  const modules = new Map<string, string>();

  return {
    name: 'dynamic-routes',

    resolveId(id) {
      if (id.startsWith('virtual:page:')) {
        return '\0' + id;
      }
      return null;
    },

    load(id) {
      if (id.startsWith('\0virtual:page:')) {
        const pageName = id.replace('\0virtual:page:', '');
        const existing = modules.get(pageName);
        if (existing) {
          return existing;
        }

        const code = generatePageCode(pageName);
        modules.set(pageName, code);
        return code;
      }
      return null;
    },
  };
}
```

## HMR

### Hot Module Replacement
```typescript
function hmrPlugin(): Plugin {
  return {
    name: 'hmr-plugin',

    handleHotUpdate({ file, server, modules }) {
      // Custom HMR handling
      if (file.endsWith('.css')) {
        server.ws.send({
          type: 'custom',
          event: 'style-update',
          data: { file },
        });
        return [];
      }

      if (file.endsWith('.graphql')) {
        // Invalidate modules that depend on this file
        const updatedModules = server.moduleGraph.getModulesByFile(file);
        if (updatedModules) {
          return [...updatedModules];
        }
      }

      return modules;
    },

    configureServer(server) {
      // Custom websocket events
      server.ws.on('connection', (socket) => {
        socket.send(JSON.stringify({ type: 'connected' }));
      });
    },
  };
}
```

## Dev Server Integration

### Middleware
```typescript
function serverPlugin(): Plugin {
  return {
    name: 'server-plugin',

    configureServer(server) {
      // Add middleware
      server.middlewares.use((req, res, next) => {
        // Add response headers
        res.setHeader('X-Custom-Header', 'value');
        next();
      });

      // Handle custom routes
      server.middlewares.use('/api/health', (req, res) => {
        res.statusCode = 200;
        res.end(JSON.stringify({ status: 'ok' }));
      });
    },
  };
}
```

## Build Hooks

### Bundle Customization
```typescript
function buildPlugin(): Plugin {
  return {
    name: 'build-plugin',

    // Before build starts
    buildStart() {
      console.log('Build starting...');
    },

    // Generate custom output
    generateBundle(options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          console.log(`Output: ${fileName} (${chunk.code.length} bytes)`);
        }
      }
    },

    // Write additional files
    writeBundle(options) {
      const manifest = {
        timestamp: Date.now(),
        files: Object.keys(options),
      };

      fs.writeFileSync(
        path.resolve(options.dir!, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );
    },

    // After build completes
    closeBundle() {
      console.log('Build complete!');
    },
  };
}
```

## Plugin Ordering

### Enforce Order
```typescript
export default function orderedPlugin(): Plugin[] {
  return [
    {
      name: 'alias',
      enforce: 'pre',   // Run before other plugins
      resolveId(source) {
        return null;
      },
    },
    {
      name: 'transform',
      enforce: 'post',  // Run after other plugins
      transform(code, id) {
        return code;
      },
    },
    {
      name: 'normal',
      // Default order (no enforce)
    },
  ];
}
```

## Advanced Plugin Patterns

### Plugin with Configuration
```typescript
interface PluginOptions {
  prefix?: string;
  include?: string[];
  exclude?: string[];
  transform?: (code: string, id: string) => string | null;
}

function myPlugin(options: PluginOptions = {}): Plugin {
  const { prefix = '__', include = ['**/*.ts'], exclude = [] } = options;

  return {
    name: 'my-plugin',
    enforce: 'post',

    // Validate options
    configResolved(config) {
      if (options.transform && typeof options.transform !== 'function') {
        throw new Error('my-plugin: transform must be a function');
      }
    },

    transform(code, id) {
      // Check include/exclude patterns
      if (exclude.some((p) => minimatch(id, p))) return null;
      if (!include.some((p) => minimatch(id, p))) return null;

      // Apply custom transform
      if (options.transform) {
        const result = options.transform(code, id);
        if (result !== null) {
          return { code: result, map: null };
        }
      }

      // Default transform
      const transformed = code.replace(
        new RegExp(`${prefix}(\\w+)`, 'g'),
        (match, name) => process.env[name] || match
      );
      return { code: transformed, map: null };
    },
  };
}
```

### Plugin with File Emission
```typescript
function manifestPlugin(): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'manifest',
    configResolved(c) { config = c; },

    generateBundle(_, bundle) {
      const manifest: Record<string, any> = {};

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk') {
          manifest[chunk.name] = {
            file: fileName,
            src: chunk.facadeModuleId,
            isEntry: chunk.isEntry,
            css: chunk.css,
            imports: chunk.imports,
            dynamicImports: chunk.dynamicImports,
            size: chunk.code.length,
          };
        }
      }

      // Emit custom file into output
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: JSON.stringify(manifest, null, 2),
      });
    },
  };
}
```

### HMR with Custom Events
```typescript
function hmrNotifierPlugin(): Plugin {
  return {
    name: 'hmr-notifier',
    apply: 'serve',  // Only in dev mode

    handleHotUpdate({ file, server }) {
      // Notify browser of style updates via custom event
      if (file.endsWith('.css')) {
        server.ws.send({
          type: 'custom',
          event: 'style-updated',
          data: { file, timestamp: Date.now() },
        });
        return [];  // Prevent default HMR
      }

      // For GraphQL files, invalidate dependent modules
      if (file.endsWith('.graphql')) {
        const modules = server.moduleGraph.getModulesByFile(file);
        if (modules) {
          modules.forEach((mod) => {
            server.moduleGraph.invalidateModule(mod);
          });
          return [...modules];
        }
      }

      // Default HMR behavior
      return undefined;
    },

    configureServer(server) {
      // Listen for client messages
      server.ws.on('connection', (socket) => {
        socket.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'custom-error') {
            console.error('Client error:', msg.error);
          }
        });
      });
    },
  };
}
```

### Conditional Plugin Application
```typescript
function envAwarePlugin(): Plugin {
  return {
    name: 'env-aware',
    // Only apply during build (not dev)
    apply: 'build',

    // Or: apply based on command
    apply: (config, { command }) => command === 'serve',

    // Or: apply based on mode
    apply: (config, { mode }) => mode === 'production',
  };
}
```

## Plugin Hook Execution Order
```
1. config          [all plugins, pre then normal then post]
2. configResolved  [same order]
3. buildStart      [same order]
4. resolveId       [pre => normal => post, first non-null wins]
5. load            [pre => normal => post, first non-null wins]
6. transform       [pre => normal => post, all run]
7. moduleParsed    [after transform]
8. buildEnd        [same order]
9. generateBundle  [same order]
10. writeBundle    [same order]
11. closeBundle    [same order]
```

### Plugin Option: `enforce`
- `'pre'`: Run before core Vite plugins (aliases, path resolution)
- `undefined` (default): Run alongside core
- `'post'`: Run after core (transform output, final cleanup)

## Key Anti-Patterns
- **Blocking transforms synchronously**: Use async/await for I/O in transform
- **No null returns**: Always return `null` from resolveId/load when not handling
- **Modifying the `config` object directly**: Return a new config object
- **Not cleaning up in `closeBundle`**: Server connections, file watchers, temp files
- **Heavy transforms without include/exclude**: Only transform files that need it
- **Overriding Vite's built-in behavior**: Use enforce wisely
- **No error handling in plugin hooks**: Use try/catch around risky operations
- **Forgetting the null byte prefix for virtual modules**: \0 prefix prevents re-resolution
- **Not handling watch mode**: `watchChange` and `closeWatcher` for file watching
- **Plugin name conflicts**: Use unique, descriptive names

## Key Points
- Vite plugins use Rollup-compatible interface with Vite-specific hooks
- name property identifies the plugin in error messages
- Hooks: config, configResolved, resolveId, load, transform, transformIndexHtml
- Dev server hooks: configureServer, handleHotUpdate
- Build hooks: buildStart, generateBundle, writeBundle, closeBundle
- Virtual modules (virtual: prefix) create in-memory files
- transform hook modifies source code before bundling
- resolveId/load hooks control module resolution
- handleHotUpdate customizes HMR behavior
- enforce: pre/post controls plugin execution order
- apply condition limits plugin to serve/build only
- configureServer adds middleware to dev server
- Plugin container manages hook execution pipeline
- this.meta.watchMode detects dev vs build mode
- Hot module replacement via server.ws.send
- Virtual modules with null byte prefix (\0) prevent normal resolution
- CSS processing handles PostCSS, CSS modules, and preprocessors
- Asset handling with inline, url, and file emission
- Plugin context provides resolve, emitFile, getFileName utilities
- Chunk customization in generateBundle hook
- watchChange and closeWatcher for file watching
- Plugin ordering matters for correct transformation pipeline
- Plugin hooks can be async (return Promise)
- this.meta can be used to share data between hooks
- Rollup hooks like `renderChunk`, `augmentChunkHash` available for advanced use
- `transformIndexHtml` modifies HTML during dev and build
- `server.ssrLoadModule` enables SSR module loading
- `this.error()` and `this.warn()` for plugin-specific messages
- `this.parse()` for code parsing within plugin
- `this.addWatchFile()` for custom file watching
- Parallel transforms improve build performance
