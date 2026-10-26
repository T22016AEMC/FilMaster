// @vitest-environment jsdom
import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import {useState} from 'react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import App from './App';
import type {SavedCalibratedCurve} from './types';
import {CalibrationManager} from './components/CalibrationManager';
import {runPredictionWithConditions} from './utils/predictionWithConditions';
import {RESIN_CONFIGS} from './utils/resinConfigs';
import {EQUIPMENT_STORAGE_KEY} from './utils/equipmentLimits';

// 與 customCurves.ts 內的 STORAGE_KEY 相同（不可變更）
const STORAGE_KEY = 'spin_coating_custom_calibrated_curves_v2';

beforeEach(() => {
  localStorage.clear();
  // jsdom 沒有版面尺寸，Recharts 會對 0 x 0 的圖表發出警告；只過濾這則已知的雜訊
  const originalWarn = console.warn;
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('width(0) and height(0)')) return;
    originalWarn(...args);
  });
  // Recharts 的 ResponsiveContainer 需要 ResizeObserver，jsdom 沒有提供
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const getTargetInput = () => document.getElementById('target-thickness-input') as HTMLInputElement;
const HINT = '請輸入大於 0 的數值';

describe('App 基本畫面', () => {
  it('能正常渲染，標題顯示 FilMaster，頁尾顯示版本號', () => {
    render(<App />);
    const h1 = screen.getByRole('heading', {level: 1});
    expect(h1.textContent).toContain('FilMaster');
    expect(h1.textContent).not.toContain('Studio');

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText('FilMaster')).toBeTruthy();
    expect(within(footer).getByText(`v${__APP_VERSION__}`)).toBeTruthy();
  });

  it('畫面上沒有「FilmMaster Studio」或「AI Studio」字樣', () => {
    render(<App />);
    expect(document.body.textContent).not.toContain('FilmMaster Studio');
    expect(document.body.textContent).not.toContain('AI Studio');
  });

  it('預設畫面（SOC 官方範例）顯示建議固含量 9.1874 wt%', () => {
    render(<App />);
    expect(screen.getAllByText('9.1874').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('建議固含量').textContent).toContain('9.1874');
    expect(screen.getByRole('button', {name: '求固含量'}).getAttribute('aria-pressed')).toBe('true');
    // 預設情境沒有任何警告
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.getElementById('status-warning-badge')).toBeNull();
  });

  it('單點校正時 R² 顯示「不適用」與原因，且不再出現「1.0000 (Exact)」', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('校正參數詳情', {selector: 'summary'}));
    const card = screen.getByText('決定係數 R²').parentElement as HTMLElement;
    expect(card.textContent).toContain('不適用');
    expect(card.textContent).toContain('單點校正');
    expect(card.textContent).not.toContain('1.0000');
    expect(document.body.textContent).not.toContain('(Exact)');
  });
});

