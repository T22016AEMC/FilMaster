import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import type {MeasuredPoint, PredictionResult, ResinType} from '../types';
import {
  ALPHA_FIT_MAX,
  ALPHA_FIT_MIN,
  SOLIDS_MAX,
  calculateRequiredSolids,
  calculateThickness,
  calibrateModel,
  generateCSV,
  generateCurvePoints,
  generateDenseChartPoints,
  generateStructuredReport,
  runPrediction,
} from './meyerhofer';
import {PRESET_SCENARIOS, RESIN_CONFIGS} from './resinConfigs';

// ---------------------------------------------------------------------------
// Golden fixture：由 _legacy 原版程式產生（見 CHANGELOG 階段 2）
// ---------------------------------------------------------------------------
interface GoldenPreset {
  id: string;
  input: {
    resinType: ResinType;
    spinSpeed: number;
    spinTime: number;
    targetThickness: number;
    tolerancePercent: number | null;
    measuredPoints: MeasuredPoint[];
  };
  prediction: PredictionResult;
  curvePoints: unknown;
  denseChartPoints: unknown;
}
interface GoldenCustomCurve {
  id: string;
  input: {
    resinType: ResinType;
    spinSpeed: number;
    spinTime: number;
    targetThickness: number;
    tolerancePercent: number | null;
    calibratedC: number;
    calibratedAlpha: number;
    beta: number;
    gamma: number;
  };
  prediction: PredictionResult;
}
const golden = JSON.parse(
  readFileSync(new URL('./__fixtures__/legacy-golden.json', import.meta.url), 'utf-8'),
) as {presets: GoldenPreset[]; customCurves: GoldenCustomCurve[]};

/** 遞迴比對：數字以相對誤差 1e-9 內為通過，其餘必須完全相等 */
function expectDeepClose(actual: unknown, expected: unknown, path = '$'): void {
  if (typeof expected === 'number') {
    expect(typeof actual, `${path} 應為 number`).toBe('number');
    const a = actual as number;
    const diff = Math.abs(a - expected);
    const scale = Math.max(Math.abs(a), Math.abs(expected));
    expect(diff <= 1e-9 * scale, `${path}: 實際 ${a} vs 預期 ${expected}`).toBe(true);
  } else if (Array.isArray(expected)) {
    expect(Array.isArray(actual), `${path} 應為陣列`).toBe(true);
    const arr = actual as unknown[];
    expect(arr.length, `${path} 長度`).toBe(expected.length);
    expected.forEach((item, i) => expectDeepClose(arr[i], item, `${path}[${i}]`));
  } else if (expected !== null && typeof expected === 'object') {
    expect(actual !== null && typeof actual === 'object', `${path} 應為物件`).toBe(true);
    const obj = actual as Record<string, unknown>;
    const exp = expected as Record<string, unknown>;
    expect(Object.keys(obj).sort(), `${path} 欄位`).toEqual(Object.keys(exp).sort());
    for (const key of Object.keys(exp)) expectDeepClose(obj[key], exp[key], `${path}.${key}`);
  } else {
    expect(actual, path).toEqual(expected);
  }
}

interface GoldenReport {
  id: string;
  report: string;
  csv: string;
}
const goldenReports = (
  JSON.parse(
    readFileSync(new URL('./__fixtures__/legacy-report-golden.json', import.meta.url), 'utf-8'),
  ) as {presets: GoldenReport[]}
).presets;

/**
 * 階段 3 刻意造成的差異（golden fixture 本身不重新產生）。
 * 除下列差異外，其餘所有欄位必須與 fixture 完全一致：
 *  1. 單點校正（single_point_shift）的 rSquared：1.0 → null
 *  2. calibration 新增 fittedAlpha：多點擬合且在合理範圍內時等於校正後 α，其餘為 null
 *  3. calibration 與 prediction 新增 warnings：預設情境與預設曲線皆為空陣列
 */
function withStage3Changes(p: PredictionResult): PredictionResult {
  const c = p.calibration;
  return {
    ...p,
    warnings: [],
    calibration: {
      ...c,
      rSquared: c.mode === 'single_point_shift' ? null : c.rSquared,
      fittedAlpha: c.mode === 'multi_point_lsq' ? c.calibratedAlpha : null,
      warnings: [],
    },
  };
}

