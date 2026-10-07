#!/usr/bin/env bash
# The chase proof build: the real build with VITE_CHASE_PROOF=1, then the stand-in pack copied into
# dist/_proof/ and sealed. A production build (npm run build) never reads or ships it.
set -euo pipefail
cd "$(dirname "$0")/../.."
VITE_CHASE_PROOF=1 npx vite build
mkdir -p dist/_proof && cp -R proof/chase/_proof/. dist/_proof/
node scripts/seal-chase.mjs
echo "chase proof build ready in dist/ (stand-in pack under dist/_proof/)"
