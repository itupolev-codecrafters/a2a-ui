#!/bin/sh

set -e

USER=${API_USER}
FILE="/etc/nginx/.htpasswd"
PASS_FILE="/etc/nginx/current-password.txt"

PASS=$(openssl rand -base64 12)

echo "[$(date)] New password: $PASS"

htpasswd -nb $USER $PASS > $FILE
echo "$USER:$PASS" > "$PASS_FILE"

nginx -s reload
