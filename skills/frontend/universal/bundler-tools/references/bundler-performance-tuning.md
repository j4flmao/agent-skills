# Bundler Performance Tuning

## Build Performance Fundamentals

### Measuring Build Time

Establish a baseline before making any changes:

```bash
# Vite
Measure-Command { npx vite build }

# Webpack
Measure-Command { npx webpack --mode production }

# Generic
Measure-Command { npm run build }
```

Break down build time into phases:

| Phase | Vite | Webpack | Measurement |
|-------|------|---------|-------------|
| Config parsing | 50-200ms | 100-500ms | Before module graph |
| Module resolution | 200-2000ms | 500-5000ms | Module graph construction |
| Transpilation | 500-5000ms | 1000-10000ms | Loaders/plugins processing |
| Code generation | 300-3000ms | 500-5000ms | Chunk assembly |
| Minification | 200-2000ms | 500-5000ms | Terser/esbuild/swc |
| Asset processing | 100-1000ms | 200-2000ms | CSS, images, fonts |

### Profiling Build Bottlenecks

```bash
# Vite profiling
npx vite build --profile
node --prof-process isolate-*.log

# Webpack profiling
npx webpack --profile --json > stats.json
# Visualize with webpack-bundle-analyzer

# Node.js CPU profiling
node --cpu-prof --cpu-prof-dir=./profiles node_modules/.bin/vite build
```

## Module Resolution Optimization

### Node.js Module Resolution Cost

Node.js module resolution is one of the most expensive operations in bundling. Each `require()` or `import` statement triggers a file system lookup:

1. Check if it is a core module
2. Look in `node_modules` relative to the importing file
3. Walk up directory tree to root
4. Parse `package.json` for `main`, `module`, `exports` fields
5. Resolve the actual file path

### Reducing Resolution Cost

```js
// Webpack: resolve.alias to skip resolution for known paths
resolve: {
  alias: {
    '@': path.resolve(__dirname, 'src/'),
    react: path.resolve(__dirname, 'node_modules/react'),
  },
  // Skip resolution for certain extensions
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  // Limit symlink following
  symlinks: false,
}
```

```ts
// Vite: alias configuration
resolve: {
  alias: {
    '@': '/src',
  },
}
```

### Excluding Directories from Resolution

```js
// Webpack: exclude node_modules from loaders (they are already compiled)
module: {
  rules: [{
    test: /\.jsx?$/,
    exclude: /node_modules/,
    use: 'babel-loader',
  }]
}
```

Vite does this automatically -- it pre-bundles dependencies using esbuild and does not re-transpile them.

## Transpilation Optimization

### Replacing Babel with Faster Alternatives

Babel is the slowest transpiler. Replace it for significant speed gains:

```js
// Webpack with esbuild-loader (10-100x faster than Babel)
module: {
  rules: [{
    test: /\.(js|jsx|ts|tsx)$/,
    use: 'esbuild-loader',
    exclude: /node_modules/,
  }]
}

// Webpack with swc-loader (5-20x faster than Babel)
module: {
  rules: [{
    test: /\.(js|jsx|ts|tsx)$/,
    use: {
      loader: 'swc-loader',
      options: {
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          target: 'es2021',
        },
      },
    },
    exclude: /node_modules/,
  }]
}
```

### TypeScript Transpilation Options

| Approach | Speed | Type Checking | Notes |
|----------|-------|---------------|-------|
| esbuild-loader | Fastest | No | Skips type checking entirely |
| swc-loader | Fast | No | Good SWC/TS compatibility |
| ts-loader | Slow | Optional | Full TS support |
| fork-ts-checker-webpack-plugin | Moderate | Separate process | Use with esbuild/swc |

```js
// Recommended: esbuild + separate type checking
module: {
  rules: [{
    test: /\.(ts|tsx)$/,
    use: 'esbuild-loader',
    exclude: /node_modules/,
  }]
},
plugins: [
  new ForkTsCheckerWebpackPlugin({
    typescript: { diagnosticOptions: { semantic: true, syntactic: true } },
  }),
]
```

## Caching Strategies

### Webpack Persistent Caching

```js
// Webpack 5: filesystem cache
module.exports = {
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, '.temp/cache'),
    buildDependencies: {
      config: [__filename],
    },
    // Version cache when dependencies change
    version: '1.0.0',
  },
};
```

Webpack filesystem cache stores compiled modules in `.temp/cache`. On subsequent builds, unchanged modules are read from cache instead of re-transpiled. Cache invalidation triggers:
- File content changes
- Configuration changes (tracked via `buildDependencies`)
- Cache `version` changes

### Vite's Caching

Vite uses multiple cache layers:

