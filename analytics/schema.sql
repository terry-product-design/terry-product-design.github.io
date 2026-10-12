-- One row per page view. No IP addresses or cookies are stored:
-- `visitor` is a one-way hash that changes every day.
CREATE TABLE IF NOT EXISTS views (
  id       TEXT PRIMARY KEY,   -- random id from the browser, lets the leave event add the duration
  ts       INTEGER NOT NULL,   -- epoch ms
  day      TEXT NOT NULL,      -- YYYY-MM-DD, Taipei time
  path     TEXT NOT NULL,
  source   TEXT,               -- referrer host, 'Direct', or NULL for clicks within the site
  country  TEXT,
  device   TEXT,
  visitor  TEXT NOT NULL,
  duration INTEGER,            -- ms the page was visible; NULL until the visitor leaves
  seen     INTEGER             -- epoch ms of the last "still here" ping; 0 once the page is hidden or closed
);
CREATE INDEX IF NOT EXISTS views_day ON views(day);
CREATE INDEX IF NOT EXISTS views_ts ON views(ts);

-- Networks whose page views are not recorded (e.g. Terry's home and office).
-- Only a keyed hash of the IP is stored, plus a masked label like "114.36.x.x".
CREATE TABLE IF NOT EXISTS ignored (
  hash  TEXT PRIMARY KEY,
  label TEXT,
  added INTEGER NOT NULL
);
