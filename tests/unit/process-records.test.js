import { describe, expect, it } from 'vitest';

import { parseInputFile } from '../../src/core/parse-input-file.js';
import { buildFileContents, processRecords } from '../../src/core/process-records.js';

/** Parse a source file and process it exactly the way the UI does. */
function run(sourceText, selectedLineNumbers) {
  const { records, endsWithNewline } = parseInputFile(sourceText);

  return processRecords(records, selectedLineNumbers, { trailingNewline: endsWithNewline });
}

const SAMPLE = '1|Mary|Cusco\n2|John|Lima\n3|Peter|Arequipa\n4|Ana|Piura\n5|Luis|Trujillo';

describe('processRecords', () => {
  it('removes a single record', () => {
    const result = run(SAMPLE, [3]);

    expect(result.correctedText).toBe('1|Mary|Cusco\n2|John|Lima\n3|Ana|Piura\n4|Luis|Trujillo');
    expect(result.removedText).toBe('3|Peter|Arequipa');
    expect(result.removedCount).toBe(1);
    expect(result.correctedCount).toBe(4);
  });

  it('removes several records', () => {
    const result = run(SAMPLE, [2, 4]);

    expect(result.correctedCount).toBe(3);
    expect(result.removedCount).toBe(2);
    expect(result.removedText).toBe('2|John|Lima\n4|Ana|Piura');
  });

  it('removes the first record', () => {
    const result = run(SAMPLE, [1]);

    expect(result.correctedText).toBe(
      '1|John|Lima\n2|Peter|Arequipa\n3|Ana|Piura\n4|Luis|Trujillo',
    );
    expect(result.removedText).toBe('1|Mary|Cusco');
  });

  it('removes the last record', () => {
    const result = run(SAMPLE, [5]);

    expect(result.correctedText).toBe('1|Mary|Cusco\n2|John|Lima\n3|Peter|Arequipa\n4|Ana|Piura');
    expect(result.removedText).toBe('5|Luis|Trujillo');
  });

  it('removes every record and produces an empty corrected file', () => {
    const result = run(SAMPLE, [1, 2, 3, 4, 5]);

    expect(result.correctedText).toBe('');
    expect(result.removedText).toBe(SAMPLE);
    expect(result.correctedCount).toBe(0);
    expect(result.removedCount).toBe(5);
    expect(result.unmatchedLineNumbers).toEqual([]);
  });

  it('removes no record when nothing is selected', () => {
    const result = run(SAMPLE, []);

    expect(result.correctedText).toBe(SAMPLE);
    expect(result.removedText).toBe('');
    expect(result.correctedCount).toBe(5);
    expect(result.removedCount).toBe(0);
    expect(result.matchedLineNumbers).toEqual([]);
  });

  it('renumbers the corrected records sequentially from 1', () => {
    const result = run('10|a|x\n20|b|y\n30|c|z', [20]);

    expect(result.correctedText).toBe('1|a|x\n2|c|z');
  });

  it('preserves the original numbers in removedText', () => {
    const result = run('10|a|x\n20|b|y\n30|c|z', [10, 30]);

    expect(result.removedText).toBe('10|a|x\n30|c|z');
  });

  it('preserves the original record order in both outputs', () => {
    const result = run('10|a|x\n20|b|y\n30|c|z\n40|d|w', [30, 10]);

    // Removed records keep the order of the input, not the order requested.
    expect(result.removedText).toBe('10|a|x\n30|c|z');
    expect(result.correctedText).toBe('1|b|y\n2|d|w');
  });

  it('preserves every field after the first column, including the field count', () => {
    const result = run('1|a|b|c|d|e', [9]);

    expect(result.correctedText).toBe('1|a|b|c|d|e');
  });

  it('preserves empty fields and spaces in the data fields', () => {
    const fileText = '1|Mary |Cusco |Peru|42\n2|John||Lima \n3| Ana |  |Piura';
    const result = run(fileText, [2]);

    expect(result.correctedText).toBe('1|Mary |Cusco |Peru|42\n2| Ana |  |Piura');
    expect(result.removedText).toBe('2|John||Lima ');
  });

  it('reports requested line numbers that are not in the file', () => {
    const result = run(SAMPLE, [2, 99, 1, 404]);

    expect(result.unmatchedLineNumbers).toEqual([99, 404]);
    expect(result.matchedLineNumbers).toEqual([1, 2]);
    expect(result.removedText).toBe('1|Mary|Cusco\n2|John|Lima');
  });

  it('returns empty outputs for an empty input file', () => {
    const result = run('', [1, 2]);

    expect(result.correctedText).toBe('');
    expect(result.removedText).toBe('');
    expect(result.correctedCount).toBe(0);
    expect(result.removedCount).toBe(0);
    expect(result.unmatchedLineNumbers).toEqual([1, 2]);
  });

  it('never emits blank lines and always writes LF', () => {
    const result = run('1|a|x\r\n\r\n2|b|y\r\n\r\n', [2]);

    expect(result.correctedText).toBe('1|a|x\n');
    expect(result.correctedText).not.toContain('\n\n');
    expect(result.removedText).toBe('2|b|y\n');
    expect(result.removedText).not.toContain('\r');
  });

  it('handles records whose original line numbers are not consecutive', () => {
    const fileText = '5|a|x\n17|b|y\n900|c|z';
    const result = run(fileText, [17, 900]);

    expect(result.correctedText).toBe('1|a|x');
    expect(result.removedText).toBe('17|b|y\n900|c|z');
  });

  it('accepts duplicated selections without duplicating output', () => {
    const result = run(SAMPLE, [2, 2]);

    expect(result.removedText).toBe('2|John|Lima');
    expect(result.removedCount).toBe(1);
    expect(result.unmatchedLineNumbers).toEqual([]);
  });

  it('works with very large line numbers', () => {
    const result = run('9007199254740990|a|x\n9007199254740991|b|y', [9007199254740991]);

    expect(result.correctedText).toBe('1|a|x');
    expect(result.removedText).toBe('9007199254740991|b|y');
  });

  it('is deterministic and does not mutate its input', () => {
    const { records } = parseInputFile(SAMPLE);
    const snapshot = JSON.stringify(records);

    const first = processRecords(records, [2, 4]);
    const second = processRecords(records, [2, 4]);

    expect(first).toEqual(second);
    expect(JSON.stringify(records)).toBe(snapshot);
  });

  it('rejects arguments that are not records and line numbers', () => {
    expect(() => processRecords(null, [])).toThrow(/Se esperaba una lista de registros analizados/);
    expect(() => processRecords([], '2')).toThrow(/Se esperaba una lista de números de línea/);
    expect(() => processRecords([], [0])).toThrow(/Número de línea no válido para eliminar: 0/);
    expect(() => processRecords([], ['2'])).toThrow(/Número de línea no válido para eliminar: 2/);
  });

  // Regression tests for the example in the specification.
  it('matches the example from the specification (source saved with a trailing newline)', () => {
    const result = run(`${SAMPLE}\n`, [2, 4]);

    expect(result.correctedText).toBe('1|Mary|Cusco\n2|Peter|Arequipa\n3|Luis|Trujillo\n');
    expect(result.removedText).toBe('2|John|Lima\n4|Ana|Piura\n');
    expect(result).toEqual({
      correctedText: '1|Mary|Cusco\n2|Peter|Arequipa\n3|Luis|Trujillo\n',
      removedText: '2|John|Lima\n4|Ana|Piura\n',
      correctedCount: 3,
      removedCount: 2,
      matchedLineNumbers: [2, 4],
      unmatchedLineNumbers: [],
    });
  });

  it('matches the example from the specification (source saved without a trailing newline)', () => {
    const result = run(SAMPLE, [2, 4]);

    expect(result.correctedText).toBe('1|Mary|Cusco\n2|Peter|Arequipa\n3|Luis|Trujillo');
    expect(result.removedText).toBe('2|John|Lima\n4|Ana|Piura');
  });
});

