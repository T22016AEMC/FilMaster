import {describe, expect, it} from 'vitest';
import type {MeasuredPoint, ProcessSolveMode, ProcessSolveParams, ResinConfig} from '../types';
import {calculateThickness, calibrateModel, runPrediction} from './meyerhofer';
import {
  calculateRequiredSpinSpeed,
  calculateRequiredSpinTime,
  DEFAULT_EQUIPMENT_LIMITS,
  runProcessSolve,
} from './processSolver';
import {RESIN_CONFIGS} from './resinConfigs';

const soc = RESIN_CONFIGS.SOC;
const officialPoint: MeasuredPoint = {
  id: 'soc-1', solidsContent: 8, thickness: 180, spinSpeed: 2000, spinTime: 30,
};

function solve(
  mode: ProcessSolveMode = 'solve_speed',
  overrides: Partial<ProcessSolveParams> = {},
  resin: ResinConfig = soc
) {
  return runProcessSolve(resin, mode, {
    solids: 8, targetThickness: 220, fixedTime: 30, fixedSpeed: 2000,
    measuredPoints: [officialPoint], ...overrides,
  });
}

function expectRelative(actual: number | null, expected: number, tolerance = 1e-9) {
  expect(actual).not.toBeNull();
  expect(Math.abs((actual! - expected) / expected)).toBeLessThan(tolerance);
}

describe('反算純函式', () => {
  for (const resin of Object.values(RESIN_CONFIGS)) {
    it(`${resin.id} 反算轉速與正算互為反函數`, () => {
      const h = calculateThickness(8, 2300, 35, resin.defaultC, resin.alpha, resin.beta, resin.gamma);
      expectRelative(calculateRequiredSpinSpeed(h, 8, 35, resin.defaultC, resin.alpha, resin.beta, resin.gamma), 2300);
    });

    it(`${resin.id} 反算時間與正算互為反函數`, () => {
      const h = calculateThickness(8, 2300, 35, resin.defaultC, resin.alpha, resin.beta, resin.gamma);
      expectRelative(calculateRequiredSpinTime(h, 8, 2300, resin.defaultC, resin.alpha, resin.beta, resin.gamma), 35);
    });
  }

  it.each([0, -1, NaN, Infinity, -Infinity])('無效輸入 %s 皆回傳 null、不丟例外', value => {
    for (const calculate of [calculateRequiredSpinSpeed, calculateRequiredSpinTime]) {
      for (const field of [0, 1, 2, 3]) {
        const args: [number, number, number, number, number, number, number] = [180, 8, 30, 1000, 1.45, 0.48, 0.18];
        args[field] = value;
        expect(calculate(...args)).toBeNull();
      }
    }
    expect(calculateRequiredSpinSpeed(180, 8, 30, 1000, 1.45, value, 0.18)).toBeNull();
    expect(calculateRequiredSpinTime(180, 8, 2000, 1000, 1.45, 0.48, value)).toBeNull();
  });

  it.each([NaN, Infinity, -Infinity])('非有限的其他指數 %s 回傳 null', value => {
    expect(calculateRequiredSpinSpeed(180, 8, 30, 1000, value, 0.48, 0.18)).toBeNull();
    expect(calculateRequiredSpinSpeed(180, 8, 30, 1000, 1.45, 0.48, value)).toBeNull();
    expect(calculateRequiredSpinTime(180, 8, 2000, 1000, value, 0.48, 0.18)).toBeNull();
    expect(calculateRequiredSpinTime(180, 8, 2000, 1000, 1.45, value, 0.18)).toBeNull();
  });

  it('數值溢位或下溢時回傳 null', () => {
    expect(calculateRequiredSpinSpeed(1, 100, 30, 1e308, 10, 0.48, 0.18)).toBeNull();
    expect(calculateRequiredSpinTime(1e308, 1, 2000, Number.MIN_VALUE, 1, 0.48, 0.18)).toBeNull();
  });
});

