import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

describe('版本號', () => {
  it('__APP_VERSION__ 等於 package.json 的 version', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
    ) as {version: string};
    expect(__APP_VERSION__).toBe(pkg.version);
  });
});
