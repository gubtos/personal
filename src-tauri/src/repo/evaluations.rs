use rusqlite::{named_params, params, Connection};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::evaluation::{
    Evaluation, EvaluationInput, EvaluationPhotos, EvaluationPhotosInput,
};

/// Every `evaluations` column except the four photo blobs. Listing metrics without
/// the photos keeps the payload small; photos are fetched separately (and lazily)
/// only where they are actually displayed.
const METRIC_COLUMNS: &str = "id, member_id, number, date, weight_kg, height_m,
    neck_cm, chest_cm, waist_cm, abdomen_cm, hip_cm,
    forearm_right_cm, forearm_left_cm, arm_right_cm, arm_left_cm,
    thigh_right_cm, thigh_left_cm, calf_right_cm, calf_left_cm,
    arm_flexed_right_cm, arm_flexed_left_cm,
    heart_rate_bpm, heart_index, bmi, body_fat_pct, muscle_rate_pct,
    fat_free_mass_kg, subcutaneous_fat_pct, visceral_fat, body_water_pct,
    skeletal_muscle_pct, muscle_mass_kg, bone_mass_kg, bmr_kcal, metabolic_age,
    notes, created_at, updated_at";

/// Photos live in a 1:1 side table; this join brings back the evaluation fields
/// (number/date) the UI needs for captions alongside the blobs themselves.
const PHOTO_SELECT: &str = "SELECT p.evaluation_id AS id, e.member_id, e.number, e.date,
    p.photo_front, p.photo_side_right, p.photo_side_left, p.photo_back
    FROM evaluation_photos p JOIN evaluations e ON e.id = p.evaluation_id";

pub fn list(conn: &Connection, member_id: &str) -> AppResult<Vec<Evaluation>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {METRIC_COLUMNS} FROM evaluations WHERE member_id = ?1 ORDER BY date ASC, number ASC"
    ))?;
    let evaluations = stmt
        .query_map(params![member_id], Evaluation::from_row)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(evaluations)
}

pub fn list_photos(conn: &Connection, member_id: &str) -> AppResult<Vec<EvaluationPhotos>> {
    let mut stmt = conn.prepare(&format!(
        "{PHOTO_SELECT} WHERE e.member_id = ?1 ORDER BY e.date ASC, e.number ASC"
    ))?;
    let photos = stmt
        .query_map(params![member_id], EvaluationPhotos::from_row)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(photos)
}

pub fn get(conn: &Connection, id: &str) -> AppResult<Evaluation> {
    conn.query_row(
        &format!("SELECT {METRIC_COLUMNS} FROM evaluations WHERE id = ?1"),
        params![id],
        Evaluation::from_row,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
        other => AppError::Database(other),
    })
}

pub fn get_photos(conn: &Connection, id: &str) -> AppResult<EvaluationPhotos> {
    conn.query_row(
        &format!("{PHOTO_SELECT} WHERE e.id = ?1"),
        params![id],
        EvaluationPhotos::from_row,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
        other => AppError::Database(other),
    })
}

