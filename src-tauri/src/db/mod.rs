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
    (
        "0004_add_evaluation_notes",
        include_str!("migrations/0004_add_evaluation_notes.sql"),
    ),
    (
        "0005_add_member_active",
        include_str!("migrations/0005_add_member_active.sql"),
    ),
    (
        "0006_add_payments",
        include_str!("migrations/0006_add_payments.sql"),
    ),
    (
        "0007_member_payment_due_day",
        include_str!("migrations/0007_member_payment_due_day.sql"),
    ),
    (
        "0008_move_photos_to_table",
        include_str!("migrations/0008_move_photos_to_table.sql"),
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

        // Apply the migration and record it atomically, so a failure can't leave
        // the schema half-changed with the migration marked as not applied.
        let tx = conn.unchecked_transaction()?;
        tx.execute_batch(sql)?;
        tx.execute("INSERT INTO schema_migrations (name) VALUES (?1)", [name])?;
        tx.commit()?;
    }

    Ok(())
}
