# Location Privacy — Mobile

## Location Permissions Best Practices

### Permission Request Timing

Never request location permission on app launch. Request in context when the user needs location functionality:

```swift
// iOS — Good: request when user taps "Find Nearby"
func userTappedFindNearby() {
    if locationManager.authorizationStatus == .notDetermined {
        showRationaleDialog("Show nearby restaurants based on your location")
    } else if locationManager.authorizationStatus == .denied {
        showSettingsRedirect("Location access needed for nearby search")
    } else {
        startUpdatingLocation()
    }
}
```

```kotlin
// Android — Good: request when feature needs location
fun onFindNearbyClicked() {
    when {
        hasLocationPermission() -> startNearbySearch()
        shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION) ->
            showRationale {
                requestPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
            }
        else -> requestPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
    }
}
```

### Permission Request Flow

```
User Action → Show Rationale Dialog → System Permission Dialog → Handle Result
    ↓              ↓                      ↓                        ↓
Context-      Explain why,           OS native dialog         Grant → proceed
based trigger what data, how long                           Deny → degrade gracefully
                                                           Deny permanently → settings redirect
```

## Background Location Restrictions

### iOS Background Location

Background location requires explicit justification and is heavily restricted:

| iOS Version | Behavior | Requirements |
|-------------|----------|--------------|
| iOS 8-12 | Request `always` once | `NSLocationAlwaysUsageDescription` |
| iOS 13-14 | Separate prompt for always | `requestAlwaysAuthorization()` called separately |
| iOS 15+ | Only shows always option after `whenInUse` | User must upgrade from in-use to always |
| iOS 17+ | Background location requires "reasons" API | Must declare NSLocationAlwaysUsageDescription with reason |

**Apple's background location guidelines:**
- Apps must provide a clear, compelling reason for background location
- Common acceptable uses: navigation, fitness tracking, geofencing for automation
- Unacceptable: background data collection, advertising targeting
- Review rejection is common — expect to justify in app review notes

```swift
// iOS — request background location properly
class LocationService: NSObject {
    private let manager = CLLocationManager()

    func requestBackgroundLocation() {
        // Step 1: Request when-in-use first
        manager.requestWhenInUseAuthorization()

        // Step 2: After granted, request always separately
        // iOS shows a separate dialog explaining the upgrade
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            self.manager.requestAlwaysAuthorization()
        }
    }
}
```

### Android Background Location

Android 10+ introduced `ACCESS_BACKGROUND_LOCATION` as a separate permission:

| Android Version | Behavior | Requirements |
|-----------------|----------|--------------|
| Android 9 (API 28) | Background location with fine location | Same permission request |
| Android 10 (API 29) | Separate permission, can't bundle | Request foreground first, then background |
| Android 11+ (API 30) | Background permission not in same dialog | Must be separate request, user must grant from settings |
| Android 13+ (API 33) | Strict enforcement | Google Play policy review required |

**Policy requirements for Android background location:**
- App must have a core feature that requires background location
- Features: geofencing, fitness tracking, location sharing
- Navigation apps: background location is essential
- Google Play may reject apps without clear use case

```kotlin
// Android — request background location correctly
class LocationPermissionHandler(private val activity: Activity) {

    private val foregroundPermissionRequest = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val fineGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true
        val coarseGranted = permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true

        if (fineGranted || coarseGranted) {
            // Now request background separately
            requestBackgroundLocation()
        }
    }

    private val backgroundPermissionRequest = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            startBackgroundLocationService()
        } else {
            showBackgroundFeatureDisabled()
        }
    }

    private fun requestBackgroundLocation() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            backgroundPermissionRequest.launch(
                Manifest.permission.ACCESS_BACKGROUND_LOCATION
            )
        }
    }
}
```

## Location Accuracy Levels

### iOS Accuracy Options

| Accuracy Level | Description | Battery Impact | Use Case |
|----------------|-------------|---------------|----------|
| `kCLLocationAccuracyBestForNavigation` | Highest, uses GPS + sensors | Extreme | Turn-by-turn navigation |
| `kCLLocationAccuracyBest` | ~10 meters | High | Running, cycling tracking |
| `kCLLocationAccuracyNearestTenMeters` | ~10 meters | High | Precise location features |
| `kCLLocationAccuracyHundredMeters` | ~100 meters | Medium | Weather, nearby places |
| `kCLLocationAccuracyKilometer` | ~1 km | Low | City-level features |
| `kCLLocationAccuracyThreeKilometers` | ~3 km | Very Low | Country-level features |
| `kCLLocationAccuracyReduced` | Approximate only | Minimal | Privacy mode |

