/**
 * Responsive-layout screenshot sweep for Coat of Arms.
 *
 * WHY THIS EXISTS
 * ---------------
 * Coat of Arms was rejected under App Review Guideline 4 for its layout on an
 * iPad Air 11-inch: an iPhone-only binary still runs on iPad, and on iPadOS 26 it
 * runs in a window the user can RESIZE. There is no macOS and no iPad Simulator
 * on this box, so the layout is verified through Expo web instead.
 *
 * That is a faithful proxy, not a rough one: react-native-web's
 * `useWindowDimensions` reads `window.innerWidth` and subscribes to the browser
 * `resize` event, so a CDP viewport change delivers the same `Dimensions.change`
 * → `setState` → re-render, with NO remount — structurally identical to dragging
 * an iPad split-view divider.
 *
 * Raw CDP rather than `chromium --screenshot=`, because the help sheet auto-opens
 * on the first question and the reveal state needs real taps.
 *
 * USAGE
 *   EXPO_PUBLIC_APP_SLUG=coat-of-arms EXPO_PUBLIC_SENTRY_DSN= \
 *     npx expo start --web --port 8091          # 8091 is this slug's reserved port
 *   node scripts/coa-responsive-shots.js [label] [mode]
 *
 *   label  filename prefix (default "after") — use "before"/"after" to diff a change
 *   mode   sweep | reveal | modals | resize | identity | all   (default "all")
 *
 * `identity` is the one that answers "did phones change?". It pins the question
 * order with the `retry` param (useRunProgress replays those indices verbatim —
 * no shuffle, no persistence), so two runs are byte-comparable. Without it the
 * gameplay screens draw a different country each run and every diff is noise.
 *
 * Output lands in screenshots/ (git-ignored).
 *
 * Reading the results: phone widths (320-440) must be byte-identical between a
 * "before" and "after" run. Allow for two sources of false diffs — a coat image
 * still streaming in, and the SHUFFLED question order, which differs whenever the
 * browser profile starts empty. Compare layout, not content.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Buffer } = require('buffer');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const PORT = Number(process.env.CDP_PORT || 9222);
const BASE = process.env.BASE_URL || 'http://localhost:8091';
const OUT = process.env.OUT_DIR || 'screenshots';
const LABEL = process.argv[2] || 'after';
const MODE = process.argv[3] || 'all';
const CHROME = process.env.CHROME_BIN || '/opt/google/chrome/chrome';

/** Phone widths must stay identical; the rest are the adaptive branch. */
const SIZES = [
  [320, 568], [393, 852], [430, 932],
  [540, 720], [700, 900], [820, 1180], [1024, 768],
];

const SCREENS = [
  ['home', '/coat-of-arms'],
  ['play', '/coat-of-arms/play'],
  ['continents', '/coat-of-arms/continents'],
  ['quiz', '/coat-of-arms/quiz'],
  ['continent-quiz', '/coat-of-arms/continent-quiz?continent=africa'],
  ['result', '/coat-of-arms/result?mode=all&correct=7&total=10&wrong=1,2,3'],
  ['settings', '/coat-of-arms/settings'],
];

// Gameplay screens fetch and cache the content snapshot before first paint, and
// under-waiting produces half-painted screenshots that look like layout bugs.
const WAIT_GAMEPLAY = 9000;
const WAIT_STATIC = 4000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getJSON = (url) =>
  new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let b = '';
        res.on('data', (d) => (b += d));
        res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
      })
      .on('error', reject);
  });

/** Minimal CDP client over one websocket. */
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (!msg.id || !this.pending.has(msg.id)) return;
      const { resolve, reject } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`timeout ${method}`));
      }, 30000);
    });
  }
}

const evalJs = async (cdp, expression) =>
  (await cdp.send('Runtime.evaluate', { expression, returnByValue: true })).result.value;

async function setViewport(cdp, width, height) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 2, mobile: true,
  });
}

async function clickBox(cdp, boxJson) {
  if (!boxJson) return false;
  const { x, y } = JSON.parse(boxJson);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  }
  return true;
}

const centreOf = (selectorExpr) => `(() => {
  const el = ${selectorExpr};
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return JSON.stringify({x: r.x + r.width/2, y: r.y + r.height/2});
})()`;

const clickTestId = (cdp, id) =>
  evalJs(cdp, centreOf(`document.querySelector('[data-testid="${id}"]')`)).then((b) => clickBox(cdp, b));
const hasNext = (cdp) => evalJs(cdp, `!!document.body.innerText.match(/\\bNext\\b/)`);

/**
 * Centre of the Nth ANSWER option.
 *
 * Selecting `div[tabindex]` by raw index does not work: the first four focusable
 * divs are the HUD tiles, so half the taps landed on Back and navigated out of
 * the quiz entirely. The answers are the focusable divs that come AFTER the coat
 * picture in document order — true on both gameplay screens, where the coat (or
 * the first coat option) is always rendered above the answer grid.
 */
const nthOption = (n) => `(() => {
  const anchor = document.querySelector('[data-testid="coat-image"]')
              || document.querySelector('[data-testid^="coat-option-"]');
  if (!anchor) return null;
  const opts = [...document.querySelectorAll('div[tabindex]')].filter((el) =>
    anchor.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
    || anchor.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_CONTAINS);
  const el = opts[${n}];
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  return JSON.stringify({x: r.x + r.width/2, y: r.y + r.height/2});
})()`;

/**
 * Tap answers until the reveal panel appears. A wrong pick flashes red and
 * auto-advances to a NEW question whose correct index is different, so this is a
 * random walk rather than an enumeration — hence the generous attempt budget.
 */
