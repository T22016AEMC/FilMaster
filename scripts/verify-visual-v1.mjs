import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const baseline = 'v2.2.0';
const git = (...args) => execFileSync('git', args, {encoding: 'utf8'}).trim();
assert.equal(git('diff', baseline, '--', 'src/utils', 'src/hooks', 'src/types.ts',
  'package.json', 'package-lock.json', 'CHANGELOG.md'), '', '計算、狀態、版本與輸出檔案不可變更');
const tests = git('diff', '--name-only', baseline, '--', 'src').split('\n').filter(p => /\.test\./.test(p));
assert.deepEqual(tests, ['src/components/Header.test.tsx'], '僅允許指定的品牌圖示測試變更');

// 移除視覺屬性後比對 AST，確保其餘元件的邏輯、內容與結構均保持原樣。
const visualAttributes = new Set(['className', 'style', 'stroke', 'fill', 'tick', 'label', 'contentStyle', 'activeDot']);
function withoutVisuals(path, source) {
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const transformed = ts.transform(ast, [context => {
    const visit = node => ts.isJsxAttribute(node) && visualAttributes.has(node.name.getText(ast))
      ? undefined : ts.visitEachChild(node, visit, context);
    return root => ts.visitNode(root, visit);
  }]);
  const result = ts.createPrinter({removeComments: true}).printFile(transformed.transformed[0]);
  transformed.dispose();
  return result;
}
const changed = git('diff', '--name-only', baseline, '--', 'src').split('\n')
  .filter(p => p.endsWith('.tsx') && !p.includes('.test.') && !/\/(Header|BrandMark)\.tsx$/.test(p));
for (const path of changed) {
  assert.equal(withoutVisuals(path, readFileSync(path, 'utf8')),
    withoutVisuals(path, git('show', `${baseline}:${path}`)), `${path} 僅可修改視覺屬性`);
}

const css = readFileSync('src/index.css', 'utf8');
const color = name => {
  const value = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6});`, 'i'))?.[1];
  assert.ok(value, `找不到中央色票 ${name}`);
  return value;
};
function luminance(hex) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
const contrasts = {};
for (const [foreground, background] of [
  ['brand', 'surface'], ['brand', 'brand-soft'], ['brand', 'inset'], ['brand', 'page'],
  ['muted', 'surface'], ['muted', 'brand-soft'], ['muted', 'inset'], ['muted', 'page'],
  ['ink', 'surface'], ['warning', 'warning-soft'], ['error', 'error-soft'], ['measured', 'surface'],
]) {
  const [a, b] = [luminance(color(foreground)), luminance(color(background))].sort((x, y) => y - x);
  const ratio = (a + 0.05) / (b + 0.05);
  assert.ok(ratio >= 4.5, `${foreground}/${background} 文字對比不足`);
  contrasts[`${foreground}/${background}`] = Number(ratio.toFixed(2));
}

const brand = readFileSync('src/components/BrandMark.tsx', 'utf8');
const favicon = readFileSync('public/favicon.svg', 'utf8');
const paths = source => [...source.matchAll(/\bd="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(paths(favicon), paths(brand), 'favicon 與 BrandMark 圖形必須一致');
assert.ok(favicon.includes(color('brand')) && favicon.includes(color('brand-accent')));
assert.ok(readFileSync('index.html', 'utf8').includes('%BASE_URL%favicon.svg'));
console.log(JSON.stringify({baseline, checkedComponents: changed.length,
  modifiedExistingTests: tests, colors: {brand: color('brand'), page: color('page')}, contrasts}, null, 2));
