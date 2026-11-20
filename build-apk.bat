@echo off
rem IRON APEX: web build -> Capacitor sync -> debug APK -> IRON-APEX.apk in project root
rem Requires: Node 20+, JDK 17+ (JAVA_HOME), Android SDK (ANDROID_HOME or Android Studio default path)
setlocal
cd /d "%~dp0"

where node >nul 2>nul || (echo [X] Node.js not found: https://nodejs.org & exit /b 1)

if not defined JAVA_HOME (
  if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
)
if not defined JAVA_HOME (echo [X] JDK 17+ not found. Install Android Studio or Temurin 17 and set JAVA_HOME & exit /b 1)

if not defined ANDROID_HOME if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if not defined ANDROID_HOME (echo [X] Android SDK not found. Install Android Studio or set ANDROID_HOME & exit /b 1)
echo sdk.dir=%ANDROID_HOME:\=/%> android\local.properties

if not exist node_modules (call npm ci || exit /b 1)
call npm run build || exit /b 1
call npx cap sync android || exit /b 1

pushd android
call gradlew.bat assembleDebug --no-daemon || (popd & exit /b 1)
popd

copy /y android\app\build\outputs\apk\debug\app-debug.apk IRON-APEX.apk >nul || exit /b 1
echo.
echo [OK] IRON-APEX.apk is ready: %CD%\IRON-APEX.apk
endlocal
