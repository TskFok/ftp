import { describe, it, expect, vi, beforeEach } from "vitest";
import { useHostStore } from "./hostStore";
import type { Host } from "../types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
const mockInvoke = vi.mocked(invoke);

const sampleHost: Host = {
  id: 1,
  name: "Test Server",
  host: "192.168.1.1",
  port: 22,
  protocol: "sftp",
  username: "admin",
  password: "secret",
};

const sampleHost2: Host = {
  id: 2,
  name: "FTP Box",
  host: "10.0.0.1",
  port: 21,
  protocol: "ftp",
  username: "ftpuser",
};

beforeEach(() => {
  vi.clearAllMocks();
  useHostStore.setState({
    hosts: [],
    currentHost: null,
    loading: false,
  });
});

describe("hostStore", () => {
  describe("fetchHosts", () => {
    it("加载主机列表并更新状态", async () => {
      mockInvoke.mockResolvedValueOnce([sampleHost, sampleHost2]);

      await useHostStore.getState().fetchHosts();

      expect(mockInvoke).toHaveBeenCalledWith("get_hosts");
      expect(useHostStore.getState().hosts).toEqual([
        { ...sampleHost, password: undefined, key_path: undefined },
        { ...sampleHost2, password: undefined, key_path: undefined },
      ]);
      expect(useHostStore.getState().loading).toBe(false);
    });

    it("加载失败后 loading 恢复为 false", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("network error"));

      await expect(useHostStore.getState().fetchHosts()).rejects.toThrow();
      expect(useHostStore.getState().loading).toBe(false);
    });
  });

  describe("createHost", () => {
    it("创建主机并刷新列表", async () => {
      const newHost: Host = { ...sampleHost, id: undefined };
      mockInvoke
        .mockResolvedValueOnce(sampleHost) // create_host
        .mockResolvedValueOnce([sampleHost]); // get_hosts (refresh)

      const created = await useHostStore.getState().createHost(newHost);

      expect(mockInvoke).toHaveBeenCalledWith("create_host", { host: newHost });
      expect(created).toEqual(sampleHost);
      expect(useHostStore.getState().hosts).toEqual([
        { ...sampleHost, password: undefined, key_path: undefined },
      ]);
    });
  });

  describe("updateHost", () => {
    it("更新主机并刷新列表", async () => {
      const updated = { ...sampleHost, name: "Updated" };
      mockInvoke
        .mockResolvedValueOnce(undefined) // update_host
        .mockResolvedValueOnce([updated]); // get_hosts

      await useHostStore.getState().updateHost(updated);

      expect(mockInvoke).toHaveBeenCalledWith("update_host", { host: updated });
      expect(useHostStore.getState().hosts[0].name).toBe("Updated");
    });
  });

  describe("deleteHost", () => {
    it("删除主机并刷新列表", async () => {
      useHostStore.setState({ hosts: [sampleHost, sampleHost2] });
      mockInvoke
        .mockResolvedValueOnce(undefined) // delete_host
        .mockResolvedValueOnce([sampleHost2]); // get_hosts

      await useHostStore.getState().deleteHost(1);

      expect(mockInvoke).toHaveBeenCalledWith("delete_host", { id: 1 });
      expect(useHostStore.getState().hosts).toEqual([
        { ...sampleHost2, password: undefined, key_path: undefined },
      ]);
    });

    it("删除当前选中主机时清除 currentHost", async () => {
      useHostStore.setState({
        hosts: [sampleHost],
        currentHost: sampleHost,
      });
      mockInvoke
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([]);

      await useHostStore.getState().deleteHost(1);

      expect(useHostStore.getState().currentHost).toBeNull();
    });

    it("删除非当前选中主机时不清除 currentHost", async () => {
      useHostStore.setState({
        hosts: [sampleHost, sampleHost2],
        currentHost: sampleHost,
      });
      mockInvoke
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([sampleHost]);

      await useHostStore.getState().deleteHost(2);

      expect(useHostStore.getState().currentHost).toEqual(sampleHost);
    });
  });

  describe("setCurrentHost", () => {
    it("设置当前选中主机", () => {
      useHostStore.getState().setCurrentHost(sampleHost);
      expect(useHostStore.getState().currentHost).toEqual(sampleHost);
    });

    it("可以清除当前选中", () => {
      useHostStore.setState({ currentHost: sampleHost });
      useHostStore.getState().setCurrentHost(null);
      expect(useHostStore.getState().currentHost).toBeNull();
    });
  });

  describe("testConnection", () => {
    it("调用 test_connection 命令", async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await useHostStore.getState().testConnection(sampleHost);

      expect(mockInvoke).toHaveBeenCalledWith("test_connection", {
        host: sampleHost,
      });
    });

    it("连接失败时抛出错误", async () => {
      mockInvoke.mockRejectedValueOnce("Connection refused");

      await expect(
        useHostStore.getState().testConnection(sampleHost),
      ).rejects.toBe("Connection refused");
    });
  });
});