async function reachReveal(cdp) {
  for (let attempt = 0; attempt < 24; attempt++) {
    if (await hasNext(cdp)) return true;
    await clickBox(cdp, await evalJs(cdp, nthOption(attempt % 4)));
    await sleep(1500);
  }
  return hasNext(cdp);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
    '--no-first-run', '--disable-dev-shm-usage',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=/tmp/coa-shots-${PORT}`,
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    let target = null;
    for (let i = 0; i < 40 && !target; i++) {
      try {
        target = (await getJSON(`http://127.0.0.1:${PORT}/json/list`)).find((t) => t.type === 'page');
      } catch { /* chrome still starting */ }
      if (!target) await sleep(500);
    }
    if (!target) throw new Error('no CDP page target — is chrome installed at ' + CHROME + '?');

    const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false });
    await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
    const cdp = new CDP(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // Suppress the auto-opening help sheet so each shot shows the SCREEN.
    await cdp.send('Page.navigate', { url: BASE });
    await sleep(3000);
    await evalJs(cdp, `localStorage.setItem('coat.help.seen.v1','1')`);

    const shot = async (name) => {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'));
      console.log(`${name}.png`);
    };
    const want = (m) => MODE === 'all' || MODE === m;

    if (want('sweep')) {
      for (const [w, h] of SIZES) {
        await setViewport(cdp, w, h);
        for (const [name, route] of SCREENS) {
          await cdp.send('Page.navigate', { url: BASE + route });
          await sleep(name.includes('quiz') ? WAIT_GAMEPLAY : WAIT_STATIC);
          await shot(`coa-${LABEL}-${name}-${w}x${h}`);
        }
      }
    }

    if (want('identity')) {
      // Phone-identity check. The question order is PINNED via `retry` so the two
      // gameplay screens draw the same country every run and the PNGs are
      // byte-comparable between a "before" and an "after" capture.
      for (const [w, h] of [[320, 568], [393, 852], [430, 932]]) {
        await setViewport(cdp, w, h);
        for (const [name, route] of [
          ['quiz', '/coat-of-arms/quiz?retry=0,1,2'],
          ['continent-quiz', '/coat-of-arms/continent-quiz?continent=africa&retry=0,1,2'],
        ]) {
          await cdp.send('Page.navigate', { url: BASE + route });
          await sleep(WAIT_GAMEPLAY);
          await shot(`coa-${LABEL}-identity-${name}-${w}x${h}`);
        }
      }
    }

    if (want('reveal')) {
      // The reveal exercises the flex chain a content column could break:
      // page → reveal → historyBox → internal ScrollView. If the column wrapper
      // lost its unconditional flex:1, "Next" would fall off here and nowhere else.
      for (const [w, h] of [[393, 852], [820, 1180], [1024, 768]]) {
        await setViewport(cdp, w, h);
        for (const [name, route] of [
          ['quiz', '/coat-of-arms/quiz'],
          ['continent-quiz', '/coat-of-arms/continent-quiz?continent=africa'],
        ]) {
          await cdp.send('Page.navigate', { url: BASE + route });
          await sleep(WAIT_GAMEPLAY);
          const ok = await reachReveal(cdp);
          await sleep(1200);
          await shot(`coa-${LABEL}-reveal-${name}-${w}x${h}${ok ? '' : '-NOREVEAL'}`);
        }
      }
    }

    if (want('modals')) {
      // The report sheet is a Modal portal, so it sits OUTSIDE the content column
      // and needs its own width cap — one tap from gameplay on a wide window.
      for (const [w, h] of [[393, 852], [1024, 768]]) {
        await setViewport(cdp, w, h);
        for (const [name, testId] of [['report', 'quiz-report-button'], ['help', 'quiz-help-button']]) {
          await cdp.send('Page.navigate', { url: BASE + '/coat-of-arms/quiz' });
          await sleep(WAIT_GAMEPLAY);
          await clickTestId(cdp, testId);
          await sleep(1500);
          await shot(`coa-${LABEL}-modal-${name}-${w}x${h}`);
        }
      }
    }

    if (want('resize')) {
      // The direct test of the original bug: sizes captured at launch must not
      // survive a resize. ONE page session, no reload — a real window.resize.
      const coatWidth = () => evalJs(cdp, `(() => {
        const el = document.querySelector('[data-testid="coat-image"]');
        return JSON.stringify({coat: el ? getComputedStyle(el).width : null, win: window.innerWidth});
      })()`);

      await setViewport(cdp, 393, 852);
      await cdp.send('Page.navigate', { url: BASE + '/coat-of-arms/quiz' });
      await sleep(WAIT_GAMEPLAY);
      await shot(`coa-${LABEL}-resize-1-at-393`);
      const before = await coatWidth();

      await setViewport(cdp, 1024, 1180);
      await sleep(2500);
      await shot(`coa-${LABEL}-resize-2-live-1024`);
      const grown = await coatWidth();

      await setViewport(cdp, 320, 568);
      await sleep(2500);
      await shot(`coa-${LABEL}-resize-3-live-320`);
      const shrunk = await coatWidth();

      console.log('LIVE-RESIZE ' + JSON.stringify({ before, grown, shrunk }));

      // And a resize taken MID-REVEAL, the reviewer-drags-during-play case.
      await setViewport(cdp, 393, 852);
      await cdp.send('Page.navigate', { url: BASE + '/coat-of-arms/quiz' });
      await sleep(WAIT_GAMEPLAY);
      await reachReveal(cdp);
      await shot(`coa-${LABEL}-midreveal-1-at-393`);
      await setViewport(cdp, 1024, 1180);
      await sleep(2500);
      await shot(`coa-${LABEL}-midreveal-2-live-1024`);
      console.log('midreveal kept the Next button: ' + (await hasNext(cdp)));
    }

    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

main().then(() => console.log('done')).catch((e) => { console.error(e); process.exit(1); });
