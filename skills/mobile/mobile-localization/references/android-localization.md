# Android Localization

## Overview
Android localization adapts your app for different languages, regions, and cultural conventions using resource qualifiers. Android's resource system automatically selects the correct strings, layouts, drawables, and other resources based on the device locale.

## String Resources

### Resource Directory Structure

```xml
res/
  values/                    <!-- Base (default) resources -->
    strings.xml
    plurals.xml
    arrays.xml
  values-es/                 <!-- Spanish -->
    strings.xml
  values-fr/                 <!-- French -->
    strings.xml
  values-ja/                 <!-- Japanese -->
    strings.xml
  values-ar/                 <!-- Arabic (RTL) -->
    strings.xml
  values-zh-rCN/             <!-- Simplified Chinese (China) -->
    strings.xml
  values-pt-rBR/             <!-- Portuguese (Brazil) -->
    strings.xml
  values-de/                 <!-- German -->
    strings.xml
  values-in/                 <!-- Indonesian -->
    strings.xml
  values-rtl/                <!-- RTL-specific overrides -->
    strings.xml
```

### String Resource Files

```xml
<!-- res/values/strings.xml (English - default) -->
<resources>
    <string name="app_name">Sales Dashboard</string>
    <string name="nav_dashboard">Dashboard</string>
    <string name="nav_orders">Orders</string>
    <string name="nav_products">Products</string>
    <string name="nav_settings">Settings</string>
    <string name="nav_profile">Profile</string>

    <string name="sales_title">Sales</string>
    <string name="revenue_total">Total Revenue</string>
    <string name="revenue_daily">Daily Revenue</string>
    <string name="revenue_monthly">Monthly Revenue</string>
    <string name="order_status_pending">Pending</string>
    <string name="order_status_shipped">Shipped</string>
    <string name="order_status_delivered">Delivered</string>
    <string name="product_popular">Popular Products</string>
    <string name="product_out_of_stock">Out of Stock</string>

    <string name="common_save">Save</string>
    <string name="common_cancel">Cancel</string>
    <string name="common_delete">Delete</string>
    <string name="common_search">Search</string>
    <string name="common_loading">Loading...</string>
    <string name="common_error">An error occurred</string>
    <string name="common_retry">Retry</string>
    <string name="common_no_results">No results found</string>

    <string name="order_count">%d orders</string>
    <string name="product_count">%d products</string>
    <string name="revenue_format">$%1$s</string>
</resources>
```

```xml
<!-- res/values-fr/strings.xml (French) -->
<resources>
    <string name="app_name">Tableau de bord</string>
    <string name="nav_dashboard">Tableau de bord</string>
    <string name="nav_orders">Commandes</string>
    <string name="nav_products">Produits</string>
    <string name="sales_title">Ventes</string>
    <string name="revenue_total">Revenu total</string>
    <string name="revenue_daily">Revenu quotidien</string>
    <string name="order_status_pending">En attente</string>
    <string name="order_status_shipped">Expédié</string>
    <string name="order_status_delivered">Livré</string>
    <string name="common_save">Enregistrer</string>
    <string name="common_cancel">Annuler</string>
    <string name="common_search">Rechercher</string>
    <string name="common_loading">Chargement...</string>
    <string name="common_retry">Réessayer</string>
    <string name="order_count">%d commandes</string>
</resources>
```

## Plural Rules

```xml
<!-- res/values/plurals.xml (English) -->
<resources>
    <plurals name="order_count">
        <item quantity="one">%d order</item>
        <item quantity="other">%d orders</item>
    </plurals>
    <plurals name="product_count">
        <item quantity="one">%d product</item>
        <item quantity="other">%d products</item>
    </plurals>
    <plurals name="revenue_days">
        <item quantity="one">%d day</item>
        <item quantity="other">%d days</item>
    </plurals>
</resources>
```

```xml
<!-- res/values-ar/plurals.xml (Arabic - 6 plural forms) -->
<resources>
    <plurals name="order_count">
        <item quantity="zero">لا توجد طلبات</item>
        <item quantity="one">طلب واحد</item>
        <item quantity="two">طلبان</item>
        <item quantity="few">%d طلبات</item>
        <item quantity="many">%d طلبًا</item>
        <item quantity="other">%d طلب</item>
    </plurals>
    <plurals name="product_count">
        <item quantity="zero">لا توجد منتجات</item>
        <item quantity="one">منتج واحد</item>
        <item quantity="two">منتجان</item>
        <item quantity="few">%d منتجات</item>
        <item quantity="many">%d منتجًا</item>
        <item quantity="other">%d منتج</item>
    </plurals>
</resources>
```

```xml
<!-- res/values-ja/plurals.xml (Japanese - single form) -->
<resources>
    <plurals name="order_count">
        <item quantity="other">%d件の注文</item>
    </plurals>
    <plurals name="product_count">
        <item quantity="other">%d個の商品</item>
    </plurals>
</resources>
```

## Using Resources in Code

### Kotlin Usage

```kotlin
class DashboardActivity : AppCompatActivity() {

    private lateinit var binding: ActivityDashboardBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDashboardBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val orderCount = 42
        val revenue = 12500.00

        binding.titleTextView.text = getString(R.string.sales_title)
        binding.revenueTextView.text = getString(
            R.string.revenue_format,
            formatCurrency(revenue)
        )
        binding.orderCountTextView.text = resources.getQuantityString(
            R.plurals.order_count, orderCount, orderCount
        )
    }
}
```

### Jetpack Compose Usage

