/**
 * applyCodeSnippet.ts
 *
 * Deterministic, client-side algorithm for merging an AI-generated code snippet
 * into an existing file. No LLM call required.
 *
 * Strategy:
 * 1. Normalise both the snippet and the file into trimmed, non-empty lines.
 * 2. Try to locate the best-matching block in the existing file by sliding a
 *    window of "anchor lines" (taken from the snippet head) and scoring each
 *    position using character-level Jaccard similarity.
 * 3. When a match is found (score >= threshold), expand the window to cover the
 *    whole replaced block by matching brace depth and trailing blank lines.
 * 4. If no match is found the snippet is treated as new code and inserted just
 *    before the last top-level export statement, or appended at the end.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise a line for comparison: collapse whitespace, lowercase. */
function normLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Character-level Jaccard similarity between two strings.
 * Returns 0..1; 1 = identical.
 */
function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const ch of setA) if (setB.has(ch)) intersection++;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

/**
 * Pick up to 3 anchor line indices from the snippet.
 * Skips blank lines, comments, and pure import lines to find a structural anchor
 * (e.g. a function/class signature) which is more distinctive.
 */
function pickAnchorLines(snippetLines: string[]): number[] {
  const indices: number[] = [];
  for (let i = 0; i < snippetLines.length && indices.length < 3; i++) {
    const n = normLine(snippetLines[i]);
    if (!n || n.startsWith('//') || n.startsWith('*') || n.startsWith('/*')) continue;
    indices.push(i);
  }
  return indices;
}

/**
 * Find the brace-balanced end of a block that starts at startLine in lines.
 * Returns the index of the closing line (inclusive).
 */
function findBlockEnd(lines: string[], startLine: number): number {
  let depth = 0;
  let opened = false;
  for (let i = startLine; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; opened = true; }
      else if (ch === '}') depth--;
    }
    if (opened && depth <= 0) return i;
  }
  return lines.length - 1;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ApplyResult {
  /** The fully-merged file content ready to write back. */
  newContent: string;
  /** Human-readable description of what happened. */
  action: 'replaced' | 'inserted' | 'appended';
  /** 1-indexed starting line where the change was applied. */
  startLine: number;
  endLine: number;
}

/**
 * Merge snippet into fileContent deterministically.
 *
 * @param snippet          The code snippet returned by the AI.
 * @param fileContent      The current full content of the target file.
 * @param matchThreshold   Minimum similarity score (0-1) to accept a match.
 *                         Default 0.55 — loose enough for minor whitespace
 *                         differences, strict enough to avoid false positives.
 */
export function applyCodeSnippet(
  snippet: string,
  fileContent: string,
  matchThreshold = 0.55,
): ApplyResult {
  const normEnding = (s: string) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const fileLines = normEnding(fileContent).split('\n');
  const snippetLines = normEnding(snippet).split('\n');

  // Trim trailing blank lines from snippet
  while (snippetLines.length && !snippetLines[snippetLines.length - 1].trim()) {
    snippetLines.pop();
  }

  if (!snippetLines.length) {
    return { newContent: fileContent, action: 'appended', startLine: 1, endLine: 1 };
  }

  // Empty file — just write the snippet
  if (!fileContent.trim()) {
    return { newContent: snippet, action: 'appended', startLine: 1, endLine: snippetLines.length };
  }

  // -- 1. Slide anchor window across the file to find best match -------------
  const anchorIndices = pickAnchorLines(snippetLines);
  if (!anchorIndices.length) anchorIndices.push(0);
  const anchorNormed = anchorIndices.map((i) => normLine(snippetLines[i]));

  let bestScore = 0;
  let bestFileLine = -1;

  for (let fi = 0; fi < fileLines.length; fi++) {
    let score = 0;
    for (let ai = 0; ai < anchorIndices.length; ai++) {
      const fileIdx = fi + anchorIndices[ai];
      if (fileIdx >= fileLines.length) break;
      score += similarity(anchorNormed[ai], normLine(fileLines[fileIdx]));
    }
    score /= anchorIndices.length;
    if (score > bestScore) {
      bestScore = score;
      bestFileLine = fi;
    }
  }

  // -- 2a. Good match — replace the existing block ---------------------------
  if (bestScore >= matchThreshold && bestFileLine >= 0) {
    const blockEnd = findBlockEnd(fileLines, bestFileLine);
    const before = fileLines.slice(0, bestFileLine);
    const after = fileLines.slice(blockEnd + 1);
    return {
      newContent: [...before, ...snippetLines, ...after].join('\n'),
      action: 'replaced',
      startLine: bestFileLine + 1,
      endLine: bestFileLine + snippetLines.length,
    };
  }

  // -- 2b. No match — insert just before the last top-level export -----------
  let insertAt = fileLines.length;
  for (let i = fileLines.length - 1; i >= 0; i--) {
    const t = fileLines[i].trim();
    if (t.startsWith('export default') || t === 'export {' || t.startsWith('module.exports')) {
      insertAt = i;
      break;
    }
  }

  const before = fileLines.slice(0, insertAt);
  const after = fileLines.slice(insertAt);
  const needsBlank = before.length > 0 && before[before.length - 1].trim() !== '';

  return {
    newContent: [...before, ...(needsBlank ? [''] : []), ...snippetLines, '', ...after].join('\n'),
    action: insertAt === fileLines.length ? 'appended' : 'inserted',
    startLine: insertAt + 1,
    endLine: insertAt + snippetLines.length,
  };
}