pub fn create(
    conn: &Connection,
    member_id: &str,
    input: &EvaluationInput,
    photos: &EvaluationPhotosInput,
) -> AppResult<Evaluation> {
    let member_exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM members WHERE id = ?1)",
        params![member_id],
        |row| row.get(0),
    )?;
    if !member_exists {
        return Err(AppError::NotFound);
    }

    // Evaluation "número" is always the count of the member's existing
    // evaluations + 1 — never user-editable, and never renumbered later
    // (deleting an evaluation does not shift the numbers of the others).
    let next_number: i64 = conn.query_row(
        "SELECT COALESCE(MAX(number), 0) + 1 FROM evaluations WHERE member_id = ?1",
        params![member_id],
        |row| row.get(0),
    )?;

    let id = Uuid::new_v4().to_string();
    let tx = conn.unchecked_transaction()?;

    tx.execute(
        "INSERT INTO evaluations (
            id, member_id, number, date, weight_kg, height_m,
            neck_cm, chest_cm, waist_cm, abdomen_cm, hip_cm,
            forearm_right_cm, forearm_left_cm, arm_right_cm, arm_left_cm,
            thigh_right_cm, thigh_left_cm, calf_right_cm, calf_left_cm,
            arm_flexed_right_cm, arm_flexed_left_cm,
            heart_rate_bpm, heart_index, bmi, body_fat_pct, muscle_rate_pct,
            fat_free_mass_kg, subcutaneous_fat_pct, visceral_fat, body_water_pct,
            skeletal_muscle_pct, muscle_mass_kg, bone_mass_kg, bmr_kcal, metabolic_age,
            notes
        ) VALUES (
            :id, :member_id, :number, :date, :weight_kg, :height_m,
            :neck_cm, :chest_cm, :waist_cm, :abdomen_cm, :hip_cm,
            :forearm_right_cm, :forearm_left_cm, :arm_right_cm, :arm_left_cm,
            :thigh_right_cm, :thigh_left_cm, :calf_right_cm, :calf_left_cm,
            :arm_flexed_right_cm, :arm_flexed_left_cm,
            :heart_rate_bpm, :heart_index, :bmi, :body_fat_pct, :muscle_rate_pct,
            :fat_free_mass_kg, :subcutaneous_fat_pct, :visceral_fat, :body_water_pct,
            :skeletal_muscle_pct, :muscle_mass_kg, :bone_mass_kg, :bmr_kcal, :metabolic_age,
            :notes
        )",
        named_params! {
            ":id": id,
            ":member_id": member_id,
            ":number": next_number,
            ":date": input.date,
            ":weight_kg": input.weight_kg,
            ":height_m": input.height_m,
            ":neck_cm": input.neck_cm,
            ":chest_cm": input.chest_cm,
            ":waist_cm": input.waist_cm,
            ":abdomen_cm": input.abdomen_cm,
            ":hip_cm": input.hip_cm,
            ":forearm_right_cm": input.forearm_right_cm,
            ":forearm_left_cm": input.forearm_left_cm,
            ":arm_right_cm": input.arm_right_cm,
            ":arm_left_cm": input.arm_left_cm,
            ":thigh_right_cm": input.thigh_right_cm,
            ":thigh_left_cm": input.thigh_left_cm,
            ":calf_right_cm": input.calf_right_cm,
            ":calf_left_cm": input.calf_left_cm,
            ":arm_flexed_right_cm": input.arm_flexed_right_cm,
            ":arm_flexed_left_cm": input.arm_flexed_left_cm,
            ":heart_rate_bpm": input.heart_rate_bpm,
            ":heart_index": input.heart_index,
            ":bmi": input.bmi,
            ":body_fat_pct": input.body_fat_pct,
            ":muscle_rate_pct": input.muscle_rate_pct,
            ":fat_free_mass_kg": input.fat_free_mass_kg,
            ":subcutaneous_fat_pct": input.subcutaneous_fat_pct,
            ":visceral_fat": input.visceral_fat,
            ":body_water_pct": input.body_water_pct,
            ":skeletal_muscle_pct": input.skeletal_muscle_pct,
            ":muscle_mass_kg": input.muscle_mass_kg,
            ":bone_mass_kg": input.bone_mass_kg,
            ":bmr_kcal": input.bmr_kcal,
            ":metabolic_age": input.metabolic_age,
            ":notes": input.notes,
        },
    )?;

    tx.execute(
        "INSERT INTO evaluation_photos (
            evaluation_id, photo_front, photo_side_right, photo_side_left, photo_back
        ) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            id,
            photos.photo_front,
            photos.photo_side_right,
            photos.photo_side_left,
            photos.photo_back
        ],
    )?;
    tx.commit()?;

    get(conn, &id)
}

