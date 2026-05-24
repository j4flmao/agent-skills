# Jetpack Compose Performance Optimization

## Recomposition Fundamentals

### What Triggers Recomposition
```kotlin
@Composable
fun ExpensiveScreen(viewModel: MyViewModel) {
    // Recomposition triggers:
    // 1. State change: State<T>.value changes
    // 2. Snapshot system detects mutation
    // 3. Parent composable recomposes (not all children — only those with changed inputs)

    val items by viewModel.items.collectAsStateWithLifecycle()
    val filter by viewModel.filter.collectAsStateWithLifecycle()

    // This entire composable recomposes when items OR filter changes
    // Items list: only modified nodes recompose
    LazyColumn {
        items(items, key = { it.id }) { item ->
            ItemRow(item) // Only recomposed if item changes
        }
    }
}
```

### Skipping Recomposition
```kotlin
// Stable types skip recomposition automatically
// Stable: primitives, String, function types (lambda), State<T>
// @Stable annotation for custom types

@Stable
data class User(
    val id: String,
    val name: String,
    val avatar: String
) // All properties are immutable — Always stable

data class MutableUser(
    var id: String,
    var name: String,
    var avatar: String
) // Mutable var — NEVER stable, always recomposes
```

### Using `*` (restartable/skippable)
```kotlin
@Composable // Compose compiler marks as Restartable + Skippable
fun Greeting(name: String) { // Stable parameter → skippable
    Text("Hello $name") // Only recomposes when name changes
}

@Composable
fun NonSkippableGreeting(name: String, onClick: () -> Unit) {
    // onClick is a lambda — captured values may change
    // Use stable lambdas: remember onClick or pass viewModel method
    Text("Hello $name")
}

// Fix: stable callback
@Composable
fun BetterGreeting(name: String, onGreet: () -> Unit) {
    Text("Hello $name")
}

// Caller
BetterGreeting(
    name = viewModel.userName,
    onGreet = remember { { viewModel.greet() } } // Stable lambda
)
```

## Lazy List Optimization

### Keys in LazyColumn/LazyRow
```kotlin
@Composable
fun OptimizedList(items: List<Item>) {
    LazyColumn {
        // Keys are critical for:
        // 1. Identity preservation across recomposition
        // 2. Correct animations (animateItemPlacement)
        // 3. Scroll position preservation
        // 4. Minimal recomposition

        items(
            items = items,
            key = { item -> item.id } // Stable unique key
        ) { item ->
            ItemRow(item)
        }
    }
}

// Bad: index-based keys
items(items, key = { index -> index }) {
    // Items shifting position cause full recomposition
    // Animations break — old item animates to wrong position
}

// Good: stable ID from data
items(items, key = { item -> item.id }) {
    // Only the moved item recomposes
    // animateItemPlacement() works correctly
}
```

### Content Type
```kotlin
@Composable
fun HeterogeneousList(items: List<Any>) {
    LazyColumn {
        items(
            items = items,
            contentType = { item ->
                when (item) {
                    is Header -> "header"
                    is Item -> "item"
                    is Ad -> "ad"
                    else -> "unknown"
                }
            }
        ) { item ->
            when (item) {
                is Header -> HeaderView(item)
                is Item -> ItemView(item)
                is Ad -> AdView(item)
            }
        }
    }

    // Content type enables:
    // 1. Separate view pools per type
    // 2. Better prefetching
    // 3. More efficient recycling
}
```

### Prefetching
```kotlin
@Composable
fun PrefetchingList(items: List<Item>) {
    val listState = rememberLazyListState()

    LazyColumn(
        state = listState
    ) {
        items(items, key = { it.id }) { item ->
            ItemRow(item)
        }
    }

    // LazyColumn prefetches items before they scroll into view
    // Controlled by LazyColumn's prefetchState
    // — Images should use coil/fresco with compose integration
    // — Network calls should be triggered by LazyListState's firstVisibleItemIndex
}
```

## graphicsLayer for Animations

```kotlin
@Composable
fun AnimatedCard(modifier: Modifier = Modifier) {
    var expanded by remember { mutableStateOf(false) }

    Box(
        modifier = modifier
            .size(100.dp)
            .graphicsLayer {
                // graphicsLayer applies transformations at the
                // rendering layer — NOT via composition
                // This means animations DON'T trigger recomposition

                scaleX = if (expanded) 1.2f else 1f
                scaleY = if (expanded) 1.2f else 1f
                alpha = if (expanded) 1f else 0.5f
                shadowElevation = if (expanded) 8f else 2f

                // Translation
                translationX = if (expanded) 20f else 0f
                translationY = if (expanded) -20f else 0f

                // Rotation
                rotationX = 0f
                rotationY = 0f
                rotationZ = if (expanded) 5f else 0f
            }
            .clip(RoundedCornerShape(16.dp))
    ) {
        // Content
    }
}

// VS Modifier.scale(), alpha(), etc. which DO trigger recomposition
// Use graphicsLayer for perf-critical animations:
// — Frame-by-frame changes (drag, scroll, gesture)
// — 60fps animations with animate*AsState
```

