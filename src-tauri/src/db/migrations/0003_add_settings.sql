CREATE TABLE settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    evaluation_interval_days INTEGER NOT NULL DEFAULT 90
);

INSERT INTO settings (id, evaluation_interval_days) VALUES (1, 90);
