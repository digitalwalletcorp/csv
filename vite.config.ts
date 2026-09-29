import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const SRC = fileURLToPath(new URL('./src', import.meta.url));

/**
 * src直下の.tsを1つずつエントリにする。
 * サブパス(`@digitalwalletcorp/utils/xxx`)で個別に読み込めるようにするため
 */
const entries: Record<string, string> = {};
for (const fileName of readdirSync(SRC).filter((name) => name.endsWith('.ts')).sort()) {
  entries[fileName.replace(/\.ts$/, '')] = `src/${fileName}`;
}

/**
 * CJS向けの型定義(.d.cts)を.d.tsから起こす。
 * `type: "module"`のパッケージでは.d.tsがESM扱いになり、CJSのTypeScript利用者(moduleResolution: node16)が
 * requireできない型として弾かれる(TS1479)。.d.cts側では相対importも.cjsへ向ける
 */
const writeCjsDeclarations = () => {
  for (const fileName of readdirSync('lib').filter((name) => name.endsWith('.d.ts'))) {
    const source = readFileSync(join('lib', fileName), 'utf8');
    const output = source.replace(/(['"])(\.\.?\/[^'"]+)\1/g, '$1$2.cjs$1');
    writeFileSync(join('lib', fileName.replace(/\.d\.ts$/, '.d.cts')), output);
  }
};

export default defineConfig({
  // tsconfigのpathsはビルドに効かないため、同じ対応をここでも与える
  resolve: {
    alias: { '@': SRC }
  },
  plugins: [
    dts({
      tsconfigPath: 'tsconfig.build.json',
      outDirs: ['lib'],
      afterBuild: writeCjsDeclarations
    })
  ],
  build: {
    outDir: 'lib',
    // 出力する構文を固定する。バンドラの既定値に引きずられないように
    target: 'es2022',
    emptyOutDir: true,
    sourcemap: true,
    lib: { entry: entries },
    rollupOptions: {
      output: [
        { format: 'es', entryFileNames: '[name].js' },
        { format: 'cjs', entryFileNames: '[name].cjs', exports: 'named' }
      ]
    }
  }
});
