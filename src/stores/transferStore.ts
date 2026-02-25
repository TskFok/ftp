import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { TransferHistoryItem, TransferProgress } from "../types";

interface TransferState {
  history: TransferHistoryItem[];
  activeTransfers: TransferProgress[];
  loading: boolean;
  fetchHistory: (hostId?: number) => Promise<void>;
  clearHistory: () => Promise<void>;
  updateProgress: (progress: TransferProgress) => void;
  removeActiveTransfer: (transferId: string) => void;
  startUpload: (
    hostId: number,
    localPath: string,
    remotePath: string,
    filename: string,
    fileSize: number,
  ) => Promise<string>;
  startDownload: (
    hostId: number,
    remotePath: string,
    localPath: string,
    filename: string,
    fileSize: number,
  ) => Promise<string>;
  startDirectoryUpload: (
    hostId: number,
    localDir: string,
    remoteDir: string,
  ) => Promise<string[]>;
  startDirectoryDownload: (
    hostId: number,
    remoteDir: string,
    localDir: string,
  ) => Promise<string[]>;
  cancelTransfer: (transferId: string) => Promise<void>;
  retryTransfer: (historyId: number) => Promise<string>;
}

export const useTransferStore = create<TransferState>((set, _get) => ({
  history: [],
  activeTransfers: [],
  loading: false,

  fetchHistory: async (hostId?: number) => {
    set({ loading: true });
    try {
      const history = await invoke<TransferHistoryItem[]>(
        "get_transfer_history",
        { hostId: hostId ?? null },
      );
      set({ history });
    } finally {
      set({ loading: false });
    }
  },

  clearHistory: async () => {
    await invoke("clear_transfer_history");
    set({ history: [] });
  },

  updateProgress: (progress: TransferProgress) => {
    set((state) => {
      const existing = state.activeTransfers.findIndex(
        (t) => t.transfer_id === progress.transfer_id,
      );
      const updated = [...state.activeTransfers];
      if (existing >= 0) {
        updated[existing] = progress;
      } else {
        updated.push(progress);
      }
      return { activeTransfers: updated };
    });
  },

  removeActiveTransfer: (transferId: string) => {
    set((state) => ({
      activeTransfers: state.activeTransfers.filter(
        (t) => t.transfer_id !== transferId,
      ),
    }));
  },

  startUpload: async (hostId, localPath, remotePath, filename, fileSize) => {
    return await invoke<string>("start_upload", {
      hostId,
      localPath,
      remotePath,
      filename,
      fileSize,
    });
  },

  startDownload: async (hostId, remotePath, localPath, filename, fileSize) => {
    return await invoke<string>("start_download", {
      hostId,
      remotePath,
      localPath,
      filename,
      fileSize,
    });
  },

  startDirectoryUpload: async (hostId, localDir, remoteDir) => {
    return await invoke<string[]>("start_directory_upload", {
      hostId,
      localDir,
      remoteDir,
    });
  },

  startDirectoryDownload: async (hostId, remoteDir, localDir) => {
    return await invoke<string[]>("start_directory_download", {
      hostId,
      remoteDir,
      localDir,
    });
  },

  cancelTransfer: async (transferId) => {
    await invoke("cancel_transfer", { transferId });
  },

  retryTransfer: async (historyId) => {
    return await invoke<string>("retry_transfer", { historyId });
  },
}));
