import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { message } from "antd";
import { useTransferStore } from "../stores/transferStore";
import { useFileBrowserStore } from "../stores/fileBrowserStore";
import type {
  TransferProgress,
  TransferEvent,
  TransferFailedEvent,
} from "../types";

export function useTransferListener() {
  const updateProgress = useTransferStore((s) => s.updateProgress);
  const removeActiveTransfer = useTransferStore(
    (s) => s.removeActiveTransfer,
  );
  const fetchHistory = useTransferStore((s) => s.fetchHistory);

  useEffect(() => {
    const unlistenProgress = listen<TransferProgress>(
      "transfer-progress",
      (event) => {
        updateProgress(event.payload);
      },
    );

    const unlistenComplete = listen<TransferEvent>(
      "transfer-complete",
      (event) => {
        removeActiveTransfer(event.payload.transfer_id);
        fetchHistory();
        message.success(`${event.payload.filename} 传输完成`);
        useFileBrowserStore.getState().refreshLocal();
        useFileBrowserStore.getState().refreshRemote();
      },
    );

    const unlistenFailed = listen<TransferFailedEvent>(
      "transfer-failed",
      (event) => {
        removeActiveTransfer(event.payload.transfer_id);
        fetchHistory();
        message.error(`${event.payload.filename} 传输失败: ${event.payload.error}`);
      },
    );

    const unlistenCancelled = listen<TransferEvent>(
      "transfer-cancelled",
      (event) => {
        removeActiveTransfer(event.payload.transfer_id);
        fetchHistory();
        message.info(`${event.payload.filename} 已取消`);
      },
    );

    return () => {
      unlistenProgress.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
      unlistenFailed.then((fn) => fn());
      unlistenCancelled.then((fn) => fn());
    };
  }, [updateProgress, removeActiveTransfer, fetchHistory]);
}
