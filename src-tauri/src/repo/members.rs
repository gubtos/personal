use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::member::{Member, MemberInput};

pub fn list(conn: &Connection) -> AppResult<Vec<Member>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, phone, birthday, gender, face_photo, created_at, updated_at
         FROM members ORDER BY name COLLATE NOCASE ASC",
    )?;
    let members = stmt
        .query_map([], Member::from_row)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(members)
}

pub fn get(conn: &Connection, id: &str) -> AppResult<Member> {
    conn.query_row(
        "SELECT id, name, phone, birthday, gender, face_photo, created_at, updated_at
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
        "INSERT INTO members (id, name, phone, birthday, gender, face_photo)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            id,
            input.name,
            input.phone,
            input.birthday,
            input.gender.as_str(),
            input.face_photo,
        ],
    )?;

    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &MemberInput) -> AppResult<Member> {
    let updated = conn.execute(
        "UPDATE members
         SET name = ?1, phone = ?2, birthday = ?3, gender = ?4, face_photo = ?5,
             updated_at = datetime('now')
         WHERE id = ?6",
        params![
            input.name,
            input.phone,
            input.birthday,
            input.gender.as_str(),
            input.face_photo,
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