### Android Accuracy Options

| Accuracy Level | Permission | Description | Use Case |
|----------------|-----------|-------------|----------|
| `PRIORITY_HIGH_ACCURACY` | FINE | GPS + network, 10m | Precise features |
| `PRIORITY_BALANCED_POWER_ACCURACY` | FINE | ~100m | Weather, check-ins |
| `PRIORITY_LOW_POWER` | COARSE | ~1km | City-level features |
| `PRIORITY_NO_POWER` | None | Passive, listens to other apps | Geofencing (passive) |
| Approximate (COARSE only) | COARSE | ~100m | Privacy-friendly mode |

### iOS Precise / Approximate Toggle

iOS 14+ introduced the precise/approximate toggle:

```swift
import CoreLocation

class LocationPrivacyManager: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            // Check accuracy authorization
            let accuracy = manager.accuracyAuthorization
            if accuracy == .reducedAccuracy {
                // User granted approximate location
                // App should still function with reduced accuracy
                showApproximateLocationNotice()
            }
        default:
            break
        }
    }

    // Request temporary full accuracy (iOS 14+)
    func requestTemporaryFullAccuracy() {
        manager.requestTemporaryFullAccuracyAuthorization(
            withPurposeKey: "NavigationRequiresPreciseLocation"
        )
    }
}
```

## Privacy-Focused Location Handling

### Data Minimization

```swift
// Bad: Full precision location stored and sent to server
class BadLocationService {
    func trackLocation() {
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.startUpdatingLocation()

        func locationManager(_ manager: CLLocationManager,
                            didUpdateLocations locations: [CLLocation]) {
            let loc = locations.last!
            // Stores exact lat/lng with timestamp
            APIClient.send(location: ["lat": loc.coordinate.latitude,
                                       "lng": loc.coordinate.longitude,
                                       "timestamp": loc.timestamp])
        }
    }
}

// Good: Only precision needed for the feature
class PrivacyFocusedLocationService {
    func findNearbyRestaurants() {
        // Only need approximate location for nearby search
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        manager.requestLocation() // One-time update, not continuous

        func locationManager(_ manager: CLLocationManager,
                            didUpdateLocations locations: [CLLocation]) {
            guard let loc = locations.last else { return }

            // Round to 0.01 degrees (~1km precision)
            let roundedLat = round(loc.coordinate.latitude * 100) / 100
            let roundedLng = round(loc.coordinate.longitude * 100) / 100

            // Send approximate location only
            APIClient.send(location: ["lat": roundedLat,
                                       "lng": roundedLng])
        }
    }
}
```

### On-Device Processing

```kotlin
// Process location on-device, send only results
class PrivacyPreservingGeofencer(private val context: Context) {

    fun evaluateProximity(currentLocation: Location, places: List<Place>): List<Place> {
        // Calculate distances on device
        val nearby = places.filter { place ->
            val results = FloatArray(1)
            Location.distanceBetween(
                currentLocation.latitude, currentLocation.longitude,
                place.latitude, place.longitude,
                results
            )
            results[0] <= place.proximityRadiusMeters
        }
        // Only send to server the place IDs, not the location
        return nearby
    }

    fun checkInAtPlace(placeId: String) {
        // Don't send current location — server doesn't need it
        APIClient.checkIn(placeId)
    }
}
```

## Geofencing Permissions

### iOS Geofencing

Geofencing uses `startMonitoring(for:)` which requires:
- `whenInUse` or `always` authorization
- Max 20 simultaneous regions
- Minimum radius 100m (unless using `startMonitoringVisits`)

```swift
func setupGeofences() {
    let region = CLCircularRegion(
        center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
        radius: 200,
        identifier: "Office"
    )
    region.notifyOnEntry = true
    region.notifyOnExit = false
    locationManager.startMonitoring(for: region)
}
```

### Android Geofencing

