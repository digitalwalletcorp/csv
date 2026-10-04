/**
 * 厳密解析で入力が CSV の構文に合わなかったことを表す
 */
export class CSVSyntaxError extends Error {

  /** 物理行(1始まり) */
  public readonly line: number;
  /** 行内の位置(1始まり) */
  public readonly column: number;

  constructor(message: string, line: number, column: number) {
    super(`${message} (line ${line}, column ${column})`);
    this.name = 'CSVSyntaxError';
    this.line = line;
    this.column = column;
  }
}
