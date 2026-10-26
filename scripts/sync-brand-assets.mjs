import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';

// favicon 為獨立資源，從同一份圖形與設計變數產生，不另行維護色票或路徑。
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const brand = readFileSync(new URL('../src/components/BrandMark.tsx', import.meta.url), 'utf8');
const svg = brand.match(/<svg\b[\s\S]*?<\/svg>/)[0]
  .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
  .replace(/data-testid="[^"]*"\s*/g, '')
  .replaceAll('strokeWidth=', 'stroke-width=').replaceAll('strokeLinecap=', 'stroke-linecap=')
  .replace(/var\((--color-[\w-]+)\)/g, (_, variable) => {
    const value = css.match(new RegExp(`${variable}:\\s*(#[0-9a-f]+);`, 'i'))?.[1];
    if (!value) throw new Error(`找不到設計變數 ${variable}`);
    return value;
  });
mkdirSync(new URL('../public/', import.meta.url), {recursive: true});
writeFileSync(new URL('../public/favicon.svg', import.meta.url), `${svg}\n`);
