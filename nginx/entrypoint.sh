#!/bin/sh
set -e

CERT_DIR="/etc/letsencrypt/live/telitesystems.online"
if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
    echo "SSL certificate not found. Generating a self-signed fallback certificate..."
    mkdir -p "$CERT_DIR"
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=telitesystems.online"
fi

exec nginx -g "daemon off;"
