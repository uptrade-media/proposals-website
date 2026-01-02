#!/bin/bash
# Add deprecation notice to all signal-*.js functions

HEADER="// ============================================================================
// DEPRECATED: This function is now redundant - use Signal API directly
// ============================================================================
// Portal now calls Signal API (NestJS) instead of internal Signal implementation.
// This function remains for backward compatibility but should not be used in new code.
//
// Migration:
//   Old: /.netlify/functions/signal-xxx
//   New: Signal API endpoints (see SIGNAL-API-MIGRATION.md)
//
// Signal API Base URL: \$SIGNAL_API_URL (http://localhost:3001 or https://signal-api.uptrademedia.com)
// ============================================================================

"

for file in signal-*.js; do
  if [ -f "$file" ]; then
    echo "Deprecating $file..."
    # Create temp file with header + original content
    echo "$HEADER" > "$file.tmp"
    cat "$file" >> "$file.tmp"
    mv "$file.tmp" "$file"
  fi
done

echo "Done! Deprecated $(ls signal-*.js | wc -l) signal functions"
