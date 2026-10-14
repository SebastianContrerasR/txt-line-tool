import { InputError } from './errors.js';
import { inspectLineNumberToken } from './line-number.js';

/**
 * Parse the user's comma-separated list of original line numbers to remove.
 *
 * Pure function: no DOM, no I/O. Throws an {@link InputError} with an
 * actionable message for any invalid input.
 *
 * @param {string} input Raw text typed by the user, e.g. `"2, 4, 7"`.
 * @returns {number[]} Unique positive integers, in the order they were entered.
 * @throws {InputError} When the input is empty, malformed or contains duplicates.
 */
export function parseLineNumbers(input) {
  if (typeof input !== 'string') {
    throw new InputError('Se esperaba el texto con los números de línea.');
  }

  const trimmedInput = input.trim();
  if (trimmedInput === '') {
    throw new InputError('Ingresa al menos un número de línea, por ejemplo: 2, 4, 7.');
  }

  const tokens = trimmedInput.split(',');
  const lineNumbers = [];
  const seenLineNumbers = new Set();

  tokens.forEach((rawToken, index) => {
    const position = index + 1;
    const token = rawToken.trim();

    if (token === '') {
      throw new InputError(
        `El valor ${position} de ${tokens.length} está vacío. Ingresa números separados por comas, por ejemplo: 2, 4, 7.`,
      );
    }

    const inspection = inspectLineNumberToken(token);
    if (!inspection.isValid) {
      throw new InputError(`Valor no válido en la posición ${position}: ${inspection.message}.`);
    }

    if (seenLineNumbers.has(inspection.value)) {
      throw new InputError(
        `El número de línea ${inspection.value} está repetido. Ingresa cada número de línea una sola vez.`,
      );
    }

    seenLineNumbers.add(inspection.value);
    lineNumbers.push(inspection.value);
  });

  return lineNumbers;
}

/**
 * Validate the raw contents of the line numbers field.
 *
 * The result is always rebuilt from scratch, so a message from a previous
 * keystroke can never stay on screen once the user fixes the value: an empty
 * `error` is the single source of "nothing to show".
 *
 * @param {string} input Raw text typed by the user.
 * @returns {{ lineNumbers: number[], error: string }} Empty arrays and an empty
 * message when the field is empty; the parsed numbers and an empty message when
 * it is valid; empty arrays and the message to display when it is not.
 */
export function validateLineNumbersInput(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    return { lineNumbers: [], error: '' };
  }

  try {
    return { lineNumbers: parseLineNumbers(input), error: '' };
  } catch (error) {
    if (!(error instanceof InputError)) {
      throw error;
    }

    return { lineNumbers: [], error: error.message };
  }
}