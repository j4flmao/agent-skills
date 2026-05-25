# WinUI 3 Deployment Reference

## MSIX Packaging

```xml
<!-- Package.appxmanifest (snippet) -->
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         IgnorableNamespaces="uap rescap">
  <Identity Name="MyApp" Publisher="CN=MyCompany" Version="1.0.0.0"/>
  <Properties>
    <DisplayName>My WinUI 3 App</DisplayName>
    <PublisherDisplayName>My Company</PublisherDisplayName>
    <Logo>Assets\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Universal" MinVersion="10.0.19041.0"
                        MaxVersionTested="10.0.22621.0"/>
  </Dependencies>
  <Capabilities>
    <rescap:Capability Name="runFullTrust"/>
    <Capability Name="internetClient"/>
  </Capabilities>
</Package>
```

```bash
# Build MSIX package
dotnet msbuild -restore -t:Build;Publish \
  -p:Configuration=Release \
  -p:Platform=x64 \
  -p:AppxPackage=true \
  -p:AppxBundle=Always \
  -p:AppxPackageDir="PackageOutput"

# Create .msixbundle for multi-architecture
# Automatic with AppxBundle=Always
```

## Sideloading

```powershell
# Install sideloaded package
Add-AppxPackage -Path "MyApp_1.0.0.0_x64.msix"

# Install dependencies + app
Add-AppxPackage -DependencyPath "Dependencies/x64/*.msix" \
  -AppxPackagePath "MyApp_1.0.0.0_x64.msix"

# Certificate installation for sideloading
Import-Certificate -FilePath "MyApp.cer" -CertStoreLocation Cert:\LocalMachine\TrustedPeople
```

## Windows Store

```xml
<!-- Store-specific manifest additions -->
<Extensions>
  <uap:Extension Category="windows.store">
    <uap:StoreProductDetails ProductId="P1234567"/>
  </uap:Extension>
</Extensions>
```

Store submission steps:
1. Create app listing in Partner Center
2. Upload MSIX bundles for x86, x64, ARM64
3. Configure pricing, availability, age rating
4. Submit for certification

## CI/CD

### GitHub Actions

```yaml
jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup MSBuild
        uses: microsoft/setup-msbuild@v2

      - name: Restore and Build
        run: |
          msbuild -restore -t:Build -p:Configuration=Release -p:Platform=x64
          msbuild -restore -t:Build -p:Configuration=Release -p:Platform=x86
          msbuild -restore -t:Build -p:Configuration=Release -p:Platform=ARM64

      - name: Create MSIX Bundle
        run: |
          msbuild -t:CreateAppPackage -p:Configuration=Release `
            -p:AppxPackageDir=$(Build.ArtifactStagingDirectory)

      - uses: actions/upload-artifact@v4
        with:
          name: msix-bundle
          path: ${{ github.workspace }}/PackageOutput/*.msixbundle

      - name: Sign Package
        if: startsWith(github.ref, 'refs/tags/')
        run: |
          SignTool sign /fd SHA256 /a /f ${{ secrets.CERT_FILE }} `
            /p ${{ secrets.CERT_PASSWORD }} `
            /tr http://timestamp.digicert.com /td SHA256 `
            $(Build.ArtifactStagingDirectory)/*.msixbundle
```

## Native AOT

```xml
<PropertyGroup>
  <PublishAot>true</PublishAot>
  <RuntimeIdentifier>win-x64</RuntimeIdentifier>
  <SelfContained>true</SelfContained>
</PropertyGroup>
```

```bash
# Publish with Native AOT
dotnet publish -c Release -r win-x64 -p:PublishAot=true

# AOT benefits:
# - Faster startup (no JIT compilation)
# - Smaller memory footprint
# - Harder to reverse engineer
# Limitations:
# - No dynamic code generation
# - Limited reflection support
# - Must trim unused code paths
```

## Deployment Checklist

- MSIX package with identity, capabilities, dependencies
- Multi-architecture MSIX bundle (x86, x64, ARM64)
- Package signed with certificate trusted by target devices
- CI produces signed MSIX on tag pushes
- Windows App Runtime dependency bundled or auto-installed
- Minimum Windows version set (10.0.17763+)
- App icon in all required MSIX sizes (StoreLogo, Square44x44, etc.)
- Privacy policy URL set in Store listing
- App capabilities match declared usage in code
- Cert validation done before production sideloading
- AOT publishing considered for perf-critical kiosk apps
