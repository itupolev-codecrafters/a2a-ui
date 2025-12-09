#!/bin/sh

set -e

USER=${API_USER}
FILE="/etc/nginx/.htpasswd"
PASS_FILE="/etc/nginx/current-password.txt"
SCHEDULE="${ROTATE_SCHEDULE:-0 */12 * * *}"

if [ ! -f "$FILE" ]; then
  echo "[entrypoint] No htpasswd found — generating initial"

  PASS=$(openssl rand -base64 12)
  echo "Initial password: $PASS"

  htpasswd -cb "$FILE" "$USER" "$PASS"
  echo "$USER:$PASS" > "$PASS_FILE"
fi

echo "$SCHEDULE /passwd-rotate.sh >> /var/log/rotate.log 2>&1" | crontab -
echo "[entrypoint] Cron configured: $SCHEDULE"

crond

echo "[entrypoint] Starting nginx..."
nginx -g "daemon off;"
