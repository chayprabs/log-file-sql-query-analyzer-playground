import { detectFormat, DetectionResult } from "./detector";
import { isJournaldRecordLine } from "./formats";

const SAMPLE_SIZE = 20;

/** Sample lines for format detection, including journald multi-line record starts. */
export function buildDetectionLines(content: string): string[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lineBased: string[] = [];

  for (const line of normalized.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    lineBased.push(line);
    if (lineBased.length >= SAMPLE_SIZE) {
      break;
    }
  }

  if (lineBased.length >= SAMPLE_SIZE) {
    return lineBased;
  }

  const journaldLines: string[] = [];
  let block: string[] = [];

  for (const line of normalized.split("\n")) {
    if (!line.trim()) {
      if (block.length) {
        journaldLines.push(block[0]);
        block = [];
      }
      continue;
    }

    if (!block.length || isJournaldRecordLine(line) || /^\s/.test(line)) {
      block.push(line);
      continue;
    }

    journaldLines.push(block[0]);
    block = [line];
  }

  if (block.length) {
    journaldLines.push(block[0]);
  }

  const merged = [...lineBased];
  for (const line of journaldLines) {
    if (merged.length >= SAMPLE_SIZE) {
      break;
    }
    if (!merged.includes(line)) {
      merged.push(line);
    }
  }

  return merged.slice(0, SAMPLE_SIZE);
}

export function detectFormatFromContent(content: string): DetectionResult {
  return detectFormat(buildDetectionLines(content));
}
