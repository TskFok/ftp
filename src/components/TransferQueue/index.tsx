import React from "react";
import { Button, Card, List, Progress, Tooltip, Typography } from "antd";
import {
  CloseCircleOutlined,
  UploadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useTransferStore } from "../../stores/transferStore";
import {
  formatFileSize,
  formatSpeed,
  formatDuration,
} from "../../utils/formatters";

const { Text } = Typography;

const TransferQueue: React.FC = () => {
  const activeTransfers = useTransferStore((s) => s.activeTransfers);
  const cancelTransfer = useTransferStore((s) => s.cancelTransfer);

  if (activeTransfers.length === 0) return null;

  const totalBytes = activeTransfers.reduce(
    (sum, t) => sum + t.total_bytes,
    0,
  );
  const totalTransferred = activeTransfers.reduce(
    (sum, t) => sum + t.transferred_bytes,
    0,
  );
  const overallPercent =
    totalBytes > 0 ? Math.round((totalTransferred / totalBytes) * 100) : 0;

  return (
    <Card
      title={
        <span>
          传输队列
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
            {activeTransfers.length} 个任务 · {formatFileSize(totalTransferred)}{" "}
            / {formatFileSize(totalBytes)} ({overallPercent}%)
          </Text>
        </span>
      }
      size="small"
      style={{ marginTop: 16 }}
    >
      <List
        dataSource={activeTransfers}
        size="small"
        renderItem={(item) => (
          <List.Item
            actions={[
              <Tooltip title="取消" key="cancel">
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<CloseCircleOutlined />}
                  onClick={() => cancelTransfer(item.transfer_id)}
                />
              </Tooltip>,
            ]}
          >
            <div style={{ width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <span>
                  {item.filename.includes("upload") ||
                  item.transfer_id.includes("upload") ? (
                    <UploadOutlined style={{ marginRight: 4, color: "#1890ff" }} />
                  ) : (
                    <DownloadOutlined
                      style={{ marginRight: 4, color: "#52c41a" }}
                    />
                  )}
                  {item.filename}
                </span>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatFileSize(item.transferred_bytes)} /{" "}
                  {formatFileSize(item.total_bytes)} ·{" "}
                  {formatSpeed(item.speed_bytes_per_sec)} ·{" "}
                  {formatDuration(item.eta_seconds)}
                </Text>
              </div>
              <Progress
                percent={Math.round(item.percentage)}
                size="small"
                status="active"
              />
            </div>
          </List.Item>
        )}
      />
    </Card>
  );
};

export default TransferQueue;