```kotlin
// Android — Geofencing with proper permissions
class GeofenceManager(private val context: Context) {

    private val geofencingClient = LocationServices.getGeofencingClient(context)

    fun addGeofence(latitude: Double, longitude: Double, radius: Float, id: String) {
        val geofence = Geofence.Builder()
            .setRequestId(id)
            .setCircularRegion(latitude, longitude, radius)
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER or
                                Geofence.GEOFENCE_TRANSITION_EXIT)
            .build()

        val geofenceRequest = GeofenceRequest.Builder()
            .setInitialTrigger(GeofenceRequest.INITIAL_TRIGGER_ENTER)
            .addGeofence(geofence)
            .build()

        if (hasLocationPermission()) {
            geofencingClient.addGeofences(geofenceRequest, geofencePendingIntent)
        }
    }

    private val geofencePendingIntent: PendingIntent by lazy {
        val intent = Intent(context, GeofenceBroadcastReceiver::class.java)
        PendingIntent.getBroadcast(context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE)
    }
}
```

## User-Facing Privacy Controls

### Privacy Settings UI

Provide users with granular location privacy controls:

```swift
struct LocationPrivacySettingsView: View {
    @State private var locationEnabled = true
    @State private var preciseLocation = true
    @State private var backgroundLocation = false
    @State private var locationHistoryEnabled = false
    @State private var shareLocationWithFriends = false

    var body: some View {
        Form {
            Section(header: Text("Location Access")) {
                Toggle("Enable Location", isOn: $locationEnabled)
                    .onChange(of: locationEnabled) { newValue in
                        if newValue {
                            requestLocationPermission()
                        } else {
                            disableAllLocationFeatures()
                        }
                    }

                if locationEnabled {
                    Toggle("Precise Location", isOn: $preciseLocation)
                        .disabled(true) // iOS controls this via system dialog

                    Toggle("Background Location", isOn: $backgroundLocation)
                        .onChange(of: backgroundLocation) { newValue in
                            if newValue {
                                requestBackgroundLocation()
                            }
                        }
                }
            }

            Section(header: Text("Data Collection")) {
                Toggle("Location History", isOn: $locationHistoryEnabled)
                Text("Location history helps personalize your experience")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Toggle("Share Location with Friends", isOn: $shareLocationWithFriends)
            }

            Section(header: Text("Your Data")) {
                Button("Download My Location Data") {
                    exportLocationData()
                }

                Button("Delete Location History", role: .destructive) {
                    deleteLocationHistory()
                }
            }
        }
        .navigationTitle("Location Privacy")
    }
}
```

### Privacy Labels

iOS requires privacy labels and Android has Data Safety sections. Location-related disclosures:

| Data Type | Collected | Linked to User | Purpose |
|-----------|-----------|---------------|---------|
| Precise Location | Yes | Yes | Navigation, nearby features |
| Approximate Location | Yes | Yes | Weather, local content |
| Location History | Optional | Yes | Personalization (opt-in) |
| Background Location | Yes | Yes | Geofencing (opt-in) |

## Regulatory Compliance

### GDPR (EU)

Key location privacy requirements under GDPR:

1. **Consent** — Location data is personal data. Requires explicit, informed consent
2. **Purpose limitation** — Only collect location for stated purpose
3. **Data minimization** — Only collect precision needed for the feature
4. **Retention limits** — Delete location data when no longer needed
5. **Right to access** — Users can request their location data
6. **Right to deletion** — Users can request location data deletion
7. **Data portability** — Users can export their location data
8. **DPIA** — Data Protection Impact Assessment required for large-scale location tracking

### CCPA (California)

Key requirements under CCPA:

1. **Right to know** — Disclose what location data is collected and shared
2. **Right to opt-out** — Users can opt out of location data sale
3. **Right to delete** — Users can request deletion of location data
4. **Non-discrimination** — Don't penalize users who opt out
5. **Notice at collection** — Inform users before collecting location

### Compliance Implementation

```swift
// GDPR-compliant location consent
class GDPRCompliantLocationManager {
    func getLocationConsent() -> GDPRConsentStatus {
        // Store consent record with timestamp, version, and accepted purposes
        let storedConsent = UserDefaults.standard.dictionary(forKey: "location_consent")
        guard let consent = storedConsent else { return .notGiven }

        if let expiresAt = consent["expires_at"] as? TimeInterval,
           Date().timeIntervalSince1970 > expiresAt {
            return .expired  // Consent older than 12 months
        }

        if consent["purposes"] as? [String] != nil {
            return .valid
        }

        return .invalid
    }

    func requestLocationConsent(purposes: [String]) {
        let consent: [String: Any] = [
            "purposes": purposes,
            "granted_at": Date().timeIntervalSince1970,
            "version": "2.1",
            "expires_at": Date().addingTimeInterval(365 * 24 * 3600).timeIntervalSince1970
        ]
        UserDefaults.standard.set(consent, forKey: "location_consent")

        // Log consent for audit trail
        Analytics.logEvent("location_consent_granted", parameters: [
            "purposes": purposes.joined(separator: ","),
            "version": "2.1"
        ])
    }

    func deleteUserLocationData(userId: String) {
        // Delete from server
        APIClient.delete("/users/\(userId)/location-data")

        // Delete local caches
        CoreDataManager.shared.deleteEntity("LocationHistory", predicate: NSPredicate(format: "userId == %@", userId))

        // Reset consent
        UserDefaults.standard.removeObject(forKey: "location_consent")
    }
}
```