const SINGLE_POINT_PRESET_IDS = [
  'test_soc_1pt',
  'thick_500_1000_preset',
  'thick_2000_20000_preset',
  'arf_immersion',
  'barc_preset',
];

const withIds = (pts: Array<{solidsContent: number; thickness: number}>): MeasuredPoint[] =>
  pts.map((p, i) => ({id: `t-${i}`, ...p}));

const SOC = RESIN_CONFIGS.SOC;

// ---------------------------------------------------------------------------
// A. Golden 比對
// ---------------------------------------------------------------------------
describe('A. 與原版 (_legacy) 計算結果的 golden 比對', () => {
  it('fixture 涵蓋全部 9 個預設情境與 2 條預設自訂曲線', () => {
    expect(golden.presets.map(p => p.id)).toEqual(PRESET_SCENARIOS.map(s => s.id));
    expect(golden.presets).toHaveLength(9);
    expect(golden.customCurves).toHaveLength(2);
  });

  it('預期差異 1：fixture 中恰好這 5 個單點情境的 rSquared 為 1.0，現在為 null', () => {
    const singles = golden.presets.filter(g => g.prediction.calibration.mode === 'single_point_shift');
    expect(singles.map(g => g.id)).toEqual(SINGLE_POINT_PRESET_IDS);
    for (const g of singles) {
      expect(g.prediction.calibration.rSquared).toBe(1);
      const {input} = g;
      const p = runPrediction(
        RESIN_CONFIGS[input.resinType],
        input.spinSpeed,
        input.spinTime,
        input.targetThickness,
        input.measuredPoints,
        input.tolerancePercent ?? undefined,
      );
      expect(p.calibration.rSquared).toBeNull();
    }
  });

  describe.each(golden.presets.map(p => [p.id, p] as const))('預設情境 %s', (_id, g) => {
    const {input} = g;
    const resin = RESIN_CONFIGS[input.resinType];
    const prediction = runPrediction(
      resin,
      input.spinSpeed,
      input.spinTime,
      input.targetThickness,
      input.measuredPoints,
      input.tolerancePercent ?? undefined,
    );

    it('runPrediction 完整結果（含 calibration 全部欄位；僅有階段 3 的預期差異）', () => {
      expectDeepClose(prediction, withStage3Changes(g.prediction));
    });
    it('9 個預設情境都不產生任何警告', () => {
      expect(prediction.warnings).toEqual([]);
      expect(prediction.calibration.warnings).toEqual([]);
    });
    it('generateCurvePoints（預設參數）', () => {
      expectDeepClose(generateCurvePoints(prediction), g.curvePoints);
    });
    it('generateDenseChartPoints（預設參數）', () => {
      expectDeepClose(generateDenseChartPoints(prediction), g.denseChartPoints);
    });
  });

  describe.each(golden.customCurves.map(c => [c.id, c] as const))('預設自訂曲線 %s', (_id, g) => {
    it('以其 calibratedC / calibratedAlpha 為基準、0 個實測點的 runPrediction', () => {
      const {input} = g;
      const base = RESIN_CONFIGS[input.resinType];
      const resin = {
        ...base,
        alpha: input.calibratedAlpha,
        beta: input.beta,
        gamma: input.gamma,
        defaultC: input.calibratedC,
      };
      const prediction = runPrediction(
        resin,
        input.spinSpeed,
        input.spinTime,
        input.targetThickness,
        [],
        input.tolerancePercent ?? undefined,
      );
      // fixture 內的 resin 含自訂名稱等文字欄位；此處只比對計算結果
      const {resin: _r1, ...actualRest} = prediction;
      const {resin: _r2, ...expectedRest} = withStage3Changes(g.prediction);
      expectDeepClose(actualRest, expectedRest);
      expect(prediction.resin.defaultC).toBe(g.prediction.resin.defaultC);
      expect(prediction.resin.alpha).toBe(g.prediction.resin.alpha);
    });
  });
});

