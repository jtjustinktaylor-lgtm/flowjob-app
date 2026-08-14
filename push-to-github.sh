#!/usr/bin/env bash
# FlowJob — GitHub Push via API
# Usage: bash push-to-github.sh [TOKEN]

set -euo pipefail

TOKEN="${1:-YOUR_GITHUB_TOKEN}"
OWNER="jtjustinktaylor-lgtm"
REPO="flowjob-app"
BRANCH="main"
MSG="FlowJob v6.1: Fixed layout, bottom nav, sidebar overlay, utility classes, routing"
API="https://api.github.com/repos/$OWNER/$REPO/contents"

echo "🚀 FlowJob GitHub Push"
echo "======================"
echo ""

# Get current tree SHA
echo "📡 Fetching current tree..."
REF=$(curl -s -H "Authorization: token $TOKEN" "$API/git/refs/heads/$BRANCH")
COMMIT_SHA=$(echo "$REF" | python3 -c "import sys,json; print(json.load(sys.stdin)['object']['sha'])" 2>/dev/null || echo "")
if [ -z "$COMMIT_SHA" ]; then
  echo "❌ Failed to get commit SHA. Check token and repo."
  echo "$REF" | head -5
  exit 1
fi

TREE_DATA=$(curl -s -H "Authorization: token $TOKEN" "$API/git/commits/$COMMIT_SHA")
TREE_SHA=$(echo "$TREE_DATA" | python3 -c "import sys,json; print(json.load(sys.stdin)['tree']['sha'])" 2>/dev/null || echo "")
echo "  Tree: $TREE_SHA"

# Build tree entries
TMPFILE=$(mktemp)
echo "[" > "$TMPFILE"
FIRST=true

add_file() {
  local filepath="$1"
  local blob_sha
  
  # Create blob
  blob_sha=$(curl -s -X POST -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
    "$API/git/blobs" \
    -d "{\"encoding\":\"base64\",\"content\":\"$(base64 -w0 "$filepath")\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])" 2>/dev/null || echo "")
  
  if [ -z "$blob_sha" ]; then
    echo "  ⚠️  Failed: $filepath"
    return
  fi
  
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> "$TMPFILE"
  fi
  
  echo "  ✅ $filepath"
  printf '{"path":"%s","mode":"100644","type":"blob","sha":"%s"}' "$filepath" "$blob_sha" >> "$TMPFILE"
}

add_binary() {
  local filepath="$1"
  local blob_sha
  
  blob_sha=$(curl -s -X POST -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
    "$API/git/blobs" \
    -d "{\"encoding\":\"base64\",\"content\":\"$(base64 -w0 "$filepath")\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])" 2>/dev/null || echo "")
  
  if [ -z "$blob_sha" ]; then
    echo "  ⚠️  Failed: $filepath"
    return
  fi
  
  echo "," >> "$TMPFILE"
  echo "  ✅ $filepath"
  printf '{"path":"%s","mode":"100644","type":"blob","sha":"%s"}' "$filepath" "$blob_sha" >> "$TMPFILE"
}

echo ""
echo "📦 Creating blobs..."

# Core files
add_file "index.html"
add_file "style.css"
add_file "app.js"
add_file "sw.js"
add_file "manifest.json"
add_file "icons.js"
add_file "signature.js"

# .nojekyll (empty)
EMPTY_BLOB=$(curl -s -X POST -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
  "$API/git/blobs" -d '{"encoding":"base64","content":""}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])" 2>/dev/null || echo "")
echo "," >> "$TMPFILE"
printf '{"path":".nojekyll","mode":"100644","type":"blob","sha":"%s"}' "$EMPTY_BLOB" >> "$TMPFILE"
echo "  ✅ .nojekyll"

# Data
add_file "data/flat-rates.js"

# Assets (SVG)
add_file "assets/icon.svg"
add_file "assets/logo.svg"

# Assets (PNG binary)
add_binary "assets/icon-192.png"
add_binary "assets/icon-512.png"
add_binary "assets/icon-192-maskable.png"
add_binary "assets/icon-512-maskable.png"

# Pages
for f in pages/*.js; do
  add_file "$f"
done

# Modules
for f in modules/*.js; do
  add_file "$f"
done

echo "]" >> "$TMPFILE"

# Create tree
echo ""
echo "🌳 Creating tree..."
TREE_RESPONSE=$(curl -s -X POST -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
  "$API/git/trees" \
  -d "{\"base_tree\":\"$TREE_SHA\",\"tree\":$(cat "$TMPFILE")}")
NEW_TREE=$(echo "$TREE_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])" 2>/dev/null || echo "")
echo "  New tree: $NEW_TREE"

if [ -z "$NEW_TREE" ]; then
  echo "❌ Failed to create tree"
  echo "$TREE_RESPONSE" | head -5
  rm "$TMPFILE"
  exit 1
fi

# Create commit
echo "📝 Creating commit..."
COMMIT_RESPONSE=$(curl -s -X POST -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
  "$API/git/commits" \
  -d "{\"message\":\"$MSG\",\"tree\":\"$NEW_TREE\",\"parents\":[\"$COMMIT_SHA\"]}")
NEW_COMMIT=$(echo "$COMMIT_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])" 2>/dev/null || echo "")
echo "  Commit: $NEW_COMMIT"

if [ -z "$NEW_COMMIT" ]; then
  echo "❌ Failed to create commit"
  echo "$COMMIT_RESPONSE" | head -5
  rm "$TMPFILE"
  exit 1
fi

# Update ref
echo "🔗 Updating ref..."
curl -s -X PATCH -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
  "$API/git/refs/heads/$BRANCH" \
  -d "{\"sha\":\"$NEW_COMMIT\",\"force\":false}" > /dev/null

rm "$TMPFILE"

echo ""
echo "✅ Push complete!"
echo "🌐 https://$OWNER.github.io/$REPO/"
echo ""
echo "GitHub Pages will update in ~60 seconds."
