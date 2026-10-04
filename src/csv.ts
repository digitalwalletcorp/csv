import { CSVOptions, ResolvedCSVOptions, resolveOptions } from './csv-options';
import { CSVParser, CSVRecord } from './csv-parser';
import { Chunk, DecodeOptions, EncodeOptions, encode, encodeChunks } from './csv-encoding';

/**
 * 列の値の取り出し方
 * - string: 行オブジェクトのプロパティ名
 * - 関数: 行オブジェクトと追加先の行位置(0始まり)から値を作る。ネストした値・整形・連番に使う
 */
export type ColumnValue<T> = string | ((row: T, rowIndex: number) => unknown);

/**
 * 列定義
 * - 配列: ヘッダ名 = プロパティ名
 * - オブジェクト: ヘッダ名 → 値の取り出し方
 */
export type Columns<T> = readonly string[] | Readonly<Record<string, ColumnValue<T>>>;

/**
 * 読み込み(parse / load)の指定
 */
export type ReadOptions = DecodeOptions & {
  /** 先頭から読み飛ばすレコード数。0 以上の整数で、既定は 0 */
  skipRows?: number;
  /** 読み飛ばした後に取り込む最大レコード数。0 以上の整数で、超えた分は読まずに打ち切る */
  maxRows?: number;
};

/**
 * 書き出し(lines / toString / bytes / toBytes)の指定
 */
export type WriteOptions = {
  /** false なら列名があってもヘッダ行を出力しない。既定は true */
  header?: boolean;
};

/**
 * CSV 文書
 *
 * ヘッダ(列名)と行データをメモリ上に保持し、行・セルの操作と CSV 書式の文字列への変換を行う。セルは常に文字列として保持する
 * 巨大なファイルを順に読むだけなら、全行を保持しない CSVParser.parse を使う
 *
 * Node.jsとブラウザでストリーム制御の仕組みが異なり、共通のインターフェースで扱うと実行環境に依存するため、ファイル・ストリームへの書き込み処理は提供しない。
 * 書き込む場合は lines() または bytes() を出力先に渡す
 */
export class CSV {

  private readonly options: ResolvedCSVOptions;
  private columnNames: string[] = [];
  /** setColumns で登録した各列の取り出し方。未登録なら null */
  private columns: ColumnValue<unknown>[] | null = null;
  private rowValues: string[][] = [];

  constructor(options?: CSVOptions) {
    this.options = resolveOptions(options);
  }

  /* 読み込み */

  /**
   * 文字列またはバイト列を厳密解析した新しい文書を返す。`new CSV(options).parse(input, options)` と同じ処理
   *
   * @param {Chunk} input 文字列、またはバイト列(Buffer / Uint8Array)
   * @param {CSVOptions & ReadOptions} [options] 区切り文字などの CSVOptions と、encoding / skipRows / maxRows の ReadOptions を1つのオブジェクトで指定する
   * @returns {CSV}
   */
  public static parse(input: Chunk, options?: CSVOptions & ReadOptions): CSV {
    const { encoding, skipRows, maxRows, ...csvOptions } = options ?? {};
    return new CSV(csvOptions).parse(input, { encoding, skipRows, maxRows });
  }

  /**
   * ストリームを厳密解析した新しい文書を返す。`new CSV(options).load(source, options)` と同じ処理
   *
   * @param {Iterable<Chunk> | AsyncIterable<Chunk>} source 文字列またはバイト列のチャンク列。fs.createReadStream をそのまま渡せる
   * @param {CSVOptions & ReadOptions} [options] 区切り文字などの CSVOptions と、encoding / skipRows / maxRows の ReadOptions を1つのオブジェクトで指定する
   * @returns {Promise<CSV>}
   */
  public static async load(source: Iterable<Chunk> | AsyncIterable<Chunk>, options?: CSVOptions & ReadOptions): Promise<CSV> {
    const { encoding, skipRows, maxRows, ...csvOptions } = options ?? {};
    return new CSV(csvOptions).load(source, { encoding, skipRows, maxRows });
  }

  /**
   * 文字列またはバイト列を厳密解析して行データを置き換える。列名・列定義はそのまま残す
   *
   * @param {Chunk} input 文字列、またはバイト列(Buffer / Uint8Array)
   * @param {ReadOptions} [options] encoding はバイト列の文字コード。既定は utf-8
   * @returns {this}
   */
  public parse(input: Chunk, options?: ReadOptions): this {
    const text = typeof input === 'string' ? input : new TextDecoder(options?.encoding ?? 'utf-8').decode(input);
    const parser = new CSVParser(this.options);
    this.rowValues = CSV.takeRecords([...parser.write(text), ...parser.end()], options);
    return this;
  }

