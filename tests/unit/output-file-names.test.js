import { describe, expect, it } from 'vitest';

import { buildOutputFileNames } from '../../src/core/output-file-names.js';

describe('buildOutputFileNames', () => {
  it('suffixes the original file name', () => {
    expect(buildOutputFileNames('data.txt')).toEqual({
      corrected: 'data_corrected.txt',
      removed: 'data_removed.txt',
    });
  });

  it('replaces the last extension of a file with another extension', () => {
    expect(buildOutputFileNames('report.2024.csv')).toEqual({
      corrected: 'report.2024_corrected.txt',
      removed: 'report.2024_removed.txt',
    });
  });

  it('ignores any directory part of the name', () => {
    expect(buildOutputFileNames('/tmp/exports/data.txt').corrected).toBe('data_corrected.txt');
    expect(buildOutputFileNames('C:\\exports\\data.txt').corrected).toBe('data_corrected.txt');
  });

  it('keeps names that have no extension', () => {
    expect(buildOutputFileNames('data').corrected).toBe('data_corrected.txt');
    expect(buildOutputFileNames('data.').corrected).toBe('data_corrected.txt');
  });

  it('falls back to a default base name when nothing usable is left', () => {
    expect(buildOutputFileNames('.txt')).toEqual({
      corrected: 'file_corrected.txt',
      removed: 'file_removed.txt',
    });
    expect(buildOutputFileNames('')).toEqual({
      corrected: 'file_corrected.txt',
      removed: 'file_removed.txt',
    });
    expect(buildOutputFileNames(undefined)).toEqual({
      corrected: 'file_corrected.txt',
      removed: 'file_removed.txt',
    });
  });
});