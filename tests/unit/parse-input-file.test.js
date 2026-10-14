import { describe, expect, it } from 'vitest';

import { InputError } from '../../src/core/errors.js';
import { parseInputFile } from '../../src/core/parse-input-file.js';

const BOM = '\uFEFF';

const SAMPLE = '1|Mary|Cusco\n2|John|Lima\n3|Peter|Arequipa\n4|Ana|Piura\n5|Luis|Trujillo';

describe('parseInputFile', () => {
  it('parses a record with three fields', () => {
    const { records } = parseInputFile('1|Mary|Cusco');

    expect(records).toEqual([
      {
        lineNumber: 1,
        raw: '1|Mary|Cusco',
        payload: '|Mary|Cusco',
        fields: ['Mary', 'Cusco'],
        physicalLineNumber: 1,
      },
    ]);
  });

  it('parses records with more than three fields', () => {
    const { records } = parseInputFile('1|Mary|Cusco|Peru|42');

    expect(records[0].lineNumber).toBe(1);
    expect(records[0].fields).toEqual(['Mary', 'Cusco', 'Peru', '42']);
    expect(records[0].payload).toBe('|Mary|Cusco|Peru|42');
  });

  it('parses records with a single field after the line number', () => {
    const { records } = parseInputFile('1|Mary');

    expect(records[0].fields).toEqual(['Mary']);
    expect(records[0].payload).toBe('|Mary');
  });

  it('keeps empty fields', () => {
    const { records } = parseInputFile('1|Mary||Cusco');

    expect(records[0].fields).toEqual(['Mary', '', 'Cusco']);
    expect(records[0].payload).toBe('|Mary||Cusco');
  });

  it('keeps a record that ends right after the separator', () => {
    const { records } = parseInputFile('1|');

    expect(records[0].fields).toEqual(['']);
    expect(records[0].payload).toBe('|');
  });

  it('keeps spaces inside the data fields', () => {
    const { records } = parseInputFile('1| Mary | Cusco City ');

    expect(records[0].raw).toBe('1| Mary | Cusco City ');
    expect(records[0].fields).toEqual([' Mary ', ' Cusco City ']);
    expect(records[0].payload).toBe('| Mary | Cusco City ');
  });

  it('reads LF line endings', () => {
    const { records, physicalLineCount } = parseInputFile(SAMPLE);

    expect(records.map((record) => record.lineNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(records.map((record) => record.raw)).toEqual([
      '1|Mary|Cusco',
      '2|John|Lima',
      '3|Peter|Arequipa',
      '4|Ana|Piura',
      '5|Luis|Trujillo',
    ]);
    expect(physicalLineCount).toBe(5);
  });

  it('reads CRLF line endings without leaving carriage returns in the fields', () => {
    const { records } = parseInputFile(SAMPLE.replaceAll('\n', '\r\n'));

    expect(records).toHaveLength(5);
    expect(records[0].raw).toBe('1|Mary|Cusco');
    expect(records[4].raw).toBe('5|Luis|Trujillo');
    expect(records[4].fields).toEqual(['Luis', 'Trujillo']);
  });

  it('reads lone CR line endings', () => {
    const { records } = parseInputFile(SAMPLE.replaceAll('\n', '\r'));

    expect(records).toHaveLength(5);
    expect(records[1].raw).toBe('2|John|Lima');
  });

  it('ignores a UTF-8 BOM', () => {
    const { records } = parseInputFile(`${BOM}${SAMPLE}`);

    expect(records).toHaveLength(5);
    expect(records[0].lineNumber).toBe(1);
  });

  it('handles a trailing newline without reporting a blank line', () => {
    const { records, blankLineNumbers } = parseInputFile(`${SAMPLE}\n`);

    expect(records).toHaveLength(5);
    expect(blankLineNumbers).toEqual([]);
  });

  it('handles several trailing newlines, reporting the extra blank lines', () => {
    const { records, blankLineNumbers } = parseInputFile(`${SAMPLE}\n\n\n`);

    expect(records).toHaveLength(5);
    expect(blankLineNumbers).toEqual([6, 7]);
  });

  it('returns no records for empty input', () => {
    expect(parseInputFile('')).toEqual({
      records: [],
      blankLineNumbers: [],
      physicalLineCount: 0,
      endsWithNewline: false,
      maxLineNumber: null,
    });
  });

  it('returns no records for a file that only contains a BOM', () => {
    expect(parseInputFile(BOM)).toEqual({
      records: [],
      blankLineNumbers: [],
      physicalLineCount: 0,
      endsWithNewline: false,
      maxLineNumber: null,
    });
  });

  it('reports the highest line number of the file', () => {
    expect(parseInputFile(SAMPLE).maxLineNumber).toBe(5);
    expect(parseInputFile('1|A').maxLineNumber).toBe(1);
  });

  it('reports the highest value, not the record count, for non-consecutive files', () => {
    const { records, maxLineNumber } = parseInputFile('5|a|x\n17|b|y\n900|c|z');

    expect(records).toHaveLength(3);
    expect(maxLineNumber).toBe(900);
  });

  it('reports a maximum of null for a file with only blank lines', () => {
    expect(parseInputFile('\n\n').maxLineNumber).toBeNull();
  });

  it('reports whether the file ends with a newline', () => {
    expect(parseInputFile('1|A').endsWithNewline).toBe(false);
    expect(parseInputFile('1|A\n').endsWithNewline).toBe(true);
    expect(parseInputFile('1|A\n2|B').endsWithNewline).toBe(false);
    expect(parseInputFile('1|A\r\n2|B\r\n').endsWithNewline).toBe(true);
    expect(parseInputFile('1|A\n2|B\r\n').endsWithNewline).toBe(true);
    expect(parseInputFile(`${BOM}1|A`).endsWithNewline).toBe(false);
    expect(parseInputFile('1|A\n\n').endsWithNewline).toBe(true);
  });

  it('ignores blank lines and reports them', () => {
    const { records, blankLineNumbers } = parseInputFile('1|A\n\n2|B\n   \n3|C\n');

    expect(records.map((record) => record.lineNumber)).toEqual([1, 2, 3]);
    expect(blankLineNumbers).toEqual([2, 4]);
    // Physical line numbers are not affected by the ignored lines.
    expect(records.map((record) => record.physicalLineNumber)).toEqual([1, 3, 5]);
  });

  it('rejects a record without a first field', () => {
    expect(() => parseInputFile('|Mary')).toThrow(
      'Línea 1: el primer campo está vacío. Cada registro debe comenzar con un número de línea.',
    );
  });

  it('rejects a non-numeric first field', () => {
    expect(() => parseInputFile('one|Mary')).toThrow(
      'Línea 1: primer campo no válido: "one" no es un número.',
    );
  });

  it('rejects a zero line number', () => {
    expect(() => parseInputFile('0|Mary')).toThrow(/debe ser un número de línea mayor que 0/);
  });

  it('rejects a negative line number', () => {
    expect(() => parseInputFile('-1|Mary')).toThrow(/es negativo/);
  });

  it('rejects a decimal line number', () => {
    expect(() => parseInputFile('1.5|Mary')).toThrow(/es un decimal/);
  });

  it('rejects a line number with leading zeros', () => {
    expect(() => parseInputFile('04|Mary')).toThrow(/tiene ceros a la izquierda/);
  });

  it('rejects a line number that is not a safe integer', () => {
    expect(() => parseInputFile('9007199254740993|Mary')).toThrow(/demasiado grande/);
  });

  it('rejects duplicate original line numbers and points at both lines', () => {
    expect(() => parseInputFile('1|Mary\n2|John\n1|Peter')).toThrow(
      'Línea 3: el número de línea 1 ya se usó en la línea 1. Los números de línea originales deben ser únicos.',
    );
  });

  it('rejects a record without a pipe separator', () => {
    // Policy: every record must contain a separator, so a bare line number is malformed.
    expect(() => parseInputFile('1|Mary\n2')).toThrow(
      'Línea 2: falta el separador "|". Cada registro debe verse como "numeroDeLinea|campo|campo".',
    );
  });

  it('reports the physical line number of the first invalid record', () => {
    const text = `${BOM}1|Mary\n\n2|John\nnope|Peter`;

    expect(() => parseInputFile(text)).toThrow(/^Línea 4:/);
    try {
      parseInputFile(text);
    } catch (error) {
      expect(error).toBeInstanceOf(InputError);
      expect(error.physicalLineNumber).toBe(4);
    }
  });

  it('reports the physical line number after CRLF endings and blank lines', () => {
    expect(() => parseInputFile('1|A\r\n\r\n2|B\r\nx|Y')).toThrow(/^Línea 4:/);
  });

  it('rejects a non-string input', () => {
    expect(() => parseInputFile(null)).toThrow(InputError);
  });

  it('keeps non-ASCII contents untouched', () => {
    const { records } = parseInputFile('1|Ñoño|München');

    expect(records[0].fields).toEqual(['Ñoño', 'München']);
    expect(records[0].payload).toBe('|Ñoño|München');
  });
});