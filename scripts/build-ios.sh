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

# ─── Choose environment ──────────────────────────────────────────────────────
ENV_ARG="${1}"

if [ -z "$ENV_ARG" ]; then
    echo ""
    echo -e "${BOLD}iOS Build Script${NC}"
    echo ""
    echo "  1) dev   — Development build (Debug)"
    echo "  2) prod  — Production build (Release)"
    echo ""
    read -rp "Choose environment [1/2]: " choice
    case "$choice" in
        1|dev)  ENV_ARG="dev" ;;
        2|prod) ENV_ARG="prod" ;;
        *)
            echo -e "${RED}Invalid choice. Use: ./scripts/build-ios.sh [dev|prod]${NC}"
            exit 1
            ;;
    esac
fi

# ─── Set parameters based on environment ──────────────────────────────────────
case "$ENV_ARG" in
    dev|development)
        APP_ENV="development"
        WORKSPACE="ios/Dev.xcworkspace"
        SCHEME="Dev"
        CONFIGURATION="Debug"
        ARCHIVE_PATH="ios/build/Dev.xcarchive"
        EXPORT_OPTIONS="ios/build/ExportOptions.plist"
        EXPORT_PATH="ios/build/ipa-dev"
        ENV_LABEL="Development"
        ;;
    prod|production)
        APP_ENV="production"
        WORKSPACE="ios/Tahion.xcworkspace"
        SCHEME="Tahion"
        CONFIGURATION="Release"
        ARCHIVE_PATH="ios/build/Tahion.xcarchive"
        EXPORT_OPTIONS="ios/build/ExportOptions-AppStore.plist"
        EXPORT_PATH="ios/build/ipa-release"
        ENV_LABEL="Production"
        ;;
    *)
        echo -e "${RED}Unknown environment: $ENV_ARG${NC}"
        echo "Usage: ./scripts/build-ios.sh [dev|prod]"
        exit 1
        ;;
esac

TEAM_ID="QNVQ55232N"
START_TIME=$(date +%s)

# ─── Show current version ────────────────────────────────────────────────────
CURRENT_VERSION=$(node -e "console.log(require('./version.json').version)")
CURRENT_BUILD=$(node -e "console.log(require('./version.json').ios.buildNumber)")

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  iOS Build — ${CYAN}${ENV_LABEL}${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "  Version:  ${CURRENT_VERSION}"
echo -e "  Build:    ${CURRENT_BUILD} → ${GREEN}$((CURRENT_BUILD + 1))${NC}"
echo -e "  Scheme:   ${SCHEME}"
echo -e "  Config:   ${CONFIGURATION}"
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo ""

# ─── Step 1: Bump build number ───────────────────────────────────────────────
echo -e "${BLUE}[Step 1/5]${NC} ${BOLD}Bumping iOS build number...${NC}"
node scripts/bump-version.js --ios
NEW_BUILD=$(node -e "console.log(require('./version.json').ios.buildNumber)")
echo ""

# ─── Step 2: Expo prebuild (clean, skip pod install) ────────────────────────
echo -e "${BLUE}[Step 2/5]${NC} ${BOLD}Expo prebuild (clean)...${NC}"
rm -rf ios
APP_ENV="$APP_ENV" npx expo prebuild --platform ios --no-install
echo ""

# ─── Step 3: Pod install (with retry for transient network errors) ───────────
echo -e "${BLUE}[Step 3/5]${NC} ${BOLD}Installing CocoaPods...${NC}"

clean_stale_artifacts() {
  rm -rf ios/Pods/hermes-engine-artifacts ios/Pods/ReactNativeDependencies-artifacts ios/Pods/ReactNativeCore-artifacts 2>/dev/null
  rm -rf ios/Pods/hermes-engine ios/Pods/ReactNativeDependencies ios/Pods/React-Core-prebuilt 2>/dev/null
}

POD_RETRIES=3
POD_SUCCESS=0
for i in $(seq 1 $POD_RETRIES); do
  clean_stale_artifacts
  if (cd ios && LANG=en_US.UTF-8 pod install); then
    POD_SUCCESS=1
    break
  fi
  echo -e "${YELLOW}  Pod install failed (attempt $i/$POD_RETRIES). Retrying in 5s...${NC}"
  sleep 5
done
if [ "$POD_SUCCESS" -ne 1 ]; then
  echo -e "${RED}  Pod install failed after $POD_RETRIES attempts.${NC}"
  exit 1
fi
echo ""

# ─── Step 4: Archive ─────────────────────────────────────────────────────────
echo -e "${BLUE}[Step 4/5]${NC} ${BOLD}Building archive (${SCHEME} ${CONFIGURATION})...${NC}"
xcodebuild -workspace "$WORKSPACE" \
    -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -sdk iphoneos \
    -archivePath "$ARCHIVE_PATH" \
    archive \
    CODE_SIGN_STYLE=Automatic \
    DEVELOPMENT_TEAM="$TEAM_ID" \
    -allowProvisioningUpdates
echo ""

# ─── Step 5: Export IPA ──────────────────────────────────────────────────────
echo -e "${BLUE}[Step 5/5]${NC} ${BOLD}Exporting IPA...${NC}"
xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "$EXPORT_OPTIONS" \
    -allowProvisioningUpdates
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
echo -e "  Version:      ${CURRENT_VERSION} (${NEW_BUILD})"
echo -e "  IPA:          ${BOLD}${EXPORT_PATH}/${NC}"
echo -e "  Time:         ${MINUTES}m ${SECONDS}s"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
