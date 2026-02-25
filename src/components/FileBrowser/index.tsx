import React, { useEffect } from "react";
import { Col, Row } from "antd";
import { useFileBrowser } from "../../hooks/useFileBrowser";
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
        />
      </Col>
    </Row>
  );
};

export default FileBrowser;
