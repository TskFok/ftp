use rusqlite::{params, Connection};

use crate::models::bookmark::DirectoryBookmark;

pub fn insert(
    conn: &Connection,
    bookmark: &DirectoryBookmark,
) -> Result<DirectoryBookmark, rusqlite::Error> {
    conn.execute(
        "INSERT INTO directory_bookmarks (host_id, remote_dir, local_dir, label) \
         VALUES (?1, ?2, ?3, ?4)",
        params![
            bookmark.host_id,
            bookmark.remote_dir,
            bookmark.local_dir,
            bookmark.label,
        ],
    )?;
    let id = conn.last_insert_rowid();
    get_by_id(conn, id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
}

pub fn get_by_id(
    conn: &Connection,
    id: i64,
) -> Result<Option<DirectoryBookmark>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, host_id, remote_dir, local_dir, label, last_used_at \
         FROM directory_bookmarks WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], row_to_bookmark)?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn get_by_host(
    conn: &Connection,
    host_id: i64,
) -> Result<Vec<DirectoryBookmark>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, host_id, remote_dir, local_dir, label, last_used_at \
         FROM directory_bookmarks WHERE host_id = ?1 \
         ORDER BY last_used_at DESC NULLS LAST",
    )?;
    let rows = stmt.query_map(params![host_id], row_to_bookmark)?;
    rows.collect()
}

pub fn touch(conn: &Connection, id: i64) -> Result<bool, rusqlite::Error> {
    let changed = conn.execute(
        "UPDATE directory_bookmarks SET last_used_at = datetime('now') WHERE id = ?1",
        params![id],
    )?;
    Ok(changed > 0)
}

pub fn delete(conn: &Connection, id: i64) -> Result<bool, rusqlite::Error> {
    let changed = conn.execute(
        "DELETE FROM directory_bookmarks WHERE id = ?1",
        params![id],
    )?;
    Ok(changed > 0)
}

fn row_to_bookmark(row: &rusqlite::Row) -> Result<DirectoryBookmark, rusqlite::Error> {
    Ok(DirectoryBookmark {
        id: row.get(0)?,
        host_id: row.get(1)?,
        remote_dir: row.get(2)?,
        local_dir: row.get(3)?,
        label: row.get(4)?,
        last_used_at: row.get(5)?,
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
        let h = Host::new("bm-host".into(), "10.0.0.1".into(), 22, Protocol::Sftp, "u".into());
        host_repo::insert(conn, &h, None).unwrap()
    }

    #[test]
    fn test_insert_and_get() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let mut bm = DirectoryBookmark::new(host.id.unwrap(), "web root".into());
        bm.remote_dir = Some("/var/www".into());
        bm.local_dir = Some("/Users/me/www".into());

        let created = insert(&conn, &bm).unwrap();
        assert!(created.id.is_some());
        assert_eq!(created.label, "web root");
        assert_eq!(created.remote_dir, Some("/var/www".into()));

        let fetched = get_by_id(&conn, created.id.unwrap()).unwrap().unwrap();
        assert_eq!(fetched.label, "web root");
    }

    #[test]
    fn test_get_by_host() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let hid = host.id.unwrap();

        for i in 0..3 {
            let bm = DirectoryBookmark {
                id: None,
                host_id: hid,
                remote_dir: Some(format!("/dir/{}", i)),
                local_dir: None,
                label: format!("bm-{}", i),
                last_used_at: None,
            };
            insert(&conn, &bm).unwrap();
        }

        let all = get_by_host(&conn, hid).unwrap();
        assert_eq!(all.len(), 3);
    }

    #[test]
    fn test_touch() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let bm = DirectoryBookmark::new(host.id.unwrap(), "t".into());
        let created = insert(&conn, &bm).unwrap();
        let id = created.id.unwrap();

        assert!(created.last_used_at.is_none());

        touch(&conn, id).unwrap();
        let fetched = get_by_id(&conn, id).unwrap().unwrap();
        assert!(fetched.last_used_at.is_some());
    }

    #[test]
    fn test_delete() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let bm = DirectoryBookmark::new(host.id.unwrap(), "del".into());
        let created = insert(&conn, &bm).unwrap();
        let id = created.id.unwrap();

        assert!(delete(&conn, id).unwrap());
        assert!(get_by_id(&conn, id).unwrap().is_none());
    }

    #[test]
    fn test_delete_nonexistent() {
        let conn = setup_db();
        assert!(!delete(&conn, 9999).unwrap());
    }

    #[test]
    fn test_foreign_key_constraint() {
        let conn = setup_db();
        let bm = DirectoryBookmark::new(9999, "orphan".into());
        let result = insert(&conn, &bm);
        assert!(result.is_err());
    }

    #[test]
    fn test_cascade_delete() {
        let conn = setup_db();
        let host = insert_test_host(&conn);
        let hid = host.id.unwrap();
        let bm = DirectoryBookmark::new(hid, "cascade-test".into());
        insert(&conn, &bm).unwrap();

        host_repo::delete(&conn, hid).unwrap();

        let all = get_by_host(&conn, hid).unwrap();
        assert!(all.is_empty());
    }
}