pub fn update(
    conn: &Connection,
    id: &str,
    input: &EvaluationInput,
    photos: Option<&EvaluationPhotosInput>,
) -> AppResult<Evaluation> {
    let tx = conn.unchecked_transaction()?;
    let updated = tx.execute(
        "UPDATE evaluations SET
            date = :date, weight_kg = :weight_kg, height_m = :height_m,
            neck_cm = :neck_cm, chest_cm = :chest_cm, waist_cm = :waist_cm,
            abdomen_cm = :abdomen_cm, hip_cm = :hip_cm,
            forearm_right_cm = :forearm_right_cm, forearm_left_cm = :forearm_left_cm,
            arm_right_cm = :arm_right_cm, arm_left_cm = :arm_left_cm,
            thigh_right_cm = :thigh_right_cm, thigh_left_cm = :thigh_left_cm,
            calf_right_cm = :calf_right_cm, calf_left_cm = :calf_left_cm,
            arm_flexed_right_cm = :arm_flexed_right_cm, arm_flexed_left_cm = :arm_flexed_left_cm,
            heart_rate_bpm = :heart_rate_bpm, heart_index = :heart_index, bmi = :bmi,
            body_fat_pct = :body_fat_pct, muscle_rate_pct = :muscle_rate_pct,
            fat_free_mass_kg = :fat_free_mass_kg, subcutaneous_fat_pct = :subcutaneous_fat_pct,
            visceral_fat = :visceral_fat, body_water_pct = :body_water_pct,
            skeletal_muscle_pct = :skeletal_muscle_pct, muscle_mass_kg = :muscle_mass_kg,
            bone_mass_kg = :bone_mass_kg, bmr_kcal = :bmr_kcal, metabolic_age = :metabolic_age,
            notes = :notes,
            updated_at = datetime('now')
         WHERE id = :id",
        named_params! {
            ":id": id,
            ":date": input.date,
            ":weight_kg": input.weight_kg,
            ":height_m": input.height_m,
            ":neck_cm": input.neck_cm,
            ":chest_cm": input.chest_cm,
            ":waist_cm": input.waist_cm,
            ":abdomen_cm": input.abdomen_cm,
            ":hip_cm": input.hip_cm,
            ":forearm_right_cm": input.forearm_right_cm,
            ":forearm_left_cm": input.forearm_left_cm,
            ":arm_right_cm": input.arm_right_cm,
            ":arm_left_cm": input.arm_left_cm,
            ":thigh_right_cm": input.thigh_right_cm,
            ":thigh_left_cm": input.thigh_left_cm,
            ":calf_right_cm": input.calf_right_cm,
            ":calf_left_cm": input.calf_left_cm,
            ":arm_flexed_right_cm": input.arm_flexed_right_cm,
            ":arm_flexed_left_cm": input.arm_flexed_left_cm,
            ":heart_rate_bpm": input.heart_rate_bpm,
            ":heart_index": input.heart_index,
            ":bmi": input.bmi,
            ":body_fat_pct": input.body_fat_pct,
            ":muscle_rate_pct": input.muscle_rate_pct,
            ":fat_free_mass_kg": input.fat_free_mass_kg,
            ":subcutaneous_fat_pct": input.subcutaneous_fat_pct,
            ":visceral_fat": input.visceral_fat,
            ":body_water_pct": input.body_water_pct,
            ":skeletal_muscle_pct": input.skeletal_muscle_pct,
            ":muscle_mass_kg": input.muscle_mass_kg,
            ":bone_mass_kg": input.bone_mass_kg,
            ":bmr_kcal": input.bmr_kcal,
            ":metabolic_age": input.metabolic_age,
            ":notes": input.notes,
        },
    )?;

    if updated == 0 {
        return Err(AppError::NotFound);
    }

    if let Some(photos) = photos {
        tx.execute(
            "INSERT INTO evaluation_photos (
                evaluation_id, photo_front, photo_side_right, photo_side_left, photo_back
            ) VALUES (?1, ?2, ?3, ?4, ?5)
            ON CONFLICT(evaluation_id) DO UPDATE SET
                photo_front = excluded.photo_front,
                photo_side_right = excluded.photo_side_right,
                photo_side_left = excluded.photo_side_left,
                photo_back = excluded.photo_back",
            params![
                id,
                photos.photo_front,
                photos.photo_side_right,
                photos.photo_side_left,
                photos.photo_back
            ],
        )?;
    }

    tx.commit()?;

    get(conn, id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let deleted = conn.execute("DELETE FROM evaluations WHERE id = ?1", params![id])?;
    if deleted == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
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
                payment_due_day: 5,
            },
        )
        .unwrap();
        member.id
    }

    fn sample_input(date: &str) -> EvaluationInput {
        EvaluationInput {
            date: date.to_string(),
            weight_kg: 66.9,
            height_m: 1.80,
            neck_cm: Some(37.0),
            chest_cm: Some(87.0),
            waist_cm: Some(78.5),
            abdomen_cm: Some(85.5),
            hip_cm: Some(96.0),
            forearm_right_cm: None,
            forearm_left_cm: None,
            arm_right_cm: None,
            arm_left_cm: None,
            thigh_right_cm: None,
            thigh_left_cm: None,
            calf_right_cm: None,
            calf_left_cm: None,
            arm_flexed_right_cm: None,
            arm_flexed_left_cm: None,
            heart_rate_bpm: Some(88.0),
            heart_index: None,
            bmi: Some(20.6),
            body_fat_pct: Some(17.2),
            muscle_rate_pct: None,
            fat_free_mass_kg: None,
            subcutaneous_fat_pct: None,
            visceral_fat: None,
            body_water_pct: None,
            skeletal_muscle_pct: None,
            muscle_mass_kg: None,
            bone_mass_kg: None,
            bmr_kcal: None,
            metabolic_age: None,
            notes: None,
        }
    }

    fn no_photos() -> EvaluationPhotosInput {
        EvaluationPhotosInput {
            photo_front: None,
            photo_side_right: None,
            photo_side_left: None,
            photo_back: None,
        }
    }

    fn create_eval(conn: &Connection, member_id: &str, date: &str) -> Evaluation {
        create(conn, member_id, &sample_input(date), &no_photos()).unwrap()
    }

    #[test]
    fn evaluations_are_auto_numbered_sequentially() {
        let conn = test_conn();
        let member_id = create_test_member(&conn);

        let first = create_eval(&conn, &member_id, "2026-01-01");
        let second = create_eval(&conn, &member_id, "2026-02-01");
        let third = create_eval(&conn, &member_id, "2026-03-01");

        assert_eq!(first.number, 1);
        assert_eq!(second.number, 2);
        assert_eq!(third.number, 3);
    }

    #[test]
    fn deleting_an_evaluation_does_not_renumber_the_others() {
        let conn = test_conn();
        let member_id = create_test_member(&conn);

        let first = create_eval(&conn, &member_id, "2026-01-01");
        let second = create_eval(&conn, &member_id, "2026-02-01");
        let third = create_eval(&conn, &member_id, "2026-03-01");

        delete(&conn, &second.id).unwrap();

        let remaining = list(&conn, &member_id).unwrap();
        assert_eq!(remaining.len(), 2);
        assert_eq!(remaining[0].id, first.id);
        assert_eq!(remaining[0].number, 1);
        assert_eq!(remaining[1].id, third.id);
        assert_eq!(remaining[1].number, 3);

        // A newly created evaluation continues from the current max, not a gap-fill.
        let fourth = create_eval(&conn, &member_id, "2026-04-01");
        assert_eq!(fourth.number, 4);
    }

    #[test]
    fn create_for_missing_member_returns_not_found() {
        let conn = test_conn();
        let result = create(&conn, "missing-id", &sample_input("2026-01-01"), &no_photos());
        assert!(matches!(result, Err(AppError::NotFound)));
    }

    #[test]
    fn deleting_an_evaluation_removes_its_photos_row() {
        let conn = test_conn();
        let member_id = create_test_member(&conn);

        let created = create_eval(&conn, &member_id, "2026-01-01");
        delete(&conn, &created.id).unwrap();

        let photos = list_photos(&conn, &member_id).unwrap();
        assert!(photos.is_empty());
    }

    #[test]
    fn list_orders_by_date_ascending() {
        let conn = test_conn();
        let member_id = create_test_member(&conn);

        create_eval(&conn, &member_id, "2026-03-01");
        create_eval(&conn, &member_id, "2026-01-01");
        create_eval(&conn, &member_id, "2026-02-01");

        let evaluations = list(&conn, &member_id).unwrap();
        assert_eq!(evaluations[0].date, "2026-01-01");
        assert_eq!(evaluations[1].date, "2026-02-01");
        assert_eq!(evaluations[2].date, "2026-03-01");
    }

    #[test]
    fn update_preserves_number_and_changes_fields() {
        let conn = test_conn();
        let member_id = create_test_member(&conn);
        let created = create_eval(&conn, &member_id, "2026-01-01");

        let mut new_input = sample_input("2026-01-15");
        new_input.weight_kg = 70.0;
        let updated = update(&conn, &created.id, &new_input, None).unwrap();

        assert_eq!(updated.number, created.number);
        assert_eq!(updated.weight_kg, 70.0);
        assert_eq!(updated.date, "2026-01-15");
    }

    #[test]
    fn list_and_get_photos_return_stored_photos() {
        let conn = test_conn();
        let member_id = create_test_member(&conn);

        let photos = EvaluationPhotosInput {
            photo_front: Some(vec![1, 2, 3]),
            photo_side_right: None,
            photo_side_left: None,
            photo_back: Some(vec![4, 5, 6]),
        };
        let created = create(&conn, &member_id, &sample_input("2026-01-01"), &photos).unwrap();

        let listed = list_photos(&conn, &member_id).unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].id, created.id);
        assert_eq!(listed[0].number, 1);
        assert_eq!(listed[0].date, "2026-01-01");
        assert_eq!(listed[0].photo_front, Some(vec![1, 2, 3]));
        assert_eq!(listed[0].photo_side_left, None);
        assert_eq!(listed[0].photo_back, Some(vec![4, 5, 6]));

        let single = get_photos(&conn, &created.id).unwrap();
        assert_eq!(single.photo_front, Some(vec![1, 2, 3]));
        assert_eq!(single.photo_side_right, None);
    }

    #[test]
    fn metrics_only_update_leaves_stored_photos_untouched() {
        let conn = test_conn();
        let member_id = create_test_member(&conn);

        let photos = EvaluationPhotosInput {
            photo_front: Some(vec![9, 9, 9]),
            photo_side_right: None,
            photo_side_left: None,
            photo_back: None,
        };
        let created = create(&conn, &member_id, &sample_input("2026-01-01"), &photos).unwrap();

        // No photos passed → the metrics update must not rewrite the photo row.
        let mut new_input = sample_input("2026-01-10");
        new_input.weight_kg = 70.0;
        update(&conn, &created.id, &new_input, None).unwrap();
        assert_eq!(
            get_photos(&conn, &created.id).unwrap().photo_front,
            Some(vec![9, 9, 9])
        );

        // Photos passed → they are replaced.
        let replacement = EvaluationPhotosInput {
            photo_front: Some(vec![7, 7]),
            photo_side_right: None,
            photo_side_left: None,
            photo_back: None,
        };
        update(&conn, &created.id, &new_input, Some(&replacement)).unwrap();
        assert_eq!(
            get_photos(&conn, &created.id).unwrap().photo_front,
            Some(vec![7, 7])
        );
    }
}
