import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {SavedCalibratedCurve} from '../types';
import {
  DEFAULT_INITIAL_SAVED_CURVES,
  deleteCurve,
  exportCurvesAsJSON,
  getSavedCurves,
  importCurvesFromJSON,
  saveCurve,
} from './customCurves';

// 與 customCurves.ts 內的 STORAGE_KEY 相同（已存在使用者瀏覽器中的資料鍵，不可隨意更動）
const STORAGE_KEY = 'spin_coating_custom_calibrated_curves_v2';

let store: Map<string, string>;

function stubLocalStorage() {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  });
}

const persisted = (): SavedCalibratedCurve[] => JSON.parse(store.get(STORAGE_KEY) as string);

const makeCurve = (id: string, name = `曲線 ${id}`): SavedCalibratedCurve => ({
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
  scaleFactor: 1.05,
  rSquared: null,
  measuredPoints: [],
});

beforeEach(stubLocalStorage);
afterEach(() => vi.unstubAllGlobals());

describe('getSavedCurves', () => {
  it('首次讀取會寫入並回傳預設曲線', () => {
    expect(store.has(STORAGE_KEY)).toBe(false);
    const curves = getSavedCurves();
    expect(curves).toEqual(DEFAULT_INITIAL_SAVED_CURVES);
    expect(curves).toHaveLength(2);
    expect(persisted()).toEqual(DEFAULT_INITIAL_SAVED_CURVES);
  });

  it('已有資料時讀回已儲存的內容，不重新寫入預設值', () => {
    store.set(STORAGE_KEY, JSON.stringify([makeCurve('only')]));
    expect(getSavedCurves().map(c => c.id)).toEqual(['only']);
  });
});

describe('saveCurve', () => {
  it('新增：放在清單最前面並寫入儲存', () => {
    const result = saveCurve(makeCurve('new-1'));
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('new-1');
    expect(persisted().map(c => c.id)).toEqual(result.map(c => c.id));
  });

  it('覆寫：相同 id 就地取代，數量與順序不變', () => {
    saveCurve(makeCurve('dup', '舊名稱'));
    const before = getSavedCurves().map(c => c.id);
    const result = saveCurve(makeCurve('dup', '新名稱'));
    expect(result.map(c => c.id)).toEqual(before);
    expect(result.find(c => c.id === 'dup')?.name).toBe('新名稱');
    expect(persisted().find(c => c.id === 'dup')?.name).toBe('新名稱');
  });
});

describe('deleteCurve', () => {
  it('刪除指定 id 並寫入儲存', () => {
    saveCurve(makeCurve('to-delete'));
    const result = deleteCurve('to-delete');
    expect(result.some(c => c.id === 'to-delete')).toBe(false);
    expect(result).toHaveLength(2);
    expect(persisted().some(c => c.id === 'to-delete')).toBe(false);
  });

  it('刪除不存在的 id 不影響現有資料', () => {
    const result = deleteCurve('does-not-exist');
    expect(result).toEqual(DEFAULT_INITIAL_SAVED_CURVES);
  });
});

describe('JSON 匯出與匯入', () => {
  it('匯出再匯入：資料完整還原', () => {
    const curve = makeCurve('export-me', '要匯出的曲線');
    const json = exportCurvesAsJSON([curve]);
    expect(JSON.parse(json)).toEqual([curve]);

    // 模擬另一台電腦：全新的儲存空間
    stubLocalStorage();
    const merged = importCurvesFromJSON(json);
    expect(merged).toHaveLength(3); // 2 條預設 + 1 條匯入
    expect(merged[0]).toEqual(curve);
    expect(persisted()[0]).toEqual(curve);
  });

  it('匯入重複 id 時會改名（imported-…），原有曲線保持不變', () => {
    const json = exportCurvesAsJSON(DEFAULT_INITIAL_SAVED_CURVES);
    const merged = importCurvesFromJSON(json);
    expect(merged).toHaveLength(4);

    const ids = merged.map(c => c.id);
    expect(new Set(ids).size).toBe(4);
    const originalIds = DEFAULT_INITIAL_SAVED_CURVES.map(c => c.id);
    for (const id of originalIds) expect(ids).toContain(id);
    const renamed = ids.filter(id => !originalIds.includes(id));
    expect(renamed).toHaveLength(2);
    for (const id of renamed) expect(id).toMatch(/^imported-\d+-/);
  });

  it('匯入的項目沒有 id 時會補上 imported-… id', () => {
    const {id: _omit, ...noId} = makeCurve('x', '無 id 曲線');
    const merged = importCurvesFromJSON(JSON.stringify([noId]));
    expect(merged[0].name).toBe('無 id 曲線');
    expect(merged[0].id).toMatch(/^imported-\d+-/);
  });

  it('缺少 name 或 resinType 的項目會被略過', () => {
    const merged = importCurvesFromJSON(JSON.stringify([{id: 'bad-1'}, {id: 'bad-2', name: 'n'}]));
    expect(merged).toEqual(DEFAULT_INITIAL_SAVED_CURVES);
  });

  it.each([
    ['不是合法 JSON', '{not json'],
    ['JSON 不是陣列', '{"id":"a"}'],
  ])('格式錯誤時拋出錯誤：%s', (_label, bad) => {
    expect(() => importCurvesFromJSON(bad)).toThrow('匯入失敗');
  });

  it('匯入失敗時不改動已儲存的資料', () => {
    saveCurve(makeCurve('keep-me'));
    const before = store.get(STORAGE_KEY);
    expect(() => importCurvesFromJSON('oops')).toThrow();
    expect(store.get(STORAGE_KEY)).toBe(before);
  });
});
