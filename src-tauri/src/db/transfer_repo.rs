use rusqlite::{params, Connection};

use crate::models::transfer::{
    ResumeRecord, TransferDirection, TransferHistory, TransferStatus,
};

// ── TransferHistory ──

pub fn insert_history(
    conn: &Connection,
    record: &TransferHistory,
) -> Result<TransferHistory, rusqlite::Error> {
    conn.execute(
        "INSERT INTO transfer_history \
         (host_id, filename, remote_path, local_path, direction, file_size, \
          transferred_size, status, error_message, started_at, finished_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            record.host_id,
            record.filename,
            record.remote_path,
            record.local_path,
            record.direction.as_str(),
            record.file_size,
            record.transferred_size,
            record.status.as_str(),
            record.error_message,
            record.started_at,
            record.finished_at,
        ],
    )?;
    let id = conn.last_insert_rowid();
    get_history_by_id(conn, id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
}

pub fn get_history_by_id(
    conn: &Connection,
    id: i64,
) -> Result<Option<TransferHistory>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, host_id, filename, remote_path, local_path, direction, \
         file_size, transferred_size, status, error_message, started_at, finished_at \
         FROM transfer_history WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], row_to_history)?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn get_history_by_host(
    conn: &Connection,
    host_id: i64,
) -> Result<Vec<TransferHistory>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, host_id, filename, remote_path, local_path, direction, \
         file_size, transferred_size, status, error_message, started_at, finished_at \
         FROM transfer_history WHERE host_id = ?1 ORDER BY id DESC",
    )?;
    let rows = stmt.query_map(params![host_id], row_to_history)?;
    rows.collect()
}

pub fn get_all_history(conn: &Connection) -> Result<Vec<TransferHistory>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, host_id, filename, remote_path, local_path, direction, \
         file_size, transferred_size, status, error_message, started_at, finished_at \
         FROM transfer_history ORDER BY id DESC",
    )?;
    let rows = stmt.query_map([], row_to_history)?;
    rows.collect()
}

pub fn update_history_status(
    conn: &Connection,
    id: i64,
    status: &TransferStatus,
    transferred_size: u64,
    error_message: Option<&str>,
    finished_at: Option<&str>,
) -> Result<bool, rusqlite::Error> {
    let changed = conn.execute(
        "UPDATE transfer_history SET status = ?1, transferred_size = ?2, \
         error_message = ?3, finished_at = ?4 WHERE id = ?5",
        params![status.as_str(), transferred_size, error_message, finished_at, id],
    )?;
    Ok(changed > 0)
}

pub fn clear_history(conn: &Connection) -> Result<usize, rusqlite::Error> {
    conn.execute("DELETE FROM transfer_history", [])
}

pub fn clear_history_by_host(
    conn: &Connection,
    host_id: i64,
) -> Result<usize, rusqlite::Error> {
    conn.execute("DELETE FROM transfer_history WHERE host_id = ?1", params![host_id])
}

fn row_to_history(row: &rusqlite::Row) -> Result<TransferHistory, rusqlite::Error> {
    let dir_str: String = row.get(5)?;
    let status_str: String = row.get(8)?;

    let direction = TransferDirection::from_str(&dir_str).map_err(|e| {
        rusqlite::Error::FromSqlConversionFailure(
            5,
            rusqlite::types::Type::Text,
            Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, e)),
        )
    })?;
    let status = TransferStatus::from_str(&status_str).map_err(|e| {
        rusqlite::Error::FromSqlConversionFailure(
            8,
            rusqlite::types::Type::Text,
            Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, e)),
        )
    })?;

    Ok(TransferHistory {
        id: row.get(0)?,
        host_id: row.get(1)?,
        filename: row.get(2)?,
        remote_path: row.get(3)?,
        local_path: row.get(4)?,
        direction,
        file_size: row.get(6)?,
        transferred_size: row.get(7)?,
        status,
        error_message: row.get(9)?,
        started_at: row.get(10)?,
        finished_at: row.get(11)?,
    })
}

// ── ResumeRecord ──

