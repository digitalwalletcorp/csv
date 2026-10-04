import { describe, it, expect } from 'vitest';
import * as Index from '@/index';

describe('@/index.ts', () => {
  it('CSV / CSVParser / CSVSyntaxError を公開していること', () => {
    expect(Object.keys(Index).sort()).toEqual(['CSV', 'CSVParser', 'CSVSyntaxError']);
  });
});
