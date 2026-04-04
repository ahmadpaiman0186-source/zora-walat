#!/usr/bin/env bash
# Vercel build (Linux). Produces build/web for static hosting.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ ! -f pubspec.yaml ]; then
  echo "vercel-build: pubspec.yaml not found at $ROOT"
  exit 1
fi

FLUTTER_DIR="${FLUTTER_ROOT:-/tmp/flutter-zora-walat}"
if [ ! -x "$FLUTTER_DIR/bin/flutter" ]; then
  echo "[vercel-build] Cloning Flutter (stable) into $FLUTTER_DIR"
  rm -rf "$FLUTTER_DIR"
  git clone --depth 1 --branch stable \
    https://github.com/flutter/flutter.git "$FLUTTER_DIR"
fi

export PATH="$FLUTTER_DIR/bin:$PATH"
export PUB_CACHE="${PUB_CACHE:-$ROOT/.pub-cache}"

flutter --version
flutter config --enable-web --no-analytics --suppress-analytics
flutter pub get
flutter build web --release

if [ ! -f build/web/index.html ]; then
  echo "[vercel-build] ERROR: build/web/index.html missing after build"
  exit 1
fi

echo "[vercel-build] OK: $(wc -c < build/web/index.html) bytes index.html"
