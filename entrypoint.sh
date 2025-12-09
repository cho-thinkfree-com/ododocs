#!/bin/sh

# Default values if not set
VITE_API_BASE_URL=${VITE_API_BASE_URL:-"http://localhost:9920"}
VITE_HOCUSPOCUS_URL=${VITE_HOCUSPOCUS_URL:-"ws://localhost:9930"}

echo "Generating env-config.js..."
cat <<EOF > /usr/share/nginx/html/env-config.js
window.__ENV__ = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL}",
  VITE_HOCUSPOCUS_URL: "${VITE_HOCUSPOCUS_URL}"
};
EOF

echo "Starting Nginx..."
exec "$@"
