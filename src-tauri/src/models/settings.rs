use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub evaluation_interval_days: i64,
    pub footer_line1: String,
    pub footer_line2: String,
    pub history_evaluations: i64,
    pub hide_phone: bool,
}

impl Settings {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            evaluation_interval_days: row.get("evaluation_interval_days")?,
            footer_line1: row.get("footer_line1")?,
            footer_line2: row.get("footer_line2")?,
            history_evaluations: row.get("history_evaluations")?,
            hide_phone: row.get("hide_phone")?,
        })
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsInput {
    pub evaluation_interval_days: i64,
    pub footer_line1: String,
    pub footer_line2: String,
    pub history_evaluations: i64,
    pub hide_phone: bool,
}
