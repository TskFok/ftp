import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import BookmarkPanel from "./index";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import { useHostStore } from "../../stores/hostStore";
import type { DirectoryBookmark } from "../../types";
import type { Host } from "../../types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockBookmarks: DirectoryBookmark[] = [
  {
    id: 1,
    host_id: 1,
    remote_dir: "/var/www",
    label: "web root",
  },
  {
    id: 2,
    host_id: 2,
    remote_dir: "/home",
    label: "home dir",
  },
];

const mockHosts: Host[] = [
  {
    id: 1,
    name: "服务器A",
    host: "192.168.1.1",
    port: 22,
    protocol: "sftp",
    username: "user",
  },
  {
    id: 2,
    name: "FTP主机",
    host: "10.0.0.1",
    port: 21,
    protocol: "ftp",
    username: "admin",
  },
];

function renderWithProvider(ui: React.ReactNode) {
  return render(<ConfigProvider locale={zhCN}>{ui}</ConfigProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  useBookmarkStore.setState({ bookmarks: mockBookmarks, loading: false });
  useHostStore.setState({ hosts: mockHosts });
});

describe("BookmarkPanel", () => {
  it("渲染收藏列表标题", () => {
    renderWithProvider(<BookmarkPanel />);

    expect(screen.getByText("收藏的目录")).toBeInTheDocument();
  });

  it("显示收藏列表", () => {
    renderWithProvider(<BookmarkPanel />);

    expect(screen.getByText("web root")).toBeInTheDocument();
    expect(screen.getByText("home dir")).toBeInTheDocument();
    expect(screen.getByText(/服务器A/)).toBeInTheDocument();
    expect(screen.getByText(/FTP主机/)).toBeInTheDocument();
  });

  it("空列表时显示空状态提示", async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    vi.mocked(invoke).mockResolvedValue([]);

    useBookmarkStore.setState({ bookmarks: [] });
    renderWithProvider(<BookmarkPanel />);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith("get_all_bookmarks");
    });

    await waitFor(() => {
      expect(
        screen.getByText(/暂无收藏，在远程目录中点击星标添加/)
      ).toBeInTheDocument();
    });
  });
});
