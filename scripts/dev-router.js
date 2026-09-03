#!/usr/bin/env node
/**
 * Shared dev-tunnel router for Expo Go named tunnels (Variant B).
 *
 * One long-lived reverse proxy on 127.0.0.1:<router_port> (default 8088).
 * cloudflared sends every dev-tunnel host here (one wildcard ingress rule); we
 * read the Host header, extract the app slug via host_template, look up the app's
 * fixed Metro port in ../dev-servers.json (re-read live on mtime change), and
 * proxy HTTP + WebSocket/HMR to 127.0.0.1:<port>.
 *
 * Adding a new app requires NO change here and NO restart: the registry is the
 * single source of truth and is re-read on every request when it changes.
 */
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const REGISTRY = path.join(__dirname, '..', 'dev-servers.json');

let cache = { mtime: 0, data: null };
function registry() {
  try {
    const st = fs.statSync(REGISTRY);
    if (st.mtimeMs !== cache.mtime) {
      cache = { mtime: st.mtimeMs, data: JSON.parse(fs.readFileSync(REGISTRY, 'utf8')) };
    }
  } catch (_) { /* keep last good copy on transient read/parse error */ }
  return cache.data || { router_port: 8088, host_template: '{slug}.dev.turbosuslik.online', apps: {} };
}

// Build a slug-extracting regex from host_template, e.g.
//   "{slug}.dev.turbosuslik.online" -> /^([a-z0-9-]+)\.dev\.turbosuslik\.online$/
function slugRegex(template) {
  const esc = template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^' + esc.replace('\\{slug\\}', '([a-z0-9-]+)') + '$', 'i');
}

function portFor(hostHeader) {
  if (!hostHeader) return null;
  const cfg = registry();
  const host = hostHeader.split(':')[0].toLowerCase();
  const m = host.match(slugRegex(cfg.host_template || '{slug}.dev.turbosuslik.online'));
  if (!m) return null;
  const app = (cfg.apps || {})[m[1]];
  return app ? { slug: m[1], port: app.port } : { slug: m[1], port: null };
}

const ROUTER_PORT = registry().router_port || 8088;

// Stamp "last seen" per slug so the reaper can kill idle servers. Throttled to
// once / 5s per slug so HMR polling doesn't hammer the disk.
const SEEN_DIR = registry().seen_dir || '/tmp/dev-router';
try { fs.mkdirSync(SEEN_DIR, { recursive: true }); } catch (_) {}
const lastStamp = new Map();
function touch(slug) {
  if (!slug) return;
  const now = Date.now();
  if (now - (lastStamp.get(slug) || 0) < 5000) return;
  lastStamp.set(slug, now);
  try { fs.writeFileSync(path.join(SEEN_DIR, slug + '.seen'), String(Math.floor(now / 1000))); } catch (_) {}
}

function fail(res, code, msg) {
  res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(msg + '\n');
}

const server = http.createServer((req, res) => {
  const hit = portFor(req.headers.host);
  if (!hit) return fail(res, 404, `dev-router: host "${req.headers.host}" does not match host_template.`);
  if (!hit.port) return fail(res, 404, `dev-router: no app "${hit.slug}" in dev-servers.json. Run: scripts/expo-qr.sh ${hit.slug}`);
  touch(hit.slug);
  const proxy = http.request(
    { host: '127.0.0.1', port: hit.port, method: req.method, path: req.url, headers: req.headers },
    (pr) => { res.writeHead(pr.statusCode, pr.headers); pr.pipe(res); }
  );
  proxy.on('error', () =>
    fail(res, 502, `dev-router: "${hit.slug}" is not running on :${hit.port}. Start it: scripts/expo-qr.sh ${hit.slug}`)
  );
  req.pipe(proxy);
});

// WebSocket / Metro HMR upgrade passthrough.
server.on('upgrade', (req, socket, head) => {
  const hit = portFor(req.headers.host);
  if (!hit || !hit.port) { socket.destroy(); return; }
  touch(hit.slug);
  const up = net.connect(hit.port, '127.0.0.1', () => {
    up.write(
      `${req.method} ${req.url} HTTP/1.1\r\n` +
      Object.keys(req.headers).map((k) => `${k}: ${req.headers[k]}`).join('\r\n') +
      '\r\n\r\n'
    );
    if (head && head.length) up.write(head);
    socket.pipe(up);
    up.pipe(socket);
  });
  up.on('error', () => socket.destroy());
  socket.on('error', () => up.destroy());
});

server.listen(ROUTER_PORT, '127.0.0.1', () => {
  const cfg = registry();
  console.log(`[dev-router] 127.0.0.1:${ROUTER_PORT}  template=${cfg.host_template}  apps=${Object.keys(cfg.apps || {}).length}`);
});
