# Geofencing Patterns for Mobile

## Region Monitoring Fundamentals

### iOS Region Monitoring
```swift
import CoreLocation

class GeofenceManager: NSObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.allowsBackgroundLocationUpdates = false // Only if needed
        locationManager.pausesLocationUpdatesAutomatically = true // Battery save
    }

    func requestAlwaysAuthorization() {
        locationManager.requestAlwaysAuthorization()
    }

    func startMonitoring(region: CLCircularRegion) {
        guard CLLocationManager.isMonitoringAvailable(for: CLCircularRegion.self) else {
            print("Region monitoring not available")
            return
        }

        // iOS limits: max 20 simultaneously monitored regions
        // Min radius: ~100m (iOS may enlarge if too small)
        region.notifyOnEntry = true
        region.notifyOnExit = true

        locationManager.startMonitoring(for: region)
    }

    func stopMonitoring(region: CLCircularRegion) {
        locationManager.stopMonitoring(for: region)
    }

    // Delegate — did enter
    func locationManager(_ manager: CLLocationManager,
                         didEnterRegion region: CLRegion) {
        guard let circularRegion = region as? CLCircularRegion else { return }
        handleGeofenceEvent(
            identifier: circularRegion.identifier,
            transition: .enter
        )
    }

    // Delegate — did exit
    func locationManager(_ manager: CLLocationManager,
                         didExitRegion region: CLRegion) {
        guard let circularRegion = region as? CLCircularRegion else { return }
        handleGeofenceEvent(
            identifier: circularRegion.identifier,
            transition: .exit
        )
    }

    // Monitoring failure
    func locationManager(_ manager: CLLocationManager,
                         monitoringDidFailFor region: CLRegion?,
                         withError error: Error) {
        // Common: region limit exceeded, invalid region, permissions denied
        print("Monitoring failed: \(error.localizedDescription)")
    }

    private func handleGeofenceEvent(identifier: String, transition: GeofenceTransition) {
        // Post notification, trigger server call, update UI
        NotificationCenter.default.post(
            name: .geofenceEvent,
            object: nil,
            userInfo: ["identifier": identifier, "transition": transition.rawValue]
        )
    }
}

enum GeofenceTransition: String {
    case enter
    case exit
}
```

### Android Geofencing API
```kotlin
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingClient
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import android.app.PendingIntent

class AndroidGeofenceManager(private val context: Context) {
    private val geofencingClient: GeofencingClient =
        LocationServices.getGeofencingClient(context)

    fun createGeofence(
        id: String,
        latitude: Double,
        longitude: Double,
        radius: Float, // meters, minimum: 50m
        loiteringDelayMs: Long = 60000, // ms to wait before dwell trigger
        expiration: Long = Geofence.NEVER_EXPIRE
    ): Geofence {
        return Geofence.Builder()
            .setRequestId(id)
            .setCircularRegion(latitude, longitude, radius)
            .setTransitionTypes(
                Geofence.GEOFENCE_TRANSITION_ENTER or
                Geofence.GEOFENCE_TRANSITION_EXIT or
                Geofence.GEOFENCE_TRANSITION_DWELL
            )
            .setLoiteringDelay(loiteringDelayMs)
            .setExpirationDuration(expiration)
            .build()
    }

    fun startGeofencing(geofences: List<Geofence>, pendingIntent: PendingIntent) {
        // Request: add geofences (batch)
        val request = GeofencingRequest.Builder()
            .setInitialTrigger(
                GeofencingRequest.INITIAL_TRIGGER_ENTER or
                GeofencingRequest.INITIAL_TRIGGER_DWELL
            )
            .addGeofences(geofences)
            .build()

        if (checkLocationPermission()) {
            geofencingClient.addGeofences(request, pendingIntent)
                .addOnSuccessListener {
                    // Geofences added
                }
                .addOnFailureListener { e ->
                    // Check error codes: TOO_MANY_GEOFENCES, GEOFENCE_NOT_AVAILABLE
                }
        }
    }

    fun removeGeofences(geofenceIds: List<String>) {
        geofencingClient.removeGeofences(geofenceIds)
    }
}
```

### Geofence BroadcastReceiver (Android)
```xml
<!-- AndroidManifest.xml -->
<receiver android:name=".GeofenceBroadcastReceiver"
    android:exported="false" />
```

```kotlin
class GeofenceBroadcastReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val geofencingEvent = GeofencingEvent.fromIntent(intent) ?: return

        if (geofencingEvent.hasError()) {
            val errorMessage = getErrorString(geofencingEvent.errorCode)
            Log.e(TAG, errorMessage)
            return
        }

        val geofenceTransition = geofencingEvent.geofenceTransition
        val triggeringGeofences = geofencingEvent.triggeringGeofences

        triggeringGeofences?.forEach { geofence ->
            val requestId = geofence.requestId
            when (geofenceTransition) {
                Geofence.GEOFENCE_TRANSITION_ENTER ->
                    handleEnter(context, requestId)
                Geofence.GEOFENCE_TRANSITION_EXIT ->
                    handleExit(context, requestId)
                Geofence.GEOFENCE_TRANSITION_DWELL ->
                    handleDwell(context, requestId)
            }
        }

        // Start foreground service for processing (recommended)
        val serviceIntent = Intent(context, GeofenceProcessingService::class.java)
        ContextCompat.startForegroundService(context, serviceIntent)
    }
}
```

## Significant Location Change

