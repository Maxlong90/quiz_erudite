#!/usr/bin/env bash
#
# Reap stale / idle Expo dev servers in the band (Variant B-free+).
#
# Kills a dev server when EITHER:
#   - its process age  > ttl_hours     (hard cap; a port never lives forever)
#   - it has been idle > idle_minutes  (no request through dev-router since then)
#
# "Idle" uses the per-slug last-seen stamp written by dev-router.js. If a server
# has no stamp yet (never received a request), its process age is used as idle.
#
# Only touches ports inside [band.from, band.to] — never the emulator Metro
# (8083), the router (8088), or anything on :80. Run every ~15 min via cron or a
# systemd timer (see scripts/dev-reap.timer).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REG="$ROOT/dev-servers.json"

read -r FROM TO TTL_H IDLE_M SEENDIR < <(node -e '
const c=require(process.argv[1]);
console.log([c.band.from,c.band.to,c.ttl_hours||24,c.idle_minutes||120,c.seen_dir||"/tmp/dev-router"].join(" "));
' "$REG") || true

TTL=$((TTL_H * 3600))
IDLE=$((IDLE_M * 60))
now=$(date +%s)

# One lsof pass; keep only LISTEN sockets whose port is inside the band.
listeners="$(lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | awk 'NR>1{n=split($9,a,":");p=a[n]+0; if(p>=FROM && p<=TO) print $2, p}' FROM="$FROM" TO="$TO" | sort -u)"

[ -z "$listeners" ] && { echo "dev-reap: no band servers running"; exit 0; }

echo "$listeners" | while read -r pid port; do
  [ -z "$pid" ] && continue
  age="$(ps -o etimes= -p "$pid" 2>/dev/null | tr -d ' ')"
  [ -z "$age" ] && continue
  slug="$(node -e 'const c=require(process.argv[1]);const p=+process.argv[2];const e=Object.entries(c.apps).find(([s,a])=>a.port===p);process.stdout.write(e?e[0]:"")' "$REG" "$port")"

  seenf="$SEENDIR/${slug}.seen"
  if [ -n "$slug" ] && [ -f "$seenf" ]; then
    last="$(cat "$seenf" 2>/dev/null || echo 0)"; idle=$((now - last))
  else
    idle=$age
  fi

  reason=""
  if [ "$age" -gt "$TTL" ]; then
    reason="ttl>${TTL_H}h (age $((age/3600))h$(((age%3600)/60))m)"
  elif [ "$idle" -gt "$IDLE" ]; then
    reason="idle>${IDLE_M}m ($((idle/60))m)"
  fi

  if [ -n "$reason" ]; then
    if [ "${DRY_RUN:-0}" = "1" ]; then
      echo "dev-reap: [DRY] would kill :$port ${slug:-<unmapped>} pid=$pid — $reason"
      continue
    fi
    pgid="$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')"
    echo "dev-reap: killing :$port ${slug:-<unmapped>} pid=$pid — $reason"
    if [ -n "$pgid" ]; then kill -TERM "-$pgid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
    else kill -TERM "$pid" 2>/dev/null || true; fi
    rm -f "$seenf" 2>/dev/null || true
  else
    echo "dev-reap: keep :$port ${slug:-<unmapped>} (age $((age/3600))h, idle $((idle/60))m)"
  fi
done

exit 0