describe('trailing newline convention', () => {
  it('keeps the trailing newline when the source file has one', () => {
    const result = run(`${SAMPLE}\n`, [2]);

    expect(result.correctedText.endsWith('\n')).toBe(true);
    expect(result.removedText.endsWith('\n')).toBe(true);
    expect(result.correctedText).toBe('1|Mary|Cusco\n2|Peter|Arequipa\n3|Ana|Piura\n4|Luis|Trujillo\n');
    expect(result.removedText).toBe('2|John|Lima\n');
  });

  it('does not add a trailing newline when the source file has none', () => {
    const result = run(SAMPLE, [2]);

    expect(result.correctedText.endsWith('\n')).toBe(false);
    expect(result.removedText.endsWith('\n')).toBe(false);
    expect(result.correctedText).toBe('1|Mary|Cusco\n2|Peter|Arequipa\n3|Ana|Piura\n4|Luis|Trujillo');
    expect(result.removedText).toBe('2|John|Lima');
  });

  it('never adds more than one trailing newline, even with blank lines at the end', () => {
    const result = run('1|a|x\n2|b|y\n\n\n', []);

    expect(result.correctedText).toBe('1|a|x\n2|b|y\n');
  });

  it('round-trips a source file without a trailing newline when every record is removed', () => {
    const result = run(SAMPLE, [1, 2, 3, 4, 5]);

    expect(result.removedText).toBe(SAMPLE);
    expect(result.correctedText).toBe('');
  });

  it('produces a 0-byte file for empty outputs in both conventions', () => {
    expect(run(SAMPLE, [1, 2, 3, 4, 5]).correctedText).toBe('');
    expect(run(`${SAMPLE}\n`, [1, 2, 3, 4, 5]).correctedText).toBe('');
    expect(run('', []).removedText).toBe('');
  });

  it('adds a trailing newline when the option is omitted', () => {
    const { records } = parseInputFile(SAMPLE);

    expect(processRecords(records, [2]).correctedText.endsWith('\n')).toBe(true);
  });
});

describe('buildFileContents', () => {
  it('joins lines with LF', () => {
    expect(buildFileContents(['a', 'b'], false)).toBe('a\nb');
  });

  it('appends the trailing newline only when asked', () => {
    expect(buildFileContents(['a', 'b'], true)).toBe('a\nb\n');
    expect(buildFileContents(['a', 'b'], false)).toBe('a\nb');
    expect(buildFileContents(['a'])).toBe('a\n');
  });

  it('returns an empty string when there are no lines', () => {
    expect(buildFileContents([], true)).toBe('');
    expect(buildFileContents([], false)).toBe('');
  });
});