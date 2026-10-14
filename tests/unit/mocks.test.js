import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { parseInputFile } from '../../src/core/parse-input-file.js';
import { processRecords } from '../../src/core/process-records.js';

/**
 * Exercises the sample files in `tests/mocks/`.
 *
 * Those files are also the ones to use by hand when trying the app in a browser,
 * so this suite keeps the documented behaviour and the manual fixtures in sync.
 */

const mockDirectory = new URL('../mocks/', import.meta.url);

/** @param {string} name */
async function readMock(name) {
  return readFile(new URL(name, mockDirectory), 'utf8');
}

/** Parse a mock file and process it the way the UI does. */
async function run(name, selectedLineNumbers) {
  const { records, endsWithNewline } = parseInputFile(await readMock(name));

  return processRecords(records, selectedLineNumbers, { trailingNewline: endsWithNewline });
}

describe('tests/mocks', () => {
  it('parses sample.txt, the example from the documentation', async () => {
    const { records, blankLineNumbers } = parseInputFile(await readMock('sample.txt'));

    expect(records).toHaveLength(5);
    expect(blankLineNumbers).toEqual([]);
    expect(records[0].raw).toBe('1|Mary|Cusco');
  });

  it('produces the documented output for sample.txt when removing 2 and 4', async () => {
    const result = await run('sample.txt', [2, 4]);

    expect(result.correctedText).toBe('1|Mary|Cusco\n2|Peter|Arequipa\n3|Luis|Trujillo\n');
    expect(result.removedText).toBe('2|John|Lima\n4|Ana|Piura\n');
  });

  it('reports requested line numbers missing from a mock file', async () => {
    const result = await run('sample.txt', [2, 4, 99]);

    expect(result.unmatchedLineNumbers).toEqual([99]);
    expect(result.removedCount).toBe(2);
  });

  it('does not add a trailing newline for no-trailing-newline.txt', async () => {
    const result = await run('no-trailing-newline.txt', [2]);

    expect(result.correctedText).toBe('1|Mary|Cusco\n2|Peter|Arequipa');
    expect(result.removedText).toBe('2|John|Lima');
    expect(result.correctedText.endsWith('\n')).toBe(false);
    expect(result.removedText.endsWith('\n')).toBe(false);
  });

  it('keeps the trailing newline for a mock saved with one', async () => {
    const result = await run('sample.txt', [2]);

    expect(result.correctedText.endsWith('\n')).toBe(true);
    expect(result.removedText.endsWith('\n')).toBe(true);
  });

  it('parses edge-cases.txt, preserving empty fields, spaces and extra fields', async () => {
    const { records } = parseInputFile(await readMock('edge-cases.txt'));

    expect(records).toHaveLength(7);
    expect(records[2].fields).toEqual(['Peter', 'Arequipa', 'Field 4', '42']);
    expect(records[3].fields).toEqual(['Ana', '', 'Piura']);
    expect(records[4].fields).toEqual(['Luis', '  Trujillo  ', 'X']);
    expect(records[5].raw).toBe('6|José|');
    expect(records[6].raw).toBe('7|Rosa|La Paz|');
  });

  it('renumbers edge-cases.txt without touching the data fields', async () => {
    const result = await run('edge-cases.txt', [3, 6]);

    expect(result.correctedText).toBe(
      '1|Mary|Cusco\n2|John|Lima\n3|Ana||Piura\n4|Luis|  Trujillo  |X\n5|Rosa|La Paz|\n',
    );
    expect(result.removedText).toBe(
      '3|Peter|Arequipa|Field 4|42\n6|José|\n',
    );
  });

  it('ignores the blank lines of blank-lines.txt and reports them', async () => {
    const { records, blankLineNumbers } = parseInputFile(await readMock('blank-lines.txt'));

    expect(records.map((record) => record.lineNumber)).toEqual([1, 2, 3, 4]);
    expect(blankLineNumbers).toEqual([2, 4, 5]);
  });

  it('rejects invalid-line-number.txt and points at the offending line', async () => {
    await expect(readMock('invalid-line-number.txt').then(parseInputFile)).rejects.toThrow(
      'Línea 3: primer campo no válido: "abc" no es un número.',
    );
  });

  it('rejects duplicate-line-numbers.txt and points at both lines', async () => {
    await expect(
      readMock('duplicate-line-numbers.txt').then(parseInputFile),
    ).rejects.toThrow(
      'Línea 3: el número de línea 1 ya se usó en la línea 1. Los números de línea originales deben ser únicos.',
    );
  });

  it('rejects missing-separator.txt', async () => {
    await expect(readMock('missing-separator.txt').then(parseInputFile)).rejects.toThrow(
      'Línea 3: falta el separador "|". Cada registro debe verse como "numeroDeLinea|campo|campo".',
    );
  });
});