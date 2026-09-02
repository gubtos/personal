use chrono::{Datelike, Duration, Local, NaiveDate};
use rusqlite::{params, Connection};
use serde::Serialize;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::member::{Member, MemberInput};

/// A member enriched with the data needed by the main list view modes.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemberListItem {
    #[serde(flatten)]
    pub member: Member,
    pub next_evaluation_date: String,
    /// Due date ("YYYY-MM-DD") of the current month, computed from the member's due day.
    pub current_due_date: Option<String>,
    /// Paid status of the current month's payment row, if one exists.
    pub current_paid: Option<bool>,
}

/// Computes the member's next birthday as a day-of-year (1-366) so it can be
/// sorted; Feb 29 birthdays are treated as Mar 1 in non-leap years.
fn birthday_day_of_year(birthday: &str, year: i32) -> Option<u32> {
    let date = NaiveDate::parse_from_str(birthday, "%Y-%m-%d").ok()?;
    let month = date.month();
    let day = date.day();
    let candidate = NaiveDate::from_ymd_opt(year, month, day)
        .or_else(|| NaiveDate::from_ymd_opt(year, 3, 1));
    candidate.map(|d| d.ordinal())
}

/// Returns the current-month payment's paid flag for a member (None if no row exists yet).
fn current_paid_for(conn: &Connection, member_id: &str, reference_month: &str) -> AppResult<Option<bool>> {
    let result = conn.query_row(
        "SELECT paid FROM payments WHERE member_id = ?1 AND reference_month = ?2",
        params![member_id, reference_month],
        |row| row.get::<_, i64>(0),
    );
    match result {
        Ok(paid) => Ok(Some(paid != 0)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(other) => Err(other.into()),
    }
}

/// Lists members sorted per the requested main-menu mode, filtered by active status.
///
/// Modes:
/// - "nome": name ascending.
/// - "vencimento": unpaid first, then current-month due date ascending.
/// - "avaliacao": next evaluation date ascending (soonest first).
/// - "aniversario": next upcoming birthday ascending (soonest first).
pub fn list_sorted(conn: &Connection, mode: &str, active: bool) -> AppResult<Vec<MemberListItem>> {
    let interval_days = crate::repo::settings::get(conn)?.evaluation_interval_days;
    let today = Local::now().date_naive();
    let reference_month = format!("{}-{:02}", today.year(), today.month());

    let mut stmt = conn.prepare(
        "SELECT m.id, m.name, m.phone, m.birthday, m.gender, m.face_photo, m.notes,
                m.payment_due_day, m.active,
                m.created_at, m.updated_at, MAX(e.date) AS last_evaluation_date
         FROM members m
         LEFT JOIN evaluations e ON e.member_id = m.id
         WHERE m.active = ?1
         GROUP BY m.id",
    )?;

    let rows = stmt.query_map(params![active as i64], |row| {
        let member = Member::from_row(row)?;
        let last_evaluation_date: Option<String> = row.get("last_evaluation_date")?;
        Ok((member, last_evaluation_date))
    })?;

    let mut items: Vec<MemberListItem> = rows
        .map(|row| {
            let (member, last_evaluation_date) = row?;
            let due_day = member.payment_due_day.unwrap_or(5);
            let current_due_date = Some(crate::repo::payments::due_date_for(
                today.year(),
                today.month(),
                due_day,
            ));
            let current_paid = current_paid_for(conn, &member.id, &reference_month)?;
            Ok(MemberListItem {
                next_evaluation_date: compute_next_evaluation_date(
                    last_evaluation_date,
                    interval_days,
                ),
                member,
                current_due_date,
                current_paid,
            })
        })
        .collect::<AppResult<Vec<_>>>()?;

    match mode {
        "nome" => items.sort_by(|a, b| a.member.name.cmp(&b.member.name)),
        "vencimento" => items.sort_by(|a, b| {
            let a_paid = a.current_paid.unwrap_or(false) as u8;
            let b_paid = b.current_paid.unwrap_or(false) as u8;
            a_paid
                .cmp(&b_paid)
                .then_with(|| a.current_due_date.cmp(&b.current_due_date))
                .then_with(|| a.member.name.cmp(&b.member.name))
        }),
        "avaliacao" => items.sort_by(|a, b| {
            a.next_evaluation_date
                .cmp(&b.next_evaluation_date)
                .then_with(|| a.member.name.cmp(&b.member.name))
        }),
        "aniversario" => {
            let year = today.year();
            items.sort_by(|a, b| {
                let a_ord = birthday_day_of_year(&a.member.birthday, year);
                let b_ord = birthday_day_of_year(&b.member.birthday, year);
                a_ord
                    .cmp(&b_ord)
                    .then_with(|| a.member.name.cmp(&b.member.name))
            });
        }
        _ => return Err(AppError::Validation(format!("modo inválido: {mode}"))),
    }

    Ok(items)
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

pub fn list(conn: &Connection) -> AppResult<Vec<Member>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, phone, birthday, gender, face_photo, notes, payment_due_day, active,
                created_at, updated_at
         FROM members ORDER BY name COLLATE NOCASE ASC",
    )?;
    let members = stmt
        .query_map([], Member::from_row)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(members)
}

