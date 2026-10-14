import { describe, expect, it } from 'vitest';

import { validateLineNumbersAgainstFile } from '../../src/core/validate-line-range.js';

describe('validateLineNumbersAgainstFile', () => {
  it('accepts numbers at or below the file maximum', () => {
    expect(validateLineNumbersAgainstFile([2, 5], 5)).toEqual({ lineNumbers: [2, 5], error: '' });
    expect(validateLineNumbersAgainstFile([1], 5)).toEqual({ lineNumbers: [1], error: '' });
  });

  it('rejects a number above the file maximum', () => {
    expect(validateLineNumbersAgainstFile([2, 99], 5)).toEqual({
      lineNumbers: [],
      error: 'El número de línea más alto del archivo es 5. Revisa: 99.',
    });
  });

  it('lists every offending number, in the order they were typed', () => {
    expect(validateLineNumbersAgainstFile([7, 2, 120, 99], 5).error).toBe(
      'El número de línea más alto del archivo es 5. Revisa: 7, 120, 99.',
    );
  });

  it('drops the whole selection when one number is out of range', () => {
    expect(validateLineNumbersAgainstFile([2, 99], 5).lineNumbers).toEqual([]);
  });

  it('allows gaps inside the range: only numbers above the maximum are rejected', () => {
    // A file numbered 5, 17, 900 has a maximum of 900, so 500 is in range even
    // though no record uses it. It is reported later in the summary instead.
    expect(validateLineNumbersAgainstFile([500], 900)).toEqual({ lineNumbers: [500], error: '' });
    expect(validateLineNumbersAgainstFile([901], 900).lineNumbers).toEqual([]);
  });

  it('handles a file with a single record', () => {
    expect(validateLineNumbersAgainstFile([1], 1)).toEqual({ lineNumbers: [1], error: '' });
    expect(validateLineNumbersAgainstFile([2], 1).error).toBe(
      'El número de línea más alto del archivo es 1. Revisa: 2.',
    );
  });

  it('does not check anything when no file is loaded', () => {
    expect(validateLineNumbersAgainstFile([2, 4], null)).toEqual({ lineNumbers: [2, 4], error: '' });
    expect(validateLineNumbersAgainstFile([2, 4], undefined)).toEqual({
      lineNumbers: [2, 4],
      error: '',
    });
  });

  it('does not check anything when the file has no records', () => {
    expect(validateLineNumbersAgainstFile([2, 4], null).error).toBe('');
  });

  it('returns an empty selection for empty or invalid input', () => {
    expect(validateLineNumbersAgainstFile([], 5)).toEqual({ lineNumbers: [], error: '' });
    expect(validateLineNumbersAgainstFile(null, 5)).toEqual({ lineNumbers: [], error: '' });
  });
});