use crate::db::host_repo;
use crate::models::host::Host;
use crate::validation::host::validate_host;
use crate::SharedDatabase;
use tauri::State;

#[tauri::command]
pub fn get_hosts(db: State<'_, SharedDatabase>) -> Result<Vec<Host>, String> {
    let key = db.encryption_key();
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    host_repo::get_all(&conn, key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_host(db: State<'_, SharedDatabase>, host: Host) -> Result<Host, String> {
    validate_host(&host)?;
    let key = db.encryption_key();
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    host_repo::insert(&conn, &host, key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_host(db: State<'_, SharedDatabase>, host: Host) -> Result<(), String> {
    validate_host(&host)?;
    let key = db.encryption_key();
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    host_repo::update(&conn, &host, key)
        .map_err(|e| e.to_string())
        .map(|_| ())
}

#[tauri::command]
pub fn delete_host(db: State<'_, SharedDatabase>, id: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    host_repo::delete(&conn, id)
        .map_err(|e| e.to_string())
        .map(|_| ())
}
