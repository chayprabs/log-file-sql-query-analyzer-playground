import { describe, expect, it } from "vitest";
import { getFormat } from "../formats";
import { getQuickSuggestions, getSuggestions } from "../suggestions";

describe("getSuggestions", () => {
  it("returns at least five suggestions for each built-in format", () => {
    const formatNames = [
      "nginx_access",
      "apache_access",
      "syslog",
      "journald",
      "json",
      "generic",
    ] as const;

    for (const formatName of formatNames) {
      const format = getFormat(formatName);
      expect(format).toBeDefined();

      const suggestions = getSuggestions(format!);
      expect(suggestions.length).toBeGreaterThanOrEqual(5);
      expect(suggestions.every((suggestion) => suggestion.sql.includes("logs"))).toBe(
        true
      );
    }
  });

  it("generates schema-aware JSON suggestions when level columns exist", () => {
    const format = getFormat("json");
    if (!format) {
      throw new Error("JSON format missing");
    }

    const suggestions = getSuggestions({
      format,
      tableName: "logs",
      schema: [
        { name: "line_no", type: "INTEGER" },
        { name: "raw_line", type: "TEXT" },
        { name: "level", type: "TEXT" },
        { name: "message", type: "TEXT" },
      ],
    });

    expect(
      suggestions.some((suggestion) =>
        suggestion.sql.includes("GROUP BY level")
      )
    ).toBe(true);
    expect(
      suggestions.some((suggestion) =>
        suggestion.sql.includes("pragma_table_info('logs')")
      )
    ).toBe(true);
  });
});

describe("getQuickSuggestions", () => {
  it("returns only the first three suggestions", () => {
    const quickSuggestions = getQuickSuggestions("nginx_access");

    expect(quickSuggestions).toHaveLength(3);
    expect(quickSuggestions[0].label).toBe("Status code breakdown");
  });
});
