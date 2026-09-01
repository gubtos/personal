use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub evaluation_interval_days: i64,
}

impl Settings {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            evaluation_interval_days: row.get("evaluation_interval_days")?,
        })
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsInput {
    pub evaluation_interval_days: i64,
}