pub fn insert_resume(
    conn: &Connection,
    record: &ResumeRecord,
) -> Result<ResumeRecord, rusqlite::Error> {
    conn.execute(
        "INSERT INTO resume_records \
         (transfer_id, host_id, remote_path, local_path, direction, \
          file_size, transferred_bytes, checksum) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            record.transfer_id,
            record.host_id,
            record.remote_path,
            record.local_path,
            record.direction.as_str(),
            record.file_size,
            record.transferred_bytes,
            record.checksum,
        ],
    )?;
    let id = conn.last_insert_rowid();
    get_resume_by_id(conn, id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
}

pub fn get_resume_by_id(
    conn: &Connection,
    id: i64,
) -> Result<Option<ResumeRecord>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, transfer_id, host_id, remote_path, local_path, direction, \
         file_size, transferred_bytes, checksum, created_at \
         FROM resume_records WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], row_to_resume)?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn find_resume(
    conn: &Connection,
    host_id: i64,
    remote_path: &str,
    local_path: &str,
    direction: &TransferDirection,
) -> Result<Option<ResumeRecord>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, transfer_id, host_id, remote_path, local_path, direction, \
         file_size, transferred_bytes, checksum, created_at \
         FROM resume_records \
         WHERE host_id = ?1 AND remote_path = ?2 AND local_path = ?3 AND direction = ?4 \
         ORDER BY created_at DESC LIMIT 1",
    )?;
    let mut rows = stmt.query_map(
        params![host_id, remote_path, local_path, direction.as_str()],
        row_to_resume,
    )?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn update_resume_progress(
    conn: &Connection,
    id: i64,
    transferred_bytes: u64,
    checksum: Option<&str>,
) -> Result<bool, rusqlite::Error> {
    let changed = conn.execute(
        "UPDATE resume_records SET transferred_bytes = ?1, checksum = ?2 WHERE id = ?3",
        params![transferred_bytes, checksum, id],
    )?;
    Ok(changed > 0)
}

pub fn delete_resume(conn: &Connection, id: i64) -> Result<bool, rusqlite::Error> {
    let changed = conn.execute("DELETE FROM resume_records WHERE id = ?1", params![id])?;
    Ok(changed > 0)
}

pub fn delete_resume_by_transfer(
    conn: &Connection,
    transfer_id: &str,
) -> Result<bool, rusqlite::Error> {
    let changed = conn.execute(
        "DELETE FROM resume_records WHERE transfer_id = ?1",
        params![transfer_id],
    )?;
    Ok(changed > 0)
}

