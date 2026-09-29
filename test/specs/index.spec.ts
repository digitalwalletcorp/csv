import { describe, it, expect } from 'vitest';
import * as Index from '@/index';

describe('@/index.ts', () => {
  it('モジュールとして読み込めること', () => {
    expect(Index).toBeDefined();
  });
});
