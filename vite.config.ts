import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const SRC = fileURLToPath(new URL('./src', import.meta.url));

/**
 * src直下の.tsを1つずつエントリにする。
 * サブパスで個別に読み込めるようにするため
 */
const entries: Record<string, string> = {};
for (const fileName of readdirSync(SRC).filter((name) => name.endsWith('.ts')).sort()) {
  entries[fileName.replace(/\.ts$/, '')] = `src/${fileName}`;
}

/**
 * ESM/CJS両対応にする設定
 */
const writeCjsDeclarations = () => {
  for (const fileName of readdirSync('lib', { recursive: true }).filter((name) => String(name).endsWith('.d.ts'))) {
    const filePath = join('lib', String(fileName));
    const source = readFileSync(filePath, 'utf8');
    const output = source.replace(/(['"])(\.\.?\/[^'"]+)\1/g, '$1$2.cjs$1');
    writeFileSync(filePath.replace(/\.d\.ts$/, '.d.cts'), output);
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
