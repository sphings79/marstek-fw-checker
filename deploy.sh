#!/usr/bin/env bash
# Update the deployed Marstek Firmware Downloader to the latest committed version.
# Run from the app directory on the server:  sudo ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "==> git pull"
git pull --ff-only

echo "==> npm install"
npm install

echo "==> npm run build"
npm run build

# Keep files owned by the service user (systemd runs as sphings-dev).
if id sphings-dev >/dev/null 2>&1; then
  chown -R sphings-dev:sphings-dev .
fi

echo "==> restart service"
systemctl restart marstek-fw-checker
systemctl --no-pager --lines=0 status marstek-fw-checker || true

echo "==> deployed: $(git rev-parse --short HEAD)"
