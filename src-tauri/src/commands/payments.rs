use tauri::State;

use crate::db::DbState;
use crate::error::AppResult;
use crate::models::payment::Payment;
use crate::repo::payments as repo;

#[tauri::command]
pub fn payments_list(db: State<'_, DbState>, member_id: String) -> AppResult<Vec<Payment>> {
    let conn = db.0.lock().unwrap();
    repo::list(&conn, &member_id)
}

#[tauri::command]
pub fn payments_set_paid(db: State<'_, DbState>, id: String, paid: bool) -> AppResult<Payment> {
    let conn = db.0.lock().unwrap();
    repo::set_paid(&conn, &id, paid)
}
