import { isLineNumber } from './line-number.js';

/**
 * @typedef {{ lineNumbers: number[], error: string }} RangeValidation
 */

/**
 * Reject requested line numbers that cannot exist in the uploaded file.
 *
 * A number above the file's highest original line number is almost always a typo,
 * so it is treated as a hard error: nothing is processed until it is corrected.
 * Numbers at or below the maximum are left alone, because a file with
 * non-consecutive original line numbers legitimately has gaps; those are reported
 * later in the result summary instead.
 *
 * Pure and deterministic: no DOM, no I/O.
 *
 * @param {number[]} lineNumbers Numbers that already passed syntax validation.
 * @param {number | null | undefined} maxLineNumber Highest original line number
 *   in the file, or `null`/`undefined` when no file is loaded or it has no records.
 * @returns {RangeValidation} The numbers and an empty message when everything is
 *   fine; an empty list and the message to display otherwise.
 */
export function validateLineNumbersAgainstFile(lineNumbers, maxLineNumber) {
  if (!Array.isArray(lineNumbers) || lineNumbers.length === 0) {
    return { lineNumbers: [], error: '' };
  }

  // Without a file to compare against there is nothing to check.
  if (!isLineNumber(maxLineNumber)) {
    return { lineNumbers, error: '' };
  }

  const outOfRange = lineNumbers.filter((lineNumber) => lineNumber > maxLineNumber);
  if (outOfRange.length === 0) {
    return { lineNumbers, error: '' };
  }

  return {
    lineNumbers: [],
    error: `El número de línea más alto del archivo es ${maxLineNumber}. Revisa: ${outOfRange.join(', ')}.`,
  };
}