```kotlin
@Composable
fun DashboardScreen() {
    val context = LocalContext.current
    val resources = context.resources
    val orderCount = 42
    val revenue = 12500.00

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = stringResource(R.string.sales_title),

        )

        Text(
            text = stringResource(R.string.revenue_total),

            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Text(
            text = formatCurrency(revenue),

            fontWeight = FontWeight.Bold
        )

        Text(
            text = resources.getQuantityString(
                R.plurals.order_count, orderCount, orderCount
            ),

        )
    }
}
```

## Number and Date Formatting

```kotlin
object Formatters {
    private val currencyFormatter: NumberFormat = NumberFormat.getCurrencyInstance()
    private val decimalFormatter: NumberFormat = NumberFormat.getNumberInstance().apply {
        maximumFractionDigits = 2
        minimumFractionDigits = 0
    }
    private val percentFormatter: NumberFormat = NumberFormat.getPercentInstance().apply {
        maximumFractionDigits = 1
    }
    private val compactFormatter: NumberFormat = NumberFormat.getCompactNumberInstance(
        Locale.getDefault(),
        NumberFormat.Style.SHORT
    )

    fun formatCurrency(amount: Double): String {
        return currencyFormatter.format(amount)
    }

    fun formatCompact(value: Long): String {
        return compactFormatter.format(value)
    }

    fun formatDate(date: Date): String {
        return DateFormat.getDateInstance(DateFormat.MEDIUM).format(date)
    }

    fun formatTime(date: Date): String {
        return DateFormat.getTimeInstance(DateFormat.SHORT).format(date)
    }

    fun formatRelative(date: Date): String {
        val now = Date()
        val diff = now.time - date.time
        return when {
            diff < 60_000 -> "Just now"
            diff < 3_600_000 -> "${diff / 60_000}m ago"
            diff < 86_400_000 -> "${diff / 3_600_000}h ago"
            diff < 604_800_000 -> "${diff / 86_400_000}d ago"
            else -> formatDate(date)
        }
    }
}
```

## Layout Mirroring

### Manifest Configuration

```xml
<!-- AndroidManifest.xml -->
<application
    android:supportsRtl="true"
    android:allowBackup="true"
    ... >
</application>
```

### Layout Examples

```xml
<!-- res/layout/activity_dashboard.xml -->
<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp"
    android:layoutDirection="locale">

    <!-- Use start/end instead of left/right -->
    <TextView
        android:id="@+id/title_text_view"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:paddingStart="8dp"
        android:paddingEnd="8dp"
        android:gravity="start" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="16dp">

        <TextView
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="@string/revenue_total"
            android:gravity="start" />

        <TextView
            android:id="@+id/revenue_text_view"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:gravity="end" />
    </LinearLayout>

    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/order_list"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:layoutDirection="locale" />

</LinearLayout>
```

```xml
<!-- res/layout-sw600dp/activity_dashboard.xml (Tablet) -->
<androidx.drawerlayout.widget.DrawerLayout>
    <LinearLayout>
        <!-- Main content -->
    </LinearLayout>

    <FrameLayout
        android:id="@+id/navigation_drawer"
        android:layout_width="280dp"
        android:layout_height="match_parent"
        android:layout_gravity="start" />
</androidx.drawerlayout.widget.DrawerLayout>
```

## Testing Localization

```kotlin
import android.content.res.Configuration
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Test
import org.junit.runner.RunWith
import java.util.Locale

@RunWith(AndroidJUnit4::class)
class LocalizationTests {

    @Test
    fun testResourceCoverage() {
        val defaultResources = getResourcesForLocale(Locale.ENGLISH)
        val frenchResources = getResourcesForLocale(Locale.FRENCH)
        val defaultStrings = defaultResources.getStringArray(
            defaultResources.getIdentifier(
                "all_string_names", "array", "com.example"
            )
        )
        for (key in defaultStrings) {
            val id = frenchResources.getIdentifier(
                key, "string", "com.example"
            )
            assert(id != 0) {
                "Missing French translation for: $key"
            }
        }
    }

    @Test
    fun testDateFormatting() {
        val locales = listOf(
            Locale.US to "Jan 15, 2026",
            Locale.FRANCE to "15 janv. 2026",
            Locale.JAPAN to "2026/01/15",
            Locale("ar", "SA") to "١٥/٠١/٢٠٢٦"
        )
        val calendar = Calendar.getInstance().apply {
            set(2026, Calendar.JANUARY, 15)
        }

        for ((locale, expected) in locales) {
            val formatter = DateFormat.getDateInstance(
                DateFormat.MEDIUM, locale
            )
            val result = formatter.format(calendar.time)
            assertEquals(expected, result)
        }
    }

    private fun getResourcesForLocale(locale: Locale): Resources {
        val config = Configuration().apply {
            setLocale(locale)
        }
        return ApplicationProvider
            .getApplicationContext<Context>()
            .createConfigurationContext(config)
            .resources
    }
}
```

## Key Points

- Android resource qualifiers (values-fr, values-ja) automatically select locale-specific strings at runtime.
- Plural rules use quantity strings (zero, one, two, few, many, other) with language-specific forms.
- Arabic requires 6 plural forms while Japanese uses only one.
- Jetpack Compose uses stringResource() for composable-localized strings and resources.getQuantityString() for plurals.
- NumberFormat and DateFormat use the device's default locale automatically.
- android:supportsRtl="true" in the manifest enables layout mirroring for RTL languages.
- Use start/end instead of left/right in layouts for automatic direction-aware positioning.
- RTL testing requires creating a locale-specific emulator or using Developer Options > Force RTL layout.
- Resource coverage tests verify that all strings are translated across target languages.
- Compact number formatting with getCompactNumberInstance adapts to locale conventions (10K, 1万, ١٠آلاف).
