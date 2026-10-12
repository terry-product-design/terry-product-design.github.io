import dashboardHtml from './dashboard.html';

/**
 * Portfolio analytics — a Cloudflare Worker with a D1 database.
 *   POST /e          page-view beacons from the live site (see the tracker in src/layouts/Base.astro)
 *   GET  /           dashboard (password protected)
 *   GET  /api/stats  numbers for the dashboard
 *   GET  /api/live   who is viewing right now, polled by the dashboard
 *   GET/POST /api/ignore  networks excluded from tracking (Terry's own)
 *
 * Privacy: no cookies on the portfolio, no IP addresses stored. A visitor is a hash of
 * (secret, day, IP, user agent), so the same person is one visitor per day and can't be
 * traced back or followed across days.
 */

const MAX_DURATION = 30 * 60 * 1000; // a tab left open longer than this counts as 30 min
const ACTIVE_MS = 75 * 1000; // pings come every 30 s while visible; allow one to go missing
const SESSION_DAYS = 30;
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget/i;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/e') return await collect(request, env);
      if (url.pathname === '/login' && request.method === 'POST') return await login(request, env);
      if (url.pathname === '/logout') return logout();
      const authed = await isAuthed(request, env);
      if (url.pathname === '/api/stats') {
        return authed ? json(await stats(url, env)) : json({ error: 'unauthorized' }, 401);
      }
      if (url.pathname === '/api/live') {
        return authed ? json(await live(env)) : json({ error: 'unauthorized' }, 401);
      }
      if (url.pathname === '/api/ignore') {
        return authed ? json(await ignore(request, env, url)) : json({ error: 'unauthorized' }, 401);
      }
      if (url.pathname === '/') {
        if (!authed) return html(loginPage());
        return html(dashboardHtml.replace('"__DEMO__"', env.DEMO === '1' ? 'true' : 'false'));
      }
      return new Response('Not found', { status: 404 });
    } catch (err) {
      console.error(err);
      return new Response('Server error', { status: 500 });
    }
  },
};

/* ------------------------------------------------------------------ */
/* Collect                                                             */
/* ------------------------------------------------------------------ */
async function collect(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = origin === env.ALLOWED_ORIGIN || (env.DEMO === '1' && origin.startsWith('http://localhost'));
  const cors = allowed ? { 'Access-Control-Allow-Origin': origin } : {};
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }
  const done = new Response(null, { status: 204, headers: cors });
  const ua = request.headers.get('User-Agent') || '';
  if (request.method !== 'POST' || !allowed || BOT_UA.test(ua)) return done;

  const body = await request.text();
  if (body.length > 2048) return done;
  let e;
  try {
    e = JSON.parse(body);
  } catch {
    return done;
  }
  const id = typeof e.id === 'string' ? e.id.slice(0, 40) : '';
  if (!id) return done;

  if (e.t === 'v') {
    const path = typeof e.p === 'string' && e.p.startsWith('/') ? e.p.slice(0, 200) : null;
    if (!path) return done;
    const ip = request.headers.get('CF-Connecting-IP') || '';
    // Excluded networks are dropped here; their pings then match no row and change nothing.
    if (await isIgnored(ip, env)) return done;
    const now = Date.now();
    const day = localDay(now, env);
    const visitor = (await hmac(env.SECRET, `${day}|${ip}|${ua}`)).slice(0, 16);
    await env.DB.prepare(
      'INSERT OR IGNORE INTO views (id, ts, day, path, source, country, device, visitor, seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(id, now, day, path, sourceOf(e.r, e.u, env), request.cf?.country || 'XX', deviceOf(ua), visitor, now)
      .run();
  } else if (e.t === 'h' || e.t === 'l') {
    // 'h' = still here (sent every 30 s while visible), 'l' = hidden or closed.
    // Both carry the running visible time; keep the largest.
    const d = Math.max(0, Math.round(Number(e.d) || 0));
    const now = Date.now();
    await env.DB.prepare('UPDATE views SET seen = ?, duration = MAX(COALESCE(duration, 0), ?) WHERE id = ? AND ts > ?')
      .bind(e.t === 'h' ? now : 0, Math.min(d, MAX_DURATION), id, now - 12 * 3600 * 1000)
      .run();
  }
  return done;
}

