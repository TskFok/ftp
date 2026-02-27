use rusqlite::{params, Connection};

use crate::crypto::{decrypt, encrypt};
use crate::models::host::{Host, Protocol};

pub fn insert(
    conn: &Connection,
    host: &Host,
    encryption_key: Option<&[u8; 32]>,
) -> Result<Host, String> {
    let (password, key_path) = encrypt_fields(host, encryption_key)?;
    conn.execute(
        "INSERT INTO hosts (name, host, port, protocol, username, password, key_path) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            host.name,
            host.host,
            host.port,
            host.protocol.as_str(),
            host.username,
            password,
            key_path,
        ],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    get_by_id(conn, id, encryption_key)?
        .ok_or_else(|| "插入后查询失败".to_string())
}

pub fn get_by_id(
    conn: &Connection,
    id: i64,
    encryption_key: Option<&[u8; 32]>,
) -> Result<Option<Host>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, host, port, protocol, username, password, key_path, \
             created_at, updated_at FROM hosts WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query_map(params![id], |row| {
            let id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let host: String = row.get(2)?;
            let port: u16 = row.get(3)?;
            let protocol_str: String = row.get(4)?;
            let username: String = row.get(5)?;
            let password: Option<String> = row.get(6)?;
            let key_path: Option<String> = row.get(7)?;
            let created_at: Option<String> = row.get(8)?;
            let updated_at: Option<String> = row.get(9)?;
            Ok((
                id,
                name,
                host,
                port,
                protocol_str,
                username,
                password,
                key_path,
                created_at,
                updated_at,
            ))
        })
        .map_err(|e| e.to_string())?;
    match rows.next() {
        Some(Ok(row)) => {
            let (password, key_path) =
                decrypt_fields(row.6, row.7, encryption_key, conn, row.0)?;
            let protocol = Protocol::from_str(&row.4).map_err(|e| e.to_string())?;
            Ok(Some(Host {
                id: Some(row.0),
                name: row.1,
                host: row.2,
                port: row.3,
                protocol,
                username: row.5,
                password,
                key_path,
                created_at: row.8,
                updated_at: row.9,
            }))
        }
        Some(Err(e)) => Err(e.to_string()),
        None => Ok(None),
    }
}

