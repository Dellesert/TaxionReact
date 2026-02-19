#!/bin/bash
set -e

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Project root (scripts/ -> project root) ─────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# ─── Detect OS and set Java/Gradle paths ─────────────────────────────────────
OS_TYPE="$(uname -s)"
case "$OS_TYPE" in
    Darwin*)
        PLATFORM="macOS"
        JAVA_HOME_PATH="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
        JAVA_HOME_GRADLE="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
        GRADLE_CMD="./gradlew"
        export ANDROID_HOME="$HOME/Library/Android/sdk"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        PLATFORM="Windows"
        JAVA_HOME_PATH="/c/Program Files/Android/Android Studio/jbr"
        JAVA_HOME_GRADLE="C:\\\\Program Files\\\\Android\\\\Android Studio\\\\jbr"
        GRADLE_CMD="./gradlew.bat"
        export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"
        ;;
    Linux*)
        PLATFORM="Linux"
        JAVA_HOME_PATH="/opt/android-studio/jbr"
        JAVA_HOME_GRADLE="/opt/android-studio/jbr"
        GRADLE_CMD="./gradlew"
        export ANDROID_HOME="$HOME/Android/Sdk"
        ;;
    *)
        echo -e "${RED}Unknown OS: $OS_TYPE${NC}"
        exit 1
        ;;
esac

# Verify Java exists
if [ ! -d "$JAVA_HOME_PATH" ]; then
    echo -e "${RED}Java (JBR) not found at: $JAVA_HOME_PATH${NC}"
    echo -e "${YELLOW}Install Android Studio or set JAVA_HOME manually.${NC}"
    exit 1
fi

export JAVA_HOME="$JAVA_HOME_PATH"
export PATH="$JAVA_HOME/bin:$PATH"

# ─── Choose environment ──────────────────────────────────────────────────────
ENV_ARG="${1}"

if [ -z "$ENV_ARG" ]; then
    echo ""
    echo -e "${BOLD}Android Build Script${NC}"
    echo -e "  Platform: ${CYAN}${PLATFORM}${NC}"
    echo -e "  Java:     ${JAVA_HOME_PATH}"
    echo ""
    echo "  1) dev   — Development build (Debug APK)"
    echo "  2) prod  — Production build (Release APK)"
    echo ""
    read -rp "Choose environment [1/2]: " choice
    case "$choice" in
        1|dev)  ENV_ARG="dev" ;;
        2|prod) ENV_ARG="prod" ;;
        *)
            echo -e "${RED}Invalid choice. Use: ./scripts/build-android.sh [dev|prod]${NC}"
            exit 1
            ;;
    esac
fi

# ─── Set parameters based on environment ──────────────────────────────────────
case "$ENV_ARG" in
    dev|development)
        APP_ENV="development"
        GRADLE_TASK="assembleDebug"
        APK_SUBPATH="debug/app-debug.apk"
        ENV_LABEL="Development"
        ;;
    prod|production)
        APP_ENV="production"
        GRADLE_TASK="assembleRelease"
        APK_SUBPATH="release/app-release.apk"
        ENV_LABEL="Production"
        ;;
    *)
        echo -e "${RED}Unknown environment: $ENV_ARG${NC}"
        echo "Usage: ./scripts/build-android.sh [dev|prod]"
        exit 1
        ;;
esac

APK_PATH="android/app/build/outputs/apk/$APK_SUBPATH"
START_TIME=$(date +%s)

# ─── Show current version ────────────────────────────────────────────────────
CURRENT_VERSION=$(node -e "console.log(require('./version.json').version)")
CURRENT_CODE=$(node -e "console.log(require('./version.json').android.versionCode)")

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Android Build — ${CYAN}${ENV_LABEL}${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "  Platform:     ${CYAN}${PLATFORM}${NC}"
echo -e "  Java:         ${JAVA_HOME_PATH}"
echo -e "  Version:      ${CURRENT_VERSION}"
echo -e "  VersionCode:  ${CURRENT_CODE} → ${GREEN}$((CURRENT_CODE + 1))${NC}"
echo -e "  Gradle task:  ${GRADLE_TASK}"
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo ""

# ─── Step 1: Bump version code ───────────────────────────────────────────────
echo -e "${BLUE}[Step 1/4]${NC} ${BOLD}Bumping Android versionCode...${NC}"
node scripts/bump-version.js --android
NEW_CODE=$(node -e "console.log(require('./version.json').android.versionCode)")
echo ""

# ─── Step 2: Expo prebuild (clean) ───────────────────────────────────────────
echo -e "${BLUE}[Step 2/4]${NC} ${BOLD}Expo prebuild (clean)...${NC}"
rm -rf android
APP_ENV="$APP_ENV" npx expo prebuild --platform android
echo ""

# ─── Step 3: Fix Java path in gradle.properties ──────────────────────────────
echo -e "${BLUE}[Step 3/4]${NC} ${BOLD}Configuring Java path for ${PLATFORM}...${NC}"
GRADLE_PROPS="android/gradle.properties"

# Remove old java.home line (if any), then append correct one
grep -v "^org.gradle.java.home" "$GRADLE_PROPS" > "$GRADLE_PROPS.tmp" || true
echo "org.gradle.java.home=$JAVA_HOME_GRADLE" >> "$GRADLE_PROPS.tmp"
mv "$GRADLE_PROPS.tmp" "$GRADLE_PROPS"

echo -e "  ${GREEN}Set org.gradle.java.home=${JAVA_HOME_GRADLE}${NC}"
echo ""

# ─── Step 4: Build APK ───────────────────────────────────────────────────────
echo -e "${BLUE}[Step 4/4]${NC} ${BOLD}Building APK (${GRADLE_TASK})...${NC}"
cd android && $GRADLE_CMD "$GRADLE_TASK" && cd ..
echo ""

# ─── Done ─────────────────────────────────────────────────────────────────────
END_TIME=$(date +%s)
ELAPSED=$(( END_TIME - START_TIME ))
MINUTES=$(( ELAPSED / 60 ))
SECONDS=$(( ELAPSED % 60 ))

echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  BUILD COMPLETE${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "  Environment:  ${CYAN}${ENV_LABEL}${NC}"
echo -e "  Version:      ${CURRENT_VERSION} (${NEW_CODE})"
echo -e "  APK:          ${BOLD}${APK_PATH}${NC}"
echo -e "  Time:         ${MINUTES}m ${SECONDS}s"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
