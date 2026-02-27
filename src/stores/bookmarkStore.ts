import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { DirectoryBookmark } from "../types";

interface BookmarkState {
  bookmarks: DirectoryBookmark[];
  loading: boolean;
  fetchAll: () => Promise<void>;
  createBookmark: (bookmark: DirectoryBookmark) => Promise<DirectoryBookmark>;
  deleteBookmark: (id: number) => Promise<void>;
  touchBookmark: (id: number) => Promise<void>;
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true });
    try {
      const bookmarks = await invoke<DirectoryBookmark[]>("get_all_bookmarks");
      set({ bookmarks });
    } finally {
      set({ loading: false });
    }
  },

  createBookmark: async (bookmark: DirectoryBookmark) => {
    const created = await invoke<DirectoryBookmark>("create_bookmark", {
      bookmark,
    });
    await get().fetchAll();
    return created;
  },

  deleteBookmark: async (id: number) => {
    await invoke("delete_bookmark", { id });
    await get().fetchAll();
  },

  touchBookmark: async (id: number) => {
    await invoke("touch_bookmark", { id });
    await get().fetchAll();
  },
}));
