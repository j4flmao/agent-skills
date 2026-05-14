# Jetpack Compose

## Navigation
```kotlin
NavHost(navController, startDestination = "orders") {
    composable("orders") {
        OrderListScreen(onOrderClick = { id -> navController.navigate("orders/$id") })
    }
    composable("orders/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) {
        OrderDetailScreen()
    }
}
```

## State Hoisting
```kotlin
// Screen level (hoisted)
@Composable
fun OrderScreen() {
    var query by remember { mutableStateOf("") }
    OrderSearch(query = query, onQueryChange = { query = it })
}

// Stateless component
@Composable
fun OrderSearch(query: String, onQueryChange: (String) -> Unit) {
    TextField(value = query, onValueChange = onQueryChange)
}
```

## Animations
```kotlin
// AnimatedVisibility
AnimatedVisibility(visible = showDetails) {
    OrderDetails()
}

// animateContentSize
Column(modifier = Modifier.animateContentSize()) { ... }

// Shared element
@ExperimentalSharedTransitionApi
SharedTransitionLayout {
    Image(painter, modifier = Modifier.sharedElement(sharedTransitionScope.rememberSharedContentState(key = "hero")))
}
```
