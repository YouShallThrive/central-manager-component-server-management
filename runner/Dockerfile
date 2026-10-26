# Central Manager Rocket-token-renewal runner (server-management stack).
#
# Runs the execution cron /rocket/renew-token (every 3 days): mints a fresh
# "YST Rocket" JWT from api.rocket.net, validates it live, and pushes it to
# Server Management via POST /api/add-account (provider "rocket", label
# "YST Rocket"). The fleet components pull this token via credentialSync
# (offset 0 of each PHP sweep). Rocket JWTs expire ~7 days, hence the 3-day
# cadence. Destroy-active-passive: this is a benign idempotent credential
# upsert, not a staging->prod import / backup / lockdown.
#
# Built via Coolify dockerfile deploy (dockerfile_location=/runner/Dockerfile)
# and wired into the server-management compose `runner` service, so it reaches
# the server-management http-actions at `backend:3211` on the shared network.
FROM python:3.12-slim

RUN pip install --no-cache-dir httpx

WORKDIR /work
COPY runner/renew_rocket_token.py /work/renew_rocket_token.py
COPY runner/entrypoint.sh /work/entrypoint.sh
RUN chmod +x /work/entrypoint.sh

ENV PYTHONPATH=/work \
    RENEW_INTERVAL_SECONDS=259200

ENTRYPOINT ["/work/entrypoint.sh"]