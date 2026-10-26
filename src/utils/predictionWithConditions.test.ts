import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import type {MeasuredPoint, ResinType} from '../types';
import {runPrediction} from './meyerhofer';
import {runPredictionWithConditions} from './predictionWithConditions';
import {RESIN_CONFIGS} from './resinConfigs';

const golden = JSON.parse(readFileSync(new URL('./__fixtures__/legacy-golden.json', import.meta.url), 'utf8')) as {
  presets: Array<{id: string; input: {resinType: ResinType; spinSpeed: number; spinTime: number;
    targetThickness: number; measuredPoints: MeasuredPoint[]; tolerancePercent: number | null}}>;
};

function expectSame(actual: unknown, expected: unknown): void {
  if (typeof expected === 'number') {
    expect(typeof actual).toBe('number');
    expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(Math.abs(expected) * 1e-12);
  } else if (Array.isArray(expected)) {
    expect(Array.isArray(actual)).toBe(true);
    expect((actual as unknown[]).length).toBe(expected.length);
    expected.forEach((v, i) => expectSame((actual as unknown[])[i], v));
  } else if (expected && typeof expected === 'object') {
    expect(Object.keys(actual as object).sort()).toEqual(Object.keys(expected).sort());
    Object.entries(expected).forEach(([k, v]) => expectSame((actual as Record<string, unknown>)[k], v));
  } else expect(actual).toEqual(expected);
}

describe('依各點量測條件反算固含量', () => {
  for (const preset of golden.presets) {
    it.each([false, true])(`${preset.id}，記錄條件=%s 時與原計算一致`, recorded => {
      const p = preset.input;
      const resin = RESIN_CONFIGS[p.resinType];
      const points = p.measuredPoints.map(point => ({...point,
        spinSpeed: recorded ? p.spinSpeed : undefined, spinTime: recorded ? p.spinTime : undefined}));
      const original = runPrediction(resin, p.spinSpeed, p.spinTime, p.targetThickness, points, p.tolerancePercent ?? 5);
      const result = runPredictionWithConditions(resin, p.spinSpeed, p.spinTime, p.targetThickness, points, p.tolerancePercent ?? 5);
      const assumed = result.warnings.filter(w => w.code === 'POINT_CONDITIONS_ASSUMED');
      expect(assumed.length).toBe(!recorded && points.length ? 1 : 0);
      expectSame({...result, warnings: result.warnings.filter(w => w.code !== 'POINT_CONDITIONS_ASSUMED')}, original);
    });
  }

  it('有量測條件時，改變畫面轉速與時間按 β、γ 改變固含量', () => {
    const resin = RESIN_CONFIGS.SOC;
    const points = [{id: 'p', solidsContent: 8, thickness: 180, spinSpeed: 2000, spinTime: 30}];
    const base = runPredictionWithConditions(resin, 2000, 30, 220, points);
    const speed = runPredictionWithConditions(resin, 4000, 30, 220, points);
    const time = runPredictionWithConditions(resin, 2000, 60, 220, points);
    expect(speed.recommendedSolids).toBeGreaterThan(base.recommendedSolids);
    expect(time.recommendedSolids).toBeGreaterThan(base.recommendedSolids);
    expect(speed.recommendedSolids / base.recommendedSolids).toBeCloseTo(2 ** (resin.beta / resin.alpha), 12);
    expect(time.recommendedSolids / base.recommendedSolids).toBeCloseTo(2 ** (resin.gamma / resin.alpha), 12);
    expect(speed.calibration.calibratedC).toBe(base.calibration.calibratedC);
  });

  it('0 點退回理論模式', () => {
    const result = runPredictionWithConditions(RESIN_CONFIGS.SOC, 2000, 30, 220, []);
    expect(result.calibration.mode).toBe('theoretical');
    expect(result.warnings).toEqual([]);
  });
});
