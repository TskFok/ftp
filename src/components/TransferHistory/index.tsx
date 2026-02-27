import React, { useEffect, useMemo } from "react";
import { Button, Card, Select, Space, Table, Tag, Tooltip, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  FolderOpenOutlined,
  CloudServerOutlined,
  RetweetOutlined,
  UploadOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { useTransferStore } from "../../stores/transferStore";
import { useHostStore } from "../../stores/hostStore";
import { useFileBrowserStore } from "../../stores/fileBrowserStore";
import { useFileBrowser } from "../../hooks/useFileBrowser";
import { formatFileSize, formatTimestamp } from "../../utils/formatters";
import type { TransferHistoryItem, TransferStatus } from "../../types";

const statusColors: Record<TransferStatus, string> = {
  pending: "default",
  transferring: "processing",
  success: "success",
  failed: "error",
  cancelled: "warning",
};

const statusLabels: Record<TransferStatus, string> = {
  pending: "等待中",
  transferring: "传输中",
  success: "成功",
  failed: "失败",
  cancelled: "已取消",
};

/** -1 表示查看全部链接的传输历史 */
const ALL_HOSTS = -1;

const TransferHistory: React.FC = () => {
  const { history, loading, fetchHistory, clearHistory, retryTransfer } =
    useTransferStore();
  const hosts = useHostStore((s) => s.hosts);
  const fetchHosts = useHostStore((s) => s.fetchHosts);
  const connectedHostId = useFileBrowserStore((s) => s.connectedHostId);
  const { navigateLocal, connectAndBrowse } = useFileBrowser();

  const [selectedHostId, setSelectedHostId] = React.useState<number>(ALL_HOSTS);

  useEffect(() => {
    if (connectedHostId != null) {
      setSelectedHostId(connectedHostId);
    }
  }, [connectedHostId]);

  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  useEffect(() => {
    fetchHistory(selectedHostId === ALL_HOSTS ? undefined : selectedHostId);
  }, [fetchHistory, selectedHostId]);

  const handleRetry = async (record: TransferHistoryItem) => {
    if (!record.id) return;
    try {
      await retryTransfer(record.id);
      message.success(`已重新提交 ${record.filename}`);
    } catch (err) {
      message.error(`重试失败: ${err}`);
    }
  };

  const handleNavigateLocal = (record: TransferHistoryItem) => {
    const dir = record.local_path.replace(/\/[^/]+$/, "") || "/";
    navigateLocal(dir);
  };

  const handleNavigateRemote = async (record: TransferHistoryItem) => {
    const dir = record.remote_path.replace(/\/[^/]+$/, "") || "/";
    try {
      await connectAndBrowse(record.host_id);
      const { useFileBrowserStore } = await import(
        "../../stores/fileBrowserStore"
      );
      const store = useFileBrowserStore.getState();
      await store.fetchRemoteFiles(record.host_id, dir);
      message.success("已导航到远程目录");
    } catch (err) {
      message.error(`导航失败: ${err}`);
    }
  };

  const displayHistory = history;

  const hostOptions = useMemo(
    () => [
      { label: "全部", value: ALL_HOSTS },
      ...hosts.map((h) => ({
        label: h.name,
        value: h.id!,
      })),
    ],
    [hosts],
  );

  const columns: ColumnsType<TransferHistoryItem> = [
    {
      title: "方向",
      dataIndex: "direction",
      key: "direction",
      width: 50,
      render: (d: string) =>
        d === "upload" ? (
          <Tooltip title="上传">
            <UploadOutlined style={{ color: "#1890ff" }} />
          </Tooltip>
        ) : (
          <Tooltip title="下载">
            <DownloadOutlined style={{ color: "#52c41a" }} />
          </Tooltip>
        ),
    },
    {
      title: "文件名",
      dataIndex: "filename",
      key: "filename",
      ellipsis: true,
    },
    {
      title: "大小",
      dataIndex: "file_size",
      key: "file_size",
      width: 90,
      render: (s: number) => formatFileSize(s),
    },
    {
      title: "本地路径",
      dataIndex: "local_path",
      key: "local_path",
      width: 160,
      ellipsis: true,
      render: (p: string) => (
        <Tooltip title={p}>
          <span style={{ fontSize: 12 }}>{p}</span>
        </Tooltip>
      ),
    },
    {
      title: "远程路径",
      dataIndex: "remote_path",
      key: "remote_path",
      width: 160,
      ellipsis: true,
      render: (p: string) => (
        <Tooltip title={p}>
          <span style={{ fontSize: 12 }}>{p}</span>
        </Tooltip>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 80,
      render: (s: TransferStatus) => (
        <Tag color={statusColors[s]}>{statusLabels[s]}</Tag>
      ),
    },
    {
      title: "时间",
      dataIndex: "started_at",
      key: "started_at",
      width: 150,
      render: (t: string) => (
        <span style={{ fontSize: 12 }}>{formatTimestamp(t)}</span>
      ),
    },
    {
      title: "操作",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space size={0}>
          {(record.status === "failed" || record.status === "cancelled") && (
            <Tooltip title="重试/续传">
              <Button
                type="text"
                size="small"
                icon={<RetweetOutlined />}
                onClick={() => handleRetry(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="打开本地目录">
            <Button
              type="text"
              size="small"
              icon={<FolderOpenOutlined />}
              onClick={() => handleNavigateLocal(record)}
            />
          </Tooltip>
          <Tooltip title="浏览远程目录">
            <Button
              type="text"
              size="small"
              icon={<CloudServerOutlined />}
              onClick={() => handleNavigateRemote(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="传输历史"
      size="small"
      style={{ marginTop: 16 }}
      extra={
        <Space>
          <Select
            placeholder="选择链接"
            allowClear
            size="small"
            style={{ width: 140 }}
            options={hostOptions}
            value={selectedHostId}
            onChange={(v) => setSelectedHostId(v)}
          />
          <Button
            size="small"
            onClick={() =>
              clearHistory(
                selectedHostId === ALL_HOSTS ? undefined : selectedHostId,
              )
            }
            disabled={displayHistory.length === 0}
          >
            清空
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={displayHistory}
        loading={loading}
        size="small"
        rowKey="id"
        pagination={{ pageSize: 10, size: "small" }}
      />
    </Card>
  );
};

export default TransferHistory;
