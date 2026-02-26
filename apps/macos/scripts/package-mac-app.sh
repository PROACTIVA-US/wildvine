#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$PROJECT_DIR/dist"
APP_NAME="Wildvine"
BUNDLE_ID="com.wildvine.mac"
APP_BUNDLE="$DIST_DIR/$APP_NAME.app"

echo "==> Building $APP_NAME (release)..."
cd "$PROJECT_DIR"
swift build --product "$APP_NAME" -c release 2>&1

BUILT_BINARY="$PROJECT_DIR/.build/release/$APP_NAME"
if [[ ! -f "$BUILT_BINARY" ]]; then
  echo "ERROR: Build output not found at $BUILT_BINARY"
  exit 1
fi

echo "==> Assembling $APP_NAME.app bundle..."
rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"

# Copy binary
cp "$BUILT_BINARY" "$APP_BUNDLE/Contents/MacOS/$APP_NAME"

# Copy Info.plist
cp "$PROJECT_DIR/Sources/Wildvine/Resources/Info.plist" "$APP_BUNDLE/Contents/Info.plist"

# Stamp build metadata into Info.plist
BUILD_TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
GIT_COMMIT="$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")"
/usr/libexec/PlistBuddy -c "Set :WildvineBuildTimestamp $BUILD_TS" "$APP_BUNDLE/Contents/Info.plist" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Set :WildvineGitCommit $GIT_COMMIT" "$APP_BUNDLE/Contents/Info.plist" 2>/dev/null || true

# Copy icon
cp "$PROJECT_DIR/Sources/Wildvine/Resources/Wildvine.icns" "$APP_BUNDLE/Contents/Resources/Wildvine.icns"

# Copy menubar icon
cp "$PROJECT_DIR/Sources/Wildvine/Resources/menubar-icon.png" "$APP_BUNDLE/Contents/Resources/menubar-icon.png"

# Copy DeviceModels
if [[ -d "$PROJECT_DIR/Sources/Wildvine/Resources/DeviceModels" ]]; then
  cp -R "$PROJECT_DIR/Sources/Wildvine/Resources/DeviceModels" "$APP_BUNDLE/Contents/Resources/DeviceModels"
fi

# Copy SPM-bundled resources (Wildvine_Wildvine.bundle etc.)
for bundle in "$PROJECT_DIR/.build/release/"*.bundle; do
  [[ -d "$bundle" ]] && cp -R "$bundle" "$APP_BUNDLE/Contents/Resources/"
done

# Copy Sparkle.framework — binary rpath is @loader_path so it must
# sit next to the executable in Contents/MacOS/
SPARKLE_FW="$PROJECT_DIR/.build/release/Sparkle.framework"
if [[ -d "$SPARKLE_FW" ]]; then
  cp -R "$SPARKLE_FW" "$APP_BUNDLE/Contents/MacOS/"
fi

# Code signing
source "$SCRIPT_DIR/codesign-mac-app.sh"

echo "==> Done: $APP_BUNDLE"
