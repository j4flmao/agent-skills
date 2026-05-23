# Electron Packaging Reference

## Tool Comparison

| Feature | electron-builder | electron-forge | electron-vite |
|---------|-----------------|----------------|---------------|
| Auto-update | Built-in via electron-updater | Plugin | Manual setup |
| Code signing | Squirrel.Windows, keychain | macOS notarize | Configurable |
| Multi-platform | Cross-compile from CI | Per-platform build | Vite dev + build |
| Config format | YAML/JSON | forge.config.js | vite.config.ts |
| Community | Largest | Medium | Growing |

## electron-builder Configuration

```yaml
# electron-builder.yml
appId: com.example.myapp
productName: MyApp
copyright: Copyright 2026 MyOrg

directories:
  output: dist
  buildResources: build

files:
  - "dist/**/*"
  - "main.js"
  - "preload.js"
  - "package.json"

extraResources:
  - from: "assets/"
    to: "assets/"

win:
  target:
    - nsis
    - portable
  icon: build/icon.ico
  signAndEditExecutable: true

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  installerIcon: build/installer.ico
  uninstallerIcon: build/uninstaller.ico

mac:
  target:
    - dmg
    - zip
  icon: build/icon.icns
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.inherit.plist
  hardenedRuntime: true
  gatekeeperAssess: false

dmg:
  title: MyApp
  background: build/background.png
  iconSize: 80
  contents:
    - x: 130
      y: 220
      type: file
    - x: 410
      y: 220
      type: link
      path: /Applications

linux:
  target:
    - AppImage
    - deb
    - rpm
  category: Development
  icon: build/icons
  synopsis: Cross-platform desktop app
  description: Built with Electron

publish:
  provider: github
  owner: myorg
  repo: myapp
  releaseType: draft
```

## macOS Code Signing

```xml
<!-- build/entitlements.mac.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
  <key>com.apple.security.device.camera</key>
  <false/>
  <key>com.apple.security.device.microphone</key>
  <false/>
</dict>
</plist>
```

## Auto-Update with electron-updater

```javascript
// main.js
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

autoUpdater.on('checking-for-update', () => mainWindow.webContents.send('update-status', 'checking'));
autoUpdater.on('update-available', (info) => mainWindow.webContents.send('update-status', 'available', info));
autoUpdater.on('update-not-available', () => mainWindow.webContents.send('update-status', 'up-to-date'));
autoUpdater.on('error', (err) => mainWindow.webContents.send('update-status', 'error', err.message));
autoUpdater.on('download-progress', (p) => mainWindow.webContents.send('update-progress', p.percent));
autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall(true, true);
});

app.whenReady().then(() => {
  if (!require('electron-is-dev')) autoUpdater.checkForUpdates();
});
```

## CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/release.yml
name: Build and Release
on:
  push:
    tags: ["v*"]

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci
      - run: npm run build
      - run: npm run electron:build
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
```

## Performance Optimizations

```javascript
// main.js
const { app } = require('electron');

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('no-proxy-server');

// Lazy-load heavy modules
let nativeModule;
app.whenReady().then(() => { nativeModule = require('./heavy-module'); });
```

## Build Scripts

```json
{
  "scripts": {
    "start": "electron-vite dev",
    "preview": "electron-vite preview",
    "build": "electron-vite build",
    "package:win": "npm run build && electron-builder --win",
    "package:mac": "npm run build && electron-builder --mac",
    "package:linux": "npm run build && electron-builder --linux",
    "package:all": "npm run build && electron-builder --win --mac --linux",
    "release": "npm run build && electron-builder --publish always"
  }
}
```

## Windows Build Environment

```bash
# Required tools
npm install --global windows-build-tools
# Certificates
$cert = New-SelfSignedCertificate -Type Custom -Subject "CN=MyOrg" -KeyUsage DigitalSignature -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3")
Export-PfxCertificate -Cert $cert -FilePath build/cert.pfx -Password (ConvertTo-SecureString -String "password" -Force -AsPlainText)
```

## Common Issues

| Issue | Solution |
|-------|----------|
| native module not found | Run npx electron-rebuild |
| code sign failure on CI | Set CSC_LINK / CSC_KEY_PASSWORD env |
| auto-update not triggering | Check publish provider matches release URL |
| large AppImage size | Exclude devDependencies, compress asar |
| window flashes white | Set backgroundColor in BrowserWindow config |
