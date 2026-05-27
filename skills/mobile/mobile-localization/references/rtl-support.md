# Right-to-Left (RTL) Support

## Overview
Right-to-Left (RTL) support adapts your app's UI for languages like Arabic, Hebrew, Persian, and Urdu. Proper RTL support goes beyond text alignment — it affects layout direction, navigation animations, icon mirroring, gesture handling, and content presentation.

## Layout Direction

### iOS Semantic Layout

```swift
import SwiftUI

struct RTLAwareView: View {
    @Environment(\.layoutDirection) var layoutDirection

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Auto-adapts to RTL using semantic alignment
            Text("Dashboard")
                .font(.title)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Use HStack with spacing rather than manually positioning
            HStack(spacing: 12) {
                MetricCard(
                    title: "Revenue",
                    value: "$12,500",
                    icon: "dollarsign.circle"
                )
                MetricCard(
                    title: "Orders",
                    value: "42",
                    icon: "cart"
                )
            }

            // NavigationLink adapts chevron direction automatically
            NavigationLink("View Details") {
                DetailView()
            }

            // Custom directional layout
            DirectionalAwareRow()
        }
        .environment(\.layoutDirection, layoutDirection)
        .padding()
    }
}

struct DirectionalAwareRow: View {
    @Environment(\.layoutDirection) var layoutDirection

    var body: some View {
        HStack {
            // Leading content (left in LTR, right in RTL)
            Image(systemName: "person.circle")
                .frame(width: 40, height: 40)

            VStack(alignment: .leading) {
                Text("John Doe")
                    .font(.headline)
                Text("john@example.com")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Trailing content (right in LTR, left in RTL)
            Text("Admin")
                .font(.caption)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.blue.opacity(0.2))
                .cornerRadius(4)
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(8)
    }
}
```

### UIKit RTL Support

```swift
import UIKit

class RTLAwareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        setupRTLSupport()
    }

    private func setupRTLSupport() {
        // Use semantic properties
        let stackView = UIStackView()
        stackView.axis = .horizontal
        stackView.alignment = .center
        stackView.distribution = .fill
        stackView.semanticContentAttribute = .unspecified

        let label = UILabel()
        label.text = "Dashboard"
        label.textAlignment = .natural  // Auto-adapts to RTL

        let imageView = UIImageView()
        imageView.image = UIImage(systemName: "arrow.right")?
            .withConfiguration(
                UIImage.SymbolConfiguration(scale: .medium)
            )
        // Auto-mirrors in RTL for system images

        // For custom views, use leading/trailing constraints
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(
                equalTo: view.safeAreaLayoutGuide.leadingAnchor,
                constant: 16
            ),
            label.trailingAnchor.constraint(
                equalTo: view.safeAreaLayoutGuide.trailingAnchor,
                constant: -16
            )
        ])

        // Handle RTL edge cases
        if UIView.userInterfaceLayoutDirection(
            for: view.semanticContentAttribute
        ) == .rightToLeft {
            customizeForRTL()
        }
    }

    private func customizeForRTL() {
        // Additional RTL-specific adjustments
        navigationItem.leftBarButtonItem = nil
        navigationItem.rightBarButtonItem = UIBarButtonItem(
            image: UIImage(systemName: "gearshape"),
            style: .plain, target: self,
            action: #selector(openSettings)
        )
    }
}
```

### Android RTL Support

```kotlin
class RTLAwareActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_rtl_aware)

        val isRtl = resources.configuration.layoutDirection ==
                View.LAYOUT_DIRECTION_RTL

        if (isRtl) {
            customizeForRTL()
        }
    }

    private fun customizeForRTL() {
        // Adjust navigation arrow direction
        supportActionBar?.setHomeAsUpIndicator(
            R.drawable.ic_arrow_forward  // Forward arrow in RTL
        )

        // Adjust ViewPager/BottomSheet direction
        val viewPager = findViewById<ViewPager>(R.id.view_pager)
        viewPager.layoutDirection = View.LAYOUT_DIRECTION_RTL
    }
}
```

## Image Mirroring

### iOS Image Handling

```swift
import SwiftUI

struct RTLImageHandler: View {
    @Environment(\.layoutDirection) var layoutDirection

    var body: some View {
        VStack(spacing: 20) {
            // System images auto-mirror
            Image(systemName: "arrow.right")
                .flipsForRightToLeftLayoutDirection(true)

            // Never mirror logos or photographs
            Image("company_logo")
                .flipsForRightToLeftLayoutDirection(false)

            // Custom mirroring for specific images
            Image("custom_chart_arrow")
                .scaleEffect(
                    x: layoutDirection == .rightToLeft ? -1 : 1,
                    y: 1
                )

            // Directional icons
            HStack {
                Image(systemName: "chevron.left")
                Text("Back")
                Spacer()
            }
        }
    }
}

// UIImage extension for programmatic mirroring
extension UIImage {
    func flippedForRTL() -> UIImage {
        return withHorizontallyFlippedOrientation()
    }
}
```

### Android Image Handling

```kotlin
class RTLImageHelper(private val context: Context) {

    fun loadDirectionalIcon(
        ltrResId: Int,
        rtlResId: Int
    ): Drawable? {
        val isRtl = context.resources.configuration.layoutDirection ==
                View.LAYOUT_DIRECTION_RTL
        val resId = if (isRtl) rtlResId else ltrResId
        return ContextCompat.getDrawable(context, resId)
    }
}

// Usage in XML with auto-mirror
<ImageView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:src="@drawable/ic_arrow_back"
    android:autoMirrored="true" />

<!-- RTL-specific drawable variants -->
<!-- res/drawable/ic_arrow_back.xml -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24"
    android:autoMirrored="true">
    <path
        android:fillColor="#FF000000"
        android:pathData="M20,11H7.83l5.59,-5.59L12,4l-8,8 8,8 1.41,-1.41L7.83,13H20v-2z" />
</vector>
```

