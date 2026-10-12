// Prints SQL with 90 days of fake page views for previewing the dashboard locally.
// Only used with `npm run db:seed:local`; never runs against the real database.
const DAY = 86400000;
const OFFSET = 8 * 3600000; // Taipei
const pages = [
  ['/', 46], ['/work/ideku-sidebar/', 22], ['/work/imslp-app/', 11], ['/work/cathay-life/', 9],
  ['/work/imslp-web/', 7], ['/work/myreward/', 5],
];
const sources = [['Direct', 34], ['linkedin.com', 30], ['google.com', 14], ['cake.me', 8], ['104.com.tw', 6], ['github.com', 4], ['medium.com', 4]];
const countries = [['TW', 58], ['SG', 9], ['US', 9], ['JP', 6], ['HK', 6], ['MY', 4], ['GB', 3], ['DE', 2], ['AU', 3]];
const devices = [['Desktop', 62], ['Mobile', 34], ['Tablet', 4]];
const avgSec = { '/': 38, '/work/ideku-sidebar/': 165, '/work/imslp-app/': 110, '/work/cathay-life/': 95, '/work/imslp-web/': 80, '/work/myreward/': 70 };

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (list) => {
  const total = list.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of list) if ((r -= w) <= 0) return v;
  return list[0][0];
};
const q = (v) => (v === null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

const rows = [];
const now = Date.now();
for (let d = 89; d >= 0; d--) {
  const dayMs = now - d * DAY;
  const day = new Date(dayMs + OFFSET).toISOString().slice(0, 10);
  const dow = new Date(dayMs + OFFSET).getUTCDay();
  const trend = 1 + (89 - d) / 120; // slowly growing
  const spike = d === 20 || d === 21 ? 2.6 : 1; // e.g. a LinkedIn post
  const base = (dow === 0 || dow === 6 ? 6 : 12) * trend * spike;
  const visitors = Math.max(1, Math.round(base * (0.7 + rand() * 0.6)));
  for (let v = 0; v < visitors; v++) {
    const visitor = `demo${d}-${v}`;
    const src = spike > 1 && rand() < 0.6 ? 'linkedin.com' : pick(sources);
    const cc = pick(countries);
    const dev = pick(devices);
    const depth = 1 + Math.floor(rand() * rand() * 4);
    for (let k = 0; k < depth; k++) {
      const path = k === 0 && rand() < 0.55 ? '/' : pick(pages);
      const ts = dayMs - Math.floor(rand() * DAY * 0.9);
      const dur = rand() < 0.12 ? null : Math.round(avgSec[path] * 1000 * (0.25 + rand() * 1.6));
      rows.push([`demo-${d}-${v}-${k}`, ts, day, path, k === 0 ? src : null, cc, dev, visitor, dur]);
    }
  }
}
console.log('DELETE FROM views;');
for (let i = 0; i < rows.length; i += 200) {
  const chunk = rows.slice(i, i + 200).map((r) => `(${r.map(q).join(',')})`).join(',\n');
  console.log(`INSERT INTO views (id, ts, day, path, source, country, device, visitor, duration) VALUES\n${chunk};`);
}
