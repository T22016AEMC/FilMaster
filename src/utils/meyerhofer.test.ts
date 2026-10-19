import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import type {MeasuredPoint, PredictionResult, ResinType} from '../types';
import {
  calculateRequiredSolids,
  calculateThickness,
  calibrateModel,
  generateCurvePoints,
  generateDenseChartPoints,
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

    it('runPrediction 完整結果（含 calibration 全部欄位）', () => {
      expectDeepClose(prediction, g.prediction);
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
      const {resin: _r2, ...expectedRest} = g.prediction;
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
      expect(c.rSquared).toBe(1);
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
// D. 記錄現行行為（已知問題，階段 3 會修正；修正時需一併更新這些測試）
// ---------------------------------------------------------------------------
describe('D. 現行行為記錄', () => {
  it('[現行行為-階段3修正] 1 個實測點時 rSquared 回傳 1.0', () => {
    const c = calibrateModel(SOC, 2000, 30, withIds([{solidsContent: 8, thickness: 180}]));
    expect(c.rSquared).toBe(1.0);
  });

  it('[現行行為-階段3修正] 多點擬合斜率超出 0.05～4.0 時，α 靜默改回理論值', () => {
    // 斜率 5（過大）：h = S^5
    const steep = calibrateModel(
      SOC,
      2000,
      30,
      withIds([2, 3, 4].map(S => ({solidsContent: S, thickness: Math.pow(S, 5)}))),
    );
    expect(steep.calibratedAlpha).toBe(SOC.alpha);
    // 斜率 0（過小）：膜厚不隨固含量變化
    const flat = calibrateModel(
      SOC,
      2000,
      30,
      withIds([2, 3, 4].map(S => ({solidsContent: S, thickness: 100}))),
    );
    expect(flat.calibratedAlpha).toBe(SOC.alpha);
    // 且完全沒有任何提示：模式仍為多點擬合
    expect(steep.mode).toBe('multi_point_lsq');
    expect(flat.mode).toBe('multi_point_lsq');
  });

  it('[現行行為-階段3修正] 反算固含量沒有上限檢查（可算出超過 100 wt%）', () => {
    const p = runPrediction(SOC, 2000, 30, 100000, []);
    expect(p.recommendedSolids).toBeGreaterThan(100);
  });
});
