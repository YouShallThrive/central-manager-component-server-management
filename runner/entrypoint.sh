#!/usr/bin/env bash
# Rocket-token-renewal runner — foreground loop, one renewal every 3 days.
#
# Fires immediately on start (proves the path once), then sleeps
# $RENEW_INTERVAL_SECONDS (default 259200 = 72h) and repeats. Single process,
# `restart: unless-stopped` in the compose => no overlapping runs (a restart
# re-runs the idempotent renewal once, which is safe) and resilient to
# restarts. supercronic was deliberately avoided (proved unreliable in the
# AI Harness runner port).
set -u

INTERVAL="${RENEW_INTERVAL_SECONDS:-259200}"
echo "renew_rocket_token runner up. interval=${INTERVAL}s targets=${SERVER_MANAGEMENT_URLS:-<unset>}"

while true; do
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) renew start"
  python3 /work/renew_rocket_token.py
  rc=$?
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) renew exit=${rc}"
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) sleeping ${INTERVAL}s"
  sleep "${INTERVAL}"
done