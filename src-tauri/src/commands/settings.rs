use tauri::State;

use crate::db::DbState;
use crate::error::AppResult;
use crate::models::settings::{Settings, SettingsInput};
use crate::repo::settings as repo;

#[tauri::command]
pub fn settings_get(db: State<'_, DbState>) -> AppResult<Settings> {
    let conn = db.0.lock().unwrap();
    repo::get(&conn)
}

#[tauri::command]
pub fn settings_update(db: State<'_, DbState>, input: SettingsInput) -> AppResult<Settings> {
    let conn = db.0.lock().unwrap();
    repo::update(&conn, &input)
}
