import React, { useEffect } from "react";
import { Modal, Form, Input, InputNumber, Radio } from "antd";
import type { Host, Protocol } from "../../types";

interface HostFormModalProps {
  open: boolean;
  host: Host | null;
  confirmLoading?: boolean;
  onOk: (values: Host) => void;
  onCancel: () => void;
}

const HostFormModal: React.FC<HostFormModalProps> = ({
  open,
  host,
  confirmLoading,
  onOk,
  onCancel,
}) => {
  const [form] = Form.useForm<Host>();
  const protocol = Form.useWatch("protocol", form);

  useEffect(() => {
    if (open) {
      if (host) {
        form.setFieldsValue(host);
      } else {
        form.resetFields();
        form.setFieldsValue({ protocol: "sftp", port: 22 });
      }
    }
  }, [open, host, form]);

  const handleProtocolChange = (value: Protocol) => {
    form.setFieldsValue({ port: value === "sftp" ? 22 : 21 });
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (host?.id) {
        values.id = host.id;
      }
      onOk(values);
    } catch {
      // validation failed
    }
  };

  return (
    <Modal
      title={host ? "编辑主机" : "新增主机"}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={confirmLoading}
      destroyOnHidden
      width={520}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        autoCapitalize="none"
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="name"
          label="名称"
          rules={[{ required: true, message: "请输入主机名称" }]}
        >
          <Input
            placeholder="例如：生产服务器"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Form.Item>

        <Form.Item
          name="protocol"
          label="协议"
          rules={[{ required: true }]}
        >
          <Radio.Group onChange={(e) => handleProtocolChange(e.target.value)}>
            <Radio.Button value="sftp">SFTP</Radio.Button>
            <Radio.Button value="ftp">FTP</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item
            name="host"
            label="主机地址"
            rules={[{ required: true, message: "请输入主机地址" }]}
            style={{ flex: 1 }}
          >
            <Input placeholder="例如：192.168.1.100" />
          </Form.Item>

          <Form.Item
            name="port"
            label="端口"
            rules={[{ required: true, message: "请输入端口" }]}
            style={{ width: 120 }}
          >
            <InputNumber min={1} max={65535} style={{ width: "100%" }} />
          </Form.Item>
        </div>

        <Form.Item
          name="username"
          label="用户名"
          rules={[{ required: true, message: "请输入用户名" }]}
        >
          <Input
            placeholder="例如：root"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Form.Item>

        <Form.Item name="password" label="密码">
          <Input.Password placeholder="输入密码" />
        </Form.Item>

        {protocol === "sftp" && (
          <Form.Item name="key_path" label="密钥文件路径">
            <Input placeholder="例如：/Users/you/.ssh/id_rsa" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default HostFormModal;
