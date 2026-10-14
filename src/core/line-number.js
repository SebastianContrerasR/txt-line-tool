/**
 * Single source of truth for "what is a valid line number".
 *
 * Both the user input (comma separated list) and the first column of the
 * uploaded file are validated with these rules, so the two never disagree.
 *
 * A valid line number token is:
 *  - a non-empty string of ASCII digits,
 *  - without leading zeros (`04` is rejected, write `4`),
 *  - without a sign and without decimals,
 *  - greater than 0,
 *  - representable as a JavaScript safe integer.
 */

/** Token shape required before any other check: digits only. */
const DIGITS_ONLY = /^[0-9]+$/;

/** Matches values that are numeric but not integers, e.g. `2.5`. */
const DECIMAL = /^[+-]?[0-9]*\.[0-9]+$/;

/** Matches a signed value that still looks like a number, e.g. `-3` or `+3`. */
const SIGNED = /^([+-])([0-9]+)$/;

/**
 * @typedef {{ isValid: true, value: number }
 *   | { isValid: false, reason: string, message: string }} LineNumberInspection
 */

/**
 * Inspect a single line-number token.
 *
 * @param {string} token Already trimmed by the caller.
 * @returns {LineNumberInspection}
 */
export function inspectLineNumberToken(token) {
  if (typeof token !== 'string' || token === '') {
    return invalid('empty', 'el valor está vacío');
  }

  const signedMatch = SIGNED.exec(token);
  if (signedMatch) {
    return signedMatch[1] === '-'
      ? invalid('negative', `"${token}" es negativo, pero los números de línea deben ser mayores que 0`)
      : invalid('signed', `"${token}" no es un número simple; escríbelo sin el signo "+"`);
  }

  if (DECIMAL.test(token)) {
    return invalid('decimal', `"${token}" es un decimal, pero los números de línea deben ser números enteros`);
  }

  if (!DIGITS_ONLY.test(token)) {
    return invalid('not-numeric', `"${token}" no es un número`);
  }

  if (token.length > 1 && token.startsWith('0')) {
    return invalid('leading-zeros', `"${token}" tiene ceros a la izquierda; escríbelo como "${token.replace(/^0+(?=[0-9])/, '')}"`);
  }

  const value = Number(token);

  if (!Number.isSafeInteger(value)) {
    return invalid('unsafe-integer', `"${token}" es demasiado grande para procesarse de forma segura`);
  }

  if (value === 0) {
    return invalid('not-positive', '"0" debe ser un número de línea mayor que 0');
  }

  return { isValid: true, value };
}

/**
 * @param {string} token
 * @returns {boolean} True for positive, safe integers (the parsed form of a token).
 */
export function isLineNumber(value) {
  return Number.isSafeInteger(value) && value > 0;
}

/**
 * @param {string} reason Stable identifier for the failure, useful for tests/logs.
 * @param {string} message Message that completes "número de línea no válido: ...".
 */
function invalid(reason, message) {
  return { isValid: false, reason, message };
}