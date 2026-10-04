import { CSVOptions, ResolvedCSVOptions, resolveOptions } from './csv-options';
import { CSVSyntaxError } from './csv-syntax-error';
import { Chunk, DecodeOptions, decodeChunks } from './csv-encoding';

/**
 * 解析結果の1レコード
 */
export type CSVRecord = {
  /** セルの値。引用符は外し、`""` は `"` に戻した状態 */
  values: string[];
  /** レコードが始まる物理行(1始まり) */
  line: number;
};

/**
 * CSV の厳密解析器
 *
 * チャンク単位で入力を受け取り、確定したレコードを返す。引用符で囲まれたセル内の区切り文字・改行・`""` を扱う。
 * 次の入力は構文エラーとする:
 * - セルの先頭以外に現れる引用符(引用符で囲まれていないセルに引用符がある)
 * - 閉じ引用符の直後が区切り文字・改行・引用符(エスケープ)以外
 * - 閉じられていない引用符
 */
export class CSVParser {

  private readonly options: ResolvedCSVOptions;

  private values: string[] = [];
  private field = '';
  private fieldStarted = false;
  private quoted = false;
  private inQuote = false;
  private recordLine = 1;
  private line = 1;
  private column = 0;
  /** チャンク末尾の `\r` は `\r\n` の前半かもしれないため次のチャンクまで持ち越す */
  private carry = '';
  private started = false;

  constructor(options?: CSVOptions) {
    this.options = resolveOptions(options);
  }

  /**
   * 入力の一部を与え、この時点で確定したレコードを返す
   *
   * @param {string} chunk
   * @returns {CSVRecord[]}
   */
  public write(chunk: string): CSVRecord[] {
    const text = this.carry + chunk;
    this.carry = '';
    try {
      return this.process(text, false);
    } catch (error) {
      // 構文エラーの後に同じインスタンスを使い回せるよう、途中状態を残さない
      this.reset();
      throw error;
    }
  }

  /**
   * 入力の終わりを通知し、残っているレコードを返す。呼び出し後は初期状態に戻る
   *
   * @returns {CSVRecord[]}
   */
  public end(): CSVRecord[] {
    try {
      const records = this.process(this.carry, true);
      if (this.inQuote) {
        throw new CSVSyntaxError('Unterminated quoted field', this.recordLine, this.column);
      }
      if (this.fieldStarted || this.values.length > 0) {
        this.pushRecord(records);
      }
      return records;
    } finally {
      this.reset();
    }
  }

  /**
   * 入力全体を逐次解析する。途中で break しても問題ない
   *
   * @param {Iterable<Chunk> | AsyncIterable<Chunk>} source 文字列またはバイト列のチャンク列。fs.createReadStream や Readable をそのまま渡せる
   * @param {DecodeOptions} [options] バイト列の文字コード。既定は utf-8
   * @returns {AsyncGenerator<CSVRecord>}
   */
  public async * parse(source: Iterable<Chunk> | AsyncIterable<Chunk>, options?: DecodeOptions): AsyncGenerator<CSVRecord> {
    this.reset();
    for await (const chunk of decodeChunks(source, options)) {
      yield * this.write(chunk);
    }
    yield * this.end();
  }

  private process(text: string, final: boolean): CSVRecord[] {
    if (!this.started) {
      this.started = true;
      if (text.startsWith('\uFEFF')) {
        text = text.slice(1);
      }
    }
    const records: CSVRecord[] = [];
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && i === text.length - 1 && !final) {
          // `\r\n` の前半かもしれないため、次のチャンクと合わせて判定する
          this.carry = '\r';
          break;
        }
        let lineBreak = ch;
        if (ch === '\r' && text[i + 1] === '\n') {
          lineBreak = '\r\n';
          i++;
        }
        if (this.inQuote) {
          this.field += lineBreak;
        } else {
          this.pushRecord(records);
        }
        this.line++;
        this.column = 0;
        continue;
      }
      this.column++;
      this.consume(ch);
    }
    return records;
  }

  private consume(ch: string): void {
    const { delimiter, quote } = this.options;
    if (this.inQuote) {
      if (ch === quote) {
        this.inQuote = false;
      } else {
        this.field += ch;
      }
      return;
    }
    if (ch === quote) {
      if (!this.fieldStarted) {
        this.fieldStarted = true;
        this.quoted = true;
        this.inQuote = true;
      } else if (this.quoted) {
        // 閉じ引用符の直後の引用符はエスケープ
        this.field += quote;
        this.inQuote = true;
      } else {
        throw new CSVSyntaxError('Quote must be at the start of a field', this.line, this.column);
      }
      return;
    }
    if (ch === delimiter) {
      this.pushField();
      return;
    }
    if (this.quoted) {
      throw new CSVSyntaxError('Unexpected character after closing quote', this.line, this.column);
    }
    this.fieldStarted = true;
    this.field += ch;
  }

  private pushField(): void {
    this.values.push(!this.quoted && this.options.trim ? this.field.trim() : this.field);
    this.field = '';
    this.fieldStarted = false;
    this.quoted = false;
  }

  private pushRecord(records: CSVRecord[]): void {
    const empty = !this.fieldStarted && this.values.length === 0;
    this.pushField();
    if (!(empty && this.options.skipEmptyLines)) {
      records.push({ values: this.values, line: this.recordLine });
    }
    this.values = [];
    this.recordLine = this.line + 1;
  }

  private reset(): void {
    this.values = [];
    this.field = '';
    this.fieldStarted = false;
    this.quoted = false;
    this.inQuote = false;
    this.recordLine = 1;
    this.line = 1;
    this.column = 0;
    this.carry = '';
    this.started = false;
  }
}
