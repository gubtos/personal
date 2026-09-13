use tauri::State;

use crate::db::DbState;
use crate::error::AppResult;
use crate::models::evaluation::{Evaluation, EvaluationInput, EvaluationPhotos};
use crate::repo::evaluations as repo;

#[tauri::command]
pub fn evaluations_list(db: State<'_, DbState>, member_id: String) -> AppResult<Vec<Evaluation>> {
    let conn = db.0.lock().unwrap();
    repo::list(&conn, &member_id)
}

#[tauri::command]
pub fn evaluations_list_photos(
    db: State<'_, DbState>,
    member_id: String,
) -> AppResult<Vec<EvaluationPhotos>> {
    let conn = db.0.lock().unwrap();
    repo::list_photos(&conn, &member_id)
}

#[tauri::command]
pub fn evaluations_get(db: State<'_, DbState>, id: String) -> AppResult<Evaluation> {
    let conn = db.0.lock().unwrap();
    repo::get(&conn, &id)
}

#[tauri::command]
pub fn evaluations_get_photos(
    db: State<'_, DbState>,
    id: String,
) -> AppResult<EvaluationPhotos> {
    let conn = db.0.lock().unwrap();
    repo::get_photos(&conn, &id)
}

#[tauri::command]
pub fn evaluations_create(
    db: State<'_, DbState>,
    member_id: String,
    input: EvaluationInput,
) -> AppResult<Evaluation> {
    let conn = db.0.lock().unwrap();
    repo::create(&conn, &member_id, &input)
}

#[tauri::command]
pub fn evaluations_update(
    db: State<'_, DbState>,
    id: String,
    input: EvaluationInput,
) -> AppResult<Evaluation> {
    let conn = db.0.lock().unwrap();
    repo::update(&conn, &id, &input)
}

#[tauri::command]
pub fn evaluations_delete(db: State<'_, DbState>, id: String) -> AppResult<()> {
    let conn = db.0.lock().unwrap();
    repo::delete(&conn, &id)
}
