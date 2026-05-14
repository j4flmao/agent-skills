# Code Signing

## iOS (Fastlane Match)
```bash
# Create certificates repo
fastlane match init

# Generate certs
fastlane match development
fastlane match appstore
fastlane match adhoc

# Matchfile example
git_url("https://github.com/org/certs")
type("appstore")
app_identifier(["com.example.app"])
username("dev@example.com")
```

## iOS (Manual)
```
1. Developer Account > Certificates > Create "Apple Distribution"
2. Developer Account > Profiles > Create "App Store Distribution Provisioning Profile"
3. Xcode > Target > Signing & Capabilities
   - Provisioning Profile: <Downloaded profile>
   - Code Signing Identity: Apple Distribution
4. Archive > Distribute App > App Store Connect
```

## Android (Keystore)
```bash
# Generate keystore
keytool -genkey -v -keystore release.keystore \
  -alias my-alias -keyalg RSA -keysize 2048 -validity 10000

# Sign APK (manual)
jarsigner -verbose -sigalg SHA1withRSA \
  -digestalg SHA1 -keystore release.keystore \
  app-release-unsigned.apk my-alias

# Sign AAB via gradle
# android/app/build.gradle
android {
    signingConfigs {
        release {
            storeFile file("release.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
    buildTypes {
        release { signingConfig signingConfigs.release }
    }
}
```
