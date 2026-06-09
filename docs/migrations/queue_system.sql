-- ══════════════════════════════════════════
-- Queue System Tables — Supabase Migration
-- Completely isolated from existing tables
-- ══════════════════════════════════════════

-- Queue entries (active patients in the queue)
CREATE TABLE IF NOT EXISTS queue_entries (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  clinic      TEXT NOT NULL,
  queue_date  TEXT NOT NULL,         -- YYYY-MM-DD
  period      TEXT NOT NULL DEFAULT 'morning', -- 'morning' | 'evening'
  queue_order INTEGER NOT NULL,
  patient_name TEXT NOT NULL,
  phone       TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'new', -- 'new' | 'review'
  notes       TEXT DEFAULT '',
  expected_time TEXT DEFAULT '',     -- e.g. '1:00 PM'
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_queue_entries_user
  ON queue_entries(user_id, clinic, queue_date, period);

-- Queue archive (patients who completed their visit)
CREATE TABLE IF NOT EXISTS queue_archive (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  clinic      TEXT NOT NULL,
  queue_date  TEXT NOT NULL,
  period      TEXT NOT NULL DEFAULT 'morning',
  queue_order INTEGER NOT NULL,
  patient_name TEXT NOT NULL,
  phone       TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'new',
  notes       TEXT DEFAULT '',
  expected_time TEXT DEFAULT '',
  completed_at TEXT DEFAULT (datetime('now')),
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_queue_archive_user
  ON queue_archive(user_id, clinic, queue_date);

-- Queue settings (per-user configuration)
-- Stored as part of the main config, but documented here for reference:
-- config.queueSystem = {
--   bookingType: 'traditional' | 'queue',
--   recordRetention: {
--     enabled: true,
--     days: 3,            -- 3 | 7 | 14 | 30 | 0 (never)
--     deleteFromCloud: false
--   },
--   defaultInterval: 15   -- minutes between patients
-- }
