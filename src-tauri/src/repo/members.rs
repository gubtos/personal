use chrono::{Duration, Local, NaiveDate};
use rusqlite::{params, Connection};
use serde::Serialize;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::member::{Member, MemberInput};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemberWithNextEvaluation {
    #[serde(flatten)]
    pub member: Member,
    pub next_evaluation_date: String,
}

/// Next evaluation = last evaluation date + interval, or today if the member has no evaluations yet.
fn compute_next_evaluation_date(last_evaluation_date: Option<String>, interval_days: i64) -> String {
    let today = Local::now().date_naive();
    let date = last_evaluation_date
        .and_then(|d| NaiveDate::parse_from_str(&d, "%Y-%m-%d").ok())
        .map(|d| d + Duration::days(interval_days))
        .unwrap_or(today);
    date.format("%Y-%m-%d").to_string()
}

pub fn next_evaluation_date(conn: &Connection, member_id: &str) -> AppResult<String> {
    let interval_days = crate::repo::settings::get(conn)?.evaluation_interval_days;
    let last_evaluation_date: Option<String> = conn.query_row(
        "SELECT MAX(date) FROM evaluations WHERE member_id = ?1",
        params![member_id],
        |row| row.get(0),
    )?;
    Ok(compute_next_evaluation_date(last_evaluation_date, interval_days))
}

pub fn list_with_next_evaluation(conn: &Connection) -> AppResult<Vec<MemberWithNextEvaluation>> {
    let interval_days = crate::repo::settings::get(conn)?.evaluation_interval_days;

    let mut stmt = conn.prepare(
        "SELECT m.id, m.name, m.phone, m.birthday, m.gender, m.face_photo, m.notes,
                m.created_at, m.updated_at, MAX(e.date) AS last_evaluation_date
         FROM members m
         LEFT JOIN evaluations e ON e.member_id = m.id
         GROUP BY m.id
         ORDER BY m.name COLLATE NOCASE ASC",
    )?;

    let rows = stmt.query_map([], |row| {
        let member = Member::from_row(row)?;
        let last_evaluation_date: Option<String> = row.get("last_evaluation_date")?;
        Ok((member, last_evaluation_date))
    })?;

    rows.map(|row| {
        let (member, last_evaluation_date) = row?;
        Ok(MemberWithNextEvaluation {
            member,
            next_evaluation_date: compute_next_evaluation_date(last_evaluation_date, interval_days),
        })
    })
    .collect()
}

pub fn list(conn: &Connection) -> AppResult<Vec<Member>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, phone, birthday, gender, face_photo, notes, created_at, updated_at
         FROM members ORDER BY name COLLATE NOCASE ASC",
    )?;
    let members = stmt
        .query_map([], Member::from_row)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(members)
}

pub fn get(conn: &Connection, id: &str) -> AppResult<Member> {
    conn.query_row(
        "SELECT id, name, phone, birthday, gender, face_photo, notes, created_at, updated_at
         FROM members WHERE id = ?1",
        params![id],
        Member::from_row,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
        other => AppError::Database(other),
    })
}

