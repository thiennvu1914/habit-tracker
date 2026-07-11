#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node.js 22.13 or newer, then try again."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  npm install
fi

npm run dev
