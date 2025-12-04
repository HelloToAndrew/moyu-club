CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL UNIQUE,          -- e.g. 'tsmc.com'
  type TEXT NOT NULL,                   -- 'free' | 'school' | 'company' | 'unknown'
  source TEXT NOT NULL,                 -- 'manual' | 'heuristic'
  confidence INTEGER NOT NULL,          -- 1~100
  company_name TEXT,
  school_name TEXT,
  is_top_100 INTEGER DEFAULT 0,         -- 0/1
  label_color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);