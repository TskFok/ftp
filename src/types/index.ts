export type Protocol = "ftp" | "sftp";

export interface Host {
  id?: number;
  name: string;
  host: string;
  port: number;
  protocol: Protocol;
  username: string;
  password?: string;
  key_path?: string;
  created_at?: string;
  updated_at?: string;
}

export type TransferDirection = "upload" | "download";

export type TransferStatus =
  | "pending"
  | "transferring"
  | "success"
  | "failed"
  | "cancelled";

export interface TransferHistoryItem {
  id?: number;
  host_id: number;
  filename: string;
  remote_path: string;
  local_path: string;
  direction: TransferDirection;
  file_size: number;
  transferred_size: number;
  status: TransferStatus;
  error_message?: string;
  started_at?: string;
  finished_at?: string;
}

export interface DirectoryBookmark {
  id?: number;
  host_id: number;
  remote_dir?: string;
  local_dir?: string;
  label: string;
  last_used_at?: string;
}

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified?: string;
}

export interface TransferProgress {
  transfer_id: string;
  filename: string;
  total_bytes: number;
  transferred_bytes: number;
  speed_bytes_per_sec: number;
  eta_seconds: number;
  percentage: number;
}

export interface ResumeRecord {
  id?: number;
  transfer_id: string;
  host_id: number;
  remote_path: string;
  local_path: string;
  direction: TransferDirection;
  file_size: number;
  transferred_bytes: number;
  checksum?: string;
  created_at?: string;
}

export type OverwriteAction = "overwrite" | "skip" | "rename";

export interface TransferEvent {
  transfer_id: string;
  filename: string;
}

export interface TransferFailedEvent {
  transfer_id: string;
  filename: string;
  error: string;
}
