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
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# ─── Show current versions ───────────────────────────────────────────────────
VERSION=$(node -e "console.log(require('./version.json').version)")
IOS_BUILD=$(node -e "console.log(require('./version.json').ios.buildNumber)")
ANDROID_CODE=$(node -e "console.log(require('./version.json').android.versionCode)")
WINDOWS_CODE=$(node -e "console.log(require('./version.json').windows.versionCode)")

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Build All Platforms${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "  Version:  ${VERSION}"
echo -e "  iOS:      build ${IOS_BUILD}"
echo -e "  Android:  code ${ANDROID_CODE}"
echo -e "  Windows:  code ${WINDOWS_CODE}"
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo ""

# ─── Platform selection ───────────────────────────────────────────────────────
BUILD_IOS=false
BUILD_ANDROID=false
BUILD_WINDOWS=false

IOS_ENV=""
ANDROID_ENV=""

# Parse arguments: ./scripts/build.sh ios:prod android:dev windows
if [ $# -gt 0 ]; then
    for arg in "$@"; do
        case "$arg" in
            ios:dev)      BUILD_IOS=true; IOS_ENV="dev" ;;
            ios:prod)     BUILD_IOS=true; IOS_ENV="prod" ;;
            ios)          BUILD_IOS=true ;;
            android:dev)  BUILD_ANDROID=true; ANDROID_ENV="dev" ;;
            android:prod) BUILD_ANDROID=true; ANDROID_ENV="prod" ;;
            android)      BUILD_ANDROID=true ;;
            windows|win)  BUILD_WINDOWS=true ;;
            all:dev)      BUILD_IOS=true; IOS_ENV="dev"; BUILD_ANDROID=true; ANDROID_ENV="dev"; BUILD_WINDOWS=true ;;
            all:prod)     BUILD_IOS=true; IOS_ENV="prod"; BUILD_ANDROID=true; ANDROID_ENV="prod"; BUILD_WINDOWS=true ;;
            all)          BUILD_IOS=true; BUILD_ANDROID=true; BUILD_WINDOWS=true ;;
            *)
                echo -e "${RED}Unknown argument: $arg${NC}"
                echo ""
                echo "Usage: ./scripts/build.sh [platforms...]"
                echo ""
                echo "  ios[:dev|:prod]      Build iOS"
                echo "  android[:dev|:prod]  Build Android"
                echo "  windows              Build Windows (Electron)"
                echo "  all[:dev|:prod]      Build all platforms"
                echo ""
                echo "Examples:"
                echo "  ./scripts/build.sh ios:prod windows"
                echo "  ./scripts/build.sh all:prod"
                echo "  ./scripts/build.sh android:dev"
                echo "  ./scripts/build.sh                  # interactive"
                exit 1
                ;;
        esac
    done
else
    # Interactive selection
    echo -e "${BOLD}Select platforms to build:${NC}"
    echo ""

    read -rp "  iOS?      [y/N] " yn_ios
    if [[ "$yn_ios" =~ ^[Yy]$ ]]; then
        BUILD_IOS=true
        read -rp "    env?    [1=dev / 2=prod] " ios_choice
        case "$ios_choice" in
            1|dev) IOS_ENV="dev" ;;
            2|prod) IOS_ENV="prod" ;;
            *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
        esac
    fi

    read -rp "  Android?  [y/N] " yn_android
    if [[ "$yn_android" =~ ^[Yy]$ ]]; then
        BUILD_ANDROID=true
        read -rp "    env?    [1=dev / 2=prod] " android_choice
        case "$android_choice" in
            1|dev) ANDROID_ENV="dev" ;;
            2|prod) ANDROID_ENV="prod" ;;
            *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
        esac
    fi

    read -rp "  Windows?  [y/N] " yn_windows
    if [[ "$yn_windows" =~ ^[Yy]$ ]]; then
        BUILD_WINDOWS=true
    fi
fi