// ---------------------------------------------------------------------------
// B. 公式實作驗算（SOC 官方範例）
// ---------------------------------------------------------------------------
describe('B. SOC 官方範例驗算', () => {
  const points = withIds([{solidsContent: 8.0, thickness: 180.0}]);
  const pred = runPrediction(SOC, 2000, 30, 220, points, 5);

  it('理論模型在 8.0 wt% 為 24.4638 nm', () => {
    const h = calculateThickness(8.0, 2000, 30, SOC.defaultC, SOC.alpha, SOC.beta, SOC.gamma);
    expect(h).toBeCloseTo(24.4638, 3);
  });

  it('scaleFactor ≈ 7.3578、calibratedC ≈ 625.41', () => {
    expect(pred.calibration.mode).toBe('single_point_shift');
    expect(pred.calibration.scaleFactor).toBeCloseTo(7.3578, 3);
    expect(pred.calibration.calibratedC).toBeCloseTo(625.41, 2);
  });

  it('建議固含量 ≈ 9.1874、下限 ≈ 8.8681、上限 ≈ 9.5018 wt%', () => {
    expect(pred.recommendedSolids).toBeCloseTo(9.1874, 3);
    expect(pred.lowerSolids).toBeCloseTo(8.8681, 3);
    expect(pred.upperSolids).toBeCloseTo(9.5018, 3);
  });

  it('容差 ±5% 對應的膜厚為 209 / 231 nm', () => {
    expect(pred.lowerThickness).toBeCloseTo(209, 9);
    expect(pred.upperThickness).toBeCloseTo(231, 9);
  });
});

