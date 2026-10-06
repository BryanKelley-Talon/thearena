#!/usr/bin/env bash
# The Atlas proof build: the real build with VITE_ATLAS_PROOF=1, then the placeholder files
# copied into dist/_proof/. A production build (npm run build) never reads or ships them.
set -euo pipefail
cd "$(dirname "$0")/../.."
VITE_ATLAS_PROOF=1 npm run build
mkdir -p dist/_proof && cp -R proof/atlas/_proof/. dist/_proof/
echo "proof build ready in dist/ (placeholders under dist/_proof/)"
