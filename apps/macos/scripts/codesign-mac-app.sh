#!/usr/bin/env bash
# Codesign the Wildvine.app bundle.
# Sourced by package-mac-app.sh or runnable standalone.
set -euo pipefail

APP_BUNDLE="${APP_BUNDLE:-$(cd "$(dirname "$0")/.." && pwd)/dist/Wildvine.app}"

if [[ ! -d "$APP_BUNDLE" ]]; then
  echo "ERROR: App bundle not found at $APP_BUNDLE"
  exit 1
fi

# Determine signing identity
if [[ -n "${SIGN_IDENTITY:-}" ]]; then
  IDENTITY="$SIGN_IDENTITY"
elif security find-identity -v -p codesigning 2>/dev/null | grep -q "Developer ID Application"; then
  IDENTITY="$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | awk -F'"' '{print $2}')"
elif security find-identity -v -p codesigning 2>/dev/null | grep -q "Apple Development"; then
  IDENTITY="$(security find-identity -v -p codesigning | grep "Apple Development" | head -1 | awk -F'"' '{print $2}')"
elif [[ "${ALLOW_ADHOC_SIGNING:-0}" == "1" ]]; then
  IDENTITY="-"
else
  echo "WARNING: No signing identity found. Using ad-hoc signing."
  echo "  Set ALLOW_ADHOC_SIGNING=1 to suppress this warning."
  IDENTITY="-"
fi

echo "==> Signing with: $IDENTITY"

# Build entitlements
ENTITLEMENTS_FILE="$(mktemp /tmp/wildvine-entitlements.XXXXXX.plist)"
cat > "$ENTITLEMENTS_FILE" << 'ENTITLEMENTS'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.app-sandbox</key>
    <false/>
    <key>com.apple.security.device.audio-input</key>
    <true/>
    <key>com.apple.security.personal-information.location</key>
    <true/>
    <key>com.apple.security.automation.apple-events</key>
    <true/>
ENTITLEMENTS

if [[ "${DISABLE_LIBRARY_VALIDATION:-0}" == "1" ]]; then
  echo "    <key>com.apple.security.cs.disable-library-validation</key>" >> "$ENTITLEMENTS_FILE"
  echo "    <true/>" >> "$ENTITLEMENTS_FILE"
fi

cat >> "$ENTITLEMENTS_FILE" << 'ENTITLEMENTS_END'
</dict>
</plist>
ENTITLEMENTS_END

TIMESTAMP_FLAG=""
if [[ "${CODESIGN_TIMESTAMP:-}" == "off" ]]; then
  TIMESTAMP_FLAG="--timestamp=none"
fi

# Sign frameworks first, then the app
if [[ -d "$APP_BUNDLE/Contents/Frameworks" ]]; then
  find "$APP_BUNDLE/Contents/Frameworks" -type f -perm +111 -o -name "*.dylib" | while read -r lib; do
    codesign --force --sign "$IDENTITY" $TIMESTAMP_FLAG "$lib" 2>/dev/null || true
  done
  find "$APP_BUNDLE/Contents/Frameworks" -name "*.framework" -type d | while read -r fw; do
    codesign --force --sign "$IDENTITY" $TIMESTAMP_FLAG "$fw" 2>/dev/null || true
  done
fi

# Sign the app bundle
codesign --force --sign "$IDENTITY" --entitlements "$ENTITLEMENTS_FILE" $TIMESTAMP_FLAG "$APP_BUNDLE"

rm -f "$ENTITLEMENTS_FILE"

# Team ID audit
if [[ "${SKIP_TEAM_ID_CHECK:-0}" != "1" && "$IDENTITY" != "-" ]]; then
  APP_TEAM="$(codesign -dvv "$APP_BUNDLE" 2>&1 | grep TeamIdentifier | head -1 | cut -d= -f2)"
  if [[ -n "$APP_TEAM" && "$APP_TEAM" != "not set" ]]; then
    MISMATCH=0
    while IFS= read -r binary; do
      BIN_TEAM="$(codesign -dvv "$binary" 2>&1 | grep TeamIdentifier | head -1 | cut -d= -f2)"
      if [[ -n "$BIN_TEAM" && "$BIN_TEAM" != "$APP_TEAM" && "$BIN_TEAM" != "not set" ]]; then
        echo "WARNING: Team ID mismatch: $binary ($BIN_TEAM != $APP_TEAM)"
        MISMATCH=1
      fi
    done < <(find "$APP_BUNDLE/Contents" -type f -perm +111 ! -name "$APP_NAME")
    if [[ "$MISMATCH" == "1" ]]; then
      echo "ERROR: Team ID mismatch detected. Set SKIP_TEAM_ID_CHECK=1 to bypass."
      exit 1
    fi
  fi
fi

echo "==> Code signing complete."