/** Where the visit came from: utm_source, the referring site, 'Direct', or null for clicks within the site. */
function sourceOf(referrer, utm, env) {
  if (typeof utm === 'string' && utm.trim()) return utm.trim().toLowerCase().slice(0, 60);
  if (typeof referrer !== 'string' || !referrer) return 'Direct';
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    if (host === new URL(env.ALLOWED_ORIGIN).hostname) return null;
    return host.slice(0, 80) || 'Direct';
  } catch {
    return 'Direct';
  }
}

function deviceOf(ua) {
  if (/iPad|Tablet/i.test(ua)) return 'Tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */
async function stats(url, env) {
  const days = [7, 30, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 30;
  const today = localDay(Date.now(), env);
  const since = addDays(today, -(days - 1));
  const prevSince = addDays(since, -days);
  const dur = `AVG(CASE WHEN duration > 0 THEN MIN(duration, ${MAX_DURATION}) END)`;
  // A visitor is unique per day (the hash rotates daily), so ranges count visitor-days.
  const vis = `COUNT(DISTINCT visitor || day)`;

  const q = (sql, ...args) => env.DB.prepare(sql).bind(...args);
  const [daily, totals, prev, pages, sources, countries, devices] = await env.DB.batch([
    q(`SELECT day, COUNT(*) AS views, COUNT(DISTINCT visitor) AS visitors FROM views WHERE day >= ? GROUP BY day`, since),
    q(`SELECT COUNT(*) AS views, ${vis} AS visitors, ${dur} AS avgDuration FROM views WHERE day >= ?`, since),
    q(`SELECT COUNT(*) AS views, ${vis} AS visitors, ${dur} AS avgDuration FROM views WHERE day >= ? AND day < ?`, prevSince, since),
    q(`SELECT path, COUNT(*) AS views, ${vis} AS visitors, ${dur} AS avgDuration FROM views WHERE day >= ? GROUP BY path ORDER BY views DESC LIMIT 20`, since),
    q(`SELECT source, COUNT(*) AS visits FROM views WHERE day >= ? AND source IS NOT NULL GROUP BY source ORDER BY visits DESC LIMIT 12`, since),
    q(`SELECT country, ${vis} AS visitors FROM views WHERE day >= ? GROUP BY country ORDER BY visitors DESC LIMIT 12`, since),
    q(`SELECT device, ${vis} AS visitors FROM views WHERE day >= ? GROUP BY device ORDER BY visitors DESC`, since),
  ]);

  // Every day in the range, zeros included
  const byDay = new Map(daily.results.map((r) => [r.day, r]));
  const series = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(since, i);
    const r = byDay.get(day);
    series.push({ day, views: r?.views ?? 0, visitors: r?.visitors ?? 0 });
  }

  return {
    days,
    from: since,
    to: today,
    demo: env.DEMO === '1',
    totals: totals.results[0],
    previous: prev.results[0],
    daily: series,
    pages: pages.results,
    sources: sources.results,
    countries: countries.results,
    devices: devices.results,
  };
}

/** Who is viewing right now: page views whose tab pinged within ACTIVE_MS. */
async function live(env) {
  const now = Date.now();
  const q = (sql, ...args) => env.DB.prepare(sql).bind(...args);
  const active = [now - ACTIVE_MS, now - 12 * 3600 * 1000];
  const [viewers, count] = await env.DB.batch([
    q('SELECT path, ts, country, device, source FROM views WHERE seen >= ? AND ts > ? ORDER BY ts DESC LIMIT 50', ...active),
    q('SELECT COUNT(DISTINCT visitor) AS people FROM views WHERE seen >= ? AND ts > ?', ...active),
  ]);
  return { now, people: count.results[0].people, viewers: viewers.results };
}

/* ------------------------------------------------------------------ */
/* Excluded networks                                                   */
/* ------------------------------------------------------------------ */
const ipHash = (ip, env) => hmac(env.SECRET, `ip|${ip}`);

async function isIgnored(ip, env) {
  if (!ip) return false;
  const row = await env.DB.prepare('SELECT 1 FROM ignored WHERE hash = ?').bind(await ipHash(ip, env)).first();
  return !!row;
}

/** "114.36.207.67" -> "114.36.x.x"; IPv6 keeps the first two groups. */
function maskIp(ip) {
  if (!ip) return '未知';
  if (ip.includes(':')) return `${ip.split(':').slice(0, 2).join(':')}:…`;
  const p = ip.split('.');
  return `${p[0]}.${p[1]}.x.x`;
}

/** GET: the viewer's current network and the excluded list. POST {action: 'add'|'remove', id}. */
async function ignore(request, env, url) {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const hash = ip ? await ipHash(ip, env) : '';
  if (request.method === 'POST') {
    // Same-origin only (the session cookie is SameSite=Lax as well).
    if (request.headers.get('Origin') !== url.origin) return { error: 'forbidden' };
    const body = await request.json().catch(() => ({}));
    if (body.action === 'add' && hash) {
      await env.DB.prepare('INSERT OR REPLACE INTO ignored (hash, label, added) VALUES (?, ?, ?)').bind(hash, maskIp(ip), Date.now()).run();
    } else if (body.action === 'remove' && typeof body.id === 'string' && body.id.length >= 8) {
      await env.DB.prepare('DELETE FROM ignored WHERE substr(hash, 1, 12) = ?').bind(body.id.slice(0, 12)).run();
    }
  }
  const { results } = await env.DB.prepare('SELECT hash, label, added FROM ignored ORDER BY added DESC').all();
  return {
    current: { label: maskIp(ip), ignored: results.some((r) => r.hash === hash) },
    list: results.map((r) => ({ id: r.hash.slice(0, 12), label: r.label, added: r.added, current: r.hash === hash })),
  };
}

/* ------------------------------------------------------------------ */
/* Auth: one password, a signed cookie                                 */
/* ------------------------------------------------------------------ */
async function login(request, env) {
  const form = await request.formData();
  const given = String(form.get('password') || '');
  if (!env.DASHBOARD_PASSWORD || !(await sameText(given, env.DASHBOARD_PASSWORD, env.SECRET))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return html(loginPage(true), 401);
  }
  const exp = Date.now() + SESSION_DAYS * 86400 * 1000;
  const token = `${exp}.${await hmac(env.SECRET, `session|${exp}`)}`;
  return new Response(null, {
    status: 303,
    headers: {
      Location: '/',
      'Set-Cookie': `sess=${token}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}

function logout() {
  return new Response(null, {
    status: 303,
    headers: { Location: '/', 'Set-Cookie': 'sess=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax' },
  });
}

async function isAuthed(request, env) {
  if (env.DEV_NO_AUTH === '1') return true;
  const m = /(?:^|;\s*)sess=([^;]+)/.exec(request.headers.get('Cookie') || '');
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return sameText(sig, await hmac(env.SECRET, `session|${exp}`), env.SECRET);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
async function hmac(secret, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret || 'unset'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compare two strings without leaking where they differ (both are hashed first). */
async function sameText(a, b, secret) {
  const [ha, hb] = await Promise.all([hmac(secret, `cmp|${a}`), hmac(secret, `cmp|${b}`)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

function localDay(ms, env) {
  const offset = Number(env.TZ_OFFSET_MIN || 0) * 60 * 1000;
  return new Date(ms + offset).toISOString().slice(0, 10);
}

function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function loginPage(failed = false) {
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>作品集流量 · 登入</title><meta name="robots" content="noindex">
<style>
:root{color-scheme:dark;--bg:#08050f;--card:#13111b;--line:rgba(241,241,241,.12);--fg:#f1f1f1;--fg2:rgba(241,241,241,.64);--accent:#9b8cff;--accent2:#6f5bff}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,BlinkMacSystemFont,"PingFang TC","Noto Sans TC",system-ui,sans-serif}
form{width:min(100%,360px);display:grid;gap:14px;padding:32px;border-radius:20px;background:var(--card);border:1px solid var(--line)}
h1{margin:0;font-size:22px;font-weight:500;letter-spacing:-.02em}p{margin:0;color:var(--fg2);font-size:14px}
input{height:44px;padding:0 14px;border-radius:12px;border:1px solid var(--line);background:#0b0912;color:var(--fg);font:inherit}
input:focus{outline:2px solid var(--accent);outline-offset:1px}
button{height:44px;border:0;border-radius:999px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font:inherit;cursor:pointer}
.err{color:#ff9a9d}
</style></head><body>
<form method="post" action="/login">
<h1>作品集流量</h1><p>輸入密碼查看網站數據。</p>
${failed ? '<p class="err">密碼不正確，請再試一次。</p>' : ''}
<input type="password" name="password" placeholder="密碼" autocomplete="current-password" required autofocus aria-label="密碼">
<button type="submit">登入</button>
</form></body></html>`;
}
