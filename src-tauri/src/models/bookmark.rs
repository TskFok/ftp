use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DirectoryBookmark {
    pub id: Option<i64>,
    pub host_id: i64,
    pub remote_dir: Option<String>,
    pub local_dir: Option<String>,
    pub label: String,
    pub last_used_at: Option<String>,
}

impl DirectoryBookmark {
    pub fn new(host_id: i64, label: String) -> Self {
        Self {
            id: None,
            host_id,
            remote_dir: None,
            local_dir: None,
            label,
            last_used_at: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bookmark_new() {
        let bm = DirectoryBookmark::new(1, "my bookmark".into());
        assert_eq!(bm.id, None);
        assert_eq!(bm.host_id, 1);
        assert_eq!(bm.label, "my bookmark");
        assert!(bm.remote_dir.is_none());
        assert!(bm.local_dir.is_none());
    }

    #[test]
    fn test_bookmark_serde() {
        let bm = DirectoryBookmark {
            id: Some(10),
            host_id: 3,
            remote_dir: Some("/var/www".into()),
            local_dir: Some("/Users/me/www".into()),
            label: "web root".into(),
            last_used_at: Some("2025-06-01 12:00:00".into()),
        };
        let json = serde_json::to_string(&bm).unwrap();
        let parsed: DirectoryBookmark = serde_json::from_str(&json).unwrap();
        assert_eq!(bm, parsed);
    }
}
