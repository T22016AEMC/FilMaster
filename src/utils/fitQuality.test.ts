import {describe, expect, it} from 'vitest';
import type {CalibrationResult, MeasuredPoint} from '../types';
import {calibrateModel} from './meyerhofer';
import {calculateFitQuality} from './fitQuality';
import {runPredictionWithConditions} from './predictionWithConditions';
import {RESIN_CONFIGS} from './resinConfigs';

const resin = {...RESIN_CONFIGS.SOC, defaultC: 120, alpha: 1, beta: 1, gamma: 1};
const adopted: CalibrationResult = {...calibrateModel(resin, 2, 2, []),
  mode: 'multi_point_lsq', modeLabel: '多點最小平方法擬合 (2 數據點)', pointsCount: 2};
const points: MeasuredPoint[] = [
  {id: 'a', solidsContent: 2, thickness: 50, spinSpeed: 2, spinTime: 2},
  {id: 'b', solidsContent: 4, thickness: 80, spinSpeed: 4, spinTime: 2},
];

describe('已採用模型的擬合品質', () => {
  it('單點縮放的殘差接近 0，仍明確說明不代表擬合品質', () => {
    const measured = [{id: 'soc', solidsContent: 8, thickness: 180, spinSpeed: 2000, spinTime: 30}];
    const model = runPredictionWithConditions(RESIN_CONFIGS.SOC, 3000, 45, 220, measured).calibration;
    const result = calculateFitQuality(RESIN_CONFIGS.SOC, model, measured, {spinSpeed: 3000, spinTime: 45});
    expect(result.notApplicable).toBe(false);
    expect(Math.abs(result.points[0].residual)).toBeLessThan(1e-9);
    expect(result.rmse!).toBeLessThan(1e-9);
    expect(result.reason).toBe('單點校正，殘差必為 0，不代表擬合品質。');
  });

  it('獨立手算兩點殘差、RMSE、平均與最大絕對誤差', () => {
    // h = 120*S/(ω*t)：a 為 120*2/(2*2)=60，實測50，殘差10 nm、20%。
    // b 為 120*4/(4*2)=60，實測80，殘差-20 nm、-25%。
    // RMSE=sqrt((10²+(-20)²)/2)=sqrt(250)，平均絕對誤差=(20+25)/2=22.5%。
    const original = structuredClone({adopted, points});
    const result = calculateFitQuality(resin, adopted, points);
    expect(result.count).toBe(2);
    expect(result.points.map(p => p.predicted)).toEqual([60, 60]);
    expect(result.points.map(p => p.residual)).toEqual([10, -20]);
    expect(result.points.map(p => p.residualPercent)).toEqual([20, -25]);
    expect(result.rmse).toBeCloseTo(Math.sqrt(250), 12);
    expect(result.meanAbsoluteErrorPercent).toBe(22.5);
    expect(result.maxAbsoluteErrorPercent).toBe(25);
    expect(result.maxErrorPointId).toBe('b');
    expect(result.reason).toBeNull();
    expect({adopted, points}).toEqual(original);
  });

  it('量測條件與畫面不同時，仍用各點自己的條件', () => {
    const result = calculateFitQuality(resin, adopted, points, {spinSpeed: 100, spinTime: 100});
    expect(result.points.map(p => p.predicted)).toEqual([60, 60]);
    expect(result.points.map(p => [p.spinSpeed, p.spinTime])).toEqual([[2, 2], [4, 2]]);
    expect(result.warnings).toEqual([]);
  });

  it('0 點理論模式不適用，摘要與最大誤差點回傳 null', () => {
    const result = calculateFitQuality(resin, calibrateModel(resin, 2, 2, []), []);
    expect(result.notApplicable).toBe(true);
    expect(result.reason).toContain('純理論模式');
    expect(result.points).toEqual([]);
    expect(result.count).toBe(0);
    expect(result.rmse).toBeNull();
    expect(result.meanAbsoluteErrorPercent).toBeNull();
    expect(result.maxAbsoluteErrorPercent).toBeNull();
    expect(result.maxErrorPointId).toBeNull();
  });

  it('α 超界時使用實際採用的基準 α 與校正 C，不使用被捨棄的斜率', () => {
    const measured = [{id: 'a', solidsContent: 1, thickness: 10, spinSpeed: 1, spinTime: 1},
      {id: 'b', solidsContent: 2, thickness: 320, spinSpeed: 1, spinTime: 1}];
    const model = runPredictionWithConditions(resin, 1, 1, 100, measured).calibration;
    // 原始斜率 ln(320/10)/ln(2/1)=5，被捨棄；採用 α=1。
    // C=exp((ln10+ln320)/2 - (ln1+ln2)/2)=40，預測40/80 nm。
    const result = calculateFitQuality(resin, model, measured);
    expect(model.fittedAlpha).toBeCloseTo(5, 12);
    expect(model.calibratedAlpha).toBe(1);
    expect(result.points[0].predicted).toBeCloseTo(40, 10);
    expect(result.points[1].predicted).toBeCloseTo(80, 10);
    expect(result.points[0].residualPercent).toBeCloseTo(300, 10);
    expect(result.points[1].residualPercent).toBeCloseTo(-75, 10);
    expect(result.warnings).toContainEqual(expect.objectContaining({code: 'ALPHA_OUT_OF_RANGE'}));
  });

  it('舊點沿用 fallback 與 POINT_CONDITIONS_ASSUMED，僅補缺少欄位', () => {
    const legacy = [{...points[0], spinSpeed: undefined, spinTime: undefined}, {...points[1], spinTime: undefined}];
    const result = calculateFitQuality(resin, adopted, legacy, {spinSpeed: 2, spinTime: 2});
    expect(result.points.map(p => p.predicted)).toEqual([60, 60]);
    expect(result.points[1].spinSpeed).toBe(4);
    expect(result.warnings).toContainEqual(expect.objectContaining({code: 'POINT_CONDITIONS_ASSUMED',
      message: expect.stringContaining('有 2 個實測點沒有記錄量測條件，已假設為 2 rpm / 2 s')}));
  });

  it('缺條件且無 fallback 時排除，沿用缺條件警告', () => {
    const result = calculateFitQuality(resin, adopted, [{...points[0], spinSpeed: undefined}]);
    expect(result.notApplicable).toBe(true);
    expect(result.reason).toContain('沒有具備有效');
    expect(result.warnings).toContainEqual(expect.objectContaining({code: 'POINT_CONDITIONS_MISSING'}));
  });

  it('模型數值溢位時顯示不適用，不輸出無限大的統計數字', () => {
    const result = calculateFitQuality(resin, {...adopted, calibratedC: Number.MAX_VALUE}, points);
    expect(result.notApplicable).toBe(true);
    expect(result.reason).toContain('無法產生有限正數');
    expect(result.rmse).toBeNull();
  });
});