  /**
   * ストリームを厳密解析して行データを置き換える。列名・列定義はそのまま残す
   *
   * @param {Iterable<Chunk> | AsyncIterable<Chunk>} source 文字列またはバイト列のチャンク列。fs.createReadStream をそのまま渡せる
   * @param {ReadOptions} [options] encoding はバイト列の文字コード。既定は utf-8
   * @returns {Promise<this>}
   */
  public async load(source: Iterable<Chunk> | AsyncIterable<Chunk>, options?: ReadOptions): Promise<this> {
    const { skipRows = 0, maxRows, encoding } = options ?? {};
    CSV.assertReadOptions(skipRows, maxRows);
    const rowValues: string[][] = [];
    if (maxRows === undefined || 0 < maxRows) {
      let skipped = 0;
      for await (const record of new CSVParser(this.options).parse(source, { encoding })) {
        if (skipped < skipRows) {
          skipped++;
          continue;
        }
        rowValues.push(record.values);
        if (maxRows !== undefined && maxRows <= rowValues.length) {
          break;
        }
      }
    }
    this.rowValues = rowValues;
    return this;
  }

  /* ヘッダ */

  /**
   * 列名を設定する(既存の列名・列定義は置き換える)
   *
   * @param {...string} names
   * @returns {this}
   */
  public setColumnNames(...names: string[]): this {
    this.columnNames = [...names];
    this.columns = null;
    return this;
  }

  /**
   * 指定した行を列名として取り込み、その行までを行データから取り除く(既存の列名・列定義は置き換える)
   *
   * @param {number} rowIndex 0始まり
   * @returns {this}
   */
  public useRowAsHeader(rowIndex: number): this {
    this.setColumnNames(...this.rowAt(rowIndex));
    this.rowValues.splice(0, rowIndex + 1);
    return this;
  }

  /**
   * 列名と、行オブジェクトから各列の値を取り出す方法を登録する(既存の列名は置き換える)
   * addObject / addObjects はこの定義で行オブジェクトを行データに変換する
   *
   * @param {Columns<T>} columns 配列ならヘッダ名 = プロパティ名。オブジェクトならヘッダ名 → プロパティ名または関数
   * @returns {this}
   */
  public setColumns<T>(columns: Columns<T>): this {
    const entries: [string, ColumnValue<T>][] = Array.isArray(columns)
      ? (columns as readonly string[]).map((name) => [name, name])
      : Object.entries(columns as Readonly<Record<string, ColumnValue<T>>>);
    this.columnNames = entries.map(([name]) => name);
    this.columns = entries.map(([, value]) => value as ColumnValue<unknown>);
    return this;
  }

  /**
   * @returns {string[]} 列名のコピー
   */
  public getColumnNames(): string[] {
    return [...this.columnNames];
  }

  /**
   * @param {string} name 列名
   * @returns {number} 列インデックス。見つからなければ -1
   */
  public columnIndexOf(name: string): number {
    return this.columnNames.indexOf(name);
  }

  /* 行 */

  /**
   * 末尾に行を追加する。null / undefined は空文字、それ以外は String() で文字列にする
   *
   * @param {readonly unknown[]} values
   * @returns {this}
   */
  public addRow(values: readonly unknown[]): this {
    this.rowValues.push(CSV.toCellStrings(values));
    return this;
  }

  /**
   * 末尾に複数行を追加する
   *
   * @param {Iterable<readonly unknown[]>} rows
   * @returns {this}
   */
  public addRows(rows: Iterable<readonly unknown[]>): this {
    for (const values of rows) {
      this.addRow(values);
    }
    return this;
  }

  /**
   * 行オブジェクトを setColumns の定義で行データに変換して末尾に追加する
   * 列定義が無ければ、設定済みの列名、それも無ければこの行オブジェクトのキーをプロパティ名として列定義を登録する
   *
   * @param {T} row
   * @returns {this}
   */
  public addObject<T extends object>(row: T): this {
    if (!this.columns) {
      this.setColumns(0 < this.columnNames.length ? this.columnNames : Object.keys(row));
    }
    const rowIndex = this.rowValues.length;
    return this.addRow(this.columns!.map((column) => typeof column === 'function'
      ? column(row, rowIndex)
      : (row as Record<string, unknown>)[column]));
  }

  /**
   * 複数の行オブジェクトを末尾に追加する
   *
   * @param {Iterable<T>} rows
   * @returns {this}
   */
  public addObjects<T extends object>(rows: Iterable<T>): this {
    for (const row of rows) {
      this.addObject(row);
    }
    return this;
  }