pub fn get(conn: &Connection, id: &str) -> AppResult<Member> {
    conn.query_row(
        "SELECT id, name, phone, birthday, gender, face_photo, notes, payment_due_day, active,
                created_at, updated_at
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
        "INSERT INTO members (id, name, phone, birthday, gender, face_photo, notes, payment_due_day)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            input.name,
            input.phone,
            input.birthday,
            input.gender.as_str(),
            input.face_photo,
            input.notes,
            input.payment_due_day,
        ],
    )?;

    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &MemberInput) -> AppResult<Member> {
    let updated = conn.execute(
        "UPDATE members
         SET name = ?1, phone = ?2, birthday = ?3, gender = ?4, face_photo = ?5, notes = ?6,
             payment_due_day = ?7, updated_at = datetime('now')
         WHERE id = ?8",
        params![
            input.name,
            input.phone,
            input.birthday,
            input.gender.as_str(),
            input.face_photo,
            input.notes,
            input.payment_due_day,
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

pub fn set_active(conn: &Connection, id: &str, active: bool) -> AppResult<Member> {
    let updated = conn.execute(
        "UPDATE members SET active = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![active, id],
    )?;
    if updated == 0 {
        return Err(AppError::NotFound);
    }
    get(conn, id)
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
            payment_due_day: 5,
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
    fn payment_due_day_is_persisted_and_updated() {
        let conn = test_conn();
        let mut input = sample_input("Maria");
        input.payment_due_day = 15;
        let created = create(&conn, &input).unwrap();
        assert_eq!(created.payment_due_day, Some(15));

        input.payment_due_day = 20;
        let updated = update(&conn, &created.id, &input).unwrap();
        assert_eq!(updated.payment_due_day, Some(20));
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
    fn new_members_are_active_by_default() {
        let conn = test_conn();
        let created = create(&conn, &sample_input("Maria")).unwrap();
        assert!(created.active);
    }

    #[test]
    fn set_active_toggles_and_list_sorted_filters_by_status() {
        let conn = test_conn();
        let member = create(&conn, &sample_input("Maria")).unwrap();

        let updated = set_active(&conn, &member.id, false).unwrap();
        assert!(!updated.active);

        for mode in ["vencimento", "avaliacao", "aniversario"] {
            assert_eq!(list_sorted(&conn, mode, true).unwrap().len(), 0);
        }

        let reactivated = set_active(&conn, &member.id, true).unwrap();
        assert!(reactivated.active);
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

    #[test]
    fn list_sorted_vencimento_puts_unpaid_first_then_by_due_date() {
        let conn = test_conn();

        // Due day 10 (paid), due day 5 (unpaid), due day 5 (paid).
        let mut paid_later = sample_input("PaidLater");
        paid_later.payment_due_day = 10;
        let paid_later = create(&conn, &paid_later).unwrap();
        let mut unpaid = sample_input("Unpaid");
        unpaid.payment_due_day = 5;
        create(&conn, &unpaid).unwrap();
        let mut paid_sooner = sample_input("PaidSooner");
        paid_sooner.payment_due_day = 5;
        let paid_sooner = create(&conn, &paid_sooner).unwrap();

        // Mark paid_later and paid_sooner as paid for the current month.
        let today = Local::now().date_naive();
        let reference_month = format!("{}-{:02}", today.year(), today.month());
        for id in [&paid_later.id, &paid_sooner.id] {
            conn.execute(
                "INSERT INTO payments (id, member_id, reference_month, due_date, paid)
                 VALUES (lower(hex(randomblob(16))), ?1, ?2, '2026-01-01', 1)",
                params![id, reference_month],
            )
            .unwrap();
        }

        let items = list_sorted(&conn, "vencimento", true).unwrap();
        assert_eq!(items.len(), 3);
        // Unpaid first, then by due date ascending (paid_sooner day 5 before paid_later day 10).
        assert_eq!(items[0].member.name, "Unpaid");
        assert_eq!(items[1].member.name, "PaidSooner");
        assert_eq!(items[2].member.name, "PaidLater");
        // "Unpaid" has no payment row yet (None), which sorts as unpaid.
        assert_eq!(items[0].current_paid, None);
        assert_eq!(items[1].current_paid, Some(true));
    }

    #[test]
    fn list_sorted_avaliacao_orders_by_next_evaluation_date() {
        let conn = test_conn();
        let a = create(&conn, &sample_input("A")).unwrap();
        let b = create(&conn, &sample_input("B")).unwrap();

        // A's last evaluation was earlier, so its next evaluation is sooner.
        conn.execute(
            "INSERT INTO evaluations (id, member_id, number, date, weight_kg, height_m)
             VALUES ('eval-a', ?1, 1, '2026-01-01', 70.0, 1.7)",
            params![a.id],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO evaluations (id, member_id, number, date, weight_kg, height_m)
             VALUES ('eval-b', ?1, 1, '2026-02-01', 70.0, 1.7)",
            params![b.id],
        )
        .unwrap();

        let items = list_sorted(&conn, "avaliacao", true).unwrap();
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].member.name, "A");
        assert_eq!(items[1].member.name, "B");
        assert!(items[0].next_evaluation_date <= items[1].next_evaluation_date);
    }

    #[test]
    fn list_sorted_nome_orders_by_name() {
        let conn = test_conn();
        create(&conn, &sample_input("Bruno")).unwrap();
        create(&conn, &sample_input("Ana")).unwrap();
        create(&conn, &sample_input("Carlos")).unwrap();

        let items = list_sorted(&conn, "nome", true).unwrap();
        assert_eq!(items.len(), 3);
        assert_eq!(items[0].member.name, "Ana");
        assert_eq!(items[1].member.name, "Bruno");
        assert_eq!(items[2].member.name, "Carlos");
    }

    #[test]
    fn list_sorted_aniversario_orders_by_upcoming_birthday() {
        let conn = test_conn();
        let today = Local::now().date_naive();
        let (year, month, day) = (today.year(), today.month(), today.day());

        // Birthdays: one two months from now, one next month (soonest first).
        let mut soon = sample_input("Soon");
        soon.birthday = NaiveDate::from_ymd_opt(year, month + 1, day)
            .unwrap()
            .format("%Y-%m-%d")
            .to_string();
        create(&conn, &soon).unwrap();

        let mut later = sample_input("Later");
        later.birthday = NaiveDate::from_ymd_opt(year, month + 2, day)
            .unwrap()
            .format("%Y-%m-%d")
            .to_string();
        create(&conn, &later).unwrap();

        let items = list_sorted(&conn, "aniversario", true).unwrap();
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].member.name, "Soon");
        assert_eq!(items[1].member.name, "Later");
    }

    #[test]
    fn list_sorted_only_includes_active_members() {
        let conn = test_conn();
        let active = create(&conn, &sample_input("Active")).unwrap();
        let inactive = create(&conn, &sample_input("Inactive")).unwrap();
        set_active(&conn, &inactive.id, false).unwrap();

        for mode in ["vencimento", "avaliacao", "aniversario"] {
            let items = list_sorted(&conn, mode, true).unwrap();
            assert_eq!(items.len(), 1);
            assert_eq!(items[0].member.id, active.id);
        }
    }

    #[test]
    fn list_sorted_rejects_unknown_mode() {
        let conn = test_conn();
        assert!(matches!(
            list_sorted(&conn, "bogus", true),
            Err(AppError::Validation(_))
        ));
    }
}
