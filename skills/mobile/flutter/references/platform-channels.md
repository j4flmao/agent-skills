# Flutter Platform Channels

## Overview
Platform channels enable communication between Dart code and native (Kotlin/Swift) code. They support method calls, event streams, and basic data serialization. This reference covers channel setup, message passing, event channels, and best practices.

## Basic Method Channel

### Dart Side
```dart
import 'package:flutter/services.dart';

class BatteryPlugin {
  static const _channel = MethodChannel('com.example.app/battery');

  Future<int> getBatteryLevel() async {
    try {
      final result = await _channel.invokeMethod<int>('getBatteryLevel');
      return result ?? -1;
    } on PlatformException catch (e) {
      print("Failed to get battery level: ${e.message}");
      return -1;
    }
  }

  Future<String> getDeviceInfo() async {
    try {
      final result = await _channel.invokeMethod<String>('getDeviceInfo');
      return result ?? 'Unknown';
    } on PlatformException catch (e) {
      return 'Error: ${e.message}';
    }
  }
}

// Usage
class BatteryWidget extends StatefulWidget {
  @override
  _BatteryWidgetState createState() => _BatteryWidgetState();
}

class _BatteryWidgetState extends State<BatteryWidget> {
  int _batteryLevel = 0;
  final _batteryPlugin = BatteryPlugin();

  Future<void> _getBatteryLevel() async {
    final level = await _batteryPlugin.getBatteryLevel();
    setState(() => _batteryLevel = level);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('Battery: $_batteryLevel%'),
        ElevatedButton(
          onPressed: _getBatteryLevel,
          child: Text('Refresh'),
        ),
      ],
    );
  }
}
```

### Android Side (Kotlin)
```kotlin
package com.example.app

import android.os.BatteryManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.example.app/battery"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            CHANNEL
        ).setMethodCallHandler { call, result ->
            when (call.method) {
                "getBatteryLevel" -> {
                    val batteryLevel = getBatteryLevel()
                    if (batteryLevel != -1) {
                        result.success(batteryLevel)
                    } else {
                        result.error("UNAVAILABLE", "Battery level not available", null)
                    }
                }
                "getDeviceInfo" -> {
                    val deviceInfo = """
                        Device: ${android.os.Build.DEVICE}
                        Model: ${android.os.Build.MODEL}
                        SDK: ${android.os.Build.VERSION.SDK_INT}
                    """.trimIndent()
                    result.success(deviceInfo)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun getBatteryLevel(): Int {
        val batteryManager = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        return batteryManager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    }
}
```

### iOS Side (Swift)
```swift
import Flutter
import UIKit

public class SwiftBatteryPlugin: NSObject, FlutterPlugin {
    private let channelName = "com.example.app/battery"

    public static func register(with registrar: FlutterPluginRegistrar) {
        let channel = FlutterMethodChannel(
            name: "com.example.app/battery",
            binaryMessenger: registrar.messenger()
        )
        let instance = SwiftBatteryPlugin()
        registrar.addMethodCallDelegate(instance, channel: channel)
    }

    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "getBatteryLevel":
            let device = UIDevice.current
            device.isBatteryMonitoringEnabled = true
            let batteryLevel = device.batteryLevel
            if batteryLevel >= 0 {
                result(Int(batteryLevel * 100))
            } else {
                result(FlutterError(
                    code: "UNAVAILABLE",
                    message: "Battery level not available",
                    details: nil
                ))
            }
        case "getDeviceInfo":
            let deviceInfo = """
                Device: \(UIDevice.current.model)
                System: \(UIDevice.current.systemName)
                Version: \(UIDevice.current.systemVersion)
            """
            result(deviceInfo)
        default:
            result(FlutterMethodNotImplemented)
        }
    }
}
```

## Event Channels

### Streaming Data
```dart
// Dart side
class SensorStream {
  static const _eventChannel = EventChannel('com.example.app/sensors');

  Stream<Map<String, dynamic>> get sensorData {
    return _eventChannel
        .receiveBroadcastStream()
        .map((event) => Map<String, dynamic>.from(event as Map));
  }
}

// Usage in widget
class SensorWidget extends StatefulWidget {
  @override
  _SensorWidgetState createState() => _SensorWidgetState();
}

class _SensorWidgetState extends State<SensorWidget> {
  final _sensorStream = SensorStream();
  StreamSubscription<Map<String, dynamic>>? _subscription;
  Map<String, dynamic> _latestData = {};

  @override
  void initState() {
    super.initState();
    _subscription = _sensorStream.sensorData.listen((data) {
      setState(() => _latestData = data);
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Text('X: ${_latestData['x']}, Y: ${_latestData['y']}');
  }
}
```

### iOS Event Channel
```swift
class SensorStreamHandler: NSObject, FlutterStreamHandler {
    private var eventSink: FlutterEventSink?
    private var motionManager = CMMotionManager()

    func onListen(
        withArguments arguments: Any?,
        eventSink events: @escaping FlutterEventSink
    ) -> FlutterError? {
        self.eventSink = events

        if motionManager.isAccelerometerAvailable {
            motionManager.accelerometerUpdateInterval = 0.1
            motionManager.startAccelerometerUpdates(to: .main) { [weak self] data, error in
                guard let data = data else {
                    self?.eventSink?(FlutterError(
                        code: "SENSOR_ERROR",
                        message: error?.localizedDescription,
                        details: nil
                    ))
                    return
                }
                self?.eventSink?([
                    "x": data.acceleration.x,
                    "y": data.acceleration.y,
                    "z": data.acceleration.z
                ])
            }
        }
        return nil
    }

    func onCancel(withArguments arguments: Any?) -> FlutterError? {
        motionManager.stopAccelerometerUpdates()
        eventSink = nil
        return nil
    }
}
```

## Data Serialization

### Complex Types
```dart
// Dart
class User {
  final String name;
  final int age;
  final List<String> roles;

  User({required this.name, required this.age, required this.roles});

  Map<String, dynamic> toMap() => {
    'name': name,
    'age': age,
    'roles': roles,
  };

  factory User.fromMap(Map<String, dynamic> map) => User(
    name: map['name'] as String,
    age: map['age'] as int,
    roles: List<String>.from(map['roles']),
  );
}

// Sending complex data
final user = User(name: 'Alice', age: 30, roles: ['admin', 'editor']);
await channel.invokeMethod('saveUser', user.toMap());

// Receiving complex data
final result = await channel.invokeMethod<Map>('getUser');
final user = User.fromMap(Map<String, dynamic>.from(result));
```

## Key Points
- MethodChannel handles bidirectional method calls
- EventChannel streams continuous data from native to Dart
- BasicMessageChannel sends strings/semistructured data
- Standard codec supports basic types (Map, List, String, num, bool)
- Method calls have timeouts and error handling
- Event channels require proper lifecycle management
- Platform channels run on the main thread by default
- Background isolate communication requires custom handling
- Flutter plugins encapsulate platform channel logic
- Pigeon generates type-safe channel code from interface definitions
- Thread safety is the developer's responsibility on native side
- Handle configuration changes (Android) in native channel setup
- Dispose channel listeners to prevent memory leaks
- Use Pigeon for type-safe, auto-generated channel code
- Test platform channels with unit tests and mock channels
- Bundle identifiers for channel names should be unique
- Error handling should propagate native exceptions to Dart
- Event channel listeners must handle cancellation
- Protobuf or JSON for complex data serialization
- Platform channel performance is suitable for most use cases