  /**
   * 指定位置に行を挿入する
   *
   * @param {number} rowIndex 0始まり。行数と同じ値なら末尾に追加
   * @param {readonly unknown[]} values
   * @returns {this}
   */
  public insertRow(rowIndex: number, values: readonly unknown[]): this {
    this.assertRowIndex(rowIndex, this.rowValues.length);
    this.rowValues.splice(rowIndex, 0, CSV.toCellStrings(values));
    return this;
  }

  /**
   * 指定行を置き換える
   *
   * @param {number} rowIndex 0始まり
   * @param {readonly unknown[]} values
   * @returns {this}
   */
  public updateRow(rowIndex: number, values: readonly unknown[]): this {
    this.assertRowIndex(rowIndex, this.rowValues.length - 1);
    this.rowValues[rowIndex] = CSV.toCellStrings(values);
    return this;
  }

  /**
   * 指定行を削除する。順序は問わず、重複は1回として扱う
   *
   * @param {...number} rowIndexes 0始まり
   * @returns {this}
   */
  public removeRows(...rowIndexes: number[]): this {
    for (const rowIndex of rowIndexes) {
      this.assertRowIndex(rowIndex, this.rowValues.length - 1);
    }
    for (const rowIndex of [...new Set(rowIndexes)].sort((a, b) => b - a)) {
      this.rowValues.splice(rowIndex, 1);
    }
    return this;
  }

  /**
   * @param {number} rowIndex 0始まり
   * @returns {string[]} 行のコピー
   */
  public rowAt(rowIndex: number): string[] {
    this.assertRowIndex(rowIndex, this.rowValues.length - 1);
    return [...this.rowValues[rowIndex]];
  }

  /**
   * @returns {number} 行数(ヘッダは含まない)
   */
  public countRows(): number {
    return this.rowValues.length;
  }

  /**
   * 行データを先頭から1行ずつ返す(ヘッダは含まない)
   *
   * @returns {Generator<string[]>} 行のコピー
   */
  public * rows(): Generator<string[]> {
    for (const row of this.rowValues) {
      yield [...row];
    }
  }

  /* セル */

  /**
   * セルの値を返す
   *
   * @param {number} rowIndex 0始まり
   * @param {number | string} column 列インデックス、または列名
   * @returns {string} 行がその列まで持たない場合は空文字
   */
  public columnAt(rowIndex: number, column: number | string): string {
    this.assertRowIndex(rowIndex, this.rowValues.length - 1);
    return this.rowValues[rowIndex][this.resolveColumn(column)] ?? '';
  }

  /**
   * セルの値を置き換える。行がその列まで持たない場合は空文字で埋めて拡張する
   *
   * @param {number} rowIndex 0始まり
   * @param {number | string} column 列インデックス、または列名
   * @param {unknown} value
   * @returns {this}
   */
  public updateColumn(rowIndex: number, column: number | string, value: unknown): this {
    this.assertRowIndex(rowIndex, this.rowValues.length - 1);
    const columnIndex = this.resolveColumn(column);
    const row = this.rowValues[rowIndex];
    while (row.length < columnIndex) {
      row.push('');
    }
    row[columnIndex] = CSV.toCellString(value);
    return this;
  }

  /* 出力 */

  /**
   * 1セルを CSV 書式の文字列にする。`new CSV(options).stringifyCell(value)` と同じ処理
   * 文書を作らず値だけを CSV 書式にしたいときに使う
   *
   * @param {unknown} value
   * @param {CSVOptions} [options]
   * @returns {string}
   */
  public static stringifyCell(value: unknown, options?: CSVOptions): string {
    return new CSV(options).stringifyCell(value);
  }

  /**
   * 1行分を CSV 書式の文字列にする(改行なし)。`new CSV(options).stringifyRow(values)` と同じ処理
   * 文書を作らず1行だけを CSV 書式にしたいときに使う
   *
   * @param {readonly unknown[]} values
   * @param {CSVOptions} [options]
   * @returns {string}
   */
  public static stringifyRow(values: readonly unknown[], options?: CSVOptions): string {
    return new CSV(options).stringifyRow(values);
  }

  /**
   * 1セルを CSV 書式の文字列にする。null / undefined は空文字、それ以外は String() で文字列にし、必要なら引用符で囲む
   *
   * @param {unknown} value
   * @returns {string}
   */
  public stringifyCell(value: unknown): string {
    return this.quoteIfNeeded(CSV.toCellString(value));
  }

  /**
   * 1行分を CSV 書式の文字列にする(改行なし)
   *
   * @param {readonly unknown[]} values
   * @returns {string}
   */
  public stringifyRow(values: readonly unknown[]): string {
    return values.map((value) => this.stringifyCell(value)).join(this.options.delimiter);
  }

