import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTransferStore } from "./transferStore";
import type { TransferHistoryItem, TransferProgress } from "../types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

const sampleHistory: TransferHistoryItem[] = [
  {
    id: 1,
    host_id: 1,
    filename: "test.txt",
    remote_path: "/remote/test.txt",
    local_path: "/local/test.txt",
    direction: "upload",
    file_size: 1024,
    transferred_size: 1024,
    status: "success",
    started_at: "2025-01-01 00:00:00",
  },
  {
    id: 2,
    host_id: 1,
    filename: "big.zip",
    remote_path: "/remote/big.zip",
    local_path: "/local/big.zip",
    direction: "download",
    file_size: 10000,
    transferred_size: 5000,
    status: "failed",
    error_message: "connection reset",
    started_at: "2025-01-02 00:00:00",
  },
];

const sampleProgress: TransferProgress = {
  transfer_id: "tid-001",
  filename: "data.csv",
  total_bytes: 5000,
  transferred_bytes: 2500,
  speed_bytes_per_sec: 1000,
  eta_seconds: 2.5,
  percentage: 50,
};

beforeEach(() => {
  vi.clearAllMocks();
  useTransferStore.setState({
    history: [],
    activeTransfers: [],
    loading: false,
  });
});

describe("transferStore", () => {
  describe("fetchHistory", () => {
    it("获取所有传输历史", async () => {
      mockInvoke.mockResolvedValueOnce(sampleHistory);

      await useTransferStore.getState().fetchHistory();

      expect(mockInvoke).toHaveBeenCalledWith("get_transfer_history", {
        hostId: null,
      });
      expect(useTransferStore.getState().history).toEqual(sampleHistory);
      expect(useTransferStore.getState().loading).toBe(false);
    });

    it("按主机筛选历史", async () => {
      mockInvoke.mockResolvedValueOnce([sampleHistory[0]]);

      await useTransferStore.getState().fetchHistory(1);

      expect(mockInvoke).toHaveBeenCalledWith("get_transfer_history", {
        hostId: 1,
      });
    });
  });

  describe("clearHistory", () => {
    it("清空历史记录", async () => {
      useTransferStore.setState({ history: sampleHistory });
      mockInvoke.mockResolvedValueOnce(undefined);

      await useTransferStore.getState().clearHistory();

      expect(mockInvoke).toHaveBeenCalledWith("clear_transfer_history");
      expect(useTransferStore.getState().history).toEqual([]);
    });
  });

  describe("updateProgress", () => {
    it("新增进度条目", () => {
      useTransferStore.getState().updateProgress(sampleProgress);

      expect(useTransferStore.getState().activeTransfers).toHaveLength(1);
      expect(useTransferStore.getState().activeTransfers[0]).toEqual(
        sampleProgress,
      );
    });

    it("更新已有进度", () => {
      useTransferStore.setState({ activeTransfers: [sampleProgress] });
      const updated = { ...sampleProgress, percentage: 75 };

      useTransferStore.getState().updateProgress(updated);

      expect(useTransferStore.getState().activeTransfers).toHaveLength(1);
      expect(useTransferStore.getState().activeTransfers[0].percentage).toBe(
        75,
      );
    });
  });

  describe("removeActiveTransfer", () => {
    it("移除指定传输", () => {
      useTransferStore.setState({ activeTransfers: [sampleProgress] });

      useTransferStore.getState().removeActiveTransfer("tid-001");

      expect(useTransferStore.getState().activeTransfers).toHaveLength(0);
    });

    it("移除不存在的传输不报错", () => {
      useTransferStore.setState({ activeTransfers: [sampleProgress] });

      useTransferStore.getState().removeActiveTransfer("nonexistent");

      expect(useTransferStore.getState().activeTransfers).toHaveLength(1);
    });
  });

  describe("startUpload", () => {
    it("调用 start_upload 命令", async () => {
      mockInvoke.mockResolvedValueOnce("tid-new");

      const id = await useTransferStore
        .getState()
        .startUpload(1, "/local/f.txt", "/remote/f.txt", "f.txt", 2048);

      expect(id).toBe("tid-new");
      expect(mockInvoke).toHaveBeenCalledWith("start_upload", {
        hostId: 1,
        localPath: "/local/f.txt",
        remotePath: "/remote/f.txt",
        filename: "f.txt",
        fileSize: 2048,
      });
    });
  });

  describe("startDownload", () => {
    it("调用 start_download 命令", async () => {
      mockInvoke.mockResolvedValueOnce("tid-dl");

      const id = await useTransferStore
        .getState()
        .startDownload(2, "/remote/d.zip", "/local/d.zip", "d.zip", 50000);

      expect(id).toBe("tid-dl");
      expect(mockInvoke).toHaveBeenCalledWith("start_download", {
        hostId: 2,
        remotePath: "/remote/d.zip",
        localPath: "/local/d.zip",
        filename: "d.zip",
        fileSize: 50000,
      });
    });
  });

  describe("cancelTransfer", () => {
    it("调用 cancel_transfer 命令", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await useTransferStore.getState().cancelTransfer("tid-001");

      expect(mockInvoke).toHaveBeenCalledWith("cancel_transfer", {
        transferId: "tid-001",
      });
    });
  });

  describe("retryTransfer", () => {
    it("调用 retry_transfer 命令", async () => {
      mockInvoke.mockResolvedValueOnce("tid-retry");

      const id = await useTransferStore.getState().retryTransfer(2);

      expect(id).toBe("tid-retry");
      expect(mockInvoke).toHaveBeenCalledWith("retry_transfer", {
        historyId: 2,
      });
    });
  });

  describe("startDirectoryUpload", () => {
    it("调用 start_directory_upload 命令", async () => {
      mockInvoke.mockResolvedValueOnce(["tid-1", "tid-2", "tid-3"]);

      const ids = await useTransferStore
        .getState()
        .startDirectoryUpload(1, "/local/mydir", "/remote/mydir");

      expect(ids).toEqual(["tid-1", "tid-2", "tid-3"]);
      expect(mockInvoke).toHaveBeenCalledWith("start_directory_upload", {
        hostId: 1,
        localDir: "/local/mydir",
        remoteDir: "/remote/mydir",
      });
    });

    it("空目录返回空数组", async () => {
      mockInvoke.mockResolvedValueOnce([]);

      const ids = await useTransferStore
        .getState()
        .startDirectoryUpload(1, "/local/empty", "/remote/empty");

      expect(ids).toEqual([]);
    });
  });

  describe("startDirectoryDownload", () => {
    it("调用 start_directory_download 命令", async () => {
      mockInvoke.mockResolvedValueOnce(["tid-dl-1", "tid-dl-2"]);

      const ids = await useTransferStore
        .getState()
        .startDirectoryDownload(2, "/remote/docs", "/local/docs");

      expect(ids).toEqual(["tid-dl-1", "tid-dl-2"]);
      expect(mockInvoke).toHaveBeenCalledWith("start_directory_download", {
        hostId: 2,
        remoteDir: "/remote/docs",
        localDir: "/local/docs",
      });
    });

    it("空目录返回空数组", async () => {
      mockInvoke.mockResolvedValueOnce([]);

      const ids = await useTransferStore
        .getState()
        .startDirectoryDownload(1, "/remote/empty", "/local/empty");

      expect(ids).toEqual([]);
    });
  });
});
