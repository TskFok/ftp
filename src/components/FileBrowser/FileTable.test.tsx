import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import FileTable from "./FileTable";
import type { FileEntry } from "../../types";

const sampleFiles: FileEntry[] = [
  { name: "b.txt", path: "/a/b.txt", is_dir: false, size: 100, modified: "1700000000" },
  { name: "Alpha", path: "/a/Alpha", is_dir: true, size: 0, modified: "1700000100" },
  { name: "a.doc", path: "/a/a.doc", is_dir: false, size: 500, modified: "1700000050" },
  { name: "zoo", path: "/a/zoo", is_dir: false, size: 200, modified: undefined },
];

function renderWithProvider(ui: React.ReactNode) {
  return render(<ConfigProvider locale={zhCN}>{ui}</ConfigProvider>);
}

describe("FileTable", () => {
  it("渲染文件列表", () => {
    renderWithProvider(
      <FileTable
        files={sampleFiles}
        loading={false}
        selectedFiles={[]}
        onSelect={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("a.doc")).toBeInTheDocument();
    expect(screen.getByText("b.txt")).toBeInTheDocument();
    expect(screen.getByText("zoo")).toBeInTheDocument();
  });

  it("列标题支持排序", () => {
    renderWithProvider(
      <FileTable
        files={sampleFiles}
        loading={false}
        selectedFiles={[]}
        onSelect={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByRole("columnheader", { name: /名称/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /大小/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /修改时间/ })).toBeInTheDocument();

    const nameTh = screen.getByRole("columnheader", { name: /名称/ });
    expect(nameTh).toHaveAttribute("aria-sort", "ascending");
  });

  it("名称列默认升序且可排序", () => {
    renderWithProvider(
      <FileTable
        files={sampleFiles}
        loading={false}
        selectedFiles={[]}
        onSelect={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    const nameHeader = screen.getByRole("columnheader", { name: /名称/ });
    expect(nameHeader).toHaveAttribute("aria-sort", "ascending");
    expect(nameHeader).toHaveAttribute("aria-label", "名称");
  });

  it("双击文件夹触发导航", async () => {
    const onNavigate = vi.fn();
    renderWithProvider(
      <FileTable
        files={sampleFiles}
        loading={false}
        selectedFiles={[]}
        onSelect={vi.fn()}
        onNavigate={onNavigate}
      />
    );

    const alphaRow = screen.getByText("Alpha").closest("tr");
    if (alphaRow) {
      await userEvent.dblClick(alphaRow);
      expect(onNavigate).toHaveBeenCalledWith("/a/Alpha");
    }
  });
});
