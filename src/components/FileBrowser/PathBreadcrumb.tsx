import React, { useState, useCallback } from "react";
import { Breadcrumb, Input } from "antd";
import { HomeOutlined, EditOutlined } from "@ant-design/icons";

interface PathBreadcrumbProps {
  path: string;
  onNavigate: (path: string) => void;
}

const PathBreadcrumb: React.FC<PathBreadcrumbProps> = ({
  path,
  onNavigate,
}) => {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(path);

  const parts = path.split("/").filter(Boolean);

  const handleConfirm = useCallback(() => {
    setEditing(false);
    if (inputValue.trim()) {
      onNavigate(inputValue.trim());
    }
  }, [inputValue, onNavigate]);

  if (editing) {
    return (
      <Input
        size="small"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onPressEnter={handleConfirm}
        onBlur={handleConfirm}
        autoFocus
        style={{ width: "100%" }}
      />
    );
  }

  const items = [
    {
      title: <HomeOutlined />,
      onClick: () => onNavigate("/"),
      className: "cursor-pointer",
    },
    ...parts.map((part, i) => {
      const fullPath = "/" + parts.slice(0, i + 1).join("/");
      return {
        title: part,
        onClick: () => onNavigate(fullPath),
        className: "cursor-pointer",
      };
    }),
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        minHeight: 24,
      }}
    >
      <Breadcrumb
        items={items.map((item) => ({
          title: (
            <span
              onClick={item.onClick}
              style={{ cursor: "pointer" }}
            >
              {item.title}
            </span>
          ),
        }))}
        style={{ flex: 1, fontSize: 12 }}
      />
      <EditOutlined
        style={{ cursor: "pointer", fontSize: 12, color: "#999" }}
        onClick={() => {
          setInputValue(path);
          setEditing(true);
        }}
      />
    </div>
  );
};

export default PathBreadcrumb;
