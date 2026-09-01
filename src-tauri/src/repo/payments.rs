use chrono::{Datelike, Local, NaiveDate};
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::payment::Payment;

fn last_day_of_month(year: i32, month: u32) -> u32 {
    let (next_year, next_month) = if month == 12 { (year + 1, 1) } else { (year, month + 1) };
    NaiveDate::from_ymd_opt(next_year, next_month, 1)
        .unwrap()
        .pred_opt()
        .unwrap()
        .day()
}

/// Clamps the configured due day to the last valid day of the month (e.g. day 31 in April -> 30).
fn due_date_for(year: i32, month: u32, due_day: i64) -> String {
    let day = (due_day.max(1) as u32).min(last_day_of_month(year, month));
    NaiveDate::from_ymd_opt(year, month, day)
        .unwrap()
        .format("%Y-%m-%d")
        .to_string()
}

fn next_month(year: i32, month: u32) -> (i32, u32) {
    if month == 12 { (year + 1, 1) } else { (year, month + 1) }
}

/// Ensures a payment row exists for `(year, month)`, creating one (unpaid) if missing.
fn ensure_month(
    conn: &Connection,
    member_id: &str,
    year: i32,
    month: u32,
    due_day: i64,
) -> AppResult<()> {
    let reference_month = format!("{year:04}-{month:02}");
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM payments WHERE member_id = ?1 AND reference_month = ?2)",
        params![member_id, reference_month],
        |row| row.get(0),
    )?;
    if exists {
        return Ok(());
    }

    let id = Uuid::new_v4().to_string();
    let due_date = due_date_for(year, month, due_day);
    conn.execute(
        "INSERT INTO payments (id, member_id, reference_month, due_date, paid)
         VALUES (?1, ?2, ?3, ?4, 0)",
        params![id, member_id, reference_month, due_date],
    )?;
    Ok(())
}

/// Ensures the current month and next month's payment rows exist, then returns all
/// payments for the member ordered from most recent to oldest reference month.
pub fn list(conn: &Connection, member_id: &str) -> AppResult<Vec<Payment>> {
    let due_day = crate::repo::settings::get(conn)?.payment_due_day;
    let today = Local::now().date_naive();

    ensure_month(conn, member_id, today.year(), today.month(), due_day)?;
    let (next_year, next_month_num) = next_month(today.year(), today.month());
    ensure_month(conn, member_id, next_year, next_month_num, due_day)?;

    let mut stmt =
        conn.prepare("SELECT * FROM payments WHERE member_id = ?1 ORDER BY reference_month DESC")?;
    let payments = stmt
        .query_map(params![member_id], Payment::from_row)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(payments)
}

pub fn get(conn: &Connection, id: &str) -> AppResult<Payment> {
    conn.query_row(
        "SELECT * FROM payments WHERE id = ?1",
        params![id],
        Payment::from_row,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
        other => AppError::Database(other),
    })
}

pub fn set_paid(conn: &Connection, id: &str, paid: bool) -> AppResult<Payment> {
    let updated = if paid {
        conn.execute(
            "UPDATE payments SET paid = 1, paid_at = datetime('now'), updated_at = datetime('now')
             WHERE id = ?1",
            params![id],
        )?
    } else {
        conn.execute(
            "UPDATE payments SET paid = 0, paid_at = NULL, updated_at = datetime('now')
             WHERE id = ?1",
            params![id],
        )?
    };

    if updated == 0 {
        return Err(AppError::NotFound);
    }

    get(conn, id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::member::{Gender, MemberInput};
    use crate::repo::members;

    fn test_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        crate::db::run_migrations(&conn).unwrap();
        conn
    }

    fn create_test_member(conn: &Connection) -> String {
        let member = members::create(
            conn,
            &MemberInput {
                name: "Maria".to_string(),
                phone: "+55 11 99999-0000".to_string(),
                birthday: "1990-01-01".to_string(),
                gender: Gender::Feminino,
                face_photo: None,
                notes: None,
            },
        )
        .unwrap();
        member.id
    }

    #[test]
    fn due_date_clamps_to_last_day_of_shorter_months() {
        assert_eq!(due_date_for(2027, 2, 31), "2027-02-28");
        assert_eq!(due_date_for(2027, 3, 27), "2027-03-27");
    }

    #[test]
    fn list_always_includes_current_and_next_month() {
        let conn = test_conn();
        let member_id = create_test_member(&conn);

        let payments = list(&conn, &member_id).unwrap();
        assert_eq!(payments.len(), 2);
        assert!(!payments[0].paid);
        assert!(!payments[1].paid);

        // calling list again does not duplicate the rows
        let payments_again = list(&conn, &member_id).unwrap();
        assert_eq!(payments_again.len(), 2);
    }

    #[test]
    fn list_is_sorted_most_recent_first() {
        let conn = test_conn();
        let member_id = create_test_member(&conn);
        let payments = list(&conn, &member_id).unwrap();
        assert!(payments[0].reference_month >= payments[1].reference_month);
    }

    #[test]
    fn set_paid_toggles_status_and_paid_at() {
        let conn = test_conn();
        let member_id = create_test_member(&conn);
        let payment = list(&conn, &member_id).unwrap().into_iter().next().unwrap();

        let paid = set_paid(&conn, &payment.id, true).unwrap();
        assert!(paid.paid);
        assert!(paid.paid_at.is_some());

        let unpaid = set_paid(&conn, &payment.id, false).unwrap();
        assert!(!unpaid.paid);
        assert!(unpaid.paid_at.is_none());
    }
}
