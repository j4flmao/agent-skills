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