  /**
   * ヘッダ(列名があれば)と全行を、1行ずつ改行で終端した文字列で返す
   *
   * @param {WriteOptions} [options]
   * @returns {Generator<string>}
   */
  public * lines(options?: WriteOptions): Generator<string> {
    const { header = true } = options ?? {};
    const { lineSeparator } = this.options;
    if (header && 0 < this.columnNames.length) {
      yield this.stringifyRow(this.columnNames) + lineSeparator;
    }
    for (const row of this.rowValues) {
      yield this.stringifyRow(row) + lineSeparator;
    }
  }

  /**
   * lines() を連結した文字列を返す
   *
   * @param {WriteOptions} [options]
   * @returns {string}
   */
  public toString(options?: WriteOptions): string {
    return [...this.lines(options)].join('');
  }

  /**
   * lines() をバイト列にして、先頭から順に返す。全体の文字列は作らない
   *
   * @param {EncodeOptions & WriteOptions} [options] 既定は utf-8 / BOM なし。Excel 向けは `{ encoding: 'utf-16le', bom: true }`
   * @returns {AsyncGenerator<Uint8Array>}
   */
  public async * bytes(options?: EncodeOptions & WriteOptions): AsyncGenerator<Uint8Array> {
    const { header, ...encodeOptions } = options ?? {};
    yield * encodeChunks(this.lines({ header }), encodeOptions);
  }

  /**
   * bytes() を連結したバイト列を返す
   *
   * @param {EncodeOptions & WriteOptions} [options] 既定は utf-8 / BOM なし。Excel 向けは `{ encoding: 'utf-16le', bom: true }`
   * @returns {Promise<Uint8Array>}
   */
  public async toBytes(options?: EncodeOptions & WriteOptions): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    let length = 0;
    for await (const chunk of this.bytes(options)) {
      chunks.push(chunk);
      length += chunk.length;
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return bytes;
  }

  /**
   * 文字列をバイト列にする。ストリームで書き出すときに stringifyRow() と組み合わせて使う
   *
   * @param {string} text
   * @param {EncodeOptions} [options]
   * @returns {Promise<Uint8Array>}
   */
  public static encode(text: string, options?: EncodeOptions): Promise<Uint8Array> {
    return encode(text, options);
  }

  /**
   * @returns {string[][]} 行データのコピー(ヘッダは含まない)
   */
  public toArray(): string[][] {
    return this.rowValues.map((row) => [...row]);
  }

  /**
   * 列名をキーにしたオブジェクトの配列を返す。行がその列まで持たない場合は空文字
   *
   * @returns {Record<string, string>[]}
   */
  public toObjects(): Record<string, string>[] {
    if (this.columnNames.length === 0) {
      throw new Error('Column names are not set');
    }
    return this.rowValues.map((row) => Object.fromEntries(this.columnNames.map((name, i) => [name, row[i] ?? ''])));
  }

  private quoteIfNeeded(value: string): string {
    const { delimiter, quote, quoteAll } = this.options;
    if (!quoteAll && !value.includes(delimiter) && !value.includes(quote) && !/[\r\n]/.test(value)) {
      return value;
    }
    return `${quote}${value.split(quote).join(quote + quote)}${quote}`;
  }

  private resolveColumn(column: number | string): number {
    const columnIndex = typeof column === 'string' ? this.columnNames.indexOf(column) : column;
    if (columnIndex < 0 || !Number.isInteger(columnIndex)) {
      throw new RangeError(typeof column === 'string' ? `Unknown column name '${column}'` : `Invalid column index ${column}`);
    }
    return columnIndex;
  }

  private assertRowIndex(rowIndex: number, max: number): void {
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || max < rowIndex) {
      throw new RangeError(`Row index ${rowIndex} is out of range (0..${max})`);
    }
  }

  private static takeRecords(records: CSVRecord[], options?: ReadOptions): string[][] {
    const { skipRows = 0, maxRows } = options ?? {};
    CSV.assertReadOptions(skipRows, maxRows);
    return records.slice(skipRows, maxRows === undefined ? undefined : skipRows + maxRows).map((record) => record.values);
  }

  private static assertReadOptions(skipRows: number, maxRows: number | undefined): void {
    if (!Number.isInteger(skipRows) || skipRows < 0) {
      throw new RangeError(`skipRows must be a non-negative integer: ${skipRows}`);
    }
    if (maxRows !== undefined && (!Number.isInteger(maxRows) || maxRows < 0)) {
      throw new RangeError(`maxRows must be a non-negative integer: ${maxRows}`);
    }
  }

  private static toCellString(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private static toCellStrings(values: readonly unknown[]): string[] {
    return values.map((value) => CSV.toCellString(value));
  }
}