# Check at least one platform selected
if ! $BUILD_IOS && ! $BUILD_ANDROID && ! $BUILD_WINDOWS; then
    echo -e "${YELLOW}No platforms selected. Nothing to build.${NC}"
    exit 0
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Build plan:${NC}"
STEP=0
if $BUILD_IOS; then
    STEP=$((STEP + 1))
    echo -e "  ${STEP}. ${CYAN}iOS${NC} (${IOS_ENV})"
fi
if $BUILD_WINDOWS; then
    STEP=$((STEP + 1))
    echo -e "  ${STEP}. ${CYAN}Windows${NC} (Electron)"
fi
if $BUILD_ANDROID; then
    STEP=$((STEP + 1))
    echo -e "  ${STEP}. ${CYAN}Android${NC} (${ANDROID_ENV})"
fi
TOTAL=$STEP
echo ""

START_TIME=$(date +%s)
CURRENT=0
RESULTS=()

# ─── Build iOS ────────────────────────────────────────────────────────────────
if $BUILD_IOS; then
    CURRENT=$((CURRENT + 1))
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  [${CURRENT}/${TOTAL}] iOS (${IOS_ENV})${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    IOS_START=$(date +%s)

    if "$SCRIPT_DIR/build-ios.sh" "$IOS_ENV"; then
        IOS_END=$(date +%s)
        IOS_ELAPSED=$(( IOS_END - IOS_START ))
        RESULTS+=("${GREEN}✓ iOS (${IOS_ENV})${NC} — $((IOS_ELAPSED / 60))m $((IOS_ELAPSED % 60))s")
    else
        RESULTS+=("${RED}✗ iOS (${IOS_ENV})${NC} — FAILED")
        echo -e "${RED}iOS build failed. Continuing with next platform...${NC}"
    fi
    echo ""
fi

# ─── Build Windows ────────────────────────────────────────────────────────────
if $BUILD_WINDOWS; then
    CURRENT=$((CURRENT + 1))
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  [${CURRENT}/${TOTAL}] Windows (Electron)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    WIN_START=$(date +%s)

    if "$SCRIPT_DIR/build-windows.sh"; then
        WIN_END=$(date +%s)
        WIN_ELAPSED=$(( WIN_END - WIN_START ))
        RESULTS+=("${GREEN}✓ Windows${NC} — $((WIN_ELAPSED / 60))m $((WIN_ELAPSED % 60))s")
    else
        RESULTS+=("${RED}✗ Windows${NC} — FAILED")
        echo -e "${RED}Windows build failed. Continuing with next platform...${NC}"
    fi
    echo ""
fi

# ─── Build Android ────────────────────────────────────────────────────────────
if $BUILD_ANDROID; then
    CURRENT=$((CURRENT + 1))
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  [${CURRENT}/${TOTAL}] Android (${ANDROID_ENV})${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    ANDROID_START=$(date +%s)

    if "$SCRIPT_DIR/build-android.sh" "$ANDROID_ENV"; then
        ANDROID_END=$(date +%s)
        ANDROID_ELAPSED=$(( ANDROID_END - ANDROID_START ))
        RESULTS+=("${GREEN}✓ Android (${ANDROID_ENV})${NC} — $((ANDROID_ELAPSED / 60))m $((ANDROID_ELAPSED % 60))s")
    else
        RESULTS+=("${RED}✗ Android (${ANDROID_ENV})${NC} — FAILED")
        echo -e "${RED}Android build failed.${NC}"
    fi
    echo ""
fi

# ─── Final summary ───────────────────────────────────────────────────────────
END_TIME=$(date +%s)
TOTAL_ELAPSED=$(( END_TIME - START_TIME ))
TOTAL_MIN=$(( TOTAL_ELAPSED / 60 ))
TOTAL_SEC=$(( TOTAL_ELAPSED % 60 ))

echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ALL BUILDS COMPLETE${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
for r in "${RESULTS[@]}"; do
    echo -e "  $r"
done
echo -e "${BOLD}───────────────────────────────────────────────${NC}"
echo -e "  Total time: ${TOTAL_MIN}m ${TOTAL_SEC}s"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