1. **Dependency pre-bundle cache**: `node_modules/.vite/deps` -- rebuilt when `package-lock.json` changes or deps change
2. **Browser cache**: ES modules cached by the browser during dev
3. **Transform cache**: Individual file transforms cached in memory

```ts
// vite.config.ts
export default defineConfig({
  cacheDir: './node_modules/.vite',
})
```

### Build Tool Cache in CI

```yaml
- name: Cache Webpack cache
  uses: actions/cache@v3
  with:
    path: |
      .temp/cache
      node_modules/.cache
    key: webpack-${{ hashFiles('yarn.lock', 'webpack.config.*') }}
    restore-keys: |
      webpack-${{ hashFiles('yarn.lock') }}
```

## Parallelization

### Webpack Parallelism

```js
// Parallel minification
const TerserPlugin = require('terser-webpack-plugin');
module.exports = {
  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true, // Use all available CPU cores
        // Or specify: parallel: 4
      }),
    ],
  },
};

// Parallel module processing
// Use HappyPack or thread-loader for legacy projects
module: {
  rules: [{
    test: /\.js$/,
    use: [
      { loader: 'thread-loader', options: { workers: 3 } },
      'babel-loader',
    ],
  }],
}
```

### Vite Parallelism

Vite uses esbuild (compiled to Go, inherently parallel) for transpilation and minification. CSS processing uses Lightning CSS (Rust, also parallel). No additional configuration needed.

### CI Build Parallelization

```yaml
# Turborepo for monorepo parallelism
- run: npx turbo run build --parallel

# Manual parallel builds for independent packages
- run: |
    npx concurrently \
      "cd packages/app && npm run build" \
      "cd packages/admin && npm run build" \
      "cd packages/api && npm run build"
```

## Minification Optimization

### Comparing Minifiers

| Minifier | Speed | Output Size | Language | Notes |
|----------|-------|-------------|----------|-------|
| esbuild | Fastest | Small | Go | Vite default |
| swc | Fast | Small | Rust | Good alternative |
| terser | Slowest | Smallest | JS | Webpack default |
| uglify-js | Slow | Medium | JS | Legacy, avoid |

```js
// Webpack: replace terser with esbuild for minification
const { ESBuildMinifyPlugin } = require('esbuild-loader');
module.exports = {
  optimization: {
    minimizer: [
      new ESBuildMinifyPlugin({
        target: 'es2021',
        css: true, // Also minify CSS
      }),
    ],
  },
};

// Or replace terser with swc
const SWCPlugin = require('@swc/core');
```

### CSS Minification

```js
// Vite: CSS minification via Lightning CSS (built-in)
export default defineConfig({
  css: {
    transformer: 'lightningcss',
  },
  build: {
    cssMinify: 'lightningcss',
  },
});

// Webpack
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
module.exports = {
  optimization: {
    minimizer: [
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: ['default', { discardComments: { removeAll: true } }],
        },
      }),
    ],
  },
};
```

## Tree Shaking Optimization

### Side Effects Analysis

The most important tree shaking configuration:

```json
// package.json
{
  "sideEffects": [
    "./src/polyfills.ts",
    "*.css"
  ]
}
```

Without this, bundlers assume all modules have side effects and cannot tree-shake unused exports.

### Deep Tree Shaking

```js
// Webpack: enable deep scope analysis
module.exports = {
  optimization: {
    usedExports: true,
    sideEffects: true,
    innerGraph: true, // Track function-level side effects
  },
};
```

### Pragma Annotations

```tsx
// Mark function calls as pure for better tree shaking
const heavyComponent = /*#__PURE__*/ React.lazy(() => import('./Heavy'));

// In CSS-in-JS libraries
const Button = /*#__PURE__*/ styled.button`
  color: blue;
`;
```

## Chunk Optimization

### Vite Chunk Strategy

```ts
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
```

### Webpack Chunk Strategy

```js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
          name: 'react-vendor',
          chunks: 'all',
          priority: 20,
        },
        ui: {
          test: /[\\/]node_modules[\\/](@radix-ui|@mui)[\\/]/,
          name: 'ui-vendor',
          chunks: 'all',
          priority: 10,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
          priority: 5,
          minSize: 30000,
        },
      },
    },
  },
};
```

### Automatic Vendor Splitting (Vite)

```ts
// Vite automatically splits vendor code if:
// - It's imported from node_modules
// - It's larger than build.rollupOptions.output.minChunkSize (default: 10000 bytes)

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Merge small vendor modules into existing chunks
        minChunkSize: 20000,
      },
    },
  },
});
```

## Module Federation Performance

### Shared Dependency Deduplication

```js
new ModuleFederationPlugin({
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0', eager: false },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0', eager: false },
  },
});
```

Shared dependencies should use `singleton: true` to prevent duplicate instances. However, each shared dep adds negotiation overhead at runtime. Only share deps that genuinely need to be singletons (React, Vue, state management libraries).