describe('多點校正的 R² 顯示', () => {
  it('多點擬合範例：顯示 R² 數值與擬合模式，沒有警告', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', {name: '多點擬合範例'}));
    await user.click(screen.getByText('校正參數詳情', {selector: 'summary'}));

    const card = screen.getByText('決定係數 R²').parentElement as HTMLElement;
    expect(card.textContent).not.toContain('不適用');
    expect(card.textContent).toMatch(/\d\.\d{4}/); // 該範例 R² = 0.99999…，四捨五入後顯示為 1.0000
    expect(card.textContent).toContain('最小平方擬合度');
    expect(screen.getAllByText(/多點最小平方法擬合/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('實測點固含量全相同：出現 FIT_DEGENERATE 警告，R² 顯示「不適用（未採用擬合）」', async () => {
    const user = userEvent.setup();
    render(<App />);
    // 預設已有 8.0 wt% → 180 nm，再加一個 8.0 wt% → 200 nm
    await user.type(document.getElementById('input-new-solids') as HTMLInputElement, '8');
    await user.type(document.getElementById('input-new-thickness') as HTMLInputElement, '200');
    await user.click(document.getElementById('btn-add-point') as HTMLElement);

    const panel = screen.getByRole('alert');
    expect(panel.textContent).toContain('固含量相同');
    expect(panel.textContent).toContain('平均縮放');
    await user.click(screen.getByText('校正參數詳情', {selector: 'summary'}));
    const card = screen.getByText('決定係數 R²').parentElement as HTMLElement;
    expect(card.textContent).toContain('不適用');
    expect(card.textContent).toContain('未採用擬合');
    expect(document.getElementById('status-warning-badge')?.textContent).toContain('警告 1');
  });
});

describe('警告顯示', () => {
  it('觸發 SOLIDS_OUT_OF_RANGE 時 WarningPanel 出現，恢復正常後消失', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByRole('alert')).toBeNull();

    const input = getTargetInput();
    await user.clear(input);
    await user.type(input, '50000');

    const panel = screen.getByRole('alert');
    expect(panel.textContent).toContain('計算警告');
    expect(panel.textContent).toContain('建議固含量');
    expect(panel.textContent).toContain('超過上限 100 wt%');
    // 固含量數值旁有警示圖示；頂部狀態列有警告標記與數量
    expect(screen.getAllByRole('img', {name: '固含量超出合理範圍'}).length).toBeGreaterThan(0);
    const badge = document.getElementById('status-warning-badge') as HTMLElement;
    expect(badge.textContent).toContain('警告 3');

    await user.clear(input);
    await user.type(input, '220');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryAllByRole('img', {name: '固含量超出合理範圍'})).toHaveLength(0);
    expect(document.getElementById('status-warning-badge')).toBeNull();
    expect(screen.getAllByText('9.1874').length).toBeGreaterThan(0);
  });
});

describe('數值輸入防呆', () => {
  it('目標膜厚清空時：不出現警告、結果維持原值、出現紅框與提示；失焦後恢復有效值', async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = getTargetInput();
    expect(input.value).toBe('220');

    await user.clear(input);

    // 輸入框保留使用者輸入（空白），不強制跳回數字
    expect(input.value).toBe('');
    // 紅框與提示
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.className).toContain('border-rose-500!');
    expect(screen.getByText(HINT)).toBeTruthy();
    // 沒有警告，結果維持上一次有效的計算結果
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.getElementById('status-warning-badge')).toBeNull();
    expect(screen.getAllByText('9.1874').length).toBeGreaterThan(0);

    // 失去焦點後恢復為上一次的有效值
    await user.tab();
    expect(input.value).toBe('220');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(screen.queryByText(HINT)).toBeNull();
    expect(screen.getAllByText('9.1874').length).toBeGreaterThan(0);
  });

  it.each(['0', '-5'])('輸入 %s（≤ 0）視為無效：不更新計算結果', async bad => {
    const user = userEvent.setup();
    render(<App />);
    const input = getTargetInput();
    await user.clear(input);
    await user.type(input, bad);

    expect(input.value).toBe(bad);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(HINT)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getAllByText('9.1874').length).toBeGreaterThan(0);

    await user.tab();
    expect(input.value).toBe('220');
  });

  it('輸入有效數值時立即更新結果，並取消紅框', async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = getTargetInput();
    await user.clear(input);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    await user.type(input, '180');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(screen.queryByText(HINT)).toBeNull();
    // 目標 = 實測 180 nm（8.0 wt%）→ 建議固含量回到 8.0
    expect(screen.getAllByText('8.0000').length).toBeGreaterThan(0);
  });

  it('轉速、時間、容差輸入框同樣有防呆', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (const [id, original] of [
      ['spin-speed-input', '2000'],
      ['spin-time-input', '30'],
      ['input-tolerance-percent', '5'],
    ] as const) {
      const input = document.getElementById(id) as HTMLInputElement;
      expect(input.value).toBe(original);
      await user.clear(input);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(screen.getByText(HINT)).toBeTruthy();
      expect(screen.getAllByText('9.1874').length).toBeGreaterThan(0);
      await user.tab();
      expect(input.value).toBe(original);
      expect(screen.queryByText(HINT)).toBeNull();
    }
  });

  it('容差輸入超出 0.1～10 時沿用原版行為：計算採用限制後的數值', async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = document.getElementById('input-tolerance-percent') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '15');
    expect(screen.getAllByText(/±10\.0%/).length).toBeGreaterThan(0);
    await user.tab();
    expect(input.value).toBe('10');
  });
});

