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
import {RESIN_CONFIGS} from './resinConfigs';

// 與 customCurves.ts 內的 STORAGE_KEY 相同。
// 這是使用者瀏覽器中既有自訂曲線的資料鍵，不可變更，否則舊資料會讀不到。
const STORAGE_KEY = 'spin_coating_custom_calibrated_curves_v2';

let store: Map<string, string>;
let setItemSpy: ReturnType<typeof vi.fn>;

function stubLocalStorage() {
  store = new Map();
  setItemSpy = vi.fn((key: string, value: string) => void store.set(key, String(value)));
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: setItemSpy,
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

  it('讀取沿用舊鍵名 spin_coating_custom_calibrated_curves_v2 的既有資料', () => {
    store.set('spin_coating_custom_calibrated_curves_v2', JSON.stringify([makeCurve('legacy-data')]));
    expect(getSavedCurves().map(c => c.id)).toEqual(['legacy-data']);
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
    const curve: SavedCalibratedCurve = {
      ...makeCurve('export-me', '要匯出的曲線'),
      rSquared: 0.99,
      measuredPoints: [{id: 'p1', solidsContent: 8, thickness: 180, spinSpeed: 2000, spinTime: 30}],
    };
    const json = exportCurvesAsJSON([curve]);
    expect(JSON.parse(json)).toEqual([curve]);

    // 模擬另一台電腦：全新的儲存空間
    stubLocalStorage();
    const result = importCurvesFromJSON(json);
    expect(result.importedCount).toBe(1);
    expect(result.skipped).toEqual([]);
    expect(result.curves).toHaveLength(3); // 2 條預設 + 1 條匯入
    expect(result.curves[0]).toEqual(curve);
    expect(persisted()[0]).toEqual(curve);
  });

  it('匯入重複 id 時會改名（imported-…），原有曲線保持不變', () => {
    const json = exportCurvesAsJSON(DEFAULT_INITIAL_SAVED_CURVES);
    const result = importCurvesFromJSON(json);
    expect(result.importedCount).toBe(2);
    expect(result.curves).toHaveLength(4);

    const ids = result.curves.map(c => c.id);
    expect(new Set(ids).size).toBe(4);
    const originalIds = DEFAULT_INITIAL_SAVED_CURVES.map(c => c.id);
    for (const id of originalIds) expect(ids).toContain(id);
    const renamed = ids.filter(id => !originalIds.includes(id));
    expect(renamed).toHaveLength(2);
    for (const id of renamed) expect(id).toMatch(/^imported-\d+-/);
  });

  it('同一份檔案內有重複 id 時，後面的也會改名，不會產生相同 id', () => {
    const json = JSON.stringify([makeCurve('same', 'A'), makeCurve('same', 'B')]);
    const result = importCurvesFromJSON(json);
    expect(result.importedCount).toBe(2);
    const ids = result.curves.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter(id => id === 'same')).toHaveLength(1);
  });

  it('匯入的項目沒有 id 時會補上 imported-… id', () => {
    const {id: _omit, ...noId} = makeCurve('x', '無 id 曲線');
    const result = importCurvesFromJSON(JSON.stringify([noId]));
    expect(result.curves[0].name).toBe('無 id 曲線');
    expect(result.curves[0].id).toMatch(/^imported-\d+-/);
  });

  it('measuredPoints 缺少時視為空陣列；缺少的 createdAt / scaleFactor / rSquared 會補上預設值', () => {
    const {measuredPoints: _m, createdAt: _c, scaleFactor: _s, rSquared: _r, ...minimal} = makeCurve('min');
    const result = importCurvesFromJSON(JSON.stringify([minimal]));
    const imported = result.curves[0];
    expect(result.importedCount).toBe(1);
    expect(imported.measuredPoints).toEqual([]);
    expect(imported.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(imported.scaleFactor).toBeCloseTo(100 / RESIN_CONFIGS.KrF.defaultC, 12);
    expect(imported.rSquared).toBeNull();
  });

  it('帶有 spinSpeed / spinTime 的實測點可正常匯入並保留欄位', () => {
    const curve = {
      ...makeCurve('with-spin'),
      measuredPoints: [
        {id: 'a', solidsContent: 8, thickness: 180, spinSpeed: 2000, spinTime: 30},
        {id: 'b', solidsContent: 10, thickness: 260}, // 舊資料：沒有轉速與時間
      ],
    };
    const result = importCurvesFromJSON(JSON.stringify([curve]));
    expect(result.importedCount).toBe(1);
    expect(result.skipped).toEqual([]);
    expect(result.curves[0].measuredPoints).toEqual(curve.measuredPoints);
  });

  describe('整份檔案格式錯誤時拋出具體錯誤', () => {
    it('不是有效 JSON', () => {
      expect(() => importCurvesFromJSON('{not json')).toThrow(new Error('檔案不是有效的 JSON 格式'));
    });

    it.each([
      ['物件', '{"id":"a"}'],
      ['字串', '"abc"'],
      ['數字', '42'],
      ['null', 'null'],
    ])('JSON 不是陣列（%s）', (_label, bad) => {
      expect(() => importCurvesFromJSON(bad)).toThrow(new Error('JSON 內容必須是校正曲線陣列'));
    });

    it('拋出錯誤時不改動已儲存的資料', () => {
      saveCurve(makeCurve('keep-me'));
      const before = store.get(STORAGE_KEY);
      setItemSpy.mockClear();
      expect(() => importCurvesFromJSON('oops')).toThrow();
      expect(() => importCurvesFromJSON('{}')).toThrow();
      expect(setItemSpy).not.toHaveBeenCalled();
      expect(store.get(STORAGE_KEY)).toBe(before);
    });
  });

  describe('逐筆驗證：不合格的項目放入 skipped 並寫明原因', () => {
    type Patch = Record<string, unknown>;
    const importOne = (patch: Patch) => {
      const result = importCurvesFromJSON(JSON.stringify([{...makeCurve('v'), ...patch}]));
      return result;
    };

    it.each<[string, Patch, string]>([
      ['name 缺少', {name: undefined}, 'name 必須為非空字串'],
      ['name 為空字串', {name: ''}, 'name 必須為非空字串'],
      ['name 只有空白', {name: '   '}, 'name 必須為非空字串'],
      ['name 不是字串', {name: 123}, 'name 必須為非空字串'],
      ['resinType 缺少', {resinType: undefined}, 'resinType 不是支援的樹脂類別'],
      ['resinType 不存在', {resinType: 'XYZ'}, 'resinType 不是支援的樹脂類別：XYZ'],
      ['resinType 是原型鏈上的名稱', {resinType: 'constructor'}, 'resinType 不是支援的樹脂類別：constructor'],
      ['spinSpeed 為 0', {spinSpeed: 0}, 'spinSpeed 必須為大於 0 的有限數值'],
      ['spinTime 為負數', {spinTime: -1}, 'spinTime 必須為大於 0 的有限數值'],
      ['targetThickness 是字串', {targetThickness: '320'}, 'targetThickness 必須為大於 0 的有限數值'],
      ['calibratedC 缺少', {calibratedC: undefined}, 'calibratedC 必須為大於 0 的有限數值'],
      ['calibratedAlpha 為 null（例如原值為 NaN）', {calibratedAlpha: null}, 'calibratedAlpha 必須為大於 0 的有限數值'],
      ['beta 為負數', {beta: -0.1}, 'beta 必須為大於或等於 0 的有限數值'],
      ['gamma 缺少', {gamma: undefined}, 'gamma 必須為大於或等於 0 的有限數值'],
      ['measuredPoints 不是陣列', {measuredPoints: 'abc'}, 'measuredPoints 必須為陣列'],
      ['實測點不是物件', {measuredPoints: [5]}, 'measuredPoints[0] 不是有效的實測點物件'],
      [
        '實測點 solidsContent 為 0',
        {measuredPoints: [{id: 'p', solidsContent: 0, thickness: 100}]},
        'measuredPoints[0].solidsContent 必須為大於 0 的有限數值',
      ],
      [
        '實測點 thickness 為負數（第 2 點）',
        {
          measuredPoints: [
            {id: 'p1', solidsContent: 5, thickness: 100},
            {id: 'p2', solidsContent: 8, thickness: -1},
          ],
        },
        'measuredPoints[1].thickness 必須為大於 0 的有限數值',
      ],
      [
        '實測點 spinSpeed 為 0',
        {measuredPoints: [{id: 'p', solidsContent: 5, thickness: 100, spinSpeed: 0}]},
        'measuredPoints[0].spinSpeed 若有提供，必須為大於 0 的有限數值',
      ],
      [
        '實測點 spinTime 為負數',
        {measuredPoints: [{id: 'p', solidsContent: 5, thickness: 100, spinTime: -5}]},
        'measuredPoints[0].spinTime 若有提供，必須為大於 0 的有限數值',
      ],
    ])('%s', (_label, patch, reason) => {
      const result = importOne(patch);
      expect(result.importedCount).toBe(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].index).toBe(0);
      expect(result.skipped[0].reason).toBe(reason);
      expect(result.curves).toEqual(DEFAULT_INITIAL_SAVED_CURVES);
    });

    it('skipped 會附上字串型態的 name；name 不是字串時不附', () => {
      const a = importOne({spinSpeed: 0, name: '有名字的壞資料'});
      expect(a.skipped[0].name).toBe('有名字的壞資料');
      const b = importOne({name: 123});
      expect('name' in b.skipped[0]).toBe(false);
    });

    it('陣列內不是物件的項目（null、數字、陣列）也會被記錄', () => {
      const result = importCurvesFromJSON(JSON.stringify([null, 42, []]));
      expect(result.importedCount).toBe(0);
      expect(result.skipped.map(s => [s.index, s.reason])).toEqual([
        [0, '不是有效的曲線物件'],
        [1, '不是有效的曲線物件'],
        [2, '不是有效的曲線物件'],
      ]);
    });

    it('部分合格、部分不合格：只匯入合格的，其餘列入 skipped', () => {
      const json = JSON.stringify([
        makeCurve('ok-1', '合格 1'),
        {...makeCurve('bad'), name: '壞資料', spinSpeed: 0},
        makeCurve('ok-2', '合格 2'),
      ]);
      const result = importCurvesFromJSON(json);
      expect(result.importedCount).toBe(2);
      expect(result.skipped).toEqual([
        {index: 1, name: '壞資料', reason: 'spinSpeed 必須為大於 0 的有限數值'},
      ]);
      // 與原版相同：後匯入的排在最前面
      expect(result.curves.map(c => c.id)).toEqual([
        'ok-2',
        'ok-1',
        ...DEFAULT_INITIAL_SAVED_CURVES.map(c => c.id),
      ]);
      expect(persisted().map(c => c.id)).toEqual(result.curves.map(c => c.id));
    });

    it('全部不合格時不寫入 localStorage', () => {
      store.set(STORAGE_KEY, JSON.stringify([makeCurve('existing')]));
      setItemSpy.mockClear();
      const before = store.get(STORAGE_KEY);
      const result = importCurvesFromJSON(
        JSON.stringify([{...makeCurve('a'), name: ''}, {...makeCurve('b'), resinType: 'nope'}]),
      );
      expect(result.importedCount).toBe(0);
      expect(result.skipped).toHaveLength(2);
      expect(result.curves.map(c => c.id)).toEqual(['existing']);
      expect(setItemSpy).not.toHaveBeenCalled();
      expect(store.get(STORAGE_KEY)).toBe(before);
    });

    it('空陣列：匯入 0 筆，不寫入 localStorage', () => {
      store.set(STORAGE_KEY, JSON.stringify([makeCurve('existing')]));
      setItemSpy.mockClear();
      const result = importCurvesFromJSON('[]');
      expect(result.importedCount).toBe(0);
      expect(result.skipped).toEqual([]);
      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });
});
