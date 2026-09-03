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

# Auto-load the stored dev-tunnel token (gitignored .expo-dev-auth) so a bare
# `scripts/expo-qr.sh <slug>` serves a SIGNED-IN iPhone without re-entering the
# token. An EXPO_TOKEN already in the environment always wins over the file.
if [ -z "${EXPO_TOKEN:-}" ] && [ -f "$ROOT/.expo-dev-auth" ]; then
  set -a; . "$ROOT/.expo-dev-auth"; set +a
fi

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
  # An already-running server usually gets REUSED. But if we were asked to serve a
  # signed-in Expo Go (EXPO_TOKEN set) and the running server is ANONYMOUS (manifest
  # has no owner — e.g. a previous anonymous/offline start), reusing it would give
  # the account error on a real iPhone. In that case kill it and fall through to a
  # fresh online start. (Auth mode can't be changed on a live Metro.)
  MISMATCH=0
  if [ -n "${EXPO_TOKEN:-}" ]; then
    OW="$(curl -s -H 'expo-platform: ios' "http://127.0.0.1:$PORT" 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const o=JSON.parse(s);process.stdout.write(String((o.extra&&o.extra.expoClient&&o.extra.expoClient.owner)||''))}catch{process.stdout.write('')}})" 2>/dev/null)"
    [ -z "$OW" ] && MISMATCH=1
  fi
  if [ "$MISMATCH" = "0" ]; then
    echo "status: REUSING already-running server on :$PORT"
    qr
    echo "Open in Expo Go:  exp://$HOST"
    exit 0
  fi
  echo "status: running server on :$PORT is ANONYMOUS but EXPO_TOKEN was given — restarting it online."
  kill $(lsof -t -iTCP:"$PORT" -sTCP:LISTEN -P -n 2>/dev/null) 2>/dev/null || true
  sleep 3
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
# Auth mode. A signed-in iOS Expo Go (SDK 57+) REFUSES an anonymous remote-tunnel
# manifest ("You're signed in to Expo Go as X but not signed in to Expo CLI"). So:
#  - If EXPO_TOKEN is provided in the environment → launch Metro ONLINE (the token
#    authenticates the CLI non-interactively, no 500/no login prompt) and pin the
#    manifest owner to EXPO_DEV_OWNER (default dl3228) so it matches the phone's
#    account. app.config.js strips the base project's eas/updates link for dev
#    tunnels when EXPO_DEV_OWNER/EXPO_OFFLINE is set (else Expo Go demands the CLI
#    be signed into the eas project's OWNER account, which is a different account).
#  - Else → anonymous EXPO_OFFLINE=1 mode. This only opens on a LOGGED-OUT Expo Go
#    (and Android); a signed-in iPhone will hit the account error above.
# Both PROXY_URLs point manifest/bundle URLs at the tunnel. --clear is REQUIRED:
# EXPO_PUBLIC_APP_SLUG is inlined at build time and Metro's transform cache is
# shared project-wide, so start fresh per app (else another app's bundle leaks).
COMMON="EXPO_PUBLIC_APP_SLUG=$SLUG EXPO_PACKAGER_PROXY_URL=https://$HOST EXPO_MANIFEST_PROXY_URL=https://$HOST"
if [ -n "${EXPO_TOKEN:-}" ]; then
  OWNER="${EXPO_DEV_OWNER:-dl3228}"
  echo "auth:   ONLINE with EXPO_TOKEN, owner=$OWNER (for a signed-in Expo Go)"
  CMD="cd $ROOT && EXPO_TOKEN=$EXPO_TOKEN EXPO_DEV_OWNER=$OWNER $COMMON npx expo start --port $PORT --clear"
else
  echo "auth:   anonymous (EXPO_OFFLINE=1) — opens ONLY on a LOGGED-OUT Expo Go / Android"
  CMD="cd $ROOT && EXPO_OFFLINE=1 $COMMON npx expo start --port $PORT --clear"
fi
if command -v suslik-bg >/dev/null 2>&1; then
  suslik-bg "$CMD"
else
  nohup bash -lc "$CMD" >"/tmp/expo-$SLUG.log" 2>&1 &
fi
echo "Started (give it ~10-15s to boot), then scan:"
qr
echo "Open in Expo Go:  exp://$HOST"
