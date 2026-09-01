mod base64_serde;
mod commands;
mod db;
mod error;
mod models;
mod repo;

use tauri::Manager;

use commands::evaluations::{
    evaluations_create, evaluations_delete, evaluations_get, evaluations_list, evaluations_update,
};
use commands::members::{
    members_create, members_delete, members_get, members_list, members_list_with_next_evaluation,
    members_next_evaluation_date, members_update,
};
use commands::settings::{settings_get, settings_update};
use db::DbState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            let db_path = app_data_dir.join("avaliacao.sqlite3");
            let conn = db::open_connection(&db_path)?;
            app.manage(DbState(std::sync::Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            members_list,
            members_list_with_next_evaluation,
            members_next_evaluation_date,
            members_get,
            members_create,
            members_update,
            members_delete,
            evaluations_list,
            evaluations_get,
            evaluations_create,
            evaluations_update,
            evaluations_delete,
            settings_get,
            settings_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
