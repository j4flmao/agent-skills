# React Code Organization and Architecture

A well-structured codebase scales better, is easier for new developers to understand, and prevents tight coupling.

## Table of Contents
1. [Bulletproof React Structure](#bulletproof-react-structure)
2. [Feature-Sliced Design (FSD)](#feature-sliced-design)
3. [Colocation of Styles and Tests](#colocation)
4. [Monorepos (Turborepo)](#monorepos)
5. [Naming Conventions](#naming-conventions)

---

## 1. Bulletproof React Structure

A common and highly effective pattern is grouping files by feature rather than by file type.

### Directory Example:
```text
src/
├── assets/        # Global images, icons, fonts
├── components/    # Shared, generic UI components (Buttons, Inputs)
├── config/        # Environment vars, constants
├── features/      # Feature-specific modules (The core of the app)
├── hooks/         # Shared custom hooks
├── layouts/       # Structural components (Navbar, Sidebar, Footer)
├── lib/           # Pre-configured 3rd-party libraries (axios, sentry)
├── providers/     # Global Context Providers
├── routes/        # Application routing configuration
├── stores/        # Global state stores (Zustand, Redux)
├── types/         # Global TypeScript definitions
└── utils/         # Generic helper functions
```

### Inside a Feature (`src/features/auth/`):
```text
auth/
├── api/           # API request declarations related to auth
├── components/    # Components only used within auth (LoginForm)
├── hooks/         # Custom hooks specific to auth
├── routes/        # Feature specific routing (Login, Register pages)
├── stores/        # Auth specific state
├── types/         # Auth specific TS types
└── index.ts       # Public API of the auth feature (exports)
```
**Rule:** A feature should only expose elements via its `index.ts`. Components outside the feature should import from `features/auth`, not `features/auth/components/LoginForm`.

---

## 2. Feature-Sliced Design (FSD)

FSD is an architectural methodology tailored for frontend applications, enforcing strict boundaries.

### Layers (Top to Bottom):
1. **App:** Application setup, global styles, providers.
2. **Processes:** Complex workflows spanning multiple pages (optional).
3. **Pages:** Route components.
4. **Widgets:** Complex, standalone UI blocks comprising multiple features.
5. **Features:** User interactions and business value (e.g., `AddToCart`, `SendMessage`).
6. **Entities:** Business entities (e.g., `User`, `Product`, `Article`). Contains data fetching and state.
7. **Shared:** Reusable UI, utils, APIs. Completely devoid of business logic.

**Rule of FSD:** A layer can only import from layers below it. E.g., a Feature can import from Entities and Shared, but an Entity cannot import from a Feature.

---

## 3. Colocation

Place files as close as possible to where they are used.

```text
components/
└── Button/
    ├── Button.tsx           # Component logic and JSX
    ├── Button.module.css    # Scoped styles
    ├── Button.test.tsx      # Unit tests
    └── index.ts             # Export barrel
```
*Benefits:* When you delete or move the `Button`, you move its styles and tests with it automatically.

---

## 4. Monorepos (Turborepo)

For organizations sharing code across multiple React apps (e.g., Admin Panel, Client Web App, React Native App), a monorepo is essential.

### Turborepo Structure
```text
my-monorepo/
├── apps/
│   ├── web/          # Next.js app
│   └── admin/        # Vite React app
├── packages/
│   ├── ui/           # Shared React component library
│   ├── config-eslint/ # Shared ESLint rules
│   └── tsconfig/     # Shared TS configs
├── turbo.json        # Build pipeline configuration
└── package.json
```

**Benefits of Turborepo:**
- **Remote Caching:** If a colleague or CI already built `packages/ui`, your local machine pulls the build from the cache instead of rebuilding.
- **Dependency Management:** Prevents duplicating code and ensures both `web` and `admin` use the same `Button` version.

---

## 5. Naming Conventions

- **Components:** PascalCase (e.g., `UserProfile.tsx`).
- **Hooks:** camelCase prefixed with 'use' (e.g., `useAuth.ts`).
- **Utils/Helpers:** camelCase (e.g., `formatDate.ts`).
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT = 3`).
- **Types/Interfaces:** PascalCase. Prefixing with 'I' or 'T' (e.g., `IUser`) is generally discouraged in modern TS, prefer just `User`.

*End of Document*
