use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Payment {
    pub id: String,
    pub member_id: String,
    pub reference_month: String, // "YYYY-MM"
    pub due_date: String,        // "YYYY-MM-DD"
    pub paid: bool,
    pub paid_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Payment {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            member_id: row.get("member_id")?,
            reference_month: row.get("reference_month")?,
            due_date: row.get("due_date")?,
            paid: row.get("paid")?,
            paid_at: row.get("paid_at")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}
