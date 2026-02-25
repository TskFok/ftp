import React from "react";
import { Modal, Space, Button } from "antd";
import { useOverwriteStore } from "../../stores/overwriteStore";

const OverwriteDialog: React.FC = () => {
  const { visible, currentFile, resolveAction, resolveOverwriteAll } =
    useOverwriteStore();

  if (!currentFile || !resolveAction) return null;

  return (
    <Modal
      title="文件已存在"
      open={visible}
      closable={false}
      footer={
        <Space>
          <Button
            onClick={() => resolveAction("overwrite")}
            type="primary"
            danger
          >
            覆盖
          </Button>
          <Button onClick={resolveOverwriteAll} type="primary" danger>
            全部覆盖
          </Button>
          <Button onClick={() => resolveAction("rename")}>重命名</Button>
          <Button onClick={() => resolveAction("skip")}>跳过</Button>
        </Space>
      }
    >
      <p>
        目标位置已存在文件 <strong>{currentFile.filename}</strong>，请选择操作：
      </p>
    </Modal>
  );
};

export default OverwriteDialog;
