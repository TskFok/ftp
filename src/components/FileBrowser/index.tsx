import React, { useCallback, useEffect, useState } from "react";
import { Col, Row, message, Modal, Input } from "antd";
import { useFileBrowser } from "../../hooks/useFileBrowser";
import { useBookmarkStore } from "../../stores/bookmarkStore";
import FilePanel from "./FilePanel";
import TransferActionBar from "./TransferActionBar";

const FileBrowser: React.FC = () => {
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
    navigateLocal,
    navigateLocalUp,
    navigateRemote,
    navigateRemoteUp,
    setSelectedLocalFiles,
    setSelectedRemoteFiles,
    refreshLocal,
    refreshRemote,
  } = useFileBrowser();
  const { createBookmark } = useBookmarkStore();

  const [bookmarkModal, setBookmarkModal] = useState<{
    hostId: number;
    path: string;
    label: string;
  } | null>(null);

  const handleAddBookmark = useCallback((hostId: number, path: string) => {
    const normPath = path.replace(/\/+$/, "") || "/";
    const defaultLabel =
      normPath === "/"
        ? "根目录"
        : normPath.split("/").filter(Boolean).pop() || "未命名";
    setBookmarkModal({ hostId, path: normPath, label: defaultLabel });
  }, []);

  const handleBookmarkModalOk = useCallback(async () => {
    if (!bookmarkModal) return;
    const { hostId, path, label } = bookmarkModal;
    if (!label.trim()) return;
    try {
      await createBookmark({
        host_id: hostId,
        remote_dir: path,
        label: label.trim(),
      });
      message.success("已添加收藏");
      setBookmarkModal(null);
    } catch (err) {
      message.error(`添加失败: ${err}`);
    }
  }, [bookmarkModal, createBookmark]);

  const handleBookmarkModalCancel = useCallback(() => {
    setBookmarkModal(null);
  }, []);

  useEffect(() => {
    if (!localPath) {
      const home =
        typeof window !== "undefined"
          ? "/Users"
          : "/";
      navigateLocal(home);
    }
  }, [localPath, navigateLocal]);

  return (
    <>
    <Row gutter={0} style={{ height: "calc(100vh - 200px)" }} wrap={false}>
      <Col flex="1" style={{ minWidth: 0 }}>
        <FilePanel
          title="本地文件"
          mode="local"
          path={localPath}
          files={localFiles}
          loading={localLoading}
          selectedFiles={selectedLocalFiles}
          onNavigate={navigateLocal}
          onNavigateUp={navigateLocalUp}
          onRefresh={refreshLocal}
          onSelect={setSelectedLocalFiles}
        />
      </Col>
      <Col
        flex="40px"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TransferActionBar />
      </Col>
      <Col flex="1" style={{ minWidth: 0 }}>
        <FilePanel
          title="远程文件"
          mode="remote"
          path={remotePath}
          files={remoteFiles}
          loading={remoteLoading}
          selectedFiles={selectedRemoteFiles}
          hostId={connectedHostId}
          onNavigate={navigateRemote}
          onNavigateUp={navigateRemoteUp}
          onRefresh={refreshRemote}
          onSelect={setSelectedRemoteFiles}
          onAddBookmark={handleAddBookmark}
        />
      </Col>
    </Row>

    <Modal
      title="添加收藏"
      open={!!bookmarkModal}
      onOk={handleBookmarkModalOk}
      onCancel={handleBookmarkModalCancel}
      okText="添加"
      cancelText="取消"
      destroyOnClose
    >
      {bookmarkModal && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 8 }}>收藏名称</div>
          <Input
            placeholder="输入收藏名称"
            value={bookmarkModal.label}
            onChange={(e) =>
              setBookmarkModal((prev) =>
                prev ? { ...prev, label: e.target.value } : null
              )
            }
            onPressEnter={handleBookmarkModalOk}
            autoFocus
          />
          <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>
            路径: {bookmarkModal.path}
          </div>
        </div>
      )}
    </Modal>
    </>
  );
};

export default FileBrowser;