pub fn get_all(conn: &Connection, encryption_key: Option<&[u8; 32]>) -> Result<Vec<Host>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, host, port, protocol, username, password, key_path, \
             created_at, updated_at FROM hosts ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows: Vec<_> = stmt
        .query_map([], |row| {
            let id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let host: String = row.get(2)?;
            let port: u16 = row.get(3)?;
            let protocol_str: String = row.get(4)?;
            let username: String = row.get(5)?;
            let password: Option<String> = row.get(6)?;
            let key_path: Option<String> = row.get(7)?;
            let created_at: Option<String> = row.get(8)?;
            let updated_at: Option<String> = row.get(9)?;
            Ok((
                id,
                name,
                host,
                port,
                protocol_str,
                username,
                password,
                key_path,
                created_at,
                updated_at,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    let mut hosts = Vec::new();
    for row in rows {
        let (password, key_path) =
            decrypt_fields(row.6, row.7, encryption_key, conn, row.0)?;
        let protocol = Protocol::from_str(&row.4).map_err(|e| e.to_string())?;
        hosts.push(Host {
            id: Some(row.0),
            name: row.1,
            host: row.2,
            port: row.3,
            protocol,
            username: row.5,
            password,
            key_path,
            created_at: row.8,
            updated_at: row.9,
        });
    }
    Ok(hosts)
}

pub fn update(
    conn: &Connection,
    host: &Host,
    encryption_key: Option<&[u8; 32]>,
) -> Result<bool, String> {
    let id = host.id.ok_or("Host 缺少 id")?;
    let needs_fallback = host.password.as_ref().map_or(true, |p| p.is_empty())
        || host.key_path.as_ref().map_or(true, |k| k.is_empty());
    let (password, key_path) = if needs_fallback {
        if let Some(existing) = get_by_id(conn, id, encryption_key)? {
            encrypt_fields_with_fallback(host, &existing, encryption_key)?
        } else {
            encrypt_fields(host, encryption_key)?
        }
    } else {
        encrypt_fields(host, encryption_key)?
    };
    let changed = conn
        .execute(
            "UPDATE hosts SET name = ?1, host = ?2, port = ?3, protocol = ?4, \
             username = ?5, password = ?6, key_path = ?7, updated_at = datetime('now') \
             WHERE id = ?8",
            params![
                host.name,
                host.host,
                host.port,
                host.protocol.as_str(),
                host.username,
                password,
                key_path,
                id,
            ],
        )
        .map_err(|e| e.to_string())?;
    Ok(changed > 0)
}

pub fn delete(conn: &Connection, id: i64) -> Result<bool, rusqlite::Error> {
    let changed = conn.execute("DELETE FROM hosts WHERE id = ?1", params![id])?;
    Ok(changed > 0)
}

fn encrypt_fields(
    host: &Host,
    key: Option<&[u8; 32]>,
) -> Result<(Option<String>, Option<String>), String> {
    let password = match (&host.password, key) {
        (Some(p), Some(k)) if !p.is_empty() => Some(encrypt(p, k)?),
        (Some(p), None) if !p.is_empty() => Some(p.clone()),
        _ => host.password.clone(),
    };
    let key_path = match (&host.key_path, key) {
        (Some(kp), Some(k)) if !kp.is_empty() => Some(encrypt(kp, k)?),
        (Some(kp), None) if !kp.is_empty() => Some(kp.clone()),
        _ => host.key_path.clone(),
    };
    Ok((password, key_path))
}

fn encrypt_fields_with_fallback(
    host: &Host,
    existing: &Host,
    key: Option<&[u8; 32]>,
) -> Result<(Option<String>, Option<String>), String> {
    let password = match (&host.password, key) {
        (Some(p), Some(k)) if !p.is_empty() => Some(encrypt(p, k)?),
        (Some(p), None) if !p.is_empty() => Some(p.clone()),
        _ => {
            if let Some(p) = &existing.password {
                match key {
                    Some(k) => Some(encrypt(p, k)?),
                    None => Some(p.clone()),
                }
            } else {
                None
            }
        }
    };
    let key_path = match (&host.key_path, key) {
        (Some(kp), Some(k)) if !kp.is_empty() => Some(encrypt(kp, k)?),
        (Some(kp), None) if !kp.is_empty() => Some(kp.clone()),
        _ => {
            if let Some(kp) = &existing.key_path {
                match key {
                    Some(k) => Some(encrypt(kp, k)?),
                    None => Some(kp.clone()),
                }
            } else {
                None
            }
        }
    };
    Ok((password, key_path))
}

fn decrypt_fields(
    password: Option<String>,
    key_path: Option<String>,
    key: Option<&[u8; 32]>,
    conn: &Connection,
    host_id: i64,
) -> Result<(Option<String>, Option<String>), String> {
    let dec_pass = match (password, key) {
        (Some(p), Some(k)) if p.starts_with("enc:") => Some(decrypt(&p, k)?),
        (Some(p), Some(k)) if !p.is_empty() => {
            let dec = decrypt(&p, k).unwrap_or(p);
            migrate_encrypt_field(conn, host_id, "password", &dec, k)?;
            Some(dec)
        }
        (p, _) => p,
    };
    let dec_kp = match (key_path, key) {
        (Some(kp), Some(k)) if kp.starts_with("enc:") => Some(decrypt(&kp, k)?),
        (Some(kp), Some(k)) if !kp.is_empty() => {
            let dec = decrypt(&kp, k).unwrap_or(kp.clone());
            migrate_encrypt_field(conn, host_id, "key_path", &dec, k)?;
            Some(dec)
        }
        (kp, _) => kp,
    };
    Ok((dec_pass, dec_kp))
}

fn migrate_encrypt_field(
    conn: &Connection,
    host_id: i64,
    column: &str,
    plaintext: &str,
    key: &[u8; 32],
) -> Result<(), String> {
    let encrypted = encrypt(plaintext, key)?;
    let sql = match column {
        "password" => "UPDATE hosts SET password = ?1 WHERE id = ?2",
        "key_path" => "UPDATE hosts SET key_path = ?1 WHERE id = ?2",
        _ => return Err("未知列".to_string()),
    };
    conn.execute(sql, params![encrypted, host_id])
        .map_err(|e| e.to_string())?;
    Ok(())
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
        let created = insert(&conn, &host, None).unwrap();

        assert!(created.id.is_some());
        assert_eq!(created.name, "My Server");
        assert!(created.created_at.is_some());
        assert!(created.updated_at.is_some());

        let fetched = get_by_id(&conn, created.id.unwrap(), None).unwrap().unwrap();
        assert_eq!(fetched.name, created.name);
        assert_eq!(fetched.host, "192.168.1.100");
    }

    #[test]
    fn test_get_by_id_not_found() {
        let conn = setup_db();
        let result = get_by_id(&conn, 9999, None).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_get_all() {
        let conn = setup_db();
        insert(&conn, &sample_host(), None).unwrap();

        let mut h2 =
            Host::new("FTP Box".into(), "10.0.0.1".into(), 21, Protocol::Ftp, "ftpuser".into());
        h2.password = Some("pass".into());
        insert(&conn, &h2, None).unwrap();

        let all = get_all(&conn, None).unwrap();
        assert_eq!(all.len(), 2);
    }

    #[test]
    fn test_update() {
        let conn = setup_db();
        let mut created = insert(&conn, &sample_host(), None).unwrap();
        created.name = "Updated Name".into();
        created.port = 2222;

        let ok = update(&conn, &created, None).unwrap();
        assert!(ok);

        let fetched = get_by_id(&conn, created.id.unwrap(), None).unwrap().unwrap();
        assert_eq!(fetched.name, "Updated Name");
        assert_eq!(fetched.port, 2222);
    }

    #[test]
    fn test_update_nonexistent() {
        let conn = setup_db();
        let mut host = sample_host();
        host.id = Some(9999);
        let ok = update(&conn, &host, None).unwrap();
        assert!(!ok);
    }

    #[test]
    fn test_delete() {
        let conn = setup_db();
        let created = insert(&conn, &sample_host(), None).unwrap();
        let id = created.id.unwrap();

        let ok = delete(&conn, id).unwrap();
        assert!(ok);

        let fetched = get_by_id(&conn, id, None).unwrap();
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

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let conn = setup_db();
        let key = [42u8; 32];
        let host = sample_host();
        let created = insert(&conn, &host, Some(&key)).unwrap();
        let fetched = get_by_id(&conn, created.id.unwrap(), Some(&key)).unwrap().unwrap();
        assert_eq!(fetched.password, Some("secret".into()));
        assert_eq!(fetched.name, "My Server");
    }
}
