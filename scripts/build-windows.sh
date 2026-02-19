#!/bin/bash
set -e

# ─── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Project root (scripts/ -> project root) ─────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

START_TIME=$(date +%s)

# ─── Show current version ────────────────────────────────────────────────────
CURRENT_VERSION=$(node -e "console.log(require('./version.json').version)")
CURRENT_CODE=$(node -e "console.log(require('./version.json').windows.versionCode)")

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "${BOLD}  Windows (Electron) Build${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "  Version:      ${CURRENT_VERSION}"
echo -e "  VersionCode:  ${CURRENT_CODE} → ${GREEN}$((CURRENT_CODE + 1))${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════${NC}"
echo ""

# ─── Step 1: Bump version code ───────────────────────────────────────────────
echo -e "${BLUE}[Step 1/2]${NC} ${BOLD}Bumping Windows versionCode...${NC}"
node -e "
const fs = require('fs');
const p = './version.json';
const v = JSON.parse(fs.readFileSync(p, 'utf8'));
const old = v.windows.versionCode;
v.windows.versionCode = old + 1;
fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
console.log('  ✅ Windows versionCode: ' + old + ' → ' + v.windows.versionCode);
"
echo ""

# ─── Step 2: Build ───────────────────────────────────────────────────────────
echo -e "${BLUE}[Step 2/2]${NC} ${BOLD}Building Electron (Windows installer)...${NC}"
npm run electron:build:win
echo ""

# ─── Done ─────────────────────────────────────────────────────────────────────
END_TIME=$(date +%s)
ELAPSED=$(( END_TIME - START_TIME ))
MINUTES=$(( ELAPSED / 60 ))
SECONDS=$(( ELAPSED % 60 ))

NEW_CODE=$(node -e "console.log(require('./version.json').windows.versionCode)")

echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  BUILD COMPLETE${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
echo -e "  Version:      ${CURRENT_VERSION} (${NEW_CODE})"
echo -e "  Output:       ${BOLD}dist-electron/${NC}"
echo -e "  Time:         ${MINUTES}m ${SECONDS}s"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════${NC}"
