#!/bin/bash
set -e

echo "Starting production build..."
echo "This may take 1-2 minutes. Please do not interrupt."
echo ""

NODE_OPTIONS="--max-old-space-size=4096" pnpm vite build --mode production

echo ""
echo "✅ Build complete! Check the dist/ folder."
ls -lh dist/ | head -10
