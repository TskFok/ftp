import { create } from "zustand";
import type { OverwriteAction } from "../types";

interface PendingTransfer {
  hostId: number;
  localPath: string;
  remotePath: string;
  filename: string;
  fileSize: number;
  direction: "upload" | "download";
}

interface OverwriteState {
  visible: boolean;
  currentFile: PendingTransfer | null;
  pendingQueue: PendingTransfer[];
  resolveAction: ((action: OverwriteAction) => void) | null;
  overwriteAllActive: boolean;

  showDialog: (file: PendingTransfer) => Promise<OverwriteAction>;
  hideDialog: () => void;
  resolveOverwriteAll: () => void;
  resetOverwriteAll: () => void;
}

export const useOverwriteStore = create<OverwriteState>((set, get) => ({
  visible: false,
  currentFile: null,
  pendingQueue: [],
  resolveAction: null,
  overwriteAllActive: false,

  showDialog: (file: PendingTransfer) => {
    if (get().overwriteAllActive) {
      return Promise.resolve("overwrite" as OverwriteAction);
    }
    return new Promise<OverwriteAction>((resolve) => {
      set({
        visible: true,
        currentFile: file,
        resolveAction: (action: OverwriteAction) => {
          set({ visible: false, currentFile: null, resolveAction: null });
          resolve(action);
        },
      });
    });
  },

  hideDialog: () => {
    set({ visible: false, currentFile: null, resolveAction: null });
  },

  resolveOverwriteAll: () => {
    const { resolveAction } = get();
    set({ overwriteAllActive: true });
    if (resolveAction) {
      resolveAction("overwrite");
    }
  },

  resetOverwriteAll: () => {
    set({ overwriteAllActive: false });
  },
}));