describe('實測點的量測條件', () => {
  it('新增實測點後，列表顯示當下的轉速與時間', async () => {
    const user = userEvent.setup();
    render(<App />);
    // 預設的官方測試範例點記錄 2000 rpm / 30 s
    expect(screen.getAllByText('2000 rpm / 30 s')).toHaveLength(1);

    await user.click(screen.getByRole('button', {name: '1500'}));
    await user.type(document.getElementById('input-new-solids') as HTMLInputElement, '10');
    await user.type(document.getElementById('input-new-thickness') as HTMLInputElement, '260');
    await user.click(document.getElementById('btn-add-point') as HTMLElement);

    expect(screen.getAllByText('1500 rpm / 30 s')).toHaveLength(1);
    expect(screen.getAllByText('2000 rpm / 30 s')).toHaveLength(1);
  });

  it.each([
    ['1 點測試範例', /1 點測試範例/, 1],
    ['多點擬合範例', /多點擬合範例/, 4],
  ])('「%s」按鈕：記錄範例本身的條件 2000 rpm / 30 s，不使用畫面上目前的數值', async (_label, name, count) => {
    const user = userEvent.setup();
    render(<App />);
    // 先把畫面上的轉速與時間改成與範例不同的數值
    await user.click(screen.getByRole('button', {name: '1500'}));
    await user.click(screen.getByRole('button', {name: '45s'}));
    expect((document.getElementById('spin-speed-input') as HTMLInputElement).value).toBe('1500');
    expect((document.getElementById('spin-time-input') as HTMLInputElement).value).toBe('45');

    await user.click(screen.getByRole('button', {name}));

    expect(screen.getAllByText('2000 rpm / 30 s')).toHaveLength(count);
    expect(screen.queryByText('1500 rpm / 45 s')).toBeNull();
    // 畫面上的製程條件不受影響
    expect((document.getElementById('spin-speed-input') as HTMLInputElement).value).toBe('1500');
    expect((document.getElementById('spin-time-input') as HTMLInputElement).value).toBe('45');
  });

  it('載入預設情境時，其實測點帶入該情境的轉速與時間', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', {name: '預設情境'}));
    await user.click(document.getElementById('preset-btn-thick_1000_5000_preset') as HTMLElement);
    // 該情境：1500 RPM / 30 s，2 個實測點
    expect(screen.getAllByText('1500 rpm / 30 s')).toHaveLength(2);
  });
});

