import { describe, expect, it } from "vitest";
import { detectFormatFromContent } from "../detector-content";

describe("detectFormatFromContent", () => {
  it("detects nginx access logs from file content", () => {
    const content = `127.0.0.1 - - [10/Oct/2024:13:55:36 -0700] "GET / HTTP/1.1" 200 123 "-" "curl"
127.0.0.1 - - [10/Oct/2024:13:55:37 -0700] "GET /api HTTP/1.1" 404 0 "-" "curl"`;

    const result = detectFormatFromContent(content);
    expect(result.format.name).toBe("nginx_access");
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("includes journald record starts in the sample", () => {
    const content = `__REALTIME_TIMESTAMP=123
_HOSTNAME=host1
MESSAGE=hello

__REALTIME_TIMESTAMP=456
MESSAGE=world`;

    const result = detectFormatFromContent(content);
    expect(result.format.name).toBe("journald");
  });
});
