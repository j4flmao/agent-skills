# Ember.js Setup Guide

## Prerequisites

```bash
# Node.js 18+ LTS
node --version

# Ember CLI
npm install -g ember-cli

# Optional: Watchman (for fast file watching on macOS/Linux)
brew install watchman
# or: sudo apt install watchman
```

## New Project

```bash
# Create new app
ember new my-app --lang en
# or with TypeScript:
ember new my-app --lang en --typescript

# Start dev server
cd my-app
npm start
# → http://localhost:4200

# Build for production
npm run build
# → dist/
```

## Project Structure

```
my-app/
  app/
    components/
      ui/
        button.ts
        button.hbs
    controllers/
      posts.ts
    helpers/
      format-date.ts
    models/
      post.ts
    modifiers/
      click-outside.ts
    routes/
      posts.ts
      posts/
        post.ts
    services/
      auth.ts
    styles/
      app.css
    templates/
      application.hbs
      posts.hbs
      posts/
        post.hbs
    router.ts
    app.ts           # Application instance
    index.html       # HTML shell
  config/
    environment.js   # Environment config
    optional-features.json
    targets.js       # Browser targets
  public/
    favicon.ico
  tests/
    index.html
    integration/
    unit/
    acceptance/
  ember-cli-build.js # Build pipeline config
  package.json
  tsconfig.json
  typecheck/
```

## Configuration

### config/environment.js

```js
module.exports = function (environment) {
  const ENV = {
    modulePrefix: 'my-app',
    environment,
    rootURL: '/',
    locationType: 'history',
    EmberENV: {
      FEATURES: {},
      EXTEND_PROTOTYPES: { Date: false },
    },
    APP: {
      apiHost: process.env.API_HOST || 'http://localhost:3000',
    },
  }

  if (environment === 'test') {
    ENV.locationType = 'none'
    ENV.APP.LOG_ACTIVE_GENERATION = false
  }

  if (environment === 'production') {
    // Production config
  }

  return ENV
}
```

### config/targets.js

```js
'use strict'
const browsers = [
  'last 1 Chrome versions',
  'last 1 Firefox versions',
  'last 1 Safari versions',
]

module.exports = { browsers }
```

## CLI Commands

```bash
# Generate resources
ember generate route posts
ember generate component ui/button
ember generate service auth
ember generate model post
ember generate modifier click-outside
ember generate helper format-date
ember generate controller posts
ember generate adapter application
ember generate serializer post
ember generate transform date

# Short form
ember g route posts
ember g component ui/button

# Destroy (reverse)
ember destroy route posts

# Tests
ember test            # CLI
ember test --serve    # Browser
ember test --filter="acceptance"

# Generate test
ember generate acceptance-test login
ember generate component-test ui/button
ember generate unit-test service/auth

# Addons
ember install ember-cli-tailwind
ember install ember-concurrency
ember install @ember-data/json-api
```

## Ember Addons

```bash
# Popular addons
ember install ember-auto-import          # NPM imports without addon wrapper
ember install ember-cli-tailwind         # Tailwind CSS
ember install ember-concurrency          # Async task management
ember install ember-intl                 # Internationalization
ember install ember-power-select         # Select dropdowns
ember install ember-modal-dialog         # Modals
ember install ember-simple-auth          # Authentication
ember install @glimmer/component         # Glimmer components
ember install ember-render-modifiers     # did-insert/did-update modifiers
ember install ember-truth-helpers        # {{eq}}, {{not}}, {{and}} helpers

# Testing
ember install ember-qunit                # QUnit test helpers
ember install ember-cli-code-coverage    # Code coverage
```

## Ember Data Configuration

### Adapter (API interaction)

```ts
// app/adapters/application.ts
import JSONAPIAdapter from '@ember-data/adapter/json-api'
import { service } from '@ember/service'

export default class ApplicationAdapter extends JSONAPIAdapter {
  @service declare session: any

  get headers() {
    return {
      Authorization: `Bearer ${this.session.token}`,
      'Content-Type': 'application/vnd.api+json',
    }
  }

  host = 'https://api.example.com'
  namespace = 'v1'
}
```

### Serializer

```ts
// app/serializers/post.ts
import JSONAPISerializer from '@ember-data/serializer/json-api'

export default class PostSerializer extends JSONAPISerializer {
  normalizeResponse(store, primaryModelClass, payload, id, requestType) {
    // Transform payload if needed
    return super.normalizeResponse(store, primaryModelClass, payload, id, requestType)
  }
}
```

## Build Configuration

### ember-cli-build.js

```js
'use strict'
const EmberApp = require('ember-cli/lib/broccoli/ember-app')

module.exports = function (defaults) {
  const app = new EmberApp(defaults, {
    autoImport: {
      watchDependencies: ['ember-power-select'],
    },
    babel: {
      plugins: [require.resolve('ember-auto-import/babel-plugin')],
    },
    'ember-cli-babel': { enableTypeScriptTransform: true },
  })

  // Tree manipulation
  app.import('node_modules/some-lib/dist/some-lib.js')

  return app.toTree()
}
```

## TypeScript Support

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es2021",
    "module": "es2022",
    "moduleResolution": "bundler",
    "strict": true,
    "allowJs": true,
    "noEmit": true,
    "experimentalDecorators": true,
    "paths": {
      "my-app/*": ["./app/*"],
      "*": ["./types/*"]
    }
  },
  "include": ["app/**/*", "tests/**/*", "types/**/*"]
}
```

## Ember Octane Checklist

- [ ] Glimmer components instead of classic `Ember.Component`
- [ ] Native JS classes instead of `EmberObject.extend()`
- [ ] `@tracked` instead of `this.set()`
- [ ] `@action` instead of `actions: {}`
- [ ] `<template>` tag or template-only components
- [ ] `ember-render-modifiers` instead of `didInsertElement`
- [ ] `@service` instead of `service()` injection
- [ ] Angle bracket syntax (`<MyComponent>`) instead of `{{my-component}}`
- [ ] `this.args` instead of `this.attrs`

## Debugging

```bash
# Ember Inspector browser extension
# Chrome: Ember Inspector
# Firefox: Ember Inspector

# Editor integration
# VSCode: Ember Language Server extension

# Debug logging in development
window.EmberENV = { LOG_TRANSITIONS: true, LOG_ACTIVE_GENERATION: true }
```
