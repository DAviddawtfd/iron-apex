#!/usr/bin/env bash
# IRON APEX: web build -> Capacitor sync -> debug APK -> IRON-APEX.apk in project root
# Requires: Node 20+, JDK 17+, Android SDK (ANDROID_HOME / ANDROID_SDK_ROOT)
set -euo pipefail
cd "$(dirname "$0")"

command -v node >/dev/null || { echo "[X] Node.js not found: https://nodejs.org"; exit 1; }
command -v java >/dev/null || [ -n "${JAVA_HOME:-}" ] || { echo "[X] JDK 17+ not found"; exit 1; }

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$SDK" ]; then
  for d in "$HOME/Android/Sdk" "$HOME/Library/Android/sdk"; do [ -d "$d" ] && SDK="$d" && break; done
fi
[ -n "$SDK" ] || { echo "[X] Android SDK not found. Set ANDROID_HOME"; exit 1; }
echo "sdk.dir=$SDK" > android/local.properties

[ -d node_modules ] || npm ci
npm run build
npx cap sync android

(cd android && chmod +x gradlew && ./gradlew assembleDebug --no-daemon)

cp android/app/build/outputs/apk/debug/app-debug.apk IRON-APEX.apk
echo
echo "[OK] IRON-APEX.apk is ready: $(pwd)/IRON-APEX.apk"
