// Local demo only: a few fake visitors browse the site so the "right now" panel has
// something to show. Talks to the local worker (DEMO mode accepts localhost origins)
// and stops on its own once the worker is gone.
const URL = 'http://localhost:8787/e';
const pages = ['/', '/work/ideku-sidebar/', '/work/imslp-app/', '/work/cathay-life/', '/work/imslp-web/', '/work/myreward/'];
const refs = ['https://www.linkedin.com/', '', 'https://www.google.com/', 'https://www.cake.me/'];
const agents = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
let failures = 0;

async function send(ua, body) {
  try {
    await fetch(URL, { method: 'POST', headers: { Origin: 'http://localhost:4321', 'User-Agent': ua }, body: JSON.stringify(body) });
    failures = 0;
  } catch {
    if (++failures > 6) process.exit(0);
  }
}

const visitors = [];
function arrive() {
  const v = { ua: pick(agents), id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, start: Date.now(), pagesLeft: 1 + Math.floor(Math.random() * 3) };
  visitors.push(v);
  send(v.ua, { t: 'v', id: v.id, p: '/', r: pick(refs), u: '' });
}
async function tick() {
  if (visitors.length < 2 && Math.random() < 0.6) arrive();
  for (const v of [...visitors]) {
    const d = Date.now() - v.start;
    const r = Math.random();
    if (r < 0.15) {
      // leaves
      await send(v.ua, { t: 'l', id: v.id, d });
      visitors.splice(visitors.indexOf(v), 1);
    } else if (r < 0.35 && v.pagesLeft-- > 0) {
      // opens another page
      await send(v.ua, { t: 'l', id: v.id, d });
      v.id = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      v.start = Date.now();
      await send(v.ua, { t: 'v', id: v.id, p: pick(pages.slice(1)), r: 'https://terry-product-design.github.io/', u: '' });
    } else {
      await send(v.ua, { t: 'h', id: v.id, d });
    }
  }
}
arrive();
setInterval(tick, 20000);
