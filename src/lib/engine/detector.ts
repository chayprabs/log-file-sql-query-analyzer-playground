import { FORMATS, LogFormat } from "./formats";

export interface DetectionResult {
  format: LogFormat;
  score: number;
  matchedLines: number;
  sampledLines: number;
  confidence: number;
}

const SAMPLE_SIZE = 20;
const MIN_CONFIDENCE = 0.5;

const FORMAT_PRIORITY: Record<LogFormat["name"], number> = {
  nginx_access: 5,
  apache_access: 4,
  syslog: 3,
  journald: 6,
  json: 2,
  generic: 1,
};

function getSample(lines: string[]): string[] {
  const sample: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    sample.push(line);
    if (sample.length >= SAMPLE_SIZE) {
      break;
    }
  }

  return sample;
}

function buildResult(
  format: LogFormat,
  sample: string[],
  matchedLines: number
): DetectionResult {
  const sampledLines = sample.length;
  const confidence = sampledLines === 0 ? 0 : matchedLines / sampledLines;
  const score =
    confidence * FORMAT_PRIORITY[format.name] + matchedLines / Math.max(sampledLines, 1);

  return {
    format,
    score,
    matchedLines,
    sampledLines,
    confidence,
  };
}

function buildGenericFallback(sample: string[]): DetectionResult {
  const generic = FORMATS.find((format) => format.name === "generic");

  if (!generic) {
    throw new Error("Generic format is not defined");
  }

  return {
    format: generic,
    score: 0,
    matchedLines: 0,
    sampledLines: sample.length,
    confidence: 0,
  };
}

export function detectFormat(lines: string[]): DetectionResult {
  const sample = getSample(lines);

  if (sample.length === 0) {
    return buildGenericFallback(sample);
  }

  const candidates = FORMATS.filter((format) => format.name !== "generic").map(
    (format) => {
      const matchedLines = sample.reduce((count, line) => {
        return count + (format.test(line) ? 1 : 0);
      }, 0);

      return buildResult(format, sample, matchedLines);
    }
  );

  candidates.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (right.matchedLines !== left.matchedLines) {
      return right.matchedLines - left.matchedLines;
    }

    return FORMAT_PRIORITY[right.format.name] - FORMAT_PRIORITY[left.format.name];
  });

  const winner = candidates[0];
  if (!winner || winner.confidence < MIN_CONFIDENCE) {
    return buildGenericFallback(sample);
  }

  return winner;
}

export function detectWithConfidence(lines: string[]): {
  format: LogFormat;
  confidence: number;
} {
  const result = detectFormat(lines);

  return {
    format: result.format,
    confidence: Math.round(result.confidence * 100),
  };
}