describe('儲存與匯入校正曲線', () => {
  const openModal = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(document.getElementById('btn-save-current-curve-quick') as HTMLElement);
  };
  const storedCurves = (): SavedCalibratedCurve[] => JSON.parse(localStorage.getItem(STORAGE_KEY) as string);

  it('儲存校正曲線時，曲線包含目前的實測點（不依賴全域變數）', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(document.getElementById('input-new-solids') as HTMLInputElement, '10');
    await user.type(document.getElementById('input-new-thickness') as HTMLInputElement, '260');
    await user.click(document.getElementById('btn-add-point') as HTMLElement);

    await openModal(user);
    await user.click(screen.getByRole('button', {name: /確認存為材料基本值/}));

    const saved = storedCurves()[0];
    expect(saved.measuredPoints).toHaveLength(2);
    expect(saved.measuredPoints.map(p => [p.solidsContent, p.thickness])).toEqual([
      [8, 180],
      [10, 260],
    ]);
    // 實測點的量測條件一併存入
    expect(saved.measuredPoints.every(p => p.spinSpeed === 2000 && p.spinTime === 30)).toBe(true);
    // 2 個實測點擬合出的 R² 有值
    expect(typeof saved.rSquared).toBe('number');
    expect((window as unknown as Record<string, unknown>).__lastMeasuredPoints).toBeUndefined();
  });

  it('沒有實測點時儲存的曲線 measuredPoints 為空陣列，R² 為 null', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', {name: /重設點位為基本值/}));
    await openModal(user);
    await user.click(screen.getByRole('button', {name: /確認存為材料基本值/}));
    const saved = storedCurves()[0];
    expect(saved.measuredPoints).toEqual([]);
    expect(saved.rSquared).toBeNull();
  });

  const uploadJson = async (user: ReturnType<typeof userEvent.setup>, content: string) => {
    await openModal(user);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, new File([content], 'curves.json', {type: 'application/json'}));
  };
  const validCurve = (id: string, name: string) => ({
    id,
    name,
    resinType: 'KrF',
    createdAt: '2026-01-01',
    spinSpeed: 1500,
    spinTime: 35,
    targetThickness: 320,
    calibratedC: 100,
    calibratedAlpha: 1.4,
    beta: 0.5,
    gamma: 0.15,
    scaleFactor: 1,
    rSquared: null,
    measuredPoints: [{id: 'p', solidsContent: 8, thickness: 100, spinSpeed: 1500, spinTime: 35}],
  });

  it('匯入結果顯示「成功匯入 N 筆」，並列出每筆被略過的名稱與原因', async () => {
    const user = userEvent.setup();
    render(<App />);
    const json = JSON.stringify([
      validCurve('ok-1', '合格曲線'),
      {...validCurve('bad-1', '壞掉的曲線'), spinSpeed: 0},
      {...validCurve('bad-2', ''), name: undefined},
    ]);
    await uploadJson(user, json);

    const result = await screen.findByText('成功匯入 1 筆');
    const box = result.closest('#import-result') as HTMLElement;
    expect(box.textContent).toContain('略過 2 筆');
    expect(box.textContent).toContain('「壞掉的曲線」：spinSpeed 必須為大於 0 的有限數值');
    expect(box.textContent).toContain('第 3 筆：name 必須為非空字串');
    // 匯入的曲線出現在清單中
    expect(screen.getByText('合格曲線', {selector: 'span'})).toBeTruthy();
  });

  it('匯入檔案不是有效 JSON 時顯示具體錯誤訊息', async () => {
    const user = userEvent.setup();
    render(<App />);
    await uploadJson(user, '{not json');
    expect(await screen.findByText('檔案不是有效的 JSON 格式')).toBeTruthy();
    expect(screen.queryByText(/成功匯入/)).toBeNull();
  });

  it('匯入檔案不是陣列時顯示具體錯誤訊息', async () => {
    const user = userEvent.setup();
    render(<App />);
    await uploadJson(user, '{"id":"x"}');
    expect(await screen.findByText('JSON 內容必須是校正曲線陣列')).toBeTruthy();
  });

  it('已存曲線列表：單點校正的舊資料（R² = 1）顯示「不適用」', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(document.getElementById('btn-manage-saved-curves') as HTMLElement);
    await user.click(screen.getByRole('button', {name: /已存材料基本值列表/}));
    // 預設曲線 1：SOC Lot-A（1 個實測點，舊資料存有 R² = 1）；預設曲線 2：ArF（4 點，R² = 0.9982）
    expect(screen.getByText(/R²=不適用（單點校正）/)).toBeTruthy();
    expect(screen.getByText('R²=0.9982')).toBeTruthy();
  });
});

