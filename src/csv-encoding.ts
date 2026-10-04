import type { Awaitable } from './types/common';

/**
 * バイト列へ書き出すときの文字コード指定
 * 標準 API で符号化できる encoding か、任意の文字コードに変換する encoder のどちらかを指定する
 */
export type EncodeOptions = {
  /** 既定は `utf-8`。標準 API で符号化できるのはこの2つ */
  encoding?: 'utf-8' | 'utf-16le';
  /** true なら先頭に BOM を付ける。既定は false */
  bom?: boolean;
  encoder?: never;
} | {
  /** 文字列をバイト列にする関数。Shift_JIS など、標準 API で符号化できない文字コードで書き出すときに指定する。BOM が必要なら関数の中で付ける */
  encoder: (text: string) => Awaitable<Uint8Array>;
  encoding?: never;
  bom?: never;
};

/**
 * バイト列を読み込むときの文字コード指定
 */
export type DecodeOptions = {
  /** TextDecoder が受け付けるラベル(`utf-8` / `utf-16le` / `shift_jis` など)。既定は `utf-8` */
  encoding?: string;
};

export type Chunk = string | Uint8Array;

/** encodeChunks が1回の変換にまとめる文字数の目安 */
const ENCODE_CHUNK_LENGTH = 64 * 1024;

/**
 * 文字列をバイト列にする
 *
 * @param {string} text
 * @param {EncodeOptions} [options]
 * @returns {Promise<Uint8Array>}
 */
export const encode = async (text: string, options?: EncodeOptions): Promise<Uint8Array> => {
  if (options?.encoder) {
    return options.encoder(text);
  }
  return encodeText(options?.bom ? `\ufeff${text}` : text, options?.encoding);
};

/**
 * 文字列のチャンク列を、バイト列のチャンク列にする
 * 変換の呼び出し回数を抑えるため、一定の文字数がたまるまで連結してから変換する。BOM は先頭に1回だけ付ける
 *
 * @param {Iterable<string>} source
 * @param {EncodeOptions} [options]
 * @returns {AsyncGenerator<Uint8Array>}
 */
export async function * encodeChunks(source: Iterable<string>, options?: EncodeOptions): AsyncGenerator<Uint8Array> {
  const convert = (text: string): Awaitable<Uint8Array> => options?.encoder
    ? options.encoder(text)
    : encodeText(text, options?.encoding);
  let text = options?.bom ? '\ufeff' : '';
  for (const chunk of source) {
    text += chunk;
    if (ENCODE_CHUNK_LENGTH <= text.length) {
      yield await convert(text);
      text = '';
    }
  }
  if (text) {
    yield await convert(text);
  }
}

/**
 * 標準 API で符号化できる文字コードで、文字列をバイト列にする
 *
 * @param {string} text
 * @param {string} [encoding] 既定は utf-8
 * @returns {Uint8Array}
 */
const encodeText = (text: string, encoding: string = 'utf-8'): Uint8Array => {
  if (encoding === 'utf-8') {
    return new TextEncoder().encode(text);
  }
  if (encoding !== 'utf-16le') {
    throw new RangeError(`Unsupported encoding '${encoding}'`);
  }
  // 実行環境のエンディアンに依存しないよう、Uint16Array を使わず 1 バイトずつ書く
  const bytes = new Uint8Array(text.length * 2);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes[i * 2] = code & 0xff;
    bytes[i * 2 + 1] = code >> 8;
  }
  return bytes;
};

/**
 * 文字列とバイト列が混在するチャンク列を、文字列のチャンク列にする
 * バイト列は複数チャンクに跨るマルチバイト文字を考慮して逐次復号する
 */
export async function * decodeChunks(source: Iterable<Chunk> | AsyncIterable<Chunk>, options?: DecodeOptions): AsyncGenerator<string> {
  const decoder = new TextDecoder(options?.encoding ?? 'utf-8');
  for await (const chunk of source) {
    yield typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
  }
  yield decoder.decode();
}
