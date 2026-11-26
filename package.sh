#!/bin/sh
# Builds the two downloadable packages from extension/:
#   telem-plus-extension.zip  → Chrome / Edge (Load unpacked)
#   telem-plus-firefox.zip    → upload to addons.mozilla.org (Firefox, Firefox for Android, Orion on iPhone)
set -e
cd "$(dirname "$0")"
node build.mjs
rm -f telem-plus-extension.zip telem-plus-firefox.zip
(cd extension && zip -rq ../telem-plus-extension.zip . -x '*.DS_Store' -x 'README.md')
tmp=$(mktemp -d)
cp -r extension/. "$tmp/"
cp firefox-manifest.json "$tmp/manifest.json"
rm -f "$tmp/README.md"
(cd "$tmp" && zip -rq "$OLDPWD/telem-plus-firefox.zip" . -x '*.DS_Store')
rm -rf "$tmp"
echo "packages ready"
