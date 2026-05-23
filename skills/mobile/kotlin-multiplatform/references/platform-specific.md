# Platform-Specific Implementations

## Compose Multiplatform Setup

```kotlin
// build.gradle.kts — Compose Multiplatform plugin
plugins {
    id("org.jetbrains.compose")
    id("org.jetbrains.kotlin.plugin.compose")
}
kotlin {
    sourceSets {
        commonMain.dependencies {
            implementation(compose.runtime)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation(compose.ui)
            implementation(compose.components.resources)
        }
    }
}
```

## Shared Composable Screens

```kotlin
// commonMain — Shared UI screen with ViewModel
@Composable
fun ProductScreen(viewModel: ProductViewModel) {
    val state by viewModel.state.collectAsState()
    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Products") },
                      actions = { IconButton(onClick = viewModel::refresh) {
                          Icon(Icons.Default.Refresh, "Refresh") } })
        }
    ) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize()) {
                CircularProgressIndicator(Modifier.align(Alignment.Center))
            }
            state.error != null -> ErrorView(state.error!!, viewModel::retry)
            else -> ProductList(state.products, onProductClick = viewModel::selectProduct)
        }
    }
}

@Composable
fun ProductList(products: List<Product>, onProductClick: (Product) -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp)) {
        items(products, key = { it.id }) { product ->
            ProductCard(product, onClick = { onProductClick(product) })
        }
    }
}

@Composable
fun ProductCard(product: Product, onClick: () -> Unit) {
    Card(Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable(onClick = onClick)) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            AsyncImage(product.imageUrl, Modifier.size(64.dp), contentScale = ContentScale.Crop)
            Spacer(Modifier.width(12.dp))
            Column {
                Text(product.name, style = MaterialTheme.typography.titleMedium)
                Text("$${product.price}", style = MaterialTheme.typography.bodyMedium,
                     color = MaterialTheme.colorScheme.primary)
            }
        }
    }
}
```

## Navigation with Voyager

```kotlin
// commonMain — Navigation setup
import cafe.adriel.voyager.navigator.Navigator
import cafe.adriel.voyager.transitions.SlideTransition

@Composable
fun App() {
    MaterialTheme {
        Navigator(HomeScreen()) { navigator ->
            SlideTransition(navigator)
        }
    }
}

class HomeScreen : Screen {
    @Composable
    override fun Content() {
        val navigator = LocalNavigator.currentOrThrow
        Button(onClick = { navigator.push(ProductScreen(productId = "42")) }) {
            Text("View Product")
        }
    }
}

data class ProductScreen(val productId: String) : Screen {
    @Composable
    override fun Content() {
        val navigator = LocalNavigator.currentOrThrow
        Text("Product: $productId")
        Button(onClick = { navigator.pop() }) { Text("Back") }
    }
}
```

## Platform Theming

```kotlin
// commonMain/com/app/theme/Theme.kt
expect val platformColors: Colors

@Composable
fun AppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colors = platformColors,
        typography = AppTypography,
        shapes = AppShapes,
        content = content
    )
}

val AppTypography = Typography(
    headlineLarge = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.Bold),
    titleMedium = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.15.sp),
    bodyLarge = TextStyle(fontSize = 16.sp, letterSpacing = 0.5.sp),
)

val AppShapes = Shapes(
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
)

// androidMain/com/app/theme/Theme.kt
actual val platformColors: Colors get() = dynamicLightColorScheme(LocalContext.current)

// iosMain/com/app/theme/Theme.kt
actual val platformColors: Colors = lightColorScheme(
    primary = Color(0xFF007AFF),     // iOS system blue
    secondary = Color(0xFF5856D6),   // iOS system indigo
    tertiary = Color(0xFF34C759),    // iOS system green
    background = Color(0xFFF2F2F7),  // iOS system gray6
    surface = Color(0xFFFFFFFF),
    error = Color(0xFFFF3B30),       // iOS system red
    onPrimary = Color.White,
    onBackground = Color(0xFF1C1C1E),
)
```

## Platform Composables via expect/actual

```kotlin
// commonMain/com/app/platform/PlatformComposables.kt
@Composable
expect fun MapView(latitude: Double, longitude: Double, zoom: Float)

@Composable
expect fun WebView(url: String, onPageLoaded: () -> Unit)

@Composable
expect fun CameraPreview(onImageCaptured: (ByteArray) -> Unit)

// androidMain — AndroidView wrapper
@Composable
actual fun MapView(latitude: Double, longitude: Double, zoom: Float) {
    AndroidView(
        factory = { ctx ->
            com.google.android.gms.maps.MapView(ctx).apply {
                getMapAsync { map ->
                    map.moveCamera(CameraUpdateFactory.newLatLngZoom(
                        LatLng(latitude, longitude), zoom))
                }
            }
        },
        modifier = Modifier.fillMaxSize()
    )
}

// iosMain — UIKitView wrapper
@Composable
actual fun WebView(url: String, onPageLoaded: () -> Unit) {
    UIKitView(
        factory = {
            WKWebView().apply {
                loadRequest(NSURLRequest(NSURL(string = url)))
                navigationDelegate = object : NSObject(), WKNavigationDelegateProtocol {
                    // onPageLoaded callback
                }
            }
        },
        modifier = Modifier.fillMaxSize()
    )
}
```

## Platform-Specific Testing

```kotlin
// commonTest — Shared test for business logic
class ProductRepositoryTest {
    @Test
    fun `getProducts returns cached data when online`() = runTest {
        val repo = ProductRepository(mockDao, mockApi, mockConnectivity)
        val result = repo.getProducts().first()
        assertTrue(result.isNotEmpty())
    }
}

// androidUnitTest — Android-specific test
class AndroidSqlDriverTest {
    @Test
    fun `database creation succeeds`() {
        val driver = AndroidSqliteDriver(Database.Schema, context, "test.db")
        assertNotNull(driver)
    }
}

// iosTest — iOS-specific test
class IosPlatformTest {
    @Test
    fun `generateUuid returns valid UUID`() {
        val uuid = generateUuid()
        assertTrue(uuid.length == 36) // Standard UUID format
    }
}
```

No preamble. No postamble. No explanations.
