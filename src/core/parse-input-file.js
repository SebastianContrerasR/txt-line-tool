import { InputError } from './errors.js';
import { inspectLineNumberToken } from './line-number.js';

const BOM = '\uFEFF';

/**
 * @typedef {object} ParsedRecord
 * @property {number} lineNumber Parsed value of the first column.
 * @property {string} raw The record exactly as it appears in the file (no line ending).
 * @property {string} payload Everything from the first separator onwards, separator included.
 *   Used to renumber a record without ever touching the remaining fields.
 * @property {string[]} fields The values after the first column.
 * @property {number} physicalLineNumber 1-based line of the file, for error messages.
 */

/**
 * @typedef {object} ParsedInputFile
 * @property {ParsedRecord[]} records Non-blank records, in file order.
 * @property {number[]} blankLineNumbers Physical line numbers of the ignored blank lines.
 * @property {number} physicalLineCount Number of lines read from the file.
 * @property {boolean} endsWithNewline Whether the file's last line ends with a
 *   line ending. The generated files mirror it, so processing a file that does
 *   not end with a newline does not add one.
 * @property {number | null} maxLineNumber Highest original line number in the
 *   file, or `null` when the file has no records. Original line numbers need not
 *   be consecutive, so this is the largest first column value and not the record
 *   count.
 */

/**
 * Parse and validate the contents of an uploaded `.txt` file.
 *
 * Pure function: no DOM, no I/O. Throws an {@link InputError} on the first
 * problem found, including the physical line number where it was found.
 *
 * Policy:
 *  - an optional UTF-8 BOM is ignored,
 *  - LF, CRLF and lone CR are accepted as line endings,
 *  - the newline that terminates the last record is not a blank line,
 *  - blank lines (empty or whitespace only) are ignored and reported,
 *  - every record needs a `|` separator and a positive integer as first field,
 *  - original line numbers must be unique.
 *
 * @param {string} text Full contents of the file.
 * @returns {ParsedInputFile}
 * @throws {InputError} When the file is malformed.
 */
export function parseInputFile(text) {
  if (typeof text !== 'string') {
    throw new InputError('Se esperaba el contenido del archivo como texto.');
  }

  const contentWithoutBom = text.startsWith(BOM) ? text.slice(BOM.length) : text;
  const normalizedContent = contentWithoutBom.replace(/\r\n?/g, '\n');
  const endsWithNewline = normalizedContent.endsWith('\n');

  if (normalizedContent === '') {
    return {
      records: [],
      blankLineNumbers: [],
      physicalLineCount: 0,
      endsWithNewline,
      maxLineNumber: null,
    };
  }

  const lines = normalizedContent.split('\n');
  if (endsWithNewline) {
    // The trailing newline terminates the last record, it is not an empty record.
    lines.pop();
  }

  const records = [];
  const blankLineNumbers = [];
  const firstOccurrenceByLineNumber = new Map();
  let maxLineNumber = null;

  lines.forEach((line, index) => {
    const physicalLineNumber = index + 1;

    if (line.trim() === '') {
      blankLineNumbers.push(physicalLineNumber);
      return;
    }

    const separatorIndex = line.indexOf('|');
    if (separatorIndex === -1) {
      throw new InputError(
        `Línea ${physicalLineNumber}: falta el separador "|". Cada registro debe verse como "numeroDeLinea|campo|campo".`,
        { physicalLineNumber },
      );
    }

    const firstField = line.slice(0, separatorIndex);
    if (firstField === '') {
      throw new InputError(
        `Línea ${physicalLineNumber}: el primer campo está vacío. Cada registro debe comenzar con un número de línea.`,
        { physicalLineNumber },
      );
    }

    const inspection = inspectLineNumberToken(firstField);
    if (!inspection.isValid) {
      throw new InputError(
        `Línea ${physicalLineNumber}: primer campo no válido: ${inspection.message}.`,
        { physicalLineNumber },
      );
    }

    const { value } = inspection;
    const previousLine = firstOccurrenceByLineNumber.get(value);
    if (previousLine !== undefined) {
      throw new InputError(
        `Línea ${physicalLineNumber}: el número de línea ${value} ya se usó en la línea ${previousLine}. Los números de línea originales deben ser únicos.`,
        { physicalLineNumber },
      );
    }
    firstOccurrenceByLineNumber.set(value, physicalLineNumber);

    // Tracked while looping: spreading the records into Math.max() would blow
    // the stack on large files.
    if (maxLineNumber === null || value > maxLineNumber) {
      maxLineNumber = value;
    }

    records.push({
      lineNumber: value,
      raw: line,
      payload: line.slice(separatorIndex),
      fields: line.split('|').slice(1),
      physicalLineNumber,
    });
  });

  return {
    records,
    blankLineNumbers,
    physicalLineCount: lines.length,
    endsWithNewline,
    maxLineNumber,
  };
}