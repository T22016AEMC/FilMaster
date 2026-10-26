// @vitest-environment jsdom
import {cleanup, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import App from '../App';
import type {CalibrationResult} from '../types';
import {calibrateModel} from '../utils/meyerhofer';
import {RESIN_CONFIGS} from '../utils/resinConfigs';
import {FitQualityPanel} from './FitQualityPanel';

beforeEach(() => {
  localStorage.clear();
  const originalWarn = console.warn;
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('width(0) and height(0)')) return;
    originalWarn(...args);
  });
  vi.stubGlobal('ResizeObserver', class {observe() {} unobserve() {} disconnect() {}});
});
afterEach(() => {cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();});

describe('擬合品質介面', () => {
  it('兩種模式皆顯示同一份單點品質，預設收合且不畫圖', async () => {
    const user = userEvent.setup();
    render(<App />);
    const summary = screen.getByText('擬合品質', {selector: 'summary'});
    expect(summary.closest('details')!.open).toBe(false);
    // 原生 details 收合時保留 DOM；檢查表格所在區塊的實際展開狀態。
    const collapsedTable = screen.getByRole('table', {name: '實測點殘差表', hidden: true});
    expect(collapsedTable.closest('details')).toBe(summary.closest('details'));
    expect(collapsedTable.closest('details')!.open).toBe(false);
    await user.click(summary);
    expect(summary.closest('details')!.open).toBe(true);
    expect(screen.getByText('單點校正，殘差必為 0，不代表擬合品質。')).toBeTruthy();
    const table = screen.getByRole('table', {name: '實測點殘差表'});
    const before = table.textContent;
    expect(screen.queryByRole('img', {name: '實測點殘差圖'})).toBeNull();
    expect(screen.getByText('至少需要 2 個有效實測點才能繪製殘差圖。')).toBeTruthy();
    await user.click(screen.getByRole('button', {name: '求製程'}));
    expect(screen.getByRole('table', {name: '實測點殘差表'}).textContent).toBe(before);
    expect(screen.getByLabelText('建議轉速').textContent).toBe('1317rpm');
    await user.click(summary);
    expect(collapsedTable.closest('details')!.open).toBe(false);
  });

  it('0 點時顯示純理論原因，不顯示殘差表與圖', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', {name: /重設點位為基本值/}));
    await user.click(screen.getByText('擬合品質', {selector: 'summary'}));
    expect(screen.getByText('純理論模式，沒有可用於校正的實測點，不計算殘差。')).toBeTruthy();
    expect(screen.queryByRole('table', {name: '實測點殘差表'})).toBeNull();
    expect(screen.queryByRole('img', {name: '實測點殘差圖'})).toBeNull();
  });

  it('多點展開後顯示摘要、表格與殘差圖', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', {name: '多點擬合範例'}));
    await user.click(screen.getByText('擬合品質', {selector: 'summary'}));
    const table = screen.getByRole('table', {name: '實測點殘差表'});
    expect(within(table).getAllByRole('row')).toHaveLength(5);
    const panel = screen.getByRole('region', {name: '擬合品質內容'});
    expect(panel.textContent).toContain('RMSE：');
    expect(panel.textContent).toContain('平均絕對誤差：');
    expect(panel.textContent).toContain('最大絕對誤差：');
    expect(await screen.findByRole('img', {name: '實測點殘差圖'})).toBeTruthy();
  });

  it('僅絕對殘差大於 5% 的列使用淡藍標示，正負方向皆包含', async () => {
    const user = userEvent.setup();
    const resin = {...RESIN_CONFIGS.SOC, defaultC: 100, alpha: 1, beta: 1, gamma: 1};
    const model: CalibrationResult = {...calibrateModel(resin, 1, 1, []), mode: 'multi_point_lsq', pointsCount: 3};
    // 模型預測 100 nm；實測 80/125/100 時分別為 +25%/-20%/0%。
    render(<FitQualityPanel resin={resin} calibration={model} fallbackConditions={{spinSpeed: 1, spinTime: 1}}
      measuredPoints={[80, 125, 100].map((thickness, i) => ({id: String(i), solidsContent: 1, thickness, spinSpeed: 1, spinTime: 1}))} />);
    await user.click(screen.getByText('擬合品質', {selector: 'summary'}));
    const rows = within(screen.getByRole('table', {name: '實測點殘差表'})).getAllByRole('row').slice(1);
    expect(rows.map(row => row.getAttribute('data-outlier'))).toEqual(['true', 'true', null]);
    expect(rows[0].className).toContain('bg-blue-50');
    expect(rows[1].className).toContain('bg-blue-50');
    expect(rows[2].className).not.toContain('bg-blue-50');
  });
});
