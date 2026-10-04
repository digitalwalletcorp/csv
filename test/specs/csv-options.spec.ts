import { describe, it, expect } from 'vitest';
import { resolveOptions } from '@/csv-options';

describe('@/csv-options.ts', () => {
  it('既定値が補われること', () => {
    expect(resolveOptions()).toEqual({
      delimiter: ',',
      quote: '"',
      lineSeparator: '\r\n',
      quoteAll: false,
      trim: false,
      skipEmptyLines: false
    });
  });
  it('指定した値が既定値を上書きすること', () => {
    expect(resolveOptions({ delimiter: '\t', lineSeparator: '\n', trim: true })).toMatchObject({
      delimiter: '\t',
      quote: '"',
      lineSeparator: '\n',
      trim: true
    });
  });
  it('区切り文字・引用符が1文字でなければ RangeError', () => {
    expect(() => resolveOptions({ delimiter: '' })).toThrow(RangeError);
    expect(() => resolveOptions({ delimiter: ',,' })).toThrow(RangeError);
    expect(() => resolveOptions({ quote: '' })).toThrow(RangeError);
    expect(() => resolveOptions({ quote: `''` })).toThrow(RangeError);
  });
  it('区切り文字・引用符に改行は使えないこと', () => {
    expect(() => resolveOptions({ delimiter: '\n' })).toThrow(RangeError);
    expect(() => resolveOptions({ quote: '\r' })).toThrow(RangeError);
  });
  it('区切り文字と引用符が同じなら RangeError', () => {
    expect(() => resolveOptions({ delimiter: '"' })).toThrow('delimiter and quote must be different characters');
  });
});