describe('兩種模式與設備設定', () => {
  it('報告複製依目前模式切換，求製程報告保留三位小數', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', {name: '複製報告'}));
    expect(await navigator.clipboard.readText()).toContain('配方預測與校正報告');
    await user.click(screen.getByRole('button', {name: '求製程'}));
    await user.click(screen.getByRole('button', {name: '已複製'}));
    const report = await navigator.clipboard.readText();
    expect(report).toContain('FilMaster 求製程報告');
    expect(report).toContain('建議值：1316.640 rpm');
    expect(report).toContain('β、γ 為材料預設值，未經實測校正');
  });
  it('SOC 官方範例切換求轉速與求時間，顯示 1317 rpm 與 9.8 s', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', {name: '求製程'}));
    expect(screen.getByLabelText('建議轉速').textContent).toBe('1317rpm');
    expect((screen.getByLabelText('固定時間') as HTMLInputElement).value).toBe('30');
    expect((screen.getByLabelText('固定固含量') as HTMLInputElement).value).toBe('8');
    expect(screen.getByText(/β、γ 為材料預設值，未經實測校正/)).toBeTruthy();
    expect(screen.getByRole('button', {name: '儲存為自訂曲線'}).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('請在求固含量模式儲存')).toBeTruthy();
    await user.click(screen.getByRole('button', {name: '求時間（轉速固定）'}));
    expect(screen.getByLabelText('建議時間').textContent).toBe('9.8s');
    expect((screen.getByLabelText('固定轉速') as HTMLInputElement).value).toBe('2000');
    await user.click(screen.getByRole('button', {name: '求固含量'}));
    expect(screen.getByLabelText('建議固含量').textContent).toBe('9.1874wt%');
  });

  it('設備範圍超界顯示警告，放寬後消失，重新載入仍保留', async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    await user.click(screen.getByRole('button', {name: '求製程'}));
    await user.click(screen.getByText('進階設定', {selector: 'summary'}));
    const input = screen.getByLabelText('轉速下限（rpm）') as HTMLInputElement;
    fireEvent.change(input, {target: {value: '1500'}});
    expect(screen.getByRole('alert').textContent).toContain('低於設備下限 1500');
    expect(screen.getByLabelText('建議轉速').textContent).toBe('1317rpm');
    fireEvent.change(input, {target: {value: '1000'}});
    expect(screen.queryByRole('alert')).toBeNull();
    expect(JSON.parse(localStorage.getItem(EQUIPMENT_STORAGE_KEY)!).minSpeed).toBe(1000);
    view.unmount();
    render(<App />);
    await user.click(screen.getByRole('button', {name: '求製程'}));
    await user.click(screen.getByText('進階設定', {selector: 'summary'}));
    expect((screen.getByLabelText('轉速下限（rpm）') as HTMLInputElement).value).toBe('1000');
    expect(screen.queryByRole('alert')).toBeNull();
    await user.click(screen.getByRole('button', {name: '恢復預設'}));
    expect((screen.getByLabelText('轉速下限（rpm）') as HTMLInputElement).value).toBe('500');
    expect(JSON.parse(localStorage.getItem(EQUIPMENT_STORAGE_KEY)!).minSpeed).toBe(500);
  });

  it('設備範圍無效時不更新狀態、出現紅框提示且失焦恢復', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', {name: '求製程'}));
    await user.click(screen.getByText('進階設定', {selector: 'summary'}));
    for (const [label, value] of [['轉速下限（rpm）', '7000'], ['時間下限（s）', '0'], ['時間上限（s）', '4']]) {
      const input = screen.getByLabelText(label) as HTMLInputElement;
      const original = input.value;
      fireEvent.change(input, {target: {value}});
      expect(input.value).toBe(value);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.className).toContain('border-rose-500!');
      expect(screen.getByText('請輸入大於 0 的數值，且下限須小於上限')).toBeTruthy();
      expect(screen.getByLabelText('建議轉速').textContent).toBe('1317rpm');
      fireEvent.blur(input);
      expect(input.value).toBe(original);
      expect(input.getAttribute('aria-invalid')).toBeNull();
    }
    expect(localStorage.getItem(EQUIPMENT_STORAGE_KEY)).toBeNull();
  });

  it('次要資訊預設收合，可點擊展開與收合', async () => {
    const user = userEvent.setup();
    render(<App />);
    for (const title of ['校正參數詳情', '敏感度分析', '數據表']) {
      const summary = screen.getByText(title, {selector: 'summary'});
      const details = summary.closest('details')!;
      expect(details.open).toBe(false);
      await user.click(summary);
      expect(details.open).toBe(true);
      await user.click(summary);
      expect(details.open).toBe(false);
    }
  });

  it.each(['solve_speed', 'solve_time'] as const)('求製程 %s 新增點要求手填未知條件', async mode => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', {name: '求製程'}));
    if (mode === 'solve_time') await user.click(screen.getByRole('button', {name: '求時間（轉速固定）'}));
    await user.type(screen.getByLabelText('實測固含量'), '8');
    await user.type(screen.getByLabelText('實測膜厚'), '180');
    const add = screen.getByRole('button', {name: '加入校正'});
    expect(add.hasAttribute('disabled')).toBe(true);
    const input = screen.getByLabelText(mode === 'solve_speed' ? '新增點量測轉速' : '新增點量測時間');
    expect((input as HTMLInputElement).value).toBe('');
    await user.type(input, mode === 'solve_speed' ? '1500' : '40');
    expect(add.hasAttribute('disabled')).toBe(false);
    await user.click(add);
    expect(screen.getByText(mode === 'solve_speed' ? '1500 rpm / 30 s' : '2000 rpm / 40 s')).toBeTruthy();
  });

  it('求製程可套用已存曲線，管理視窗停用儲存頁籤', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', {name: '求製程'}));
    await user.click(screen.getByRole('button', {name: '自訂曲線'}));
    expect(screen.getByRole('button', {name: /儲存當前為材料基本值/}).hasAttribute('disabled')).toBe(true);
    const apply = screen.getAllByRole('button', {name: '載入為基本值'})[0];
    await user.click(apply);
    expect(screen.getByRole('button', {name: '求製程'}).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('建議轉速').textContent).not.toContain('無法求解');
    expect(screen.getByText(/已載入自訂材料基本值/)).toBeTruthy();
  });

  it('重置恢復求固含量與官方範例', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', {name: '求製程'}));
    await user.click(screen.getByRole('button', {name: '重置'}));
    expect(screen.getByRole('button', {name: '求固含量'}).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('建議固含量').textContent).toBe('9.1874wt%');
  });
});

