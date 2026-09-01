use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

use crate::error::AppResult;

/// Shared application state wrapping the single SQLite connection.
/// rusqlite::Connection is not `Sync`, so access is serialized via a Mutex —
/// fine for this app's low-concurrency, single-user desktop usage.
pub struct DbState(pub Mutex<Connection>);

/// Ordered list of migrations. Each entry is applied exactly once, tracked in
/// the `schema_migrations` table. Append new migrations to the end of this
/// list — never edit or remove an already-shipped migration.
const MIGRATIONS: &[(&str, &str)] = &[
    ("0001_initial", include_str!("migrations/0001_initial.sql")),
    (
        "0002_add_member_notes",
        include_str!("migrations/0002_add_member_notes.sql"),
    ),
    (
        "0003_add_settings",
        include_str!("migrations/0003_add_settings.sql"),
    ),
];

pub fn open_connection(db_path: &Path) -> AppResult<Connection> {
    let conn = Connection::open(db_path)?;
    conn.pragma_update(None, "foreign_keys", true)?;
    run_migrations(&conn)?;
    Ok(conn)
}

pub(crate) fn run_migrations(conn: &Connection) -> AppResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            name TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
        (),
    )?;

    for (name, sql) in MIGRATIONS {
        let already_applied: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE name = ?1)",
            [name],
            |row| row.get(0),
        )?;

        if already_applied {
            continue;
        }

        conn.execute_batch(sql)?;
        conn.execute(
            "INSERT INTO schema_migrations (name) VALUES (?1)",
            [name],
        )?;
    }

    Ok(())
}
