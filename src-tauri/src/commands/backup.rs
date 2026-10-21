use std::str::FromStr;

use tauri::{AppHandle, Manager, State};
use tauri_plugin_fs::{FilePath, FsExt, OpenOptions};

use crate::db::{self, DbState};
use crate::error::{AppError, AppResult};
use crate::repo::backup;

/// Opens a user-chosen destination. On Android the file dialog returns a `content://` URI, which
/// only the fs plugin can resolve (through the platform content resolver); on desktop it is a
/// regular filesystem path.
fn write_destination(app: &AppHandle, path: &str) -> AppResult<std::fs::File> {
    let dest = FilePath::from_str(path).map_err(|e| AppError::Validation(e.to_string()))?;
    let mut options = OpenOptions::new();
    options.write(true).truncate(true).create(true);
    Ok(app.fs().open(dest, options)?)
}

fn read_source(app: &AppHandle, path: &str) -> AppResult<std::fs::File> {
    let source = FilePath::from_str(path).map_err(|e| AppError::Validation(e.to_string()))?;
    let mut options = OpenOptions::new();
    options.read(true);
    Ok(app.fs().open(source, options)?)
}

#[tauri::command]
pub fn database_export(
    app: AppHandle,
    db: State<'_, DbState>,
    dest_path: String,
) -> AppResult<()> {
    let scratch_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| AppError::Validation(e.to_string()))?;
    std::fs::create_dir_all(&scratch_dir)?;

    let dest = write_destination(&app, &dest_path)?;

    let conn = db.0.lock().unwrap();
    backup::export_database(&conn, &scratch_dir, dest)
}

#[tauri::command]
pub fn database_import(
    app: AppHandle,
    db: State<'_, DbState>,
    source_path: String,
) -> AppResult<()> {
    let db_bytes = {
        let source = read_source(&app, &source_path)?;
        backup::extract_database(source)?
    };

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
