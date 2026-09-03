# Expo Go dev tunnels — Variant B-free+ (no paid features)

Goal: every app gets its own Expo Go server on a fixed port, tunnelled over its own
`*-dev` host, with **zero per-app root work** and **no Cloudflare paid features**.

- Host scheme: `<slug>-dev.turbosuslik.online` (single-level → covered by the free
  `*.turbosuslik.online` edge cert; no ACM/Total TLS needed).
- Port band: **8090–8289** (200 apps). Shared dev-router on **8088**.
- Registry / single source of truth: `../dev-servers.json`.
- DNS: created **per app**, non-root, by `expo-qr.sh` (uses `~/.cloudflared/cert.pem`).
  No zone-wide wildcard DNS record.
- Ingress: **one** wildcard rule catches all `*-dev` hosts → router.

## One-time setup (operator, root)

1. Add the wildcard ingress rule. In `/etc/cloudflared/config.yml`, insert this
   block **immediately before** the final `- service: http_status:404` line
   (order matters — all explicit prod hostnames stay above it and keep winning):

   ```yaml
     - hostname: "*.turbosuslik.online"
       service: http://localhost:8088
   ```

   Then reload gracefully (does NOT drop existing tunnels / the backend):

   ```bash
   sudo systemctl reload cloudflared
   ```

2. Install the router as a service (runs as user `eugen`, no root at runtime):

   ```bash
   sudo cp /var/www/quiz-erudit/scripts/dev-router.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now dev-router
   ```

3. Install the reaper timer (auto-shutdown of stale/idle servers):

   ```bash
   sudo cp /var/www/quiz-erudit/scripts/dev-reap.service /etc/systemd/system/
   sudo cp /var/www/quiz-erudit/scripts/dev-reap.timer   /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now dev-reap.timer
   ```

That's the whole root part. Nothing here is per-app.

## Lifecycle policy (why ports don't pile up)

Each Metro server is heavy (~2 GB RAM), so servers are capped and auto-reclaimed.
Tunables live in `dev-servers.json`:

- `max_concurrent` (5) — `expo-qr.sh` refuses to start a NEW server once this many
  band servers are already up. Reuse an existing one or wait for a slot.
- `ttl_hours` (24) — a server older than this is killed (hard cap).
- `idle_minutes` (120) — a server with no traffic through dev-router for this long
  is killed. dev-router stamps `seen_dir/<slug>.seen` on every request; the reaper
  reads it. No stamp yet → process age is used as idle.

Reaper: `scripts/dev-reap.sh` (run by `dev-reap.timer` every 15 min). It only ever
touches ports inside the band — never 8083 (emulator), 8088 (router), or :80.
Preview without killing: `DRY_RUN=1 bash scripts/dev-reap.sh`.

## Daily use (anyone, no root)

```bash
scripts/expo-qr.sh <app-slug>      # e.g. sport-quiz
```

- New slug → next free port in the band is allocated + persisted, and the
  `<slug>-dev.turbosuslik.online` DNS record is created automatically (~1s).
- Slug already running → the existing server is REUSED (QR re-printed), never
  clobbered by another chat.

## Why this is free and safe

- `<slug>-dev.turbosuslik.online` is one label deep → the existing free
  `*.turbosuslik.online` certificate already covers it. No ACM.
- No zone-wide wildcard DNS: only names we explicitly create resolve, so random
  subdomains do NOT start pointing at the tunnel.
- The wildcard is only at the ingress layer; a non-`-dev` host that somehow
  reaches the router fails closed (router 404), it is never mis-served.
