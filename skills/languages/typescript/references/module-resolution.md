# TypeScript Module Resolution

## Overview
TypeScript's module resolution determines how imports map to files. Understanding resolution strategies, path mapping, and module systems is essential for project configuration and avoiding import errors.

## Module Systems

### Module Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ESNext",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

### Module Formats
```typescript
// ESM (ECMAScript Modules) - Modern standard
import { getUser } from "./services/user";
import api from "./api/client";
import * as utils from "./utils/helpers";
export type { User } from "./types";

// CommonJS - Node.js traditional
import { getUser } = require("./services/user");
const api = require("./api/client");
exports.User = User;

// AMD - Browser async
define(["require", "exports", "./services/user"],
  function (require, exports, user_1) {
    exports.getUser = user_1.getUser;
  });

// UMD - Universal (works everywhere)
(function (factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./services/user"));
  } else {
    root.myModule = factory(root.userService);
  }
});
```

## Resolution Strategies

### Classic Resolution (Legacy)
```typescript
// Import relative
import { User } from "./models/user";
// Resolves to: ./models/user.ts, ./models/user.d.ts

// Import non-relative
import express from "express";
// Resolves to: node_modules/express/index.ts, etc.
```

### Node Resolution
```json
// tsconfig.json for Node.js
{
  "compilerOptions": {
    "moduleResolution": "node",
    "module": "commonjs",
    "esModuleInterop": true
  }
}
```

### Bundler Resolution
```json
// tsconfig.json for bundlers
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "module": "ESNext",
    "allowImportingTsExtensions": true
  }
}
```

## Path Mapping

### Base URL and Paths
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"],
      "@services/*": ["src/services/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

```typescript
// Using path aliases
import { Button } from "@components/ui/Button";
import { formatDate } from "@utils/date";
import { UserService } from "@services/user";
import type { User } from "@types/models";

// Without aliases (less readable)
import { Button } from "../../../components/ui/Button";
import { formatDate } from "../../utils/date";
```

### Type Roots
```json
{
  "compilerOptions": {
    "typeRoots": [
      "./node_modules/@types",
      "./typings"
    ]
  }
}
```

## Triple-Slash Directives

### Reference Directives
```typescript
/// <reference types="vite/client" />
/// <reference path="./globals.d.ts" />
/// <reference lib="es2022" />
/// <reference no-default-lib="true"/>

// types directive - include type declarations
/// <reference types="vitest/globals" />

// path directive - include another file
/// <reference path="./custom-types.d.ts" />
```

## Declaration Files

### Ambient Declarations
```typescript
// globals.d.ts
declare const API_VERSION: string;

declare namespace MyApp {
  interface Config {
    host: string;
    port: number;
  }

  function initialize(config: Config): void;
}

// Module augmentation
// express.d.ts
import "express";

declare module "express" {
  interface Request {
    user?: {
      id: number;
      name: string;
    };
  }
}
```

### Module Declarations
```typescript
// Custom module declaration
declare module "my-library" {
  export function doSomething(input: string): number;
  export interface Options {
    timeout: number;
    retries: number;
  }
}

// Wildcard module declarations
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "*.svg" {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}
```

## Resolution for Monorepos

### Workspace Configuration
```json
// tsconfig.base.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "rootDir": ".",
    "paths": {
      "@myapp/shared": ["packages/shared/src"],
      "@myapp/shared/*": ["packages/shared/src/*"],
      "@myapp/server": ["packages/server/src"],
      "@myapp/web": ["packages/web/src"]
    }
  }
}

// packages/server/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "references": [
    { "path": "../shared" }
  ]
}
```

## Resolution Order

### File Extension Priority
```typescript
// Import "./utils"
// TypeScript checks in order:
// 1. utils.ts
// 2. utils.tsx
// 3. utils.d.ts
// 4. utils/index.ts
// 5. utils/index.tsx
// 6. utils/index.d.ts

// With allowJs enabled:
// 1. utils.ts / utils.tsx / utils.d.ts
// 2. utils.js / utils.jsx
```

## Key Points
- moduleResolution determines how imports map to files
- bundler resolution works with most modern bundlers (Vite, esbuild, Webpack)
- Node resolution works with CommonJS and older TypeScript
- Path aliases (@/components) improve import readability
- baseUrl sets the root for non-relative imports
- typeRoots specifies locations for type declarations
- Triple-slash directives provide file-level type references
- Declaration files (.d.ts) describe JavaScript libraries
- Ambient declarations define global types
- Module augmentation extends existing library types
- Wildcard declarations type non-code assets
- Composite projects enable incremental builds in monorepos
- Project references with referenced paths
- Declaration maps enable "Go to Definition" through .d.ts
- ESM interop handles CommonJS/ESM compatibility
- isolatedModules checks single-file transpilation safety
- resolveJsonModule enables JSON file imports
- allowImportingTsExtensions (TS 5.0+) enables .ts in imports
- customConditions resolves exports field conditions
- exports and imports fields in package.json control resolution
- self-referencing imports package by its own name
