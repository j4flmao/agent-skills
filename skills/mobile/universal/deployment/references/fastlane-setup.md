# Fastlane Setup

## Installation
```bash
# Gemfile
source "https://rubygems.org"
gem "fastlane"

bundle install
# or
gem install fastlane
```

## Setup
```bash
# iOS
fastlane init

# Android (from project root)
fastlane init

# Generate screenshots
fastlane snapshot
fastlane screengrab

# Match (code signing)
fastlane match init
```

## Custom Lanes
```ruby
lane :screenshots do
  capture_screenshots(scheme: "App")
  upload_to_app_store
end

lane :upload_metadata do
  deliver(
    submit_for_review: false,
    metadata_path: "./fastlane/metadata"
  )
end
```

## Environment Variables
```bash
# .env.default
FASTLANE_XCODEBUILD_SETTINGS_TIMEOUT=120
# .env.secret (gitignored)
FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD=xxxx
```
