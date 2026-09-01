ALTER TABLE settings ADD COLUMN payment_due_day INTEGER NOT NULL DEFAULT 5;

CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members (id) ON DELETE CASCADE,
    reference_month TEXT NOT NULL, -- 'YYYY-MM'
    due_date TEXT NOT NULL,        -- 'YYYY-MM-DD'
    paid INTEGER NOT NULL DEFAULT 0,
    paid_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (member_id, reference_month)
);

CREATE INDEX idx_payments_member_reference ON payments (member_id, reference_month);
