#!/usr/bin/env python3
"""Rocket.net token renewal — ported runner cron for the Central Manager suite.

Faithful reimplementation of Viktor's sandbox
``skills/integrations/yst_rocket/scripts/renew_rocket_token.py`` (not synced to
this host; reconstructd from ANATOMY.md §3 + central-manager/AGENTS.md):

  - mints a fresh Rocket JWT for the "YST Rocket" account
    (``rocket_auth.get_token(force_refresh=True)`` == POST /v1/login),
  - validates it live with one benign GET,
  - pushes it to Server Management via ``POST /api/add-account``
    (provider "rocket", label "YST Rocket") so the fleet apps keep pulling a
    non-expired token. Rocket JWTs expire ~7 days; this runs every 3 days.

Original behavior notes (verbatim intent):
  - Only the "YST Rocket" label is covered (Lucid Rocket is retired).
  - Pushes to BOTH dev and prod Server Management independently.
  - The sweep's credentialSync.pullFromServerManagement (offset 0) is what
    distributes the refreshed token to the fleet components; this job just
    refreshes the source-of-truth account.

Destructive-action-passive: writing a fresh service-account token via
`/api/add-account` is a benign credential upsert (idempotent, upsert by
provider+label). It is NOT a staging->prod import / backup / lockdown. In
shadow mode this job only targets STAGING (prod is still on the infra
placeholder); prod target is added at cutover.
"""

from __future__ import annotations

import json
import os
import sys

import httpx

BASE = os.environ.get("ROCKETNET_API_URL", "https://api.rocket.net").rstrip("/")
USERNAME = os.environ.get("ROCKETNET_USERNAME", "")
PASSWORD = os.environ.get("ROCKETNET_PASSWORD", "")
SSO_SECRET = os.environ.get("SSO_SHARED_SECRET", "")
# Comma-separated Server Management HTTP-action origins. Each gets a POST
# /api/add-account. Staging-only in shadow mode.
TARGETS = [t.strip().rstrip("/") for t in
           os.environ.get("SERVER_MANAGEMENT_URLS", "").split(",") if t.strip()]

PROVIDER = "rocket"
LABEL = "YST Rocket"
API_URL = "https://api.rocket.net"  # stored apiUrl on the service account

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)


def log(msg: str) -> None:
    print(msg, flush=True)


def mint_token() -> str:
    """POST /v1/login -> fresh JWT (equivalent of get_token(force_refresh=True))."""
    if not USERNAME or not PASSWORD:
        raise RuntimeError("ROCKETNET_USERNAME / ROCKETNET_PASSWORD not set")
    with httpx.Client(timeout=60.0) as c:
        r = c.post(
            f"{BASE}/v1/login",
            json={"username": USERNAME, "password": PASSWORD},
            headers={"Content-Type": "application/json",
                     "Accept": "application/json", "User-Agent": USER_AGENT},
        )
        r.raise_for_status()
        data = r.json()
    token = data.get("token") if isinstance(data, dict) else None
    if not token:
        raise RuntimeError(f"rocket login returned no token: {str(data)[:200]}")
    return token


def validate(token: str) -> None:
    """One benign GET to prove the fresh token works live (GET /v1/sites?limit=1)."""
    with httpx.Client(timeout=60.0) as c:
        r = c.get(
            f"{BASE}/v1/sites",
            params={"limit": 1},
            headers={"Accept": "application/json", "User-Agent": USER_AGENT,
                     "Authorization": f"Bearer {token}"},
        )
        r.raise_for_status()
        data = r.json()
    ok = isinstance(data, dict) and data.get("success") is True
    if not ok:
        raise RuntimeError(f"token validation failed: {str(data)[:200]}")


def push(target: str, token: str) -> dict:
    """POST {server-management}/api/add-account with the fresh token."""
    if not SSO_SECRET:
        raise RuntimeError("SSO_SHARED_SECRET not set (cannot auth /api/add-account)")
    with httpx.Client(timeout=60.0) as c:
        r = c.post(
            f"{target}/api/add-account",
            json={"provider": PROVIDER, "label": LABEL, "apiToken": token,
                  "apiUrl": API_URL, "username": USERNAME},
            headers={"Content-Type": "application/json",
                     "Authorization": f"Bearer {SSO_SECRET}"},
        )
    if r.status_code != 200:
        raise RuntimeError(f"add-account {target} HTTP {r.status_code}: {r.text[:200]}")
    return r.json()


def main() -> int:
    if not TARGETS:
        log("SERVER_MANAGEMENT_URLS empty — nothing to push to (shadow/no-target); "
            "token mint+pull still proceeds.")
    try:
        token = mint_token()
        log(f"minted fresh Rocket JWT (len={len(token)}) for '{LABEL}' ({USERNAME})")
        validate(token)
        log("token validated live (GET /v1/sites?limit=1 success)")
    except Exception as e:
        log(f"ERROR mint/validate: {e}")
        return 1

    rc = 0
    for target in TARGETS:
        try:
            res = push(target, token)
            log(f"pushed to {target} -> {json.dumps(res)}")
        except Exception as e:
            log(f"ERROR push {target}: {e}")
            rc = 1
    return rc


if __name__ == "__main__":
    sys.exit(main())