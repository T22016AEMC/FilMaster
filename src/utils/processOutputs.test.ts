import {describe, expect, it} from 'vitest';
import type {ProcessPredictionResult, ProcessSolveMode} from '../types';
import {calculateThickness} from './meyerhofer';
import {DEFAULT_EQUIPMENT_LIMITS, generateProcessCurvePoints, runProcessSolve} from './processSolver';
import {generateProcessCSV, generateProcessReport, PROCESS_EXPONENT_HINT} from './reportProcess';
import {RESIN_CONFIGS} from './resinConfigs';

describe.each<ProcessSolveMode>(['solve_speed', 'solve_time'])('%s 曲線與匯出', mode => {
  const result: ProcessPredictionResult = {...runProcessSolve(RESIN_CONFIGS.SOC, mode, {
    solids: 8, targetThickness: 220, fixedTime: 30, fixedSpeed: 2000,
    measuredPoints: [{id: 'p', solidsContent: 8, thickness: 180, spinSpeed: 2000, spinTime: 30}],
  }), resin: RESIN_CONFIGS.SOC, equipmentLimits: {...DEFAULT_EQUIPMENT_LIMITS, minSpeed: 800, maxTime: 60}};
  it('依設備範圍取樣 60 點且膜厚單調遞減', () => {
    const points = generateProcessCurvePoints(result);
    expect(points).toHaveLength(60);
    expect(points[0].x).toBe(mode === 'solve_speed' ? 800 : 5);
    expect(points[59].x).toBe(mode === 'solve_speed' ? 6000 : 60);
    points.slice(1).forEach((p, i) => {
      expect(p.x).toBeGreaterThan(points[i].x);
      expect(p.thickness).toBeLessThan(points[i].thickness);
    });
    const c = result.calibration;
    expect(points[0].thickness).toBe(calculateThickness(8, mode === 'solve_speed' ? 800 : 2000,
      mode === 'solve_time' ? 5 : 30, c.calibratedC, c.calibratedAlpha, c.beta, c.gamma));
    expect(generateProcessCurvePoints(result, 3)).toHaveLength(3);
  });
  it('無解或無效點數回傳空曲線', () => {
    expect(generateProcessCurvePoints({...result, recommended: null})).toEqual([]);
    for (const count of [0, 1, -1, NaN, Infinity, 1.5]) expect(generateProcessCurvePoints(result, count)).toEqual([]);
  });
  it('報告包含完整製程、校正與設備資訊', () => {
    const report = generateProcessReport(result);
    for (const text of ['SOC', '8.0000 wt%', '220.000 nm', '±5.0%', '點數：1', '2000 rpm / 30 s',
      '設備轉速範圍：800 ～ 6000 rpm', '設備時間範圍：5 ～ 60 s', PROCESS_EXPONENT_HINT]) expect(report).toContain(text);
    expect(report).toContain(result.recommended!.toFixed(3));
    const failed = generateProcessReport({...result, recommended: null, rangeMin: null, rangeMax: null,
      warnings: [{code: 'PROCESS_UNSOLVABLE', message: '無效輸入已回傳無解'}]});
    expect(failed).toContain('無法求解');
    expect(failed).toContain('無效輸入已回傳無解');
  });
  it('CSV 包含摘要、提示及 60 筆曲線', () => {
    const csv = generateProcessCSV(result);
    expect(csv).toContain(PROCESS_EXPONENT_HINT);
    expect(csv).toContain(mode === 'solve_speed' ? 'SpinSpeed_rpm,Thickness_nm' : 'SpinTime_s,Thickness_nm');
    expect(csv.trim().split('\n').filter(line => !line.startsWith('#'))).toHaveLength(61);
  });
});