## Navigation and Animations

### Direction-Aware Transitions

```swift
import SwiftUI

struct RTLNavigationView: View {
    @Environment(\.layoutDirection) var layoutDirection

    var body: some View {
        NavigationStack {
            List {
                NavigationLink("Orders") {
                    OrdersView()
                }
                NavigationLink("Products") {
                    ProductsView()
                }
                NavigationLink("Settings") {
                    SettingsView()
                }
            }
            .navigationTitle("Dashboard")
        }
        // NavigationLink animations auto-adapt to RTL
    }
}

// Custom transition with direction awareness
struct DirectionalSlideTransition: ViewModifier {
    @Environment(\.layoutDirection) var layoutDirection

    func body(content: Content) -> some View {
        content
            .transition(.asymmetric(
                insertion: .move(edge: layoutDirection == .rightToLeft ? .trailing : .leading),
                removal: .move(edge: layoutDirection == .rightToLeft ? .leading : .trailing)
            ))
    }
}
```

```kotlin
// Android: Direction-aware transitions
class RTLTransitionHelper {
    companion object {
        fun slideInDirection(context: Context): Int {
            return if (context.resources.configuration.layoutDirection ==
                View.LAYOUT_DIRECTION_RTL
            ) {
                R.anim.slide_in_right
            } else {
                R.anim.slide_in_left
            }
        }

        fun slideOutDirection(context: Context): Int {
            return if (context.resources.configuration.layoutDirection ==
                View.LAYOUT_DIRECTION_RTL
            ) {
                R.anim.slide_out_left
            } else {
                R.anim.slide_out_right
            }
        }
    }
}

// Usage in Activity
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    overridePendingTransition(
        RTLTransitionHelper.slideInDirection(this),
        RTLTransitionHelper.slideOutDirection(this)
    )
}
```

## Text Handling

### Mixed Text Direction

```swift
import SwiftUI

struct MixedTextDirectionView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Arabic sentence with embedded English
            Text("مرحبا بك في تطبيق Sales Dashboard الإصدار 2.0")
                .environment(\.layoutDirection, .rightToLeft)

            // English sentence with embedded Arabic
            Text("The report shows نموذج for Q1 2026.")
                .environment(\.layoutDirection, .leftToRight)

            // Automatic text direction based on content
            Text("Sales Dashboard")
            Text("لوحة القيادة")
        }
    }
}
```

```kotlin
// Android: Mixed text direction
textView.text = "مرحبا بك في تطبيق Sales Dashboard"
textView.textDirection = View.TEXT_DIRECTION_ANY_RTL  // Auto-detect

// For formatted strings with mixed direction
val mixedText = SpannableStringBuilder()
    .append("الربع الأول ")
    .append("Q1 2026 Report")
    .append(" جاهز")
textView.textDirection = View.TEXT_DIRECTION_ANY_RTL
textView.text = mixedText
```

## Gesture Handling

```swift
struct RTLGestureView: View {
    @Environment(\.layoutDirection) var layoutDirection
    @State private var offset: CGFloat = 0

    var body: some View {
        Rectangle()
            .fill(.blue)
            .frame(width: 100, height: 100)
            .offset(x: offset)
            .gesture(
                DragGesture()
                    .onChanged { value in
                        let translation = layoutDirection == .rightToLeft
                            ? -value.translation.width
                            : value.translation.width
                        offset = translation
                    }
            )
    }
}
```

## Testing RTL

```kotlin
@RunWith(AndroidJUnit4::class)
class RTLTest {

    @Test
    fun testLayoutDirection() {
        val config = Configuration().apply {
            setLocale(Locale("ar"))
            layoutDirection = Configuration.LAYOUT_DIRECTION_RTL
        }
        val context = InstrumentationRegistry
            .getInstrumentation()
            .targetContext
            .createConfigurationContext(config)

        val isRtl = context.resources.configuration.layoutDirection ==
                Configuration.LAYOUT_DIRECTION_RTL
        assertTrue(isRtl, "Arabic locale should use RTL layout")
    }

    @Test
    fun testUIElementsMirrorCorrectly() {
        val scenario = ActivityScenario.launch(
            MainActivity::class.java
        )
        scenario.onActivity { activity ->
            activity.resources.configuration.layoutDirection =
                View.LAYOUT_DIRECTION_RTL

            val backButton = activity.findViewById<ImageButton>(R.id.back_button)
            assertTrue(backButton.isRtl())
        }
    }
}
```

## Key Points

- Set `android:supportsRtl="true"` in manifest and use `semanticContentAttribute` on iOS for RTL support.
- Replace left/right with leading/trailing in all layout code for automatic RTL adaptation.
- System icons auto-mirror; logos and photographs must never mirror.
- Navigation and slide animations must reverse direction in RTL mode.
- Mixed text direction requires explicit layoutDirection context for each text block.
- Gesture handling must invert horizontal drag translation values in RTL.
- Use `autoMirrored="true"` on Android vector drawables for automatic icon flipping.
- UIScrollView content insets and scroll indicator positions change in RTL mode.
- Text alignment should use .natural (iOS) or TEXT_DIRECTION_ANY_RTL (Android) for auto-detection.
- RTL testing requires dedicated test configurations and visual inspection of mirrored layouts.
