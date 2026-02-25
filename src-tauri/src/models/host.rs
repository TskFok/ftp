use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Protocol {
    #[serde(rename = "ftp")]
    Ftp,
    #[serde(rename = "sftp")]
    Sftp,
}

impl Protocol {
    pub fn as_str(&self) -> &'static str {
        match self {
            Protocol::Ftp => "ftp",
            Protocol::Sftp => "sftp",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s {
            "ftp" => Ok(Protocol::Ftp),
            "sftp" => Ok(Protocol::Sftp),
            _ => Err(format!("Unknown protocol: {}", s)),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Host {
    pub id: Option<i64>,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub protocol: Protocol,
    pub username: String,
    pub password: Option<String>,
    pub key_path: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

impl Host {
    pub fn new(
        name: String,
        host: String,
        port: u16,
        protocol: Protocol,
        username: String,
    ) -> Self {
        Self {
            id: None,
            name,
            host,
            port,
            protocol,
            username,
            password: None,
            key_path: None,
            created_at: None,
            updated_at: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_protocol_roundtrip() {
        assert_eq!(Protocol::from_str("ftp").unwrap(), Protocol::Ftp);
        assert_eq!(Protocol::from_str("sftp").unwrap(), Protocol::Sftp);
        assert!(Protocol::from_str("http").is_err());
        assert_eq!(Protocol::Ftp.as_str(), "ftp");
        assert_eq!(Protocol::Sftp.as_str(), "sftp");
    }

    #[test]
    fn test_protocol_serde() {
        let json = serde_json::to_string(&Protocol::Ftp).unwrap();
        assert_eq!(json, "\"ftp\"");
        let parsed: Protocol = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed, Protocol::Ftp);
    }

    #[test]
    fn test_host_new() {
        let host = Host::new(
            "test".into(),
            "example.com".into(),
            22,
            Protocol::Sftp,
            "admin".into(),
        );
        assert_eq!(host.id, None);
        assert_eq!(host.name, "test");
        assert_eq!(host.port, 22);
        assert_eq!(host.protocol, Protocol::Sftp);
        assert!(host.password.is_none());
        assert!(host.key_path.is_none());
    }

    #[test]
    fn test_host_serde_roundtrip() {
        let host = Host {
            id: Some(1),
            name: "my server".into(),
            host: "192.168.1.1".into(),
            port: 21,
            protocol: Protocol::Ftp,
            username: "user".into(),
            password: Some("pass".into()),
            key_path: None,
            created_at: Some("2025-01-01 00:00:00".into()),
            updated_at: Some("2025-01-01 00:00:00".into()),
        };
        let json = serde_json::to_string(&host).unwrap();
        let parsed: Host = serde_json::from_str(&json).unwrap();
        assert_eq!(host, parsed);
    }
}