pub fn create(conn: &Connection, input: &MemberInput) -> AppResult<Member> {
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO members (id, name, phone, birthday, gender, face_photo, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            input.name,
            input.phone,
            input.birthday,
            input.gender.as_str(),
            input.face_photo,
            input.notes,
        ],
    )?;

    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &MemberInput) -> AppResult<Member> {
    let updated = conn.execute(
        "UPDATE members
         SET name = ?1, phone = ?2, birthday = ?3, gender = ?4, face_photo = ?5, notes = ?6,
             updated_at = datetime('now')
         WHERE id = ?7",
        params![
            input.name,
            input.phone,
            input.birthday,
            input.gender.as_str(),
            input.face_photo,
            input.notes,
            id,
        ],
    )?;

    if updated == 0 {
        return Err(AppError::NotFound);
    }

    get(conn, id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let deleted = conn.execute("DELETE FROM members WHERE id = ?1", params![id])?;
    if deleted == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::member::Gender;

    fn test_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        crate::db::run_migrations(&conn).unwrap();
        conn
    }

    fn sample_input(name: &str) -> MemberInput {
        MemberInput {
            name: name.to_string(),
            phone: "+55 11 99999-0000".to_string(),
            birthday: "1990-01-01".to_string(),
            gender: Gender::Feminino,
            face_photo: None,
            notes: None,
        }
    }

    #[test]
    fn create_and_get_member() {
        let conn = test_conn();
        let created = create(&conn, &sample_input("Maria")).unwrap();
        assert_eq!(created.name, "Maria");
        assert_eq!(created.gender, Gender::Feminino);

        let fetched = get(&conn, &created.id).unwrap();
        assert_eq!(fetched.id, created.id);
    }

    #[test]
    fn list_orders_by_name() {
        let conn = test_conn();
        create(&conn, &sample_input("Bruno")).unwrap();
        create(&conn, &sample_input("Ana")).unwrap();

        let members = list(&conn).unwrap();
        assert_eq!(members.len(), 2);
        assert_eq!(members[0].name, "Ana");
        assert_eq!(members[1].name, "Bruno");
    }

    #[test]
    fn next_evaluation_date_defaults_to_today_when_no_evaluations() {
        let conn = test_conn();
        let member = create(&conn, &sample_input("Maria")).unwrap();

        let today = Local::now().date_naive().format("%Y-%m-%d").to_string();
        assert_eq!(next_evaluation_date(&conn, &member.id).unwrap(), today);
    }

    #[test]
    fn next_evaluation_date_adds_interval_to_last_evaluation() {
        let conn = test_conn();
        let member = create(&conn, &sample_input("Maria")).unwrap();
        conn.execute(
            "INSERT INTO evaluations (id, member_id, number, date, weight_kg, height_m)
             VALUES ('eval-1', ?1, 1, '2026-01-01', 70.0, 1.7)",
            params![member.id],
        )
        .unwrap();

        // default interval (90 days): 2026-01-01 + 90 days = 2026-04-01
        assert_eq!(
            next_evaluation_date(&conn, &member.id).unwrap(),
            "2026-04-01"
        );
    }

    #[test]
    fn list_with_next_evaluation_reflects_last_evaluation_per_member() {
        let conn = test_conn();
        let with_eval = create(&conn, &sample_input("Ana")).unwrap();
        let without_eval = create(&conn, &sample_input("Bruno")).unwrap();
        conn.execute(
            "INSERT INTO evaluations (id, member_id, number, date, weight_kg, height_m)
             VALUES ('eval-1', ?1, 1, '2026-01-01', 70.0, 1.7)",
            params![with_eval.id],
        )
        .unwrap();

        let today = Local::now().date_naive().format("%Y-%m-%d").to_string();
        let members = list_with_next_evaluation(&conn).unwrap();
        assert_eq!(members.len(), 2);
        let ana = members.iter().find(|m| m.member.id == with_eval.id).unwrap();
        let bruno = members
            .iter()
            .find(|m| m.member.id == without_eval.id)
            .unwrap();
        assert_eq!(ana.next_evaluation_date, "2026-04-01");
        assert_eq!(bruno.next_evaluation_date, today);
    }

    #[test]
    fn update_member() {
        let conn = test_conn();
        let created = create(&conn, &sample_input("Maria")).unwrap();

        let mut updated_input = sample_input("Maria Souza");
        updated_input.gender = Gender::Feminino;
        let updated = update(&conn, &created.id, &updated_input).unwrap();
        assert_eq!(updated.name, "Maria Souza");
    }

    #[test]
    fn update_missing_member_returns_not_found() {
        let conn = test_conn();
        let result = update(&conn, "missing-id", &sample_input("Ninguém"));
        assert!(matches!(result, Err(AppError::NotFound)));
    }

    #[test]
    fn delete_member() {
        let conn = test_conn();
        let created = create(&conn, &sample_input("Maria")).unwrap();
        delete(&conn, &created.id).unwrap();
        assert!(matches!(get(&conn, &created.id), Err(AppError::NotFound)));
    }

    #[test]
    fn delete_missing_member_returns_not_found() {
        let conn = test_conn();
        assert!(matches!(delete(&conn, "missing-id"), Err(AppError::NotFound)));
    }
}
