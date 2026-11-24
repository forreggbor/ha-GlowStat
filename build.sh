#!/usr/bin/env bash
# Builds dist/ha-glowstat.js from src/*.js (version taken from package.json).
set -euo pipefail
cd "$(dirname "$0")"

version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' package.json | head -1)
[ -n "$version" ] || { echo "version not found in package.json" >&2; exit 1; }

mkdir -p dist
{
  echo "/* GlowStat v${version} - MIT - https://github.com/forreggbor/ha-GlowStat */"
  echo "(() => {"
  echo "const GS_VERSION = '${version}';"
  cat src/common.js src/thermometer-card.js src/climate-card.js src/heating-card.js
  echo "console.info('%c GlowStat %c v' + GS_VERSION + ' ', 'background:#00a81c;color:#fff;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');"
  echo "})();"
} > dist/ha-glowstat.js

if command -v node >/dev/null 2>&1; then
  node --check dist/ha-glowstat.js
fi
echo "Built dist/ha-glowstat.js (v${version})"
