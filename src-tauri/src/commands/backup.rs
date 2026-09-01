use tauri::{AppHandle, Manager, State};

use crate::db::{self, DbState};
use crate::error::{AppError, AppResult};
use crate::repo::backup;

#[tauri::command]
pub fn database_export(db: State<'_, DbState>, dest_path: String) -> AppResult<()> {
    let conn = db.0.lock().unwrap();
    backup::export_database(&conn, &dest_path)
}

#[tauri::command]
pub fn database_import(
    app: AppHandle,
    db: State<'_, DbState>,
    source_path: String,
) -> AppResult<()> {
    let db_bytes = backup::extract_database(&source_path)?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Validation(e.to_string()))?;
    let db_path = app_data_dir.join("avaliacao.sqlite3");

    let mut conn_guard = db.0.lock().unwrap();
    // Swap in a throwaway connection first so the on-disk file isn't held open while we replace it.
    *conn_guard = rusqlite::Connection::open_in_memory()?;
    std::fs::write(&db_path, &db_bytes)?;
    *conn_guard = db::open_connection(&db_path)?;

    Ok(())
}
