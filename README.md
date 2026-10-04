# csv

[![NPM Version](https://img.shields.io/npm/v/%40digitalwalletcorp%2Fcsv)](https://www.npmjs.com/package/@digitalwalletcorp/csv) [![License](https://img.shields.io/npm/l/%40digitalwalletcorp%2Fcsv)](https://opensource.org/licenses/MIT) [![Build Status](https://img.shields.io/github/actions/workflow/status/digitalwalletcorp/csv/ci.yml?branch=main)](https://github.com/digitalwalletcorp/csv/actions) [![Test Coverage](https://img.shields.io/codecov/c/github/digitalwalletcorp/csv.svg)](https://codecov.io/gh/digitalwalletcorp/csv)

Build, parse, edit, and format CSV and TSV data.

#### ✨ Features

* **Document model**: `CSV` holds column names, column definitions and rows, and offers row / cell operations and formatting. Build it from arrays or from objects.
* **Strict parsing**: `CSVParser` follows RFC 4180 quoting and reports the line and column of invalid input.
* **Streaming**: Parse `Readable` / `AsyncIterable` inputs record by record, and stop early. Write line by line with `lines()`, `bytes()` or `stringifyRow()`.
* **TSV**: Set `delimiter: '\t'`. Any other single character can also be used as the delimiter.
* **Encodings**: Read UTF-8 / UTF-16 / Shift_JIS and other `TextDecoder` encodings. Write UTF-8 or UTF-16LE with or without BOM, or any other encoding such as Shift_JIS with your own `encoder`.
* **Zero Dependencies**: No external library is required.

> ⚠️ **Memory**: `CSV` keeps every row in memory. `parse()` takes the whole input, and `load()` collects every record while reading. To process a large file without holding it, read it record by record with [`CSVParser`](#-csvparser), and write it line by line with `stringifyRow()`.

> ⚠️ **Formulas**: Values that start with `=`, `+`, `-` or `@` are not escaped. When the resulting CSV is opened by a spreadsheet application such as Excel, these values may be interpreted as formulas.

#### ✅ Compatibility

- ✅ **Node.js**: Fully supported on all modern Node.js versions.
- ✅ **Browsers**: Fully supported on all modern browsers that support ES2022.
- ✅ **Module formats**: CommonJS and ESM.

#### 📦 Installation

```bash
npm install @digitalwalletcorp/csv
# or
yarn add @digitalwalletcorp/csv
```

#### 📖 Usage

```ts
import { CSV } from '@digitalwalletcorp/csv';

const csv = new CSV().setColumnNames('id', 'name').addRow([1, 'Taro, Yamada']);
csv.toString(); // 'id,name\r\n1,"Taro, Yamada"\r\n'

const parsed = new CSV().parse(csv.toString()).useRowAsHeader(0);
parsed.columnAt(0, 'name'); // 'Taro, Yamada'
```

##### Read and write TSV

```ts
import { CSV, CSVParser } from '@digitalwalletcorp/csv';

const tsv = new CSV({ delimiter: '\t' }).parse('id\tname\r\n1\tTaro\r\n').useRowAsHeader(0);
tsv.addRow([2, 'Hanako']);
tsv.toString(); // 'id\tname\r\n1\tTaro\r\n2\tHanako\r\n'

new CSVParser({ delimiter: '\t' }).parse(readable); // record by record
```

##### Write database rows to a TSV file for Excel (UTF-16LE with BOM)

```ts
import { writeFile } from 'node:fs/promises';
import { CSV } from '@digitalwalletcorp/csv';

const csv = new CSV({ delimiter: '\t' }).setColumns({
  '#': (row, i) => i + 1,
  'ID': 'id',
  'Name': 'name',
  'Registered': (row) => row.created_at.toISOString()
});

const { rows } = await pool.query('SELECT id, name, created_at FROM members ORDER BY id');
csv.addObjects(rows);

await writeFile('members.tsv', await csv.toBytes({ encoding: 'utf-16le', bom: true }));
```

##### Write a document to a file as a stream

```ts
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

await pipeline(Readable.from(csv.lines({ header: false })), createWriteStream('members.csv'));
```

##### Write a Shift_JIS file

The standard APIs cannot write Shift_JIS. Pass an `encoder` that converts text with an encoding library of your choice. It may return a `Promise`.

```ts
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import iconv from 'iconv-lite';

const sjis = { encoder: (text: string) => iconv.encode(text, 'Shift_JIS') };
await pipeline(Readable.from(csv.bytes(sjis)), createWriteStream('cards.csv'));
```

```ts
import Encoding from 'encoding-japanese';

const encoder = (text: string) => new Uint8Array(Encoding.convert(Encoding.stringToCode(text), { to: 'SJIS', from: 'UNICODE' }));
const blob = new Blob([await csv.toBytes({ encoder })], { type: 'text/csv' });
```

##### Read an existing CSV file and print it

```ts
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { CSV } from '@digitalwalletcorp/csv';

// A Shift_JIS file without a header row, first 20 rows only
const products = await new CSV().load(createReadStream('products.csv'), { encoding: 'shift_jis', maxRows: 20 });
products.setColumnNames('code', 'name', 'price');
console.log(products.toString());        // as CSV
console.table(products.toObjects());     // as a table keyed by column name
console.log(products.columnAt(0, 'name'));

// A UTF-8 file whose first row is the header
const report = new CSV().parse(await readFile('report.csv')).useRowAsHeader(0);
for (const row of report.rows()) {
  console.log(row);
}
```

##### Stream a CSV without holding every row in memory

```ts
import { Readable } from 'node:stream';
import { CSV } from '@digitalwalletcorp/csv';

const csv = new CSV({ delimiter: '\t' });   // used for its formatting rules only; no rows are stored
const utf16 = { encoding: 'utf-16le', bom: true } as const;

async function * chunks(): AsyncGenerator<Uint8Array> {
  yield await CSV.encode(csv.stringifyRow(['ID', 'Name']) + '\r\n', utf16);   // the BOM is written once, here
  for await (const row of cursor) {                                    // e.g. a database cursor
    yield await CSV.encode(csv.stringifyRow([row.id, row.name]) + '\r\n', { ...utf16, bom: false });
  }
}

return sendStream(event, Readable.from(chunks()));   // Nitro; pipeline() into fs.createWriteStream works the same way
```

##### Format a single value or row without a document

```ts
CSV.stringifyCell('Hanako, Sato');                  // '"Hanako, Sato"'
CSV.stringifyRow([1, 'a\tb'], { delimiter: '\t' }); // '1\t"a\tb"'
```

##### Parse a large file record by record

```ts
import { createReadStream } from 'node:fs';
import { CSVParser, CSVSyntaxError } from '@digitalwalletcorp/csv';

try {
  for await (const { values, line } of new CSVParser({ trim: true }).parse(createReadStream('upload.csv'))) {
    if (values[0] === 'STOP') break;   // stopping early is fine
    handle(values, line);
  }
} catch (error) {
  if (error instanceof CSVSyntaxError) {
    console.error(error.message, error.line, error.column);
  }
}
```

### 📚 API Reference

#### CSV

A CSV / TSV document: column names plus rows of string cells, with strict parsing and formatting.

Every row is kept in memory so that rows and cells can be edited. To read a large input without keeping it, use [`CSVParser`](#-csvparser) directly.

This library does not write to files or streams directly. To write a file, pass the output to the destination:

```ts
await writeFile('data.csv', await csv.toBytes());
await pipeline(Readable.from(csv.lines()), createWriteStream('data.csv'));
```

##### 📝 Options (`CSVOptions`)

Shared by `CSV` and `CSVParser`.

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `delimiter` | `string` | `','` | Field delimiter. One character. Use `'\t'` for TSV. |
| `quote` | `string` | `'"'` | Quote character. One character, different from `delimiter`. |
| `lineSeparator` | `string` | `'\r\n'` | Line separator used by `toString()`. Parsing accepts CRLF, LF and CR regardless. |
| `quoteAll` | `boolean` | `false` | Quote every cell. By default only cells containing the delimiter, the quote or a line break are quoted. |
| `trim` | `boolean` | `false` | Trim unquoted cells when parsing. Quoted cells are kept as-is. |
| `skipEmptyLines` | `boolean` | `false` | Do not emit a record for an empty line when parsing. |

Invalid combinations (multi-character delimiter, line break as delimiter, `delimiter === quote`) throw `RangeError`.

##### 📥 Reading

`new CSV(options?)` creates an empty document. `parse` and `load` replace the rows and keep the column names and column definitions. On a `CSVSyntaxError` the rows are left unchanged.

| Method | Description |
| ------ | ----------- |
| `parse(input, options?)` | Parses a string or a byte array (`Buffer` / `Uint8Array`). Returns the document. |
| `load(source, options?)` | Parses an `Iterable` or `AsyncIterable` of strings or byte arrays, such as `fs.createReadStream(path)`. Returns a `Promise` of the document. |
| `CSV.parse(input, options?)` | Static. Same as `new CSV(options).parse(input, options)`. `options` takes both `CSVOptions` and `ReadOptions` in one object. |
| `CSV.load(source, options?)` | Static. Same as `new CSV(options).load(source, options)`. `options` takes both `CSVOptions` and `ReadOptions` in one object. |

| Option (`ReadOptions`) | Type | Default | Description |
| ---------------------- | ---- | ------- | ----------- |
| `encoding` | `string` | `'utf-8'` | The byte encoding. Any label `TextDecoder` understands: `utf-8`, `utf-16le`, `utf-16be`, `shift_jis`, `euc-jp` and so on. A leading BOM is removed. |
| `skipRows` | `number` | `0` | A non-negative integer. Records to skip from the start, such as title lines above the header. A quoted line break does not count as a new record. |
| `maxRows` | `number` | | A non-negative integer. Records to keep after `skipRows`. `load` stops reading there. |

To use a header row of the file as the column names, call `useRowAsHeader(0)` after reading.

Cells are always stored as strings. When adding rows, `null` and `undefined` become `''`; other values are converted with `String()`.

##### 🏷️ Column names and column definitions

| Method | Description |
| ------ | ----------- |
| `setColumnNames(...names)` | Replaces the column names and drops the definitions from `setColumns`. |
| `setColumns(columns)` | Replaces the column names and registers how `addObject` / `addObjects` read each column from a row object. An array means header name = property name. An object maps a header name to a property name or to a function `(row, rowIndex) => value`. |
| `useRowAsHeader(rowIndex)` | Uses the given row as the column names (as `setColumnNames` does) and removes that row and every row before it. |
| `getColumnNames()` | A copy of the column names. |
| `columnIndexOf(name)` | The column index, or `-1`. |

##### 📄 Rows

All indexes are zero-based. Out-of-range indexes throw `RangeError`.

| Method | Description |
| ------ | ----------- |
| `addRow(values)` / `addRows(rows)` | Appends rows given as arrays. |
| `addObject(row)` / `addObjects(rows)` | Appends rows given as objects, converted with the definitions from `setColumns`. Without them, the column names are used as property names; without column names either, the keys of the first object become the columns. Later objects are read by those keys, so missing keys become `''` and extra keys are ignored. `rowIndex` passed to a function column is the index the row will get, so numbering continues across calls. |
| `insertRow(rowIndex, values)` | Inserts a row. `rowIndex === countRows()` appends. |
| `updateRow(rowIndex, values)` | Replaces a row. |
| `removeRows(...rowIndexes)` | Removes rows. Order and duplicates do not matter; nothing is removed if any index is out of range. |
| `rowAt(rowIndex)` | A copy of the row. |
| `countRows()` | Number of rows (column names are not counted). |
| `rows()` | A generator over copies of the rows (column names are not included). |

##### 🔢 Cells

`column` is a column index or a column name. An unknown name or a negative index throws `RangeError`.

| Method | Description |
| ------ | ----------- |
| `columnAt(rowIndex, column)` | The cell value, or `''` when the row is shorter than the column. |
| `updateColumn(rowIndex, column, value)` | Replaces the cell. A short row is padded with `''`. |

##### 📤 Output

`lines`, `toString`, `bytes` and `toBytes` write the column names as a header row when they are set. Pass `{ header: false }` to leave the header out.

| Method | Description |
| ------ | ----------- |
| `stringifyCell(value)` | Formats one value as a cell: `null` / `undefined` become `''`, other values are converted with `String()` and quoted when needed. |
| `stringifyRow(values)` | Formats one row without a line separator. |
| `lines(options?)` | A generator of the header (if any) and every row, each terminated by `lineSeparator`. |
| `toString(options?)` | `lines()` joined into one string. |
| `bytes(options?)` | `lines()` encoded as `Uint8Array` chunks, as an `AsyncGenerator`. The whole text is not built at once. |
| `toBytes(options?)` | `bytes()` joined into one `Uint8Array`. Returns a `Promise`. |
| `CSV.encode(text, options?)` | The same encoding as `toBytes()`, for text you build with `stringifyRow()` when streaming. Returns a `Promise`. |
| `toArray()` | A copy of the rows as `string[][]`. |
| `toObjects()` | Rows as objects keyed by column name. Throws when no column names are set. |

| Option (`EncodeOptions`) | Type | Default | Description |
| ------------------------ | ---- | ------- | ----------- |
| `encoding` | `'utf-8'` \| `'utf-16le'` | `'utf-8'` | The encodings the standard APIs can write. |
| `bom` | `boolean` | `false` | Adds a BOM at the start. Use `{ encoding: 'utf-16le', bom: true }` for Excel on Windows and Mac. |
| `encoder` | `(text: string) => Uint8Array \| Promise<Uint8Array>` | | Converts text to bytes. Use it for encodings other than UTF-8 and UTF-16LE. See [Write a Shift_JIS file](#write-a-shift_jis-file). |

##### 🧩 Static functions

For callers that only want a CSV-formatted string of a cell or a row, without keeping a document. To create a document in one call, see `CSV.parse` / `CSV.load` under [Reading](#-reading).

| Method | Same as |
| ------ | ------- |
| `CSV.stringifyCell(value, options?)` | `new CSV(options).stringifyCell(value)` |
| `CSV.stringifyRow(values, options?)` | `new CSV(options).stringifyRow(values)` |
| `CSV.parse(input, options?)` | `new CSV(options).parse(input, options)` |
| `CSV.load(source, options?)` | `new CSV(options).load(source, options)` |

#### 🧭 CSVParser

The strict parser behind `parse` / `load`. Use it directly to process large inputs record by record.

```ts
import { CSVParser, CSVSyntaxError } from '@digitalwalletcorp/csv';

const parser = new CSVParser({ trim: true });
try {
  for await (const { values, line } of parser.parse(readable)) {
    if (values[0] === 'STOP') break;   // stopping early is fine
    handle(values, line);
  }
} catch (error) {
  if (error instanceof CSVSyntaxError) {
    console.error(error.message, error.line, error.column);
  }
}
```

| Member | Description |
| ------ | ----------- |
| `write(chunk)` | Feeds a chunk and returns the records completed so far. Quoted fields and CRLF may span chunks. |
| `end()` | Flushes the last record and resets the parser. |
| `parse(source, options?)` | `write` / `end` over an `Iterable` or `AsyncIterable` of strings or byte arrays, as an `AsyncGenerator<CSVRecord>`. `options.encoding` names the byte encoding (default `utf-8`). Multi-byte characters may span chunks. |

`CSVRecord` is `{ values: string[]; line: number; }` where `line` is the 1-based physical line the record starts on.

A leading BOM is removed. An empty line yields `['']` unless `skipEmptyLines` is set. A trailing line break does not produce an extra record.

##### ⚠️ Strict parsing rules

The parser follows the quoting rules of RFC 4180 and rejects anything else with `CSVSyntaxError` (`message`, `line`, `column`):

| Input | Error |
| ----- | ----- |
| A quote inside an unquoted cell (`a"b`) | `Quote must be at the start of a field` |
| Text after a closing quote (`"a"b`) | `Unexpected character after closing quote` |
| A quote that is never closed (`"a`) | `Unterminated quoted field` |

Inside a quoted cell, `""` stands for a single `"`, and delimiters and line breaks are part of the value.

#### 📜 License

This project is licensed under the MIT License. See the [LICENSE](https://opensource.org/licenses/MIT) file for details.
