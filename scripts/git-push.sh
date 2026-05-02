#!/usr/bin/env bash
# git-push.sh — Commit and push all changes to GitHub
# Usage: bash scripts/git-push.sh ["optional commit message"]

set -euo pipefail

REPO_URL="https://${GITHUB_TOKEN}@github.com/JBlizzard-sketch/nairobi-expat-concierge.git"
BRANCH="main"
MSG="${1:-"chore: auto-sync $(date -u '+%Y-%m-%d %H:%M UTC')"}"

# Configure git identity if not already set
git config user.email "replit-agent@replit.com" 2>/dev/null || true
git config user.name "Replit Agent" 2>/dev/null || true

# Ensure remote is set to authenticated URL
git remote set-url origin "$REPO_URL" 2>/dev/null || git remote add origin "$REPO_URL"

# Stage everything
git add -A

# Commit only if there are staged changes
if git diff --cached --quiet; then
    echo "Nothing to commit — working tree clean."
else
    git commit -m "$MSG"
    echo "Committed: $MSG"
fi

# Push
git push -u origin "$BRANCH"
echo "Pushed to origin/$BRANCH"