## derivedStateOf

```kotlin
@Composable
fun DerivedStateExample(items: List<Item>, scrollState: LazyListState) {
    // Bad: recomputes every frame on any state change
    val visibleItems = scrollState.layoutInfo.visibleItemsInfo
    val firstVisible = if (visibleItems.isNotEmpty()) visibleItems[0].key else null

    // Good: only recomputes when dependency changes
    val firstVisibleItem by remember {
        derivedStateOf {
            val visible = scrollState.layoutInfo.visibleItemsInfo
            if (visible.isNotEmpty()) visible[0].key else null
        }
    }

    // Bad: recomputed on every recomposition
    val filteredExpensive = items.filter { it.matches(filter) }

    // Good: only recomputed when items OR filter changes
    val filteredItems by remember(items, filter) {
        derivedStateOf {
            items.filter { it.matches(filter) }
        }
    }

    // derivedStateOf vs remember(x) { computation }:
    // — derivedStateOf: lazy, evaluated on first read
    // — remember(x): computed immediately on every x change
    // Prefer derivedStateOf for expensive computations read from composition
}
```

## Snapshot System

```kotlin
// Compose has a snapshot-based observation system
// Each state read creates a dependency in the current snapshot

class SnapshotAwareViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    // Snapshot reads inside composition are tracked
    // Only composables that READ the changed state recompose

    fun updateName(name: String) {
        _uiState.update { it.copy(name = name) }
        // Only composables reading uiState.name recompose
    }
}

@Composable
fun SnapshotDemo(state: UiState) {
    Column {
        // This reads name — recomposes when name changes
        Text(state.name)

        // This reads age — recomposes when age changes
        Text("${state.age}")

        // This reads nothing from state — NEVER recomposes
        Text("Static")
    }
}
```

## Baseline Profiles

```kotlin
// BaselineProfile.kt (in baseline-profile module)
// Improves cold-start performance by ~30-40%

class MainActivityBaselineProfile : BaselineProfileRule {

    @Test
    fun generateBaselineProfile() {
        collectBaselineProfile(
            packageName = "com.example.app",
            maxProfileSize = 10000
        ) {
            // Critical user journeys
            pressHome()
            startActivity("com.example.app/.MainActivity")

            // Wait for content
            device.wait(Until.hasObject(
                hasTestTag("feed_list")
            ), 5000)

            // Scroll through feed
            device.findObject(isScrollable()).also { feed ->
                feed.fling(Direction.DOWN)
                waitForIdle()
                feed.fling(Direction.DOWN)
            }

            // Tap first item
            device.findObject(hasTestTag("feed_item_0")).click()

            // Navigate back
            device.pressBack()
        }
    }
}
```

### Cloud profiles
```groovy
// build.gradle.kts
android {
    buildTypes {
        release {
            enableAndroidTestCoverage = false
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // Baseline profiles bundled in release
        }
    }
}
```

## Measure and Layout

```kotlin
@Composable
fun EfficientLayout() {
    // Avoid:
    // 1. Box with many overlapping elements with large alpha
    // 2. Nested LazyColumn inside LazyColumn (fixed height solves)
    // 3. Modifier.fillMaxSize().size(100.dp) — redundant calls
    // 4. Deep composable hierarchy (prefer flat layouts)

    // Use:
    // 1. Intrinsic measurements sparingly (they force 2-pass)
    // 2. SubcomposeLayout for advanced custom layouts
    // 3. Layout composable for custom but efficient layouts
}
```

## Compose Compiler Metrics

```bash
# Enable compiler reports
# build.gradle.kts
kotlin {
    composeCompiler {
        reportsDestination = layout.buildDirectory.dir("compose-compiler-reports")
        metricsDestination = layout.buildDirectory.dir("compose-compiler-metrics")
    }
}

# Check generated reports:
# — app/build/compose-compiler-metrics/composables.txt
# — Look for: restartable, skippable, readonly properties
# — Non-restartable composables may cause issues

# Target: 80%+ skippable composables in hot paths
```

## Key Anti-patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Mutable state in ViewModel exposed as MutableStateFlow | Uncontrolled writes | Expose as StateFlow, use update {} |
| Large composable functions | Everything recomposes | Extract into small composables |
| State hoisting to wrong level | Too many recompositions | Hoist state to nearest common ancestor |
| Using mutableStateListOf with no key | Missing item identity | Add key parameter |
| Expensive operations in composition | UI thread blocked | Move to coroutine, use LaunchedEffect |
| remember with lambdas | Lambda recreated every composition | Use remember { lambda } pattern |
