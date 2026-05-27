# Vite Build Optimization

## Overview
Vite provides fast builds through native ESM and esbuild. Build optimization covers chunk splitting, CSS handling, tree shaking, image optimization, and production deployment strategies.

## Build Configuration

### Production Build
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Output directory
    outDir: 'dist',

    // Base public path
    base: '/app/',

    // Target browsers
    target: 'es2020',

    // Module format
    modulePreload: {
      polyfill: true,
    },

    // Source maps
    sourcemap: false,

    // Minification
    minify: 'esbuild',  // 'esbuild' (fast) or 'terser' (better compression)

    // CSS handling
    cssCodeSplit: true,
    cssMinify: 'lightningcss',

    // Chunk warnings
    chunkSizeWarningLimit: 500,

    // Report compressed sizes
    reportCompressedSize: true,

    // Build profile
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
```

## Chunk Splitting

### Manual Chunks
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk
          vendor: ['react', 'react-dom', 'react-router-dom'],

          // UI library
          ui: ['@mui/material', '@emotion/react', '@emotion/styled'],

          // Utilities
          utils: ['lodash', 'date-fns', 'zod'],

          // Dynamic splitting function
          chunk: (id) => {
            if (id.includes('node_modules')) {
              // Group by package scope
              const match = id.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
              if (match) {
                const packageName = match[1];

                if (packageName.startsWith('@mui/')) {
                  return 'mui';
                }
                if (packageName.startsWith('@tanstack/')) {
                  return 'tanstack';
                }
                if (['react', 'react-dom'].includes(packageName)) {
                  return 'vendor';
                }
              }
            }

            // Group page-level chunks
            if (id.includes('/pages/')) {
              const pageName = id.split('/pages/')[1]?.split('/')[0];
              if (pageName) {
                return `page-${pageName}`;
              }
            }
          },
        },
      },
    },
  },
});
```

### Experimental Chunks
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        experimentalMinChunkSize: 40960, // 40KB min chunk size
      },
    },
  },
};
```

## CSS Optimization

### PostCSS Configuration
```javascript
// postcss.config.js
export default {
  plugins: {
    'tailwindcss': {},
    'autoprefixer': {
      flexbox: 'no-2009',
    },
    'cssnano': {
      preset: ['advanced', {
        discardComments: { removeAll: true },
        normalizeWhitespace: true,
      }],
    },
  },
};
```

### CSS Modules
```typescript
// vite.config.ts
export default defineConfig({
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
      scopeBehaviour: 'local',
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },

    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`,
        api: 'modern-compiler',
      },
      less: {
        javascriptEnabled: true,
      },
    },

    devSourcemap: true,

    lightningcss: {
      // Use Lightning CSS for faster processing
      targets: {
        chrome: 90,
        firefox: 90,
        safari: 15,
      },
    },
  },
});
```

## Image Optimization

### Asset Handling
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import viteImagemin from 'vite-plugin-imagemin';

export default defineConfig({
  plugins: [
    viteImagemin({
      gifsicle: { optimizationLevel: 7, interlaced: false },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 75 },
      pngquant: { quality: [0.65, 0.8], speed: 4 },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: false },
        ],
      },
    }),
  ],

  build: {
    assetsInlineLimit: 4096, // Inline assets < 4KB as base64
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];

          if (/\.(png|jpe?g|gif|svg|webp)$/.test(assetInfo.name)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/\.(woff2?|eot|ttf)$/.test(assetInfo.name)) {
            return `fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
  },
});
```

## Tree Shaking

### Side Effects
```json
{
  "sideEffects": [
    "**/*.css",
    "**/*.scss",
    "./src/polyfills.ts"
  ]
}
```

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      treeshake: {
        moduleSideEffects: (id) => {
          if (id.includes('src/polyfills')) return true;
          if (id.includes('.css')) return true;
          return false;
        },
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        unknownGlobalSideEffects: false,
      },
    },
  },
});
```

## Performance Analysis

### Bundle Analysis
```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ],
});
```

### Build Profile
```bash
# Generate build profile
vite build --profile
node --cpu-prof --heap-prof node_modules/vite/bin/vite.js build

# Analyze bundle
npx vite-bundle-analyzer dist/stats.html
```

## Environment-Specific Builds

### Mode Configuration
```typescript
// vite.config.ts
export default defineConfig(({ mode }) => {
  return {
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },

    build: {
      minify: mode === 'production' ? 'esbuild' : false,
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          entryFileNames: mode === 'production'
            ? 'assets/[name].[hash].js'
            : 'assets/[name].js',
        },
      },
    },
  };
});
```

## Key Points
- outDir controls build output location
- target defines browser compatibility level
- manualChunks splits vendor code from application code
- CSS code splitting extracts per-entry CSS files
- PostCSS plugins (Tailwind, Autoprefixer, CSS Nano) process styles
- Lightning CSS provides faster CSS processing
- Image optimization with vite-plugin-imagemin
- Assets under 4KB are inlined as base64
- Tree shaking removes unused exports
- sideEffects field prevents removal of side-effectful imports
- Bundle analysis with rollup-plugin-visualizer
- Chunk size warning limit alerts on large bundles
- esbuild minification is faster, terser produces smaller output
- Gzip and Brotli compression reporting
- Module preload polyfill for older browsers
- Worker bundling for Web Workers
- Library mode for publishing packages
- Format options: es, cjs, umd, iife
- SSR build configuration for server-side rendering
- Watch mode for development builds
- ClearScreen disables Vite clearing terminal on reload
- EmptyOutDir removes old build before new build
- Rollup options for advanced bundling configuration
- Environment variables define build-time constants
- Brotli compression for smaller asset sizes on supported servers
