#!/usr/bin/env bash
#
# Idempotent Expo Go launcher for named dev tunnels (Variant B).
#
#   Usage: scripts/expo-qr.sh <app-slug>
#
# - Resolves (or auto-allocates) the app's FIXED Metro port from dev-servers.json.
# - If a server is ALREADY UP on that port, REUSES it and re-prints the QR — it
#   never clobbers a server another chat started.
# - Otherwise starts `expo start` on that port behind the app's dev-tunnel host.
#
# Different apps -> different ports -> never collide. Same app from a second chat
# -> reuse the running server.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REG="$ROOT/dev-servers.json"

SLUG="${1:-}"
if [ -z "$SLUG" ]; then echo "usage: scripts/expo-qr.sh <app-slug>"; exit 2; fi

PORT="$(node "$ROOT/scripts/dev-port.js" "$SLUG")"
HOST="$(node -e "const c=require('$REG');process.stdout.write((c.host_template||'{slug}.dev.turbosuslik.online').replace('{slug}','$SLUG'))")"
ROUTER_PORT="$(node -e "const c=require('$REG');process.stdout.write(String(c.router_port||8088))")"
DNS_MODE="$(node -e "const c=require('$REG');process.stdout.write(c.dns_mode||'wildcard')")"

echo "app:    $SLUG"
echo "port:   $PORT   (Metro, fixed)"
echo "host:   https://$HOST   (via dev-router :$ROUTER_PORT)"

qr() { ( cd "$ROOT" && node -e "require('qrcode-terminal').generate('exp://$HOST',{small:true})" ) 2>/dev/null || true; }

# The shared dev-router must be up for the tunnel to reach Metro.
if ! lsof -iTCP:"$ROUTER_PORT" -sTCP:LISTEN -P -n >/dev/null 2>&1; then
  echo "WARN: dev-router not listening on :$ROUTER_PORT — the tunnel can't reach Metro yet."
  echo "      start it once:  suslik-bg \"node $ROOT/scripts/dev-router.js\""
fi

# Per-app DNS is only needed when NOT using a wildcard DNS record.
if [ "$DNS_MODE" = "per_app" ]; then
  if ! host "$HOST" >/dev/null 2>&1; then
    echo "dns:    creating CNAME for $HOST (cloudflared, no root)…"
    cloudflared tunnel route dns local-sites "$HOST" || echo "      (could not auto-create DNS — create $HOST manually)"
  fi
fi

if lsof -iTCP:"$PORT" -sTCP:LISTEN -P -n >/dev/null 2>&1; then
  echo "status: REUSING already-running server on :$PORT"
  qr
  echo "Open in Expo Go:  exp://$HOST"
  exit 0
fi

# Concurrency guard: refuse to start a NEW server past max_concurrent. Running
# servers = band ports currently LISTENing (this app is not up yet — checked above).
MAXC="$(node -e "const c=require('$REG');process.stdout.write(String(c.max_concurrent||5))")"
FROM="$(node -e "const c=require('$REG');process.stdout.write(String(c.band.from))")"
TO="$(node -e "const c=require('$REG');process.stdout.write(String(c.band.to))")"
RUNNING="$(lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk 'NR>1{n=split($9,a,":");p=a[n]+0; if(p>=F && p<=T) print p}' F="$FROM" T="$TO" | sort -u | wc -l)"
if [ "$RUNNING" -ge "$MAXC" ]; then
  echo "status: REFUSED — $RUNNING/$MAXC dev servers already running (max_concurrent=$MAXC)."
  echo "        Free a slot: stop an unused app, or wait for the reaper (ttl/idle) to reclaim one."
  echo "        Currently running band ports:"
  lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk 'NR>1{n=split($9,a,":");p=a[n]+0; if(p>=F && p<=T) print "          :"p}' F="$FROM" T="$TO" | sort -u
  exit 1
fi

echo "status: starting a new Expo server… ($((RUNNING+1))/$MAXC)"
# EXPO_OFFLINE=1 is CRITICAL: without it, when a real phone (Expo Go) connects the
# dev server tries to interactively log into the Expo account (no TTY here) and
# every request returns HTTP 500 — local curl still 200s, so it only bites on a
# real device. Both PROXY_URLs make the manifest/bundle URLs point at the tunnel.
# --clear is REQUIRED: EXPO_PUBLIC_APP_SLUG is inlined into the bundle at build
# time, and the Metro transform cache is shared across the whole project, so
# without a fresh cache a different app's cached bundle can be served (opening
# sport-quiz once showed coat-of-arms). One clean build per app start.
CMD="cd $ROOT && EXPO_OFFLINE=1 EXPO_PUBLIC_APP_SLUG=$SLUG EXPO_PACKAGER_PROXY_URL=https://$HOST EXPO_MANIFEST_PROXY_URL=https://$HOST npx expo start --port $PORT --clear"
if command -v suslik-bg >/dev/null 2>&1; then
  suslik-bg "$CMD"
else
  nohup bash -lc "$CMD" >"/tmp/expo-$SLUG.log" 2>&1 &
fi
echo "Started (give it ~10-15s to boot), then scan:"
qr
echo "Open in Expo Go:  exp://$HOST"
