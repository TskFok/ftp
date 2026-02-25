use crate::db::host_repo;
use crate::models::host::Host;
use crate::services::connection::{ConnectionManager, FileEntry};
use crate::SharedDatabase;
use tauri::State;

#[tauri::command]
pub async fn connect_host(
    host_id: i64,
    db: State<'_, SharedDatabase>,
    manager: State<'_, ConnectionManager>,
) -> Result<(), String> {
    let host = {
        let conn = db.conn.lock().map_err(|e| e.to_string())?;
        host_repo::get_by_id(&conn, host_id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Host {} not found", host_id))?
    };

    let manager = manager.inner().clone();
    tokio::task::spawn_blocking(move || manager.connect(&host))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn disconnect_host(
    host_id: i64,
    manager: State<'_, ConnectionManager>,
) -> Result<(), String> {
    let manager = manager.inner().clone();
    tokio::task::spawn_blocking(move || manager.disconnect(host_id))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn test_connection(host: Host) -> Result<(), String> {
    tokio::task::spawn_blocking(move || ConnectionManager::test_connection(&host))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn connection_status(
    host_id: i64,
    manager: State<'_, ConnectionManager>,
) -> Result<bool, String> {
    Ok(manager.is_connected(host_id))
}

#[tauri::command]
pub fn active_connections(
    manager: State<'_, ConnectionManager>,
) -> Result<Vec<i64>, String> {
    manager.active_connections()
}

#[tauri::command]
pub async fn list_remote_dir(
    host_id: i64,
    path: String,
    manager: State<'_, ConnectionManager>,
) -> Result<Vec<FileEntry>, String> {
    let conn = manager.get_connection(host_id)?;
    tokio::task::spawn_blocking(move || {
        let mut conn = conn.lock().map_err(|e| e.to_string())?;
        conn.list_dir(&path)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn create_remote_dir(
    host_id: i64,
    path: String,
    manager: State<'_, ConnectionManager>,
) -> Result<(), String> {
    let conn = manager.get_connection(host_id)?;
    tokio::task::spawn_blocking(move || {
        let mut conn = conn.lock().map_err(|e| e.to_string())?;
        conn.mkdir(&path)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_remote_file(
    host_id: i64,
    path: String,
    manager: State<'_, ConnectionManager>,
) -> Result<(), String> {
    let conn = manager.get_connection(host_id)?;
    tokio::task::spawn_blocking(move || {
        let mut conn = conn.lock().map_err(|e| e.to_string())?;
        conn.remove_file(&path)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_remote_dir(
    host_id: i64,
    path: String,
    manager: State<'_, ConnectionManager>,
) -> Result<(), String> {
    let conn = manager.get_connection(host_id)?;
    tokio::task::spawn_blocking(move || {
        let mut conn = conn.lock().map_err(|e| e.to_string())?;
        conn.remove_dir(&path)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn rename_remote(
    host_id: i64,
    from: String,
    to: String,
    manager: State<'_, ConnectionManager>,
) -> Result<(), String> {
    let conn = manager.get_connection(host_id)?;
    tokio::task::spawn_blocking(move || {
        let mut conn = conn.lock().map_err(|e| e.to_string())?;
        conn.rename(&from, &to)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn remote_file_exists(
    host_id: i64,
    path: String,
    manager: State<'_, ConnectionManager>,
) -> Result<bool, String> {
    let conn = manager.get_connection(host_id)?;
    tokio::task::spawn_blocking(move || {
        let mut conn = conn.lock().map_err(|e| e.to_string())?;
        conn.file_exists(&path)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn remote_file_size(
    host_id: i64,
    path: String,
    manager: State<'_, ConnectionManager>,
) -> Result<u64, String> {
    let conn = manager.get_connection(host_id)?;
    tokio::task::spawn_blocking(move || {
        let mut conn = conn.lock().map_err(|e| e.to_string())?;
        conn.file_size(&path)
    })
    .await
    .map_err(|e| e.to_string())?
}
