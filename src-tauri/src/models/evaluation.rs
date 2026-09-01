use rusqlite::Row;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Evaluation {
    pub id: String,
    pub member_id: String,
    pub number: i64,
    pub date: String,

    pub weight_kg: f64,
    pub height_m: f64,

    pub neck_cm: Option<f64>,
    pub chest_cm: Option<f64>,
    pub waist_cm: Option<f64>,
    pub abdomen_cm: Option<f64>,
    pub hip_cm: Option<f64>,
    pub forearm_right_cm: Option<f64>,
    pub forearm_left_cm: Option<f64>,
    pub arm_right_cm: Option<f64>,
    pub arm_left_cm: Option<f64>,
    pub thigh_right_cm: Option<f64>,
    pub thigh_left_cm: Option<f64>,
    pub calf_right_cm: Option<f64>,
    pub calf_left_cm: Option<f64>,
    pub arm_flexed_right_cm: Option<f64>,
    pub arm_flexed_left_cm: Option<f64>,

    pub heart_rate_bpm: Option<f64>,
    pub heart_index: Option<f64>,
    pub bmi: Option<f64>,
    pub body_fat_pct: Option<f64>,
    pub muscle_rate_pct: Option<f64>,
    pub fat_free_mass_kg: Option<f64>,
    pub subcutaneous_fat_pct: Option<f64>,
    pub visceral_fat: Option<f64>,
    pub body_water_pct: Option<f64>,
    pub skeletal_muscle_pct: Option<f64>,
    pub muscle_mass_kg: Option<f64>,
    pub bone_mass_kg: Option<f64>,
    pub bmr_kcal: Option<f64>,
    pub metabolic_age: Option<f64>,

    #[serde(with = "crate::base64_serde::base64_opt")]
    pub photo_front: Option<Vec<u8>>,
    #[serde(with = "crate::base64_serde::base64_opt")]
    pub photo_side_right: Option<Vec<u8>>,
    #[serde(with = "crate::base64_serde::base64_opt")]
    pub photo_side_left: Option<Vec<u8>>,
    #[serde(with = "crate::base64_serde::base64_opt")]
    pub photo_back: Option<Vec<u8>>,

    pub notes: Option<String>,

    pub created_at: String,
    pub updated_at: String,
}

impl Evaluation {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            member_id: row.get("member_id")?,
            number: row.get("number")?,
            date: row.get("date")?,
            weight_kg: row.get("weight_kg")?,
            height_m: row.get("height_m")?,
            neck_cm: row.get("neck_cm")?,
            chest_cm: row.get("chest_cm")?,
            waist_cm: row.get("waist_cm")?,
            abdomen_cm: row.get("abdomen_cm")?,
            hip_cm: row.get("hip_cm")?,
            forearm_right_cm: row.get("forearm_right_cm")?,
            forearm_left_cm: row.get("forearm_left_cm")?,
            arm_right_cm: row.get("arm_right_cm")?,
            arm_left_cm: row.get("arm_left_cm")?,
            thigh_right_cm: row.get("thigh_right_cm")?,
            thigh_left_cm: row.get("thigh_left_cm")?,
            calf_right_cm: row.get("calf_right_cm")?,
            calf_left_cm: row.get("calf_left_cm")?,
            arm_flexed_right_cm: row.get("arm_flexed_right_cm")?,
            arm_flexed_left_cm: row.get("arm_flexed_left_cm")?,
            heart_rate_bpm: row.get("heart_rate_bpm")?,
            heart_index: row.get("heart_index")?,
            bmi: row.get("bmi")?,
            body_fat_pct: row.get("body_fat_pct")?,
            muscle_rate_pct: row.get("muscle_rate_pct")?,
            fat_free_mass_kg: row.get("fat_free_mass_kg")?,
            subcutaneous_fat_pct: row.get("subcutaneous_fat_pct")?,
            visceral_fat: row.get("visceral_fat")?,
            body_water_pct: row.get("body_water_pct")?,
            skeletal_muscle_pct: row.get("skeletal_muscle_pct")?,
            muscle_mass_kg: row.get("muscle_mass_kg")?,
            bone_mass_kg: row.get("bone_mass_kg")?,
            bmr_kcal: row.get("bmr_kcal")?,
            metabolic_age: row.get("metabolic_age")?,
            photo_front: row.get("photo_front")?,
            photo_side_right: row.get("photo_side_right")?,
            photo_side_left: row.get("photo_side_left")?,
            photo_back: row.get("photo_back")?,
            notes: row.get("notes")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvaluationInput {
    pub date: String,

    pub weight_kg: f64,
    pub height_m: f64,

    pub neck_cm: Option<f64>,
    pub chest_cm: Option<f64>,
    pub waist_cm: Option<f64>,
    pub abdomen_cm: Option<f64>,
    pub hip_cm: Option<f64>,
    pub forearm_right_cm: Option<f64>,
    pub forearm_left_cm: Option<f64>,
    pub arm_right_cm: Option<f64>,
    pub arm_left_cm: Option<f64>,
    pub thigh_right_cm: Option<f64>,
    pub thigh_left_cm: Option<f64>,
    pub calf_right_cm: Option<f64>,
    pub calf_left_cm: Option<f64>,
    pub arm_flexed_right_cm: Option<f64>,
    pub arm_flexed_left_cm: Option<f64>,

    pub heart_rate_bpm: Option<f64>,
    pub heart_index: Option<f64>,
    pub bmi: Option<f64>,
    pub body_fat_pct: Option<f64>,
    pub muscle_rate_pct: Option<f64>,
    pub fat_free_mass_kg: Option<f64>,
    pub subcutaneous_fat_pct: Option<f64>,
    pub visceral_fat: Option<f64>,
    pub body_water_pct: Option<f64>,
    pub skeletal_muscle_pct: Option<f64>,
    pub muscle_mass_kg: Option<f64>,
    pub bone_mass_kg: Option<f64>,
    pub bmr_kcal: Option<f64>,
    pub metabolic_age: Option<f64>,

    #[serde(with = "crate::base64_serde::base64_opt", default)]
    pub photo_front: Option<Vec<u8>>,
    #[serde(with = "crate::base64_serde::base64_opt", default)]
    pub photo_side_right: Option<Vec<u8>>,
    #[serde(with = "crate::base64_serde::base64_opt", default)]
    pub photo_side_left: Option<Vec<u8>>,
    #[serde(with = "crate::base64_serde::base64_opt", default)]
    pub photo_back: Option<Vec<u8>>,

    #[serde(default)]
    pub notes: Option<String>,
}
