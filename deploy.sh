#!/usr/bin/env bash
# Update the deployed Marstek Firmware Downloader to the latest committed version.
# Run from the app directory on the server:  sudo ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

# Running via sudo (root) on a repo owned by the service user (sphings-dev) trips
# git's "dubious ownership" guard — whitelist this directory once (idempotent).
git config --global --get-all safe.directory 2>/dev/null | grep -qxF "$PWD" \
  || git config --global --add safe.directory "$PWD"

echo "==> git pull"
# npm install can rewrite package-lock.json locally (differing npm versions),
# which then blocks the pull. Discard that regenerated-file churn first.
git checkout -- package-lock.json 2>/dev/null || true
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
