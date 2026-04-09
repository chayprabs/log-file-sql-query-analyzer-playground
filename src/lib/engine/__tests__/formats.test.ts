import { describe, expect, it } from "vitest";
import {
  getFormat,
  parseApache,
  parseGeneric,
  parseJournald,
  parseJson,
  parseNginx,
  parseSyslog,
} from "../formats";

describe("parseNginx", () => {
  it("parses the canonical combined log sample", () => {
    const line =
      '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326 "http://www.example.com/start.html" "Mozilla/4.08"';

    const parsed = parseNginx(line);

    expect(parsed).toMatchObject({
      remote_addr: "127.0.0.1",
      remote_user: "frank",
      time_local: "10/Oct/2000:13:55:36 -0700",
      request: "GET /apache_pb.gif HTTP/1.0",
      request_method: "GET",
      request_target: "/apache_pb.gif",
      request_protocol: "HTTP/1.0",
      status: 200,
      body_bytes_sent: 2326,
      http_referer: "http://www.example.com/start.html",
      http_user_agent: "Mozilla/4.08",
    });
    expect(parsed?.timestamp).toBe("2000-10-10T20:55:36.000Z");
  });

  it("parses IPv6 addresses", () => {
    const line =
      '2001:db8::1 - - [10/Oct/2000:13:55:36 -0700] "GET /index.html HTTP/1.1" 200 512 "-" "curl/8.0"';

    const parsed = parseNginx(line);

    expect(parsed?.remote_addr).toBe("2001:db8::1");
    expect(parsed?.status).toBe(200);
  });

  it("keeps URLs with spaces intact", () => {
    const line =
      '127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /search?q=hello world HTTP/1.1" 200 123 "-" "Mozilla/5.0"';

    const parsed = parseNginx(line);

    expect(parsed?.request_target).toBe("/search?q=hello world");
  });

  it('handles 400 lines whose request field is "-"', () => {
    const line =
      '127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "-" 400 0 "-" "-"';

    const parsed = parseNginx(line);

    expect(parsed?.request).toBe("-");
    expect(parsed?.request_method).toBeNull();
    expect(parsed?.status).toBe(400);
  });

  it("returns null for garbage input without throwing", () => {
    expect(() => parseNginx("not a log line at all %%% garbage")).not.toThrow();
    expect(parseNginx("not a log line at all %%% garbage")).toBeNull();
  });
});

describe("parseApache", () => {
  it("parses combined-format apache lines", () => {
    const line =
      '127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326 "http://www.example.com/start.html" "Mozilla/4.08"';

    const parsed = parseApache(line);

    expect(parsed).toMatchObject({
      vhost: null,
      remote_addr: "127.0.0.1",
      remote_user: "frank",
      request: "GET /apache_pb.gif HTTP/1.0",
      status: 200,
      body_bytes_sent: 2326,
    });
  });

  it("parses virtual-host-prefixed apache lines", () => {
    const line =
      'example.com 127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326';

    const parsed = parseApache(line);

    expect(parsed?.vhost).toBe("example.com");
    expect(parsed?.remote_addr).toBe("127.0.0.1");
  });
});

describe("parseSyslog", () => {
  it("parses RFC 3164 syslog with priority", () => {
    const line =
      '<34>Oct 11 22:14:15 mymachine su: "su root" failed for lonvick on /dev/pts/8';

    const parsed = parseSyslog(line);

    expect(parsed).toMatchObject({
      priority: 34,
      timestamp_raw: "Oct 11 22:14:15",
      hostname: "mymachine",
      tag: "su",
      message: '"su root" failed for lonvick on /dev/pts/8',
    });
    expect(parsed?.timestamp).toMatch(/T22:14:15\.000Z$/);
  });

  it("handles double-space day values", () => {
    const parsed = parseSyslog("Jan  1 00:00:01 host kernel: boot");

    expect(parsed?.timestamp_raw).toBe("Jan 1 00:00:01");
    expect(parsed?.tag).toBe("kernel");
  });
});

describe("parseJson", () => {
  it("parses a single JSON object line", () => {
    const parsed = parseJson('{"level":"info","message":"hello","value":3}');

    expect(parsed).toMatchObject({
      level: "info",
      message: "hello",
      value: 3,
    });
  });

  it("stringifies array values instead of crashing", () => {
    const parsed = parseJson('{"tags":["a","b"],"count":2}');

    expect(parsed?.tags).toBe('["a","b"]');
    expect(parsed?.count).toBe(2);
  });

  it("preserves null JSON values", () => {
    const parsed = parseJson('{"message":null,"ok":true}');

    expect(parsed?.message).toBeNull();
    expect(parsed?.ok).toBe(1);
  });

  it("skips invalid JSON lines gracefully", () => {
    expect(parseJson("not-json")).toBeNull();
  });
});

describe("parseJournald", () => {
  it("parses key=value journald export records", () => {
    const record =
      "__REALTIME_TIMESTAMP=1614000000000000\n_HOSTNAME=myhost\nMESSAGE=hello world";

    const parsed = parseJournald(record);

    expect(parsed).toMatchObject({
      __REALTIME_TIMESTAMP: "1614000000000000",
      _HOSTNAME: "myhost",
      MESSAGE: "hello world",
    });
    expect(parsed?.timestamp).toBe("2021-02-22T13:20:00.000Z");
  });

  it("preserves multiline journald messages", () => {
    const record =
      "__REALTIME_TIMESTAMP=1614000000000000\nMESSAGE=hello\n world";

    const parsed = parseJournald(record);

    expect(parsed?.MESSAGE).toBe("hello\nworld");
  });
});

describe("parseGeneric", () => {
  it("always succeeds and includes line_no plus raw_line", () => {
    const parsed = parseGeneric("any random log line", 42);

    expect(parsed).toEqual({
      line_no: 42,
      raw_line: "any random log line",
    });
  });
});

describe("format registry", () => {
  it("exposes the expected core formats", () => {
    expect(getFormat("nginx_access")?.displayName).toBe("Nginx Access Log");
    expect(getFormat("apache_access")?.displayName).toBe("Apache Access Log");
    expect(getFormat("syslog")?.displayName).toContain("Syslog");
    expect(getFormat("json")?.displayName).toBe("JSON Lines");
    expect(getFormat("generic")?.displayName).toBe("Generic Text");
  });
});
