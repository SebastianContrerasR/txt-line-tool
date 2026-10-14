import { describe, expect, it } from 'vitest';

import { InputError } from '../../src/core/errors.js';
import {
  parseLineNumbers,
  validateLineNumbersInput,
} from '../../src/core/parse-line-numbers.js';

describe('parseLineNumbers', () => {
  it('accepts a single line number', () => {
    expect(parseLineNumbers('7')).toEqual([7]);
  });

  it('accepts several comma separated line numbers and keeps the entered order', () => {
    expect(parseLineNumbers('2,4,7')).toEqual([2, 4, 7]);
    expect(parseLineNumbers('7,4,2')).toEqual([7, 4, 2]);
  });

  it('ignores whitespace around the values and around the whole input', () => {
    expect(parseLineNumbers('  2 ,  4 ,7  ')).toEqual([2, 4, 7]);
    expect(parseLineNumbers('2,\n4')).toEqual([2, 4]);
  });

  it('rejects empty input', () => {
    expect(() => parseLineNumbers('')).toThrow(/al menos un número de línea/i);
    expect(() => parseLineNumbers('   ')).toThrow(/al menos un número de línea/i);
  });

  it('rejects an empty token such as "2,,4"', () => {
    expect(() => parseLineNumbers('2,,4')).toThrow(/El valor 2 de 3 está vacío/);
    expect(() => parseLineNumbers('2,')).toThrow(/El valor 2 de 2 está vacío/);
    expect(() => parseLineNumbers(',2')).toThrow(/El valor 1 de 2 está vacío/);
    expect(() => parseLineNumbers('2, ,4')).toThrow(/El valor 2 de 3 está vacío/);
  });

  it('rejects duplicate requested numbers', () => {
    expect(() => parseLineNumbers('2,2')).toThrow(/2 está repetido/);
    expect(() => parseLineNumbers('1, 2, 3, 2')).toThrow(/2 está repetido/);
  });

  it('rejects zero', () => {
    expect(() => parseLineNumbers('0')).toThrow(/debe ser un número de línea mayor que 0/);
    expect(() => parseLineNumbers('2,0')).toThrow(/Valor no válido en la posición 2/);
  });

  it('rejects negative values', () => {
    expect(() => parseLineNumbers('-3')).toThrow(/es negativo/);
    expect(() => parseLineNumbers('2,-3,4')).toThrow(/Valor no válido en la posición 2/);
  });

  it('rejects a leading plus sign', () => {
    expect(() => parseLineNumbers('+3')).toThrow(/sin el signo "\+"/);
  });

  it('rejects decimal values', () => {
    expect(() => parseLineNumbers('2.5')).toThrow(/es un decimal/);
    expect(() => parseLineNumbers('1,2.0')).toThrow(/Valor no válido en la posición 2/);
  });

  it('rejects alphabetic values', () => {
    expect(() => parseLineNumbers('abc')).toThrow(/"abc" no es un número/);
    expect(() => parseLineNumbers('2,4a')).toThrow(/Valor no válido en la posición 2/);
  });

  it('rejects integers that are not safe', () => {
    expect(() => parseLineNumbers('9007199254740993')).toThrow(/demasiado grande/);
    expect(() => parseLineNumbers('99999999999999999999')).toThrow(/demasiado grande/);
  });

  it('rejects leading zeros and explains the alternative', () => {
    // Documented policy: line numbers are written without leading zeros, so a
    // typo such as "007" is reported instead of being silently accepted.
    expect(() => parseLineNumbers('007')).toThrow(/"007" tiene ceros a la izquierda; escríbelo como "7"/);
    expect(() => parseLineNumbers('2,04')).toThrow(/Valor no válido en la posición 2/);
  });

  it('accepts the largest safe integer', () => {
    expect(parseLineNumbers('9007199254740991')).toEqual([9007199254740991]);
  });

  it('reports the position of the invalid value', () => {
    expect(() => parseLineNumbers('1, 2, tres, 4')).toThrow(
      'Valor no válido en la posición 3: "tres" no es un número.',
    );
  });

  it('rejects a non-string input', () => {
    expect(() => parseLineNumbers(undefined)).toThrow(InputError);
  });
});

describe('validateLineNumbersInput', () => {
  it('returns the parsed numbers and no message for valid input', () => {
    expect(validateLineNumbersInput('2, 4')).toEqual({ lineNumbers: [2, 4], error: '' });
  });

  it('returns nothing to show for an empty field', () => {
    expect(validateLineNumbersInput('')).toEqual({ lineNumbers: [], error: '' });
    expect(validateLineNumbersInput('   ')).toEqual({ lineNumbers: [], error: '' });
    expect(validateLineNumbersInput(undefined)).toEqual({ lineNumbers: [], error: '' });
  });

  it('returns the message to display for invalid input', () => {
    const result = validateLineNumbersInput('2,,4');

    expect(result.lineNumbers).toEqual([]);
    expect(result.error).toBe(
      'El valor 2 de 3 está vacío. Ingresa números separados por comas, por ejemplo: 2, 4, 7.',
    );
  });

  // Regression: the message used to stay on screen after the user fixed the
  // value, because only the failure path updated the UI.
  it('never keeps a previous error once the input becomes valid', () => {
    expect(validateLineNumbersInput('2,,4').error).not.toBe('');
    expect(validateLineNumbersInput('2,4')).toEqual({ lineNumbers: [2, 4], error: '' });
    expect(validateLineNumbersInput('2,4').error).toBe('');
    expect(validateLineNumbersInput('2,4,4').error).not.toBe('');
    expect(validateLineNumbersInput('2,4,5').error).toBe('');
  });
});