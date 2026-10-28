# Kotlin Backend Code Organization

How to lay out packages, Gradle modules, and source files in a Kotlin service so that ownership is clear, builds stay fast, and the dependency direction is enforceable.

## Package by Feature, Not by Layer

```
com.acme.billing
├── invoices/
│   ├── InvoiceRoutes.kt        # HTTP adapter
│   ├── InvoiceService.kt       # use cases
│   ├── InvoiceRepository.kt    # port + Exposed implementation
│   ├── Invoice.kt              # domain model
│   └── InvoiceDtos.kt          # request/response DTOs
├── customers/
├── shared/                     # money, ids, clock, error types
└── Application.kt              # composition root
```

Package-by-layer (`controllers/`, `services/`, `repositories/`) scatters one feature across many folders and invites cross-feature coupling. Use `internal` to hide feature internals when features live in separate modules.

## Gradle Multi-Module Layout

```
settings.gradle.kts
build-logic/                  # convention plugins (kotlin-jvm, testing, detekt)
gradle/libs.versions.toml     # version catalog
app/                          # main(), wiring, config files
domain/                       # pure Kotlin, no framework deps
features/invoices/
features/customers/
infra/persistence/
infra/messaging/
```

```kotlin
// settings.gradle.kts
pluginManagement { includeBuild("build-logic") }
rootProject.name = "billing"
include(":app", ":domain", ":features:invoices", ":features:customers", ":infra:persistence")
```

```toml
# gradle/libs.versions.toml
[versions]
ktor = "3.2.3"      # example pin; bump via Renovate/Dependabot after checking release notes

[libraries]
ktor-server-core = { module = "io.ktor:ktor-server-core", version.ref = "ktor" }
ktor-server-netty = { module = "io.ktor:ktor-server-netty", version.ref = "ktor" }

[plugins]
ktor = { id = "io.ktor.plugin", version.ref = "ktor" }
```

Convention plugins in `build-logic` replace copy-pasted `subprojects {}` blocks and keep configuration cache compatible.

## Module Dependency Rules

| Module | May depend on | Must not depend on |
|--------|---------------|--------------------|
| `domain` | Kotlin stdlib, kotlinx-coroutines-core | Ktor, Spring, JDBC, serialization frameworks |
| `features:*` | `domain`, `shared` | other features' internals |
| `infra:*` | `domain` (implements ports) | `features` |
| `app` | everything | — |

Use `api` vs `implementation` correctly: `implementation` keeps transitive deps off consumers' compile classpath and speeds incremental builds.

## File-Level Conventions

- One public top-level class per file named after it; small related sealed hierarchies may share a file.
- Extension functions grouped by receiver in `XxxExtensions.kt` inside the feature that needs them; avoid a global `Utils.kt`.
- Top-level functions for Ktor route definitions: `fun Route.invoiceRoutes(service: InvoiceService)`.
- DTOs separate from domain classes; mapping functions as extensions (`fun Invoice.toDto()`).
- Constants in `companion object` only when tied to the class; otherwise top-level `const val`.

## Visibility

```kotlin
// features/invoices
internal class InvoiceNumberGenerator(private val clock: Clock) {
    fun next(sequence: Long): String = "INV-${LocalDate.now(clock).year}-$sequence"
}

class InvoiceService internal constructor(
    private val repo: InvoiceRepository,
    private val numbers: InvoiceNumberGenerator,
) {
    suspend fun issue(customerId: Long): Invoice =
        repo.save(Invoice.draft(customerId, numbers.next(repo.nextSequence())))
}
```

- Default to `internal` inside modules; expose only use-case entry points.
- `private` top-level declarations are file-private, useful for helpers.
- Test code in the same module can see `internal` members.

## Configuration Files

```
app/src/main/resources/
├── application.yaml        # Ktor HOCON/YAML or Spring config, values injected from environment variables
└── logback.xml
```

```yaml
ktor:
  deployment:
    port: ${PORT:8080}
database:
  url: ${DATABASE_URL}
  maxPoolSize: ${DB_POOL_SIZE:10}
```

Bind config to a typed data class at startup and fail fast when required keys are missing.

## Static Analysis

- `ktlint` (formatting) and `detekt` (code smells, complexity) in CI as Gradle tasks.
- Konsist or ArchUnit tests to assert package rules, for example "classes in `..domain..` must not import `io.ktor`".

```kotlin
class ArchitectureTest {
    @Test
    fun `domain does not depend on ktor`() {
        Konsist.scopeFromModule("domain").files.assertFalse { file ->
            file.imports.any { it.name.startsWith("io.ktor") }
        }
    }
}
```

## Pitfalls

- A `common` module that grows into a dumping ground; split by purpose or inline into the owner.
- Exposing mutable collections from services; return `List`, not `MutableList`.
- Leaking Exposed `ResultRow` or JPA entities beyond the persistence module.
- Versions hard-coded in each `build.gradle.kts` instead of the version catalog.

## Checklist

- [ ] Feature packages, not layer packages
- [ ] Version catalog + convention plugins
- [ ] Module dependency rules enforced by build or tests
- [ ] `internal` by default; small public surface per module
- [ ] Typed configuration validated at startup
- [ ] ktlint + detekt run in CI