describe('SOC 獨立手算基準', () => {
  it('180 nm、30 s 還原 2000 rpm', () => {
    expect(Math.abs(solve('solve_speed', {targetThickness: 180}).recommended! - 2000)).toBeLessThan(0.01);
  });

  it('220 nm、30 s 得到約 1316.6 rpm', () => {
    expect(Math.abs(solve().recommended! - 1316.6)).toBeLessThan(0.1);
  });

  it('220 nm、2000 rpm 得到約 9.84 s', () => {
    expect(Math.abs(solve('solve_time').recommended! - 9.84)).toBeLessThan(0.01);
  });

  it('220 nm ±5% 的轉速範圍約 1189.4～1465.1 rpm', () => {
    const result = solve();
    expect(Math.abs(result.rangeMin! - 1189.4)).toBeLessThan(0.1);
    expect(Math.abs(result.rangeMax! - 1465.1)).toBeLessThan(0.1);
    expect(result.lowerThickness).toBeCloseTo(209, 10);
    expect(result.upperThickness).toBeCloseTo(231, 10);
  });

  it('220 nm ±5% 的時間範圍約 7.50～13.08 s', () => {
    const result = solve('solve_time');
    expect(Math.abs(result.rangeMin! - 7.50)).toBeLessThan(0.01);
    expect(Math.abs(result.rangeMax! - 13.08)).toBeLessThan(0.01);
  });
});

