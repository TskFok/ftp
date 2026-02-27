use crate::db::bookmark_repo;
use crate::models::bookmark::DirectoryBookmark;
use crate::SharedDatabase;
use tauri::State;

#[tauri::command]
pub fn get_bookmarks(
    db: State<'_, SharedDatabase>,
    host_id: i64,
) -> Result<Vec<DirectoryBookmark>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    bookmark_repo::get_by_host(&conn, host_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_bookmarks(db: State<'_, SharedDatabase>) -> Result<Vec<DirectoryBookmark>, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    bookmark_repo::get_all(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn touch_bookmark(db: State<'_, SharedDatabase>, id: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    bookmark_repo::touch(&conn, id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn create_bookmark(
    db: State<'_, SharedDatabase>,
    bookmark: DirectoryBookmark,
) -> Result<DirectoryBookmark, String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    bookmark_repo::insert(&conn, &bookmark).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_bookmark(db: State<'_, SharedDatabase>, id: i64) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    bookmark_repo::delete(&conn, id)
        .map_err(|e| e.to_string())
        .map(|_| ())
}