fn row_to_resume(row: &rusqlite::Row) -> Result<ResumeRecord, rusqlite::Error> {
    let dir_str: String = row.get(5)?;
    let direction = TransferDirection::from_str(&dir_str).map_err(|e| {
        rusqlite::Error::FromSqlConversionFailure(
            5,
            rusqlite::types::Type::Text,
            Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, e)),
        )
    })?;

    Ok(ResumeRecord {
        id: row.get(0)?,
        transfer_id: row.get(1)?,
        host_id: row.get(2)?,
        remote_path: row.get(3)?,
        local_path: row.get(4)?,
        direction,
        file_size: row.get(6)?,
        transferred_bytes: row.get(7)?,
        checksum: row.get(8)?,
        created_at: row.get(9)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{host_repo, migrations};
    use crate::models::host::{Host, Protocol};

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        migrations::run_all(&conn).unwrap();
        conn
    }

    fn insert_test_host(conn: &Connection) -> Host {
        let h = Host::new("test".into(), "127.0.0.1".into(), 22, Protocol::Sftp, "user".into());
        host_repo::insert(conn, &h).unwrap()
    }

    #[test]
    fn test_insert_and_get_history() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let th = TransferHistory::new(
            host.id.unwrap(),
            "doc.pdf".into(),
            "/remote/doc.pdf".into(),
            "/local/doc.pdf".into(),
            TransferDirection::Upload,
            4096,
        );
        let created = insert_history(&conn, &th).unwrap();
        assert!(created.id.is_some());
        assert_eq!(created.filename, "doc.pdf");
        assert_eq!(created.status, TransferStatus::Pending);

        let fetched = get_history_by_id(&conn, created.id.unwrap()).unwrap().unwrap();
        assert_eq!(fetched.filename, "doc.pdf");
    }

    #[test]
    fn test_get_history_by_host() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let hid = host.id.unwrap();

        for i in 0..3 {
            let th = TransferHistory::new(
                hid,
                format!("file_{}.txt", i),
                format!("/r/file_{}.txt", i),
                format!("/l/file_{}.txt", i),
                TransferDirection::Download,
                100,
            );
            insert_history(&conn, &th).unwrap();
        }

        let results = get_history_by_host(&conn, hid).unwrap();
        assert_eq!(results.len(), 3);
    }

    #[test]
    fn test_update_history_status() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let th = TransferHistory::new(
            host.id.unwrap(),
            "x.bin".into(),
            "/r/x.bin".into(),
            "/l/x.bin".into(),
            TransferDirection::Upload,
            2000,
        );
        let created = insert_history(&conn, &th).unwrap();
        let id = created.id.unwrap();

        update_history_status(
            &conn,
            id,
            &TransferStatus::Success,
            2000,
            None,
            Some("2025-06-01 12:00:00"),
        )
        .unwrap();

        let fetched = get_history_by_id(&conn, id).unwrap().unwrap();
        assert_eq!(fetched.status, TransferStatus::Success);
        assert_eq!(fetched.transferred_size, 2000);
        assert_eq!(fetched.finished_at, Some("2025-06-01 12:00:00".into()));
    }

    #[test]
    fn test_update_history_status_failed() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let th = TransferHistory::new(
            host.id.unwrap(),
            "bad.zip".into(),
            "/r/bad.zip".into(),
            "/l/bad.zip".into(),
            TransferDirection::Download,
            5000,
        );
        let created = insert_history(&conn, &th).unwrap();
        let id = created.id.unwrap();

        update_history_status(
            &conn,
            id,
            &TransferStatus::Failed,
            1500,
            Some("connection reset"),
            Some("2025-06-01 13:00:00"),
        )
        .unwrap();

        let fetched = get_history_by_id(&conn, id).unwrap().unwrap();
        assert_eq!(fetched.status, TransferStatus::Failed);
        assert_eq!(fetched.error_message, Some("connection reset".into()));
    }

    #[test]
    fn test_clear_history() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let th = TransferHistory::new(
            host.id.unwrap(),
            "a.txt".into(),
            "/r/a".into(),
            "/l/a".into(),
            TransferDirection::Upload,
            10,
        );
        insert_history(&conn, &th).unwrap();

        let deleted = clear_history(&conn).unwrap();
        assert_eq!(deleted, 1);

        let all = get_all_history(&conn).unwrap();
        assert!(all.is_empty());
    }

    #[test]
    fn test_clear_history_by_host() {
        let conn = setup_db();
        let host1 = insert_test_host(&conn);
        let host2 = host_repo::insert(
            &conn,
            &Host::new("other".into(), "192.168.1.1".into(), 22, Protocol::Sftp, "user2".into()),
        )
        .unwrap();
        let hid1 = host1.id.unwrap();
        let hid2 = host2.id.unwrap();

        for i in 0..2 {
            let th = TransferHistory::new(
                hid1,
                format!("h1_{}.txt", i),
                format!("/r/h1_{}", i),
                format!("/l/h1_{}", i),
                TransferDirection::Upload,
                10,
            );
            insert_history(&conn, &th).unwrap();
        }
        let th2 = TransferHistory::new(
            hid2,
            "h2.txt".into(),
            "/r/h2".into(),
            "/l/h2".into(),
            TransferDirection::Download,
            20,
        );
        insert_history(&conn, &th2).unwrap();

        let deleted = clear_history_by_host(&conn, hid1).unwrap();
        assert_eq!(deleted, 2);

        let h1_history = get_history_by_host(&conn, hid1).unwrap();
        assert!(h1_history.is_empty());

        let h2_history = get_history_by_host(&conn, hid2).unwrap();
        assert_eq!(h2_history.len(), 1);
        assert_eq!(h2_history[0].filename, "h2.txt");
    }

    #[test]
    fn test_history_foreign_key() {
        let conn = setup_db();
        let th = TransferHistory::new(
            9999, // non-existent host_id
            "orphan.txt".into(),
            "/r".into(),
            "/l".into(),
            TransferDirection::Upload,
            10,
        );
        let result = insert_history(&conn, &th);
        assert!(result.is_err());
    }

    // ── Resume Record tests ──

    #[test]
    fn test_insert_and_get_resume() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let rr = ResumeRecord::new(
            "tid-001".into(),
            host.id.unwrap(),
            "/r/big.zip".into(),
            "/l/big.zip".into(),
            TransferDirection::Download,
            1_000_000,
        );
        let created = insert_resume(&conn, &rr).unwrap();
        assert!(created.id.is_some());
        assert_eq!(created.transfer_id, "tid-001");
        assert!(created.created_at.is_some());

        let fetched = get_resume_by_id(&conn, created.id.unwrap()).unwrap().unwrap();
        assert_eq!(fetched.transfer_id, "tid-001");
        assert_eq!(fetched.file_size, 1_000_000);
    }

    #[test]
    fn test_find_resume() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let hid = host.id.unwrap();
        let rr = ResumeRecord::new(
            "tid-002".into(),
            hid,
            "/r/data.bin".into(),
            "/l/data.bin".into(),
            TransferDirection::Upload,
            500_000,
        );
        insert_resume(&conn, &rr).unwrap();

        let found = find_resume(
            &conn,
            hid,
            "/r/data.bin",
            "/l/data.bin",
            &TransferDirection::Upload,
        )
        .unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().transfer_id, "tid-002");

        let not_found = find_resume(
            &conn,
            hid,
            "/r/other.bin",
            "/l/other.bin",
            &TransferDirection::Upload,
        )
        .unwrap();
        assert!(not_found.is_none());
    }

    #[test]
    fn test_update_resume_progress() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let rr = ResumeRecord::new(
            "tid-003".into(),
            host.id.unwrap(),
            "/r/x".into(),
            "/l/x".into(),
            TransferDirection::Download,
            10_000,
        );
        let created = insert_resume(&conn, &rr).unwrap();
        let id = created.id.unwrap();

        update_resume_progress(&conn, id, 5000, Some("abc123")).unwrap();

        let fetched = get_resume_by_id(&conn, id).unwrap().unwrap();
        assert_eq!(fetched.transferred_bytes, 5000);
        assert_eq!(fetched.checksum, Some("abc123".into()));
    }

    #[test]
    fn test_delete_resume() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let rr = ResumeRecord::new(
            "tid-del".into(),
            host.id.unwrap(),
            "/r/y".into(),
            "/l/y".into(),
            TransferDirection::Upload,
            100,
        );
        let created = insert_resume(&conn, &rr).unwrap();
        let id = created.id.unwrap();

        assert!(delete_resume(&conn, id).unwrap());
        assert!(get_resume_by_id(&conn, id).unwrap().is_none());
    }

    #[test]
    fn test_delete_resume_by_transfer() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let rr = ResumeRecord::new(
            "tid-batch".into(),
            host.id.unwrap(),
            "/r/z".into(),
            "/l/z".into(),
            TransferDirection::Download,
            200,
        );
        insert_resume(&conn, &rr).unwrap();

        assert!(delete_resume_by_transfer(&conn, "tid-batch").unwrap());
        assert!(!delete_resume_by_transfer(&conn, "tid-batch").unwrap());
    }

    #[test]
    fn test_resume_foreign_key() {
        let conn = setup_db();
        let rr = ResumeRecord::new(
            "tid-orphan".into(),
            9999,
            "/r".into(),
            "/l".into(),
            TransferDirection::Upload,
            10,
        );
        let result = insert_resume(&conn, &rr);
        assert!(result.is_err());
    }

    #[test]
    fn test_cascade_delete_cleans_history_and_resume() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let hid = host.id.unwrap();

        let th = TransferHistory::new(
            hid,
            "f.txt".into(),
            "/r/f.txt".into(),
            "/l/f.txt".into(),
            TransferDirection::Upload,
            100,
        );
        insert_history(&conn, &th).unwrap();

        let rr = ResumeRecord::new(
            "tid-cascade".into(),
            hid,
            "/r/f.txt".into(),
            "/l/f.txt".into(),
            TransferDirection::Upload,
            100,
        );
        insert_resume(&conn, &rr).unwrap();

        host_repo::delete(&conn, hid).unwrap();

        let history = get_history_by_host(&conn, hid).unwrap();
        assert!(history.is_empty());

        let resume = find_resume(
            &conn,
            hid,
            "/r/f.txt",
            "/l/f.txt",
            &TransferDirection::Upload,
        )
        .unwrap();
        assert!(resume.is_none());
    }
}
