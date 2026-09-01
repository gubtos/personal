use rusqlite::{params, Connection};

use crate::error::AppResult;
use crate::models::settings::{Settings, SettingsInput};

/// Single-row table (id = 1); the row is seeded by the `0003_add_settings` migration.
pub fn get(conn: &Connection) -> AppResult<Settings> {
    conn.query_row(
        "SELECT evaluation_interval_days, payment_due_day FROM settings WHERE id = 1",
        [],
        Settings::from_row,
    )
    .map_err(Into::into)
}

pub fn update(conn: &Connection, input: &SettingsInput) -> AppResult<Settings> {
    conn.execute(
        "UPDATE settings SET evaluation_interval_days = ?1, payment_due_day = ?2 WHERE id = 1",
        params![input.evaluation_interval_days, input.payment_due_day],
    )?;
    get(conn)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        crate::db::run_migrations(&conn).unwrap();
        conn
    }

    #[test]
    fn default_interval_is_90_days() {
        let conn = test_conn();
        let settings = get(&conn).unwrap();
        assert_eq!(settings.evaluation_interval_days, 90);
        assert_eq!(settings.payment_due_day, 5);
    }

    #[test]
    fn update_changes_interval() {
        let conn = test_conn();
        let updated = update(
            &conn,
            &SettingsInput {
                evaluation_interval_days: 60,
                payment_due_day: 10,
            },
        )
        .unwrap();
        assert_eq!(updated.evaluation_interval_days, 60);
        assert_eq!(updated.payment_due_day, 10);
        assert_eq!(get(&conn).unwrap().evaluation_interval_days, 60);
    }
}
