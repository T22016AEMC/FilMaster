// @vitest-environment jsdom
import {cleanup, render, screen, within} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {Header} from './Header';

afterEach(cleanup);

it('Header 顯示正式 LOGO、替代文字與視覺隱藏的產品標題', () => {
  render(<Header onSelectPreset={vi.fn()} onOpenFormula={vi.fn()} onOpenCurves={vi.fn()} onReset={vi.fn()} />);
  const header = screen.getByRole('banner');
  const logo = within(header).getByRole('img', {name: 'FilMaster 半導體旋塗膜厚與固含量預測'});
  expect(logo.className).toContain('brand-logo');
  expect(logo.getAttribute('src')).toBe(`${import.meta.env.BASE_URL}brand/filmaster-logo.webp`);
  expect(logo.getAttribute('width')).toBe('1000');
  expect(logo.getAttribute('height')).toBe('259');
  expect(logo.hasAttribute('loading')).toBe(false);
  expect(logo.hasAttribute('aria-hidden')).toBe(false);
  const heading = within(header).getByRole('heading', {level: 1});
  expect(heading.textContent).toBe('FilMaster');
  expect(heading.className).toBe('sr-only');
  expect(logo.previousElementSibling).toBe(heading);
  expect(within(header).queryByTestId('brand-mark')).toBeNull();
  expect(within(header).getByText(`版本 v${__APP_VERSION__}`)).not.toBeNull();
  expect(within(header).getAllByRole('img')).toHaveLength(1);
});
