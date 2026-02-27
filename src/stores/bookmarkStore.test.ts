import { describe, it, expect, vi, beforeEach } from "vitest";
import { useBookmarkStore } from "./bookmarkStore";
import type { DirectoryBookmark } from "../types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

const sampleBookmarks: DirectoryBookmark[] = [
  {
    id: 1,
    host_id: 1,
    remote_dir: "/var/www",
    label: "web root",
    last_used_at: "2025-01-01 12:00:00",
  },
  {
    id: 2,
    host_id: 1,
    remote_dir: "/home/user",
    label: "home",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  useBookmarkStore.setState({ bookmarks: [], loading: false });
});

describe("bookmarkStore", () => {
  it("fetchAll 加载全部收藏", async () => {
    mockInvoke.mockResolvedValue(sampleBookmarks);

    await useBookmarkStore.getState().fetchAll();

    expect(mockInvoke).toHaveBeenCalledWith("get_all_bookmarks");
    expect(useBookmarkStore.getState().bookmarks).toEqual(sampleBookmarks);
  });

  it("createBookmark 创建收藏", async () => {
    const newBm: DirectoryBookmark = {
      host_id: 1,
      remote_dir: "/tmp",
      label: "temp",
    };
    const created = { ...newBm, id: 3 };
    mockInvoke
      .mockResolvedValueOnce(created)
      .mockResolvedValueOnce([...sampleBookmarks, created]);

    const result = await useBookmarkStore.getState().createBookmark(newBm);

    expect(mockInvoke).toHaveBeenCalledWith("create_bookmark", {
      bookmark: newBm,
    });
    expect(result).toEqual(created);
    expect(mockInvoke).toHaveBeenCalledWith("get_all_bookmarks");
  });

  it("deleteBookmark 删除收藏", async () => {
    mockInvoke
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(sampleBookmarks.slice(1));

    await useBookmarkStore.getState().deleteBookmark(1);

    expect(mockInvoke).toHaveBeenCalledWith("delete_bookmark", { id: 1 });
    expect(mockInvoke).toHaveBeenCalledWith("get_all_bookmarks");
  });

  it("touchBookmark 更新最后使用时间", async () => {
    mockInvoke
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(sampleBookmarks);

    await useBookmarkStore.getState().touchBookmark(1);

    expect(mockInvoke).toHaveBeenCalledWith("touch_bookmark", { id: 1 });
    expect(mockInvoke).toHaveBeenCalledWith("get_all_bookmarks");
  });
});
