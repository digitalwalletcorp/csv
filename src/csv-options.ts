/**
 * CSV / CSVParser 共通の設定
 */
export type CSVOptions = {
  /** 区切り文字(1文字)。既定は `,`。TSV は `\t` */
  delimiter?: string;
  /** 引用符(1文字)。既定は `"` */
  quote?: string;
  /** 書き出し時の改行。既定は `\r\n` */
  lineSeparator?: string;
  /** true なら全セルを引用符で囲む。既定は false(区切り文字・引用符・改行を含むセルのみ囲む) */
  quoteAll?: boolean;
  /** true なら解析時に引用符で囲まれていないセルの前後空白を除く。既定は false */
  trim?: boolean;
  /** true なら解析時に空行をレコードとして返さない。既定は false */
  skipEmptyLines?: boolean;
};

export type ResolvedCSVOptions = Required<CSVOptions>;

const DEFAULTS: ResolvedCSVOptions = {
  delimiter: ',',
  quote: '"',
  lineSeparator: '\r\n',
  quoteAll: false,
  trim: false,
  skipEmptyLines: false
};

/**
 * 既定値を補い、解析が成立しない組み合わせを弾く
 */
export const resolveOptions = (options?: CSVOptions): ResolvedCSVOptions => {
  const resolved = { ...DEFAULTS, ...options };
  for (const [name, value] of [['delimiter', resolved.delimiter], ['quote', resolved.quote]] as const) {
    if (value.length !== 1 || value === '\r' || value === '\n') {
      throw new RangeError(`${name} must be a single character other than a line break`);
    }
  }
  if (resolved.delimiter === resolved.quote) {
    throw new RangeError('delimiter and quote must be different characters');
  }
  return resolved;
};
