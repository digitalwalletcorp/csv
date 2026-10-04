import { describe, it, expect } from 'vitest';
import { CSVParser, CSVRecord } from '@/csv-parser';
import { CSVSyntaxError } from '@/csv-syntax-error';

const parseAll = (text: string, options?: ConstructorParameters<typeof CSVParser>[0]): string[][] => {
  const parser = new CSVParser(options);
  return [...parser.write(text), ...parser.end()].map((record) => record.values);
};

const parseChunks = async (chunks: string[], options?: ConstructorParameters<typeof CSVParser>[0]): Promise<CSVRecord[]> => {
  const records: CSVRecord[] = [];
  for await (const record of new CSVParser(options).parse(chunks)) {
    records.push(record);
  }
  return records;
};

describe('@/csv-parser.ts', () => {

  describe('基本の解析', () => {
    it('区切り文字で分割されること', () => {
      expect(parseAll('a,b,c')).toEqual([['a', 'b', 'c']]);
    });
    it('改行(CRLF / LF / CR)でレコードが分かれること', () => {
      expect(parseAll('a,b\r\nc,d\ne,f\rg,h')).toEqual([['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h']]);
    });
    it('末尾の改行で余分なレコードが生まれないこと', () => {
      expect(parseAll('a,b\r\n')).toEqual([['a', 'b']]);
      expect(parseAll('a,b\n')).toEqual([['a', 'b']]);
    });
    it('空文字は0レコードであること', () => {
      expect(parseAll('')).toEqual([]);
    });
    it('空のセルは空文字になること', () => {
      expect(parseAll('a,,c')).toEqual([['a', '', 'c']]);
      expect(parseAll(',')).toEqual([['', '']]);
      expect(parseAll('a,')).toEqual([['a', '']]);
    });
    it('空行は空文字1セルのレコードになること', () => {
      expect(parseAll('a\n\nb')).toEqual([['a'], [''], ['b']]);
    });
    it('skipEmptyLines で空行が飛ばされること', () => {
      expect(parseAll('a\n\n\nb\n', { skipEmptyLines: true })).toEqual([['a'], ['b']]);
    });
    it('先頭の BOM が除かれること', () => {
      expect(parseAll('\uFEFFa,b')).toEqual([['a', 'b']]);
    });
    it('BOM は先頭以外では除かれないこと', () => {
      expect(parseAll('a,\uFEFFb')).toEqual([['a', '\uFEFFb']]);
    });
  });

  describe('引用符', () => {
    it('引用符内の区切り文字・改行がセルの一部になること', () => {
      expect(parseAll('"a,b","c\r\nd","e\nf"')).toEqual([['a,b', 'c\r\nd', 'e\nf']]);
    });
    it('引用符内の "" が " に戻ること', () => {
      expect(parseAll('"say ""hi""",x')).toEqual([['say "hi"', 'x']]);
      expect(parseAll('""""')).toEqual([['"']]);
    });
    it('"" (空の引用セル)は空文字であること', () => {
      expect(parseAll('"",a')).toEqual([['', 'a']]);
      expect(parseAll('""')).toEqual([['']]);
    });
    it('引用セルと非引用セルが混在できること', () => {
      expect(parseAll('a,"b",c')).toEqual([['a', 'b', 'c']]);
    });
    it('引用内に JSON を含む実例', () => {
      expect(parseAll('1,"{""key"":""value"",""n"":1}",x')).toEqual([['1', '{"key":"value","n":1}', 'x']]);
    });
    it('引用符を変更できること', () => {
      expect(parseAll(`'a,b',c`, { quote: `'` })).toEqual([['a,b', 'c']]);
    });
  });

  describe('厳密解析のエラー', () => {
    it('セル先頭以外の引用符は CSVSyntaxError', () => {
      expect(() => parseAll('a"b,c')).toThrow(CSVSyntaxError);
      expect(() => parseAll('a"b,c')).toThrow('Quote must be at the start of a field (line 1, column 2)');
    });
    it('閉じ引用符の後に文字が続けば CSVSyntaxError', () => {
      expect(() => parseAll('"a"b,c')).toThrow('Unexpected character after closing quote (line 1, column 4)');
    });
    it('閉じられていない引用符は CSVSyntaxError', () => {
      expect(() => parseAll('a,"b')).toThrow(CSVSyntaxError);
      expect(() => parseAll('a,"b')).toThrow('Unterminated quoted field');
    });
    it('エラー位置は行・列を1始まりで指すこと', () => {
      try {
        parseAll('a,b\r\nc,d"e');
        expect.fail('CSVSyntaxError が投げられること');
      } catch (error) {
        expect(error).toBeInstanceOf(CSVSyntaxError);
        expect((error as CSVSyntaxError).name).toBe('CSVSyntaxError');
        expect((error as CSVSyntaxError).line).toBe(2);
        expect((error as CSVSyntaxError).column).toBe(4);
      }
    });
    it('閉じられていない引用符のエラーはレコードの開始行を指すこと', () => {
      try {
        parseAll('a\n"b\nc');
        expect.fail('CSVSyntaxError が投げられること');
      } catch (error) {
        expect((error as CSVSyntaxError).line).toBe(2);
      }
    });
  });

  describe('オプション', () => {
    it('タブ区切り(TSV)を解析できること', () => {
      expect(parseAll('a\tb\t"c\td"', { delimiter: '\t' })).toEqual([['a', 'b', 'c\td']]);
    });
    it('trim で非引用セルの前後空白が除かれること', () => {
      expect(parseAll(' a , b ,c', { trim: true })).toEqual([['a', 'b', 'c']]);
    });
    it('trim は引用セルには適用されないこと', () => {
      expect(parseAll('" a ",b', { trim: true })).toEqual([[' a ', 'b']]);
    });
    it('trim 無指定なら空白を保つこと', () => {
      expect(parseAll(' a , b ')).toEqual([[' a ', ' b ']]);
    });
  });

  describe('チャンク分割', () => {
    const text = 'id,name\r\n1,"a,b"\r\n2,"line\r\nbreak"\r\n3,"say ""hi"""\r\n';
    const expected = [['id', 'name'], ['1', 'a,b'], ['2', 'line\r\nbreak'], ['3', 'say "hi"']];

    it('どの位置で分割しても結果が同じであること', async () => {
      for (let size = 1; size <= text.length; size++) {
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += size) {
          chunks.push(text.slice(i, i + size));
        }
        const records = await parseChunks(chunks);
        expect(records.map((record) => record.values), `chunk size ${size}`).toEqual(expected);
      }
    });
    it('レコードの開始行が物理行で返ること(引用内改行を含む)', async () => {
      const records = await parseChunks([text]);
      expect(records.map((record) => record.line)).toEqual([1, 2, 3, 5]);
    });
    it('CRLF がチャンク境界で分かれても1つの改行として扱われること', async () => {
      const records = await parseChunks(['a\r', '\nb']);
      expect(records.map((record) => record.values)).toEqual([['a'], ['b']]);
    });
    it('末尾が CR のまま終わっても改行として扱われること', () => {
      const parser = new CSVParser();
      expect(parser.write('a\r')).toEqual([]);
      expect(parser.end()).toEqual([{ values: ['a'], line: 1 }]);
    });
    it('引用内で CR がチャンク末尾に来ても値として保たれること', async () => {
      const records = await parseChunks(['"a\r', 'b"']);
      expect(records.map((record) => record.values)).toEqual([['a\rb']]);
    });
    it('AsyncIterable を入力に取れること', async () => {
      async function * source(): AsyncGenerator<string> {
        yield 'a,';
        yield 'b\n';
        yield 'c,d';
      }
      const records: string[][] = [];
      for await (const record of new CSVParser().parse(source())) {
        records.push(record.values);
      }
      expect(records).toEqual([['a', 'b'], ['c', 'd']]);
    });
    it('parse() はバイト列と文字列が混在するチャンクを受け取れること', async () => {
      const records: string[][] = [];
      for await (const record of new CSVParser().parse([new TextEncoder().encode('a,'), 'b\n', Buffer.from('c')])) {
        records.push(record.values);
      }
      expect(records).toEqual([['a', 'b'], ['c']]);
    });
    it('parse() の encoding でバイト列の文字コードを指定できること', async () => {
      const utf16 = new Uint8Array([0xff, 0xfe, 0x61, 0x00, 0x2c, 0x00, 0x42, 0x30]); // BOM + 'a,あ'
      const records: string[][] = [];
      for await (const record of new CSVParser().parse([utf16], { encoding: 'utf-16le' })) {
        records.push(record.values);
      }
      expect(records).toEqual([['a', 'あ']]);
    });
    it('途中で break しても後続の parse() は先頭から始まること', async () => {
      const parser = new CSVParser();
      for await (const record of parser.parse(['a\nb\nc'])) {
        expect(record.values).toEqual(['a']);
        break;
      }
      const records: string[][] = [];
      for await (const record of parser.parse(['x\ny'])) {
        records.push(record.values);
      }
      expect(records).toEqual([['x'], ['y']]);
    });
    it('end() の後は同じインスタンスを再利用できること', () => {
      const parser = new CSVParser();
      parser.write('a,b');
      expect(parser.end()).toEqual([{ values: ['a', 'b'], line: 1 }]);
      expect(parser.write('\uFEFFc\nd')).toEqual([{ values: ['c'], line: 1 }]);
      expect(parser.end()).toEqual([{ values: ['d'], line: 2 }]);
    });
    it('end() で構文エラーになった後も同じインスタンスを使えること', () => {
      const parser = new CSVParser();
      parser.write('"a');
      expect(() => parser.end()).toThrow(CSVSyntaxError);
      expect(parser.write('b')).toEqual([]);
      expect(parser.end()).toEqual([{ values: ['b'], line: 1 }]);
    });
    it('write() で構文エラーになった後も同じインスタンスを使えること', () => {
      const parser = new CSVParser();
      expect(() => parser.write('x,a"b')).toThrow(CSVSyntaxError);
      expect(parser.write('c\n')).toEqual([{ values: ['c'], line: 1 }]);
      expect(parser.end()).toEqual([]);
    });
  });
});
