# Mobile Testing Strategies

## Test Pyramid for Mobile

```
        ╱ E2E ╲          Few tests (critical flows)
       ╱ Integration ╲    Some tests (feature integration)
      ╱   Unit Tests   ╲  Many tests (business logic)
     ╱ Component/UI Tests ╲
```

### Test Distribution
| Layer | Speed | Count | Focus |
|-------|-------|-------|-------|
| Unit | ms | 60% | Business logic, ViewModels, use cases |
| Component | seconds | 20% | UI components, composables, widgets |
| Integration | seconds-minutes | 15% | Feature flows, database, network |
| E2E | minutes | 5% | Critical user journeys |

## Unit Testing

### ViewModel Testing
```kotlin
@Test
fun `loadUser sets loading state then user data`() = runTest {
    val repo = FakeUserRepository()
    val viewModel = UserViewModel(repo)

    viewModel.loadUser("123")

    assertEquals(true, viewModel.state.value.isLoading)

    advanceUntilIdle() // Process coroutine

    assertEquals(false, viewModel.state.value.isLoading)
    assertNotNull(viewModel.state.value.user)
    assertEquals("Test User", viewModel.state.value.user?.name)
}
```

### Use Case Testing
```kotlin
@Test
fun `getFeed returns user's preferred feed`() = runTest {
    val feedRepo = FakeFeedRepository()
    val userRepo = FakeUserRepository().apply {
      savedUser = User(id = "1", preferences = listOf("tech"))
    }
    val useCase = GetUserFeedUseCase(feedRepo, userRepo)

    val result = useCase("1")

    assertTrue(result.isSuccess)
    assertEquals(3, result.getOrNull()?.items?.size)
}
```

## UI/Component Testing

### Compose Tests
```kotlin
@Test
fun `button shows loading state when clicked`() {
    composeTestRule.setContent {
        SubmitButton(onClick = { /* simulate loading */ })
    }

    composeTestRule.onNodeWithText("Submit").performClick()
    composeTestRule.onNodeWithTag("loading-indicator").assertExists()
}
```

### SwiftUI Preview Tests
```swift
func testProfileViewDisplaysUserData() throws {
    let view = ProfileView(user: .mock())
    let hostingController = UIHostingController(rootView: view)

    XCTAssertTrue(hostingController.view.contains(text: "John Doe"))
}
```

## Integration Testing

### Database Tests
```kotlin
@Test
fun `user repository saves and retrieves user`() = runTest {
    val dao = TestDatabase.create().userDao()
    val repo = UserRepository(dao)

    repo.saveUser(User(id = "1", name = "Test"))
    val loaded = repo.getUser("1")

    assertEquals("Test", loaded?.name)
}
```

### Network Mocking
```typescript
// Mock API responses
server.use(
  rest.get('/api/users/:id', (req, res, ctx) => {
    return res(ctx.json({ id: req.params.id, name: 'Test' }))
  })
)
```

## E2E Testing

### Detox (React Native)
```javascript
describe('Login Flow', () => {
  it('should login successfully', async () => {
    await element(by.id('email-input')).typeText('user@test.com')
    await element(by.id('password-input')).typeText('password123')
    await element(by.id('login-button')).tap()
    await expect(element(by.id('home-screen'))).toBeVisible()
  })
})
```

### XCUITest / Espresso
- Espresso: Write in Kotlin/Java for Android
- XCUITest: Write in Swift for iOS
- Kaspresso: Kotlin wrapper for Espresso
- EarlGrey: Google's iOS UI test framework
