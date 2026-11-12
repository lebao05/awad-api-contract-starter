CREATE TABLE order_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  fingerprint     TEXT    NOT NULL,
  status          TEXT    NOT NULL CHECK (status IN ('pending', 'complete')),
  response_body   TEXT,
  location        TEXT,
  started_at      TEXT    NOT NULL,
  completed_at    TEXT
);

CREATE TABLE order_cursors (
  cursor      TEXT PRIMARY KEY,
  table_id    INTEGER,
  snapshot_id INTEGER NOT NULL,
  before_id   INTEGER NOT NULL,
  expires_at  TEXT    NOT NULL
);