// 舊曲線套用後依既有規則清空實測點，因此直接以共用表格測試舊資料補填流程。
function LegacyPointsHarness() {
  const [points, setPoints] = useState([{id: 'old', solidsContent: 8, thickness: 180}]);
  const prediction = runPredictionWithConditions(RESIN_CONFIGS.SOC, 2000, 30, 220, points);
  return <CalibrationManager measuredPoints={points} onUpdatePoints={setPoints} calibration={prediction.calibration}
    spinSpeed={2000} spinTime={30} currentResin={RESIN_CONFIGS.SOC} />;
}

describe('舊實測點補填', () => {
  it('缺量測條件顯示提示，補填後提示消失且顯示已記錄條件', async () => {
    const user = userEvent.setup();
    render(<LegacyPointsHarness />);
    expect(screen.getByTestId('missing-conditions-hint').textContent).toContain('有 1 個實測點未記錄量測條件，目前假設為 2000 rpm / 30 s');
    await user.type(screen.getByLabelText('實測點 1 轉速'), '1500');
    await user.tab();
    expect(screen.getByTestId('missing-conditions-hint')).toBeTruthy();
    await user.type(screen.getByLabelText('實測點 1 時間'), '40');
    await user.tab();
    expect(screen.queryByTestId('missing-conditions-hint')).toBeNull();
    expect(screen.getByText('1500 rpm / 40 s')).toBeTruthy();
  });
});