// ---------------------------------------------------------------------------
// C. 數學性質
// ---------------------------------------------------------------------------
describe('C. 數學性質', () => {
  describe('正算與反算互為反函數', () => {
    it.each(Object.values(RESIN_CONFIGS).map(r => [r.id, r] as const))(
      '%s：固含量 → 膜厚 → 固含量',
      (_id, r) => {
        const S = 10;
        const h = calculateThickness(S, 2000, 30, r.defaultC, r.alpha, r.beta, r.gamma);
        const back = calculateRequiredSolids(h, 2000, 30, r.defaultC, r.alpha, r.beta, r.gamma);
        expect(Math.abs(back - S)).toBeLessThan(1e-9);
      },
    );

    it.each(Object.values(RESIN_CONFIGS).map(r => [r.id, r] as const))(
      '%s：膜厚 → 固含量 → 膜厚',
      (_id, r) => {
        const target = 123.456;
        const S = calculateRequiredSolids(target, 1800, 25, r.defaultC, r.alpha, r.beta, r.gamma);
        const back = calculateThickness(S, 1800, 25, r.defaultC, r.alpha, r.beta, r.gamma);
        expect(Math.abs(back - target)).toBeLessThan(1e-9);
      },
    );
  });

  describe('任一輸入 ≤ 0 時回傳 0', () => {
    const args = {S: 8, h: 100, rpm: 2000, t: 30, C: 85, a: 1.45, b: 0.48, g: 0.18};
    const thickness = (o: Partial<typeof args> = {}) => {
      const v = {...args, ...o};
      return calculateThickness(v.S, v.rpm, v.t, v.C, v.a, v.b, v.g);
    };
    const required = (o: Partial<typeof args> = {}) => {
      const v = {...args, ...o};
      return calculateRequiredSolids(v.h, v.rpm, v.t, v.C, v.a, v.b, v.g);
    };

    it('基準輸入的結果為正數', () => {
      expect(thickness()).toBeGreaterThan(0);
      expect(required()).toBeGreaterThan(0);
    });

    it.each([0, -1])('calculateThickness：固含量 / 轉速 / 時間 / C 為 %s', bad => {
      expect(thickness({S: bad})).toBe(0);
      expect(thickness({rpm: bad})).toBe(0);
      expect(thickness({t: bad})).toBe(0);
      expect(thickness({C: bad})).toBe(0);
    });

    it.each([0, -1])('calculateRequiredSolids：目標膜厚 / 轉速 / 時間 / C / α 為 %s', bad => {
      expect(required({h: bad})).toBe(0);
      expect(required({rpm: bad})).toBe(0);
      expect(required({t: bad})).toBe(0);
      expect(required({C: bad})).toBe(0);
      expect(required({a: bad})).toBe(0);
    });
  });

  describe('校正模式', () => {
    it('0 個實測點 → theoretical，參數等於預設值', () => {
      const c = calibrateModel(SOC, 2000, 30, []);
      expect(c.mode).toBe('theoretical');
      expect(c.calibratedC).toBe(SOC.defaultC);
      expect(c.theoreticalC).toBe(SOC.defaultC);
      expect(c.calibratedAlpha).toBe(SOC.alpha);
      expect(c.theoreticalAlpha).toBe(SOC.alpha);
      expect(c.beta).toBe(SOC.beta);
      expect(c.gamma).toBe(SOC.gamma);
      expect(c.scaleFactor).toBe(1);
      expect(c.rSquared).toBeNull();
      expect(c.pointsCount).toBe(0);
    });

    it('固含量或膜厚 ≤ 0 的點視為無效，等同 0 個實測點', () => {
      const c = calibrateModel(
        SOC,
        2000,
        30,
        withIds([
          {solidsContent: 0, thickness: 100},
          {solidsContent: 8, thickness: -5},
        ]),
      );
      expect(c.mode).toBe('theoretical');
      expect(c.pointsCount).toBe(0);
    });

    it('1 個實測點 → 校正後曲線精確通過該點', () => {
      const c = calibrateModel(SOC, 2000, 30, withIds([{solidsContent: 7.3, thickness: 150.5}]));
      expect(c.mode).toBe('single_point_shift');
      expect(c.calibratedAlpha).toBe(SOC.alpha);
      const h = calculateThickness(7.3, 2000, 30, c.calibratedC, c.calibratedAlpha, c.beta, c.gamma);
      expect(Math.abs(h - 150.5)).toBeLessThan(1e-9);
    });

    it('完全符合冪次律的數據（α=1.5）→ 還原 α=1.5、C，R²=1', () => {
      const trueC = 200;
      const pts = withIds(
        [3, 5, 8, 12, 20].map(S => ({
          solidsContent: S,
          thickness: calculateThickness(S, 2000, 30, trueC, 1.5, SOC.beta, SOC.gamma),
        })),
      );
      const c = calibrateModel(SOC, 2000, 30, pts);
      expect(c.mode).toBe('multi_point_lsq');
      expect(c.pointsCount).toBe(5);
      expect(c.calibratedAlpha).toBeCloseTo(1.5, 9);
      expect(Math.abs(c.calibratedC - trueC) / trueC).toBeLessThan(1e-9);
      expect(c.rSquared).not.toBeNull();
      expect(c.rSquared as number).toBeCloseTo(1, 9);
    });

    it('斜率在 0.05～4.0 範圍內（例如 3.5）時採用擬合斜率作為 α', () => {
      const pts = withIds([2, 3, 4].map(S => ({solidsContent: S, thickness: 5 * Math.pow(S, 3.5)})));
      const c = calibrateModel(SOC, 2000, 30, pts);
      expect(c.calibratedAlpha).toBeCloseTo(3.5, 9);
    });

    it('多個實測點固含量都相同 → 走平均縮放的備用路徑', () => {
      const pts = withIds([
        {solidsContent: 8, thickness: 180},
        {solidsContent: 8, thickness: 200},
      ]);
      const c = calibrateModel(SOC, 2000, 30, pts);
      const pred = calculateThickness(8, 2000, 30, SOC.defaultC, SOC.alpha, SOC.beta, SOC.gamma);
      const avgScale = (180 / pred + 200 / pred) / 2;
      expect(c.mode).toBe('multi_point_lsq');
      expect(c.calibratedAlpha).toBe(SOC.alpha);
      expect(c.calibratedC).toBeCloseTo(SOC.defaultC * avgScale, 9);
      expect(c.rSquared).toBeNull();
      expect(c.pointsCount).toBe(2);
    });
  });

  describe('容差限制在 0.1% ~ 10%', () => {
    it.each([
      [0.05, 0.1],
      [5, 5],
      [15, 10],
    ])('輸入 %s → 實際採用 %s', (input, expected) => {
      const p = runPrediction(SOC, 2000, 30, 200, [], input);
      expect(p.tolerancePercent).toBe(expected);
      expect(p.lowerThickness).toBeCloseTo(200 * (1 - expected / 100), 9);
      expect(p.upperThickness).toBeCloseTo(200 * (1 + expected / 100), 9);
    });
  });
});

