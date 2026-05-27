# Bundler Configuration

## Vite Configuration

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
```

## Webpack Configuration

```typescript
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './public/index.html' }),
    new MiniCssExtractPlugin({ filename: '[name].[contenthash].css' }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: { test: /[\\/]node_modules[\\/]/, name: 'vendors' },
      },
    },
  },
}
```

## Code Splitting

```typescript
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const ReportsPage = lazy(() => import('./pages/Reports'))

function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Routes>
    </Suspense>
  )
}
```

## Tree Shaking

```typescript
// utils/math.ts
export function add(a: number, b: number): number { return a + b }
export function subtract(a: number, b: number): number { return a - b }
export function multiply(a: number, b: number): number { return a * b }

// app.ts - only add and multiply are imported, subtract is tree-shaken
import { add, multiply } from './utils/math'
```

## Key Points

- Use Vite for faster development with native ESM
- Configure code splitting at route level with lazy loading
- Extract vendor chunks for better caching
- Enable content hashing for long-term cache busting
- Use tree shaking to eliminate dead code
- Configure path aliases for cleaner imports
- Set up proxy for development API requests
- Generate source maps for production debugging
- Minimize bundle size with proper dependency management
- Use dynamic imports for conditionally loaded features
- Analyze bundle with tools like vite-bundle-analyzer
- Configure build targets based on browser support matrix
