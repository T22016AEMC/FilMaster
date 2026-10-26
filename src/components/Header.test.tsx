// @vitest-environment jsdom
import {cleanup, render, screen, within} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {Header} from './Header';

afterEach(cleanup);

it('Header 恢復名稱左側 40×40 外框與 20×20 Cpu 裝飾圖示', () => {
  render(<Header onSelectPreset={vi.fn()} onOpenFormula={vi.fn()} onOpenCurves={vi.fn()} onReset={vi.fn()} />);
  const header = screen.getByRole('banner');
  const frame = within(header).getByTestId('header-logo');
  expect(frame.className).toContain('h-10 w-10');
  expect(frame.className).toContain('rounded-xl');
  expect(frame.getAttribute('aria-hidden')).toBe('true');
  const icon = frame.querySelector('svg.lucide-cpu');
  expect(icon).not.toBeNull();
  expect(icon!.getAttribute('width')).toBe('20');
  expect(icon!.getAttribute('height')).toBe('20');
  expect(icon!.getAttribute('aria-hidden')).toBe('true');
  expect(within(header).getByRole('heading', {level: 1}).textContent).toBe('FilMaster');
  expect(frame.parentElement!.firstElementChild).toBe(frame);
  expect(within(header).queryByRole('img')).toBeNull();
});
