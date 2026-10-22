use std::fs;
use std::io::{Read, Seek, Write};
use std::path::Path;

use rusqlite::Connection;
use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

use crate::error::{AppError, AppResult};

const MARKER_ENTRY: &str = "evdata.marker";
const MARKER_CONTENT: &str = "AVALIACAO_EVDATA_V1";
const DB_ENTRY: &str = "database.sqlite3";

/// Exports a consistent snapshot of the database into `writer` as a zip (renamed `.evdata` by
/// the caller) containing the sqlite file plus a marker entry identifying the format.
///
/// The sqlite snapshot is staged in `scratch_dir` because `writer` is not addressable as a
/// path in general — on Android the destination is a `content://` URI backed by a file
/// descriptor, not something `VACUUM INTO` could write to directly.
pub fn export_database<W: Write + Seek>(
    conn: &Connection,
    scratch_dir: &Path,
    writer: W,
) -> AppResult<()> {
    let snapshot_path = scratch_dir.join(format!("avaliacao-{}.sqlite3", uuid::Uuid::new_v4()));
    let _ = fs::remove_file(&snapshot_path);

    // VACUUM INTO takes a live, consistent snapshot without needing to close the connection.
    conn.execute(
        "VACUUM INTO ?1",
        rusqlite::params![snapshot_path.to_string_lossy().to_string()],
    )?;

    let db_bytes = fs::read(&snapshot_path);
    let _ = fs::remove_file(&snapshot_path);
    let db_bytes = db_bytes?;

    let mut zip = ZipWriter::new(writer);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    zip.start_file(MARKER_ENTRY, options)?;
    zip.write_all(MARKER_CONTENT.as_bytes())?;

    zip.start_file(DB_ENTRY, options)?;
    zip.write_all(&db_bytes)?;

    zip.finish()?;
    Ok(())
}

/// Validates the `.evdata` marker and returns the embedded sqlite database bytes.
pub fn extract_database<R: Read + Seek>(reader: R) -> AppResult<Vec<u8>> {
    let mut archive = ZipArchive::new(reader)?;

    let mut marker = String::new();
    archive
        .by_name(MARKER_ENTRY)
        .map_err(|_| AppError::Validation("Arquivo inválido: não é um backup .evdata.".into()))?
        .read_to_string(&mut marker)?;
    if marker.trim() != MARKER_CONTENT {
        return Err(AppError::Validation(
            "Arquivo .evdata corrompido ou incompatível.".into(),
        ));
    }

    let mut db_bytes = Vec::new();
    archive
        .by_name(DB_ENTRY)
        .map_err(|_| AppError::Validation("Arquivo .evdata inválido: banco de dados ausente.".into()))?
        .read_to_end(&mut db_bytes)?;

    Ok(db_bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    fn test_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        db::run_migrations(&conn).unwrap();
        conn
    }

    #[test]
    fn export_then_extract_round_trips_marker_and_db() {
        let conn = test_conn();
        let dir = tempfile::tempdir().unwrap();
        let dest = dir.path().join("backup.evdata");

        let file = fs::File::create(&dest).unwrap();
        export_database(&conn, dir.path(), file).unwrap();
        let db_bytes = extract_database(fs::File::open(&dest).unwrap()).unwrap();

        // Roundtrip the extracted bytes into a real sqlite file and make sure it opens.
        let restored_path = dir.path().join("restored.sqlite3");
        std::fs::write(&restored_path, &db_bytes).unwrap();
        let restored = Connection::open(&restored_path).unwrap();
        let count: i64 = restored
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |row| row.get(0))
            .unwrap();
        assert!(count > 0);
    }

    #[test]
    fn extract_rejects_file_without_marker() {
        let dir = tempfile::tempdir().unwrap();
        let dest = dir.path().join("not-evdata.evdata");
        let file = fs::File::create(&dest).unwrap();
        let mut zip = ZipWriter::new(file);
        zip.start_file("something.txt", SimpleFileOptions::default())
            .unwrap();
        zip.write_all(b"hello").unwrap();
        zip.finish().unwrap();

        let result = extract_database(fs::File::open(&dest).unwrap());
        assert!(matches!(result, Err(AppError::Validation(_))));
    }
}
