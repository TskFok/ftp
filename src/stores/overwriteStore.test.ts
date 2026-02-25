import { describe, it, expect, beforeEach } from "vitest";
import { useOverwriteStore } from "./overwriteStore";

beforeEach(() => {
  useOverwriteStore.setState({
    visible: false,
    currentFile: null,
    pendingQueue: [],
    resolveAction: null,
    overwriteAllActive: false,
  });
});

describe("overwriteStore", () => {
  const sampleFile = {
    hostId: 1,
    localPath: "/local/file.txt",
    remotePath: "/remote/file.txt",
    filename: "file.txt",
    fileSize: 1024,
    direction: "upload" as const,
  };

  describe("showDialog", () => {
    it("打开对话框并设置当前文件", () => {
      useOverwriteStore.getState().showDialog(sampleFile);

      const state = useOverwriteStore.getState();
      expect(state.visible).toBe(true);
      expect(state.currentFile).toEqual(sampleFile);
      expect(state.resolveAction).toBeTypeOf("function");
    });

    it("resolveAction 被调用后关闭对话框", async () => {
      const promise = useOverwriteStore.getState().showDialog(sampleFile);

      const { resolveAction } = useOverwriteStore.getState();
      resolveAction!("overwrite");

      const action = await promise;
      expect(action).toBe("overwrite");

      const state = useOverwriteStore.getState();
      expect(state.visible).toBe(false);
      expect(state.currentFile).toBeNull();
    });

    it("skip 操作返回 skip", async () => {
      const promise = useOverwriteStore.getState().showDialog(sampleFile);

      useOverwriteStore.getState().resolveAction!("skip");

      expect(await promise).toBe("skip");
    });

    it("rename 操作返回 rename", async () => {
      const promise = useOverwriteStore.getState().showDialog(sampleFile);

      useOverwriteStore.getState().resolveAction!("rename");

      expect(await promise).toBe("rename");
    });
  });

  describe("hideDialog", () => {
    it("关闭对话框", () => {
      useOverwriteStore.setState({
        visible: true,
        currentFile: sampleFile,
      });

      useOverwriteStore.getState().hideDialog();

      const state = useOverwriteStore.getState();
      expect(state.visible).toBe(false);
      expect(state.currentFile).toBeNull();
    });
  });

  describe("resolveOverwriteAll", () => {
    it("设置全部覆盖标志并解决当前对话框", async () => {
      const promise = useOverwriteStore.getState().showDialog(sampleFile);

      useOverwriteStore.getState().resolveOverwriteAll();

      const action = await promise;
      expect(action).toBe("overwrite");
      expect(useOverwriteStore.getState().overwriteAllActive).toBe(true);
      expect(useOverwriteStore.getState().visible).toBe(false);
    });

    it("全部覆盖激活后 showDialog 自动返回 overwrite", async () => {
      useOverwriteStore.setState({ overwriteAllActive: true });

      const action = await useOverwriteStore.getState().showDialog(sampleFile);

      expect(action).toBe("overwrite");
      expect(useOverwriteStore.getState().visible).toBe(false);
    });

    it("全部覆盖激活后连续多个文件都自动返回 overwrite", async () => {
      useOverwriteStore.setState({ overwriteAllActive: true });

      const file2 = { ...sampleFile, filename: "file2.txt" };
      const file3 = { ...sampleFile, filename: "file3.txt" };

      const action1 = await useOverwriteStore.getState().showDialog(sampleFile);
      const action2 = await useOverwriteStore.getState().showDialog(file2);
      const action3 = await useOverwriteStore.getState().showDialog(file3);

      expect(action1).toBe("overwrite");
      expect(action2).toBe("overwrite");
      expect(action3).toBe("overwrite");
    });
  });

  describe("resetOverwriteAll", () => {
    it("重置全部覆盖标志", () => {
      useOverwriteStore.setState({ overwriteAllActive: true });

      useOverwriteStore.getState().resetOverwriteAll();

      expect(useOverwriteStore.getState().overwriteAllActive).toBe(false);
    });

    it("重置后 showDialog 重新弹出对话框", () => {
      useOverwriteStore.setState({ overwriteAllActive: true });
      useOverwriteStore.getState().resetOverwriteAll();

      useOverwriteStore.getState().showDialog(sampleFile);

      expect(useOverwriteStore.getState().visible).toBe(true);
      expect(useOverwriteStore.getState().currentFile).toEqual(sampleFile);
    });
  });
});
