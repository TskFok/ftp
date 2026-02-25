use rusqlite::{params, Connection};

use crate::models::host::{Host, Protocol};

pub fn insert(conn: &Connection, host: &Host) -> Result<Host, rusqlite::Error> {
    conn.execute(
        "INSERT INTO hosts (name, host, port, protocol, username, password, key_path) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            host.name,
            host.host,
            host.port,
            host.protocol.as_str(),
            host.username,
            host.password,
            host.key_path,
        ],
    )?;
    let id = conn.last_insert_rowid();
    get_by_id(conn, id)?.ok_or(rusqlite::Error::QueryReturnedNoRows)
}

pub fn get_by_id(conn: &Connection, id: i64) -> Result<Option<Host>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, name, host, port, protocol, username, password, key_path, \
         created_at, updated_at FROM hosts WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], row_to_host)?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

pub fn get_all(conn: &Connection) -> Result<Vec<Host>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, name, host, port, protocol, username, password, key_path, \
         created_at, updated_at FROM hosts ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], row_to_host)?;
    rows.collect()
}

pub fn update(conn: &Connection, host: &Host) -> Result<bool, rusqlite::Error> {
    let changed = conn.execute(
        "UPDATE hosts SET name = ?1, host = ?2, port = ?3, protocol = ?4, \
         username = ?5, password = ?6, key_path = ?7, updated_at = datetime('now') \
         WHERE id = ?8",
        params![
            host.name,
            host.host,
            host.port,
            host.protocol.as_str(),
            host.username,
            host.password,
            host.key_path,
            host.id,
        ],
    )?;
    Ok(changed > 0)
}

pub fn delete(conn: &Connection, id: i64) -> Result<bool, rusqlite::Error> {
    let changed = conn.execute("DELETE FROM hosts WHERE id = ?1", params![id])?;
    Ok(changed > 0)
}

fn row_to_host(row: &rusqlite::Row) -> Result<Host, rusqlite::Error> {
    let protocol_str: String = row.get(4)?;
    let protocol = Protocol::from_str(&protocol_str)
        .map_err(|e| rusqlite::Error::FromSqlConversionFailure(4, rusqlite::types::Type::Text, Box::new(std::io::Error::new(std::io::ErrorKind::InvalidData, e))))?;

    Ok(Host {
        id: row.get(0)?,
        name: row.get(1)?,
        host: row.get(2)?,
        port: row.get(3)?,
        protocol,
        username: row.get(5)?,
        password: row.get(6)?,
        key_path: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrations;

    fn setup_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        migrations::run_all(&conn).unwrap();
        conn
    }

    fn sample_host() -> Host {
        let mut h = Host::new(
            "My Server".into(),
            "192.168.1.100".into(),
            22,
            Protocol::Sftp,
            "admin".into(),
        );
        h.password = Some("secret".into());
        h
    }

    #[test]
    fn test_insert_and_get_by_id() {
        let conn = setup_db();
        let host = sample_host();
        let created = insert(&conn, &host).unwrap();

        assert!(created.id.is_some());
        assert_eq!(created.name, "My Server");
        assert!(created.created_at.is_some());
        assert!(created.updated_at.is_some());

        let fetched = get_by_id(&conn, created.id.unwrap()).unwrap().unwrap();
        assert_eq!(fetched.name, created.name);
        assert_eq!(fetched.host, "192.168.1.100");
    }

    #[test]
    fn test_get_by_id_not_found() {
        let conn = setup_db();
        let result = get_by_id(&conn, 9999).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_get_all() {
        let conn = setup_db();
        insert(&conn, &sample_host()).unwrap();

        let mut h2 = Host::new("FTP Box".into(), "10.0.0.1".into(), 21, Protocol::Ftp, "ftpuser".into());
        h2.password = Some("pass".into());
        insert(&conn, &h2).unwrap();

        let all = get_all(&conn).unwrap();
        assert_eq!(all.len(), 2);
    }

    #[test]
    fn test_update() {
        let conn = setup_db();
        let mut created = insert(&conn, &sample_host()).unwrap();
        created.name = "Updated Name".into();
        created.port = 2222;

        let ok = update(&conn, &created).unwrap();
        assert!(ok);

        let fetched = get_by_id(&conn, created.id.unwrap()).unwrap().unwrap();
        assert_eq!(fetched.name, "Updated Name");
        assert_eq!(fetched.port, 2222);
    }

    #[test]
    fn test_update_nonexistent() {
        let conn = setup_db();
        let mut host = sample_host();
        host.id = Some(9999);
        let ok = update(&conn, &host).unwrap();
        assert!(!ok);
    }

    #[test]
    fn test_delete() {
        let conn = setup_db();
        let created = insert(&conn, &sample_host()).unwrap();
        let id = created.id.unwrap();

        let ok = delete(&conn, id).unwrap();
        assert!(ok);

        let fetched = get_by_id(&conn, id).unwrap();
        assert!(fetched.is_none());
    }

    #[test]
    fn test_delete_nonexistent() {
        let conn = setup_db();
        let ok = delete(&conn, 9999).unwrap();
        assert!(!ok);
    }

    #[test]
    fn test_insert_invalid_protocol_rejected() {
        let conn = setup_db();
        let result = conn.execute(
            "INSERT INTO hosts (name, host, port, protocol, username) VALUES (?1, ?2, ?3, ?4, ?5)",
            params!["bad", "host", 22, "http", "user"],
        );
        assert!(result.is_err());
    }
}
