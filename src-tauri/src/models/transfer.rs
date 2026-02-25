use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum TransferDirection {
    #[serde(rename = "upload")]
    Upload,
    #[serde(rename = "download")]
    Download,
}

impl TransferDirection {
    pub fn as_str(&self) -> &'static str {
        match self {
            TransferDirection::Upload => "upload",
            TransferDirection::Download => "download",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "upload" => Ok(TransferDirection::Upload),
            "download" => Ok(TransferDirection::Download),
            _ => Err(format!("Unknown direction: {}", s)),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum TransferStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "transferring")]
    Transferring,
    #[serde(rename = "success")]
    Success,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "cancelled")]
    Cancelled,
}

impl TransferStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            TransferStatus::Pending => "pending",
            TransferStatus::Transferring => "transferring",
            TransferStatus::Success => "success",
            TransferStatus::Failed => "failed",
            TransferStatus::Cancelled => "cancelled",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "pending" => Ok(TransferStatus::Pending),
            "transferring" => Ok(TransferStatus::Transferring),
            "success" => Ok(TransferStatus::Success),
            "failed" => Ok(TransferStatus::Failed),
            "cancelled" => Ok(TransferStatus::Cancelled),
            _ => Err(format!("Unknown status: {}", s)),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TransferHistory {
    pub id: Option<i64>,
    pub host_id: i64,
    pub filename: String,
    pub remote_path: String,
    pub local_path: String,
    pub direction: TransferDirection,
    pub file_size: u64,
    pub transferred_size: u64,
    pub status: TransferStatus,
    pub error_message: Option<String>,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
}

impl TransferHistory {
    pub fn new(
        host_id: i64,
        filename: String,
        remote_path: String,
        local_path: String,
        direction: TransferDirection,
        file_size: u64,
    ) -> Self {
        Self {
            id: None,
            host_id,
            filename,
            remote_path,
            local_path,
            direction,
            file_size,
            transferred_size: 0,
            status: TransferStatus::Pending,
            error_message: None,
            started_at: Some(chrono::Utc::now().format("%Y-%m-%d %H:%M:%S").to_string()),
            finished_at: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ResumeRecord {
    pub id: Option<i64>,
    pub transfer_id: String,
    pub host_id: i64,
    pub remote_path: String,
    pub local_path: String,
    pub direction: TransferDirection,
    pub file_size: u64,
    pub transferred_bytes: u64,
    pub checksum: Option<String>,
    pub created_at: Option<String>,
}

impl ResumeRecord {
    pub fn new(
        transfer_id: String,
        host_id: i64,
        remote_path: String,
        local_path: String,
        direction: TransferDirection,
        file_size: u64,
    ) -> Self {
        Self {
            id: None,
            transfer_id,
            host_id,
            remote_path,
            local_path,
            direction,
            file_size,
            transferred_bytes: 0,
            checksum: None,
            created_at: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TransferProgress {
    pub transfer_id: String,
    pub filename: String,
    pub total_bytes: u64,
    pub transferred_bytes: u64,
    pub speed_bytes_per_sec: f64,
    pub eta_seconds: f64,
    pub percentage: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_direction_roundtrip() {
        assert_eq!(
            TransferDirection::from_str("upload").unwrap(),
            TransferDirection::Upload
        );
        assert_eq!(
            TransferDirection::from_str("download").unwrap(),
            TransferDirection::Download
        );
        assert!(TransferDirection::from_str("sync").is_err());
        assert_eq!(TransferDirection::Upload.as_str(), "upload");
        assert_eq!(TransferDirection::Download.as_str(), "download");
    }

    #[test]
    fn test_status_roundtrip() {
        let statuses = [
            ("pending", TransferStatus::Pending),
            ("transferring", TransferStatus::Transferring),
            ("success", TransferStatus::Success),
            ("failed", TransferStatus::Failed),
            ("cancelled", TransferStatus::Cancelled),
        ];
        for (s, expected) in &statuses {
            assert_eq!(TransferStatus::from_str(s).unwrap(), *expected);
            assert_eq!(expected.as_str(), *s);
        }
        assert!(TransferStatus::from_str("unknown").is_err());
    }

    #[test]
    fn test_transfer_history_new() {
        let th = TransferHistory::new(
            1,
            "file.txt".into(),
            "/remote/file.txt".into(),
            "/local/file.txt".into(),
            TransferDirection::Upload,
            1024,
        );
        assert_eq!(th.id, None);
        assert_eq!(th.host_id, 1);
        assert_eq!(th.transferred_size, 0);
        assert_eq!(th.status, TransferStatus::Pending);
        assert!(th.error_message.is_none());
        assert!(th.started_at.is_some());
    }

    #[test]
    fn test_resume_record_new() {
        let rr = ResumeRecord::new(
            "uuid-123".into(),
            1,
            "/remote/big.zip".into(),
            "/local/big.zip".into(),
            TransferDirection::Download,
            1_000_000,
        );
        assert_eq!(rr.transfer_id, "uuid-123");
        assert_eq!(rr.transferred_bytes, 0);
        assert!(rr.checksum.is_none());
    }

    #[test]
    fn test_transfer_history_serde() {
        let th = TransferHistory::new(
            5,
            "data.csv".into(),
            "/srv/data.csv".into(),
            "/tmp/data.csv".into(),
            TransferDirection::Download,
            2048,
        );
        let json = serde_json::to_string(&th).unwrap();
        let parsed: TransferHistory = serde_json::from_str(&json).unwrap();
        assert_eq!(th, parsed);
    }
}
