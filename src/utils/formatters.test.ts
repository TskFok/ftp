import { describe, it, expect } from "vitest";
import { formatFileSize, formatSpeed, formatDuration, formatTimestamp } from "./formatters";

describe("formatFileSize", () => {
  it("formats 0 bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1.0 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1073741824)).toBe("1.0 GB");
  });
});

describe("formatSpeed", () => {
  it("formats speed", () => {
    expect(formatSpeed(1024)).toBe("1.0 KB/s");
    expect(formatSpeed(1048576)).toBe("1.0 MB/s");
  });
});

describe("formatDuration", () => {
  it("formats seconds", () => {
    expect(formatDuration(30)).toBe("30s");
  });

  it("formats minutes", () => {
    expect(formatDuration(90)).toBe("1m 30s");
  });

  it("formats hours", () => {
    expect(formatDuration(3661)).toBe("1h 1m");
  });

  it("handles invalid values", () => {
    expect(formatDuration(-1)).toBe("--");
    expect(formatDuration(Infinity)).toBe("--");
  });
});

describe("formatTimestamp", () => {
  it("handles undefined", () => {
    expect(formatTimestamp(undefined)).toBe("--");
  });

  it("handles empty string", () => {
    expect(formatTimestamp("")).toBe("--");
  });

  it("formats ISO string with Z suffix to Shanghai time", () => {
    const result = formatTimestamp("2025-01-01T00:00:00Z");
    expect(result).toContain("2025/1/1");
    expect(result).toContain("08:00:00");
  });

  it("formats bare UTC timestamp to Shanghai time", () => {
    const result = formatTimestamp("2025-06-15 12:00:00");
    expect(result).toContain("2025/6/15");
    expect(result).toContain("20:00:00");
  });

  it("handles invalid timestamp gracefully", () => {
    expect(formatTimestamp("not-a-date")).toBe("not-a-date");
  });
});