### iOS Significant-Change Location
```swift
class SignificantChangeMonitor {
    private let manager = CLLocationManager()

    func startMonitoring() {
        guard CLLocationManager.significantLocationChangeMonitoringAvailable() else {
            print("Significant change monitoring not available")
            return
        }
        manager.delegate = self
        manager.startMonitoringSignificantLocationChanges()
    }

    // Delegate
    func locationManager(_ manager: CLLocationManager,
                         didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }

        // Significant change: ~500m movement
        // Battery: very efficient (~2-5% per day)
        // Resolution: ~500m to 1km
        // Delivery: app may be woken from suspended state

        // Note: only one delegate method invoked at a time
        processSignificantChange(location)
    }
}
```

### Android — Low Power Location
```kotlin
class LowPowerLocationMonitor(private val context: Context) {
    private val fusedClient = LocationServices.getFusedLocationProviderClient(context)

    fun requestLowPowerUpdates() {
        val request = LocationRequest.Builder(
            Priority.PRIORITY_LOW_POWER, // ~500m accuracy
            5 * 60 * 1000L // 5 min interval
        ).apply {
            setMinUpdateIntervalMillis(60 * 1000L) // 1 min fast
            setMaxUpdateDelayMillis(10 * 60 * 1000L) // 10 min delay
        }.build()

        if (checkPermissions()) {
            fusedClient.requestLocationUpdates(
                request,
                locationCallback,
                Looper.getMainLooper()
            )
        }
    }

    // Equivalent to iOS significant change:
    // Use PRIORITY_LOW_POWER with long intervals
    // Battery: ~3-5% per day
    // Resolution: ~500m
}
```

## Visit Monitoring (iOS)

```swift
class VisitMonitor: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()

    func startVisitMonitoring() {
        manager.delegate = self
        manager.startMonitoringVisits()
    }

    // Visit: location + arrival + departure times
    func locationManager(_ manager: CLLocationManager,
                         didVisit visit: CLVisit) {
        // visit.coordinate: CLLocationCoordinate2D
        // visit.arrivalDate: Date
        // visit.departureDate: Date

        if visit.departureDate == Date.distantFuture {
            // User is still at this location
            handleArrival(visit)
        } else {
            // User has left
            handleDeparture(visit)
        }
    }

    // Visits are high-level (home, work, frequent places)
    // Very battery efficient — uses learned patterns
    // 5-15 visit detections per day typical
}
```

## Battery Optimization

### Reduce Power Consumption
```swift
// iOS — Battery optimization strategies
class BatteryAwareGeofenceManager {
    private let manager = CLLocationManager()

    func configureBatteryAwareGeofencing() {
        // 1. Reduce region count
        // Max 20 regions — stay under 10 when possible

        // 2. Use larger radii (250m+ instead of 100m)
        // Smaller radii require more frequent checks

        // 3. Activity-based enabling
        // Disable geofencing when stationary for >30 min

        // 4. Pause on battery low
        if ProcessInfo.processInfo.isLowPowerModeEnabled {
            stopAllMonitoring()
        }

        // 5. Defer location updates
        manager.allowDeferredLocationUpdates(
            untilTraveled: 1000, // meters
            timeout: 60 * 5      // seconds
        )
    }
}
```

```kotlin
// Android — Battery optimization
class BatteryOptimizedGeofence(private val context: Context) {
    fun optimizeForBattery() {
        // 1. Use geofence API (more efficient than raw GPS)
        // Geofence API uses Wi-Fi + cellular + GPS selectively

        // 2. Request to disable battery optimization
        val intent = Intent(
            Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
        ).apply {
            data = Uri.parse("package:${context.packageName}")
        }

        // 3. Use WorkManager for deferrable geofence work
        val workRequest = OneTimeWorkRequestBuilder<GeofenceProcessWorker>()
            .setConstraints(
                Constraints.Builder()
                    .setRequiresBatteryNotLow(true)
                    .build()
            )
            .build()
        WorkManager.getInstance(context).enqueue(workRequest)

        // 4. Dynamic location accuracy
        // Reduce accuracy requirement based on context
    }
}
```

## Geofence Transition Handling

| Transition | Meaning | Use Case |
|---|---|---|
| Enter | Device crossed boundary inward | Welcome message, check-in |
| Exit | Device crossed boundary outward | Goodbye, session end |
| Dwell (Android) | Device stayed inside after entering | Parking detection, visit logging |
| Initial trigger | Current state at registration | App launch inside geofence |

## Background Execution

### iOS
```swift
// Background modes required:
// Info.plist → Required background modes → Location updates

// Significant change and region monitoring work in suspended state
// Process UIApplication.significantTimeChange for wake from terminated

func application(_ application: UIApplication,
                 didReceiveRemoteNotification userInfo: [AnyHashable: Any]) {
    // Handle geofence-triggered notification
    // Must have content-available: 1
}
```

### Android
```kotlin
// Android 10+ requires ACCESS_BACKGROUND_LOCATION permission
// Note: foreground service with "location" type for reliable delivery

class GeofenceForegroundService : Service() {
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = NotificationCompat.Builder(this, "geofence_channel")
            .setContentTitle("Geofence Service")
            .setContentText("Monitoring nearby locations")
            .setOngoing(true)
            .build()
        startForeground(1, notification)
        return START_STICKY
    }
}
```

## Platform Comparison

| Feature | iOS (CoreLocation) | Android (Geofencing API) |
|---|---|---|
| Max regions | 20 per app | 100 per app |
| Min radius | ~100m | 50m (recommended 100m+) |
| Dwell detection | No | Yes (with loitering delay) |
| Initial trigger | Yes (iOS 15+) | Yes |
| Background delivery | Automatic (wake app) | Via BroadcastReceiver |
| Requires always auth | Yes | Yes (ACCESS_BACKGROUND_LOCATION) |
| Battery impact | Very low | Low-Moderate |
| Accuracy | Cellular + Wi-Fi + GPS | Cellular + Wi-Fi + GPS |
