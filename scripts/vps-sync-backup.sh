#!/usr/bin/env bash
set -euo pipefail

LIVE_DIR=/root/setubooks-site
REPO_DIR=/root/iluvinvoice-backup

rsync -rlptD --delete \
  --exclude='.git/' \
  --exclude='.gitignore' \
  --exclude='.env.example' \
  --exclude='scripts/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='node_modules/' \
  --exclude='data/' \
  --exclude='db/' \
  --exclude='backups/' \
  --exclude='*.log' \
  --exclude='*.bak*' \
  --exclude='*.backup*' \
  --exclude='._*' \
  "$LIVE_DIR/" "$REPO_DIR/"

cd "$REPO_DIR"
git add -A
if git diff --cached --quiet; then
  exit 0
fi

git commit -m "chore: automated VPS backup $(date -u +'%Y-%m-%d %H:%M UTC')"
git push origin main

