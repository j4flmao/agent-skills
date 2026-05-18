# React Native Architecture

## Folder Structure (bare workflow)

```
src/
├── app/                    # App setup, providers, navigation
│   ├── App.tsx
│   ├── providers.tsx
│   └── router.tsx
├── features/
│   ├── orders/
│   │   ├── api/            # TanStack Query hooks
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom hooks
│   │   ├── types/          # TypeScript types
│   │   └── index.ts        # Public API
│   └── ...
├── shared/
│   ├── components/
│   ├── hooks/
│   └── utils/
├── lib/
│   ├── api.ts              # Axios/fetch wrapper
│   └── query.ts            # QueryClient config
├── store/                  # Zustand stores
└── types/
```

## New Architecture (Fabric + TurboModules)

Enabled in `Podfile`:

```ruby
ENV['RCT_NEW_ARCH_ENABLED'] = '1'
```

In `gradle.properties`:

```properties
newArchEnabled=true
```

## Expo managed vs bare

| Aspect | Expo (managed) | Bare workflow |
|--------|---------------|---------------|
| Setup | Zero config | Manual native project |
| Native modules | Expo SDK only | Any native code |
| Updates | OTA via EAS | Manual |
| EAS Build | Built-in | Works but overkill |
| When | 80% of apps | Custom native code needed |