describe.each<ProcessSolveMode>(['solve_speed', 'solve_time'])('%s 容差窗與校正', mode => {
  it('容差窗方向正確，兩端代回正算得到對應膜厚', () => {
    const result = solve(mode);
    const c = result.calibration;
    expect(result.rangeMin).toBeLessThanOrEqual(result.recommended!);
    expect(result.rangeMax).toBeGreaterThanOrEqual(result.recommended!);
    for (const [value, h] of [
      [result.rangeMin!, result.upperThickness],
      [result.rangeMax!, result.lowerThickness],
      [result.recommended!, result.targetThickness],
    ]) {
      expectRelative(calculateThickness(8, mode === 'solve_speed' ? value : 2000,
        mode === 'solve_time' ? value : 30, c.calibratedC, c.calibratedAlpha, c.beta, c.gamma), h);
    }
    expect(result.exponentsCalibrated).toBe(false);
    if (mode === 'solve_speed') {
      expect(result.fixedTime).toBe(30);
      expect(result).not.toHaveProperty('fixedSpeed');
    } else {
      expect(result.fixedSpeed).toBe(2000);
      expect(result).not.toHaveProperty('fixedTime');
    }
  });

  it.each([undefined, 0, NaN, -1, 0.01, 0.1, 5, 10, 20, Infinity, -Infinity])(
    '容差 %s 沿用 runPrediction 的預設與限制方式', tolerancePercent => {
      const result = solve(mode, {tolerancePercent});
      const existing = runPrediction(soc, 2000, 30, 220, [], tolerancePercent);
      expect(result.tolerancePercent).toBe(existing.tolerancePercent);
      expect(result.lowerThickness).toBe(existing.lowerThickness);
      expect(result.upperThickness).toBe(existing.upperThickness);
    }
  );

  it('0 點回傳理論參數，參考條件為 null', () => {
    const result = solve(mode, {measuredPoints: []});
    expect(result.calibration.mode).toBe('theoretical');
    expect(result.calibration.calibratedC).toBe(soc.defaultC);
    expect(result.calibration.calibratedAlpha).toBe(soc.alpha);
    expect(result.referenceConditions).toBeNull();
    expect(result.recommended).not.toBeNull();
  });

  it('單點採用自己的 1500 rpm / 40 s，反算後正算通過該點', () => {
    const point = {...officialPoint, spinSpeed: 1500, spinTime: 40};
    const result = solve(mode, {measuredPoints: [point], targetThickness: 180,
      fixedSpeed: 1500, fixedTime: 40});
    expect(result.referenceConditions).toEqual({spinSpeed: 1500, spinTime: 40});
    expect(result.calibration.mode).toBe('single_point_shift');
    expectRelative(result.recommended, mode === 'solve_speed' ? 1500 : 40);
    const c = result.calibration;
    expectRelative(calculateThickness(8, 1500, 40, c.calibratedC, c.calibratedAlpha, c.beta, c.gamma), 180);
    // 同一校正也能用於與量測不同的固定製程條件。
    const other = solve(mode, {measuredPoints: [point], fixedTime: 30, fixedSpeed: 2000});
    expectRelative(calculateThickness(8, mode === 'solve_speed' ? other.recommended! : 2000,
      mode === 'solve_time' ? other.recommended! : 30,
      c.calibratedC, c.calibratedAlpha, c.beta, c.gamma), 220);
  });

  const trueC = 2500;
  const trueAlpha = 1.7;
  const mixedPoints = [[4, 1500, 40], [8, 2500, 25], [12, 3200, 50]].map(
    ([solidsContent, spinSpeed, spinTime], i): MeasuredPoint => ({
      id: `mixed-${i}`, solidsContent, spinSpeed, spinTime,
      thickness: calculateThickness(solidsContent, spinSpeed, spinTime, trueC, trueAlpha, soc.beta, soc.gamma),
    })
  );

  it.each([2, 3])('%s 個不同量測條件的無雜訊點還原 C、α，R² 為 1', count => {
    const targetThickness = calculateThickness(9, 2300, 35, trueC, trueAlpha, soc.beta, soc.gamma);
    const result = solve(mode, {solids: 9, fixedSpeed: 2300, fixedTime: 35,
      targetThickness, measuredPoints: mixedPoints.slice(0, count)});
    expectRelative(result.calibration.calibratedC, trueC, 1e-6);
    expectRelative(result.calibration.calibratedAlpha, trueAlpha, 1e-6);
    expect(result.calibration.rSquared).toBeCloseTo(1, 12);
    expectRelative(result.recommended, mode === 'solve_speed' ? 2300 : 35);
    expect(result.calibration.beta).toBe(soc.beta);
    expect(result.calibration.gamma).toBe(soc.gamma);
  });

  it('顛倒實測點順序改變參考條件，不影響建議值與校正參數', () => {
    const before = solve(mode, {measuredPoints: mixedPoints});
    const after = solve(mode, {measuredPoints: [...mixedPoints].reverse()});
    expect(before.referenceConditions).toEqual({spinSpeed: 1500, spinTime: 40});
    expect(after.referenceConditions).toEqual({spinSpeed: 3200, spinTime: 50});
    expectRelative(after.recommended, before.recommended!);
    expectRelative(after.calibration.calibratedC, before.calibration.calibratedC);
    expectRelative(after.calibration.calibratedAlpha, before.calibration.calibratedAlpha);
    expect(after.calibration.rSquared).toBeCloseTo(before.calibration.rSquared!, 12);
  });

  it.each([1, 2, 3])('%s 個相同製程條件的點，校正完整結果等於既有 calibrateModel', count => {
    const points = [4, 8, 12].slice(0, count).map((solidsContent, i) => ({
      ...officialPoint, id: `same-${i}`, solidsContent,
      thickness: calculateThickness(solidsContent, 2000, 30, trueC, trueAlpha, soc.beta, soc.gamma),
    }));
    expect(solve(mode, {measuredPoints: points}).calibration).toEqual(calibrateModel(soc, 2000, 30, points));
  });

  it('舊資料有 fallback 時補入條件，回報數量與假設條件', () => {
    const points = [{...officialPoint, spinSpeed: undefined, spinTime: undefined},
      {...officialPoint, id: 'old-2', spinTime: undefined}];
    const result = solve(mode, {measuredPoints: points, fallbackConditions: {spinSpeed: 2000, spinTime: 30}});
    expect(result.calibration.pointsCount).toBe(2);
    expect(result.referenceConditions).toEqual({spinSpeed: 2000, spinTime: 30});
    expect(result.warnings).toContainEqual(expect.objectContaining({code: 'POINT_CONDITIONS_ASSUMED',
      message: expect.stringContaining('有 2 個實測點沒有記錄量測條件，已假設為 2000 rpm / 30 s')}));
    expect(result.warnings.some(w => w.code === 'POINT_CONDITIONS_MISSING')).toBe(false);
  });

  it('fallback 只補缺少的欄位，不覆蓋已記錄條件', () => {
    const result = solve(mode, {measuredPoints: [{...officialPoint, spinSpeed: 1500, spinTime: undefined}],
      fallbackConditions: {spinSpeed: 2000, spinTime: 40}});
    expect(result.referenceConditions).toEqual({spinSpeed: 1500, spinTime: 40});
  });

  it('無 fallback 排除舊資料，其餘有效點仍用於校正', () => {
    const result = solve(mode, {measuredPoints: [{...officialPoint, id: 'old', spinSpeed: undefined}, officialPoint]});
    expect(result.calibration.pointsCount).toBe(1);
    expect(result.referenceConditions).toEqual({spinSpeed: 2000, spinTime: 30});
    expect(result.warnings.some(w => w.code === 'POINT_CONDITIONS_MISSING')).toBe(true);
    expect(result.warnings.some(w => w.code === 'POINT_CONDITIONS_ASSUMED')).toBe(false);
  });

  it('所有舊資料均被排除時退回理論模式', () => {
    const result = solve(mode, {measuredPoints: [{...officialPoint, spinSpeed: undefined, spinTime: undefined}]});
    expect(result.calibration.mode).toBe('theoretical');
    expect(result.calibration.pointsCount).toBe(0);
    expect(result.referenceConditions).toBeNull();
    expect(result.warnings.some(w => w.code === 'POINT_CONDITIONS_MISSING')).toBe(true);
  });

  it.each([0, -1, NaN, Infinity])('無效量測條件 %s 不可作為參考條件', value => {
    const result = solve(mode, {measuredPoints: [{...officialPoint, spinSpeed: value},
      {...officialPoint, spinTime: value}, officialPoint]});
    expect(result.calibration.pointsCount).toBe(1);
    expect(result.referenceConditions).toEqual({spinSpeed: 2000, spinTime: 30});
    expect(result.warnings.some(w => w.code === 'POINT_CONDITIONS_MISSING')).toBe(true);
  });

  it('無效 fallback 不用於校正', () => {
    const result = solve(mode, {measuredPoints: [{...officialPoint, spinTime: undefined}],
      fallbackConditions: {spinSpeed: 2000, spinTime: 0}});
    expect(result.calibration.mode).toBe('theoretical');
    expect(result.warnings.some(w => w.code === 'POINT_CONDITIONS_MISSING')).toBe(true);
    expect(result.warnings.some(w => w.code === 'POINT_CONDITIONS_ASSUMED')).toBe(false);
  });

  it('無效膜厚或固含量的點不作為參考，且不改動輸入點', () => {
    const points = [{...officialPoint, solidsContent: NaN}, {...officialPoint, thickness: Infinity},
      {...officialPoint, solidsContent: 0}, {...officialPoint, thickness: -1}, officialPoint];
    const original = structuredClone(points);
    const result = solve(mode, {measuredPoints: points});
    expect(result.calibration.pointsCount).toBe(1);
    expect(points).toEqual(original);
    expect(result.referenceConditions).toEqual({spinSpeed: 2000, spinTime: 30});
  });

  it('保留既有校正警告並合併至結果', () => {
    const result = solve(mode, {measuredPoints: [officialPoint, {...officialPoint, id: 'duplicate'}]});
    expect(result.calibration.warnings.some(w => w.code === 'FIT_DEGENERATE')).toBe(true);
    for (const warning of result.calibration.warnings) expect(result.warnings).toContainEqual(warning);
  });

  it('有效且設備範圍內的資料不觸發四種新警告', () => {
    const result = solve(mode);
    expect(result.warnings).toEqual([]);
  });
});

