import React from "react";
import { Table, Dropdown } from "antd";
import type { MenuProps } from "antd";
import {
  FileOutlined,
  FolderOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderAddOutlined,
} from "@ant-design/icons";
import type { FileEntry } from "../../types";
import { formatFileSize, formatTimestamp } from "../../utils/formatters";

interface FileTableProps {
  files: FileEntry[];
  loading: boolean;
  selectedFiles: string[];
  onSelect: (paths: string[]) => void;
  onNavigate: (path: string) => void;
  onDelete?: (file: FileEntry) => void;
  onRename?: (file: FileEntry) => void;
  onCreateDir?: () => void;
}

const FileTable: React.FC<FileTableProps> = ({
  files,
  loading,
  selectedFiles,
  onSelect,
  onNavigate,
  onDelete,
  onRename,
  onCreateDir,
}) => {
  const contextMenuItems = (record: FileEntry): MenuProps["items"] => {
    const items: MenuProps["items"] = [];
    if (onRename) {
      items.push({
        key: "rename",
        icon: <EditOutlined />,
        label: "重命名",
        onClick: () => onRename(record),
      });
    }
    if (onDelete) {
      items.push({
        key: "delete",
        icon: <DeleteOutlined />,
        label: "删除",
        danger: true,
        onClick: () => onDelete(record),
      });
    }
    if (onCreateDir) {
      items.push({ type: "divider" });
      items.push({
        key: "mkdir",
        icon: <FolderAddOutlined />,
        label: "新建文件夹",
        onClick: () => onCreateDir(),
      });
    }
    return items;
  };

  const columns = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      render: (name: string, record: FileEntry) => (
        <span style={{ cursor: record.is_dir ? "pointer" : "default" }}>
          {record.is_dir ? (
            <FolderOutlined style={{ color: "#faad14", marginRight: 6 }} />
          ) : (
            <FileOutlined style={{ color: "#1890ff", marginRight: 6 }} />
          )}
          {name}
        </span>
      ),
    },
    {
      title: "大小",
      dataIndex: "size",
      key: "size",
      width: 90,
      render: (size: number, record: FileEntry) =>
        record.is_dir ? "--" : formatFileSize(size),
    },
    {
      title: "修改时间",
      dataIndex: "modified",
      key: "modified",
      width: 150,
      render: (modified: string | undefined) => {
        if (!modified) return "--";
        const ts = Number(modified);
        if (!isNaN(ts)) {
          return formatTimestamp(new Date(ts * 1000).toISOString());
        }
        return formatTimestamp(modified);
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={files}
      loading={loading}
      size="small"
      rowKey="path"
      pagination={false}
      scroll={{ y: "calc(100vh - 340px)" }}
      rowSelection={{
        selectedRowKeys: selectedFiles,
        onChange: (keys) => onSelect(keys as string[]),
      }}
      onRow={(record) => ({
        onDoubleClick: () => {
          if (record.is_dir) {
            onNavigate(record.path);
          }
        },
      })}
      components={{
        body: {
          row: (props: React.HTMLAttributes<HTMLTableRowElement> & { "data-row-key"?: string }) => {
            const file = files.find((f) => f.path === props["data-row-key"]);
            if (!file) return <tr {...props} />;
            return (
              <Dropdown
                menu={{ items: contextMenuItems(file) }}
                trigger={["contextMenu"]}
              >
                <tr {...props} />
              </Dropdown>
            );
          },
        },
      }}
    />
  );
};

export default FileTable;
