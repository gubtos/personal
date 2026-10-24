use rusqlite::{params, Connection};

use crate::error::AppResult;
use crate::models::settings::{Settings, SettingsInput};

/// Single-row table (id = 1); the row is seeded by the `0003_add_settings` migration.
pub fn get(conn: &Connection) -> AppResult<Settings> {
    conn.query_row(
        "SELECT evaluation_interval_days, footer_line1, footer_line2, history_evaluations, hide_phone FROM settings WHERE id = 1",
        [],
        Settings::from_row,
    )
    .map_err(Into::into)
}

pub fn update(conn: &Connection, input: &SettingsInput) -> AppResult<Settings> {
    conn.execute(
        "UPDATE settings SET evaluation_interval_days = ?1, footer_line1 = ?2, footer_line2 = ?3, history_evaluations = ?4, hide_phone = ?5 WHERE id = 1",
        params![
            input.evaluation_interval_days,
            input.footer_line1,
            input.footer_line2,
            input.history_evaluations,
            input.hide_phone
        ],
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
    }

    #[test]
    fn footer_lines_default_to_empty() {
        let conn = test_conn();
        let settings = get(&conn).unwrap();
        assert_eq!(settings.footer_line1, "");
        assert_eq!(settings.footer_line2, "");
    }

    #[test]
    fn history_evaluations_defaults_to_15() {
        let conn = test_conn();
        assert_eq!(get(&conn).unwrap().history_evaluations, 15);
    }

    #[test]
    fn update_changes_interval() {
        let conn = test_conn();
        let updated = update(&conn, &SettingsInput {
            evaluation_interval_days: 60,
            footer_line1: String::new(),
            footer_line2: String::new(),
            history_evaluations: 15,
            hide_phone: false,
        })
        .unwrap();
        assert_eq!(updated.evaluation_interval_days, 60);
        assert_eq!(get(&conn).unwrap().evaluation_interval_days, 60);
    }

    #[test]
    fn update_changes_history_evaluations() {
        let conn = test_conn();
        let updated = update(&conn, &SettingsInput {
            evaluation_interval_days: 90,
            footer_line1: String::new(),
            footer_line2: String::new(),
            history_evaluations: 30,
            hide_phone: false,
        })
        .unwrap();
        assert_eq!(updated.history_evaluations, 30);
        assert_eq!(get(&conn).unwrap().history_evaluations, 30);
    }

    #[test]
    fn update_changes_footer_lines() {
        let conn = test_conn();
        let updated = update(&conn, &SettingsInput {
            evaluation_interval_days: 90,
            footer_line1: "Personal Gustavo".to_string(),
            footer_line2: "Academia Fit".to_string(),
            history_evaluations: 15,
            hide_phone: false,
        })
        .unwrap();
        assert_eq!(updated.footer_line1, "Personal Gustavo");
        assert_eq!(updated.footer_line2, "Academia Fit");

        let stored = get(&conn).unwrap();
        assert_eq!(stored.footer_line1, "Personal Gustavo");
        assert_eq!(stored.footer_line2, "Academia Fit");
    }

    #[test]
    fn hide_phone_defaults_to_false() {
        let conn = test_conn();
        assert!(!get(&conn).unwrap().hide_phone);
    }

    #[test]
    fn update_changes_hide_phone() {
        let conn = test_conn();
        let updated = update(&conn, &SettingsInput {
            evaluation_interval_days: 90,
            footer_line1: String::new(),
            footer_line2: String::new(),
            history_evaluations: 15,
            hide_phone: true,
        })
        .unwrap();
        assert!(updated.hide_phone);
        assert!(get(&conn).unwrap().hide_phone);
    }
}