describe.each<ProcessSolveMode>(['solve_speed', 'solve_time'])('%s 無解與設備範圍警告', mode => {
  it.each([0, -1, NaN, Infinity, -Infinity])('S、h 或固定製程值為 %s 時回傳無解', value => {
    for (const field of ['solids', 'targetThickness', mode === 'solve_speed' ? 'fixedTime' : 'fixedSpeed']) {
      const result = solve(mode, {[field]: value});
      expect(result.recommended).toBeNull();
      expect(result.rangeMin).toBeNull();
      expect(result.rangeMax).toBeNull();
      expect(result.warnings.some(w => w.code === 'PROCESS_UNSOLVABLE')).toBe(true);
      if (field === 'solids') expect(result.warnings.some(w => w.code === 'SOLIDS_OUT_OF_RANGE')).toBe(true);
    }
  });

  it('缺少固定製程值時回傳無解', () => {
    const result = solve(mode, mode === 'solve_speed' ? {fixedTime: undefined} : {fixedSpeed: undefined});
    expect(result.recommended).toBeNull();
    expect(result.warnings.some(w => w.code === 'PROCESS_UNSOLVABLE')).toBe(true);
  });

  it.each([0, -0.1, NaN, Infinity, -Infinity])('待反算的指數 %s 無效時回傳無解', exponent => {
    const resin = {...soc, [mode === 'solve_speed' ? 'beta' : 'gamma']: exponent};
    const result = solve(mode, {measuredPoints: []}, resin);
    expect(result.recommended).toBeNull();
    expect(result.warnings.some(w => w.code === 'PROCESS_UNSOLVABLE')).toBe(true);
  });

  it('有限輸入造成運算溢位時也回傳無解', () => {
    const result = solve(mode, {measuredPoints: [], solids: 100}, {...soc, defaultC: 1e308, alpha: 10});
    expect(result.recommended).toBeNull();
    expect(result.warnings.some(w => w.code === 'PROCESS_UNSOLVABLE')).toBe(true);
  });

  it('S > 100 發出固含量警告，仍回傳反算數值', () => {
    const result = solve(mode, {solids: 101});
    expect(result.recommended).not.toBeNull();
    expect(result.warnings.some(w => w.code === 'SOLIDS_OUT_OF_RANGE')).toBe(true);
  });

  it('S = 100 不觸發固含量超界警告', () => {
    expect(solve(mode, {solids: 100}).warnings.some(w => w.code === 'SOLIDS_OUT_OF_RANGE')).toBe(false);
  });

  it.each(['below', 'above'])('超出預設設備範圍 %s 時保留數值並指出端點與界限', side => {
    const min = mode === 'solve_speed' ? DEFAULT_EQUIPMENT_LIMITS.minSpeed : DEFAULT_EQUIPMENT_LIMITS.minTime;
    const max = mode === 'solve_speed' ? DEFAULT_EQUIPMENT_LIMITS.maxSpeed : DEFAULT_EQUIPMENT_LIMITS.maxTime;
    const expected = side === 'below' ? min / 2 : max * 2;
    const h = calculateThickness(8, mode === 'solve_speed' ? expected : 2000,
      mode === 'solve_time' ? expected : 30, soc.defaultC, soc.alpha, soc.beta, soc.gamma);
    const result = solve(mode, {targetThickness: h, measuredPoints: []});
    expectRelative(result.recommended, expected);
    for (const field of ['recommended', 'rangeMin', 'rangeMax']) {
      expect(result.warnings).toContainEqual(expect.objectContaining({code: 'PROCESS_OUT_OF_RANGE', field,
        message: expect.stringContaining(side === 'below' ? `設備下限 ${min}` : `設備上限 ${max}`)}));
    }
  });

  it('建議值在範圍內，只有容差窗兩端超界仍發出個別警告', () => {
    const baseline = solve(mode);
    const value = baseline.recommended!;
    const limits = mode === 'solve_speed'
      ? {minSpeed: value * 0.99, maxSpeed: value * 1.01}
      : {minTime: value * 0.99, maxTime: value * 1.01};
    const result = solve(mode, {limits});
    expect(result.recommended).toBe(baseline.recommended);
    expect(result.rangeMin).toBe(baseline.rangeMin);
    expect(result.rangeMax).toBe(baseline.rangeMax);
    expect(result.warnings.filter(w => w.code === 'PROCESS_OUT_OF_RANGE').map(w => w.field))
      .toEqual(['rangeMin', 'rangeMax']);
    expect(result.warnings.find(w => w.field === 'rangeMin')?.message).toContain('容差窗下界');
    expect(result.warnings.find(w => w.field === 'rangeMax')?.message).toContain('容差窗上界');
  });

  it('自訂設備界限與容差窗恰好相等時不警告', () => {
    const baseline = solve(mode);
    const limits = mode === 'solve_speed'
      ? {minSpeed: baseline.rangeMin!, maxSpeed: baseline.rangeMax!}
      : {minTime: baseline.rangeMin!, maxTime: baseline.rangeMax!};
    expect(solve(mode, {limits}).warnings.some(w => w.code === 'PROCESS_OUT_OF_RANGE')).toBe(false);
  });
});
