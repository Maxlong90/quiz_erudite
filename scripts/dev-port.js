#!/usr/bin/env node
/**
 * Resolve (or allocate) the fixed Metro port for an app slug.
 * Prints the port to stdout. If the slug is new, allocates the next free port
 * in the band and persists it to dev-servers.json (this is how a brand-new app
 * gets its own Expo Go slot automatically).
 *
 * Usage: node scripts/dev-port.js <slug>
 */
const fs = require('fs');
const path = require('path');

const REG = path.join(__dirname, '..', 'dev-servers.json');
const slug = process.argv[2];
if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('usage: dev-port.js <slug>   (slug: lowercase letters, digits, hyphens)');
  process.exit(2);
}

const cfg = JSON.parse(fs.readFileSync(REG, 'utf8'));
cfg.apps = cfg.apps || {};

if (cfg.apps[slug]) { console.log(cfg.apps[slug].port); process.exit(0); }

const from = cfg.band.from;
const to = cfg.band.to;
const used = new Set(Object.values(cfg.apps).map((a) => a.port));
let port = null;
for (let p = from; p <= to; p++) { if (!used.has(p)) { port = p; break; } }
if (port == null) { console.error(`dev-port: band ${from}-${to} exhausted (${used.size} apps)`); process.exit(1); }

cfg.apps[slug] = { port };
fs.writeFileSync(REG, JSON.stringify(cfg, null, 2) + '\n');
console.log(port);
