import { InputError } from './errors.js';
import { isLineNumber } from './line-number.js';

/**
 * @typedef {import('./parse-input-file.js').ParsedRecord} ParsedRecord
 */

/**
 * @typedef {object} ProcessResult
 * @property {string} correctedText UTF-8 text for `*_corrected.txt`.
 * @property {string} removedText UTF-8 text for `*_removed.txt`.
 * @property {number} correctedCount Number of surviving records.
 * @property {number} removedCount Number of removed records.
 * @property {number[]} matchedLineNumbers Requested line numbers found in the file, in file order.
 * @property {number[]} unmatchedLineNumbers Requested line numbers that are not in the file,
 *   in the order they were entered.
 */

/**
 * Split a list of output lines into the text of a file.
 *
 * Convention: LF line endings, and the file ends with a newline only when
 * `trailingNewline` is true. An empty output is a completely empty file (0
 * bytes) in both cases, never a lone newline.
 *
 * @param {string[]} lines
 * @param {boolean} [trailingNewline] Append the final LF.
 * @returns {string}
 */
export function buildFileContents(lines, trailingNewline = true) {
  if (lines.length === 0) {
    return '';
  }

  const contents = lines.join('\n');

  return trailingNewline ? `${contents}\n` : contents;
}

/**
 * Apply a removal selection to already validated records.
 *
 * Rule A: a record is removed when its original line number was selected.
 * Rule B: `removedText` keeps the original numbers, contents and order.
 * Rule C: `correctedText` keeps the records that survive, renumbered from 1 in
 *         their existing order; only the first field changes.
 * Rule D: both texts end with a newline only when the source file did, so a
 *         file that was saved without a final newline round-trips unchanged.
 *
 * Pure and deterministic: no file access, no DOM, no global state.
 *
 * @param {ParsedRecord[]} records Records from `parseInputFile`.
 * @param {number[]} selectedLineNumbers Line numbers to remove.
 * @param {{ trailingNewline?: boolean }} [options]
 *   `trailingNewline` mirrors the source file (`parseInputFile().endsWithNewline`).
 *   Defaults to `true`.
 * @returns {ProcessResult}
 * @throws {InputError} When the arguments do not have the expected shape.
 */
export function processRecords(records, selectedLineNumbers, options = {}) {
  const { trailingNewline = true } = options;

  if (!Array.isArray(records)) {
    throw new InputError('Se esperaba una lista de registros analizados.');
  }
  if (!Array.isArray(selectedLineNumbers)) {
    throw new InputError('Se esperaba una lista de números de línea a eliminar.');
  }

  const selectedSet = new Set();
  selectedLineNumbers.forEach((lineNumber) => {
    if (!isLineNumber(lineNumber)) {
      throw new InputError(`Número de línea no válido para eliminar: ${String(lineNumber)}.`);
    }
    selectedSet.add(lineNumber);
  });

  const correctedLines = [];
  const removedLines = [];
  const matchedLineNumbers = [];

  records.forEach((record) => {
    if (selectedSet.has(record.lineNumber)) {
      // Rule B: removed records keep their original line number and contents.
      removedLines.push(record.raw);
      matchedLineNumbers.push(record.lineNumber);
      return;
    }
    // Rule C: only the first field is replaced; the payload is copied verbatim.
    correctedLines.push(`${correctedLines.length + 1}${record.payload}`);
  });

  const matchedSet = new Set(matchedLineNumbers);

  return {
    correctedText: buildFileContents(correctedLines, trailingNewline),
    removedText: buildFileContents(removedLines, trailingNewline),
    correctedCount: correctedLines.length,
    removedCount: removedLines.length,
    matchedLineNumbers,
    unmatchedLineNumbers: selectedLineNumbers.filter(
      (lineNumber) => !matchedSet.has(lineNumber),
    ),
  };
}