### Async Loading Federation Modules

```tsx
const RemoteApp = React.lazy(() => import('remote/App'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <RemoteApp />
    </Suspense>
  );
}
```

### Eager Loading for Critical Federation Modules

```js
new ModuleFederationPlugin({
  exposes: {
    './Header': './src/Header',
  },
  shared: {
    react: { singleton: true, eager: true },
  },
});
```

Use `eager: true` only for modules needed on initial load. Eager modules are included in the initial chunk, increasing its size.

## Asset Optimization

### Image Optimization During Build

```ts
// Vite plugin
import { imagetools } from 'vite-imagetools';

export default defineConfig({
  plugins: [
    imagetools({
      defaultDirectives: () => new URLSearchParams({
        format: 'webp',
        quality: '80',
        w: '400;800;1200',
      }),
    }),
  ],
});
```

```js
// Webpack
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');

module.exports = {
  optimization: {
    minimizer: [
      new ImageMinimizerPlugin({
        minimizer: {
          implementation: ImageMinimizerPlugin.sharpMinify,
          options: {
            encodeOptions: {
              webp: { quality: 80 },
              avif: { quality: 60 },
            },
          },
        },
      }),
    ],
  },
};
```

### Font Subsetting

```bash
# Remove unused glyphs from icon fonts and variable fonts
npx glyphhanger ./dist/**/*.html --formats=woff2 --subset=*.ttf --output=./dist/fonts/
```

### CSS Optimization

```ts
// Vite: lightningcss handles CSS optimization
export default defineConfig({
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      // Automatically removes unused CSS
      drafts: {
        customMedia: true,
      },
    },
  },
});
```

## Build Monitoring

### Size Budget Enforcement

```js
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: './dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    // Warn if chunk exceeds 500KB
    chunkSizeWarningLimit: 500,
    // Error if entry chunk exceeds 1MB
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'CHUNK_TOO_LARGE') {
          throw new Error(warning.message);
        }
        warn(warning);
      },
    },
  },
});
```

### CI Performance Regression Detection

```yaml
- name: Measure build time
  run: |
    $start = Get-Date
    npm run build
    $duration = (Get-Date) - $start
    echo "Build duration: $($duration.TotalSeconds)s"

    # Compare with baseline
    $baseline = 30 # seconds
    if ($duration.TotalSeconds -gt ($baseline * 1.2)) {
      Write-Warning "Build exceeded baseline by 20%+"
    }

- name: Check bundle size
  run: |
    $totalSize = (Get-ChildItem -Recurse dist/*.js | Measure-Object -Property Length -Sum).Sum
    $entrySize = (Get-Item dist/assets/index-*.js).Length
    echo "Total JS: $([math]::Round($totalSize/1KB, 1)) KB"
    echo "Entry: $([math]::Round($entrySize/1KB, 1)) KB"
    if ($entrySize/1KB -gt 200) {
      throw "Entry chunk exceeds 200KB budget"
    }
```

## Performance Pitfalls

### Excessive Module Watching in Dev

```js
// Webpack: limit watched files
module.exports = {
  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 200,
    poll: false,
  },
};
```

Vite only processes files that are requested, so watching is naturally scoped.

### Large node_modules Dependencies

```bash
# Audit dependency size
npx cost-of-modules

# Find heavy packages
Get-ChildItem -Recurse -Depth 1 node_modules/*/package.json |
  ForEach-Object { $pkg = Get-Content $_ | ConvertFrom-Json; $size = (Get-ChildItem -Recurse (Split-Path $_)).Length; [PSCustomObject]@{ Package = $pkg.name; Size = $size } } |
  Sort-Object -Property Size -Descending |
  Select-Object -First 20
```

### CSS-in-JS Runtime Cost

CSS-in-JS libraries with runtime (styled-components, Emotion) add runtime parsing overhead. Use zero-runtime alternatives for production builds:

- **Linaria**: Zero-runtime CSS-in-JS
- **Vanilla Extract**: Zero-runtime, TypeScript-first
- **Compiled (forthcoming)**: Build-time compilation of styled-components

## Build Optimization Checklist

- [ ] Measure current build time and output size (baseline)
- [ ] Replace Babel with esbuild or swc for transpilation
- [ ] Enable filesystem caching (Webpack) or verify Vite cache
- [ ] Configure `sideEffects` in package.json
- [ ] Split vendor code into separate chunks
- [ ] Replace terser with esbuild for minification
- [ ] Enable CSS minification
- [ ] Optimize images during build
- [ ] Remove barrel files
- [ ] Configure CI caching for node_modules and build cache
- [ ] Set up bundle size budgets with CI enforcement
- [ ] Enable parallel builds for monorepo
- [ ] Audit dependency sizes, remove unused packages