## Location Data Retention Policies

### Retention Schedule

| Data Type | Retention Period | Rationale |
|-----------|-----------------|-----------|
| Current location | Not stored — used and discarded | No need to retain one-time queries |
| Geofence triggers | 30 days | Debugging and pattern analysis |
| Location history (opt-in) | 90 days or until user deletes | Feature personalization |
| Visit analytics | 7 days aggregated | Usage patterns |
| Crash location | Not stored separately | Privacy — crashes don't need location |
| Ad attribution | Not collected | Privacy-first approach |

### Data Purging Implementation

```kotlin
class LocationDataRetentionPolicy(private val context: Context) {

    private val roomDb = AppDatabase.getInstance(context)

    fun applyRetentionPolicy() {
        val work = OneTimeWorkRequestBuilder<LocationCleanupWorker>()
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.NOT_REQUIRED)
                    .setRequiresBatteryNotLow(true)
                    .build()
            )
            .setInitialDelay(1, TimeUnit.HOURS)
            .build()

        WorkManager.getInstance(context).enqueue(work)
    }
}

class LocationCleanupWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val cutoffTime = System.currentTimeMillis() - 90.days.inWholeMilliseconds

        // Delete old location history
        AppDatabase.getInstance(applicationContext)
            .locationHistoryDao()
            .deleteOlderThan(cutoffTime)

        // Log cleanup for compliance
        Log.d("LocationCleanup", "Purged location records before $cutoffTime")

        return Result.success()
    }
}

private val Int.days: Duration get() = Duration.ofDays(this.toLong())
```

## Approximate Location API

### iOS — Reduced Accuracy

```swift
// Detect and handle approximate location
func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    if manager.accuracyAuthorization == .reducedAccuracy {
        // User opted for approximate location
        // Adjust app behavior accordingly
        DispatchQueue.main.async {
            self.showApproximateLocationBanner()
            self.disablePrecisionFeatures()
        }
    }
}

private func disablePrecisionFeatures() {
    // Switch to rounded coordinate display
    coordinateDisplay.format = .approximate

    // Disable turn-by-turn navigation
    navigationButton.isEnabled = false
    navigationButton.setTitle("Precise navigation requires precise location", for: .disabled)

    // Use city-level search instead of exact
    searchRadius = 5000 // 5km search radius
}
```

### Android — Approximate Permission

```kotlin
// Handle approximate location (ACCESS_COARSE_LOCATION only)
class ApproximateLocationAdapter {

    fun getLocationForFeature(): ApproximateLocation {
        return when {
            hasFineLocation() -> {
                // Round to protect privacy
                val location = getCurrentLocation()
                ApproximateLocation(
                    latitude = roundToDecimal(location.latitude, 2),
                    longitude = roundToDecimal(location.longitude, 2),
                    accuracy = 100.0f // ~100m precision
                )
            }
            hasCoarseLocation() -> {
                val location = getCurrentLocation(useCoarse = true)
                ApproximateLocation(
                    latitude = roundToDecimal(location.latitude, 1),
                    longitude = roundToDecimal(location.longitude, 1),
                    accuracy = 500.0f // ~500m precision
                )
            }
            else -> {
                ApproximateLocation(
                    latitude = 0.0,
                    longitude = 0.0,
                    accuracy = -1f
                )
            }
        }
    }

    private fun roundToDecimal(value: Double, decimals: Int): Double {
        val factor = Math.pow(10.0, decimals.toDouble())
        return Math.round(value * factor) / factor
    }
}
```

## Best Practices Summary

- Request minimum location permission for the use case
- Never request background location without clear user-facing justification
- Provide granular privacy controls in app settings
- Process location on-device where possible
- Round coordinates to minimum required precision
- Implement data retention and deletion policies
- Obtain explicit consent for location data collection (GDPR)
- Handle approximate location gracefully
- Show clear privacy labels and data safety sections
- Regular privacy audit of location data collection and usage
