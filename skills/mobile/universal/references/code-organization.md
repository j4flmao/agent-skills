# Mobile Code Organization

How to lay out source code, modules, resources and configuration in mobile projects so features stay independent, builds stay fast and ownership is clear. Covers feature-first folders, module/package boundaries per platform, naming, environment configuration and generated code.

## Feature-First vs Layer-First

| Layout | Structure | Works when |
|--------|-----------|-----------|
| Layer-first | `views/`, `viewmodels/`, `repositories/` at top level | Very small apps |
| Feature-first | `features/orders/{ui,data,domain}` | Most apps; scales with team size |
| Feature modules | Separate Gradle modules / Swift packages / Dart packages per feature | Multiple teams, long build times |

Feature-first keeps everything for a feature together, so deleting or moving a feature is one directory.

## Reference Layouts

### Android (Gradle multi-module)
```text
app/                         # Application, DI graph, NavHost
build-logic/                 # convention plugins (Android/Kotlin config shared by modules)
core/
  designsystem/              # theme, components
  network/                   # Retrofit/Ktor client, interceptors
  database/                  # Room DB, DAOs
  data/                      # repositories
  testing/                   # fakes, test rules
feature/
  orders/                    # screens + ViewModels
  profile/
gradle/libs.versions.toml    # version catalog
```

Use a version catalog for dependency versions and convention plugins in `build-logic` instead of copy-pasted `android {}` blocks.

### iOS (Xcode project + local Swift packages)
```text
App/                         # @main, composition root, Info.plist
Packages/
  DesignSystem/              # Package.swift, Sources/, Tests/
  Networking/
  Persistence/
  Features/
    Orders/                  # OrdersFeature target
    Profile/
Config/
  Debug.xcconfig
  Release.xcconfig
```

Local Swift packages give enforced module boundaries (`internal` by default) and faster incremental builds than one large target.

### Flutter
```text
lib/
  main.dart                  # bootstrap per flavor: main_dev.dart, main_prod.dart
  app/                       # MaterialApp, router, theme
  features/
    orders/
      data/                  # DTOs, repository impl
      domain/                # models, repository interface
      presentation/          # widgets, notifiers/blocs
  core/                      # networking, storage, utils
test/                        # mirrors lib/
integration_test/
```

For large apps, extract features into packages managed by a workspace tool (Pub workspaces or melos).

### React Native / Expo
```text
app/                         # Expo Router file-based routes (or src/navigation)
src/
  features/
    orders/
      api.ts                 # queries/mutations
      components/
      hooks/
      screens/
  shared/
    ui/
    lib/                     # http client, storage, analytics
  theme/
```

Enforce boundaries with ESLint import rules (e.g. features may import `shared/`, not other features).

## Boundary Rules

1. Features depend on core/shared, never on each other.
2. Cross-feature navigation uses route definitions in a shared navigation module or the app module.
3. Public API of a module is explicit: Kotlin `internal`, Swift access control, Dart `src/` + exported barrel file, TS `index.ts`.
4. Core modules have no UI dependencies unless they are UI modules.
5. Test utilities live in a dedicated testing module, not in production code.

## Naming

| Element | Convention |
|---------|-----------|
| Screens | `OrdersScreen` / `OrdersView` / `OrdersPage` (pick one per codebase) |
| State holder | `OrdersViewModel`, `OrdersNotifier`, `OrdersBloc` |
| Repository | `OrderRepository` interface, `DefaultOrderRepository` / `OrderRepositoryImpl` |
| DTO vs model | `OrderDto` (wire) vs `Order` (domain) vs `OrderUi` (presentation) |
| Files | Kotlin/Swift: one main type per file named after it; Dart: `snake_case.dart`; TS: `PascalCase.tsx` for components |

## Configuration and Environments

| Platform | Mechanism |
|----------|-----------|
| Android | Product flavors (`dev`, `prod`) + `buildConfigField`/resources; `applicationIdSuffix` for side-by-side installs |
| iOS | Schemes + build configurations + `.xcconfig` files; values read from `Info.plist` |
| Flutter | `--flavor` + `--dart-define` / `--dart-define-from-file=env/prod.json` |
| React Native/Expo | `app.config.ts` reading env vars; EAS build profiles |

Rules:
- Secrets that must stay secret (signing keys, server API secrets) never ship in the app; anything in the binary is extractable.
- Public identifiers (API base URL, public analytics keys) can be build-time configuration.
- Keep environment files for CI in the secret store, not the repository.

## Resources

- Strings in platform localization files (`strings.xml`, String Catalogs `.xcstrings`, ARB files for Flutter, i18n JSON for RN); never hard-coded in UI code.
- Images: vector where possible (Android VectorDrawable, SF Symbols / PDF assets, SVG via a library); raster in all required densities/scales.
- Design tokens (colors, spacing, typography) defined once in the design system module.

## Generated Code

| Generator | Output | Policy |
|-----------|--------|--------|
| Room/KSP, Hilt, Moshi/kotlinx.serialization | Build directory | Not committed |
| Swift OpenAPI Generator | Build plugin output | Not committed |
| Flutter `build_runner` (freezed, json_serializable, riverpod_generator) | `*.g.dart`, `*.freezed.dart` | Team choice; commit if CI should not run generators, otherwise ignore |
| GraphQL codegen | Typed operations | Generated in CI from the schema |

Be consistent; mixing committed and uncommitted generated files causes stale-code bugs.

## Tooling to Enforce Structure

- Android: module dependency graph checks (e.g. a Gradle plugin or custom task), `detekt`/`ktlint`.
- iOS: SwiftLint, package boundaries.
- Flutter: `analysis_options.yaml` with lints, custom import rules (e.g. via `custom_lint`).
- RN: ESLint `import/no-restricted-paths` or boundaries plugin, TypeScript path aliases.

## Checklist

- [ ] Feature-first structure; modules once build time or team count demands
- [ ] Features isolated; explicit public APIs
- [ ] Dependency versions centralized (version catalog, Package.swift, pubspec, package.json)
- [ ] Environments via flavors/schemes/defines; no secrets in the binary
- [ ] Generated-code policy documented and enforced in CI
