import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Host } from "../types";

interface HostState {
  hosts: Host[];
  currentHost: Host | null;
  loading: boolean;
  fetchHosts: () => Promise<void>;
  createHost: (host: Host) => Promise<Host>;
  updateHost: (host: Host) => Promise<void>;
  deleteHost: (id: number) => Promise<void>;
  setCurrentHost: (host: Host | null) => void;
  testConnection: (host: Host) => Promise<void>;
}

export const useHostStore = create<HostState>((set, get) => ({
  hosts: [],
  currentHost: null,
  loading: false,

  fetchHosts: async () => {
    set({ loading: true });
    try {
      const hosts = await invoke<Host[]>("get_hosts");
      set({ hosts });
    } finally {
      set({ loading: false });
    }
  },

  createHost: async (host: Host) => {
    const created = await invoke<Host>("create_host", { host });
    await get().fetchHosts();
    return created;
  },

  updateHost: async (host: Host) => {
    await invoke("update_host", { host });
    await get().fetchHosts();
  },

  deleteHost: async (id: number) => {
    await invoke("delete_host", { id });
    const current = get().currentHost;
    if (current?.id === id) {
      set({ currentHost: null });
    }
    await get().fetchHosts();
  },

  setCurrentHost: (host) => set({ currentHost: host }),

  testConnection: async (host: Host) => {
    await invoke("test_connection", { host });
  },
}));
