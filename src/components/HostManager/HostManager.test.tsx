import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import HostManager from "./index";
import { useHostStore } from "../../stores/hostStore";
import type { Host } from "../../types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

const sampleHosts: Host[] = [
  {
    id: 1,
    name: "生产服务器",
    host: "192.168.1.100",
    port: 22,
    protocol: "sftp",
    username: "admin",
    password: "secret",
  },
  {
    id: 2,
    name: "FTP 文件服务器",
    host: "10.0.0.1",
    port: 21,
    protocol: "ftp",
    username: "ftpuser",
  },
];

function renderWithProvider(ui: React.ReactNode) {
  return render(<ConfigProvider locale={zhCN}>{ui}</ConfigProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  useHostStore.setState({
    hosts: [],
    currentHost: null,
    loading: false,
  });
  mockInvoke.mockResolvedValue([]);
});

describe("HostManager", () => {
  it("渲染主机列表标题和新增按钮", async () => {
    renderWithProvider(<HostManager />);

    expect(screen.getByText("主机列表")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /新增/ })).toBeInTheDocument();
  });

  it("显示主机列表", async () => {
    mockInvoke.mockResolvedValue(sampleHosts);
    useHostStore.setState({ hosts: sampleHosts });

    renderWithProvider(<HostManager />);

    expect(screen.getByText("生产服务器")).toBeInTheDocument();
    expect(screen.getByText("FTP 文件服务器")).toBeInTheDocument();
  });

  it("空列表时显示空状态", async () => {
    mockInvoke.mockResolvedValue([]);

    renderWithProvider(<HostManager />);

    await waitFor(() => {
      expect(useHostStore.getState().loading).toBe(false);
    });
  });

  it("点击新增按钮弹出表单弹框", async () => {
    const user = userEvent.setup();
    renderWithProvider(<HostManager />);

    await user.click(screen.getByRole("button", { name: /新增/ }));

    await waitFor(() => {
      expect(screen.getByText("新增主机")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("名称")).toBeInTheDocument();
    expect(screen.getByLabelText("主机地址")).toBeInTheDocument();
    expect(screen.getByLabelText("端口")).toBeInTheDocument();
    expect(screen.getByLabelText("用户名")).toBeInTheDocument();
  });

  it("名称和用户名输入框禁用自动大写", async () => {
    const user = userEvent.setup();
    renderWithProvider(<HostManager />);

    await user.click(screen.getByRole("button", { name: /新增/ }));

    await waitFor(() => {
      expect(screen.getByText("新增主机")).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText("名称");
    const usernameInput = screen.getByLabelText("用户名");
    expect(nameInput).toHaveAttribute("autocapitalize", "none");
    expect(nameInput).toHaveAttribute("autocorrect", "off");
    expect(nameInput).toHaveAttribute("spellcheck", "false");
    expect(usernameInput).toHaveAttribute("autocapitalize", "none");
    expect(usernameInput).toHaveAttribute("autocorrect", "off");
    expect(usernameInput).toHaveAttribute("spellcheck", "false");
  });

  it("选中主机时更新 currentHost", async () => {
    mockInvoke.mockResolvedValue(sampleHosts);
    useHostStore.setState({ hosts: sampleHosts });

    renderWithProvider(<HostManager />);

    const item = screen.getByText("生产服务器");
    await act(async () => {
      item.closest("li")?.click();
    });

    expect(useHostStore.getState().currentHost).toEqual(sampleHosts[0]);
  });

  it("点击编辑按钮弹出编辑弹框", async () => {
    const user = userEvent.setup();
    mockInvoke.mockResolvedValue(sampleHosts);
    useHostStore.setState({ hosts: sampleHosts });

    renderWithProvider(<HostManager />);

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("编辑主机")).toBeInTheDocument();
    });
  });

  it("点击测试连接按钮调用 testConnectionById", async () => {
    const user = userEvent.setup();
    const sanitizedHosts = sampleHosts.map((h) => ({
      ...h,
      password: undefined,
      key_path: undefined,
    }));
    mockInvoke.mockResolvedValue(sanitizedHosts);
    useHostStore.setState({ hosts: sanitizedHosts });

    renderWithProvider(<HostManager />);

    const testButtons = screen.getAllByRole("button", { name: /api/i });
    mockInvoke.mockResolvedValueOnce(undefined);
    await user.click(testButtons[0]);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("test_connection_by_id", {
        hostId: 1,
      });
    });
  });
});
