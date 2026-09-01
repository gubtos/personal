use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Gender {
    Masculino,
    Feminino,
    Outro,
}

impl Gender {
    pub fn as_str(&self) -> &'static str {
        match self {
            Gender::Masculino => "masculino",
            Gender::Feminino => "feminino",
            Gender::Outro => "outro",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "masculino" => Some(Gender::Masculino),
            "feminino" => Some(Gender::Feminino),
            "outro" => Some(Gender::Outro),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Member {
    pub id: String,
    pub name: String,
    pub phone: String,
    pub birthday: String,
    pub gender: Gender,
    #[serde(with = "crate::base64_serde::base64_opt")]
    pub face_photo: Option<Vec<u8>>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl Member {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        let gender_str: String = row.get("gender")?;
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            phone: row.get("phone")?,
            birthday: row.get("birthday")?,
            gender: Gender::from_str(&gender_str).unwrap_or(Gender::Outro),
            face_photo: row.get("face_photo")?,
            notes: row.get("notes")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemberInput {
    pub name: String,
    pub phone: String,
    pub birthday: String,
    pub gender: Gender,
    #[serde(with = "crate::base64_serde::base64_opt", default)]
    pub face_photo: Option<Vec<u8>>,
    #[serde(default)]
    pub notes: Option<String>,
}
