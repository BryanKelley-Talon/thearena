#!/usr/bin/env bash
# The stop-map proof build: the real build with VITE_STOPMAP_PROOF=1, then the proof copies in
# proof/stopmap/_proof/ copied into dist/_proof/. A production build never reads or ships them.
set -euo pipefail
cd "$(dirname "$0")/../.."
VITE_STOPMAP_PROOF=1 npm run build
mkdir -p dist/_proof && cp -R proof/stopmap/_proof/. dist/_proof/
echo "stop-map proof build ready in dist/ (proof copies under dist/_proof/)"
