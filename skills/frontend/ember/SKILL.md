---
name: ember
description: >
  Use this skill when the user says 'Ember.js', 'Ember app', 'Ember setup', 'Ember CLI', 'Ember Data', 'Ember Octane', 'Ember component', 'Ember route', 'Ember service', or when building ambitious web applications with Ember.js. This skill enforces: convention over configuration, Ember CLI for code generation, Ember Data for state management, Octane patterns (glimmer components, tracked properties, native classes). Requires package.json with ember-source or ember-cli. Do NOT use for: React/Vue/Angular projects, vanilla JS, or non-Ember projects.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [frontend, ember, phase-2]
---

# Ember.js

## Purpose
Build ambitious web applications using Ember's convention-over-configuration approach — Ember CLI for scaffolding, Ember Data for state management, and Octane-era patterns for modern components.

## Agent Protocol

### Trigger
Exact user phrases: "Ember setup", "Ember app", "Ember CLI", "Ember Data", "Ember Octane", "Ember component", "Ember route", "Ember service", "Ember project", "ember.js".

### Input Context
Before activating, verify:
- package.json has ember-source or ember-cli.
- Whether the project uses Ember Octane (v3.15+) or classic (v3.14-).
- Whether Ember Data or other data layer (Apollo, fetch).

### Output Artifact
No file output. Produces code snippets and structural guidance as text.

### Response Format
Code with Ember conventions:
```ts
// app/routes/index.ts
import Route from '@ember/routing/route'
import { service } from '@ember/service'
```

No preamble. No postamble. No explanations. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Routes defined in app/router.ts with corresponding route files.
- [ ] Templates use Ember/Glimmer syntax ({{each}}, {{if}}).
- [ ] Components are Glimmer components (native class, <template> or template-only).
- [ ] Ember Data models defined with @attr, @belongsTo, @hasMany.
- [ ] Services for shared state with @service injection.
- [ ] Modifiers for DOM interactions (ember-render-modifiers or custom).
- [ ] Tests for routes, components, and services.

### Max Response Length
~4096 tokens.

## Workflow

### Step 1: New Ember Project
```bash
npx ember-cli new my-app --lang en
cd my-app
npm start
```

### Step 2: Define Routes
```ts
// app/router.ts
import EmberRouter from '@ember/routing/router'
import { guidFor } from '@ember/object/internals';

@RouterService<'home' | 'posts' | 'posts.post' | 'not-found'>()
export default class Router extends EmberRouter {
  location = 'history'
  rootURL = '/'
}

Router.map(function () {
  this.route('posts', function () {
    this.route('post', { path: '/:post_id' })
  })
  this.route('not-found', { path: '/*path' })
})
```

### Step 3: Route Handler & Model
```ts
// app/routes/posts.ts
import Route from '@ember/routing/route'
import { service } from '@ember/service'
import type Store from '@ember-data/store'

export default class PostsRoute extends Route {
  @service declare store: Store

  async model() {
    return this.store.findAll('post')
  }
}
```

### Step 4: Template
```hbs
{{! app/templates/posts.hbs }}
<h1>Posts</h1>

<LinkTo @route="posts.post" @model={{post.id}}>
  {{post.title}}
</LinkTo>

{{outlet}}
```

### Step 5: Component
```ts
// app/components/post-card.ts
import Component from '@glimmer/component'
import { tracked } from '@glimmer/tracking'
import { action } from '@ember/object'

export interface PostCardSignature {
  Args: {
    title: string
    body: string
  }
}

export default class PostCardComponent extends Component<PostCardSignature> {
  @tracked expanded = false

  @action
  toggleExpand() {
    this.expanded = !this.expanded
  }
}
```

```hbs
{{! app/components/post-card.hbs }}
<article>
  <h2 @click={{this.toggleExpand}}>{{@title}}</h2>
  {{#if this.expanded}}
    <p>{{@body}}</p>
  {{/if}}
</article>
```

### Step 6: Service
```ts
// app/services/auth.ts
import Service from '@ember/service'
import { tracked } from '@glimmer/tracking'

export default class AuthService extends Service {
  @tracked currentUser: User | null = null

  async login(email: string, password: string) {
    // ...
  }

  logout() {
    this.currentUser = null
  }
}
```

## Rules
- Use Ember CLI commands for scaffolding — never write boilerplate by hand.
- Routes define model hooks; controllers only for query params or actions.
- Glimmer components (<template> or .hbs with .ts) for all new code.
- Use `@tracked` for reactive properties, never `set()`.
- Use `@action` decorator for event handlers.
- Ember Data is the default data layer — use adapters/serializers for API customization.
- Services are singletons — inject with `@service`.
- Modifiers handle DOM interactions, not component lifecycle hooks.
- Follow the `app/` folder convention: routes/, components/, services/, models/, modifiers/.

## References
  - references/ember-advanced.md — Ember Advanced Topics
  - references/ember-architecture.md — Ember.js Architecture Patterns
  - references/ember-deployment.md — Ember.js Deployment
  - references/ember-fundamentals.md — Ember Fundamentals
  - references/ember-patterns.md — Ember.js Patterns & Best Practices
  - references/ember-setup.md — Ember.js Setup Guide
## Handoff
No artifact produced.
Next skill: ember-data (if complex data layer) or frontend-testing.
Carry forward: route/service pattern, Glimmer component conventions, @tracked/@action.