// ---------------------------------------------------------------------------
// D. 階段 3 修正後的行為與警告機制
// ---------------------------------------------------------------------------
describe('D. 警告機制與階段 3 修正', () => {
  it('常數：ALPHA_FIT_MIN / ALPHA_FIT_MAX / SOLIDS_MAX', () => {
    expect(ALPHA_FIT_MIN).toBe(0.05);
    expect(ALPHA_FIT_MAX).toBe(4.0);
    expect(SOLIDS_MAX).toBe(100);
  });

  describe('單點校正的 R²', () => {
    it('1 個實測點時 rSquared 為 null，且沒有警告', () => {
      const c = calibrateModel(SOC, 2000, 30, withIds([{solidsContent: 8, thickness: 180}]));
      expect(c.rSquared).toBeNull();
      expect(c.fittedAlpha).toBeNull();
      expect(c.warnings).toEqual([]);
    });
  });

  describe('FIT_DEGENERATE（固含量全相同的備用路徑）', () => {
    const pts = withIds([
      {solidsContent: 8, thickness: 180},
      {solidsContent: 8, thickness: 200},
    ]);

    it('觸發：rSquared 為 null、fittedAlpha 為 null，並加入警告；計算方式不變', () => {
      const c = calibrateModel(SOC, 2000, 30, pts);
      const pred = calculateThickness(8, 2000, 30, SOC.defaultC, SOC.alpha, SOC.beta, SOC.gamma);
      expect(c.rSquared).toBeNull();
      expect(c.fittedAlpha).toBeNull();
      expect(c.calibratedAlpha).toBe(SOC.alpha);
      expect(c.calibratedC).toBeCloseTo(SOC.defaultC * ((180 / pred + 200 / pred) / 2), 9);
      expect(c.warnings).toHaveLength(1);
      expect(c.warnings[0].code).toBe('FIT_DEGENERATE');
      expect(c.warnings[0].message).toContain('固含量相同');
      expect(c.warnings[0].message).toContain('平均縮放');
      expect(c.warnings[0].message).toContain(String(SOC.alpha));
    });

    it('不觸發：固含量不同的多點擬合沒有此警告', () => {
      const c = calibrateModel(
        SOC,
        2000,
        30,
        withIds([
          {solidsContent: 5, thickness: 85},
          {solidsContent: 8, thickness: 182},
        ]),
      );
      expect(c.warnings.map(w => w.code)).not.toContain('FIT_DEGENERATE');
    });
  });

  describe('ALPHA_OUT_OF_RANGE（擬合 α 超出範圍）', () => {
    const powerLaw = (alpha: number) =>
      withIds([2, 3, 4].map(S => ({solidsContent: S, thickness: 5 * Math.pow(S, alpha)})));

    it('觸發（過大）：改用基準 α、記錄實際擬合值，訊息含實際值與基準值', () => {
      const c = calibrateModel(SOC, 2000, 30, powerLaw(4.52));
      expect(c.calibratedAlpha).toBe(SOC.alpha);
      expect(c.fittedAlpha).toBeCloseTo(4.52, 9);
      expect(c.mode).toBe('multi_point_lsq');
      expect(c.warnings).toHaveLength(1);
      const w = c.warnings[0];
      expect(w.code).toBe('ALPHA_OUT_OF_RANGE');
      expect(w.message).toBe('擬合 α = 4.52 超出合理範圍 0.05～4.0，已改用基準值 1.45');
      expect(w.field).toBe('calibratedAlpha');
      expect(w.value).toBeCloseTo(4.52, 9);
      // α 改回基準值時，R² 描述的是被捨棄的擬合，一律為 null
      expect(c.rSquared).toBeNull();
    });

    it('觸發（過小）：膜厚不隨固含量變化（斜率 0）', () => {
      const c = calibrateModel(
        SOC,
        2000,
        30,
        withIds([2, 3, 4].map(S => ({solidsContent: S, thickness: 100}))),
      );
      expect(c.calibratedAlpha).toBe(SOC.alpha);
      expect(c.fittedAlpha as number).toBeCloseTo(0, 9);
      expect(c.warnings.map(w => w.code)).toEqual(['ALPHA_OUT_OF_RANGE']);
      // 膜厚全部相同（ssYY = 0）且斜率為 0：R² 也為 null，而不是 1.0
      expect(c.rSquared).toBeNull();
    });

    it('過小但膜厚並非全部相同（斜率 0.01）：R² 同樣為 null', () => {
      const c = calibrateModel(SOC, 2000, 30, powerLaw(0.01));
      expect(c.calibratedAlpha).toBe(SOC.alpha);
      expect(c.rSquared).toBeNull();
    });

    it.each([0.5, 1.5, 3.5])('不觸發：斜率 %s 在範圍內，採用擬合值且 fittedAlpha 相同', alpha => {
      const c = calibrateModel(SOC, 2000, 30, powerLaw(alpha));
      expect(c.calibratedAlpha).toBeCloseTo(alpha, 9);
      expect(c.fittedAlpha as number).toBeCloseTo(alpha, 9);
      expect(c.warnings).toEqual([]);
      expect(c.rSquared as number).toBeCloseTo(1, 9);
    });
  });

  describe('SOLIDS_OUT_OF_RANGE（反算固含量範圍檢查）', () => {
    const targetForSolids = (S: number) =>
      calculateThickness(S, 2000, 30, SOC.defaultC, SOC.alpha, SOC.beta, SOC.gamma);

    it('觸發（> 100）：三個欄位各一則警告，數值照常回傳不被改成 0 或 null', () => {
      const p = runPrediction(SOC, 2000, 30, 100000, []);
      expect(p.recommendedSolids).toBeGreaterThan(SOLIDS_MAX);
      const solidsWarnings = p.warnings.filter(w => w.code === 'SOLIDS_OUT_OF_RANGE');
      expect(solidsWarnings.map(w => w.field)).toEqual(['recommendedSolids', 'lowerSolids', 'upperSolids']);
      expect(solidsWarnings[0].value).toBe(p.recommendedSolids);
      expect(solidsWarnings[1].value).toBe(p.lowerSolids);
      expect(solidsWarnings[2].value).toBe(p.upperSolids);
      expect(solidsWarnings[0].message).toContain('建議固含量');
      expect(solidsWarnings[0].message).toContain('超過上限 100 wt%');
    });

    it('觸發（≤ 0）：目標膜厚為 0 時三個欄位皆警告，數值仍為 0', () => {
      const p = runPrediction(SOC, 2000, 30, 0, []);
      expect(p.recommendedSolids).toBe(0);
      expect(p.warnings.map(w => [w.code, w.field])).toEqual([
        ['SOLIDS_OUT_OF_RANGE', 'recommendedSolids'],
        ['SOLIDS_OUT_OF_RANGE', 'lowerSolids'],
        ['SOLIDS_OUT_OF_RANGE', 'upperSolids'],
      ]);
      expect(p.warnings[0].message).toContain('小於或等於 0');
    });

    it('觸發（非有限數值）：反算結果為 Infinity', () => {
      const p = runPrediction({...SOC, defaultC: 1e-300}, 2000, 30, 1e10, []);
      expect(p.recommendedSolids).toBe(Infinity);
      const w = p.warnings.find(x => x.field === 'recommendedSolids');
      expect(w?.code).toBe('SOLIDS_OUT_OF_RANGE');
      expect(w?.message).toContain('不是有效數值');
      expect(w?.value).toBe(Infinity);
    });

    it('只有部分欄位超出時，只警告該欄位（建議 99 wt%、上限 > 100 wt%）', () => {
      const p = runPrediction(SOC, 2000, 30, targetForSolids(99), []);
      expect(p.recommendedSolids).toBeCloseTo(99, 6);
      expect(p.warnings.map(w => w.field)).toEqual(['upperSolids']);
    });

    it('不觸發：固含量都在 0～100 wt% 之間', () => {
      const p = runPrediction(SOC, 2000, 30, targetForSolids(50), []);
      expect(p.warnings).toEqual([]);
    });

    it('prediction.warnings 包含 calibration 的警告，且排在反算警告之前', () => {
      const steep = withIds([2, 3, 4].map(S => ({solidsContent: S, thickness: 5 * Math.pow(S, 4.52)})));
      const p = runPrediction(SOC, 2000, 30, 1e12, steep);
      expect(p.calibration.warnings.map(w => w.code)).toEqual(['ALPHA_OUT_OF_RANGE']);
      expect(p.warnings.map(w => w.code)).toEqual([
        'ALPHA_OUT_OF_RANGE',
        'SOLIDS_OUT_OF_RANGE',
        'SOLIDS_OUT_OF_RANGE',
        'SOLIDS_OUT_OF_RANGE',
      ]);
    });
  });

  describe('報告與 CSV', () => {
    it.each(goldenReports.map(r => [r.id, r] as const))(
      '%s：沒有警告時，報告與 CSV 與原版完全相同',
      (_id, g) => {
        const sc = PRESET_SCENARIOS.find(s => s.id === g.id)!;
        const pts = sc.measuredPoints.map((p, i) => ({id: `preset-pt-${i}`, ...p}));
        const p = runPrediction(
          RESIN_CONFIGS[sc.resinType],
          sc.spinSpeed,
          sc.spinTime,
          sc.targetThickness,
          pts,
          sc.tolerancePercent,
        );
        expect(p.warnings).toEqual([]);
        const curve = generateCurvePoints(p);
        expect(generateStructuredReport(p, curve)).toBe(g.report);
        expect(generateCSV(p, curve)).toBe(g.csv);
        expect(g.report).not.toContain('警告事項');
        expect(g.csv).not.toContain('# Warning');
      },
    );

    const steep = withIds([2, 3, 4].map(S => ({solidsContent: S, thickness: 5 * Math.pow(S, 4.52)})));
    const warned = runPrediction(SOC, 2000, 30, 100000, steep);
    const curve = generateCurvePoints(warned);

    it('有警告時，報告最後有「4. 【警告事項】」區段並逐條列出', () => {
      expect(warned.warnings.length).toBeGreaterThan(1);
      const report = generateStructuredReport(warned, curve);
      const [before, section] = report.split('\n4. 【警告事項】：\n');
      expect(section).toBeDefined();
      expect(before).toContain('3. 【數據曲線點表格');
      expect(section.trimEnd().split('\n')).toEqual(warned.warnings.map(w => `- ${w.message}`));
    });

    it('有警告時，CSV 檔頭註解有逐條 "# Warning:" 行，且位於資料表頭之前', () => {
      const csv = generateCSV(warned, curve);
      const headerIdx = csv.indexOf('Solids_wt%,');
      for (const w of warned.warnings) {
        const idx = csv.indexOf(`# Warning: ${w.message}\n`);
        expect(idx).toBeGreaterThan(-1);
        expect(idx).toBeLessThan(headerIdx);
      }
      expect(csv.split('\n').filter(l => l.startsWith('# Warning:'))).toHaveLength(warned.warnings.length);
    });

    it('警告訊息都是單行文字（不會破壞 CSV 結構）', () => {
      for (const w of warned.warnings) expect(w.message).not.toContain('\n');
    });
  });

  describe('MeasuredPoint 的 spinSpeed / spinTime（計算不使用）', () => {
    const base = [
      {solidsContent: 5, thickness: 85},
      {solidsContent: 8, thickness: 182},
      {solidsContent: 12, thickness: 350},
    ];
    const cases: Array<[string, Array<{solidsContent: number; thickness: number}>]> = [
      ['單點', base.slice(0, 1)],
      ['多點擬合', base],
      ['固含量全相同', [base[1], {solidsContent: 8, thickness: 200}]],
    ];

    it.each(cases)('%s：帶或不帶轉速／時間，計算結果完全相同', (_label, pts) => {
      const without = withIds(pts);
      const withSpin: MeasuredPoint[] = without.map((p, i) => ({
        ...p,
        spinSpeed: 500 + i * 1000,
        spinTime: 5 + i,
      }));
      expect(calibrateModel(SOC, 2000, 30, withSpin)).toEqual(calibrateModel(SOC, 2000, 30, without));
      expect(runPrediction(SOC, 2000, 30, 220, withSpin)).toEqual(runPrediction(SOC, 2000, 30, 220, without));
    });
  });
});
