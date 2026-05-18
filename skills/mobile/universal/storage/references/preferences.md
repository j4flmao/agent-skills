# Mobile Preferences

## Key-Value patterns

```dart
class PreferenceManager {
  final SharedPreferences _prefs;

  PreferenceManager(this._prefs);

  String? get token => _prefs.getString('auth_token');
  set token(String? value) {
    if (value == null) _prefs.remove('auth_token');
    else _prefs.setString('auth_token', value);
  }

  bool get isDarkMode => _prefs.getBool('dark_mode') ?? false;
  set isDarkMode(bool value) => _prefs.setBool('dark_mode', value);
}
```

## Type adapters (Hive)

```dart
@HiveType(typeId: 0)
class UserPreferences extends HiveObject {
  @HiveField(0)
  late String theme;

  @HiveField(1)
  late bool notificationsEnabled;
}
```

## UserDefaults groups

```swift
// iOS: App Group for shared preferences
let defaults = UserDefaults(suiteName: "group.com.example.app")
defaults?.set(true, forKey: "onboarding_complete")
```
