/**
 * Focused acceptance measurement for the answer-grid height fit.
 *
 * For the two gameplay screens, pre-answer, at every required window size, it
 * measures — via CDP, in the real react-native-web render — the bounding rect of
 * the LAST answer button and asks the one question that matters: is its bottom
 * edge inside the viewport (buttons fully visible, no clip)? It also records the
 * coat/cell size and the number of option columns (2x2 must not collapse to 1).
 *
 * This is the real consumer's entrypoint: the browser laying the screen out at a
 * given window size is exactly what an iPad window drag produces.
 */
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Buffer } = require('buffer');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const PORT = 9223;
const BASE = 'http://localhost:8091';
const OUT = 'screenshots';
const CHROME = '/opt/google/chrome/chrome';
const LABEL = process.argv[2] || 'fit';

const SIZES = [
  [320, 568], [360, 610], [393, 852], [430, 932],
  [500, 680], [700, 560], [820, 1180], [1024, 700],
];
const SCREENS = [
  ['quiz', '/coat-of-arms/quiz?retry=0,1,2', 'coat-image'],
  ['continent-quiz', '/coat-of-arms/continent-quiz?continent=africa&retry=0,1,2', 'coat-option-0'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (url) => new Promise((resolve, reject) => {
  http.get(url, (res) => { let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }).on('error', reject);
});

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); ws.on('message', (raw) => { const m = JSON.parse(raw); if (!m.id || !this.pending.has(m.id)) return; const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); }); }
  send(method, params = {}) { const id = ++this.id; return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); setTimeout(() => { if (this.pending.delete(id)) reject(new Error(`timeout ${method}`)); }, 30000); }); }
}
const evalJs = async (cdp, expr) => (await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

// Measure, in-page: last answer button bottom vs viewport, coat/cell size, column count.
const MEASURE = (anchorId) => `(() => {
  const anchor = document.querySelector('[data-testid="${anchorId}"]');
  if (!anchor) return JSON.stringify({ error: 'no anchor' });
  // Option elements are the focusable divs AFTER the coat anchor in doc order.
  const opts = [...document.querySelectorAll('div[tabindex]')].filter((el) =>
    anchor.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
  const rects = opts.map((el) => el.getBoundingClientRect()).filter((r) => r.width > 20 && r.height > 20);
  if (!rects.length) return JSON.stringify({ error: 'no option rects', optCount: opts.length });
  const bottoms = rects.map((r) => r.bottom);
  const tops = rects.map((r) => r.top);
  const maxBottom = Math.max(...bottoms);
  // Distinct row count = distinct top values (rounded); columns = rects in the last row.
  const rowTops = [...new Set(tops.map((t) => Math.round(t)))].sort((a, b) => a - b);
  const lastRowTop = rowTops[rowTops.length - 1];
  const cols = rects.filter((r) => Math.abs(r.top - lastRowTop) < 4).length;
  const coat = anchor.getBoundingClientRect();
  return JSON.stringify({
    win: window.innerHeight,
    maxButtonBottom: Math.round(maxBottom),
    fullyVisible: maxBottom <= window.innerHeight + 0.5,
    overflowPx: Math.round(maxBottom - window.innerHeight),
    rows: rowTops.length,
    colsInLastRow: cols,
    optionCount: rects.length,
    coatSize: Math.round(coat.width),
  });
})()`;

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox', '--no-first-run', '--disable-dev-shm-usage', `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/coa-fit-${PORT}`, 'about:blank'], { stdio: 'ignore' });
  try {
    let target = null;
    for (let i = 0; i < 40 && !target; i++) { try { target = (await getJSON(`http://127.0.0.1:${PORT}/json/list`)).find((t) => t.type === 'page'); } catch {} if (!target) await sleep(500); }
    if (!target) throw new Error('no CDP target');
    const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
    await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
    const cdp = new CDP(ws);
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: BASE }); await sleep(3000);
    await evalJs(cdp, `localStorage.setItem('coat.help.seen.v1','1')`);

    for (const [w, h] of SIZES) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true });
      for (const [name, route, anchor] of SCREENS) {
        await cdp.send('Page.navigate', { url: BASE + route });
        await sleep(9000);
        const raw = await evalJs(cdp, MEASURE(anchor));
        const m = JSON.parse(raw);
        const tag = `${w}x${h} ${name}`;
        console.log(`RESULT ${tag.padEnd(26)} ${JSON.stringify(m)}`);
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(OUT, `coa-${LABEL}-${name}-${w}x${h}.png`), Buffer.from(data, 'base64'));
      }
    }
  } finally {
    chrome.kill('SIGKILL');
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
