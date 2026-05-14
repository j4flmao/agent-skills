# Hilt Dependency Injection

## Modules
```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides @Singleton
    fun provideOkHttpClient(): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }).build()

    @Provides @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit = Retrofit.Builder()
        .baseUrl("https://api.example.com/")
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
}
```

## ViewModel Injection
```kotlin
@HiltViewModel
class OrderViewModel @Inject constructor(
    private val getOrders: GetOrdersUseCase,
    private val savedStateHandle: SavedStateHandle
) : ViewModel() { ... }

// In composable
@Composable
fun OrdersScreen(viewModel: OrderViewModel = hiltViewModel()) { ... }
```

## Scopes
| Scope | Lifetime |
|---|---|
| `@Singleton` | Application |
| `@ActivityRetainedScoped` | Activity (survives config change) |
| `@ViewModelScoped` | ViewModel |
| `@FragmentScoped` | Fragment |
| `@ActivityScoped` | Activity |
