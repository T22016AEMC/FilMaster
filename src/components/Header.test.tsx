// @vitest-environment jsdom
import {cleanup, render, screen, within} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {Header} from './Header';

afterEach(cleanup);

it('Header 名稱左側顯示原創旋塗 BrandMark 裝飾圖示', () => {
  render(<Header onSelectPreset={vi.fn()} onOpenFormula={vi.fn()} onOpenCurves={vi.fn()} onReset={vi.fn()} />);
  const header = screen.getByRole('banner');
  const frame = within(header).getByTestId('header-logo');
  expect(frame.className).toContain('brand-mark-frame');
  expect(frame.getAttribute('aria-hidden')).toBe('true');
  const icon = within(frame).getByTestId('brand-mark');
  expect(icon).not.toBeNull();
  expect(icon!.getAttribute('width')).toBe('48');
  expect(icon!.getAttribute('height')).toBe('48');
  expect(icon!.getAttribute('aria-hidden')).toBe('true');
  expect(within(header).getByRole('heading', {level: 1}).textContent).toBe('FilMaster');
  expect(frame.parentElement!.firstElementChild).toBe(frame);
  expect(within(header).queryByRole('img')).toBeNull();
});
