import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useFileBrowserStore } from "../stores/fileBrowserStore";

export function useFileBrowser() {
  const {
    localPath,
    remotePath,
    localFiles,
    remoteFiles,
    localLoading,
    remoteLoading,
    selectedLocalFiles,
    selectedRemoteFiles,
    connectedHostId,
    fetchLocalFiles,
    fetchRemoteFiles,
    setLocalPath,
    setRemotePath,
    setConnectedHostId,
    setSelectedLocalFiles,
    setSelectedRemoteFiles,
    refreshLocal,
    refreshRemote,
  } = useFileBrowserStore();

  const navigateLocal = useCallback(
    async (path: string) => {
      setLocalPath(path);
      await fetchLocalFiles(path);
    },
    [setLocalPath, fetchLocalFiles],
  );

  const navigateLocalUp = useCallback(async () => {
    const parent = localPath.replace(/\/[^/]+\/?$/, "") || "/";
    await navigateLocal(parent);
  }, [localPath, navigateLocal]);

  const navigateRemote = useCallback(
    async (path: string) => {
      if (!connectedHostId) return;
      setRemotePath(path);
      await fetchRemoteFiles(connectedHostId, path);
    },
    [connectedHostId, setRemotePath, fetchRemoteFiles],
  );

  const navigateRemoteUp = useCallback(async () => {
    const parent = remotePath.replace(/\/[^/]+\/?$/, "") || "/";
    await navigateRemote(parent);
  }, [remotePath, navigateRemote]);

  const connectAndBrowse = useCallback(
    async (hostId: number) => {
      await invoke("connect_host", { hostId });
      setConnectedHostId(hostId);
      await fetchRemoteFiles(hostId, "/");
    },
    [setConnectedHostId, fetchRemoteFiles],
  );

  const navigateToBookmark = useCallback(
    async (bookmark: { host_id: number; remote_dir?: string | null }) => {
      const targetDir = bookmark.remote_dir || "/";
      if (connectedHostId !== bookmark.host_id) {
        if (connectedHostId) {
          await invoke("disconnect_host", { hostId: connectedHostId });
        }
        await invoke("connect_host", { hostId: bookmark.host_id });
        setConnectedHostId(bookmark.host_id);
      }
      await fetchRemoteFiles(bookmark.host_id, targetDir);
    },
    [connectedHostId, setConnectedHostId, fetchRemoteFiles]
  );

  const disconnectHost = useCallback(async () => {
    if (!connectedHostId) return;
    await invoke("disconnect_host", { hostId: connectedHostId });
    setConnectedHostId(null);
    useFileBrowserStore.setState({
      remoteFiles: [],
      remotePath: "/",
      selectedRemoteFiles: [],
    });
  }, [connectedHostId, setConnectedHostId]);

  return {
    localPath,
    remotePath,
    localFiles,
    remoteFiles,
    localLoading,
    remoteLoading,
    selectedLocalFiles,
    selectedRemoteFiles,
    connectedHostId,
    navigateLocal,
    navigateLocalUp,
    navigateRemote,
    navigateRemoteUp,
    connectAndBrowse,
    navigateToBookmark,
    disconnectHost,
    setLocalPath,
    setRemotePath,
    setSelectedLocalFiles,
    setSelectedRemoteFiles,
    refreshLocal,
    refreshRemote,
  };
}
