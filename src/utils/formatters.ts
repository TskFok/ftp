export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatFileSize(bytesPerSec)}/s`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return "--";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.ceil(seconds % 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function formatTimestamp(ts?: string): string {
  if (!ts) return "--";
  try {
    let input = ts;
    if (!ts.includes("T") && !ts.includes("Z") && !ts.includes("+")) {
      input = ts.replace(" ", "T") + "Z";
    }
    const d = new Date(input);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  } catch {
    return ts;
  }
}
