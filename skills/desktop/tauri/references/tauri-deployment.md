# Tauri Deployment Reference

## Bundling

```json
{
  "bundle": {
    "active": true,
    "targets": ["nsis", "msi", "dmg", "appimage", "deb"],
    "windows": {
      "wix": null,
      "nsis": {
        "installMode": "currentUser",
        "displayLanguage": "en-US"
      }
    },
    "macOS": {
      "frameworks": [],
      "minimumSystemVersion": "10.15",
      "signing": {
        "identity": "Developer ID Application: MyCompany"
      }
    },
    "linux": {
      "deb": {
        "depends": ["libwebkit2gtk-4.1-0"]
      }
    },
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

```bash
# Build for current platform
cargo tauri build

# Platform-specific builds via CI
cargo tauri build --target x86_64-pc-windows-msvc
cargo tauri build --target x86_64-apple-darwin
cargo tauri build --target x86_64-unknown-linux-gnu
```

## Code Signing

### Windows

```bash
# Sign with Authenticode certificate
signtool sign /fd SHA256 /a /f certificate.pfx /p password \
  /tr http://timestamp.digicert.com /td SHA256 \
  "target/release/bundle/nsis/MyApp.exe"
```

### macOS

```bash
# Sign .app bundle
codesign --force --options runtime \
  --sign "Developer ID Application: MyCompany" \
  --entitlements entitlements.plist \
  "target/release/bundle/dmg/MyApp.app"

# Notarize
xcrun notarytool submit "target/release/MyApp.dmg" \
  --apple-id user@example.com \
  --team-id TEAMID \
  --password @keychain:AC_PASSWORD \
  --wait

# Staple ticket
xcrun stapler staple "target/release/MyApp.dmg"
```

## Auto-Updater

```rust
// src-tauri/src/lib.rs
use tauri_plugin_updater;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new()
            .build())
        .run(tauri::generate_context!())
}

// Frontend
import { checkUpdate, installUpdate } from '@tauri-apps/plugin-updater';

const update = await checkUpdate();
if (update?.available) {
    await installUpdate();
}
```

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://releases.myapp.com/{{target}}-{{arch}}/{{current_version}}"
      ],
      "dialog": true,
      "pubkey": "YOUR_UPDATER_PUBKEY"
    }
  }
}
```

## CI/CD

### GitHub Actions

```yaml
jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions-rust-lang/setup-rust-toolchain@v1
      - run: npm ci && cargo tauri build
      - uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: |
            src-tauri/target/release/bundle/**/*
```

## App Store Distribution

### Apple App Store

```bash
# Build with Mac App Store config
cargo tauri build --config store-config.json

# Submit via Transporter or xcodebuild
xcrun altool --upload-app -f MyApp.pkg \
  -u user@example.com -p @keychain:AC_PASSWORD
```

### Microsoft Store

- Package as MSIX using tauri-bundler
- Submit via Partner Center
- Need MSIX packaging tools installed
- Use `"targets": ["msi"]` in bundle config

## Distribution Checklist

- Code signed for Windows (Authenticode) and macOS (Developer ID)
- macOS notarized with stapled ticket
- Linux packages for target distro (.deb, .rpm, AppImage)
- CI builds on all 3 platforms for every tag
- Auto-updater configured with public key signing
- Update endpoints HTTPS with valid TLS cert
- App icons provided in all required sizes
- Privacy manifest (macOS) for required reason API
- Minimum OS version set appropriately
- Dependencies vendored or fetched via CI
