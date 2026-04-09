import { describe, expect, it } from "vitest";
import { detectFormat, detectWithConfidence } from "../detector";

function buildNginxLines(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    return `192.168.1.${index} - - [10/Oct/2024:13:55:${String(index)
      .padStart(2, "0")} -0700] "GET /api/${index} HTTP/1.1" 200 ${200 + index} "-" "Mozilla/5.0"`;
  });
}

function buildSyslogLines(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    return `Jan ${String((index % 9) + 1).padStart(2, " ")} 10:30:${String(index)
      .padStart(2, "0")} host${index % 3} sshd[${1000 + index}]: Accepted publickey`;
  });
}

describe("detectFormat", () => {
  it("detects nginx access logs from a 20-line sample", () => {
    const result = detectFormat(buildNginxLines(20));

    expect(result.format.name).toBe("nginx_access");
    expect(result.matchedLines).toBe(20);
    expect(result.confidence).toBe(1);
  });

  it("detects syslog from a 20-line sample", () => {
    const result = detectFormat(buildSyslogLines(20));

    expect(result.format.name).toBe("syslog");
    expect(result.matchedLines).toBe(20);
  });

  it("ignores leading comment lines", () => {
    const lines = ["# comment", "# another comment", ...buildNginxLines(20)];

    const result = detectFormat(lines);

    expect(result.format.name).toBe("nginx_access");
    expect(result.sampledLines).toBe(20);
  });

  it("returns the generic fallback for an empty file", () => {
    const result = detectFormat([]);

    expect(result.format.name).toBe("generic");
    expect(result.confidence).toBe(0);
  });

  it("handles a one-line file without crashing", () => {
    const result = detectFormat([
      '127.0.0.1 - - [10/Oct/2024:13:55:36 -0700] "GET / HTTP/1.1" 200 123 "-" "curl/8.0"',
    ]);

    expect(result.format.name).toBe("nginx_access");
    expect(result.sampledLines).toBe(1);
  });

  it("picks the majority format in a mixed file", () => {
    const lines = [
      ...buildSyslogLines(12),
      ...buildNginxLines(8),
    ];

    const result = detectFormat(lines);

    expect(result.format.name).toBe("syslog");
    expect(result.matchedLines).toBe(12);
  });

  it("falls back to generic when confidence stays below the threshold", () => {
    const lines = [
      ...buildNginxLines(6),
      ..."plain text line\nanother plain text line\nthird plain text line\nfourth plain text line\nfifth plain text line\nsixth plain text line\nseventh plain text line\neighth plain text line\nninth plain text line\nplain text line ten\nplain text line eleven\nplain text line twelve\nplain text line thirteen\nplain text line fourteen".split(
        "\n"
      ),
    ];

    const result = detectFormat(lines);

    expect(result.format.name).toBe("generic");
    expect(result.confidence).toBe(0);
  });

  it("uses real JSON parsing instead of brace heuristics", () => {
    const result = detectFormat([
      "{ definitely not valid json",
      '{"level":"info","message":"ok"}',
      '{"level":"warn","message":"still ok"}',
    ]);

    expect(result.format.name).toBe("json");
  });
});

describe("detectWithConfidence", () => {
  it("returns percentage confidence for clean samples", () => {
    const result = detectWithConfidence(buildNginxLines(20));

    expect(result.format.name).toBe("nginx_access");
    expect(result.confidence).toBe(100);
  });
});
