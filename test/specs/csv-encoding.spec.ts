import { describe, it, expect } from 'vitest';
import { encode, encodeChunks, decodeChunks } from '@/csv-encoding';
import type { EncodeOptions } from '@/csv-encoding';

const collect = async (source: AsyncIterable<string>): Promise<string> => {
  let result = '';
  for await (const chunk of source) {
    result += chunk;
  }
  return result;
};

const collectBytes = async (source: AsyncIterable<Uint8Array>): Promise<Uint8Array> => {
  const bytes: number[] = [];
  for await (const chunk of source) {
    bytes.push(...chunk);
  }
  return new Uint8Array(bytes);
};

describe('@/csv-encoding.ts', () => {

  describe('encode', () => {
    it('既定は UTF-8 / BOM なし', async () => {
      expect([...await encode('aあ')]).toEqual([0x61, 0xe3, 0x81, 0x82]);
    });
    it('UTF-8 に BOM を付けられること', async () => {
      expect([...await encode('a', { bom: true })]).toEqual([0xef, 0xbb, 0xbf, 0x61]);
    });
    it('UTF-16LE はリトルエンディアンで並ぶこと', async () => {
      expect([...await encode('aあ', { encoding: 'utf-16le' })]).toEqual([0x61, 0x00, 0x42, 0x30]);
    });
    it('UTF-16LE の BOM は FF FE', async () => {
      expect([...await encode('', { encoding: 'utf-16le', bom: true })]).toEqual([0xff, 0xfe]);
    });
    it('サロゲートペアはそのまま2コード単位で書かれること', async () => {
      const bytes = await encode('😀', { encoding: 'utf-16le' });
      expect(new TextDecoder('utf-16le').decode(bytes)).toBe('😀');
    });
    it('対応しない encoding は RangeError', async () => {
      await expect(encode('a', { encoding: 'shift_jis' as never })).rejects.toThrow(RangeError);
    });
    it('encoder を指定すると、その関数で変換すること', async () => {
      expect([...await encode('a', { encoder: () => new Uint8Array([1]) })]).toEqual([1]);
      expect([...await encode('a', { encoder: async () => new Uint8Array([2]) })]).toEqual([2]);
    });
    it('encoder は encoding / bom と同時に指定できないこと', () => {
      // @ts-expect-error encoder と bom は同時に指定できない
      const options: EncodeOptions = { encoder: () => new Uint8Array(), bom: true };
      expect(options).toBeDefined();
    });
  });

  describe('encodeChunks', () => {
    it('BOM は先頭に1回だけ付けること', async () => {
      const bytes = await collectBytes(encodeChunks(['a', 'b'], { encoding: 'utf-16le', bom: true }));
      expect([...bytes]).toEqual([0xff, 0xfe, 0x61, 0x00, 0x62, 0x00]);
    });
    it('短いチャンクはまとめて1回で変換すること', async () => {
      const texts: string[] = [];
      const encoder = (text: string): Uint8Array => {
        texts.push(text);
        return new TextEncoder().encode(text);
      };
      await collectBytes(encodeChunks(['a', 'b', 'c'], { encoder }));
      expect(texts).toEqual(['abc']);
    });
    it('一定の文字数を超えたら分けて変換すること', async () => {
      const texts: string[] = [];
      const encoder = async (text: string): Promise<Uint8Array> => {
        texts.push(text);
        return new TextEncoder().encode(text);
      };
      const line = 'x'.repeat(40 * 1024);
      const bytes = await collectBytes(encodeChunks([line, line, line], { encoder }));
      expect(texts).toEqual([line + line, line]);
      expect(bytes.length).toBe(line.length * 3);
    });
    it('空なら何も返さないこと', async () => {
      expect((await collectBytes(encodeChunks([]))).length).toBe(0);
    });
  });

  describe('decodeChunks', () => {
    it('文字列はそのまま、バイト列は復号して返すこと', async () => {
      expect(await collect(decodeChunks(['a', new TextEncoder().encode('あ')]))).toBe('aあ');
    });
    it('チャンク境界で分かれたマルチバイト文字を正しく復号すること', async () => {
      const bytes = new TextEncoder().encode('あい');
      expect(await collect(decodeChunks([bytes.slice(0, 1), bytes.slice(1, 4), bytes.slice(4)]))).toBe('あい');
    });
    it('encoding を指定できること', async () => {
      expect(await collect(decodeChunks([new Uint8Array([0x82, 0xa0])], { encoding: 'shift_jis' }))).toBe('あ');
    });
    it('AsyncIterable を受け取れること', async () => {
      async function * source(): AsyncGenerator<Uint8Array> {
        yield new TextEncoder().encode('x');
      }
      expect(await collect(decodeChunks(source()))).toBe('x');
    });
  });
});
