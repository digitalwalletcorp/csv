import { describe, it, expect } from 'vitest';
import { CSV } from '@/csv';
import { CSVSyntaxError } from '@/csv-syntax-error';

describe('@/csv.ts', () => {

  describe('読み込み', () => {
    it('parse() で文字列から行データを読み込めること', () => {
      const csv = new CSV().parse('a,b\r\n"c,1","d""e"\r\n');
      expect(csv.countRows()).toBe(2);
      expect(csv.toArray()).toEqual([['a', 'b'], ['c,1', 'd"e']]);
    });
    it('parse() にコンストラクタのオプションが効くこと', () => {
      const csv = new CSV({ delimiter: '\t', trim: true, skipEmptyLines: true }).parse('a\t b \n\nc\td');
      expect(csv.toArray()).toEqual([['a', 'b'], ['c', 'd']]);
    });
    it('parse() は構文エラーを CSVSyntaxError で投げ、行データを変更しないこと', () => {
      const csv = new CSV().addRow(['x']);
      expect(() => csv.parse('a,"b')).toThrow(CSVSyntaxError);
      expect(csv.toArray()).toEqual([['x']]);
    });
    it('parse() / load() は既存の行データを置き換え、列名は残すこと', async () => {
      const csv = new CSV().setColumnNames('id').addRow(['old']);
      csv.parse('1\n2');
      expect(csv.toArray()).toEqual([['1'], ['2']]);
      await csv.load(['3']);
      expect(csv.toArray()).toEqual([['3']]);
      expect(csv.getColumnNames()).toEqual(['id']);
    });
    it('load() でストリームから読み込めること', async () => {
      async function * source(): AsyncGenerator<string> {
        yield 'id,name\r\n1,"a';
        yield ',b"\r\n2,c\r\n';
      }
      const csv = await new CSV().load(source());
      expect(csv.toArray()).toEqual([['id', 'name'], ['1', 'a,b'], ['2', 'c']]);
    });
    it('load() は構文エラーで行データを変更しないこと', async () => {
      const csv = new CSV().addRow(['x']);
      await expect(csv.load(['1\n"a'])).rejects.toThrow(CSVSyntaxError);
      expect(csv.toArray()).toEqual([['x']]);
    });
    it('maxRows で読み込みを打ち切れること', async () => {
      expect((await new CSV().load(['1\n2\n3\n4\n5'], { maxRows: 3 })).toArray()).toEqual([['1'], ['2'], ['3']]);
      expect(new CSV().parse('1\n2\n3\n4\n5', { maxRows: 3 }).toArray()).toEqual([['1'], ['2'], ['3']]);
    });
    it('maxRows が 0 なら行データが空になること', async () => {
      expect((await new CSV().load(['1\n2'], { maxRows: 0 })).countRows()).toBe(0);
      expect(new CSV().parse('1\n2', { maxRows: 0 }).countRows()).toBe(0);
    });
    it('skipRows で先頭のレコードを読み飛ばし、maxRows は読み飛ばした後から数えること', async () => {
      // 引用符内の改行は物理行ではなく1レコードとして数える
      const text = '"title\nline2"\nDay,Cost\n1,100\n2,200\n3,300';
      expect(new CSV().parse(text, { skipRows: 1, maxRows: 2 }).toArray()).toEqual([['Day', 'Cost'], ['1', '100']]);
      expect((await new CSV().load([text], { skipRows: 1, maxRows: 2 })).toArray()).toEqual([['Day', 'Cost'], ['1', '100']]);
      expect(new CSV().parse(text, { skipRows: 10 }).countRows()).toBe(0);
    });
    it('skipRows と useRowAsHeader でヘッダ付きファイルを読めること', () => {
      const csv = new CSV().parse('Report\nid,name\n1,Taro', { skipRows: 1 }).useRowAsHeader(0);
      expect(csv.toObjects()).toEqual([{ id: '1', name: 'Taro' }]);
    });
    it('skipRows が負数・小数なら RangeError', async () => {
      expect(() => new CSV().parse('1', { skipRows: -1 })).toThrow(RangeError);
      await expect(new CSV().load(['1'], { skipRows: 0.5 })).rejects.toThrow(RangeError);
    });
    it('maxRows が負数・小数なら RangeError', async () => {
      expect(() => new CSV().parse('1', { maxRows: -1 })).toThrow(RangeError);
      expect(() => new CSV().parse('1', { maxRows: 0.5 })).toThrow(RangeError);
      await expect(new CSV().load(['1'], { maxRows: -1 })).rejects.toThrow(RangeError);
      await expect(new CSV().load(['1'], { maxRows: 0.5 })).rejects.toThrow(RangeError);
    });
    it('parse() はバイト列(Buffer / Uint8Array)も受け取れること', () => {
      expect(new CSV().parse(new TextEncoder().encode('a,あ')).toArray()).toEqual([['a', 'あ']]);
      expect(new CSV().parse(Buffer.from('\uFEFFa,b')).toArray()).toEqual([['a', 'b']]);
    });
    it('parse() の encoding でバイト列の文字コードを指定できること', async () => {
      // 'あ,い' の Shift_JIS
      const sjis = new Uint8Array([0x82, 0xa0, 0x2c, 0x82, 0xa2]);
      expect(new CSV().parse(sjis, { encoding: 'shift_jis' }).toArray()).toEqual([['あ', 'い']]);
      const utf16 = await new CSV().addRow(['あ', 'い']).toBytes({ encoding: 'utf-16le', bom: true });
      expect(new CSV().parse(utf16, { encoding: 'utf-16le' }).toArray()).toEqual([['あ', 'い']]);
    });
    it('load() でバイト列のストリームを文字コード指定で読めること', async () => {
      // 'あ\nい' の Shift_JIS をマルチバイト文字の途中で分割する
      const chunks = [new Uint8Array([0x82]), new Uint8Array([0xa0, 0x0a, 0x82]), new Uint8Array([0xa2])];
      const csv = await new CSV().load(chunks, { encoding: 'shift_jis' });
      expect(csv.toArray()).toEqual([['あ'], ['い']]);
    });
    it('不明な encoding は RangeError', () => {
      expect(() => new CSV().parse(new Uint8Array(), { encoding: 'no-such-encoding' })).toThrow(RangeError);
    });
    it('不正なオプションは RangeError', () => {
      expect(() => new CSV({ delimiter: ';;' })).toThrow(RangeError);
    });
  });

  describe('ヘッダ', () => {
    it('setColumnNames / getColumnNames / columnIndexOf', () => {
      const csv = new CSV().setColumnNames('id', 'name');
      expect(csv.getColumnNames()).toEqual(['id', 'name']);
      expect(csv.columnIndexOf('name')).toBe(1);
      expect(csv.columnIndexOf('missing')).toBe(-1);
    });
    it('getColumnNames() はコピーを返すこと', () => {
      const csv = new CSV().setColumnNames('id');
      csv.getColumnNames().push('x');
      expect(csv.getColumnNames()).toEqual(['id']);
    });
    it('setColumnNames() は既存の列名を置き換えること', () => {
      const csv = new CSV().setColumnNames('a', 'b').setColumnNames('c');
      expect(csv.getColumnNames()).toEqual(['c']);
    });
    it('useRowAsHeader() で指定行をヘッダにし、その行までを取り除くこと', () => {
      // Google 広告レポートのように、ヘッダの前にタイトル行・期間行・空行がある形
      const csv = new CSV().parse('Report\r\n2026-01-01 - 2026-01-31\r\n\r\nDay,Cost\r\n2026-01-01,100\r\n2026-01-02,200');
      csv.useRowAsHeader(3);
      expect(csv.getColumnNames()).toEqual(['Day', 'Cost']);
      expect(csv.countRows()).toBe(2);
      expect(csv.columnAt(0, 'Cost')).toBe('100');
      expect(csv.columnAt(1, 'Cost')).toBe('200');
    });
    it('setColumnNames() は setColumns の列定義も破棄すること', () => {
      const csv = new CSV().setColumns({ 'ID': 'id' }).setColumnNames('name').addObject({ id: 1, name: 'Taro' });
      expect(csv.toArray()).toEqual([['Taro']]);
    });
    it('useRowAsHeader() の範囲外は RangeError', () => {
      expect(() => new CSV().parse('a').useRowAsHeader(1)).toThrow(RangeError);
    });
  });

  describe('列定義と行オブジェクト', () => {
    type Member = { id: number; name: string; address: { zip: string }; createdAt: Date };
    const members: Member[] = [
      { id: 1, name: 'Taro', address: { zip: '100-0001' }, createdAt: new Date('2026-01-01T00:00:00Z') },
      { id: 2, name: 'Hanako, Sato', address: { zip: '150-0001' }, createdAt: new Date('2026-02-01T00:00:00Z') }
    ];

    it('setColumns(配列) はヘッダ名 = プロパティ名として登録すること', () => {
      const csv = new CSV().setColumns(['id', 'name']).addObjects(members);
      expect(csv.getColumnNames()).toEqual(['id', 'name']);
      expect(csv.toArray()).toEqual([['1', 'Taro'], ['2', 'Hanako, Sato']]);
    });
    it('setColumns(オブジェクト) はヘッダ名 → プロパティ名または関数として登録すること', () => {
      const csv = new CSV().setColumns<Member>({
        '#': (row, i) => i + 1,
        'ID': 'id',
        '郵便番号': (row) => row.address.zip,
        '登録日': (row) => row.createdAt.toISOString()
      }).addObjects(members);
      expect(csv.getColumnNames()).toEqual(['#', 'ID', '郵便番号', '登録日']);
      expect(csv.toArray()).toEqual([
        ['1', '1', '100-0001', '2026-01-01T00:00:00.000Z'],
        ['2', '2', '150-0001', '2026-02-01T00:00:00.000Z']
      ]);
    });
    it('関数の rowIndex は追加先の行位置なので、複数回の addObjects で連番が続くこと', () => {
      const csv = new CSV().setColumns<Member>({ '#': (row, i) => i + 1, 'ID': 'id' });
      csv.addObjects(members.slice(0, 1));
      csv.addObjects(members.slice(1));
      csv.addObject(members[0]);
      expect(csv.toArray()).toEqual([['1', '1'], ['2', '2'], ['3', '1']]);
    });
    it('存在しないプロパティは空文字になること', () => {
      const csv = new CSV().setColumns(['id', 'missing']).addObject({ id: 1 });
      expect(csv.toArray()).toEqual([['1', '']]);
    });
    it('列定義が無ければ最初の行オブジェクトのキーを列定義にし、以降はキー名で取り出すこと', () => {
      const csv = new CSV().addObjects([{ a: 1, b: null }, { b: 'x', a: 2 }, { a: 3, c: 'ignored' }]);
      expect(csv.getColumnNames()).toEqual(['a', 'b']);
      expect(csv.toString()).toBe('a,b\r\n1,\r\n2,x\r\n3,\r\n');
    });
    it('列定義が無く列名があれば、列名をプロパティ名として取り出すこと', () => {
      const csv = new CSV().parse('id,name').useRowAsHeader(0).addObject({ name: 'Taro', id: 1 });
      expect(csv.toArray()).toEqual([['1', 'Taro']]);
    });
    it('setColumns は既存の列名を置き換えること', () => {
      const csv = new CSV().setColumnNames('x', 'y').setColumns(['id']);
      expect(csv.getColumnNames()).toEqual(['id']);
    });
    it('addObjects の結果を toString / toObjects で取り出せること', () => {
      const csv = new CSV({ delimiter: '\t' }).setColumns<Member>({ 'ID': 'id', 'Name': 'name' }).addObjects(members);
      expect(csv.toString()).toBe('ID\tName\r\n1\tTaro\r\n2\tHanako, Sato\r\n');
      expect(csv.toObjects()).toEqual([{ ID: '1', Name: 'Taro' }, { ID: '2', Name: 'Hanako, Sato' }]);
    });
  });

  describe('静的関数', () => {
    it('CSV.stringifyCell() は1セルを CSV 書式にすること', () => {
      expect(CSV.stringifyCell('a')).toBe('a');
      expect(CSV.stringifyCell('a,b')).toBe('"a,b"');
      expect(CSV.stringifyCell('a"b')).toBe('"a""b"');
      expect(CSV.stringifyCell(null)).toBe('');
      expect(CSV.stringifyCell(1)).toBe('1');
      expect(CSV.stringifyCell('a\tb', { delimiter: '\t' })).toBe('"a\tb"');
      expect(CSV.stringifyCell('a', { quoteAll: true })).toBe('"a"');
    });
    it('CSV.stringifyCell() はインスタンスの stringifyCell(value) と同じ結果になること', () => {
      for (const value of ['a', 'a,b', 'a"b', 'x\ny', '', null, 12.5]) {
        expect(CSV.stringifyCell(value)).toBe(new CSV().stringifyCell(value));
      }
    });
    it('CSV.stringifyRow() は1行を CSV 書式にすること(改行なし)', () => {
      expect(CSV.stringifyRow(['a', 'b,c', null, 1])).toBe('a,"b,c",,1');
      expect(CSV.stringifyRow(['a', 'b'], { delimiter: '\t' })).toBe('a\tb');
      expect(CSV.stringifyRow(['a', 'b'])).toBe(new CSV().stringifyRow(['a', 'b']));
    });
    it('静的関数も不正なオプションは RangeError', () => {
      expect(() => CSV.stringifyRow(['a'], { delimiter: ',,' })).toThrow(RangeError);
    });
    it('CSV.parse() はインスタンスを作らずに文書を返し、new CSV(options).parse(input, options) と同じ結果になること', () => {
      const text = 'Report\nid\t name \n\n1\tTaro\n2\tHanako';
      const options = { delimiter: '\t', trim: true, skipEmptyLines: true, skipRows: 1, maxRows: 2 };
      const csv = CSV.parse(text, options);
      expect(csv).toBeInstanceOf(CSV);
      expect(csv.toArray()).toEqual([['id', 'name'], ['1', 'Taro']]);
      expect(csv.toArray()).toEqual(new CSV(options).parse(text, options).toArray());
      expect(CSV.parse('a,b').toArray()).toEqual([['a', 'b']]);
    });
    it('CSV.parse() の encoding でバイト列の文字コードを指定できること', () => {
      const sjis = new Uint8Array([0x82, 0xa0, 0x2c, 0x82, 0xa2]);
      expect(CSV.parse(sjis, { encoding: 'shift_jis' }).toArray()).toEqual([['あ', 'い']]);
    });
    it('CSV.load() はストリームから文書を返し、new CSV(options).load(source, options) と同じ結果になること', async () => {
      const chunks = ['Report\nid\t na', 'me \n\n1\tTaro\n2\tHanako'];
      const options = { delimiter: '\t', trim: true, skipEmptyLines: true, skipRows: 1, maxRows: 2 };
      const csv = await CSV.load(chunks, options);
      expect(csv).toBeInstanceOf(CSV);
      expect(csv.toArray()).toEqual([['id', 'name'], ['1', 'Taro']]);
      expect(csv.toArray()).toEqual((await new CSV(options).load(chunks, options)).toArray());
      expect((await CSV.load(['a,b'])).toArray()).toEqual([['a', 'b']]);
    });
    it('CSV.load() の encoding でバイト列のストリームを読めること', async () => {
      const chunks = [new Uint8Array([0x82, 0xa0, 0x2c, 0x82]), new Uint8Array([0xa2])];
      expect((await CSV.load(chunks, { encoding: 'shift_jis' })).toArray()).toEqual([['あ', 'い']]);
    });
    it('CSV.parse() / CSV.load() も不正なオプションは RangeError', async () => {
      expect(() => CSV.parse('a', { delimiter: ',,' })).toThrow(RangeError);
      expect(() => CSV.parse('a', { skipRows: -1 })).toThrow(RangeError);
      await expect(CSV.load(['a'], { quote: '""' })).rejects.toThrow(RangeError);
      await expect(CSV.load(['a'], { maxRows: 0.5 })).rejects.toThrow(RangeError);
    });
    it('CSV.parse() / CSV.load() は構文エラーを CSVSyntaxError で投げること', async () => {
      expect(() => CSV.parse('a,"b')).toThrow(CSVSyntaxError);
      await expect(CSV.load(['a,"b'])).rejects.toThrow(CSVSyntaxError);
    });
  });

  describe('行の操作', () => {
    it('addRow() は null / undefined を空文字、他を文字列にすること', () => {
      const csv = new CSV().addRow([1, 'a', null, undefined, true, 1.5]);
      expect(csv.rowAt(0)).toEqual(['1', 'a', '', '', 'true', '1.5']);
    });
    it('addRows() で複数行を追加できること', () => {
      const csv = new CSV().addRows([[1, 2], [3, 4]]);
      expect(csv.toArray()).toEqual([['1', '2'], ['3', '4']]);
    });
    it('addRow() に渡した配列を後で変更しても影響しないこと', () => {
      const values = ['a'];
      const csv = new CSV().addRow(values);
      values.push('b');
      expect(csv.rowAt(0)).toEqual(['a']);
    });
    it('insertRow() で任意位置に挿入でき、行数と同じ位置なら末尾に追加されること', () => {
      const csv = new CSV().addRows([['a'], ['c']]);
      csv.insertRow(1, ['b']);
      csv.insertRow(3, ['d']);
      expect(csv.toArray()).toEqual([['a'], ['b'], ['c'], ['d']]);
    });
    it('insertRow() の範囲外は RangeError', () => {
      const csv = new CSV().addRow(['a']);
      expect(() => csv.insertRow(2, ['x'])).toThrow(RangeError);
      expect(() => csv.insertRow(-1, ['x'])).toThrow(RangeError);
      expect(() => csv.insertRow(0.5, ['x'])).toThrow(RangeError);
    });
    it('updateRow() で行を置き換えられること', () => {
      const csv = new CSV().addRows([['a'], ['b']]);
      csv.updateRow(1, ['B', 2]);
      expect(csv.toArray()).toEqual([['a'], ['B', '2']]);
      expect(() => csv.updateRow(2, ['x'])).toThrow(RangeError);
    });
    it('removeRows() は順序・重複を問わず同じ結果になること', () => {
      const build = () => new CSV().addRows([['0'], ['1'], ['2'], ['3'], ['4'], ['5']]);
      expect(build().removeRows(1, 3, 5).toArray()).toEqual([['0'], ['2'], ['4']]);
      expect(build().removeRows(5, 1, 3).toArray()).toEqual([['0'], ['2'], ['4']]);
      expect(build().removeRows(3, 3, 1).toArray()).toEqual([['0'], ['2'], ['4'], ['5']]);
    });
    it('removeRows() に範囲外があれば何も削除せず RangeError', () => {
      const csv = new CSV().addRows([['a'], ['b']]);
      expect(() => csv.removeRows(0, 2)).toThrow(RangeError);
      expect(csv.countRows()).toBe(2);
    });
    it('rowAt() はコピーを返し、範囲外は RangeError', () => {
      const csv = new CSV().addRow(['a']);
      csv.rowAt(0).push('x');
      expect(csv.rowAt(0)).toEqual(['a']);
      expect(() => csv.rowAt(1)).toThrow('Row index 1 is out of range (0..0)');
    });
    it('rows() で行を走査でき、取り出した行を変更しても文書に影響しないこと', () => {
      const csv = new CSV().setColumnNames('h').addRows([['a'], ['b']]);
      const rows: string[][] = [];
      for (const row of csv.rows()) {
        row.push('x');
        rows.push(row);
      }
      expect(rows).toEqual([['a', 'x'], ['b', 'x']]);
      expect(csv.toArray()).toEqual([['a'], ['b']]);
    });
  });

  describe('セルの操作', () => {
    it('columnAt() は列インデックスと列名の両方で取れること', () => {
      const csv = new CSV().parse('1,Taro').setColumnNames('id', 'name');
      expect(csv.columnAt(0, 1)).toBe('Taro');
      expect(csv.columnAt(0, 'name')).toBe('Taro');
    });
    it('columnAt() は行がその列を持たなければ空文字', () => {
      const csv = new CSV().parse('1').setColumnNames('id', 'name');
      expect(csv.columnAt(0, 'name')).toBe('');
      expect(csv.columnAt(0, 5)).toBe('');
    });
    it('columnAt() の不正な列は RangeError', () => {
      const csv = new CSV().parse('1').setColumnNames('id');
      expect(() => csv.columnAt(0, 'missing')).toThrow(`Unknown column name 'missing'`);
      expect(() => csv.columnAt(0, -1)).toThrow('Invalid column index -1');
      expect(() => csv.columnAt(0, 1.5)).toThrow(RangeError);
      expect(() => csv.columnAt(1, 0)).toThrow(RangeError);
    });
    it('updateColumn() でセルを置き換えられ、足りない列は空文字で埋まること', () => {
      const csv = new CSV().parse('1,a\r\n2').setColumnNames('id', 'name', 'memo');
      csv.updateColumn(0, 'name', 'A');
      csv.updateColumn(1, 'memo', 3);
      expect(csv.toArray()).toEqual([['1', 'A'], ['2', '', '3']]);
      expect(() => csv.updateColumn(2, 0, 'x')).toThrow(RangeError);
    });
  });

  describe('出力', () => {
    it('stringifyCell() は null / undefined を空文字にし、必要なら引用符で囲むこと', () => {
      const csv = new CSV();
      expect(csv.stringifyCell(null)).toBe('');
      expect(csv.stringifyCell(undefined)).toBe('');
      expect(csv.stringifyCell(1)).toBe('1');
      expect(csv.stringifyCell('a,b')).toBe('"a,b"');
      expect(csv.stringifyCell('d"e')).toBe('"d""e"');
      expect(csv.stringifyCell('a\tb')).toBe('a\tb');
      expect(new CSV({ delimiter: '\t' }).stringifyCell('a\tb')).toBe('"a\tb"');
      expect(new CSV({ quoteAll: true }).stringifyCell('a')).toBe('"a"');
    });
    it('stringifyRow() は必要なセルだけ引用符で囲むこと', () => {
      const csv = new CSV();
      expect(csv.stringifyRow(['a', 'b,c', 'd"e', 'f\ng', 'h\r\ni', '', null, 1])).toBe('a,"b,c","d""e","f\ng","h\r\ni",,,1');
    });
    it('stringifyRow() は区切り文字がタブなら、タブを含むセルを引用符で囲むこと', () => {
      const csv = new CSV({ delimiter: '\t' });
      expect(csv.stringifyRow(['a\tb', 'c,d'])).toBe('"a\tb"\tc,d');
    });
    it('quoteAll で全セルを引用符で囲むこと', () => {
      const csv = new CSV({ quoteAll: true });
      expect(csv.stringifyRow(['a', '', 1])).toBe('"a","","1"');
    });
    it('引用符を変更したときはその文字で囲み・エスケープすること', () => {
      const csv = new CSV({ quote: `'` });
      expect(csv.stringifyRow([`it's`, 'a,b'])).toBe(`'it''s','a,b'`);
    });
    it('toString() はヘッダと全行を出し、各行を改行で終端すること', () => {
      const csv = new CSV().setColumnNames('id', 'name').addRows([[1, 'a'], [2, 'b,c']]);
      expect(csv.toString()).toBe('id,name\r\n1,a\r\n2,"b,c"\r\n');
    });
    it('toString() はヘッダが無ければ行だけを出すこと', () => {
      expect(new CSV().addRows([[1], [2]]).toString()).toBe('1\r\n2\r\n');
      expect(new CSV().toString()).toBe('');
    });
    it('header: false ならヘッダ行を出力しないこと', async () => {
      const csv = new CSV().setColumnNames('id').addRow([1]);
      expect(csv.toString({ header: false })).toBe('1\r\n');
      expect(new TextDecoder().decode(await csv.toBytes({ header: false }))).toBe('1\r\n');
      expect([...csv.lines({ header: false })]).toEqual(['1\r\n']);
    });
    it('lines() はヘッダと各行を改行付きで1行ずつ返し、連結すると toString() と一致すること', () => {
      const csv = new CSV().setColumnNames('id', 'name').addRows([[1, 'a'], [2, 'b,c']]);
      expect([...csv.lines()]).toEqual(['id,name\r\n', '1,a\r\n', '2,"b,c"\r\n']);
      expect([...csv.lines()].join('')).toBe(csv.toString());
    });
    it('lineSeparator を変更できること', () => {
      expect(new CSV({ lineSeparator: '\n' }).addRows([[1], [2]]).toString()).toBe('1\n2\n');
    });
    it('parse() と toString() を往復しても内容が保たれること', () => {
      const text = 'a,"b,c"\r\n"d""e","f\r\ng"\r\n,\r\n';
      expect(new CSV().parse(text).toString()).toBe(text);
    });
    it('toBytes() は既定で UTF-8 / BOM なしのバイト列を返すこと', async () => {
      const bytes = await new CSV().addRow(['a', 'あ']).toBytes();
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(bytes)).toBe('a,あ\r\n');
      expect(bytes[0]).toBe(0x61);
    });
    it('toBytes() で UTF-16LE + BOM を出せること', async () => {
      const bytes = await new CSV({ delimiter: '\t' }).addRow(['a', 'あ']).toBytes({ encoding: 'utf-16le', bom: true });
      expect([...bytes.slice(0, 4)]).toEqual([0xff, 0xfe, 0x61, 0x00]);
      expect(new TextDecoder('utf-16le').decode(bytes)).toBe('a\tあ\r\n');
    });
    it('toBytes() は encoder で任意の文字コードに変換できること', async () => {
      // 'あ' の Shift_JIS だけを返す簡易な変換
      const encoder = async (text: string): Promise<Uint8Array> => new Uint8Array([...text].flatMap((c) => c === 'あ' ? [0x82, 0xa0] : [c.charCodeAt(0)]));
      const bytes = await new CSV().addRow(['あ']).toBytes({ encoder });
      expect(new CSV().parse(bytes, { encoding: 'shift_jis' }).toArray()).toEqual([['あ']]);
    });
    it('bytes() を連結すると toBytes() と一致し、BOM は先頭にだけ付くこと', async () => {
      const csv = new CSV().setColumnNames('id').addRows([[1], [2]]);
      const options = {
        encoding: 'utf-16le',
        bom: true
      } as const;
      const chunks: number[] = [];
      for await (const chunk of csv.bytes(options)) {
        chunks.push(...chunk);
      }
      expect(chunks).toEqual([...await csv.toBytes(options)]);
      expect(new TextDecoder('utf-16le', { ignoreBOM: true }).decode(new Uint8Array(chunks))).toBe('\ufeffid\r\n1\r\n2\r\n');
    });
    it('CSV.encode() は stringifyRow() と組み合わせてストリーム書き出しに使えること', async () => {
      const csv = new CSV();
      const head = await CSV.encode(csv.stringifyRow(['id']) + '\r\n', { encoding: 'utf-16le', bom: true });
      const body = await CSV.encode(csv.stringifyRow([1]) + '\r\n', { encoding: 'utf-16le' });
      const joined = new Uint8Array([...head, ...body]);
      expect(new TextDecoder('utf-16le').decode(joined)).toBe('id\r\n1\r\n');
    });
    it('toArray() はコピーを返すこと', () => {
      const csv = new CSV().addRow(['a']);
      csv.toArray()[0].push('x');
      expect(csv.toArray()).toEqual([['a']]);
    });
    it('toObjects() は列名をキーにし、足りない列は空文字にすること', () => {
      const csv = new CSV().parse('1,Taro\r\n2').setColumnNames('id', 'name');
      expect(csv.toObjects()).toEqual([{ id: '1', name: 'Taro' }, { id: '2', name: '' }]);
    });
    it('toObjects() は列名が無ければ Error', () => {
      expect(() => new CSV().parse('1').toObjects()).toThrow('Column names are not set');
    });
  });
});
