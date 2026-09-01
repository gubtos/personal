use tauri::State;

use crate::db::DbState;
use crate::error::AppResult;
use crate::models::member::{Member, MemberInput};
use crate::repo::members as repo;
use crate::repo::members::MemberWithNextEvaluation;

#[tauri::command]
pub fn members_list(db: State<'_, DbState>) -> AppResult<Vec<Member>> {
    let conn = db.0.lock().unwrap();
    repo::list(&conn)
}

#[tauri::command]
pub fn members_list_with_next_evaluation(
    db: State<'_, DbState>,
    active: bool,
) -> AppResult<Vec<MemberWithNextEvaluation>> {
    let conn = db.0.lock().unwrap();
    repo::list_with_next_evaluation(&conn, active)
}

#[tauri::command]
pub fn members_next_evaluation_date(db: State<'_, DbState>, id: String) -> AppResult<String> {
    let conn = db.0.lock().unwrap();
    repo::next_evaluation_date(&conn, &id)
}

#[tauri::command]
pub fn members_set_active(db: State<'_, DbState>, id: String, active: bool) -> AppResult<Member> {
    let conn = db.0.lock().unwrap();
    repo::set_active(&conn, &id, active)
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
