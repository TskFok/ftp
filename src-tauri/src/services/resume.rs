use crate::db::Database;
use crate::models::transfer::ResumeRecord;

pub fn find_resume_record(
    db: &Database,
    host_id: i64,
    remote_path: &str,
    local_path: &str,
    direction: &str,
) -> Result<Option<ResumeRecord>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, transfer_id, host_id, remote_path, local_path, direction,
                    file_size, transferred_bytes, checksum, created_at
             FROM resume_records
             WHERE host_id = ?1 AND remote_path = ?2 AND local_path = ?3 AND direction = ?4
             ORDER BY created_at DESC LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_row(
            rusqlite::params![host_id, remote_path, local_path, direction],
            |row| {
                Ok(ResumeRecord {
                    id: row.get(0)?,
                    transfer_id: row.get(1)?,
                    host_id: row.get(2)?,
                    remote_path: row.get(3)?,
                    local_path: row.get(4)?,
                    direction: crate::models::transfer::TransferDirection::from_str(
                        &row.get::<_, String>(5)?,
                    )
                    .unwrap_or(crate::models::transfer::TransferDirection::Upload),
                    file_size: row.get(6)?,
                    transferred_bytes: row.get(7)?,
                    checksum: row.get(8)?,
                    created_at: row.get(9)?,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(result)
}

pub fn save_resume_record(db: &Database, record: &ResumeRecord) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO resume_records (transfer_id, host_id, remote_path, local_path, direction, file_size, transferred_bytes, checksum)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            record.transfer_id,
            record.host_id,
            record.remote_path,
            record.local_path,
            record.direction.as_str(),
            record.file_size,
            record.transferred_bytes,
            record.checksum,
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_resume_record(db: &Database, transfer_id: &str) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM resume_records WHERE transfer_id = ?1",
        rusqlite::params![transfer_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

use rusqlite::OptionalExtension;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrations;
    use rusqlite::Connection;

    fn setup_test_db() -> Database {
        let conn = Connection::open_in_memory().unwrap();
        migrations::run_all(&conn).unwrap();
        conn.execute(
            "INSERT INTO hosts (name, host, port, protocol, username) VALUES ('test', 'localhost', 22, 'sftp', 'user')",
            [],
        ).unwrap();
        Database {
            conn: std::sync::Mutex::new(conn),
        }
    }

    #[test]
    fn test_save_and_find_resume_record() {
        let db = setup_test_db();
        let record = ResumeRecord {
            id: None,
            transfer_id: "test-123".to_string(),
            host_id: 1,
            remote_path: "/remote/file.txt".to_string(),
            local_path: "/local/file.txt".to_string(),
            direction: crate::models::transfer::TransferDirection::Upload,
            file_size: 1024,
            transferred_bytes: 512,
            checksum: None,
            created_at: None,
        };

        save_resume_record(&db, &record).unwrap();
        let found = find_resume_record(&db, 1, "/remote/file.txt", "/local/file.txt", "upload")
            .unwrap();

        assert!(found.is_some());
        let found = found.unwrap();
        assert_eq!(found.transfer_id, "test-123");
        assert_eq!(found.transferred_bytes, 512);
    }

    #[test]
    fn test_delete_resume_record() {
        let db = setup_test_db();
        let record = ResumeRecord {
            id: None,
            transfer_id: "test-456".to_string(),
            host_id: 1,
            remote_path: "/remote/file.txt".to_string(),
            local_path: "/local/file.txt".to_string(),
            direction: crate::models::transfer::TransferDirection::Download,
            file_size: 2048,
            transferred_bytes: 1024,
            checksum: None,
            created_at: None,
        };

        save_resume_record(&db, &record).unwrap();
        delete_resume_record(&db, "test-456").unwrap();

        let found = find_resume_record(&db, 1, "/remote/file.txt", "/local/file.txt", "download")
            .unwrap();
        assert!(found.is_none());
    }
}
