use tauri::State;

use crate::db::DbState;
use crate::error::AppResult;
use crate::models::member::{Member, MemberInput};
use crate::repo::members as repo;

#[tauri::command]
pub fn members_list(db: State<'_, DbState>) -> AppResult<Vec<Member>> {
    let conn = db.0.lock().unwrap();
    repo::list(&conn)
}

#[tauri::command]
pub fn members_get(db: State<'_, DbState>, id: String) -> AppResult<Member> {
    let conn = db.0.lock().unwrap();
    repo::get(&conn, &id)
}

#[tauri::command]
pub fn members_create(db: State<'_, DbState>, input: MemberInput) -> AppResult<Member> {
    let conn = db.0.lock().unwrap();
    repo::create(&conn, &input)
}

#[tauri::command]
pub fn members_update(
    db: State<'_, DbState>,
    id: String,
    input: MemberInput,
) -> AppResult<Member> {
    let conn = db.0.lock().unwrap();
    repo::update(&conn, &id, &input)
}

#[tauri::command]
pub fn members_delete(db: State<'_, DbState>, id: String) -> AppResult<()> {
    let conn = db.0.lock().unwrap();
    repo::delete(&conn, &id)
}
