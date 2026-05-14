# Module Federation Reference

## Webpack 5 Configuration

### Host (Shell)

```javascript
// host/webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      filename: 'remoteEntry.js',
      remotes: {
        orders: 'orders@https://cdn.app.com/orders/remoteEntry.js',
        products: 'products@https://cdn.app.com/products/remoteEntry.js',
        dashboard: 'dashboard@https://cdn.app.com/dashboard/remoteEntry.js',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^18.2.0',
          eager: true,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^18.2.0',
          eager: true,
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: '^6.20.0',
        },
        '@mui/material': {
          singleton: true,
          requiredVersion: '^5.14.0',
        },
      },
    }),
  ],
};
```

### Remote

```javascript
// orders-app/webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'orders',
      filename: 'remoteEntry.js',
      exposes: {
        './OrderList': './src/components/OrderList.tsx',
        './OrderDetail': './src/components/OrderDetail.tsx',
        './OrderForm': './src/components/OrderForm.tsx',
        './store': './src/store/index.ts',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
      },
    }),
  ],
};
```

## Rspack Configuration

```javascript
// host/rspack.config.js
const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        orders: 'orders@https://cdn.app.com/orders/mf-manifest.json',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
};
```

## Dynamic Remote Loading

For runtime-determined remotes (environments, A/B testing):

```typescript
// shared/loadRemote.ts
interface RemoteConfig {
  url: string;
  scope: string;
  module: string;
}

export async function loadRemoteComponent<T>(config: RemoteConfig): Promise<T> {
  const { url, scope, module } = config;

  // Load remote entry script
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load remote: ${scope}`));
    document.head.appendChild(script);
  });

  // Initialize container
  const container = (window as any)[scope];
  await container.init(__webpack_shared__);

  // Get module factory
  const factory = await container.get(module);
  return factory();
}

// Usage in host
const OrderList = React.lazy(() =>
  loadRemoteComponent({
    url: `https://${env}.app.com/orders/remoteEntry.js`,
    scope: 'orders',
    module: './OrderList',
  })
);
```

## Next.js with Module Federation

```javascript
// next.config.js for host
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

module.exports = {
  webpack(config) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'shell',
        remotes: {
          orders: `orders@https://orders.app.com/_next/static/chunks/remoteEntry.js`,
        },
        shared: {},
        extraOptions: {
          exposePages: true,
        },
      })
    );
    return config;
  },
};
```

## Angular with Module Federation

```javascript
// angular.json (using @angular-architects/module-federation)
const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

module.exports = withModuleFederationPlugin({
  remotes: {
    orders: 'https://orders.app.com/remoteEntry.js',
  },
  shared: {
    ...shareAll({
      singleton: true,
      strictVersion: true,
      requiredVersion: 'auto',
    }),
  },
});
```

## Vue with Module Federation

```javascript
// vue.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  configureWebpack: {
    plugins: [
      new ModuleFederationPlugin({
        name: 'orders',
        filename: 'remoteEntry.js',
        exposes: {
          './OrderList': './src/components/OrderList.vue',
        },
        shared: {
          vue: { singleton: true },
        },
      }),
    ],
  },
};
```

## Shared Dependency Configuration

```typescript
// shared.js — dependency matrix
const SHARED_DEPS = {
  // FRAMEWORKS (must be singleton)
  react: { singleton: true, requiredVersion: '^18.2.0', eager: false },
  'react-dom': { singleton: true, requiredVersion: '^18.2.0', eager: false },
  vue: { singleton: true, requiredVersion: '^3.3.0' },

  // UTILITIES (shared with version fallback)
  'date-fns': { singleton: false, requiredVersion: '^3.0.0' },
  lodash: { singleton: false, requiredVersion: '^4.17.21' },

  // UI KITS (singleton to avoid style conflicts)
  '@mui/material': { singleton: true, requiredVersion: '^5.14.0' },
  'antd': { singleton: true, requiredVersion: '^5.12.0' },

  // STATE (must be singleton)
  'zustand': { singleton: true },
  'react-redux': { singleton: true, requiredVersion: '^9.0.0' },

  // Each app bundles its own copy (small libs, no benefit from sharing)
  // Leave these out of `shared` entirely
};
```

## CSS Isolation

### CSS Modules (Recommended)

```css
/* orders-app/src/components/OrderList.module.css */
.list { border: 1px solid #ddd; }
.item { padding: 8px; }
```

```typescript
import styles from './OrderList.module.css';
// styles.list is scoped to this component
```

### CSS-in-JS (emotion/styled-components)

```typescript
// Each MFE should use the same CSS-in-JS library singleton
// styled-components generates unique class names, no collisions
```

### Shadow DOM (Web Components)

```typescript
class OrderWidget extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>/* scoped styles */</style><div>Order content</div>`;
  }
}
customElements.define('order-widget', OrderWidget);
```

## Build-Time Integration

### Monorepo with Package Boundaries (Alternative to Module Federation)

```json
// If all teams work in same monorepo, use package.json exports
{
  "name": "@app/orders",
  "exports": {
    "./OrderList": "./src/components/OrderList.tsx",
    "./OrderDetail": "./src/components/OrderDetail.tsx"
  }
}
```

**When to use**: Single repo, same build pipeline, same framework version.
**When NOT to use**: Independent deployments required, different frameworks.
