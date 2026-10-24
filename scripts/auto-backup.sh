#!/usr/bin/env bash
set -euo pipefail

cd /root/setubooks-site

# Runtime data, credentials, dependencies, and local backups stay excluded.
git add -A
if git diff --cached --quiet; then
  exit 0
fi

git commit -m "chore: automated VPS backup $(date -u +'%Y-%m-%d %H:%M UTC')"
git push origin main

