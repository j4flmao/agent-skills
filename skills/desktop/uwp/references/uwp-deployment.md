# UWP Deployment Reference

## Store Submission

```
Steps:
1. Partner Center → Create new product → Windows app
2. Reserve app name
3. Upload packages (.msixupload or .appxupload)
4. Configure:
   - Pricing (free, paid, trial)
   - Market selection
   - Age rating (ESRB, PEGI, etc.)
   - Privacy policy URL
5. Certification notes (test accounts, special instructions)
6. Submit for certification
```

Package requirements:
- .msixupload (preferred) or .appxupload
- Neutral + at least one architecture (x86, x64, ARM, ARM64)
- Version must be higher than last submission
- StoreLogo.png (50x50), Square150x150Logo, Wide310x150Logo

## Packaging

```xml
<!-- Package.appxmanifest — identity and version -->
<Identity Name="MyCompany.MyApp"
          Publisher="CN=MyCompany"
          Version="1.2.3.0"/>

<Properties>
  <DisplayName>My UWP App</DisplayName>
  <PublisherDisplayName>My Company</PublisherDisplayName>
  <Logo>Assets\StoreLogo.png</Logo>
</Properties>
```

```bash
# Create app package
msbuild /t:Build /p:Configuration=Release /p:AppxPackage=true
msbuild /t:Build /p:AppxBundle=Always /p:UapAppxPackageBuildMode=StoreUpload

# Output: AppPackages/MyApp_x.x.x.x_Test/MyApp_x.x.x.x.msixupload
```

## Capabilities

```xml
<Capabilities>
  <!-- Required -->
  <Capability Name="internetClient"/>

  <!-- Device capabilities -->
  <DeviceCapability Name="webcam"/>
  <DeviceCapability Name="microphone"/>
  <DeviceCapability Name="location"/>
  <DeviceCapability Name="bluetooth"/>

  <!-- Restricted (requires Store approval) -->
  <rescap:Capability Name="runFullTrust"/>
  <rescap:Capability Name="inputInjectionBrokered"/>

  <!-- Custom capabilities -->
  <uap:Capability Name="userNotificationListener"/>
</Capabilities>
```

## Sideloading

```powershell
# Enable sideloading on device (Settings → Updates → For developers)
# Or via GPO/Intune for enterprise

# Install
Add-AppxPackage -Path "MyApp_1.2.3.0_x64.msix"

# Install with dependencies
Add-AppxPackage -DependencyPath "Dependencies\x64\*.msix" `
  -AppxPackagePath "MyApp_1.2.3.0_x64.msix"

# Install for all users (enterprise)
Add-AppxProvisionedPackage -Online -PackagePath "MyApp.msix" `
  -SkipLicense

# Remove
Remove-AppxPackage "MyCompany.MyApp"
```

## Enterprise Deployment

```xml
<!-- Enterprise-specific manifest additions -->
<Properties>
  <DisplayName>My UWP App</DisplayName>
  <PublisherDisplayName>My Company</PublisherDisplayName>
  <uap:SupportedUsers>multiple</uap:SupportedUsers>
</Properties>
```

```powershell
# Enterprise deployment via MDM/Intune
# Create provisioning package via Windows Configuration Designer
# Or deploy via:
1. Generate .appxbundle
2. Sign with enterprise cert
3. Deploy via Group Policy / Microsoft Intune / SCCM
4. License via:
   dism /Online /Add-ProvisionedAppxPackage /PackagePath:"MyApp.msix" /SkipLicense
```

## Versioning

```xml
<!-- Version format: Major.Minor.Build.Revision -->
<Identity Name="MyCompany.MyApp" Version="1.2.3.0"/>

<!-- Auto increment in CI -->
<!-- Use GitVersion or manual version bump -->
<Identity Name="MyCompany.MyApp"
          Version="$env:APP_VERSION"/>
```

Versioning rules:
- Store requires strictly increasing version numbers
- Version 1.0.0.0 → 1.0.0.1 (patch) → 1.1.0.0 (minor) → 2.0.0.0 (major)
- Build number can be used for CI build ID (e.g., 1.0.$(BuildID).0)
- Each architecture can have different revision but same major.minor.build

## Submission Checklist

- AppxUpload package built in Release mode
- Packages for all supported architectures
- Capabilities match actual API usage (no over-declaration)
- Privacy policy URL set
- Age rating completed
- Screenshots provided (at least 1 per device family)
- Store logos in required sizes
- Certification test notes included if needed
- App not using deprecated APIs (Windows 10 SDK validation)
- Background tasks declared in manifest with proper types
- Trial functionality configured if applicable
- In-app purchases configured in Partner Center
- Advertisement SDK configured if applicable
